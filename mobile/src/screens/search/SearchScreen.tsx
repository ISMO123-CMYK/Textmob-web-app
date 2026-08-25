import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  TextInput, Image, ActivityIndicator, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { searchUsersAPI, searchSuggestAPI, getSuggestionsFeedAPI, followAPI, friendAPI, UserProfile, SuggestedUser } from '../../api/users';
import { Post } from '../../api/posts';
import { apiGet } from '../../api/client';
import { storage, KEYS } from '../../utils/storage';
import { useNavigation } from '@react-navigation/native';
import PostCard from '../../components/PostCard';

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

  const inputRef = useRef<TextInput>(null);
  const debouncedQuery = useDebounce(query, 260);

  // Load search history
  useEffect(() => {
    storage.getStore(SUGGESTIONS_STORAGE_KEY).then(raw => {
      if (raw) try { setHistory(JSON.parse(raw)); } catch (e) { /* ignore */ }
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

  // Execute search
  const doSearch = useCallback(async (q: string) => {
    const trimmed = q.trim();
    if (!trimmed) return;
    saveHistory(trimmed);
    setSearched(true);
    setShowDropdown(false);
    setLoadingResults(true);
    setActiveTab('people');
    try {
      const res = await apiGet(`/general/search?query=${encodeURIComponent(trimmed)}&currentUsername=${encodeURIComponent(username || '')}`);
      if (res.ok && res.data) {
        const data = Array.isArray(res.data) ? res.data : [];
        setSearchResults(data.filter((r: any) => r.type === 'user'));
        setPostsResults(data.filter((r: any) => r.type === 'post' || r.type === 'snap' || r.type === 'event' || r.type === 'live' || r.type === 'live_ended'));
      }
    } catch (e) { /* ignore */ }
    setLoadingResults(false);
  }, [username, saveHistory]);

  // Keyboard navigation for dropdown
  const handleKeyDown = useCallback((key: string) => {
    const items = suggestions.slice(0, 8);
    if (key === 'ArrowDown') {
      setSelectedIndex(prev => Math.min(prev + 1, items.length - 1));
    } else if (key === 'ArrowUp') {
      setSelectedIndex(prev => Math.max(prev - 1, -1));
    } else if (key === 'Enter' && selectedIndex >= 0 && items[selectedIndex]) {
      const item = items[selectedIndex];
      if (item.username && !item.query) {
        navigation.navigate('Profile', { username: item.username });
      } else {
        setQuery(item.query || item.text || '');
        doSearch(item.query || item.text || '');
      }
    } else if (key === 'Escape') {
      setShowDropdown(false);
      inputRef.current?.blur();
    }
  }, [suggestions, selectedIndex, navigation, doSearch]);

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

  const handleRelationChange = async (targetUsername: string, action: string, profileType?: string) => {
    if (!username) { Alert.alert('Sign in', 'Log in to follow users'); return; }
    try {
      const isOrg = (profileType || '').toLowerCase() === 'organisation';
      const endpoint = isOrg ? followAPI : friendAPI;
      await endpoint(targetUsername, username, action);
      setSearchResults(prev => prev.map(item => {
        if (item.type === 'user' && item.username === targetUsername) {
          let nextRelation = 'not_friended';
          if (isOrg) {
            nextRelation = action === 'follow' ? 'following' : 'not_following';
          } else {
            nextRelation = action === 'friend' ? 'friended' : 'not_friended';
          }
          return { ...item, relation: nextRelation };
        }
        return item;
      }));
      setExploreSuggestions(prev => prev.map(item => {
        if (item.username === targetUsername) {
          let nextRelation = 'not_friended';
          if (isOrg) {
            nextRelation = action === 'follow' ? 'following' : 'not_following';
          } else {
            nextRelation = action === 'friend' ? 'friended' : 'not_friended';
          }
          return { ...item, relation: nextRelation };
        }
        return item;
      }));
    } catch (err) {
      console.error('Relation change error:', err);
    }
  };

  const getSuggestionType = (item: any) => {
    if (item.username && !item.query) return 'user';
    if (item.query?.startsWith('#') || item.text?.startsWith('#')) return 'hashtag';
    if (item.query?.startsWith('@') || item.text?.startsWith('@')) return 'mention';
    return 'topic';
  };

  const renderSuggestion = ({ item, index }: { item: any; index: number }) => {
    const type = getSuggestionType(item);
    const isUser = type === 'user';
    const iconName = isUser ? 'person-outline' : type === 'hashtag' ? 'pricetag-outline' : type === 'mention' ? 'at-outline' : 'search-outline';
    const iconColor = isUser ? '#2563eb' : type === 'hashtag' ? '#7c3aed' : type === 'mention' ? '#059669' : '#d97706';
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
        {isUser && item.profile_pic ? (
          <Image source={{ uri: item.profile_pic }} style={s.suggestAvatar} />
        ) : (
          <View style={[s.suggestIconWrap, { backgroundColor: iconColor + '20' }]}>
            <Ionicons name={iconName} size={16} color={iconColor} />
          </View>
        )}
        <View style={{ flex: 1 }}>
          <Text style={[s.suggestName, { color: colors.textPrimary }]}>
            {isUser ? `@${item.username}` : (item.query || item.text)}
          </Text>
          {item.fullname && <Text style={[s.suggestFull, { color: colors.textSecondary }]}>{item.fullname}</Text>}
        </View>
        <TouchableOpacity
          onPress={() => {
            const val = isUser ? `@${item.username}` : (item.query || item.text || '');
            setQuery(val);
          }}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="arrow-forward" size={14} color={colors.textSecondary} />
        </TouchableOpacity>
      </TouchableOpacity>
    );
  };

  const renderUser = ({ item }: { item: any }) => {
    const isOwn = item.username === username;
    const isOrg = (item.profile_type || '').toLowerCase() === 'organisation';
    const isConnected = item.relation === 'following' || item.relation === 'friended';
    const buttonText = isOrg ? (isConnected ? 'Following' : 'Follow') : (isConnected ? 'Friends' : 'Add Friend');
    const actionName = isOrg ? (isConnected ? 'unfollow' : 'follow') : (isConnected ? 'unfriend' : 'friend');
    return (
      <TouchableOpacity style={s.userRow} onPress={() => navigation.navigate('Profile', { username: item.username })}>
        <Image source={{ uri: item.profile_pic || DEFAULT_PIC }} style={s.userAvatar} />
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <Text style={[s.userName, { color: colors.textPrimary }]} numberOfLines={1}>
              <HighlightMatch text={item.fullname || item.username} query={query} />
            </Text>
            {isOrg && <Text style={{ fontSize: 9, fontWeight: '800', color: '#2563eb', borderWidth: 1, borderColor: '#bfdbfe', borderRadius: 4, paddingHorizontal: 4, paddingVertical: 1 }}>ORG</Text>}
          </View>
          <Text style={[s.userHandle, { color: colors.textSecondary }]}>
            <HighlightMatch text={`@${item.username}`} query={query} />
          </Text>
        </View>
        {!isOwn && (
          <TouchableOpacity
            style={[s.followBtn, { backgroundColor: isConnected ? (isDark ? '#334155' : '#e5e7eb') : '#2563eb' }]}
            onPress={() => handleRelationChange(item.username, actionName, item.profile_type)}
          >
            <Text style={[s.followText, { color: isConnected ? colors.textSecondary : '#fff' }]}>
              {buttonText}
            </Text>
          </TouchableOpacity>
        )}
      </TouchableOpacity>
    );
  };

  const renderPost = ({ item }: { item: Post }) => (
    <PostCard post={item} />
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
            onKeyPress={({ nativeEvent }) => handleKeyDown(nativeEvent.key)}
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
            <View style={{ padding: 12, gap: 8 }}>
              {[1, 2, 3].map(i => (
                <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: isDark ? '#334155' : '#e5e7eb' }} />
                  <View style={{ flex: 1, height: 12, borderRadius: 6, backgroundColor: isDark ? '#334155' : '#e5e7eb' }} />
                </View>
              ))}
            </View>
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
        /* Search history as pill chips */
        <View style={s.listContent}>
          <View style={s.historyHeader}>
            <Text style={[s.historyTitle, { color: colors.textSecondary }]}>Recent</Text>
            <TouchableOpacity onPress={clearHistory}>
              <Text style={{ fontSize: 12, fontWeight: '600', color: '#2563eb' }}>Clear all</Text>
            </TouchableOpacity>
          </View>
          <View style={s.historyPills}>
            {history.map((h, i) => (
              <View key={i} style={[s.pillRow, { backgroundColor: isDark ? '#1e293b' : '#f3f4f6' }]}>
                <TouchableOpacity style={s.pillTouch} onPress={() => { setQuery(h); doSearch(h); }}>
                  <Text style={[s.pillText, { color: colors.textPrimary }]} numberOfLines={1}>{h}</Text>
                  <Ionicons name="arrow-forward" size={12} color={colors.textSecondary} />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => removeHistory(h)} style={s.pillRemove}>
                  <Ionicons name="close" size={12} color={colors.textSecondary} />
                </TouchableOpacity>
              </View>
            ))}
          </View>
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
                const isOrg = (sug.profile_type || '').toLowerCase() === 'organisation';
                const isConnected = sug.relation === 'following' || sug.relation === 'friended';
                const btnText = isOrg ? (isConnected ? 'Following' : 'Follow') : (isConnected ? 'Friends' : 'Add Friend');
                const actName = isOrg ? (isConnected ? 'unfollow' : 'follow') : (isConnected ? 'unfriend' : 'friend');
                return (
                  <TouchableOpacity key={sug.username} style={[s.exploreCard, { backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : '#f9fafb' }]} onPress={() => navigation.navigate('Profile', { username: sug.username })}>
                    <Image source={{ uri: sug.profile_pic || DEFAULT_PIC }} style={s.exploreAvatar} />
                    <Text style={[s.exploreName, { color: colors.textPrimary }]} numberOfLines={1}>{sug.fullname}</Text>
                    <Text style={[s.exploreUser, { color: colors.textSecondary }]} numberOfLines={1}>@{sug.username}</Text>
                    {sug.username !== username && (
                      <TouchableOpacity
                        style={[s.exploreFollow, { backgroundColor: isConnected ? (isDark ? '#334155' : '#e5e7eb') : '#2563eb' }]}
                        onPress={() => handleRelationChange(sug.username, actName, sug.profile_type)}
                      >
                        <Text style={[s.exploreFollowText, { color: isConnected ? colors.textSecondary : '#fff' }]}>
                          {btnText}
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
  suggestIconWrap: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
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
  historyHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 16, marginBottom: 8 },
  historyTitle: { fontSize: 10, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.5 },
  historyPills: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 },
  pillRow: { flexDirection: 'row', alignItems: 'center', borderRadius: 20, overflow: 'hidden' },
  pillTouch: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingLeft: 14, paddingVertical: 8 },
  pillText: { fontSize: 13, fontWeight: '600', maxWidth: 160 },
  pillRemove: { paddingHorizontal: 8, paddingVertical: 8 },
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
