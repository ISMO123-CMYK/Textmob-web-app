import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  ActivityIndicator, RefreshControl, Image, Modal,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import { useNavigation, useIsFocused } from '@react-navigation/native';
import { getFeedPostsAPI, likePostAPI, addCommentAPI, reactPostAPI, getPostReactionsAPI, votePollAPI, Post } from '../../api/posts';
import { getLivePostsAPI } from '../../api/live';
import PostCard, { PostSkeleton } from '../../components/PostCard';
import { API_BASE_URL } from '../../api/client';
import { storage, KEYS } from '../../utils/storage';
import { getSeenParam, markSeen } from '../../utils/seen';
import MobileHeader from '../../components/MobileHeader';

const DEFAULT_PIC = 'https://res.cloudinary.com/dzvm9xe1i/image/upload/v1746095979/profile-pictures/e2st5nispbicnhnir9cf.jpg';
const REACTIONS = [
  { r: '❤️', t: 'love' }, { r: '😂', t: 'funny' }, { r: '🔥', t: 'fire' },
  { r: '👍', t: 'like' }, { r: '😮', t: 'wow' }, { r: '😢', t: 'sad' },
  { r: '👏', t: 'clap' }, { r: '😡', t: 'angry' }, { r: '🥰', t: 'adore' },
  { r: '🙌', t: 'hype' }, { r: '💯', t: 'facts' }, { r: '🤔', t: 'hmm' },
  { r: '🤯', t: 'mindblown' }, { r: '😎', t: 'cool' }, { r: '🤩', t: 'amazed' },
  { r: '😴', t: 'boring' }, { r: '😇', t: 'wholesome' }, { r: '💔', t: 'hurt' },
  { r: '😅', t: 'awkward' }, { r: '🙏', t: 'respect' },
];

function isGroupPost(p: Post) { return p.type?.toLowerCase().startsWith('group'); }

function SuggestionCard({ sug, onNavigate }: { sug: any; onNavigate: (path: string) => void }) {
  const { colors, isDark } = useTheme();
  return (
    <TouchableOpacity style={[sugStyles.card, { backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : '#f9fafb' }]} onPress={() => onNavigate(`/@${sug.username}`)}>
      <Image source={{ uri: sug.profile_pic || DEFAULT_PIC }} style={sugStyles.avatar} />
      <View style={{ flex: 1 }}>
        <Text style={[sugStyles.name, { color: colors.textPrimary }]} numberOfLines={1}>{sug.fullname}</Text>
        <Text style={[sugStyles.user, { color: colors.textSecondary }]}>@{sug.username}</Text>
        {sug.mutuals > 0 && <Text style={[sugStyles.mutuals, { color: colors.textSecondary }]}>{sug.mutuals} mutual{sug.mutuals > 1 ? 's' : ''}</Text>}
      </View>
    </TouchableOpacity>
  );
}
const sugStyles = StyleSheet.create({
  card: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderRadius: 12, flex: 1 },
  avatar: { width: 40, height: 40, borderRadius: 20 },
  name: { fontSize: 13, fontWeight: '700' },
  user: { fontSize: 11 },
  mutuals: { fontSize: 10, marginTop: 1 },
});

function SuggestionSlot({ suggestions, slotIndex }: { suggestions: any[]; slotIndex: number }) {
  const { colors, isDark } = useTheme();
  const navigation = useNavigation<any>();

  function getPair() {
    if (!suggestions?.length) return [];
    const offset = (slotIndex * 2) % suggestions.length;
    if (suggestions.length === 1) return [suggestions[0]];
    if (offset + 2 <= suggestions.length) return suggestions.slice(offset, offset + 2);
    return [...suggestions.slice(offset), ...suggestions.slice(0, offset + 2 - suggestions.length)];
  }

  const pair = getPair();
  return (
    <View style={[sugSlotStyles.container, { borderBottomColor: colors.border }]}>
      <Text style={[sugSlotStyles.label, { color: colors.textSecondary }]}>People you may know</Text>
      <View style={{ flexDirection: 'row', gap: 8 }}>
        {pair.map(s => (
          <SuggestionCard key={s.username} sug={s} onNavigate={(path) => navigation.navigate('Profile', { username: path.replace('/@', '') })} />
        ))}
      </View>
    </View>
  );
}
const sugSlotStyles = StyleSheet.create({
  container: { paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: StyleSheet.hairlineWidth },
  label: { fontSize: 10, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 1.2, marginBottom: 10 },
});

