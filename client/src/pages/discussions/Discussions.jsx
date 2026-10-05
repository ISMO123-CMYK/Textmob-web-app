import { useState, useEffect, useRef, memo } from 'react';
import { apiFetch } from '../../config/api';
import NavIcons from '../../utils/navIcons';
import RightSidebar from '../../components/layout/RightSidebar';
import DiscussionRoom from './DiscussionRoom';
import { DiscussionsShell } from './ChannelRail';
import { CATEGORIES, timeAgo, useMediaQuery } from './discussionsShared';

/* ═══════════════ shared icons ═══════════════ */
const HashIcon = ({ className = 'w-5 h-5' }) => (
  <svg viewBox="0 0 24 24" className={className} fill="currentColor"><path fillRule="evenodd" d="M5.25 2.25a3 3 0 00-3 3v13.5a3 3 0 003 3h13.5a3 3 0 003-3V5.25a3 3 0 00-3-3H5.25Zm1.5 4.5a.75.75 0 01.75-.75h9a.75.75 0 010 1.5h-9a.75.75 0 01-.75-.75Zm.75 2.25a.75.75 0 000 1.5H12a.75.75 0 000-1.5H7.5Zm.75 3a.75.75 0 01.75.75v4.5a.75.75 0 01-1.5 0v-4.5a.75.75 0 01.75-.75Zm4.5-3a.75.75 0 000 1.5h4.5a.75.75 0 000-1.5H12Zm-.75 3a.75.75 0 01.75.75v4.5a.75.75 0 01-1.5 0v-4.5a.75.75 0 01.75-.75Z" clipRule="evenodd" /></svg>
);
const LockIcon = ({ className = 'w-4 h-4' }) => (
  <svg viewBox="0 0 24 24" className={`${className} fill-none stroke-current`} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" /></svg>
);

/* ═══════════════ entry ═══════════════ */
export default function Discussions({ roomId, isActive = true }) {
  if (roomId) return <DiscussionRoom roomId={roomId} active={isActive} />;
  return <DiscussionsList active={isActive} />;
}

