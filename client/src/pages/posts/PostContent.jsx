import { DEFAULT_AVATAR } from '../../utils/defaultAvatar.js';
import { useState, useEffect, useRef } from 'react';
import { apiFetch } from '../../config/api';
import { cn } from '../../utils/classNames';
import PostCard from '../../components/ui/PostCard';
import RichText from '../../components/ui/RichText';
import StickerPicker from '../../components/ui/StickerPicker';
import { makeStickerText, isStickerText, parseStickerText, withSticker } from '../../utils/stickerUtils';
import useProfileCache from '../../utils/useProfileCache';
import { VerifiedBadge } from '../../components/ui/VerifiedBadge';
import { replaceTokenAt } from '../../utils/autocomplete';

function CommentItem({ cmt, postId, postOwner, onReply, onDelete, depth = 0, followingUsernames = [], postRead = true, autoReply = '' }) {
 const profile = useProfileCache(cmt.username);
 const ciGuest = !localStorage.currentUser;
 const currentUser = localStorage.currentUser;
 const [showReplyInput, setShowReplyInput] = useState(() => !!autoReply && String(cmt.id) === String(autoReply));
 const [replyText, setReplyText] = useState('');
 const [showReplySticker, setShowReplySticker] = useState(false);
 const [replyStickerUrl, setReplyStickerUrl] = useState(null);
 const replies = cmt.replies || [];
 const [showReplies, setShowReplies] = useState(() =>
  replies.some(r => followingUsernames.includes(r.username)) ||
  (!!autoReply && replies.some(r => String(r.id) === String(autoReply))));


 if (cmt.deleted && replies.length === 0) return null;

 return (
 <div className={`flex items-start gap-2 ${depth > 0 ? 'ml-8 mt-2' : 'mt-3'}`}>
 <img
 src={profile.profile_pic || DEFAULT_AVATAR}
 alt={profile.fullname}
 className="w-7 h-7 rounded-full object-cover flex-shrink-0 border border-gray-100 "
 loading="lazy"
 />
 <div className="flex-1 min-w-0">
 <div className="bg-gray-50 px-3 py-2 rounded-2xl">
 <div className="flex items-center gap-1">
 <p className="text-xs font-bold text-gray-900 leading-snug cursor-pointer" onClick={() => { if (ciGuest) { window.showAuthPrompt?.('Create an account to view profiles'); return; } window.Lexum?.navigate(`/@${cmt.username}`); }}>
 {profile.fullname || cmt.username}
 </p>
 {(cmt.verified === true || profile.verified === true) && <VerifiedBadge className="w-3 h-3" />}
 {cmt.deleted && <span className="text-[10px] text-gray-400 italic">[deleted]</span>}
 </div>
 {!cmt.deleted && (
 <div className="text-sm text-gray-700 leading-snug mt-0.5">
 <RichText html={cmt.text} />
 </div>
 )}
 </div>
 {!cmt.deleted && (
 <div className="flex items-center gap-3 mt-0.5 ml-2">
 {currentUser && (
 <button onClick={() => setShowReplyInput(!showReplyInput)} className="text-[11px] font-semibold text-gray-400 hover:text-blue-500 transition-colors">
 Reply
 </button>
 )}
 {(currentUser === cmt.username || currentUser === postOwner) && (
 <button onClick={() => onDelete(cmt.id)} className="text-[11px] font-semibold text-gray-400 hover:text-red-500 transition-colors">
 Delete
 </button>
 )}
 {replies.length > 0 && (
  <button
  onClick={() => { if (postRead) setShowReplies(!showReplies); }}
  className={cn("text-[11px] font-semibold transition-colors", postRead ? "text-gray-400 hover:text-blue-500 cursor-pointer" : "text-gray-300 cursor-default")}
  title={postRead ? "" : "Scroll to read the post first"}
  >
  {showReplies ? 'Hide' : 'View'} {replies.length} {replies.length === 1 ? 'reply' : 'replies'}
  </button>
  )}
 </div>
 )}
 {showReplyInput && currentUser && (
 <div className="mt-2 ml-2">
 <div className="relative flex items-center gap-2">
 <input
 type="text"
 value={replyText}
 onChange={e => setReplyText(e.target.value)}
 onKeyDown={e => { if (e.key === 'Enter') { const p = withSticker(replyText, replyStickerUrl); if (p) { onReply(cmt.id, p); setReplyText(''); setReplyStickerUrl(null); setShowReplyInput(false); } } }}
 placeholder="Write a reply..."
 className="flex-1 bg-gray-100 rounded-full px-3 py-1.5 text-xs outline-none text-gray-800 placeholder-gray-400"
 autoFocus
 />
 <button onClick={() => setShowReplySticker(!showReplySticker)} className="text-gray-400 hover:text-gray-600 flex-shrink-0 transition-colors" title="Add sticker">
 <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 fill-none stroke-current" strokeWidth="2"><path d="M15.5 3H7a4 4 0 0 0-4 4v10a4 4 0 0 0 4 4h6l7-7V7a4 4 0 0 0-4-4Z" strokeLinejoin="round" /><path d="M13 21v-4a4 4 0 0 1 4-4h4" strokeLinejoin="round" /></svg>
 </button>
 {(replyText.trim() || replyStickerUrl) && (
 <button onClick={() => { const p = withSticker(replyText, replyStickerUrl); if (!p) return; onReply(cmt.id, p); setReplyText(''); setReplyStickerUrl(null); setShowReplyInput(false); }} className="text-blue-600 font-bold text-xs">
 Reply
 </button>
 )}
 {showReplySticker && (
 <StickerPicker
 onSelect={(url) => { setReplyStickerUrl(url); setShowReplySticker(false); }}
 onClose={() => setShowReplySticker(false)}
 />
 )}
 </div>
 {replyStickerUrl && (
 <div className="flex items-center gap-2 mt-1.5">
 <img src={replyStickerUrl} alt="" className="w-10 h-10 rounded-lg bg-white object-contain p-0.5 border border-gray-200" />
 <button onClick={() => setReplyStickerUrl(null)} className="text-gray-400 hover:text-gray-600" title="Remove sticker">
 <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 fill-none stroke-current" strokeWidth="2"><circle cx="12" cy="12" r="9" /><path d="m15 9-6 6M9 9l6 6" strokeLinecap="round" /></svg>
 </button>
 </div>
 )}
 </div>
 )}
 {showReplies && replies.map((r, i) => (
  <CommentItem key={r.id || i} cmt={r} postId={postId} postOwner={postOwner} onReply={onReply} onDelete={onDelete} depth={depth + 1} followingUsernames={followingUsernames} postRead={postRead} autoReply={autoReply} />
  ))}
 </div>
 </div>
 );
}

