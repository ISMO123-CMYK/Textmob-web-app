import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  View, Text, Image, TouchableOpacity, StyleSheet, TextInput, Modal,
  FlatList, ActivityIndicator, Alert, Pressable, ScrollView, Dimensions, Share, Animated, useWindowDimensions, PanResponder,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useEvent } from 'expo';
import { useVideoPlayer, VideoView } from 'expo-video';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { useNavigation } from '@react-navigation/native';
import {
  likePostAPI, addCommentAPI, reactPostAPI, getPostReactionsAPI,
  votePollAPI, Post, Comment, Reaction,
} from '../api/posts';
import { apiGet, apiPost } from '../api/client';
import { getProfileAPI } from '../api/auth';
import { timeAgo } from '../utils/format';
import GiftCoinsModal from './GiftCoinsModal';
import useProfileCache from '../hooks/useProfileCache';
import { getFollowStatusAPI, followAPI, friendAPI } from '../api/users';
import { SnapVideoPlayer } from '../screens/snaps/SnapsScreen';

const DEFAULT_PIC = 'https://res.cloudinary.com/dzvm9xe1i/image/upload/v1746095979/profile-pictures/e2st5nispbicnhnir9cf.jpg';
const SCREEN_WIDTH = Dimensions.get('window').width;
const SCREEN_HEIGHT = Dimensions.get('window').height;

const REACTIONS = [
  { r: '❤️', t: 'love' }, { r: '😂', t: 'funny' }, { r: '🔥', t: 'fire' },
  { r: '👍', t: 'like' }, { r: '😮', t: 'wow' }, { r: '😢', t: 'sad' },
  { r: '👏', t: 'clap' }, { r: '😡', t: 'angry' }, { r: '🥰', t: 'adore' },
  { r: '🙌', t: 'hype' }, { r: '💯', t: 'facts' }, { r: '🤔', t: 'hmm' },
  { r: '🤯', t: 'mindblown' }, { r: '😎', t: 'cool' }, { r: '🤩', t: 'amazed' },
  { r: '😴', t: 'boring' }, { r: '😇', t: 'wholesome' }, { r: '💔', t: 'hurt' },
  { r: '😅', t: 'awkward' }, { r: '🙏', t: 'respect' },
];

const isVideo = (uri: string) => /\.(mp4|webm|ogg)$/i.test(uri);

function VerifiedBadge({ size = 14 }: { size?: number }) {
  return <Ionicons name="checkmark-circle" size={size} color="#2563eb" />;
}

import SafeHTML from './SafeHTML';

function RichText({ text, style }: { text: string; style?: any }) {
  return <SafeHTML text={text} style={style} />;
}
function PostMenu({ visible, onClose, post, onNegativeSignal }: { visible: boolean; onClose: () => void; post: Post; onNegativeSignal?: (postId: string, signal: string, contentType: string) => void }) {
  const { colors, isDark } = useTheme();
  const { username } = useAuth();
  const items = [
    { icon: 'share-outline' as const, label: 'Share' },
    { icon: 'link-outline' as const, label: 'Copy link' },
    { type: 'divider' as const },
    { icon: 'eye-off-outline' as const, label: 'Not interested', signal: 'not_interested' },
    { icon: 'close-circle-outline' as const, label: 'Hide', signal: 'hide' },
    { type: 'divider' as const },
    { icon: 'flag-outline' as const, label: 'Report', danger: true },
  ];
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableOpacity style={pmStyles.overlay} activeOpacity={1} onPress={onClose}>
        <View style={[pmStyles.sheet, { backgroundColor: colors.card }]}>
          <View style={[pmStyles.handle, { backgroundColor: isDark ? '#475569' : '#cbd5e1' }]} />
          {items.map((item: any) => {
            if (item.type === 'divider') {
              return <View key={Math.random()} style={{ height: 1, backgroundColor: colors.border, marginVertical: 4 }} />;
            }
            return (
              <TouchableOpacity
                key={item.label}
                style={pmStyles.row}
                onPress={() => {
                  onClose();
                  if (item.label === 'Copy link') {
                    Alert.alert('Copied', 'Post link copied to clipboard!');
                  } else if (item.signal) {
                    if (onNegativeSignal) {
                      onNegativeSignal(String(post.id), item.signal, post.type || 'post');
                    } else if (username) {
                      apiPost('/negative-signal', { username, postId: String(post.id), signalType: item.signal, contentType: post.type || 'post' }).catch(() => {});
                    }
                  }
                }}
              >
                <Ionicons name={item.icon} size={20} color={item.danger ? '#ef4444' : colors.textSecondary} />
                <Text style={[pmStyles.label, { color: item.danger ? '#ef4444' : colors.textPrimary }]}>{item.label}</Text>
              </TouchableOpacity>
            );
          })}
          <TouchableOpacity style={[pmStyles.cancelBtn, { backgroundColor: isDark ? '#1e293b' : '#f1f5f9' }]} onPress={onClose}>
            <Text style={[pmStyles.cancelText, { color: colors.textPrimary }]}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </Modal>
  );
}
const pmStyles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  sheet: { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 16, paddingBottom: 32 },
  handle: { width: 36, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: 16 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14 },
  label: { fontSize: 14, fontWeight: '600' },
  cancelBtn: { marginTop: 12, paddingVertical: 12, borderRadius: 12, alignItems: 'center' },
  cancelText: { fontSize: 14, fontWeight: '700' },
});


