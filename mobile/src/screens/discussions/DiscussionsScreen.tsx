import React, { useState, useEffect, useRef } from 'react';
import { View, Text, FlatList, TextInput, TouchableOpacity, StyleSheet, Modal, Platform, ActivityIndicator, RefreshControl, Image, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { apiGet, apiPost } from '../../api/client';
import { playClick } from '../../utils/sound';
import { useTheme } from '../../theme/ThemeContext';

const GIPHY_API_KEY = '1PsuVrcwCRiOYQEfqgPOd9kVuoRmuhai';
const GIPHY_API_BASE = 'https://api.giphy.com/v1/gifs';
const DEFAULT_PIC = 'https://res.cloudinary.com/dzvm9xe1i/image/upload/v1746095979/profile-pictures/e2st5nispbicnhnir9cf.jpg';
const CATEGORIES = ['all', 'general', 'football', 'technology', 'music', 'politics', 'religion', 'entertainment', 'gaming', 'business', 'education'];

const REACTIONS = [
  { emoji: '\u2764\uFE0F', label: 'love' },
  { emoji: '\uD83D\uDD25', label: 'fire' },
  { emoji: '\uD83D\uDE02', label: 'laugh' },
  { emoji: '\uD83D\uDC4D', label: 'thumbsup' },
  { emoji: '\uD83D\uDE22', label: 'sad' },
  { emoji: '\uD83D\uDE2E', label: 'wow' },
  { emoji: '\uD83D\uDC4F', label: 'clap' },
  { emoji: '\uD83D\uDE4C', label: 'pray' },
];

function timeAgo(d: string | null) { if (!d) return ''; const diff = Date.now() - new Date(d).getTime(); const mins = Math.floor(diff / 60000); if (mins < 1) return 'now'; if (mins < 60) return `${mins}m`; const hrs = Math.floor(mins / 60); if (hrs < 24) return `${hrs}h`; return `${Math.floor(hrs / 24)}d`; }
function formatDuration(secs: number) { if (!secs) return '0m'; const h = Math.floor(secs / 3600); const m = Math.floor((secs % 3600) / 60); return h > 0 ? `${h}h ${m}m` : `${m}m`; }

interface Room { id: string; title: string; description?: string; host_username: string; category?: string; room_mode?: string; status: string; participant_count?: number; message_count?: number; duration_seconds?: number; muted_users?: string[]; archive_post_id?: string; created_at: string; pinned_message_id?: string; }
interface Msg { id: string; room_id: string; username: string; content: string; message_type: string; is_pinned?: boolean; is_deleted?: boolean; reactions?: Record<string, string[]>; reaction_count?: number; created_at: string; }

type Props = { onBack: () => void; onProfile: (u: string) => void; roomId?: string; };

export default function DiscussionsScreen({ onBack, onProfile, roomId }: Props) {
  const { colors } = useTheme();
  if (roomId) return <RoomView roomId={roomId} onBack={onBack} onProfile={onProfile} colors={colors} />;
  return <ListView onBack={onBack} onProfile={onProfile} colors={colors} />;
}

function ListView({ onBack, onProfile, colors }: { onBack: () => void; onProfile: (u: string) => void; colors: any }) {
  const [tab, setTab] = useState<'active' | 'archives' | 'my-archive'>('active');
  const [rooms, setRooms] = useState<Room[]>([]);
  const [archives, setArchives] = useState<Room[]>([]);
  const [myArchives, setMyArchives] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [category, setCategory] = useState('all');
  const [search, setSearch] = useState('');
  const [searchResults, setSearchResults] = useState<Room[] | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [unlocking, setUnlocking] = useState<string | null>(null);
  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const currentUser = globalThis.localStorage?.getItem('currentUser') || '';

  const loadTab = async () => {
    try {
      if (tab === 'active') {
        const url = category === 'all' ? '/api/discussions/active?limit=50' : `/api/discussions/active?category=${category}&limit=50`;
        const data = await apiGet(url);
        setRooms(Array.isArray(data) ? data : []);
      } else if (tab === 'archives') {
        const data = await apiGet('/api/discussions/archives?limit=50');
        setArchives(Array.isArray(data) ? data : []);
      } else if (tab === 'my-archive' && currentUser) {
        const data = await apiGet(`/api/discussions/my-archive?username=${currentUser}`);
        setMyArchives(Array.isArray(data) ? data : []);
      }
    } catch {}
    setLoading(false); setRefreshing(false);
  };

  useEffect(() => { if (!search.trim()) loadTab(); }, [tab, category]);

  const handleSearch = (val: string) => {
    setSearch(val);
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    if (!val.trim()) { setSearchResults(null); loadTab(); return; }
    searchTimeout.current = setTimeout(async () => {
      setLoading(true);
      try { const data = await apiGet(`/api/discussions/search?q=${encodeURIComponent(val.trim())}&limit=30`); setSearchResults(Array.isArray(data) ? data : []); } catch { setSearchResults([]); }
      setLoading(false);
    }, 300);
  };

  const displayRooms = searchResults !== null ? searchResults : (tab === 'active' ? rooms : tab === 'archives' ? archives : myArchives);

  const handleDelete = async (id: string) => {
    try { await apiPost(`/api/discussions/room/${id}/delete`, { username: currentUser }); setArchives(prev => prev.filter(r => r.id !== id)); setMyArchives(prev => prev.filter(r => r.id !== id)); if (searchResults) setSearchResults(prev => prev.filter(r => r.id !== id)); } catch {}
  };

  const handleUnlock = async (roomId: string) => {
    if (!currentUser) return;
    setUnlocking(roomId);
    try {
      const data = await apiPost(`/api/discussions/room/${roomId}/unlock`, { username: currentUser });
      if (data?.unlocked) { onProfile(roomId); } else { alert(data?.error || 'Failed to unlock'); }
    } catch { alert('Failed to unlock'); }
    setUnlocking(null);
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backBtn}><Ionicons name="chevron-back" size={20} color="#111" /></TouchableOpacity>
        <Text style={styles.headerTitle}>Discussions</Text>
        {currentUser ? <TouchableOpacity onPress={() => setShowCreate(true)} style={styles.goLiveBtn}><Text style={styles.goLiveText}>Start</Text></TouchableOpacity> : <View style={{ width: 50 }} />}
      </View>

      {/* Tabs */}
      <View style={styles.tabsRow}>
        {(['active', 'archives', 'my-archive'] as const).map(t => (
          <TouchableOpacity key={t} onPress={() => { playClick(); setTab(t); setSearch(''); setSearchResults(null); }} style={[styles.tabBtn, tab === t && styles.tabBtnActive]}>
            <Text style={[styles.tabText, tab === t && styles.tabTextActive]}>{t === 'active' ? 'Active' : t === 'archives' ? 'Archives' : 'My Archive'}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.searchWrap}>
        <Ionicons name="search" size={14} color="#999" style={{ marginRight: 6 }} />
        <TextInput style={styles.searchInput} placeholder="Search..." placeholderTextColor="#999" value={search} onChangeText={handleSearch} />
        {search ? <TouchableOpacity onPress={() => handleSearch('')}><Ionicons name="close-circle" size={16} color="#999" /></TouchableOpacity> : null}
      </View>

      {tab === 'active' && !search.trim() && (
        <FlatList horizontal data={CATEGORIES} keyExtractor={c => c} showsHorizontalScrollIndicator={false} contentContainerStyle={styles.pillsWrap}
          renderItem={({ item: cat }) => (
            <TouchableOpacity onPress={() => { playClick(); setCategory(cat); }} style={[styles.pill, category === cat && styles.pillActive]}>
              <Text style={[styles.pillText, category === cat && styles.pillTextActive]}>{CAT_EMOJI[cat] || ''} {cat.charAt(0).toUpperCase() + cat.slice(1)}</Text>
            </TouchableOpacity>
          )}
        />
      )}

      {tab === 'archives' && (
        <View style={styles.archiveBanner}>
          <Ionicons name="lock-closed" size={14} color="#eab308" />
          <Text style={styles.archiveBannerText}>Unlock for 500 mobcoins. Host gets 10%.</Text>
        </View>
      )}

      {loading ? <ActivityIndicator color="#2563eb" style={{ marginTop: 40 }} /> : (
        <FlatList data={displayRooms} keyExtractor={item => item.id} contentContainerStyle={{ paddingBottom: 100 }}
          ListEmptyComponent={<View style={{ alignItems: 'center', paddingTop: 50 }}><Text style={{ fontSize: 12, color: '#999' }}>
            {tab === 'active' ? (search ? 'No results' : 'No active discussions') : tab === 'archives' ? 'No archives' : 'No discussions in your archive'}
          </Text></View>}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadTab(); }} />}
          renderItem={({ item: room }) => {
            if (tab === 'archives') {
              return (
                <View style={styles.roomCard}>
                  <View style={styles.roomRow}>
                    <View style={styles.archiveIcon}><Ionicons name="lock-closed" size={12} color="#999" /></View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.roomTitle} numberOfLines={1}>{room.title}</Text>
                      <Text style={styles.roomHost}>@{room.host_username} · {room.message_count || 0} msgs</Text>
                    </View>
                    <TouchableOpacity onPress={() => { playClick(); handleUnlock(room.id); }} disabled={unlocking === room.id} style={styles.unlockBtn}>
                      <Text style={styles.unlockBtnText}>{unlocking === room.id ? '...' : '500'}</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              );
            }
            if (tab === 'my-archive') {
              return (
                <View style={styles.roomCard}>
                  <View style={styles.roomRow}>
                    <View style={[styles.liveDot, styles.liveDotEnded]} />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.roomTitle} numberOfLines={1}>{room.title}</Text>
                      <Text style={styles.roomHost}>{room.message_count || 0} msgs · {formatDuration(room.duration_seconds || 0)}</Text>
                    </View>
                    <TouchableOpacity onPress={() => { playClick(); handleDelete(room.id); }} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                      <Ionicons name="trash-outline" size={14} color="#999" />
                    </TouchableOpacity>
                  </View>
                </View>
              );
            }
            return (
              <TouchableOpacity style={styles.roomCard} onPress={() => { playClick(); onProfile(room.id); }}>
                <View style={styles.roomRow}>
                  <View style={styles.liveDot} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.roomTitle} numberOfLines={1}>{room.title}</Text>
                    <Text style={styles.roomHost}>{room.category ? `${CAT_EMOJI[room.category] || ''} ` : ''}@{room.host_username}</Text>
                    <View style={styles.roomStats}>
                      <Text style={styles.roomTalking}>{room.participant_count || 0} views</Text>
                      <Text style={styles.roomMsgs}>{room.message_count || 0} msgs</Text>
                    </View>
                  </View>
                  <Ionicons name="chevron-forward" size={12} color="#ccc" />
                </View>
              </TouchableOpacity>
            );
          }}
        />
      )}

      <Modal visible={showCreate} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Start a Discussion</Text>
            <CreateRoomForm onClose={() => setShowCreate(false)} onCreated={(id) => { setShowCreate(false); onProfile(id); }} />
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

