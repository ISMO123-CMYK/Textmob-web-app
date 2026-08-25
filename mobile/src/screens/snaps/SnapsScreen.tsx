import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  ActivityIndicator, Dimensions, Image, Modal, Animated,
  TextInput, Alert, Share, RefreshControl,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useVideoPlayer, VideoView } from 'expo-video';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { useIsFocused } from '@react-navigation/native';
import * as Haptics from 'expo-haptics';
import { getFeedPostsAPI, likePostAPI, reactPostAPI, addCommentAPI, getSnapsFeedAPI, Post } from '../../api/posts';
import { getFollowStatusAPI, followAPI, friendAPI } from '../../api/users';
import { CATEGORIES } from '../../data/categories';
import * as ImagePicker from 'expo-image-picker';
import { apiGet, apiPost, uploadFile, API_BASE_URL } from '../../api/client';
import GiftCoinsModal from '../../components/GiftCoinsModal';
import MentionAutocomplete from '../../components/MentionAutocomplete';
import useProfileCache from '../../hooks/useProfileCache';
import { ParticleBurst } from '../../utils/animations';
import { timeAgo } from '../../utils/format';
import { getSeenParam, markSeen } from '../../utils/seen';

const SCREEN_WIDTH = Dimensions.get('window').width || 390;
const SCREEN_HEIGHT = Dimensions.get('window').height || 800;
const EMOJIS = ['❤️', '😂', '🔥', '👍', '😍', '😢', '😡', '🎉', '🙏', '💀', '🤣', '😭', '🥰', '😘', '😎', '🤩', '💯', '✨', '🫡', '🫶'];
const DEFAULT_PIC = 'https://res.cloudinary.com/dzvm9xe1i/image/upload/v1746095979/profile-pictures/e2st5nispbicnhnir9cf.jpg';
const AVATAR_COLORS = ['#2563eb', '#7c3aed', '#db2777', '#d97706', '#059669', '#0891b2', '#dc2626'];

function avatarColor(username: string): string {
  let h = 0;
  for (let i = 0; i < (username || '').length; i++) h = (h * 31 + username.charCodeAt(i)) >>> 0;
  return AVATAR_COLORS[h % AVATAR_COLORS.length];
}

export function SnapVideoPlayer({ mediaUrl, isActive, isMuted, onDoubleTap }: { mediaUrl: string; isActive: boolean; isMuted: boolean; onDoubleTap?: () => void }) {
  const player = useVideoPlayer(mediaUrl, p => {
    p.loop = true;
    p.muted = isMuted;
  });
  const playerRef = useRef(player);
  playerRef.current = player;

  useEffect(() => {
    try { player.muted = isMuted; } catch (e) { /* ignore */ }
  }, [isMuted, player]);

  useEffect(() => {
    try {
      if (isActive) {
        player.play();
      } else {
        player.pause();
      }
    } catch (e) { /* ignore */ }
    return () => {
      try { player.pause(); } catch (e) { /* ignore */ }
    };
  }, [isActive, player]);

  const [seekIndicator, setSeekIndicator] = useState<'forward' | 'backward' | null>(null);
  const [showHeart, setShowHeart] = useState(false);
  const lastTapRef = useRef(0);

  const handleCenterTap = () => {
    const now = Date.now();
    if (now - lastTapRef.current < 300) {
      onDoubleTap?.();
      setShowHeart(true);
      setTimeout(() => setShowHeart(false), 600);
      lastTapRef.current = 0;
    } else {
      lastTapRef.current = now;
    }
  };

  const handleSeek = (direction: 'forward' | 'backward') => {
    try {
      const currentTime = player.currentTime || 0;
      const newTime = direction === 'forward' ? currentTime + 10 : Math.max(0, currentTime - 10);
      player.seekTo(newTime);
      setSeekIndicator(direction);
      setTimeout(() => setSeekIndicator(null), 500);
    } catch (err) {}
  };

  return (
    <View style={{ flex: 1 }}>
      <VideoView player={player} style={styles.snapVideo} contentFit="cover" nativeControls={false} />
      
      {/* Left tap area (rewind) */}
      <TouchableOpacity 
        style={[styles.seekTapArea, { left: 0 }]} 
        activeOpacity={1}
        onPress={() => handleSeek('backward')}
      />

      {/* Center tap area (double-tap to like) */}
      <TouchableOpacity 
        style={styles.centerTapArea}
        activeOpacity={1}
        onPress={handleCenterTap}
      />

      {/* Right tap area (forward) */}
      <TouchableOpacity 
        style={[styles.seekTapArea, { right: 0 }]} 
        activeOpacity={1}
        onPress={() => handleSeek('forward')}
      />

      {/* Seek Feedback Indicators */}
      {seekIndicator === 'backward' && (
        <View style={[styles.seekIndicatorContainer, { left: 60 }]}>
          <Ionicons name="play-back" size={32} color="#fff" />
          <Text style={styles.seekIndicatorText}>-10s</Text>
        </View>
      )}
      {seekIndicator === 'forward' && (
        <View style={[styles.seekIndicatorContainer, { right: 60 }]}>
          <Ionicons name="play-forward" size={32} color="#fff" />
          <Text style={styles.seekIndicatorText}>+10s</Text>
        </View>
      )}

      {/* Heart animation on double tap */}
      {showHeart && (
        <View style={styles.heartOverlay} pointerEvents="none">
          <Ionicons name="heart" size={80} color="#ef4444" />
        </View>
      )}

      {/* Pause overlay */}
      {!isActive && (
        <View style={styles.pauseOverlay} pointerEvents="none">
          <View style={styles.pauseIconCircle}>
            <Ionicons name="pause" size={32} color="#fff" />
          </View>
        </View>
      )}
    </View>
  );
}

function SnapVideoPreview({ uri }: { uri: string }) {
  const player = useVideoPlayer(uri, p => { p.loop = true; p.muted = true; p.play(); });
  return (
    <VideoView player={player} style={styles.createVideo} contentFit="contain" nativeControls />
  );
}

