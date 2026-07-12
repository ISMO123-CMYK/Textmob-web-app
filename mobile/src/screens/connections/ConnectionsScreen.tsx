import React, { useState, useEffect } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  ActivityIndicator, SafeAreaView, Image, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { getFollowersAPI, getFollowingAPI, followUserAPI, unfollowUserAPI, getSuggestionsFeedAPI } from '../../api/users';

const DEFAULT_PIC = 'https://res.cloudinary.com/dzvm9xe1i/image/upload/v1746095979/profile-pictures/e2st5nispbicnhnir9cf.jpg';

export default function ConnectionsScreen({ route, navigation }: { route: any; navigation: any }) {
  const { colors, isDark } = useTheme();
  const { username } = useAuth();
  const targetUser = route?.params?.username || username;

  const [activeTab, setActiveTab] = useState<'followers' | 'following' | 'discover'>('discover');
  const [followers, setFollowers] = useState<any[]>([]);
  const [following, setFollowing] = useState<any[]>([]);
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadConnections(); }, [targetUser]);

  const loadConnections = async () => {
    setLoading(true);
    const [fRes, folRes, sugRes] = await Promise.all([
      getFollowersAPI(targetUser || ''),
      getFollowingAPI(targetUser || ''),
      username ? getSuggestionsFeedAPI(username) : Promise.resolve({ ok: false }),
    ]);
    if (fRes.ok && fRes.data) setFollowers(fRes.data);
    if (folRes.ok && folRes.data) setFollowing(folRes.data);
    if (sugRes.ok && sugRes.data) setSuggestions(Array.isArray(sugRes.data) ? sugRes.data : []);
    setLoading(false);
  };

  const toggleFollow = async (user: string) => {
    if (!username) { Alert.alert('Sign in', 'Log in to follow users'); return; }
    const isFollowing = following.some((f: any) => f.username === user);
    try {
      if (isFollowing) {
        await unfollowUserAPI(username, user);
        setFollowing(prev => prev.filter((f: any) => f.username !== user));
      } else {
        await followUserAPI(username, user);
        setFollowing(prev => [...prev, { username: user }]);
      }
    } catch {}
  };

  const renderUser = (user: any, showFollow = true) => {
    const isFollowing = following.some((f: any) => f.username === user.username);
    return (
      <TouchableOpacity style={s.userRow} onPress={() => navigation.navigate('Profile', { username: user.username })}>
        <Image source={{ uri: user.profile_pic || DEFAULT_PIC }} style={s.avatar} />
        <View style={{ flex: 1 }}>
          <Text style={[s.userName, { color: colors.textPrimary }]}>{user.fullname || user.username}</Text>
          <Text style={[s.userHandle, { color: colors.textSecondary }]}>@{user.username}</Text>
        </View>
        {showFollow && username !== user.username && (
          <TouchableOpacity
            style={[s.followBtn, { backgroundColor: isFollowing ? (isDark ? '#334155' : '#f3f4f6') : '#2563eb' }]}
            onPress={() => toggleFollow(user.username!)}
          >
            <Text style={[s.followText, { color: isFollowing ? colors.textSecondary : '#fff' }]}>
              {isFollowing ? 'Following' : 'Follow'}
            </Text>
          </TouchableOpacity>
        )}
      </TouchableOpacity>
    );
  };

  const s = makeStyles(colors, isDark);
  const tabs = [
    { key: 'followers' as const, label: 'Followers', count: followers.length },
    { key: 'following' as const, label: 'Following', count: following.length },
    { key: 'discover' as const, label: 'Discover', count: suggestions.length },
  ];
  const list = activeTab === 'followers' ? followers : activeTab === 'following' ? following : suggestions;

  return (
    <SafeAreaView style={[s.safe, { backgroundColor: colors.background }]}>
      <View style={[s.header, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}>
          <Ionicons name="arrow-back" size={22} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={[s.headerTitle, { color: colors.textPrimary }]}>Connections</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Tabs matching web centered underline design */}
      <View style={[s.tabBar, { borderBottomColor: colors.border }]}>
        {tabs.map(t => (
          <TouchableOpacity key={t.key} style={s.tab} onPress={() => setActiveTab(t.key)}>
            <Text style={[s.tabText, { color: activeTab === t.key ? '#2563eb' : colors.textSecondary }]}>
              {t.label} <Text style={{ fontSize: 10, opacity: 0.6 }}>{t.count}</Text>
            </Text>
            {activeTab === t.key && <View style={s.activeIndicator} />}
          </TouchableOpacity>
        ))}
      </View>

      {loading ? (
        <View style={s.loadingWrap}><ActivityIndicator size="large" color={colors.primary} /></View>
      ) : (
        <FlatList
          data={list}
          keyExtractor={(item, i) => item.username || String(i)}
          renderItem={({ item }) => renderUser(item, activeTab !== 'following')}
          contentContainerStyle={s.listContent}
          ListEmptyComponent={
            <View style={s.emptyState}>
              <Ionicons name="people-outline" size={36} color={colors.textSecondary} />
              <Text style={[s.emptyLabel, { color: colors.textSecondary }]}>No {activeTab} yet</Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const makeStyles = (colors: any, isDark: boolean) => StyleSheet.create({
  safe: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', height: 56, paddingHorizontal: 16, borderBottomWidth: StyleSheet.hairlineWidth },
  backBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '800', flex: 1, marginLeft: 4 },
  tabBar: { flexDirection: 'row', borderBottomWidth: StyleSheet.hairlineWidth },
  tab: { flex: 1, alignItems: 'center', paddingVertical: 12, position: 'relative' },
  activeIndicator: { position: 'absolute', bottom: 0, left: '25%', right: '25%', height: 2.5, backgroundColor: '#2563eb', borderRadius: 2 },
  tabText: { fontSize: 13, fontWeight: '700' },
  loadingWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  listContent: { paddingHorizontal: 16, paddingBottom: 100, paddingTop: 8 },
  userRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderRadius: 16, marginBottom: 4 },
  avatar: { width: 44, height: 44, borderRadius: 22, borderWidth: 1, borderColor: colors.border },
  userName: { fontSize: 13, fontWeight: '700' },
  userHandle: { fontSize: 11 },
  followBtn: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20 },
  followText: { fontSize: 12, fontWeight: '700' },
  emptyState: { alignItems: 'center', paddingTop: 80 },
  emptyLabel: { fontSize: 14, marginTop: 8 },
});
