import { DEFAULT_AVATAR } from '../../utils/defaultAvatar.js';
import { useState, useEffect, useRef, useMemo, useCallback, memo } from 'react';
import { apiFetch, API_BASE_URL } from '../../config/api';
import NavIcons from '../../utils/navIcons';
import { VerifiedBadge } from '../../components/ui/VerifiedBadge';
import {
  REACTION_EMOJIS, timeAgo, clockTime, dayLabel, formatDuration,
  useMediaQuery, renderMarkdown, playMessageSound, useUserMeta, useGlobalOnline,
} from './discussionsShared';
import { DiscussionsShell } from './ChannelRail';

const GIPHY_API_KEY = '1PsuVrcwCRiOYQEfqgPOd9kVuoRmuhai';
const GIPHY_API_BASE = 'https://api.giphy.com/v1/gifs';
const DEFAULT_PIC = DEFAULT_AVATAR;
const PAGE = 30;

/* ── tiny inline icons (Discord-style) ── */
const Ico = ({ d, className = 'w-4 h-4', sw = 2 }) => (
  <svg viewBox="0 0 24 24" className={`${className} fill-none stroke-current`} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round"><path d={d} /></svg>
);
const HashIcon = ({ className = 'w-5 h-5' }) => (
  <svg viewBox="0 0 24 24" className={className} fill="currentColor"><path fillRule="evenodd" d="M5.25 2.25a3 3 0 0 0-3 3v13.5a3 3 0 0 0 3 3h13.5a3 3 0 0 0 3-3V5.25a3 3 0 0 0-3-3H5.25Zm1.5 4.5a.75.75 0 0 1 .75-.75h9a.75.75 0 0 1 0 1.5h-9a.75.75 0 0 1-.75-.75Zm.75 2.25a.75.75 0 0 0 0 1.5H12a.75.75 0 0 0 0-1.5H7.5Zm.75 3a.75.75 0 0 1 .75.75v4.5a.75.75 0 0 1-1.5 0v-4.5a.75.75 0 0 1 .75-.75Zm4.5-3a.75.75 0 0 0 0 1.5h4.5a.75.75 0 0 0 0-1.5H12Zm-.75 3a.75.75 0 0 1 .75.75v4.5a.75.75 0 0 1-1.5 0v-4.5a.75.75 0 0 1 .75-.75Z" clipRule="evenodd" /></svg>
);
const PinIcon = (p) => <Ico d="M15.666 3.888A2.25 2.25 0 0013.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a.75.75 0 01-.75.75H9a.75.75 0 01-.75-.75v0c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 01-2.25 2.25H6.75A2.25 2.25 0 014.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 011.927-.184" {...p} />;
const MembersIcon = (p) => <Ico d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" {...p} />;
const SmileIcon = (p) => <Ico d="M15.182 15.182a4.5 4.5 0 01-6.364 0M21 12a9 9 0 11-18 0 9 9 0 0118 0zM9.75 9.75c0 .414-.168.75-.375.75S9 10.164 9 9.75 9.168 9 9.375 9s.375.336.375.75zm-.375 0h.008v.015h-.008V9.75zm5.625 0c0 .414-.168.75-.375.75s-.375-.336-.375-.75.168-.75.375-.75.375.336.375.75zm-.375 0h.008v.015h-.008V9.75z" {...p} />;
const ReplyIcon = (p) => <Ico d="M9 15L3 9m0 0l6-6M3 9h12a6 6 0 010 12h-3" {...p} />;
const TrashIcon = (p) => <Ico d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" {...p} />;
const PlusIcon = (p) => <Ico d="M12 4.5v15m7.5-7.5h-15" {...p} />;
const SendIcon = () => (
  <svg viewBox="0 0 24 24" className="w-4 h-4 fill-white"><path d="M3.478 2.405a.75.75 0 00-.926.94l2.432 7.905H13.5a.75.75 0 010 1.5H4.984l-2.432 7.905a.75.75 0 00.926.94 60.519 60.519 0 0018.445-8.986.75.75 0 000-1.218A60.517 60.517 0 003.478 2.405z" /></svg>
);

function ToolBtn({ onClick, title, danger, children }) {
  return (
    <button onClick={onClick} title={title} aria-label={title}
      className={`p-2 transition-colors ${danger ? 'text-gray-500 hover:bg-red-50 hover:text-red-600' : 'text-gray-500 hover:bg-gray-100 hover:text-gray-800'}`}>
      {children}
    </button>
  );
}

