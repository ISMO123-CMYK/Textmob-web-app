import React, { useState, useEffect, useRef } from 'react';
import { View, Text, FlatList, TextInput, TouchableOpacity, StyleSheet, Modal, ActivityIndicator, RefreshControl, Image, ScrollView, Share, KeyboardAvoidingView, Keyboard, Platform } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { apiGet, apiPost, API_BASE_URL } from '../../api/client';
import { playClick } from '../../utils/sound';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import * as ImagePicker from 'expo-image-picker';
import io from 'socket.io-client';

const GIPHY_API_KEY = '1PsuVrcwCRiOYQEfqgPOd9kVuoRmuhai';
const GIPHY_API_BASE = 'https://api.giphy.com/v1/gifs';
const DEFAULT_PIC = 'https://api.dicebear.com/10.x/adventurer-neutral/png?seed=textmob&backgroundColor=18181b';
// Exact same categories as desktop — no emojis on desktop
const CATEGORIES = ['all', 'general', 'football', 'technology', 'music', 'politics', 'religion', 'entertainment', 'gaming', 'business', 'education'];
// Exact same 10 reaction emojis as desktop Discussions.jsx
const REACTION_EMOJIS = ['❤️', '🔥', '😂', '👍', '😮', '😢', '👏', '🙏', '💯', '😍'];

function timeAgo(d: string | null) { if (!d) return ''; const diff = Date.now() - new Date(d).getTime(); const mins = Math.floor(diff / 60000); if (mins < 1) return 'now'; if (mins < 60) return `${mins}m`; const hrs = Math.floor(mins / 60); if (hrs < 24) return `${hrs}h`; return `${Math.floor(hrs / 24)}d`; }
function formatDuration(secs: number) { if (!secs) return '0m'; const h = Math.floor(secs / 3600); const m = Math.floor((secs % 3600) / 60); return h > 0 ? `${h}h ${m}m` : `${m}m`; }

// Markdown renderer — mirrors desktop renderMarkdown() (bold / italic / code / strike / links)
function renderMarkdownText(text: string): React.ReactNode[] {
  if (!text) return [];
  const parts: React.ReactNode[] = [];
  const regex = /(\*\*(.+?)\*\*|__(.+?)__|\*(.+?)\*|_(.+?)_|`(.+?)`|~~(.+?)~~|(https?:\/\/[^\s]+))/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let k = 0;
  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) parts.push(<Text key={`t${k++}`} style={styles.mdPlain}>{text.slice(lastIndex, match.index)}</Text>);
    if (match[2] || match[3]) parts.push(<Text key={`t${k++}`} style={styles.mdBold}>{match[2] || match[3]}</Text>);
    else if (match[4] || match[5]) parts.push(<Text key={`t${k++}`} style={styles.mdItalic}>{match[4] || match[5]}</Text>);
    else if (match[6]) parts.push(<Text key={`t${k++}`} style={styles.mdCode}>{match[6]}</Text>);
    else if (match[7]) parts.push(<Text key={`t${k++}`} style={styles.mdStrike}>{match[7]}</Text>);
    else if (match[8]) parts.push(<Text key={`t${k++}`} style={styles.mdLink}>{match[8]}</Text>);
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < text.length) parts.push(<Text key={`t${k++}`} style={styles.mdPlain}>{text.slice(lastIndex)}</Text>);
  return parts.length > 0 ? parts : [<Text key="t0" style={styles.mdPlain}>{text}</Text>];
}

interface Room { id: string; title: string; description?: string; host_username: string; category?: string; room_mode?: string; status: string; participant_count?: number; message_count?: number; duration_seconds?: number; ended_at?: string; muted_users?: string[]; archive_post_id?: string; created_at: string; pinned_message_id?: string; unlocked?: boolean; }
interface Msg { id: string; room_id: string; username: string; content: string; message_type: string; media_url?: string; gif_url?: string; profile_pic?: string; reply_to_id?: string | null; is_pinned?: boolean; is_deleted?: boolean; reactions?: Record<string, string[]>; reaction_count?: number; created_at: string; }

type Props = { onBack: () => void; onProfile: (u: string) => void; roomId?: string; };

export default function DiscussionsScreen({ onBack, onProfile, roomId }: Props) {
  const { colors } = useTheme();
  if (roomId) return <RoomView roomId={roomId} onBack={onBack} onProfile={onProfile} colors={colors} />;
  return <ListView onBack={onBack} onProfile={onProfile} colors={colors} />;
}