function FollowButton({ targetUsername, onUpdate }: { targetUsername: string; onUpdate?: () => void }) {
  const { colors } = useTheme();
  const { username } = useAuth();
  const [status, setStatus] = useState<string>('loading');
  const [profileType, setProfileType] = useState('individual');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!targetUsername || !username || targetUsername === username) {
      setStatus('none');
      return;
    }
    getFollowStatusAPI(username, targetUsername).then(r => {
      if (r.ok && r.data) {
        setStatus(r.data.status || 'not_friended');
        setProfileType((r.data.profileType || 'individual').toLowerCase());
      } else {
        setStatus('not_friended');
      }
    }).catch(() => setStatus('not_friended'));
  }, [targetUsername, username]);

  if (!targetUsername || !username || targetUsername === username) return null;
  if (status === 'friended' || status === 'following') return null;

  async function toggle() {
    if (submitting || status === 'loading') return;
    setSubmitting(true);
    try {
      const isOrg = profileType !== 'individual';
      const action = isOrg ? 'follow' : 'friend';
      const api = isOrg ? followAPI : friendAPI;
      const res = await api(targetUsername, username!, action);
      if (res.ok && res.data) {
        setStatus(res.data.status);
        onUpdate?.();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <TouchableOpacity onPress={toggle} disabled={submitting || status === 'loading'} style={{ marginRight: 4 }}>
      <Text style={{ fontSize: 12, fontWeight: '700', color: colors.primary }}>
        {status === 'loading' ? '...' : status === 'not_following' ? 'Follow' : 'Add Friend'}
      </Text>
    </TouchableOpacity>
  );
}

function QuotedPostView({ quotedPostId, onNavigate }: { quotedPostId: string; onNavigate?: (path: string) => void }) {
  const { colors, isDark } = useTheme();
  const { username } = useAuth();
  const [post, setPost] = useState<Post | null>(null);
  useEffect(() => {
    if (quotedPostId) {
      apiGet(`/get-post?postId=${encodeURIComponent(quotedPostId)}`)
        .then(r => { if (r.ok) setPost(r.data); });
    }
  }, [quotedPostId]);
  if (!post) return null;
  return (
    <TouchableOpacity
      style={[qStyles.card, { borderColor: colors.border, backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)' }]}
      onPress={() => { if (!username) { Alert.alert('Sign in', 'Create an account to view posts'); return; } onNavigate?.(`/post/${post.id}`); }}
    >
      <View style={qStyles.header}>
        <Image source={{ uri: DEFAULT_PIC }} style={qStyles.avatar} />
        <Text style={[qStyles.name, { color: colors.textPrimary }]} numberOfLines={1}>{post.fullname || post.username}</Text>
        {post.verified && <VerifiedBadge size={12} />}
        <Text style={[qStyles.time, { color: colors.textSecondary }]}>· {timeAgo(post.created_at)}</Text>
      </View>
      <RichText text={post.text || ''} style={[qStyles.text, { color: colors.textSecondary }]} />
      {post.media && post.media.length > 0 && (
        <Image source={{ uri: post.media[0] }} style={qStyles.thumb} resizeMode="cover" />
      )}
    </TouchableOpacity>
  );
}
const qStyles = StyleSheet.create({
  card: { marginTop: 10, padding: 12, borderRadius: 12, borderWidth: 1 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 },
  avatar: { width: 20, height: 20, borderRadius: 10 },
  name: { fontSize: 12, fontWeight: '700', maxWidth: 120 },
  time: { fontSize: 10 },
  text: { fontSize: 12, lineHeight: 16, maxHeight: 48, overflow: 'hidden' },
  thumb: { width: '100%', height: 100, borderRadius: 8, marginTop: 6 },
});

function VideoThumbnail({ uri, aspectRatio, noMargin, onPress }: { uri: string; aspectRatio: number; noMargin?: boolean; onPress: () => void }) {
  const [imgError, setImgError] = useState(false);
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.9}
      style={{ width: '100%', aspectRatio, maxHeight: SCREEN_HEIGHT * 0.75, borderRadius: noMargin ? 0 : 12, overflow: 'hidden', marginBottom: noMargin ? 0 : 10 }}
    >
      {imgError ? (
        <View style={{ flex: 1, backgroundColor: '#1e293b', alignItems: 'center', justifyContent: 'center' }}>
          <Ionicons name="videocam" size={40} color="rgba(255,255,255,0.3)" />
        </View>
      ) : (
        <Image source={{ uri }} style={{ width: '100%', height: '100%' }} resizeMode="cover" onError={() => setImgError(true)} />
      )}
      <View style={{ position: 'absolute', inset: 0, alignItems: 'center', justifyContent: 'center' }}>
        <View style={{ width: 54, height: 54, borderRadius: 27, backgroundColor: 'rgba(0,0,0,0.55)', alignItems: 'center', justifyContent: 'center' }}>
          <Ionicons name="play" size={28} color="#fff" style={{ marginLeft: 3 }} />
        </View>
      </View>
    </TouchableOpacity>
  );
}

function VideoPlayerFullscreen({ uri, visible, onClose }: { uri: string; visible: boolean; onClose: () => void }) {
  const player = useVideoPlayer(uri, p => { p.loop = false; p.muted = false; });
  useEffect(() => {
    if (visible) player.play();
    else player.pause();
  }, [visible, player]);
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: '#000' }}>
        <VideoView player={player} style={{ flex: 1 }} nativeControls contentFit="contain" />
        <TouchableOpacity onPress={onClose} style={{ position: 'absolute', top: 50, right: 16, width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' }}>
          <Ionicons name="close" size={22} color="#fff" />
        </TouchableOpacity>
      </View>
    </Modal>
  );
}

function MediaItem({ uri, isActive, onPress }: { uri: string; isActive?: boolean; onPress?: () => void }) {
  const vid = isVideo(uri);
  if (vid) {
    return <VideoItem uri={uri} isActive={isActive} />;
  }
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.9}>
      <Image source={{ uri }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
    </TouchableOpacity>
  );
}

function VideoItem({ uri, noMargin }: { uri: string; isActive?: boolean; noMargin?: boolean }) {
  const [fullscreenVisible, setFullscreenVisible] = useState(false);
  return (
    <>
      <VideoThumbnail uri={uri} aspectRatio={16 / 9} noMargin={noMargin} onPress={() => setFullscreenVisible(true)} />
      <VideoPlayerFullscreen uri={uri} visible={fullscreenVisible} onClose={() => setFullscreenVisible(false)} />
    </>
  );
}