/* ══════════════════════ MESSAGE ROW ══════════════════════ */
const MessageRow = memo(function MessageRow({
  msg, grouped, replyToMsg, isOwn, isMsgHost, isHostUser, isLive,
  pic, verified, pickerOpen, onTogglePicker, onPick, onReply, onPin,
  onDelete, onJump, onLightbox, currentUser,
}) {
  const [showActions, setShowActions] = useState(false);
  if (msg.message_type === 'system') return null;

  const isGif = !!(msg.content && msg.content.includes('giphy.com'));
  const isImage = msg.message_type === 'image' || !!(msg.content && msg.content.match(/\.(jpg|jpeg|png|gif|webp)(\?|$)/i) && !isGif);
  const isMedia = isGif || isImage;
  const mediaUrl = isGif ? msg.content : (msg.media_url || msg.content);
  const reactions = msg.reactions || {};
  const reactionKeys = Object.keys(reactions);

  const toolbar = (
    <div className="flex items-center bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
      <ToolBtn title="React" onClick={() => { setShowActions(false); onTogglePicker(msg.id); }}><SmileIcon className="w-4 h-4" /></ToolBtn>
      {isLive && <ToolBtn title="Reply" onClick={() => { setShowActions(false); onReply(msg); }}><ReplyIcon className="w-4 h-4" /></ToolBtn>}
      {isHostUser && <ToolBtn title="Pin" onClick={() => { setShowActions(false); onPin(msg.id); }}><PinIcon className="w-4 h-4" /></ToolBtn>}
      {(isHostUser || isOwn) && <ToolBtn danger title="Delete" onClick={() => { setShowActions(false); onDelete(msg.id); }}><TrashIcon className="w-4 h-4" /></ToolBtn>}
    </div>
  );

  return (
    <div id={`msg-${msg.id}`} className="group relative flex gap-3 sm:gap-4 px-4 pt-2 pb-0.5 rounded-xl hover:bg-gray-50/70 scroll-mt-24">
      {grouped ? (
        <div className="hidden md:block w-[56px] shrink-0 text-right pt-[3px] text-[10px] leading-4 text-gray-400 opacity-0 group-hover:opacity-100 select-none tabular-nums">
          {clockTime(msg.created_at)}
        </div>
      ) : (
        <button onClick={() => onJump(msg.username)} className="shrink-0 mt-0.5" aria-label={msg.username}>
          <img src={pic || DEFAULT_PIC} alt="" loading="lazy" className="w-10 h-10 rounded-full object-cover bg-gray-100 hover:opacity-80 transition-opacity" />
        </button>
      )}

      <div className="min-w-0 flex-1">
        {replyToMsg && (
          <div className="flex items-center gap-1.5 mb-1 pl-2 border-l-2 border-blue-300 rounded">
            <span className="text-[11px] text-blue-500 font-semibold shrink-0">@{replyToMsg.username}</span>
            <span className="text-[11px] text-gray-400 truncate max-w-[240px]">{replyToMsg.content?.startsWith('http') ? '📷 Image' : replyToMsg.content}</span>
          </div>
        )}
        {!grouped && (
          <div className="flex items-center gap-2 mb-0.5 flex-wrap">
            <button onClick={() => onJump(msg.username)} className={`text-sm font-semibold hover:underline ${isMsgHost ? 'text-blue-600' : 'text-gray-900'}`}>{msg.username}</button>
            {verified && <VerifiedBadge className="w-3.5 h-3.5" />}
            {isMsgHost && <span className="text-[9px] font-bold tracking-wide bg-blue-100 text-blue-600 px-1.5 py-[1px] rounded">HOST</span>}
            <span className="text-[11px] text-gray-400">{timeAgo(msg.created_at)}</span>
          </div>
        )}

        {isMedia ? (
          <button onClick={() => onLightbox(mediaUrl)} className="block max-w-[320px] sm:max-w-[380px] rounded-xl overflow-hidden border border-gray-100 hover:border-gray-200 transition-colors">
            <img src={mediaUrl} alt="" loading="lazy" className="w-full block bg-gray-100" />
          </button>
        ) : (
          <p className="text-sm text-gray-800 leading-[1.45] whitespace-pre-wrap break-words">{renderMarkdown(msg.content)}</p>
        )}

        {reactionKeys.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1.5">
            {reactionKeys.map(emoji => {
              const users = reactions[emoji];
              const count = Array.isArray(users) ? users.length : users;
              const mine = Array.isArray(users) && users.includes(currentUser);
              return (
                <button key={emoji} onClick={() => isLive && onPick(msg.id, emoji)}
                  className={`inline-flex items-center gap-1 px-1.5 py-[1px] rounded-lg border text-xs transition-colors ${mine ? 'bg-blue-50 border-blue-300 text-blue-700' : 'bg-gray-50 border-gray-200 text-gray-600 hover:border-gray-300'}`}>
                  <span>{emoji}</span>
                  <span className="font-semibold tabular-nums">{count}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* desktop hover toolbar */}
      <div className="hidden md:block absolute -top-3 right-4 z-20 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity pointer-events-none group-hover:pointer-events-auto">
        {toolbar}
      </div>

      {/* mobile / touch actions */}
      <button onClick={() => setShowActions(v => !v)} aria-label="Message actions"
        className="md:hidden absolute -top-1 right-2 p-2 text-gray-400 hover:text-gray-600 rounded-lg">
        <NavIcons.Dots className="w-4 h-4" />
      </button>
      {showActions && (
        <div className="md:hidden absolute right-2 top-7 z-30">{toolbar}</div>
      )}

      {pickerOpen && (
        <div className="absolute right-2 sm:right-4 top-6 z-40 w-[248px] bg-white rounded-2xl shadow-xl border border-gray-200 p-2 flex flex-wrap gap-1">
          {REACTION_EMOJIS.map(emoji => (
            <button key={emoji} onClick={() => { onPick(msg.id, emoji); onTogglePicker(msg.id); }}
              className="w-10 h-10 flex items-center justify-center hover:bg-gray-100 rounded-xl text-xl transition-colors">{emoji}</button>
          ))}
          {isHostUser && (
            <button onClick={() => { onPin(msg.id); onTogglePicker(msg.id); }}
              className="w-10 h-10 flex items-center justify-center hover:bg-gray-100 rounded-xl text-lg" title="Pin message">📌</button>
          )}
        </div>
      )}
    </div>
  );
});

/* ══════════════════════ MEMBERS PANEL ══════════════════════ */
const MemberRow = memo(function MemberRow({ username, isHost, online, pic, verified }) {
  return (
    <div className="flex items-center gap-3 px-4 py-1.5 rounded-xl hover:bg-gray-100/70 transition-colors">
      <div className="relative shrink-0">
        <img src={pic || DEFAULT_PIC} alt="" loading="lazy" className="w-8 h-8 rounded-full object-cover bg-gray-200" />
        {online && <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-500 border-2 border-gray-50 rounded-full" />}
      </div>
      <span className={`text-sm font-medium truncate ${isHost ? 'text-blue-600' : 'text-gray-700'}`}>{username}</span>
      {verified && <VerifiedBadge className="w-3.5 h-3.5" />}
      {isHost && <span className="ml-auto text-[9px] font-bold bg-blue-100 text-blue-600 px-1.5 py-[1px] rounded shrink-0">HOST</span>}
    </div>
  );
});

function MembersContent({ room, members, speakers, meta, onlineNow }) {
  const host = room.host_username;
  const onlineSet = onlineNow instanceof Set ? onlineNow : new Set(onlineNow || []);
  const metaMap = meta || {};
  const names = Array.from(new Set([host, ...(members || []), ...speakers]));
  const online = names.filter(u => onlineSet.has(u));
  const offline = names.filter(u => !onlineSet.has(u));
  const onlineWithoutHost = online.filter(u => u !== host);

  return (
    <div>
      <div className="px-4 py-4 border-b border-gray-200/60">
        <p className="text-[11px] font-bold uppercase tracking-wider text-gray-400">About</p>
        <p className="text-sm text-gray-700 mt-2 leading-snug">{room.description || 'No description yet.'}</p>
        <div className="flex flex-wrap items-center gap-2 mt-3">
          <span className="text-[10px] font-semibold bg-white border border-gray-200 text-gray-500 px-2 py-0.5 rounded-full">{room.category || 'general'}</span>
          <span className="text-[10px] font-semibold bg-white border border-gray-200 text-gray-500 px-2 py-0.5 rounded-full">{room.room_mode || 'open'}</span>
          <span className="text-[10px] font-semibold bg-white border border-gray-200 text-gray-500 px-2 py-0.5 rounded-full">{room.participant_count || 0} here</span>
        </div>
      </div>

      <div className="px-4 pt-4 pb-1 text-[11px] font-bold uppercase tracking-wider text-gray-400">Host — 1</div>
      <div className="px-2">
        <MemberRow username={host} isHost online={onlineSet.has(host)} pic={metaMap[host]?.pic} verified={metaMap[host]?.verified} />
      </div>

      <div className="px-4 pt-4 pb-1 text-[11px] font-bold uppercase tracking-wider text-gray-400">Online — {onlineWithoutHost.length}</div>
      <div className="px-2 pb-3 space-y-0.5">
        {onlineWithoutHost.length === 0 && <p className="px-2 py-1 text-xs text-gray-400">No one else here yet</p>}
        {onlineWithoutHost.map(u => (
          <MemberRow key={u} username={u} online pic={metaMap[u]?.pic} verified={metaMap[u]?.verified} />
        ))}
      </div>

      {offline.length > 0 && (
        <>
          <div className="px-4 pt-3 pb-1 text-[11px] font-bold uppercase tracking-wider text-gray-400">Offline — {offline.length}</div>
          <div className="px-2 pb-6 space-y-0.5 opacity-60">
            {offline.map(u => (
              <MemberRow key={u} username={u} online={false} pic={metaMap[u]?.pic} verified={metaMap[u]?.verified} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function MembersPanel({ room, members, speakers, meta, onlineNow }) {
  return (
    <aside className="hidden xl:flex w-72 flex-col shrink-0 border-l border-gray-200/60 bg-gray-50/70 overflow-y-auto scrollbar-thin">
      <MembersContent room={room} members={members} speakers={speakers} meta={meta} onlineNow={onlineNow} />
    </aside>
  );
}

/* ══════════════════════ ROOM ══════════════════════ */
export default function DiscussionRoom({ roomId, active = true }) {
  const currentUser = localStorage.getItem('currentUser');
  const desktop = useMediaQuery('(min-width: 768px)');
  const wide = useMediaQuery('(min-width: 1280px)');
  const onlineNow = useGlobalOnline();

  const [room, setRoom] = useState(null);
  const [messages, setMessages] = useState([]);
  const [members, setMembers] = useState(null);
  const [input, setInput] = useState('');
  const [typingUsers, setTypingUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [unlocked, setUnlocked] = useState(false);
  const [unlocking, setUnlocking] = useState(false);
  const [reactTarget, setReactTarget] = useState(null);
  const [showMenu, setShowMenu] = useState(false);
  const [showHostPanel, setShowHostPanel] = useState(false);
  const [showGiphy, setShowGiphy] = useState(false);
  const [giphyQuery, setGiphyQuery] = useState('');
  const [giphyResults, setGiphyResults] = useState([]);
  const [imagePreview, setImagePreview] = useState(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [mentionQuery, setMentionQuery] = useState(null);
  const [mentionResults, setMentionResults] = useState([]);
  const [lightboxUrl, setLightboxUrl] = useState(null);
  const [replyTo, setReplyTo] = useState(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [showMembers, setShowMembers] = useState(true);
  const [panelOpen, setPanelOpen] = useState(false);

  const scrollRef = useRef(null);
  const atBottomRef = useRef(true);
  const firstPaintRef = useRef(true);
  const fileInputRef = useRef(null);
  const textareaRef = useRef(null);
  const socketRef = useRef(null);
  const menuRef = useRef(null);
  const typingTimeout = useRef(null);
  const giphyTimeout = useRef(null);
  const mentionTimeout = useRef(null);
  const loadingOlderRef = useRef(false);

  const isHost = !!room && room.host_username === currentUser;
  const isMuted = !!room && (room.muted_users || []).includes(currentUser);
  const isLive = !!room && room.status === 'live';
  const isArchived = !!room && room.status === 'ended';
  const canView = isLive || unlocked || isHost;

  /* ── data (roomId never changes for a mounted view — the router keys by path) ── */
  useEffect(() => {
    if (!roomId) return;
    let alive = true;
    apiFetch(`/api/discussions/room/${roomId}`).then(r => (r.ok ? r.json() : null)).then(data => {
      if (!alive) return;
      if (data) {
        setRoom(data);
        if (data.status === 'ended' && data.host_username !== currentUser) {
          apiFetch(`/api/discussions/room/${roomId}/check-unlock?username=${currentUser}`)
            .then(r => (r.ok ? r.json() : {}))
            .then(d => { if (alive) setUnlocked(!!d.unlocked); })
            .catch(() => {});
        } else { setUnlocked(true); }
      }
      setLoading(false);
    }).catch(() => { if (alive) setLoading(false); });

    apiFetch(`/api/discussions/room/${roomId}/messages?limit=${PAGE}`)
      .then(r => (r.ok ? r.json() : []))
      .then(data => {
        if (!alive || !Array.isArray(data)) return;
        setMessages(data);
        setHasMore(data.length >= PAGE);
      }).catch(() => {});

    return () => { alive = false; };
  }, [roomId, currentUser]);

  /* ── socket (only while this page is the one on screen) ── */
  useEffect(() => {
    if (!active || !roomId || !currentUser || !canView) return;
    const sock = window.socket;
    if (!sock) return;
    socketRef.current = sock;

    sock.emit('join_discussion', { roomId, username: currentUser });

    const onMessage = (msg) => {
      if (msg.username !== currentUser) playMessageSound();
      setMessages(prev => (prev.some(m => m.id === msg.id) ? prev : [...prev, msg]));
    };
    const onTyping = ({ username, stopped }) => {
      if (username === currentUser) return;
      setTypingUsers(prev => (stopped ? prev.filter(u => u !== username) : (prev.includes(username) ? prev : [...prev, username])));
    };
    const onReaction = ({ message_id, reactions, reaction_count }) => {
      setMessages(prev => prev.map(m => (m.id === message_id ? { ...m, reactions, reaction_count } : m)));
    };
    const onPin = ({ pinned_message_id }) => setRoom(prev => (prev ? { ...prev, pinned_message_id } : prev));
    const onModeChange = ({ room_mode }) => setRoom(prev => (prev ? { ...prev, room_mode } : prev));
    const onRemoved = ({ username: u }) => { if (u === currentUser) window.Lexum?.navigate('/discussions'); };
    const onEnded = ({ duration }) => setRoom(prev => (prev ? { ...prev, status: 'ended', ended_at: new Date().toISOString(), duration_seconds: duration || 0, participant_count: 0 } : prev));
    const onDeleteMsg = ({ message_id }) => setMessages(prev => prev.filter(m => m.id !== message_id));
    const onRoomUpdate = (data) => {
      setRoom(prev => (prev ? { ...prev, participant_count: data.participant_count ?? prev.participant_count, room_mode: data.room_mode ?? prev.room_mode, pinned_message_id: data.pinned_message_id ?? prev.pinned_message_id } : prev));
      if (Array.isArray(data.members)) setMembers(data.members);
    };

    sock.on('discussion_message', onMessage);
    sock.on('discussion_typing', onTyping);
    sock.on('discussion_reaction', onReaction);
    sock.on('discussion_pin', onPin);
    sock.on('discussion_mode_change', onModeChange);
    sock.on('discussion_user_removed', onRemoved);
    sock.on('discussion_room_ended', onEnded);
    sock.on('discussion_delete_message', onDeleteMsg);
    sock.on('discussion_room_update', onRoomUpdate);

    apiFetch(`/api/discussions/room/${roomId}/join`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username: currentUser }) }).catch(() => {});

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
  }, [active, roomId, currentUser, canView]);

  useEffect(() => { if (typingUsers.length === 0) return undefined; const t = setTimeout(() => setTypingUsers([]), 3000); return () => clearTimeout(t); }, [typingUsers]);

  useEffect(() => {
    const handler = (e) => { if (menuRef.current && !menuRef.current.contains(e.target)) { setShowMenu(false); setShowHostPanel(false); } };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  /* ── users (pics + verified) ── */
  const authors = useMemo(() => {
    const s = new Set();
    if (room?.host_username) s.add(room.host_username);
    for (const m of messages) if (m.message_type !== 'system' && m.username) s.add(m.username);
    return Array.from(s);
  }, [messages, room]);
  const meta = useUserMeta(authors);

  /* ── flat render list with date dividers + grouping ── */
  const items = useMemo(() => {
    const out = [];
    const byId = new Map(messages.map(m => [m.id, m]));
    let lastDay = '';
    let prev = null;
    for (const msg of messages) {
      if (msg.message_type === 'system') { prev = null; continue; }
      const d = dayLabel(msg.created_at);
      if (d !== lastDay) { out.push({ type: 'date', id: `day-${msg.id}`, label: d }); lastDay = d; }
      const grouped = !!prev && prev.username === msg.username && (new Date(msg.created_at).getTime() - new Date(prev.created_at).getTime()) < 300000;
      out.push({
        type: 'msg',
        id: msg.id,
        msg,
        grouped,
        replyToMsg: msg.reply_to_id ? byId.get(msg.reply_to_id) || null : null,
      });
      prev = msg;
    }
    return out;
  }, [messages]);

  const speakers = useMemo(() => {
    const seen = new Set();
    const out = [];
    for (let i = messages.length - 1; i >= 0; i--) {
      const m = messages[i];
      if (m.message_type === 'system' || !m.username || seen.has(m.username)) continue;
      seen.add(m.username);
      out.push(m.username);
    }
    return out;
  }, [messages]);

  /* ── scroll ── */
  const scrollToBottom = useCallback((behavior) => {
    const el = scrollRef.current;
    if (!el) return;
    atBottomRef.current = true;
    if (behavior) el.scrollTo({ top: el.scrollHeight, behavior });
    else el.scrollTop = el.scrollHeight;
  }, []);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el || messages.length === 0) return;
    if (firstPaintRef.current) { el.scrollTop = el.scrollHeight; firstPaintRef.current = false; return; }
    if (atBottomRef.current) el.scrollTop = el.scrollHeight;
  }, [messages]);

  const loadMoreMessages = useCallback(() => {
    if (loadingOlderRef.current || !hasMore) return;
    const el = scrollRef.current;
    const oldest = messages[0];
    if (!oldest) return;
    loadingOlderRef.current = true;
    setLoadingMore(true);
    const prevHeight = el ? el.scrollHeight : 0;
    const prevTop = el ? el.scrollTop : 0;
    apiFetch(`/api/discussions/room/${roomId}/messages?limit=${PAGE}&before=${encodeURIComponent(oldest.created_at)}&before_id=${oldest.id}`)
      .then(r => (r.ok ? r.json() : []))
      .then(data => {
        if (Array.isArray(data) && data.length > 0) {
          setMessages(prev => {
            const ids = new Set(prev.map(m => m.id));
            return [...data.filter(m => !ids.has(m.id)), ...prev];
          });
          setHasMore(data.length >= PAGE);
          requestAnimationFrame(() => {
            const c = scrollRef.current;
            if (c) c.scrollTop = (c.scrollHeight - prevHeight) + prevTop;
          });
        } else { setHasMore(false); }
      })
      .catch(() => {})
      .finally(() => { setLoadingMore(false); loadingOlderRef.current = false; });
  }, [hasMore, messages, roomId, setLoadingMore, setMessages, setHasMore]);

  const onScroll = useCallback((e) => {
    const el = e.currentTarget;
    atBottomRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 160;
    if (el.scrollTop < 200) loadMoreMessages();
  }, [loadMoreMessages]);

  /* ── actions ── */
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

  const resizeTextarea = (el) => {
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 168)}px`;
  };

  const sendMessage = useCallback(async (content, mediaUrl) => {
    const text = (content !== undefined ? content : input).trim();
    if ((!text && !mediaUrl) || !currentUser || !isLive) return;
    const currentReplyTo = replyTo;
    const localId = `local_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const optimistic = {
      id: localId,
      room_id: roomId,
      username: currentUser,
      content: mediaUrl || text,
      message_type: mediaUrl ? 'image' : 'text',
      profile_pic: '',
      reply_to_id: currentReplyTo ? currentReplyTo.id : null,
      reactions: {},
      reaction_count: 0,
      created_at: new Date().toISOString(),
    };

    setInput('');
    setImagePreview(null);
    setShowGiphy(false);
    setGiphyQuery('');
    setGiphyResults([]);
    setReplyTo(null);
    setMentionQuery(null);
    setMentionResults([]);
    if (textareaRef.current) textareaRef.current.style.height = 'auto';
    setMessages(prev => [...prev, optimistic]);
    scrollToBottom();

    socketRef.current?.emit('discussion_stop_typing', { roomId, username: currentUser });
    try {
      const body = { username: currentUser };
      if (mediaUrl) { body.content = mediaUrl; body.message_type = 'image'; } else { body.content = text; }
      if (currentReplyTo) body.reply_to_id = currentReplyTo.id;
      const res = await apiFetch(`/api/discussions/room/${roomId}/send`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const msg = await res.json();
      if (msg && msg.id) {
        setMessages(prev => prev.map(m => (m.id === localId ? msg : m)));
        socketRef.current?.emit('discussion_message', { roomId, ...msg });
      } else {
        setMessages(prev => prev.filter(m => m.id !== localId));
      }
    } catch (e) {
      console.error('send error:', e);
      setMessages(prev => prev.filter(m => m.id !== localId));
    }
  }, [input, currentUser, isLive, replyTo, roomId, scrollToBottom, setInput, setImagePreview, setShowGiphy, setGiphyQuery, setGiphyResults, setReplyTo, setMentionQuery, setMentionResults, setMessages]);

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
      if (data.url) setImagePreview(data.url);
    } catch (e) { console.error('upload error:', e); }
    setUploadingImage(false);
  };

  const handleTyping = (val) => {
    setInput(val);
    if (textareaRef.current) resizeTextarea(textareaRef.current);
    if (!currentUser || !isLive) return;
    socketRef.current?.emit('discussion_typing', { roomId, username: currentUser });
    clearTimeout(typingTimeout.current);
    typingTimeout.current = setTimeout(() => socketRef.current?.emit('discussion_stop_typing', { roomId, username: currentUser }), 2000);

    const atMatch = val.match(/@(\w*)$/);
    if (atMatch) {
      setMentionQuery(atMatch[1]);
      clearTimeout(mentionTimeout.current);
      mentionTimeout.current = setTimeout(() => {
        apiFetch(`/searchSuggest?query=${encodeURIComponent(atMatch[1])}&currentUsername=${currentUser}`)
          .then(r => (r.ok ? r.json() : []))
          .then(data => setMentionResults(Array.isArray(data) ? data.slice(0, 6) : []))
          .catch(() => setMentionResults([]));
      }, 200);
    } else {
      setMentionQuery(null);
      setMentionResults([]);
    }
  };

  const insertMention = (username) => {
    setInput(input.replace(/@\w*$/, `@${username} `));
    setMentionQuery(null);
    setMentionResults([]);
    textareaRef.current?.focus();
  };

  const handlePick = useCallback(async (messageId, emoji) => {
    try {
      const res = await apiFetch(`/api/discussions/room/${roomId}/react`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ message_id: messageId, username: currentUser, emoji }) });
      const data = await res.json();
      if (data) socketRef.current?.emit('discussion_reaction', { roomId, message_id: messageId, ...data });
    } catch { /* reaction is best-effort */ }
  }, [roomId, currentUser]);

  const handlePin = useCallback(async (messageId) => {
    if (!isHost) return;
    try {
      const res = await apiFetch(`/api/discussions/room/${roomId}/pin`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ host_username: currentUser, message_id: messageId }) });
      const data = await res.json();
      if (data) socketRef.current?.emit('discussion_pin', { roomId, ...data });
    } catch { /* pin is best-effort */ }
  }, [roomId, currentUser, isHost]);

  const handleDeleteMessage = useCallback(async (messageId) => {
    if (!isHost) return;
    try {
      await apiFetch(`/api/discussions/room/${roomId}/delete-message`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ host_username: currentUser, message_id: messageId }) });
      socketRef.current?.emit('discussion_delete_message', { roomId, message_id: messageId });
      setMessages(prev => prev.filter(m => m.id !== messageId));
    } catch { /* delete is best-effort */ }
  }, [roomId, currentUser, isHost, setMessages]);

  const handleEndRoom = async () => {
    if (!isHost || !confirm('End this discussion?')) return;
    try {
      const res = await apiFetch(`/api/discussions/room/${roomId}/end`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username: currentUser }) });
      const data = await res.json();
      setRoom(prev => (prev ? { ...prev, status: 'ended', ended_at: new Date().toISOString(), duration_seconds: data.duration || 0, participant_count: 0 } : prev));
    } catch { /* end failed — room stays live */ }
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
      fetch(`${GIPHY_API_BASE}/search?api_key=${GIPHY_API_KEY}&q=${encodeURIComponent(q)}&limit=12&rating=g`)
        .then(r => r.json()).then(d => setGiphyResults(d.data || [])).catch(() => setGiphyResults([]));
    }, 300);
  };

  const jumpToMessage = useCallback((id) => {
    const el = document.getElementById(`msg-${id}`);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, []);

  const jumpToUser = useCallback((username) => { window.Lexum?.navigate(`/@${username}`); }, []);

  const togglePicker = useCallback((id) => setReactTarget(prev => (prev === id ? null : id)), [setReactTarget]);

  const pinnedMsg = room?.pinned_message_id ? messages.find(m => m.id === room.pinned_message_id) : null;

  /* ── every state renders inside the shared rail/shell chrome ── */
  const goHome = () => window.Lexum?.navigate('/discussions');
  const shell = (node, panel = null) => (
    <DiscussionsShell activeRoomId={roomId} onNew={goHome} onHome={goHome} fillMobile rightPanel={panel}>{node}</DiscussionsShell>
  );

  if (loading) {
    return shell(
      <div className="flex-1 flex items-center justify-center bg-white">
        <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }
  if (!room) {
    return shell(
      <div className="flex-1 flex flex-col items-center justify-center gap-4 bg-white px-4">
        <HashIcon className="w-12 h-12 text-gray-200" />
        <p className="text-sm font-semibold text-gray-400">Discussion not found</p>
        <a href="/discussions" data-lexum className="text-sm text-blue-600 font-bold active:opacity-70">Browse discussions</a>
      </div>
    );
  }

  if (isArchived && !canView) {
    return shell(
      <div className="flex-1 flex flex-col items-center justify-center px-4 bg-white">
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
          <a href="/discussions" data-lexum className="block mt-4 text-xs text-gray-400 font-semibold hover:text-gray-600">Back to discussions</a>
        </div>
      </div>
    );
  }

  const topic = room.description || `Hosted by @${room.host_username} · ${room.category || 'general'}`;

  return shell(
    <div className="flex flex-col h-full min-h-0 min-w-0 bg-white">
      {/* ── channel header ── */}
      <header className="flex-shrink-0 h-14 px-3 sm:px-4 flex items-center gap-3 border-b border-gray-200/70 bg-white/90 backdrop-blur-xl z-30">
        {!desktop && (
          <a href="/discussions" data-lexum className="p-1.5 -ml-1 rounded-xl text-gray-500 hover:bg-gray-100 transition-colors" aria-label="Back">
            <NavIcons.ArrowLeft className="w-5 h-5" />
          </a>
        )}
        <HashIcon className="w-5 h-5 text-gray-400 shrink-0" />
        <h2 className="font-bold text-gray-900 text-sm truncate shrink-0 max-w-[45%]">{room.title}</h2>
        <div className="hidden md:block w-px h-5 bg-gray-200 shrink-0" />
        <p className="hidden md:block text-xs text-gray-400 truncate flex-1 min-w-0">{topic}</p>
        <div className="flex-1 md:hidden" />
        <div className="flex items-center gap-1 shrink-0">
          <span className="hidden md:block text-[11px] font-semibold text-gray-400 mr-1">
            {isLive ? <span className="text-blue-600">{room.participant_count || 0} here</span> : `ended · ${formatDuration(room.duration_seconds || 0)}`}
          </span>
          <button onClick={() => pinnedMsg && jumpToMessage(pinnedMsg.id)} title="Pinned message"
            className={`hidden md:block p-2 rounded-xl transition-colors ${pinnedMsg ? 'text-yellow-500 hover:bg-yellow-50' : 'text-gray-400 hover:bg-gray-100'}`}>
            <PinIcon className="w-[18px] h-[18px]" />
          </button>
          <button onClick={() => (wide ? setShowMembers(v => !v) : setPanelOpen(true))} title="About &amp; members"
            className={`p-2 rounded-xl transition-colors ${wide && showMembers ? 'text-gray-700 bg-gray-100' : 'text-gray-400 hover:bg-gray-100'}`}>
            <MembersIcon className="w-[18px] h-[18px]" />
          </button>
        </div>
        <div className="relative shrink-0" ref={menuRef}>
          <button onClick={() => setShowMenu(v => !v)} className="p-2 rounded-xl hover:bg-gray-100 text-gray-400 transition-colors" aria-label="Room menu">
            <NavIcons.Dots className="w-5 h-5" />
          </button>
          {showMenu && (
            <div className="absolute right-0 top-full mt-1 bg-white rounded-2xl shadow-xl border border-gray-100 py-1 z-50 w-52">
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
      </header>

      <div className="flex flex-1 min-h-0">
        <div className="flex-1 flex flex-col min-w-0">
          {/* ended banner */}
          {!isLive && (
            <div className="flex-shrink-0 px-4 py-2.5 bg-gray-50 border-b border-gray-200/70 text-center">
              <p className="text-[11px] font-bold text-gray-400 tracking-wide">DISCUSSION ENDED</p>
              <p className="text-[11px] text-gray-400 mt-0.5">{room.message_count || 0} messages · {formatDuration(room.duration_seconds || 0)}</p>
            </div>
          )}

          {/* pinned */}
          {pinnedMsg && (
            <button onClick={() => jumpToMessage(pinnedMsg.id)}
              className="flex-shrink-0 w-full px-4 py-2 bg-yellow-50 border-b border-yellow-200 flex items-center gap-2 hover:bg-yellow-100 transition-colors text-left">
              <span className="text-yellow-500 flex-shrink-0">📌</span>
              <p className="text-xs text-yellow-700 truncate"><span className="font-bold">@{pinnedMsg.username}</span> {pinnedMsg.content?.startsWith('http') ? '📷 Image' : pinnedMsg.content}</p>
            </button>
          )}

          {/* messages */}
          <div ref={scrollRef} onScroll={onScroll} className="flex-1 overflow-y-auto scrollbar-thin pt-4 pb-2">
            {hasMore && (
              <div className="text-center pb-3">
                {loadingMore
                  ? <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto" />
                  : <button onClick={loadMoreMessages} className="text-[12px] text-blue-600 font-semibold hover:text-blue-700 transition-colors">Load earlier messages</button>}
              </div>
            )}

            {/* Discord-style channel welcome */}
            {!hasMore && (
              <div className="px-4 pb-5 pt-1 mb-1">
                <div className="w-14 h-14 rounded-full bg-gray-100 border border-gray-200 flex items-center justify-center mb-3">
                  <HashIcon className="w-7 h-7 text-gray-400" />
                </div>
                <h3 className="text-xl font-black text-gray-900" style={{ fontFamily: 'var(--font-display)' }}>Welcome to {room.title}!</h3>
                <p className="text-sm text-gray-500 mt-1 leading-snug">
                  This is the start of the <span className="font-semibold text-gray-700">{room.title}</span> discussion, hosted by{' '}
                  <button onClick={() => jumpToUser(room.host_username)} className="text-blue-600 font-semibold hover:underline">@{room.host_username}</button>.
                </p>
              </div>
            )}

            {items.map(item => (item.type === 'date' ? (
              <div key={item.id} className="flex items-center gap-3 px-4 py-3">
                <div className="h-px bg-gray-200 flex-1" />
                <span className="text-[11px] font-bold text-gray-400">{item.label}</span>
                <div className="h-px bg-gray-200 flex-1" />
              </div>
            ) : (
              <MessageRow
                key={item.id}
                msg={item.msg}
                grouped={item.grouped}
                replyToMsg={item.replyToMsg}
                isOwn={item.msg.username === currentUser}
                isMsgHost={item.msg.username === room.host_username}
                isHostUser={isHost}
                isLive={isLive}
                pic={(meta[item.msg.username] && meta[item.msg.username].pic) || item.msg.profile_pic}
                verified={!!(meta[item.msg.username] && meta[item.msg.username].verified)}
                pickerOpen={reactTarget === item.msg.id}
                onTogglePicker={togglePicker}
                onPick={handlePick}
                onReply={setReplyTo}
                onPin={handlePin}
                onDelete={handleDeleteMessage}
                onJump={jumpToUser}
                onLightbox={setLightboxUrl}
                currentUser={currentUser}
              />
            )))}

            {typingUsers.length > 0 && isLive && (
              <div className="flex items-center gap-2 px-4 pt-2 text-gray-400">
                <div className="flex gap-1">
                  <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
                <span className="text-xs">{typingUsers.join(', ')} typing...</span>
              </div>
            )}
          </div>

          {/* ── composer ── */}
          <div className="flex-shrink-0 px-3 sm:px-4 pb-4 pt-1 bg-white relative">
            {showGiphy && (
              <div className="absolute bottom-full left-3 right-3 sm:left-4 sm:right-4 md:right-auto md:w-80 mb-2 bg-white rounded-2xl shadow-xl border border-gray-100 z-50 max-h-[46vh] sm:max-h-64 flex flex-col overflow-hidden">
                <div className="flex items-center gap-2 p-3 border-b border-gray-100">
                  <NavIcons.Search className="w-4 h-4 text-gray-400 flex-shrink-0" />
                  <input type="text" autoFocus placeholder="Search GIFs..." value={giphyQuery} onChange={e => searchGiphy(e.target.value)} className="flex-1 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none" />
                  <button onClick={() => { setShowGiphy(false); setGiphyQuery(''); setGiphyResults([]); }} className="text-gray-400 hover:text-gray-600"><svg viewBox="0 0 24 24" className="w-4 h-4 fill-none stroke-current" strokeWidth="2"><path strokeLinecap="round" d="M6 18L18 6M6 6l12 12" /></svg></button>
                </div>
                <div className="overflow-y-auto p-2 grid grid-cols-3 gap-1.5">
                  {giphyResults.map(gif => (
                    <button key={gif.id} onClick={() => sendMessage(gif.images.original.url)} className="rounded-xl overflow-hidden aspect-square bg-gray-100 active:scale-95 transition-transform">
                      <img src={gif.images.fixed_height.url} alt="" className="w-full h-full object-cover" loading="lazy" />
                    </button>
                  ))}
                  {giphyResults.length === 0 && giphyQuery && <div className="col-span-3 py-8 text-center text-xs text-gray-400">Searching...</div>}
                  {!giphyQuery && <div className="col-span-3 py-8 text-center text-xs text-gray-400">Search for GIFs</div>}
                </div>
              </div>
            )}

            {mentionQuery !== null && mentionResults.length > 0 && (
              <div className="absolute bottom-full left-3 right-3 sm:left-4 sm:right-4 md:right-auto md:w-96 mb-2 bg-white rounded-2xl shadow-xl border border-gray-100 py-1 z-50 max-h-48 overflow-y-auto">
                {mentionResults.map(u => (
                  <button key={u.username || u} onClick={() => insertMention(u.username || u)} className="w-full text-left px-4 py-2.5 hover:bg-gray-50 flex items-center gap-3 transition-colors">
                    <img src={u.profile_pic || DEFAULT_PIC} alt="" className="w-7 h-7 rounded-full object-cover" />
                    <span className="text-sm font-semibold text-gray-800">{u.username || u}</span>
                    {u.fullname && <span className="text-xs text-gray-400">{u.fullname}</span>}
                  </button>
                ))}
              </div>
            )}

            {showHostPanel && isHost && isLive && (
              <div className="absolute bottom-full right-4 mb-2 bg-white rounded-2xl shadow-xl border border-gray-100 p-4 z-50 w-56">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-xs font-bold text-gray-900">Settings</h3>
                  <button onClick={() => setShowHostPanel(false)} className="text-gray-400 hover:text-gray-600"><svg viewBox="0 0 24 24" className="w-4 h-4 fill-none stroke-current" strokeWidth="2"><path strokeLinecap="round" d="M6 18L18 6M6 6l12 12" /></svg></button>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Room Mode</p>
                  {['open', 'moderated', 'locked'].map(mode => (
                    <button key={mode} onClick={async () => {
                      await apiFetch(`/api/discussions/room/${roomId}/mode`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ host_username: currentUser, room_mode: mode }) });
                      socketRef.current?.emit('discussion_mode_change', { roomId, room_mode: mode });
                      setRoom(prev => (prev ? { ...prev, room_mode: mode } : prev));
                    }} className={`w-full text-left px-3 py-2 rounded-xl text-xs font-semibold transition-all ${room.room_mode === mode ? 'bg-blue-50 text-blue-600 border border-blue-200' : 'text-gray-600 hover:bg-gray-50 border border-transparent'}`}>
                      {mode === 'open' ? 'Open' : mode === 'moderated' ? 'Moderated' : 'Locked'}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {isLive ? (
              isMuted ? <p className="text-xs text-gray-400 text-center py-3">You are muted</p>
                : room.room_mode === 'locked' && !isHost ? <p className="text-xs text-gray-400 text-center py-3">Room is locked</p>
                : (
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
                          <p className="text-[11px] font-bold text-blue-600">Replying to @{replyTo.username}</p>
                          <p className="text-[11px] text-gray-500 truncate">{replyTo.content?.startsWith('http') ? '📷 Image' : replyTo.content}</p>
                        </div>
                        <button onClick={() => setReplyTo(null)} className="text-gray-400 hover:text-gray-600 flex-shrink-0" aria-label="Cancel reply"><svg viewBox="0 0 24 24" className="w-3.5 h-3.5 fill-none stroke-current" strokeWidth="2"><path strokeLinecap="round" d="M6 18L18 6M6 6l12 12" /></svg></button>
                      </div>
                    )}
                    <div className="flex items-end gap-2 rounded-2xl bg-gray-100 border border-gray-100 focus-within:border-gray-200 transition-colors px-3 py-2">
                      <button onClick={() => fileInputRef.current?.click()} className="w-8 h-8 rounded-lg text-gray-500 hover:text-gray-700 hover:bg-gray-200/70 transition-colors flex-shrink-0 flex items-center justify-center" title="Upload image">
                        {uploadingImage ? <span className="block w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" /> : <PlusIcon className="w-5 h-5" sw={2} />}
                      </button>
                      <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) uploadImage(f); e.target.value = ''; }} />
                      <textarea
                        ref={textareaRef}
                        rows={1}
                        value={input}
                        onChange={e => handleTyping(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
                        placeholder={`Message #${room.title.slice(0, 28)}`}
                        className="flex-1 bg-transparent text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none resize-none py-1.5 leading-5 min-w-0"
                        style={{ maxHeight: 168 }}
                        maxLength={2000}
                      />
                      <button onClick={() => setShowGiphy(v => !v)} title="GIF"
                        className={`h-8 px-2 rounded-md text-[10px] font-bold border transition-colors flex-shrink-0 flex items-center justify-center ${showGiphy ? 'border-blue-300 text-blue-600 bg-blue-50' : 'border-gray-300 text-gray-500 hover:text-gray-700'}`}>
                        GIF
                      </button>
                      {(input.trim() || imagePreview) && (
                        <button onClick={() => (imagePreview ? sendMessage(undefined, imagePreview) : sendMessage())} title="Send"
                          className="w-8 h-8 flex items-center justify-center bg-blue-600 hover:bg-blue-700 rounded-full flex-shrink-0 transition-all active:scale-95 shadow-sm shadow-blue-500/20">
                          <SendIcon />
                        </button>
                      )}
                    </div>
                    <div className="h-4 px-1 flex items-center text-[11px] text-gray-400">
                      {typingUsers.length > 0
                        ? <span className="truncate">{typingUsers.join(', ')} typing…</span>
                        : <span className="hidden md:inline truncate">Enter to send · Shift+Enter for a new line</span>}
                    </div>
                  </>
                )
            ) : (
              <div className="text-center py-2">
                <p className="text-xs font-bold text-gray-400">Discussion has ended</p>
                <a href="/discussions" data-lexum className="text-xs text-blue-600 font-semibold mt-1 inline-block active:opacity-70">Browse more</a>
              </div>
            )}
          </div>
        </div>

      </div>

      {lightboxUrl && (
        <div className="fixed inset-0 z-[999] flex items-center justify-center bg-black/80 backdrop-blur-sm" onClick={() => setLightboxUrl(null)}>
          <button onClick={() => setLightboxUrl(null)} className="absolute top-4 right-4 text-white/80 hover:text-white"><svg viewBox="0 0 24 24" className="w-8 h-8 fill-none stroke-current" strokeWidth="2"><path strokeLinecap="round" d="M6 18L18 6M6 6l12 12" /></svg></button>
          <img src={lightboxUrl} alt="" className="max-w-[90vw] max-h-[90vh] object-contain rounded-lg" onClick={e => e.stopPropagation()} />
        </div>
      )}

      {/* about + members drawer for widths where the side panel is hidden */}
      {panelOpen && !wide && (
        <div className="fixed inset-0 z-[998] flex bg-black/40 backdrop-blur-[2px]" onClick={() => setPanelOpen(false)}>
          <div onClick={e => e.stopPropagation()}
            className="ml-auto w-80 max-w-[86vw] h-full bg-gray-50/95 overflow-y-auto scrollbar-thin shadow-2xl">
            <div className="sticky top-0 z-10 flex items-center justify-between px-4 py-3 bg-white/95 backdrop-blur-xl border-b border-gray-200/60">
              <p className="text-sm font-bold text-gray-900">About &amp; members</p>
              <button onClick={() => setPanelOpen(false)} className="p-1.5 rounded-xl text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors" aria-label="Close">
                <svg viewBox="0 0 24 24" className="w-4 h-4 fill-none stroke-current" strokeWidth="2"><path strokeLinecap="round" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <MembersContent room={room} members={members} speakers={speakers} meta={meta} onlineNow={onlineNow} />
          </div>
        </div>
      )}
    </div>,
    showMembers && wide
      ? <MembersPanel room={room} members={members} speakers={speakers} meta={meta} onlineNow={onlineNow} />
      : null
  );
}
