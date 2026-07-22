import React, { useState, useEffect } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  ActivityIndicator, Image, Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { apiGet } from '../../api/client';
import GiftCoinsModal from '../../components/GiftCoinsModal';

const DEFAULT_PIC = 'https://res.cloudinary.com/dzvm9xe1i/image/upload/v1746095979/profile-pictures/e2st5nispbicnhnir9cf.jpg';

const MEDALS = [
  { label: 'GOLD TIER', lc: '#f59e0b', bg: '#fef3c7', ring: '#f59e0b' },
  { label: 'SILVER TIER', lc: '#9ca3af', bg: '#f3f4f6', ring: '#9ca3af' },
  { label: 'BRONZE TIER', lc: '#d97706', bg: '#ffedd5', ring: '#d97706' },
];

const TIPS = [
  { icon: 'create-outline' as const, title: 'Post with purpose', desc: 'Quality beats quantity. Substance gets rewarded.' },
  { icon: 'chatbubble-ellipses-outline' as const, title: 'Be the reply they needed', desc: 'Thoughtful comments do more than likes.' },
  { icon: 'people-outline' as const, title: 'Grow your circle', desc: 'Every connection boosts your network score.' },
];

export default function HallOfFameScreen({ navigation }: { navigation: any }) {
  const { colors, isDark } = useTheme();
  const { username } = useAuth();

  const [leaders, setLeaders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [showRankTips, setShowRankTips] = useState(false);
  const [expandedRank, setExpandedRank] = useState<number | null>(null);
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
        setLeaders(Array.isArray(list) ? list : []);
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

  const s = makeStyles(colors, isDark);

  return (
    <SafeAreaView edges={['top']} style={[s.safe, { backgroundColor: colors.background }]}>
      <View style={[s.header, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={{ marginRight: 12, padding: 4 }}>
          <Ionicons name="arrow-back" size={22} color={colors.textPrimary} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={[s.headerTitle, { color: colors.textPrimary }]}>Hall of Fame</Text>
          <Text style={{ fontSize: 11, color: colors.textSecondary, marginTop: 1 }}>The elite minds leading Textmob this week</Text>
        </View>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <TouchableOpacity onPress={() => loadLeaders(true)} style={s.headerBtn}>
            <Ionicons name="refresh-outline" size={20} color={colors.textSecondary} />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setShowRankTips(true)} style={s.tipsBtn}>
            <Text style={s.tipsBtnText}>How to Rank</Text>
          </TouchableOpacity>
        </View>
      </View>

      {loading ? (
        <View style={{ padding: 16, gap: 12 }}>
          {[0, 1, 2, 3].map(i => <View key={i} style={{ height: 60, borderRadius: 16, backgroundColor: isDark ? '#1e293b' : '#f3f4f6' }} />)}
        </View>
      ) : (
        <FlatList
          data={leaders}
          keyExtractor={(item, i) => item.username || String(i)}
          contentContainerStyle={s.listContent}
          renderItem={({ item, index }) => {
            const medal = index < 3 ? MEDALS[index] : null;
            const isExpanded = expandedRank === index;
            const score = item.score7d ?? item.score ?? item.points ?? 0;
            const isMenuOpen = openMenuIdx === index;

            return (
              <View style={[s.leaderRow, { borderBottomColor: colors.border }]}>
                <View style={s.rowTop}>
                  <Text style={s.rankText}>#{index + 1}</Text>
                  <View style={[s.avatarContainer, medal && { borderColor: medal.ring, borderWidth: 2 }]}>
                    <Image source={{ uri: item.profile_pic || DEFAULT_PIC }} style={s.avatar} />
                  </View>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                      <Text style={[s.fullname, { color: colors.textPrimary }]} numberOfLines={1}>{item.fullname || item.username}</Text>
                      {medal && (
                        <View style={[s.medalBadge, { backgroundColor: medal.bg }]}>
                          <Text style={[s.medalText, { color: medal.lc }]}>{medal.label}</Text>
                        </View>
                      )}
                    </View>
                    <Text style={[s.userMeta, { color: colors.textSecondary }]}>
                      @{item.username}  ·  <Text style={{ fontWeight: '700', color: colors.textPrimary }}>{score} pts</Text>
                    </Text>
                  </View>

                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                    <TouchableOpacity
                      style={[s.evidenceBtn, isExpanded ? { backgroundColor: colors.textPrimary } : { borderColor: colors.border, borderWidth: 1 }]}
                      onPress={() => setExpandedRank(isExpanded ? null : index)}
                    >
                      <Text style={[s.evidenceBtnText, { color: isExpanded ? colors.background : colors.textPrimary }]}>Evidence</Text>
                      <Ionicons name="chevron-down" size={12} color={isExpanded ? colors.background : colors.textPrimary} style={isExpanded && { transform: [{ rotate: '180deg' }] }} />
                    </TouchableOpacity>

                    <TouchableOpacity style={s.menuTrigger} onPress={() => setOpenMenuIdx(isMenuOpen ? null : index)}>
                      <Ionicons name="ellipsis-vertical" size={16} color={colors.textSecondary} />
                    </TouchableOpacity>
                  </View>
                </View>

                {isMenuOpen && (
                  <View style={[s.rowMenu, { backgroundColor: colors.card, borderColor: colors.border }]}>
                    <TouchableOpacity style={s.menuItem} onPress={() => { setOpenMenuIdx(null); navigation.navigate('Profile', { username: item.username }); }}>
                      <Text style={{ fontSize: 12, fontWeight: '700', color: colors.textPrimary }}>View Profile</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={s.menuItem} onPress={() => { setOpenMenuIdx(null); setGiftTarget(item); }}>
                      <Text style={{ fontSize: 12, fontWeight: '700', color: '#2563eb' }}>Gift Mobcoins</Text>
                    </TouchableOpacity>
                  </View>
                )}

                {isExpanded && (
                  <View style={[s.evidenceBox, { backgroundColor: isDark ? '#1e293b' : '#f9fafb', borderColor: colors.border }]}>
                    <Text style={s.evidenceTitle}>WHY THEY RANKED</Text>
                    <Text style={[s.evidenceDesc, { color: colors.textSecondary }]}>
                      {item.evidence?.why || 'Maintained high authentic traction across discussions.'}
                    </Text>
                  </View>
                )}
              </View>
            );
          }}
          ListEmptyComponent={
            <View style={s.emptyState}>
              <Ionicons name="trophy-outline" size={48} color={colors.textSecondary} />
              <Text style={[s.emptyLabel, { color: colors.textSecondary }]}>No leaders yet</Text>
            </View>
          }
          ListFooterComponent={
            leaders.length > 0 ? (
              <Text style={s.footerNote}>Resets weekly · Authentic analytics processed strictly</Text>
            ) : null
          }
        />
      )}

      {/* Rank Tips Modal */}
      <Modal visible={showRankTips} transparent animationType="slide" onRequestClose={() => setShowRankTips(false)}>
        <View style={s.modalOverlay}>
          <View style={[s.modalContent, { backgroundColor: colors.card }]}>
            <View style={s.modalHeader}>
              <View>
                <Text style={[s.modalTitle, { color: colors.textPrimary }]}>Algorithmic Blueprints</Text>
                <Text style={{ fontSize: 11, color: colors.textSecondary }}>How scores are compounded</Text>
              </View>
              <TouchableOpacity onPress={() => setShowRankTips(false)}>
                <Ionicons name="close" size={20} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <View style={{ gap: 14, marginVertical: 20 }}>
              {TIPS.map((tip, i) => (
                <View key={i} style={s.tipRow}>
                  <View style={s.tipIconWrap}>
                    <Ionicons name={tip.icon} size={18} color="#2563eb" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[s.tipTitle, { color: colors.textPrimary }]}>{tip.title}</Text>
                    <Text style={{ fontSize: 11, color: colors.textSecondary, marginTop: 2 }}>{tip.desc}</Text>
                  </View>
                </View>
              ))}
            </View>

            <TouchableOpacity style={s.acknowledgeBtn} onPress={() => setShowRankTips(false)}>
              <Text style={s.acknowledgeText}>Acknowledge Blueprint</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Gift Coins Modal */}
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

const makeStyles = (colors: any, isDark: boolean) => StyleSheet.create({
  safe: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', height: 60, paddingHorizontal: 16, borderBottomWidth: StyleSheet.hairlineWidth },
  headerTitle: { fontSize: 18, fontWeight: '800' },
  headerBtn: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  tipsBtn: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 12, backgroundColor: colors.textPrimary },
  tipsBtnText: { color: colors.background, fontSize: 12, fontWeight: '700' },
  listContent: { paddingBottom: 100 },
  leaderRow: { borderBottomWidth: StyleSheet.hairlineWidth, paddingVertical: 12, paddingHorizontal: 16 },
  rowTop: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  rankText: { fontSize: 13, fontWeight: '800', width: 24, textAlign: 'center' },
  avatarContainer: { width: 40, height: 40, borderRadius: 20, overflow: 'hidden' },
  avatar: { width: '100%', height: '100%' },
  fullname: { fontSize: 13, fontWeight: '700' },
  medalBadge: { paddingHorizontal: 6, paddingVertical: 1, borderRadius: 6 },
  medalText: { fontSize: 8, fontWeight: '800' },
  userMeta: { fontSize: 11, marginTop: 2, fontFamily: 'monospace' },
  evidenceBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 12 },
  evidenceBtnText: { fontSize: 11, fontWeight: '700' },
  menuTrigger: { padding: 4 },
  rowMenu: { flexDirection: 'row', gap: 8, justifyContent: 'flex-end', marginTop: 8, padding: 8, borderRadius: 8, borderWidth: 1 },
  menuItem: { paddingHorizontal: 10, paddingVertical: 4 },
  evidenceBox: { marginTop: 10, padding: 12, borderRadius: 12, borderWidth: 1 },
  evidenceTitle: { fontSize: 9, fontWeight: '800', color: '#9ca3af', letterSpacing: 0.5 },
  evidenceDesc: { fontSize: 12, marginTop: 4, lineHeight: 16 },
  emptyState: { alignItems: 'center', paddingTop: 100 },
  emptyLabel: { fontSize: 14, marginTop: 8 },
  footerNote: { fontSize: 10, fontWeight: '700', textAlign: 'center', marginVertical: 20, color: '#9ca3af', textTransform: 'uppercase' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingBottom: 40 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  modalTitle: { fontSize: 15, fontWeight: '800' },
  tipRow: { flexDirection: 'row', gap: 12 },
  tipIconWrap: { width: 36, height: 36, borderRadius: 10, backgroundColor: '#eff6ff', alignItems: 'center', justifyContent: 'center' },
  tipTitle: { fontSize: 13, fontWeight: '700' },
  acknowledgeBtn: { backgroundColor: '#2563eb', height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginTop: 10 },
  acknowledgeText: { color: '#fff', fontSize: 13, fontWeight: '700' },
});
