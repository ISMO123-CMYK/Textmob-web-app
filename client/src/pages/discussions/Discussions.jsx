import { useState, useEffect, useRef } from 'react';
import { apiFetch, API_BASE_URL } from '../../config/api';
import NavIcons from '../../utils/navIcons';
import Sidebar from '../../components/layout/Sidebar';
import RightSidebar from '../../components/layout/RightSidebar';
import { VerifiedBadge } from '../../components/ui/VerifiedBadge';

const GIPHY_API_KEY = '1PsuVrcwCRiOYQEfqgPOd9kVuoRmuhai';
const GIPHY_API_BASE = 'https://api.giphy.com/v1/gifs';
const DEFAULT_PIC = 'https://res.cloudinary.com/dzvm9xe1i/image/upload/v1746095979/profile-pictures/e2st5nispbicnhnir9cf.jpg';
const CATEGORIES = ['all', 'general', 'football', 'technology', 'music', 'politics', 'religion', 'entertainment', 'gaming', 'business', 'education'];
const REACTION_EMOJIS = ['❤️', '🔥', '😂', '👍', '😮', '😢', '👏', '🙏', '💯', '😍'];

function timeAgo(d) { if (!d) return ''; const diff = Date.now() - new Date(d).getTime(); const mins = Math.floor(diff / 60000); if (mins < 1) return 'now'; if (mins < 60) return `${mins}m`; const hrs = Math.floor(mins / 60); if (hrs < 24) return `${hrs}h`; return `${Math.floor(hrs / 24)}d`; }
function formatDuration(secs) { if (!secs) return '0m'; const h = Math.floor(secs / 3600); const m = Math.floor((secs % 3600) / 60); return h > 0 ? `${h}h ${m}m` : `${m}m`; }
function isDesktop() { if (typeof window === 'undefined') return true; return window.innerWidth >= 768; }

let _msgAudioCtx = null;
function playMessageSound() {
  try {
    if (!_msgAudioCtx) _msgAudioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const ctx = _msgAudioCtx;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = 'sine';
    osc.frequency.setValueAtTime(880, ctx.currentTime);
    osc.frequency.setValueAtTime(1100, ctx.currentTime + 0.05);
    gain.gain.setValueAtTime(0.08, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.15);
  } catch {}
}

function renderMarkdown(text) {
  if (!text) return null;
  const parts = [];
  const regex = /(\*\*(.+?)\*\*|__(.+?)__|__(.+?)__|\*(.+?)\*|_(.+?)_|`(.+?)`|~~(.+?)~~|(https?:\/\/[^\s]+))/g;
  let lastIndex = 0;
  let match;
  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) parts.push(text.slice(lastIndex, match.index));
    if (match[2] || match[3]) parts.push(<strong key={match.index}>{match[2] || match[3]}</strong>);
    else if (match[4] || match[5]) parts.push(<em key={match.index}>{match[4] || match[5]}</em>);
    else if (match[6]) parts.push(<code key={match.index} className="bg-gray-100 px-1.5 py-0.5 rounded text-[13px] font-mono">{match[6]}</code>);
    else if (match[7]) parts.push(<del key={match.index}>{match[7]}</del>);
    else if (match[8]) parts.push(<a key={match.index} href={match[8]} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">{match[8]}</a>);
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < text.length) parts.push(text.slice(lastIndex));
  return parts.length > 0 ? parts : text;
}

export default function Discussions() {
  const roomId = window.location.pathname.split('/discussions/')[1]?.split('?')[0] || '';
  if (roomId) return <DiscussionRoom roomId={roomId} />;
  return <DiscussionsList />;
}

