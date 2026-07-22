import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  ActivityIndicator, Image, TextInput,
  Animated, Dimensions, ScrollView, useWindowDimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useVideoPlayer, VideoView } from 'expo-video';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import { getLiveStreamsAPI, LiveStream } from '../../api/live';
import { apiPost, API_BASE_URL } from '../../api/client';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const DEFAULT_PIC = 'https://res.cloudinary.com/dzvm9xe1i/image/upload/v1746095979/profile-pictures/e2st5nispbicnhnir9cf.jpg';
const GIFTS = [
  { id: 'rose', tier: 1, name: 'Rose', emoji: '🌹', color: '#f59e0b', cost: 10 },
  { id: 'fire', tier: 2, name: 'Fire', emoji: '🔥', color: '#f97316', cost: 50 },
  { id: 'crown', tier: 3, name: 'Crown', emoji: '👑', color: '#a855f7', cost: 200 },
  { id: 'heart', tier: 4, name: 'Heart', emoji: '❤️', color: '#ec4899', cost: 500 },
  { id: 'rocket', tier: 5, name: 'Rocket', emoji: '🚀', color: '#ef4444', cost: 1000 },
];

const GIFT_TITLES: Record<number, string> = { 5: 'LEGENDARY', 4: 'EPIC', 3: 'INCREDIBLE', 2: 'AWESOME', 1: 'NICE' };

function GiftOverlayView({ gift, sender, onDone }: { gift: any; sender: string; onDone: () => void }) {
  const opacity = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.3)).current;
  const tier = Number(gift.tier) || 1;
  const duration = { 1: 2, 2: 2.5, 3: 3.5, 4: 4.5, 5: 5.5 }[tier] || 2;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 300, useNativeDriver: true }),
      Animated.spring(scale, { toValue: 1, friction: 5, useNativeDriver: true }),
    ]).start();
    const t = setTimeout(() => {
      Animated.timing(opacity, { toValue: 0, duration: 500, useNativeDriver: true }).start(onDone);
    }, duration * 1000);
    return () => clearTimeout(t);
  }, []);

  return (
    <Animated.View style={[styles.giftOverlayAnim, { opacity, transform: [{ scale }] }]}>
      <Text style={[styles.giftTitleAnim, { color: gift.color, fontSize: tier >= 5 ? 44 : tier >= 4 ? 36 : 28 }]}>
        {GIFT_TITLES[tier] || 'NICE'}
      </Text>
      {tier >= 2 && (
        <Text style={styles.giftSubAnim}>{sender} sent {gift.name} · {gift.cost} coins</Text>
      )}
    </Animated.View>
  );
}

