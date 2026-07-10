import { useState, useEffect, useRef } from 'react';
import { apiFetch } from '../../config/api';
import { cn } from '../../utils/classNames';
import PostCard from '../../components/ui/PostCard';
import useProfileCache from '../../utils/useProfileCache';
import { VerifiedBadge } from '../../components/ui/VerifiedBadge';

function CommentItem({ cmt }) {
  const profile = useProfileCache(cmt.username);
  const ciGuest = !localStorage.currentUser;

  return (
    <div className="flex items-start gap-2">
      <img
        src={profile.profile_pic || 'https://res.cloudinary.com/dzvm9xe1i/image/upload/v1746095979/profile-pictures/e2st5nispbicnhnir9cf.jpg'}
        alt={profile.fullname}
        className="w-8 h-8 rounded-full object-cover flex-shrink-0 border border-gray-100 dark:border-gray-800"
        loading="lazy"
      />
      <div className="bg-gray-50 dark:bg-gray-800 px-3 py-2 rounded-2xl max-w-[85%] cursor-pointer" onClick={() => { if (ciGuest) { window.showAuthPrompt?.('Create an account to view profiles'); return; } window.Lexum?.navigate(`/@${cmt.username}`); }}>
        <div className="flex items-center gap-1">
          <p className="text-xs font-bold text-gray-900 dark:text-gray-100 leading-snug">{profile.fullname || cmt.username}</p>
          {(cmt.verified === true || profile.verified === true) && <VerifiedBadge className="w-3 h-3" />}
        </div>
        <p className="text-sm text-gray-700 dark:text-gray-300 leading-snug mt-0.5">{cmt.text}</p>
      </div>
    </div>
  );
}

function CommentInput({ onSubmit }) {
  const [text, setText] = useState('');
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
      onSubmit(trimmed);
      setText('');
      setSuggestions([]);
    }
  }

  return (
    <div className="flex items-center gap-2 relative">
      <img
        src={localStorage.cached_profile_pic || 'https://res.cloudinary.com/dzvm9xe1i/image/upload/v1746095979/profile-pictures/e2st5nispbicnhnir9cf.jpg'}
        className="w-8 h-8 rounded-full object-cover flex-shrink-0 border border-gray-100 dark:border-gray-800"
        alt=""
      />
      <div className="flex-1 flex items-center bg-gray-100 dark:bg-gray-800 rounded-full px-4 py-1.5 gap-2 focus-within:ring-2 focus-within:ring-blue-100 dark:focus-within:ring-blue-900 transition-all relative">
        <input
          ref={inputRef}
          type="text"
          value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder="Write a comment…"
          className="flex-1 bg-transparent text-sm outline-none placeholder-gray-400 dark:placeholder-gray-500 text-gray-800 dark:text-gray-200"
        />
        {suggestions.length > 0 && (
          <div className="absolute left-0 right-0 bottom-full mb-1 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg z-50 max-h-48 overflow-y-auto">
            {suggestions.map((item, i) => (
              <button
                key={item.username || item.query || i}
                onClick={() => selectSuggestion(item)}
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
        )}
        {text.trim() && (
          <button onClick={submitComment} className="text-blue-600 dark:text-blue-400 font-bold text-xs flex-shrink-0">Post</button>
        )}
      </div>
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

    const onComment = t => {
      if (t?.postId === postId) {
        setPost(prev => !prev || prev.comments.some(c => c.id === t.id) ? prev : {
          ...prev,
          comments: [...prev.comments, t]
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
    setPost(prev => {
      if (!prev || prev.id !== id) return prev;
      let liked = prev.likes.includes(username);
      return {
        ...prev,
        likes: liked ? prev.likes.filter(u => u !== username) : [...prev.likes, username]
      };
    });
    apiFetch('/like-post', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ postId: id, username })
    });
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
    <div className="bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800">
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
      />
      {localStorage.currentUser ? (
        <div className="px-4 py-3 border-t border-gray-100 dark:border-gray-800">
          <CommentInput onSubmit={text => handleComment(post.id, text)} />
        </div>
      ) : (
        <div className="px-4 py-3 border-t border-gray-100 dark:border-gray-800">
          <button onClick={() => window.showAuthPrompt?.('Log in to comment')} className="w-full text-left text-sm text-gray-400 bg-gray-50 dark:bg-gray-800 rounded-full px-4 py-2 cursor-pointer">
            Log in to comment
          </button>
        </div>
      )}
      {post.comments && post.comments.length > 0 && (
        <div className="px-4 pb-6 space-y-4">
          <p className="text-xs font-bold uppercase tracking-widest text-gray-400 dark:text-gray-500 pt-2">Comments</p>
          {[...post.comments].reverse().map((c, i) => (
            <CommentItem cmt={c} key={c.id || i} />
          ))}
        </div>
      )}
    </div>
  );
}
