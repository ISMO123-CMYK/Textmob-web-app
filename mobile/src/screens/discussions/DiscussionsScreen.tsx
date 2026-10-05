import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, FlatList, TextInput, StyleSheet, Modal, ActivityIndicator, RefreshControl } from 'react-native';
import { Ripple } from '../../components/Ripple';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/build/Ionicons';
import { apiGet, apiPost } from '../../api/client';
import { playClick } from '../../utils/sound';
import { useAuth } from '../../context/AuthContext';
import { CATEGORIES, timeAgo, type Room } from './discussionsShared';
import DiscussionRoomScreen from './DiscussionRoomScreen';

type Props = { onBack: () => void; onProfile: (u: string) => void; roomId?: string };

export default function DiscussionsScreen({ onBack, onProfile, roomId }: Props) {
  if (roomId) return <DiscussionRoomScreen roomId={roomId} onBack={onBack} onProfile={onProfile} />;
  return <ListView onBack={onBack} onProfile={onProfile} />;
}

type SectionKind = 'category' | 'archives' | 'mine';
type Section = { key: string; label: string; rooms: Room[]; kind: SectionKind };
type Row =
  | { type: 'header'; key: string; label: string; count: number; kind: SectionKind; collapsible: boolean }
  | { type: 'room'; key: string; room: Room; kind: SectionKind };