/* ═══════════════ room cards ═══════════════ */
const RoomCard = memo(function RoomCard({ room, variant, currentUser, unlocking, onUnlock, onDelete }) {
  const locked = variant === 'archive-locked';

  if (locked) {
    return (
      <div className="bg-white border border-gray-100 rounded-2xl p-4 hover:border-blue-200 transition-all">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-gray-50 border border-gray-100 flex items-center justify-center shrink-0">
            <LockIcon className="w-5 h-5 text-gray-400" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-gray-900 text-sm truncate">{room.title}</h3>
            <p className="text-xs text-gray-400 mt-0.5">@{room.host_username} · {room.message_count || 0} messages</p>
          </div>
          {room.unlocked ? (
            <a href={`/discussions/${room.id}`} data-lexum className="px-4 py-2 bg-blue-600 text-white text-xs font-bold rounded-full hover:bg-blue-700 transition-all active:scale-[0.98]">View</a>
          ) : (
            <button onClick={() => onUnlock(room.id)} disabled={unlocking === room.id}
              className="px-4 py-2 bg-yellow-500 text-white text-xs font-bold rounded-full hover:bg-yellow-600 transition-all active:scale-[0.98] disabled:opacity-50">
              {unlocking === room.id ? '...' : '500'}
            </button>
          )}
        </div>
      </div>
    );
  }

  const ended = room.status === 'ended';
  return (
    <div className="group bg-white border border-gray-100 rounded-2xl p-4 hover:border-blue-200 hover:shadow-sm transition-all">
      <a href={`/discussions/${room.id}`} data-lexum className="flex items-start gap-3">
        <div className="relative shrink-0">
          <div className={`w-11 h-11 rounded-xl border flex items-center justify-center transition-colors ${ended ? 'bg-gray-50 border-gray-100' : 'bg-gray-50 border-gray-100 group-hover:bg-blue-50 group-hover:border-blue-100'}`}>
            {ended ? <LockIcon className="w-5 h-5 text-gray-400" /> : <HashIcon className="w-5 h-5 text-gray-400 group-hover:text-blue-500" />}
          </div>
          {!ended && <span className="absolute -bottom-1 -right-1 w-3.5 h-3.5 bg-blue-600 border-2 border-white rounded-full" />}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="font-bold text-gray-900 text-sm truncate">{room.title}</h3>
            {room.room_mode && room.room_mode !== 'open' && <LockIcon className="w-3.5 h-3.5 text-gray-300 shrink-0" />}
          </div>
          <p className="text-xs text-gray-400 mt-0.5">@{room.host_username}</p>
          {room.description && <p className="text-xs text-gray-400 mt-1 line-clamp-1">{room.description}</p>}
          <div className="flex items-center gap-3 mt-2">
            <span className="text-[10px] font-semibold text-gray-400 bg-gray-50 border border-gray-100 px-2 py-0.5 rounded-full">{room.category || 'general'}</span>
            <span className="flex items-center gap-1 text-[10px] text-gray-400">
              <svg viewBox="0 0 24 24" className="w-3 h-3 fill-none stroke-current" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
              {room.participant_count || 0}
            </span>
            <span className="flex items-center gap-1 text-[10px] text-gray-400">
              <svg viewBox="0 0 24 24" className="w-3 h-3 fill-none stroke-current" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.087.16 2.185.283 3.293.369V21l4.076-4.076a1.526 1.526 0 011.037-.443 48.282 48.282 0 005.68-.494c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z" /></svg>
              {room.message_count || 0}
            </span>
          </div>
        </div>
        <div className="shrink-0">
          {!ended ? (
            <span className="px-2.5 py-1 bg-blue-50 text-blue-600 text-[10px] font-bold rounded-full">LIVE</span>
          ) : (
            <span className="text-[10px] text-gray-300">{timeAgo(room.ended_at)}</span>
          )}
        </div>
      </a>
      {ended && currentUser === room.host_username && (
        <div className="mt-2 flex justify-end">
          <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); onDelete(room.id); }}
            className="text-[10px] text-red-400 hover:text-red-600 font-semibold transition-colors">Delete</button>
        </div>
      )}
    </div>
  );
});

/* ═══════════════ create modal ═══════════════ */
function CreateRoomModal({ onClose, onCreated }) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('general');
  const [loading, setLoading] = useState(false);
  const handleCreate = async () => {
    if (!title.trim()) return;
    setLoading(true);
    try {
      const res = await apiFetch('/api/discussions/create', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username: localStorage.getItem('currentUser'), title: title.trim(), description: description.trim(), category }) });
      const data = await res.json();
      if (data?.id) { onCreated(); window.Lexum?.navigate(`/discussions/${data.id}`); }
      else { console.error('discussions/create failed:', data); alert(data?.error || 'Failed to create discussion'); }
    } catch (e) { console.error('discussions/create error:', e); alert('Failed to create discussion'); }
    setLoading(false);
  };
  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white rounded-2xl p-6 w-[420px] max-w-[90vw] shadow-xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center gap-2 mb-4">
          <span className="w-8 h-8 rounded-xl bg-blue-600 flex items-center justify-center"><HashIcon className="w-5 h-5 text-white" /></span>
          <h2 className="text-lg font-bold text-gray-900">Start a Discussion</h2>
        </div>
        <input type="text" placeholder="Room title" value={title} onChange={e => setTitle(e.target.value.slice(0, 120))} maxLength={120}
          className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl text-sm font-semibold text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-blue-400 focus:bg-white transition-colors mb-3" />
        <textarea placeholder="What's the discussion about?" value={description} onChange={e => setDescription(e.target.value.slice(0, 500))} rows={2}
          className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl text-sm text-gray-700 placeholder:text-gray-400 focus:outline-none focus:border-blue-400 focus:bg-white transition-colors mb-3 resize-none" />
        <div className="flex flex-wrap gap-1.5 mb-4">
          {CATEGORIES.filter(c => c !== 'all').map(c => (
            <button key={c} onClick={() => setCategory(c)}
              className={`px-3 py-1.5 rounded-full text-[11px] font-semibold border transition-all ${category === c ? 'bg-blue-600 border-blue-600 text-white' : 'bg-white border-gray-200 text-gray-500 hover:border-gray-300'}`}>
              {c.charAt(0).toUpperCase() + c.slice(1)}
            </button>
          ))}
        </div>
        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 py-3 bg-gray-100 text-gray-600 text-sm font-bold rounded-full hover:bg-gray-200 transition-all active:scale-[0.98]">Cancel</button>
          <button onClick={handleCreate} disabled={!title.trim() || loading}
            className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold rounded-full transition-all active:scale-[0.98] disabled:opacity-50 shadow-md shadow-blue-500/10">
            {loading ? 'Starting...' : 'Go Live'}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════ home / browse ═══════════════ */
