import React, { useState } from 'react';
import { View, Text, Image, StyleSheet, TextInput } from 'react-native';
import { Ripple } from '../../components/Ripple';
import { useLoudaTheme, LoudaModal, Button } from './primitives';
import { Icons } from '../icons';
import { DEFAULT_AVATAR } from '../constants';

// Port of AddMembersModal (LoudaApp.jsx:4881-4954)
export function AddMembersModal({
  group,
  onClose,
  onAdd,
  contacts,
}: {
  group: any;
  onClose: () => void;
  onAdd: (groupId: string, memberIds: string[]) => void;
  contacts: any[];
}) {
  const { p } = useLoudaTheme();
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  const existingMemberIds = group.members?.map((m: any) => String(m.user_id)) || [];
  const availableContacts = contacts.filter(
    (c) =>
      !existingMemberIds.includes(String(c.id)) &&
      c.id !== '22222222-2222-2222-2222-222222222222' &&
      c.number !== 'support',
  );

  const toggleMember = (contactId: string) => {
    setSelectedMembers((prev) =>
      prev.includes(contactId) ? prev.filter((id) => id !== contactId) : [...prev, contactId],
    );
  };

  const handleAdd = () => {
    if (selectedMembers.length === 0) return;
    onAdd(group.id, selectedMembers);
    onClose();
  };

  const filteredContacts = availableContacts.filter((c) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      (c.name || '').toLowerCase().includes(q) || (c.number || '').toLowerCase().includes(q)
    );
  });

  return (
    <LoudaModal
      isOpen
      onClose={onClose}
      title={`Add Members to ${group.name}`}
      footer={
        <Button
          style={{ width: '100%' }}
          disabled={selectedMembers.length === 0}
          onPress={handleAdd}
        >
          Add Members ({selectedMembers.length})
        </Button>
      }
    >
      <View>
        <Text style={[s.head, { color: p.accent }]}>Select Contacts to Add</Text>
        <View style={[s.searchBox, { backgroundColor: p.cardMuted }]}>
          <Icons.search size={15} color={p.textMuted} />
          <TextInput
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search contacts..."
            placeholderTextColor={p.textMuted}
            style={[s.searchInput, { color: p.text }]}
          />
        </View>
        <View style={{ maxHeight: 300, gap: 8 }}>
          {filteredContacts.length === 0 ? (
            <Text style={[s.noContacts, { color: p.textMuted }]}>
              No available contacts to add
            </Text>
          ) : (
            filteredContacts.map((c) => {
              const checked = selectedMembers.includes(c.id);
              return (
                <Ripple
                  key={c.id}
                  activeOpacity={0.8}
                  style={[
                    s.checkRow,
                    { backgroundColor: p.cardMuted, borderColor: checked ? 'rgba(22,163,74,0.35)' : 'transparent' },
                  ]}
                  onPress={() => toggleMember(c.id)}
                >
                  <View
                    style={[
                      s.checkbox,
                      {
                        backgroundColor: checked ? '#16a34a' : '#fff',
                        borderColor: checked ? '#16a34a' : '#d1d5db',
                      },
                    ]}
                  >
                    {checked && <Icons.check size={13} color="#fff" />}
                  </View>
                  <Image source={{ uri: c.avatar_url || DEFAULT_AVATAR }} style={s.avatar} />
                  <Text style={[s.rowName, { color: p.text }]} numberOfLines={1}>
                    {c.name}
                  </Text>
                </Ripple>
              );
            })
          )}
        </View>
      </View>
    </LoudaModal>
  );
}

const s = StyleSheet.create({
  head: {
    fontSize: 11,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 3,
    opacity: 0.75,
    marginBottom: 14,
    paddingHorizontal: 4,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 40,
    marginBottom: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    height: '100%',
  },
  checkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 6,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  rowName: {
    flex: 1,
    fontSize: 14,
    fontWeight: '700',
  },
  noContacts: {
    textAlign: 'center',
    paddingVertical: 32,
    fontSize: 14,
  },
});