function SnapFollowButton({ targetUsername, currentUsername }: { targetUsername: string; currentUsername: string | null }) {
  const [status, setStatus] = useState('loading');
  const [profileType, setProfileType] = useState('individual');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!targetUsername || !currentUsername || targetUsername === currentUsername) {
      setStatus('none');
      return;
    }
    let active = true;
    setStatus('loading');
    getFollowStatusAPI(currentUsername, targetUsername)
      .then(res => {
        if (res.ok && res.data && active) {
          setStatus(res.data.status || 'not_friended');
          setProfileType((res.data.profileType || 'individual').toLowerCase());
        }
      })
      .catch(() => active && setStatus('not_friended'));
    return () => { active = false; };
  }, [targetUsername, currentUsername]);

  if (!targetUsername || !currentUsername || targetUsername === currentUsername) return null;
  if (status === 'friended' || status === 'following') return null;

  async function handleToggle() {
    if (submitting || status === 'loading') return;
    setSubmitting(true);
    try {
      const isOrg = profileType !== 'individual';
      const action = isOrg ? 'follow' : 'friend';
      const api = isOrg ? followAPI : friendAPI;
      const res = await api(targetUsername, currentUsername, action);
      if (res.ok && res.data) {
        setStatus(res.data.status);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  }

  const label = status === 'loading' ? '...' : status === 'not_following' ? 'Follow' : 'Add Friend';

  return (
    <TouchableOpacity
      onPress={handleToggle}
      disabled={submitting || status === 'loading'}
      style={styles.followChip}
    >
      <Text style={styles.followChipText}>
        {submitting ? 'Wait...' : label}
      </Text>
    </TouchableOpacity>
  );
}

function SnapText({ text, expanded, onToggle }: { text: string; expanded: boolean; onToggle: () => void }) {
  const LIMIT = 150;
  const long = text.length > LIMIT;
  const display = !expanded && long ? text.slice(0, LIMIT) + '...' : text;
  return (
    <>
      <Text style={styles.snapText}>{display}</Text>
      {long && <TouchableOpacity onPress={onToggle}><Text style={styles.seeMore}>{expanded ? 'Show less' : 'See more'}</Text></TouchableOpacity>}
    </>
  );
}

const SnapItemView = React.memo(function SnapItemView({ item, isActive, username, containerHeight, muted, expanded, onLike, onToggleText, onOpenComments, onOpenReactions, onOpenGift, onToggleMute, onShare }: {
  item: Post; isActive: boolean; username: string | null; containerHeight: number;
  muted: boolean; expanded: boolean;
  onLike: (id: string | number) => void; onToggleText: (id: string | number) => void;
  onOpenComments: (id: string | number) => void;
  onOpenReactions: (id: string | number) => void;
  onOpenGift: (item: Post) => void; onToggleMute: () => void; onShare: (item: Post) => void;
}) {
  const [likeAnim, setLikeAnim] = useState(false);
  const [showParticles, setShowParticles] = useState(false);
  const likeScale = useRef(new Animated.Value(1)).current;
  const profile = useProfileCache(item.username);
  const isVideo = item.media?.some(m => /\.(mp4|webm|mov)$/i.test(m));
  const mediaUrl = item.media?.[0] || '';
  const liked = item.likes?.includes(username || '');
  const initials = (profile?.fullname || item.username || '?').slice(0, 2).toUpperCase();

  return (
    <View style={[styles.snapContainer, { height: containerHeight }]}>
      {isActive && isVideo ? (
        <SnapVideoPlayer mediaUrl={mediaUrl} isActive={isActive} isMuted={muted} onDoubleTap={() => { onLike(item.id); setLikeAnim(true); setTimeout(() => setLikeAnim(false), 600); }} />
      ) : mediaUrl ? (
        <Image source={{ uri: mediaUrl }} style={styles.snapVideo} />
      ) : (
        <View style={[styles.snapTextFallback, { backgroundColor: '#111' }]}>
          <Text style={styles.snapFallbackText}>{item.text}</Text>
        </View>
      )}

      <View style={styles.snapGradient} />

      {/* Double-tap heart feedback next to action button */}
      {likeAnim && (
        <View style={styles.likeAnimFloat} pointerEvents="none">
          <Ionicons name="heart" size={32} color="#ef4444" />
        </View>
      )}

      {/* Right side actions */}
      <View style={styles.rightActions}>
        <TouchableOpacity style={styles.actionBtn} onPress={() => {
          Animated.sequence([
            Animated.spring(likeScale, { toValue: 0.8, useNativeDriver: true, friction: 4, tension: 300 }),
            Animated.spring(likeScale, { toValue: 1, useNativeDriver: true, friction: 3, tension: 200 }),
          ]).start();
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          setShowParticles(true);
          setTimeout(() => setShowParticles(false), 600);
          onLike(item.id);
        }}>
          <Animated.View style={{ transform: [{ scale: likeScale }] }}>
            <Ionicons name={liked ? 'heart' : 'heart-outline'} size={28} color={liked ? '#ef4444' : '#fff'} />
          </Animated.View>
          {showParticles && <ParticleBurst color="#ef4444" size={5} count={10} />}
          <Text style={styles.actionCount}>{item.likes?.length || 0}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionBtn} onPress={() => onOpenComments(item.id)}>
          <Ionicons name="chatbubble-ellipses-outline" size={26} color="#fff" />
          <Text style={styles.actionCount}>{item.comments?.length || 0}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionBtn} onPress={() => onOpenReactions(item.id)}>
          <Ionicons name="happy-outline" size={26} color="#fff" />
          <Text style={styles.actionCount} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionBtn} onPress={() => onOpenGift(item)}>
          <Ionicons name="gift-outline" size={26} color="#fbbf24" />
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionBtn} onPress={onToggleMute}>
          <Ionicons name={muted ? 'volume-mute-outline' : 'volume-high-outline'} size={26} color="#fff" />
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionBtn} onPress={() => onShare(item)}>
          <Ionicons name="share-outline" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Bottom info */}
      <View style={styles.bottomInfo}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          {profile?.profile_pic ? (
            <Image source={{ uri: profile.profile_pic }} style={styles.miniAvatarImgBorder} />
          ) : (
            <View style={[styles.miniAvatar, { backgroundColor: avatarColor(item.username) }]}>
              <Text style={styles.miniAvatarText}>{initials}</Text>
            </View>
          )}
          <View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <Text style={styles.snapFullname}>{profile?.fullname || item.username}</Text>
              {item.verified === true && (
            <View style={styles.commentVerifiedBadge}>
                  <Ionicons name="checkmark" size={10} color="#fff" />
                </View>
              )}
            </View>
            <Text style={styles.snapUsername}>@{item.username}</Text>
          </View>
          <SnapFollowButton targetUsername={item.username} currentUsername={username} />
        </View>
        {item.text ? (
          <SnapText text={item.text} expanded={expanded} onToggle={() => onToggleText(item.id)} />
        ) : null}
      </View>

      {/* Reactions bar */}
      {item.reactions && item.reactions.length > 0 && (
        <View style={styles.reactionsBar}>
          {item.reactions.slice(-5).reverse().map((r, i) => (
            <Text key={i} style={{ fontSize: 16 }}>{r.reaction}</Text>
          ))}
        </View>
      )}
    </View>
  );
});

