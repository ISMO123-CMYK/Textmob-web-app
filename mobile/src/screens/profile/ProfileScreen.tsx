import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  ActivityIndicator, Image, Linking, Alert,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { getProfileAPI } from '../../api/auth';
import { getUserPostsAPI, Post } from '../../api/posts';
import { followAPI, getFollowStatusAPI } from '../../api/users';
import { clearApiCache } from '../../api/client';
import { timeAgo, formatNumber } from '../../utils/format';

const DEFAULT_PIC = 'https://res.cloudinary.com/dzvm9xe1i/image/upload/v1746095979/profile-pictures/e2st5nispbicnhnir9cf.jpg';
const POST_PAGE_LIMIT = 24;

export default function ProfileScreen({ route, navigation }: { route: any; navigation: any }) {
  const { colors, isDark } = useTheme();
  const { username: currentUser } = useAuth();
  const targetUsername = route?.params?.username || currentUser || '';

  const [profile, setProfile] = useState<any>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [followStatus, setFollowStatus] = useState<string>('loading');
  const [followLoading, setFollowLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<string>('posts');
  const [bioExpanded, setBioExpanded] = useState(false);
  const [postPage, setPostPage] = useState(1);
  const [hasMorePosts, setHasMorePosts] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [connections, setConnections] = useState<string[]>([]);
  const [followingList, setFollowingList] = useState<string[]>([]);
  const [viewMode, setViewMode] = useState<'grid' | 'feed'>('grid');
  const isLoadingRef = useRef(false);

  const isOwn = currentUser === targetUsername;
  const isOrg = (profile?.profile_type || '').toLowerCase() === 'organisation';
  const bio = profile?.biography || profile?.bio || '';
  const bioLong = bio.length > 120 || (bio.match(/\n/g) || []).length > 3;

  useEffect(() => {
    if (!targetUsername) { setLoading(false); setError('No user specified'); return; }
    loadProfile();
    loadFollowStatus();
  }, [targetUsername]);

  const loadProfile = async () => {
    setLoading(true);
    setError('');
    setPosts([]);
    setPostPage(1);
    setHasMorePosts(true);
    try {
      const [profileRes, postsRes] = await Promise.all([
        getProfileAPI(targetUsername),
        getUserPostsAPI(targetUsername, 1, POST_PAGE_LIMIT),
      ]);
      if (!profileRes.ok) throw new Error('Profile not found');
      const p = profileRes.data;
      setProfile(p);
      const fetchedIsOrg = (p.profile_type || '').toLowerCase() === 'organisation';
      setConnections(fetchedIsOrg ? (p.followers || []) : (p.followers || []));
      setFollowingList(p.following || []);
      if (postsRes.ok && postsRes.data) {
        const list = normalizePosts(postsRes.data);
        setPosts(list);
        setHasMorePosts(list.length >= POST_PAGE_LIMIT);
      } else {
        setHasMorePosts(false);
      }
    } catch (e: any) {
      setError(e.message || 'Failed to load profile');
    }
    setLoading(false);
  };

  const normalizePosts = (arr: any[]) =>
    Array.isArray(arr) ? arr.map(p => p?.type ? p : { ...p, type: 'post' }) : [];

  const loadFollowStatus = async () => {
    if (!currentUser || currentUser === targetUsername) { setFollowStatus('none'); return; }
    try {
      const res = await getFollowStatusAPI(currentUser, targetUsername);
      if (res.ok && res.data) setFollowStatus(res.data.status || 'not_friended');
    } catch { setFollowStatus('not_friended'); }
  };

  const handleFollow = async () => {
    if (!currentUser) { Alert.alert('Sign in', 'Log in to follow users'); return; }
    if (followLoading) return;
    setFollowLoading(true);
    try {
      const action = followStatus === 'following' ? 'unfollow' : 'follow';
      const res = await followAPI(targetUsername, currentUser, action);
      if (res.ok) {
        setFollowStatus(res.data?.status || '');
        clearApiCache();
      }
      profile && setProfile({ ...profile, followers: action === 'follow' ? [...(profile.followers || []), currentUser] : (profile.followers || []).filter((u: string) => u !== currentUser) });
    } catch {}
    setFollowLoading(false);
  };

  const loadMorePosts = async () => {
    if (loadingMore || !hasMorePosts || isLoadingRef.current) return;
    isLoadingRef.current = true;
    setLoadingMore(true);
    try {
      const nextPage = postPage + 1;
      const res = await getUserPostsAPI(targetUsername, nextPage, POST_PAGE_LIMIT);
      if (res.ok && res.data) {
        const batch = normalizePosts(res.data);
        if (batch.length === 0) {
          setHasMorePosts(false);
        } else {
          setPosts(prev => [...prev, ...batch]);
          setPostPage(nextPage);
          setHasMorePosts(batch.length >= POST_PAGE_LIMIT);
        }
      } else {
        setHasMorePosts(false);
      }
    } catch {
      setHasMorePosts(false);
    }
    setLoadingMore(false);
    isLoadingRef.current = false;
  };

  const onRefresh = async () => {
    setRefreshing(true);
    isLoadingRef.current = true;
    setPosts([]);
    setPostPage(1);
    setHasMorePosts(true);
    try {
      const [profileRes, postsRes] = await Promise.all([
        getProfileAPI(targetUsername),
        getUserPostsAPI(targetUsername, 1, POST_PAGE_LIMIT),
      ]);
      if (profileRes.ok) {
        const p = profileRes.data;
        setProfile(p);
        const fetchedIsOrg = (p.profile_type || '').toLowerCase() === 'organisation';
        setConnections(fetchedIsOrg ? (p.followers || []) : (p.followers || []));
        setFollowingList(p.following || []);
      }
      if (postsRes.ok && postsRes.data) {
        const list = normalizePosts(postsRes.data);
        setPosts(list);
        setHasMorePosts(list.length >= POST_PAGE_LIMIT);
      } else {
        setHasMorePosts(false);
      }
    } catch {}
    await loadFollowStatus();
    isLoadingRef.current = false;
    setRefreshing(false);
  };

  const tabs = [
    { id: 'posts', label: 'Posts', count: profile?.post_count ?? posts.length },
    { id: 'connections', label: isOrg ? 'Followers' : 'Friends', count: connections.length },
    { id: 'following', label: 'Following', count: followingList.length },
  ];

  const s = makeStyles(colors, isDark);

  if (loading) {
    return (
      <SafeAreaView style={[s.safe, { backgroundColor: colors.background }]}>
        <View style={s.skeletonCover} />
        <View style={s.skeletonBody}>
          <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 12, marginBottom: 16 }}>
            <View style={[s.skeletonAvatar, { backgroundColor: isDark ? '#334155' : '#e5e7eb' }]} />
            <View style={[s.skeletonBtn, { backgroundColor: isDark ? '#334155' : '#e5e7eb' }]} />
          </View>
          <View style={{ gap: 6 }}>
            {[0, 1, 2].map(i => (
              <View key={i} style={{ height: 12, borderRadius: 6, backgroundColor: isDark ? '#334155' : '#e5e7eb', width: `${[40, 60, 30][i]}%` }} />
            ))}
          </View>
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={[s.safe, { backgroundColor: colors.background }]}>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <Ionicons name="alert-circle-outline" size={48} color="#ef4444" />
          <Text style={{ color: '#ef4444', fontSize: 15, marginTop: 8, marginBottom: 16 }}>{error}</Text>
          <TouchableOpacity onPress={() => navigation.goBack()} style={{ paddingHorizontal: 20, paddingVertical: 8, borderRadius: 20, backgroundColor: colors.primary }}>
            <Text style={{ color: '#fff', fontWeight: '600', fontSize: 13 }}>Go back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const displayedBio = bioExpanded || !bioLong ? bio : bio.slice(0, 120).trimEnd() + '...';

  const PostGridItem = ({ item }: { item: Post }) => {
    const mediaUrl = Array.isArray(item.media) && item.media.length ? item.media[0] : null;
    const isVideo = mediaUrl && /\.(mp4|webm|ogg)$/i.test(mediaUrl);
    return (
      <TouchableOpacity style={s.gridItem} onPress={() => navigation.navigate('PostDetail', { postId: item.id })} activeOpacity={0.8}>
        {mediaUrl ? (
          <Image source={{ uri: mediaUrl }} style={s.gridImage} />
        ) : (
          <View style={[s.gridTextFallback, { backgroundColor: colors.card }]}>
            <Text style={[s.gridText, { color: colors.textSecondary }]} numberOfLines={4}>
              {item.text || '\u2014'}
            </Text>
          </View>
        )}
        <View style={s.gridOverlay}>
          <View style={s.gridOverlayRow}>
            <Ionicons name="heart" size={12} color="#fff" />
            <Text style={s.gridOverlayText}>{Array.isArray(item.likes) ? item.likes.length : 0}</Text>
          </View>
          <View style={s.gridOverlayRow}>
            <Ionicons name="chatbubble" size={11} color="#fff" />
            <Text style={s.gridOverlayText}>{Array.isArray(item.comments) ? item.comments.length : 0}</Text>
          </View>
        </View>
        {isVideo && <Ionicons name="play" size={16} color="#fff" style={s.gridPlayIcon} />}
      </TouchableOpacity>
    );
  };

  const PostFeedItem = ({ item }: { item: Post }) => {
    const mediaUrl = Array.isArray(item.media) && item.media.length ? item.media[0] : null;
    const isVideo = mediaUrl && /\.(mp4|webm|ogg)$/i.test(mediaUrl);
    return (
      <TouchableOpacity
        style={[s.feedItem, { borderBottomColor: colors.border }]}
        onPress={() => navigation.navigate('PostDetail', { postId: item.id })}
        activeOpacity={0.7}
      >
        <View style={{ flexDirection: 'row', gap: 10, alignItems: 'flex-start' }}>
          {mediaUrl && (
            <View style={s.feedThumb}>
              {isVideo && <Ionicons name="play" size={14} color="#fff" style={{ position: 'absolute', zIndex: 2, alignSelf: 'center', top: '40%' }} />}
              <Image source={{ uri: mediaUrl }} style={s.feedThumbImg} />
            </View>
          )}
          <View style={{ flex: 1 }}>
            <Text style={[s.feedText, { color: colors.textPrimary }]} numberOfLines={2}>{item.text || '\u2014'}</Text>
            <View style={{ flexDirection: 'row', gap: 12, marginTop: 6 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                <Ionicons name="heart-outline" size={11} color={colors.textSecondary} />
                <Text style={[s.feedMeta, { color: colors.textSecondary }]}>{Array.isArray(item.likes) ? item.likes.length : 0}</Text>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                <Ionicons name="chatbubble-outline" size={10} color={colors.textSecondary} />
                <Text style={[s.feedMeta, { color: colors.textSecondary }]}>{Array.isArray(item.comments) ? item.comments.length : 0}</Text>
              </View>
              {item.created_at && (
                <Text style={[s.feedMeta, { color: colors.textSecondary, marginLeft: 'auto' }]}>
                  {timeAgo(item.created_at)}
                </Text>
              )}
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const ListHeader = () => (
    <View>
      <View style={s.coverWrap}>
        <Image source={{ uri: DEFAULT_PIC }} style={s.coverFallback} />
        <TouchableOpacity style={s.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={18} color="#fff" />
        </TouchableOpacity>
      </View>

      <View style={s.profileSection}>
        <View style={s.avatarRow}>
          <Image source={{ uri: profile?.profile_pic || DEFAULT_PIC }} style={s.avatar} />
          <View style={s.actionBtns}>
            {isOwn ? (
              <TouchableOpacity style={s.editBtn} onPress={() => navigation.navigate('AccountsCenter')}>
                <Text style={[s.editBtnText, { color: colors.textPrimary }]}>Edit profile</Text>
              </TouchableOpacity>
            ) : currentUser ? (
              <>
                <TouchableOpacity
                  style={[s.followBtn, followStatus === 'following' ? s.followingBtn : null]}
                  onPress={handleFollow}
                  disabled={followLoading}
                >
                  <Text style={[s.followBtnText, followStatus === 'following' ? s.followingBtnText : null]}>
                    {followLoading ? 'Wait...' : followStatus === 'friended' ? 'Friends' : followStatus === 'following' ? 'Following' : followStatus === 'not_following' ? 'Follow' : 'Add Friend'}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity style={s.msgBtn} onPress={() => navigation.navigate('Chats', { with: targetUsername })}>
                  <Text style={s.msgBtnText}>Message</Text>
                </TouchableOpacity>
              </>
            ) : (
              <>
                <TouchableOpacity style={s.followBtn} onPress={() => navigation.navigate('Login')}>
                  <Text style={s.followBtnText}>Log in</Text>
                </TouchableOpacity>
                <TouchableOpacity style={s.editBtn} onPress={() => navigation.navigate('Signup')}>
                  <Text style={[s.editBtnText, { color: colors.textPrimary }]}>Sign up</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>

        <View style={s.nameRow}>
          <Text style={[s.fullname, { color: colors.textPrimary }]}>
            {profile?.fullname || targetUsername}
          </Text>
          {profile?.verified && (
            <View style={s.verifiedBadge}>
              <Ionicons name="checkmark" size={10} color="#fff" />
              <Text style={s.verifiedText}>Verified</Text>
            </View>
          )}
          {isOrg && (
            <View style={[s.orgBadge, { borderColor: colors.primary }]}>
              <Text style={[s.orgBadgeText, { color: colors.primary }]}>Organisation</Text>
            </View>
          )}
        </View>
        <Text style={[s.usernameText, { color: colors.textSecondary }]}>@{targetUsername}</Text>

        {bio ? (
          <View style={s.bioSection}>
            <Text style={[s.bio, { color: colors.textPrimary }]}>{displayedBio}</Text>
            {bioLong && (
              <TouchableOpacity onPress={() => setBioExpanded(!bioExpanded)}>
                <Text style={s.bioToggle}>{bioExpanded ? 'Show less' : 'Show more'}</Text>
              </TouchableOpacity>
            )}
          </View>
        ) : null}

        <View style={s.metaRow}>
          {profile?.location && (
            <View style={s.metaItem}>
              <Ionicons name="location-outline" size={12} color={colors.textSecondary} />
              <Text style={[s.metaText, { color: colors.textSecondary }]}>{profile.location}</Text>
            </View>
          )}
          {profile?.website && (
            <TouchableOpacity style={s.metaItem} onPress={() => Linking.openURL(profile.website)}>
              <Ionicons name="link-outline" size={12} color={colors.primary} />
              <Text style={[s.metaText, { color: colors.primary }]}>{profile.website.replace(/^https?:\/\//, '')}</Text>
            </TouchableOpacity>
          )}
          {profile?.created_at && !isNaN(new Date(profile.created_at).getTime()) && (
            <View style={s.metaItem}>
              <Ionicons name="calendar-outline" size={12} color={colors.textSecondary} />
              <Text style={[s.metaText, { color: colors.textSecondary }]}>
                Joined {new Date(profile.created_at).toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}
              </Text>
            </View>
          )}
        </View>

        <View style={[s.statsRow, { borderBottomColor: colors.border }]}>
          <TouchableOpacity style={s.statItem} onPress={() => setActiveTab('connections')}>
            <Text style={[s.statNumber, { color: colors.textPrimary }]}>{formatNumber(connections.length)}</Text>
            <Text style={[s.statLabel, { color: colors.textSecondary }]}>{isOrg ? 'Followers' : 'Friends'}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={s.statItem} onPress={() => setActiveTab('following')}>
            <Text style={[s.statNumber, { color: colors.textPrimary }]}>{formatNumber(followingList.length)}</Text>
            <Text style={[s.statLabel, { color: colors.textSecondary }]}>Following</Text>
          </TouchableOpacity>
          <View style={s.statItem}>
            <Text style={[s.statNumber, { color: colors.textPrimary }]}>{formatNumber(profile?.post_count ?? posts.length)}</Text>
            <Text style={[s.statLabel, { color: colors.textSecondary }]}>Posts</Text>
          </View>
        </View>
      </View>

      <View style={[s.tabBar, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        {tabs.map(tab => (
          <TouchableOpacity key={tab.id} style={s.tab} onPress={() => setActiveTab(tab.id)}>
            <Text style={[s.tabLabel, { color: activeTab === tab.id ? colors.textPrimary : colors.textSecondary }]}>
              {tab.label}
            </Text>
            {tab.count > 0 && (
              <Text style={[s.tabCount, { color: activeTab === tab.id ? colors.primary : colors.textSecondary }]}>
                {formatNumber(tab.count)}
              </Text>
            )}
            {activeTab === tab.id && <View style={[s.tabIndicator, { backgroundColor: colors.primary }]} />}
          </TouchableOpacity>
        ))}
        {activeTab === 'posts' && (
          <TouchableOpacity
            style={{ paddingHorizontal: 8, justifyContent: 'center' }}
            onPress={() => setViewMode(v => v === 'grid' ? 'feed' : 'grid')}
          >
            <Ionicons name={viewMode === 'grid' ? 'list-outline' : 'grid-outline'} size={18} color={colors.textSecondary} />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );

  return (
    <SafeAreaView style={[s.safe, { backgroundColor: colors.background }]}>
      <FlatList
        key={`${activeTab}_${viewMode}`}
        data={activeTab === 'posts' ? posts : (activeTab === 'connections' ? connections : followingList)}
        numColumns={activeTab === 'posts' && viewMode === 'grid' ? 3 : 1}
        keyExtractor={(item) => (activeTab === 'posts' ? String(item.id) : item)}
        renderItem={
          activeTab === 'posts'
            ? viewMode === 'grid'
              ? ({ item }) => <PostGridItem item={item} />
              : ({ item }) => <PostFeedItem item={item} />
            : ({ item: uname }) => (
              <TouchableOpacity style={[s.userRow, { borderBottomColor: colors.border }]} onPress={() => navigation.push('Profile', { username: uname })}>
                <View style={s.userAvatar}>
                  <Text style={{ color: '#fff', fontSize: 16, fontWeight: '700' }}>{(uname || '?')[0].toUpperCase()}</Text>
                </View>
                <Text style={[s.userName, { color: colors.textPrimary }]}>@{uname}</Text>
                {uname !== currentUser && (
                  <TouchableOpacity style={{ paddingHorizontal: 12, paddingVertical: 4, borderRadius: 14, backgroundColor: colors.primary }}>
                    <Text style={{ color: '#fff', fontSize: 11, fontWeight: '600' }}>Follow</Text>
                  </TouchableOpacity>
                )}
              </TouchableOpacity>
            )
        }
        ListHeaderComponent={ListHeader}
        columnWrapperStyle={activeTab === 'posts' && viewMode === 'grid' ? s.gridRow : undefined}
        contentContainerStyle={s.gridContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        ListFooterComponent={activeTab === 'posts' ? (
          loadingMore ? (
            <View style={{ padding: 16, alignItems: 'center' }}>
              <ActivityIndicator color={colors.primary} />
            </View>
          ) : hasMorePosts ? (
            <TouchableOpacity
              onPress={loadMorePosts}
              style={{ marginVertical: 20, alignSelf: 'center', paddingHorizontal: 28, paddingVertical: 10, borderRadius: 24, backgroundColor: isDark ? '#334155' : '#f3f4f6' }}
            >
              <Text style={{ fontSize: 13, fontWeight: '700', color: colors.textSecondary }}>Load more</Text>
            </TouchableOpacity>
          ) : null
        ) : null}
        ListEmptyComponent={
          <View style={{ alignItems: 'center', paddingTop: 40, paddingBottom: 40 }}>
            <Text style={{ color: colors.textSecondary, fontSize: 13 }}>None yet</Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const makeStyles = (colors: any, isDark: boolean) => StyleSheet.create({
  safe: { flex: 1 },
  skeletonCover: { height: 144, backgroundColor: isDark ? '#1e293b' : '#f3f4f6' },
  skeletonBody: { padding: 16 },
  skeletonAvatar: { width: 80, height: 80, borderRadius: 40 },
  skeletonBtn: { width: 96, height: 32, borderRadius: 16, marginBottom: 16 },
  coverWrap: { height: 144, position: 'relative', backgroundColor: '#e5e7eb' },
  coverFallback: { width: '100%', height: '100%', opacity: 0.3 },
  backBtn: { position: 'absolute', top: 8, left: 12, width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(0,0,0,0.3)', alignItems: 'center', justifyContent: 'center' },
  profileSection: { paddingHorizontal: 16, marginTop: -40 },
  avatarRow: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 8 },
  avatar: { width: 80, height: 80, borderRadius: 40, borderWidth: 4, borderColor: isDark ? colors.card : '#fff', backgroundColor: colors.border },
  actionBtns: { flexDirection: 'row', gap: 6, marginBottom: 4 },
  editBtn: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20, borderWidth: 1, borderColor: isDark ? '#374151' : '#d1d5db' },
  editBtnText: { fontSize: 12, fontWeight: '700' },
  followBtn: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20, backgroundColor: '#2563eb' },
  followBtnText: { fontSize: 12, fontWeight: '700', color: '#fff' },
  followingBtn: { backgroundColor: isDark ? '#374151' : '#e5e7eb' },
  followingBtnText: { color: isDark ? '#d1d5db' : '#374151' },
  msgBtn: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20, backgroundColor: '#2563eb' },
  msgBtnText: { fontSize: 12, fontWeight: '700', color: '#fff' },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  fullname: { fontSize: 20, fontWeight: '700' },
  verifiedBadge: { flexDirection: 'row', alignItems: 'center', gap: 2, backgroundColor: '#2563eb', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 8 },
  verifiedText: { fontSize: 9, fontWeight: '800', color: '#fff' },
  orgBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10, borderWidth: 1 },
  orgBadgeText: { fontSize: 9, fontWeight: '800', letterSpacing: 1, textTransform: 'uppercase' },
  usernameText: { fontSize: 14, marginTop: 1, marginBottom: 8 },
  bioSection: { marginBottom: 12 },
  bio: { fontSize: 13, lineHeight: 18 },
  bioToggle: { fontSize: 12, fontWeight: '600', color: '#2563eb', marginTop: 4 },
  metaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 12 },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaText: { fontSize: 12 },
  statsRow: { flexDirection: 'row', gap: 28, paddingBottom: 14, borderBottomWidth: StyleSheet.hairlineWidth, marginBottom: 0 },
  statItem: { alignItems: 'center' },
  statNumber: { fontSize: 16, fontWeight: '700' },
  statLabel: { fontSize: 11, marginTop: 1 },
  tabBar: { flexDirection: 'row', borderBottomWidth: StyleSheet.hairlineWidth },
  tab: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, paddingVertical: 14, position: 'relative' },
  tabLabel: { fontSize: 13, fontWeight: '600' },
  tabCount: { fontSize: 11, fontWeight: '700' },
  tabIndicator: { position: 'absolute', bottom: 0, width: 32, height: 2.5, borderRadius: 2 },
  gridContent: { paddingBottom: 100 },
  gridRow: { gap: 1, marginBottom: 1 },
  gridItem: { flex: 1, aspectRatio: 1, position: 'relative', overflow: 'hidden' },
  gridImage: { width: '100%', height: '100%' },
  gridTextFallback: { flex: 1, padding: 6, justifyContent: 'center' },
  gridText: { fontSize: 10, lineHeight: 13 },
  gridOverlay: { position: 'absolute', bottom: 0, left: 0, right: 0, flexDirection: 'row', gap: 10, padding: 6, backgroundColor: 'rgba(0,0,0,0.4)', opacity: 0, justifyContent: 'center' },
  gridOverlayRow: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  gridOverlayText: { color: '#fff', fontSize: 10, fontWeight: '700' },
  gridPlayIcon: { position: 'absolute', top: 6, right: 6 },
  userRow: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14, borderBottomWidth: StyleSheet.hairlineWidth },
  userAvatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#2563eb', alignItems: 'center', justifyContent: 'center' },
  userName: { fontSize: 14, fontWeight: '600', flex: 1 },
  feedItem: { padding: 12, borderBottomWidth: StyleSheet.hairlineWidth },
  feedThumb: { width: 56, height: 56, borderRadius: 8, overflow: 'hidden', backgroundColor: colors.border, justifyContent: 'center' },
  feedThumbImg: { width: '100%', height: '100%' },
  feedText: { fontSize: 13, lineHeight: 17 },
  feedMeta: { fontSize: 10, fontWeight: '500' },
});
