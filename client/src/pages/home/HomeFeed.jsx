import { useState, useEffect, useRef, useCallback, Fragment } from 'react';
import { apiFetch } from '../../config/api';
import { cn } from '../../utils/classNames';
import useScrollDirection from '../../utils/useScrollDirection';
import useProfileCache from '../../utils/useProfileCache';
import PostCard, { PostSkeleton } from '../../components/ui/PostCard';
import { CATEGORIES } from '../../data/categories';

const allCategories = CATEGORIES.map(c => c.id);

/* ─── seen-posts tracking (rr/ir/ar/or) ─── */
const SEEN_KEY = '__tmob_viewed_ids';
function getSeenIds() {
  try { let e = localStorage.getItem(SEEN_KEY); return new Set(e ? JSON.parse(e) : []); } catch { return new Set(); }
}
function markSeen(ids) {
  try { let s = getSeenIds(); ids.forEach(id => s.add(String(id))); let arr = Array.from(s); localStorage.setItem(SEEN_KEY, JSON.stringify(arr.slice(-1000))); } catch {}
}
function getSeenParam() {
  try { return Array.from(getSeenIds()).join(','); } catch { return ''; }
}

/* ─── sr – group post filter ─── */
function isGroupPost(p) {
  if (!p || !p.type) return false;
  return p.type.toLowerCase().startsWith('group');
}

/* ─── $n – suggestion card ─── */
function SuggestionCard({ sug }) {
  const currentUser = localStorage.currentUser;
  const DEFAULT_PIC = 'https://res.cloudinary.com/dzvm9xe1i/image/upload/v1746095979/profile-pictures/e2st5nispbicnhnir9cf.jpg';
  const navigate = path => window.Lexum ? window.Lexum.navigate(path) : (window.location.hash = path);

  return (
    <div className="flex items-center gap-2 p-3 rounded-xl bg-gray-50 dark:bg-gray-800/50 hover:bg-gray-100 dark:hover:bg-gray-800 active:scale-[0.98] transition-colors cursor-pointer flex-1 min-w-0" onClick={() => navigate(`/@${sug.username}`)}>
      <img src={sug.profile_pic || DEFAULT_PIC} alt={sug.username} className="w-10 h-10 rounded-full object-cover flex-shrink-0" loading="lazy" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold text-gray-900 dark:text-gray-100 truncate leading-snug">{sug.fullname}</p>
        <p className="text-xs text-gray-400 dark:text-gray-500 truncate">@{sug.username}</p>
        {sug.mutuals > 0 && <p className="text-[11px] text-gray-400 dark:text-gray-500">{sug.mutuals} mutual{sug.mutuals > 1 ? 's' : ''}</p>}
      </div>
    </div>
  );
}

/* ─── _Component24 – suggestion slot between posts ─── */
function SuggestionSlot({ suggestions, slotIndex }) {
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setVisible(true); obs.disconnect(); } }, { threshold: 0.1 });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  function getPair() {
    if (!suggestions?.length) return [];
    let offset = (slotIndex * 2) % suggestions.length;
    if (suggestions.length === 1) return [suggestions[0]];
    if (offset + 2 <= suggestions.length) return suggestions.slice(offset, offset + 2);
    return [...suggestions.slice(offset), ...suggestions.slice(0, offset + 2 - suggestions.length)];
  }

  const pair = getPair();

  return (
    <div ref={ref} className="px-4 py-4 border-b border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900">
      <p className="text-[11px] font-bold uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-3">People you may know</p>
      {visible ? (
        <div className="flex flex-col sm:flex-row gap-2">
          {pair.map(s => <SuggestionCard sug={s} key={s.username} />)}
        </div>
      ) : (
        <div className="flex gap-2">
          {[0, 1].map(i => <div className="flex-1 h-16 bg-gray-100 dark:bg-gray-800 rounded-xl animate-pulse" key={i} />)}
        </div>
      )}
    </div>
  );
}

/* ─── reaction helpers ─── */
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