function CommentRow({ comment, snapUsername, onPress }: { comment: any; snapUsername: string; onPress: (username: string) => void }) {
  const profile = useProfileCache(comment.username);
  const initials = (profile?.fullname || comment.username || '?').slice(0, 2).toUpperCase();
  return (
    <TouchableOpacity style={styles.commentRow} onPress={() => onPress(comment.username)} activeOpacity={0.7}>
      {profile?.profile_pic ? (
        <Image source={{ uri: profile.profile_pic }} style={styles.commentAvatarImg} />
      ) : (
        <View style={[styles.commentAvatar, { backgroundColor: avatarColor(comment.username) }]}>
          <Text style={styles.commentAvatarText}>{initials}</Text>
        </View>
      )}
      <View style={{ flex: 1 }}>
        <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 4 }}>
          <Text style={styles.commentFullname}>{profile?.fullname || comment.username}</Text>
          {comment.username === snapUsername && (
            <View style={styles.creatorBadge}>
              <Text style={styles.creatorBadgeText}>CREATOR</Text>
            </View>
          )}
          {profile?.verified && (
            <View style={styles.commentVerifiedBadge}>
              <Ionicons name="checkmark" size={8} color="#fff" />
            </View>
          )}
          {comment.createdAt && (
            <Text style={styles.commentTime}>{timeAgo(comment.createdAt)}</Text>
          )}
        </View>
        <Text style={styles.commentText}>{comment.text}</Text>
      </View>
    </TouchableOpacity>
  );
}

