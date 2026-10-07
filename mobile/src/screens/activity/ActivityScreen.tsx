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

// X uses its own accent for the active tab / unread tint.
const X_BLUE = '#1d9bf0';

const TABS = [
  { id: 'all', label: 'All' },
  { id: 'mentions', label: 'Mentions' },
  { id: 'replies', label: 'Replies' },
  { id: 'follows', label: 'Follows' },
];

function notifKind(n: AppNotification) {
  return (n.data?.kind as string) || n.type || '';
}

function matchTab(n: AppNotification, tab: string) {
  if (tab === 'all') return true;
  const k = notifKind(n);
  if (tab === 'mentions') return k === 'mention' || k === 'mentions';
  if (tab === 'replies') return k === 'reply';
  if (tab === 'follows') return ['follow', 'followers', 'friend', 'connection'].includes(k);
  return true;
}

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
  const [tab, setTab] = useState('all');

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
    const kind = notifKind(item);
    const color = TYPE_COLORS[kind] || TYPE_COLORS[item.type] || TYPE_COLORS.system;
    const iconName = TYPE_ICONS[kind] || TYPE_ICONS[item.type] || TYPE_ICONS.system;

    const mediaUri = d?.image || d?.sticker || d?.video || '';
    const tags = Array.isArray(d?.tags) ? d.tags : [];
    const avatarUri = d?.actor?.profile_pic || item.senderPic || DEFAULT_PIC;
    // X shows the person's avatar for "X followed you" but a bare coloured
    // icon for "X liked your post".
    const showsAvatar = ['follow', 'followers', 'friend', 'connection'].includes(kind);

    return (
      <Ripple
        style={[s.notifRow, isUnread && s.notifUnread, { borderBottomColor: colors.border }]}
        onPress={() => handleNavigate(item)}
        onLongPress={() => setOpenMenuId(openMenuId === item.id ? null : item.id)}
      >
        <View style={s.glyphBox}>
          {showsAvatar ? (
            <Image source={{ uri: avatarUri }} style={s.notifAvatar} />
          ) : (
            <Ionicons name={iconName} size={22} color={color} />
          )}
        </View>

        <View style={{ flex: 1 }}>
          <SafeHTML
            text={item.message}
            style={{ fontSize: 15, lineHeight: 20, color: colors.textPrimary, fontWeight: isUnread ? '700' : '400' }}
          />

          <View style={s.metaRow}>
            <Text style={[s.notifTime, { color: colors.textSecondary }]}>{timeAgo(item.created_at)}</Text>
            {!!d?.reaction && (
              <View style={[s.reactionPill, { backgroundColor: isDark ? 'rgba(245,158,11,0.15)' : '#fef3c7' }]}>
                <Text style={{ fontSize: 11 }}>{d.reaction}</Text>
              </View>
            )}
          </View>

          {tags.length > 0 && (
            <Text numberOfLines={1} style={[s.tagsRow, { color: X_BLUE }]}>
              {tags.slice(0, 5).map(t => (t.startsWith('#') ? t : '#' + t)).join('  ')}
            </Text>
          )}
        </View>

        {mediaUri ? (
          <View style={{ position: 'relative' }}>
            <Image source={{ uri: mediaUri }} style={s.mediaThumb} resizeMode="cover" />
            {!!d?.video && !d?.image && (
              <View style={s.playBadge}>
                <Ionicons name="play" size={12} color="#fff" />
              </View>
            )}
          </View>
        ) : null}

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
              {d?.replyable !== false && !!item.link && item.link.startsWith('/post/') && (
                <Ripple style={s.dropdownItem} onPress={() => { setOpenMenuId(null); openReply(item); }}>
                  <Ionicons name="return-down-forward" size={14} color={X_BLUE} />
                  <Text style={[s.dropdownText, { color: X_BLUE }]}>Reply</Text>
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
  const visible = notifications.filter(n => matchTab(n, tab));

  return (
    <SafeAreaView style={[s.safe, { backgroundColor: colors.background }]}>
      <View style={[s.header, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <Ripple onPress={() => navigation.goBack()} style={s.backBtn}>
          <Ionicons name="arrow-back" size={22} color={colors.textPrimary} />
        </Ripple>
        <Text style={[s.headerTitle, { color: colors.textPrimary }]}>Notifications</Text>
        <View style={{ flex: 1 }} />
        {notifications.length > 0 && (
          <Ripple onPress={() => setShowConfirm(true)} style={s.clearBtn}>
            <Ionicons name="trash-outline" size={18} color="#ef4444" />
          </Ripple>
        )}
      </View>

      <View style={[s.tabs, { borderBottomColor: colors.border }]}>
        {TABS.map(t => {
          const active = tab === t.id;
          return (
            <Ripple key={t.id} style={s.tab} onPress={() => setTab(t.id)}>
              <Text
                style={[
                  s.tabLabel,
                  { color: active ? colors.textPrimary : colors.textSecondary, fontWeight: active ? '800' : '600' },
                ]}
              >
                {t.label}
              </Text>
              {active && <View style={s.tabUnderline} />}
            </Ripple>
          );
        })}
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
          data={visible}
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
              <Text style={[s.emptyLabel, { color: colors.textSecondary }]}>
                {notifications.length === 0 ? "You're all caught up" : 'Nothing here yet'}
              </Text>
              {notifications.length > 0 && (
                <Text style={{ fontSize: 12, color: colors.textSecondary, marginTop: 4 }}>
                  No {TABS.find(t => t.id === tab)?.label.toLowerCase()} notifications.
                </Text>
              )}
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
  headerTitle: { fontSize: 20, fontWeight: '800', letterSpacing: -0.3 },
  clearBtn: { padding: 8, borderRadius: 20 },
  tabs: { flexDirection: 'row', borderBottomWidth: StyleSheet.hairlineWidth },
  tab: { flex: 1, height: 46, alignItems: 'center', justifyContent: 'center' },
  tabLabel: { fontSize: 14 },
  tabUnderline: { position: 'absolute', bottom: 0, height: 3, width: 36, borderRadius: 2, backgroundColor: X_BLUE },
  confirmBanner: { flexDirection: 'row', alignItems: 'center', padding: 12, borderBottomWidth: 1 },
  bannerBtn: { backgroundColor: '#ef4444', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  bannerBtnSec: { paddingHorizontal: 12, paddingVertical: 6 },
  listContent: { paddingBottom: 100 },
  notifRow: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 12, padding: 14,
    borderBottomWidth: StyleSheet.hairlineWidth, position: 'relative',
  },
  notifUnread: { backgroundColor: isDark ? 'rgba(29,155,240,0.12)' : 'rgba(29,155,240,0.07)' },
  glyphBox: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  notifAvatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(127,127,127,0.15)' },
  notifTime: { fontSize: 13, marginTop: 2 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  reactionPill: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 10 },
  mediaThumb: { width: 48, height: 48, borderRadius: 12, backgroundColor: 'rgba(127,127,127,0.15)' },
  playBadge: {
    position: 'absolute', left: 14, top: 14, width: 20, height: 20, borderRadius: 10,
    backgroundColor: 'rgba(0,0,0,0.55)', alignItems: 'center', justifyContent: 'center',
  },
  tagsRow: { fontSize: 13, fontWeight: '700', marginTop: 3 },
  menuBtn: { padding: 4, alignSelf: 'flex-start' },
  menuBg: { position: 'absolute', inset: -100, zIndex: 9 },
  dropdown: { position: 'absolute', top: 38, right: 14, zIndex: 10, borderRadius: 12, borderWidth: 1, overflow: 'hidden', minWidth: 120, elevation: 6 },
  dropdownItem: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 8, paddingHorizontal: 12 },
  dropdownText: { fontSize: 13, fontWeight: '600' },
  emptyState: { alignItems: 'center', paddingTop: 100 },
  emptyIconContainer: { width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  emptyLabel: { fontSize: 14, fontWeight: '700' },
});
