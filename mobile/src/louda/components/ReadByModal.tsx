import React, { useMemo } from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';
import { useLoudaTheme, LoudaModal } from './primitives';
import { DEFAULT_AVATAR } from '../constants';

// Port of ReadByModal (LoudaApp.jsx:1050-1105)
export function ReadByModal({
  isOpen,
  readBy,
  onClose,
  members,
}: {
  isOpen: boolean;
  readBy?: any[];
  onClose: () => void;
  members?: any[];
}) {
  const { p } = useLoudaTheme();

  const readers = useMemo(() => {
    if (!readBy) return [];
    const mapped: any[] = [];
    const seen = new Set<string>();
    readBy.forEach((entry) => {
      const userId = typeof entry === 'object' ? entry.userId : entry;
      const readAt =
        typeof entry === 'object' ? entry.readAt || entry.timestamp : null;
      const entryName = typeof entry === 'object' ? entry.name : null;
      const entryAvatar = typeof entry === 'object' ? entry.avatar : null;
      if (seen.has(userId)) return;
      seen.add(userId);
      const member = members?.find((m) => m.user_id === userId);
      mapped.push({
        userId,
        name:
          entryName ||
          (member
            ? member.nickname || member.real_name || member.phone
            : 'Unknown User'),
        avatar: entryAvatar || (member ? member.avatar_url : null),
        readAt,
      });
    });
    return mapped;
  }, [readBy, members]);

  return (
    <LoudaModal isOpen={isOpen} onClose={onClose} title={`Read by ${readers.length}`}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 4, marginBottom: 8 }}>
        <Text style={{ color: '#3b82f6', fontSize: 14, letterSpacing: -1.5 }}>✓✓</Text>
      </View>
      {readers.length === 0 ? (
        <Text style={[s.empty, { color: p.textMuted }]}>No one has read this yet</Text>
      ) : (
        readers.map((r, i) => (
          <View key={r.userId || i} style={[s.row, { backgroundColor: p.cardMuted }]}>
            <Image
              source={{ uri: r.avatar || DEFAULT_AVATAR }}
              style={s.avatar}
            />
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text numberOfLines={1} style={[s.name, { color: p.text }]}>
                {r.name}
              </Text>
              <Text style={[s.time, { color: p.textMuted }]}>
                {r.readAt
                  ? new Date(r.readAt).toLocaleString([], {
                      hour: 'numeric',
                      minute: '2-digit',
                    })
                  : 'Read'}
              </Text>
            </View>
          </View>
        ))
      )}
    </LoudaModal>
  );
}

const s = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    marginBottom: 6,
  },
  avatar: { width: 36, height: 36, borderRadius: 18 },
  name: { fontSize: 14, fontWeight: '700' },
  time: { fontSize: 10, fontWeight: '500' },
  empty: {
    textAlign: 'center',
    paddingVertical: 32,
    fontSize: 14,
    fontWeight: '700',
    fontStyle: 'italic',
  },
});