function ListView({ onBack, onProfile }: { onBack: () => void; onProfile: (u: string) => void }) {
  const { username: currentUser } = useAuth();
  const [lists, setLists] = useState<{ active: Room[]; archives: Room[]; mine: Room[] }>({ active: [], archives: [], mine: [] });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [searchResults, setSearchResults] = useState<Room[] | null>(null);
  const [searching, setSearching] = useState(false);
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [showCreate, setShowCreate] = useState(false);
  const [createCategory, setCreateCategory] = useState('general');
  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  /* One parallel burst for all three lists — no tab-by-tab refetch. */
  useEffect(() => {
    let alive = true;
    const asList = (r: { data?: unknown }): Room[] => (Array.isArray(r?.data) ? (r.data as Room[]) : []);
    (async () => {
      const [active, archives, mine] = await Promise.all([
        apiGet('/api/discussions/active?limit=50').then(asList).catch(() => [] as Room[]),
        apiGet('/api/discussions/archives?limit=50').then(asList).catch(() => [] as Room[]),
        currentUser ? apiGet(`/api/discussions/my-archive?username=${currentUser}`).then(asList).catch(() => [] as Room[]) : Promise.resolve([] as Room[]),
      ]);
      if (!alive) return;
      setLists({ active, archives, mine });
      setLoading(false);
      setRefreshing(false);
    })();
    return () => { alive = false; };
  }, [currentUser, refreshKey]);

  useEffect(() => {
    const q = search.trim();
    if (!q) { setSearchResults(null); setSearching(false); return; }
    let alive = true;
    setSearching(true);
    apiGet(`/api/discussions/search?q=${encodeURIComponent(q)}&limit=30`)
      .then(r => { if (alive) setSearchResults(Array.isArray(r.data) ? (r.data as Room[]) : []); })
      .catch(() => { if (alive) setSearchResults([]); })
      .finally(() => { if (alive) setSearching(false); });
    return () => { alive = false; };
  }, [search]);

  const handleSearch = (val: string) => {
    setSearchInput(val);
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    if (!val.trim()) { setSearch(''); return; }
    searchTimeout.current = setTimeout(() => setSearch(val), 300);
  };

  const sections = useMemo<Section[]>(() => {
    const q = search.trim();
    if (q) return searchResults ? [{ key: 'search', label: 'Search results', rooms: searchResults, kind: 'category' }] : [];
    const byCat = new Map<string, Room[]>();
    for (const r of lists.active) {
      const c = (r.category || 'general').toLowerCase();
      const bucket = byCat.get(c);
      if (bucket) bucket.push(r); else byCat.set(c, [r]);
    }
    const out: Section[] = [];
    CATEGORIES.filter(c => c !== 'all').forEach(c => {
      const rooms = byCat.get(c);
      if (rooms) { out.push({ key: `cat-${c}`, label: c, rooms, kind: 'category' }); byCat.delete(c); }
    });
    byCat.forEach((rooms, c) => out.push({ key: `cat-${c}`, label: c, rooms, kind: 'category' }));
    if (lists.archives.length) out.push({ key: 'archives', label: 'Archives', rooms: lists.archives, kind: 'archives' });
    if (lists.mine.length) out.push({ key: 'mine', label: 'My Archive', rooms: lists.mine, kind: 'mine' });
    return out;
  }, [lists, search, searchResults]);

  const rows = useMemo<Row[]>(() => {
    const out: Row[] = [];
    for (const s of sections) {
      out.push({ type: 'header', key: `h-${s.key}`, label: s.label, count: s.rooms.length, kind: s.kind, collapsible: !search.trim() });
      if (collapsed[s.key]) continue;
      for (const room of s.rooms) out.push({ type: 'room', key: `r-${s.kind}-${room.id}`, room, kind: s.kind });
    }
    return out;
  }, [sections, collapsed, search]);

  const handleDelete = async (id: string) => {
    try {
      await apiPost(`/api/discussions/room/${id}/delete`, { username: currentUser });
      setLists(prev => ({ ...prev, mine: prev.mine.filter(r => r.id !== id), archives: prev.archives.filter(r => r.id !== id) }));
      setSearchResults(prev => (prev ? prev.filter(r => r.id !== id) : prev));
    } catch { /* delete is best-effort */ }
  };

  const handleUnlock = async (rid: string) => {
    if (!currentUser) return;
    try {
      const res = await apiPost(`/api/discussions/room/${rid}/unlock`, { username: currentUser });
      if ((res.data as { unlocked?: boolean })?.unlocked) onProfile(rid);
    } catch { /* unlock failed — user can retry */ }
  };

  const toggleGroup = (key: string) => {
    playClick();
    setCollapsed(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const renderRow = ({ item }: { item: Row }) => {
    if (item.type === 'header') {
      return (
        <View style={styles.groupRow}>
          <Ripple onPress={item.collapsible ? () => toggleGroup(item.key.slice(2)) : undefined} style={styles.groupHeaderBtn} disabled={!item.collapsible}>
            <Ionicons name={collapsed[item.key.slice(2)] ? 'chevron-forward' : 'chevron-down'} size={12} color="#9ca3af" />
            <Text style={styles.groupLabel}>{item.label.toUpperCase()}</Text>
            <Text style={styles.groupCount}>{item.count}</Text>
          </Ripple>
          {item.kind === 'category' && !search.trim() && (
            <Ripple onPress={() => { playClick(); setCreateCategory(item.label.toLowerCase()); setShowCreate(true); }} style={styles.groupAddBtn}>
              <Ionicons name="add" size={16} color="#9ca3af" />
            </Ripple>
          )}
        </View>
      );
    }

    const { room, kind } = item;
    const locked = kind === 'archives' && !room.unlocked;
    const isMine = kind === 'mine' && currentUser === room.host_username;
    return (
      <Ripple onPress={() => { playClick(); onProfile(room.id); }} style={styles.channelRow}>
        <View style={[styles.hashBox, locked && styles.hashBoxLocked]}>
          {locked
            ? <Ionicons name="lock-closed" size={13} color="#9ca3af" />
            : <Text style={styles.hashText}>#</Text>}
        </View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text numberOfLines={1} style={[styles.channelTitle, locked && { color: '#6b7280' }]}>{room.title}</Text>
          <Text numberOfLines={1} style={styles.channelSub}>@{room.host_username}{room.category && room.category !== 'general' ? ` · ${room.category}` : ''}</Text>
        </View>
        {isMine ? (
          <Ripple onPress={() => handleDelete(room.id)} style={styles.rowAction} hitSlop={8}>
            <Ionicons name="trash-outline" size={15} color="#f87171" />
          </Ripple>
        ) : locked ? (
          <Ripple onPress={() => { playClick(); handleUnlock(room.id); }} style={styles.payChip}>
            <Text style={styles.payChipText}>500</Text>
          </Ripple>
        ) : room.status === 'live' ? (
          <View style={styles.livePill}>
            <View style={styles.liveDot} />
            <Text style={styles.livePillText}>{room.participant_count || 0}</Text>
          </View>
        ) : (
          <Text style={styles.channelTime}>{timeAgo(room.ended_at || room.created_at)}</Text>
        )}
      </Ripple>
    );
  };

  const busy = loading || searching;
  const empty = !busy && rows.length === 0;

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <Ripple onPress={onBack} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={20} color="#6b7280" />
        </Ripple>
        <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <View style={styles.headerHash}><Text style={styles.headerHashText}>#</Text></View>
          <Text style={styles.headerTitle}>Discussions</Text>
          <View style={styles.pulseDot} />
        </View>
        {currentUser ? (
          <Ripple onPress={() => { playClick(); setCreateCategory('general'); setShowCreate(true); }} style={styles.startBtn}>
            <Ionicons name="add" size={14} color="#fff" />
            <Text style={styles.startBtnText}>Start</Text>
          </Ripple>
        ) : <View style={{ width: 50 }} />}
      </View>

      <View style={styles.searchOuter}>
        <View style={styles.searchWrap}>
          <Ionicons name="search-outline" size={14} color="#9ca3af" style={{ marginRight: 6 }} />
          <TextInput style={styles.searchInput} placeholder="Find a room" placeholderTextColor="#9ca3af" value={searchInput} onChangeText={handleSearch} />
          {searchInput ? (
            <Ripple onPress={() => handleSearch('')} hitSlop={8}>
              <Ionicons name="close" size={14} color="#9ca3af" />
            </Ripple>
          ) : null}
        </View>
      </View>

      {busy ? (
        <View style={{ alignItems: 'center', paddingTop: 64 }}>
          <ActivityIndicator color="#2563eb" />
        </View>
      ) : (
        <FlatList
          data={rows}
          keyExtractor={item => item.key}
          renderItem={renderRow}
          contentContainerStyle={{ paddingBottom: 100, paddingTop: 4 }}
          initialNumToRender={14}
          maxToRenderPerBatch={16}
          windowSize={7}
          removeClippedSubviews
          ListEmptyComponent={empty ? (
            <View style={{ alignItems: 'center', paddingTop: 72, gap: 12, paddingHorizontal: 24 }}>
              <View style={styles.emptyHash}><Text style={styles.emptyHashText}>#</Text></View>
              <Text style={{ fontSize: 14, fontWeight: '600', color: '#9ca3af', textAlign: 'center' }}>
                {search.trim() ? 'No rooms match that search' : 'No discussions yet. Start one!'}
              </Text>
              {!search.trim() && currentUser ? (
                <Ripple onPress={() => { playClick(); setShowCreate(true); }} style={styles.startBtn}>
                  <Ionicons name="add" size={14} color="#fff" />
                  <Text style={styles.startBtnText}>Start</Text>
                </Ripple>
              ) : null}
            </View>
          ) : null}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); setRefreshKey(k => k + 1); }} />}
        />
      )}

      <Modal visible={showCreate} transparent animationType="fade">
        <Ripple style={styles.modalOverlay} activeOpacity={1} onPress={() => setShowCreate(false)}>
          <View style={styles.createCard} onStartShouldSetResponder={() => true}>
            <Text style={styles.createTitle}>Start a Discussion</Text>
            <CreateRoomForm initialCategory={createCategory} onClose={() => setShowCreate(false)}
              onCreated={(id) => { setShowCreate(false); setRefreshKey(k => k + 1); onProfile(id); }} />
          </View>
        </Ripple>
      </Modal>
    </SafeAreaView>
  );
}

