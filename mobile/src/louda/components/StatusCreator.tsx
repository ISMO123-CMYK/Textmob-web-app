import React, { memo, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  Modal,
  StyleSheet,
  Image,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import { Ripple } from '../../components/Ripple';
import {
  createVideoPlayer,
  VideoView,
  type VideoPlayer as VideoPlayerInstance,
} from 'expo-video';
import { createAudioPlayer, type AudioPlayer as AudioPlayerInstance } from 'expo-audio';
import * as ImagePicker from 'expo-image-picker';
import { Icons } from '../icons';
import * as api from '../api';
import { loudaAlert } from '../utils';

const BG_COLORS = [
  '#FF5722', '#673AB7', '#009688', '#1976D2', '#795548', '#455A64',
  '#000000', '#E91E63', '#9C27B0', '#2E7D32', '#E64A19', '#374151',
];

// Same CSS families as web (StatusComponents.jsx:224-233) — stored verbatim in
// settings.font for web parity; resolved to system fonts for RN rendering.
const FONT_CSS = [
  'Inter, sans-serif',
  '"Comic Sans MS", cursive',
  'Impact, sans-serif',
  '"Courier New", monospace',
  '"Playfair Display", serif',
  '"Outfit", sans-serif',
  '"Cinzel", serif',
  '"Bebas Neue", sans-serif',
];

export function resolveFont(css?: string): string | undefined {
  if (!css) return undefined;
  if (css.includes('Comic Sans')) return Platform.OS === 'ios' ? 'Comic Sans MS' : undefined;
  if (css.includes('Impact')) return Platform.OS === 'ios' ? 'Impact' : undefined;
  if (css.includes('Courier')) return Platform.OS === 'ios' ? 'Courier New' : 'monospace';
  if (css.includes('Playfair') || css.includes('Cinzel'))
    return Platform.OS === 'ios' ? 'Georgia' : 'serif';
  return undefined;
}

const getFontSize = (txt: string) => {
  const len = txt.length;
  if (len < 30) return 40;
  if (len < 65) return 34;
  if (len < 110) return 28;
  if (len < 160) return 22;
  return 18;
};

// Port of StatusCreator (StatusComponents.jsx:220-497)
export const StatusCreator = memo(function StatusCreator({
  user,
  onClose,
  initialMedia,
  onStatusPosted,
}: {
  user: any;
  onClose: () => void;
  initialMedia?: { file?: any; type?: string; music?: any } | null;
  onStatusPosted?: () => void;
}) {
  const [text, setText] = useState('');
  const [bgIndex, setBgIndex] = useState(0);
  const [fontIndex, setFontIndex] = useState(0);
  const [mediaFile, setMediaFile] = useState<any>(null);
  const [mediaPreview, setMediaPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const [musicQuery, setMusicQuery] = useState('');
  const [musicResults, setMusicResults] = useState<any[]>([]);
  const [selectedMusic, setSelectedMusic] = useState<any>(null);
  const [showMusicSearch, setShowMusicSearch] = useState(false);
  const [playingMusicId, setPlayingMusicId] = useState<any>(null);
  const [searchingMusic, setSearchingMusic] = useState(false);

  const previewPlayerRef = useRef<VideoPlayerInstance | null>(null);
  const [previewPlayer, setPreviewPlayer] = useState<VideoPlayerInstance | null>(null);
  const previewAudioRef = useRef<AudioPlayerInstance | null>(null);

  // initialMedia from camera (web 255-273)
  useEffect(() => {
    if (initialMedia && initialMedia.file) {
      const file = initialMedia.file;
      const uri = typeof file === 'string' ? file : file.uri;
      setMediaFile({
        uri,
        name: (typeof file === 'object' && file.fileName) || `camera-${Date.now()}.${initialMedia.type === 'video' ? 'mp4' : 'jpg'}`,
        type: (typeof file === 'object' && file.mimeType) || (initialMedia.type === 'video' ? 'video/mp4' : 'image/jpeg'),
      });
      setMediaPreview(uri);
      setBgIndex(BG_COLORS.indexOf('#000000'));
      if (initialMedia.music) setSelectedMusic(initialMedia.music);
    }
  }, [initialMedia]);

  // Media preview video player
  useEffect(() => {
    if (mediaPreview && mediaFile?.type?.startsWith('video')) {
      const pl = createVideoPlayer(mediaPreview);
      pl.loop = true;
      pl.muted = true;
      try {
        pl.play();
      } catch {}
      previewPlayerRef.current = pl;
      setPreviewPlayer(pl);
      return () => {
        try {
          pl.pause();
        } catch {}
        previewPlayerRef.current = null;
        setPreviewPlayer(null);
      };
    }
  }, [mediaPreview, mediaFile]);

  useEffect(() => {
    return () => {
      try {
        previewAudioRef.current?.remove();
      } catch {}
      previewAudioRef.current = null;
    };
  }, []);

  const pickMedia = async () => {
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images', 'videos'],
      quality: 0.8,
    });
    if (res.canceled || !res.assets?.length) return;
    const a = res.assets[0];
    setMediaFile({
      uri: a.uri,
      name: a.fileName || `status_${Date.now()}`,
      type: a.mimeType || 'image/jpeg',
    });
    setMediaPreview(a.uri);
    setBgIndex(BG_COLORS.indexOf('#000000'));
  };

  const searchMusic = async () => {
    if (!musicQuery.trim()) return;
    setSearchingMusic(true);
    try {
      const res = await fetch(
        `https://itunes.apple.com/search?term=${encodeURIComponent(musicQuery)}&entity=song&limit=15`,
      );
      const data = await res.json();
      const mapped = data.results.map((r: any) => ({
        id: r.trackId,
        name: r.trackName,
        artist_name: r.artistName,
        audio: r.previewUrl,
      }));
      setMusicResults(mapped);
    } catch (e) {
      console.error('Music search failed', e);
    } finally {
      setSearchingMusic(false);
    }
  };

  const stopMusicPreview = () => {
    try {
      previewAudioRef.current?.pause();
    } catch {}
    previewAudioRef.current?.remove();
    previewAudioRef.current = null;
    setPlayingMusicId(null);
  };

  const toggleMusicPreview = (m: any) => {
    if (playingMusicId === m.id) {
      stopMusicPreview();
      return;
    }
    stopMusicPreview();
    try {
      const pl = createAudioPlayer({ uri: m.audio });
      pl.play();
      previewAudioRef.current = pl;
      setPlayingMusicId(m.id);
      const sub = pl.addListener('playbackStatusUpdate', (status) => {
        if (status.isLoaded && (status as any).didJustFinish) {
          setPlayingMusicId(null);
          sub.remove();
        }
      });
    } catch (e) {
      console.error(e);
      setPlayingMusicId(null);
    }
  };

  const postStatus = async () => {
    if (!text.trim() && !mediaFile) return;
    setUploading(true);
    try {
      let media_url: string | null = null;
      let type = 'text';

      if (mediaFile) {
        const data = await api.uploadFile({
          uri: mediaFile.uri,
          name: mediaFile.name,
          type: mediaFile.type,
          kind: mediaFile.type?.startsWith('video') ? 'video' : 'image',
        });
        media_url = data.url;
        type = data.type || (mediaFile.type.startsWith('video') ? 'video' : 'image');
      }

      const payload = {
        type,
        content: text,
        media_url,
        music: selectedMusic
          ? {
              id: selectedMusic.id,
              name: selectedMusic.name,
              artist: selectedMusic.artist_name,
              url: selectedMusic.audio,
            }
          : {},
        settings: { bg: BG_COLORS[bgIndex], font: FONT_CSS[fontIndex] },
      };

      await api.createStatus(user.id, payload);
      if (onStatusPosted) onStatusPosted();
      onClose();
    } catch (err) {
      console.error('Failed to post status', err);
      Alert.alert('', 'Failed to post status. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const canPost = !!(text.trim() || mediaFile) && !uploading;

  return (
    <Modal transparent statusBarTranslucent visible onRequestClose={onClose}>
      <View style={[s.root, { backgroundColor: BG_COLORS[bgIndex] }]}>
        {/* Top bar (web 383-396) */}
        <View style={s.topBar}>
          <Ripple onPress={onClose} style={s.topBtn}>
            <Icons.x size={20} color="#fff" />
          </Ripple>
          <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }}>
            <Ripple style={s.topAction} onPress={() => setShowMusicSearch(true)}>
              <Icons.music size={17} color="#fff" />
              <Text style={s.topActionText}>Music</Text>
            </Ripple>
            <Ripple style={s.topAction} onPress={pickMedia}>
              <Icons.image size={17} color="#fff" />
              <Text style={s.topActionText}>Media</Text>
            </Ripple>
          </View>
        </View>

        {/* Stage (web 398-432) */}
        <View style={s.stage}>
          {mediaPreview && (
            <View style={s.previewWrap}>
              {mediaFile?.type?.startsWith('video') && previewPlayer ? (
                <VideoView
                  player={previewPlayer}
                  style={{ width: '100%', height: '100%' }}
                  contentFit="contain"
                  nativeControls={false}
                />
              ) : (
                <Image source={{ uri: mediaPreview }} style={{ width: '100%', height: '100%' }} resizeMode="contain" />
              )}
            </View>
          )}

          <TextInput
            value={text}
            onChangeText={setText}
            placeholder={mediaFile ? 'Add a caption...' : 'Type a status'}
            placeholderTextColor="rgba(255,255,255,0.5)"
            multiline
            autoFocus={!initialMedia}
            style={[
              s.textInput,
              mediaPreview ? s.captionInput : { fontSize: getFontSize(text) },
              { fontFamily: resolveFont(FONT_CSS[fontIndex]) },
            ]}
          />

          {/* Selected music chip (web 419-431) */}
          {selectedMusic && (
            <View style={s.musicChip}>
              <Ripple style={s.musicPlay} onPress={() => toggleMusicPreview(selectedMusic)}>
                {playingMusicId === selectedMusic.id ? (
                  <Icons.pause size={12} color="#fff" />
                ) : (
                  <Icons.play size={12} color="#fff" />
                )}
              </Ripple>
              <Text style={s.musicChipText} numberOfLines={1}>
                {selectedMusic.name}
              </Text>
              <Ripple
                onPress={() => {
                  setSelectedMusic(null);
                  stopMusicPreview();
                }}
              >
                <Icons.x size={13} color="#fff" />
              </Ripple>
            </View>
          )}
        </View>

        {/* Color + font pickers (web 434-451) */}
        {!mediaFile && (
          <View style={s.pickers}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.pickerRow}>
              <Text style={s.pickerLabel}>Color</Text>
              {BG_COLORS.map((color, i) => (
                <Ripple
                  key={color}
                  onPress={() => setBgIndex(i)}
                  style={[
                    s.colorDot,
                    {
                      backgroundColor: color,
                      borderColor: bgIndex === i ? '#fff' : 'transparent',
                      opacity: bgIndex === i ? 1 : 0.8,
                    },
                  ]}
                />
              ))}
            </ScrollView>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.pickerRow}>
              <Text style={s.pickerLabel}>Font</Text>
              {FONT_CSS.map((f, i) => (
                <Ripple
                  key={f}
                  onPress={() => setFontIndex(i)}
                  style={[
                    s.fontChip,
                    fontIndex === i && { backgroundColor: 'rgba(255,255,255,0.28)', borderColor: 'rgba(255,255,255,0.6)' },
                  ]}
                >
                  <Text
                    style={[
                      s.fontChipText,
                      { fontFamily: resolveFont(f) },
                      fontIndex === i && { color: '#fff' },
                    ]}
                    numberOfLines={1}
                  >
                    {f.split(',')[0].replace(/"/g, '')}
                  </Text>
                </Ripple>
              ))}
            </ScrollView>
          </View>
        )}

        {/* Post FAB (web 453-461) */}
        <View style={s.fabWrap}>
          <Ripple
            style={[s.fab, { backgroundColor: '#2563eb', opacity: canPost ? 1 : 0.5 }]}
            disabled={!canPost}
            onPress={postStatus}
          >
            {uploading ? <ActivityIndicator size="small" color="#fff" /> : <Icons.send size={23} color="#fff" />}
          </Ripple>
        </View>

        {/* Music search sheet (web 463-493) */}
        <Modal transparent statusBarTranslucent visible={showMusicSearch} onRequestClose={() => setShowMusicSearch(false)}>
          <View style={s.musicSheet}>
            <View style={s.musicHead}>
              <Ripple onPress={() => setShowMusicSearch(false)} style={{ padding: 6 }}>
                <Icons.arrowLeft size={22} color="#6b7280" />
              </Ripple>
              <TextInput
                value={musicQuery}
                onChangeText={setMusicQuery}
                onSubmitEditing={searchMusic}
                placeholder="Search Music..."
                placeholderTextColor="#9ca3af"
                style={s.musicSearchInput}
                autoFocus
              />
              <Ripple onPress={searchMusic} style={{ paddingHorizontal: 8 }}>
                <Text style={s.searchBtn}>Search</Text>
              </Ripple>
            </View>
            <ScrollView contentContainerStyle={{ padding: 8 }}>
              {searchingMusic && (
                <ActivityIndicator style={{ marginTop: 40 }} color="#2563eb" />
              )}
              {!searchingMusic &&
                musicResults.map((m) => (
                  <Ripple
                    key={m.id}
                    activeOpacity={0.8}
                    style={s.musicRow}
                    onPress={() => {
                      setSelectedMusic(m);
                      setShowMusicSearch(false);
                      stopMusicPreview();
                    }}
                  >
                    <Ripple style={s.musicRowPlay} onPress={() => toggleMusicPreview(m)}>
                      {playingMusicId === m.id ? (
                        <Icons.pause size={18} color="#2563eb" />
                      ) : (
                        <Icons.play size={18} color="#6b7280" />
                      )}
                    </Ripple>
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <Text style={s.musicName} numberOfLines={1}>
                        {m.name}
                      </Text>
                      <Text style={s.musicArtist} numberOfLines={1}>
                        {m.artist_name}
                      </Text>
                    </View>
                  </Ripple>
                ))}
              {!searchingMusic && musicResults.length === 0 && musicQuery.length > 0 && (
                <Text style={s.musicEmpty}>Press Search to find music</Text>
              )}
            </ScrollView>
          </View>
        </Modal>
      </View>
    </Modal>
  );
});

const s = StyleSheet.create({
  root: { flex: 1 },
  topBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 30,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingTop: Platform.OS === 'ios' ? 56 : 36,
    paddingBottom: 12,
    backgroundColor: 'rgba(0,0,0,0.2)',
  },
  topBtn: { padding: 10, borderRadius: 999 },
  topAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: 'rgba(0,0,0,0.18)',
  },
  topActionText: { color: '#fff', fontSize: 14, fontWeight: '700' },
  stage: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 110,
    paddingBottom: 170,
  },
  previewWrap: {
    ...StyleSheet.absoluteFill,
    backgroundColor: '#000',
    alignItems: 'center',
    justifyContent: 'center',
  },
  textInput: {
    width: '100%',
    color: '#fff',
    textAlign: 'center',
    paddingHorizontal: 24,
    zIndex: 10,
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 10,
  },
  captionInput: {
    position: 'absolute',
    bottom: 96,
    left: 16,
    right: 16,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 16,
    padding: 16,
    fontSize: 17,
    minHeight: 60,
    textAlignVertical: 'top',
    textShadowRadius: 0,
  },
  musicChip: {
    position: 'absolute',
    top: 8,
    right: 16,
    zIndex: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    maxWidth: 210,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  musicPlay: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  musicChipText: { color: '#fff', fontSize: 12, fontWeight: '700', flexShrink: 1 },
  pickers: {
    position: 'absolute',
    bottom: 80,
    left: 0,
    right: 0,
    paddingHorizontal: 24,
    paddingVertical: 16,
    gap: 14,
    zIndex: 20,
  },
  pickerRow: { alignItems: 'center', gap: 12, paddingRight: 12 },
  pickerLabel: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 2,
  },
  colorDot: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 2,
  },
  fontChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  fontChipText: { color: 'rgba(255,255,255,0.75)', fontSize: 13, fontWeight: '600' },
  fabWrap: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: 'flex-end',
    paddingHorizontal: 20,
    paddingBottom: Platform.OS === 'ios' ? 44 : 28,
    paddingTop: 24,
    zIndex: 30,
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  fab: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 6,
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
  },
  musicSheet: {
    flex: 1,
    backgroundColor: '#fff',
  },
  musicHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#e5e7eb',
    marginTop: Platform.OS === 'ios' ? 44 : 24,
  },
  musicSearchInput: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
  },
  searchBtn: { color: '#E64A19', fontSize: 13, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 1 },
  musicRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderRadius: 12,
  },
  musicRowPlay: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: '#f3f4f6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  musicName: { fontSize: 14, fontWeight: '700', color: '#111827' },
  musicArtist: { fontSize: 12, color: '#6b7280', marginTop: 2 },
  musicEmpty: { textAlign: 'center', color: '#9ca3af', fontSize: 14, marginTop: 44 },
});
