import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View, Text, FlatList, StyleSheet,
  ActivityIndicator, RefreshControl, Image, Alert,
} from 'react-native';
import { Ripple } from '../../components/Ripple';
import Ionicons from '@expo/vector-icons/build/Ionicons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { useNavigation, useIsFocused } from '@react-navigation/native';
import {
  getNotificationsAPI, markNotificationReadAPI, deleteNotificationAPI,
  deleteAllNotificationsAPI, AppNotification,
} from '../../api/notifications';
import { timeAgo } from '../../utils/format';
import SafeHTML from '../../components/SafeHTML';

const DEFAULT_PIC = 'https://api.dicebear.com/10.x/adventurer-neutral/png?seed=textmob&backgroundColor=18181b';

// Keyed by both the server `type` and the structured `data.kind` (they overlap).
const TYPE_COLORS: Record<string, string> = {
  like: '#ef4444',
  likes: '#ef4444',
  comment: '#2563eb',
  comments: '#2563eb',
  reply: '#2563eb',
  follow: '#10b981',
  followers: '#10b981',
  friend: '#10b981',
  mention: '#8b5cf6',
  mentions: '#8b5cf6',
  react: '#f59e0b',
  gift: '#d97706',
  system: '#6b7280',
  post: '#0ea5e9',
  newPost: '#0ea5e9',
  group: '#14b8a6',
  mobcoins: '#f59e0b',
  events: '#a855f7',
  verification: '#3b82f6',
  messages: '#22c55e',
  textmobai: '#8b5cf6',
  askify: '#8b5cf6',
};

