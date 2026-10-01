import React from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
} from 'react-native';
import { useLoudaTheme } from './primitives';
import { Icons } from '../icons';
import { useLoudaStore } from '../store';
import { ChatItem } from './ChatItem';

// ─── ChatListSkeleton (LoudaApp.jsx:1253-1268) ───
export function ChatListSkeleton() {
  const { p } = useLoudaTheme();
  return (
    <View style={{ padding: 8, gap: 4 }}>
      {[...Array(6)].map((_, i) => (
        <View key={i} style={s.skelRow}>
          <View style={[s.skelAvatar, { backgroundColor: p.skeleton }]} />
          <View style={{ flex: 1, gap: 8 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <View style={[s.skelBar, { backgroundColor: p.skeleton, width: 128 }]} />
              <View style={[s.skelBar, { backgroundColor: p.skeleton, width: 40, height: 10 }]} />
            </View>
            <View style={[s.skelBar, { backgroundColor: p.skeleton, width: 192, height: 10 }]} />
          </View>
        </View>
      ))}
    </View>
  );
}

// ─── Chat List Strip (LoudaApp.jsx:8914-9045) ───
export function ChatListPane() {
  const st = useLoudaStore();
  const { p } = useLoudaTheme();
  const { width } = useWindowDimensions();

  const title =
    st.activeTab === 'chats'
      ? 'Messages'
      : st.activeTab === 'archived'
        ? 'Archived'
        : 'Settings';

  const filtered = st.memoizedChats.filter((c) => {
    if (!st.searchQuery) return true;
    const q = st.searchQuery.toLowerCase();
    // Web parity (LoudaApp.jsx:9010-9013): only name + lastMessageText —
    // the `lastMessage` preview string is intentionally NOT searched
    return (
      (c.name || '').toLowerCase().includes(q) ||
      (c.lastMessageText || '').toLowerCase().includes(q)
    );
  });

  // Web parity (LoudaApp.jsx:7161-7174): long-press while already in
  // selection mode toggles the selection — it does not open a menu.
  const handleSelect = (id: string, isLongPress?: boolean) => {
    st.toggleChatSelect(id, isLongPress);
  };

  // Web right-click (LoudaApp.jsx:8567-8576) — mobile opens it from an
  // avatar long-press instead, positioned near the middle of the screen.
  const openRowContextMenu = (chat: any) => {
    st.handleContextMenu({ x: width / 2 - 90, y: 150 }, chat);
  };

  return (
    <View style={[s.pane, { backgroundColor: p.card, borderRightColor: p.border }]}>
      {st.chatSelectionMode ? (
        <View style={s.selectionBar}>
          <TouchableOpacity onPress={st.exitChatSelection} style={s.selectionBtn} hitSlop={8}>
            <Icons.x size={20} color="#fff" />
          </TouchableOpacity>
          <Text style={s.selectionCount}>{st.selectedChats.size} selected</Text>
          <TouchableOpacity onPress={st.handleBulkChatArchive} style={s.selectionBtn} hitSlop={8}>
            <Icons.archive size={20} color="#fff" />
          </TouchableOpacity>
          <TouchableOpacity onPress={st.handleBulkChatDelete} style={s.selectionBtn} hitSlop={8}>
            <Icons.trash size={20} color="#fca5a5" />
          </TouchableOpacity>
        </View>
      ) : (
        <View style={s.headerBlock}>
          <View style={s.headerTop}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexShrink: 1 }}>
              <Text style={[s.title, { color: '#5D4037' }]} numberOfLines={1}>
                {title}
              </Text>
              {st.activeTab === 'chats' && st.totalUnreadChats > 0 && (
                <View style={[s.titleBadge, { backgroundColor: '#22c55e' }]}>
                  <Text style={s.titleBadgeText}>
                    {st.totalUnreadChats > 99 ? '99+' : st.totalUnreadChats}
                  </Text>
                </View>
              )}
              {st.activeTab === 'archived' && st.totalUnreadArchived > 0 && (
                <View style={[s.titleBadge, { backgroundColor: '#22c55e' }]}>
                  <Text style={s.titleBadgeText}>
                    {st.totalUnreadArchived > 99 ? '99+' : st.totalUnreadArchived}
                  </Text>
                </View>
              )}
            </View>
            <TouchableOpacity
              onPress={() => st.setMobileMenuOpen(true)}
              style={[s.menuBtn, st.mobileMenuOpen ? { backgroundColor: p.cardMuted } : null]}
              hitSlop={8}
            >
              <Icons.more size={20} color="#6b7280" />
            </TouchableOpacity>
          </View>

          <View style={s.searchWrap}>
            <View style={s.searchIcon}>
              <Icons.search size={18} color="#9ca3af" />
            </View>
            <TextInput
              value={st.searchQuery}
              onChangeText={st.setSearchQuery}
              placeholder="Search or start new chat"
              placeholderTextColor="#9ca3af"
              style={[s.searchInput, { backgroundColor: p.cardMuted, color: p.text }]}
            />
          </View>
        </View>
      )}

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 110 }}>
        {st.isLoadingChats ? (
          <ChatListSkeleton />
        ) : filtered.length === 0 ? (
          <View style={s.empty}>
            <View style={[s.emptyIcon, { backgroundColor: p.cardMuted }]}>
              <Text style={{ fontSize: 28 }}>💬</Text>
            </View>
            <Text style={[s.emptyTitle, { color: p.textMuted }]}>No conversations found</Text>
            <Text style={[s.emptySub, { color: p.border }]}>Try a different search term</Text>
          </View>
        ) : (
          filtered.map((c) => (
            <ChatItem
              key={c.id}
              chat={c}
              userStatuses={
                !c.isGroup
                  ? st.statuses.filter(
                      (s) =>
                        s.user_id === c.id && new Date(s.expires_at) > new Date(),
                    )
                  : []
              }
              currentUserId={st.user?.id}
              onAvatarClick={(id) => st.setViewerTarget(id)}
              isActive={st.selectedChat?.id === c.id}
              onClick={() => st.setSelectedChat(c)}
              isGroup={c.isGroup}
              selectionMode={st.chatSelectionMode}
              isSelected={st.selectedChats.has(c.id)}
              onSelect={handleSelect}
              onContextMenu={openRowContextMenu}
              isTyping={!!st.typingRegistry[c.id]}
              typingText={
                st.typingRegistry[c.id]?.length === 1
                  ? c.isGroup
                    ? `${st.typingRegistry[c.id][0]} is typing...`
                    : 'Typing...'
                  : st.typingRegistry[c.id]?.length > 1
                    ? `${st.typingRegistry[c.id]?.length} people typing...`
                    : ''
              }
            />
          ))
        )}
      </ScrollView>

      {st.mobileMenuOpen && (
        <MobileMenu />
      )}
    </View>
  );
}