function SingleImage({ src, onOpenLightbox }: { src: string; onOpenLightbox?: (idx: number) => void }) {
  const [aspectRatio, setAspectRatio] = useState(1.5);

  useEffect(() => {
    Image.getSize(src, (w, h) => {
      if (w && h) setAspectRatio(w / h);
    }, () => { });
  }, [src]);

  return (
    <TouchableOpacity onPress={() => onOpenLightbox?.(0)} style={{ marginBottom: 10 }}>
      <Image source={{ uri: src }} style={{ width: '100%', aspectRatio, borderRadius: 12 }} resizeMode="contain" />
    </TouchableOpacity>
  );
}

function MediaGallery({ media, isActive, onOpenLightbox }: { media: string[]; isActive?: boolean; onOpenLightbox?: (idx: number) => void }) {
  if (!media?.length) return null;
  const count = media.length;

  if (count === 1) {
    const src = media[0];
    if (isVideo(src)) {
      return <VideoItem uri={src} isActive={isActive} />;
    }
    return <SingleImage src={src} onOpenLightbox={onOpenLightbox} />;
  }

  const cells = media.slice(0, 6).map((src, i) => {
    const isLast = i === 5 && count > 6;
    return (
      <TouchableOpacity key={i} onPress={() => onOpenLightbox?.(i)} style={{ flex: 1, aspectRatio: 1, overflow: 'hidden' }}>
        {isVideo(src) ? <VideoItem uri={src} /> : <Image source={{ uri: src }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />}
        {isLast && <View style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(0,0,0,0.55)', alignItems: 'center', justifyContent: 'center' }}><Text style={{ color: '#fff', fontSize: 20, fontWeight: '700' }}>+{count - 6}</Text></View>}
      </TouchableOpacity>
    );
  });

  let grid: React.ReactNode;
  if (count === 2) {
    grid = <View style={{ flexDirection: 'row', gap: 2, marginBottom: 10 }}>{cells}</View>;
  } else if (count === 3) {
    grid = (
      <View style={{ flexDirection: 'row', gap: 2, marginBottom: 10 }}>
        <View style={{ flex: 2, aspectRatio: 1 }}>{cells[0]}</View>
        <View style={{ flex: 1, gap: 2 }}>{cells.slice(1)}</View>
      </View>
    );
  } else {
    grid = <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 2, marginBottom: 10 }}>{cells.map((c, i) => <View key={i} style={{ width: '31%', aspectRatio: 1 }}>{c}</View>)}</View>;
  }
  return <View style={{ borderRadius: 12, overflow: 'hidden' }}>{grid}</View>;
}

function ZoomableImage({ uri }: { uri: string }) {
  const [scale, setScale] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const lastScale = useRef(1);
  const lastPan = useRef({ x: 0, y: 0 });
  const baseDist = useRef(0);

  const panResponder = useMemo(() =>
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gs) => gs.dx !== 0 || gs.dy !== 0,
      onPanResponderGrant: (evt) => {
        if (evt.nativeEvent.touches.length === 2) {
          const [t1, t2] = evt.nativeEvent.touches;
          baseDist.current = Math.hypot(t2.pageX - t1.pageX, t2.pageY - t1.pageY);
          lastScale.current = scale;
          lastPan.current = pan;
        } else {
          lastPan.current = pan;
        }
      },
      onPanResponderMove: (evt, gs) => {
        if (evt.nativeEvent.touches.length === 2) {
          const [t1, t2] = evt.nativeEvent.touches;
          const dist = Math.hypot(t2.pageX - t1.pageX, t2.pageY - t1.pageY);
          if (baseDist.current > 0) {
            setScale(Math.max(1, Math.min(4, lastScale.current * (dist / baseDist.current))));
          }
        } else if (scale > 1) {
          setPan({ x: lastPan.current.x + gs.dx / scale, y: lastPan.current.y + gs.dy / scale });
        }
      },
      onPanResponderRelease: () => {
        baseDist.current = 0;
      },
    }), [scale, pan]);

  return (
    <View style={{ flex: 1 }} {...panResponder.panHandlers}>
      <Image
        source={{ uri }}
        style={{
          width: '100%',
          height: '100%',
          transform: [{ scale }, { translateX: pan.x }, { translateY: pan.y }],
        }}
        resizeMode="contain"
      />
    </View>
  );
}

function MediaLightbox({ media, startIndex, onClose }: { media: string[]; startIndex: number; onClose: () => void }) {
  const [idx, setIdx] = useState(startIndex);
  const src = media[idx];
  const isVid = isVideo(src);

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: '#000' }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12 }}>
          <TouchableOpacity onPress={onClose} style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center' }}>
            <Ionicons name="close" size={20} color="#fff" />
          </TouchableOpacity>
          {media.length > 1 && <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 13, fontWeight: '600' }}>{idx + 1} / {media.length}</Text>}
          <View style={{ width: 36 }} />
        </View>
        <View style={{ flex: 1 }}>
          {isVid ? (
            <View style={{ width: '100%', height: '100%' }}><VideoItem uri={src} noMargin /></View>
          ) : (
            <ZoomableImage key={idx} uri={src} />
          )}
        </View>
        {media.length > 1 && (
          <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 6, paddingVertical: 16 }}>
            {media.map((_, i) => (
              <TouchableOpacity key={i} onPress={() => setIdx(i)} style={{ width: i === idx ? 20 : 6, height: 6, borderRadius: 3, backgroundColor: i === idx ? '#fff' : 'rgba(255,255,255,0.35)' }} />
            ))}
          </View>
        )}
      </View>
    </Modal>
  );
}