function DiscussionsList() {
  const [tab, setTab] = useState('active');
  const [rooms, setRooms] = useState([]);
  const [archives, setArchives] = useState([]);
  const [myArchives, setMyArchives] = useState([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState('all');
  const [search, setSearch] = useState('');
  const [searchResults, setSearchResults] = useState(null);
  const [showCreate, setShowCreate] = useState(false);
  const [unlocking, setUnlocking] = useState(null);
  const [hostPics, setHostPics] = useState({});
  const searchTimeout = useRef(null);
  const currentUser = localStorage.getItem('currentUser');
  const desktop = isDesktop();

  useEffect(() => { if (!search.trim()) loadTab(); }, [tab, category]);

  const loadTab = () => {
    setLoading(true);
    if (tab === 'active') {
      const url = category === 'all' ? '/api/discussions/active?limit=50' : `/api/discussions/active?category=${category}&limit=50`;
      apiFetch(url).then(r => r.ok ? r.json() : []).then(data => { setRooms(Array.isArray(data) ? data : []); setLoading(false); }).catch(() => { setRooms([]); setLoading(false); });
    } else if (tab === 'archives') {
      apiFetch('/api/discussions/archives?limit=50').then(r => r.ok ? r.json() : []).then(data => { setArchives(Array.isArray(data) ? data : []); setLoading(false); }).catch(() => { setArchives([]); setLoading(false); });
    } else if (tab === 'my-archive' && currentUser) {
      apiFetch(`/api/discussions/my-archive?username=${currentUser}`).then(r => r.ok ? r.json() : []).then(data => { setMyArchives(Array.isArray(data) ? data : []); setLoading(false); }).catch(() => { setMyArchives([]); setLoading(false); });
    } else { setLoading(false); }
  };

  const handleSearch = (val) => {
    setSearch(val);
    clearTimeout(searchTimeout.current);
    if (!val.trim()) { setSearchResults(null); loadTab(); return; }
    searchTimeout.current = setTimeout(() => {
      setLoading(true);
      apiFetch(`/api/discussions/search?q=${encodeURIComponent(val.trim())}&limit=30`).then(r => r.ok ? r.json() : []).then(data => { setSearchResults(Array.isArray(data) ? data : []); setLoading(false); }).catch(() => { setSearchResults([]); setLoading(false); });
    }, 300);
  };

  const displayRooms = searchResults !== null ? searchResults : (tab === 'active' ? rooms : tab === 'archives' ? archives : myArchives);

  useEffect(() => {
    const hosts = [...new Set(displayRooms.map(r => r.host_username))];
    hosts.forEach(h => {
      if (hostPics[h]) return;
      apiFetch(`/profile-pic/${h}`).then(r => r.ok ? r.json() : {}).then(d => {
        if (d?.profile_pic) setHostPics(prev => ({ ...prev, [h]: d.profile_pic }));
      }).catch(() => {});
    });
  }, [displayRooms]);

  const handleDelete = async (id) => {
    if (!confirm('Delete this discussion permanently?')) return;
    await apiFetch(`/api/discussions/room/${id}/delete`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username: currentUser }) });
    setArchives(prev => prev.filter(r => r.id !== id));
    setMyArchives(prev => prev.filter(r => r.id !== id));
    if (searchResults) setSearchResults(prev => prev.filter(r => r.id !== id));
  };

  const handleUnlock = async (rid) => {
    if (!currentUser) return alert('Login required');
    setUnlocking(rid);
    try {
      const res = await apiFetch(`/api/discussions/room/${rid}/unlock`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username: currentUser }) });
      const data = await res.json();
      if (data.unlocked) { window.Lexum?.navigate(`/discussions/${rid}`); } else { alert(data.error || 'Failed'); }
    } catch { alert('Failed'); }
    setUnlocking(null);
  };

  return (
    <div className={desktop ? 'flex h-screen bg-[#f8fafc]' : 'min-h-screen bg-[#f8fafc] pb-20'}>
      {desktop && <Sidebar />}
      <div className={desktop ? 'flex-1 overflow-y-auto scrollbar-thin flex flex-col h-full' : ''}>
        {desktop && <div className="flex-shrink-0 h-14 border-b border-gray-200/50 bg-white/80 backdrop-blur-xl" />}
        {!desktop && (
          <div className="sticky top-0 z-30 flex items-center gap-3 px-4 py-3 bg-white/80 backdrop-blur-xl border-b border-gray-200/50">
            <button onClick={() => window.history.back()} className="p-1.5 rounded-xl hover:bg-gray-100 text-gray-500 transition-colors">
              <NavIcons.ArrowLeft className="w-5 h-5" />
            </button>
            <h1 className="text-base font-bold text-gray-900">Discussions</h1>
          </div>
        )}
        <div className={desktop ? 'max-w-xl mx-auto w-full px-6 py-8' : 'px-4 pt-4'}>
          {!desktop && (
            <div className="flex items-center justify-between mb-4">
              {currentUser && (
                <button onClick={() => setShowCreate(true)} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-full transition-all active:scale-[0.98] shadow-md shadow-blue-500/10">
                  Start
                </button>
              )}
            </div>
          )}
          {desktop && (
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <NavIcons.Discussions className="w-6 h-6 text-blue-600" />
                <h1 className="text-2xl font-black text-gray-900" style={{ fontFamily: 'var(--font-display)' }}>Discussions</h1>
                <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse" />
              </div>
              {currentUser && (
                <button onClick={() => setShowCreate(true)} className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold rounded-full transition-all active:scale-[0.98] shadow-md shadow-blue-500/10">
                  Start
                </button>
              )}
            </div>
          )}

          <div className="flex gap-1 mb-5 bg-gray-100 rounded-2xl p-1">
            {[{ id: 'active', label: 'Active' }, { id: 'archives', label: 'Archives' }, { id: 'my-archive', label: 'My Archive' }].map(t => (
              <button key={t.id} onClick={() => { setTab(t.id); setSearch(''); setSearchResults(null); }} className={`flex-1 py-2.5 text-xs font-semibold rounded-xl transition-all ${tab === t.id ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
                {t.label}
              </button>
            ))}
          </div>

          <div className="relative mb-4">
            <input type="text" placeholder="Search discussions" value={search} onChange={e => handleSearch(e.target.value)} className="w-full px-9 py-2.5 bg-white border border-gray-200 rounded-xl text-[13px] text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-gray-300 transition-colors" />
            {search && <button onClick={() => handleSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"><svg viewBox="0 0 24 24" className="w-3.5 h-3.5 fill-none stroke-current" strokeWidth="2"><path strokeLinecap="round" d="M6 18L18 6M6 6l12 12" /></svg></button>}
          </div>

          {tab === 'active' && !search.trim() && (
            <div className="flex gap-2 overflow-x-auto pb-3 scrollbar-none mb-4">
              {CATEGORIES.map(cat => (
                <button key={cat} onClick={() => setCategory(cat)} className={`flex-shrink-0 px-4 py-2 rounded-full text-xs font-semibold transition-all active:scale-[0.98] ${category === cat ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/20' : 'bg-white text-gray-600 border border-gray-200 hover:border-gray-300'}`}>
                  {cat.charAt(0).toUpperCase() + cat.slice(1)}
                </button>
              ))}
            </div>
          )}

          {tab === 'archives' && (
            <div className="bg-gray-900 rounded-2xl p-4 mb-4 flex items-center gap-3">
              <NavIcons.Wallet className="w-5 h-5 text-yellow-400 flex-shrink-0" />
              <p className="text-xs text-gray-300">Unlock archived discussions for <span className="text-yellow-400 font-bold">500 mobcoins</span>. Host gets 10%.</p>
            </div>
          )}

          {loading ? (
            <div className="flex items-center justify-center py-20"><div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" /></div>
          ) : displayRooms.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3">
              <NavIcons.Discussions className="w-12 h-12 text-gray-200" />
              <p className="text-sm font-semibold text-gray-400">
                {tab === 'active' && (search ? 'No results' : 'No active discussions')}
                {tab === 'archives' && 'No archived discussions'}
                {tab === 'my-archive' && 'No discussions in your archive'}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {displayRooms.map(room => (
                <div key={room.id} className="bg-white border border-gray-100 rounded-2xl p-4 hover:border-blue-200 hover:shadow-sm transition-all">
                  {tab === 'archives' ? (
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center flex-shrink-0">
                        <svg viewBox="0 0 24 24" className="w-5 h-5 fill-none stroke-gray-400" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" /></svg>
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-bold text-gray-900 text-sm truncate">{room.title}</h3>
                        <p className="text-xs text-gray-400 mt-0.5">@{room.host_username} · {room.message_count || 0} messages</p>
                      </div>
                      {room.unlocked ? (
                        <a href={`/discussions/${room.id}`} data-lexum className="px-4 py-2 bg-blue-600 text-white text-xs font-bold rounded-full hover:bg-blue-700 transition-all active:scale-[0.98]">View</a>
                      ) : (
                        <button onClick={() => handleUnlock(room.id)} disabled={unlocking === room.id} className="px-4 py-2 bg-yellow-500 text-white text-xs font-bold rounded-full hover:bg-yellow-600 transition-all active:scale-[0.98] disabled:opacity-50">{unlocking === room.id ? '...' : '500'}</button>
                      )}
                    </div>
                  ) : (
                    <a href={`/discussions/${room.id}`} data-lexum className="block">
                      <div className="flex items-start gap-3">
                        <div className="relative flex-shrink-0">
                          <img src={hostPics[room.host_username] || DEFAULT_PIC} alt="" className="w-11 h-11 rounded-full object-cover" loading="lazy" />
                          {room.status === 'live' && <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-blue-600 border-2 border-white rounded-full" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <h3 className="font-bold text-gray-900 text-sm truncate">{room.title}</h3>
                            {room.room_mode !== 'open' && <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 text-gray-300 flex-shrink-0 fill-none stroke-current" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" /></svg>}
                          </div>
                          <p className="text-xs text-gray-400 mt-0.5">@{room.host_username}</p>
                          {room.description && <p className="text-xs text-gray-400 mt-1 line-clamp-1">{room.description}</p>}
                          <div className="flex items-center gap-3 mt-2">
                            <span className="text-[10px] font-semibold text-gray-300 bg-gray-50 px-2 py-0.5 rounded-full">{room.category}</span>
                            <div className="flex items-center gap-1">
                              <svg viewBox="0 0 24 24" className="w-3 h-3 fill-none stroke-gray-300" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                              <span className="text-[10px] text-gray-300">{room.participant_count || 0}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <svg viewBox="0 0 24 24" className="w-3 h-3 fill-none stroke-gray-300" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M12 7.5h1.5m-1.5 3h1.5m-7.5 3h7.5m-7.5 3h7.5m3-9h3.375c.621 0 1.125.504 1.125 1.125V18a2.25 2.25 0 01-2.25 2.25M16.5 7.5V18a2.25 2.25 0 002.25 2.25M16.5 7.5V4.875c0-.621-.504-1.125-1.125-1.125H4.125C3.504 3.75 3 4.254 3 4.875V18a2.25 2.25 0 002.25 2.25h13.5M6 7.5h3v3H6v-3z" /></svg>
                              <span className="text-[10px] text-gray-300">{room.message_count || 0}</span>
                            </div>
                          </div>
                        </div>
                        <div className="flex-shrink-0">
                          {room.status === 'live' ? (
                            <span className="px-2.5 py-1 bg-blue-50 text-blue-600 text-[10px] font-bold rounded-full">LIVE</span>
                          ) : (
                            <span className="text-[10px] text-gray-300">{timeAgo(room.ended_at)}</span>
                          )}
                        </div>
                      </div>
                      {tab === 'archives' && currentUser === room.host_username && (
                        <div className="mt-2 flex justify-end">
                          <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleDelete(room.id); }} className="text-[10px] text-red-400 hover:text-red-600 font-semibold transition-colors">Delete</button>
                        </div>
                      )}
                    </a>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      {desktop && <aside className="w-80 bg-white border-l border-gray-200/50 overflow-y-auto scrollbar-thin"><RightSidebar /></aside>}
      {showCreate && <CreateRoomModal onClose={() => setShowCreate(false)} onCreated={() => { setShowCreate(false); loadTab(); }} />}
    </div>
  );
}

function DiscussionRoom({ roomId }) {
  const currentUser = localStorage.getItem('currentUser');
  const [room, setRoom] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [typingUsers, setTypingUsers] = useState([]);
  const [showHostPanel, setShowHostPanel] = useState(false);
  const [showReactPicker, setShowReactPicker] = useState(null);
  const [showMenu, setShowMenu] = useState(false);
  const [showGiphy, setShowGiphy] = useState(false);
  const [giphyQuery, setGiphyQuery] = useState('');
  const [giphyResults, setGiphyResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [unlocked, setUnlocked] = useState(false);
  const [unlocking, setUnlocking] = useState(false);
  const [imagePreview, setImagePreview] = useState(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [profilePics, setProfilePics] = useState({});
  const [userVerified, setUserVerified] = useState({});
  const [mentionQuery, setMentionQuery] = useState(null);
  const [mentionResults, setMentionResults] = useState([]);
  const [lightboxUrl, setLightboxUrl] = useState(null);
  const [replyTo, setReplyTo] = useState(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const isLoadingOlder = useRef(false);
  const messagesEndRef = useRef(null);
  const scrollContainerRef = useRef(null);
  const typingTimeout = useRef(null);
  const socketRef = useRef(null);
  const menuRef = useRef(null);
  const giphyTimeout = useRef(null);
  const fileInputRef = useRef(null);
  const mentionTimeout = useRef(null);

  const isHost = room && room.host_username === currentUser;
  const isMuted = room && (room.muted_users || []).includes(currentUser);
  const isLive = room && room.status === 'live';
  const isArchived = room && room.status === 'ended';
  const canView = isLive || unlocked || isHost;
  const desktop = isDesktop();

  useEffect(() => {
    if (!roomId) return;
    apiFetch(`/api/discussions/room/${roomId}`).then(r => r.ok ? r.json() : null).then(data => {
      if (data) {
        setRoom(data);
        if (data.status === 'ended' && data.host_username !== currentUser) {
          apiFetch(`/api/discussions/room/${roomId}/check-unlock?username=${currentUser}`).then(r => r.ok ? r.json() : {}).then(d => setUnlocked(d.unlocked || false)).catch(() => {});
        } else { setUnlocked(true); }
      }
      setLoading(false);
    }).catch(() => setLoading(false));
    apiFetch(`/api/discussions/room/${roomId}/messages?limit=6`).then(r => r.ok ? r.json() : []).then(data => {
      if (Array.isArray(data)) { setMessages(data); setHasMore(data.length >= 6); setIsInitialLoad(false); }
    }).catch(() => {});
  }, [roomId]);

  const loadMoreMessages = () => {
    if (loadingMore || !hasMore || messages.length === 0) return;
    setLoadingMore(true);
    isLoadingOlder.current = true;
    const oldest = messages[0];
    if (!oldest) { setLoadingMore(false); isLoadingOlder.current = false; return; }
    const container = scrollContainerRef.current;
    const prevScrollHeight = container ? container.scrollHeight : 0;
    apiFetch(`/api/discussions/room/${roomId}/messages?limit=6&before=${encodeURIComponent(oldest.created_at)}&before_id=${oldest.id}`).then(r => r.ok ? r.json() : []).then(data => {
      if (Array.isArray(data) && data.length > 0) {
        setMessages(prev => {
          const existingIds = new Set(prev.map(m => m.id));
          const newMsgs = data.filter(m => !existingIds.has(m.id));
          return [...newMsgs, ...prev];
        });
        setHasMore(data.length >= 6);
        requestAnimationFrame(() => {
          if (container) container.scrollTop = container.scrollHeight - prevScrollHeight;
        });
      } else {
        setHasMore(false);
      }
      setLoadingMore(false);
      isLoadingOlder.current = false;
    }).catch(() => { setLoadingMore(false); isLoadingOlder.current = false; });
  };

  useEffect(() => {
    if (!roomId || !currentUser) return;
    const sock = window.socket;
    if (!sock) return;
    socketRef.current = sock;

    sock.emit('join_discussion', { roomId, username: currentUser });

    const onMessage = (msg) => {
      if (msg.username !== currentUser) playMessageSound();
      setMessages(prev => {
        if (prev.some(m => m.id === msg.id)) return prev;
        return [...prev, msg];
      });
    };
    const onTyping = ({ username, stopped }) => {
      if (username === currentUser) return;
      setTypingUsers(prev => stopped ? prev.filter(u => u !== username) : (!prev.includes(username) ? [...prev, username] : prev));
    };
    const onReaction = ({ message_id, reactions, reaction_count }) => {
      setMessages(prev => prev.map(m => m.id === message_id ? { ...m, reactions, reaction_count } : m));
    };
    const onPin = ({ pinned_message_id }) => setRoom(prev => prev ? { ...prev, pinned_message_id } : prev);
    const onModeChange = ({ room_mode }) => setRoom(prev => prev ? { ...prev, room_mode } : prev);
    const onRemoved = ({ username: u }) => { if (u === currentUser) window.Lexum?.navigate('/discussions'); };
    const onEnded = ({ duration }) => {
      setRoom(prev => prev ? { ...prev, status: 'ended', ended_at: new Date().toISOString(), duration_seconds: duration || 0, participant_count: 0 } : prev);
    };
    const onDeleteMsg = ({ message_id }) => setMessages(prev => prev.filter(m => m.id !== message_id));
    const onRoomUpdate = (data) => setRoom(prev => prev ? { ...prev, ...data } : prev);

    sock.on('discussion_message', onMessage);
    sock.on('discussion_typing', onTyping);
    sock.on('discussion_reaction', onReaction);
    sock.on('discussion_pin', onPin);
    sock.on('discussion_mode_change', onModeChange);
    sock.on('discussion_user_removed', onRemoved);
    sock.on('discussion_room_ended', onEnded);
    sock.on('discussion_delete_message', onDeleteMsg);
    sock.on('discussion_room_update', onRoomUpdate);

    if (isLive !== false) apiFetch(`/api/discussions/room/${roomId}/join`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username: currentUser }) }).catch(() => {});

    return () => {
      sock.off('discussion_message', onMessage);
      sock.off('discussion_typing', onTyping);
      sock.off('discussion_reaction', onReaction);
      sock.off('discussion_pin', onPin);
      sock.off('discussion_mode_change', onModeChange);
      sock.off('discussion_user_removed', onRemoved);
      sock.off('discussion_room_ended', onEnded);
      sock.off('discussion_delete_message', onDeleteMsg);
      sock.off('discussion_room_update', onRoomUpdate);
      sock.emit('leave_discussion', { roomId });
      apiFetch(`/api/discussions/room/${roomId}/leave`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username: currentUser }) }).catch(() => {});
    };
  }, [roomId, currentUser, isLive]);

  useEffect(() => {
    if (!isInitialLoad && !isLoadingOlder.current) messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isInitialLoad]);

  useEffect(() => {
    const users = [...new Set(messages.filter(m => m.message_type !== 'system').map(m => m.username))];
    users.forEach(u => {
      if (profilePics[u]) return;
      apiFetch(`/profile-pic/${u}`).then(r => r.ok ? r.json() : {}).then(d => {
        if (d?.profile_pic) setProfilePics(prev => ({ ...prev, [u]: d.profile_pic }));
        if (d?.verified !== undefined) setUserVerified(prev => ({ ...prev, [u]: d.verified }));
      }).catch(() => {});
    });
  }, [messages]);
  useEffect(() => { if (typingUsers.length === 0) return; const t = setTimeout(() => setTypingUsers([]), 3000); return () => clearTimeout(t); }, [typingUsers]);
  useEffect(() => {
    const handler = (e) => { if (menuRef.current && !menuRef.current.contains(e.target)) { setShowMenu(false); setShowHostPanel(false); } };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleUnlock = async () => {
    if (!currentUser) return alert('Login required');
    setUnlocking(true);
    try {
      const res = await apiFetch(`/api/discussions/room/${roomId}/unlock`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username: currentUser }) });
      const data = await res.json();
      if (data.unlocked) setUnlocked(true); else alert(data.error || 'Failed');
    } catch { alert('Failed'); }
    setUnlocking(false);
  };

  const sendMessage = async (content, mediaUrl) => {
    const text = (content || input).trim();
    if ((!text && !mediaUrl) || !currentUser || !isLive) return;
    const currentReplyTo = replyTo;
    setInput(''); setImagePreview(null); setShowGiphy(false); setGiphyQuery(''); setGiphyResults([]); setReplyTo(null);
    socketRef.current?.emit('discussion_stop_typing', { roomId, username: currentUser });
    try {
      const body = { username: currentUser };
      if (mediaUrl) { body.content = mediaUrl; body.message_type = 'image'; }
      else { body.content = text; }
      if (currentReplyTo) body.reply_to_id = currentReplyTo.id;
      const res = await apiFetch(`/api/discussions/room/${roomId}/send`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const msg = await res.json();
      if (msg && msg.id) socketRef.current?.emit('discussion_message', { roomId, ...msg });
    } catch (e) { console.error('send error:', e); }
  };

  const uploadImage = async (file) => {
    if (!file || !isLive) return;
    setUploadingImage(true);
    try {
      const fd = new FormData();
      fd.append('media', file);
      fd.append('username', currentUser);
      fd.append('roomId', roomId);
      const res = await fetch(`${API_BASE_URL}/api/discussions/upload`, { method: 'POST', body: fd });
      const data = await res.json();
      if (data.url) { setImagePreview(data.url); }
    } catch (e) { console.error('upload error:', e); }
    setUploadingImage(false);
  };

  const handleTyping = (val) => {
    setInput(val);
    if (!currentUser || !isLive) return;
    socketRef.current?.emit('discussion_typing', { roomId, username: currentUser });
    clearTimeout(typingTimeout.current);
    typingTimeout.current = setTimeout(() => socketRef.current?.emit('discussion_stop_typing', { roomId, username: currentUser }), 2000);

    const atMatch = val.match(/@(\w*)$/);
    if (atMatch) {
      setMentionQuery(atMatch[1]);
      clearTimeout(mentionTimeout.current);
      mentionTimeout.current = setTimeout(() => {
        apiFetch(`/searchSuggest?query=${encodeURIComponent(atMatch[1])}&currentUsername=${currentUser}`).then(r => r.ok ? r.json() : []).then(data => {
          setMentionResults(Array.isArray(data) ? data.slice(0, 6) : []);
        }).catch(() => setMentionResults([]));
      }, 200);
    } else {
      setMentionQuery(null);
      setMentionResults([]);
    }
  };

  const insertMention = (username) => {
    const replaced = input.replace(/@\w*$/, `@${username} `);
    setInput(replaced);
    setMentionQuery(null);
    setMentionResults([]);
  };

  const handleReact = async (messageId, emoji) => {
    setShowReactPicker(null);
    try {
      const res = await apiFetch(`/api/discussions/room/${roomId}/react`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ message_id: messageId, username: currentUser, emoji }) });
      const data = await res.json();
      if (data) socketRef.current?.emit('discussion_reaction', { roomId, message_id: messageId, ...data });
    } catch {}
  };

  const handlePin = async (messageId) => {
    if (!isHost) return;
    try {
      const res = await apiFetch(`/api/discussions/room/${roomId}/pin`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ host_username: currentUser, message_id: messageId }) });
      const data = await res.json();
      if (data) socketRef.current?.emit('discussion_pin', { roomId, ...data });
    } catch {}
  };

  const handleDeleteMessage = async (messageId) => {
    if (!isHost) return;
    try {
      await apiFetch(`/api/discussions/room/${roomId}/delete-message`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ host_username: currentUser, message_id: messageId }) });
      socketRef.current?.emit('discussion_delete_message', { roomId, message_id: messageId });
      setMessages(prev => prev.filter(m => m.id !== messageId));
    } catch {}
  };

  const handleEndRoom = async () => {
    if (!isHost || !confirm('End this discussion?')) return;
    try {
      const res = await apiFetch(`/api/discussions/room/${roomId}/end`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username: currentUser }) });
      const data = await res.json();
      setRoom(prev => prev ? { ...prev, status: 'ended', ended_at: new Date().toISOString(), duration_seconds: data.duration || 0, participant_count: 0 } : prev);
    } catch {}
  };

  const handleDeleteRoom = async () => {
    if (!isHost || !confirm('Delete this discussion permanently?')) return;
    await apiFetch(`/api/discussions/room/${roomId}/delete`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username: currentUser }) });
    window.Lexum?.navigate('/discussions');
  };

  const searchGiphy = (q) => {
    setGiphyQuery(q);
    clearTimeout(giphyTimeout.current);
    if (!q.trim()) { setGiphyResults([]); return; }
    giphyTimeout.current = setTimeout(() => {
      fetch(`${GIPHY_API_BASE}/search?api_key=${GIPHY_API_KEY}&q=${encodeURIComponent(q)}&limit=12&rating=g`).then(r => r.json()).then(d => setGiphyResults(d.data || [])).catch(() => setGiphyResults([]));
    }, 300);
  };

  const sendGif = (url) => { sendMessage(url); setShowGiphy(false); setGiphyQuery(''); setGiphyResults([]); };

  const pinnedMsg = room?.pinned_message_id ? messages.find(m => m.id === room.pinned_message_id) : null;

  if (loading) return <div className={desktop ? 'flex items-center justify-center h-screen' : 'flex items-center justify-center min-h-screen'}><div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" /></div>;
  if (!room) return <div className="flex flex-col items-center justify-center min-h-screen gap-4"><NavIcons.Discussions className="w-12 h-12 text-gray-200" /><p className="text-sm font-semibold text-gray-400">Discussion not found</p><a href="/discussions" data-lexum className="text-sm text-blue-600 font-bold active:opacity-70">Browse discussions</a></div>;

  if (isArchived && !canView) {
    return (
    <div className={desktop ? 'flex h-screen bg-[#f8fafc]' : 'h-screen bg-[#f8fafc] flex flex-col'}>
        {desktop && <Sidebar />}
        <div className="flex-1 flex flex-col items-center justify-center px-4">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 max-w-sm w-full text-center">
            <div className="w-14 h-14 rounded-2xl bg-gray-100 flex items-center justify-center mx-auto mb-4">
              <svg viewBox="0 0 24 24" className="w-7 h-7 fill-none stroke-gray-400" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" /></svg>
            </div>
            <h2 className="text-base font-bold text-gray-900 mb-1">{room.title}</h2>
            <p className="text-xs text-gray-400 mb-4">by @{room.host_username} · {room.message_count || 0} messages</p>
            <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-3 mb-4">
              <p className="text-xs font-bold text-yellow-700">Unlock this archive</p>
              <p className="text-xs text-yellow-600 mt-0.5">500 mobcoins · Host gets 50 (10%)</p>
            </div>
            <button onClick={handleUnlock} disabled={unlocking} className="w-full py-3 bg-yellow-500 hover:bg-yellow-600 text-white text-sm font-bold rounded-full transition-all active:scale-[0.98] disabled:opacity-50">
              {unlocking ? 'Unlocking...' : 'Unlock for 500 mobcoins'}
            </button>
            <a href="/discussions" data-lexum className="block mt-4 text-xs text-gray-400 font-semibold hover:text-gray-600 active:opacity-70">Back to discussions</a>
          </div>
        </div>
        {desktop && <aside className="w-80 bg-white border-l border-gray-200/50 overflow-y-auto scrollbar-thin"><RightSidebar /></aside>}
      </div>
    );
  }

  return (
    <div className={desktop ? 'flex h-screen bg-[#f8fafc]' : 'min-h-screen bg-[#f8fafc] flex flex-col'}>
      {desktop && <Sidebar />}
      <div className={desktop ? 'flex-1 overflow-hidden flex flex-col h-full' : 'flex flex-col flex-1'}>
        <div className="flex-shrink-0 px-4 py-3 bg-white/80 backdrop-blur-xl border-b border-gray-200/50">
          <div className="flex items-center gap-3">
            <a href="/discussions" data-lexum className="text-gray-400 hover:text-gray-600 transition-colors">
              <NavIcons.ArrowLeft className="w-5 h-5" />
            </a>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                {isLive ? <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse" /> : <span className="w-2 h-2 rounded-full bg-gray-300" />}
                <h2 className="font-bold text-gray-900 text-sm truncate">{room.title}</h2>
              </div>
              <p className="text-xs text-gray-400 mt-0.5">
                {isLive ? <span className="text-blue-600 font-semibold">{room.participant_count || 0} views</span> : <span>Ended {room.duration_seconds ? `· ${formatDuration(room.duration_seconds)}` : ''}</span>}
                <span className="mx-1">·</span>@{room.host_username}
                {room.room_mode !== 'open' && <><span className="mx-1">·</span>{room.room_mode}</>}
              </p>
            </div>
            <div className="relative" ref={menuRef}>
              <button onClick={() => setShowMenu(!showMenu)} className="p-2 rounded-xl hover:bg-gray-100 text-gray-400 transition-colors">
                <NavIcons.Dots className="w-5 h-5" />
              </button>
              {showMenu && (
                <div className="absolute right-0 top-full mt-1 bg-white rounded-2xl shadow-xl border border-gray-100 py-1 z-50 w-48">
                  <button onClick={() => { setShowMenu(false); navigator.clipboard.writeText(`https://textmob.web.app/discussions/${room.id}`); }} className="w-full text-left px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 flex items-center gap-3 transition-colors">
                    <NavIcons.Link className="w-4 h-4" /> Copy link
                  </button>
                  {isLive && isHost && (
                    <>
                      <button onClick={() => { setShowMenu(false); setShowHostPanel(true); }} className="w-full text-left px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 flex items-center gap-3 transition-colors">
                        <NavIcons.Cog className="w-4 h-4" /> Settings
                      </button>
                      <button onClick={() => { setShowMenu(false); handleEndRoom(); }} className="w-full text-left px-4 py-2.5 text-sm font-medium text-red-500 hover:bg-red-50 flex items-center gap-3 transition-colors">
                        <svg viewBox="0 0 24 24" className="w-4 h-4 fill-none stroke-current" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M5.25 7.5A2.25 2.25 0 017.5 5.25h9a2.25 2.25 0 012.25 2.25v9a2.25 2.25 0 01-2.25 2.25h-9a2.25 2.25 0 01-2.25-2.25v-9z" /></svg>
                        End Room
                      </button>
                    </>
                  )}
                  {!isLive && isHost && (
                    <button onClick={() => { setShowMenu(false); handleDeleteRoom(); }} className="w-full text-left px-4 py-2.5 text-sm font-medium text-red-500 hover:bg-red-50 flex items-center gap-3 transition-colors">
                      <svg viewBox="0 0 24 24" className="w-4 h-4 fill-none stroke-current" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" /></svg>
                      Delete
                    </button>
                  )}
                  <button onClick={() => { setShowMenu(false); window.Lexum?.navigate('/discussions'); }} className="w-full text-left px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 flex items-center gap-3 transition-colors">
                    <NavIcons.ArrowRightOnRect className="w-4 h-4" /> Leave
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {!isLive && (
          <div className="flex-shrink-0 px-4 py-3 bg-gray-100 border-b border-gray-200/50 text-center">
            <p className="text-xs font-bold text-gray-400">DISCUSSION ENDED</p>
            <p className="text-xs text-gray-400 mt-0.5">{room.message_count || 0} messages · {formatDuration(room.duration_seconds)}</p>
          </div>
        )}

        {pinnedMsg && (
          <button onClick={() => { const el = document.getElementById(`msg-${pinnedMsg.id}`); if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' }); }} className="flex-shrink-0 w-full px-4 py-2 bg-yellow-50 border-b border-yellow-200 flex items-center gap-2 hover:bg-yellow-100 transition-colors text-left">
            <span className="text-yellow-500 flex-shrink-0">📌</span>
            <p className="text-xs text-yellow-700 truncate"><span className="font-bold">@{pinnedMsg.username}</span> {pinnedMsg.content?.startsWith('http') ? '📷 Image' : pinnedMsg.content}</p>
          </button>
        )}

        <div ref={scrollContainerRef} className="flex-1 overflow-y-auto px-4 py-4">
          {hasMore && (
            <div className="text-center py-3">
              {loadingMore ? (
                <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto" />
              ) : (
                <button onClick={loadMoreMessages} className="text-[12px] text-blue-600 font-semibold hover:text-blue-700 transition-colors">
                  Load earlier messages
                </button>
              )}
            </div>
          )}
          {messages.map((msg, idx) => {
            const prev = idx > 0 ? messages[idx - 1] : null;
            const isGrouped = prev && prev.username === msg.username && prev.message_type !== 'system' && msg.message_type !== 'system' && (new Date(msg.created_at) - new Date(prev.created_at)) < 300000;
            const replyToMsg = msg.reply_to_id ? messages.find(m => m.id === msg.reply_to_id) : null;
            return (
              <div key={msg.id} id={`msg-${msg.id}`}>
                <MessageBubble msg={msg} isOwn={msg.username === currentUser} isHost={msg.username === room.host_username} onReact={() => isLive && setShowReactPicker(showReactPicker === msg.id ? null : msg.id)} onPin={() => handlePin(msg.id)} onDelete={() => handleDeleteMessage(msg.id)} onReply={() => { setReplyTo(msg); }} isHostUser={isHost} isLive={isLive} profilePic={profilePics[msg.username]} verified={userVerified[msg.username]} isGrouped={isGrouped} replyToMsg={replyToMsg} onOpenLightbox={(url) => setLightboxUrl(url)} lightboxItems={true} />
              </div>
            );
          })}
          {typingUsers.length > 0 && isLive && (
            <div className="flex items-center gap-2 text-gray-400">
              <div className="flex gap-1">
                <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
              <span className="text-xs">{typingUsers.join(', ')} typing...</span>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {showReactPicker && (
          <div className="absolute bottom-20 left-4 bg-white rounded-2xl shadow-xl border border-gray-100 p-2 flex flex-wrap gap-1 z-50 max-w-xs">
            {REACTION_EMOJIS.map(emoji => (
              <button key={emoji} onClick={() => handleReact(showReactPicker, emoji)} className="w-10 h-10 flex items-center justify-center hover:bg-gray-100 rounded-xl transition-colors text-xl">
                {emoji}
              </button>
            ))}
            {isHost && <button onClick={() => { handlePin(showReactPicker); setShowReactPicker(null); }} className="w-10 h-10 flex items-center justify-center hover:bg-gray-100 rounded-xl text-yellow-500 text-lg">📌</button>}
          </div>
        )}

        {showHostPanel && isHost && isLive && (
          <div className="absolute top-14 right-4 bg-white rounded-2xl shadow-xl border border-gray-100 p-4 z-50 w-56">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-bold text-gray-900">Settings</h3>
              <button onClick={() => setShowHostPanel(false)} className="text-gray-400 hover:text-gray-600"><svg viewBox="0 0 24 24" className="w-4 h-4 fill-none stroke-current" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg></button>
            </div>
            <div className="space-y-1">
              <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Room Mode</p>
              {['open', 'moderated', 'locked'].map(mode => (
                <button key={mode} onClick={async () => {
                  await apiFetch(`/api/discussions/room/${roomId}/mode`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ host_username: currentUser, room_mode: mode }) });
                  socketRef.current?.emit('discussion_mode_change', { roomId, room_mode: mode });
                  setRoom(prev => prev ? { ...prev, room_mode: mode } : prev);
                }} className={`w-full text-left px-3 py-2 rounded-xl text-xs font-semibold transition-all ${room.room_mode === mode ? 'bg-blue-50 text-blue-600 border border-blue-200' : 'text-gray-600 hover:bg-gray-50 border border-transparent'}`}>
                  {mode === 'open' ? 'Open' : mode === 'moderated' ? 'Moderated' : 'Locked'}
                </button>
              ))}
            </div>
          </div>
        )}

        {showGiphy && (
          <div className="absolute bottom-16 left-2 right-2 sm:left-4 sm:right-4 md:left-auto md:right-4 md:w-80 bg-white rounded-2xl shadow-xl border border-gray-100 z-50 max-h-[50vh] sm:max-h-64 flex flex-col">
            <div className="flex items-center gap-2 p-3 border-b border-gray-100">
              <NavIcons.Search className="w-4 h-4 text-gray-400 flex-shrink-0" />
              <input type="text" autoFocus placeholder="Search GIFs..." value={giphyQuery} onChange={e => searchGiphy(e.target.value)} className="flex-1 text-sm sm:text-xs text-gray-900 placeholder:text-gray-400 focus:outline-none" />
              <button onClick={() => { setShowGiphy(false); setGiphyQuery(''); setGiphyResults([]); }} className="text-gray-400 hover:text-gray-600"><svg viewBox="0 0 24 24" className="w-4 h-4 fill-none stroke-current" strokeWidth="2"><path strokeLinecap="round" d="M6 18L18 6M6 6l12 12" /></svg></button>
            </div>
            <div className="overflow-y-auto p-2 grid grid-cols-3 sm:grid-cols-3 gap-1.5">
              {giphyResults.map(gif => (
                <button key={gif.id} onClick={() => sendGif(gif.images.original.url)} className="rounded-xl overflow-hidden aspect-square bg-gray-100 active:scale-95 transition-transform">
                  <img src={gif.images.fixed_height.url} alt="" className="w-full h-full object-cover" loading="lazy" />
                </button>
              ))}
              {giphyResults.length === 0 && giphyQuery && <div className="col-span-3 py-8 text-center text-xs text-gray-400">Searching...</div>}
              {!giphyQuery && <div className="col-span-3 py-8 text-center text-xs text-gray-400">Search for GIFs</div>}
            </div>
          </div>
        )}

        {isLive ? (
          <div className="flex-shrink-0 px-4 py-3 bg-white border-t border-gray-200/50">
            {isMuted ? <p className="text-xs text-gray-400 text-center py-2">You are muted</p> : room.room_mode === 'locked' && !isHost ? <p className="text-xs text-gray-400 text-center py-2">Room is locked</p> : (
              <>
                {imagePreview && (
                  <div className="mb-2 relative inline-block">
                    <img src={imagePreview} alt="" className="h-20 rounded-xl object-cover border border-gray-200" />
                    <button onClick={() => setImagePreview(null)} className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 text-white rounded-full text-[10px] font-bold flex items-center justify-center">X</button>
                  </div>
                )}
                {replyTo && (
                  <div className="mb-2 flex items-center gap-2 bg-blue-50 border border-blue-200 rounded-xl px-3 py-2">
                    <div className="w-0.5 h-8 bg-blue-400 rounded-full flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-[11px] font-bold text-blue-600">@{replyTo.username}</p>
                      <p className="text-[11px] text-gray-500 truncate">{replyTo.content?.startsWith('http') ? '📷 Image' : replyTo.content}</p>
                    </div>
                    <button onClick={() => setReplyTo(null)} className="text-gray-400 hover:text-gray-600 flex-shrink-0"><svg viewBox="0 0 24 24" className="w-3.5 h-3.5 fill-none stroke-current" strokeWidth="2"><path strokeLinecap="round" d="M6 18L18 6M6 6l12 12" /></svg></button>
                  </div>
                )}
                {mentionQuery !== null && mentionResults.length > 0 && (
                  <div className="absolute bottom-full left-4 right-4 mb-1 bg-white rounded-xl shadow-xl border border-gray-100 py-1 z-50 max-h-48 overflow-y-auto">
                    {mentionResults.map(u => (
                      <button key={u.username || u} onClick={() => insertMention(u.username || u)} className="w-full text-left px-4 py-2.5 hover:bg-gray-50 flex items-center gap-3 transition-colors">
                        <img src={u.profile_pic || DEFAULT_PIC} alt="" className="w-7 h-7 rounded-full object-cover" />
                        <span className="text-sm font-semibold text-gray-800">{u.username || u}</span>
                        {u.fullname && <span className="text-xs text-gray-400">{u.fullname}</span>}
                      </button>
                    ))}
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <button onClick={() => fileInputRef.current?.click()} className="p-2 rounded-xl hover:bg-gray-100 text-gray-400 transition-colors flex-shrink-0" title="Upload image">
                    <svg viewBox="0 0 24 24" className="w-5 h-5 fill-none stroke-current" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0022.5 18.75V5.25A2.25 2.25 0 0020.25 3H3.75A2.25 2.25 0 001.5 5.25v13.5A2.25 2.25 0 003.75 21z" /></svg>
                  </button>
                  <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) uploadImage(f); e.target.value = ''; }} />
                  <div className="flex-1 flex items-center bg-gray-100 rounded-full px-4 py-2 min-w-0">
                    <input type="text" value={input} onChange={e => handleTyping(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } }} placeholder="Message..." className="flex-1 bg-transparent text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none min-w-0" maxLength={2000} />
                    <button onClick={() => setShowGiphy(!showGiphy)} className="ml-2 text-gray-400 hover:text-gray-600 flex-shrink-0 transition-colors">
                      <svg viewBox="0 0 24 24" className="w-5 h-5 fill-none stroke-current" strokeWidth="1.5"><rect x="2" y="2" width="20" height="20" rx="4" /><text x="6" y="16" fontSize="9" fill="currentColor" stroke="none" fontWeight="bold">GIF</text></svg>
                    </button>
                  </div>
                  {(input.trim() || imagePreview) ? (
                    <button onClick={() => imagePreview ? sendMessage(null, imagePreview) : sendMessage()} className="w-10 h-10 flex items-center justify-center bg-blue-600 hover:bg-blue-700 rounded-full flex-shrink-0 transition-all active:scale-[0.98] shadow-sm shadow-blue-500/20">
                      <svg viewBox="0 0 24 24" className="w-4 h-4 fill-white"><path d="M3.478 2.405a.75.75 0 00-.926.94l2.432 7.905H13.5a.75.75 0 010 1.5H4.984l-2.432 7.905a.75.75 0 00.926.94 60.519 60.519 0 0018.445-8.986.75.75 0 000-1.218A60.517 60.517 0 003.478 2.405z" /></svg>
                    </button>
                  ) : <div className="w-10 flex-shrink-0" />}
                </div>
              </>
            )}
          </div>
        ) : (
          <div className="flex-shrink-0 px-4 py-3 bg-gray-50 border-t border-gray-200/50 text-center">
            <p className="text-xs font-bold text-gray-400">Discussion has ended</p>
            <a href="/discussions" data-lexum className="text-xs text-blue-600 font-semibold mt-1 inline-block active:opacity-70">Browse more</a>
          </div>
        )}
      </div>
      {desktop && <aside className="w-80 bg-white border-l border-gray-200/50 overflow-y-auto scrollbar-thin"><RightSidebar /></aside>}
      {lightboxUrl && (
        <div className="fixed inset-0 z-[999] flex items-center justify-center bg-black/80 backdrop-blur-sm" onClick={() => setLightboxUrl(null)}>
          <button onClick={() => setLightboxUrl(null)} className="absolute top-4 right-4 text-white/80 hover:text-white"><svg viewBox="0 0 24 24" className="w-8 h-8 fill-none stroke-current" strokeWidth="2"><path strokeLinecap="round" d="M6 18L18 6M6 6l12 12" /></svg></button>
          <img src={lightboxUrl} alt="" className="max-w-[90vw] max-h-[90vh] object-contain rounded-lg" onClick={e => e.stopPropagation()} />
        </div>
      )}
    </div>
  );
}

function MessageBubble({ msg, isOwn, isHost, onReact, onPin, onDelete, onReply, isHostUser, isLive, profilePic, verified, isGrouped, replyToMsg, onOpenLightbox, lightboxItems }) {
  const [showActions, setShowActions] = useState(false);
  const actionsRef = useRef(null);

  useEffect(() => {
    if (!showActions) return;
    const handler = (e) => { if (actionsRef.current && !actionsRef.current.contains(e.target)) setShowActions(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showActions]);

  if (msg.message_type === 'system') return null;
  const isGif = msg.content && msg.content.includes('giphy.com');
  const isImage = msg.message_type === 'image' || (msg.content && msg.content.match(/\.(jpg|jpeg|png|gif|webp)(\?|$)/i) && !isGif);
  const isMedia = isGif || isImage;
  const reactions = msg.reactions || {};
  const pic = profilePic || msg.profile_pic || DEFAULT_PIC;

  const actionsBar = (
    <div className="flex items-center gap-0.5 bg-white border border-gray-200 rounded-lg shadow-sm">
      <button onClick={() => { setShowActions(false); onReact?.(); }} className="p-1.5 hover:bg-gray-100 rounded-l-lg transition-colors" title="React">
        <svg viewBox="0 0 24 24" className="w-4 h-4 fill-none stroke-gray-500" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M15.182 15.182a4.5 4.5 0 01-6.364 0M21 12a9 9 0 11-18 0 9 9 0 0118 0zM9.75 9.75c0 .414-.168.75-.375.75S9 10.164 9 9.75 9.168 9 9.375 9s.375.336.375.75zm-.375 0h.008v.015h-.008V9.75zm5.625 0c0 .414-.168.75-.375.75s-.375-.336-.375-.75.168-.75.375-.75.375.336.375.75zm-.375 0h.008v.015h-.008V9.75z" /></svg>
      </button>
      {onReply && <button onClick={() => { setShowActions(false); onReply(); }} className="p-1.5 hover:bg-gray-100 transition-colors" title="Reply">
        <svg viewBox="0 0 24 24" className="w-4 h-4 fill-none stroke-gray-500" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M9 15L3 9m0 0l6-6M3 9h12a6 6 0 010 12h-3" /></svg>
      </button>}
      {isHostUser && <button onClick={() => { setShowActions(false); onPin?.(); }} className="p-1.5 hover:bg-gray-100 transition-colors text-[10px] font-bold text-gray-500" title="Pin">PIN</button>}
      {(isHostUser || isOwn) && <button onClick={() => { setShowActions(false); onDelete?.(); }} className="p-1.5 hover:bg-red-50 rounded-r-lg transition-colors" title="Delete">
        <svg viewBox="0 0 24 24" className="w-4 h-4 fill-none stroke-gray-500" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" /></svg>
      </button>}
    </div>
  );

  if (isGrouped) {
    return (
      <div className="group flex items-start gap-3 sm:gap-4 py-0.5 px-1 hover:bg-gray-50/50 rounded -mx-1">
        <div className="w-10 flex-shrink-0" />
        <div className="flex-1 min-w-0">
          {replyToMsg && (
            <button onClick={() => { const el = document.getElementById(`msg-${replyToMsg.id}`); if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' }); }} className="flex items-center gap-1.5 mb-1 pl-2 border-l-2 border-blue-300 hover:bg-blue-50 rounded transition-colors text-left w-full">
              <span className="text-[11px] text-blue-500 font-semibold">@{replyToMsg.username}</span>
              <span className="text-[11px] text-gray-400 truncate max-w-[200px]">{replyToMsg.content?.startsWith('http') ? '📷 Image' : replyToMsg.content}</span>
            </button>
          )}
          {isMedia ? (
            <div className="max-w-[80vw] sm:max-w-[300px]">
              <img src={isGif ? msg.content : msg.media_url || msg.content} alt="" className="w-full rounded-lg cursor-pointer hover:opacity-90 transition-opacity" loading="lazy" onClick={() => {
                const url = isGif ? msg.content : msg.media_url || msg.content;
                if (onOpenLightbox && lightboxItems) onOpenLightbox(url);
                else window.open(url, '_blank');
              }} />
            </div>
          ) : (
            <span className="text-sm text-gray-800 leading-relaxed whitespace-pre-wrap break-words">{renderMarkdown(msg.content)}</span>
          )}
          {Object.keys(reactions).length > 0 && (
            <div className="flex flex-wrap gap-1 mt-1">
              {Object.entries(reactions).map(([emoji, users]) => (
                <span key={emoji} className="text-xs bg-white border border-gray-200 rounded-md px-1.5 py-0.5 cursor-pointer hover:bg-gray-100 transition-colors" onClick={onReact}>
                  <span className="mr-0.5">{emoji}</span>
                  <span className="text-gray-500 font-medium">{Array.isArray(users) ? users.length : users}</span>
                </span>
              ))}
            </div>
          )}
        </div>
        <div className="flex-shrink-0 relative" ref={actionsRef}>
          <button onClick={() => setShowActions(v => !v)} className="md:hidden p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 transition-colors">
            <NavIcons.Dots className="w-4 h-4" />
          </button>
          <div className="hidden md:block opacity-0 group-hover:opacity-100 -mt-3 mr-1">
            {actionsBar}
          </div>
          {showActions && (
            <div className="md:hidden absolute right-0 top-full mt-1 z-50">
              {actionsBar}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="group flex items-start gap-3 sm:gap-4 py-2 px-1 hover:bg-gray-50/50 rounded -mx-1 mt-3 first:mt-0">
      <img src={pic} alt="" className="w-10 h-10 rounded-full object-cover flex-shrink-0 cursor-pointer hover:opacity-80 transition-opacity" onClick={() => window.Lexum?.navigate(`/@${msg.username}`)} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <span className={`text-sm font-semibold cursor-pointer hover:underline ${isHost ? 'text-blue-600' : 'text-gray-800'}`} onClick={() => window.Lexum?.navigate(`/@${msg.username}`)}>{msg.username}</span>
          {verified && <VerifiedBadge className="w-3.5 h-3.5" />}
          {isHost && <span className="text-[10px] bg-blue-100 text-blue-600 px-1.5 py-0.5 rounded font-bold">HOST</span>}
          <span className="text-[11px] text-gray-400">{timeAgo(msg.created_at)}</span>
        </div>
        {replyToMsg && (
          <button onClick={() => { const el = document.getElementById(`msg-${replyToMsg.id}`); if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' }); }} className="flex items-center gap-1.5 mb-1 pl-2 border-l-2 border-blue-300 hover:bg-blue-50 rounded transition-colors text-left w-full">
            <span className="text-[11px] text-blue-500 font-semibold">@{replyToMsg.username}</span>
            <span className="text-[11px] text-gray-400 truncate max-w-[200px]">{replyToMsg.content?.startsWith('http') ? '📷 Image' : replyToMsg.content}</span>
          </button>
        )}
        {isMedia ? (
          <div className="max-w-[80vw] sm:max-w-[300px]">
            <img src={isGif ? msg.content : msg.media_url || msg.content} alt="" className="w-full rounded-lg cursor-pointer hover:opacity-90 transition-opacity" loading="lazy" onClick={() => {
              const url = isGif ? msg.content : msg.media_url || msg.content;
              if (onOpenLightbox && lightboxItems) onOpenLightbox(url);
              else window.open(url, '_blank');
            }} />
          </div>
        ) : (
          <p className="text-sm text-gray-800 leading-relaxed whitespace-pre-wrap break-words">{renderMarkdown(msg.content)}</p>
        )}
        {Object.keys(reactions).length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1.5">
            {Object.entries(reactions).map(([emoji, users]) => (
              <span key={emoji} className="text-xs bg-white border border-gray-200 rounded-md px-1.5 py-0.5 cursor-pointer hover:bg-gray-100 transition-colors" onClick={onReact}>
                <span className="mr-0.5">{emoji}</span>
                <span className="text-gray-500 font-medium">{Array.isArray(users) ? users.length : users}</span>
              </span>
            ))}
          </div>
        )}
      </div>
      <div className="flex-shrink-0 relative" ref={actionsRef}>
        <button onClick={() => setShowActions(v => !v)} className="md:hidden p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 transition-colors">
          <NavIcons.Dots className="w-4 h-4" />
        </button>
        <div className="hidden md:block opacity-0 group-hover:opacity-100 -mt-3 mr-1">
          {actionsBar}
        </div>
        {showActions && (
          <div className="md:hidden absolute right-0 top-full mt-1 z-50">
            {actionsBar}
          </div>
        )}
      </div>
    </div>
  );
}

function CreateRoomModal({ onClose, onCreated }) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('general');
  const [loading, setLoading] = useState(false);
  const handleCreate = async () => {
    if (!title.trim()) return; setLoading(true);
    try {
      const res = await apiFetch('/api/discussions/create', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username: localStorage.getItem('currentUser'), title: title.trim(), description: description.trim(), category }) });
      const data = await res.json();
      if (data?.id) { onCreated(); window.Lexum?.navigate(`/discussions/${data.id}`); }
      else { console.error('discussions/create failed:', data); alert(data?.error || 'Failed to create discussion'); }
    } catch (e) { console.error('discussions/create error:', e); alert('Failed to create discussion'); } setLoading(false);
  };
  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white rounded-2xl p-6 w-[420px] max-w-[90vw] shadow-xl" onClick={e => e.stopPropagation()}>
        <h2 className="text-lg font-bold text-gray-900 mb-4">Start a Discussion</h2>
        <input type="text" placeholder="Room title" value={title} onChange={e => setTitle(e.target.value.slice(0, 120))} maxLength={120} className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl text-sm font-semibold text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-blue-400 focus:bg-white transition-colors mb-3" />
        <textarea placeholder="What's the discussion about?" value={description} onChange={e => setDescription(e.target.value.slice(0, 500))} rows={2} className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl text-sm text-gray-700 placeholder:text-gray-400 focus:outline-none focus:border-blue-400 focus:bg-white transition-colors mb-3 resize-none" />
        <select value={category} onChange={e => setCategory(e.target.value)} className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl text-sm text-gray-700 focus:outline-none focus:border-blue-400 transition-colors mb-4">
          {CATEGORIES.filter(c => c !== 'all').map(c => <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>)}
        </select>
        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 py-3 bg-gray-100 text-gray-600 text-sm font-bold rounded-full hover:bg-gray-200 transition-all active:scale-[0.98]">Cancel</button>
          <button onClick={handleCreate} disabled={!title.trim() || loading} className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold rounded-full transition-all active:scale-[0.98] disabled:opacity-50 shadow-md shadow-blue-500/10">{loading ? 'Starting...' : 'Go Live'}</button>
        </div>
      </div>
    </div>
  );
}
