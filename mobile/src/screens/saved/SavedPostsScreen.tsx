import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../context/ThemeContext';
import { useNavigation } from '@react-navigation/native';
import { apiPost } from '../../api/client';

const SAVED_KEY = 'textmob_saved_posts';
const DEFAULT_PIC = 'https://res.cloudinary.com/dzvm9xe1i/image/upload/v1746095979/profile-pictures/e2st5nispbicnhnir9cf.jpg';
const TIME_AGO = (d: string) => {
  if (!d) return '';
  const diff = Date.now() - new Date(d).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return mins + 'm';
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return hrs + 'h';
  const days = Math.floor(hrs / 24);
  return days + 'd';
};

function getSavedIds(): string[] {
  try {
    const raw = JSON.parse((global as any).__storage_cache?.[SAVED_KEY] || '[]');
    if (Array.isArray(raw)) return raw.map(String);
  } catch {}
  try {
    const raw = require('@react-native-async-storage/async-storage').default;
    return [];
  } catch { return []; }
}

export default function SavedPostsScreen() {
  const { colors, isDark } = useTheme();
  const navigation = useNavigation<any>();
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSaved();
  }, []);

  const loadSaved = async () => {
    try {
      const AsyncStorage = require('@react-native-async-storage/async-storage').default;
      const raw = await AsyncStorage.getItem(SAVED_KEY);
      const ids: string[] = raw ? JSON.parse(raw) : [];
      if (!Array.isArray(ids) || ids.length === 0) {
        setPosts([]);
        setLoading(false);
        return;
      }
      const res = await apiPost('/get-posts-by-ids', { ids: ids.map(String) });
      if (res && Array.isArray(res)) setPosts(res);
      else setPosts([]);
    } catch { setPosts([]); }
    setLoading(false);
  };

  const removeSaved = async (postId: string) => {
    try {
      const AsyncStorage = require('@react-native-async-storage/async-storage').default;
      const raw = await AsyncStorage.getItem(SAVED_KEY);
      let ids: string[] = raw ? JSON.parse(raw) : [];
      ids = ids.filter(id => String(id) !== String(postId));
      await AsyncStorage.setItem(SAVED_KEY, JSON.stringify(ids));
      setPosts(prev => prev.filter(p => String(p.id) !== String(postId)));
    } catch {}
  };

  const renderPost = ({ item }: { item: any }) => (
    <TouchableOpacity
      style={[styles.postCard, { backgroundColor: colors.card, borderColor: colors.border }]}
      activeOpacity={0.7}
      onPress={() => navigation.navigate('PostDetail', { postId: String(item.id) })}
    >
      <View style={styles.postHeader}>
        <Image source={{ uri: item.profile_pic || DEFAULT_PIC }} style={styles.avatar} />
        <View style={styles.postHeaderInfo}>
          <Text style={[styles.username, { color: colors.textPrimary }]} numberOfLines={1}>
            @{item.username}
          </Text>
          <Text style={[styles.timeAgo, { color: colors.textSecondary }]}>{TIME_AGO(item.created_at)}</Text>
        </View>
        <TouchableOpacity onPress={() => removeSaved(item.id)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Ionicons name="bookmark" size={20} color={colors.primary} />
        </TouchableOpacity>
      </View>
      {item.text ? <Text style={[styles.postText, { color: colors.textPrimary }]} numberOfLines={4}>{item.text}</Text> : null}
      {item.media && item.media.length > 0 && (
        <Image source={{ uri: item.media[0] }} style={styles.postImage} resizeMode="cover" />
      )}
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Saved Posts</Text>
        <View style={{ width: 32 }} />
      </View>

      {loading ? (
        <View style={styles.center}>
          <Ionicons name="hourglass-outline" size={32} color={colors.textSecondary} />
        </View>
      ) : posts.length === 0 ? (
        <View style={styles.center}>
          <Ionicons name="bookmark-outline" size={48} color={colors.textSecondary} />
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>No saved posts yet</Text>
          <Text style={[styles.emptySub, { color: colors.textSecondary }]}>Tap the bookmark icon on any post to save it here</Text>
        </View>
      ) : (
        <FlatList
          data={posts}
          keyExtractor={item => String(item.id)}
          renderItem={renderPost}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1,
  },
  backBtn: { padding: 4 },
  headerTitle: { fontSize: 16, fontWeight: '700' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8 },
  list: { padding: 16, gap: 12 },
  postCard: { borderRadius: 16, padding: 14, borderWidth: 1 },
  postHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
  avatar: { width: 36, height: 36, borderRadius: 18 },
  postHeaderInfo: { flex: 1 },
  username: { fontSize: 13, fontWeight: '700' },
  timeAgo: { fontSize: 11 },
  postText: { fontSize: 14, lineHeight: 20, marginBottom: 8 },
  postImage: { width: '100%', height: 180, borderRadius: 12, marginTop: 4 },
  emptyText: { fontSize: 15, fontWeight: '600', marginTop: 8 },
  emptySub: { fontSize: 12, marginTop: 2 },
});