function formatTime(seconds: number) {
  if (isNaN(seconds) || !isFinite(seconds)) return '0:00';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s < 10 ? '0' : ''}${s}`;
}

function LiveCommentMessage({ msg }: { msg: any }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 6, paddingVertical: 2 }}>
      <View style={styles.msgAvatar}>
        <Text style={styles.msgAvatarText}>{(msg.username || '?')[0].toUpperCase()}</Text>
      </View>
      <View style={{ flex: 1 }}>
        {msg.gift ? (
          <Text style={styles.msgGiftText}>
            {msg.username} sent a {msg.gift.name}
            {msg.gift.tier >= 4 ? ' — MASSIVE!' : msg.gift.tier >= 3 ? ' — amazing!' : '!'}
          </Text>
        ) : (
          <Text style={styles.msgText}>
            <Text style={styles.msgUsername}>{msg.username} </Text>
            {msg.text}
          </Text>
        )}
      </View>
    </View>
  );
}

export default function LiveViewScreen({ navigation, route }: { navigation: any; route?: any }) {
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const deviceIsLandscape = windowWidth > windowHeight;
  const { colors, isDark } = useTheme();
  const { username } = useAuth();
  const { socket, on, off, emit } = useSocket();

  // List mode
  const [streams, setStreams] = useState<LiveStream[]>([]);
  const [loading, setLoading] = useState(true);

  // Watch mode
  const [joined, setJoined] = useState(false);
  const [viewerCount, setViewerCount] = useState(0);
  const [comments, setComments] = useState<any[]>([]);
  const [inputText, setInputText] = useState('');
  const [showChat, setShowChat] = useState(true);
  const [audioMuted, setAudioMuted] = useState(true);
  const [userPaused, setUserPaused] = useState(false);
  const [streamPaused, setStreamPaused] = useState(false);
  const effectivePaused = streamPaused || userPaused;
  const [showGiftDrawer, setShowGiftDrawer] = useState(false);
  const [giftOverlays, setGiftOverlays] = useState<any[]>([]);
  const [giftErrorMessage, setGiftErrorMessage] = useState('');
  const [giftSending, setGiftSending] = useState(false);
  const [streamEnded, setStreamEnded] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [isLandscapeStream, setIsLandscapeStream] = useState<boolean | null>(null);
  const [videoSize, setVideoSize] = useState({ w: 0, h: 0 });

  const chatScrollRef = useRef<ScrollView>(null);
  const seenCommentsRef = useRef(new Set<string>());

  // Read postId from route params (PostCard sends { postId })
  const paramId = route?.params?.postId || route?.params?.streamId || '';
  const [activeStream, setActiveStream] = useState<LiveStream | null>(
    paramId ? ({ id: paramId, stream_id: paramId, username: '' } as LiveStream) : null
  );
  const postId = activeStream ? String(activeStream.id || activeStream.stream_id) : '';

  // Video player
  const videoSource = postId && joined ? `${API_BASE_URL}/api/live-stream/${postId}?live=1` : null;
  const player = useVideoPlayer(videoSource, p => {
    p.muted = audioMuted;
    p.loop = false;
  });

  useEffect(() => {
    if (player) {
      player.muted = audioMuted;
      if (!effectivePaused && joined) {
        player.play();
      } else if (effectivePaused) {
        player.pause();
      }
    }
  }, [audioMuted, effectivePaused, joined, player]);

  useEffect(() => {
    if (joined && player) {
      player.play();
    }
  }, [joined, player]);

  // Detect video dimensions to adjust contentFit like web client
  useEffect(() => {
    if (!player) return;
    const sub = player.addListener('statusChange', ({ status }) => {
      if (status?.videoWidth && status?.videoHeight) {
        const w = status.videoWidth as number;
        const h = status.videoHeight as number;
        setVideoSize({ w, h });
        setIsLandscapeStream(w > h);
      }
    });
    return () => sub.remove();
  }, [player]);

  // Watch route params for navigation changes (re-navigation to same screen)
  useEffect(() => {
    if (paramId) {
      setActiveStream({ id: paramId, stream_id: paramId, username: '' } as LiveStream);
      setJoined(false);
      setComments([]);
      setGiftOverlays([]);
    }
  }, [paramId]);

  // Load streams & try to match paramId for metadata
  useEffect(() => { loadStreams(); }, []);

  const loadStreams = async () => {
    setLoading(true);
    const res = await getLiveStreamsAPI();
    if (res.ok && res.data) {
      setStreams(res.data);
      if (paramId) {
        const found = res.data.find(s => String(s.id) === String(paramId) || String(s.stream_id) === String(paramId));
        if (found) setActiveStream(found);
      }
    }
    setLoading(false);
  };

  // Socket listeners for active stream
  const addCommentLocally = useCallback((comment: any) => {
    const key = comment.id || `${comment.username}|${comment.text || ''}|${comment.giftId || ''}|${comment.created_at || ''}`;
    if (!seenCommentsRef.current.has(key)) {
      seenCommentsRef.current.add(key);
      setComments(prev => [...prev.slice(-199), comment]);
    }
  }, []);

  const receiveGiftVisual = useCallback((gift: any, sender: string) => {
    const id = Date.now() + Math.random();
    setGiftOverlays(prev => [...prev, { id, gift, sender }]);
  }, []);

  // Socket listeners
  useEffect(() => {
    if (!postId || !activeStream) return;

    const onViewerCount = (data: any) => {
      if (data && String(data.postId) === postId) {
        setViewerCount(Number(data.count || 0));
      }
    };
    const onLiveComment = (data: any) => {
      if (data && String(data.postId) === postId && data.comment) {
        addCommentLocally(data.comment);
      }
    };
    const onMobcoinsGift = (data: any) => {
      if (!data || String(data.postId) !== postId) return;
      const targetGift = GIFTS.find(g => g.id === data.giftId);
      if (targetGift) {
        receiveGiftVisual(targetGift, data.fromId || 'Someone');
        addCommentLocally({
          username: data.fromId || 'Someone',
          text: '',
          giftId: data.giftId,
          gift: targetGift,
          created_at: new Date().toISOString(),
          id: `gift-${Date.now()}`,
        });
      }
    };
    const onLiveEnded = (data: any) => {
      if (data && String(data.postId) === postId) {
        setStreamEnded(true);
        setStreamPaused(true);
      }
    };
    const onLivePaused = (data: any) => {
      if (data && String(data.postId) === postId) {
        setStreamPaused(true);
        player.pause();
      }
    };
    const onLiveResumed = (data: any) => {
      if (data && String(data.postId) === postId) {
        setStreamPaused(false);
        if (!userPaused) player.play();
      }
    };

    on('viewerCountUpdate', onViewerCount);
    on('liveComment', onLiveComment);
    on('mobcoins-gift', onMobcoinsGift);
    on('liveEnded', onLiveEnded);
    on('livePaused', onLivePaused);
    on('liveResumed', onLiveResumed);

    return () => {
      off('viewerCountUpdate', onViewerCount);
      off('liveComment', onLiveComment);
      off('mobcoins-gift', onMobcoinsGift);
      off('liveEnded', onLiveEnded);
      off('livePaused', onLivePaused);
      off('liveResumed', onLiveResumed);
    };
  }, [postId, activeStream, on, off, addCommentLocally, receiveGiftVisual, player]);

  // Join stream
  const joinStream = useCallback(() => {
    if (!socket || !postId) return;
    setErrorMessage('');
    socket.emit('joinLive', { postId }, (res: any) => {
      if (!res?.ok) {
        setErrorMessage(res?.error || 'Failed to join.');
        return;
      }
      if (res.count != null) setViewerCount(Number(res.count));
      setStreamPaused(!!res.paused);
      setUserPaused(false);
      setJoined(true);
    });
  }, [socket, postId]);

  // Leave stream
  const leaveStream = useCallback(() => {
    if (socket && postId) {
      socket.emit('leaveLive', { postId });
    }
    setJoined(false);
    setUserPaused(false);
    if (player) {
      player.pause();
    }
  }, [socket, postId, player]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      leaveStream();
    };
  }, []);

  // Auto join on mobile when active stream is set
  useEffect(() => {
    if (activeStream && postId && !joined) {
      const t = setTimeout(joinStream, 250);
      return () => clearTimeout(t);
    }
  }, [activeStream, postId, joined, joinStream]);

  // Scroll chat
  useEffect(() => {
    if (chatScrollRef.current && comments.length > 0) {
      setTimeout(() => chatScrollRef.current?.scrollToEnd({ animated: true }), 50);
    }
  }, [comments]);

  const sendGift = async (gift: typeof GIFTS[0]) => {
    if (!username || !activeStream || giftSending) return;
    setGiftSending(true);
    setGiftErrorMessage('');

    try {
      const res = await apiPost('/send-gift', {
        username,
        streamer: activeStream.username,
        tier: gift.tier,
        cost: gift.cost,
      });
      if (!res.ok) {
        setGiftErrorMessage('Not enough Mobcoins.');
        setGiftSending(false);
        return;
      }
      if (socket) {
        socket.emit('mobcoins-gift', {
          fromId: username,
          toIds: [activeStream.username],
          amount: gift.cost,
          giftId: gift.id,
          postId,
        });
      }
      receiveGiftVisual(gift, username);
      addCommentLocally({
        username,
        text: '',
        giftId: gift.id,
        gift,
        created_at: new Date().toISOString(),
        id: `gift-my-${Date.now()}`,
      });
      setShowGiftDrawer(false);
    } catch {
      setGiftErrorMessage('Network error.');
    } finally {
      setGiftSending(false);
    }
  };

  const postComment = () => {
    const text = inputText.trim();
    if (!text || !postId) return;
    const comment = {
      username: username || 'Guest',
      text,
      created_at: new Date().toISOString(),
      id: Date.now() + Math.random(),
    };
    setInputText('');
    addCommentLocally(comment);
    if (socket) {
      socket.emit('liveComment', { postId, comment });
    }
  };

  const togglePauseOverride = () => {
    const next = !userPaused;
    setUserPaused(next);
    if (player) {
      if (next) player.pause();
      else if (!streamPaused) player.play();
    }
  };

  // Keep live video content contained to avoid oversize cropping regardless of stream orientation
  const videoContentFit = 'contain';
  const s = makeStyles(colors, isDark);

  // ── ACTIVE STREAM VIEW ──
  if (activeStream) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: '#000' }}>
        <View style={{ flex: 1, position: 'relative' }}>
          {/* Video Player */}
          <View style={{ flex: 1, backgroundColor: '#000' }}>
            {joined && videoSource ? (
              <VideoView
                player={player}
                style={{ flex: 1 }}
                contentFit={videoContentFit as any}
                nativeControls={false}
              />
            ) : (
              <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#111' }}>
                <Ionicons name="radio" size={64} color="#dc2626" style={{ opacity: 0.3 }} />
              </View>
            )}
          </View>

          {/* Gradients */}
          <View style={styles.viewTopGradient} pointerEvents="none" />
          <View style={styles.viewBottomGradient} pointerEvents="none" />

          {/* Paused overlay */}
          {effectivePaused && (
            <View style={styles.viewPausedOverlay}>
              <Text style={{ color: '#fff', fontSize: 20, fontWeight: '800' }}>
                {streamPaused && !userPaused ? 'Stream Paused' : 'Paused'}
              </Text>
            </View>
          )}

          {/* Gift overlays */}
          {giftOverlays.map(g => (
            <GiftOverlayView
              key={g.id}
              gift={g.gift}
              sender={g.sender}
              onDone={() => setGiftOverlays(prev => prev.filter(x => x.id !== g.id))}
            />
          ))}

          {/* Top Bar */}
          <View style={styles.viewTopBar}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <View style={styles.viewLiveBadge}>
                <View style={styles.viewLiveDot} />
                <Text style={styles.viewLiveText}>LIVE</Text>
              </View>
              <Text style={styles.viewViewerCount}>{viewerCount}</Text>
            </View>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <TouchableOpacity style={styles.viewIconBtn} onPress={() => setShowChat(prev => !prev)}>
                <Ionicons name="chatbubbles-outline" size={16} color="#fff" />
              </TouchableOpacity>
              <TouchableOpacity style={styles.viewIconBtn} onPress={() => {}}>
                <Ionicons name="share-outline" size={16} color="#fff" />
              </TouchableOpacity>
              {joined ? (
                <TouchableOpacity style={[styles.viewIconBtn, { backgroundColor: 'rgba(220,38,38,0.7)' }]} onPress={leaveStream}>
                  <Ionicons name="close" size={16} color="#fff" />
                </TouchableOpacity>
              ) : (
                <TouchableOpacity style={[styles.viewIconBtn, { backgroundColor: '#2563eb', paddingHorizontal: 10 }]} onPress={joinStream}>
                  <Text style={{ fontSize: 12, fontWeight: '700', color: '#fff' }}>Join</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* Chat overlay */}
          {showChat && comments.length > 0 && (
            <View style={styles.viewChatOverlay}>
              <ScrollView ref={chatScrollRef} style={{ maxHeight: 160 }} showsVerticalScrollIndicator={false}>
                {comments.slice(-10).map((c: any, i: number) => (
                  <LiveCommentMessage msg={c} key={c.id || i} />
                ))}
              </ScrollView>
            </View>
          )}

          {/* Gift Drawer */}
          {showGiftDrawer && (
            <View style={styles.giftDrawer}>
              <View style={styles.giftDrawerInner}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                  <Text style={styles.giftDrawerTitle}>Send a Gift</Text>
                  <TouchableOpacity onPress={() => { setShowGiftDrawer(false); setGiftErrorMessage(''); }}>
                    <Ionicons name="close" size={16} color="rgba(255,255,255,0.5)" />
                  </TouchableOpacity>
                </View>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                  {GIFTS.map(g => (
                    <TouchableOpacity
                      key={g.id}
                      style={styles.giftItem}
                      onPress={() => sendGift(g)}
                      disabled={giftSending}
                    >
                      <Text style={{ fontSize: 24 }}>{g.emoji}</Text>
                      <Text style={[styles.giftItemName, { color: g.color }]}>{g.name}</Text>
                      <Text style={styles.giftItemCost}>{g.cost}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
                {giftErrorMessage && <Text style={styles.giftError}>{giftErrorMessage}</Text>}
              </View>
            </View>
          )}

          {/* Error */}
          {errorMessage && (
            <View style={{ position: 'absolute', bottom: 200, left: 16, right: 16 }}>
              <Text style={{ fontSize: 12, color: '#f87171', textAlign: 'center' }}>{errorMessage}</Text>
            </View>
          )}

          {/* Bottom Controls */}
          <View style={styles.viewBottomArea}>
            {/* Comment input + gift button */}
            <View style={{ flexDirection: 'row', gap: 8, marginBottom: 10 }}>
              <View style={styles.viewInputRow}>
                <TextInput
                  style={styles.viewInput}
                  placeholder="Say something…"
                  placeholderTextColor="rgba(255,255,255,0.4)"
                  value={inputText}
                  onChangeText={setInputText}
                  onSubmitEditing={postComment}
                />
                {inputText.trim() ? (
                  <TouchableOpacity onPress={postComment} style={{ paddingHorizontal: 8 }}>
                    <Text style={{ fontSize: 12, fontWeight: '700', color: '#60a5fa' }}>Post</Text>
                  </TouchableOpacity>
                ) : null}
              </View>
              <TouchableOpacity
                style={[styles.viewGiftBtn, showGiftDrawer && { backgroundColor: '#2563eb' }]}
                onPress={() => setShowGiftDrawer(prev => !prev)}
              >
                <Ionicons name="gift" size={20} color="#fbbf24" />
              </TouchableOpacity>
            </View>

            {/* Controls */}
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <TouchableOpacity style={styles.viewCtrlBtn} onPress={() => { setAudioMuted(!audioMuted); }}>
                <Ionicons name={audioMuted ? 'volume-mute' : 'volume-medium'} size={18} color="#fff" />
              </TouchableOpacity>
              <TouchableOpacity style={styles.viewCtrlBtn} onPress={togglePauseOverride}>
                <Ionicons name={userPaused ? 'play' : 'pause'} size={18} color="#fff" />
              </TouchableOpacity>
              <TouchableOpacity style={styles.viewCtrlBtn} onPress={() => {}}>
                <Ionicons name="scan-outline" size={18} color="#fff" />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  // ── STREAMS LIST VIEW ──
  return (
    <SafeAreaView style={[s.safe, { backgroundColor: colors.background }]}>
      <View style={[s.header, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={{ padding: 4 }}>
          <Ionicons name="arrow-back" size={22} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={[s.headerTitle, { color: colors.textPrimary }]}>Live</Text>
        <TouchableOpacity onPress={() => navigation.navigate('CreateLive')}>
          <View style={styles.goLiveBtn}>
            <View style={styles.goLiveDot} />
            <Text style={styles.goLiveText}>Go Live</Text>
          </View>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={s.loadingWrap}><ActivityIndicator size="large" color={colors.primary} /></View>
      ) : streams.length === 0 ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <View style={styles.emptyIconWrap}>
            <View style={styles.emptyIconInner}>
              <Ionicons name="videocam" size={28} color="#dc2626" />
            </View>
            <View style={styles.emptyPing} />
          </View>
          <Text style={[s.emptyTitle, { color: colors.textPrimary }]}>No live streams right now</Text>
          <Text style={[s.emptyDesc, { color: colors.textSecondary }]}>
            Be the first to go live and get eyes on your content instantly.
          </Text>
          <TouchableOpacity style={styles.goLiveBigBtn} onPress={() => navigation.navigate('CreateLive')}>
            <View style={styles.goLiveBigDot} />
            <Text style={styles.goLiveBigText}>Go Live · It's Free</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={streams}
          keyExtractor={(item) => String(item.id || item.stream_id)}
          contentContainerStyle={{ padding: 8, gap: 8 }}
          renderItem={({ item }) => (
            <TouchableOpacity style={[styles.streamCard, { backgroundColor: colors.card, borderColor: colors.border }]}
              onPress={() => setActiveStream(item)}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <View style={styles.streamAvatar}>
                  <Image source={{ uri: (item as any).profile_pic || DEFAULT_PIC }} style={styles.streamAvatarImg} />
                </View>
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Text style={[styles.streamUser, { color: colors.textPrimary }]}>@{item.username}</Text>
                    <View style={styles.liveBadge}>
                      <View style={styles.liveDot} />
                      <Text style={styles.liveLabel}>LIVE</Text>
                    </View>
                  </View>
                  {item.title && <Text style={[styles.streamTitle, { color: colors.textSecondary }]} numberOfLines={1}>{item.title}</Text>}
                  <Text style={[styles.streamViewers, { color: colors.textSecondary }]}>
                    {item.viewers || item.viewer_count || 0} watching
                  </Text>
                </View>
                <Ionicons name="play-circle" size={36} color="#dc2626" />
              </View>
            </TouchableOpacity>
          )}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  // Gift overlay
  giftOverlayAnim: { position: 'absolute', top: '30%', left: 0, right: 0, alignItems: 'center', zIndex: 50 },
  giftTitleAnim: { fontWeight: '900', textShadowColor: 'rgba(0,0,0,0.8)', textShadowOffset: { width: 0, height: 2 }, textShadowRadius: 8 },
  giftSubAnim: { color: '#fff', fontSize: 13, fontWeight: '700', marginTop: 4, textShadowColor: 'rgba(0,0,0,0.9)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 6 },
  // Chat message
  msgAvatar: { width: 20, height: 20, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center' },
  msgAvatarText: { fontSize: 9, fontWeight: '800', color: '#fff' },
  msgText: { fontSize: 11, color: 'rgba(255,255,255,0.65)', lineHeight: 16 },
  msgUsername: { fontWeight: '700', color: 'rgba(255,255,255,0.9)' },
  msgGiftText: { fontSize: 12, color: '#fde68a', fontWeight: '700' },
  // View gradients/overlays
  viewTopGradient: { position: 'absolute', top: 0, left: 0, right: 0, height: 130 },
  viewBottomGradient: { position: 'absolute', bottom: 0, left: 0, right: 0, height: '55%' },
  viewPausedOverlay: { position: 'absolute', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center' },
  viewTopBar: { position: 'absolute', top: 0, left: 0, right: 0, paddingTop: 48, paddingHorizontal: 16, paddingBottom: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  viewLiveBadge: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: '#dc2626', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
  viewLiveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#fff' },
  viewLiveText: { color: '#fff', fontSize: 11, fontWeight: '800' },
  viewViewerCount: { fontSize: 11, color: 'rgba(255,255,255,0.7)', backgroundColor: 'rgba(0,0,0,0.4)', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999, overflow: 'hidden' },
  viewIconBtn: { width: 36, height: 36, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center' },
  viewChatOverlay: { position: 'absolute', left: 12, right: 56, bottom: 190, maxHeight: 160, overflow: 'hidden' },
  viewBottomArea: { position: 'absolute', bottom: 0, left: 0, right: 0, paddingHorizontal: 12, paddingBottom: 32, gap: 8 },
  viewInputRow: { flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.1)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.18)', borderRadius: 24, paddingHorizontal: 16, gap: 8 },
  viewInput: { flex: 1, color: '#fff', fontSize: 13, paddingVertical: 10 },
  viewGiftBtn: { width: 44, height: 44, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center' },
  viewCtrlBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center' },
  // Gift drawer
  giftDrawer: { position: 'absolute', left: 12, right: 12, bottom: 180, zIndex: 20 },
  giftDrawerInner: { backgroundColor: 'rgba(30,30,35,0.95)', borderRadius: 20, padding: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  giftDrawerTitle: { fontSize: 11, fontWeight: '800', color: '#fff', textTransform: 'uppercase', letterSpacing: 1.5 },
  giftItem: { alignItems: 'center', gap: 4, padding: 8, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.08)', width: '30%' },
  giftItemName: { fontSize: 9, fontWeight: '700', textAlign: 'center' },
  giftItemCost: { fontSize: 9, fontWeight: '900', color: '#fde68a' },
  giftError: { fontSize: 11, color: '#f87171', textAlign: 'center', marginTop: 8 },
  // List styles
  goLiveBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: '#dc2626', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16 },
  goLiveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#fff' },
  goLiveText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  goLiveBigBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#dc2626', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 24, marginTop: 16, elevation: 4 },
  goLiveBigDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#fff' },
  goLiveBigText: { color: '#fff', fontSize: 13, fontWeight: '700' },
  emptyIconWrap: { position: 'relative', marginBottom: 16 },
  emptyIconInner: { width: 64, height: 64, borderRadius: 32, backgroundColor: 'rgba(220,38,38,0.1)', alignItems: 'center', justifyContent: 'center' },
  emptyPing: { position: 'absolute', inset: -4, borderRadius: 36, borderWidth: 2, borderColor: 'rgba(220,38,38,0.3)', opacity: 0.6 },
  streamCard: { borderRadius: 14, padding: 14, borderWidth: 1 },
  streamAvatar: { width: 48, height: 48, borderRadius: 24 },
  streamAvatarImg: { width: 48, height: 48, borderRadius: 24 },
  streamUser: { fontSize: 15, fontWeight: '700' },
  liveBadge: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#dc2626' },
  liveLabel: { color: '#dc2626', fontSize: 10, fontWeight: '800' },
  streamTitle: { fontSize: 12, marginTop: 1 },
  streamViewers: { fontSize: 11, marginTop: 2 },
});

function makeStyles(colors: any, isDark: boolean) {
  return StyleSheet.create({
    safe: { flex: 1 },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', height: 52, paddingHorizontal: 16, borderBottomWidth: StyleSheet.hairlineWidth },
    headerTitle: { fontSize: 18, fontWeight: '700' },
    loadingWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    emptyTitle: { fontSize: 15, fontWeight: '700', marginTop: 4 },
    emptyDesc: { fontSize: 12, textAlign: 'center', maxWidth: 240, lineHeight: 18, marginTop: 4 },
  });
}