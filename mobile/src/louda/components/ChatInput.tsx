import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Image,
  StyleSheet,
  ActivityIndicator,
  Keyboard,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import {
  useAudioRecorder,
  RecordingPresets,
  requestRecordingPermissionsAsync,
  setAudioModeAsync,
} from 'expo-audio';
import { useLoudaTheme } from './primitives';
import { Icons } from '../icons';
import {
  ALL_EMOJIS,
  EMOJI_CATEGORIES,
  STICKERS_DB,
  GIPHY_API_KEY,
  GIPHY_API_BASE,
  MAX_TEXTAREA_HEIGHT,
} from '../emojis';
import { uploadFile, deleteUpload } from '../api';
import { loudaAlert } from '../utils';
import { getStore, setStore } from '../../utils/storage';

const FAV_KEY = 'louda:favEmojis';
const SAVED_KEY = 'louda:savedStickers';

// Port of ChatInput (LoudaApp.jsx:3178-3875)
export function ChatInput({
  onSend,
  onTyping,
  userId: _userId,
  chatId: _chatId,
  isGroup: _isGroup,
  replyTo,
  onCancelReply,
  editingMessage,
  onCancelEdit,
  onEdit,
}: {
  onSend: (payload: any) => void;
  onTyping?: () => void;
  userId?: string;
  chatId?: string;
  isGroup?: boolean;
  replyTo?: any;
  onCancelReply?: () => void;
  editingMessage?: any;
  onCancelEdit?: () => void;
  onEdit?: (id: string, text: string) => void;
}) {
  const { p } = useLoudaTheme();
  const insets = useSafeAreaInsets();
  const [kbOpen, setKbOpen] = useState(false);
  const [text, setText] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [showAttachMenu, setShowAttachMenu] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [pickerTab, setPickerTab] = useState<'emoji' | 'sticker'>('emoji');
  const [stickerResults, setStickerResults] = useState<any[]>([]);
  const [previewMedia, setPreviewMedia] = useState<any[]>([]);
  const [uploading, setUploading] = useState(false);
  const [lastTypingSent, setLastTypingSent] = useState(0);
  const [stickerQuery, setStickerQuery] = useState('');
  const [emojiSearch, setEmojiSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState(0);
  const [stickerLoading, setStickerLoading] = useState(false);
  const [imagesLoadedCount, setImagesLoadedCount] = useState(0);
  const [isWaitingForImages, setIsWaitingForImages] = useState(false);
  const [favEmojis, setFavEmojis] = useState<string[]>([]);
  const [savedStickers, setSavedStickers] = useState<any[]>([]);
  const [inputHeight, setInputHeight] = useState(36);

  const stickerCache = useRef<Record<string, any[]>>({});
  const abortRef = useRef<AbortController | null>(null);
  const timerRef = useRef<any>(null);
  const isCancelledRef = useRef(false);
  const enterSendRef = useRef(false);

  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);

  // Home-indicator clearance only while the keyboard is closed — while it is
  // open the KeyboardAvoidingView already lifts the input.
  useEffect(() => {
    const show = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hide = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const a = Keyboard.addListener(show as any, () => setKbOpen(true));
    const b = Keyboard.addListener(hide as any, () => setKbOpen(false));
    return () => {
      a.remove();
      b.remove();
    };
  }, []);

  useEffect(() => {
    getStore(FAV_KEY).then((v) => {
      try {
        if (v) setFavEmojis(JSON.parse(v));
      } catch {}
    });
    getStore(SAVED_KEY).then((v) => {
      try {
        if (v) setSavedStickers(JSON.parse(v));
      } catch {}
    });
  }, []);

  useEffect(() => {
    if (editingMessage) setText(editingMessage.text || '');
  }, [editingMessage]);

  // ─── Favourites (LoudaApp.jsx:3238-3261) ───
  const toggleFavEmoji = (emoji: string) => {
    setFavEmojis((prev) => {
      const next = prev.includes(emoji)
        ? prev.filter((e) => e !== emoji)
        : [emoji, ...prev].slice(0, 30);
      setStore(FAV_KEY, JSON.stringify(next)).catch(() => {});
      return next;
    });
  };

  const saveSticker = (sticker: any) => {
    setSavedStickers((prev) => {
      if (prev.find((s) => s.id === sticker.id)) return prev;
      const next = [sticker, ...prev];
      setStore(SAVED_KEY, JSON.stringify(next)).catch(() => {});
      return next;
    });
  };

  const removeSavedSticker = (id: string) => {
    setSavedStickers((prev) => {
      const next = prev.filter((s) => s.id !== id);
      setStore(SAVED_KEY, JSON.stringify(next)).catch(() => {});
      return next;
    });
  };

  // ─── Filtered emojis (LoudaApp.jsx:3264-3274) ───
  const filteredEmojis = useMemo(() => {
    if (emojiSearch.trim()) {
      const q = emojiSearch.toLowerCase();
      return ALL_EMOJIS.filter(
        (e) => e.name.includes(q) || e.tags.some((t) => t.includes(q)),
      );
    }
    if (activeCategory === -1)
      return ALL_EMOJIS.filter((e) => favEmojis.includes(e.emoji));
    return ALL_EMOJIS.slice(
      EMOJI_CATEGORIES[activeCategory].range[0],
      EMOJI_CATEGORIES[activeCategory].range[1] + 1,
    );
  }, [emojiSearch, activeCategory, favEmojis]);

  // ─── Stickers (LoudaApp.jsx:3277-3316) ───
  const searchStickers = useCallback(async (q = '') => {
    const query = q.trim();
    if (stickerCache.current[query]) {
      setStickerResults(stickerCache.current[query]);
      setImagesLoadedCount(0);
      setIsWaitingForImages(stickerCache.current[query].length > 0);
      return;
    }
    abortRef.current?.abort();
    abortRef.current = new AbortController();
    setStickerLoading(true);
    setImagesLoadedCount(0);
    setIsWaitingForImages(false);
    try {
      const endpoint = query
        ? `${GIPHY_API_BASE}/search?api_key=${GIPHY_API_KEY}&q=${encodeURIComponent(query)}&limit=24&rating=g&lang=en`
        : `${GIPHY_API_BASE}/trending?api_key=${GIPHY_API_KEY}&limit=24&rating=g`;
      const res = await fetch(endpoint, { signal: abortRef.current.signal });
      const data = await res.json();
      const formatted = (data?.data || []).map((g: any) => ({
        id: g.id,
        tags: [g.title || query || 'gif'],
        url:
          g.images?.fixed_height?.url ||
          g.images?.downsized?.url ||
          g.images?.original?.url,
      }));
      stickerCache.current[query] = formatted;
      setStickerResults(formatted);
      if (formatted.length > 0) setIsWaitingForImages(true);
    } catch (err: any) {
      if (err?.name === 'AbortError') return;
      const fallback = query
        ? STICKERS_DB.filter((s) =>
            s.tags.some((t) => t.includes(query.toLowerCase())),
          )
        : STICKERS_DB;
      setStickerResults(fallback);
      if (fallback.length > 0) setIsWaitingForImages(true);
    } finally {
      setStickerLoading(false);
    }
  }, []);

  useEffect(() => {
    if (pickerTab === 'sticker' && showEmojiPicker) {
      const query = stickerQuery.trim();
      if (stickerCache.current[query]) {
        searchStickers(stickerQuery);
        return;
      }
      setStickerLoading(true);
      setImagesLoadedCount(0);
      setIsWaitingForImages(false);
      const t = setTimeout(() => searchStickers(stickerQuery), 150);
      return () => clearTimeout(t);
    }
  }, [pickerTab, stickerQuery, showEmojiPicker, searchStickers]);

  const selectSticker = (sticker: any) => {
    onSend({ type: 'sticker', sticker_url: sticker.url, text: '' });
    setShowEmojiPicker(false);
  };

  // ─── Recording (LoudaApp.jsx:3371-3420) ───
  const startRecording = async () => {
    try {
      const perm = await requestRecordingPermissionsAsync();
      if (!perm.granted) {
        loudaAlert({ title: 'Error', message: 'Microphone access denied' });
        return;
      }
      isCancelledRef.current = false;
      await setAudioModeAsync({ playsInSilentMode: true, allowsRecording: true });
      await recorder.prepareToRecordAsync();
      recorder.record();
      setIsRecording(true);
      setRecordingTime(0);
      timerRef.current = setInterval(
        () => setRecordingTime((t) => t + 1),
        1000,
      );
    } catch {
      loudaAlert({ title: 'Error', message: 'Microphone access denied' });
    }
  };

  const finishRecording = async (cancelled = false) => {
    if (timerRef.current) clearInterval(timerRef.current);
    setIsRecording(false);
    isCancelledRef.current = cancelled;
    try {
      await recorder.stop();
    } catch {
      /* noop */
    }
    await setAudioModeAsync({ playsInSilentMode: true, allowsRecording: false }).catch(() => {});
    if (cancelled || isCancelledRef.current) return;
    const uri = recorder.uri;
    const duration = recordingTime;
    if (!uri) return;
    setUploading(true);
    try {
      const data = await uploadFile({
        uri,
        name: 'voice-note.m4a',
        type: 'audio/mp4',
        kind: 'voice',
      });
      const payload: any = {
        text: '',
        media: [{ type: 'voice', url: data.url, duration: duration || 0 }],
      };
      if (replyTo)
        payload.reply_to = {
          id: replyTo.id,
          text: replyTo.text,
          from: replyTo.from,
          fromName: replyTo.fromName,
        };
      onSend(payload);
      onCancelReply?.();
    } catch (err: any) {
      loudaAlert({ title: 'Error', message: err?.message || 'Upload failed' });
    } finally {
      setUploading(false);
    }
  };

  // ─── Input handling (LoudaApp.jsx:3423-3446) ───
  const handleChange = (next: string) => {
    setText(next);
    if (next.trim() && Date.now() - lastTypingSent > 2000) {
      onTyping?.();
      setLastTypingSent(Date.now());
    }
  };

  const send = async () => {
    if (!text.trim() && previewMedia.length === 0) return;
    if (editingMessage) {
      onEdit?.(editingMessage.id, text);
      setText('');
      onCancelEdit?.();
      return;
    }
    const payload: any = { text, media: previewMedia };
    if (replyTo)
      payload.reply_to = {
        id: replyTo.id,
        text: replyTo.text,
        from: replyTo.from,
        fromName: replyTo.fromName,
      };
    onSend(payload);
    setText('');
    setPreviewMedia([]);
    onCancelReply?.();
    setInputHeight(36);
  };

  // ─── Media picking (LoudaApp.jsx:3448-3493) ───
  const appendUploaded = (items: any[], limitsLeft: number) => {
    setPreviewMedia((prev) => [...prev, ...items].slice(0, limitsLeft));
    setShowAttachMenu(false);
  };

  const uploadLocal = async (assets: ImagePicker.ImagePickerAsset[]) => {
    if (!assets.length) return;
    if (previewMedia.length + assets.length > 6) {
      loudaAlert({ title: 'Notice', message: 'Maximum 6 media files allowed.' });
    }
    const room = 6 - previewMedia.length;
    let list = assets.slice(0, Math.max(0, room));
    list = list.filter((a) => {
      const isImg = (a.mimeType || '').startsWith('image/') || !a.mimeType;
      const size = (a.fileSize as number) || 0;
      const maxSize = isImg ? 20 * 1024 * 1024 : 90 * 1024 * 1024;
      if (size && size > maxSize) {
        loudaAlert({
          title: 'File Too Large',
          message: `${a.fileName || 'File'} exceeds the ${isImg ? '20MB' : '90MB'} limit.`,
        });
        return false;
      }
      return true;
    });
    if (!list.length) return;
    setUploading(true);
    try {
      const media = [];
      for (const a of list) {
        const mime = a.mimeType || '';
        const kind = mime.startsWith('image/')
          ? 'image'
          : mime.startsWith('video/')
            ? 'video'
            : 'file';
        const data = await uploadFile({
          uri: a.uri,
          name: a.fileName || `upload_${Date.now()}`,
          type: mime || (kind === 'image' ? 'image/jpeg' : kind === 'video' ? 'video/mp4' : 'application/octet-stream'),
          kind,
        });
        media.push({ type: data.type, url: data.url });
      }
      appendUploaded(media, 6);
    } catch (err: any) {
      loudaAlert({ title: 'Error', message: err?.message || 'Upload failed' });
    } finally {
      setUploading(false);
    }
  };

  const pickLibrary = async () => {
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images', 'videos'],
      allowsMultipleSelection: true,
      quality: 0.85,
      selectionLimit: 6,
    });
    if (!res.canceled) await uploadLocal(res.assets || []);
  };

  const takePhoto = async () => {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) {
      loudaAlert({ title: 'Error', message: 'Camera access denied' });
      return;
    }
    const res = await ImagePicker.launchCameraAsync({
      quality: 0.85,
      mediaTypes: ['images', 'videos'],
    });
    if (!res.canceled) await uploadLocal(res.assets || []);
  };

  const pickFiles = async (audioOnly = false) => {
    try {
      const res = await DocumentPicker.getDocumentAsync({
        type: audioOnly
          ? ['audio/*']
          : ['image/*', 'video/*', 'audio/*', 'application/pdf', 'text/*', '*/*'],
        multiple: true,
        copyToCacheDirectory: true,
      });
      if (res.canceled) return;
      const assets = (res.assets || []).map((a) => ({
        uri: a.uri,
        name: a.name,
        mimeType: a.mimeType || '',
        fileSize: a.size,
      })) as any;
      if (previewMedia.length + assets.length > 6) {
        loudaAlert({ title: 'Notice', message: 'Maximum 6 media files allowed.' });
      }
      const room = 6 - previewMedia.length;
      const list = assets.slice(0, Math.max(0, room));
      if (!list.length) return;
      setUploading(true);
      const media = [];
      for (const a of list) {
        const isImg = a.mimeType.startsWith('image/');
        const size = a.fileSize || 0;
        const maxSize = isImg ? 20 * 1024 * 1024 : 90 * 1024 * 1024;
        if (size && size > maxSize) {
          loudaAlert({
            title: 'File Too Large',
            message: `${a.name} exceeds the ${isImg ? '20MB' : '90MB'} limit.`,
          });
          continue;
        }
        const kind = isImg
          ? 'image'
          : a.mimeType.startsWith('video/')
            ? 'video'
            : 'file';
        try {
          const data = await uploadFile({
            uri: a.uri,
            name: a.name,
            type: a.mimeType || 'application/octet-stream',
            kind,
          });
          media.push({ type: data.type, url: data.url });
        } catch (err: any) {
          loudaAlert({ title: 'Error', message: err?.message || 'Upload failed' });
        }
      }
      appendUploaded(media, 6);
    } catch (err: any) {
      loudaAlert({ title: 'Error', message: err?.message || 'Failed to pick file' });
    } finally {
      setUploading(false);
    }
  };

  const removePreview = (i: number) => {
    const item = previewMedia[i];
    if (item?.url) deleteUpload({ url: item.url }).catch(() => {});
    setPreviewMedia((prev) => prev.filter((_, idx) => idx !== i));
  };

  const hasContent = text.trim().length > 0 || previewMedia.length > 0;
  const showSend = hasContent || !!editingMessage;
  const isTyping = text.trim().length > 0;
  const waitingForImages =
    isWaitingForImages && imagesLoadedCount < Math.min(stickerResults.length, 6);
  const stickersBusy = stickerLoading || waitingForImages;

  const openPicker = () => {
    Keyboard.dismiss();
    setShowAttachMenu(false);
    setShowEmojiPicker((v) => !v);
  };

  const accent = p.accent;

  return (
    <View
      style={[
        s.wrap,
        { backgroundColor: 'rgba(255,255,255,0.97)', borderTopColor: p.borderLight },
        !kbOpen && insets.bottom > 0 ? { paddingBottom: 8 + insets.bottom } : null,
      ]}
    >
      {/* ─── Emoji/Sticker Picker — anchored above ─── */}
      {showEmojiPicker && (
        <View style={[s.picker, { backgroundColor: p.card, borderColor: p.borderLight, height: 340 }]}>
          <View style={[s.pickerTabs, { borderBottomColor: p.borderLight }]}>
            {(['emoji', 'sticker'] as const).map((tab) => (
              <TouchableOpacity
                key={tab}
                style={s.pickerTab}
                onPress={() => setPickerTab(tab)}
              >
                <Text
                  style={[
                    s.pickerTabText,
                    {
                      color: pickerTab === tab ? '#10b981' : p.textMuted,
                      borderBottomWidth: pickerTab === tab ? 2 : 0,
                      borderBottomColor: '#10b981',
                    },
                  ]}
                >
                  {tab === 'emoji' ? '😀 Emoji' : '🎭 Stickers'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {pickerTab === 'emoji' ? (
            <View style={{ flex: 1 }}>
              <View style={s.searchRow}>
                <Icons.search size={14} color={p.textMuted} />
                <TextInput
                  value={emojiSearch}
                  onChangeText={setEmojiSearch}
                  placeholder="Search emoji…"
                  placeholderTextColor={p.textMuted}
                  style={[s.pickerSearch, { color: p.text }]}
                />
                {!!emojiSearch && (
                  <TouchableOpacity onPress={() => setEmojiSearch('')}>
                    <Text style={{ color: p.textMuted, fontSize: 12 }}>✕</Text>
                  </TouchableOpacity>
                )}
              </View>

              {!emojiSearch && (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.catRow} contentContainerStyle={{ gap: 4, paddingHorizontal: 8 }}>
                  <TouchableOpacity
                    onPress={() => setActiveCategory(-1)}
                    style={[
                      s.catChip,
                      activeCategory === -1 && { backgroundColor: 'rgba(16,185,129,0.12)' },
                    ]}
                  >
                    <Text style={{ fontSize: 14, color: activeCategory === -1 ? '#047857' : p.textMuted }}>⭐</Text>
                  </TouchableOpacity>
                  {EMOJI_CATEGORIES.map((cat, i) => (
                    <TouchableOpacity
                      key={i}
                      onPress={() => setActiveCategory(i)}
                      style={[
                        s.catChip,
                        activeCategory === i && { backgroundColor: 'rgba(16,185,129,0.12)' },
                      ]}
                    >
                      <Text
                        style={{
                          fontSize: 12,
                          color: activeCategory === i ? '#047857' : p.textMuted,
                        }}
                        numberOfLines={1}
                      >
                        {cat.label.split(' ')[0]}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              )}

              <ScrollView style={{ flex: 1 }} contentContainerStyle={s.emojiGrid} keyboardShouldPersistTaps="handled">
                {emojiSearch && (
                  <Text style={[s.resultCount, { color: p.textMuted }]}>
                    {filteredEmojis.length} result{filteredEmojis.length !== 1 ? 's' : ''}
                  </Text>
                )}
                {activeCategory === -1 && !emojiSearch && favEmojis.length === 0 && (
                  <Text style={[s.favHint, { color: p.textMuted }]}>
                    Long-press an emoji to save it here ⭐
                  </Text>
                )}
                {filteredEmojis.map((item, i) => {
                  const isFav = favEmojis.includes(item.emoji);
                  return (
                    <TouchableOpacity
                      key={i}
                      style={[s.emojiCell, isFav && { backgroundColor: 'rgba(254,243,199,0.6)' }]}
                      onPress={() => setText((prev) => prev + item.emoji)}
                      delayLongPress={600}
                      onLongPress={() => toggleFavEmoji(item.emoji)}
                    >
                      <Text style={{ fontSize: 22 }}>{item.emoji}</Text>
                      {isFav && (
                        <Text style={s.favStar}>⭐</Text>
                      )}
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>
          ) : (
            <View style={{ flex: 1 }}>
              <View style={s.searchRow}>
                <Icons.search size={14} color={p.textMuted} />
                <TextInput
                  value={stickerQuery}
                  onChangeText={setStickerQuery}
                  placeholder="Search GIF…"
                  placeholderTextColor={p.textMuted}
                  style={[s.pickerSearch, { color: p.text }]}
                />
                {!!stickerQuery && (
                  <TouchableOpacity onPress={() => setStickerQuery('')}>
                    <Text style={{ color: p.textMuted, fontSize: 12 }}>✕</Text>
                  </TouchableOpacity>
                )}
              </View>

              <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 8, gap: 12 }} keyboardShouldPersistTaps="handled">
                {savedStickers.length > 0 && !stickerQuery && (
                  <View>
                    <Text style={[s.sectionLabel, { color: p.textMuted }]}>❤️ Saved</Text>
                    <View style={s.stickerGrid}>
                      {savedStickers.map((st, i) => (
                        <View key={i} style={s.stickerCellWrap}>
                          <TouchableOpacity onPress={() => selectSticker(st)} activeOpacity={0.85}>
                            <Image source={{ uri: st.url }} style={s.stickerCell} />
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={s.stickerRemove}
                            onPress={() => removeSavedSticker(st.id)}
                          >
                            <Text style={{ color: '#fff', fontSize: 9 }}>✕</Text>
                          </TouchableOpacity>
                        </View>
                      ))}
                    </View>
                  </View>
                )}

                <View>
                  <View style={s.sectionHeader}>
                    <Text style={[s.sectionLabel, { color: p.textMuted }]}>
                      {stickerQuery ? '🔍 Results' : '🔥 Trending'}
                    </Text>
                    {stickersBusy && (
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <ActivityIndicator size="small" color="#10b981" />
                        <Text style={{ fontSize: 10, color: p.textMuted }}>
                          {stickerLoading ? 'Searching...' : 'Rendering...'}
                        </Text>
                      </View>
                    )}
                  </View>

                  {stickersBusy && stickerResults.length === 0 ? (
                    <View style={s.stickerGrid}>
                      {[...Array(8)].map((_, i) => (
                        <View
                          key={i}
                          style={[s.stickerCell, { backgroundColor: p.cardMuted }]}
                        />
                      ))}
                    </View>
                  ) : (
                    <View style={[s.stickerGrid, stickersBusy && { opacity: 0.3 }]}>
                      {stickerResults.map((st, i) => {
                        const saved = savedStickers.find((sv) => sv.id === st.id);
                        return (
                          <View key={i} style={s.stickerCellWrap}>
                            <TouchableOpacity
                              onPress={() => selectSticker(st)}
                              activeOpacity={0.85}
                            >
                              <Image
                                source={{ uri: st.url }}
                                style={s.stickerCell}
                                onLoad={() =>
                                  setImagesLoadedCount((prev) => prev + 1)
                                }
                                onError={() =>
                                  setImagesLoadedCount((prev) => prev + 1)
                                }
                              />
                            </TouchableOpacity>
                            <TouchableOpacity
                              style={[s.stickerSave, saved && { backgroundColor: '#ef4444' }]}
                              onPress={() => saveSticker(st)}
                            >
                              <Text style={{ fontSize: 10 }}>{saved ? '❤️' : '🤍'}</Text>
                            </TouchableOpacity>
                          </View>
                        );
                      })}
                    </View>
                  )}

                  {stickerResults.length === 0 && !stickerLoading && !isWaitingForImages && (
                    <Text style={[s.noResults, { color: p.textMuted }]}>No results found</Text>
                  )}
                </View>
              </ScrollView>
            </View>
          )}
        </View>
      )}

      {/* ─── Attach menu ─── */}
      {showAttachMenu && (
        <View style={[s.attachMenu, { backgroundColor: p.card, borderColor: p.borderLight }]}>
          {[
            {
              icon: <Icons.camera size={24} color="#dc2626" />,
              label: 'Camera',
              bg: '#fee2e2',
              onClick: takePhoto,
            },
            {
              icon: <Icons.image size={24} color="#db2777" />,
              label: 'Photos & Videos',
              bg: '#fce7f3',
              onClick: pickLibrary,
            },
            {
              icon: <Icons.audio size={24} color="#ea580c" />,
              label: 'Audio',
              bg: '#ffedd5',
              onClick: () => pickFiles(true),
            },
            {
              icon: <Icons.user size={24} color="#2563eb" />,
              label: 'Contact',
              bg: '#dbeafe',
              onClick: () => loudaAlert({ title: 'Contact', message: 'Coming soon!' }),
            },
          ].map((item) => (
            <TouchableOpacity
              key={item.label}
              activeOpacity={0.8}
              onPress={() => {
                item.onClick();
                setShowAttachMenu(false);
              }}
              style={s.attachItem}
            >
              <View style={[s.attachIcon, { backgroundColor: item.bg }]}>{item.icon}</View>
              <Text style={[s.attachLabel, { color: p.textSecondary }]}>{item.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* ─── Main input bar ─── */}
      <View style={s.bar}>
        <View style={[s.inputShell, { backgroundColor: p.card, borderColor: p.border }]}>
          <TouchableOpacity
            onPress={() => {
              setShowEmojiPicker(false);
              setShowAttachMenu((v) => !v);
            }}
            style={s.plusBtn}
          >
            <Icons.plus
              size={22}
              color={showAttachMenu ? '#111827' : '#6b7280'}
              style={showAttachMenu ? { transform: [{ rotate: '45deg' }] } : undefined}
            />
          </TouchableOpacity>

          <View style={{ flex: 1, minWidth: 0 }}>
            {!!replyTo && (
              <View style={[s.replyChip, { backgroundColor: p.cardMuted, borderLeftColor: p.accent }]}>
                <Text numberOfLines={1} style={{ flex: 1, fontSize: 12, color: p.textSecondary }}>
                  Replying to {replyTo.fromName}
                </Text>
                <TouchableOpacity onPress={onCancelReply} hitSlop={6}>
                  <Text style={{ color: '#6b7280', fontSize: 12 }}>✕</Text>
                </TouchableOpacity>
              </View>
            )}

            {previewMedia.length > 0 && (
              <ScrollView horizontal style={s.previewStrip} contentContainerStyle={{ gap: 8 }}>
                {previewMedia.map((m, i) => (
                  <View key={i} style={s.previewItem}>
                    {m.type === 'image' ? (
                      <Image source={{ uri: m.url }} style={s.previewThumb} />
                    ) : (
                      <View style={[s.previewThumb, { backgroundColor: p.cardMuted, alignItems: 'center', justifyContent: 'center' }]}>
                        {m.type === 'video' ? (
                          <Icons.video size={22} color="#6b7280" />
                        ) : (
                          <Icons.mic size={22} color="#6b7280" />
                        )}
                      </View>
                    )}
                    <TouchableOpacity style={s.previewRemove} onPress={() => removePreview(i)}>
                      <Text style={{ color: '#fff', fontSize: 10 }}>✕</Text>
                    </TouchableOpacity>
                  </View>
                ))}
              </ScrollView>
            )}

            <View style={s.inputRow}>
              <TouchableOpacity onPress={openPicker} style={s.innerBtn}>
                <Icons.smile
                  size={22}
                  color={showEmojiPicker ? '#10b981' : '#9ca3af'}
                />
              </TouchableOpacity>
              <TextInput
                value={text}
                onChangeText={(next) => {
                  // Enter-to-send (web onKeyDown parity, LoudaApp.jsx:3801-3807):
                  // swallow the newline the hardware keyboard tries to insert
                  if (enterSendRef.current) {
                    enterSendRef.current = false;
                    if (next === '\n' || next.endsWith('\n')) {
                      send();
                      return;
                    }
                  }
                  handleChange(next);
                }}
                onKeyPress={(e) => {
                  if (e.nativeEvent.key === 'Enter' && showSend && !enterSendRef.current) {
                    enterSendRef.current = true;
                  }
                }}
                onSubmitEditing={() => {
                  if (showSend) send();
                }}
                placeholder="Message"
                placeholderTextColor="#9ca3af"
                multiline
                style={[
                  s.textInput,
                  {
                    color: p.text,
                    height: Math.min(Math.max(inputHeight, 36), MAX_TEXTAREA_HEIGHT),
                  },
                ]}
                onFocus={() => {
                  setShowAttachMenu(false);
                  setShowEmojiPicker(false);
                }}
                onContentSizeChange={(e) =>
                  setInputHeight(
                    Math.min(e.nativeEvent.contentSize.height + 4, MAX_TEXTAREA_HEIGHT),
                  )
                }
              />
              {!isTyping && !editingMessage && (
                <TouchableOpacity onPress={takePhoto} style={s.innerBtn}>
                  <Icons.camera size={20} color="#9ca3af" />
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>

        <TouchableOpacity
          activeOpacity={0.85}
          disabled={uploading}
          onPress={() =>
            showSend
              ? send()
              : isRecording
                ? finishRecording(false)
                : startRecording()
          }
          style={[
            s.sendBtn,
            isRecording && { backgroundColor: '#ef4444' },
            !isRecording && {
              backgroundColor: accent,
              shadowColor: accent,
              shadowOpacity: 0.3,
            },
          ]}
        >
          {uploading ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : isRecording ? (
            <Icons.mic size={20} color="#fff" />
          ) : showSend ? (
            editingMessage ? (
              <Icons.check size={20} color="#fff" />
            ) : (
              <Icons.send size={20} color="#fff" />
            )
          ) : (
            <Icons.mic size={20} color="#fff" />
          )}
        </TouchableOpacity>
      </View>

      {/* ─── Recording overlay ─── */}
      {isRecording && (
        <View style={[s.recordingBar, { backgroundColor: p.card, borderColor: p.borderLight }]}>
          <View style={[s.recDot, { backgroundColor: '#ef4444' }]} />
          <Text style={[s.recTime, { color: p.text }]}>
            {Math.floor(recordingTime / 60)}:
            {String(recordingTime % 60).padStart(2, '0')}
          </Text>
          <TouchableOpacity
            onPress={() => finishRecording(true)}
            style={s.recCancel}
          >
            <Text style={{ color: '#ef4444', fontWeight: '800', fontSize: 14 }}>Cancel</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  wrap: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 8,
    paddingVertical: 8,
    gap: 8,
    zIndex: 20,
  },
  bar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
  },
  inputShell: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-end',
    borderRadius: 24,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 4,
    paddingVertical: 4,
    minWidth: 0,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 1 },
    elevation: 2,
  },
  plusBtn: {
    padding: 8,
    borderRadius: 999,
    alignSelf: 'flex-end',
  },
  replyChip: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 6,
    marginTop: 6,
    padding: 6,
    borderRadius: 8,
    borderLeftWidth: 4,
    gap: 6,
  },
  previewStrip: { maxHeight: 72, marginTop: 6, marginHorizontal: 4 },
  previewItem: { position: 'relative' },
  previewThumb: { width: 58, height: 58, borderRadius: 10 },
  previewRemove: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#1f2937',
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  innerBtn: { padding: 6, justifyContent: 'flex-end' },
  textInput: {
    flex: 1,
    fontSize: 15,
    lineHeight: 21,
    paddingHorizontal: 4,
    paddingTop: 6,
    paddingBottom: 6,
    maxHeight: MAX_TEXTAREA_HEIGHT,
    textAlignVertical: 'center',
  },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 4 },
    elevation: 5,
  },
  picker: {
    position: 'absolute',
    bottom: '100%',
    left: 0,
    width: '100%',
    maxWidth: 380,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    marginBottom: 8,
    overflow: 'hidden',
    zIndex: 50,
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: -4 },
    elevation: 12,
  },
  pickerTabs: {
    flexDirection: 'row',
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  pickerTab: { flex: 1, alignItems: 'center', paddingVertical: 10 },
  pickerTabText: { fontSize: 14, fontWeight: '700', paddingBottom: 6 },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    margin: 10,
    marginBottom: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    backgroundColor: 'rgba(0,0,0,0.05)',
  },
  pickerSearch: { flex: 1, fontSize: 14, padding: 0 },
  catRow: { flexGrow: 0, marginBottom: 4 },
  catChip: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  emojiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 8,
    paddingBottom: 12,
  },
  emojiCell: {
    width: `${100 / 8}%`,
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
  },
  favStar: { position: 'absolute', top: 2, right: 4, fontSize: 8 },
  favHint: { width: '100%', textAlign: 'center', fontSize: 14, paddingVertical: 32 },
  resultCount: { width: '100%', fontSize: 12, paddingHorizontal: 4, paddingBottom: 4 },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 4,
    paddingVertical: 4,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
    paddingHorizontal: 4,
    paddingBottom: 4,
  },
  stickerGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    paddingHorizontal: 4,
  },
  stickerCellWrap: { position: 'relative', width: '23%' },
  stickerCell: { width: '100%', height: 64, borderRadius: 12 },
  stickerRemove: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: '#ef4444',
    width: 16,
    height: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stickerSave: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: 'rgba(255,255,255,0.85)',
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  noResults: { textAlign: 'center', fontSize: 14, paddingVertical: 24 },
  attachMenu: {
    position: 'absolute',
    bottom: '100%',
    left: 16,
    marginBottom: 8,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 16,
    flexDirection: 'row',
    gap: 24,
    zIndex: 50,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: -4 },
    elevation: 12,
  },
  attachItem: { alignItems: 'center', gap: 8, width: 68 },
  attachIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  attachLabel: { fontSize: 11, fontWeight: '600', textAlign: 'center' },
  recordingBar: {
    position: 'absolute',
    left: 8,
    right: 76,
    bottom: 8,
    height: 56,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    gap: 12,
    zIndex: 30,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  recDot: { width: 12, height: 12, borderRadius: 6 },
  recTime: { flex: 1, fontSize: 15, fontFamily: 'monospace', fontWeight: '600' },
  recCancel: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 999,
  },
});
