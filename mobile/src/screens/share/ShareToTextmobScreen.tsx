import React, { useEffect, useMemo, useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, Image, ScrollView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { File, Paths } from 'expo-file-system';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { navigationRef } from '../../navigation/navigationRef';
import type { ShareIntent } from 'expo-share-intent';

interface SharedItem {
  uri: string;
  name: string;
  mime: string;
  size?: number | null;
}

const MAX_PREVIEW_TEXT = 220;

function truncate(text: string, limit: number): string {
  return text.length > limit ? text.slice(0, limit) + '…' : text;
}

const IMAGE_EXTS = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'heic', 'heif', 'bmp', 'avif', 'svg', 'tiff', 'tif'];
const VIDEO_EXTS = ['mp4', 'mov', 'm4v', 'webm', 'avi', 'mkv', '3gp', 'mpg', 'mpeg'];

const EXT_MIME: Record<string, string> = {
  jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', gif: 'image/gif',
  webp: 'image/webp', heic: 'image/heic', heif: 'image/heif', bmp: 'image/bmp',
  avif: 'image/avif', svg: 'image/svg+xml', tiff: 'image/tiff', tif: 'image/tiff',
  mp4: 'video/mp4', mov: 'video/quicktime', m4v: 'video/x-m4v', webm: 'video/webm',
  avi: 'video/x-msvideo', mkv: 'video/x-matroska', '3gp': 'video/3gpp',
  mpg: 'video/mpeg', mpeg: 'video/mpeg',
};

function urlExt(url: string): string | null {
  try {
    const pathname = new URL(url).pathname;
    const match = pathname.match(/\.([a-zA-Z0-9]+)$/);
    return match ? match[1].toLowerCase() : null;
  } catch {
    return null;
  }
}

function urlMediaType(url: string): 'image' | 'video' | null {
  const ext = urlExt(url);
  if (!ext) return null;
  if (IMAGE_EXTS.includes(ext)) return 'image';
  if (VIDEO_EXTS.includes(ext)) return 'video';
  return null;
}

function fileNameFromUrl(url: string, ext: string): string {
  try {
    const pathname = new URL(url).pathname;
    const base = pathname.split('/').filter(Boolean).pop() || '';
    return base.includes('.') ? base : `shared_${Date.now()}.${ext}`;
  } catch {
    return `shared_${Date.now()}.${ext}`;
  }
}

async function downloadUrl(url: string): Promise<SharedItem | null> {
  const type = urlMediaType(url);
  if (!type) return null;
  const ext = urlExt(url) || (type === 'image' ? 'jpg' : 'mp4');
  const fileName = fileNameFromUrl(url, ext);
  const file = await (File as any).downloadFileAsync(url, new File(Paths.cache, fileName));
  return {
    uri: file.uri,
    name: fileName,
    mime: EXT_MIME[ext] || (type === 'image' ? 'image/jpeg' : 'video/mp4'),
  };
}