function PollContent({ post, onVote }: { post: Post; onVote: (postId: string | number, optionId: string | number) => void }) {
  const { colors, isDark } = useTheme();
  const { username } = useAuth();
  const totalVotes = post.options?.reduce((a, o) => a + o.votes.length, 0) || 0;

  return (
    <View style={{ marginBottom: 10, gap: 8 }}>
      {post.options?.map(opt => {
        const voted = opt.votes.includes(username || '');
        const pct = totalVotes > 0 ? Math.round(opt.votes.length / totalVotes * 100) : 0;
        return (
          <TouchableOpacity
            key={opt.id}
            style={[polStyles.option, { borderColor: colors.border }]}
            onPress={() => { if (!username) { Alert.alert('Sign in', 'Log in to vote in polls'); return; } onVote(post.id, opt.id); }}
          >
            <View style={[polStyles.bar, voted ? { backgroundColor: isDark ? 'rgba(59,130,246,0.25)' : '#dbeafe' } : { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#f3f4f6' }, { width: `${pct}%` }]} />
            <View style={polStyles.row}>
              <Text style={[polStyles.optText, voted && { color: colors.primary }]}>{opt.text}</Text>
              <Text style={[polStyles.optPct, { color: colors.textSecondary }]}>{pct}%</Text>
            </View>
          </TouchableOpacity>
        );
      })}
      <Text style={[polStyles.voteInfo, { color: colors.textSecondary }]}>{totalVotes} vote{totalVotes === 1 ? '' : 's'}</Text>
    </View>
  );
}
const polStyles = StyleSheet.create({
  option: { position: 'relative', paddingVertical: 8, paddingHorizontal: 14, borderRadius: 20, borderWidth: 1, overflow: 'hidden' },
  bar: { position: 'absolute', left: 0, top: 0, bottom: 0, borderRadius: 20 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  optText: { fontSize: 13, fontWeight: '500', color: '#374151' },
  optPct: { fontSize: 11, fontWeight: '600', marginLeft: 8 },
  voteInfo: { fontSize: 11, paddingLeft: 4 },
});

function EventCard({ post, onLike }: { post: Post; onLike: (id: string | number) => void }) {
  const { colors, isDark } = useTheme();
  const { username } = useAuth();
  const ended = new Date(post.scheduled_for || '') <= new Date();
  const liked = post.likes?.includes(username || '');
  const dateStr = post.scheduled_for ? new Date(post.scheduled_for).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '';

  return (
    <View style={{ marginBottom: 12 }}>
      <View style={{ borderRadius: 16, borderWidth: 1, borderColor: colors.border, overflow: 'hidden' }}>
        <View style={{ height: 3, backgroundColor: '#6366f1' }} />
        <View style={{ padding: 14 }}>
          <View style={[eStyles.dateBadge, { backgroundColor: isDark ? 'rgba(59,130,246,0.15)' : '#eff6ff' }]}>
            <Ionicons name="calendar-outline" size={12} color={colors.primary} />
            <Text style={[eStyles.dateText, { color: colors.primary }]}>{dateStr}{ended ? ' · Ended' : ''}</Text>
          </View>
          <Text style={[eStyles.title, { color: colors.textPrimary }]}>{post.title || post.text}</Text>
          {post.title && post.text && <Text style={[eStyles.desc, { color: colors.textSecondary }]}>{post.text}</Text>}
          {post.location && (
            <View style={eStyles.locationRow}>
              <Ionicons name="location-outline" size={12} color={colors.textSecondary} />
              <Text style={[eStyles.locationText, { color: colors.textSecondary }]}>{post.location}</Text>
            </View>
          )}
          <TouchableOpacity
            style={[eStyles.interestBtn, liked ? { backgroundColor: colors.primary } : ended ? { backgroundColor: colors.border } : { backgroundColor: isDark ? 'rgba(59,130,246,0.15)' : '#eff6ff' }]}
            onPress={() => !ended && onLike(post.id)}
            disabled={ended}
          >
            <Ionicons name={liked ? 'heart' : 'heart-outline'} size={14} color={liked ? '#fff' : ended ? colors.textSecondary : colors.primary} />
            <Text style={[eStyles.interestText, { color: liked ? '#fff' : ended ? colors.textSecondary : colors.primary }]}>
              {ended ? `${post.likes?.length || 0} attended` : liked ? `${post.likes?.length || 0} interested · tap to remove` : `${post.likes?.length || 0} interested`}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}
const eStyles = StyleSheet.create({
  dateBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 12, alignSelf: 'flex-start', marginBottom: 8 },
  dateText: { fontSize: 11, fontWeight: '600' },
  title: { fontSize: 15, fontWeight: '700', marginBottom: 4 },
  desc: { fontSize: 13, lineHeight: 18, marginBottom: 8 },
  locationRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 10 },
  locationText: { fontSize: 12 },
  interestBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 8, paddingHorizontal: 14, borderRadius: 20, alignSelf: 'flex-start' },
  interestText: { fontSize: 12, fontWeight: '600' },
});

function LiveEndedCard({ post }: { post: Post }) {
  const { colors, isDark } = useTheme();
  return (
    <View style={{ marginBottom: 12 }}>
      <View style={{ borderRadius: 16, overflow: 'hidden', position: 'relative' }}>
        <Image source={{ uri: post.media?.[0] || DEFAULT_PIC }} style={{ width: '100%', height: 180 }} resizeMode="cover" />
        <View style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(0,0,0,0.6)', paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20 }}>
            <Ionicons name="pause-circle" size={16} color="#d1d5db" />
            <Text style={{ color: '#fff', fontSize: 13, fontWeight: '600' }}>Live Ended</Text>
          </View>
        </View>
        <View style={{ position: 'absolute', top: 8, left: 8 }}>
          <Text style={{ fontSize: 10, fontWeight: '700', textTransform: 'uppercase', color: '#fff', backgroundColor: 'rgba(0,0,0,0.5)', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 }}>Was Live</Text>
        </View>
        <View style={{ position: 'absolute', bottom: 8, left: 8, right: 8 }}>
          <Text style={{ color: '#fff', fontSize: 13, fontWeight: '600' }}>{post.text || 'Live Stream'}</Text>
          <Text style={{ color: '#d1d5db', fontSize: 11 }}>{timeAgo(post.created_at)}</Text>
        </View>
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8 }}>
        <Image source={{ uri: DEFAULT_PIC }} style={{ width: 32, height: 32, borderRadius: 16 }} />
        <Text style={[{ color: colors.textPrimary, fontSize: 13, fontWeight: '600' }]}>{post.fullname || post.username} <Text style={{ color: colors.textSecondary, fontWeight: '400' }}>was live</Text></Text>
      </View>
    </View>
  );
}

