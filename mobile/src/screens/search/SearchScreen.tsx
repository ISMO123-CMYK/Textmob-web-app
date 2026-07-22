import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  TextInput, Image, ActivityIndicator, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { searchUsersAPI, searchSuggestAPI, getSuggestionsFeedAPI, followAPI, friendAPI, getFollowStatusAPI, searchGeneralAPI, UserProfile, SuggestedUser } from '../../api/users';
import { Post } from '../../api/posts';
import { apiPost } from '../../api/client';
import { storage, KEYS } from '../../utils/storage';
import { useNavigation } from '@react-navigation/native';
import { timeAgo } from '../../utils/format';

const DEFAULT_PIC = 'https://res.cloudinary.com/dzvm9xe1i/image/upload/v1746095979/profile-pictures/e2st5nispbicnhnir9cf.jpg';
const SUGGESTIONS_STORAGE_KEY = 'search_history';

function useDebounce(value: string, delay: number) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

function HighlightMatch({ text, query }: { text: string; query: string }) {
  if (!query.trim()) return <Text>{text}</Text>;
  const idx = text.toLowerCase().indexOf(query.toLowerCase());
  if (idx === -1) return <Text>{text}</Text>;
  return (
    <Text>
      {text.slice(0, idx)}
      <Text style={{ fontWeight: '700', color: '#2563eb' }}>{text.slice(idx, idx + query.length)}</Text>
      {text.slice(idx + query.length)}
    </Text>
  );
}

