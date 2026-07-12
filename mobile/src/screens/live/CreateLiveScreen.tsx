import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ActivityIndicator, SafeAreaView, Animated, Modal,
  KeyboardAvoidingView, Platform, ScrollView, Alert,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import { createLiveStreamAPI } from '../../api/live';

export default function CreateLiveScreen({ navigation }: { navigation: any }) {
  const { colors, isDark } = useTheme();
  const { username } = useAuth();
  const { socket, emit, on, off } = useSocket();
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const [facing, setFacing] = useState<'front' | 'back'>('front');

  const [mode, setMode] = useState<'camera' | 'screen'>('camera');
  const [title, setTitle] = useState('');
  const [liveActive, setLiveActive] = useState(false);
  const [starting, setStarting] = useState(false);
  const [ending, setEnding] = useState(false);
  const [paused, setPaused] = useState(false);
  const [muted, setMuted] = useState(false);
  const [viewerCount, setViewerCount] = useState(0);
  const [postId, setPostId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [showStartModal, setShowStartModal] = useState(false);
  const [comments, setComments] = useState<any[]>([]);
  const [commentInput, setCommentInput] = useState('');
  const [showChat, setShowChat] = useState(true);
  const [timeLeft, setTimeLeft] = useState(21600);

  const pulseRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const seenCommentsRef = useRef(new Set<string>());

  // Add received comment locally
  const addCommentLocally = useCallback((comment: any) => {
    const key = comment.id || `${comment.username}|${comment.text || ''}|${comment.giftId || ''}|${comment.created_at || ''}`;
    if (!seenCommentsRef.current.has(key)) {
      seenCommentsRef.current.add(key);
      setComments(prev => [...prev.slice(-199), comment]);
    }
  }, []);

  // Timer for live duration
  useEffect(() => {
    if (!liveActive) return;
    setTimeLeft(21600);
    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          if (timerRef.current) clearInterval(timerRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [liveActive]);

  // Pulse to keep live alive
  useEffect(() => {
    if (!liveActive || !postId) return;
    pulseRef.current = setInterval(() => {
      if (socket) socket.emit('livePulse', { postId });
    }, 8000);
    return () => {
      if (pulseRef.current) clearInterval(pulseRef.current);
    };
  }, [liveActive, postId, socket]);

  // Socket listeners for live events
  useEffect(() => {
    if (!postId) return;

    const onViewerCount = (data: any) => {
      if (data && String(data.postId) === String(postId)) {
        setViewerCount(Number(data.count || 0));
      }
    };
    const onLiveComment = (data: any) => {
      if (data && String(data.postId) === String(postId) && data.comment) {
        addCommentLocally(data.comment);
      }
    };

    on('viewerCountUpdate', onViewerCount);
    on('liveComment', onLiveComment);

    return () => {
      off('viewerCountUpdate', onViewerCount);
      off('liveComment', onLiveComment);
    };
  }, [postId, on, off, addCommentLocally]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (pulseRef.current) clearInterval(pulseRef.current);
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const handleStart = () => {
    if (!title.trim()) {
      setErrorMsg('Add a title first.');
      return;
    }
    setShowStartModal(true);
  };

  const handleConfirmStart = async () => {
    if (!username) return;
    setShowStartModal(false);

    if (mode === 'camera' && !cameraPermission?.granted) {
      const perm = await requestCameraPermission();
      if (!perm.granted) {
        setErrorMsg('Camera permission is required to go live.');
        return;
      }
    }

    setStarting(true);
    setErrorMsg('');

    if (!socket) {
      setErrorMsg('Websocket connection unavailable.');
      setStarting(false);
      return;
    }

    const cleanTitle = title.trim();

    socket.emit('startLive', {
      username,
      text: cleanTitle,
      visib: 'public',
    }, async (res: any) => {
      if (!res?.ok) {
        setErrorMsg(res?.error || 'Failed to start.');
        setStarting(false);
        return;
      }

      const streamId = String(res.postId);
      setPostId(streamId);
      setLiveActive(true);
      setStarting(false);
    });
  };

  const togglePause = () => {
    const next = !paused;
    setPaused(next);
    if (socket && postId) {
      socket.emit(next ? 'livePaused' : 'liveResumed', { postId });
    }
  };

  const toggleMute = () => {
    setMuted(!muted);
  };

  const toggleFacing = () => {
    setFacing(prev => prev === 'front' ? 'back' : 'front');
  };

  const postHostComment = () => {
    const text = commentInput.trim();
    if (!text || !postId) return;
    const comment = {
      username,
      text,
      created_at: new Date().toISOString(),
      id: Date.now() + Math.random(),
    };
    setCommentInput('');
    addCommentLocally(comment);
    if (socket) {
      socket.emit('liveComment', { postId, comment });
    }
  };

  const stopBroadcast = () => {
    if (!postId) return;
    setEnding(true);
    if (socket) {
      socket.emit('endLive', { postId, save: false }, () => {
        setLiveActive(false);
        setViewerCount(0);
        setEnding(false);
        setComments([]);
        navigation.goBack();
      });
    }
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const s = makeStyles(colors, isDark);

  return (
    <SafeAreaView style={[s.safe, { backgroundColor: '#0a0a0a' }]}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <View style={{ flex: 1, position: 'relative', backgroundColor: '#000' }}>
          {/* Camera Preview */}
          <View style={{ flex: 1, backgroundColor: '#000' }}>
            {mode === 'camera' ? (
              cameraPermission?.granted ? (
                <CameraView
                  style={{ flex: 1 }}
                  facing={facing}
                  mode="video"
                  mute={muted}
                >
                  <View style={{ flex: 1 }} />
                </CameraView>
              ) : (
                <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
                  <Ionicons name="camera-outline" size={48} color="rgba(255,255,255,0.2)" />
                  <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 13, marginTop: 8 }}>Camera preview unavailable</Text>
                  {!cameraPermission?.granted && cameraPermission?.canAskAgain && (
                    <TouchableOpacity
                      style={{ marginTop: 12, paddingHorizontal: 20, paddingVertical: 8, borderRadius: 20, backgroundColor: '#2563eb' }}
                      onPress={requestCameraPermission}
                    >
                      <Text style={{ color: '#fff', fontSize: 12, fontWeight: '700' }}>Enable Camera</Text>
                    </TouchableOpacity>
                  )}
                </View>
              )
            ) : (
              <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
                <Ionicons name="desktop-outline" size={48} color="rgba(255,255,255,0.2)" />
                {!liveActive && (
                  <Text style={{ color: 'rgba(255,255,255,0.3)', fontSize: 13, marginTop: 8 }}>Screen share mode selected</Text>
                )}
              </View>
            )}
          </View>

          {/* Gradient Overlays */}
          <View style={s.topGradient} pointerEvents="none" />
          <View style={s.bottomGradient} pointerEvents="none" />

          {/* Paused Overlay */}
          {paused && liveActive && (
            <View style={s.pausedOverlay}>
              <Text style={s.pausedText}>STREAM PAUSED</Text>
            </View>
          )}

          {/* Top Bar */}
          <View style={s.topBar}>
            {liveActive ? (
              <>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <View style={s.liveBadge}>
                    <Animated.View style={s.liveDot} />
                    <Text style={s.liveBadgeText}>LIVE</Text>
                  </View>
                  <Text style={s.viewerCount}>{viewerCount} watching</Text>
                  <Text style={s.timer}>{formatTime(timeLeft)}</Text>
                </View>
                <View style={{ flexDirection: 'row', gap: 6 }}>
                  <TouchableOpacity style={s.iconBtnSm} onPress={() => setShowChat(c => !c)}>
                    <Ionicons name="chatbubbles-outline" size={16} color="#fff" />
                  </TouchableOpacity>
                  <TouchableOpacity style={s.iconBtnSm}>
                    <Ionicons name="share-outline" size={16} color="#fff" />
                  </TouchableOpacity>
                  <TouchableOpacity style={s.iconBtnSm}>
                    <Ionicons name="copy-outline" size={16} color="#fff" />
                  </TouchableOpacity>
                </View>
              </>
            ) : (
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                <Text style={s.usernameTop}>{username ? `@${username}` : '@Guest'}</Text>
                <TouchableOpacity style={s.closeBtn} onPress={() => navigation.goBack()}>
                  <Ionicons name="close" size={20} color="#fff" />
                </TouchableOpacity>
              </View>
            )}
          </View>

          {/* Chat overlay during live */}
          {liveActive && showChat && comments.length > 0 && (
            <View style={s.chatOverlay}>
              {comments.slice(-8).map((c: any, i: number) => (
                <View key={c.id || i} style={s.chatBubble}>
                  <Text style={s.chatUser}>@{c.username}:</Text>
                  <Text style={s.chatText}>{c.text}</Text>
                </View>
              ))}
            </View>
          )}

          {/* Bottom Controls */}
          <View style={s.bottomArea}>
            {liveActive ? (
              <>
                <View style={s.commentRow}>
                  <TextInput
                    style={s.commentInput}
                    placeholder="Say something..."
                    placeholderTextColor="rgba(255,255,255,0.5)"
                    value={commentInput}
                    onChangeText={setCommentInput}
                    onSubmitEditing={postHostComment}
                  />
                  <TouchableOpacity style={s.sendBtn} onPress={postHostComment}>
                    <Text style={s.sendBtnText}>Send</Text>
                  </TouchableOpacity>
                </View>
                <View style={s.controlsRow}>
                  <TouchableOpacity style={[s.controlBtn, paused && { backgroundColor: '#2563eb' }]} onPress={togglePause}>
                    <Ionicons name={paused ? 'play' : 'pause'} size={20} color="#fff" />
                  </TouchableOpacity>
                  <TouchableOpacity style={[s.controlBtn, muted && { backgroundColor: '#2563eb' }]} onPress={toggleMute}>
                    <Ionicons name={muted ? 'volume-mute' : 'volume-medium'} size={20} color="#fff" />
                  </TouchableOpacity>
                  {mode === 'camera' && (
                    <TouchableOpacity style={s.controlBtn} onPress={toggleFacing}>
                      <Ionicons name="camera-reverse-outline" size={20} color="#fff" />
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity style={s.controlBtn}>
                    <Ionicons name="share-outline" size={20} color="#fff" />
                  </TouchableOpacity>
                  <View style={{ flex: 1 }} />
                  <TouchableOpacity style={s.endBtn} onPress={stopBroadcast} disabled={ending}>
                    <Text style={s.endBtnText}>{ending ? 'Ending...' : 'End Live'}</Text>
                  </TouchableOpacity>
                </View>
              </>
            ) : (
              <View style={{ gap: 12, paddingBottom: 8 }}>
                <TextInput
                  style={s.titleInput}
                  placeholder="Title of your live stream..."
                  placeholderTextColor="rgba(255,255,255,0.3)"
                  value={title}
                  onChangeText={setTitle}
                  maxLength={120}
                />
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  {(['camera', 'screen'] as const).map(m => (
                    <TouchableOpacity
                      key={m}
                      style={[s.modeBtn, mode === m && { backgroundColor: '#2563eb' }]}
                      onPress={() => setMode(m)}
                    >
                      <Text style={[s.modeBtnText, mode === m && { color: '#fff' }]}>
                        {m === 'camera' ? 'Camera' : 'Screen'}
                      </Text>
                    </TouchableOpacity>
                  ))}
                  {mode === 'camera' && (
                    <TouchableOpacity style={s.flipBtn} onPress={toggleFacing}>
                      <Ionicons name="camera-reverse-outline" size={20} color="#fff" />
                    </TouchableOpacity>
                  )}
                </View>
                <TouchableOpacity style={s.goLiveBtn} onPress={handleStart} disabled={starting}>
                  <View style={s.goLiveDot} />
                  <Text style={s.goLiveBtnText}>{starting ? 'Starting...' : 'Go Live'}</Text>
                </TouchableOpacity>
                {errorMsg && <Text style={s.errorText}>{errorMsg}</Text>}
              </View>
            )}
          </View>
        </View>
      </KeyboardAvoidingView>

      {/* Start Confirmation Modal */}
      <Modal visible={showStartModal} transparent animationType="fade" onRequestClose={() => setShowStartModal(false)}>
        <View style={s.confirmOverlay}>
          <View style={s.confirmBox}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <View style={s.confirmIconWrap}>
                <Ionicons name="information-circle-outline" size={22} color="#ef4444" />
              </View>
              <View>
                <Text style={s.confirmTitle}>Stream Guidance</Text>
                <Text style={s.confirmSubtitle}>Please read before going live</Text>
              </View>
            </View>

            <View style={{ gap: 12, marginVertical: 12 }}>
              <View style={{ flexDirection: 'row', gap: 10, alignItems: 'flex-start' }}>
                <Ionicons name="timer-outline" size={18} color="#ef4444" style={{ marginTop: 2 }} />
                <View style={{ flex: 1 }}>
                  <Text style={s.infoTitle}>Max Duration: 6 Hours</Text>
                  <Text style={s.infoDesc}>Your broadcast will automatically end after 6 hours of active streaming.</Text>
                </View>
              </View>
              <View style={{ flexDirection: 'row', gap: 10, alignItems: 'flex-start' }}>
                <Ionicons name="videocam-off-outline" size={18} color="#ef4444" style={{ marginTop: 2 }} />
                <View style={{ flex: 1 }}>
                  <Text style={s.infoTitle}>No Saved Video Recording</Text>
                  <Text style={s.infoDesc}>The live stream is purely ephemeral. The video will NOT be saved to your profile or feed after recording.</Text>
                </View>
              </View>
              <View style={{ flexDirection: 'row', gap: 10, alignItems: 'flex-start' }}>
                <Ionicons name="shield-checkmark-outline" size={18} color="#ef4444" style={{ marginTop: 2 }} />
                <View style={{ flex: 1 }}>
                  <Text style={s.infoTitle}>Permissions Required</Text>
                  <Text style={s.infoDesc}>Starting the stream requests camera and microphone access dynamically.</Text>
                </View>
              </View>
            </View>

            <View style={{ flexDirection: 'row', gap: 10, marginTop: 4 }}>
              <TouchableOpacity style={s.confirmCancel} onPress={() => setShowStartModal(false)}>
                <Text style={s.confirmCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={s.confirmStart} onPress={handleConfirmStart}>
                <Text style={s.confirmStartText}>Start Live</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const makeStyles = (colors: any, isDark: boolean) => StyleSheet.create({
  safe: { flex: 1 },
  topGradient: {
    position: 'absolute', top: 0, left: 0, right: 0, height: 130,
    backgroundColor: 'transparent',
  },
  bottomGradient: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    height: '60%',
    backgroundColor: 'transparent',
  },
  pausedOverlay: {
    position: 'absolute', inset: 0, backgroundColor: 'rgba(0,0,0,0.75)',
    alignItems: 'center', justifyContent: 'center',
  },
  pausedText: { color: '#fff', fontSize: 18, fontWeight: '900' },
  topBar: {
    position: 'absolute', top: 0, left: 0, right: 0,
    paddingTop: 48, paddingHorizontal: 16, paddingBottom: 8,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
  },
  liveBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: '#dc2626', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 999,
  },
  liveDot: {
    width: 6, height: 6, borderRadius: 3, backgroundColor: '#fff',
  },
  liveBadgeText: { color: '#fff', fontSize: 10, fontWeight: '800' },
  viewerCount: { color: 'rgba(255,255,255,0.7)', fontSize: 10, backgroundColor: 'rgba(0,0,0,0.4)', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999, overflow: 'hidden' },
  timer: { color: 'rgba(255,255,255,0.9)', fontSize: 10, backgroundColor: 'rgba(220,38,38,0.4)', borderWidth: 1, borderColor: 'rgba(239,68,68,0.2)', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999, overflow: 'hidden', fontFamily: 'monospace' },
  iconBtnSm: { width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(0,0,0,0.4)', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  usernameTop: { color: '#fff', fontSize: 12, fontWeight: '800' },
  closeBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  chatOverlay: {
    position: 'absolute', left: 16, right: 60, bottom: 200,
    maxHeight: 160, overflow: 'hidden', justifyContent: 'flex-end',
  },
  chatBubble: {
    flexDirection: 'row',
    backgroundColor: 'rgba(0,0,0,0.35)', paddingHorizontal: 10, paddingVertical: 4,
    borderRadius: 12, marginBottom: 4, alignSelf: 'flex-start', maxWidth: '100%',
  },
  chatUser: { fontSize: 11, fontWeight: '700', color: 'rgba(255,255,255,0.9)' },
  chatText: { fontSize: 11, color: 'rgba(255,255,255,0.7)', flex: 1 },
  bottomArea: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 16, paddingBottom: 32, gap: 12 },
  commentRow: { flexDirection: 'row', gap: 8 },
  commentInput: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)',
    borderRadius: 24, paddingHorizontal: 16, paddingVertical: 10, fontSize: 13, color: '#fff',
  },
  sendBtn: { paddingHorizontal: 16, backgroundColor: '#2563eb', borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  sendBtnText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  controlsRow: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  controlBtn: { width: 44, height: 44, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center' },
  endBtn: { paddingHorizontal: 20, height: 44, borderRadius: 12, backgroundColor: '#dc2626', alignItems: 'center', justifyContent: 'center' },
  endBtnText: { color: '#fff', fontSize: 12, fontWeight: '800' },
  titleInput: {
    width: '100%', backgroundColor: 'rgba(0,0,0,0.4)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)',
    borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12, fontSize: 14, color: '#fff',
  },
  modeBtn: { flex: 1, paddingVertical: 12, borderRadius: 12, alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.15)' },
  modeBtnText: { fontSize: 12, fontWeight: '700', color: '#fff' },
  flipBtn: { width: 48, paddingVertical: 12, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.15)' },
  goLiveBtn: {
    width: '100%', paddingVertical: 14, borderRadius: 12, backgroundColor: '#dc2626',
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
  },
  goLiveDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#fff' },
  goLiveBtnText: { color: '#fff', fontSize: 14, fontWeight: '800' },
  errorText: { color: '#f87171', fontSize: 12, textAlign: 'center' },
  confirmOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'center', alignItems: 'center', padding: 24 },
  confirmBox: {
    backgroundColor: '#121214', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
    borderRadius: 24, padding: 28, maxWidth: 420, width: '100%', gap: 16,
  },
  confirmIconWrap: {
    width: 44, height: 44, borderRadius: 12, backgroundColor: 'rgba(239,68,68,0.1)',
    alignItems: 'center', justifyContent: 'center',
  },
  confirmTitle: { fontSize: 16, fontWeight: '800', color: '#fff' },
  confirmSubtitle: { fontSize: 11, color: 'rgba(255,255,255,0.4)', marginTop: 1 },
  infoTitle: { fontSize: 12, fontWeight: '700', color: '#fff', marginBottom: 2 },
  infoDesc: { fontSize: 11, color: 'rgba(255,255,255,0.5)', lineHeight: 15 },
  confirmCancel: { flex: 1, paddingVertical: 12, borderRadius: 12, alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.06)' },
  confirmCancelText: { fontSize: 12, fontWeight: '700', color: 'rgba(255,255,255,0.7)' },
  confirmStart: { flex: 1, paddingVertical: 12, borderRadius: 12, alignItems: 'center', backgroundColor: '#ef4444' },
  confirmStartText: { fontSize: 12, fontWeight: '800', color: '#fff' },
});