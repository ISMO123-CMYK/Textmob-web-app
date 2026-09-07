import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  ScrollView, Dimensions, Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../context/AuthContext';
import { apiGet } from '../../api/client';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const TILE_SIZE = (SCREEN_WIDTH - 64) / 3;

interface TileDef {
  icon: string;
  label: string;
  screen: string;
  badge?: number;
  badgeColor?: string;
  sub?: string;
}

export default function HomeLauncherScreen({ navigation }: { navigation: any }) {
  const { username } = useAuth();
  const [unreadMessages, setUnreadMessages] = useState(0);
  const [activeLive, setActiveLive] = useState(0);
  const [unreadNotifs, setUnreadNotifs] = useState(0);
  const scrollRef = useRef<ScrollView>(null);
  const [currentPage, setCurrentPage] = useState(0);

  useEffect(() => {
    if (!username) return;
    apiGet('/api/louda-unread?username=' + encodeURIComponent(username)).then((d: any) => {
      if (d && typeof d.unread === 'number') setUnreadMessages(d.unread);
    }).catch(() => {});
    apiGet('/get-notifications?username=' + encodeURIComponent(username)).then((list: any) => {
      if (Array.isArray(list)) setUnreadNotifs(list.filter((n: any) => !n.read).length);
    }).catch(() => {});
    apiGet('/get-live-posts?username=' + encodeURIComponent(username)).then((data: any) => {
      const rooms = Array.isArray(data) ? data : [];
      setActiveLive(rooms.length);
    }).catch(() => {});
  }, [username]);

  const navigate = useCallback((screen: string, params?: any) => {
    navigation.navigate(screen, params);
  }, [navigation]);

  const tiles: TileDef[] = [
    { icon: 'chatbubbles', label: 'Discussions', screen: 'Discussions' },
    { icon: 'home', label: 'Feed', screen: 'Home' },
    { icon: 'videocam', label: 'Snaps', screen: 'Snaps' },
    { icon: 'chatbubbles', label: 'Messages', screen: 'Chats', badge: unreadMessages || undefined },
    { icon: 'radio', label: 'Live', screen: 'CreateLive', badge: activeLive || undefined, badgeColor: activeLive > 0 ? '#ef4444' : undefined, sub: activeLive > 0 ? `${activeLive} active` : undefined },
    { icon: 'search', label: 'Discover', screen: 'Search' },
    { icon: 'trophy', label: 'Hall of Fame', screen: 'HallOfFame' },
    { icon: 'wallet', label: 'Wallet', screen: 'Wallet' },
    { icon: 'create', label: 'Create', screen: 'CreatePost' },
    { icon: 'bookmark', label: 'Saved', screen: 'SavedPosts' },
    { icon: 'notifications', label: 'Activity', screen: 'Activity', badge: unreadNotifs || undefined },
    { icon: 'person', label: 'Profile', screen: 'Profile', params: { username } },
    { icon: 'settings', label: 'Settings', screen: 'AccountsCenter' },
  ];

  const PAGE_SIZE = 9;
  const pages: TileDef[][] = [];
  for (let i = 0; i < tiles.length; i += PAGE_SIZE) {
    pages.push(tiles.slice(i, i + PAGE_SIZE));
  }

  const onScroll = useCallback((e: any) => {
    const page = Math.round(e.nativeEvent.contentOffset.x / SCREEN_WIDTH);
    setCurrentPage(page);
  }, []);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Image source={require('../../assets/defaultbackg.jpg')} style={styles.bgImage} resizeMode="cover" />
      <View style={styles.overlay} />

      <View style={styles.outer}>
        <ScrollView
          ref={scrollRef}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onScroll={onScroll}
          scrollEventThrottle={16}
          style={styles.scrollView}
        >
          {pages.map((page, pi) => (
            <View key={pi} style={[styles.page, { width: SCREEN_WIDTH }]}>
              <View style={styles.grid}>
                {page.map((tile, ti) => (
                  <TouchableOpacity
                    key={ti}
                    style={styles.tile}
                    activeOpacity={0.7}
                    onPress={() => navigate(tile.screen, tile.params)}
                  >
                    <View style={styles.iconWrap}>
                      <Ionicons name={tile.icon as any} size={28} color="rgba(255,255,255,0.9)" />
                      {tile.badge && tile.badge > 0 && (
                        <View style={styles.badge}>
                          <Text style={styles.badgeText}>{tile.badge > 99 ? '99+' : tile.badge}</Text>
                        </View>
                      )}
                      {tile.badgeColor && (
                        <View style={[styles.dotBadge, { backgroundColor: tile.badgeColor }]} />
                      )}
                    </View>
                    <Text style={styles.tileLabel} numberOfLines={1}>{tile.label}</Text>
                    {tile.sub && <Text style={styles.tileSub} numberOfLines={1}>{tile.sub}</Text>}
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          ))}
        </ScrollView>

        {pages.length > 1 && (
          <View style={styles.dotsWrap}>
            <View style={styles.dots}>
              {pages.map((_, i) => (
                <View
                  key={i}
                  style={[styles.dot, i === currentPage && styles.dotActive]}
                />
              ))}
            </View>
            <Text style={styles.swipeHint}>Swipe to see more</Text>
          </View>
        )}

        {activeLive > 0 && (
          <TouchableOpacity
            style={styles.liveBanner}
            onPress={() => navigate('Home')}
            activeOpacity={0.8}
          >
            <View style={styles.liveDot} />
            <Text style={styles.liveText}>Live Now</Text>
            <Text style={styles.liveCount}>{activeLive} room{activeLive !== 1 ? 's' : ''}</Text>
          </TouchableOpacity>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  bgImage: { ...StyleSheet.absoluteFillObject, width: '100%', height: '100%' },
  overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.4)' },
  outer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scrollView: { flex: 1 },
  page: { justifyContent: 'center', alignItems: 'center' },
  grid: {
    flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center',
    gap: 16, paddingHorizontal: 24, width: '100%',
  },
  tile: {
    width: TILE_SIZE, alignItems: 'center', gap: 6,
  },
  iconWrap: {
    width: 72, height: 72, borderRadius: 22,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
  },
  badge: {
    position: 'absolute', top: -6, right: -6,
    minWidth: 20, height: 20, borderRadius: 10,
    backgroundColor: '#ef4444', paddingHorizontal: 5,
    alignItems: 'center', justifyContent: 'center',
  },
  badgeText: { color: '#fff', fontSize: 10, fontWeight: '900' },
  dotBadge: {
    position: 'absolute', top: -2, right: -2,
    width: 12, height: 12, borderRadius: 6,
    borderWidth: 2, borderColor: 'transparent',
  },
  tileLabel: { fontSize: 11, fontWeight: '600', color: 'rgba(255,255,255,0.7)', textAlign: 'center' },
  tileSub: { fontSize: 9, color: 'rgba(255,255,255,0.4)', textAlign: 'center', marginTop: -2 },
  dotsWrap: { alignItems: 'center', gap: 4, paddingBottom: 8 },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: 6 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.3)' },
  dotActive: { width: 16, backgroundColor: '#fff' },
  swipeHint: { fontSize: 10, color: 'rgba(255,255,255,0.3)' },
  liveBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    marginHorizontal: 24, marginBottom: 12, padding: 12,
    backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 16,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
  },
  liveDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#ef4444' },
  liveText: { fontSize: 12, fontWeight: '700', color: 'rgba(255,255,255,0.8)' },
  liveCount: { fontSize: 11, color: 'rgba(255,255,255,0.4)', marginLeft: 'auto' },
});