function CreateRoomForm({ onClose, onCreated }: { onClose: () => void; onCreated: (id: string) => void }) {
  const [title, setTitle] = useState('');
  const [desc, setDesc] = useState('');
  const [cat, setCat] = useState('general');
  const [loading, setLoading] = useState(false);
  const handleCreate = async () => {
    if (!title.trim()) return; setLoading(true);
    try { const data = await apiPost('/api/discussions/create', { username: globalThis.localStorage?.getItem('currentUser'), title: title.trim(), description: desc.trim(), category: cat }); if (data?.id) onCreated(data.id); } catch {}
    setLoading(false);
  };
  return (
    <View>
      <TextInput style={styles.modalInput} placeholder="Room title" placeholderTextColor="#999" value={title} onChangeText={t => setTitle(t.slice(0, 120))} maxLength={120} />
      <TextInput style={[styles.modalInput, { height: 60 }]} placeholder="What's the discussion about?" placeholderTextColor="#999" value={desc} onChangeText={t => setDesc(t.slice(0, 500))} maxLength={500} multiline />
      <View style={styles.catPicker}>
        {CATEGORIES.filter(c => c !== 'all').map(c => (
          <TouchableOpacity key={c} onPress={() => setCat(c)} style={[styles.catPill, cat === c && styles.catPillActive]}>
            <Text style={[styles.catPillText, cat === c && styles.catPillTextActive]}>{CAT_EMOJI[c] || ''} {c.charAt(0).toUpperCase() + c.slice(1)}</Text>
          </TouchableOpacity>
        ))}
      </View>
      <View style={styles.modalBtns}>
        <TouchableOpacity onPress={onClose} style={styles.modalCancelBtn}><Text style={styles.modalCancelText}>Cancel</Text></TouchableOpacity>
        <TouchableOpacity onPress={handleCreate} disabled={!title.trim() || loading} style={[styles.modalGoBtn, (!title.trim() || loading) && { opacity: 0.4 }]}>
          <Text style={styles.modalGoText}>{loading ? 'Starting...' : 'Go Live'}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

function RoomView({ roomId, onBack, onProfile, colors }: { roomId: string; onBack: () => void; onProfile: (u: string) => void; colors: any }) {
  const [room, setRoom] = useState<Room | null>(null);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [unlocked, setUnlocked] = useState(false);
  const [unlocking, setUnlocking] = useState(false);
  const [showReactPicker, setShowReactPicker] = useState<string | null>(null);
  const [showMenu, setShowMenu] = useState(false);
  const [showGiphy, setShowGiphy] = useState(false);
  const [giphyQuery, setGiphyQuery] = useState('');
  const [giphyResults, setGiphyResults] = useState<any[]>([]);
  const [showHostPanel, setShowHostPanel] = useState(false);
  const flatListRef = useRef<FlatList>(null);
  const typingTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const socketRef = useRef<any>(null);
  const currentUser = globalThis.localStorage?.getItem('currentUser') || '';
  const isHost = room && room.host_username === currentUser;
  const isMuted = room && (room.muted_users || []).includes(currentUser);
  const isLive = room && room.status === 'live';
  const isArchived = room && room.status === 'ended';
  const canView = isLive || unlocked || isHost;

  useEffect(() => {
    (async () => {
      try {
        const roomData = await apiGet(`/api/discussions/room/${roomId}`);
        if (roomData?.id) {
          setRoom(roomData);
          if (roomData.status === 'ended' && roomData.host_username !== currentUser) {
            const d = await apiGet(`/api/discussions/room/${roomId}/check-unlock?username=${currentUser}`);
            setUnlocked(d?.unlocked || false);
          } else {
            setUnlocked(true);
          }
          const msgsData = await apiGet(`/api/discussions/room/${roomId}/messages?limit=200`);
          if (Array.isArray(msgsData)) setMessages(msgsData);
        }
      } catch {}
      setLoading(false);
    })();
  }, [roomId]);

  const handleUnlock = async () => {
    if (!currentUser) return;
    setUnlocking(true);
    try {
      const data = await apiPost(`/api/discussions/room/${roomId}/unlock`, { username: currentUser });
      if (data?.unlocked) { setUnlocked(true); } else { alert(data?.error || 'Failed'); }
    } catch { alert('Failed'); }
    setUnlocking(false);
  };

  useEffect(() => {
    if (!roomId || !currentUser || !canView) return;
    const io = globalThis.io; if (!io) return;
    const url = globalThis.location?.hostname === 'localhost' ? 'http://localhost:5000' : 'https://textmob-provider-api-99ii.onrender.com';
    const socket = io(url); socketRef.current = socket;
    socket.emit('join_discussion', { roomId, username: currentUser });
    socket.emit('join_user', { username: currentUser });
    socket.on('discussion_message', (msg: Msg) => setMessages(prev => [...prev, msg]));
    socket.on('discussion_reaction', ({ message_id, reactions, reaction_count }: any) => setMessages(prev => prev.map(m => m.id === message_id ? { ...m, reactions, reaction_count } : m)));
    socket.on('discussion_pin', ({ pinned_message_id }: any) => setRoom(prev => prev ? { ...prev, pinned_message_id } : prev));
    socket.on('discussion_mode_change', ({ room_mode }: any) => setRoom(prev => prev ? { ...prev, room_mode } : prev));
    socket.on('discussion_user_removed', ({ username: u }: any) => { if (u === currentUser) onBack(); });
    socket.on('discussion_room_ended', ({ duration }: any) => setRoom(prev => prev ? { ...prev, status: 'ended', ended_at: new Date().toISOString(), duration_seconds: duration || 0, participant_count: 0 } : prev));
    socket.on('discussion_delete_message', ({ message_id }: any) => setMessages(prev => prev.filter(m => m.id !== message_id)));
    apiPost(`/api/discussions/room/${roomId}/join`, { username: currentUser }).catch(() => {});
    return () => { socket.emit('leave_discussion', { roomId }); apiPost(`/api/discussions/room/${roomId}/leave`, { username: currentUser }).catch(() => {}); socket.disconnect(); };
  }, [roomId, currentUser, canView]);

  const sendMessage = async (content?: string) => {
    const text = (content || input).trim(); if (!text || !currentUser || !isLive) return;
    setInput(''); setShowGiphy(false); setGiphyQuery(''); setGiphyResults([]);
    socketRef.current?.emit('discussion_stop_typing', { roomId, username: currentUser });
    try { const msg = await apiPost(`/api/discussions/room/${roomId}/send`, { username: currentUser, content: text }); if (msg?.id) socketRef.current?.emit('discussion_message', { roomId, ...msg }); } catch {}
  };

  const handleReact = async (messageId: string, emoji: string) => {
    setShowReactPicker(null);
    try { const data = await apiPost(`/api/discussions/room/${roomId}/react`, { message_id: messageId, username: currentUser, emoji }); if (data) socketRef.current?.emit('discussion_reaction', { roomId, message_id: messageId, ...data }); } catch {}
  };

  const handlePin = async (messageId: string) => {
    if (!isHost) return;
    try { const data = await apiPost(`/api/discussions/room/${roomId}/pin`, { host_username: currentUser, message_id: messageId }); if (data) socketRef.current?.emit('discussion_pin', { roomId, ...data }); } catch {}
  };

  const handleDeleteMessage = async (messageId: string) => {
    if (!isHost) return;
    try {
      await apiPost(`/api/discussions/room/${roomId}/delete-message`, { host_username: currentUser, message_id: messageId });
      socketRef.current?.emit('discussion_delete_message', { roomId, message_id: messageId });
      setMessages(prev => prev.filter(m => m.id !== messageId));
    } catch {}
  };

  const handleEndRoom = async () => {
    if (!isHost) return;
    try { const data = await apiPost(`/api/discussions/room/${roomId}/end`, { username: currentUser }); setRoom(prev => prev ? { ...prev, status: 'ended', ended_at: new Date().toISOString(), duration_seconds: data?.duration || 0, participant_count: 0 } : prev); } catch {}
  };

  const handleDeleteRoom = async () => {
    if (!isHost) return;
    try { await apiPost(`/api/discussions/room/${roomId}/delete`, { username: currentUser }); onBack(); } catch {}
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

  const pinnedMsg = room?.pinned_message_id ? messages.find(m => m.id === room.pinned_message_id) : null;

  if (loading) return <SafeAreaView style={styles.container}><ActivityIndicator color="#2563eb" style={{ marginTop: 60 }} /></SafeAreaView>;
  if (!room) return <SafeAreaView style={styles.container}><View style={{ alignItems: 'center', paddingTop: 60 }}><Text style={{ fontSize: 13, color: '#999' }}>Not found</Text><TouchableOpacity onPress={onBack}><Text style={{ fontSize: 12, color: '#2563eb', fontWeight: 'bold', marginTop: 8 }}>Go back</Text></TouchableOpacity></View></SafeAreaView>;

  // Archive paywall
  if (isArchived && !canView) {
    return (
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onBack} style={styles.backBtn}><Ionicons name="chevron-back" size={20} color="#111" /></TouchableOpacity>
          <Text style={styles.headerTitle} numberOfLines={1}>{room.title}</Text>
        </View>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 }}>
          <View style={styles.paywallCard}>
            <View style={styles.paywallIcon}><Ionicons name="lock-closed" size={28} color="#999" /></View>
            <Text style={styles.paywallTitle}>{room.title}</Text>
            <Text style={styles.paywallHost}>by @{room.host_username} · {room.message_count || 0} messages</Text>
            <View style={styles.paywallBanner}>
              <Text style={styles.paywallBannerTitle}>Unlock this archive</Text>
              <Text style={styles.paywallBannerSub}>500 mobcoins · Host gets 50 (10%)</Text>
            </View>
            <TouchableOpacity onPress={handleUnlock} disabled={unlocking} style={[styles.paywallBtn, unlocking && { opacity: 0.5 }]}>
              <Text style={styles.paywallBtnText}>{unlocking ? 'Unlocking...' : 'Unlock for 500 mobcoins'}</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={onBack}><Text style={{ fontSize: 11, color: '#999', fontWeight: 'bold', marginTop: 12 }}>Back to discussions</Text></TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backBtn}><Ionicons name="chevron-back" size={20} color="#111" /></TouchableOpacity>
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <View style={[styles.liveDot, !isLive && styles.liveDotEnded]} />
            <Text style={styles.headerTitle} numberOfLines={1}>{room.title}</Text>
          </View>
          <Text style={styles.headerSub}>
            {isLive ? <><Text style={{ color: '#2563eb', fontWeight: 'bold' }}>{room.participant_count || 0} views</Text> · @{room.host_username}</> : <><Text style={{ color: '#999' }}>Ended</Text> · @{room.host_username}</>}
          </Text>
        </View>
        {/* Menu dots */}
        <TouchableOpacity onPress={() => setShowMenu(!showMenu)} style={{ padding: 6 }}>
          <Ionicons name="ellipsis-vertical" size={16} color="#666" />
        </TouchableOpacity>
      </View>

      {/* Menu modal */}
      <Modal visible={showMenu} transparent animationType="fade">
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setShowMenu(false)}>
          <View style={styles.menuPanel} onStartShouldSetResponder={() => true}>
            {isLive && isHost && (
              <>
                <TouchableOpacity onPress={() => { playClick(); setShowMenu(false); setShowHostPanel(true); }} style={styles.menuItem}>
                  <Ionicons name="settings-outline" size={16} color="#333" /><Text style={styles.menuItemText}>Settings</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => { playClick(); setShowMenu(false); handleEndRoom(); }} style={styles.menuItem}>
                  <Ionicons name="stop-circle-outline" size={16} color="#2563eb" /><Text style={[styles.menuItemText, { color: '#2563eb' }]}>End Room</Text>
                </TouchableOpacity>
              </>
            )}
            {!isLive && isHost && (
              <TouchableOpacity onPress={() => { playClick(); setShowMenu(false); handleDeleteRoom(); }} style={styles.menuItem}>
                <Ionicons name="trash-outline" size={16} color="#2563eb" /><Text style={[styles.menuItemText, { color: '#2563eb' }]}>Delete</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity onPress={() => { playClick(); setShowMenu(false); onBack(); }} style={styles.menuItem}>
              <Ionicons name="exit-outline" size={16} color="#333" /><Text style={styles.menuItemText}>Leave</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {!isLive && (
        <View style={styles.endedBanner}>
          <Text style={styles.endedBannerTitle}>DISCUSSION ENDED</Text>
          <Text style={styles.endedBannerSub}>{room.message_count || 0} messages · {formatDuration(room.duration_seconds || 0)}</Text>
        </View>
      )}

      {pinnedMsg && (
        <View style={styles.pinnedBar}>
          <Ionicons name="pin" size={10} color="#854d0e" style={{ marginRight: 4 }} />
          <Text style={styles.pinnedText} numberOfLines={1}><Text style={{ fontWeight: 'bold' }}>@{pinnedMsg.username}</Text> {pinnedMsg.content}</Text>
        </View>
      )}

      {/* Messages */}
      <FlatList ref={flatListRef} data={messages} keyExtractor={item => item.id} contentContainerStyle={styles.messagesContainer}
        onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
        renderItem={({ item: msg }) => {
          if (msg.message_type === 'system') return <View style={styles.systemMsg}><Text style={styles.systemMsgText}>{msg.content}</Text></View>;
          if (msg.is_deleted) return <View style={styles.systemMsg}><Text style={{ fontSize: 11, color: '#ccc', fontStyle: 'italic' }}>{msg.content}</Text></View>;
          const isOwn = msg.username === currentUser;
          const isMsgHost = msg.username === room.host_username;
          const isGif = msg.content?.includes('giphy.com');
          return (
            <View style={[styles.msgRow, isOwn && styles.msgRowOwn]}>
              {!isOwn && <TouchableOpacity onPress={() => onProfile(msg.username)}><Text style={[styles.msgUser, isMsgHost && styles.msgUserHost]}>@{msg.username}{isMsgHost ? ' HOST' : ''}</Text></TouchableOpacity>}
              {isGif ? (
                <Image source={{ uri: msg.content }} style={styles.gifImage} resizeMode="cover" />
              ) : (
                <View style={[styles.msgBubble, isOwn ? styles.msgBubbleOwn : styles.msgBubbleOther]}>
                  <Text style={[styles.msgText, isOwn && { color: '#fff' }]}>{msg.content}</Text>
                </View>
              )}
              {msg.reactions && Object.keys(msg.reactions).length > 0 && (
                <View style={styles.reactionsRow}>
                  {Object.entries(msg.reactions).map(([emoji, users]) => (
                    <TouchableOpacity key={emoji} onPress={() => isLive && handleReact(msg.id, emoji)} style={styles.reactionChip}>
                      <Text style={styles.reactionText}>{emoji} {users.length}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
              {isLive && (
                <View style={styles.msgActionsRow}>
                  <TouchableOpacity onPress={() => setShowReactPicker(showReactPicker === msg.id ? null : msg.id)}><Text style={styles.msgActionText}>React</Text></TouchableOpacity>
                  {isHost && <TouchableOpacity onPress={() => handlePin(msg.id)}><Text style={styles.msgActionText}>Pin</Text></TouchableOpacity>}
                  {isHost && <TouchableOpacity onPress={() => handleDeleteMessage(msg.id)}><Text style={[styles.msgActionText, { color: '#ef4444' }]}>Delete</Text></TouchableOpacity>}
                  <Text style={styles.msgTime}>{timeAgo(msg.created_at)}</Text>
                </View>
              )}
            </View>
          );
        }}
      />

      {/* React picker */}
      {showReactPicker && (
        <View style={styles.reactPicker}>
          {REACTIONS.map(r => (
            <TouchableOpacity key={r.label} onPress={() => handleReact(showReactPicker, r.emoji)} style={styles.emojiBtn}>
              <Text style={{ fontSize: 18 }}>{r.emoji}</Text>
            </TouchableOpacity>
          ))}
          {isHost && <TouchableOpacity onPress={() => { handlePin(showReactPicker); setShowReactPicker(null); }}><Ionicons name="pin" size={14} color="#999" /></TouchableOpacity>}
        </View>
      )}

      {/* Host panel */}
      <Modal visible={showHostPanel} transparent animationType="fade">
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setShowHostPanel(false)}>
          <View style={styles.hostPanel} onStartShouldSetResponder={() => true}>
            <Text style={styles.hostPanelTitle}>Settings</Text>
            {['open', 'moderated', 'locked'].map(mode => (
              <TouchableOpacity key={mode} onPress={async () => {
                playClick();
                await apiPost(`/api/discussions/room/${roomId}/mode`, { host_username: currentUser, room_mode: mode });
                socketRef.current?.emit('discussion_mode_change', { roomId, room_mode: mode });
                setRoom(prev => prev ? { ...prev, room_mode: mode } : prev);
              }} style={[styles.modeBtn, room.room_mode === mode && styles.modeBtnActive]}>
                <Text style={[styles.modeBtnText, room.room_mode === mode && styles.modeBtnTextActive]}>{mode === 'open' ? 'Open' : mode === 'moderated' ? 'Moderated' : 'Locked'}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Chat bar: menu dots + input + send */}
      {isLive ? (
        <View style={styles.inputRow}>
          {isMuted ? (
            <Text style={{ fontSize: 11, color: '#999', textAlign: 'center', flex: 1, paddingVertical: 10 }}>You are muted</Text>
          ) : room.room_mode === 'locked' && !isHost ? (
            <Text style={{ fontSize: 11, color: '#999', textAlign: 'center', flex: 1, paddingVertical: 10 }}>Room is locked</Text>
          ) : (
            <>
              <TouchableOpacity onPress={() => setShowMenu(true)} style={{ padding: 6 }}>
                <Ionicons name="ellipsis-horizontal" size={18} color="#666" />
              </TouchableOpacity>
              <TextInput style={styles.input} value={input} onChangeText={setInput} placeholder="Message..." placeholderTextColor="#999" />
              <TouchableOpacity onPress={() => setShowGiphy(!showGiphy)} style={{ padding: 6 }}>
                <Text style={{ fontSize: 10, fontWeight: 'bold', color: '#999', borderWidth: 1, borderColor: '#ddd', borderRadius: 4, paddingHorizontal: 4, paddingVertical: 2 }}>GIF</Text>
              </TouchableOpacity>
              {input.trim() ? <TouchableOpacity onPress={() => sendMessage()} style={styles.sendBtn}><Ionicons name="send" size={16} color="#fff" /></TouchableOpacity> : null}
            </>
          )}
        </View>
      ) : (
        <View style={styles.endedInput}>
          <Text style={{ fontSize: 11, fontWeight: 'bold', color: '#999' }}>Discussion has ended</Text>
          <TouchableOpacity onPress={onBack}><Text style={{ fontSize: 11, color: '#2563eb', fontWeight: 'bold', marginTop: 2 }}>Browse more</Text></TouchableOpacity>
        </View>
      )}

      {/* Giphy panel */}
      {showGiphy && (
        <View style={styles.giphyPanel}>
          <View style={styles.giphySearchWrap}>
            <Ionicons name="search" size={14} color="#999" />
            <TextInput style={styles.giphySearchInput} placeholder="Search GIFs..." placeholderTextColor="#999" value={giphyQuery} onChangeText={searchGiphy} autoFocus />
            <TouchableOpacity onPress={() => { setShowGiphy(false); setGiphyQuery(''); setGiphyResults([]); }}><Ionicons name="close-circle" size={16} color="#999" /></TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={styles.giphyGrid}>
            {giphyResults.length === 0 && giphyQuery ? <ActivityIndicator color="#2563eb" style={{ marginTop: 20 }} /> : null}
            {giphyResults.map((gif: any) => (
              <TouchableOpacity key={gif.id} onPress={() => sendGif(gif.images.original.url)} style={styles.giphyItem}>
                <Image source={{ uri: gif.images.fixed_height.url }} style={styles.giphyImage} resizeMode="cover" />
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  header: { flexDirection: 'row', alignItems: 'center', padding: 10, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#eee' },
  backBtn: { marginRight: 6, padding: 4 },
  headerTitle: { fontSize: 14, fontWeight: 'bold', color: '#111', flex: 1 },
  headerSub: { fontSize: 10, color: '#999', marginTop: 1 },
  goLiveBtn: { backgroundColor: '#2563eb', paddingHorizontal: 12, paddingVertical: 5, borderRadius: 16 },
  goLiveText: { color: '#fff', fontSize: 11, fontWeight: 'bold' },

  searchWrap: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', marginHorizontal: 10, marginTop: 8, marginBottom: 4, borderRadius: 10, borderWidth: 1, borderColor: '#eee', paddingHorizontal: 10, paddingVertical: 6 },
  searchInput: { flex: 1, fontSize: 12, color: '#111' },
  pillsWrap: { paddingHorizontal: 10, paddingBottom: 6 },
  pill: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 16, backgroundColor: '#fff', borderWidth: 1, borderColor: '#eee', marginRight: 5 },
  pillActive: { backgroundColor: '#2563eb', borderColor: '#2563eb' },
  pillText: { fontSize: 10, fontWeight: 'bold', color: '#666' },
  pillTextActive: { color: '#fff' },

  roomCard: { backgroundColor: '#fff', marginHorizontal: 10, marginBottom: 4, borderRadius: 10, padding: 10, borderWidth: 1, borderColor: '#f0f0f0' },
  roomCardEnded: { backgroundColor: '#fafafa', borderColor: '#eee' },
  roomRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  liveDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: '#2563eb' },
  liveDotEnded: { backgroundColor: '#ccc' },
  roomTitle: { fontSize: 12, fontWeight: 'bold', color: '#111', flex: 1 },
  endedBadge: { backgroundColor: '#e5e5e5', paddingHorizontal: 5, paddingVertical: 1, borderRadius: 5, marginLeft: 5 },
  endedBadgeText: { fontSize: 8, fontWeight: 'bold', color: '#777' },
  roomHost: { fontSize: 10, color: '#999', marginTop: 1 },
  roomStats: { flexDirection: 'row', gap: 8, marginTop: 3 },
  roomTalking: { fontSize: 10, fontWeight: 'bold', color: '#2563eb' },
  roomDuration: { fontSize: 10, color: '#999' },
  roomMsgs: { fontSize: 10, color: '#ccc' },

  tabsRow: { flexDirection: 'row', marginHorizontal: 10, marginTop: 6, backgroundColor: '#f0f0f0', borderRadius: 8, padding: 2 },
  tabBtn: { flex: 1, paddingVertical: 6, borderRadius: 6, alignItems: 'center' },
  tabBtnActive: { backgroundColor: '#fff', shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 2, elevation: 1 },
  tabText: { fontSize: 11, fontWeight: 'bold', color: '#999' },
  tabTextActive: { color: '#111' },

  archiveBanner: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1a1a1a', marginHorizontal: 10, marginTop: 6, marginBottom: 2, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8, gap: 6 },
  archiveBannerText: { fontSize: 10, color: '#e5e5e5', flex: 1 },

  archiveIcon: { width: 28, height: 28, borderRadius: 8, backgroundColor: '#f0f0f0', alignItems: 'center', justifyContent: 'center' },
  unlockBtn: { backgroundColor: '#eab308', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8 },
  unlockBtnText: { color: '#fff', fontSize: 10, fontWeight: 'bold' },

  paywallCard: { backgroundColor: '#fff', borderRadius: 16, padding: 20, width: '100%', maxWidth: 320, alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  paywallIcon: { width: 56, height: 56, borderRadius: 28, backgroundColor: '#f5f5f5', alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  paywallTitle: { fontSize: 15, fontWeight: 'bold', color: '#111', textAlign: 'center' },
  paywallHost: { fontSize: 11, color: '#999', marginTop: 4, textAlign: 'center' },
  paywallBanner: { backgroundColor: '#fefce8', borderWidth: 1, borderColor: '#fef08a', borderRadius: 10, padding: 10, width: '100%', marginTop: 16, alignItems: 'center' },
  paywallBannerTitle: { fontSize: 12, fontWeight: 'bold', color: '#854d0e' },
  paywallBannerSub: { fontSize: 10, color: '#a16207', marginTop: 2 },
  paywallBtn: { backgroundColor: '#eab308', paddingVertical: 12, borderRadius: 12, width: '100%', alignItems: 'center', marginTop: 14 },
  paywallBtnText: { color: '#fff', fontSize: 12, fontWeight: 'bold' },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { backgroundColor: '#fff', borderRadius: 16, padding: 16, width: '85%' },
  modalTitle: { fontSize: 14, fontWeight: 'bold', color: '#111', marginBottom: 10 },
  modalInput: { borderWidth: 1, borderColor: '#eee', borderRadius: 10, padding: 10, fontSize: 12, color: '#111', backgroundColor: '#fafafa', marginBottom: 8 },
  catPicker: { flexDirection: 'row', flexWrap: 'wrap', gap: 5, marginBottom: 10 },
  catPill: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12, backgroundColor: '#f5f5f5', borderWidth: 1, borderColor: '#eee' },
  catPillActive: { backgroundColor: '#2563eb', borderColor: '#2563eb' },
  catPillText: { fontSize: 10, fontWeight: 'bold', color: '#666' },
  catPillTextActive: { color: '#fff' },
  modalBtns: { flexDirection: 'row', gap: 8 },
  modalCancelBtn: { flex: 1, paddingVertical: 10, backgroundColor: '#f5f5f5', borderRadius: 10, alignItems: 'center' },
  modalCancelText: { fontSize: 12, fontWeight: 'bold', color: '#666' },
  modalGoBtn: { flex: 1, paddingVertical: 10, backgroundColor: '#2563eb', borderRadius: 10, alignItems: 'center' },
  modalGoText: { fontSize: 12, fontWeight: 'bold', color: '#fff' },

  endedBanner: { paddingVertical: 8, backgroundColor: '#f5f5f5', borderBottomWidth: 1, borderBottomColor: '#eee', alignItems: 'center' },
  endedBannerTitle: { fontSize: 10, fontWeight: 'bold', color: '#999' },
  endedBannerSub: { fontSize: 9, color: '#bbb', marginTop: 1 },
  pinnedBar: { flexDirection: 'row', alignItems: 'center', paddingVertical: 6, paddingHorizontal: 10, backgroundColor: '#fefce8', borderBottomWidth: 1, borderBottomColor: '#fef08a' },
  pinnedText: { fontSize: 11, color: '#854d0e', flex: 1 },

  messagesContainer: { padding: 10, paddingBottom: 6 },
  systemMsg: { alignItems: 'center', paddingVertical: 4 },
  systemMsgText: { fontSize: 10, color: '#999', backgroundColor: '#f0f0f0', paddingHorizontal: 10, paddingVertical: 3, borderRadius: 16, overflow: 'hidden' },
  msgRow: { marginBottom: 8 },
  msgRowOwn: { alignItems: 'flex-end' },
  msgUser: { fontSize: 10, fontWeight: 'bold', color: '#666', marginBottom: 1, marginLeft: 4 },
  msgUserHost: { color: '#2563eb' },
  msgBubble: { maxWidth: '78%', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16 },
  msgBubbleOther: { backgroundColor: '#f0f0f0', borderBottomLeftRadius: 4 },
  msgBubbleOwn: { backgroundColor: '#2563eb', borderBottomRightRadius: 4 },
  msgText: { fontSize: 13, color: '#111', lineHeight: 18 },
  gifImage: { width: 150, height: 100, borderRadius: 10 },
  reactionsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 3, marginTop: 3 },
  reactionChip: { backgroundColor: '#f0f0f0', borderRadius: 10, paddingHorizontal: 6, paddingVertical: 1, borderWidth: 1, borderColor: '#eee' },
  reactionText: { fontSize: 11 },
  msgActionsRow: { flexDirection: 'row', gap: 8, marginTop: 2, marginLeft: 4 },
  msgActionText: { fontSize: 9, color: '#ccc' },
  msgTime: { fontSize: 9, color: '#ccc' },

  reactPicker: { flexDirection: 'row', flexWrap: 'wrap', backgroundColor: '#fff', borderRadius: 12, padding: 6, marginHorizontal: 10, marginBottom: 6, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 6, elevation: 3, gap: 2, alignItems: 'center' },
  emojiBtn: { width: 34, height: 34, alignItems: 'center', justifyContent: 'center', borderRadius: 8 },

  inputRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#eee', paddingHorizontal: 8, paddingVertical: 6 },
  input: { flex: 1, fontSize: 13, color: '#111', backgroundColor: '#f5f5f5', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6 },
  sendBtn: { marginLeft: 6, width: 30, height: 30, borderRadius: 15, backgroundColor: '#2563eb', alignItems: 'center', justifyContent: 'center' },
  endedInput: { borderTopWidth: 1, borderTopColor: '#eee', backgroundColor: '#fafafa', paddingVertical: 10, alignItems: 'center' },

  menuPanel: { backgroundColor: '#fff', borderRadius: 14, padding: 6, width: 180, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 8, elevation: 4 },
  menuItem: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, paddingVertical: 10, borderRadius: 8 },
  menuItemText: { fontSize: 12, fontWeight: '600', color: '#333' },

  hostPanel: { backgroundColor: '#fff', borderRadius: 16, padding: 14, width: 220, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 8, elevation: 4 },
  hostPanelTitle: { fontSize: 12, fontWeight: 'bold', color: '#111', marginBottom: 8 },
  modeBtn: { paddingVertical: 8, paddingHorizontal: 10, borderRadius: 10, borderWidth: 1, borderColor: '#eee', marginBottom: 5 },
  modeBtnActive: { backgroundColor: '#fef2f2', borderColor: '#2563eb' },
  modeBtnText: { fontSize: 11, fontWeight: '600', color: '#333' },
  modeBtnTextActive: { color: '#2563eb' },

  giphyPanel: { position: 'absolute', bottom: 56, left: 10, right: 10, backgroundColor: '#fff', borderRadius: 12, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 8, elevation: 4, maxHeight: 260 },
  giphySearchWrap: { flexDirection: 'row', alignItems: 'center', padding: 8, borderBottomWidth: 1, borderBottomColor: '#eee', gap: 6 },
  giphySearchInput: { flex: 1, fontSize: 12, color: '#111' },
  giphyGrid: { flexDirection: 'row', flexWrap: 'wrap', padding: 4 },
  giphyItem: { width: '33.33%', aspectRatio: 1, padding: 2 },
  giphyImage: { width: '100%', height: '100%', borderRadius: 6 },
});
