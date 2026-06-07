import { useState, useEffect, useRef, useCallback, Fragment } from 'react';
import { apiFetch } from '../../config/api';
import { cn } from '../../utils/classNames';
import useProfileCache from '../../utils/useProfileCache';
import timeAgo from '../../utils/timeAgo';
import RichText from './RichText';
import { SnapPlayer } from '../../pages/snaps/SnapsContent';

/* ─── constants ─── */
const DEFAULT_PIC = 'https://res.cloudinary.com/dzvm9xe1i/image/upload/v1746095979/profile-pictures/e2st5nispbicnhnir9cf.jpg';
const U = { navigate: path => window.Lexum ? window.Lexum.navigate(path) : (window.location.hash = path) };
const isVideo = e => /\.(mp4|webm|ogg)$/i.test(String(e || ''));

// Qn – reaction emoji palette
const REACTIONS = [
  { r: '❤️', t: 'love' }, { r: '😂', t: 'funny' }, { r: '🔥', t: 'fire' },
  { r: '👍', t: 'like' }, { r: '😮', t: 'wow' }, { r: '😢', t: 'sad' },
  { r: '👏', t: 'clap' }, { r: '😡', t: 'angry' }, { r: '🥰', t: 'adore' },
  { r: '🙌', t: 'hype' }, { r: '💯', t: 'facts' }, { r: '🤔', t: 'hmm' },
  { r: '🤯', t: 'mind≈blown' }, { r: '😎', t: 'cool' }, { r: '🤩', t: 'amazed' },
  { r: '😴', t: 'boring' }, { r: '😇', t: 'wholesome' }, { r: '💔', t: 'hurt' },
  { r: '😅', t: 'awkward' }, { r: '🙏', t: 'respect' }
];

/* ─── Hn – three-dot icon ─── */
function DotsIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
      <circle cx="4" cy="10" r="1.5" />
      <circle cx="10" cy="10" r="1.5" />
      <circle cx="16" cy="10" r="1.5" />
    </svg>
  );
}

/* ─── Un – post options menu ─── */
function PostMenu({ post, open, setOpen }) {
  const menuItems = [
    { label: 'Save post', icon: 'M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z' },
    { label: 'Share', icon: 'M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z' },
    { label: 'Copy link', icon: 'M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1' },
    { label: 'Report', icon: 'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z', danger: true }
  ];

  return (
    <div className="relative flex-shrink-0">
      <FollowButtonInline targetUsername={post.username} currentUsername={localStorage.currentUser} onUpdate={() => {}} />
      <button onClick={() => setOpen(!open)} className="p-2 -mr-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition text-gray-400 dark:text-gray-500" aria-label="Post options">
        <DotsIcon />
      </button>
      {open && (
        <div className="absolute top-8 right-0 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl overflow-hidden z-30 min-w-[148px]" onMouseLeave={() => setOpen(false)}>
          {menuItems.map(({ label, icon, danger }) => (
            <button
              onClick={() => {
                if (label === 'Copy link') {
                  navigator.clipboard.writeText(`https://textmob.web.app/post/${post.id}`);
                }
                setOpen(false);
              }}
              className={cn(
                'flex items-center gap-3 w-full text-left px-4 py-3 text-sm hover:bg-gray-50 dark:hover:bg-gray-800 transition',
                danger ? 'text-red-500' : 'text-gray-700 dark:text-gray-300'
              )}
              key={label}
            >
              <svg viewBox="0 0 24 24" className="w-4 h-4 flex-shrink-0 fill-none stroke-current" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d={icon} />
              </svg>
              {label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* ─── FollowButton inline (mini version for PostCard) ─── */
function FollowButtonInline({ targetUsername, currentUsername, onUpdate }) {
  const [status, setStatus] = useState('none');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!targetUsername || !currentUsername || targetUsername === currentUsername) return;
    apiFetch(`/profile/${encodeURIComponent(targetUsername)}`)
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (!data) return;
        if ((data.followers || []).includes(currentUsername)) setStatus('following');
        else setStatus('none');
      })
      .catch(() => {});
  }, [targetUsername, currentUsername]);

  if (!targetUsername || !currentUsername || targetUsername === currentUsername) return null;

  async function toggle() {
    if (loading) return;
    setLoading(true);
    try {
      const endpoint = status === 'following' ? '/unfollow-user' : '/follow-user';
      await apiFetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ follower: currentUsername, following: targetUsername })
      });
      setStatus(s => s === 'following' ? 'none' : 'following');
      onUpdate?.();
    } catch (err) {
      console.error('FollowButton:', err);
    } finally {
      setLoading(false);
    }
  }

  if (status === 'following') return null;

  return (
    <button
      onClick={toggle}
      disabled={loading}
      className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline disabled:opacity-50 mr-1"
    >
      Follow
    </button>
  );
}

/* ─── Wn – post header ─── */
function PostHeader({ post, authorProfile, groupProfiles, menuOpen, setMenuOpen, navigate }) {
  let groupId = post.type?.startsWith('group-post-') ? post.type.replace('group-post-', '') : null;
  let groupInfo = groupId ? groupProfiles[groupId] : null;

  return (
    <div className="flex items-start justify-between mb-3">
      <div className="flex items-center gap-2 min-w-0 flex-1">
        {/* Avatar */}
        <div className="relative flex-shrink-0">
          <a href={`/@${post.username}`} data-lexum onClick={e => { e.preventDefault(); navigate(`/@${post.username}`); }}>
            <img src={authorProfile.profile_pic || `${DEFAULT_PIC}`} alt={authorProfile.fullname || post.username} className="w-10 h-10 rounded-full object-cover" loading="lazy" />
          </a>
          {groupInfo && (
            <a href={`/group/${groupId}`} data-lexum onClick={e => { e.preventDefault(); navigate(`/group/${groupId}`); }} className="absolute -bottom-1 -right-1 block">
              <img src={groupInfo.profile_pic} alt={groupInfo.name} className="w-5 h-5 rounded-full object-cover border-2 border-white dark:border-gray-900" loading="lazy" />
            </a>
          )}
        </div>
        {/* Name and meta */}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-baseline gap-x-1 leading-snug">
            <a href={`/@${post.username}`} data-lexum onClick={e => { e.preventDefault(); navigate(`/@${post.username}`); }} className="text-sm font-bold text-gray-900 dark:text-gray-100 hover:underline truncate">
              {authorProfile.fullname || post.username}
            </a>
            {groupInfo && (
              <Fragment>
                <span className="text-xs text-gray-400 dark:text-gray-600">in</span>
                <a href={`/group/${groupId}`} data-lexum onClick={e => { e.preventDefault(); navigate(`/group/${groupId}`); }} className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline">
                  {groupInfo.name}
                </a>
              </Fragment>
            )}
            {post.activities && (
              <span className="text-xs text-gray-500 dark:text-gray-400">· is feeling {post.activities}</span>
            )}
          </div>
          <span className="text-[11px] text-gray-400 dark:text-gray-500 leading-none">{timeAgo(post.created_at)}</span>
        </div>
      </div>
      <PostMenu post={post} open={menuOpen} setOpen={setMenuOpen} />
    </div>
  );
}