export default function SearchScreen() {
  const { colors, isDark } = useTheme();
  const { username } = useAuth();
  const navigation = useNavigation<any>();

  const [query, setQuery] = useState('');
  const [focused, setFocused] = useState(false);
  const [searchResults, setSearchResults] = useState<UserProfile[]>([]);
  const [postsResults, setPostsResults] = useState<Post[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [searched, setSearched] = useState(false);
  const [loadingResults, setLoadingResults] = useState(false);
  const [activeTab, setActiveTab] = useState<'people' | 'posts'>('people');
  const [exploreSuggestions, setExploreSuggestions] = useState<SuggestedUser[]>([]);
  const [loadingExplore, setLoadingExplore] = useState(false);
  const [history, setHistory] = useState<string[]>([]);
  const [following, setFollowing] = useState<string[]>([]);

  const inputRef = useRef<TextInput>(null);
  const debouncedQuery = useDebounce(query, 260);

  // Load search history
  useEffect(() => {
    storage.getStore(SUGGESTIONS_STORAGE_KEY).then(raw => {
      if (raw) try { setHistory(JSON.parse(raw)); } catch {}
    });
  }, []);

  const saveHistory = useCallback((q: string) => {
    const trimmed = q.trim();
    if (!trimmed) return;
    setHistory(prev => {
      const next = [trimmed, ...prev.filter(h => h !== trimmed)].slice(0, 20);
      storage.setStore(SUGGESTIONS_STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const removeHistory = useCallback((q: string) => {
    setHistory(prev => {
      const next = prev.filter(h => h !== q);
      storage.setStore(SUGGESTIONS_STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const clearHistory = useCallback(() => {
    setHistory([]);
    storage.setStore(SUGGESTIONS_STORAGE_KEY, '[]');
  }, []);

  // Fetch explore suggestions on mount
  useEffect(() => {
    if (!username) return;
    setLoadingExplore(true);
    getSuggestionsFeedAPI(username).then(r => {
      if (r.ok && r.data) setExploreSuggestions(Array.isArray(r.data) ? r.data.slice(0, 4) : []);
      setLoadingExplore(false);
    }).catch(() => setLoadingExplore(false));
  }, [username]);

  // Fetch suggestions (dropdown) on debounced query change
  useEffect(() => {
    if (!debouncedQuery.trim()) {
      setSuggestions([]);
      setShowDropdown(false);
      setLoadingSuggestions(false);
      return;
    }
    setLoadingSuggestions(true);
    searchSuggestAPI(debouncedQuery, username || undefined).then(r => {
      if (r.ok && r.data) {
        const arr = Array.isArray(r.data) ? r.data : [];
        setSuggestions(arr);
        setShowDropdown(arr.length > 0);
      }
      setLoadingSuggestions(false);
    }).catch(() => setLoadingSuggestions(false));
  }, [debouncedQuery, username]);

  // Execute search
  const doSearch = useCallback(async (q: string) => {
    const trimmed = q.trim();
    if (!trimmed) return;
    saveHistory(trimmed);
    setSearched(true);
    setShowDropdown(false);
    setLoadingResults(true);
    setActiveTab('people');
    const [usersRes, generalRes] = await Promise.all([
      searchUsersAPI(trimmed, 20, username || undefined),
      searchGeneralAPI(trimmed, username || undefined),
    ]);
    if (usersRes.ok && usersRes.data) setSearchResults(Array.isArray(usersRes.data) ? usersRes.data : []);
    else setSearchResults([]);
    if (generalRes.ok && generalRes.data) setPostsResults(Array.isArray(generalRes.data) ? generalRes.data.filter((r: any) => r.type !== 'user') : []);
    else setPostsResults([]);
    setLoadingResults(false);
  }, [username, saveHistory]);

  const handleFollow = async (targetUsername: string) => {
    if (!username) { Alert.alert('Sign in', 'Log in to follow users'); return; }
    try {
      const statusRes = await getFollowStatusAPI(username, targetUsername);
      if (!statusRes.ok) return;
      const isOrg = statusRes.data?.profileType !== 'individual';
      const isConnected = statusRes.data?.status === 'following' || statusRes.data?.status === 'friended';

      if (isConnected) {
        const api = isOrg ? followAPI : friendAPI;
        await api(targetUsername, username, isOrg ? 'unfollow' : 'unfriend');
        setFollowing(prev => prev.filter(u => u !== targetUsername));
      } else {
        const api = isOrg ? followAPI : friendAPI;
        await api(targetUsername, username, isOrg ? 'follow' : 'friend');
        setFollowing(prev => [...prev, targetUsername]);
      }
    } catch (err) {
      console.error('handleFollow error:', err);
    }
  };

  const renderSuggestion = ({ item, index }: { item: any; index: number }) => {
    const isUser = item.username && !item.query;
    return (
      <TouchableOpacity
        style={[s.suggestRow, index === selectedIndex && { backgroundColor: isDark ? 'rgba(59,130,246,0.15)' : '#eff6ff' }]}
        onPress={() => {
          if (isUser) {
            inputRef.current?.blur();
            navigation.navigate('Profile', { username: item.username });
          } else {
            setQuery(item.query || item.text || '');
            doSearch(item.query || item.text || '');
          }
        }}
      >
        {isUser && item.profile_pic && (
          <Image source={{ uri: item.profile_pic }} style={s.suggestAvatar} />
        )}
        <View style={{ flex: 1 }}>
          <Text style={[s.suggestName, { color: colors.textPrimary }]}>
            {isUser ? `@${item.username}` : (item.query || item.text)}
          </Text>
          {item.fullname && <Text style={[s.suggestFull, { color: colors.textSecondary }]}>{item.fullname}</Text>}
        </View>
        <Ionicons name="arrow-forward" size={14} color={colors.textSecondary} />
      </TouchableOpacity>
    );
  };

  const renderUser = ({ item }: { item: UserProfile }) => {
    const isOwn = item.username === username;
    const isFollowing = following.includes(item.username);
    return (
      <TouchableOpacity style={s.userRow} onPress={() => navigation.navigate('Profile', { username: item.username })}>
        <Image source={{ uri: item.profile_pic || DEFAULT_PIC }} style={s.userAvatar} />
        <View style={{ flex: 1 }}>
          <Text style={[s.userName, { color: colors.textPrimary }]}>
            <HighlightMatch text={item.fullname || item.username} query={query} />
          </Text>
          <Text style={[s.userHandle, { color: colors.textSecondary }]}>
            <HighlightMatch text={`@${item.username}`} query={query} />
          </Text>
        </View>
        {!isOwn && (
          <TouchableOpacity
            style={[s.followBtn, { backgroundColor: isFollowing ? (isDark ? '#334155' : '#e5e7eb') : '#2563eb' }]}
            onPress={() => handleFollow(item.username)}
          >
            <Text style={[s.followText, { color: isFollowing ? colors.textSecondary : '#fff' }]}>
              {isFollowing ? 'Following' : 'Follow'}
            </Text>
          </TouchableOpacity>
        )}
      </TouchableOpacity>
    );
  };

  const renderPost = ({ item }: { item: Post }) => (
    <TouchableOpacity style={s.postRow} onPress={() => navigation.navigate('PostDetail', { postId: item.id })}>
      <View style={{ flex: 1 }}>
        <Text style={[s.postText, { color: colors.textPrimary }]} numberOfLines={2}>{item.text}</Text>
        <View style={{ flexDirection: 'row', gap: 12, marginTop: 4 }}>
          <Text style={[s.postMeta, { color: colors.textSecondary }]}>@{item.username}</Text>
          {item.created_at && <Text style={[s.postMeta, { color: colors.textSecondary }]}>{timeAgo(item.created_at)}</Text>}
        </View>
      </View>
    </TouchableOpacity>
  );

  const s = makeStyles(colors, isDark);
  const showExplore = !focused && !query.trim() && history.length === 0;

  return (
    <SafeAreaView edges={['top']} style={[s.safe, { backgroundColor: colors.background }]}>
      <View style={[s.headerBar, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}>
          <Ionicons name="arrow-back" size={22} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={[s.headerTitle, { color: colors.textPrimary }]}>Search</Text>
      </View>

      {/* Search bar wrapper matching web design */}
      <View style={s.searchContainer}>
        <View style={[s.searchBar, { backgroundColor: isDark ? '#1e293b' : '#f3f4f6', borderColor: colors.border }]}>
          <Ionicons name="search" size={18} color={colors.textSecondary} />
          <TextInput
            ref={inputRef}
            style={[s.searchInput, { color: colors.textPrimary }]}
            placeholder="Search people, topics, hashtags..."
            placeholderTextColor={colors.textSecondary}
            value={query}
            onChangeText={setQuery}
            onFocus={() => setFocused(true)}
            onBlur={() => setTimeout(() => setFocused(false), 200)}
            onSubmitEditing={() => doSearch(query)}
            returnKeyType="search"
            autoCapitalize="none"
            autoCorrect={false}
          />
          {query.length > 0 && (
            <TouchableOpacity onPress={() => { setQuery(''); setSearchResults([]); setSearched(false); setShowDropdown(false); }}>
              <Ionicons name="close" size={18} color={colors.textSecondary} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Dropdown suggestions */}
      {showDropdown && (
        <View style={[s.dropdown, { backgroundColor: colors.card, borderColor: colors.border }]}>
          {loadingSuggestions ? (
            <ActivityIndicator size="small" color={colors.primary} style={{ padding: 12 }} />
          ) : (
            <FlatList
              data={suggestions.slice(0, 8)}
              renderItem={renderSuggestion}
              keyExtractor={(_: any, i: number) => String(i)}
              keyboardShouldPersistTaps="handled"
            />
          )}
        </View>
      )}

      {/* Content */}
      {searched ? (
        <>
          {/* Result tabs */}
          <View style={[s.tabBar, { borderBottomColor: colors.border }]}>
            <TouchableOpacity style={[s.tab, activeTab === 'people' && { borderBottomColor: '#2563eb', borderBottomWidth: 2 }]} onPress={() => setActiveTab('people')}>
              <Text style={[s.tabText, { color: activeTab === 'people' ? '#2563eb' : colors.textSecondary }]}>People ({searchResults.length})</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[s.tab, activeTab === 'posts' && { borderBottomColor: '#2563eb', borderBottomWidth: 2 }]} onPress={() => setActiveTab('posts')}>
              <Text style={[s.tabText, { color: activeTab === 'posts' ? '#2563eb' : colors.textSecondary }]}>Posts ({postsResults.length})</Text>
            </TouchableOpacity>
          </View>
          {loadingResults ? (
            <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} />
          ) : activeTab === 'people' ? (
            <FlatList
              data={searchResults}
              renderItem={renderUser}
              keyExtractor={(item) => item.username}
              contentContainerStyle={s.listContent}
              keyboardShouldPersistTaps="handled"
              ListEmptyComponent={
                <View style={s.emptyState}>
                  <Ionicons name="search-outline" size={40} color={colors.textSecondary} />
                  <Text style={[s.emptyLabel, { color: colors.textSecondary }]}>No users found</Text>
                </View>
              }
            />
          ) : (
            <FlatList
              data={postsResults}
              renderItem={renderPost}
              keyExtractor={(item) => String(item.id)}
              contentContainerStyle={s.listContent}
              keyboardShouldPersistTaps="handled"
              ListEmptyComponent={
                <View style={s.emptyState}>
                  <Ionicons name="document-text-outline" size={40} color={colors.textSecondary} />
                  <Text style={[s.emptyLabel, { color: colors.textSecondary }]}>No posts found</Text>
                </View>
              }
            />
          )}
        </>
      ) : focused && history.length > 0 && !query.trim() ? (
        /* Search history */
        <View style={s.listContent}>
          <View style={s.historyHeader}>
            <Text style={[s.historyTitle, { color: colors.textSecondary }]}>Recent</Text>
            <TouchableOpacity onPress={clearHistory}>
              <Text style={{ fontSize: 12, fontWeight: '600', color: '#2563eb' }}>Clear all</Text>
            </TouchableOpacity>
          </View>
          {history.map((h, i) => (
            <TouchableOpacity key={i} style={s.historyRow} onPress={() => { setQuery(h); doSearch(h); }}>
              <Ionicons name="time-outline" size={16} color={colors.textSecondary} />
              <Text style={[s.historyText, { color: colors.textPrimary }]} numberOfLines={1}>{h}</Text>
              <TouchableOpacity onPress={() => removeHistory(h)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Ionicons name="close" size={14} color={colors.textSecondary} />
              </TouchableOpacity>
            </TouchableOpacity>
          ))}
        </View>
      ) : showExplore ? (
        /* Explore / Suggested creators */
        <View style={s.listContent}>
          <Text style={[s.sectionTitle, { color: colors.textSecondary }]}>Suggested Creators</Text>
          {loadingExplore ? (
            <ActivityIndicator color={colors.primary} style={{ marginTop: 20 }} />
          ) : (
            <View style={s.exploreGrid}>
              {exploreSuggestions.map(sug => {
                const isFollowing = following.includes(sug.username);
                return (
                  <TouchableOpacity key={sug.username} style={[s.exploreCard, { backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : '#f9fafb' }]} onPress={() => navigation.navigate('Profile', { username: sug.username })}>
                    <Image source={{ uri: sug.profile_pic || DEFAULT_PIC }} style={s.exploreAvatar} />
                    <Text style={[s.exploreName, { color: colors.textPrimary }]} numberOfLines={1}>{sug.fullname}</Text>
                    <Text style={[s.exploreUser, { color: colors.textSecondary }]} numberOfLines={1}>@{sug.username}</Text>
                    {sug.username !== username && (
                      <TouchableOpacity
                        style={[s.exploreFollow, { backgroundColor: isFollowing ? (isDark ? '#334155' : '#e5e7eb') : '#2563eb' }]}
                        onPress={() => handleFollow(sug.username)}
                      >
                        <Text style={[s.exploreFollowText, { color: isFollowing ? colors.textSecondary : '#fff' }]}>
                          {isFollowing ? 'Following' : 'Follow'}
                        </Text>
                      </TouchableOpacity>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
          {exploreSuggestions.length === 0 && !loadingExplore && (
            <View style={s.emptyState}>
              <Ionicons name="compass-outline" size={40} color={colors.textSecondary} />
              <Text style={[s.emptyLabel, { color: colors.textSecondary }]}>Start searching to discover people</Text>
            </View>
          )}
        </View>
      ) : null}
    </SafeAreaView>
  );
}

const makeStyles = (colors: any, isDark: boolean) => StyleSheet.create({
  safe: { flex: 1 },
  headerBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, height: 56, borderBottomWidth: StyleSheet.hairlineWidth },
  backBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center', marginRight: 4 },
  headerTitle: { fontSize: 18, fontWeight: '800' },
  searchContainer: { paddingHorizontal: 16, paddingVertical: 8 },
  searchBar: {
    flexDirection: 'row', alignItems: 'center', borderRadius: 16,
    borderWidth: 1, paddingHorizontal: 12, height: 46, gap: 8,
  },
  searchInput: { flex: 1, fontSize: 14 },
  dropdown: {
    marginHorizontal: 16, borderRadius: 16, borderWidth: 1, maxHeight: 320,
    elevation: 8, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 12,
  },
  suggestRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14, paddingVertical: 10 },
  suggestAvatar: { width: 32, height: 32, borderRadius: 16 },
  suggestName: { fontSize: 13, fontWeight: '600' },
  suggestFull: { fontSize: 11 },
  tabBar: { flexDirection: 'row', paddingHorizontal: 16, borderBottomWidth: StyleSheet.hairlineWidth },
  tab: { paddingVertical: 10, paddingHorizontal: 4, marginRight: 20 },
  tabText: { fontSize: 14, fontWeight: '600' },
  listContent: { paddingHorizontal: 16, paddingBottom: 100 },
  userRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
  userAvatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.border },
  userName: { fontSize: 15, fontWeight: '700' },
  userHandle: { fontSize: 13, marginTop: 1 },
  followBtn: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20 },
  followText: { fontSize: 12, fontWeight: '700' },
  historyHeader: { flexDirection: 'row', alignItems: 'center', justifyView: 'space-between', marginTop: 16, marginBottom: 8 },
  historyTitle: { fontSize: 10, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.5 },
  historyRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10 },
  historyText: { flex: 1, fontSize: 14 },
  sectionTitle: { fontSize: 10, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 16, marginBottom: 12 },
  exploreGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  exploreCard: { width: '48%', borderRadius: 16, padding: 14, alignItems: 'center', gap: 4 },
  exploreAvatar: { width: 56, height: 56, borderRadius: 28, marginBottom: 4 },
  exploreName: { fontSize: 13, fontWeight: '700', textAlign: 'center' },
  exploreUser: { fontSize: 11, textAlign: 'center' },
  exploreFollow: { marginTop: 6, paddingHorizontal: 16, paddingVertical: 6, borderRadius: 20 },
  exploreFollowText: { fontSize: 11, fontWeight: '700' },
  emptyState: { alignItems: 'center', paddingTop: 60 },
  emptyLabel: { fontSize: 14, marginTop: 8 },
  postRow: { paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
  postText: { fontSize: 14, lineHeight: 20 },
  postMeta: { fontSize: 12 },
});