export default function ShareToTextmobScreen({ intent, onDone }: { intent: ShareIntent | null; onDone: () => void }) {
  const { colors, isDark } = useTheme();
  const { user } = useAuth();
  const username = user?.username || null;

  const [urlMedia, setUrlMedia] = useState<SharedItem[]>([]);
  const [urlConvertFailed, setUrlConvertFailed] = useState(false);

  const shareUrl = intent?.webUrl ?? null;
  const isMediaUrlShare = intent && !intent.files?.length && shareUrl && urlMediaType(shareUrl) !== null;

  useEffect(() => {
    if (!isMediaUrlShare) {
      setUrlMedia([]);
      setUrlConvertFailed(false);
      return;
    }
    let cancelled = false;
    downloadUrl(shareUrl!)
      .then((item) => {
        if (cancelled) return;
        if (item) setUrlMedia([item]);
        else setUrlConvertFailed(true);
      })
      .catch(() => {
        if (!cancelled) setUrlConvertFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, [isMediaUrlShare, shareUrl]);

  const content = useMemo(() => {
    const items: SharedItem[] = [];
    const textParts: string[] = [];
    const converted = urlMedia.length > 0;
    const notConverted = isMediaUrlShare && urlConvertFailed;
    if (intent?.text) {
      let text = intent.text.trim();
      if (converted && shareUrl) {
        text = text.replace(shareUrl, '').replace(/[,\s]+$/g, '').trim();
      }
      if (text) textParts.push(text);
    }
    if (shareUrl && (notConverted || !isMediaUrlShare) && !intent?.text?.includes(shareUrl)) {
      textParts.push(shareUrl.trim());
    }
    const files = intent?.files || [];
    for (const f of files) {
      const mime = f.mimeType || '';
      if (!mime.startsWith('image/') && !mime.startsWith('video/')) continue;
      const uri = Platform.OS === 'android' ? (f as any).filePath || (f as any).contentUri || f.path : f.path;
      if (!uri) continue;
      items.push({
        uri,
        name: f.fileName || `file_${Date.now()}`,
        mime,
        size: f.size ?? (f as any).fileSize ?? null,
      });
    }
    items.push(...urlMedia);
    return { text: textParts.filter(Boolean).join('\n'), items };
  }, [intent, shareUrl, isMediaUrlShare, urlConvertFailed, urlMedia]);

  const mediaItems = content.items;
  const images = mediaItems.filter(i => i.mime.startsWith('image/'));
  const videos = mediaItems.filter(i => i.mime.startsWith('video/'));

  const hasText = content.text.trim().length > 0;
  const hasAnyMedia = mediaItems.length > 0;

  const canPost = hasText || hasAnyMedia;
  const canPostToSnaps = mediaItems.length === 1 && videos.length === 1;

  const goToComposer = () => {
    if (!canPost) return;
    if (!username) {
      navigationRef.navigate('Login');
      return;
    }
    navigationRef.navigate('CreatePost', {
      sharedText: content.text,
      sharedMedia: mediaItems.map(m => ({ uri: m.uri, name: m.name, type: m.mime })),
    });
    onDone();
  };

  const goToSnaps = () => {
    if (!canPostToSnaps || !videos[0]) return;
    if (!username) {
      navigationRef.navigate('Login');
      return;
    }
    navigationRef.navigate('Snaps', {
      sharedVideo: { uri: videos[0].uri, name: videos[0].name, type: videos[0].mime },
      sharedCaption: hasText ? content.text : undefined,
    });
    onDone();
  };

  const handleLogin = () => {
    navigationRef.navigate('Login');
  };

  return (
    <View style={[styles.overlay, { backgroundColor: colors.background }]}>
      <SafeAreaView style={{ flex: 1 }}>
        {/* Header */}
        <View style={[styles.header, { borderBottomColor: colors.border }]}>
          <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Share to Textmob</Text>
          <TouchableOpacity style={styles.closeBtn} onPress={onDone} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Ionicons name="close" size={22} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
          {!username && (
            <View style={[styles.loginPrompt, { backgroundColor: isDark ? '#1e293b' : '#eff6ff' }]}>
              <Ionicons name="log-in-outline" size={18} color="#2563eb" />
              <Text style={[styles.loginPromptText, { color: colors.textSecondary }]} numberOfLines={2}>
                Log in to post this to your feed.
              </Text>
              <TouchableOpacity style={styles.loginBtn} onPress={handleLogin}>
                <Text style={styles.loginBtnText}>Log in</Text>
              </TouchableOpacity>
            </View>
          )}

          {!hasText && !hasAnyMedia ? (
            <View style={styles.emptyState}>
              <Ionicons name="share-social-outline" size={40} color={colors.textSecondary} />
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>Nothing to share yet</Text>
            </View>
          ) : (
            <>
              {/* Preview */}
              <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>CONTENT</Text>
              <View style={[styles.previewCard, { backgroundColor: isDark ? '#0f172a' : '#f8fafc', borderColor: colors.border }]}>
                {hasText && (
                  <Text style={[styles.previewText, { color: colors.textPrimary }]}>{truncate(content.text, MAX_PREVIEW_TEXT)}</Text>
                )}
                {hasText && hasAnyMedia && <View style={[styles.divider, { backgroundColor: colors.border }]} />}
                {images.length > 0 && (
                  <View style={styles.thumbRow}>
                    {images.map((img, i) => (
                      <Image key={i} source={{ uri: img.uri }} style={styles.thumb} />
                    ))}
                  </View>
                )}
                {videos.map((v, i) => (
                  <View key={`v${i}`} style={styles.fileRow}>
                    <View style={[styles.fileIcon, { backgroundColor: '#1e293b' }]}>
                      <Ionicons name="videocam" size={16} color="#fff" />
                    </View>
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <Text style={[styles.fileName, { color: colors.textPrimary }]} numberOfLines={1}>{v.name}</Text>
                      <Text style={[styles.fileMeta, { color: colors.textSecondary }]}>Video {v.size ? `· ${(v.size / (1024 * 1024)).toFixed(1)} MB` : ''}</Text>
                    </View>
                  </View>
                ))}
              </View>
            </>
          )}

          {hasText || hasAnyMedia ? (
            <>
              <Text style={[styles.sectionLabel, { color: colors.textSecondary, marginTop: 20 }]}>SHARE AS</Text>

              {/* Post as post */}
              <TouchableOpacity
                style={[styles.optionCard, { backgroundColor: colors.card, borderColor: colors.border }]}
                onPress={goToComposer}
                disabled={!canPost}
              >
                <View style={[styles.optionIcon, { backgroundColor: '#eff6ff' }]}>
                  <Ionicons name="create-outline" size={20} color="#2563eb" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.optionTitle, { color: colors.textPrimary }]}>Post as post</Text>
                  <Text style={[styles.optionSub, { color: colors.textSecondary }]}>
                    Add a caption and share it to your feed
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
              </TouchableOpacity>

              {/* Post to snaps (video only) */}
              <TouchableOpacity
                style={[
                  styles.optionCard,
                  { backgroundColor: colors.card, borderColor: colors.border },
                  !canPostToSnaps && { opacity: 0.45 },
                ]}
                onPress={goToSnaps}
                disabled={!canPostToSnaps}
              >
                <View style={[styles.optionIcon, { backgroundColor: '#fef2f2' }]}>
                  <Ionicons name="videocam" size={20} color="#dc2626" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.optionTitle, { color: colors.textPrimary }]}>Post to Snaps</Text>
                  <Text style={[styles.optionSub, { color: colors.textSecondary }]}>
                    {canPostToSnaps
                      ? 'Share this video as a Snap'
                      : 'Snaps are for videos only — images and text aren’t supported'}
                  </Text>
                </View>
                {canPostToSnaps && <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />}
              </TouchableOpacity>
            </>
          ) : null}
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: { ...StyleSheet.absoluteFillObject, zIndex: 99999, elevation: 99999 },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    height: 52, paddingHorizontal: 16, borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerTitle: { fontSize: 16, fontWeight: '700' },
  closeBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  loginPrompt: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    borderRadius: 14, padding: 12, marginBottom: 16,
  },
  loginPromptText: { flex: 1, fontSize: 12, fontWeight: '600' },
  loginBtn: { backgroundColor: '#2563eb', borderRadius: 18, paddingHorizontal: 16, paddingVertical: 7 },
  loginBtnText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  emptyState: { alignItems: 'center', gap: 10, paddingVertical: 60 },
  emptyText: { fontSize: 14, fontWeight: '600' },
  sectionLabel: { fontSize: 10, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 1.2, marginBottom: 8 },
  previewCard: { borderRadius: 16, borderWidth: 1, padding: 14, gap: 10 },
  previewText: { fontSize: 14, lineHeight: 20 },
  divider: { height: StyleSheet.hairlineWidth, marginVertical: 2 },
  thumbRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  thumb: { width: 72, height: 72, borderRadius: 10, backgroundColor: '#1e293b' },
  fileRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  fileIcon: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  fileName: { fontSize: 13, fontWeight: '600' },
  fileMeta: { fontSize: 11, marginTop: 2 },
  optionCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    borderRadius: 16, borderWidth: 1, padding: 14, marginBottom: 10,
  },
  optionIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  optionTitle: { fontSize: 14, fontWeight: '700' },
  optionSub: { fontSize: 12, marginTop: 2 },
});