function computeReactionData(reactions: any[], currentUser: string | null) {
  const counts: Record<string, number> = {};
  let userReaction: string | null = null;
  if (Array.isArray(reactions)) {
    reactions.forEach(r => {
      if (r?.reaction) {
        counts[r.reaction] = (counts[r.reaction] || 0) + 1;
        if (r.username === currentUser) userReaction = r.reaction;
      }
    });
  }
  return { counts, userReaction };
}

export default function HomeScreen() {
  const { colors, isDark } = useTheme();
  const { username } = useAuth();
  const navigation = useNavigation<any>();
  const { socket, on, off } = useSocket();

  const [feedTab, setFeedTab] = useState<'posts' | 'live'>('posts');
  const [liveStreams, setLiveStreams] = useState<Post[]>([]);
  const [liveLoading, setLiveLoading] = useState(false);
  const [tab, setTab] = useState<'foryou' | 'following'>('foryou');
  const [posts, setPosts] = useState<Post[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [newPosts, setNewPosts] = useState<Post[]>([]);
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [sugFetched, setSugFetched] = useState(false);
  const [reactionCountsCache, setReactionCountsCache] = useState<Record<string, { counts: Record<string, number>; userReaction: string | null }>>({});
  const [reactionsOpenFor, setReactionsOpenFor] = useState<string | number | null>(null);
  const [liveCounts, setLiveCounts] = useState<Record<string, number>>({});
  const [activeIndex, setActiveIndex] = useState(-1);
  const [pullDelta, setPullDelta] = useState(0);
  const pullStartY = useRef(0);
  const scrollY = useRef(0);
  const viewabilityConfigCallbackRef = useRef(({ changed, viewableItems }: any) => {
    if (viewableItems.length > 0) {
      setActiveIndex(viewableItems[0].index ?? -1);
    }
    const ids = changed.filter((c: any) => c.isViewable).map((c: any) => String(c.item?.id));
    if (ids.length) markSeen(ids);
  });
  const isFocused = useIsFocused();

  const hasMoreRef = useRef(hasMore);
  const loadingRef = useRef(loading);
  const tabRef = useRef(tab);
  const pageRef = useRef(page);
  const postsRef = useRef(posts);

  useEffect(() => { hasMoreRef.current = hasMore; }, [hasMore]);
  useEffect(() => { loadingRef.current = loading; }, [loading]);
  useEffect(() => { tabRef.current = tab; }, [tab]);
  useEffect(() => { pageRef.current = page; }, [page]);
  useEffect(() => { postsRef.current = posts; }, [posts]);

  // Save/restore feed state
  useEffect(() => {
    const key = `${KEYS.FEED_STATE}_${tab}`;
    storage.getStore(key).then(saved => {
      if (saved) {
        try {
          const state = JSON.parse(saved);
          if (state.posts?.length > 0) {
            setPosts(state.posts);
            setPage(state.page || 1);
            setHasMore(state.hasMore ?? true);
            setLoading(false);
            return;
          }
        } catch {}
      }
      fetchPosts(1, true);
    });
    return () => {
      if (postsRef.current.length > 0) {
        storage.setStore(key, JSON.stringify({
          posts: postsRef.current,
          page: pageRef.current,
          hasMore: hasMoreRef.current,
        }));
      }
    };
  }, [tab]);

  const fetchPosts = useCallback(async (pageNum: number, isRefresh = false) => {
    setLoading(true);
    setError('');
    try {
      const seen = getSeenParam();
      const res = await getFeedPostsAPI({
        username: username || undefined,
        tab,
        page: pageNum,
        limit: 10,
        seenIds: seen || undefined,
      });
      if (res.ok && res.data) {
        const filtered = (Array.isArray(res.data) ? res.data : []).filter(p => p && !isGroupPost(p));
        setPosts(prev => {
          const merged = pageNum === 1 ? filtered : [...prev, ...filtered];
          return merged;
        });
        setHasMore(filtered.length >= 10);
      } else {
        setError('Failed to load posts');
      }
    } catch (e: any) {
      setError(e.message || 'Network error');
    } finally {
      setLoading(false);
    }
  }, [tab, username]);

  // Socket: new comments
  useEffect(() => {
    const handler = (e: any) => {
      if (e?.postId) {
        setPosts(prev => prev.map(p => p.id !== e.postId || p.comments?.some(c => c.id === e.id) ? p : { ...p, comments: [...(p.comments || []), e] }));
      }
    };
    on('new-comment', handler);
    return () => off('new-comment', handler);
  }, [on, off]);

  // Socket: live events
  useEffect(() => {
    const onStart = ({ postId }: any = {}) => postId && setLiveCounts(c => ({ ...c, [String(postId)]: c[String(postId)] || 0 }));
    const onEnd = ({ postId }: any = {}) => {
      if (postId) {
        setLiveCounts(c => { const n = { ...c }; delete n[String(postId)]; return n; });
        setPosts(prev => prev.map(p => String(p.id) === String(postId) ? { ...p, type: 'live_ended' } : p));
      }
    };
    const onStats = ({ postId, count }: any = {}) => postId && setLiveCounts(c => ({ ...c, [String(postId)]: Number(count || 0) }));

    on('liveStarted', onStart);
    on('liveEnded', onEnd);
    on('liveStatsUpdate', onStats);
    on('viewerCountUpdate', onStats);

    return () => {
      off('liveStarted', onStart);
      off('liveEnded', onEnd);
      off('liveStatsUpdate', onStats);
      off('viewerCountUpdate', onStats);
    };
  }, [on, off]);

  // Socket: new posts
  useEffect(() => {
    if (!socket || !username) return;
    const handler = (p: Post) => {
      if (p.username !== username && !isGroupPost(p)) {
        setNewPosts(prev => [p, ...prev]);
      }
    };
    on('new-post', handler);
    return () => off('new-post', handler);
  }, [socket, username, on, off]);

  // Fetch reactions for posts
  async function fetchReactions(postId: string | number) {
    try {
      const res = await getPostReactionsAPI(String(postId));
      if (res.ok && res.data) {
        const data = res.data.reactions ? computeReactionData(res.data.reactions, username) : { counts: (res.data as any).counts || {}, userReaction: (res.data as any).userReaction || null };
        setReactionCountsCache(c => ({ ...c, [String(postId)]: data }));
      }
    } catch {}
  }

  // Process reactions from post data
  useEffect(() => {
    posts.forEach(p => {
      if (p) {
        if (Array.isArray(p.reactions)) {
          const data = computeReactionData(p.reactions, username);
          setReactionCountsCache(c => ({ ...c, [String(p.id)]: data }));
        } else if (!reactionCountsCache[String(p.id)]) {
          fetchReactions(p.id);
        }
      }
    });
  }, [posts]);

  // Poll vote
  async function handlePollVote(postId: string | number, optionId: string | number) {
    if (!username) return;
    setPosts(prev => prev.map(p => p.id === postId ? {
      ...p,
      options: p.options?.map(o => {
        const votes = o.votes.filter(v => v !== username);
        if (o.id === optionId) votes.push(username);
        return { ...o, votes };
      }),
    } : p));
    await votePollAPI(String(postId), optionId, username).catch(() => {});
  }

  // Like
  function handleLike(postId: string | number) {
    if (!username) return;
    setPosts(prev => prev.map(p => p.id === postId ? { ...p, likes: p.likes?.includes(username) ? p.likes.filter(u => u !== username) : [...(p.likes || []), username] } : p));
    likePostAPI(String(postId), username).catch(() => {});
  }

  // Comment
  async function handleComment(postId: string | number, text: string) {
    if (!username || !text.trim()) return;
    setPosts(prev => prev.map(p => p.id === postId ? { ...p, comments: [...(p.comments || []), { id: Date.now().toString(), username, text: text.trim(), created_at: new Date().toISOString() }] } : p));
    await addCommentAPI(String(postId), username, text.trim()).catch(() => {});
  }

  // React
  function handleReact(postId: string | number, reaction: string, etext: string) {
    if (!username) return;
    setPosts(prev => prev.map(p => {
      if (!p || p.id !== postId) return p;
      const filtered = (p.reactions || []).filter(r => r.username !== username);
      const existing = (p.reactions || []).find(r => r.username === username);
      if (existing?.reaction === reaction) return { ...p, reactions: filtered };
      return { ...p, reactions: [...filtered, { username, type: 'emoji', reaction, etext }] };
    }));
    setReactionCountsCache(c => {
      const updated = { ...c };
      const post = posts.find(p => p?.id === postId);
      const filtered = (post?.reactions || []).filter(r => r.username !== username);
      const existing = (post?.reactions || []).find(r => r.username === username);
      if (existing?.reaction !== reaction) filtered.push({ username, reaction, etext } as any);
      updated[String(postId)] = computeReactionData(filtered, username);
      return updated;
    });
    reactPostAPI(String(postId), username, reaction, etext).then(res => {
      if (res.ok && res.data?.reactions) {
        setReactionCountsCache(c => ({ ...c, [String(postId)]: computeReactionData(res.data.reactions, username) }));
      }
    }).catch(() => setTimeout(() => fetchReactions(postId), 1500));
  }

  // Flush new posts
  function flushNewPosts() {
    if (newPosts.length) {
      setPosts(prev => {
        const ids = new Set(prev.map(p => p.id));
        const merged = [...newPosts.filter(p => !isGroupPost(p) && !ids.has(p.id)), ...prev];
        return merged;
      });
      setNewPosts([]);
    }
  }

  // Tab switch
  function switchTab(newTab: 'foryou' | 'following') {
    if (!username && newTab === 'following') return;
    if (tab === newTab) return;
    // Save current state
    storage.setStore(`${KEYS.FEED_STATE}_${tab}`, JSON.stringify({ posts, page, hasMore }));
    setTab(newTab);
    setNewPosts([]);
    setPage(1);
    setPosts([]);
    setLoading(true);
    setSuggestions([]);
    setSugFetched(false);
  }

  // Load more
  const loadMore = () => {
    if (!loading && hasMore) {
      const nextPage = page + 1;
      setPage(nextPage);
      fetchPosts(nextPage);
    }
  };

  // Pull to refresh
  const onRefresh = async () => {
    setRefreshing(true);
    setPage(1);
    await fetchPosts(1, true);
    setNewPosts([]);
    setRefreshing(false);
  };

  // Scroll-based pull-to-refresh
  function onScroll(e: any) {
    scrollY.current = e.nativeEvent.contentOffset.y;
  }

  // Load live streams when feedTab is 'live'
  const loadLiveStreams = useCallback(async () => {
    setLiveLoading(true);
    try {
      const res = await getLivePostsAPI(username || '');
      if (res.ok && res.data) {
        setLiveStreams(Array.isArray(res.data) ? res.data : []);
      }
    } catch {} finally {
      setLiveLoading(false);
    }
  }, [username]);

  useEffect(() => {
    if (feedTab === 'live') {
      loadLiveStreams();
      const interval = setInterval(loadLiveStreams, 30000);
      return () => clearInterval(interval);
    }
  }, [feedTab, loadLiveStreams]);

  // Fetch suggestions
  useEffect(() => {
    if (sugFetched || posts.length < 5 || !username) return;
    let active = true;
    setSugFetched(true);
    getFeedPostsAPI({ username, tab: 'foryou', page: 1, limit: 1 }).then(() => {
      if (active) {
        fetch(`${API_BASE_URL}/get-suggestions-feed?username=${encodeURIComponent(username)}`)
          .then(r => r.json())
          .then(data => { if (active) setSuggestions(Array.isArray(data) ? data : []); })
          .catch(() => active && setSuggestions([]));
      }
    });
    return () => { active = false; };
  }, [posts.length, sugFetched, username]);

  // Error retry
  function retry() {
    setError('');
    setPage(1);
    setPosts([]);
    setLoading(true);
    fetchPosts(1, true);
  }

  // Render post with suggestion slots
  const renderPost = ({ item, index }: { item: Post; index: number }) => {
    const showSuggestion = (index + 1) % 5 === 0 && suggestions.length > 0;
    return (
      <View>
        <PostCard
          post={item}
          isActive={isFocused && index === activeIndex}
          viewerCount={liveCounts[String(item.id)] || 0}
          reactionCounts={reactionCountsCache}
          onReactionToggle={(id) => setReactionsOpenFor(reactionsOpenFor === id ? null : id)}
          onVotePoll={handlePollVote}
          onComment={handleComment}
          onLike={handleLike}
          onReact={handleReact}
          showViewButton
          showCommentInput
        />
        {showSuggestion && <SuggestionSlot suggestions={suggestions} slotIndex={Math.floor(index / 5)} />}
      </View>
    );
  };

  const s = makeStyles(colors, isDark);

  // Error state
  if (error && posts.length === 0) {
    return (
      <SafeAreaView style={[s.safe, { backgroundColor: colors.background }]}>
        <View style={[s.header, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
          <TouchableOpacity style={s.profileBtn} onPress={() => navigation.navigate('Profile')}>
            <Image source={{ uri: DEFAULT_PIC }} style={{ width: 32, height: 32, borderRadius: 16 }} />
          </TouchableOpacity>
          <Text style={s.headerTitle}>textmob</Text>
          <View style={s.headerActions}>
            <TouchableOpacity style={s.headerBtn} onPress={() => navigation.navigate('Search')}>
              <Ionicons name="search" size={20} color={colors.textSecondary} />
            </TouchableOpacity>
            <TouchableOpacity style={s.headerBtn} onPress={() => navigation.navigate('Activity')}>
              <Ionicons name="notifications-outline" size={20} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>
        </View>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <Ionicons name="alert-circle-outline" size={40} color="#ef4444" />
          <Text style={{ color: '#ef4444', fontSize: 14, marginTop: 8, marginBottom: 12 }}>{error}</Text>
          <TouchableOpacity onPress={retry} style={{ paddingHorizontal: 20, paddingVertical: 8, borderRadius: 20, backgroundColor: colors.primary }}>
            <Text style={{ color: '#fff', fontSize: 13, fontWeight: '600' }}>Try again</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // Initial loading
  if (loading && page === 1 && posts.length === 0) {
    return (
      <SafeAreaView style={[s.safe, { backgroundColor: colors.background }]}>
        <View style={[s.header, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
          <TouchableOpacity style={s.profileBtn} onPress={() => navigation.navigate('Profile')}>
            <Image source={{ uri: DEFAULT_PIC }} style={{ width: 32, height: 32, borderRadius: 16 }} />
          </TouchableOpacity>
          <Text style={s.headerTitle}>textmob</Text>
          <View style={s.headerActions}>
            <TouchableOpacity style={s.headerBtn} onPress={() => navigation.navigate('Search')}>
              <Ionicons name="search" size={20} color={colors.textSecondary} />
            </TouchableOpacity>
            <TouchableOpacity style={s.headerBtn} onPress={() => navigation.navigate('Activity')}>
              <Ionicons name="notifications-outline" size={20} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>
        </View>
        <View style={[s.tabBar, { backgroundColor: colors.card }]}>
          <TouchableOpacity style={[s.tab, tab === 'foryou' && s.tabActive]} onPress={() => switchTab('foryou')}>
            <Text style={[s.tabText, tab === 'foryou' && s.tabTextActive]}>{username ? 'For You' : 'Trending'}</Text>
          </TouchableOpacity>
          {username && (
            <TouchableOpacity style={[s.tab, tab === 'following' && s.tabActive]} onPress={() => switchTab('following')}>
              <Text style={[s.tabText, tab === 'following' && s.tabTextActive]}>Friends</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity style={s.refreshBtn} onPress={() => { setPage(1); fetchPosts(1, true); }}>
            <ActivityIndicator size="small" color={colors.primary} />
          </TouchableOpacity>
        </View>
        <View style={{ padding: 8 }}>
          {[0, 1, 2, 3].map(i => <PostSkeleton key={i} />)}
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[s.safe, { backgroundColor: colors.background }]}>
      {/* Header */}
      <MobileHeader navigation={navigation} />


      {/* Tabs */}
      <View style={[s.tabBar, { backgroundColor: colors.card }]}>
        <TouchableOpacity style={[s.tab, tab === 'foryou' && s.tabActive]} onPress={() => switchTab('foryou')}>
          <Text style={[s.tabText, tab === 'foryou' && s.tabTextActive]}>{username ? 'For You' : 'Trending'}</Text>
          {tab === 'foryou' && <View style={s.tabIndicator} />}
        </TouchableOpacity>
        {username && (
          <TouchableOpacity style={[s.tab, tab === 'following' && s.tabActive]} onPress={() => switchTab('following')}>
            <Text style={[s.tabText, tab === 'following' && s.tabTextActive]}>Friends</Text>
            {tab === 'following' && <View style={s.tabIndicator} />}
          </TouchableOpacity>
        )}
        <TouchableOpacity style={s.refreshBtn} onPress={() => { setPage(1); fetchPosts(1, true); }}>
          {loading ? <ActivityIndicator size="small" color={colors.primary} /> : <Ionicons name="refresh" size={18} color={colors.primary} />}
        </TouchableOpacity>
      </View>

      {/* Scroll content */}
      {feedTab === 'live' ? (
        <FlatList
          key="live"
          data={liveStreams}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={s.feedList}
          renderItem={({ item }) => (
            <PostCard
              post={item}
              viewerCount={0}
              reactionCounts={reactionCountsCache}
              onVotePoll={handlePollVote}
              onComment={handleComment}
              onLike={handleLike}
              onReact={handleReact}
              showViewButton
              showCommentInput
            />
          )}
          refreshControl={
            <RefreshControl refreshing={liveLoading} onRefresh={loadLiveStreams} tintColor={colors.primary} />
          }
          ListEmptyComponent={
            !liveLoading ? (
              <View style={{ alignItems: 'center', justifyContent: 'center', paddingTop: 80, paddingHorizontal: 24 }}>
                <View style={{ position: 'relative', marginBottom: 16 }}>
                  <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: 'rgba(220,38,38,0.1)', alignItems: 'center', justifyContent: 'center' }}>
                    <Ionicons name="videocam" size={28} color="#dc2626" />
                  </View>
                  <View style={{ position: 'absolute', inset: -4, borderRadius: 36, borderWidth: 2, borderColor: 'rgba(220,38,38,0.3)', opacity: 0.6 }} />
                </View>
                <Text style={[s.emptyText, { color: colors.textPrimary, fontSize: 15, fontWeight: '700', marginTop: 4 }]}>No live streams right now</Text>
                <Text style={[s.emptyText, { color: colors.textSecondary, fontSize: 12, textAlign: 'center', maxWidth: 240, lineHeight: 18, marginTop: 4 }]}>
                  Be the first to go live and get eyes on your content instantly.
                </Text>
                <TouchableOpacity
                  style={{ flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#dc2626', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 24, marginTop: 16, elevation: 4 }}
                  onPress={() => navigation.navigate('CreateLive')}
                >
                  <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#fff' }} />
                  <Text style={{ color: '#fff', fontSize: 13, fontWeight: '700' }}>Go Live · It's Free</Text>
                </TouchableOpacity>
              </View>
            ) : null
          }
        />
      ) : (
        <FlatList
          key="posts"
          data={posts}
          renderItem={renderPost}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={s.feedList}
          onScroll={onScroll}
          scrollEventThrottle={16}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
          }
          onEndReached={loadMore}
          onEndReachedThreshold={0.3}
          onViewableItemsChanged={viewabilityConfigCallbackRef.current}
          viewabilityConfig={{ itemVisiblePercentThreshold: 50 }}
          ListHeaderComponent={
            newPosts.length > 0 ? (
              <View style={s.newPostBannerWrap}>
                <TouchableOpacity style={s.newPostBanner} onPress={flushNewPosts}>
                  <Ionicons name="arrow-up" size={14} color="#fff" />
                  <Text style={s.newPostText}>{newPosts.length} new post{newPosts.length > 1 ? 's' : ''}</Text>
                </TouchableOpacity>
              </View>
            ) : null
          }
          ListFooterComponent={
            <>
              {loading && page > 1 && (
                <View>
                  <PostSkeleton />
                  <PostSkeleton />
                  <PostSkeleton />
                </View>
              )}
              {!hasMore && posts.length > 0 && (
                <View style={s.endOfFeed}>
                  <Text style={[s.endText, { color: isDark ? '#374151' : '#d1d5db' }]}>You're all caught up</Text>
                </View>
              )}
            </>
          }
          ListEmptyComponent={
            !loading ? (
              <View style={s.emptyState}>
                <Ionicons name="mail-open-outline" size={40} color={colors.textSecondary} />
                <Text style={[s.emptyText, { color: colors.textSecondary }]}>Nothing to show yet.</Text>
              </View>
            ) : null
          }
        />
      )}

      {/* FAB - toggle between feed and live streams */}
      <TouchableOpacity
        style={s.fab}
        onPress={() => {
          if (feedTab === 'posts') {
            setFeedTab('live');
          } else {
            setFeedTab('posts');
          }
        }}
      >
        {feedTab === 'posts' ? (
          <Ionicons name="radio" size={24} color="#fff" />
        ) : (
          <Ionicons name="close" size={24} color="#fff" />
        )}
      </TouchableOpacity>

      {/* Reactions Modal */}
      <Modal visible={reactionsOpenFor !== null} transparent animationType="slide" onRequestClose={() => setReactionsOpenFor(null)}>
        <TouchableOpacity style={s.reactionsOverlay} activeOpacity={1} onPress={() => setReactionsOpenFor(null)}>
          <View style={[s.reactionsSheet, { backgroundColor: colors.card }]}>
            <View style={s.reactionsHandle} />
            <Text style={[s.reactionsTitle, { color: colors.textSecondary }]}>React to this post</Text>
            <View style={s.reactionsGrid}>
              {REACTIONS.map((item) => {
                const postId = reactionsOpenFor;
                const data = postId ? reactionCountsCache[String(postId)] : null;
                const isSelected = data?.userReaction === item.r;
                const count = data?.counts?.[item.r] || 0;
                return (
                  <TouchableOpacity
                    key={item.r}
                    style={[s.reactionItem, isSelected && s.reactionItemSelected]}
                    onPress={() => {
                      if (reactionsOpenFor !== null) {
                        handleReact(reactionsOpenFor, item.r, item.t);
                        setReactionsOpenFor(null);
                      }
                    }}
                  >
                    <Text style={{ fontSize: 22 }}>{item.r}</Text>
                    {count > 0 && (
                      <Text style={[s.reactionItemCount, isSelected && { color: '#fff' }]}>{count}</Text>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}

const makeStyles = (colors: any, isDark: boolean) => StyleSheet.create({
  safe: { flex: 1 },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, height: 52, borderBottomWidth: StyleSheet.hairlineWidth,
  },
  profileBtn: { width: 32, height: 32, borderRadius: 16, overflow: 'hidden' },
  headerTitle: { fontSize: 20, fontWeight: '900', color: '#2563eb', letterSpacing: -0.5 },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  headerBtn: { padding: 8 },
  tabBar: {
    flexDirection: 'row', paddingHorizontal: 16, paddingVertical: 0,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border,
  },
  tab: {
    paddingHorizontal: 16, paddingVertical: 12, position: 'relative', marginRight: 4,
  },
  tabActive: {},
  tabText: { fontSize: 14, fontWeight: '600', color: colors.textSecondary },
  tabTextActive: { color: '#2563eb' },
  tabIndicator: {
    position: 'absolute', bottom: 0, left: '50%',
    marginLeft: -24, width: 48, height: 2,
    backgroundColor: '#2563eb', borderRadius: 1,
  },
  refreshBtn: { marginLeft: 'auto', padding: 12, alignSelf: 'center' },
  feedList: { padding: 8, paddingBottom: 100 },
  newPostBannerWrap: { alignItems: 'center', paddingVertical: 8 },
  newPostBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#2563eb', paddingHorizontal: 16, paddingVertical: 8,
    borderRadius: 24, elevation: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15, shadowRadius: 6,
  },
  newPostText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  endOfFeed: { paddingVertical: 32, alignItems: 'center' },
  endText: { fontSize: 10, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 2 },
  emptyState: { alignItems: 'center', justifyContent: 'center', paddingTop: 80 },
  emptyText: { fontSize: 14, marginTop: 8 },
  fab: {
    position: 'absolute', bottom: 80, right: 16,
    width: 52, height: 52, borderRadius: 26,
    backgroundColor: '#2563eb', alignItems: 'center', justifyContent: 'center',
    elevation: 6, shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2, shadowRadius: 8,
  },
  reactionsOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.4)' },
  reactionsSheet: {
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 20, paddingBottom: 40,
  },
  reactionsHandle: { width: 36, height: 4, borderRadius: 2, backgroundColor: '#d1d5db', alignSelf: 'center', marginBottom: 16 },
  reactionsTitle: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1.2, textAlign: 'center', marginBottom: 16 },
  reactionsGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 6 },
  reactionItem: { padding: 8, borderRadius: 12, alignItems: 'center', gap: 2, minWidth: 48 },
  reactionItemSelected: { backgroundColor: '#2563eb' },
  reactionItemCount: { fontSize: 10, fontWeight: '600', color: '#64748b' },
});
