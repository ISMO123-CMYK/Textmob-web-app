import React, { useState, useEffect } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { apiGet } from '../../api/client';
import PostCard, { PostSkeleton } from '../../components/PostCard';
import { Post } from '../../api/posts';

function isGroupPost(p: Post) { return p.type?.toLowerCase().startsWith('group'); }

export default function HashtagScreen({ route, navigation }: any) {
  const { tag } = route.params || {};
  const { colors, isDark } = useTheme();
  const { username } = useAuth();

  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  useEffect(() => {
    if (!tag) return;
    fetchTag(1, true);
  }, [tag]);

  async function fetchTag(pageNum: number, reset = false) {
    if (reset) setLoading(true);
    else setLoadingMore(true);
    try {
      const res = await apiGet(`/tag/${encodeURIComponent(tag)}?page=${pageNum}&limit=20`);
      if (res.ok && res.data) {
        const list = Array.isArray(res.data) ? res.data : res.data.posts || [];
        const filtered = list.filter((p: Post) => p && !isGroupPost(p));
        setPosts(prev => reset ? filtered : [...prev, ...filtered]);
        setHasMore(res.data.hasMore ?? filtered.length >= 20);
        if (reset) setPage(1);
        else setPage(pageNum);
      }
    } catch {} finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }

  function loadMore() {
    if (!hasMore || loading || loadingMore) return;
    fetchTag(page + 1);
  }

  const s = makeStyles(colors, isDark);

  return (
    <SafeAreaView edges={['top']} style={[s.safe, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[s.header, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}>
          <Ionicons name="chevron-back" size={22} color={colors.textPrimary} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={[s.hashtagTitle, { color: colors.textPrimary }]}>#{tag}</Text>
          {!loading && (
            <Text style={[s.postCount, { color: colors.textSecondary }]}>
              {posts.length} post{posts.length !== 1 ? 's' : ''}
            </Text>
          )}
        </View>
      </View>

      {/* Content */}
      {loading ? (
        <View style={{ padding: 8 }}>
          {[1, 2, 3].map(i => <PostSkeleton key={i} />)}
        </View>
      ) : posts.length === 0 ? (
        <View style={s.emptyState}>
          <View style={s.emptyIconWrap}>
            <Text style={s.hashtagIcon}>#</Text>
          </View>
          <Text style={[s.emptyTitle, { color: colors.textPrimary }]}>No posts with #{tag} yet</Text>
          <Text style={[s.emptySub, { color: colors.textSecondary }]}>Be the first to use this hashtag</Text>
        </View>
      ) : (
        <FlatList
          data={posts}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={s.listContent}
          renderItem={({ item }) => (
            <PostCard
              post={item}
              viewerCount={0}
              reactionCounts={{}}
              onVotePoll={() => {}}
              onComment={() => {}}
              onLike={() => {}}
              onReact={() => {}}
              showViewButton
              showCommentInput={!!username}
            />
          )}
          onEndReached={loadMore}
          onEndReachedThreshold={0.3}
          ListFooterComponent={
            loadingMore ? (
              <View style={{ padding: 16 }}>
                <ActivityIndicator size="small" color={colors.primary} />
              </View>
            ) : !hasMore && posts.length > 0 ? (
              <View style={s.endOfFeed}>
                <Text style={[s.endText, { color: isDark ? '#374151' : '#d1d5db' }]}>You're all caught up</Text>
              </View>
            ) : null
          }
        />
      )}
    </SafeAreaView>
  );
}

const makeStyles = (colors: any, isDark: boolean) => StyleSheet.create({
  safe: { flex: 1 },
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 8, height: 52,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  backBtn: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', marginRight: 4 },
  hashtagTitle: { fontSize: 16, fontWeight: '800' },
  postCount: { fontSize: 11, marginTop: 1 },
  listContent: { padding: 8, paddingBottom: 100 },
  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  emptyIconWrap: { width: 56, height: 56, borderRadius: 16, backgroundColor: '#f3f4f6', alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  hashtagIcon: { fontSize: 22, fontWeight: '900', color: '#9ca3af' },
  emptyTitle: { fontSize: 14, fontWeight: '700', marginBottom: 4 },
  emptySub: { fontSize: 12, textAlign: 'center' },
  endOfFeed: { paddingVertical: 24, alignItems: 'center' },
  endText: { fontSize: 10, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 2 },
});
