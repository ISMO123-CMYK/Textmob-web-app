import { useState, useEffect, useRef, useCallback } from 'react';
import { apiFetch } from '../../config/api';
import NavIcons from '../../utils/navIcons';

const EMOJIS = ['\u2764\uFE0F', '\uD83D\uDE02', '\uD83D\uDD25', '\uD83D\uDC4D', '\uD83D\uDE2E', '\uD83D\uDE22', '\uD83D\uDC4F', '\uD83D\uDE21', '\uD83E\uDD70', '\uD83D\uDE4C', '\uD83D\uDCAF', '\uD83E\uDD14', '\uD83E\uDD2F', '\uD83D\uDE0E', '\uD83E\uDD29', '\uD83D\uDE34', '\uD83D\uDE07', '\uD83D\uDC94', '\uD83D\uDE05', '\uD83D\uDE4F'];
const DEFAULT_PIC = 'https://api.dicebear.com/10.x/adventurer-neutral/png?seed=textmob&backgroundColor=18181b';

function timeAgo(d) {
  if (!d) return '';
  const diff = Date.now() - new Date(d).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'now';
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  return `${Math.floor(hrs / 24)}d`;
}

function formatDuration(secs) {
  if (!secs) return '0m';
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

export default function DiscussionRoom() {
  const roomId = window.location.pathname.split('/discussions/')[1]?.split('?')[0] || '';
  const currentUser = localStorage.getItem('currentUser');

  const [room, setRoom] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [typingUsers, setTypingUsers] = useState([]);
  const [showHostPanel, setShowHostPanel] = useState(false);
  const [showReactPicker, setShowReactPicker] = useState(null);
  const [loading, setLoading] = useState(true);
  const [ended, setEnded] = useState(false);

  const messagesEndRef = useRef(null);
  const typingTimeout = useRef(null);
  const socketRef = useRef(null);

  const isHost = room && room.host_username === currentUser;
  const isMuted = room && (room.muted_users || []).includes(currentUser);

  // Fetch room + messages
  useEffect(() => {
    if (!roomId) return;
    apiFetch(`/api/discussions/room/${roomId}`)
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (data) { setRoom(data); if (data.status !== 'live') setEnded(true); } setLoading(false); })
      .catch(() => setLoading(false));

    apiFetch(`/api/discussions/room/${roomId}/messages?limit=100`)
      .then(r => r.ok ? r.json() : [])
      .then(data => { if (Array.isArray(data)) setMessages(data); })
      .catch(() => {});
  }, [roomId]);

  // Socket connection
  useEffect(() => {
    if (!roomId || !currentUser) return;
    const io = window.io;
    if (!io) return;
    const socket = io(window.location.hostname === 'localhost' ? 'http://localhost:5000' : 'https://textmob-provider-api-99ii.onrender.com');
    socketRef.current = socket;

    socket.emit('join_discussion', { roomId, username: currentUser });
    socket.emit('join_user', { username: currentUser });

    socket.on('discussion_message', (msg) => {
      setMessages(prev => [...prev, msg]);
    });

    socket.on('discussion_typing', ({ username, stopped }) => {
      if (username === currentUser) return;
      setTypingUsers(prev => {
        if (stopped) return prev.filter(u => u !== username);
        if (!prev.includes(username)) return [...prev, username];
        return prev;
      });
    });

    socket.on('discussion_reaction', ({ message_id, reactions, reaction_count }) => {
      setMessages(prev => prev.map(m => m.id === message_id ? { ...m, reactions, reaction_count } : m));
    });

    socket.on('discussion_pin', ({ pinned_message_id }) => {
      setRoom(prev => prev ? { ...prev, pinned_message_id } : prev);
    });

    socket.on('discussion_mode_change', ({ room_mode }) => {
      setRoom(prev => prev ? { ...prev, room_mode } : prev);
    });

    socket.on('discussion_user_removed', ({ username: removedUser }) => {
      if (removedUser === currentUser) {
        window.Lexum?.navigate('/discussions');
      }
    });

    socket.on('discussion_room_ended', () => {
      setEnded(true);
      setRoom(prev => prev ? { ...prev, status: 'ended' } : prev);
    });

    // Join room via API
    apiFetch(`/api/discussions/room/${roomId}/join`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: currentUser }),
    }).catch(() => {});

    return () => {
      socket.emit('leave_discussion', { roomId });
      apiFetch(`/api/discussions/room/${roomId}/leave`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: currentUser }),
      }).catch(() => {});
      socket.disconnect();
    };
  }, [roomId, currentUser]);

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Clear typing after timeout
  useEffect(() => {
    if (typingUsers.length === 0) return;
    const t = setTimeout(() => setTypingUsers([]), 3000);
    return () => clearTimeout(t);
  }, [typingUsers]);

  const sendMessage = async () => {
    if (!input.trim() || !currentUser) return;
    const text = input.trim();
    setInput('');

    socketRef.current?.emit('discussion_stop_typing', { roomId, username: currentUser });

    try {
      const res = await apiFetch(`/api/discussions/room/${roomId}/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: currentUser, content: text }),
      });
      const msg = await res.json();
      if (msg && msg.id) {
        socketRef.current?.emit('discussion_message', { roomId, ...msg });
      }
    } catch {}
  };

  const handleTyping = (val) => {
    setInput(val);
    if (!currentUser) return;
    socketRef.current?.emit('discussion_typing', { roomId, username: currentUser });
    clearTimeout(typingTimeout.current);
    typingTimeout.current = setTimeout(() => {
      socketRef.current?.emit('discussion_stop_typing', { roomId, username: currentUser });
    }, 2000);
  };

  const handleReact = async (messageId, emoji) => {
    setShowReactPicker(null);
    try {
      const res = await apiFetch(`/api/discussions/room/${roomId}/react`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message_id: messageId, username: currentUser, emoji }),
      });
      const data = await res.json();
      if (data) {
        socketRef.current?.emit('discussion_reaction', { roomId, message_id: messageId, ...data });
      }
    } catch {}
  };

  const handlePin = async (messageId) => {
    if (!isHost) return;
    try {
      const res = await apiFetch(`/api/discussions/room/${roomId}/pin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ host_username: currentUser, message_id: messageId }),
      });
      const data = await res.json();
      if (data) socketRef.current?.emit('discussion_pin', { roomId, ...data });
    } catch {}
  };

  const handleEndRoom = async () => {
    if (!isHost || !confirm('End this discussion?')) return;
    try {
      await apiFetch(`/api/discussions/room/${roomId}/end`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: currentUser }),
      });
      socketRef.current?.emit('discussion_room_ended', { roomId });
      setEnded(true);
    } catch {}
  };

  const pinnedMsg = room?.pinned_message_id ? messages.find(m => m.id === room.pinned_message_id) : null;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="w-6 h-6 border-2 border-red-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!room) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4">
        <NavIcons.Discussions className="w-16 h-16 text-gray-200" />
        <p className="text-lg font-bold text-gray-400">Discussion not found</p>
        <a href="/discussions" data-lexum className="text-sm text-red-500 font-bold">Browse discussions</a>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Room Header */}
      <div className="flex-shrink-0 px-4 py-3 border-b border-gray-200 bg-white">
        <div className="flex items-center gap-3">
          <a href="/discussions" data-lexum className="text-gray-400 hover:text-gray-600 transition">
            <svg viewBox="0 0 24 24" className="w-5 h-5 fill-none stroke-current" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" /></svg>
          </a>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              {room.status === 'live' && <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" />}
              <h2 className="font-black text-gray-900 text-sm truncate">{room.title}</h2>
            </div>
            <p className="text-[11px] text-gray-400">
              {room.status === 'live' ? (
                <span className="text-red-500 font-semibold">{room.participant_count || 0} talking</span>
              ) : (
                <span>Ended</span>
              )}
              <span className="mx-1.5">·</span>
              Hosted by @{room.host_username}
              {room.room_mode === 'moderated' && <><span className="mx-1.5">·</span>Moderated</>}
              {room.room_mode === 'locked' && <><span className="mx-1.5">·</span>Locked</>}
            </p>
          </div>
          {isHost && room.status === 'live' && (
            <div className="flex items-center gap-2">
              <button onClick={() => setShowHostPanel(!showHostPanel)} className="p-2 rounded-full hover:bg-gray-100 text-gray-400">
                <svg viewBox="0 0 24 24" className="w-5 h-5 fill-none stroke-current" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
              </button>
              <button onClick={handleEndRoom} className="px-3 py-1.5 bg-red-500 text-white text-[11px] font-bold rounded-lg hover:bg-red-600 transition">
                End
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Pinned message */}
      {pinnedMsg && (
        <div className="flex-shrink-0 px-4 py-2 bg-yellow-50 border-b border-yellow-200">
          <div className="flex items-center gap-2">
            <span className="text-xs">📌</span>
            <p className="text-xs text-yellow-700 truncate flex-1">
              <span className="font-bold">@{pinnedMsg.username}</span> {pinnedMsg.content}
            </p>
          </div>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
        {messages.map(msg => (
          <MessageBubble
            key={msg.id}
            msg={msg}
            isOwn={msg.username === currentUser}
            isHost={msg.username === room.host_username}
            onReact={() => setShowReactPicker(showReactPicker === msg.id ? null : msg.id)}
            onPin={() => handlePin(msg.id)}
            isHostUser={isHost}
          />
        ))}
        {typingUsers.length > 0 && (
          <div className="flex items-center gap-2 text-gray-400">
            <div className="flex gap-0.5">
              <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
              <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
              <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
            <span className="text-[11px]">{typingUsers.join(', ')} typing...</span>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* React picker */}
      {showReactPicker && (
        <div className="absolute bottom-20 left-4 bg-white rounded-2xl shadow-xl border border-gray-100 p-2 flex flex-wrap gap-1 z-50 w-[200px]">
          {EMOJIS.map(e => (
            <button key={e} onClick={() => handleReact(showReactPicker, e)} className="w-8 h-8 flex items-center justify-center hover:bg-gray-100 rounded-lg text-lg transition">{e}</button>
          ))}
          <button onClick={() => { handlePin(showReactPicker); setShowReactPicker(null); }} className="w-full text-[10px] text-gray-400 mt-1 hover:text-gray-600">📌 Pin message</button>
        </div>
      )}

      {/* Host panel */}
      {showHostPanel && isHost && (
        <HostPanel room={room} onModeChange={async (mode) => {
          await apiFetch(`/api/discussions/room/${roomId}/mode`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ host_username: currentUser, room_mode: mode }),
          });
          socketRef.current?.emit('discussion_mode_change', { roomId, room_mode: mode });
          setRoom(prev => prev ? { ...prev, room_mode: mode } : prev);
        }} onClose={() => setShowHostPanel(false)} />
      )}

      {/* Input */}
      {room.status === 'live' && !ended ? (
        <div className="flex-shrink-0 px-4 py-3 border-t border-gray-200 bg-white">
          {isMuted ? (
            <p className="text-xs text-gray-400 text-center py-2">You are muted in this room</p>
          ) : room.room_mode === 'locked' && !isHost ? (
            <p className="text-xs text-gray-400 text-center py-2">Room is locked. Only the host can send messages.</p>
          ) : (
            <div className="flex items-center gap-2">
              <img src={DEFAULT_PIC} alt="" className="w-8 h-8 rounded-full object-cover flex-shrink-0" />
              <div className="flex-1 flex items-center bg-gray-100 rounded-2xl px-4 py-2">
                <input
                  type="text"
                  value={input}
                  onChange={e => handleTyping(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
                  placeholder="Message..."
                  className="flex-1 bg-transparent text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none"
                  maxLength={2000}
                />
                {input.trim() && (
                  <button onClick={sendMessage} className="ml-2 text-red-500 hover:text-red-600 transition">
                    <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current"><path d="M3.478 2.405a.75.75 0 00-.926.94l2.432 7.905H13.5a.75.75 0 010 1.5H4.984l-2.432 7.905a.75.75 0 00.926.94 60.519 60.519 0 0018.445-8.986.75.75 0 000-1.218A60.517 60.517 0 003.478 2.405z" /></svg>
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="flex-shrink-0 px-4 py-4 border-t border-gray-200 bg-gray-50 text-center">
          <p className="text-sm font-bold text-gray-400">Discussion has ended</p>
          <a href="/discussions" data-lexum className="text-xs text-red-500 font-semibold mt-1 inline-block">Browse more discussions</a>
        </div>
      )}
    </div>
  );
}

function MessageBubble({ msg, isOwn, isHost, onReact, onPin, isHostUser }) {
  if (msg.message_type === 'system') {
    return (
      <div className="text-center py-1">
        <span className="text-[11px] text-gray-400 bg-gray-100 px-3 py-1 rounded-full">{msg.content}</span>
      </div>
    );
  }

  if (msg.is_deleted) {
    return (
      <div className="text-center py-1">
        <span className="text-[11px] text-gray-300 italic">{msg.content}</span>
      </div>
    );
  }

  return (
    <div className={`flex items-start gap-2.5 group ${isOwn ? 'flex-row-reverse' : ''}`}>
      <img
        src={`https://res.cloudinary.com/dzvm9xe1i/image/upload/v1746095979/profile-pictures/${msg.username}.jpg` || DEFAULT_PIC}
        alt=""
        className="w-7 h-7 rounded-full object-cover flex-shrink-0"
        onError={e => { e.target.src = DEFAULT_PIC; }}
      />
      <div className={`max-w-[75%] ${isOwn ? 'items-end' : 'items-start'} flex flex-col`}>
        <div className="flex items-center gap-1.5 mb-0.5">
          {!isOwn && <span className={`text-[11px] font-bold ${isHost ? 'text-red-500' : 'text-gray-700'}`}>@{msg.username}</span>}
          {isHost && !isOwn && <span className="text-[9px] bg-red-100 text-red-500 px-1.5 py-0.5 rounded font-bold">HOST</span>}
          <span className="text-[10px] text-gray-300">{timeAgo(msg.created_at)}</span>
        </div>
        <div
          className={`px-3 py-2 rounded-2xl text-sm ${
            isOwn
              ? 'bg-red-500 text-white rounded-br-md'
              : 'bg-gray-100 text-gray-900 rounded-bl-md'
          }`}
        >
          {msg.content}
        </div>
        {/* Reactions */}
        {msg.reactions && Object.keys(msg.reactions).length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1">
            {Object.entries(msg.reactions).map(([emoji, users]) => (
              <span
                key={emoji}
                className="text-xs bg-gray-100 border border-gray-200 rounded-full px-1.5 py-0.5 cursor-pointer hover:bg-gray-200 transition"
                onClick={() => onReact(msg.id, emoji)}
              >
                {emoji} {users.length}
              </span>
            ))}
          </div>
        )}
        {/* Action buttons on hover */}
        <div className="flex gap-1 mt-0.5 opacity-0 group-hover:opacity-100 transition">
          <button onClick={onReact} className="text-[10px] text-gray-300 hover:text-gray-500">React</button>
          {isHostUser && <button onClick={onPin} className="text-[10px] text-gray-300 hover:text-gray-500">Pin</button>}
        </div>
      </div>
    </div>
  );
}

function HostPanel({ room, onModeChange, onClose }) {
  return (
    <div className="absolute top-14 right-4 bg-white rounded-2xl shadow-xl border border-gray-100 p-4 z-50 w-[240px]">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-xs font-bold text-gray-900">Host Controls</h3>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
          <svg viewBox="0 0 24 24" className="w-4 h-4 fill-none stroke-current" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
        </button>
      </div>
      <div className="space-y-2">
        <p className="text-[10px] text-gray-400 font-bold uppercase">Room Mode</p>
        {['open', 'moderated', 'locked'].map(mode => (
          <button
            key={mode}
            onClick={() => onModeChange(mode)}
            className={`w-full text-left px-3 py-2 rounded-xl text-xs font-semibold transition ${
              room.room_mode === mode ? 'bg-red-50 text-red-600 border border-red-200' : 'text-gray-600 hover:bg-gray-50 border border-transparent'
            }`}
          >
            {mode === 'open' && '\uD83D\uDD13 Open - Anyone can chat'}
            {mode === 'moderated' && '\uD83D\uDEE1\uFE0F Moderated - Host approves'}
            {mode === 'locked' && '\uD83D\uDD12 Locked - Only host can chat'}
          </button>
        ))}
      </div>
    </div>
  );
}