function ListView({ onBack, onProfile, colors }: { onBack: () => void; onProfile: (u: string) => void; colors: any }) {
  const { username: currentUser } = useAuth();
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
  const [hostPics, setHostPics] = useState<Record<string, string>>({});
  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const loadTab = async () => {
    try {
      if (tab === 'active') {
        const url = category === 'all' ? '/api/discussions/active?limit=50' : `/api/discussions/active?category=${category}&limit=50`;
        const res = await apiGet(url);
        setRooms(Array.isArray(res.data) ? res.data : []);
      } else if (tab === 'archives') {
        const res = await apiGet('/api/discussions/archives?limit=50');
        setArchives(Array.isArray(res.data) ? res.data : []);
      } else if (tab === 'my-archive' && currentUser) {
        const res = await apiGet(`/api/discussions/my-archive?username=${currentUser}`);
        setMyArchives(Array.isArray(res.data) ? res.data : []);
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
      try { const res = await apiGet(`/api/discussions/search?q=${encodeURIComponent(val.trim())}&limit=30`); setSearchResults(Array.isArray(res.data) ? res.data : []); } catch { setSearchResults([]); }
      setLoading(false);
    }, 300);
  };

  const displayRooms = searchResults !== null ? searchResults : (tab === 'active' ? rooms : tab === 'archives' ? archives : myArchives);

  // Fetch host profile pics — same as desktop
  useEffect(() => {
    const hosts = [...new Set(displayRooms.map(r => r.host_username))];
    hosts.forEach(h => {
      if (!h || hostPics[h]) return;
      apiGet(`/profile-pic/${h}`).then(r => {
        const pic = (r.data as any)?.profile_pic;
        if (pic) setHostPics(prev => ({ ...prev, [h]: pic }));
      }).catch(() => {});
    });
  }, [displayRooms]);

  const handleDelete = async (id: string) => {
    try { await apiPost(`/api/discussions/room/${id}/delete`, { username: currentUser }); setArchives(prev => prev.filter(r => r.id !== id)); setMyArchives(prev => prev.filter(r => r.id !== id)); if (searchResults) setSearchResults(prev => prev ? prev.filter(r => r.id !== id) : null); } catch {}
  };

  const handleUnlock = async (rid: string) => {
    if (!currentUser) return;
    setUnlocking(rid);
    try {
      const res = await apiPost(`/api/discussions/room/${rid}/unlock`, { username: currentUser });
      if ((res.data as any)?.unlocked) { onProfile(rid); }
    } catch {}
    setUnlocking(null);
  };

  const renderRoomCard = ({ item: room }: { item: Room }) => {
    // Archives tab — locked cards exactly like desktop
    if (tab === 'archives' && searchResults === null) {
      return (
        <View style={styles.roomCard}>
          <View style={styles.roomRow}>
            <View style={styles.archiveIcon}>
              <Ionicons name="lock-closed-outline" size={20} color="#9ca3af" />
            </View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={styles.roomTitle} numberOfLines={1}>{room.title}</Text>
              <Text style={styles.roomHost}>@{room.host_username} · {room.message_count || 0} messages</Text>
            </View>
            {room.unlocked ? (
              <TouchableOpacity onPress={() => { playClick(); onProfile(room.id); }} style={styles.viewBtn}>
                <Text style={styles.viewBtnText}>View</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity onPress={() => { playClick(); handleUnlock(room.id); }} disabled={unlocking === room.id} style={[styles.unlockBtn, unlocking === room.id && { opacity: 0.5 }]}>
                <Text style={styles.unlockBtnText}>{unlocking === room.id ? '...' : '500'}</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      );
    }
    // Active / my-archive / search — host-pic cards exactly like desktop
    return (
      <TouchableOpacity style={styles.roomCard} activeOpacity={0.7} onPress={() => { playClick(); onProfile(room.id); }}>
        <View style={styles.roomRowTop}>
          <View>
            <Image source={{ uri: hostPics[room.host_username] || DEFAULT_PIC }} style={styles.hostAvatar} />
            {room.status === 'live' && <View style={styles.liveDotOnAvatar} />}
          </View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Text style={styles.roomTitle} numberOfLines={1}>{room.title}</Text>
              {room.room_mode && room.room_mode !== 'open' && (
                <Ionicons name="lock-closed-outline" size={14} color="#d1d5db" />
              )}
            </View>
            <Text style={styles.roomHost}>@{room.host_username}</Text>
            {!!room.description && <Text style={styles.roomDesc} numberOfLines={1}>{room.description}</Text>}
            <View style={styles.roomStatsRow}>
              {!!room.category && (
                <View style={styles.catBadge}><Text style={styles.catBadgeText}>{room.category}</Text></View>
              )}
              <View style={styles.statItem}>
                <Ionicons name="eye-outline" size={12} color="#d1d5db" />
                <Text style={styles.statText}>{room.participant_count || 0}</Text>
              </View>
              <View style={styles.statItem}>
                <Ionicons name="document-text-outline" size={12} color="#d1d5db" />
                <Text style={styles.statText}>{room.message_count || 0}</Text>
              </View>
            </View>
          </View>
          <View style={{ flexShrink: 0 }}>
            {room.status === 'live' ? (
              <View style={styles.liveBadge}><Text style={styles.liveBadgeText}>LIVE</Text></View>
            ) : (
              <Text style={styles.timeAgoText}>{timeAgo(room.ended_at || room.created_at)}</Text>
            )}
          </View>
        </View>
        {tab === 'my-archive' && currentUser === room.host_username && (
          <View style={{ alignItems: 'flex-end', marginTop: 8 }}>
            <TouchableOpacity onPress={() => handleDelete(room.id)}>
              <Text style={styles.deleteText}>Delete</Text>
            </TouchableOpacity>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      {/* Header — back + Discussions + Start (mirrors desktop mobile header) */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={20} color="#6b7280" />
        </TouchableOpacity>
        <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Text style={styles.headerTitle}>Discussions</Text>
          <View style={styles.pulseDot} />
        </View>
        {currentUser ? (
          <TouchableOpacity onPress={() => { playClick(); setShowCreate(true); }} style={styles.startBtn}>
            <Text style={styles.startBtnText}>Start</Text>
          </TouchableOpacity>
        ) : <View style={{ width: 50 }} />}
      </View>

      {/* Tabs — Active / Archives / My Archive */}
      <View style={styles.tabsOuter}>
        <View style={styles.tabsRow}>
          {(['active', 'archives', 'my-archive'] as const).map(t => (
            <TouchableOpacity key={t} onPress={() => { playClick(); setTab(t); setSearch(''); setSearchResults(null); }} style={[styles.tabBtn, tab === t && styles.tabBtnActive]}>
              <Text style={[styles.tabText, tab === t && styles.tabTextActive]}>{t === 'active' ? 'Active' : t === 'archives' ? 'Archives' : 'My Archive'}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Search — "Search discussions" like desktop */}
      <View style={styles.searchOuter}>
        <View style={styles.searchWrap}>
          <Ionicons name="search-outline" size={14} color="#9ca3af" style={{ marginRight: 6 }} />
          <TextInput style={styles.searchInput} placeholder="Search discussions" placeholderTextColor="#9ca3af" value={search} onChangeText={handleSearch} />
          {search ? <TouchableOpacity onPress={() => handleSearch('')}><Ionicons name="close" size={14} color="#9ca3af" /></TouchableOpacity> : null}
        </View>
      </View>

      {/* Categories — no emojis, like desktop */}
      {tab === 'active' && !search.trim() && (
        <FlatList horizontal data={CATEGORIES} keyExtractor={c => c} showsHorizontalScrollIndicator={false} style={{ flexGrow: 0 }} contentContainerStyle={styles.pillsWrap}
          renderItem={({ item: cat }) => (
            <TouchableOpacity onPress={() => { playClick(); setCategory(cat); }} style={[styles.pill, category === cat && styles.pillActive]}>
              <Text numberOfLines={1} style={[styles.pillText, category === cat && styles.pillTextActive]}>{cat.charAt(0).toUpperCase() + cat.slice(1)}</Text>
            </TouchableOpacity>
          )}
        />
      )}

      {/* Archive banner — gray-900 like desktop */}
      {tab === 'archives' && (
        <View style={styles.archiveBannerOuter}>
          <View style={styles.archiveBanner}>
            <Ionicons name="wallet-outline" size={20} color="#facc15" />
            <Text style={styles.archiveBannerText}>Unlock archived discussions for <Text style={{ color: '#facc15', fontWeight: 'bold' }}>500 mobcoins</Text>. Host gets 10%.</Text>
          </View>
        </View>
      )}

      {loading ? (
        <View style={{ alignItems: 'center', paddingTop: 80 }}><ActivityIndicator color="#2563eb" /></View>
      ) : (
        <FlatList data={displayRooms} keyExtractor={item => item.id} contentContainerStyle={{ paddingBottom: 100, paddingTop: 4 }}
          ListEmptyComponent={
            <View style={{ alignItems: 'center', paddingTop: 80, gap: 12 }}>
              <Ionicons name="chatbubbles-outline" size={48} color="#e5e7eb" />
              <Text style={{ fontSize: 14, fontWeight: '600', color: '#9ca3af' }}>
                {tab === 'active' ? (search ? 'No results' : 'No active discussions') : tab === 'archives' ? 'No archived discussions' : 'No discussions in your archive'}
              </Text>
            </View>
          }
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadTab(); }} />}
          renderItem={renderRoomCard}
        />
      )}

      <Modal visible={showCreate} transparent animationType="fade">
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setShowCreate(false)}>
          <View style={styles.createCard} onStartShouldSetResponder={() => true}>
            <Text style={styles.createTitle}>Start a Discussion</Text>
            <CreateRoomForm onClose={() => setShowCreate(false)} onCreated={(id) => { setShowCreate(false); loadTab(); onProfile(id); }} />
          </View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}

function CreateRoomForm({ onClose, onCreated }: { onClose: () => void; onCreated: (id: string) => void }) {
  const { username: currentUser } = useAuth();
  const [title, setTitle] = useState('');
  const [desc, setDesc] = useState('');
  const [cat, setCat] = useState('general');
  const [loading, setLoading] = useState(false);
  const handleCreate = async () => {
    if (!title.trim()) return; setLoading(true);
    try { const res = await apiPost('/api/discussions/create', { username: currentUser, title: title.trim(), description: desc.trim(), category: cat }); const id = (res.data as any)?.id; if (id) onCreated(id); } catch {}
    setLoading(false);
  };
  return (
    <View>
      <TextInput style={styles.createInput} placeholder="Room title" placeholderTextColor="#9ca3af" value={title} onChangeText={t => setTitle(t.slice(0, 120))} maxLength={120} />
      <TextInput style={[styles.createInput, { height: 64, textAlignVertical: 'top' }]} placeholder="What's the discussion about?" placeholderTextColor="#9ca3af" value={desc} onChangeText={t => setDesc(t.slice(0, 500))} maxLength={500} multiline />
      <View style={styles.catPicker}>
        {CATEGORIES.filter(c => c !== 'all').map(c => (
          <TouchableOpacity key={c} onPress={() => setCat(c)} style={[styles.catPill, cat === c && styles.catPillActive]}>
            <Text style={[styles.catPillText, cat === c && styles.catPillTextActive]}>{c.charAt(0).toUpperCase() + c.slice(1)}</Text>
          </TouchableOpacity>
        ))}
      </View>
      <View style={styles.createBtns}>
        <TouchableOpacity onPress={onClose} style={styles.createCancelBtn}><Text style={styles.createCancelText}>Cancel</Text></TouchableOpacity>
        <TouchableOpacity onPress={handleCreate} disabled={!title.trim() || loading} style={[styles.createGoBtn, (!title.trim() || loading) && { opacity: 0.5 }]}>
          <Text style={styles.createGoText}>{loading ? 'Starting...' : 'Go Live'}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

function RoomView({ roomId, onBack, onProfile, colors }: { roomId: string; onBack: () => void; onProfile: (u: string) => void; colors: any }) {
  const { username: currentUser } = useAuth();
  const [room, setRoom] = useState<Room | null>(null);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState('');
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [unlocked, setUnlocked] = useState(false);
  const [unlocking, setUnlocking] = useState(false);
  const [showReactPicker, setShowReactPicker] = useState<string | null>(null);
  const [showMenu, setShowMenu] = useState(false);
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
  const flatListRef = useRef<FlatList>(null);
  const inputRef = useRef<TextInput>(null);
  const typingTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const giphyTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mentionTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const socketRef = useRef<any>(null);

  // Track keyboard so the chat bar sits above it on every phone (iOS + Android,
  // notch / gesture nav / 3-button nav) and the list scrolls to the newest msg.
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

  const isHost = room !== null && room.host_username === currentUser;
  const isMuted = room !== null && (room.muted_users || []).includes(currentUser || '');
  const isLive = room !== null && room.status === 'live';
  const isArchived = room !== null && room.status === 'ended';
  const canView = isLive || unlocked || isHost;

  // Fetch room + unlock + initial messages (mirrors desktop)
  useEffect(() => {
    (async () => {
      try {
        const roomRes = await apiGet(`/api/discussions/room/${roomId}`);
        const roomData = roomRes.data as Room | null;
        if (roomData && (roomData as any)?.id) {
          setRoom(roomData);
          if (roomData.status === 'ended' && roomData.host_username !== currentUser) {
            try {
              const dRes = await apiGet(`/api/discussions/room/${roomId}/check-unlock?username=${currentUser}`);
              setUnlocked(!!(dRes.data as any)?.unlocked);
            } catch { setUnlocked(false); }
          } else {
            setUnlocked(true);
          }
          const msgsRes = await apiGet(`/api/discussions/room/${roomId}/messages?limit=50`);
          if (Array.isArray(msgsRes.data)) {
            setMessages(msgsRes.data as Msg[]);
            setHasMore((msgsRes.data as Msg[]).length >= 50);
          }
        }
      } catch {}
      setLoading(false);
    })();
  }, [roomId]);

  const loadMoreMessages = async () => {
    if (loadingMore || !hasMore || messages.length === 0) return;
    setLoadingMore(true);
    try {
      const oldest = messages[0];
      const res = await apiGet(`/api/discussions/room/${roomId}/messages?limit=30&before=${encodeURIComponent(oldest.created_at)}&before_id=${oldest.id}`);
      const data = res.data as Msg[];
      if (Array.isArray(data) && data.length > 0) {
        setMessages(prev => {
          const ids = new Set(prev.map(m => m.id));
          const fresh = data.filter(m => !ids.has(m.id));
          return [...fresh, ...prev];
        });
        setHasMore(data.length >= 30);
      } else {
        setHasMore(false);
      }
    } catch {}
    setLoadingMore(false);
  };

  // Socket — mirrors desktop events
  useEffect(() => {
    if (!roomId || !currentUser || !canView) return;
    const socket = io(API_BASE_URL, { transports: ['websocket', 'polling'] });
    socketRef.current = socket;
    socket.emit('join_discussion', { roomId, username: currentUser });
    socket.emit('join_user', { username: currentUser });

    const onMessage = (msg: Msg) => {
      setMessages(prev => {
        if (prev.some(m => m.id === msg.id)) return prev;
        return [...prev, msg];
      });
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
    };
    const onTyping = ({ username }: any) => {
      if (username === currentUser) return;
      setTypingUsers(prev => (!prev.includes(username) ? [...prev, username] : prev));
    };
    const onStopTyping = ({ username }: any) => {
      if (username === currentUser) return;
      setTypingUsers(prev => prev.filter(u => u !== username));
    };
    const onReaction = ({ message_id, reactions, reaction_count }: any) => {
      setMessages(prev => prev.map(m => m.id === message_id ? { ...m, reactions, reaction_count } : m));
    };
    const onPin = ({ pinned_message_id }: any) => setRoom(prev => prev ? { ...prev, pinned_message_id } : prev);
    const onModeChange = ({ room_mode }: any) => setRoom(prev => prev ? { ...prev, room_mode } : prev);
    const onRemoved = ({ username: u }: any) => { if (u === currentUser) onBack(); };
    const onEnded = ({ duration }: any) => {
      setRoom(prev => prev ? { ...prev, status: 'ended', ended_at: new Date().toISOString(), duration_seconds: duration || 0, participant_count: 0 } : prev);
    };
    const onDeleteMsg = ({ message_id }: any) => setMessages(prev => prev.filter(m => m.id !== message_id));
    const onRoomUpdate = (data: any) => setRoom(prev => prev ? { ...prev, ...data } : prev);

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
    };
  }, [roomId, currentUser, canView]);

  // Clear typing after 3s — like desktop
  useEffect(() => {
    if (typingUsers.length === 0) return;
    const t = setTimeout(() => setTypingUsers([]), 3000);
    return () => clearTimeout(t);
  }, [typingUsers]);

  // Fetch profile pics + verified for message authors — like desktop
  useEffect(() => {
    const users = [...new Set(messages.filter(m => m.message_type !== 'system').map(m => m.username))];
    users.forEach(u => {
      if (!u || profilePics[u]) return;
      apiGet(`/profile-pic/${u}`).then(r => {
        const d = r.data as any;
        if (d?.profile_pic) setProfilePics(prev => ({ ...prev, [u]: d.profile_pic }));
        if (d?.verified !== undefined) setUserVerified(prev => ({ ...prev, [u]: !!d.verified }));
      }).catch(() => {});
    });
  }, [messages]);

  useEffect(() => {
    if (messages.length > 0 && !loadingMore) {
      const t = setTimeout(() => flatListRef.current?.scrollToEnd({ animated: false }), 300);
      return () => clearTimeout(t);
    }
  }, []);

  const handleUnlock = async () => {
    if (!currentUser) return;
    setUnlocking(true);
    try {
      const res = await apiPost(`/api/discussions/room/${roomId}/unlock`, { username: currentUser });
      if ((res.data as any)?.unlocked) setUnlocked(true);
    } catch {}
    setUnlocking(false);
  };

  const sendMessage = async (content?: string, mediaUrl?: string) => {
    const text = (content ?? input).trim();
    if ((!text && !mediaUrl) || !currentUser || !isLive) return;
    const currentReplyTo = replyTo;
    setInput(''); setImagePreview(null); setShowGiphy(false); setGiphyQuery(''); setGiphyResults([]); setReplyTo(null); setMentionQuery(null); setMentionResults([]);
    socketRef.current?.emit('discussion_stop_typing', { roomId, username: currentUser });
    try {
      const body: any = { username: currentUser };
      if (mediaUrl) { body.content = mediaUrl; body.message_type = 'image'; }
      else { body.content = text; }
      if (currentReplyTo) body.reply_to_id = currentReplyTo.id;
      const res = await apiPost(`/api/discussions/room/${roomId}/send`, body);
      const msg = res.data as Msg;
      if (msg && (msg as any)?.id) socketRef.current?.emit('discussion_message', { roomId, ...msg });
    } catch {}
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
    const replaced = input.replace(/@\w*$/, `@${username} `);
    setInput(replaced);
    setMentionQuery(null);
    setMentionResults([]);
  };

  const handleReact = async (messageId: string, emoji: string) => {
    setShowReactPicker(null);
    try {
      const res = await apiPost(`/api/discussions/room/${roomId}/react`, { message_id: messageId, username: currentUser, emoji });
      if (res.data) socketRef.current?.emit('discussion_reaction', { roomId, message_id: messageId, ...(res.data as any) });
    } catch {}
  };

  const handlePin = async (messageId: string) => {
    if (!isHost) return;
    try {
      const res = await apiPost(`/api/discussions/room/${roomId}/pin`, { host_username: currentUser, message_id: messageId });
      if (res.data) socketRef.current?.emit('discussion_pin', { roomId, ...(res.data as any) });
    } catch {}
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
    try {
      const res = await apiPost(`/api/discussions/room/${roomId}/end`, { username: currentUser });
      setRoom(prev => prev ? { ...prev, status: 'ended', ended_at: new Date().toISOString(), duration_seconds: (res.data as any)?.duration || 0, participant_count: 0 } : prev);
    } catch {}
  };

  const handleDeleteRoom = async () => {
    if (!isHost) return;
    try { await apiPost(`/api/discussions/room/${roomId}/delete`, { username: currentUser }); onBack(); } catch {}
  };

  const handleShareLink = async () => {
    setShowMenu(false);
    try { await Share.share({ message: `https://textmob.web.app/discussions/${roomId}` }); } catch {}
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
    const idx = messages.findIndex(m => m.id === id);
    if (idx >= 0) {
      try { flatListRef.current?.scrollToIndex({ index: idx, viewPosition: 0.5, animated: true }); } catch {
        flatListRef.current?.scrollToEnd({ animated: true });
      }
    }
  };

  const pinnedMsg = room?.pinned_message_id ? messages.find(m => m.id === room.pinned_message_id) : null;

  if (loading) return <SafeAreaView style={styles.container}><View style={{ alignItems: 'center', paddingTop: 80 }}><ActivityIndicator color="#2563eb" /></View></SafeAreaView>;
  if (!room) return (
    <SafeAreaView style={styles.container}>
      <View style={{ alignItems: 'center', paddingTop: 80, gap: 12 }}>
        <Ionicons name="chatbubbles-outline" size={48} color="#e5e7eb" />
        <Text style={{ fontSize: 14, fontWeight: '600', color: '#9ca3af' }}>Discussion not found</Text>
        <TouchableOpacity onPress={onBack}><Text style={{ fontSize: 14, color: '#2563eb', fontWeight: 'bold' }}>Browse discussions</Text></TouchableOpacity>
      </View>
    </SafeAreaView>
  );

  // Archive paywall — mirrors desktop
  if (isArchived && !canView) {
    return (
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onBack} style={styles.backBtn}><Ionicons name="arrow-back" size={20} color="#6b7280" /></TouchableOpacity>
          <Text style={styles.headerTitle} numberOfLines={1}>Discussions</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 16 }}>
          <View style={styles.paywallCard}>
            <View style={styles.paywallIcon}><Ionicons name="lock-closed-outline" size={28} color="#9ca3af" /></View>
            <Text style={styles.paywallTitle}>{room.title}</Text>
            <Text style={styles.paywallHost}>by @{room.host_username} · {room.message_count || 0} messages</Text>
            <View style={styles.paywallBanner}>
              <Text style={styles.paywallBannerTitle}>Unlock this archive</Text>
              <Text style={styles.paywallBannerSub}>500 mobcoins · Host gets 50 (10%)</Text>
            </View>
            <TouchableOpacity onPress={handleUnlock} disabled={unlocking} style={[styles.paywallBtn, unlocking && { opacity: 0.5 }]}>
              <Text style={styles.paywallBtnText}>{unlocking ? 'Unlocking...' : 'Unlock for 500 mobcoins'}</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={onBack}><Text style={{ fontSize: 12, color: '#9ca3af', fontWeight: '600', marginTop: 16 }}>Back to discussions</Text></TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  // Bottom inset is handled manually on the chat bar (insets.bottom when the
  // keyboard is closed, lifted by KeyboardAvoidingView when open) so the input
  // is never hidden behind the keyboard, home indicator or Android nav bar.
  const chatBarBottomPad = keyboardOpen ? 12 : Math.max(insets.bottom, 12);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header — dot + title + subtitle + menu (mirrors desktop) */}
      <View style={styles.roomHeader}>
        <TouchableOpacity onPress={onBack} style={styles.backBtn}><Ionicons name="arrow-back" size={20} color="#6b7280" /></TouchableOpacity>
        <View style={{ flex: 1, minWidth: 0 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <View style={[styles.headerDot, !isLive && styles.headerDotEnded]} />
            <Text style={styles.roomHeaderTitle} numberOfLines={1}>{room.title}</Text>
          </View>
          <Text style={styles.roomHeaderSub} numberOfLines={1}>
            {isLive ? (
              <><Text style={{ color: '#2563eb', fontWeight: '700' }}>{room.participant_count || 0} views</Text><Text style={{ color: '#9ca3af' }}> · @{room.host_username}{room.room_mode && room.room_mode !== 'open' ? ` · ${room.room_mode}` : ''}</Text></>
            ) : (
              <Text style={{ color: '#9ca3af' }}>Ended{room.duration_seconds ? ` · ${formatDuration(room.duration_seconds)}` : ''} · @{room.host_username}</Text>
            )}
          </Text>
        </View>
        <TouchableOpacity onPress={() => setShowMenu(true)} style={{ padding: 8 }}>
          <Ionicons name="ellipsis-vertical" size={18} color="#9ca3af" />
        </TouchableOpacity>
      </View>

      {/* Menu dropdown — Copy link / Settings / End Room / Delete / Leave */}
      <Modal visible={showMenu} transparent animationType="fade">
        <TouchableOpacity style={styles.menuOverlay} activeOpacity={1} onPress={() => setShowMenu(false)}>
          <View style={styles.menuPanel} onStartShouldSetResponder={() => true}>
            <TouchableOpacity onPress={handleShareLink} style={styles.menuItem}>
              <Ionicons name="link-outline" size={16} color="#374151" /><Text style={styles.menuItemText}>Copy link</Text>
            </TouchableOpacity>
            {isLive && isHost && (
              <>
                <TouchableOpacity onPress={() => { playClick(); setShowMenu(false); setShowHostPanel(true); }} style={styles.menuItem}>
                  <Ionicons name="settings-outline" size={16} color="#374151" /><Text style={styles.menuItemText}>Settings</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => { playClick(); setShowMenu(false); handleEndRoom(); }} style={styles.menuItem}>
                  <Ionicons name="stop-circle-outline" size={16} color="#ef4444" /><Text style={[styles.menuItemText, { color: '#ef4444' }]}>End Room</Text>
                </TouchableOpacity>
              </>
            )}
            {!isLive && isHost && (
              <TouchableOpacity onPress={() => { playClick(); setShowMenu(false); handleDeleteRoom(); }} style={styles.menuItem}>
                <Ionicons name="trash-outline" size={16} color="#ef4444" /><Text style={[styles.menuItemText, { color: '#ef4444' }]}>Delete</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity onPress={() => { playClick(); setShowMenu(false); onBack(); }} style={styles.menuItem}>
              <Ionicons name="exit-outline" size={16} color="#374151" /><Text style={styles.menuItemText}>Leave</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Ended banner */}
      {!isLive && (
        <View style={styles.endedBanner}>
          <Text style={styles.endedBannerTitle}>DISCUSSION ENDED</Text>
          <Text style={styles.endedBannerSub}>{room.message_count || 0} messages · {formatDuration(room.duration_seconds || 0)}</Text>
        </View>
      )}

      {/* Pinned bar */}
      {pinnedMsg && (
        <TouchableOpacity onPress={() => scrollToMessage(pinnedMsg.id)} style={styles.pinnedBar}>
          <Text style={{ fontSize: 12 }}>📌</Text>
          <Text style={styles.pinnedText} numberOfLines={1}><Text style={{ fontWeight: 'bold' }}>@{pinnedMsg.username}</Text> {(pinnedMsg.content?.startsWith('http')) ? '📷 Image' : pinnedMsg.content}</Text>
        </TouchableOpacity>
      )}

      {/* Messages — Slack style like desktop, NOT bubbles */}
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={0}
        enabled
      >
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.messagesContainer}
          onContentSizeChange={() => {}}
          maintainVisibleContentPosition={{ minIndexForVisible: 0 }}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
          ListHeaderComponent={
            hasMore && messages.length > 0 ? (
              <View style={{ alignItems: 'center', paddingVertical: 12 }}>
                {loadingMore ? <ActivityIndicator size="small" color="#2563eb" /> : (
                  <TouchableOpacity onPress={loadMoreMessages}>
                    <Text style={{ fontSize: 12, color: '#2563eb', fontWeight: '600' }}>Load earlier messages</Text>
                  </TouchableOpacity>
                )}
              </View>
            ) : null
          }
          renderItem={({ item: msg, index }) => {
            // Desktop hides system messages
            if (msg.message_type === 'system') return null;
            if ((msg as any).is_deleted) return <View style={styles.systemMsg}><Text style={{ fontSize: 11, color: '#d1d5db', fontStyle: 'italic' }}>{msg.content}</Text></View>;
            const prev = index > 0 ? messages[index - 1] : null;
            const isGrouped = !!prev && prev.username === msg.username && prev.message_type !== 'system' && msg.message_type !== 'system' && (new Date(msg.created_at).getTime() - new Date(prev.created_at).getTime()) < 300000;
            const replyToMsg = (msg as any).reply_to_id ? messages.find(m => m.id === (msg as any).reply_to_id) : null;
            const isMsgHost = msg.username === room.host_username;
            const canDelete = isHost || msg.username === currentUser;
            const isGif = !!msg.content && msg.content.includes('giphy.com');
            const isImage = msg.message_type === 'image' || (!!msg.content && !!msg.content.match(/\.(jpg|jpeg|png|gif|webp)(\?|$)/i) && !isGif);
            const isMedia = isGif || isImage;
            const mediaUrl = isGif ? msg.content : ((msg as any).media_url || msg.content);
            const reactions = msg.reactions || {};
            const pic = profilePics[msg.username] || (msg as any).profile_pic || DEFAULT_PIC;
            const verified = userVerified[msg.username];

            return (
              <View style={[styles.msgBlock, isGrouped && styles.msgBlockGrouped]}>
                {!isGrouped ? (
                  <View style={styles.msgRow}>
                    <TouchableOpacity onPress={() => onProfile(msg.username)}>
                      <Image source={{ uri: pic }} style={styles.msgAvatar} />
                    </TouchableOpacity>
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <View style={styles.msgMetaRow}>
                        <TouchableOpacity onPress={() => onProfile(msg.username)}>
                          <Text style={[styles.msgUsername, isMsgHost && styles.msgUsernameHost]}>{msg.username}</Text>
                        </TouchableOpacity>
                        {verified && <Ionicons name="checkmark-circle" size={14} color="#2563eb" />}
                        {isMsgHost && <View style={styles.hostBadge}><Text style={styles.hostBadgeText}>HOST</Text></View>}
                        <Text style={styles.msgTime}>{timeAgo(msg.created_at)}</Text>
                      </View>
                      {!!replyToMsg && (
                        <TouchableOpacity onPress={() => scrollToMessage(replyToMsg.id)} style={styles.replyQuote}>
                          <Text style={styles.replyUser}>@{replyToMsg.username}</Text>
                          <Text style={styles.replyContent} numberOfLines={1}>{replyToMsg.content?.startsWith('http') ? '📷 Image' : replyToMsg.content}</Text>
                        </TouchableOpacity>
                      )}
                      {isMedia ? (
                        <TouchableOpacity onPress={() => setLightboxUrl(mediaUrl)}>
                          <Image source={{ uri: mediaUrl }} style={styles.msgImage} resizeMode="cover" />
                        </TouchableOpacity>
                      ) : (
                        <Text style={styles.msgText}>{renderMarkdownText(msg.content)}</Text>
                      )}
                      {Object.keys(reactions).length > 0 && (
                        <View style={styles.reactionsRow}>
                          {Object.entries(reactions).map(([emoji, users]) => (
                            <TouchableOpacity key={emoji} onPress={() => isLive && handleReact(msg.id, emoji)} style={styles.reactionChip}>
                              <Text style={styles.reactionText}>{emoji} <Text style={{ color: '#6b7280', fontWeight: '500' }}>{Array.isArray(users as any) ? (users as any[]).length : String(users as any)}</Text></Text>
                            </TouchableOpacity>
                          ))}
                        </View>
                      )}
                    </View>
                    <TouchableOpacity onPress={() => setShowActionsFor(showActionsFor === msg.id ? null : msg.id)} style={{ padding: 6 }}>
                      <Ionicons name="ellipsis-horizontal" size={16} color="#9ca3af" />
                    </TouchableOpacity>
                  </View>
                ) : (
                  <View style={styles.msgRow}>
                    <View style={{ width: 40 }} />
                    <View style={{ flex: 1, minWidth: 0 }}>
                      {!!replyToMsg && (
                        <TouchableOpacity onPress={() => scrollToMessage(replyToMsg.id)} style={styles.replyQuote}>
                          <Text style={styles.replyUser}>@{replyToMsg.username}</Text>
                          <Text style={styles.replyContent} numberOfLines={1}>{replyToMsg.content?.startsWith('http') ? '📷 Image' : replyToMsg.content}</Text>
                        </TouchableOpacity>
                      )}
                      {isMedia ? (
                        <TouchableOpacity onPress={() => setLightboxUrl(mediaUrl)}>
                          <Image source={{ uri: mediaUrl }} style={styles.msgImage} resizeMode="cover" />
                        </TouchableOpacity>
                      ) : (
                        <Text style={styles.msgText}>{renderMarkdownText(msg.content)}</Text>
                      )}
                      {Object.keys(reactions).length > 0 && (
                        <View style={styles.reactionsRow}>
                          {Object.entries(reactions).map(([emoji, users]) => (
                            <TouchableOpacity key={emoji} onPress={() => isLive && handleReact(msg.id, emoji)} style={styles.reactionChip}>
                              <Text style={styles.reactionText}>{emoji} <Text style={{ color: '#6b7280', fontWeight: '500' }}>{Array.isArray(users as any) ? (users as any[]).length : String(users as any)}</Text></Text>
                            </TouchableOpacity>
                          ))}
                        </View>
                      )}
                    </View>
                    <TouchableOpacity onPress={() => setShowActionsFor(showActionsFor === msg.id ? null : msg.id)} style={{ padding: 6 }}>
                      <Ionicons name="ellipsis-horizontal" size={16} color="#9ca3af" />
                    </TouchableOpacity>
                  </View>
                )}
                {showActionsFor === msg.id && (
                  <View style={styles.inlineActions}>
                    {isLive && (
                      <TouchableOpacity onPress={() => { setShowActionsFor(null); setShowReactPicker(msg.id); }} style={styles.inlineActionBtn}>
                        <Ionicons name="happy-outline" size={16} color="#6b7280" />
                        <Text style={styles.inlineActionText}>React</Text>
                      </TouchableOpacity>
                    )}
                    {isLive && (
                      <TouchableOpacity onPress={() => { setShowActionsFor(null); setReplyTo(msg); }} style={styles.inlineActionBtn}>
                        <Ionicons name="arrow-undo-outline" size={16} color="#6b7280" />
                        <Text style={styles.inlineActionText}>Reply</Text>
                      </TouchableOpacity>
                    )}
                    {isHost && (
                      <TouchableOpacity onPress={() => { setShowActionsFor(null); handlePin(msg.id); }} style={styles.inlineActionBtn}>
                        <Text style={[styles.inlineActionText, { fontWeight: 'bold' }]}>PIN</Text>
                      </TouchableOpacity>
                    )}
                    {canDelete && (
                      <TouchableOpacity onPress={() => { setShowActionsFor(null); handleDeleteMessage(msg.id); }} style={styles.inlineActionBtn}>
                        <Ionicons name="trash-outline" size={16} color="#6b7280" />
                        <Text style={styles.inlineActionText}>Delete</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                )}
              </View>
            );
          }}
        />

        {/* Typing indicator — like desktop */}
        {typingUsers.length > 0 && isLive && (
          <View style={styles.typingRow}>
            <View style={styles.typingDots}>
              <View style={styles.typingDot} />
              <View style={styles.typingDot} />
              <View style={styles.typingDot} />
            </View>
            <Text style={styles.typingText}>{typingUsers.join(', ')} typing...</Text>
          </View>
        )}

        {/* React picker — 10 emojis like desktop */}
        {showReactPicker && (
          <View style={styles.reactPicker}>
            {REACTION_EMOJIS.map(emoji => (
              <TouchableOpacity key={emoji} onPress={() => handleReact(showReactPicker, emoji)} style={styles.emojiBtn}>
                <Text style={{ fontSize: 22 }}>{emoji}</Text>
              </TouchableOpacity>
            ))}
            {isHost && (
              <TouchableOpacity onPress={() => { handlePin(showReactPicker); setShowReactPicker(null); }} style={styles.emojiBtn}>
                <Text style={{ fontSize: 18 }}>📌</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Host settings panel */}
        <Modal visible={showHostPanel} transparent animationType="fade">
          <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setShowHostPanel(false)}>
            <View style={styles.hostPanel} onStartShouldSetResponder={() => true}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <Text style={styles.hostPanelTitle}>Settings</Text>
                <TouchableOpacity onPress={() => setShowHostPanel(false)}><Ionicons name="close" size={16} color="#9ca3af" /></TouchableOpacity>
              </View>
              <Text style={styles.hostPanelLabel}>ROOM MODE</Text>
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

        {/* Giphy panel */}
        {showGiphy && (
          <View style={styles.giphyPanel}>
            <View style={styles.giphySearchWrap}>
              <Ionicons name="search-outline" size={16} color="#9ca3af" />
              <TextInput style={styles.giphySearchInput} placeholder="Search GIFs..." placeholderTextColor="#9ca3af" value={giphyQuery} onChangeText={searchGiphy} autoFocus />
              <TouchableOpacity onPress={() => { setShowGiphy(false); setGiphyQuery(''); setGiphyResults([]); }}><Ionicons name="close-circle" size={16} color="#9ca3af" /></TouchableOpacity>
            </View>
            <ScrollView contentContainerStyle={styles.giphyGrid} keyboardShouldPersistTaps="handled">
              {giphyResults.length === 0 && giphyQuery ? <Text style={{ fontSize: 12, color: '#9ca3af', textAlign: 'center', paddingVertical: 32, width: '100%' }}>Searching...</Text> : null}
              {!giphyQuery && <Text style={{ fontSize: 12, color: '#9ca3af', textAlign: 'center', paddingVertical: 32, width: '100%' }}>Search for GIFs</Text>}
              {giphyResults.map((gif: any) => (
                <TouchableOpacity key={gif.id} onPress={() => sendGif(gif.images.original.url)} style={styles.giphyItem}>
                  <Image source={{ uri: gif.images.fixed_height.url }} style={styles.giphyImage} resizeMode="cover" />
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        {/* Input bar — mirrors desktop (image + input + GIF + send, reply + mentions + preview) */}
        {isLive ? (
          <View style={[styles.inputBar, { paddingBottom: chatBarBottomPad }]}>
            {isMuted ? (
              <Text style={{ fontSize: 12, color: '#9ca3af', textAlign: 'center', paddingVertical: 8 }}>You are muted</Text>
            ) : room.room_mode === 'locked' && !isHost ? (
              <Text style={{ fontSize: 12, color: '#9ca3af', textAlign: 'center', paddingVertical: 8 }}>Room is locked</Text>
            ) : (
              <>
                {imagePreview && (
                  <View style={{ marginBottom: 8 }}>
                    <Image source={{ uri: imagePreview }} style={{ height: 80, width: 120, borderRadius: 12, borderWidth: 1, borderColor: '#e5e7eb' }} />
                    <TouchableOpacity onPress={() => setImagePreview(null)} style={styles.previewX}><Text style={{ fontSize: 10, fontWeight: 'bold', color: '#fff' }}>X</Text></TouchableOpacity>
                  </View>
                )}
                {replyTo && (
                  <View style={styles.replyPreview}>
                    <View style={styles.replyPreviewBar} />
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <Text style={styles.replyPreviewUser}>@{replyTo.username}</Text>
                      <Text style={styles.replyPreviewContent} numberOfLines={1}>{replyTo.content?.startsWith('http') ? '📷 Image' : replyTo.content}</Text>
                    </View>
                    <TouchableOpacity onPress={() => setReplyTo(null)}><Ionicons name="close" size={14} color="#9ca3af" /></TouchableOpacity>
                  </View>
                )}
                {mentionQuery !== null && mentionResults.length > 0 && (
                  <View style={styles.mentionBox}>
                    {mentionResults.map((u: any) => (
                      <TouchableOpacity key={u.username || u} onPress={() => insertMention(u.username || u)} style={styles.mentionRow}>
                        <Image source={{ uri: u.profile_pic || DEFAULT_PIC }} style={{ width: 28, height: 28, borderRadius: 14 }} />
                        <Text style={{ fontSize: 14, fontWeight: '600', color: '#1f2937' }}>{u.username || u}</Text>
                        {!!u.fullname && <Text style={{ fontSize: 12, color: '#9ca3af' }}>{u.fullname}</Text>}
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
                <View style={styles.inputRow}>
                  <TouchableOpacity onPress={pickImage} style={{ padding: 8 }}>
                    {uploadingImage ? <ActivityIndicator size="small" color="#2563eb" /> : <Ionicons name="image-outline" size={20} color="#9ca3af" />}
                  </TouchableOpacity>
                  <View style={styles.inputPill}>
                    <TextInput ref={inputRef} value={input} onChangeText={handleTyping} onFocus={() => setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 250)} onSubmitEditing={() => imagePreview ? sendMessage(undefined, imagePreview) : sendMessage()} placeholder="Message..." placeholderTextColor="#9ca3af" style={styles.inputField} maxLength={2000} returnKeyType="send" blurOnSubmit={false} />
                    <TouchableOpacity onPress={() => setShowGiphy(!showGiphy)} style={{ paddingLeft: 8 }}>
                      <Text style={styles.gifLabel}>GIF</Text>
                    </TouchableOpacity>
                  </View>
                  {(input.trim() || imagePreview) ? (
                    <TouchableOpacity onPress={() => imagePreview ? sendMessage(undefined, imagePreview) : sendMessage()} style={styles.sendBtn}>
                      <Ionicons name="send" size={16} color="#fff" />
                    </TouchableOpacity>
                  ) : <View style={{ width: 40 }} />}
                </View>
              </>
            )}
          </View>
        ) : (
          <View style={[styles.endedInput, { paddingBottom: chatBarBottomPad }]}>
            <Text style={{ fontSize: 12, fontWeight: 'bold', color: '#9ca3af' }}>Discussion has ended</Text>
            <TouchableOpacity onPress={onBack}><Text style={{ fontSize: 12, color: '#2563eb', fontWeight: '600', marginTop: 4 }}>Browse more</Text></TouchableOpacity>
          </View>
        )}
      </KeyboardAvoidingView>

      {/* Lightbox */}
      <Modal visible={!!lightboxUrl} transparent animationType="fade">
        <TouchableOpacity style={styles.lightbox} activeOpacity={1} onPress={() => setLightboxUrl(null)}>
          <TouchableOpacity onPress={() => setLightboxUrl(null)} style={styles.lightboxX}><Ionicons name="close" size={28} color="#fff" /></TouchableOpacity>
          {lightboxUrl && <Image source={{ uri: lightboxUrl }} style={styles.lightboxImg} resizeMode="contain" />}
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  // List header
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 12, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  backBtn: { padding: 6 },
  headerTitle: { fontSize: 16, fontWeight: 'bold', color: '#111827' },
  pulseDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#2563eb' },
  startBtn: { backgroundColor: '#2563eb', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 999, shadowColor: '#2563eb', shadowOpacity: 0.1, shadowRadius: 4, elevation: 2 },
  startBtnText: { color: '#fff', fontSize: 12, fontWeight: 'bold' },
  // Tabs
  tabsOuter: { paddingHorizontal: 16, paddingTop: 12 },
  tabsRow: { flexDirection: 'row', backgroundColor: '#f3f4f6', borderRadius: 16, padding: 4 },
  tabBtn: { flex: 1, paddingVertical: 10, borderRadius: 12, alignItems: 'center' },
  tabBtnActive: { backgroundColor: '#fff', shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 2, elevation: 1 },
  tabText: { fontSize: 12, fontWeight: '600', color: '#6b7280' },
  tabTextActive: { color: '#111827' },
  // Search
  searchOuter: { paddingHorizontal: 16, marginTop: 12 },
  searchWrap: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10 },
  searchInput: { flex: 1, fontSize: 13, color: '#111827' },
  // Pills
  pillsWrap: { paddingHorizontal: 16, paddingVertical: 8, gap: 8, alignItems: 'center' },
  pill: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999, backgroundColor: '#fff', borderWidth: 1, borderColor: '#e5e7eb', alignSelf: 'flex-start', flexShrink: 0, justifyContent: 'center', alignItems: 'center' },
  pillActive: { backgroundColor: '#2563eb', borderColor: '#2563eb' },
  pillText: { fontSize: 12, lineHeight: 16, fontWeight: '600', color: '#4b5563', textAlignVertical: 'center', includeFontPadding: false },
  pillTextActive: { color: '#fff' },
  // Archive banner
  archiveBannerOuter: { paddingHorizontal: 16, marginBottom: 8 },
  archiveBanner: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#111827', borderRadius: 16, padding: 16 },
  archiveBannerText: { fontSize: 12, color: '#d1d5db', flex: 1 },
  // Room cards
  roomCard: { backgroundColor: '#fff', marginHorizontal: 16, marginBottom: 12, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#f3f4f6' },
  roomRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  roomRowTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  hostAvatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#f3f4f6' },
  liveDotOnAvatar: { position: 'absolute', bottom: -2, right: -2, width: 14, height: 14, borderRadius: 7, backgroundColor: '#2563eb', borderWidth: 2, borderColor: '#fff' },
  roomTitle: { fontSize: 14, fontWeight: 'bold', color: '#111827', flex: 1 },
  roomHost: { fontSize: 12, color: '#9ca3af', marginTop: 2 },
  roomDesc: { fontSize: 12, color: '#9ca3af', marginTop: 4 },
  roomStatsRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 8 },
  catBadge: { backgroundColor: '#f9fafb', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999 },
  catBadgeText: { fontSize: 10, fontWeight: '600', color: '#9ca3af' },
  statItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  statText: { fontSize: 10, color: '#d1d5db' },
  liveBadge: { backgroundColor: '#eff6ff', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
  liveBadgeText: { fontSize: 10, fontWeight: 'bold', color: '#2563eb' },
  timeAgoText: { fontSize: 10, color: '#d1d5db' },
  deleteText: { fontSize: 10, color: '#f87171', fontWeight: '600' },
  archiveIcon: { width: 40, height: 40, borderRadius: 12, backgroundColor: '#f3f4f6', alignItems: 'center', justifyContent: 'center' },
  viewBtn: { backgroundColor: '#2563eb', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 999 },
  viewBtnText: { color: '#fff', fontSize: 12, fontWeight: 'bold' },
  unlockBtn: { backgroundColor: '#eab308', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 999 },
  unlockBtnText: { color: '#fff', fontSize: 12, fontWeight: 'bold' },
  // Create modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center' },
  createCard: { backgroundColor: '#fff', borderRadius: 16, padding: 24, width: '85%', maxWidth: 420 },
  createTitle: { fontSize: 18, fontWeight: 'bold', color: '#111827', marginBottom: 16 },
  createInput: { backgroundColor: '#f9fafb', borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 16, paddingHorizontal: 16, paddingVertical: 12, fontSize: 14, color: '#111827', marginBottom: 12 },
  catPicker: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 16 },
  catPill: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999, backgroundColor: '#f9fafb', borderWidth: 1, borderColor: '#e5e7eb' },
  catPillActive: { backgroundColor: '#2563eb', borderColor: '#2563eb' },
  catPillText: { fontSize: 11, fontWeight: '600', color: '#4b5563' },
  catPillTextActive: { color: '#fff' },
  createBtns: { flexDirection: 'row', gap: 12 },
  createCancelBtn: { flex: 1, paddingVertical: 12, backgroundColor: '#f3f4f6', borderRadius: 999, alignItems: 'center' },
  createCancelText: { fontSize: 14, fontWeight: 'bold', color: '#4b5563' },
  createGoBtn: { flex: 1, paddingVertical: 12, backgroundColor: '#2563eb', borderRadius: 999, alignItems: 'center' },
  createGoText: { fontSize: 14, fontWeight: 'bold', color: '#fff' },
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
  // Room header
  roomHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 12, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  headerDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#2563eb' },
  headerDotEnded: { backgroundColor: '#d1d5db' },
  roomHeaderTitle: { fontSize: 14, fontWeight: 'bold', color: '#111827', flex: 1 },
  roomHeaderSub: { fontSize: 12, marginTop: 2 },
  // Menu
  menuOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.2)' },
  menuPanel: { position: 'absolute', top: 70, right: 16, backgroundColor: '#fff', borderRadius: 16, paddingVertical: 4, width: 192, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 8, elevation: 4, borderWidth: 1, borderColor: '#f3f4f6' },
  menuItem: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 10 },
  menuItemText: { fontSize: 14, fontWeight: '500', color: '#374151' },
  // Ended + pinned
  endedBanner: { paddingVertical: 12, backgroundColor: '#f3f4f6', borderBottomWidth: 1, borderBottomColor: '#e5e7eb', alignItems: 'center' },
  endedBannerTitle: { fontSize: 12, fontWeight: 'bold', color: '#9ca3af' },
  endedBannerSub: { fontSize: 12, color: '#9ca3af', marginTop: 2 },
  pinnedBar: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 8, paddingHorizontal: 16, backgroundColor: '#fefce8', borderBottomWidth: 1, borderBottomColor: '#fef08a' },
  pinnedText: { fontSize: 12, color: '#a16207', flex: 1 },
  // Messages
  messagesContainer: { padding: 16, paddingBottom: 8 },
  systemMsg: { alignItems: 'center', paddingVertical: 4 },
  msgBlock: { marginTop: 12 },
  msgBlockGrouped: { marginTop: 2 },
  msgRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  msgAvatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#f3f4f6' },
  msgMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2, flexWrap: 'wrap' },
  msgUsername: { fontSize: 14, fontWeight: '600', color: '#1f2937' },
  msgUsernameHost: { color: '#2563eb' },
  hostBadge: { backgroundColor: '#dbeafe', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  hostBadgeText: { fontSize: 10, fontWeight: 'bold', color: '#2563eb' },
  msgTime: { fontSize: 11, color: '#9ca3af' },
  msgText: { fontSize: 14, color: '#1f2937', lineHeight: 20 },
  mdPlain: { fontSize: 14, color: '#1f2937', lineHeight: 20 },
  mdBold: { fontSize: 14, color: '#1f2937', lineHeight: 20, fontWeight: 'bold' },
  mdItalic: { fontSize: 14, color: '#1f2937', lineHeight: 20, fontStyle: 'italic' },
  mdCode: { fontSize: 13, color: '#1f2937', backgroundColor: '#f3f4f6', fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace' },
  mdStrike: { fontSize: 14, color: '#1f2937', lineHeight: 20, textDecorationLine: 'line-through' },
  mdLink: { fontSize: 14, color: '#2563eb', lineHeight: 20, textDecorationLine: 'underline' },
  msgImage: { width: 220, height: 150, borderRadius: 8, backgroundColor: '#f3f4f6', marginTop: 4 },
  replyQuote: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4, paddingLeft: 8, borderLeftWidth: 2, borderLeftColor: '#93c5fd' },
  replyUser: { fontSize: 11, color: '#3b82f6', fontWeight: '600' },
  replyContent: { fontSize: 11, color: '#9ca3af', flex: 1 },
  reactionsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 6 },
  reactionChip: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  reactionText: { fontSize: 12 },
  inlineActions: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4, marginLeft: 52, backgroundColor: '#fff', borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 8, paddingHorizontal: 4, paddingVertical: 2, alignSelf: 'flex-start' },
  inlineActionBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 6, paddingVertical: 6 },
  inlineActionText: { fontSize: 11, color: '#6b7280' },
  // Typing
  typingRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingVertical: 6 },
  typingDots: { flexDirection: 'row', gap: 4 },
  typingDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#9ca3af' },
  typingText: { fontSize: 12, color: '#9ca3af' },
  // React picker
  reactPicker: { flexDirection: 'row', flexWrap: 'wrap', backgroundColor: '#fff', borderRadius: 16, padding: 8, marginHorizontal: 16, marginBottom: 8, borderWidth: 1, borderColor: '#f3f4f6', shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 8, elevation: 3, gap: 2, alignItems: 'center' },
  emojiBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center', borderRadius: 8 },
  // Host panel
  hostPanel: { backgroundColor: '#fff', borderRadius: 16, padding: 16, width: 224, alignSelf: 'flex-end', marginTop: 70, marginRight: 16 },
  hostPanelTitle: { fontSize: 12, fontWeight: 'bold', color: '#111827' },
  hostPanelLabel: { fontSize: 10, color: '#9ca3af', fontWeight: 'bold', letterSpacing: 1, marginBottom: 8 },
  modeBtn: { paddingVertical: 8, paddingHorizontal: 12, borderRadius: 12, borderWidth: 1, borderColor: 'transparent', marginBottom: 4 },
  modeBtnActive: { backgroundColor: '#eff6ff', borderColor: '#bfdbfe' },
  modeBtnText: { fontSize: 12, fontWeight: '600', color: '#4b5563' },
  modeBtnTextActive: { color: '#2563eb' },
  // Giphy
  giphyPanel: { marginHorizontal: 16, marginBottom: 8, backgroundColor: '#fff', borderRadius: 12, borderWidth: 1, borderColor: '#f3f4f6', shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 8, elevation: 4, maxHeight: 260, overflow: 'hidden' },
  giphySearchWrap: { flexDirection: 'row', alignItems: 'center', padding: 12, borderBottomWidth: 1, borderBottomColor: '#f3f4f6', gap: 8 },
  giphySearchInput: { flex: 1, fontSize: 12, color: '#111827' },
  giphyGrid: { flexDirection: 'row', flexWrap: 'wrap', padding: 4 },
  giphyItem: { width: '33.33%', aspectRatio: 1, padding: 2 },
  giphyImage: { width: '100%', height: '100%', borderRadius: 6, backgroundColor: '#f3f4f6' },
  // Input
  inputBar: { backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#f3f4f6', paddingHorizontal: 16, paddingVertical: 12 },
  inputRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  inputPill: { flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: '#f3f4f6', borderRadius: 999, paddingHorizontal: 16, paddingVertical: 8 },
  inputField: { flex: 1, fontSize: 14, color: '#111827' },
  gifLabel: { fontSize: 10, fontWeight: 'bold', color: '#9ca3af', borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 4, paddingHorizontal: 4, paddingVertical: 2 },
  sendBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#2563eb', alignItems: 'center', justifyContent: 'center' },
  previewX: { position: 'absolute', top: -6, right: 66, width: 20, height: 20, backgroundColor: '#ef4444', borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  replyPreview: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#eff6ff', borderWidth: 1, borderColor: '#bfdbfe', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 8, marginBottom: 8 },
  replyPreviewBar: { width: 2, height: 32, backgroundColor: '#60a5fa', borderRadius: 1 },
  replyPreviewUser: { fontSize: 11, fontWeight: 'bold', color: '#2563eb' },
  replyPreviewContent: { fontSize: 11, color: '#6b7280' },
  mentionBox: { backgroundColor: '#fff', borderRadius: 12, borderWidth: 1, borderColor: '#f3f4f6', shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 8, elevation: 3, marginBottom: 8, maxHeight: 192 },
  mentionRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 10 },
  endedInput: { borderTopWidth: 1, borderTopColor: '#f3f4f6', backgroundColor: '#f9fafb', paddingVertical: 12, alignItems: 'center' },
  // Lightbox
  lightbox: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'center', alignItems: 'center' },
  lightboxX: { position: 'absolute', top: 50, right: 20, zIndex: 1, padding: 8 },
  lightboxImg: { width: '90%', height: '70%' },
});