/* ─── _Component28 – HomeFeed ─── */
export default function HomeFeed({ propPosts }) {
  const [user] = useState({ username: localStorage.currentUser });
  const [activeTab, setActiveTab] = useState((window.__feedState?.activeTab === 'following' && !localStorage.currentUser) ? 'foryou' : (window.__feedState?.activeTab || 'foryou'));
  const [newPosts, setNewPosts] = useState([]);
  const [posts, setPosts] = useState(() => window.__feedState?.[activeTab]?.posts || []);
  const [page, setPage] = useState(() => window.__feedState?.[activeTab]?.page || 1);
  const [hasMore, setHasMore] = useState(() => window.__feedState?.[activeTab]?.hasMore ?? true);
  const [loading, setLoading] = useState(posts.length === 0);
  const [error, setError] = useState('');
  const [groupProfiles, setGroupProfiles] = useState({});
  const [liveCounts, setLiveCounts] = useState({});
  const [suggestions, setSuggestions] = useState([]);
  const [sugFetched, setSugFetched] = useState(false);
  const [reactionsOpenFor, setReactionsOpenFor] = useState(null);
  const [reactionCountsCache, setReactionCountsCache] = useState({});

  const hasMoreRef = useRef(hasMore);
  const loadingRef = useRef(loading);
  useEffect(() => { hasMoreRef.current = hasMore; }, [hasMore]);
  useEffect(() => { loadingRef.current = loading; }, [loading]);

  // Infinite scroll sentinel
  const sentinelObserver = useRef(null);
  const sentinelRef = useCallback(node => {
    sentinelObserver.current?.disconnect();
    if (node) {
      sentinelObserver.current = new IntersectionObserver(entries => {
        if (entries[0].isIntersecting && hasMoreRef.current && !loadingRef.current) {
          setPage(p => p + 1);
        }
      }, { rootMargin: '0px 0px 500px 0px', threshold: 0 });
      sentinelObserver.current.observe(node);
    }
  }, []);

  // Post visibility tracking
  const visibilityObserver = useRef(null);
  useEffect(() => {
    visibilityObserver.current = new IntersectionObserver(entries => {
      let ids = [];
      entries.forEach(e => {
        if (e.isIntersecting && e.intersectionRatio >= 0.5) {
          let id = e.target.dataset.postId;
          if (id) { ids.push(id); visibilityObserver.current?.unobserve(e.target); }
        }
      });
      if (ids.length) markSeen(ids);
    }, { threshold: 0.5 });
    return () => visibilityObserver.current?.disconnect();
  }, []);

  const trackPostRef = useCallback(node => {
    if (node && visibilityObserver.current) visibilityObserver.current.observe(node);
  }, []);

  // Tab switching
  function switchTab(tab) {
    if (!isLoggedIn && tab === 'following') return;
    if (activeTab === tab) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    window.__feedState[activeTab] = { posts, page, hasMore, scrollY: window.scrollY };
    setActiveTab(tab);
    window.__feedState.activeTab = tab;
    setNewPosts([]);
    let cached = window.__feedState[tab];
    setPosts(cached.posts);
    setPage(cached.page);
    setHasMore(cached.hasMore);
    if (cached.posts.length === 0) setLoading(true);
  }

  const { scrollDirection, isAtTop } = useScrollDirection();
  const tabHidden = scrollDirection === 'down' && !isAtTop;

  const isLoggedIn = !!user.username;

  // Feed settings state
  const [showFeedSettings, setShowFeedSettings] = useState(false);
  const [feedPrefs, setFeedPrefs] = useState({ contentTypeWeights: {}, categoryWeights: {}, mutedCreators: [], exploreThreshold: 0.3 });
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [onboardSelected, setOnboardSelected] = useState([]);

  // Load feed prefs from localStorage + server
  useEffect(() => {
    if (user.username) {
      const stored = localStorage.getItem('textmob_feed_preferences');
      if (stored) {
        try {
          const prefs = JSON.parse(stored);
          if (Array.isArray(prefs)) {
            const weights = {};
            allCategories.forEach(c => { weights[c] = prefs.includes(c) ? 3.0 : 1.0; });
            setFeedPrefs(prev => ({ ...prev, categoryWeights: weights }));
          }
        } catch {}
      }
      const userData = window.__memoryDb?.findUser?.(user.username);
      if (userData?.feed_prefs) setFeedPrefs(userData.feed_prefs);
    }
  }, [user.username, showFeedSettings]);

  async function saveFeedPrefs(updates) {
    const newPrefs = { ...feedPrefs, ...updates };
    setFeedPrefs(newPrefs);
    if (user.username) {
      await apiFetch('/feed-prefs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: user.username, feed_prefs: newPrefs })
      }).catch(() => {});
    }
  }

  // Onboarding effect
  useEffect(() => {
    if (isLoggedIn) {
      const onboarded = localStorage.getItem('textmob_feed_onboarded');
      if (!onboarded) {
        const timer = setTimeout(() => setShowOnboarding(true), 500);
        return () => clearTimeout(timer);
      }
    }
  }, [isLoggedIn]);

  // Tab bar component
  function TabBar({ isMobile }) {
    if (propPosts) return null;
    const tabs = isLoggedIn ? ['foryou', 'following'] : ['foryou'];
    return (
      <div className={cn(
        'z-[45] border-b border-gray-100 dark:border-gray-800 flex transition-all duration-300',
        isMobile
          ? `block md:hidden sticky bg-white dark:bg-gray-900 ${tabHidden ? 'top-0' : 'top-[56px]'}`
          : 'hidden md:flex sticky top-[52px] bg-white dark:bg-gray-900 md:rounded-t-2xl backdrop-blur-md'
      )}>
        {tabs.map(tab => (
          <button
            onClick={() => switchTab(tab)}
            className={cn('flex-1 py-3.5 text-sm font-bold text-center relative', activeTab === tab ? 'text-blue-600 dark:text-blue-400' : 'text-gray-400 dark:text-gray-500')}
            key={tab}
          >
            {tab === 'foryou' ? (isLoggedIn ? 'For you' : 'Trending') : 'Friends'}
            {activeTab === tab && <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-12 h-0.5 bg-blue-600 rounded-full block" />}
          </button>
        ))}
        {isLoggedIn && (
          <button onClick={() => setShowFeedSettings(true)} className="px-3 py-3.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition" title="Feed settings">
            <svg viewBox="0 0 24 24" className="w-4 h-4 fill-none stroke-current" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06A1.65 1.65 0 0019.32 9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z" />
            </svg>
          </button>
        )}
      </div>
    );
  }

  // Feed settings panel
  function FeedSettingsPanel() {
    if (!showFeedSettings) return null;
    const contentTypes = ['live', 'media', 'poll', 'text'];

    // Load from localStorage, fallback to feedPrefs
    const [selectedCats, setSelectedCats] = useState(() => {
      try {
        const stored = localStorage.getItem('textmob_feed_preferences');
        if (stored) return JSON.parse(stored);
      } catch {}
      return Object.entries(feedPrefs.categoryWeights || {})
        .filter(([, w]) => w > 1)
        .map(([k]) => k);
    });

    function toggleCat(catId) {
      setSelectedCats(prev => {
        const next = prev.includes(catId) ? prev.filter(c => c !== catId) : [...prev, catId];
        localStorage.setItem('textmob_feed_preferences', JSON.stringify(next));
        const weights = {};
        allCategories.forEach(c => { weights[c] = next.includes(c) ? 3.0 : 1.0; });
        saveFeedPrefs({ categoryWeights: weights });
        return next;
      });
    }

    return (
      <div className="fixed inset-0 z-50 flex items-start justify-center pt-12 bg-black/40 overflow-y-auto" onClick={() => setShowFeedSettings(false)}>
        <div className="bg-white dark:bg-gray-900 rounded-2xl p-5 w-96 max-w-[95vw] shadow-2xl max-h-[85vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
          <div className="flex items-center justify-between mb-4 sticky top-0 bg-white dark:bg-gray-900 pb-2">
            <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100">Feed Preferences</h3>
            <button onClick={() => setShowFeedSettings(false)} className="text-gray-400 hover:text-gray-600">
              <svg viewBox="0 0 24 24" className="w-5 h-5 fill-none stroke-current" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12" /></svg>
            </button>
          </div>
          <div className="space-y-4">
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400 font-semibold mb-3">Pick categories you want to see more of</p>
              <div className="flex flex-wrap gap-2">
                {CATEGORIES.map(cat => {
                  const isSelected = selectedCats.includes(cat.id);
                  return (
                    <button
                      key={cat.id}
                      onClick={() => toggleCat(cat.id)}
                      className={cn(
                        'px-3 py-1.5 rounded-full text-xs font-semibold transition-all border',
                        isSelected
                          ? 'text-white border-transparent'
                          : 'text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-700 hover:border-gray-400 dark:hover:border-gray-500'
                      )}
                      style={isSelected ? { backgroundColor: cat.color, borderColor: cat.color } : {}}
                    >
                      {cat.name}
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="border-t border-gray-100 dark:border-gray-800 pt-3">
              <p className="text-xs text-gray-500 dark:text-gray-400 font-semibold mb-2">Content type preference</p>
              <div className="flex flex-wrap gap-2">
                {contentTypes.map(t => (
                  <button
                    key={t}
                    onClick={() => {
                      const current = feedPrefs.contentTypeWeights[t] || 1;
                      const next = current >= 3.0 ? 1.0 : 3.0;
                      saveFeedPrefs({ contentTypeWeights: { ...feedPrefs.contentTypeWeights, [t]: next } });
                    }}
                    className={cn(
                      'px-3 py-1.5 rounded-full text-xs font-semibold border transition-all',
                      (feedPrefs.contentTypeWeights[t] || 1) > 1
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-700'
                    )}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Socket: new comments
  useEffect(() => {
    let handler = e => {
      if (e?.postId) {
        setPosts(prev => prev.map(p => p.id !== e.postId || p.comments.some(c => c.id === e.id) ? p : { ...p, comments: [...p.comments, e] }));
      }
    };
    window.socket?.on('new-comment', handler);
    return () => window.socket?.off('new-comment', handler);
  }, []);

  // Socket: live events
  useEffect(() => {
    const sock = window.socket;
    if (!sock) return;
    const onStart = ({ postId } = {}) => postId && setLiveCounts(c => ({ ...c, [String(postId)]: c[String(postId)] || 0 }));
    const onEnd = ({ postId } = {}) => {
      if (postId) {
        setLiveCounts(c => { let n = { ...c }; delete n[String(postId)]; return n; });
        setPosts(prev => prev.map(p => String(p.id) === String(postId) ? { ...p, type: 'live_ended' } : p));
      }
    };
    const onStats = ({ postId, count } = {}) => postId && setLiveCounts(c => ({ ...c, [String(postId)]: Number(count || 0) }));

    sock.on('liveStarted', onStart);
    sock.on('liveEnded', onEnd);
    sock.on('liveStatsUpdate', onStats);
    sock.on('viewerCountUpdate', onStats);

    posts.forEach(p => {
      if (p?.type === 'live') {
        sock.emit('getLiveUrl', String(p.id), res => {
          if (res?.ok) setLiveCounts(c => ({ ...c, [String(p.id)]: Number(res.count || 0) }));
        });
      }
    });

    return () => { sock.off('liveStarted', onStart); sock.off('liveEnded', onEnd); sock.off('liveStatsUpdate', onStats); sock.off('viewerCountUpdate', onStats); };
  }, [posts]);

  // Socket: new posts
  useEffect(() => {
    if (!window.socket || !isLoggedIn) return;
    let handler = p => {
      if (p.username !== user.username && !isGroupPost(p)) {
        setNewPosts(prev => [p, ...prev]);
      }
    };
    window.socket.on('new-post', handler);
    return () => window.socket.off('new-post', handler);
  }, [user.username]);

  // Flush new posts
  function flushNewPosts() {
    if (newPosts.length) {
      setPosts(prev => {
        let ids = new Set(prev.map(p => p.id));
        let merged = [...newPosts.filter(p => !isGroupPost(p) && !ids.has(p.id)), ...prev];
        window.__feedState[activeTab].posts = merged;
        return merged;
      });
      setNewPosts([]);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  // Fetch reactions for posts
  async function fetchReactions(postId) {
    try {
      let res = await apiFetch(`/get-post-reactions?postId=${encodeURIComponent(postId)}`);
      if (!res.ok) return;
      let data = await res.json();
      let result = data.reactions ? computeReactionData(data.reactions, localStorage.currentUser) : { counts: data.counts || {}, userReaction: data.userReaction || null };
      setReactionCountsCache(c => ({ ...c, [String(postId)]: result }));
    } catch {}
  }

  // Process reactions from post data
  useEffect(() => {
    posts.forEach(p => {
      if (p) {
        if (Array.isArray(p.reactions)) {
          let data = computeReactionData(p.reactions, localStorage.currentUser);
          setReactionCountsCache(c => ({ ...c, [String(p.id)]: data }));
        } else if (!reactionCountsCache[String(p.id)]) {
          fetchReactions(p.id);
        }
      }
    });
  }, [posts]);

  // Poll vote handler
  async function handlePollVote(postId, optionId) {
    if (!localStorage.currentUser) { window.showAuthPrompt?.('Log in to vote in polls'); return; }
    let post = posts.find(p => p.id === postId);
    if (!post || post.type !== 'poll') return;
    let currentUser = localStorage.currentUser;
    let prevVote = post.options.find(o => o.votes.includes(currentUser))?.id;

    setPosts(prev => prev.map(p => p.id === postId ? {
      ...p,
      options: p.options.map(o => {
        let votes = o.votes.filter(v => v !== currentUser);
        if (o.id === optionId && prevVote !== optionId) votes.push(currentUser);
        return { ...o, votes };
      })
    } : p));

    try {
      await apiFetch('/vote-poll-option', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ postId, optionId, username: currentUser })
      });
    } catch (e) { console.error('Poll vote failed', e); }
  }

  // Negative signal handler
  function handleNegativeSignal(postId, signalType, contentType) {
    if (!user.username) return;
    const username = user.username;
    // Immediately remove from visible feed
    setPosts(prev => prev.filter(p => String(p.id) !== String(postId)));
    // Fire and forget to server
    apiFetch('/negative-signal', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, postId, signalType, contentType })
    }).catch(() => {});
  }

  // Like handler
  function handleLike(postId) {
    if (!user.username) { window.showAuthPrompt?.('Log in to like posts'); return; }
    let username = user.username;
    let updater = prev => prev.map(p => {
      if (p.id !== postId) return p;
      let liked = p.likes.includes(username);
      return { ...p, likes: liked ? p.likes.filter(u => u !== username) : [...p.likes, username] };
    });
    setPosts(updater);
    apiFetch('/like-post', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ postId, username })
    }).catch(() => setPosts(updater));
  }

  // Comment handler
  async function handleComment(postId, text) {
    if (!user.username) { window.showAuthPrompt?.('Log in to comment'); return; }
    let trimmed = text.trim();
    if (trimmed) {
      setPosts(prev => prev.map(p => p.id === postId ? { ...p, comments: [...p.comments, { username: user.username, text: trimmed }] } : p));
      try {
        await apiFetch('/add-comment', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ postId, username: user.username, comment: trimmed })
        });
      } catch {}
    }
  }

  // React handler
  function handleReact(postId, reaction, etext) {
    if (!localStorage.currentUser) { window.showAuthPrompt?.('Log in to react'); return; }
    let currentUser = localStorage.currentUser;
    setPosts(prev => prev.map(p => {
      if (!p || p.id !== postId) return p;
      let filtered = (p.reactions || []).filter(r => r.username !== currentUser);
      let existing = (p.reactions || []).find(r => r.username === currentUser);
      if (existing?.reaction === reaction) {
        return { ...p, reactions: filtered };
      }
      return { ...p, reactions: [...filtered, { username: currentUser, type: 'emoji', reaction, etext }] };
    }));

    setReactionCountsCache(c => {
      let updated = { ...c };
      let post = posts.find(p => p?.id === postId);
      let filtered = (post?.reactions || []).filter(r => r.username !== currentUser);
      let existing = (post?.reactions || []).find(r => r.username === currentUser);
      if (existing?.reaction !== reaction) {
        filtered.push({ username: currentUser, reaction, etext });
      }
      updated[String(postId)] = computeReactionData(filtered, currentUser);
      return updated;
    });

    apiFetch('/react-post', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ postId, username: currentUser, reaction, etext })
    }).then(res => res.ok ? res.json().then(data => {
      if (data?.reactions) {
        setReactionCountsCache(c => ({ ...c, [String(postId)]: computeReactionData(data.reactions, currentUser) }));
      }
    }) : fetchReactions(postId)).catch(() => setTimeout(() => fetchReactions(postId), 1500));
  }

  // Save state on unmount
  useEffect(() => () => {
    window.__feedState[activeTab] = { posts, page, hasMore, scrollY: window.scrollY };
  }, [activeTab, posts, page, hasMore]);

  // Restore scroll position
  useEffect(() => {
    if (posts.length > 0 && window.__feedState[activeTab].scrollY > 0) {
      let y = window.__feedState[activeTab].scrollY;
      let t = setTimeout(() => window.scrollTo({ top: y, behavior: 'instant' }), 100);
      return () => clearTimeout(t);
    }
  }, [posts.length > 0]);

  // Fetch posts
  useEffect(() => {
    if (propPosts) {
      setPosts(propPosts.filter(p => !isGroupPost(p)));
      setPage(1);
      setHasMore(false);
      setLoading(false);
      setError('');
      return;
    }
    if (posts.length > 0 && page === window.__feedState[activeTab].page && !loading) return;

    async function load(pg) {
      setLoading(true);
      setError('');
      try {
        let seen = getSeenParam();
        let res = await apiFetch('/get-posts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            username: user.username || undefined,
            tab: activeTab,
            page: pg,
            limit: 10,
            seenIds: seen || undefined,
          }),
        });
        if (!res.ok) throw Error('Failed to load posts');
        let data = await res.json();
        let filtered = Array.isArray(data) ? data.filter(p => p && !isGroupPost(p)) : [];
        setPosts(prev => {
          let merged = pg === 1 ? filtered : [...prev, ...filtered];
          let seen = new Set();
          merged = merged.filter(p => { if (seen.has(p.id)) return false; seen.add(p.id); return true; });
          window.__feedState[activeTab].posts = merged;
          return merged;
        });
        let more = filtered.length >= 10;
        setHasMore(more);
        window.__feedState[activeTab].hasMore = more;
        window.__feedState[activeTab].page = pg;
      } catch (e) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    }
    load(page);
  }, [propPosts, user.username, page, activeTab]);

  // Fetch group profiles
  useEffect(() => {
    if (!posts?.length) return;
    let groupIds = [...new Set(posts.filter(p => p?.type?.startsWith('group-post-')).map(p => p.type.replace('group-post-', '')))];
    if (groupIds.length) {
      Promise.allSettled(groupIds.map(id =>
        apiFetch(`/groups/${id}/light?username=${localStorage.currentUser}`).then(r => {
          if (!r.ok) throw r.status === 403 ? Error('access-denied') : Error('fail');
          return r.json();
        })
      )).then(results => {
        let profiles = {};
        let denied = new Set();
        results.forEach((r, i) => {
          if (r.status === 'fulfilled') profiles[r.value.id] = r.value;
          else if (r.reason?.message === 'access-denied') denied.add(groupIds[i]);
        });
        if (denied.size) setPosts(prev => prev.filter(p => p?.type?.startsWith('group-post-') ? !denied.has(p.type.replace('group-post-', '')) : true));
        setGroupProfiles(profiles);
      });
    }
  }, [posts]);

  // Fetch suggestions
  useEffect(() => {
    if (sugFetched || propPosts || posts.length < 5 || !isLoggedIn) return;
    let username = localStorage.currentUser;
    let active = true;
    setSugFetched(true);
    apiFetch(`/get-suggestions-feed?username=${encodeURIComponent(username)}`)
      .then(r => r.json())
      .then(data => { if (active) setSuggestions(Array.isArray(data) ? data : []); })
      .catch(() => active && setSuggestions([]));
    return () => { active = false; };
  }, [posts.length, sugFetched, propPosts]);

  // Pull-to-refresh state
  const [pullStart, setPullStart] = useState(0);
  const [pullDelta, setPullDelta] = useState(0);

  function onTouchStart(e) { if (window.scrollY === 0) setPullStart(e.touches[0].clientY); }
  function onTouchMove(e) {
    if (pullStart && window.scrollY <= 0) {
      let delta = e.touches[0].clientY - pullStart;
      if (delta > 0) { if (e.cancelable) e.preventDefault(); setPullDelta(Math.min(delta * 0.4, 80)); }
      else setPullDelta(0);
    }
  }
  function onTouchEnd() {
    if (pullDelta > 60) {
      setLoading(true);
      setPullDelta(40);
      let seen = getSeenParam();
      apiFetch('/get-posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: user.username || undefined,
          tab: activeTab,
          page: 1,
          limit: 10,
          seenIds: seen || undefined,
        }),
      }).then(r => r.json()).then(data => {
          let filtered = (Array.isArray(data) ? data : []).filter(p => !isGroupPost(p));
          setPosts(filtered);
          setPage(1);
          setHasMore(filtered.length >= 10);
          window.__feedState[activeTab] = { posts: filtered, page: 1, hasMore: filtered.length >= 10, scrollY: 0 };
        })
        .finally(() => { setLoading(false); setPullDelta(0); setNewPosts([]); });
    } else {
      setPullDelta(0);
    }
    setPullStart(0);
  }

  // Error state
  if (error) {
    return (
      <div className="p-6 text-center">
        <p className="text-sm text-red-500 mb-2">{error}</p>
        <button 
          onClick={() => { 
            window.__feedState[activeTab] = { posts: [], page: 1, hasMore: true, scrollY: 0 };
            setError(''); 
            setPage(1); 
            setPosts([]);
            setLoading(true);
          }} 
          className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline"
        >
          Try again
        </button>
      </div>
    );
  }

  // Initial loading
  if (loading && page === 1) {
    return (
      <div className="flex flex-col w-full max-w-2xl mx-auto md:mt-4 bg-white dark:bg-gray-900 md:rounded-2xl md:border border-gray-100 dark:border-gray-800 overflow-visible pb-20">
        <TabBar isMobile={false} />
        {[0, 1, 2, 3].map(i => <PostSkeleton key={i} />)}
      </div>
    );
  }

  let visiblePosts = posts.filter(p => p?.type && !isGroupPost(p));
  let showEmptyState = visiblePosts.length === 0 && !hasMore;

  return (
    <div className="font-sans antialiased min-h-screen p-0 w-full" onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={onTouchEnd}>
      {/* Pull-to-refresh indicator */}
      <div className="flex justify-center items-center overflow-hidden w-full" style={{ height: `${pullDelta}px`, opacity: pullDelta / 80 }}>
        <div className={cn('w-8 h-8 rounded-full bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 flex items-center justify-center', loading && pullDelta > 0 ? 'animate-spin' : '')}>
          <svg className="w-4 h-4 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        </div>
      </div>

      {/* Mobile tab bar */}
      <TabBar isMobile={true} />

      <div className="flex flex-col w-full max-w-2xl mx-auto md:mt-4 bg-white dark:bg-gray-900 md:rounded-2xl md:border border-gray-100 dark:border-gray-800 overflow-visible pb-20">
        {/* Desktop tab bar */}
        <TabBar isMobile={false} />

        {/* New posts banner */}
        {newPosts.length > 0 && !propPosts && (
          <div className={cn('sticky z-40 flex justify-center mt-2 w-full pointer-events-none md:top-[60px]', tabHidden ? 'top-[48px]' : 'top-[104px]')}>
            <button onClick={flushNewPosts} className="pointer-events-auto bg-blue-600 text-white text-xs font-bold py-2 px-5 rounded-full hover:bg-blue-700 active:scale-95 transition-colors flex items-center gap-2">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 10l7-7m0 0l7 7m-7-7v18" />
              </svg>
              {newPosts.length} new post{newPosts.length > 1 ? 's' : ''}
            </button>
          </div>
        )}

        {/* Post list */}
        <div className="flex flex-col">
          {showEmptyState ? (
            <div className="py-16 text-center text-sm text-gray-400 dark:text-gray-600">Nothing to show yet.</div>
          ) : (
            visiblePosts.map((post, index) => {
              let showSuggestion = !propPosts && (index + 1) % 5 === 0 && suggestions.length > 0;
              return (
                <Fragment key={post.id || index}>
                  <div data-post-id={String(post.id)} ref={trackPostRef}>
                    <PostCard
                      post={post}
                      groupProfiles={groupProfiles}
                    liveCounts={liveCounts}
                    reactionCountsCache={reactionCountsCache}
                    reactionsOpenFor={reactionsOpenFor}
                    setReactionsOpenFor={setReactionsOpenFor}
                    handlePollVote={handlePollVote}
                    handleComment={handleComment}
                    handleLike={handleLike}
                    handleReact={handleReact}
                    showCommentInput={true}
                    showViewButton={true}
                    onNegativeSignal={handleNegativeSignal}
                  />
                </div>
                {showSuggestion && <SuggestionSlot suggestions={suggestions} slotIndex={Math.floor(index / 5)} />}
              </Fragment>
            );
          })
        )}

          {/* Infinite scroll sentinel */}
          {hasMore && <div ref={sentinelRef} style={{ height: 1 }} aria-hidden="true" />}

          {/* Loading more skeletons */}
          {loading && page > 1 && (
            <Fragment>
              <PostSkeleton />
              <PostSkeleton />
              <PostSkeleton />
            </Fragment>
          )}

          {/* End of feed */}
          {!hasMore && visiblePosts.length > 0 && (
            <div className="py-8 text-center text-[11px] uppercase tracking-widest text-gray-300 dark:text-gray-700">You're all caught up</div>
          )}
        </div>
      </div>
      <FeedSettingsPanel />
      {showOnboarding && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4">
          <div className="bg-white dark:bg-gray-900 rounded-3xl p-6 max-w-sm w-full shadow-2xl">
            <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-1">Personalize Your Feed</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-5">Select at least 3 categories you're interested in. We'll show you more of what you love.</p>
            <div className="flex flex-wrap gap-2 max-h-64 overflow-y-auto mb-5">
              {CATEGORIES.map(cat => {
                const isSel = onboardSelected.includes(cat.id);
                return (
                  <button
                    key={cat.id}
                    onClick={() => setOnboardSelected(prev => prev.includes(cat.id) ? prev.filter(c => c !== cat.id) : [...prev, cat.id])}
                    className={cn('px-3 py-2 rounded-full text-xs font-semibold transition-all border', isSel ? 'text-white border-transparent' : 'text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-700')}
                    style={isSel ? { backgroundColor: cat.color } : {}}
                  >
                    {cat.name}
                  </button>
                );
              })}
            </div>
            <div className="flex gap-3">
              <button onClick={() => { localStorage.setItem('textmob_feed_onboarded', 'true'); setShowOnboarding(false); }} className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-800">Skip</button>
              <button onClick={() => { if (onboardSelected.length < 3) { alert('Please select at least 3 categories'); return; } localStorage.setItem('textmob_feed_onboarded', 'true'); localStorage.setItem('textmob_feed_preferences', JSON.stringify(onboardSelected)); const weights = {}; allCategories.forEach(c => { weights[c] = onboardSelected.includes(c) ? 3.0 : 1.0; }); saveFeedPrefs({ categoryWeights: weights }); setShowOnboarding(false); }} className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white bg-blue-600">Continue</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
