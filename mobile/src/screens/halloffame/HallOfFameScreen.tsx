import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  Image, Modal, Pressable,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { apiGet } from '../../api/client';
import GiftCoinsModal from '../../components/GiftCoinsModal';

const AVATAR_COLORS = ['#2563eb', '#7c3aed', '#db2777', '#d97706', '#059669', '#0891b2', '#dc2626'];

function avatarColor(username: string): string {
  let h = 0;
  for (let i = 0; i < (username || '').length; i++) h = (h * 31 + username.charCodeAt(i)) >>> 0;
  return AVATAR_COLORS[h % AVATAR_COLORS.length];
}

function getInitials(fullname?: string, username?: string): string {
  if (fullname) {
    const parts = fullname.trim().split(' ');
    return parts.length > 1 ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase() : parts[0][0].toUpperCase();
  }
  return (username || '?')[0].toUpperCase();
}

function formatCount(n: number): string {
  if (n >= 1000) {
    const k = n / 1000;
    return (k >= 10 ? k.toFixed(0) : k.toFixed(1).replace(/\.0$/, '')) + 'K';
  }
  return String(n);
}

const MEDALS = [
  { label: 'GOLD', lc: '#f59e0b', bg: 'rgba(245,158,11,0.12)', ring: '#f59e0b', cardBorder: 'rgba(245,158,11,0.3)', numBg: ['#f59e0b', '#d97706'] as const },
  { label: 'SILVER', lc: '#94a3b8', bg: 'rgba(148,163,184,0.12)', ring: '#94a3b8', cardBorder: 'rgba(148,163,184,0.2)', numBg: ['#cbd5e1', '#94a3b8'] as const },
  { label: 'BRONZE', lc: '#f97316', bg: 'rgba(249,115,22,0.12)', ring: '#f97316', cardBorder: 'rgba(249,115,22,0.2)', numBg: ['#fb923c', '#ea580c'] as const },
];

const TIPS = [
  { icon: 'heart-outline' as const, color: '#ec4899', title: 'Total likes', desc: 'Sum of likes on all your posts, all time.' },
  { icon: 'people-outline' as const, color: '#2563eb', title: 'Followers', desc: 'Each follower adds +1 to your score.' },
  { icon: 'trophy-outline' as const, color: '#f59e0b', title: 'Score', desc: 'Rank = total likes + followers. Top 5 only.' },
];