// ─── Mobile Dropdown Menu (LoudaApp.jsx:8949-8984) ───
function MobileMenu() {
  const st = useLoudaStore();
  const { p } = useLoudaTheme();

  const close = () => st.setMobileMenuOpen(false);
  const item = (
    label: string,
    icon: React.ReactNode,
    bg: string,
    color: string,
    onPress: () => void,
  ) => (
    <TouchableOpacity
      key={label}
      activeOpacity={0.8}
      onPress={onPress}
      style={[s.menuItem, { backgroundColor: bg }]}
    >
      <View style={{ transform: [{ scale: 1.25 }] }}>{icon}</View>
      <Text style={[s.menuItemText, { color: p.textSecondary }]}>{label}</Text>
    </TouchableOpacity>
  );

  return (
    <View style={[s.menuOverlay, { backgroundColor: p.card }]}>
      <View style={[s.menuHeader, { borderBottomColor: p.borderLight }]}>
        <Text style={[s.menuHeaderText, { color: p.textMuted }]}>Menu</Text>
        <TouchableOpacity onPress={close} style={[s.menuClose, { backgroundColor: p.cardMuted }]}>
          <Icons.x size={20} color="#6b7280" />
        </TouchableOpacity>
      </View>
      <ScrollView contentContainerStyle={s.menuBody}>
        {item(
          'My Profile',
          <Icons.user size={20} color="#E64A19" />,
          p.cardMuted,
          '#E64A19',
          () => {
            st.handleViewProfile(st.user);
            close();
          },
        )}
        {item(
          'Settings',
          <Icons.settings size={20} color="#5D4037" />,
          p.cardMuted,
          '#5D4037',
          () => {
            st.setShowSettings(true);
            close();
          },
        )}
        {item(
          'Archived',
          <Icons.archive size={20} color="#FFB300" />,
          p.cardMuted,
          '#FFB300',
          () => {
            st.handleTabChange('archived');
            close();
          },
        )}
        {item(
          'Media Gallery',
          <Icons.image size={20} color="#9333ea" />,
          'rgba(147,51,234,0.08)',
          '#9333ea',
          () => {
            st.handleTabChange('gallery');
            close();
          },
        )}
        {item(
          'Calls',
          <Icons.phone size={20} color="#3b82f6" />,
          'rgba(59,130,246,0.08)',
          '#3b82f6',
          () => {
            // Lexum.alert({ title: 'Calls', message: 'Voice and video calls coming soon!' })
            require('../../utils/alertBridge').loudaAlert({
              title: 'Calls',
              message: 'Voice and video calls coming soon!',
            });
            close();
          },
        )}
        <View style={{ paddingTop: 16, paddingBottom: 8 }}>
          <Text style={[s.menuSection, { color: p.textMuted }]}>Actions</Text>
        </View>
        {item(
          'Add Contact',
          <Icons.plus size={20} color="#16a34a" />,
          'rgba(34,197,94,0.08)',
          '#16a34a',
          () => {
            st.setShowAddContact(true);
            close();
          },
        )}
        {item(
          'Create Group',
          <Icons.users size={20} color="#2563eb" />,
          'rgba(37,99,235,0.08)',
          '#2563eb',
          () => {
            st.setShowCreateGroup(true);
            close();
          },
        )}
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  pane: { flex: 1, borderRightWidth: StyleSheet.hairlineWidth },
  headerBlock: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 12, gap: 16 },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { fontSize: 24, fontWeight: '900', textTransform: 'uppercase', letterSpacing: -0.5, flexShrink: 1 },
  titleBadge: {
    paddingHorizontal: 10,
    paddingVertical: 2,
    borderRadius: 999,
  },
  titleBadgeText: { color: '#fff', fontSize: 13, fontWeight: '700' },
  menuBtn: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  searchWrap: { position: 'relative', justifyContent: 'center' },
  searchIcon: { position: 'absolute', left: 12, zIndex: 2 },
  searchInput: {
    width: '100%',
    paddingLeft: 38,
    paddingRight: 16,
    paddingVertical: 10,
    borderRadius: 12,
    fontSize: 14,
  },
  selectionBar: {
    backgroundColor: '#5D4037',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  selectionBtn: { padding: 8, borderRadius: 999 },
  selectionCount: { flex: 1, color: '#fff', fontSize: 18, fontWeight: '700' },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
    gap: 12,
    minHeight: 320,
  },
  emptyIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    opacity: 0.6,
  },
  emptyTitle: { fontSize: 12, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 2 },
  emptySub: { fontSize: 10 },
  skelRow: { flexDirection: 'row', alignItems: 'center', padding: 16, gap: 12 },
  skelAvatar: { width: 48, height: 48, borderRadius: 24 },
  skelBar: { height: 14, borderRadius: 999 },
  menuOverlay: {
    ...StyleSheet.absoluteFill,
    zIndex: 50,
  },
  menuHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  menuHeaderText: {
    fontSize: 12,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 4,
  },
  menuClose: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuBody: { padding: 16, gap: 8 },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    padding: 16,
    borderRadius: 16,
  },
  menuItemText: { fontSize: 16, fontWeight: '700' },
  menuSection: { fontSize: 10, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 4 },
});