export default function SnapsScreen({ navigation, route }: { navigation: any; route?: any }) {
  const { colors, isDark } = useTheme();
  const { username } = useAuth();
  const insets = useSafeAreaInsets();
  const [containerHeight, setContainerHeight] = useState(SCREEN_HEIGHT);
  const sharedVideo = route?.params?.sharedVideo as { uri: string; name?: string; type?: string } | undefined;
  const sharedCaption = route?.params?.sharedCaption as string | undefined;

  const [snaps, setSnaps] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [showUpload, setShowUpload] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [selectedVideo, setSelectedVideo] = useState<any>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [caption, setCaption] = useState('');
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [showReactions, setShowReactions] = useState<string | number | null>(null);
  const [showComments, setShowComments] = useState<string | number | null>(null);
  const [showGift, setShowGift] = useState<any>(null);
  const [expandedText, setExpandedText] = useState<Record<string, boolean>>({});
  const [commentText, setCommentText] = useState('');
  const [commenting, setCommenting] = useState(false);
  const [reactingPost, setReactingPost] = useState<string | number | null>(null);
  const [followingStates, setFollowingStates] = useState<Record<string, boolean>>({});
  const [activeIndex, setActiveIndex] = useState(0);
  const [muted, setMuted] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);
  const searchTimer = useRef<any>(null);
  const [paused, setPaused] = useState(false);
  const [pausedAnim, setPausedAnim] = useState(false);
  const [videoProgress, setVideoProgress] = useState(0);
  const [searchSnapQuery, setSearchSnapQuery] = useState('');
  const [searchSnapResults, setSearchSnapResults] = useState<any[]>([]);
  const [searchingSnaps, setSearchingSnaps] = useState(false);
  const searchSnapTimer = useRef<any>(null);
  const [wizardStep, setWizardStep] = useState(1);
  const [captionCursor, setCaptionCursor] = useState(0);
  const commentInputRef = useRef<TextInput>(null);
  const [commentCursor, setCommentCursor] = useState(0);

  // Seen-posts tracking
  const viewabilityConfigCallbackRef = useRef(({ changed, viewableItems }: any) => {
    if (viewableItems.length > 0) {
      setActiveIndex(viewableItems[0].index || 0);
    }
    const ids = changed.filter((c: any) => c.isViewable).map((c: any) => String(c.item?.id));
    if (ids.length) markSeen(ids);
  });

  const [snapPage, setSnapPage] = useState(1);
  const [hasMoreSnaps, setHasMoreSnaps] = useState(true);

  useEffect(() => { loadSnaps(1); }, []);

  // Video shared into the app from another app (Share to Textmob / deep link)
  useEffect(() => {
    if (sharedVideo && sharedVideo.uri) {
      setSelectedVideo({
        uri: sharedVideo.uri,
        fileName: sharedVideo.name || `snap_${Date.now()}.mp4`,
        mimeType: sharedVideo.type || 'video/mp4',
      });
      if (typeof sharedCaption === 'string') setCaption(sharedCaption);
      setShowCreateModal(true);
    }
  }, [sharedVideo, sharedCaption]);

  const loadSnaps = async (pg: number = 1, append: boolean = false) => {
    if (!append) setLoading(true);
    const seen = getSeenParam();
    const res = await getSnapsFeedAPI(username || undefined, 20, seen || undefined, pg);
    if (res.ok && res.data) {
      const snapList = Array.isArray(res.data) ? res.data : (res.data.snaps || []);
      setSnaps(prev => append ? [...prev, ...snapList] : snapList);
      setHasMoreSnaps(res.data.hasMore !== false);
      setSnapPage(pg);
    }
    setLoading(false);
  };

  const loadMoreSnaps = () => {
    if (!loading && hasMoreSnaps) loadSnaps(snapPage + 1, true);
  };

  const handleLike = useCallback(async (postId: string | number) => {
    if (!username) { Alert.alert('Sign in', 'Log in to like'); return; }
    setSnaps(prev => prev.map(p => p.id === postId ? { ...p, likes: p.likes?.includes(username) ? p.likes.filter(u => u !== username) : [...(p.likes || []), username] } : p));
    await likePostAPI(String(postId), username).catch(() => { });
  }, [username]);

  const handleNegativeSignal = (postId: string, signalType: string, contentType: string) => {
    if (!username) return;
    setSnaps(prev => prev.filter(p => String(p.id) !== String(postId)));
    apiPost('/negative-signal', { username, postId, signalType, contentType }).catch(() => {});
  };

  const handleReact = async (postId: string | number, emoji: string) => {
    if (!username) { Alert.alert('Sign in', 'Log in to react'); return; }
    setShowReactions(null);
    setReactingPost(postId);
    await reactPostAPI(String(postId), username, emoji, emoji).catch(() => { });
    setReactingPost(null);
    setSnaps(prev => prev.map(p => p.id === postId ? {
      ...p, reactions: [...(p.reactions || []), { username, type: 'reaction', reaction: emoji }]
    } : p));
  };

  const handleComment = async (postId: string | number) => {
    if (!username) { Alert.alert('Sign in', 'Log in to comment'); return; }
    if (!commentText.trim()) return;
    setCommenting(true);
    const res = await addCommentAPI(String(postId), username, commentText.trim());
    if (res.ok) {
      setSnaps(prev => prev.map(p => p.id === postId ? {
        ...p, comments: [...(p.comments || []), { id: String(Date.now()), username: username || '', text: commentText.trim() }]
      } : p));
      setCommentText('');
    }
    setCommenting(false);
  };

  const handleSearchSnaps = async (q: string) => {
    if (!q.trim()) { setSearchSnapResults([]); setSearchingSnaps(false); return; }
    setSearchingSnaps(true);
    try {
      const res = await apiGet(`/snaps-search?query=${encodeURIComponent(q.trim())}&limit=12`);
      if (res.ok && res.data) {
        const list = Array.isArray(res.data) ? res.data : (res.data.snaps || []);
        setSearchSnapResults(list);
      }
    } catch (e) { /* ignore */ } finally {
      setSearchingSnaps(false);
    }
  };

  const handleShare = useCallback(async (item: Post) => {
    try {
      await Share.share({
        message: `Check out this snap by @${item.username} on Textmob!\nhttps://louda.web.app/snaps?id=${item.id}`,
      });
    } catch (error) {
      if (error && (error as any).message !== 'User did not share') console.error(error);
    }
  }, []);


  const getUploadAsset = (asset: any) => ({
    uri: asset.uri,
    name: asset.fileName || `snap_${Date.now()}.mp4`,
    type: asset.mimeType || 'video/mp4',
  });

  const checkVideoSize = (asset: any) => {
    if (asset.fileSize && asset.fileSize > MAX_SNAP_VIDEO_BYTES) {
      Alert.alert('File too large', 'Video must be under 100 MB');
      return false;
    }
    return true;
  };

  const pickVideo = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['videos'], quality: 0.8 });
    if (!result.canceled && result.assets[0]) {
      if (!checkVideoSize(result.assets[0])) return;
      setShowUpload(false);
      setSelectedVideo(result.assets[0]);
      setCaption('');
      setShowCreateModal(true);
    }
  };

  const recordVideo = async () => {
    const perms = await ImagePicker.requestCameraPermissionsAsync();
    if (!perms.granted) {
      Alert.alert('Permission needed', 'Camera permission is required to record video');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({ mediaTypes: ['videos'], quality: 0.8 });
    if (!result.canceled && result.assets[0]) {
      if (!checkVideoSize(result.assets[0])) return;
      setShowUpload(false);
      setSelectedVideo(result.assets[0]);
      setCaption('');
      setShowCreateModal(true);
    }
  };

  const MAX_SNAP_VIDEO_BYTES = 100 * 1024 * 1024;

  const handleCreateSnap = async () => {
    if (!selectedVideo || !username || uploading) return;
    if (selectedVideo.fileSize && selectedVideo.fileSize > MAX_SNAP_VIDEO_BYTES) {
      Alert.alert('File too large', 'Video must be under 100 MB');
      return;
    }
    setUploading(true);
    setUploadProgress(0);
    try {
      const fd = new FormData();
      fd.append('username', username);
      fd.append('text', caption.trim() || ' ');
      // Use React Native native FormData (append {uri, name, type} instead of File)
      fd.append('media', getUploadAsset(selectedVideo) as any);
      if (selectedCategories.length > 0) fd.append('categories', JSON.stringify(selectedCategories));
      const res = await uploadFile('/create-snap', fd, (p) => setUploadProgress(p));
      if (!res.ok) throw new Error(res.error || 'Upload failed');
      setSelectedVideo(null);
      setCaption('');
      setSelectedCategories([]);
      setUploading(false);
      setWizardStep(1);
      setShowCreateModal(false);
      loadSnaps();
      Alert.alert('Snap posted!', 'Your snap is live.');
    } catch (err) {
      console.error('Snap upload failed', err);
      setUploading(false);
      Alert.alert('Upload failed', 'Could not upload snap. Try again.');
    }
  };

  const closeCreateModal = useCallback(() => {
    if (uploading) return;
    setShowCreateModal(false);
    setSelectedVideo(null);
    setCaption('');
    setSelectedCategories([]);
    setWizardStep(1);
  }, [uploading]);

  const isFocused = useIsFocused();
  const s = useMemo(() => makeStyles(colors, isDark), [colors, isDark]);

  const toggleSnapText = useCallback((id: string | number) => {
    setExpandedText(prev => ({ ...prev, [id]: !prev[id] }));
  }, []);
  const openComments = useCallback((id: string | number) => setShowComments(id), []);
  const openReactions = useCallback((id: string | number) => setShowReactions(id), []);
  const openGift = useCallback((item: Post) => setShowGift(item), []);
  const toggleMute = useCallback(() => setMuted(m => !m), []);

  const renderItem = useCallback(({ item, index }: { item: Post; index: number }) => {
    const expanded = expandedText[item.id];
    return (
      <SnapItemView
        item={item}
        isActive={isFocused && index === activeIndex}
        username={username}
        containerHeight={containerHeight}
        muted={muted}
        expanded={expanded}
        onLike={handleLike}
        onToggleText={toggleSnapText}
        onOpenComments={openComments}
        onOpenReactions={openReactions}
        onOpenGift={openGift}
        onToggleMute={toggleMute}
        onShare={handleShare}
      />
    );
  }, [activeIndex, isFocused, muted, username, containerHeight, expandedText, handleLike, handleShare, toggleSnapText, openComments, openReactions, openGift, toggleMute]);

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: '#000', alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator size="large" color="#fff" />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#000' }}
      onLayout={(e) => setContainerHeight(e.nativeEvent.layout.height)}
    >
      {/* Fixed header */}
      <View style={[styles.header, { top: insets.top + 8 }]}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Snaps</Text>
        <View style={{ flexDirection: 'row', gap: 4 }}>
          <TouchableOpacity style={styles.uploadBtn} onPress={() => setShowSearch(true)}>
            <Ionicons name="search" size={22} color="#fff" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.uploadBtn} onPress={() => { loadSnaps(); }}>
            {loading ? <ActivityIndicator size="small" color="#fff" /> : <Ionicons name="refresh" size={22} color="#fff" />}
          </TouchableOpacity>
          <TouchableOpacity style={styles.uploadBtn} onPress={() => setShowUpload(true)}>
            <Ionicons name="cloud-upload-outline" size={24} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>

      <FlatList
        data={snaps}
        renderItem={renderItem}
        keyExtractor={(item) => String(item.id)}
        pagingEnabled
        showsVerticalScrollIndicator={false}
        snapToInterval={containerHeight}
        snapToAlignment="start"
        decelerationRate="fast"
        onViewableItemsChanged={viewabilityConfigCallbackRef.current}
        viewabilityConfig={{ itemVisiblePercentThreshold: 50 }}
        getItemLayout={(_, index) => ({ length: containerHeight, offset: containerHeight * index, index })}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={() => loadSnaps(1)} tintColor="#fff" />}
        onEndReached={loadMoreSnaps}
        onEndReachedThreshold={2}
        ListEmptyComponent={
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: containerHeight * 0.4 }}>
            <Text style={{ color: '#fff', fontSize: 16 }}>No snaps yet</Text>
            <TouchableOpacity style={{ marginTop: 16, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 24, borderWidth: 1, borderColor: '#fff' }}
              onPress={() => setShowUpload(true)}>
              <Text style={{ color: '#fff', fontWeight: '600' }}>Upload your first snap</Text>
            </TouchableOpacity>
          </View>
        }
      />

      {/* Search modal */}
      <Modal visible={showSearch} transparent animationType="slide" onRequestClose={() => { setShowSearch(false); setSearchSnapQuery(''); setSearchSnapResults([]); }}>
        <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
          <View style={[styles.commentHeader, { borderBottomColor: colors.border }]}>
            <TouchableOpacity onPress={() => { setShowSearch(false); setSearchSnapQuery(''); setSearchSnapResults([]); }}>
              <Text style={{ color: colors.textSecondary, fontSize: 16 }}>Cancel</Text>
            </TouchableOpacity>
            <Text style={[styles.commentHeaderTitle, { color: colors.textPrimary }]}>Search Snaps</Text>
            <View style={{ width: 50 }} />
          </View>
          <View style={{ padding: 12 }}>
            <TextInput
              style={[styles.commentInput, { backgroundColor: isDark ? '#1e293b' : '#f3f4f6', color: colors.textPrimary, fontSize: 15 }]}
              placeholder="Search snaps..."
              placeholderTextColor={colors.textSecondary}
              value={searchSnapQuery}
              onChangeText={(t) => { setSearchSnapQuery(t); if (searchSnapTimer.current) clearTimeout(searchSnapTimer.current); searchSnapTimer.current = setTimeout(() => handleSearchSnaps(t), 300); }}
              autoFocus
            />
          </View>
          {searchingSnaps ? (
            <ActivityIndicator size="large" color="#2563eb" style={{ marginTop: 40 }} />
          ) : searchSnapResults.length > 0 ? (
            <FlatList
              data={searchSnapResults}
              keyExtractor={(item, i) => String(item.id || i)}
              contentContainerStyle={{ padding: 12 }}
              renderItem={({ item }) => (
                <TouchableOpacity style={{ flexDirection: 'row', gap: 12, padding: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border }}
                  onPress={() => { setShowSearch(false); setSearchSnapQuery(''); setSearchSnapResults([]); }}>
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: colors.textPrimary, fontSize: 14 }} numberOfLines={2}>{item.text || 'No text'}</Text>
                    <Text style={{ color: colors.textSecondary, fontSize: 11, marginTop: 4 }}>@{item.username}</Text>
                  </View>
                </TouchableOpacity>
              )}
              ListEmptyComponent={<Text style={{ color: colors.textSecondary, textAlign: 'center', marginTop: 40 }}>No snaps found</Text>}
            />
          ) : searchSnapQuery.trim() ? (
            <Text style={{ color: colors.textSecondary, textAlign: 'center', marginTop: 40 }}>No snaps found</Text>
          ) : null}
        </SafeAreaView>
      </Modal>

      {/* Page counter */}
      {snaps.length > 0 && (
        <View style={styles.pageCounter}>
          <Text style={styles.pageCounterText}>{activeIndex + 1} / {snaps.length}</Text>
        </View>
      )}

      {/* Upload modal */}
      <Modal visible={showUpload} transparent animationType="fade" onRequestClose={() => setShowUpload(false)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setShowUpload(false)}>
          <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
            <TouchableOpacity style={styles.uploadOption} onPress={recordVideo}>
              <Ionicons name="camera" size={24} color={colors.textPrimary} />
              <Text style={[styles.uploadOptionText, { color: colors.textPrimary }]}>Record Video</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.uploadOption} onPress={pickVideo}>
              <Ionicons name="videocam" size={24} color={colors.textPrimary} />
              <Text style={[styles.uploadOptionText, { color: colors.textPrimary }]}>Upload Video</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Create Snap Modal - 3-Step Wizard */}
      <Modal visible={showCreateModal} transparent animationType="slide" onRequestClose={closeCreateModal}>
        <View style={styles.modalOverlay}>
          <TouchableOpacity style={styles.modalBackdrop} activeOpacity={1} onPress={closeCreateModal} />
          <View style={[styles.createModalContent, { backgroundColor: colors.card }]}>
            <View style={styles.createModalHeader}>
              <Text style={[styles.createModalTitle, { color: colors.textPrimary }]}>New Snap</Text>
              <TouchableOpacity onPress={closeCreateModal}>
                <Ionicons name="close" size={24} color={colors.textPrimary} />
              </TouchableOpacity>
            </View>

            {uploading ? (
              <View style={styles.uploadingInModal}>
                <ActivityIndicator size="large" color="#2563eb" />
                <Text style={{ color: colors.textPrimary, fontSize: 16, fontWeight: '700', marginTop: 16 }}>
                  Uploading your snap…
                </Text>
                <Text style={{ color: colors.textSecondary, fontSize: 13, marginTop: 6 }}>
                  {uploadProgress}%
                </Text>
                <View style={styles.progressBarBg}>
                  <View style={[styles.progressBarFill, { width: `${uploadProgress}%` }]} />
                </View>
                <Text style={{ color: '#f59e0b', fontSize: 12, fontWeight: '700', marginTop: 20, textAlign: 'center' }}>
                  Please don't leave this page until the upload finishes.
                </Text>
              </View>
            ) : (
              <React.Fragment>
            {/* Step Indicators */}
            <View style={styles.stepIndicator}>
              {[{ n: 1, l: 'Video' }, { n: 2, l: 'Caption' }, { n: 3, l: 'Category' }].map((s, i) => (
                <React.Fragment key={s.n}>
                  <View style={styles.stepDotRow}>
                    <View style={[styles.stepDot, wizardStep >= s.n ? styles.stepDotActive : styles.stepDotInactive, { borderColor: wizardStep >= s.n ? '#2563eb' : colors.border }]}>
                      <Text style={[styles.stepDotText, { color: wizardStep >= s.n ? '#fff' : colors.textSecondary }]}>{s.n}</Text>
                    </View>
                    <Text style={[styles.stepLabel, { color: wizardStep >= s.n ? colors.textPrimary : colors.textSecondary }]}>{s.l}</Text>
                  </View>
                  {i < 2 && <View style={[styles.stepConnector, { backgroundColor: wizardStep > s.n ? '#2563eb' : colors.border }]} />}
                </React.Fragment>
              ))}
            </View>

            {/* Step 1: Video */}
            {wizardStep === 1 && (
              <View>
                {selectedVideo ? (
                  <View style={styles.createVideoPreview}>
                    <SnapVideoPreview uri={selectedVideo.uri} />
                    <TouchableOpacity style={styles.changeVideoBtn} onPress={() => { setShowCreateModal(false); setShowUpload(true); }}>
                      <Ionicons name="refresh" size={18} color="#fff" />
                      <Text style={styles.changeVideoText}>Change</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <View style={[styles.noVideoPlaceholder, { borderColor: colors.border }]}>
                    <Ionicons name="videocam-outline" size={48} color={colors.textSecondary} />
                    <Text style={{ color: colors.textSecondary, marginTop: 8 }}>No video selected</Text>
                  </View>
                )}
                <TouchableOpacity style={styles.postSnapBtn} onPress={() => setWizardStep(2)} disabled={!selectedVideo}>
                  <Text style={styles.postSnapBtnText}>Next →</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Step 2: Caption */}
            {wizardStep === 2 && (
              <View>
                <View style={{ position: 'relative' }}>
                  <TextInput
                    ref={commentInputRef}
                    style={[styles.captionInput, { backgroundColor: isDark ? '#1e293b' : '#f3f4f6', color: colors.textPrimary }]}
                    placeholder="Add a caption…"
                    placeholderTextColor={colors.textSecondary}
                    value={caption}
                    onChangeText={setCaption}
                    onSelectionChange={(e) => setCaptionCursor(e.nativeEvent.selection.start)}
                    maxLength={280}
                    multiline
                  />
                  <MentionAutocomplete
                    text={caption}
                    cursorPosition={captionCursor}
                    onChangeText={setCaption}
                    colors={colors}
                    isDark={isDark}
                  />
                </View>
                <Text style={[styles.charCount, { color: colors.textSecondary }]}>{caption.length}/280</Text>
                <View style={{ flexDirection: 'row', gap: 12 }}>
                  <TouchableOpacity style={[styles.postSnapBtn, { flex: 1, backgroundColor: isDark ? '#374151' : '#e5e7eb' }]} onPress={() => setWizardStep(1)}>
                    <Text style={[styles.postSnapBtnText, { color: colors.textPrimary }]}>← Back</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.postSnapBtn, { flex: 1 }]} onPress={() => setWizardStep(3)}>
                    <Text style={styles.postSnapBtnText}>Next →</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {/* Step 3: Category */}
            {wizardStep === 3 && (
              <View>
                {selectedVideo && (
                  <View style={styles.createVideoPreviewSmall}>
                    <SnapVideoPreview uri={selectedVideo.uri} />
                  </View>
                )}
                {caption ? (
                  <Text style={[styles.captionPreview, { color: colors.textSecondary }]} numberOfLines={2}>{caption}</Text>
                ) : null}
                <Text style={[styles.stepSectionTitle, { color: colors.textPrimary }]}>Categories</Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 16 }}>
                  {CATEGORIES.map(cat => {
                    const isSelected = selectedCategories.includes(cat.id);
                    return (
                      <TouchableOpacity key={cat.id} onPress={() => setSelectedCategories(prev => prev.includes(cat.id) ? prev.filter(c => c !== cat.id) : [...prev, cat.id])}
                        style={{ paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, backgroundColor: isSelected ? cat.color + '30' : (isDark ? '#1e293b' : '#f3f4f6') }}>
                        <Text style={{ fontSize: 11, fontWeight: '700', color: isSelected ? cat.color : colors.textSecondary }}>{cat.name}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
                <TouchableOpacity style={styles.postSnapBtn} onPress={() => { setWizardStep(1); handleCreateSnap(); }}>
                  <Text style={styles.postSnapBtnText}>✦ Post Snap</Text>
                </TouchableOpacity>
                <TouchableOpacity style={{ paddingVertical: 10, alignItems: 'center', marginTop: 8 }} onPress={() => setWizardStep(2)}>
                  <Text style={{ color: colors.textSecondary, fontSize: 13 }}>← Back</Text>
                </TouchableOpacity>
              </View>
            )}
              </React.Fragment>
            )}
          </View>
        </View>
      </Modal>

      {/* Reactions modal */}
      <Modal visible={!!showReactions} transparent animationType="slide" onRequestClose={() => setShowReactions(null)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setShowReactions(null)}>
          <View style={[styles.reactionsSheet, { backgroundColor: colors.card }]}>
            <Text style={[styles.reactionsTitle, { color: colors.textPrimary }]}>React</Text>
            <View style={styles.emojiGrid}>
              {EMOJIS.map(e => (
                <TouchableOpacity key={e} style={[styles.emojiBtn, reactingPost === showReactions && { opacity: 0.5 }]}
                  onPress={() => showReactions && handleReact(showReactions, e)}>
                  <Text style={{ fontSize: 28 }}>{e}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Comments modal */}
      <Modal visible={!!showComments} animationType="slide" onRequestClose={() => setShowComments(null)}>
        <SafeAreaView style={[s.safe, { backgroundColor: colors.background }]}>
          <View style={[styles.commentHeader, { borderBottomColor: colors.border }]}>
            <TouchableOpacity onPress={() => setShowComments(null)}>
              <Text style={{ color: colors.textSecondary, fontSize: 16 }}>Close</Text>
            </TouchableOpacity>
            <Text style={[styles.commentHeaderTitle, { color: colors.textPrimary }]}>Comments</Text>
            <View style={{ width: 40 }} />
          </View>
          <FlatList
            data={snaps.find(p => p.id === showComments)?.comments || []}
            keyExtractor={(item, i) => item.id || String(i)}
            renderItem={({ item: c }) => (
              <CommentRow comment={c} snapUsername={snaps.find(p => p.id === showComments)?.username || ''} onPress={(u) => navigation.navigate('Profile', { username: u })} />
            )}
            ListEmptyComponent={
              <View style={{ alignItems: 'center', paddingTop: 60 }}>
                <Text style={{ color: colors.textSecondary, fontSize: 13 }}>No comments yet</Text>
              </View>
            }
          />
          <View style={[styles.commentInputRow, { borderTopColor: colors.border, backgroundColor: colors.card, position: 'relative' }]}>
            <View style={{ flex: 1, position: 'relative' }}>
              <TextInput ref={commentInputRef}
                style={[styles.commentInput, { backgroundColor: isDark ? '#1e293b' : '#f3f4f6', color: colors.textPrimary }]}
                placeholder="Add a comment..." placeholderTextColor={colors.textSecondary}
                value={commentText} onChangeText={setCommentText}
                onSelectionChange={(e) => setCommentCursor(e.nativeEvent.selection.start)}
              />
              <MentionAutocomplete
                text={commentText}
                cursorPosition={commentCursor}
                onChangeText={setCommentText}
                colors={colors}
                isDark={isDark}
              />
            </View>
            <TouchableOpacity style={[styles.commentSendBtn, commenting && { opacity: 0.5 }]}
              onPress={() => showComments && handleComment(showComments)} disabled={commenting || !commentText.trim()}>
              {commenting ? <ActivityIndicator color="#fff" size="small" /> : <Ionicons name="send" size={18} color="#fff" />}
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </Modal>

      {/* Gift modal */}
      <GiftCoinsModal
        visible={!!showGift}
        onClose={() => setShowGift(null)}
        recipientUsername={showGift?.username || ''}
        recipientFullname={showGift?.fullname}
        recipientAvatar={showGift?.profile_pic}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  snapContainer: { width: SCREEN_WIDTH, position: 'relative' },
  snapVideo: { width: '100%', height: '100%' },
  snapTextFallback: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 },
  snapFallbackText: { color: '#fff', fontSize: 18, textAlign: 'center', lineHeight: 26 },
  snapGradient: { position: 'absolute', bottom: 0, left: 0, right: 0, height: '40%' },
  rightActions: { position: 'absolute', right: 12, bottom: 180, alignItems: 'center', gap: 18, zIndex: 10 },
  actionBtn: { alignItems: 'center', gap: 2, padding: 4 },
  actionCount: { color: '#fff', fontSize: 11, fontWeight: '600' },
  bottomInfo: { position: 'absolute', bottom: 60, left: 16, right: 60, zIndex: 10 },
  miniAvatar: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  miniAvatarImg: { width: 26, height: 26, borderRadius: 13 },
  miniAvatarImgBorder: { width: 36, height: 36, borderRadius: 18, borderWidth: 2, borderColor: 'rgba(255,255,255,0.8)' },
  miniAvatarText: { color: '#fff', fontSize: 11, fontWeight: '800' },
  snapFullname: { color: '#fff', fontSize: 14, fontWeight: '800' },
  snapUsername: { color: 'rgba(255,255,255,0.6)', fontSize: 11 },
  miniVerified: { width: 16, height: 16, borderRadius: 8, backgroundColor: '#2563eb', alignItems: 'center', justifyContent: 'center', marginLeft: 0 },
  followChip: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 12, borderWidth: 1, borderColor: '#fff' },
  followChipText: { color: '#fff', fontSize: 11, fontWeight: '600' },
  snapText: { color: 'rgba(255,255,255,0.9)', fontSize: 13, lineHeight: 18, marginTop: 6, textShadowColor: 'rgba(0,0,0,0.5)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 3 },
  seeMore: { color: 'rgba(255,255,255,0.7)', fontSize: 11, fontWeight: '600', marginTop: 2 },
  reactionsBar: { position: 'absolute', top: 80, left: 16, flexDirection: 'row', gap: -4 },
  header: { position: 'absolute', top: 50, left: 0, right: 0, zIndex: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16 },
  headerTitle: { color: '#fff', fontSize: 20, fontWeight: '800' },
  uploadBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalBackdrop: { ...StyleSheet.absoluteFillObject },
  modalContent: { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 40, gap: 12 },
  uploadOption: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16, borderRadius: 12 },
  uploadOptionText: { fontSize: 16, fontWeight: '600' },
  reactionsSheet: { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 16, paddingBottom: 40 },
  reactionsTitle: { fontSize: 16, fontWeight: '700', marginBottom: 12, textAlign: 'center' },
  emojiGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center' },
  emojiBtn: { width: '20%', alignItems: 'center', paddingVertical: 8 },
  commentHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', height: 52, paddingHorizontal: 16, borderBottomWidth: StyleSheet.hairlineWidth },
  commentHeaderTitle: { fontSize: 17, fontWeight: '700' },
  commentRow: { flexDirection: 'row', gap: 10, padding: 12, borderBottomWidth: StyleSheet.hairlineWidth },
  commentAvatar: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  commentAvatarImg: { width: 32, height: 32, borderRadius: 16 },
  commentAvatarText: { color: '#fff', fontSize: 11, fontWeight: '800' },
  commentFullname: { fontSize: 12, fontWeight: '700' },
  creatorBadge: { backgroundColor: 'rgba(37,99,235,.2)', borderRadius: 4, paddingHorizontal: 5, paddingVertical: 1 },
  creatorBadgeText: { fontSize: 9, fontWeight: '800', color: '#2563eb', letterSpacing: 0.5 },
  commentVerifiedBadge: { backgroundColor: '#1d9bf0', borderRadius: 8, width: 14, height: 14, alignItems: 'center', justifyContent: 'center' },
  commentTime: { fontSize: 11, color: 'rgba(255,255,255,.35)', marginLeft: 'auto' },
  commentText: { fontSize: 13, marginTop: 3, lineHeight: 17 },
  commentInputRow: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12, borderTopWidth: StyleSheet.hairlineWidth },
  commentInput: { flex: 1, borderRadius: 20, paddingHorizontal: 16, paddingVertical: 10, fontSize: 13 },
  commentSendBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#2563eb', alignItems: 'center', justifyContent: 'center' },
  uploadingInModal: { alignItems: 'center', justifyContent: 'center', paddingVertical: 48 },
  progressBarBg: { width: 200, height: 4, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.2)', marginTop: 8, overflow: 'hidden' },
  progressBarFill: { height: '100%', borderRadius: 2, backgroundColor: '#2563eb' },
  stepIndicator: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 20, paddingHorizontal: 16 },
  stepDotRow: { alignItems: 'center', gap: 4 },
  stepDot: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center', borderWidth: 2 },
  stepDotActive: { backgroundColor: '#2563eb', borderColor: '#2563eb' },
  stepDotInactive: { backgroundColor: 'transparent' },
  stepDotText: { fontSize: 12, fontWeight: '800' },
  stepLabel: { fontSize: 10, fontWeight: '600', marginTop: 2 },
  stepConnector: { flex: 1, height: 2, marginHorizontal: 8, marginTop: -12, borderRadius: 1 },
  stepSectionTitle: { fontSize: 13, fontWeight: '700', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 },
  captionPreview: { fontSize: 13, marginBottom: 12, lineHeight: 18 },
  changeVideoBtn: { position: 'absolute', top: 8, right: 8, backgroundColor: 'rgba(0,0,0,0.6)', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4, flexDirection: 'row', alignItems: 'center', gap: 4 },
  changeVideoText: { color: '#fff', fontSize: 11, fontWeight: '600' },
  noVideoPlaceholder: { height: 160, borderRadius: 12, borderWidth: 2, borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  createVideoPreviewSmall: { height: 120, borderRadius: 10, overflow: 'hidden', marginBottom: 12, backgroundColor: '#000' },
  createModalContent: { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingBottom: 40, minHeight: 350 },
  createModalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  createModalTitle: { fontSize: 18, fontWeight: '800' },
  createVideoPreview: { height: 200, borderRadius: 12, overflow: 'hidden', marginBottom: 12, backgroundColor: '#000' },
  createVideo: { width: '100%', height: '100%' },
  captionInput: { borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14, minHeight: 80, textAlignVertical: 'top' },
  charCount: { fontSize: 11, textAlign: 'right', marginTop: 4, marginBottom: 12 },
  postSnapBtn: { backgroundColor: '#2563eb', paddingVertical: 14, borderRadius: 14, alignItems: 'center' },
  postSnapBtnText: { color: '#fff', fontSize: 16, fontWeight: '800' },
  seekTapArea: { position: 'absolute', top: 0, bottom: 0, width: '35%', zIndex: 5 },
  centerTapArea: { position: 'absolute', top: 0, bottom: 0, left: '35%', right: '35%', zIndex: 5 },
  seekIndicatorContainer: { position: 'absolute', top: '45%', backgroundColor: 'rgba(0,0,0,0.6)', padding: 16, borderRadius: 30, alignItems: 'center', justifyContent: 'center', zIndex: 10 },
  seekIndicatorText: { color: '#fff', fontSize: 12, fontWeight: '700', marginTop: 4 },
  heartOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center', zIndex: 10 },
  likeAnimFloat: { position: 'absolute', right: 65, bottom: 240, zIndex: 15, },
  pauseOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.3)', zIndex: 10 },
  pauseIconCircle: { width: 64, height: 64, borderRadius: 32, backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center' },
  pageCounter: { position: 'absolute', bottom: 30, alignSelf: 'center', backgroundColor: 'rgba(0,0,0,0.5)', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12, zIndex: 10 },
  pageCounterText: { color: '#fff', fontSize: 12, fontWeight: '600' },
});

function makeStyles(colors: any, isDark: boolean) { return StyleSheet.create({ safe: { flex: 1 } }); }