function LiveCard({ post, viewerCount, onLike, onWatch }: { post: Post; viewerCount: number; onLike: (id: string | number) => void; onWatch: () => void }) {
  const { colors } = useTheme();
  const { username } = useAuth();
  const authorProfile = useProfileCache(post.username);
  const liked = post.likes?.includes(username || '');

  return (
    <View style={{ marginBottom: 12 }}>
      <View style={{ borderRadius: 16, overflow: 'hidden', position: 'relative' }}>
        <Image source={{ uri: post.media?.[0] || authorProfile.profile_pic || DEFAULT_PIC }} style={{ width: '100%', height: 200 }} resizeMode="cover" />
        <View style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(0,0,0,0.3)' }} />
        <View style={{ position: 'absolute', top: 8, left: 8, flexDirection: 'row', gap: 6 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#dc2626', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 12 }}>
            <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: '#fff' }} />
            <Text style={{ color: '#fff', fontSize: 10, fontWeight: '700' }}>LIVE</Text>
          </View>
          <View style={{ backgroundColor: 'rgba(0,0,0,0.4)', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 12 }}>
            <Text style={{ color: '#fff', fontSize: 10 }}>{viewerCount} watching</Text>
          </View>
        </View>
        <View style={{ position: 'absolute', bottom: 8, left: 8, right: 8, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' }}>
          <View style={{ flex: 1 }}>
            <Text style={{ color: '#fff', fontSize: 13, fontWeight: '700' }} numberOfLines={1}>{post.text || 'Live now'}</Text>
            <Text style={{ color: '#d1d5db', fontSize: 11 }}>{timeAgo(post.created_at)}</Text>
          </View>
          <TouchableOpacity onPress={onWatch} style={{ backgroundColor: 'rgba(255,255,255,0.15)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)', paddingHorizontal: 12, paddingVertical: 5, borderRadius: 16 }}>
            <Text style={{ color: '#fff', fontSize: 11, fontWeight: '600' }}>Watch →</Text>
          </TouchableOpacity>
        </View>
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Image source={{ uri: authorProfile.profile_pic || DEFAULT_PIC }} style={{ width: 32, height: 32, borderRadius: 16, borderWidth: 2, borderColor: '#dc2626' }} />
          <View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
              <Text style={[{ color: colors.textPrimary, fontSize: 13, fontWeight: '700' }]}>{authorProfile.fullname || post.username}</Text>
              {authorProfile.verified && <Ionicons name="checkmark-circle" size={12} color="#2563eb" />}
            </View>
            <Text style={{ color: '#dc2626', fontSize: 11, fontWeight: '600' }}>is live</Text>
          </View>
        </View>
        <View style={{ flexDirection: 'row', gap: 12 }}>
          <TouchableOpacity onPress={() => onLike(post.id)} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <Ionicons name={liked ? 'heart' : 'heart-outline'} size={16} color={liked ? '#ef4444' : colors.textSecondary} />
            <Text style={{ color: colors.textSecondary, fontSize: 11 }}>{post.likes?.length || 0}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <Ionicons name="chatbubble-outline" size={16} color={colors.textSecondary} />
            <Text style={{ color: colors.textSecondary, fontSize: 11 }}>{post.comments?.length || 0}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

interface PostCardProps {
  post: Post;
  isActive?: boolean;
  showViewButton?: boolean;
  showCommentInput?: boolean;
  viewerCount?: number;
  reactionCounts?: Record<string, { counts: Record<string, number>; userReaction: string | null }>;
  onReactionToggle?: (postId: string | number) => void;
  onVotePoll?: (postId: string | number, optionId: string | number) => void;
  onComment?: (postId: string | number, text: string) => void;
  onLike?: (postId: string | number) => void;
  onReact?: (postId: string | number, reaction: string, etext: string) => void;
  onNegativeSignal?: (postId: string, signal: string, contentType: string) => void;
}

export function PostSkeleton() {
  const { colors, isDark } = useTheme();
  return (
    <View style={[skStyles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 }}>
        <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: isDark ? '#334155' : '#e5e7eb' }} />
        <View style={{ flex: 1, gap: 6 }}>
          <View style={{ height: 12, width: '40%', borderRadius: 6, backgroundColor: isDark ? '#334155' : '#e5e7eb' }} />
          <View style={{ height: 10, width: '25%', borderRadius: 5, backgroundColor: isDark ? '#334155' : '#e5e7eb' }} />
        </View>
      </View>
      <View style={{ gap: 6, marginBottom: 10 }}>
        <View style={{ height: 12, borderRadius: 6, backgroundColor: isDark ? '#334155' : '#e5e7eb' }} />
        <View style={{ height: 12, width: '80%', borderRadius: 6, backgroundColor: isDark ? '#334155' : '#e5e7eb' }} />
      </View>
      <View style={{ width: '100%', height: 180, borderRadius: 12, backgroundColor: isDark ? '#334155' : '#e5e7eb', marginBottom: 12 }} />
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <View style={{ width: 60, height: 24, borderRadius: 12, backgroundColor: isDark ? '#334155' : '#e5e7eb' }} />
        <View style={{ width: 60, height: 24, borderRadius: 12, backgroundColor: isDark ? '#334155' : '#e5e7eb' }} />
      </View>
    </View>
  );
}
const skStyles = StyleSheet.create({
  card: { borderWidth: 1, borderRadius: 16, padding: 16, marginBottom: 12 },
});

function SnapEmbed({ post, authorProfile, handleLike, liked, navigate, isActive }: { post: Post; authorProfile: any; handleLike: () => void; liked: boolean; navigate: (path: string) => void; isActive?: boolean }) {
  const { colors, isDark } = useTheme();
  const navigation = useNavigation<any>();
  const mediaUrl = post.media?.[0] || '';
  const isVid = mediaUrl && isVideo(mediaUrl);
  const [muted, setMuted] = useState(true);

  const doShare = async () => {
    try {
      await Share.share({
        message: `Check out this snap by @${post.username} on Textmob!\nhttps://louda.web.app/snaps?id=${post.id}`,
      });
    } catch { }
  };

  return (
    <View style={{ borderRadius: 16, overflow: 'hidden', backgroundColor: '#000', marginBottom: 16, position: 'relative', height: 480 }}>
      {/* Reuse the SnapVideoPlayer from the Snaps screen */}
      {isVid && mediaUrl ? (
        <SnapVideoPlayer mediaUrl={mediaUrl} isActive={!!isActive} isMuted={muted} />
      ) : mediaUrl ? (
        <Image source={{ uri: mediaUrl }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
      ) : (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, backgroundColor: isDark ? '#1e293b' : '#111' }}>
          <Text style={{ color: '#fff', fontSize: 16, textAlign: 'center', lineHeight: 22 }}>{post.text}</Text>
        </View>
      )}

      {/* Top Overlay Header */}
      <View style={{ position: 'absolute', top: 12, left: 12, right: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', zIndex: 10 }}>
        <TouchableOpacity style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }} onPress={() => navigate(`/@${post.username}`)}>
          <Image source={{ uri: authorProfile.profile_pic }} style={{ width: 34, height: 34, borderRadius: 17, borderWidth: 1, borderColor: '#fff' }} />
          <View>
            <Text style={{ fontSize: 13, fontWeight: '700', color: '#fff', textShadowColor: 'rgba(0,0,0,0.8)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 3 }}>
              {authorProfile.fullname || post.username}
            </Text>
            <Text style={{ fontSize: 10, color: 'rgba(255,255,255,0.8)', textShadowColor: 'rgba(0,0,0,0.8)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 3 }}>
              {timeAgo(post.created_at)}
            </Text>
          </View>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => navigation.navigate('Snaps')} style={{ paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, backgroundColor: '#2563eb' }}>
          <Text style={{ color: '#fff', fontSize: 10, fontWeight: '700' }}>Watch Snaps</Text>
        </TouchableOpacity>
      </View>

      {/* Floating Side Actions */}
      <View style={{ position: 'absolute', right: 12, bottom: 80, alignItems: 'center', gap: 14, zIndex: 10 }}>
        <TouchableOpacity style={{ alignItems: 'center' }} onPress={handleLike}>
          <View style={{ width: 38, height: 38, borderRadius: 19, backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center' }}>
            <Ionicons name={liked ? 'heart' : 'heart-outline'} size={20} color={liked ? '#ef4444' : '#fff'} />
          </View>
          <Text style={{ color: '#fff', fontSize: 10, fontWeight: '600', marginTop: 2 }}>{post.likes?.length || 0}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={{ alignItems: 'center' }} onPress={() => navigation.navigate('Snaps')}>
          <View style={{ width: 38, height: 38, borderRadius: 19, backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center' }}>
            <Ionicons name="chatbubble-outline" size={18} color="#fff" />
          </View>
          <Text style={{ color: '#fff', fontSize: 10, fontWeight: '600', marginTop: 2 }}>{post.comments?.length || 0}</Text>
        </TouchableOpacity>

        {isVid && (
          <TouchableOpacity onPress={() => setMuted(!muted)}>
            <View style={{ width: 38, height: 38, borderRadius: 19, backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center' }}>
              <Ionicons name={muted ? 'volume-mute' : 'volume-high'} size={18} color="#fff" />
            </View>
          </TouchableOpacity>
        )}

        <TouchableOpacity onPress={doShare}>
          <View style={{ width: 38, height: 38, borderRadius: 19, backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center' }}>
            <Ionicons name="share-social-outline" size={18} color="#fff" />
          </View>
        </TouchableOpacity>
      </View>

      {/* Bottom Caption */}
      <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: 16, zIndex: 8 }}>
        <Text style={{ color: '#fff', fontSize: 12, fontWeight: '600', textShadowColor: 'rgba(0,0,0,0.7)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 3 }} numberOfLines={2}>
          {post.text || `@${post.username} snap`}
        </Text>
      </View>
    </View>
  );
}

const PostCard = React.memo(function PostCard({
  post, isActive, showViewButton, showCommentInput, viewerCount = 0,
  reactionCounts: externalReactionCounts, onReactionToggle,
  onVotePoll, onComment, onLike, onReact, onNegativeSignal,
}: PostCardProps) {
  const { colors, isDark } = useTheme();
  const { username } = useAuth();
  const navigation = useNavigation<any>();
  const authorProfile = useProfileCache(post.username);

  const [menuOpen, setMenuOpen] = useState(false);
  const [showGift, setShowGift] = useState(false);
  const [showCommentField, setShowCommentField] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [textExpanded, setTextExpanded] = useState(false);
  const [lightboxIdx, setLightboxIdx] = useState<number | null>(null);
  const [localReactionCounts, setLocalReactionCounts] = useState<{ counts: Record<string, number>; userReaction: string | null }>({ counts: {}, userReaction: null });
  const [localComments, setLocalComments] = useState<Comment[]>(post.comments || []);
  const [localLikes, setLocalLikes] = useState<string[]>(post.likes || []);

  const reactionData = externalReactionCounts?.[String(post.id)] || localReactionCounts;
  const { counts: reactionCounts, userReaction } = reactionData;

  useEffect(() => {
    setLocalLikes(post.likes || []);
    setLocalComments(post.comments || []);
  }, [post.id, post.likes?.length, post.comments?.length]);

  useEffect(() => {
    if (!onReact && post.id) {
      getPostReactionsAPI(String(post.id)).then(r => {
        if (r.ok && r.data) {
          const counts: Record<string, number> = {};
          let ur: string | null = null;
          r.data.reactions?.forEach(re => {
            counts[re.reaction] = (counts[re.reaction] || 0) + 1;
            if (re.username === username) ur = re.reaction;
          });
          setLocalReactionCounts({ counts, userReaction: ur });
        }
      });
    }
  }, [post.id, username, onReact]);

  const liked = localLikes.includes(username || '');
  const isGuest = !username;
  const authGuard = (msg: string) => { if (isGuest) { Alert.alert('Sign in', msg); return true; } return false; };

  const handleLike = () => {
    if (authGuard('Log in to like posts')) return;
    setLocalLikes(prev => prev.includes(username!) ? prev.filter(u => u !== username!) : [...prev, username!]);
    onLike?.(post.id);
    likePostAPI(String(post.id), username!).catch(() => setLocalLikes(post.likes || []));
  };

  const handleComment = () => {
    if (!username || !commentText.trim()) return;
    const newC: Comment = { id: Date.now().toString(), username, text: commentText.trim(), created_at: new Date().toISOString() };
    setLocalComments(prev => [...prev, newC]);
    setCommentText('');
    setShowCommentField(false);
    onComment?.(post.id, commentText.trim());
    addCommentAPI(String(post.id), username, commentText.trim());
  };

  const handleReact = (reaction: string, etext: string) => {
    if (authGuard('Log in to react')) return;
    onReact?.(post.id, reaction, etext);
    reactPostAPI(String(post.id), username!, reaction, etext);
    setLocalReactionCounts(prev => {
      const counts = { ...prev.counts };
      if (prev.userReaction === reaction) {
        counts[reaction] = (counts[reaction] || 1) - 1;
        if (counts[reaction] <= 0) delete counts[reaction];
        return { counts, userReaction: null };
      }
      if (prev.userReaction) {
        counts[prev.userReaction] = (counts[prev.userReaction] || 1) - 1;
        if (counts[prev.userReaction] <= 0) delete counts[prev.userReaction];
      }
      counts[reaction] = (counts[reaction] || 0) + 1;
      return { counts, userReaction: reaction };
    });
  };

  const handlePollVote = (postId: string | number, optionId: string | number) => {
    if (authGuard('Log in to vote in polls')) return;
    onVotePoll?.(postId, optionId);
    votePollAPI(String(postId), optionId, username!);
  };

  const navigate = useCallback((path: string) => {
    if (isGuest) { Alert.alert('Sign in', 'Create an account to interact'); return; }
    if (path.startsWith('/post/')) navigation.navigate('PostDetail', { postId: path.replace('/post/', '') });
    else if (path.startsWith('/make-post/')) navigation.navigate('CreatePost', { quotePostId: path.replace('/make-post/', '') });
    else if (path.startsWith('/@')) navigation.navigate('Profile', { username: path.replace('/@', '') });
    else if (path.startsWith('/live/')) navigation.navigate('LiveView', { postId: path.replace('/live/', '') });
  }, [navigation, isGuest]);

  const isLongText = post.text && post.text.length > 200;
  const displayText = !textExpanded && isLongText ? post.text.slice(0, 200) + '…' : post.text;
  const totalReactions = Object.values(reactionCounts).reduce((a, b) => a + b, 0);
  const topReactions = Object.entries(reactionCounts).map(([e, n]) => ({ e, n })).sort((a, b) => b.n - a.n).slice(0, 3);

  // Post type-specific rendering
  if (post.type === 'snap') {
    return <SnapEmbed post={post} authorProfile={authorProfile} handleLike={handleLike} liked={liked} navigate={navigate} isActive={isActive} />;
  }
  if (post.type === 'event') {
    return <EventCard post={post} onLike={handleLike} />;
  }
  if (post.type === 'live_ended') {
    return <LiveEndedCard post={post} />;
  }
  if (post.type === 'live') {
    return <LiveCard post={post} viewerCount={viewerCount} onLike={handleLike} onWatch={() => navigate(`/live/${post.id}`)} />;
  }

  return (
    <View style={[s.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity style={s.authorRow} onPress={() => navigate(`/@${post.username}`)}>
          <Image source={{ uri: authorProfile.profile_pic }} style={s.avatar} />
          <View style={{ flex: 1 }}>
            <View style={s.nameRow}>
              <Text style={[s.authorName, { color: colors.textPrimary }]} numberOfLines={1}>{authorProfile.fullname || post.username}</Text>
              {post.verified && <VerifiedBadge size={14} />}
              {(post as any).boost_score > 0 && (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2, backgroundColor: '#fff7ed', paddingHorizontal: 4, paddingVertical: 1, borderRadius: 4 }}>
                  <Ionicons name="flash" size={10} color="#f97316" />
                  <Text style={{ fontSize: 9, fontWeight: '800', color: '#f97316' }}>Boosted</Text>
                </View>
              )}
              {post.activities && <Text style={[s.activityText, { color: colors.textSecondary }]}>· is feeling {post.activities}</Text>}
            </View>
            <Text style={[s.time, { color: colors.textSecondary }]}>{timeAgo(post.created_at)}</Text>
          </View>
        </TouchableOpacity>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <FollowButton targetUsername={post.username} />
          <TouchableOpacity onPress={() => setMenuOpen(!menuOpen)} style={s.menuBtn}>
            <Ionicons name="ellipsis-horizontal" size={16} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>
        <PostMenu visible={menuOpen} onClose={() => setMenuOpen(false)} post={post} onNegativeSignal={onNegativeSignal} />
      </View>

      {/* Text */}
      {post.text ? (
        <View style={{ marginBottom: 10 }}>
          <RichText text={displayText || ''} style={[s.postText, { color: colors.textPrimary }]} />
          {isLongText && (
            <TouchableOpacity onPress={() => setTextExpanded(!textExpanded)} style={{ marginTop: 2 }}>
              <Text style={s.seeMore}>{textExpanded ? 'Show less' : 'See more'}</Text>
            </TouchableOpacity>
          )}
        </View>
      ) : null}

      {/* Poll */}
      {post.type === 'poll' && post.options && (
        <PollContent post={post} onVote={handlePollVote} />
      )}

      {/* Media */}
      {post.media && post.media.length > 0 && (
        <MediaGallery media={post.media} isActive={isActive} onOpenLightbox={setLightboxIdx} />
      )}

      {/* Quoted Post */}
      {post.quoted_post_id && (
        <QuotedPostView quotedPostId={post.quoted_post_id} onNavigate={navigate} />
      )}

      {/* Divider */}
      <View style={[s.divider, { backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)' }]} />

      {/* Reactions bar */}
      {topReactions.length > 0 && (
        <View style={s.reactionsBar}>
          <View style={{ flexDirection: 'row' }}>
            {topReactions.map((r, i) => (
              <View key={i} style={[s.reactionPill, { backgroundColor: isDark ? '#334155' : '#f3f4f6', borderColor: colors.card }]}>
                <Text style={{ fontSize: 12 }}>{r.e}</Text>
              </View>
            ))}
          </View>
          <Text style={[s.reactionTotal, userReaction && { color: '#2563eb' }]}>{totalReactions}</Text>
        </View>
      )}

      {/* Action buttons */}
      <View style={s.actionRow}>
        <TouchableOpacity style={[s.actionBtn, liked && s.actionBtnLiked]} onPress={handleLike}>
          <Ionicons name={liked ? 'heart' : 'heart-outline'} size={18} color={liked ? '#ef4444' : colors.textSecondary} />
          <Text style={[s.actionCount, liked && { color: '#ef4444' }]}>{localLikes.length}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={s.actionBtn} onPress={() => { if (authGuard('Log in to comment')) return; showCommentInput ? setShowCommentField(!showCommentField) : navigate(`/post/${post.id}`); }}>
          <Ionicons name="chatbubble-outline" size={18} color={colors.textSecondary} />
          <Text style={s.actionCount}>{localComments.length}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={s.actionBtn} onPress={() => { if (authGuard('Log in to quote posts')) return; navigate(`/make-post/${post.id}`); }}>
          <Ionicons name="repeat-outline" size={18} color={colors.textSecondary} />
        </TouchableOpacity>

        <TouchableOpacity style={s.actionBtn} onPress={() => { if (authGuard('Log in to send gifts')) return; setShowGift(true); }}>
          <Ionicons name="gift-outline" size={18} color={colors.textSecondary} />
        </TouchableOpacity>

        <TouchableOpacity style={s.actionBtn} onPress={() => { if (authGuard('Log in to react')) return; onReactionToggle?.(post.id); }}>
          <Ionicons name="happy-outline" size={18} color={colors.textSecondary} />
        </TouchableOpacity>

        {showViewButton && (
          <TouchableOpacity style={[s.actionBtn, { marginLeft: 'auto' }]} onPress={() => navigate(`/post/${post.id}`)}>
            <Ionicons name="eye-outline" size={18} color={colors.textSecondary} />
            <Text style={[s.actionCount, { color: colors.textSecondary }]}>View</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Comment modal */}
      <Modal visible={showCommentField && !!username} transparent animationType="fade" onRequestClose={() => setShowCommentField(false)}>
        <TouchableOpacity style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' }} activeOpacity={1} onPress={() => setShowCommentField(false)}>
          <TouchableOpacity activeOpacity={1} onPress={() => { }} style={{ width: '90%', maxHeight: '80%', backgroundColor: isDark ? '#1e293b' : '#fff', borderRadius: 16, padding: 20 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <Text style={{ fontWeight: '700', fontSize: 16, color: colors.textPrimary }}>Add comment</Text>
              <TouchableOpacity onPress={() => setShowCommentField(false)}>
                <Ionicons name="close" size={24} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>
            <TextInput
              style={{ minHeight: 100, maxHeight: 200, fontSize: 15, color: colors.textPrimary, textAlignVertical: 'top', backgroundColor: isDark ? '#0f172a' : '#f3f4f6', borderRadius: 12, padding: 14 }}
              placeholder="Write a comment…"
              placeholderTextColor={colors.textSecondary}
              value={commentText}
              onChangeText={setCommentText}
              multiline
            />
            <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginTop: 12 }}>
              <TouchableOpacity onPress={handleComment} style={{ backgroundColor: '#2563eb', paddingHorizontal: 24, paddingVertical: 10, borderRadius: 24, opacity: commentText.trim() ? 1 : 0.4 }} disabled={!commentText.trim()}>
                <Text style={{ color: '#fff', fontWeight: '700', fontSize: 14 }}>Post</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
      {showCommentField && !username && (
        <TouchableOpacity style={[s.guestComment, { backgroundColor: isDark ? '#1e293b' : '#f3f4f6' }]} onPress={() => { setShowCommentField(false); Alert.alert('Sign in', 'Log in to leave a comment'); }}>
          <Text style={{ fontSize: 12, color: colors.textSecondary, textAlign: 'center' }}>
            <Text style={{ fontWeight: '700', color: colors.primary }}>Log in</Text> to leave a comment
          </Text>
        </TouchableOpacity>
      )}

      {/* Gift Modal */}
      <GiftCoinsModal
        visible={showGift}
        onClose={() => setShowGift(false)}
        recipientUsername={post.username}
        recipientFullname={post.fullname}
        postId={post.id}
      />

      {/* Media Lightbox */}
      {lightboxIdx !== null && post.media && (
        <MediaLightbox media={post.media} startIndex={lightboxIdx} onClose={() => setLightboxIdx(null)} />
      )}
    </View>
  );
});

export default PostCard;

const s = StyleSheet.create({
  card: { borderWidth: 1, borderRadius: 16, padding: 16, marginBottom: 12 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10, position: 'relative' },
  authorRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, flex: 1 },
  avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#e5e7eb' },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 4, flexWrap: 'wrap' },
  authorName: { fontSize: 14, fontWeight: '700' },
  activityText: { fontSize: 12 },
  time: { fontSize: 11, marginTop: 1 },
  menuBtn: { padding: 6, marginLeft: 4 },
  menuOverlay: { position: 'absolute', top: 0, right: 0, zIndex: 100 },
  menuBg: { position: 'absolute', top: -100, right: -100, bottom: -100, left: -100 },
  postText: { fontSize: 14, lineHeight: 20 },
  seeMore: { fontSize: 12, fontWeight: '600', color: '#2563eb', marginTop: 2 },
  divider: { height: 1, marginVertical: 8, marginHorizontal: -16 },
  reactionsBar: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 },
  reactionPill: { width: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center', borderWidth: 2, marginRight: -4 },
  reactionTotal: { fontSize: 12, fontWeight: '600', color: '#64748b' },
  actionRow: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  actionBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 20 },
  actionBtnLiked: { backgroundColor: '#fef2f2' },
  actionCount: { fontSize: 12, fontWeight: '600', color: '#64748b' },
  guestComment: { marginTop: 8, borderRadius: 12, paddingVertical: 10, paddingHorizontal: 12 },
});
