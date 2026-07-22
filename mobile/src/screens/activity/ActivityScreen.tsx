import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  ActivityIndicator, RefreshControl, Image, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { useNavigation } from '@react-navigation/native';
import {
  getNotificationsAPI, markNotificationReadAPI, deleteNotificationAPI,
  deleteAllNotificationsAPI, AppNotification,
} from '../../api/notifications';
import { timeAgo } from '../../utils/format';
import SafeHTML from '../../components/SafeHTML';

const DEFAULT_PIC = 'https://res.cloudinary.com/dzvm9xe1i/image/upload/v1746095979/profile-pictures/e2st5nispbicnhnir9cf.jpg';

const TYPE_COLORS: Record<string, string> = {
  like: '#ef4444',
  comment: '#2563eb',
  follow: '#10b981',
  mention: '#8b5cf6',
  react: '#f59e0b',
  gift: '#d97706',
  system: '#6b7280',
};

const TYPE_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  like: 'heart',
  comment: 'chatbubble',
  follow: 'person-add',
  mention: 'at',
  react: 'happy',
  gift: 'gift',
  system: 'information-circle',
};

export default function ActivityScreen() {
  const { colors, isDark } = useTheme();
  const { username } = useAuth();
  const navigation = useNavigation<any>();

  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [showConfirm, setShowConfirm] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  const fetchNotifications = useCallback(async () => {
    if (!username) { setLoading(false); return; }
    setError('');
    try {
      const res = await getNotificationsAPI(username);
      if (res.ok && res.data) {
        setNotifications(res.data);
      }
    } catch {
      setError('Failed to load notifications');
    }
    setLoading(false);
  }, [username]);

  useEffect(() => { fetchNotifications(); }, [fetchNotifications]);

  // Auto-poll every 30 seconds
  useEffect(() => {
    if (!username) return;
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, [username, fetchNotifications]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchNotifications();
    setRefreshing(false);
  };

  const handleDelete = async (id: string) => {
    if (!username) return;
    setNotifications(prev => prev.filter(n => n.id !== id));
    setOpenMenuId(null);
    await deleteNotificationAPI(username, id).catch(() => fetchNotifications());
  };

  const handleClearAll = async () => {
    if (!username) return;
    setClearing(true);
    setNotifications([]);
    setShowConfirm(false);
    await deleteAllNotificationsAPI(username).catch(() => fetchNotifications());
    setClearing(false);
  };

  const handleNavigate = (notif: AppNotification) => {
    if (!username || !notif.link) return;
    if (!notif.read) {
      markNotificationReadAPI(username, notif.id).catch(() => {});
      setNotifications(prev => prev.map(n => n.id === notif.id ? { ...n, read: true } : n));
    }
    const path = notif.link;
    if (path.startsWith('/post/')) navigation.navigate('PostDetail', { postId: path.replace('/post/', '') });
    else if (path.startsWith('/@')) navigation.navigate('Profile', { username: path.replace('/@', '') });
    else if (path.startsWith('/snaps')) navigation.navigate('Snaps');
    else if (path.startsWith('/chats')) navigation.navigate('Chats');
    else if (path.startsWith('/halloffame')) navigation.navigate('HallOfFame');
    else if (path.startsWith('/wallet')) navigation.navigate('Wallet');
    else if (path.startsWith('/accountscenter')) navigation.navigate('AccountsCenter');
    else if (path.startsWith('/search')) navigation.navigate('Search');
    else if (path.startsWith('/make-post')) {
      const quoteId = path.split('=')[1];
      navigation.navigate('CreatePost', quoteId ? { quotePostId: quoteId } : undefined);
    }
  };

  const renderNotif = ({ item }: { item: AppNotification }) => {
    const isUnread = !item.read;
    const color = TYPE_COLORS[item.type] || TYPE_COLORS.system;
    const iconName = TYPE_ICONS[item.type] || TYPE_ICONS.system;

    const showChip = item.link &&
      item.link !== '/' &&
      !item.link.startsWith('/@') &&
      !item.link.startsWith('/accountscenter') &&
      !item.link.startsWith('/wallet');

    return (
      <TouchableOpacity
        style={[s.notifRow, isUnread && s.notifUnread, { borderBottomColor: colors.border }]}
        onPress={() => handleNavigate(item)}
        onLongPress={() => setOpenMenuId(openMenuId === item.id ? null : item.id)}
      >
        <View style={s.avatarContainer}>
          <Image source={{ uri: item.senderPic || DEFAULT_PIC }} style={[s.notifAvatar, { borderColor: color, borderWidth: 1 }]} />
          <View style={[s.typeIndicatorBadge, { backgroundColor: color }]}>
            <Ionicons name={iconName} size={8} color="#fff" />
          </View>
        </View>
        <View style={{ flex: 1 }}>
          <SafeHTML text={item.message} style={{ fontSize: 13, lineHeight: 18, color: colors.textPrimary }} />
          <Text style={[s.notifTime, { color: colors.textSecondary }]}>{timeAgo(item.created_at)}</Text>
          {showChip && (
            <TouchableOpacity onPress={() => handleNavigate(item)} style={[s.viewPostChip, { backgroundColor: isDark ? 'rgba(59,130,246,0.15)' : '#eff6ff' }]}>
              <Text style={{ fontSize: 10, fontWeight: '700', color: '#2563eb' }}>View post →</Text>
            </TouchableOpacity>
          )}
        </View>
        <TouchableOpacity style={s.menuBtn} onPress={() => setOpenMenuId(openMenuId === item.id ? null : item.id)}>
          <Ionicons name="ellipsis-horizontal" size={16} color={colors.textSecondary} />
        </TouchableOpacity>

        {/* Dropdown menu */}
        {openMenuId === item.id && (
          <>
            <TouchableOpacity style={s.menuBg} onPress={() => setOpenMenuId(null)} />
            <View style={[s.dropdown, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <TouchableOpacity style={s.dropdownItem} onPress={() => { setOpenMenuId(null); handleNavigate(item); }}>
                <Ionicons name="open-outline" size={14} color={colors.textSecondary} />
                <Text style={[s.dropdownText, { color: colors.textPrimary }]}>Open</Text>
              </TouchableOpacity>
              <TouchableOpacity style={s.dropdownItem} onPress={() => handleDelete(item.id)}>
                <Ionicons name="trash-outline" size={14} color="#ef4444" />
                <Text style={{ fontSize: 13, color: '#ef4444', fontWeight: '600' }}>Delete</Text>
              </TouchableOpacity>
            </View>
          </>
        )}
      </TouchableOpacity>
    );
  };

  const s = makeStyles(colors, isDark);

  return (
    <SafeAreaView style={[s.safe, { backgroundColor: colors.background }]}>
      <View style={[s.header, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}>
          <Ionicons name="arrow-back" size={22} color={colors.textPrimary} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={[s.headerTitle, { color: colors.textPrimary }]}>Activity</Text>
          <Text style={{ fontSize: 11, color: colors.textSecondary, marginTop: 1 }}>Who noticed you today</Text>
        </View>
        {notifications.length > 0 && (
          <TouchableOpacity onPress={() => setShowConfirm(true)} style={s.clearBtn}>
            <Ionicons name="trash-outline" size={18} color="#ef4444" />
          </TouchableOpacity>
        )}
      </View>

      {showConfirm && (
        <View style={[s.confirmBanner, { backgroundColor: isDark ? '#7f1d1d' : '#fef2f2', borderColor: isDark ? '#b91c1c' : '#fee2e2' }]}>
          <Text style={{ fontSize: 12, color: isDark ? '#fecaca' : '#b91c1c', fontWeight: '600', flex: 1 }}>Clear all notifications?</Text>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <TouchableOpacity style={s.bannerBtnSec} onPress={() => setShowConfirm(false)}>
              <Text style={{ fontSize: 11, fontWeight: '700', color: colors.textSecondary }}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={s.bannerBtn} onPress={handleClearAll} disabled={clearing}>
              <Text style={{ fontSize: 11, fontWeight: '700', color: '#fff' }}>Clear</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {loading ? (
        <View style={{ padding: 8 }}>
          {[0, 1, 2, 3].map(i => <View key={i} style={{ height: 60, marginVertical: 4, borderRadius: 12, backgroundColor: isDark ? '#1e293b' : '#f3f4f6' }} />)}
        </View>
      ) : (
        <FlatList
          data={notifications}
          keyExtractor={(item) => item.id}
          renderItem={renderNotif}
          contentContainerStyle={s.listContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} tintColor={colors.primary} />}
          ListEmptyComponent={
            <View style={s.emptyState}>
              <View style={[s.emptyIconContainer, { backgroundColor: isDark ? '#1e293b' : '#f9fafb' }]}>
                <Ionicons name="notifications-off-outline" size={32} color={colors.textSecondary} />
              </View>
              <Text style={[s.emptyLabel, { color: colors.textSecondary }]}>You're all caught up</Text>
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
  backBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center', marginRight: 4 },
  headerTitle: { fontSize: 18, fontWeight: '800' },
  clearBtn: { padding: 8, borderRadius: 20 },
  confirmBanner: { flexDirection: 'row', alignItems: 'center', padding: 12, borderBottomWidth: 1 },
  bannerBtn: { backgroundColor: '#ef4444', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  bannerBtnSec: { paddingHorizontal: 12, paddingVertical: 6 },
  listContent: { paddingBottom: 100 },
  notifRow: { flexDirection: 'row', gap: 12, padding: 14, borderBottomWidth: StyleSheet.hairlineWidth, position: 'relative' },
  notifUnread: { borderLeftWidth: 3, borderLeftColor: '#2563eb' },
  avatarContainer: { position: 'relative', width: 40, height: 40 },
  notifAvatar: { width: 40, height: 40, borderRadius: 20 },
  typeIndicatorBadge: { position: 'absolute', bottom: -2, right: -2, width: 14, height: 14, borderRadius: 7, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#fff' },
  notifMessage: { fontSize: 13, lineHeight: 18, fontWeight: '600' },
  notifTime: { fontSize: 11, marginTop: 2 },
  viewPostChip: { alignSelf: 'flex-start', marginTop: 6, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  menuBtn: { padding: 4, alignSelf: 'flex-start' },
  menuBg: { position: 'absolute', inset: -100, zIndex: 9 },
  dropdown: { position: 'absolute', top: 38, right: 14, zIndex: 10, borderRadius: 12, borderWidth: 1, overflow: 'hidden', minWidth: 120, elevation: 6 },
  dropdownItem: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 8, paddingHorizontal: 12 },
  dropdownText: { fontSize: 13, fontWeight: '600' },
  emptyState: { alignItems: 'center', paddingTop: 100 },
  emptyIconContainer: { width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  emptyLabel: { fontSize: 14, fontWeight: '700' },
});
