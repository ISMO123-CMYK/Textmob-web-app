import React, { useState } from 'react';
import { View, Text, Image, TextInput, StyleSheet } from 'react-native';
import { Ripple } from '../../components/Ripple';
import { useLoudaTheme, LoudaModal } from './primitives';
import { Icons } from '../icons';
import { DEFAULT_AVATAR } from '../constants';

// Port of ForwardModal (LoudaApp.jsx:1107-1185)
export function ForwardModal({
  isOpen,
  onClose,
  chats,
  onForward,
}: {
  isOpen: boolean;
  onClose: () => void;
  chats: any[];
  onForward: (targets: { id: string; isGroup: boolean }[]) => void;
}) {
  const { p } = useLoudaTheme();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleConfirm = () => {
    if (selected.size === 0) return;
    const targets = [...selected].map((id) => {
      const chat = chats.find((c) => c.id === id);
      return { id, isGroup: !!chat?.isGroup };
    });
    onForward(targets);
    setSelected(new Set());
    onClose();
  };

  const filteredChats = chats.filter((chat) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (chat.name || '').toLowerCase().includes(q);
  });

  return (
    <LoudaModal
      isOpen={isOpen}
      onClose={onClose}
      title="FORWARD TO..."
      footer={
        <Ripple
          activeOpacity={0.85}
          disabled={selected.size === 0}
          onPress={handleConfirm}
          style={[
            s.forwardBtn,
            {
              backgroundColor: selected.size > 0 ? p.accent : p.cardMuted,
              opacity: selected.size > 0 ? 1 : 0.5,
            },
          ]}
        >
          <Text
            style={[
              s.forwardText,
              { color: selected.size > 0 ? '#fff' : p.textMuted },
            ]}
          >
            FORWARD ({selected.size})
          </Text>
        </Ripple>
      }
    >
      <View style={s.searchWrap}>
        <View style={{ position: 'absolute', left: 12, top: 12, zIndex: 2 }}>
          <Icons.search size={18} color="#9ca3af" />
        </View>
        <TextInput
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="Search contacts or groups..."
          placeholderTextColor="#9ca3af"
          style={[s.searchInput, { backgroundColor: p.cardMuted, color: p.text }]}
        />
      </View>

      <View style={{ gap: 6 }}>
        {filteredChats.map((chat) => {
          const sel = selected.has(chat.id);
          return (
            <Ripple
              key={chat.id}
              activeOpacity={0.75}
              onPress={() => toggle(chat.id)}
              style={[
                s.row,
                {
                  backgroundColor: sel ? p.accentSoft : p.cardMuted,
                  borderColor: sel ? p.accent : 'transparent',
                },
              ]}
            >
              <Image
                source={{ uri: chat.avatar_url || DEFAULT_AVATAR }}
                style={s.avatar}
              />
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text numberOfLines={1} style={[s.name, { color: p.text }]}>
                  {chat.name}
                </Text>
                <Text style={[s.kind, { color: p.textMuted }]}>
                  {chat.isGroup ? 'Group' : 'Contact'}
                </Text>
              </View>
              <View
                style={[
                  s.checkbox,
                  {
                    backgroundColor: sel ? p.accent : 'transparent',
                    borderColor: sel ? p.accent : p.border,
                  },
                ]}
              >
                {sel && <Text style={s.checkMark}>✓</Text>}
              </View>
            </Ripple>
          );
        })}
        {filteredChats.length === 0 && (
          <Text style={[s.noResults, { color: p.textMuted }]}>No results found</Text>
        )}
      </View>
    </LoudaModal>
  );
}

const s = StyleSheet.create({
  searchWrap: { position: 'relative', justifyContent: 'center', marginBottom: 16 },
  searchInput: {
    width: '100%',
    paddingLeft: 38,
    paddingRight: 16,
    paddingVertical: 10,
    borderRadius: 12,
    fontSize: 14,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    padding: 12,
    borderRadius: 16,
    borderWidth: 2,
  },
  avatar: { width: 44, height: 44, borderRadius: 22 },
  name: { fontSize: 14, fontWeight: '900' },
  kind: {
    fontSize: 10,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkMark: { color: '#fff', fontSize: 12, fontWeight: '900' },
  noResults: { textAlign: 'center', paddingVertical: 32, fontSize: 14 },
  forwardBtn: {
    width: '100%',
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  forwardText: {
    fontSize: 15,
    fontWeight: '900',
    letterSpacing: 4,
  },
});
