import React, { memo, useState } from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet } from 'react-native';
import { useLoudaTheme, StatusRing } from './primitives';
import { Icons } from '../icons';
import { DEFAULT_AVATAR } from '../constants';

type Props = {
  chat: any;
  onClick?: () => void;
  isActive?: boolean;
  isGroup?: boolean;
  selectionMode?: boolean;
  isSelected?: boolean;
  onSelect?: (id: string, isLongPress?: boolean) => void;
  onContextMenu?: (chat: any) => void;
  isTyping?: boolean;
  typingText?: string;
  userStatuses?: any[];
  currentUserId?: string;
  onAvatarClick?: (id: string) => void;
};

// Port of ChatItem (LoudaApp.jsx:846-931)
export const ChatItem = memo(function ChatItem({
  chat,
  onClick,
  isActive,
  isGroup = false,
  selectionMode,
  isSelected,
  onSelect,
  onContextMenu,
  isTyping,
  typingText,
  userStatuses = [],
  currentUserId,
  onAvatarClick,
}: Props) {
  const { p } = useLoudaTheme();
  const [avatarUri, setAvatarUri] = useState(chat.avatar_url || DEFAULT_AVATAR);
  React.useEffect(() => {
    setAvatarUri(chat.avatar_url || DEFAULT_AVATAR);
  }, [chat.avatar_url]);

  const handlePress = () => {
    if (selectionMode && onSelect) onSelect(chat.id);
    else onClick?.();
  };

  // Web's row is separate from its avatar zone (876-886): tap on the avatar
  // opens status/profile, right-click opens the chat context menu. Mobile has
  // no right-click, so the context menu lives on an avatar long-press.
  const avatarStatusActive = userStatuses.length > 0 && !!onAvatarClick;
  const avatarEnabled = avatarStatusActive || !!onContextMenu;

  const border =
    isSelected
      ? '#3b82f6'
      : isActive
        ? p.accent
        : 'transparent';
  const bg = isSelected
    ? 'rgba(59,130,246,0.10)'
    : isActive
      ? p.accentSoft
      : 'transparent';

  const showOnline =
    (chat.online || chat.is_system === 'ai') &&
    !isGroup &&
    chat.id !== '22222222-2222-2222-2222-222222222222' &&
    chat.number !== 'support';

  const lastTime = chat.lastMessageTime
    ? new Date(chat.lastMessageTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : '';

  return (
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={handlePress}
      onLongPress={() => onSelect?.(chat.id, true)}
      style={[s.row, { backgroundColor: bg, borderLeftColor: border }]}
    >
      {selectionMode && (
        <View style={{ marginRight: 12 }}>
          <View
            style={[
              s.checkCircle,
              {
                backgroundColor: isSelected ? '#3b82f6' : 'transparent',
                borderColor: isSelected ? '#3b82f6' : p.border,
              },
            ]}
          >
            {isSelected && <Icons.check size={12} color="#fff" />}
          </View>
        </View>
      )}

      <TouchableOpacity
        activeOpacity={0.8}
        disabled={!avatarEnabled}
        onPress={
          avatarStatusActive
            ? () => onAvatarClick?.(chat.id)
            : avatarEnabled
              ? handlePress
              : undefined
        }
        onLongPress={onContextMenu ? () => onContextMenu(chat) : undefined}
        style={s.avatarWrap}
      >
        <StatusRing statuses={userStatuses} currentUserId={currentUserId} size={56} />
        <Image
          source={{ uri: avatarUri }}
          style={s.avatar}
          onError={() => setAvatarUri(DEFAULT_AVATAR)}
        />
        {showOnline && (
          <View
            style={[s.onlineDot, { backgroundColor: p.accent, borderColor: p.card }]}
          />
        )}
      </TouchableOpacity>

      <View style={{ flex: 1, minWidth: 0 }}>
        <View style={s.topRow}>
          <View style={s.nameWrap}>
            <Text
              numberOfLines={1}
              style={[
                s.name,
                { color: isSelected ? '#1d4ed8' : p.text },
              ]}
            >
              {chat.name}
            </Text>
            {chat.is_system === 'ai' && (
              <View style={s.aiBadge}>
                <Text style={s.aiBadgeText}>AI</Text>
              </View>
            )}
          </View>
          {!!lastTime && <Text style={[s.time, { color: p.textMuted }]}>{lastTime}</Text>}
        </View>

        <View style={s.bottomRow}>
          {isTyping ? (
            <Text numberOfLines={1} style={[s.typing, { color: p.accent }]}>
              {typingText || 'Typing...'}
            </Text>
          ) : (
            <View style={s.previewWrap}>
              {!!chat.lastMessage?.startsWith('You: ') && (
                <Text style={{ fontSize: 14, letterSpacing: -2, marginRight: 4 }}>
                  {chat.lastMessageStatus === 'read' ? (
                    <Text style={{ color: '#3b82f6' }}>✓✓</Text>
                  ) : (
                    <Text style={{ color: p.textMuted }}>✓</Text>
                  )}
                </Text>
              )}
              <Text numberOfLines={1} style={[s.preview, { color: p.textSecondary }]}>
                {chat.lastMessage?.replace('You: ', '') || 'No messages yet'}
              </Text>
            </View>
          )}
          {Number(chat.unreadCount) > 0 && !isActive && !isSelected && !isTyping && (
            <View style={[s.unreadBadge, { backgroundColor: p.accent }]}>
              <Text style={s.unreadBadgeText}>{chat.unreadCount}</Text>
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
});

const s = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    marginHorizontal: 4,
    marginVertical: 1,
    borderRadius: 8,
    borderLeftWidth: 4,
  },
  checkCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarWrap: {
    width: 56,
    height: 56,
    marginRight: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    position: 'absolute',
    top: 4,
    left: 4,
  },
  onlineDot: {
    position: 'absolute',
    bottom: 2,
    right: 4,
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 2,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: 4,
  },
  nameWrap: { flexDirection: 'row', alignItems: 'center', gap: 6, flexShrink: 1 },
  name: { fontSize: 15, fontWeight: '700' },
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
  time: { fontSize: 11, fontWeight: '500' },
  bottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    height: 20,
  },
  previewWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    minWidth: 0,
    marginRight: 8,
  },
  preview: { fontSize: 14, flexShrink: 1 },
  typing: { fontSize: 14, fontWeight: '700', flex: 1 },
  unreadBadge: {
    minWidth: 20,
    height: 18,
    paddingHorizontal: 6,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  unreadBadgeText: { color: '#fff', fontSize: 10, fontWeight: '800', lineHeight: 14 },
});
