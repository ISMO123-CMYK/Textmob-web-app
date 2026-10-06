import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, FlatList, TextInput, StyleSheet, Modal, ActivityIndicator, Image, ScrollView, Share, KeyboardAvoidingView, Keyboard, Platform } from 'react-native';
import { Ripple } from '../../components/Ripple';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/build/Ionicons';
import { apiGet, apiPost, API_BASE_URL } from '../../api/client';
import { playClick } from '../../utils/sound';
import { useAuth } from '../../context/AuthContext';
import * as ImagePicker from 'expo-image-picker';
import io from 'socket.io-client';
import {
  DEFAULT_PIC, GIPHY_API_BASE, GIPHY_API_KEY, PAGE, REACTION_EMOJIS,
  buildFeed, formatDuration, renderMarkdownText, timeAgo, type FeedItem, type Msg, type Room,
} from './discussionsShared';

type Props = { roomId: string; onBack: () => void; onProfile: (u: string) => void };

export default function DiscussionRoomScreen({ roomId, onBack, onProfile }: Props) {
  const { username: currentUser } = useAuth();
  const [room, setRoom] = useState<Room | null>(null);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [members, setMembers] = useState<string[]>([]);
  const [input, setInput] = useState('');
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [unlocked, setUnlocked] = useState(false);
  const [unlocking, setUnlocking] = useState(false);
  const [showReactPicker, setShowReactPicker] = useState<string | null>(null);
  const [showMenu, setShowMenu] = useState(false);
  const [showMembers, setShowMembers] = useState(false);
  const [sheetTab, setSheetTab] = useState<'about' | 'members'>('members');
  const [showGiphy, setShowGiphy] = useState(false);
  const [giphyQuery, setGiphyQuery] = useState('');
  const [giphyResults, setGiphyResults] = useState<any[]>([]);
  const [showHostPanel, setShowHostPanel] = useState(false);
  const [showActionsFor, setShowActionsFor] = useState<string | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [profilePics, setProfilePics] = useState<Record<string, string>>({});
  const [userVerified, setUserVerified] = useState<Record<string, boolean>>({});
  const [mentionQuery, setMentionQuery] = useState<string | null>(null);
  const [mentionResults, setMentionResults] = useState<any[]>([]);
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
  const [replyTo, setReplyTo] = useState<Msg | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [keyboardOpen, setKeyboardOpen] = useState(false);
  const insets = useSafeAreaInsets();
  const flatListRef = useRef<FlatList<FeedItem>>(null);
  const inputRef = useRef<TextInput>(null);
  const typingTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const giphyTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mentionTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const socketRef = useRef<ReturnType<typeof io> | null>(null);
  const pendingRef = useRef<Map<string, string>>(new Map());

  const isHost = !!room && room.host_username === currentUser;
  const isMuted = !!room && (room.muted_users || []).includes(currentUser || '');
  const isLive = !!room && room.status === 'live';
  const isArchived = !!room && room.status === 'ended';
  const canView = isLive || unlocked || isHost;

  /* Room + messages land together — no serial waterfall on open. */
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const [roomRes, msgsRes] = await Promise.all([
          apiGet<Room>(`/api/discussions/room/${roomId}`),
          apiGet<Msg[]>(`/api/discussions/room/${roomId}/messages?limit=${PAGE}`),
        ]);
        if (!alive) return;
        const roomData = roomRes.data as Room | null;
        if (roomData && roomData.id) {
          setRoom(roomData);
          if (Array.isArray(roomData.members)) setMembers(roomData.members);
          const msgs = Array.isArray(msgsRes.data) ? (msgsRes.data as Msg[]) : [];
          setMessages(msgs);
          setHasMore(msgs.length >= PAGE);
          if (roomData.status === 'ended' && roomData.host_username !== currentUser) {
            try {
              const dRes = await apiGet(`/api/discussions/room/${roomId}/check-unlock?username=${currentUser}`);
              if (alive) setUnlocked(!!(dRes.data as { unlocked?: boolean })?.unlocked);
            } catch { if (alive) setUnlocked(false); }
          } else if (alive) {
            setUnlocked(true);
          }
        }
      } catch { /* fall through to the not-found state */ }
      if (alive) setLoading(false);
    })();
    return () => { alive = false; };
  }, [roomId, currentUser]);

  useEffect(() => {
    const onShow = () => {
      setKeyboardOpen(true);
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
    };
    const onHide = () => setKeyboardOpen(false);
    const showSub = Keyboard.addListener(Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow', onShow);
    const hideSub = Keyboard.addListener(Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide', onHide);
    return () => { showSub.remove(); hideSub.remove(); };
  }, []);

  const loadMoreMessages = async () => {
    if (loadingMore || !hasMore || messages.length === 0) return;
    setLoadingMore(true);
    try {
      const oldest = messages[0];
      const res = await apiGet(`/api/discussions/room/${roomId}/messages?limit=${PAGE}&before=${encodeURIComponent(oldest.created_at)}&before_id=${oldest.id}`);
      const data = res.data as Msg[];
      if (Array.isArray(data) && data.length > 0) {
        setMessages(prev => {
          const ids = new Set(prev.map(m => m.id));
          return [...data.filter(m => !ids.has(m.id)), ...prev];
        });
        setHasMore(data.length >= PAGE);
      } else {
        setHasMore(false);
      }
    } catch { /* older page failed — user can tap again */ }
    setLoadingMore(false);
  };

  /* Socket — only while this screen is on screen. */
  useEffect(() => {
    if (!roomId || !currentUser || !canView) return;
    const socket = io(API_BASE_URL, { transports: ['websocket', 'polling'] });
    socketRef.current = socket;
    socket.emit('join_discussion', { roomId, username: currentUser });
    socket.emit('join_user', { username: currentUser });

    const settlePending = (msg: Msg) => {
      for (const [localId, content] of pendingRef.current) {
        if (content === msg.content) { pendingRef.current.delete(localId); return localId; }
      }
      return null;
    };
    const onMessage = (msg: Msg) => {
      const localId = settlePending(msg);
      setMessages(prev => {
        const cleaned = localId ? prev.filter(m => m.id !== localId) : prev;
        return cleaned.some(m => m.id === msg.id) ? cleaned : [...cleaned, msg];
      });
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 80);
    };
    const onTyping = ({ username }: { username: string }) => {
      if (username === currentUser) return;
      setTypingUsers(prev => (!prev.includes(username) ? [...prev, username] : prev));
    };
    const onStopTyping = ({ username }: { username: string }) => {
      if (username === currentUser) return;
      setTypingUsers(prev => prev.filter(u => u !== username));
    };
    const onReaction = ({ message_id, reactions, reaction_count }: { message_id: string; reactions: Record<string, string[]>; reaction_count: number }) =>
      setMessages(prev => prev.map(m => (m.id === message_id ? { ...m, reactions, reaction_count } : m)));
    const onPin = ({ pinned_message_id }: { pinned_message_id: string | null }) =>
      setRoom(prev => (prev ? { ...prev, pinned_message_id } : prev));
    const onModeChange = ({ room_mode }: { room_mode: string }) =>
      setRoom(prev => (prev ? { ...prev, room_mode } : prev));
    const onRemoved = ({ username: u }: { username: string }) => { if (u === currentUser) onBack(); };
    const onEnded = ({ duration }: { duration?: number }) =>
      setRoom(prev => (prev ? { ...prev, status: 'ended', ended_at: new Date().toISOString(), duration_seconds: duration || 0, participant_count: 0 } : prev));
    const onDeleteMsg = ({ message_id }: { message_id: string }) =>
      setMessages(prev => prev.filter(m => m.id !== message_id));
    const onRoomUpdate = (data: any) => {
      setRoom(prev => (prev ? {
        ...prev,
        participant_count: data.participant_count ?? prev.participant_count,
        room_mode: data.room_mode ?? prev.room_mode,
        pinned_message_id: data.pinned_message_id ?? prev.pinned_message_id,
      } : prev));
      if (Array.isArray(data.members)) setMembers(data.members);
    };

    socket.on('discussion_message', onMessage);
    socket.on('discussion_typing', onTyping);
    socket.on('discussion_stop_typing', onStopTyping);
    socket.on('discussion_reaction', onReaction);
    socket.on('discussion_pin', onPin);
    socket.on('discussion_mode_change', onModeChange);
    socket.on('discussion_user_removed', onRemoved);
    socket.on('discussion_room_ended', onEnded);
    socket.on('discussion_delete_message', onDeleteMsg);
    socket.on('discussion_room_update', onRoomUpdate);

    apiPost(`/api/discussions/room/${roomId}/join`, { username: currentUser }).catch(() => {});
    return () => {
      socket.emit('leave_discussion', { roomId });
      apiPost(`/api/discussions/room/${roomId}/leave`, { username: currentUser }).catch(() => {});
      socket.disconnect();
      socketRef.current = null;
    };
  }, [roomId, currentUser, canView, onBack]);

  useEffect(() => {
    if (typingUsers.length === 0) return;
    const t = setTimeout(() => setTypingUsers([]), 3000);
    return () => clearTimeout(t);
  }, [typingUsers]);

  /* Profile pics + verified badges for everyone who has spoken. Users with no
     pic are cached as '' so we never re-request them on every new message. */
  useEffect(() => {
    const users = [...new Set(messages.filter(m => m.message_type !== 'system').map(m => m.username))];
    users.forEach(u => {
      if (!u || profilePics[u] !== undefined) return;
      apiGet(`/profile-pic/${u}`).then(r => {
        const d = r.data as { profile_pic?: string; verified?: boolean } | null;
        setProfilePics(prev => (prev[u] === undefined ? { ...prev, [u]: d?.profile_pic || '' } : prev));
        if (d?.verified !== undefined) setUserVerified(prev => ({ ...prev, [u]: !!d.verified }));
      }).catch(() => {
        setProfilePics(prev => (prev[u] === undefined ? { ...prev, [u]: '' } : prev));
      });
    });
  }, [messages, profilePics]);

  useEffect(() => {
    const t = setTimeout(() => flatListRef.current?.scrollToEnd({ animated: false }), 300);
    return () => clearTimeout(t);
  }, []);

  const feed = useMemo(() => buildFeed(messages), [messages]);

  const handleUnlock = async () => {
    if (!currentUser) return;
    setUnlocking(true);
    try {
      const res = await apiPost(`/api/discussions/room/${roomId}/unlock`, { username: currentUser });
      if ((res.data as { unlocked?: boolean })?.unlocked) setUnlocked(true);
    } catch { /* unlock failed — user can retry */ }
    setUnlocking(false);
  };

  const sendMessage = async (content?: string, mediaUrl?: string) => {
    const text = (content ?? input).trim();
    if ((!text && !mediaUrl) || !currentUser || !isLive) return;
    const currentReplyTo = replyTo;
    const localId = `local_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const outgoing = mediaUrl || text;
    const optimistic: Msg = {
      id: localId,
      room_id: roomId,
      username: currentUser,
      content: outgoing,
      message_type: mediaUrl ? 'image' : 'text',
      profile_pic: '',
      reply_to_id: currentReplyTo ? currentReplyTo.id : null,
      reactions: {},
      reaction_count: 0,
      created_at: new Date().toISOString(),
    };
    pendingRef.current.set(localId, outgoing);
    setInput(''); setImagePreview(null); setShowGiphy(false); setGiphyQuery(''); setGiphyResults([]);
    setReplyTo(null); setMentionQuery(null); setMentionResults([]);
    setMessages(prev => [...prev, optimistic]);
    setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 60);
    socketRef.current?.emit('discussion_stop_typing', { roomId, username: currentUser });
    try {
      const body: any = { username: currentUser };
      if (mediaUrl) { body.content = mediaUrl; body.message_type = 'image'; } else { body.content = text; }
      if (currentReplyTo) body.reply_to_id = currentReplyTo.id;
      const res = await apiPost(`/api/discussions/room/${roomId}/send`, body);
      const msg = res.data as Msg;
      pendingRef.current.delete(localId);
      if (msg && (msg as any).id) {
        setMessages(prev => prev.map(m => (m.id === localId ? msg : m)));
        socketRef.current?.emit('discussion_message', { roomId, ...msg });
      } else {
        setMessages(prev => prev.filter(m => m.id !== localId));
      }
    } catch {
      pendingRef.current.delete(localId);
      setMessages(prev => prev.filter(m => m.id !== localId));
    }
  };

  const pickImage = async () => {
    if (!isLive) return;
    try {
      const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.8 });
      if (!result.canceled && result.assets?.[0]) {
        const asset = result.assets[0];
        setUploadingImage(true);
        const fd = new FormData();
        fd.append('media', { uri: asset.uri, type: (asset as any).mimeType || 'image/jpeg', name: (asset as any).fileName || `discussion_${Date.now()}.jpg` } as any);
        fd.append('username', currentUser || '');
        fd.append('roomId', roomId);
        const res = await fetch(`${API_BASE_URL}/api/discussions/upload`, { method: 'POST', body: fd });
        const data = await res.json();
        if (data?.url) setImagePreview(data.url);
        setUploadingImage(false);
      }
    } catch { setUploadingImage(false); }
  };

  const handleTyping = (val: string) => {
    setInput(val);
    if (!currentUser || !isLive) return;
    socketRef.current?.emit('discussion_typing', { roomId, username: currentUser });
    if (typingTimeout.current) clearTimeout(typingTimeout.current);
    typingTimeout.current = setTimeout(() => socketRef.current?.emit('discussion_stop_typing', { roomId, username: currentUser }), 2000);
    const atMatch = val.match(/@(\w*)$/);
    if (atMatch) {
      const q = atMatch[1];
      setMentionQuery(q);
      if (mentionTimeout.current) clearTimeout(mentionTimeout.current);
      mentionTimeout.current = setTimeout(async () => {
        try {
          const r = await apiGet(`/searchSuggest?query=${encodeURIComponent(q)}&currentUsername=${currentUser}`);
          setMentionResults(Array.isArray(r.data) ? (r.data as any[]).slice(0, 6) : []);
        } catch { setMentionResults([]); }
      }, 200);
    } else {
      setMentionQuery(null);
      setMentionResults([]);
    }
  };

  const insertMention = (username: string) => {
    setInput(input.replace(/@\w*$/, `@${username} `));
    setMentionQuery(null);
    setMentionResults([]);
    inputRef.current?.focus();
  };

  const handleReact = async (messageId: string, emoji: string) => {
    setShowReactPicker(null);
    try {
      const res = await apiPost(`/api/discussions/room/${roomId}/react`, { message_id: messageId, username: currentUser, emoji });
      if (res.data) socketRef.current?.emit('discussion_reaction', { roomId, message_id: messageId, ...(res.data as any) });
    } catch { /* reaction is best-effort */ }
  };

  const handlePin = async (messageId: string) => {
    if (!isHost) return;
    try {
      const res = await apiPost(`/api/discussions/room/${roomId}/pin`, { host_username: currentUser, message_id: messageId });
      if (res.data) socketRef.current?.emit('discussion_pin', { roomId, ...(res.data as any) });
    } catch { /* pin is best-effort */ }
  };

  const handleDeleteMessage = async (messageId: string) => {
    if (!isHost) return;
    try {
      await apiPost(`/api/discussions/room/${roomId}/delete-message`, { host_username: currentUser, message_id: messageId });
      socketRef.current?.emit('discussion_delete_message', { roomId, message_id: messageId });
      setMessages(prev => prev.filter(m => m.id !== messageId));
    } catch { /* delete is best-effort */ }
  };

  const handleEndRoom = async () => {
    if (!isHost) return;
    try {
      const res = await apiPost(`/api/discussions/room/${roomId}/end`, { username: currentUser });
      setRoom(prev => (prev ? { ...prev, status: 'ended', ended_at: new Date().toISOString(), duration_seconds: (res.data as any)?.duration || 0, participant_count: 0 } : prev));
    } catch { /* end failed — room stays live */ }
  };

  const handleDeleteRoom = async () => {
    if (!isHost) return;
    try { await apiPost(`/api/discussions/room/${roomId}/delete`, { username: currentUser }); onBack(); } catch { /* delete failed */ }
  };

  const handleShareLink = async () => {
    setShowMenu(false);
    try { await Share.share({ message: `https://textmob.web.app/discussions/${roomId}` }); } catch { /* share dismissed */ }
  };

  const searchGiphy = (q: string) => {
    setGiphyQuery(q);
    if (giphyTimeout.current) clearTimeout(giphyTimeout.current);
    if (!q.trim()) { setGiphyResults([]); return; }
    giphyTimeout.current = setTimeout(() => {
      fetch(`${GIPHY_API_BASE}/search?api_key=${GIPHY_API_KEY}&q=${encodeURIComponent(q)}&limit=12&rating=g`)
        .then(r => r.json()).then(d => setGiphyResults(d.data || [])).catch(() => setGiphyResults([]));
    }, 300);
  };

  const sendGif = (url: string) => { sendMessage(url); setShowGiphy(false); setGiphyQuery(''); setGiphyResults([]); };

  const scrollToMessage = (id: string) => {
    const idx = feed.findIndex(f => f.key === id);
    if (idx >= 0) {
      try { flatListRef.current?.scrollToIndex({ index: idx, viewPosition: 0.35, animated: true }); } catch { /* index not laid out yet */ }
    }
  };

  const toggleActions = useCallback((id: string) => setShowActionsFor(prev => (prev === id ? null : id)), []);
  const openProfile = useCallback((u: string) => onProfile(u), [onProfile]);
  const openLightbox = useCallback((url: string) => setLightboxUrl(url), []);
  const startReply = useCallback((msg: Msg) => { setReplyTo(msg); setShowActionsFor(null); }, []);
  const openPicker = useCallback((id: string) => { setShowActionsFor(null); setShowReactPicker(id); }, []);
  const pinMessage = useCallback((id: string) => { handlePin(id); setShowActionsFor(null); }, []);
  const deleteMessage = useCallback((id: string) => { handleDeleteMessage(id); setShowActionsFor(null); }, []);

  const pinnedMsg = room?.pinned_message_id ? messages.find(m => m.id === room.pinned_message_id) : null;
  const speakers = useMemo(() => [...new Set(messages.filter(m => m.message_type !== 'system').map(m => m.username))], [messages]);
  const showWelcome = !hasMore && messages.length > 0;

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        <View style={styles.centerFill}><ActivityIndicator color="#2563eb" /></View>
      </SafeAreaView>
    );
  }
  if (!room) {
    return (
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        <View style={styles.header}>
          <Ripple onPress={onBack} style={styles.backBtn}><Ionicons name="arrow-back" size={20} color="#6b7280" /></Ripple>
          <Text style={styles.headerTitle}>Discussions</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.centerFill}>
          <View style={styles.emptyHash}><Text style={styles.emptyHashText}>#</Text></View>
          <Text style={styles.emptyText}>Discussion not found</Text>
          <Ripple onPress={onBack}><Text style={styles.linkText}>Browse discussions</Text></Ripple>
        </View>
      </SafeAreaView>
    );
  }

  if (isArchived && !canView) {
    return (
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        <View style={styles.header}>
          <Ripple onPress={onBack} style={styles.backBtn}><Ionicons name="arrow-back" size={20} color="#6b7280" /></Ripple>
          <Text style={styles.headerTitle} numberOfLines={1}>Discussions</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.centerFill}>
          <View style={styles.paywallCard}>
            <View style={styles.paywallIcon}><Ionicons name="lock-closed-outline" size={28} color="#9ca3af" /></View>
            <Text style={styles.paywallTitle}>{room.title}</Text>
            <Text style={styles.paywallHost}>by @{room.host_username}</Text>
            <View style={styles.paywallBanner}>
              <Text style={styles.paywallBannerTitle}>Unlock this archive</Text>
              <Text style={styles.paywallBannerSub}>500 mobcoins · Host gets 50 (10%)</Text>
            </View>
            <Ripple onPress={handleUnlock} disabled={unlocking} style={[styles.paywallBtn, unlocking && { opacity: 0.5 }]}>
              <Text style={styles.paywallBtnText}>{unlocking ? 'Unlocking...' : 'Unlock for 500 mobcoins'}</Text>
            </Ripple>
            <Ripple onPress={onBack}><Text style={styles.paywallBack}>Back to discussions</Text></Ripple>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  const chatBarBottomPad = keyboardOpen ? 12 : Math.max(insets.bottom, 12);

  const renderFeedItem = ({ item }: { item: FeedItem }) => {
    if (item.kind === 'date') {
      return (
        <View style={styles.dateDivider}>
          <View style={styles.dateLine} />
          <Text style={styles.dateText}>{item.label}</Text>
          <View style={styles.dateLine} />
        </View>
      );
    }
    return (
      <MessageRow
        item={item}
        hostUsername={room.host_username}
        currentUser={currentUser}
        isHost={isHost}
        isLive={isLive}
        pic={profilePics[item.msg.username] || item.msg.profile_pic || DEFAULT_PIC}
        verified={!!userVerified[item.msg.username]}
        actionsOpen={showActionsFor === item.msg.id}
        onToggleActions={toggleActions}
        onProfile={openProfile}
        onScrollTo={scrollToMessage}
        onOpenPicker={openPicker}
        onReply={startReply}
        onPin={pinMessage}
        onDelete={deleteMessage}
        onReact={handleReact}
        onOpenLightbox={openLightbox}
      />
    );
  };

  const roomNames = Array.from(new Set<string>([room.host_username, ...(members.length ? members : speakers), ...speakers]));

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Ripple onPress={onBack} style={styles.backBtn}><Ionicons name="arrow-back" size={20} color="#6b7280" /></Ripple>
        <View style={styles.headerHash}><Text style={styles.headerHashText}>#</Text></View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={styles.headerTitle} numberOfLines={1}>{room.title}</Text>
          <Text style={styles.headerSub} numberOfLines={1}>
            {isLive
              ? `${room.participant_count || 0} here · @${room.host_username}`
              : `Ended${room.duration_seconds ? ` · ${formatDuration(room.duration_seconds)}` : ''} · @${room.host_username}`}
          </Text>
        </View>
        <Ripple onPress={() => { playClick(); setSheetTab('members'); setShowMembers(true); }} style={styles.headerIconBtn}>
          <Ionicons name="people-outline" size={20} color={sheetTab === 'members' && showMembers ? '#2563eb' : '#6b7280'} />
        </Ripple>
        <Ripple onPress={() => setShowMenu(true)} style={styles.headerIconBtn}>
          <Ionicons name="ellipsis-vertical" size={18} color="#6b7280" />
        </Ripple>
      </View>

      {/* Room menu */}
      <Modal visible={showMenu} transparent animationType="fade">
        <Ripple style={styles.menuOverlay} activeOpacity={1} onPress={() => setShowMenu(false)}>
          <View style={styles.menuPanel} onStartShouldSetResponder={() => true}>
            <Ripple onPress={handleShareLink} style={styles.menuItem}>
              <Ionicons name="link-outline" size={16} color="#374151" /><Text style={styles.menuItemText}>Copy link</Text>
            </Ripple>
            {isLive && isHost && (
              <>
                <Ripple onPress={() => { playClick(); setShowMenu(false); setShowHostPanel(true); }} style={styles.menuItem}>
                  <Ionicons name="settings-outline" size={16} color="#374151" /><Text style={styles.menuItemText}>Settings</Text>
                </Ripple>
                <Ripple onPress={() => { playClick(); setShowMenu(false); handleEndRoom(); }} style={styles.menuItem}>
                  <Ionicons name="stop-circle-outline" size={16} color="#ef4444" /><Text style={[styles.menuItemText, { color: '#ef4444' }]}>End Room</Text>
                </Ripple>
              </>
            )}
            {!isLive && isHost && (
              <Ripple onPress={() => { playClick(); setShowMenu(false); handleDeleteRoom(); }} style={styles.menuItem}>
                <Ionicons name="trash-outline" size={16} color="#ef4444" /><Text style={[styles.menuItemText, { color: '#ef4444' }]}>Delete</Text>
              </Ripple>
            )}
            <Ripple onPress={() => { playClick(); setShowMenu(false); onBack(); }} style={styles.menuItem}>
              <Ionicons name="exit-outline" size={16} color="#374151" /><Text style={styles.menuItemText}>Leave</Text>
            </Ripple>
          </View>
        </Ripple>
      </Modal>

      {/* About + members sheet */}
      <Modal visible={showMembers} transparent animationType="slide">
        <Ripple style={styles.sheetOverlay} activeOpacity={1} onPress={() => setShowMembers(false)}>
          <View style={styles.sheet} onStartShouldSetResponder={() => true}>
            <View style={styles.sheetHandle} />
            <View style={styles.sheetHeadRow}>
              <View style={styles.sheetTabs}>
                {(['about', 'members'] as const).map(t => (
                  <Ripple key={t} onPress={() => { playClick(); setSheetTab(t); }}
                    style={[styles.sheetTab, sheetTab === t && styles.sheetTabActive]}>
                    <Text style={[styles.sheetTabText, sheetTab === t && styles.sheetTabTextActive]}>
                      {t === 'about' ? 'About' : 'Members'}
                    </Text>
                  </Ripple>
                ))}
              </View>
              <Ripple onPress={() => setShowMembers(false)} hitSlop={8}><Ionicons name="close" size={18} color="#9ca3af" /></Ripple>
            </View>
            <ScrollView style={{ maxHeight: 460 }} contentContainerStyle={{ paddingBottom: 16 }}>
              {sheetTab === 'about' ? (
                <View>
                  <Text style={styles.aboutTitle}>#{room.title}</Text>
                  <Text style={styles.aboutDesc}>{room.description || 'No description yet.'}</Text>
                  <View style={styles.aboutChips}>
                    <View style={styles.aboutChip}><Text style={styles.aboutChipText}>{room.category || 'general'}</Text></View>
                    <View style={styles.aboutChip}><Text style={styles.aboutChipText}>{room.room_mode || 'open'}</Text></View>
                    <View style={styles.aboutChip}><Text style={styles.aboutChipText}>{room.participant_count || 0} here</Text></View>
                  </View>
                  <Text style={styles.sheetSection}>HOST</Text>
                  <MemberRow username={room.host_username} isHost pic={profilePics[room.host_username]} verified={!!userVerified[room.host_username]} onPress={openProfile} />
                  <Text style={styles.sheetSection}>DETAILS</Text>
                  <View style={styles.aboutRow}>
                    <Ionicons name="time-outline" size={14} color="#9ca3af" />
                    <Text style={styles.aboutRowText}>
                      {isLive ? 'Live now' : `Ended${room.duration_seconds ? ` · ${formatDuration(room.duration_seconds)}` : ''}`}
                    </Text>
                  </View>
                  <View style={styles.aboutRow}>
                    <Ionicons name="person-outline" size={14} color="#9ca3af" />
                    <Text style={styles.aboutRowText}>Hosted by @{room.host_username}</Text>
                  </View>
                </View>
              ) : (
                <>
                  <Text style={styles.sheetSection}>MEMBERS — {roomNames.length}</Text>
                  {roomNames.map(u => (
                    <MemberRow key={u} username={u} isHost={u === room.host_username} pic={profilePics[u]} verified={!!userVerified[u]} onPress={openProfile} />
                  ))}
                </>
              )}
            </ScrollView>
          </View>
        </Ripple>
      </Modal>

      {!isLive && (
        <View style={styles.endedBanner}>
          <Text style={styles.endedBannerTitle}>DISCUSSION ENDED</Text>
          <Text style={styles.endedBannerSub}>{formatDuration(room.duration_seconds || 0)}</Text>
        </View>
      )}

      {pinnedMsg && (
        <Ripple onPress={() => scrollToMessage(pinnedMsg.id)} style={styles.pinnedBar}>
          <Ionicons name="pin" size={13} color="#a16207" />
          <Text style={styles.pinnedText} numberOfLines={1}><Text style={{ fontWeight: 'bold' }}>@{pinnedMsg.username}</Text> {pinnedMsg.content?.startsWith('http') ? '📷 Image' : pinnedMsg.content}</Text>
        </Ripple>
      )}

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'} enabled>
        <FlatList
          ref={flatListRef}
          data={feed}
          keyExtractor={item => item.key}
          renderItem={renderFeedItem}
          contentContainerStyle={styles.messagesContainer}
          maintainVisibleContentPosition={{ minIndexForVisible: 0 }}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
          initialNumToRender={12}
          maxToRenderPerBatch={12}
          windowSize={7}
          updateCellsBatchingPeriod={50}
          removeClippedSubviews
          onScrollToIndexFailed={() => { /* layout not ready — ignore */ }}
          ListHeaderComponent={
            <View>
              {showWelcome && (
                <View style={styles.welcome}>
                  <View style={styles.welcomeHash}><Text style={styles.welcomeHashText}>#</Text></View>
                  <Text style={styles.welcomeTitle}>Welcome to #{room.title}!</Text>
                  <Text style={styles.welcomeSub}>This is the start of the #{room.title} channel.</Text>
                  <Text style={styles.welcomeMeta}>Hosted by @{room.host_username} · {room.category || 'general'}</Text>
                  {!!room.description && <Text style={styles.welcomeDesc}>{room.description}</Text>}
                </View>
              )}
              {hasMore && messages.length > 0 && (
                <View style={{ alignItems: 'center', paddingVertical: 12 }}>
                  {loadingMore ? <ActivityIndicator size="small" color="#2563eb" /> : (
                    <Ripple onPress={loadMoreMessages}>
                      <Text style={styles.loadEarlier}>Load earlier messages</Text>
                    </Ripple>
                  )}
                </View>
              )}
            </View>
          }
          ListEmptyComponent={
            <View style={{ alignItems: 'center', paddingTop: 56, gap: 10 }}>
              <View style={styles.emptyHash}><Text style={styles.emptyHashText}>#</Text></View>
              <Text style={styles.emptyText}>No messages yet. Say hello!</Text>
            </View>
          }
        />

        {typingUsers.length > 0 && isLive && (
          <View style={styles.typingRow}>
            <View style={styles.typingDots}>
              <View style={styles.typingDot} /><View style={styles.typingDot} /><View style={styles.typingDot} />
            </View>
            <Text style={styles.typingText}>{typingUsers.join(', ')} typing...</Text>
          </View>
        )}

        {showReactPicker && (
          <View style={styles.reactPicker}>
            {REACTION_EMOJIS.map(emoji => (
              <Ripple key={emoji} onPress={() => handleReact(showReactPicker, emoji)} style={styles.emojiBtn}>
                <Text style={{ fontSize: 22 }}>{emoji}</Text>
              </Ripple>
            ))}
            {isHost && (
              <Ripple onPress={() => { handlePin(showReactPicker); setShowReactPicker(null); }} style={styles.emojiBtn}>
                <Ionicons name="pin" size={18} color="#6b7280" />
              </Ripple>
            )}
          </View>
        )}

        {showGiphy && (
          <View style={styles.giphyPanel}>
            <View style={styles.giphySearchWrap}>
              <Ionicons name="search-outline" size={16} color="#9ca3af" />
              <TextInput style={styles.giphySearchInput} placeholder="Search GIFs..." placeholderTextColor="#9ca3af" value={giphyQuery} onChangeText={searchGiphy} autoFocus />
              <Ripple onPress={() => { setShowGiphy(false); setGiphyQuery(''); setGiphyResults([]); }}><Ionicons name="close-circle" size={16} color="#9ca3af" /></Ripple>
            </View>
            <ScrollView contentContainerStyle={styles.giphyGrid} keyboardShouldPersistTaps="handled">
              {giphyResults.length === 0 && giphyQuery ? <Text style={styles.giphyHint}>Searching...</Text> : null}
              {!giphyQuery ? <Text style={styles.giphyHint}>Search for GIFs</Text> : null}
              {giphyResults.map((gif: any) => (
                <Ripple key={gif.id} onPress={() => sendGif(gif.images.original.url)} style={styles.giphyItem}>
                  <Image source={{ uri: gif.images.fixed_height.url }} style={styles.giphyImage} resizeMode="cover" />
                </Ripple>
              ))}
            </ScrollView>
          </View>
        )}

        {isLive ? (
          <View style={[styles.inputBar, { paddingBottom: chatBarBottomPad }]}>
            {isMuted ? (
              <Text style={styles.inputNotice}>You are muted</Text>
            ) : room.room_mode === 'locked' && !isHost ? (
              <Text style={styles.inputNotice}>Room is locked</Text>
            ) : (
              <>
                {imagePreview && (
                  <View style={{ marginBottom: 8 }}>
                    <Image source={{ uri: imagePreview }} style={styles.previewImg} />
                    <Ripple onPress={() => setImagePreview(null)} style={styles.previewX}><Text style={styles.previewXText}>X</Text></Ripple>
                  </View>
                )}
                {replyTo && (
                  <View style={styles.replyPreview}>
                    <View style={styles.replyPreviewBar} />
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <Text style={styles.replyPreviewUser}>@{replyTo.username}</Text>
                      <Text style={styles.replyPreviewContent} numberOfLines={1}>{replyTo.content?.startsWith('http') ? '📷 Image' : replyTo.content}</Text>
                    </View>
                    <Ripple onPress={() => setReplyTo(null)} hitSlop={8}><Ionicons name="close" size={14} color="#9ca3af" /></Ripple>
                  </View>
                )}
                {mentionQuery !== null && mentionResults.length > 0 && (
                  <View style={styles.mentionBox}>
                    {mentionResults.map((u: any) => (
                      <Ripple key={u.username || u} onPress={() => insertMention(u.username || u)} style={styles.mentionRow}>
                        <Image source={{ uri: u.profile_pic || DEFAULT_PIC }} style={styles.mentionPic} />
                        <Text style={styles.mentionName}>{u.username || u}</Text>
                        {!!u.fullname && <Text style={styles.mentionFull}>{u.fullname}</Text>}
                      </Ripple>
                    ))}
                  </View>
                )}
                <View style={styles.inputRow}>
                  <Ripple onPress={pickImage} style={styles.addBtn}>
                    {uploadingImage ? <ActivityIndicator size="small" color="#2563eb" /> : <Ionicons name="add-circle" size={26} color="#2563eb" />}
                  </Ripple>
                  <View style={styles.inputPill}>
                    <TextInput ref={inputRef} value={input} onChangeText={handleTyping}
                      onFocus={() => setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 250)}
                      onSubmitEditing={() => imagePreview ? sendMessage(undefined, imagePreview) : sendMessage()}
                      placeholder={`Message #${room.title.slice(0, 22)}`} placeholderTextColor="#9ca3af"
                      style={styles.inputField} maxLength={2000} returnKeyType="send" blurOnSubmit={false} />
                    <Ripple onPress={() => setShowGiphy(!showGiphy)} style={{ paddingLeft: 8 }}>
                      <Text style={styles.gifLabel}>GIF</Text>
                    </Ripple>
                  </View>
                  {(input.trim() || imagePreview) ? (
                    <Ripple onPress={() => imagePreview ? sendMessage(undefined, imagePreview) : sendMessage()} style={styles.sendBtn}>
                      <Ionicons name="send" size={16} color="#fff" />
                    </Ripple>
                  ) : null}
                </View>
              </>
            )}
          </View>
        ) : (
          <View style={[styles.endedInput, { paddingBottom: chatBarBottomPad }]}>
            <Text style={styles.endedInputTitle}>Discussion has ended</Text>
            <Ripple onPress={onBack}><Text style={styles.linkText}>Browse more</Text></Ripple>
          </View>
        )}
      </KeyboardAvoidingView>

      {/* Host settings */}
      <Modal visible={showHostPanel} transparent animationType="fade">
        <Ripple style={styles.menuOverlay} activeOpacity={1} onPress={() => setShowHostPanel(false)}>
          <View style={styles.hostPanel} onStartShouldSetResponder={() => true}>
            <View style={styles.hostPanelHead}>
              <Text style={styles.hostPanelTitle}>Settings</Text>
              <Ripple onPress={() => setShowHostPanel(false)}><Ionicons name="close" size={16} color="#9ca3af" /></Ripple>
            </View>
            <Text style={styles.hostPanelLabel}>ROOM MODE</Text>
            {['open', 'moderated', 'locked'].map(mode => (
              <Ripple key={mode} onPress={async () => {
                playClick();
                await apiPost(`/api/discussions/room/${roomId}/mode`, { host_username: currentUser, room_mode: mode });
                socketRef.current?.emit('discussion_mode_change', { roomId, room_mode: mode });
                setRoom(prev => (prev ? { ...prev, room_mode: mode } : prev));
              }} style={[styles.modeBtn, room.room_mode === mode && styles.modeBtnActive]}>
                <Text style={[styles.modeBtnText, room.room_mode === mode && styles.modeBtnTextActive]}>{mode === 'open' ? 'Open' : mode === 'moderated' ? 'Moderated' : 'Locked'}</Text>
              </Ripple>
            ))}
          </View>
        </Ripple>
      </Modal>

      {/* Lightbox */}
      <Modal visible={!!lightboxUrl} transparent animationType="fade">
        <Ripple style={styles.lightbox} activeOpacity={1} onPress={() => setLightboxUrl(null)}>
          <Ripple onPress={() => setLightboxUrl(null)} style={styles.lightboxX}><Ionicons name="close" size={28} color="#fff" /></Ripple>
          {lightboxUrl ? <Image source={{ uri: lightboxUrl }} style={styles.lightboxImg} resizeMode="contain" /> : null}
        </Ripple>
      </Modal>
    </SafeAreaView>
  );
}