const LIST_TABS = [
  { id: 'active', label: 'Active' },
  { id: 'archives', label: 'Archives' },
  { id: 'my-archive', label: 'My Archive' },
];

function DiscussionsList({ active }) {
  const [tab, setTab] = useState('active');
  const [rooms, setRooms] = useState([]);
  const [archives, setArchives] = useState([]);
  const [myArchives, setMyArchives] = useState([]);
  const [category, setCategory] = useState('all');
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [showCreate, setShowCreate] = useState(false);
  const [unlocking, setUnlocking] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [loadedKey, setLoadedKey] = useState(null);
  const [ddOpen, setDdOpen] = useState(false);
  const searchTimeout = useRef(null);
  const ddRef = useRef(null);
  const currentUser = localStorage.getItem('currentUser');
  const desktop = useMediaQuery('(min-width: 768px)');
  const wide = useMediaQuery('(min-width: 1280px)');

  /* Loading is derived from "which query has been resolved" instead of being
     flipped inside the effect — no cascading render when the tab changes. */
  const query = search.trim();
  const listKey = query ? `q|${query}` : `t|${tab}|${category}`;
  const canLoad = tab !== 'my-archive' || !!currentUser;
  const loading = active && canLoad && listKey !== loadedKey;

  useEffect(() => {
    if (!active || !canLoad) return;
    const key = listKey;
    let alive = true;
    const resolve = (setter) => (r) => (r.ok ? r.json() : [])
      .then(d => { if (alive) { setter(Array.isArray(d) ? d : []); setLoadedKey(key); } })
      .catch(() => { if (alive) setLoadedKey(key); });

    if (query) {
      apiFetch(`/api/discussions/search?q=${encodeURIComponent(query)}&limit=30`).then(resolve(setSearchResults));
    } else if (tab === 'archives') {
      apiFetch('/api/discussions/archives?limit=50').then(resolve(setArchives));
    } else if (tab === 'my-archive') {
      apiFetch(`/api/discussions/my-archive?username=${currentUser}`).then(resolve(setMyArchives));
    } else {
      const url = category === 'all' ? '/api/discussions/active?limit=50' : `/api/discussions/active?category=${category}&limit=50`;
      apiFetch(url).then(resolve(setRooms));
    }
    return () => { alive = false; };
  }, [active, listKey, query, tab, category, canLoad, refreshKey, currentUser]);

  useEffect(() => {
    if (!ddOpen) return undefined;
    const onDown = (e) => { if (ddRef.current && !ddRef.current.contains(e.target)) setDdOpen(false); };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [ddOpen]);

  const selectTab = (id) => {
    setTab(id);
    setSearch('');
    setSearchInput('');
    setSearchResults([]);
    setDdOpen(false);
  };

  const handleSearch = (val) => {
    setSearchInput(val);
    clearTimeout(searchTimeout.current);
    if (!val.trim()) { setSearch(''); return; }
    searchTimeout.current = setTimeout(() => setSearch(val), 300);
  };

  const displayRooms = query ? searchResults : (tab === 'active' ? rooms : tab === 'archives' ? archives : myArchives);

  const handleDelete = async (id) => {
    if (!confirm('Delete this discussion permanently?')) return;
    await apiFetch(`/api/discussions/room/${id}/delete`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username: currentUser }) });
    setArchives(prev => prev.filter(r => r.id !== id));
    setMyArchives(prev => prev.filter(r => r.id !== id));
    if (query) setSearchResults(prev => prev.filter(r => r.id !== id));
  };

  const handleUnlock = async (rid) => {
    if (!currentUser) return alert('Login required');
    setUnlocking(rid);
    try {
      const res = await apiFetch(`/api/discussions/room/${rid}/unlock`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username: currentUser }) });
      const data = await res.json();
      if (data.unlocked) window.Lexum?.navigate(`/discussions/${rid}`);
      else alert(data.error || 'Failed');
    } catch { alert('Failed'); }
    setUnlocking(null);
  };

  const cardVariant = (room) => (tab === 'archives' && !query && !room.unlocked ? 'archive-locked' : 'full');

  const body = (
    <>
      {/* category chips */}
      {tab === 'active' && !query && (
        <div className="flex gap-2 overflow-x-auto pb-1 mb-4 scrollbar-thin scrollbar-thumb-rounded">
          {CATEGORIES.map(cat => (
            <button key={cat} onClick={() => setCategory(cat)}
              className={`flex-shrink-0 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all active:scale-[0.98] ${category === cat ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/20' : 'bg-white text-gray-600 border border-gray-200 hover:border-gray-300'}`}>
              {cat.charAt(0).toUpperCase() + cat.slice(1)}
            </button>
          ))}
        </div>
      )}

      {/* archives banner */}
      {tab === 'archives' && (
        <div className="bg-gray-900 rounded-2xl p-4 mb-4 flex items-center gap-3">
          <NavIcons.Wallet className="w-5 h-5 text-yellow-400 flex-shrink-0" />
          <p className="text-xs text-gray-300">Unlock archived discussions for <span className="text-yellow-400 font-bold">500 mobcoins</span>. Host gets 10%.</p>
        </div>
      )}

      {loading ? (
        <div className="space-y-3">
          {[0, 1, 2, 3].map(i => (
            <div key={i} className="bg-white border border-gray-100 rounded-2xl p-4 flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-gray-100 animate-pulse" />
              <div className="flex-1 space-y-2">
                <div className="h-3 bg-gray-100 rounded-full w-1/2 animate-pulse" />
                <div className="h-2.5 bg-gray-100 rounded-full w-1/3 animate-pulse" />
              </div>
            </div>
          ))}
        </div>
      ) : displayRooms.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <HashIcon className="w-12 h-12 text-gray-200" />
          <p className="text-sm font-semibold text-gray-400">
            {tab === 'active' && (query ? 'No results' : 'No active discussions')}
            {tab === 'archives' && 'No archived discussions'}
            {tab === 'my-archive' && 'No discussions in your archive'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {displayRooms.map(room => (
            <RoomCard key={room.id} room={room} variant={cardVariant(room)} currentUser={currentUser}
              unlocking={unlocking} onUnlock={handleUnlock} onDelete={handleDelete} />
          ))}
        </div>
      )}
    </>
  );

  const tabBar = (
    <div className="flex gap-1 bg-gray-100 rounded-xl p-1">
      {LIST_TABS.map(t => (
        <button key={t.id} onClick={() => selectTab(t.id)}
          className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${tab === t.id ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
          {t.label}
        </button>
      ))}
    </div>
  );

  /* desktop swaps the segmented tabs for a compact dropdown (mobile keeps tabs) */
  const viewDropdown = (
    <div className="relative" ref={ddRef}>
      <button onClick={() => setDdOpen(v => !v)}
        className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 rounded-xl text-xs font-semibold text-gray-700 transition-colors">
        {(LIST_TABS.find(t => t.id === tab) || LIST_TABS[0]).label}
        <svg viewBox="0 0 24 24" className={`w-3 h-3 fill-none stroke-current transition-transform duration-200 ${ddOpen ? 'rotate-180' : ''}`} strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" /></svg>
      </button>
      {ddOpen && (
        <div className="absolute left-0 top-full mt-1.5 w-44 bg-white rounded-2xl shadow-xl border border-gray-100 py-1.5 z-50">
          {LIST_TABS.map(t => (
            <button key={t.id} onClick={() => selectTab(t.id)}
              className={`w-full text-left px-4 py-2.5 text-xs font-semibold transition-colors ${tab === t.id ? 'text-blue-600 bg-blue-50/60' : 'text-gray-600 hover:bg-gray-50'}`}>
              {t.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );

  const searchBox = (
    <div className="flex items-center gap-2 px-3 h-9 bg-white border border-gray-200 rounded-xl focus-within:border-gray-300 transition-colors">
      <svg viewBox="0 0 24 24" className="w-4 h-4 shrink-0 fill-none stroke-gray-400" strokeWidth="2"><path strokeLinecap="round" d="M21 21l-4.35-4.35M17 10.5a6.5 6.5 0 11-13 0 6.5 6.5 0 0113 0z" /></svg>
      <input type="text" placeholder="Search discussions" value={searchInput} onChange={e => handleSearch(e.target.value)}
        className="flex-1 min-w-0 h-full bg-transparent text-xs text-gray-900 placeholder:text-gray-400 focus:outline-none" />
      {searchInput && (
        <button onClick={() => handleSearch('')} className="shrink-0 text-gray-400 hover:text-gray-600" aria-label="Clear search">
          <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 fill-none stroke-current" strokeWidth="2"><path strokeLinecap="round" d="M6 18L18 6M6 6l12 12" /></svg>
        </button>
      )}
    </div>
  );

  const startBtn = currentUser ? (
    <button onClick={() => setShowCreate(true)}
      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-full transition-all active:scale-[0.98] shadow-md shadow-blue-500/10 whitespace-nowrap">
      Start
    </button>
  ) : null;

  /* ── desktop gets the Discord rail + optional right rail, mobile goes full-screen ── */
  return (
    <DiscussionsShell
      activeRoomId=""
      onNew={() => setShowCreate(true)}
      onHome={() => window.Lexum?.navigate('/discussions')}
      rightPanel={desktop && wide ? (
        <aside className="w-80 shrink-0 bg-white border-l border-gray-200/60 overflow-y-auto scrollbar-thin">
          <RightSidebar />
        </aside>
      ) : null}
    >
      {desktop ? (
        <main className="flex-1 flex flex-col min-w-0 h-full">
          <div className="h-14 shrink-0 px-5 flex items-center gap-4 border-b border-gray-200/70 bg-white/85 backdrop-blur-xl">
            <div className="flex items-center gap-2 shrink-0">
              <NavIcons.Discussions className="w-5 h-5 text-blue-600" />
              <h1 className="font-bold text-gray-900 text-sm" style={{ fontFamily: 'var(--font-display)' }}>Discussions</h1>
              <span className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-pulse" />
            </div>
            {viewDropdown}
            <div className="flex-1" />
            <div className="w-64 shrink-0">{searchBox}</div>
          </div>
          <div className="flex-1 overflow-y-auto scrollbar-thin">
            <div className="max-w-3xl mx-auto px-6 py-6">{body}</div>
          </div>
        </main>
      ) : (
        <div className="min-h-screen bg-[#f8fafc] pb-20 flex flex-col">
          <div className="sticky top-0 z-30 flex items-center gap-3 px-4 py-3 bg-white/85 backdrop-blur-xl border-b border-gray-200/60">
            <button onClick={() => window.history.back()} className="p-1.5 -ml-1 rounded-xl hover:bg-gray-100 text-gray-500 transition-colors" aria-label="Back">
              <NavIcons.ArrowLeft className="w-5 h-5" />
            </button>
            <div className="flex-1 flex items-center gap-2 min-w-0">
              <HashIcon className="w-4 h-4 text-blue-600 shrink-0" />
              <h1 className="text-base font-bold text-gray-900 truncate">Discussions</h1>
              <span className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-pulse shrink-0" />
            </div>
            {startBtn}
          </div>
          <div className="px-4 pt-4 flex-1">
            <div className="mb-3">{tabBar}</div>
            <div className="mb-4">{searchBox}</div>
            {body}
          </div>
        </div>
      )}
      {showCreate && <CreateRoomModal onClose={() => setShowCreate(false)} onCreated={() => { setShowCreate(false); setRefreshKey(k => k + 1); }} />}
    </DiscussionsShell>
  );
}