export default function HallOfFameScreen({ navigation }: { navigation: any }) {
  const { colors, isDark } = useTheme();
  const { username } = useAuth();
  const menuRefs = useRef<any>({});

  const [leaders, setLeaders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [showRankTips, setShowRankTips] = useState(false);
  const [giftTarget, setGiftTarget] = useState<any>(null);
  const [openMenuIdx, setOpenMenuIdx] = useState<number | null>(null);

  const loadLeaders = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError('');
    try {
      const res = await apiGet('/leaderboard');
      if (res.ok && res.data) {
        const list = res.data.leaderboard || res.data;
        const arr = Array.isArray(list) ? list : [];
        setLeaders(arr.slice(0, 5));
      } else {
        setError('Failed to load leaderboard');
      }
    } catch {
      setError('Network error');
    }
    setLoading(false);
    setRefreshing(false);
  };

  useEffect(() => { loadLeaders(); }, []);

  const s = makeStyles();

  const renderLeader = ({ item, index }: { item: any; index: number }) => {
    const medal = index < 3 ? MEDALS[index] : null;
    const totalLikes = item.totalLikes ?? 0;
    const followersCount = item.followersCount ?? 0;
    const isMenuOpen = openMenuIdx === index;

    return (
      <View style={[s.card, index === 0 && s.cardGold]}>
        <View style={s.rowTop}>
          {/* Rank */}
          <View style={s.rankWrap}>
            {index === 0 ? (
              <View>
                <Ionicons name="trophy" size={14} color="#f59e0b" style={{ marginBottom: 1 }} />
                <Text style={s.rankGold}>1</Text>
              </View>
            ) : medal ? (
              <View style={[s.rankCircle, { backgroundColor: medal.numBg[0] }]}>  
                <Text style={s.rankCircleText}>{index + 1}</Text>
              </View>
            ) : (
              <Text style={s.rankPlain}>{index + 1}</Text>
            )}
          </View>

          {/* Avatar */}
          <View style={[s.avatarWrap, medal && { borderColor: medal.ring, borderWidth: 2 }]}>
            {(item.avatar || item.profile_pic) ? (
              <Image source={{ uri: item.avatar || item.profile_pic }} style={s.avatar} />
            ) : (
              <View style={[s.avatar, { backgroundColor: avatarColor(item.username), alignItems: 'center', justifyContent: 'center' }]}>
                <Text style={{ color: '#fff', fontSize: 12, fontWeight: '800' }}>{getInitials(item.fullname, item.username)}</Text>
              </View>
            )}
          </View>

          {/* Name + menu */}
          <View style={{ flex: 1, minWidth: 0 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={s.fullname} numberOfLines={1}>{item.fullname || item.username}</Text>
                <Text style={s.username} numberOfLines={1}>@{item.username}</Text>
              </View>
              <TouchableOpacity style={s.menuTrigger} onPress={() => setOpenMenuIdx(isMenuOpen ? null : index)}>
                <Ionicons name="ellipsis-vertical" size={14} color="#64748b" />
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Stats row — below */}
        <View style={s.statsRow}>
          <View style={s.stat}>
            <Ionicons name="heart" size={11} color="#ec4899" />
            <Text style={s.statValue}>{formatCount(totalLikes)}</Text>
            <Text style={s.statLabel}>Likes</Text>
          </View>
          <View style={s.stat}>
            <Ionicons name="people" size={11} color="#2563eb" />
            <Text style={s.statValue}>{formatCount(followersCount)}</Text>
            <Text style={s.statLabel}>Followers</Text>
          </View>
        </View>

        {isMenuOpen && (
          <View style={[s.rowMenu, { backgroundColor: '#162033', borderColor: '#243352' }]}>
            <TouchableOpacity style={s.menuItem} onPress={() => { setOpenMenuIdx(null); navigation.navigate('Profile', { username: item.username }); }}>
              <Text style={{ fontSize: 11, fontWeight: '700', color: '#e2e8f0' }}>View profile</Text>
            </TouchableOpacity>
            <TouchableOpacity style={s.menuItem} onPress={() => { setOpenMenuIdx(null); setGiftTarget(item); }}>
              <Text style={{ fontSize: 11, fontWeight: '700', color: '#60a5fa' }}>Gift Mobcoins</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView edges={['top']} style={s.safe}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}>
          <Ionicons name="arrow-back" size={18} color="#e2e8f0" />
        </TouchableOpacity>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}>
          <View style={s.headerIcon}>
            <Ionicons name="trophy" size={14} color="#fff" />
          </View>
          <View>
            <Text style={s.headerTitle}>Hall of Fame</Text>
            <Text style={s.headerSub}>Top 5 · by likes + followers · all time</Text>
          </View>
        </View>
        <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }}>
          <TouchableOpacity onPress={() => loadLeaders(true)} style={s.headerBtn}>
            <Ionicons name="refresh-outline" size={16} color="#94a3b8" />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setShowRankTips(true)} style={s.tipsBtn}>
            <Ionicons name="information-circle-outline" size={14} color="#94a3b8" />
            <Text style={s.tipsBtnText}>How to rank</Text>
          </TouchableOpacity>
        </View>
      </View>

      {loading ? (
        <View style={{ padding: 12, gap: 10 }}>
          {[0, 1, 2, 3, 4].map(i => <View key={i} style={{ height: 72, borderRadius: 16, backgroundColor: '#0f1a2e' }} />)}
        </View>
      ) : error ? (
        <Text style={{ padding: 20, textAlign: 'center', color: '#f87171', fontSize: 12, fontWeight: '600' }}>{error}</Text>
      ) : (
        <FlatList
          data={leaders}
          keyExtractor={(item, i) => item.username || String(i)}
          contentContainerStyle={{ padding: 12, paddingBottom: 40, gap: 10 }}
          renderItem={renderLeader}
          ListEmptyComponent={
            <View style={{ alignItems: 'center', paddingTop: 60, paddingHorizontal: 24 }}>
              <View style={{ width: 44, height: 44, borderRadius: 16, backgroundColor: '#0f1a2e', alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}>
                <Ionicons name="trophy-outline" size={22} color="#64748b" />
              </View>
              <Text style={{ fontSize: 13, fontWeight: '700', color: '#94a3b8' }}>No entries yet</Text>
              <Text style={{ fontSize: 11, color: '#64748b', marginTop: 4 }}>Be the first to claim a spot.</Text>
            </View>
          }
          ListFooterComponent={
            leaders.length > 0 ? null : null
          }
        />
      )}

      {/* How to rank modal */}
      <Modal visible={showRankTips} transparent animationType="fade" onRequestClose={() => setShowRankTips(false)}>
        <View style={s.modalOverlay}>
          <View style={s.modalContent}>
            <View style={s.modalHeader}>
              <View>
                <Text style={s.modalTitle}>How to rank</Text>
                <Text style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>Likes + followers</Text>
              </View>
              <TouchableOpacity onPress={() => setShowRankTips(false)} style={s.modalClose}>
                <Ionicons name="close" size={16} color="#94a3b8" />
              </TouchableOpacity>
            </View>
            <View style={{ gap: 8, marginVertical: 14 }}>
              {TIPS.map((tip, i) => (
                <View key={i} style={s.tipRow}>
                  <View style={s.tipIconWrap}>
                    <Ionicons name={tip.icon} size={16} color={tip.color} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={s.tipTitle}>{tip.title}</Text>
                    <Text style={{ fontSize: 11, color: '#64748b', marginTop: 2, lineHeight: 14 }}>{tip.desc}</Text>
                  </View>
                </View>
              ))}
            </View>
            <TouchableOpacity style={s.acknowledgeBtn} onPress={() => setShowRankTips(false)}>
              <Text style={s.acknowledgeText}>Got it</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <GiftCoinsModal
        visible={!!giftTarget}
        onClose={() => setGiftTarget(null)}
        recipientUsername={giftTarget?.username || ''}
        recipientFullname={giftTarget?.fullname}
        recipientAvatar={giftTarget?.profile_pic}
      />
    </SafeAreaView>
  );
}