/* ─── Gn – reactions bar ─── */
function ReactionsBar({ postId, reactionCountsCache, reactionsOpenFor, setReactionsOpenFor, handleReact }) {
  let data = reactionCountsCache[String(postId)] || { counts: {}, userReaction: null };
  let counts = data.counts || {};
  let userReaction = data.userReaction;
  let isOpen = reactionsOpenFor === postId;
  let topEmoji = Object.entries(counts).map(([emoji, n]) => ({ emoji, n })).sort((a, b) => b.n - a.n).slice(0, 3);
  let totalReactions = Object.values(counts).reduce((a, b) => a + b, 0);

  return (
    <Fragment>
      {topEmoji.length > 0 && (
        <div className="flex items-center gap-1.5 pt-1 select-none text-gray-500 dark:text-gray-400">
          <span className="flex -space-x-1">
            {topEmoji.map(({ emoji }) => (
              <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-gray-100 dark:bg-gray-800 text-xs leading-none border-2 border-white dark:border-gray-900" key={emoji}>{emoji}</span>
            ))}
          </span>
          <span className={cn('text-xs font-semibold', userReaction ? 'text-blue-600 dark:text-blue-400' : 'text-gray-500 dark:text-gray-400')}>{totalReactions}</span>
        </div>
      )}

      {/* Reaction picker modal */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center" onClick={() => setReactionsOpenFor(null)}>
          <div className="absolute inset-0 bg-black/40" />
          <div className="relative bg-white dark:bg-gray-900 rounded-t-2xl md:rounded-2xl w-full max-w-sm mx-auto p-4 pb-safe" onClick={e => e.stopPropagation()} onTouchMove={e => e.stopPropagation()}>
            <div className="w-10 h-1 rounded-full bg-gray-200 dark:bg-gray-700 mx-auto mb-4 md:hidden" />
            <p className="text-[11px] font-bold uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-3">React to this post</p>
            <div className="grid grid-cols-5 gap-2">
              {REACTIONS.map(item => {
                let isSelected = userReaction === item.r;
                let count = counts[item.r] || 0;
                return (
                  <button
                    onClick={() => { handleReact(postId, item.r, item.t); setReactionsOpenFor(null); }}
                    className={cn(
                      'flex flex-col items-center gap-1 p-2 rounded-xl transition-colors',
                      isSelected ? 'bg-blue-600 text-white' : 'bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700'
                    )}
                    key={item.r}
                  >
                    <span className="text-xl leading-none">{item.r}</span>
                    <span className={cn('text-[10px] font-semibold leading-none min-h-[12px]', isSelected ? 'text-white' : 'text-gray-400 dark:text-gray-500')}>
                      {count > 0 ? count : ''}
                    </span>
                  </button>
                );
              })}
            </div>
            <div className="h-4 md:hidden" />
          </div>
        </div>
      )}
    </Fragment>
  );
}

/* ─── SuggestionDropdown (_n) – mention/hashtag autocomplete ─── */
function SuggestionDropdown({ items, onSelect, activeIndex }) {
  if (!items || items.length === 0) return null;
  return (
    <div className="absolute left-0 right-0 bottom-full mb-1 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg z-50 max-h-48 overflow-y-auto">
      {items.map((item, i) => (
        <button
          key={item.username || item.query || i}
          onClick={() => onSelect(item)}
          className={cn(
            'flex items-center gap-2 w-full text-left px-3 py-2 text-sm transition-colors',
            i === activeIndex ? 'bg-blue-50 dark:bg-blue-900/20' : 'hover:bg-gray-50 dark:hover:bg-gray-800'
          )}
        >
          {item.type === 'user' && item.profile_pic && (
            <img src={item.profile_pic} className="w-6 h-6 rounded-full object-cover" alt="" />
          )}
          <span className="font-semibold text-gray-900 dark:text-gray-100">
            {item.type === 'user' ? `@${item.username}` : item.query}
          </span>
          {item.fullname && <span className="text-xs text-gray-400 truncate">{item.fullname}</span>}
        </button>
      ))}
    </div>
  );
}