/* ── one message row, memoized so typing/reactions don't re-render the list ── */
type MessageRowProps = {
  item: Extract<FeedItem, { kind: 'msg' }>;
  hostUsername: string;
  currentUser: string | null;
  isHost: boolean;
  isLive: boolean;
  pic: string;
  verified: boolean;
  actionsOpen: boolean;
  onToggleActions: (id: string) => void;
  onProfile: (u: string) => void;
  onScrollTo: (id: string) => void;
  onOpenPicker: (id: string) => void;
  onReply: (msg: Msg) => void;
  onPin: (id: string) => void;
  onDelete: (id: string) => void;
  onReact: (id: string, emoji: string) => void;
  onOpenLightbox: (url: string) => void;
};

const MessageRow = React.memo(function MessageRow({
  item, hostUsername, currentUser, isHost, isLive, pic, verified, actionsOpen,
  onToggleActions, onProfile, onScrollTo, onOpenPicker, onReply, onPin, onDelete, onReact, onOpenLightbox,
}: MessageRowProps) {
  const msg = item.msg;
  const isMsgHost = msg.username === hostUsername;
  const canDelete = isHost || msg.username === currentUser;
  const isGif = !!msg.content && msg.content.includes('giphy.com');
  const isImage = msg.message_type === 'image' || (!!msg.content && !!msg.content.match(/\.(jpg|jpeg|png|gif|webp)(\?|$)/i) && !isGif);
  const isMedia = isGif || isImage;
  const mediaUrl = isGif ? msg.content : (msg.media_url || msg.content);
  const reactions = msg.reactions || {};

  if ((msg as any).is_deleted) {
    return <View style={styles.msgDeleted}><Text style={styles.msgDeletedText}>{msg.content}</Text></View>;
  }

  return (
    <View style={[styles.msgBlock, item.grouped && styles.msgBlockGrouped]}>
      <View style={styles.msgRow}>
        {item.grouped ? (
          <View style={styles.msgGutter}>
            <Text style={styles.msgGutterTime}>{timeAgo(msg.created_at)}</Text>
          </View>
        ) : (
          <Ripple onPress={() => onProfile(msg.username)} style={styles.avatarBtn}>
            <Image source={{ uri: pic }} style={styles.msgAvatar} />
          </Ripple>
        )}
        <View style={{ flex: 1, minWidth: 0 }}>
          {!item.grouped && (
            <View style={styles.msgMetaRow}>
              <Ripple onPress={() => onProfile(msg.username)}><Text style={[styles.msgUsername, isMsgHost && styles.msgUsernameHost]}>{msg.username}</Text></Ripple>
              {verified && <Ionicons name="checkmark-circle" size={13} color="#2563eb" />}
              {isMsgHost && <View style={styles.hostBadge}><Text style={styles.hostBadgeText}>HOST</Text></View>}
              <Text style={styles.msgTime}>{timeAgo(msg.created_at)}</Text>
            </View>
          )}
          {!!item.replyToMsg && (
            <Ripple onPress={() => onScrollTo(item.replyToMsg!.id)} style={styles.replyQuote}>
              <Text style={styles.replyUser}>@{item.replyToMsg.username}</Text>
              <Text style={styles.replyContent} numberOfLines={1}>{item.replyToMsg.content?.startsWith('http') ? '📷 Image' : item.replyToMsg.content}</Text>
            </Ripple>
          )}
          {isMedia ? (
            <Ripple onPress={() => onOpenLightbox(mediaUrl)}>
              <Image source={{ uri: mediaUrl }} style={styles.msgImage} resizeMode="cover" />
            </Ripple>
          ) : (
            <Text style={styles.msgText}>{renderMarkdownText(msg.content)}</Text>
          )}
          {Object.keys(reactions).length > 0 && (
            <View style={styles.reactionsRow}>
              {Object.entries(reactions).map(([emoji, users]) => (
                <Ripple key={emoji} onPress={() => isLive && onReact(msg.id, emoji)} style={styles.reactionChip}>
                  <Text style={styles.reactionText}>{emoji} <Text style={styles.reactionCount}>{Array.isArray(users) ? users.length : String(users)}</Text></Text>
                </Ripple>
              ))}
            </View>
          )}
        </View>
        <Ripple onPress={() => onToggleActions(msg.id)} style={styles.msgMoreBtn} hitSlop={8}>
          <Ionicons name="ellipsis-horizontal" size={16} color="#9ca3af" />
        </Ripple>
      </View>

      {actionsOpen && (
        <View style={styles.inlineActions}>
          {isLive && (
            <Ripple onPress={() => onOpenPicker(msg.id)} style={styles.inlineActionBtn}>
              <Ionicons name="happy-outline" size={16} color="#6b7280" /><Text style={styles.inlineActionText}>React</Text>
            </Ripple>
          )}
          {isLive && (
            <Ripple onPress={() => onReply(msg)} style={styles.inlineActionBtn}>
              <Ionicons name="arrow-undo-outline" size={16} color="#6b7280" /><Text style={styles.inlineActionText}>Reply</Text>
            </Ripple>
          )}
          {isHost && (
            <Ripple onPress={() => onPin(msg.id)} style={styles.inlineActionBtn}>
              <Ionicons name="pin-outline" size={16} color="#6b7280" /><Text style={styles.inlineActionText}>Pin</Text>
            </Ripple>
          )}
          {canDelete && (
            <Ripple onPress={() => onDelete(msg.id)} style={styles.inlineActionBtn}>
              <Ionicons name="trash-outline" size={16} color="#6b7280" /><Text style={styles.inlineActionText}>Delete</Text>
            </Ripple>
          )}
        </View>
      )}
    </View>
  );
});

