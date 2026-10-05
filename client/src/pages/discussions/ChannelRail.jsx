import { useState, useEffect, useMemo, memo, useCallback } from 'react';
import { apiFetch } from '../../config/api';
import Sidebar from '../../components/layout/Sidebar';
import { CATEGORIES, timeAgo, useMediaQuery } from './discussionsShared';

const HashIcon = ({ className = 'w-5 h-5' }) => (
  <svg viewBox="0 0 24 24" className={className} fill="currentColor"><path fillRule="evenodd" d="M5.25 2.25a3 3 0 00-3 3v13.5a3 3 0 003 3h13.5a3 3 0 003-3V5.25a3 3 0 00-3-3H5.25Zm1.5 4.5a.75.75 0 01.75-.75h9a.75.75 0 010 1.5h-9a.75.75 0 01-.75-.75Zm.75 2.25a.75.75 0 000 1.5H12a.75.75 0 000-1.5H7.5Zm.75 3a.75.75 0 01.75.75v4.5a.75.75 0 01-1.5 0v-4.5a.75.75 0 01.75-.75Zm4.5-3a.75.75 0 000 1.5h4.5a.75.75 0 000-1.5H12Zm-.75 3a.75.75 0 01.75.75v4.5a.75.75 0 01-1.5 0v-4.5a.75.75 0 01.75-.75Z" clipRule="evenodd" /></svg>
);
const LockIcon = ({ className = 'w-4 h-4' }) => (
  <svg viewBox="0 0 24 24" className={`${className} fill-none stroke-current`} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" /></svg>
);
const Chevron = ({ open }) => (
  <svg viewBox="0 0 24 24" className={`w-3 h-3 fill-none stroke-current transition-transform duration-200 ${open ? 'rotate-90' : ''}`} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M9 5l7 7-7 7" /></svg>
);

/* Shared rail data — one fetch per session burst, reused by every view. */
const railCache = { data: null, at: 0 };

function loadRailData() {
  const now = Date.now();
  if (railCache.data && now - railCache.at < 15000) return Promise.resolve(railCache.data);
  return Promise.all([
    apiFetch('/api/discussions/active?limit=50').then(r => (r.ok ? r.json() : [])).catch(() => []),
    apiFetch('/api/discussions/archives?limit=20').then(r => (r.ok ? r.json() : [])).catch(() => []),
  ]).then(([active, archives]) => {
    const data = {
      active: Array.isArray(active) ? active : [],
      archives: Array.isArray(archives) ? archives : [],
    };
    railCache.data = data;
    railCache.at = Date.now();
    return data;
  });
}

function ChannelRow({ room, active, locked }) {
  return (
    <a href={`/discussions/${room.id}`} data-lexum
      className={`group flex items-center gap-2 mx-2 px-2 py-[7px] rounded-xl text-sm transition-colors ${active ? 'bg-white shadow-sm ring-1 ring-gray-200/70 text-blue-600 font-semibold' : 'text-gray-600 hover:bg-white/70 hover:text-gray-900'}`}>
      {locked ? <LockIcon className="w-4 h-4 shrink-0 text-gray-400" /> : <HashIcon className="w-4 h-4 shrink-0 text-gray-400 group-hover:text-gray-500" />}
      <span className="flex-1 truncate font-medium">{room.title}</span>
      {room.status === 'live' ? (
        <span className="flex items-center gap-1 shrink-0 text-[10px] font-bold text-blue-600">
          <span className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-pulse" />
          {room.participant_count || 0}
        </span>
      ) : (
        <span className="text-[10px] text-gray-300 shrink-0">{timeAgo(room.ended_at || room.created_at)}</span>
      )}
    </a>
  );
}

const RailGroup = memo(function RailGroup({ label, rooms, activeRoomId, locked, collapsed, onToggle }) {
  if (!rooms.length) return null;
  return (
    <div>
      <button onClick={onToggle}
        className="w-full flex items-center gap-1.5 px-4 pt-4 pb-1 text-[11px] font-bold uppercase tracking-wider text-gray-400 hover:text-gray-600 transition-colors">
        <Chevron open={!collapsed} />
        <span className="truncate">{label}</span>
        <span className="ml-auto text-gray-300">{rooms.length}</span>
      </button>
      {!collapsed && (
        <div className="space-y-0.5 pb-1">
          {rooms.map(room => (
            <ChannelRow key={room.id} room={room} active={activeRoomId === room.id} locked={locked} />
          ))}
        </div>
      )}
    </div>
  );
});