/* ─── vn – useMentions hook ─── */
function useMentions(value, inputRef) {
  const [suggestions, setSuggestions] = useState([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [queryInfo, setQueryInfo] = useState(null);

  useEffect(() => {
    if (!inputRef?.current) return;
    const el = inputRef.current;
    const pos = el.selectionStart || 0;
    const before = value.slice(0, pos);
    const mentionMatch = before.match(/@([\w.]*)$/);
    const hashMatch = before.match(/#([\w]*)$/);

    if (mentionMatch && mentionMatch[1].length >= 1) {
      const q = mentionMatch[1].toLowerCase();
      const start = pos - mentionMatch[0].length;
      const end = pos;
      setQueryInfo({ start, end, type: 'user' });
      apiFetch(`/search-users?q=${encodeURIComponent(q)}&limit=6`)
        .then(r => r.ok ? r.json() : [])
        .then(data => {
          setSuggestions((Array.isArray(data) ? data : []).map(u => ({ type: 'user', ...u })));
          setActiveIndex(0);
        })
        .catch(() => setSuggestions([]));
    } else if (hashMatch && hashMatch[1].length >= 1) {
      const q = hashMatch[1].toLowerCase();
      const start = pos - hashMatch[0].length;
      const end = pos;
      setQueryInfo({ start, end, type: 'hashtag' });
      setSuggestions([{ type: 'hashtag', query: `#${q}` }]);
      setActiveIndex(0);
    } else {
      setSuggestions([]);
      setQueryInfo(null);
    }
  }, [value]);

  return { suggestions, setSuggestions, activeIndex, setActiveIndex, queryInfo, setQueryInfo };
}

/* ─── Kn – action buttons (like, comment, view) ─── */
function ActionButtons({ post, currentUser, handleLike, handleComment, showCommentInput, showViewButton, navigate, reactionsOpenFor, setReactionsOpenFor }) {
  const [showInput, setShowInput] = useState(false);
  const [text, setText] = useState('');
  const liked = post.likes.includes(currentUser);
  const inputRef = useRef(null);
  const { suggestions, setSuggestions, activeIndex, setActiveIndex, queryInfo, setQueryInfo } = useMentions(text, inputRef);

  function selectSuggestion(item) {
    let replacement = item.type === 'user' ? `@${item.username}` : item.query;
    let before = text.slice(0, queryInfo.start);
    let after = text.slice(queryInfo.end);
    setText(`${before + replacement} ${after}`);
    setSuggestions([]);
    setQueryInfo(null);
    setTimeout(() => inputRef.current?.focus(), 10);
  }

  function onKeyDown(e) {
    if (suggestions.length > 0) {
      if (e.key === 'ArrowDown') { e.preventDefault(); setActiveIndex(i => (i + 1) % suggestions.length); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); setActiveIndex(i => (i - 1 + suggestions.length) % suggestions.length); }
      else if (e.key === 'Enter' || e.key === 'Tab') { e.preventDefault(); selectSuggestion(suggestions[activeIndex]); }
      else if (e.key === 'Escape') { setSuggestions([]); setQueryInfo(null); }
    } else if (e.key === 'Enter') {
      submitComment();
    }
  }

  function submitComment() {
    let trimmed = text.trim();
    if (trimmed) {
      handleComment(post.id, trimmed);
      setText('');
      setShowInput(false);
      setSuggestions([]);
    }
  }

  return (
    <div className="mt-2">
      <div className="flex items-center gap-1 -ml-3">
        {/* Like */}
        <button
          onClick={() => handleLike(post.id)}
          className={cn(
            'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-colors',
            liked ? 'text-red-500 bg-red-50 dark:bg-red-900/20' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
          )}
        >
          <svg viewBox="0 0 24 24" className={cn('w-4 h-4', liked ? 'fill-red-500 stroke-red-500' : 'fill-none stroke-current')} strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z" />
          </svg>
          <span>{post.likes.length}</span>
        </button>

        {/* Comment */}
        <button
          onClick={() => showCommentInput ? setShowInput(s => !s) : navigate(`/post/${post.id}`)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
        >
          <svg viewBox="0 0 24 24" className="w-4 h-4 fill-none stroke-current" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 11.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.38 8.38 0 01-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.38 8.38 0 013.8-.9h.5a8.48 8.48 0 018 8v.5z" />
          </svg>
          <span>{post.comments.length}</span>
        </button>

        {/* Reaction */}
        <button
          onClick={(e) => { e.stopPropagation(); setReactionsOpenFor(reactionsOpenFor === post.id ? null : post.id); }}
          className="p-2 rounded-full text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          aria-label="React"
        >
          <svg viewBox="0 0 24 24" className="w-4 h-4 fill-none stroke-current" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </button>

        {/* View */}
        {showViewButton && (
          <button
            onClick={() => navigate(`/post/${post.id}`)}
            className="ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold text-gray-400 dark:text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            <svg viewBox="0 0 24 24" className="w-4 h-4 fill-none stroke-current" strokeWidth="1.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              <circle cx="12" cy="12" r="3" />
            </svg>
            <span className="hidden sm:inline">View</span>
          </button>
        )}
      </div>

      {/* Comment input */}
      {showCommentInput && showInput && (
        <div className="flex items-center gap-2 mt-2">
          <img src={localStorage.cached_profile_pic || `${DEFAULT_PIC}`} className="w-8 h-8 rounded-full object-cover flex-shrink-0" alt="" />
          <div className="flex-1 flex items-center bg-gray-100 dark:bg-gray-800 rounded-full px-4 py-1.5 gap-2 focus-within:ring-2 focus-within:ring-blue-100 dark:focus-within:ring-blue-900 transition-all relative">
            <input
              ref={inputRef}
              autoFocus
              type="text"
              value={text}
              onChange={e => setText(e.target.value)}
              onKeyDown={onKeyDown}
              placeholder="Write a comment…"
              className="flex-1 bg-transparent text-sm outline-none placeholder-gray-400 dark:placeholder-gray-500 text-gray-800 dark:text-gray-200"
            />
            <SuggestionDropdown items={suggestions} onSelect={selectSuggestion} activeIndex={activeIndex} />
            {text.trim() && (
              <button onClick={submitComment} className="text-blue-600 dark:text-blue-400 font-bold text-xs flex-shrink-0">Post</button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── _Component21 – poll ─── */
function PollContent({ post, handlePollVote }) {
  const currentUser = localStorage.currentUser;
  const totalVotes = post.options.reduce((acc, opt) => acc + opt.votes.length, 0);

  return (
    <div className="space-y-2 mb-3">
      {post.options.map(opt => {
        let voted = opt.votes.includes(currentUser);
        let pct = totalVotes > 0 ? Math.round(opt.votes.length / totalVotes * 100) : 0;
        return (
          <button
            onClick={() => handlePollVote(post.id, opt.id)}
            className="relative w-full text-left px-4 py-2.5 rounded-full border border-gray-200 dark:border-gray-700 overflow-hidden transition-colors"
            key={opt.id}
          >
            <div className={cn('absolute inset-0 rounded-full', voted ? 'bg-blue-100 dark:bg-blue-900/30' : 'bg-gray-100 dark:bg-gray-800')} style={{ width: `${pct}%` }} />
            <div className="relative flex items-center justify-between">
              <span className={cn('text-sm font-medium', voted ? 'text-blue-700 dark:text-blue-300' : 'text-gray-700 dark:text-gray-300')}>{opt.text}</span>
              <span className="text-xs text-gray-400 dark:text-gray-500 ml-2">{pct}%</span>
            </div>
          </button>
        );
      })}
      <p className="text-xs text-gray-400 dark:text-gray-500">{totalVotes} vote{totalVotes === 1 ? '' : 's'} · tap to switch</p>
    </div>
  );
}

/* ─── _Component27 – video play overlay icon ─── */
function PlayOverlay() {
  return (
    <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
      <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <svg viewBox="0 0 24 24" width="20" height="20" fill="white"><path d="M8 5v14l11-7z" /></svg>
      </div>
    </div>
  );
}

/* ─── _Component25 – custom video player ─── */
function VideoPlayer({ src, qualities = ['360p', '720p', '1080p'] }) {
  const videoRef = useRef(null);
  const containerRef = useRef(null);
  const hideTimer = useRef(null);
  const seeking = useRef(false);
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(false);
  const [volume, setVolume] = useState(1);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [buffering, setBuffering] = useState(true);
  const [showControls, setShowControls] = useState(true);
  const [fullscreen, setFullscreen] = useState(false);
  const [pip, setPip] = useState(false);
  const [theater, setTheater] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settingsTab, setSettingsTab] = useState('speed');
  const [playbackRate, setPlaybackRate] = useState(1);
  const [quality, setQuality] = useState(qualities[qualities.length - 1]);

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    const onMeta = () => setDuration(v.duration || 0);
    const onTime = () => { if (!seeking.current) setCurrentTime(v.currentTime); };
    const onPlay = () => { setPlaying(true); setBuffering(false); };
    const onPause = () => setPlaying(false);
    const onWait = () => { if (!seeking.current) setBuffering(true); };
    const onCan = () => setBuffering(false);
    const onFS = () => setFullscreen(!!document.fullscreenElement);
    const onPiP = () => setPip(!!document.pictureInPictureElement);

    v.addEventListener('loadedmetadata', onMeta);
    v.addEventListener('timeupdate', onTime);
    v.addEventListener('play', onPlay);
    v.addEventListener('pause', onPause);
    v.addEventListener('waiting', onWait);
    v.addEventListener('canplay', onCan);
    v.addEventListener('canplaythrough', onCan);
    v.addEventListener('loadeddata', onCan);
    document.addEventListener('fullscreenchange', onFS);
    document.addEventListener('pictureinpicturechange', onPiP);
    return () => {
      v.removeEventListener('loadedmetadata', onMeta);
      v.removeEventListener('timeupdate', onTime);
      v.removeEventListener('play', onPlay);
      v.removeEventListener('pause', onPause);
      v.removeEventListener('waiting', onWait);
      v.removeEventListener('canplay', onCan);
      v.removeEventListener('canplaythrough', onCan);
      v.removeEventListener('loadeddata', onCan);
      document.removeEventListener('fullscreenchange', onFS);
      document.removeEventListener('pictureinpicturechange', onPiP);
      try { v.pause(); } catch {}
      v.src = "";
      try { v.load(); } catch {}
    };
  }, []);

  const showUI = () => {
    setShowControls(true);
    clearTimeout(hideTimer.current);
    hideTimer.current = setTimeout(() => setShowControls(false), 3000);
  };

  useEffect(() => () => clearTimeout(hideTimer.current), []);
  useEffect(() => { if (!playing) setShowControls(true); }, [playing]);

  const togglePlay = (e) => {
    e?.stopPropagation();
    const v = videoRef.current;
    v.paused ? v.play().catch(() => {}) : v.pause();
  };

  const toggleMute = (e) => {
    e?.stopPropagation();
    const v = videoRef.current;
    v.muted = !v.muted;
    setMuted(v.muted);
    setVolume(v.muted ? 0 : v.volume);
  };

  const toggleFullscreen = (e) => {
    e?.stopPropagation();
    document.fullscreenElement ? document.exitFullscreen() : containerRef.current.requestFullscreen().catch(() => {});
  };

  const fmt = t => !t || isNaN(t) ? '0:00' : `${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, '0')}`;
  const pct = duration ? currentTime / duration * 100 : 0;

  const ControlBtn = ({ onClick, label, children }) => (
    <button onClick={onClick} aria-label={label}
      style={{ color: '#fff', background: 'none', border: 'none', padding: 0, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', width: 32, height: 32, borderRadius: 6, flexShrink: 0 }}
      onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.12)'}
      onMouseLeave={e => e.currentTarget.style.background = 'none'}
    >{children}</button>
  );

  return (
    <div ref={containerRef} onMouseMove={showUI} onMouseLeave={() => playing && setShowControls(false)} onClick={togglePlay}
      style={{ position: 'relative', width: '100%', background: '#000', borderRadius: 12, overflow: 'hidden', aspectRatio: theater ? '21/9' : '16/9' }}>
      <video ref={videoRef} src={`${src}?quality=${quality}`} style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block' }} playsInline />

      {/* Buffering spinner */}
      {buffering && !seeking.current && (
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.25)', pointerEvents: 'none' }}>
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" style={{ animation: 'spin 0.8s linear infinite' }}>
            <circle cx="12" cy="12" r="10" stroke="rgba(255,255,255,0.25)" strokeWidth="3" />
            <path d="M4 12a8 8 0 018-8" stroke="white" strokeWidth="3" strokeLinecap="round" />
          </svg>
        </div>
      )}

      {/* Big play button when paused */}
      {!playing && !buffering && (
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
          <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg viewBox="0 0 24 24" width="32" height="32" fill="white"><path d="M8 5v14l11-7z" /></svg>
          </div>
        </div>
      )}

      {/* Controls bar */}
      <div onClick={e => e.stopPropagation()} style={{ position: 'absolute', bottom: 0, left: 0, right: 0, opacity: showControls ? 1 : 0, transition: 'opacity 0.25s', background: 'rgba(0,0,0,0.72)', backdropFilter: 'blur(8px)', padding: '8px 8px 6px' }}>
        {/* Progress bar */}
        <div style={{ position: 'relative', height: 20, display: 'flex', alignItems: 'center', marginBottom: 2 }}>
          <div style={{ position: 'absolute', left: 0, right: 0, height: 3, background: 'rgba(255,255,255,0.25)', borderRadius: 2 }} />
          <div style={{ position: 'absolute', left: 0, height: 3, background: '#3b82f6', borderRadius: 2, width: `${pct}%`, pointerEvents: 'none' }} />
          <div style={{ position: 'absolute', width: 12, height: 12, background: '#fff', borderRadius: '50%', left: `calc(${pct}% - 6px)`, pointerEvents: 'none', boxShadow: '0 0 3px rgba(0,0,0,0.5)' }} />
          <input type="range" min="0" max={duration || 0} step="0.05" value={currentTime}
            onMouseDown={() => { seeking.current = true; }}
            onTouchStart={() => { seeking.current = true; }}
            onChange={e => { let t = parseFloat(e.target.value); setCurrentTime(t); videoRef.current.currentTime = t; }}
            onMouseUp={() => { seeking.current = false; setBuffering(false); }}
            onTouchEnd={() => { seeking.current = false; setBuffering(false); }}
            style={{ position: 'absolute', inset: 0, width: '100%', opacity: 0, cursor: 'pointer', height: '100%', margin: 0 }}
            aria-label="Seek"
          />
        </div>
        {/* Button row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <ControlBtn onClick={togglePlay} label={playing ? 'Pause' : 'Play'}>
            {playing
              ? <svg viewBox="0 0 24 24" width="20" height="20" fill="white"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" /></svg>
              : <svg viewBox="0 0 24 24" width="20" height="20" fill="white" style={{ marginLeft: 2 }}><path d="M8 5v14l11-7z" /></svg>
            }
          </ControlBtn>
          <ControlBtn onClick={toggleMute} label={muted ? 'Unmute' : 'Mute'}>
            {muted || volume === 0
              ? <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 5L6 9H2v6h4l5 4V5zM23 9l-6 6M17 9l6 6" /></svg>
              : <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" /><path d="M19.07 4.93a10 10 0 010 14.14M15.54 8.46a5 5 0 010 7.07" /></svg>
            }
          </ControlBtn>
          <span style={{ color: 'rgba(255,255,255,0.8)', fontSize: 11, fontWeight: 600, marginLeft: 4, whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }}>
            {fmt(currentTime)} / {fmt(duration)}
          </span>
          <div style={{ flex: 1 }} />
          <ControlBtn onClick={toggleFullscreen} label={fullscreen ? 'Exit fullscreen' : 'Fullscreen'}>
            {fullscreen
              ? <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round"><path d="M9 9V4.5M9 9H4.5M9 9L3.75 3.75M9 15v4.5M9 15H4.5M9 15l-5.25 5.25M15 9h4.5M15 9V4.5M15 9l5.25-5.25M15 15h4.5M15 15v4.5m0-4.5l5.25 5.25" /></svg>
              : <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round"><path d="M3.75 3.75v4.5m0-4.5h4.5m-4.5 0L9 9M3.75 20.25v-4.5m0 4.5h4.5m-4.5 0L9 15M20.25 3.75h-4.5m4.5 0v4.5m0-4.5L15 9m5.25 11.25h-4.5m4.5 0v-4.5m0 4.5L15 15" /></svg>
            }
          </ControlBtn>
        </div>
      </div>
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

/* ─── _Component26 – fullscreen media lightbox ─── */
function MediaLightbox({ items, startIndex, onClose }) {
  const [idx, setIdx] = useState(startIndex);
  const touchRef = useRef(null);
  const total = items.length;
  const current = items[idx];
  const isVid = isVideo(current);

  const next = useCallback(() => setIdx(i => (i + 1) % total), [total]);
  const prev = useCallback(() => setIdx(i => (i - 1 + total) % total), [total]);

  useEffect(() => {
    const saved = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = saved; };
  }, []);

  useEffect(() => {
    const onKey = e => {
      if (e.key === 'Escape') onClose();
      else if (e.key === 'ArrowRight') next();
      else if (e.key === 'ArrowLeft') prev();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose, next, prev]);

  const onTouchStart = e => { touchRef.current = { x: e.targetTouches[0].clientX, y: e.targetTouches[0].clientY }; };
  const onTouchEnd = e => {
    if (!touchRef.current) return;
    let dx = touchRef.current.x - e.changedTouches[0].clientX;
    let dy = Math.abs(touchRef.current.y - e.changedTouches[0].clientY);
    if (Math.abs(dx) > 44 && Math.abs(dx) > dy * 1.5) {
      dx > 0 ? next() : prev();
    }
    touchRef.current = null;
  };

  return (
    <div className="fixed inset-0 z-[999] flex flex-col bg-black select-none" style={{ touchAction: 'none' }}>
      {/* Top bar */}
      <div className="flex-shrink-0 flex items-center justify-between px-4 py-3" style={{ background: 'linear-gradient(to bottom, rgba(0,0,0,0.6) 0%, transparent 100%)' }}>
        <button onClick={onClose} className="flex items-center justify-center rounded-full bg-black/40 hover:bg-black/60 transition-colors w-10 h-10" style={{ color: '#fff' }} aria-label="Close">
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round"><path d="M6 18L18 6M6 6l12 12" /></svg>
        </button>
        {total > 1 && <span style={{ color: 'rgba(255,255,255,0.8)', fontSize: 13, fontWeight: 600 }}>{idx + 1} / {total}</span>}
        <a href={current} download target="_blank" rel="noreferrer" className="w-10 h-10 flex items-center justify-center rounded-full bg-black/40 hover:bg-black/60 transition-colors" style={{ color: '#fff' }} aria-label="Download">
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3" /></svg>
        </a>
      </div>

      {/* Content area */}
      <div className="flex-1 flex items-center justify-center relative overflow-hidden" onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
        {total > 1 && (
          <button onClick={prev} className="hidden md:flex absolute left-4 z-10 w-11 h-11 items-center justify-center rounded-full bg-black/40 hover:bg-black/60 transition-colors" style={{ color: '#fff' }} aria-label="Previous">
            <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M15 19l-7-7 7-7" /></svg>
          </button>
        )}
        <div className="w-full h-full flex items-center justify-center px-0 md:px-16">
          {isVid
            ? <div className="w-full max-w-4xl"><VideoPlayer src={current} /></div>
            : <img src={current} alt={`Media ${idx + 1}`} draggable={false} style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', display: 'block', margin: '0 auto' }} key={current} />
          }
        </div>
        {total > 1 && (
          <button onClick={next} className="hidden md:flex absolute right-4 z-10 w-11 h-11 items-center justify-center rounded-full bg-black/40 hover:bg-black/60 transition-colors" style={{ color: '#fff' }} aria-label="Next">
            <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M9 5l7 7-7 7" /></svg>
          </button>
        )}
      </div>

      {/* Bottom dot nav (mobile) */}
      {total > 1 && (
        <div className="flex-shrink-0 flex items-center justify-between px-4 py-4" style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.6) 0%, transparent 100%)' }}>
          <button onClick={prev} className="md:hidden w-10 h-10 flex items-center justify-center rounded-full bg-black/40" style={{ color: '#fff' }} aria-label="Previous">
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M15 19l-7-7 7-7" /></svg>
          </button>
          <div className="flex items-center gap-1.5 justify-center flex-1">
            {items.map((_, i) => (
              <button key={i} onClick={() => setIdx(i)} aria-label={`Go to ${i + 1}`} style={{ width: i === idx ? 20 : 6, height: 6, borderRadius: 3, background: i === idx ? '#fff' : 'rgba(255,255,255,0.35)', border: 'none', padding: 0, cursor: 'pointer', transition: 'width 0.2s, background 0.2s' }} />
            ))}
          </div>
          <button onClick={next} className="md:hidden w-10 h-10 flex items-center justify-center rounded-full bg-black/40" style={{ color: '#fff' }} aria-label="Next">
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M9 5l7 7-7 7" /></svg>
          </button>
        </div>
      )}
    </div>
  );
}

/* ─── _Component22 – media gallery ─── */
function MediaGallery({ media, poster }) {
  const [lightboxIdx, setLightboxIdx] = useState(null);
  const items = Array.isArray(media) ? media : [];
  const count = items.length;
  const overflow = count > 6;
  const extra = count - 6;

  if (count === 0) return null;

  const openLB = i => setLightboxIdx(i);
  const closeLB = () => setLightboxIdx(null);

  if (count === 1) {
    let src = items[0];
    return (
      <Fragment>
        {isVideo(src)
          ? <div className="w-full"><VideoPlayer src={src} /></div>
          : <img src={src} alt="Post media" loading="lazy" onClick={() => openLB(0)} className="w-auto h-auto max-w-full max-h-[70vh] object-contain rounded-xl cursor-zoom-in mx-auto block" />
        }
        {lightboxIdx !== null && <MediaLightbox items={items} startIndex={lightboxIdx} onClose={closeLB} />}
      </Fragment>
    );
  }

  const cellStyle = { position: 'relative', overflow: 'hidden', cursor: 'pointer', backgroundColor: '#111' };
  const mediaStyle = { width: '100%', height: '100%', objectFit: 'cover', display: 'block' };

  function renderCell(src, index) {
    const isLast = index === 5 && overflow;
    return (
      <div style={{ ...cellStyle, aspectRatio: '1' }} onClick={() => openLB(index)} key={index}>
        {isVideo(src) ? <video src={src} poster={poster} muted preload="metadata" style={mediaStyle} /> : <img src={src} alt={`${index + 1}`} loading="lazy" style={mediaStyle} />}
        {isVideo(src) && !isLast && <PlayOverlay />}
        {isLast && (
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ color: '#fff', fontSize: 22, fontWeight: 700 }}>+{extra}</span>
          </div>
        )}
      </div>
    );
  }

  let grid;
  if (count === 2) {
    grid = <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>{items.slice(0, 2).map((s, i) => renderCell(s, i))}</div>;
  } else if (count === 3) {
    grid = (
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 2 }}>
        <div style={{ ...cellStyle, aspectRatio: '1' }} onClick={() => openLB(0)}>
          {isVideo(items[0]) ? <video src={items[0]} poster={poster} muted preload="metadata" style={mediaStyle} /> : <img src={items[0]} alt="1" loading="lazy" style={mediaStyle} />}
          {isVideo(items[0]) && <PlayOverlay />}
        </div>
        <div style={{ display: 'grid', gridTemplateRows: '1fr 1fr', gap: 2 }}>
          {items.slice(1, 3).map((s, i) => renderCell(s, i + 1))}
        </div>
      </div>
    );
  } else if (count === 4) {
    grid = <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>{items.slice(0, 4).map((s, i) => renderCell(s, i))}</div>;
  } else if (count === 5) {
    grid = (
      <div style={{ display: 'grid', gap: 2 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>{items.slice(0, 2).map((s, i) => renderCell(s, i))}</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 2 }}>{items.slice(2, 5).map((s, i) => renderCell(s, i + 2))}</div>
      </div>
    );
  } else {
    grid = <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 2 }}>{items.slice(0, 6).map((s, i) => renderCell(s, i))}</div>;
  }

  return (
    <Fragment>
      <div style={{ overflow: 'hidden', borderRadius: 12 }}>{grid}</div>
      {lightboxIdx !== null && <MediaLightbox items={items} startIndex={lightboxIdx} onClose={closeLB} />}
    </Fragment>
  );
}

/* ─── Jn – event card ─── */
function EventCard({ post, authorProfile, handleLike, menuOpen, setMenuOpen, navigate }) {
  const currentUser = localStorage.currentUser;
  const ended = new Date(post.scheduled_for) <= new Date();
  const liked = post.likes.includes(currentUser);
  const dateStr = new Date(post.scheduled_for).toLocaleString(undefined, { weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });

  return (
    <div className="bg-white dark:bg-gray-900 px-4 pt-4 pb-5 border-b border-gray-100 dark:border-gray-800">
      <PostHeader post={post} authorProfile={authorProfile} groupProfiles={{}} menuOpen={menuOpen} setMenuOpen={setMenuOpen} navigate={navigate} />
      <div className="rounded-2xl border border-gray-100 dark:border-gray-800 overflow-hidden">
        <div className="h-[3px] bg-gradient-to-r from-blue-500 via-indigo-500 to-violet-500" />
        <div className="p-4">
          <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 px-2.5 py-1 rounded-full mb-3">
            <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 fill-none stroke-current" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></svg>
            {dateStr}{ended && <span className="font-normal text-gray-400 ml-1">· Ended</span>}
          </div>
          <h3 className="text-base font-bold text-gray-900 dark:text-gray-100 leading-snug mb-1">{post.title || post.text}</h3>
          {post.title && post.text && <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed mb-3">{post.text}</p>}
          {post.location && (
            <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400 mb-4">
              <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 fill-none stroke-current flex-shrink-0" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0zM19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" /></svg>
              {post.location}
            </div>
          )}
          <button
            onClick={() => !ended && handleLike(post.id)}
            disabled={ended}
            className={cn(
              'inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold transition-colors',
              liked ? 'bg-blue-600 text-white' : ended ? 'bg-gray-100 dark:bg-gray-800 text-gray-400 cursor-default' : 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/30'
            )}
          >
            <svg viewBox="0 0 24 24" className={cn('w-4 h-4', liked ? 'fill-white' : 'fill-none stroke-current')} strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
            </svg>
            {ended ? `${post.likes.length} attended` : liked ? `${post.likes.length} interested · tap to remove` : `${post.likes.length} interested`}
          </button>
        </div>
      </div>
      <div className="h-2 bg-gray-50 dark:bg-gray-800/50 -mx-4 mt-4" />
    </div>
  );
}

/* ─── Yn – live ended card ─── */
function LiveEndedCard({ post, authorProfile }) {
  return (
    <div className="bg-white dark:bg-gray-900 overflow-hidden pt-5">
      <div className="relative mx-4 rounded-2xl overflow-hidden">
        <img src={post.media?.[0] || authorProfile.profile_pic || '/assets/live-fallback.jpg'} alt="Live stream thumbnail" className="w-full h-48 object-cover grayscale" loading="lazy" />
        <div className="absolute inset-0 bg-black/50" />
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="flex items-center gap-2 bg-black/60 backdrop-blur-sm px-4 py-2 rounded-full">
            <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 text-gray-300"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 14H9V8h2v8zm4 0h-2V8h2v8z" /></svg>
            <span className="text-white text-sm font-semibold">Live Ended</span>
          </div>
        </div>
        <div className="absolute top-3 left-3">
          <span className="text-[10px] font-bold uppercase tracking-widest text-white bg-black/50 px-2.5 py-1 rounded-full">Was Live</span>
        </div>
        <div className="absolute bottom-3 left-3 right-3">
          <p className="text-white text-sm font-semibold">{post.text || 'Live Stream'}</p>
          <p className="text-gray-300 text-xs">{timeAgo(post.created_at)}</p>
        </div>
      </div>
      <div className="px-4 pt-3 flex items-center gap-2.5 pb-5">
        <img src={authorProfile.profile_pic} alt={post.username} className="w-9 h-9 rounded-full object-cover border border-gray-200 dark:border-gray-700" loading="lazy" />
        <div>
          <span className="text-sm font-semibold text-gray-800 dark:text-gray-100">{authorProfile.fullname}</span>
          <span className="text-sm text-gray-400"> was live</span>
        </div>
      </div>
      <div className="h-2 bg-gray-50 dark:bg-gray-800/50" />
    </div>
  );
}

/* ─── Xn – live stream card ─── */
function LiveCard({ post, authorProfile, liveCounts, handleLike, navigate }) {
  const currentUser = localStorage.currentUser;
  const thumbnail = post.media?.[0] || authorProfile.profile_pic || '/assets/live-fallback.jpg';
  const viewers = liveCounts?.[String(post.id)] || 0;
  const liked = post.likes.includes(currentUser);

  return (
    <div className="bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800 overflow-hidden pb-4">
      <div className="relative">
        <a href={`/live/${encodeURIComponent(post.id)}`} onClick={e => { e.preventDefault(); U.navigate(`/live/${post.id}`); }} className="block">
          <img src={thumbnail} alt="Live stream" className="w-full h-56 object-cover" loading="lazy" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
        </a>
        <div className="absolute top-3 left-3 flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-red-600 text-white rounded-full text-xs font-bold">
            <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />LIVE
          </span>
          <span className="text-xs text-white bg-black/40 backdrop-blur-sm px-2.5 py-1 rounded-full">{viewers} watching</span>
        </div>
        <div className="absolute bottom-3 left-3 right-3 flex justify-between items-end gap-2">
          <div className="min-w-0">
            <p className="text-white text-sm font-bold truncate">{post.text || 'Live now'}</p>
            <p className="text-gray-300 text-xs">{timeAgo(post.created_at)}</p>
          </div>
          <a onClick={e => { e.preventDefault(); localStorage.setItem('liveSt', post.username); navigate(`/live/${post.id}`); }} className="flex-shrink-0 px-3 py-1.5 bg-white/10 border border-white/30 backdrop-blur-sm text-white text-xs font-semibold rounded-full hover:bg-white/20 transition-colors" role="button">Watch →</a>
        </div>
      </div>
      <div className="px-4 pt-3 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <img src={authorProfile.profile_pic} alt={post.username} className="w-9 h-9 rounded-full object-cover border-2 border-red-500" loading="lazy" />
          <div>
            <span className="text-sm font-bold text-gray-900 dark:text-gray-100">{authorProfile.fullname}</span>
            <span className="text-xs font-semibold text-red-500"> · is live</span>
          </div>
        </div>
        <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
          <button onClick={() => handleLike(post.id)} className={cn('flex items-center gap-1 transition-colors', liked ? 'text-red-500' : 'hover:text-red-400')}>
            <svg viewBox="0 0 24 24" className={cn('w-4 h-4', liked ? 'fill-red-500 stroke-red-500' : 'fill-none stroke-current')} strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z" />
            </svg>
            {post.likes.length}
          </button>
          <button onClick={() => navigate(`/post/${post.id}`)} className="flex items-center gap-1 hover:text-blue-500 transition-colors">
            <svg viewBox="0 0 24 24" className="w-4 h-4 fill-none stroke-current" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 11.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.38 8.38 0 01-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.38 8.38 0 013.8-.9h.5a8.48 8.48 0 018 8v.5z" />
            </svg>
            {post.comments.length}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── _Component20 – snap embed in feed ─── */
function SnapEmbed({ post, currentUser, handleLike }) {
  const [isVisible, setIsVisible] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(([entry]) => setIsVisible(entry.isIntersecting && entry.intersectionRatio >= 0.6), { threshold: 0.6 });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  return (
    <div ref={ref} className="relative w-full border-b border-gray-100 dark:border-gray-800 bg-black overflow-hidden" style={{ height: '85vh', maxHeight: 700 }}>
      {SnapPlayer
        ? <SnapPlayer snap={post} username={currentUser} isActive={isVisible} onLike={() => handleLike(post.id)} onProfileClick={u => U.navigate(`/@${u}`)} />
        : (
          <div className="w-full h-full flex items-center justify-center text-white">
            <p className="text-sm">Snap content</p>
          </div>
        )
      }
    </div>
  );
}

/* ─── _Component23 – skeleton loader ─── */
export function PostSkeleton() {
  return (
    <div className="bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800 px-4 pt-4 pb-5">
      <div className="flex items-center mb-3 gap-2">
        <div className="w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-800 animate-pulse flex-shrink-0" />
        <div className="flex-1 space-y-2">
          <div className="h-3 bg-gray-100 dark:bg-gray-800 rounded-full w-1/3 animate-pulse" />
          <div className="h-2.5 bg-gray-100 dark:bg-gray-800 rounded-full w-1/5 animate-pulse" />
        </div>
      </div>
      <div className="space-y-2 mb-3">
        <div className="h-3 bg-gray-100 dark:bg-gray-800 rounded-full animate-pulse" />
        <div className="h-3 bg-gray-100 dark:bg-gray-800 rounded-full w-4/5 animate-pulse" />
      </div>
      <div className="w-full h-48 bg-gray-100 dark:bg-gray-800 rounded-xl animate-pulse mb-4" />
      <div className="flex gap-2 border-t border-gray-100 dark:border-gray-800 pt-3">
        <div className="w-16 h-6 bg-gray-100 dark:bg-gray-800 rounded-full animate-pulse" />
        <div className="w-16 h-6 bg-gray-100 dark:bg-gray-800 rounded-full animate-pulse" />
        <div className="w-12 h-6 bg-gray-100 dark:bg-gray-800 rounded-full animate-pulse ml-auto" />
      </div>
    </div>
  );
}

/* ─── Zn – main PostCard component ─── */
const PostCard = ({
  post,
  groupProfiles = {},
  liveCounts = {},
  reactionCountsCache = {},
  reactionsOpenFor,
  setReactionsOpenFor,
  handlePollVote,
  handleComment,
  handleLike,
  handleReact,
  showCommentInput = true,
  showViewButton = true,
  onNavigate
}) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const authorProfile = useProfileCache(post.username);
  const currentUser = localStorage.currentUser;
  const navigate = onNavigate || (path => U.navigate(path));

  // Snap type
  if (post.type === 'snap') {
    return <SnapEmbed post={post} currentUser={currentUser} handleLike={handleLike} />;
  }
  // Event type
  if (post.type === 'event') {
    return <EventCard post={post} authorProfile={authorProfile} handleLike={handleLike} menuOpen={menuOpen} setMenuOpen={setMenuOpen} navigate={navigate} />;
  }
  // Live ended
  if (post.type === 'live_ended') {
    return <LiveEndedCard post={post} authorProfile={authorProfile} />;
  }
  // Active live
  if (post.type === 'live') {
    return <LiveCard post={post} authorProfile={authorProfile} liveCounts={liveCounts} handleLike={handleLike} navigate={navigate} />;
  }

  // Default post (text, poll, media)
  return (
    <div className="bg-white dark:bg-gray-900 px-4 pt-4 pb-4">
      <PostHeader post={post} authorProfile={authorProfile} groupProfiles={groupProfiles} menuOpen={menuOpen} setMenuOpen={setMenuOpen} navigate={navigate} />
      {post.text && (
        <div className="text-sm leading-relaxed text-gray-800 dark:text-gray-200 mb-3 whitespace-pre-wrap">
          <RichText html={post.text} />
        </div>
      )}
      {post.type === 'poll' && post.options && <PollContent post={post} handlePollVote={handlePollVote} />}
      {post.media?.length > 0 && (
        <div className="mb-3 -mx-4 md:mx-0 md:rounded-xl overflow-hidden">
          <MediaGallery media={post.media} poster={authorProfile.profile_pic} />
        </div>
      )}
      <ReactionsBar postId={post.id} reactionCountsCache={reactionCountsCache} reactionsOpenFor={reactionsOpenFor} setReactionsOpenFor={setReactionsOpenFor} handleReact={handleReact} />
      <ActionButtons post={post} currentUser={currentUser} handleLike={handleLike} handleComment={handleComment} showCommentInput={showCommentInput} showViewButton={showViewButton} navigate={navigate} reactionsOpenFor={reactionsOpenFor} setReactionsOpenFor={setReactionsOpenFor} />
      <div className="h-2 bg-gray-50 dark:bg-gray-800/50 -mx-4 mt-4" />
    </div>
  );
};

export default PostCard;