function CommentInput({ onSubmit }) {
 const [text, setText] = useState('');
 const [showStickerPicker, setShowStickerPicker] = useState(false);
 const [stickerUrl, setStickerUrl] = useState(null);
 const inputRef = useRef(null);

 // Auto-complete suggestions (mentions/hashtags)
 const [suggestions, setSuggestions] = useState([]);
 const [activeIndex, setActiveIndex] = useState(0);
 const [queryInfo, setQueryInfo] = useState(null);

 useEffect(() => {
 if (!inputRef.current) return;
 const el = inputRef.current;
 const pos = el.selectionStart || 0;
 const before = text.slice(0, pos);
 const mentionMatch = before.match(/@([\w.]*)$/);
 const hashMatch = before.match(/#([\w-]*)$/);

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
 }, [text]);

 function selectSuggestion(item) {
 let replacement = item.type === 'user' ? `@${item.username}` : item.query;
 setText(replaceTokenAt(text, queryInfo.start, replacement));
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
 const payload = withSticker(text, stickerUrl);
 if (payload) {
 onSubmit(payload);
 setText('');
 setStickerUrl(null);
 setSuggestions([]);
 }
 }

 return (
 <div className="relative">
 <div className="flex items-center gap-2">
 <img
 src={localStorage.cached_profile_pic || DEFAULT_AVATAR}
 className="w-8 h-8 rounded-full object-cover flex-shrink-0 border border-gray-100 "
 alt=""
 />
 <div className="flex-1 flex items-center bg-gray-100 rounded-full px-4 py-1.5 gap-2 focus-within:ring-2 focus-within:ring-blue-100 transition-all relative">
 <input
 ref={inputRef}
 type="text"
 value={text}
 onChange={e => setText(e.target.value)}
 onKeyDown={onKeyDown}
 placeholder="Write a comment…"
 className="flex-1 bg-transparent text-sm outline-none placeholder-gray-400 text-gray-800 "
 />
 <button onClick={() => setShowStickerPicker(!showStickerPicker)} className="text-gray-400 hover:text-gray-600 flex-shrink-0 transition-colors" title="Add sticker">
 <svg viewBox="0 0 24 24" className="w-4 h-4 fill-none stroke-current" strokeWidth="2"><path d="M15.5 3H7a4 4 0 0 0-4 4v10a4 4 0 0 0 4 4h6l7-7V7a4 4 0 0 0-4-4Z" strokeLinejoin="round" /><path d="M13 21v-4a4 4 0 0 1 4-4h4" strokeLinejoin="round" /></svg>
 </button>
 {suggestions.length > 0 && (
 <div className="absolute left-0 right-0 bottom-full mb-1 bg-white border border-gray-200 rounded-xl shadow-lg z-50 max-h-48 overflow-y-auto">
 {suggestions.map((item, i) => (
 <button
 key={item.username || item.query || i}
 onClick={() => selectSuggestion(item)}
 className={cn(
 'flex items-center gap-2 w-full text-left px-3 py-2 text-sm transition-colors',
 i === activeIndex ? 'bg-blue-50 ' : 'hover:bg-gray-50 '
 )}
 >
 {item.type === 'user' && item.profile_pic && (
 <img src={item.profile_pic} className="w-6 h-6 rounded-full object-cover" alt="" />
 )}
 <span className="font-semibold text-gray-900 ">
 {item.type === 'user' ? `@${item.username}` : item.query}
 </span>
 {item.fullname && <span className="text-xs text-gray-400 truncate">{item.fullname}</span>}
 </button>
 ))}
 </div>
 )}
 {(text.trim() || stickerUrl) && (
 <button onClick={submitComment} className="text-blue-600 font-bold text-xs flex-shrink-0">Post</button>
 )}
 </div>
 </div>
 {stickerUrl && (
 <div className="flex items-center gap-2 mt-1.5 pl-10">
 <img src={stickerUrl} alt="" className="w-12 h-12 rounded-lg bg-white object-contain p-0.5 border border-gray-200" />
 <button onClick={() => setStickerUrl(null)} className="text-gray-400 hover:text-gray-600" title="Remove sticker">
 <svg viewBox="0 0 24 24" className="w-4 h-4 fill-none stroke-current" strokeWidth="2"><circle cx="12" cy="12" r="9" /><path d="m15 9-6 6M9 9l6 6" strokeLinecap="round" /></svg>
 </button>
 </div>
 )}
 {showStickerPicker && (
 <StickerPicker
 onSelect={(url) => { setStickerUrl(url); setShowStickerPicker(false); inputRef.current?.focus(); }}
 onClose={() => setShowStickerPicker(false)}
 />
 )}
 </div>
 );
}

function computeReactionData(reactions, currentUser) {
 let counts = {};
 let userReaction = null;
 if (Array.isArray(reactions)) {
 reactions.forEach(r => {
 if (r?.reaction) {
 counts[r.reaction] = (counts[r.reaction] || 0) + 1;
 if (r.username === currentUser) userReaction = r.reaction;
 }
 });
 return { counts, userReaction };
 }
 return { counts: {}, userReaction: null };
}

export default function PostContent() {
 const [post, setPost] = useState(null);
 const [loading, setLoading] = useState(true);
 const [error, setError] = useState('');
 const [group, setGroup] = useState(null);
 const [accessDenied, setAccessDenied] = useState(false);
 const [reactionsOpenFor, setReactionsOpenFor] = useState(null);
 const [reactionsCache, setReactionsCache] = useState({});
 const [followingUsernames, setFollowingUsernames] = useState([]);
 const [postRead, setPostRead] = useState(false);
 const commentsRef = useRef(null);

 // Activity "Reply" deep link: /post/<id>?reply=<commentId>&replyUser=<name>
 // Read once on mount (lazy state init) so no setState-in-effect is needed.
 const [autoReplyId] = useState(() => {
  try {
   const qs = window.location.search ||
    (window.location.hash && window.location.hash.includes('?') ? '?' + window.location.hash.split('?')[1] : '');
   return new URLSearchParams(qs).get('reply') || '';
  } catch { return ''; }
 });

 useEffect(() => {
  if (!autoReplyId || loading || !post) return;
  const t = setTimeout(() => {
   try { commentsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }); } catch { /* noop */ }
  }, 400);
  return () => clearTimeout(t);
 }, [autoReplyId, loading, post]);

 useEffect(() => {
  const cu = localStorage.currentUser;
  if (!cu) return;
  apiFetch(`/get-user-following?username=${encodeURIComponent(cu)}`).then(r => r.ok ? r.json() : []).then(d => setFollowingUsernames(Array.isArray(d) ? d : [])).catch(() => {});
 }, []);

 useEffect(() => {
  if (!commentsRef.current) return;
  const observer = new IntersectionObserver(([entry]) => {
  if (entry.isIntersecting) { setPostRead(true); observer.disconnect(); }
  }, { threshold: 0.1 });
  observer.observe(commentsRef.current);
  return () => observer.disconnect();
 }, [loading]);

 const postId = window.location.pathname.split('/post/')[1] || '';

 async function fetchReactions(id) {
 try {
 let res = await apiFetch(`/get-post-reactions?postId=${encodeURIComponent(id)}`);
 if (!res.ok) return;
 let data = await res.json();
 let result = data.reactions ? computeReactionData(data.reactions, localStorage.currentUser) : { counts: data.counts || {}, userReaction: data.userReaction || null };
 setReactionsCache(c => ({ ...c, [String(id)]: result }));
 } catch { }
 }

 useEffect(() => {
 let active = true;
 async function loadPost() {
 if (!postId) return;
 setLoading(true);
 setError('');
 setGroup(null);
 setAccessDenied(false);

 try {
 let res = await apiFetch(`/get-post?id=${encodeURIComponent(postId)}`);
 if (!res.ok) {
 throw new Error('Post not found');
 }
 let data = await res.json();
 if (!active) return;

  setPost(data);

  // Track view via socket
  if (window.socket && localStorage.currentUser) {
    window.socket.emit('post_view', { postId: data.id, username: localStorage.currentUser });
  }

  if (Array.isArray(data.reactions)) {
 setReactionsCache(c => ({
 ...c,
 [String(data.id)]: computeReactionData(data.reactions, localStorage.currentUser)
 }));
 } else {
 fetchReactions(data.id);
 }

 if (data.type?.startsWith('group-post-')) {
 let groupId = data.type.replace('group-post-', '');
 try {
 let groupRes = await apiFetch(`/groups/${groupId}/light?username=${localStorage.currentUser}`);
 if (groupRes.status === 403) {
 setAccessDenied(true);
 return;
 }
 if (!groupRes.ok) {
 throw new Error('Failed to fetch group');
 }
 if (active) {
 setGroup(await groupRes.json());
 }
 } catch (e) {
 if (e.message === 'Access denied') {
 setAccessDenied(true);
 } else {
 console.error('Group fetch failed:', e);
 }
 }
 }
 } catch (err) {
 if (active) {
 setError(err.message);
 }
 } finally {
 if (active) {
 setLoading(false);
 }
 }
 }

 loadPost();

 function commentExistsInTree(comments, id) {
 return comments.some(c => String(c.id) === String(id) || (c.replies && commentExistsInTree(c.replies, id)));
 }
 const onComment = t => {
 if (t?.postId === postId) {
 setPost(prev => {
 if (!prev || commentExistsInTree(prev.comments, t.id)) return prev;
 return { ...prev, comments: [t, ...prev.comments] };
 });
 }
 };
 window.socket?.on('new-comment', onComment);
 return () => {
 active = false;
 window.socket?.off('new-comment', onComment);
 };
 }, [postId]);

 // Handlers
 const toggleLike = (id) => {
 if (!localStorage.currentUser) { window.showAuthPrompt?.('Log in to like posts'); return; }
 let username = localStorage.currentUser;
  let prevSnapshot = null;
  setPost(prev => {
  if (!prev || prev.id !== id) return prev;
  let liked = prev.likes.includes(username);
  prevSnapshot = prev.likes;
  return {
  ...prev,
  likes: liked ? prev.likes.filter(u => u !== username) : [...prev.likes, username]
  };
  });
  const url = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') ? 'http://localhost:5000/like-post' : 'https://textmob-provider-api-99ii.onrender.com/like-post';
  fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ postId: id, username }), keepalive: true }).catch(() => {});
 };

 const handleComment = async (id, text) => {
 if (!localStorage.currentUser) { window.showAuthPrompt?.('Log in to comment'); return; }
 let trimmed = text.trim();
 if (!trimmed || !post) return;
 setPost(prev => ({
 ...prev,
 comments: [...prev.comments, { username: localStorage.currentUser, text: trimmed }]
 }));
 try {
 await apiFetch('/add-comment', {
 method: 'POST',
 headers: { 'Content-Type': 'application/json' },
 body: JSON.stringify({ postId: id, username: localStorage.currentUser, comment: trimmed })
 });
 } catch { }
 };

 function addReplyToCommentTree(comments, parentId, reply) {
 return comments.map(c => {
 if (String(c.id) === String(parentId)) {
 return { ...c, replies: [...(c.replies || []), reply] };
 }
 if (c.replies && c.replies.length > 0) {
 return { ...c, replies: addReplyToCommentTree(c.replies, parentId, reply) };
 }
 return c;
 });
 }

 const handleReply = async (parentId, text) => {
 if (!localStorage.currentUser || !post) return;
 const newReply = { id: Date.now().toString(36) + Math.random().toString(36).slice(2, 8), username: localStorage.currentUser, text, timestamp: new Date().toISOString(), parentId };
 setPost(prev => ({
 ...prev,
 comments: addReplyToCommentTree(prev.comments, parentId, newReply)
 }));
 try {
 await apiFetch('/add-comment', {
 method: 'POST',
 headers: { 'Content-Type': 'application/json' },
 body: JSON.stringify({ postId: post.id, username: localStorage.currentUser, comment: text, parentId })
 });
 } catch {}
 };

 const handleDeleteComment = async (commentId) => {
 if (!localStorage.currentUser || !post) return;
 if (!confirm('Delete this comment?')) return;
 try {
 await apiFetch('/delete-comment', {
 method: 'POST',
 headers: { 'Content-Type': 'application/json' },
 body: JSON.stringify({ postId: post.id, commentId, username: localStorage.currentUser })
 });
 setPost(prev => ({
 ...prev,
 comments: prev.comments.map(c => {
 if (c.id === commentId) {
 if (c.replies && c.replies.length > 0) return { ...c, text: '[deleted]', deleted: true };
 return null;
 }
 if (c.replies) return { ...c, replies: c.replies.filter(r => r.id !== commentId) };
 return c;
 }).filter(Boolean)
 }));
 } catch {}
 };

 const handlePollVote = async (id, optionId) => {
 if (!localStorage.currentUser) { window.showAuthPrompt?.('Log in to vote'); return; }
 if (!post || post.type !== 'poll') return;
 let currentUser = localStorage.currentUser;
 let prevVote = post.options.find(o => o.votes.includes(currentUser))?.id;
 setPost(prev => ({
 ...prev,
 options: prev.options.map(o => {
 let votes = o.votes.filter(v => v !== currentUser);
 if (o.id === optionId && prevVote !== optionId) votes.push(currentUser);
 return { ...o, votes };
 })
 }));
 try {
 await apiFetch('/vote-poll-option', {
 method: 'POST',
 headers: { 'Content-Type': 'application/json' },
 body: JSON.stringify({ postId: id, optionId, username: currentUser })
 });
 } catch (e) { console.error('Poll vote failed', e); }
 };

 const handleReact = (id, reaction, etext) => {
 if (!localStorage.currentUser) { window.showAuthPrompt?.('Log in to react'); return; }
 let currentUser = localStorage.currentUser;
 setPost(prev => {
 if (!prev || prev.id !== id) return prev;
 let filtered = (prev.reactions || []).filter(r => r.username !== currentUser);
 let existing = (prev.reactions || []).find(r => r.username === currentUser);
 if (existing?.reaction === reaction) {
 return { ...prev, reactions: filtered };
 }
 return { ...prev, reactions: [...filtered, { username: currentUser, type: 'emoji', reaction, etext }] };
 });

 setReactionsCache(c => {
 let updated = { ...c };
 let filtered = (post.reactions || []).filter(r => r.username !== currentUser);
 let existing = (post.reactions || []).find(r => r.username === currentUser);
 if (existing?.reaction !== reaction) {
 filtered.push({ username: currentUser, reaction, etext });
 }
 updated[String(id)] = computeReactionData(filtered, currentUser);
 return updated;
 });

 apiFetch('/react-post', {
 method: 'POST',
 headers: { 'Content-Type': 'application/json' },
 body: JSON.stringify({ postId: id, username: currentUser, reaction, etext })
 });
 };

 if (loading) {
 return (
 <div className="flex justify-center items-center p-12">
 <svg className="animate-spin w-8 h-8 text-blue-600" viewBox="0 0 24 24" fill="none">
 <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
 <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
 </svg>
 </div>
 );
 }

 if (error) {
 return <div className="p-6 text-center text-sm text-red-500">{error}</div>;
 }

 if (accessDenied) {
 return <div className="p-6 text-center text-sm text-yellow-600">Access denied to this group post.</div>;
 }

 if (!post) {
 return <div className="p-6 text-center text-sm text-gray-400">No post to display.</div>;
 }

 return (
 <div className="min-h-screen bg-white">
 {/* Desktop sticky page bar (mobile web uses MobilePageLayout's fixed header) */}
 <div className="hidden md:flex sticky top-0 z-30 h-12 items-center gap-6 px-4 bg-white/95 backdrop-blur-md border-b border-gray-100 ">
 <button onClick={() => window.history.back()} className="tm-ripple -ml-2 p-2 rounded-full text-gray-700 hover:bg-gray-100 " aria-label="Back">
 <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2">
 <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
 </svg>
 </button>
 <h1 className="text-xl font-bold text-gray-900">Post</h1>
 </div>
 <PostCard
 post={post}
 groupProfiles={group ? { [group.id]: group } : {}}
 liveCounts={{}}
 reactionCountsCache={reactionsCache}
 reactionsOpenFor={reactionsOpenFor}
 setReactionsOpenFor={setReactionsOpenFor}
 handlePollVote={handlePollVote}
 handleComment={handleComment}
 handleLike={toggleLike}
 handleReact={handleReact}
 showCommentInput={false}
 showViewButton={false}
 stickyHeader
 />
 {localStorage.currentUser ? (
 <div className="px-4 py-3 border-b border-gray-100 ">
 <CommentInput onSubmit={text => handleComment(post.id, text)} />
 </div>
 ) : (
 <div className="px-4 py-3 border-b border-gray-100 ">
 <button onClick={() => window.showAuthPrompt?.('Log in to comment')} className="tm-ripple w-full text-left text-sm text-gray-400 bg-gray-50 rounded-full px-4 py-2 cursor-pointer">
 Log in to comment
 </button>
 </div>
 )}
 {post.comments && post.comments.length > 0 && (
  <div ref={commentsRef} className="px-4 pb-6">
  <p className="text-[13px] font-bold text-gray-500 py-2 border-b border-gray-100 ">Comments</p>
  <div className="space-y-1">
  {[...post.comments].reverse().map((c, i) => (
   <CommentItem key={c.id || i} cmt={c} postId={post.id} postOwner={post.username} onReply={handleReply} onDelete={handleDeleteComment} followingUsernames={followingUsernames} postRead={postRead} autoReply={autoReplyId} />
  ))}
  </div>
  </div>
 )}
 </div>
 );
}