function CreateRoomForm({ onClose, onCreated, initialCategory = 'general' }: { onClose: () => void; onCreated: (id: string) => void; initialCategory?: string }) {
  const { username: currentUser } = useAuth();
  const [title, setTitle] = useState('');
  const [desc, setDesc] = useState('');
  const [cat, setCat] = useState(initialCategory);
  const [loading, setLoading] = useState(false);
  const handleCreate = async () => {
    if (!title.trim()) return;
    setLoading(true);
    try {
      const res = await apiPost('/api/discussions/create', { username: currentUser, title: title.trim(), description: desc.trim(), category: cat });
      const id = (res.data as { id?: string })?.id;
      if (id) onCreated(id);
    } catch { /* create failed — user can retry */ }
    setLoading(false);
  };
  return (
    <View>
      <TextInput style={styles.createInput} placeholder="Room title" placeholderTextColor="#9ca3af" value={title} onChangeText={t => setTitle(t.slice(0, 120))} maxLength={120} />
      <TextInput style={[styles.createInput, { height: 64, textAlignVertical: 'top' }]} placeholder="What's the discussion about?" placeholderTextColor="#9ca3af" value={desc} onChangeText={t => setDesc(t.slice(0, 500))} maxLength={500} multiline />
      <View style={styles.catPicker}>
        {CATEGORIES.filter(c => c !== 'all').map(c => (
          <Ripple key={c} onPress={() => setCat(c)} style={[styles.catPill, cat === c && styles.catPillActive]}>
            <Text style={[styles.catPillText, cat === c && styles.catPillTextActive]}>{c.charAt(0).toUpperCase() + c.slice(1)}</Text>
          </Ripple>
        ))}
      </View>
      <View style={styles.createBtns}>
        <Ripple onPress={onClose} style={styles.createCancelBtn}><Text style={styles.createCancelText}>Cancel</Text></Ripple>
        <Ripple onPress={handleCreate} disabled={!title.trim() || loading} style={[styles.createGoBtn, (!title.trim() || loading) && { opacity: 0.5 }]}>
          <Text style={styles.createGoText}>{loading ? 'Starting...' : 'Go Live'}</Text>
        </Ripple>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 12, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  backBtn: { padding: 6 },
  headerHash: { width: 22, height: 22, borderRadius: 7, backgroundColor: '#2563eb', alignItems: 'center', justifyContent: 'center' },
  headerHashText: { color: '#fff', fontSize: 13, fontWeight: 'bold', lineHeight: 15 },
  headerTitle: { fontSize: 16, fontWeight: 'bold', color: '#111827' },
  pulseDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#2563eb' },
  startBtn: { flexDirection: 'row', alignItems: 'center', gap: 2, backgroundColor: '#2563eb', paddingHorizontal: 14, paddingVertical: 9, borderRadius: 999, shadowColor: '#2563eb', shadowOpacity: 0.1, shadowRadius: 4, elevation: 2 },
  startBtnText: { color: '#fff', fontSize: 12, fontWeight: 'bold' },
  // Search
  searchOuter: { paddingHorizontal: 16, marginTop: 12 },
  searchWrap: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10 },
  searchInput: { flex: 1, fontSize: 13, color: '#111827', paddingVertical: 0, includeFontPadding: false, textAlignVertical: 'center' },
  // Group headers (Discord channel categories)
  groupRow: { flexDirection: 'row', alignItems: 'center', marginTop: 16, paddingHorizontal: 8 },
  groupHeaderBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 6, paddingHorizontal: 8 },
  groupLabel: { fontSize: 11, fontWeight: 'bold', color: '#9ca3af', letterSpacing: 0.6 },
  groupCount: { fontSize: 11, fontWeight: '600', color: '#d1d5db' },
  groupAddBtn: { padding: 6 },
  // Channel rows
  channelRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginHorizontal: 8, marginVertical: 2, paddingHorizontal: 10, paddingVertical: 9, borderRadius: 12 },
  hashBox: { width: 30, height: 30, borderRadius: 9, backgroundColor: '#eef2f7', alignItems: 'center', justifyContent: 'center' },
  hashBoxLocked: { backgroundColor: '#f3f4f6' },
  hashText: { fontSize: 16, fontWeight: 'bold', color: '#9ca3af', lineHeight: 18 },
  channelTitle: { fontSize: 14, fontWeight: '600', color: '#1f2937' },
  channelSub: { fontSize: 11, color: '#9ca3af', marginTop: 1 },
  channelTime: { fontSize: 11, color: '#d1d5db' },
  livePill: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#eff6ff', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999 },
  liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#2563eb' },
  livePillText: { fontSize: 10, fontWeight: 'bold', color: '#2563eb' },
  payChip: { backgroundColor: '#eab308', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999 },
  payChipText: { color: '#fff', fontSize: 11, fontWeight: 'bold' },
  rowAction: { padding: 6 },
  // Empty
  emptyHash: { width: 56, height: 56, borderRadius: 18, backgroundColor: '#eef2f7', alignItems: 'center', justifyContent: 'center' },
  emptyHashText: { fontSize: 28, fontWeight: 'bold', color: '#cbd5e1' },
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
});