export default function ChannelRail({ activeRoomId = '', onNew, onHome }) {
  const [data, setData] = useState(() => railCache.data);
  const [collapsed, setCollapsed] = useState({});
  const [query, setQuery] = useState('');

  useEffect(() => {
    let alive = true;
    loadRailData().then(d => { if (alive) setData(d); }).catch(() => {});
    return () => { alive = false; };
  }, []);

  const groups = useMemo(() => {
    if (!data) return [];
    const q = query.trim().toLowerCase();
    if (q) {
      const hits = [...data.active, ...data.archives].filter(r =>
        r.title.toLowerCase().includes(q) || (r.host_username || '').toLowerCase().includes(q));
      return [{ key: 'search', label: 'Search results', rooms: hits.slice(0, 30), locked: false }];
    }
    const byCat = new Map();
    data.active.forEach(r => {
      const cat = (r.category || 'general').toLowerCase();
      if (!byCat.has(cat)) byCat.set(cat, []);
      byCat.get(cat).push(r);
    });
    const ordered = [];
    CATEGORIES.filter(c => c !== 'all').forEach(c => { if (byCat.has(c)) ordered.push({ key: c, label: c, rooms: byCat.get(c), locked: false }); });
    byCat.forEach((rooms, cat) => { if (!CATEGORIES.includes(cat)) ordered.push({ key: cat, label: cat, rooms, locked: false }); });
    if (data.archives.length) ordered.push({ key: 'archives', label: 'Archives', rooms: data.archives, locked: true });
    return ordered;
  }, [data, query]);

  const toggle = useCallback((key) => setCollapsed(prev => ({ ...prev, [key]: !prev[key] })), []);

  return (
    <div className="hidden md:flex w-60 shrink-0 flex-col h-full bg-gray-50/80 border-r border-gray-200/70 overflow-y-auto scrollbar-thin">
      <button onClick={onHome} className="h-12 shrink-0 px-3 flex items-center gap-2 border-b border-gray-200/70 hover:bg-gray-100/60 transition-colors">
        <span className="w-6 h-6 rounded-lg bg-blue-600 flex items-center justify-center shrink-0">
          <HashIcon className="w-4 h-4 text-white" />
        </span>
        <span className="font-bold text-sm text-gray-900 flex-1 text-left truncate">Discussions</span>
        <Chevron open />
      </button>

      <div className="px-3 pt-3 pb-1 flex items-center gap-2">
        <div className="flex-1 flex items-center gap-1.5 bg-white border border-gray-200 rounded-lg px-2 py-1.5 min-w-0">
          <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 fill-none stroke-gray-400 shrink-0" strokeWidth="2"><path strokeLinecap="round" d="M21 21l-4.35-4.35M17 10.5a6.5 6.5 0 11-13 0 6.5 6.5 0 0113 0z" /></svg>
          <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Find a room"
            className="w-full min-w-0 bg-transparent text-xs text-gray-700 placeholder:text-gray-400 focus:outline-none" />
          {query && (
            <button onClick={() => setQuery('')} className="text-gray-400 hover:text-gray-600 shrink-0" aria-label="Clear">
              <svg viewBox="0 0 24 24" className="w-3 h-3 fill-none stroke-current" strokeWidth="2.5"><path strokeLinecap="round" d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          )}
        </div>
        <button onClick={onNew} title="Start a discussion"
          className="w-7 h-7 shrink-0 rounded-lg bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center transition-colors">
          <svg viewBox="0 0 24 24" className="w-4 h-4 fill-none stroke-current" strokeWidth="2.5"><path strokeLinecap="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>
        </button>
      </div>

      <div className="pb-4">
        {!data && (
          <div className="px-4 py-6 space-y-2">
            {[0, 1, 2, 3].map(i => <div key={i} className="h-7 bg-gray-200/70 rounded-xl animate-pulse" style={{ width: `${85 - i * 8}%` }} />)}
          </div>
        )}
        {data && data.active.length === 0 && data.archives.length === 0 && (
          <p className="px-4 py-4 text-xs text-gray-400">No discussions yet. Start one!</p>
        )}
        {groups.map(g => (
          <RailGroup key={g.key} label={g.label} rooms={g.rooms} activeRoomId={activeRoomId} locked={g.locked}
            collapsed={!!collapsed[g.key]} onToggle={() => toggle(g.key)} />
        ))}
      </div>

      {/* pinned CTA — where a Discord-style "start" belongs, not in the page header */}
      <div className="sticky bottom-0 mt-auto p-3 pt-8 bg-gradient-to-t from-gray-50 via-gray-50/95 to-transparent">
        <button onClick={onNew}
          className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition-all active:scale-[0.98] shadow-md shadow-blue-500/10 flex items-center justify-center gap-1.5">
          <svg viewBox="0 0 24 24" className="w-4 h-4 fill-none stroke-current" strokeWidth="2.5"><path strokeLinecap="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>
          Start a discussion
        </button>
      </div>
    </div>
  );
}

/**
 * Discord-style app chrome: site sidebar | discussion channel rail | content.
 * On mobile: `fillMobile` pins content to the viewport (chat), otherwise the
 * children keep their own page scrolling (list views).
 */
export function DiscussionsShell({ activeRoomId, onNew, onHome, rightPanel = null, fillMobile = false, children }) {
  const desktop = useMediaQuery('(min-width: 768px)');
  if (!desktop) {
    if (!fillMobile) return children;
    return <div className="flex flex-col h-screen min-h-0 overflow-hidden bg-[#f8fafc]">{children}</div>;
  }
  return (
    <div className="flex h-screen bg-[#f8fafc]">
      <Sidebar />
      <ChannelRail activeRoomId={activeRoomId} onNew={onNew} onHome={onHome} />
      <div className="flex-1 flex flex-col min-w-0 h-full">{children}</div>
      {rightPanel}
    </div>
  );
}
