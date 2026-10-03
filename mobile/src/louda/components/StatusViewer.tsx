import React, { memo, useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  Image,
  TextInput,
  ScrollView,
  Modal,
  StyleSheet,
  PanResponder,
  Animated,
  Platform,
  Alert,
} from 'react-native';
import { Ripple } from '../../components/Ripple';
import {
  createVideoPlayer,
  VideoView,
  type VideoPlayer as VideoPlayerInstance,
} from 'expo-video';
import { createAudioPlayer, type AudioPlayer as AudioPlayerInstance } from 'expo-audio';
import { Icons } from '../icons';
import { DEFAULT_AVATAR } from '../constants';
import { resolveFont } from './StatusCreator';
import * as api from '../api';
import { emitLoudaSocket } from '../socket';

// Port of StatusViewer (StatusComponents.jsx:500-817)
export const StatusViewer = memo(function StatusViewer({
  user,
  statuses,
  targetUserId,
  contacts,
  onClose,
  initialStatusId,
}: {
  user: any;
  statuses: any[];
  targetUserId: string;
  contacts: any[];
  onClose: () => void;
  initialStatusId?: string | null;
}) {
  const myStatuses = statuses.filter((s) => s.user_id === user.id);
  const contactStatuses = statuses.filter((s) => s.user_id !== user.id);
  const groupedContacts = contacts
    .map((c) => {
      const userStatuses = contactStatuses.filter((s) => s.user_id === c.id);
      return {
        id: c.id,
        name: c.name || c.number,
        avatar_url: c.avatar_url,
        statuses: userStatuses,
        latestTimestamp: userStatuses.length
          ? Math.max(...userStatuses.map((s) => new Date(s.timestamp).getTime()))
          : 0,
      };
    })
    .filter((c) => c.statuses.length > 0)
    .sort((a, b) => b.latestTimestamp - a.latestTimestamp);

  const sequence: any[] =
    targetUserId === user.id
      ? [{ id: user.id, name: 'My Status', avatar_url: user.avatar_url, statuses: myStatuses }, ...groupedContacts]
      : groupedContacts;

  // Initial user index; initialStatusId jumps straight to a quoted status
  const initialUserIndex = Math.max(
    0,
    (() => {
      if (initialStatusId) {
        const gi = sequence.findIndex((g) => g.statuses?.some((s: any) => s.id === initialStatusId));
        if (gi !== -1) return gi;
      }
      return sequence.findIndex((g) => g.id === targetUserId);
    })(),
  );
  const initialStatusIndex: number = (() => {
    if (initialStatusId) {
      const g = sequence[initialUserIndex];
      const si = g?.statuses?.findIndex((s: any) => s.id === initialStatusId);
      if (si != null && si !== -1) return si;
    }
    return 0;
  })();

  const [currentUserIndex, setCurrentUserIndex] = useState(initialUserIndex);
  const [currentStatusIndex, setCurrentStatusIndex] = useState(initialStatusIndex);
  const [progress, setProgress] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [showReceipts, setShowReceipts] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [expandedCaption, setExpandedCaption] = useState(false);

  const activeGroup = sequence[currentUserIndex];
  const userStatusesList = activeGroup?.statuses || [];
  const currentStatus = userStatusesList[currentStatusIndex];
  const isOwn = currentStatus?.user_id === user.id;

  const videoPlayerRef = useRef<VideoPlayerInstance | null>(null);
  const [videoPlayer, setVideoPlayer] = useState<VideoPlayerInstance | null>(null);
  const musicPlayerRef = useRef<AudioPlayerInstance | null>(null);
  const holdStartRef = useRef(0);
  const spin = useRef(new Animated.Value(0)).current;

  // Resume at first unviewed when switching user (web 529-534).
  // Skipped on the first run when a quoted status jump (initialStatusId)
  // selected the starting index — otherwise it would clobber the jump.
  const didInitRef = useRef(false);
  useEffect(() => {
    if (!didInitRef.current) {
      didInitRef.current = true;
      return;
    }
    const activeG = sequence[currentUserIndex];
    const list = activeG?.statuses || [];
    const firstUnviewed = list.findIndex(
      (s: any) => !(s.views || []).some((v: any) => v.userId === user.id),
    );
    setCurrentStatusIndex(firstUnviewed !== -1 ? firstUnviewed : 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUserIndex]);

  // Mark viewed + reset media on status change (web 536-560)
  useEffect(() => {
    if (!currentStatus) return;
    if (!isOwn) {
      api.viewStatus(currentStatus.id, user.id).catch((e) => console.error(e));
    }
    setProgress(0);
    setExpandedCaption(false);

    // video player
    if (videoPlayerRef.current) {
      try {
        videoPlayerRef.current.pause();
        videoPlayerRef.current.currentTime = 0;
      } catch {}
      videoPlayerRef.current = null;
      setVideoPlayer(null);
    }
    if (currentStatus.type === 'video' && currentStatus.media_url) {
      try {
        const pl = createVideoPlayer(currentStatus.media_url);
        pl.play();
        videoPlayerRef.current = pl;
        setVideoPlayer(pl);
      } catch (e) {
        console.error(e);
      }
    }

    // music player (web 552-559)
    if (musicPlayerRef.current) {
      try {
        musicPlayerRef.current.pause();
        musicPlayerRef.current.remove();
      } catch {}
      musicPlayerRef.current = null;
    }
    if (currentStatus.music?.url) {
      try {
        const pl = createAudioPlayer({ uri: currentStatus.music.url });
        pl.play();
        musicPlayerRef.current = pl;
      } catch (e) {
        console.error(e);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentStatusIndex, currentUserIndex]);

  // Cleanup players on unmount
  useEffect(() => {
    return () => {
      try {
        videoPlayerRef.current?.pause();
      } catch {}
      try {
        musicPlayerRef.current?.pause();
        musicPlayerRef.current?.remove();
      } catch {}
      videoPlayerRef.current = null;
      musicPlayerRef.current = null;
    };
  }, []);

  // Spinning music disc (web animate-[spin_3s_linear_infinite])
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(spin, { toValue: 1, duration: 3000, useNativeDriver: true }),
        Animated.timing(spin, { toValue: 0, duration: 0, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [spin]);

  const goToNextStatus = useCallback(() => {
    if (currentStatusIndex < userStatusesList.length - 1) {
      setCurrentStatusIndex((c) => c + 1);
    } else if (currentUserIndex < sequence.length - 1) {
      setCurrentUserIndex((c) => c + 1);
    } else {
      onClose();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentStatusIndex, currentUserIndex, userStatusesList.length, sequence.length, onClose]);

    // Progress ticker (web 562-585)
  useEffect(() => {
    if (isPaused || showReceipts || expandedCaption || !currentStatus) return;

    const isVideo = currentStatus.type === 'video';
    const duration = 30000;

    const interval = setInterval(() => {
      if (isVideo && videoPlayerRef.current) {
        const pl = videoPlayerRef.current;
        if (pl.duration) {
          setProgress((pl.currentTime / pl.duration) * 100);
        }
      } else {
        setProgress((p) => {
          if (p >= 100) {
            goToNextStatus();
            return 0;
          }
          return p + 100 / (duration / 50);
        });
      }
    }, 50);

    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentStatusIndex, currentUserIndex, isPaused, showReceipts, expandedCaption, currentStatus]);

  // Video ended → next status (web onEnded)
  useEffect(() => {
    const pl = videoPlayer;
    if (!pl) return;
    const sub = pl.addListener('playToEnd', () => {
      goToNextStatus();
    });
    return () => sub.remove();
  }, [videoPlayer, goToNextStatus]);

  const sendReply = () => {
    if (!replyText.trim()) return;
    if (currentStatus) {
      emitLoudaSocket('send-message', {
        toUserId: currentStatus.user_id,
        message: {
          text: replyText,
          quotedStatus: {
            id: currentStatus.id,
            type: currentStatus.type,
            content: currentStatus.content,
            media_url: currentStatus.media_url,
            timestamp: currentStatus.timestamp,
          },
        },
      });
      Alert.alert('', 'Reply sent');
    }
    setReplyText('');
  };

  if (!currentStatus) return null;

  // Tap / hold / swipe (web 617-643)
  const pan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) > 8 || Math.abs(g.dy) > 8,
      onPanResponderGrant: () => {
        holdStartRef.current = Date.now();
        setIsPaused(true);
      },
      onPanResponderRelease: (evt, g) => {
        setIsPaused(false);
        if (Math.abs(g.dx) > 50) {
          // horizontal swipe → next/prev user (web touch delta>50)
          if (g.dx < 0) {
            if (currentUserIndex < sequence.length - 1) setCurrentUserIndex((c) => c + 1);
            else onClose();
          } else if (currentUserIndex > 0) {
            setCurrentUserIndex((c) => c - 1);
          }
          return;
        }
        if (Date.now() - holdStartRef.current > 200) return; // long hold: pause only
        const x = evt.nativeEvent.locationX;
        if (x < lastWidth.current * 0.3) {
          if (currentStatusIndex > 0) setCurrentStatusIndex((c) => c - 1);
          else if (currentUserIndex > 0) setCurrentUserIndex((c) => c - 1);
        } else {
          goToNextStatus();
        }
      },
      onPanResponderTerminate: () => setIsPaused(false),
    }),
  ).current;

  const lastWidth = useRef(400);

  const spinRotate = spin.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });

  return (
    <Modal transparent statusBarTranslucent visible onRequestClose={onClose}>
      <View style={s.root}>
        {/* Progress segments (web 671-677) */}
        <View style={s.segments}>
          {userStatusesList.map((st: any, i: number) => (
            <View key={st.id} style={s.segmentTrack}>
              <View
                style={[
                  s.segmentFill,
                  {
                    width:
                      i < currentStatusIndex
                        ? '100%'
                        : i === currentStatusIndex
                          ? `${progress}%`
                          : '0%',
                  },
                ]}
              />
            </View>
          ))}
        </View>

        {/* Header (web 679-688) */}
        <View style={s.header}>
          <Ripple onPress={onClose} style={{ padding: 4 }}>
            <Icons.arrowLeft size={22} color="#fff" />
          </Ripple>
          <Image source={{ uri: activeGroup?.avatar_url || DEFAULT_AVATAR }} style={s.headerAvatar} />
          <View style={{ flex: 1 }}>
            <Text style={s.headerName} numberOfLines={1}>
              {activeGroup?.name}
            </Text>
            <Text style={s.headerTime}>
              {new Date(currentStatus.timestamp).toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
              })}
            </Text>
          </View>
        </View>

        {/* Stage (web 690-765) */}
        <View
          style={[s.stage, { backgroundColor: currentStatus.settings?.bg || '#000' }]}
          onLayout={(e) => (lastWidth.current = e.nativeEvent.layout.width)}
          {...pan.panHandlers}
        >
          {currentStatus.type === 'text' && (
            <Text
              style={[
                s.statusText,
                { fontFamily: resolveFont(currentStatus.settings?.font) },
              ]}
            >
              {currentStatus.content}
            </Text>
          )}
          {currentStatus.type === 'image' && (
            <Image
              source={{ uri: currentStatus.media_url }}
              style={s.media}
              resizeMode="contain"
            />
          )}
          {currentStatus.type === 'video' && videoPlayer && (
            <View style={s.media}>
              <VideoView
                player={videoPlayer}
                style={{ width: '100%', height: '100%' }}
                contentFit="contain"
                nativeControls={false}
              />
            </View>
          )}

          {/* Music chip (web 723-734) */}
          {currentStatus.music?.url && (
            <View style={s.musicChip}>
              <Animated.View style={[s.musicDisc, { transform: [{ rotate: spinRotate }] }]}>
                <Icons.music size={15} color="#fff" />
              </Animated.View>
              <View style={{ flex: 1 }}>
                <Text style={s.musicName} numberOfLines={1}>
                  {currentStatus.music.name}
                </Text>
                {!!currentStatus.music.artist && (
                  <Text style={s.musicArtist} numberOfLines={1}>
                    {currentStatus.music.artist}
                  </Text>
                )}
              </View>
            </View>
          )}

          {/* Caption (web 736-756) */}
          {(currentStatus.type === 'image' || currentStatus.type === 'video') &&
            !!currentStatus.content && (
              <View style={s.captionWrap} pointerEvents="box-none">
                <Ripple
                  activeOpacity={0.9}
                  onPress={() => {
                    const next = !expandedCaption;
                    setExpandedCaption(next);
                    setIsPaused(next);
                    if (next) {
                      try {
                        videoPlayerRef.current?.pause();
                      } catch {}
                    } else {
                      try {
                        videoPlayerRef.current?.play();
                      } catch {}
                    }
                  }}
                  style={s.caption}
                >
                  <Text
                    style={s.captionText}
                    numberOfLines={expandedCaption ? undefined : 1}
                  >
                    {currentStatus.content}
                  </Text>
                </Ripple>
              </View>
            )}
        </View>

        {/* Reply bar (web 767-776) */}
        {!isOwn && (
          <View style={s.replyBar}>
            <TextInput
              value={replyText}
              onChangeText={setReplyText}
              onFocus={() => setIsPaused(true)}
              onBlur={() => setIsPaused(false)}
              onSubmitEditing={sendReply}
              placeholder="Reply..."
              placeholderTextColor="rgba(255,255,255,0.6)"
              style={s.replyInput}
            />
            <Ripple style={s.replySend} onPress={sendReply}>
              <Icons.send size={19} color="#fff" />
            </Ripple>
          </View>
        )}

        {/* Own views button (web 778-785) */}
        {isOwn && (
          <View style={s.viewsWrap} pointerEvents="box-none">
            <Ripple style={s.viewsBtn} onPress={() => setShowReceipts(true)}>
              <Icons.eye size={17} color="#fff" />
              <Text style={s.viewsBtnText}>{currentStatus.views?.length || 0}</Text>
            </Ripple>
          </View>
        )}

        {/* Receipts sheet (web 787-813) */}
        <Modal
          transparent
          statusBarTranslucent
          visible={showReceipts}
          animationType="slide"
          onRequestClose={() => setShowReceipts(false)}
        >
          <View style={s.receiptsOverlay}>
            <View style={s.receiptsSheet}>
              <View style={s.receiptsHandle} />
              <View style={s.receiptsHead}>
                <Text style={s.receiptsTitle}>
                  Viewed by {currentStatus.views?.length || 0}
                </Text>
                <Ripple
                  style={s.receiptsClose}
                  onPress={() => setShowReceipts(false)}
                >
                  <Icons.x size={17} color="#6b7280" />
                </Ripple>
              </View>
              <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 24 }}>
                {(currentStatus.views || []).map((v: any, i: number) => (
                  <View key={v.userId + i} style={s.receiptRow}>
                    <Image source={{ uri: v.avatar || DEFAULT_AVATAR }} style={s.receiptAvatar} />
                    <View style={{ flex: 1 }}>
                      <Text style={s.receiptName}>{v.name}</Text>
                      <Text style={s.receiptTime}>
                        {new Date(v.viewedAt).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </Text>
                    </View>
                  </View>
                ))}
                {(currentStatus.views || []).length === 0 && (
                  <Text style={s.receiptEmpty}>No views yet.</Text>
                )}
              </ScrollView>
            </View>
          </View>
        </Modal>
      </View>
    </Modal>
  );
});

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#000' },
  segments: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 54 : 34,
    left: 12,
    right: 12,
    zIndex: 40,
    flexDirection: 'row',
    gap: 6,
  },
  segmentTrack: {
    flex: 1,
    height: 3,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.3)',
    overflow: 'hidden',
  },
  segmentFill: { height: '100%', backgroundColor: '#fff' },
  header: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 66 : 46,
    left: 12,
    right: 12,
    zIndex: 40,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  headerAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
  },
  headerName: { color: '#fff', fontSize: 16, fontWeight: '700' },
  headerTime: { color: 'rgba(255,255,255,0.8)', fontSize: 12, fontWeight: '500', marginTop: 2 },
  stage: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  statusText: {
    color: '#fff',
    fontSize: 40,
    lineHeight: 48,
    textAlign: 'center',
    paddingHorizontal: 32,
    width: '100%',
  } as any,
  media: { width: '100%', height: '100%' },
  musicChip: {
    position: 'absolute',
    top: 100,
    right: 16,
    zIndex: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 16,
    maxWidth: 220,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  musicDisc: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  musicName: { color: '#fff', fontSize: 12, fontWeight: '700' },
  musicArtist: { color: 'rgba(255,255,255,0.6)', fontSize: 10, marginTop: 1 },
  captionWrap: {
    position: 'absolute',
    bottom: 90,
    left: 0,
    right: 0,
    paddingHorizontal: 16,
    alignItems: 'center',
    zIndex: 20,
  },
  caption: {
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 16,
    maxWidth: '92%',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  captionText: { color: '#fff', fontSize: 16, fontWeight: '500' },
  replyBar: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 40 : 24,
    left: 16,
    right: 16,
    zIndex: 40,
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
  },
  replyInput: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    color: '#fff',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
    borderRadius: 999,
    paddingHorizontal: 20,
    paddingVertical: Platform.OS === 'ios' ? 14 : 10,
    fontSize: 15,
    fontWeight: '500',
  },
  replySend: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#2563eb',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  viewsWrap: {
    position: 'absolute',
    bottom: 32,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 40,
  },
  viewsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  viewsBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  receiptsOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  receiptsSheet: {
    height: '65%',
    backgroundColor: '#fff',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    paddingTop: 12,
    shadowColor: '#000',
    shadowOpacity: 0.4,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: -8 },
    elevation: 16,
  },
  receiptsHandle: {
    alignSelf: 'center',
    width: 48,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#d1d5db',
    marginBottom: 10,
  },
  receiptsHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingBottom: 8,
  },
  receiptsTitle: { fontSize: 19, fontWeight: '900', color: '#111827', letterSpacing: -0.5 },
  receiptsClose: {
    padding: 10,
    borderRadius: 999,
    backgroundColor: '#f3f4f6',
  },
  receiptRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#e5e7eb',
  },
  receiptAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  receiptName: { fontSize: 15, fontWeight: '700', color: '#111827' },
  receiptTime: { fontSize: 12, color: '#6b7280', marginTop: 3, fontWeight: '500' },
  receiptEmpty: { textAlign: 'center', color: '#9ca3af', paddingVertical: 48, fontWeight: '500' },
});
