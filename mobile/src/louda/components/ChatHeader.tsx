import React, { memo, useState } from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet } from 'react-native';
import { useLoudaTheme, ContextMenu } from './primitives';
import { Icons } from '../icons';
import { DEFAULT_AVATAR } from '../constants';

const SUPPORT_ID = '22222222-2222-2222-2222-222222222222';

// Port of ChatHeader (LoudaApp.jsx:933-1031)
export const ChatHeader = memo(function ChatHeader({
  chat,
  isTyping,
  statusText,
  isOnline,
  onBack,
  isGroup,
  onViewProfile,
  onOpenArchived,
  onShowChatInfo,
  onSearchClick,
  hasUnviewedStatus,
}: {
  chat: any;
  isTyping?: boolean;
  statusText?: string;
  isOnline?: boolean;
  onBack?: () => void;
  isGroup?: boolean;
  onViewProfile?: (chat: any, tab?: string) => void;
  onOpenArchived?: () => void;
  onShowChatInfo?: () => void;
  onSearchClick?: () => void;
  hasUnviewedStatus?: boolean;
}) {
  const { p } = useLoudaTheme();
  const [menuPos, setMenuPos] = useState<{ x: number; y: number } | null>(null);

  const menuOptions = [
    {
      label: 'View Profile',
      icon: <Icons.user size={16} color={p.textMuted} />,
      onClick: () => onViewProfile?.(chat),
    },
    {
      label: 'Chat Settings',
      icon: <Icons.settings size={16} color={p.textMuted} />,
      onClick: () => onViewProfile?.(chat, 'settings'),
    },
    {
      label: 'Archived Chats',
      icon: <Icons.archive size={16} color={p.textMuted} />,
      onClick: () => onOpenArchived?.(),
    },
    {
      label: 'Contact Info',
      icon: <Icons.more size={16} color={p.textMuted} />,
      onClick: () => onShowChatInfo?.(),
    },
  ];

  const isSupport =
    chat?.id === SUPPORT_ID || chat?.number === 'support';

  return (
    <View
      style={[
        s.wrap,
        { backgroundColor: p.card, borderBottomColor: p.borderLight, borderBottomWidth: StyleSheet.hairlineWidth },
      ]}
    >
      {!!onBack && (
        <TouchableOpacity onPress={onBack} style={s.backBtn} hitSlop={8}>
          <Icons.arrowLeft size={22} color="#6b7280" />
        </TouchableOpacity>
      )}

      <TouchableOpacity
        activeOpacity={0.8}
        style={s.avatarWrap}
        onPress={() => onViewProfile?.(chat)}
      >
        <Image
          source={{ uri: chat.avatar_url || DEFAULT_AVATAR }}
          style={[
            s.avatar,
            hasUnviewedStatus
              ? { borderWidth: 3, borderColor: p.accent }
              : { borderWidth: 2, borderColor: 'rgba(34,197,94,0.25)' },
          ]}
        />
      </TouchableOpacity>

      <TouchableOpacity
        activeOpacity={0.8}
        style={{ flex: 1, overflow: 'hidden' }}
        onPress={() => onViewProfile?.(chat)}
      >
        <View style={s.nameRow}>
          <Text numberOfLines={1} style={[s.name, { color: p.text }]}>
            {chat.name}
          </Text>
          {chat.is_system === 'ai' && (
            <View style={s.aiBadge}>
              <Text style={s.aiBadgeText}>AI</Text>
            </View>
          )}
        </View>
        <View style={s.statusRow}>
          {isTyping ? (
            <Text style={[s.typing, { color: p.accent }]}>
              {statusText?.includes('typing') ? statusText : 'Typing...'}
            </Text>
          ) : (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              {!!isOnline && chat?.id !== SUPPORT_ID && chat?.number !== 'support' && (
                <View style={[s.onlineDot, { backgroundColor: p.accent }]} />
              )}
              <Text numberOfLines={1} style={[s.statusText, { color: p.textMuted }]}>
                {isGroup
                  ? `${chat?.members ? chat.members.length : 0} members`
                  : isSupport
                    ? 'Support'
                    : statusText}
              </Text>
            </View>
          )}
        </View>
      </TouchableOpacity>

      {!!onSearchClick && (
        <TouchableOpacity onPress={onSearchClick} style={s.iconBtn} hitSlop={8}>
          <Icons.search size={20} color="#6b7280" />
        </TouchableOpacity>
      )}

      <TouchableOpacity
        onPress={() => setMenuPos({ x: 60, y: 90 })}
        style={[s.iconBtn, menuPos ? { backgroundColor: p.cardMuted } : null]}
        hitSlop={8}
      >
        <Icons.more size={20} color="#6b7280" />
      </TouchableOpacity>

      <ContextMenu
        position={menuPos}
        options={menuOptions}
        onClose={() => setMenuPos(null)}
      />
    </View>
  );
});

const s = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    gap: 4,
  },
  backBtn: { padding: 8, borderRadius: 999, marginRight: 4 },
  avatarWrap: { marginRight: 8 },
  avatar: { width: 40, height: 40, borderRadius: 20 },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  name: { fontSize: 16, fontWeight: '700' },
  aiBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    backgroundColor: '#7c3aed',
  },
  aiBadgeText: {
    fontSize: 9,
    fontWeight: '900',
    color: '#fff',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  statusRow: { height: 16, justifyContent: 'center' },
  onlineDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    shadowColor: 'rgba(34,197,94,0.4)',
    shadowOpacity: 1,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 0 },
  },
  statusText: { fontSize: 12, fontWeight: '500' },
  typing: { fontSize: 12, fontWeight: '600' },
  iconBtn: {
    padding: 8,
    borderRadius: 999,
  },
});