const makeStyles = () => StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#0a1121' },
  header: { flexDirection: 'row', alignItems: 'center', height: 56, paddingHorizontal: 12, gap: 8, backgroundColor: '#0a1121' },
  backBtn: { width: 32, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  headerIcon: { width: 32, height: 32, borderRadius: 10, backgroundColor: '#2563eb', alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 15, fontWeight: '800', color: '#fff', lineHeight: 18 },
  headerSub: { fontSize: 10, fontWeight: '500', color: '#64748b', lineHeight: 12, marginTop: 1 },
  headerBtn: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  tipsBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 20, borderWidth: 1, borderColor: '#334155' },
  tipsBtnText: { color: '#94a3b8', fontSize: 11, fontWeight: '700' },

  card: { backgroundColor: '#0f1a2e', borderWidth: 1, borderColor: '#1a2740', borderRadius: 14, padding: 10 },
  cardGold: { borderColor: 'rgba(245,158,11,0.3)' },
  rowTop: { flexDirection: 'row', alignItems: 'center', gap: 8 },

  rankWrap: { width: 22, alignItems: 'center', justifyContent: 'center' },
  rankGold: { fontSize: 9, fontWeight: '900', color: '#fff', textAlign: 'center' },
  rankCircle: { width: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  rankCircleText: { fontSize: 10, fontWeight: '800', color: '#fff' },
  rankPlain: { fontSize: 13, fontWeight: '800', color: '#475569', textAlign: 'center' },

  avatarWrap: { width: 38, height: 38, borderRadius: 19, overflow: 'hidden' },
  avatar: { width: '100%', height: '100%', borderRadius: 19 },

  fullname: { fontSize: 13, fontWeight: '700', color: '#fff' },
  medalBadge: { paddingHorizontal: 5, paddingVertical: 1.5, borderRadius: 6, borderWidth: 1 },
  medalText: { fontSize: 8, fontWeight: '800', letterSpacing: 0.5 },
  username: { fontSize: 11, color: '#64748b', marginTop: 2 },

  statsRow: { flexDirection: 'row', alignItems: 'center', gap: 16, marginTop: 8, marginLeft: 36 },
  stat: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  statValue: { fontSize: 11, fontWeight: '700', color: '#fff' },
  statLabel: { fontSize: 9, fontWeight: '500', color: '#475569' },

  menuTrigger: { padding: 4 },
  rowMenu: { flexDirection: 'row', gap: 6, justifyContent: 'flex-end', marginTop: 8, padding: 8, borderRadius: 12, borderWidth: 1 },
  menuItem: { paddingHorizontal: 12, paddingVertical: 6 },

  infoBanner: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#0f1a2e', borderWidth: 1, borderColor: '#1a2740', borderRadius: 16, padding: 12, marginTop: 14, gap: 10 },
  infoBannerIcon: { width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(37,99,235,0.2)', alignItems: 'center', justifyContent: 'center' },
  infoBannerTitle: { fontSize: 11, fontWeight: '700', color: '#60a5fa' },
  infoBannerSub: { fontSize: 10, color: '#475569', marginTop: 2 },
  infoBannerRight: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  infoBannerRightText: { fontSize: 9, fontWeight: '600', color: '#64748b' },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', padding: 20 },
  modalContent: { backgroundColor: '#0f1a2e', borderRadius: 20, padding: 20, borderWidth: 1, borderColor: '#1a2740' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  modalClose: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.05)' },
  modalTitle: { fontSize: 14, fontWeight: '800', color: '#fff' },

  tipRow: { flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
  tipIconWrap: { width: 32, height: 32, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.05)', alignItems: 'center', justifyContent: 'center' },
  tipTitle: { fontSize: 12, fontWeight: '700', color: '#fff' },

  acknowledgeBtn: { backgroundColor: '#2563eb', height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginTop: 8 },
  acknowledgeText: { color: '#fff', fontSize: 13, fontWeight: '700' },
});
