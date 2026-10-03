import React from 'react';
import { Text, StyleSheet } from 'react-native';
import { Ripple } from '../../components/Ripple';
import { Icons } from '../icons';

// Port of MessageReceipts (LoudaApp.jsx:1033-1047)
export function MessageReceipts({
  message,
  isGroup,
  isSentByMe,
  onClick,
}: {
  message: any;
  isGroup?: boolean;
  isSentByMe?: boolean;
  onClick?: () => void;
}) {
  if (!isSentByMe) return null;
  const { status, read_by } = message;
  const readCount =
    isGroup && read_by
      ? read_by.filter((r: any) => (typeof r === 'object' ? r.userId : r) !== message.from)
          .length
      : 0;

  const isRead = status === 'read' || readCount > 0;
  const isDelivered = status === 'delivered';

  const Icon = isRead || isDelivered ? Icons.checkDouble : Icons.check;

  return (
    <Ripple
      onPress={onClick}
      activeOpacity={0.7}
      style={s.wrap}
      hitSlop={6}
      accessibilityLabel={typeof status === 'string' ? status : undefined}
      accessibilityRole="button"
    >
      <Icon size={14} color={isRead ? '#53bdeb' : '#9ca3af'} />
      {isGroup && readCount > 0 && (
        <Text style={s.count}>{readCount}</Text>
      )}
    </Ripple>
  );
}

const s = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    marginLeft: 4,
    minWidth: 24,
  },
  count: { fontSize: 9, fontWeight: '700', marginLeft: 2, color: '#9ca3af' },
});