const TYPE_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  like: 'heart',
  likes: 'heart',
  comment: 'chatbubble',
  comments: 'chatbubble',
  reply: 'return-down-forward',
  follow: 'person-add',
  followers: 'person-add',
  friend: 'happy',
  mention: 'at',
  mentions: 'at',
  react: 'happy',
  gift: 'gift',
  system: 'information-circle',
  post: 'images',
  newPost: 'images',
  group: 'people',
  mobcoins: 'cash',
  events: 'calendar',
  verification: 'shield-checkmark',
  messages: 'chatbubbles',
  textmobai: 'sparkles',
  askify: 'sparkles',
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

  // Poll only while this screen is actually visible — it used to keep hitting
  // /get-notifications every 30s in the background too, alongside the global
  // badge poll, for a payload that no one was looking at.
  const isFocused = useIsFocused();
  useEffect(() => {
    if (!username || !isFocused) return;
    const interval = setInterval(fetchNotifications, 60000);
    return () => clearInterval(interval);
  }, [username, isFocused, fetchNotifications]);

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

  const markRead = (notif: AppNotification) => {
    if (!username || notif.read) return;
    markNotificationReadAPI(username, notif.id).catch(() => {});
    setNotifications(prev => prev.map(n => n.id === notif.id ? { ...n, read: true } : n));
  };

  const handleNavigate = (notif: AppNotification) => {
    if (!username || !notif.link) return;
    markRead(notif);
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

  // Open the post with the comment composer focused and (when the notification
  // knows which comment) primed as a reply to it.
  const openReply = (notif: AppNotification) => {
    if (!notif.link?.startsWith('/post/')) return;
    markRead(notif);
    navigation.navigate('PostDetail', {
      postId: notif.link.replace('/post/', ''),
      focusReply: true,
      replyToCommentId: notif.data?.commentId || notif.data?.parentId || undefined,
      replyToUser: notif.data?.replyToUsername || notif.sender || undefined,
    });
  };

  const renderNotif = ({ item }: { item: AppNotification }) => {
    const isUnread = !item.read;
    const d = item.data;
    const kind = d?.kind || item.type;
    const color = TYPE_COLORS[kind] || TYPE_COLORS[item.type] || TYPE_COLORS.system;
    const iconName = TYPE_ICONS[kind] || TYPE_ICONS[item.type] || TYPE_ICONS.system;

    const showChip = item.link &&
      item.link !== '/' &&
      !item.link.startsWith('/@') &&
      !item.link.startsWith('/accountscenter') &&
      !item.link.startsWith('/wallet');

    const mediaUri = d?.image || d?.sticker || d?.video || '';
    const tags = Array.isArray(d?.tags) ? d.tags : [];
    const canReply = d?.replyable !== false && !!item.link && item.link.startsWith('/post/');
    const avatarUri = d?.actor?.profile_pic || item.senderPic || DEFAULT_PIC;

    return (
      <Ripple
        style={[s.notifRow, isUnread && s.notifUnread, { borderBottomColor: colors.border }]}
        onPress={() => handleNavigate(item)}
        onLongPress={() => setOpenMenuId(openMenuId === item.id ? null : item.id)}
      >
        <View style={s.avatarContainer}>
          <Image source={{ uri: avatarUri }} style={[s.notifAvatar, { borderColor: color, borderWidth: 1 }]} />
          <View style={[s.typeIndicatorBadge, { backgroundColor: color }]}>
            <Ionicons name={iconName} size={8} color="#fff" />
          </View>
        </View>
        <View style={{ flex: 1 }}>
          <SafeHTML text={item.message} style={{ fontSize: 13, lineHeight: 18, color: colors.textPrimary }} />

          {(mediaUri || d?.reaction || (d?.text && d.text !== item.message)) ? (
            <View style={s.metaRow}>
              {!!d?.reaction && (
                <View style={[s.reactionPill, { backgroundColor: isDark ? 'rgba(245,158,11,0.15)' : '#fef3c7' }]}>
                  <Text style={{ fontSize: 11 }}>{d.reaction}</Text>
                </View>
              )}
              <Text style={[s.notifTime, { color: colors.textSecondary, marginTop: 0 }]}>{timeAgo(item.created_at)}</Text>
            </View>
          ) : (
            <Text style={s.notifTime}>{timeAgo(item.created_at)}</Text>
          )}

          {mediaUri ? (
            <View style={s.mediaRow}>
              <Image source={{ uri: mediaUri }} style={[s.mediaThumb, { borderColor: colors.border }]} resizeMode="cover" />
              {!!d?.text && (
                <Text numberOfLines={3} style={[s.mediaCaption, { color: colors.textSecondary }]}>
                  {d.text}
                </Text>
              )}
              {!!d?.video && !d?.image && (
                <View style={s.playBadge}>
                  <Ionicons name="play" size={12} color="#fff" />
                </View>
              )}
            </View>
          ) : null}

          {tags.length > 0 && (
            <Text numberOfLines={1} style={[s.tagsRow, { color: colors.primary }]}>
              {tags.slice(0, 5).map(t => (t.startsWith('#') ? t : '#' + t)).join('  ')}
            </Text>
          )}

          {(showChip || canReply) && (
            <View style={s.actionsRow}>
              {showChip && (
                <Ripple onPress={() => handleNavigate(item)} style={[s.viewPostChip, { backgroundColor: isDark ? 'rgba(59,130,246,0.15)' : '#eff6ff' }]}>
                  <Text style={{ fontSize: 10, fontWeight: '700', color: '#2563eb' }}>View post →</Text>
                </Ripple>
              )}
              {canReply && (
                <Ripple onPress={() => openReply(item)} style={[s.replyBtn, { borderColor: colors.border }]}>
                  <Ionicons name="return-down-forward" size={11} color={colors.primary} />
                  <Text style={{ fontSize: 10, fontWeight: '700', color: colors.primary }}>Reply</Text>
                </Ripple>
              )}
            </View>
          )}
        </View>
        <Ripple style={s.menuBtn} onPress={() => setOpenMenuId(openMenuId === item.id ? null : item.id)}>
          <Ionicons name="ellipsis-horizontal" size={16} color={colors.textSecondary} />
        </Ripple>

        {/* Dropdown menu */}
        {openMenuId === item.id && (
          <>
            <Ripple style={s.menuBg} onPress={() => setOpenMenuId(null)} />
            <View style={[s.dropdown, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Ripple style={s.dropdownItem} onPress={() => { setOpenMenuId(null); handleNavigate(item); }}>
                <Ionicons name="open-outline" size={14} color={colors.textSecondary} />
                <Text style={[s.dropdownText, { color: colors.textPrimary }]}>Open</Text>
              </Ripple>
              {canReply && (
                <Ripple style={s.dropdownItem} onPress={() => { setOpenMenuId(null); openReply(item); }}>
                  <Ionicons name="return-down-forward" size={14} color={colors.primary} />
                  <Text style={[s.dropdownText, { color: colors.primary }]}>Reply</Text>
                </Ripple>
              )}
              <Ripple style={s.dropdownItem} onPress={() => handleDelete(item.id)}>
                <Ionicons name="trash-outline" size={14} color="#ef4444" />
                <Text style={{ fontSize: 13, color: '#ef4444', fontWeight: '600' }}>Delete</Text>
              </Ripple>
            </View>
          </>
        )}
      </Ripple>
    );
  };

  const s = makeStyles(colors, isDark);

  return (
    <SafeAreaView style={[s.safe, { backgroundColor: colors.background }]}>
      <View style={[s.header, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <Ripple onPress={() => navigation.goBack()} style={s.backBtn}>
          <Ionicons name="arrow-back" size={22} color={colors.textPrimary} />
        </Ripple>
        <View style={{ flex: 1 }}>
          <Text style={[s.headerTitle, { color: colors.textPrimary }]}>Activity</Text>
          <Text style={{ fontSize: 11, color: colors.textSecondary, marginTop: 1 }}>Who noticed you today</Text>
        </View>
        {notifications.length > 0 && (
          <Ripple onPress={() => setShowConfirm(true)} style={s.clearBtn}>
            <Ionicons name="trash-outline" size={18} color="#ef4444" />
          </Ripple>
        )}
      </View>

      {showConfirm && (
        <View style={[s.confirmBanner, { backgroundColor: isDark ? '#7f1d1d' : '#fef2f2', borderColor: isDark ? '#b91c1c' : '#fee2e2' }]}>
          <Text style={{ fontSize: 12, color: isDark ? '#fecaca' : '#b91c1c', fontWeight: '600', flex: 1 }}>Clear all notifications?</Text>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <Ripple style={s.bannerBtnSec} onPress={() => setShowConfirm(false)}>
              <Text style={{ fontSize: 11, fontWeight: '700', color: colors.textSecondary }}>Cancel</Text>
            </Ripple>
            <Ripple style={s.bannerBtn} onPress={handleClearAll} disabled={clearing}>
              <Text style={{ fontSize: 11, fontWeight: '700', color: '#fff' }}>Clear</Text>
            </Ripple>
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
          initialNumToRender={10}
          maxToRenderPerBatch={10}
          windowSize={7}
          removeClippedSubviews
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
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 2 },
  reactionPill: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 10 },
  mediaRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 8,
    backgroundColor: 'rgba(127,127,127,0.06)', borderRadius: 10, padding: 8,
  },
  mediaThumb: { width: 48, height: 48, borderRadius: 8, backgroundColor: 'rgba(127,127,127,0.15)' },
  mediaCaption: { flex: 1, fontSize: 12, lineHeight: 16 },
  playBadge: {
    position: 'absolute', left: 8, top: 8, width: 20, height: 20, borderRadius: 10,
    backgroundColor: 'rgba(0,0,0,0.55)', alignItems: 'center', justifyContent: 'center',
  },
  tagsRow: { fontSize: 11, fontWeight: '700', marginTop: 6 },
  actionsRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 6, flexWrap: 'wrap' },
  replyBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10,
    paddingVertical: 4, borderRadius: 12, borderWidth: 1,
  },
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