function MemberRow({ username, isHost, pic, verified, onPress }: {
  username: string; isHost?: boolean; pic?: string; verified?: boolean; onPress: (u: string) => void;
}) {
  return (
    <Ripple onPress={() => onPress(username)} style={styles.memberRow}>
      <Image source={{ uri: pic || DEFAULT_PIC }} style={styles.memberPic} />
      <Text numberOfLines={1} style={[styles.memberName, isHost && { color: '#2563eb' }]}>{username}</Text>
      {isHost && <View style={styles.hostBadge}><Text style={styles.hostBadgeText}>HOST</Text></View>}
      {verified && <Ionicons name="checkmark-circle" size={13} color="#2563eb" />}
    </Ripple>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  centerFill: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12, padding: 16 },
  // Header
  header: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 12, paddingVertical: 10, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  backBtn: { padding: 6 },
  headerHash: { width: 26, height: 26, borderRadius: 8, backgroundColor: '#eef2f7', alignItems: 'center', justifyContent: 'center' },
  headerHashText: { fontSize: 15, fontWeight: 'bold', color: '#9ca3af', lineHeight: 17 },
  headerTitle: { fontSize: 15, fontWeight: 'bold', color: '#111827' },
  headerSub: { fontSize: 11, color: '#9ca3af', marginTop: 1 },
  headerIconBtn: { padding: 6 },
  // States
  emptyHash: { width: 56, height: 56, borderRadius: 18, backgroundColor: '#eef2f7', alignItems: 'center', justifyContent: 'center' },
  emptyHashText: { fontSize: 28, fontWeight: 'bold', color: '#cbd5e1' },
  emptyText: { fontSize: 14, fontWeight: '600', color: '#9ca3af' },
  linkText: { fontSize: 14, color: '#2563eb', fontWeight: 'bold' },
  // Paywall
  paywallCard: { backgroundColor: '#fff', borderRadius: 16, padding: 32, width: '100%', maxWidth: 320, alignItems: 'center', borderWidth: 1, borderColor: '#f3f4f6' },
  paywallIcon: { width: 56, height: 56, borderRadius: 16, backgroundColor: '#f3f4f6', alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  paywallTitle: { fontSize: 16, fontWeight: 'bold', color: '#111827', textAlign: 'center' },
  paywallHost: { fontSize: 12, color: '#9ca3af', marginTop: 4, textAlign: 'center' },
  paywallBanner: { backgroundColor: '#fefce8', borderWidth: 1, borderColor: '#fef08a', borderRadius: 12, padding: 12, width: '100%', marginTop: 16, alignItems: 'center' },
  paywallBannerTitle: { fontSize: 12, fontWeight: 'bold', color: '#a16207' },
  paywallBannerSub: { fontSize: 12, color: '#a16207', marginTop: 2 },
  paywallBtn: { backgroundColor: '#eab308', paddingVertical: 12, borderRadius: 999, width: '100%', alignItems: 'center', marginTop: 16 },
  paywallBtnText: { color: '#fff', fontSize: 14, fontWeight: 'bold' },
  paywallBack: { fontSize: 12, color: '#9ca3af', fontWeight: '600', marginTop: 16 },
  // Menu
  menuOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.2)' },
  menuPanel: { position: 'absolute', top: 70, right: 16, backgroundColor: '#fff', borderRadius: 16, paddingVertical: 4, width: 192, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 8, elevation: 4, borderWidth: 1, borderColor: '#f3f4f6' },
  menuItem: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 10 },
  menuItemText: { fontSize: 14, fontWeight: '500', color: '#374151' },
  // Members sheet
  sheetOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingHorizontal: 16, paddingBottom: 8, paddingTop: 8 },
  sheetHandle: { alignSelf: 'center', width: 40, height: 4, borderRadius: 2, backgroundColor: '#e5e7eb', marginBottom: 10 },
  sheetHeadRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 },
  sheetTabs: { flexDirection: 'row', gap: 6 },
  sheetTab: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 999, backgroundColor: '#f3f4f6' },
  sheetTabActive: { backgroundColor: '#2563eb' },
  sheetTabText: { fontSize: 12, fontWeight: '700', color: '#6b7280' },
  sheetTabTextActive: { color: '#fff' },
  aboutTitle: { fontSize: 16, fontWeight: 'bold', color: '#111827', marginTop: 4 },
  aboutDesc: { fontSize: 13, color: '#4b5563', lineHeight: 19, marginTop: 8 },
  aboutChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 },
  aboutChip: { borderWidth: 1, borderColor: '#e5e7eb', backgroundColor: '#fff', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
  aboutChipText: { fontSize: 11, fontWeight: '600', color: '#6b7280' },
  aboutRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 6 },
  aboutRowText: { fontSize: 13, color: '#4b5563' },
  sheetSection: { fontSize: 10, fontWeight: 'bold', color: '#9ca3af', letterSpacing: 0.8, marginTop: 14, marginBottom: 6 },
  memberRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 7, paddingHorizontal: 4 },
  memberPic: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#f3f4f6' },
  memberName: { flex: 1, fontSize: 13, fontWeight: '600', color: '#1f2937' },
  // Ended + pinned
  endedBanner: { paddingVertical: 10, backgroundColor: '#f3f4f6', borderBottomWidth: 1, borderBottomColor: '#e5e7eb', alignItems: 'center' },
  endedBannerTitle: { fontSize: 12, fontWeight: 'bold', color: '#9ca3af' },
  endedBannerSub: { fontSize: 12, color: '#9ca3af', marginTop: 2 },
  pinnedBar: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 8, paddingHorizontal: 16, backgroundColor: '#fefce8', borderBottomWidth: 1, borderBottomColor: '#fef08a' },
  pinnedText: { fontSize: 12, color: '#a16207', flex: 1 },
  // Messages
  messagesContainer: { padding: 16, paddingBottom: 8 },
  welcome: { alignItems: 'flex-start', paddingVertical: 24, borderBottomWidth: 1, borderBottomColor: '#f3f4f6', marginBottom: 8 },
  welcomeHash: { width: 52, height: 52, borderRadius: 16, backgroundColor: '#2563eb', alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  welcomeHashText: { fontSize: 28, fontWeight: 'bold', color: '#fff', lineHeight: 31 },
  welcomeTitle: { fontSize: 20, fontWeight: 'bold', color: '#111827' },
  welcomeSub: { fontSize: 13, color: '#6b7280', marginTop: 6 },
  welcomeMeta: { fontSize: 12, color: '#9ca3af', marginTop: 10 },
  welcomeDesc: { fontSize: 13, color: '#4b5563', marginTop: 6, lineHeight: 19 },
  loadEarlier: { fontSize: 12, color: '#2563eb', fontWeight: '600' },
  dateDivider: { flexDirection: 'row', alignItems: 'center', gap: 10, marginVertical: 14 },
  dateLine: { flex: 1, height: 1, backgroundColor: '#f3f4f6' },
  dateText: { fontSize: 11, fontWeight: 'bold', color: '#9ca3af' },
  msgBlock: { marginTop: 14 },
  msgBlockGrouped: { marginTop: 3 },
  msgRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  msgGutter: { width: 40, alignItems: 'flex-end', paddingTop: 2 },
  msgGutterTime: { fontSize: 9, color: '#d1d5db' },
  avatarBtn: {},
  msgAvatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#f3f4f6' },
  msgMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2, flexWrap: 'wrap' },
  msgUsername: { fontSize: 14, fontWeight: '700', color: '#1f2937' },
  msgUsernameHost: { color: '#2563eb' },
  hostBadge: { backgroundColor: '#dbeafe', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  hostBadgeText: { fontSize: 10, fontWeight: 'bold', color: '#2563eb' },
  msgTime: { fontSize: 11, color: '#9ca3af' },
  msgText: { fontSize: 14, color: '#1f2937', lineHeight: 20 },
  msgImage: { width: 220, height: 150, borderRadius: 8, backgroundColor: '#f3f4f6', marginTop: 4 },
  msgDeleted: { paddingVertical: 4, marginTop: 8, marginLeft: 50 },
  msgDeletedText: { fontSize: 11, color: '#d1d5db', fontStyle: 'italic' },
  msgMoreBtn: { padding: 6 },
  replyQuote: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4, paddingLeft: 8, borderLeftWidth: 2, borderLeftColor: '#93c5fd' },
  replyUser: { fontSize: 11, color: '#3b82f6', fontWeight: '600' },
  replyContent: { fontSize: 11, color: '#9ca3af', flex: 1 },
  reactionsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 6 },
  reactionChip: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  reactionText: { fontSize: 12 },
  reactionCount: { color: '#6b7280', fontWeight: '500' },
  inlineActions: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 6, marginLeft: 50, backgroundColor: '#fff', borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 10, paddingHorizontal: 4, paddingVertical: 2, alignSelf: 'flex-start' },
  inlineActionBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 6 },
  inlineActionText: { fontSize: 11, color: '#6b7280' },
  // Typing
  typingRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingVertical: 4 },
  typingDots: { flexDirection: 'row', gap: 4 },
  typingDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#9ca3af' },
  typingText: { fontSize: 12, color: '#9ca3af' },
  // React picker
  reactPicker: { flexDirection: 'row', flexWrap: 'wrap', backgroundColor: '#fff', borderRadius: 16, padding: 8, marginHorizontal: 16, marginBottom: 8, borderWidth: 1, borderColor: '#f3f4f6', shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 8, elevation: 3, gap: 2, alignItems: 'center' },
  emojiBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center', borderRadius: 8 },
  // Host panel
  hostPanel: { backgroundColor: '#fff', borderRadius: 16, padding: 16, width: 224, alignSelf: 'flex-end', marginTop: 70, marginRight: 16 },
  hostPanelHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  hostPanelTitle: { fontSize: 12, fontWeight: 'bold', color: '#111827' },
  hostPanelLabel: { fontSize: 10, color: '#9ca3af', fontWeight: 'bold', letterSpacing: 1, marginBottom: 8 },
  modeBtn: { paddingVertical: 8, paddingHorizontal: 12, borderRadius: 12, borderWidth: 1, borderColor: 'transparent', marginBottom: 4 },
  modeBtnActive: { backgroundColor: '#eff6ff', borderColor: '#bfdbfe' },
  modeBtnText: { fontSize: 12, fontWeight: '600', color: '#4b5563' },
  modeBtnTextActive: { color: '#2563eb' },
  // Giphy
  giphyPanel: { marginHorizontal: 16, marginBottom: 8, backgroundColor: '#fff', borderRadius: 12, borderWidth: 1, borderColor: '#f3f4f6', shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 8, elevation: 4, maxHeight: 260, overflow: 'hidden' },
  giphySearchWrap: { flexDirection: 'row', alignItems: 'center', padding: 12, borderBottomWidth: 1, borderBottomColor: '#f3f4f6', gap: 8 },
  giphySearchInput: { flex: 1, fontSize: 12, color: '#111827', paddingVertical: 0, includeFontPadding: false, textAlignVertical: 'center' },
  giphyHint: { fontSize: 12, color: '#9ca3af', textAlign: 'center', paddingVertical: 32, width: '100%' },
  giphyGrid: { flexDirection: 'row', flexWrap: 'wrap', padding: 4 },
  giphyItem: { width: '33.33%', aspectRatio: 1, padding: 2 },
  giphyImage: { width: '100%', height: '100%', borderRadius: 6, backgroundColor: '#f3f4f6' },
  // Composer
  inputBar: { backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#f3f4f6', paddingHorizontal: 12, paddingVertical: 10 },
  inputNotice: { fontSize: 12, color: '#9ca3af', textAlign: 'center', paddingVertical: 8 },
  inputRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  addBtn: { padding: 2 },
  inputPill: { flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: '#f3f4f6', borderRadius: 999, paddingHorizontal: 14, paddingVertical: 8 },
  inputField: { flex: 1, fontSize: 14, color: '#111827', paddingVertical: 0, includeFontPadding: false, textAlignVertical: 'center' },
  gifLabel: { fontSize: 10, fontWeight: 'bold', color: '#9ca3af', borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 4, paddingHorizontal: 4, paddingVertical: 2 },
  sendBtn: { width: 38, height: 38, borderRadius: 19, backgroundColor: '#2563eb', alignItems: 'center', justifyContent: 'center' },
  previewImg: { height: 80, width: 120, borderRadius: 12, borderWidth: 1, borderColor: '#e5e7eb' },
  previewX: { position: 'absolute', top: -6, right: 108, width: 20, height: 20, backgroundColor: '#ef4444', borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  previewXText: { fontSize: 10, fontWeight: 'bold', color: '#fff' },
  replyPreview: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#eff6ff', borderWidth: 1, borderColor: '#bfdbfe', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 8, marginBottom: 8 },
  replyPreviewBar: { width: 2, height: 32, backgroundColor: '#60a5fa', borderRadius: 1 },
  replyPreviewUser: { fontSize: 11, fontWeight: 'bold', color: '#2563eb' },
  replyPreviewContent: { fontSize: 11, color: '#6b7280' },
  mentionBox: { backgroundColor: '#fff', borderRadius: 12, borderWidth: 1, borderColor: '#f3f4f6', shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 8, elevation: 3, marginBottom: 8, maxHeight: 192 },
  mentionRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 10 },
  mentionPic: { width: 28, height: 28, borderRadius: 14 },
  mentionName: { fontSize: 14, fontWeight: '600', color: '#1f2937' },
  mentionFull: { fontSize: 12, color: '#9ca3af' },
  endedInput: { borderTopWidth: 1, borderTopColor: '#f3f4f6', backgroundColor: '#f9fafb', paddingVertical: 12, alignItems: 'center' },
  endedInputTitle: { fontSize: 12, fontWeight: 'bold', color: '#9ca3af' },
  // Lightbox
  lightbox: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'center', alignItems: 'center' },
  lightboxX: { position: 'absolute', top: 50, right: 20, zIndex: 1, padding: 8 },
  lightboxImg: { width: '90%', height: '70%' },
});
