import React, { useState } from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet, ActivityIndicator, TextInput } from 'react-native';
import { useLoudaTheme, LoudaModal, Button, PhoneInput, Input } from './primitives';
import { Icons } from '../icons';
import { DEFAULT_AVATAR, LOUDA_API_URL } from '../constants';
import { useLoudaStore } from '../store';

// Port of the AddContact modal block (LoudaApp.jsx:9207-9343)
export function AddContactModal() {
  const { p } = useLoudaTheme();
  const st = useLoudaStore();
  const [localLoading, setLocalLoading] = useState(false);

  const close = () => {
    st.setShowAddContact(false);
    st.setTempContact(null);
    st.setTmSearchMode(false);
    st.setTmSearchQuery('');
    st.setTmSearchResults([]);
  };

  const title = !st.tempContact
    ? st.tmSearchMode
      ? 'Search Textmob'
      : 'Add Contact'
    : 'Confirm Contact';

  const onTmSearch = async (q: string) => {
    st.setTmSearchQuery(q);
    if (q.length >= 2) {
      st.setIsSearchingTm(true);
      try {
        const res = await fetch(`${LOUDA_API_URL}/api/textmob/search?query=${encodeURIComponent(q)}`);
        const data = await res.json();
        st.setTmSearchResults(data.users || []);
      } catch {
        st.setTmSearchResults([]);
      } finally {
        st.setIsSearchingTm(false);
      }
    } else {
      st.setTmSearchResults([]);
    }
  };

  return (
    <LoudaModal isOpen onClose={close} title={title}>
      {!st.tempContact ? (
        <View style={{ gap: 16 }}>
          {/* Mode toggle (web 9212-9231) */}
          <View style={[s.toggle, { backgroundColor: p.cardMuted, borderColor: p.borderLight }]}>
            {[
              { id: false, label: 'Search by Phone' },
              { id: true, label: 'Search Textmob' },
            ].map((opt) => (
              <TouchableOpacity
                key={String(opt.id)}
                style={[
                  s.toggleBtn,
                  st.tmSearchMode === opt.id && { backgroundColor: p.accent },
                ]}
                onPress={() => st.setTmSearchMode(opt.id)}
              >
                <Text
                  style={[
                    s.toggleText,
                    { color: st.tmSearchMode === opt.id ? '#fff' : p.textMuted },
                  ]}
                >
                  {opt.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {!st.tmSearchMode ? (
            <>
              <PhoneInput
                label="Phone Number"
                value={st.phoneInput}
                onChange={(val) => st.setPhoneInput(val)}
              />
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <Button variant="secondary" style={{ flex: 1 }} onPress={close}>
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  style={{ flex: 1 }}
                  disabled={localLoading}
                  onPress={async () => {
                    setLocalLoading(true);
                    try {
                      await st.findUserByPhone();
                    } finally {
                      setLocalLoading(false);
                    }
                  }}
                >
                  {localLoading ? '...' : 'Next'}
                </Button>
              </View>
            </>
          ) : (
            <>
              {/* Textmob search (web 9247-9305) */}
              <View style={[s.searchBox, { backgroundColor: p.cardMuted, borderColor: p.borderLight }]}>
                <Icons.search size={16} color={p.textMuted} />
                <TextInput
                  value={st.tmSearchQuery}
                  onChangeText={onTmSearch}
                  placeholder="Search username or name..."
                  placeholderTextColor={p.textMuted}
                  style={[s.searchInput, { color: p.text }]}
                />
              </View>

              <View style={{ maxHeight: 350 }}>
                {st.isSearchingTm ? (
                  <View style={s.centerPad}>
                    <ActivityIndicator size="large" color={p.accent} />
                  </View>
                ) : st.tmSearchResults.length > 0 ? (
                  <View style={{ gap: 8 }}>
                    {st.tmSearchResults.map((u: any) => (
                      <TouchableOpacity
                        key={u.username}
                        activeOpacity={0.8}
                        style={[s.tmRow, { backgroundColor: p.cardMuted, borderColor: p.borderLight }]}
                        onPress={() =>
                          st.setTempContact({
                            id: u.username,
                            name: u.fullname || u.username,
                            number: u.phone,
                            avatar_url: u.avatar_url,
                            isTextmob: true,
                          })
                        }
                      >
                        <Image
                          source={{ uri: u.avatar_url || DEFAULT_AVATAR }}
                          style={s.tmAvatar}
                        />
                        <View style={{ flex: 1, minWidth: 0 }}>
                          <Text style={[s.tmName, { color: p.text }]} numberOfLines={1}>
                            {u.fullname || u.username}
                          </Text>
                          <Text style={[s.tmHandle, { color: p.textMuted }]}>@{u.username}</Text>
                        </View>
                        <View style={[s.tmChip, { backgroundColor: 'rgba(59,130,246,0.12)' }]}>
                          <Text style={s.tmChipText}>Textmob</Text>
                        </View>
                      </TouchableOpacity>
                    ))}
                  </View>
                ) : st.tmSearchQuery.length >= 2 ? (
                  <View style={s.centerPad}>
                    <Text style={[s.emptyText, { color: p.textMuted }]}>No users found</Text>
                  </View>
                ) : (
                  <View style={s.centerPad}>
                    <Text style={[s.emptyHint, { color: p.textMuted }]}>
                      Search for Textmob users{'\n'}to add them to Messaging
                    </Text>
                  </View>
                )}
              </View>

              <Button
                variant="secondary"
                style={{ width: '100%' }}
                onPress={() => {
                  st.setShowAddContact(false);
                  st.setTmSearchMode(false);
                }}
              >
                Cancel
              </Button>
            </>
          )}
        </View>
      ) : (
        <>
          {/* Confirm contact (web 9313-9340) */}
          <View style={s.confirmHead}>
            <View>
              <Image
                source={{ uri: st.tempContact.avatar_url || DEFAULT_AVATAR }}
                style={s.confirmAvatar}
              />
              {st.tempContact.isTextmob && (
                <View style={s.tmBadge}>
                  <Image
                    source={{
                      uri: 'https://res.cloudinary.com/dzvm9xe1i/image/upload/v1754309761/profile-pictures/gyyonhn4akhjp4awey0t.png',
                    }}
                    style={s.tmBadgeImg}
                  />
                </View>
              )}
            </View>
            <Text style={[s.confirmName, { color: p.text }]}>{st.tempContact.name}</Text>
            <Text style={[s.confirmNumber, { color: p.textMuted }]}>
              {st.tempContact.number}
            </Text>
          </View>

          <Input
            label="Nickname (Optional)"
            value={st.tempContact.customName || st.tempContact.name}
            onChange={(e) =>
              st.setTempContact({ ...st.tempContact, customName: e.target.value })
            }
            placeholder="e.g. Best Friend"
          />

          <View style={{ flexDirection: 'row', gap: 12 }}>
            <Button variant="secondary" style={{ flex: 1 }} onPress={() => st.setTempContact(null)}>
              Back
            </Button>
            <Button
              variant="primary"
              style={{ flex: 1 }}
              disabled={localLoading}
              onPress={async () => {
                setLocalLoading(true);
                try {
                  await st.confirmAddContact();
                } finally {
                  setLocalLoading(false);
                }
              }}
            >
              {localLoading ? '...' : 'Add Contact'}
            </Button>
          </View>
        </>
      )}
    </LoudaModal>
  );
}

const s = StyleSheet.create({
  toggle: {
    flexDirection: 'row',
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 2,
    gap: 2,
  },
  toggleBtn: {
    flex: 1,
    paddingVertical: 9,
    borderRadius: 9,
    alignItems: 'center',
  },
  toggleText: {
    fontSize: 10,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 12,
    height: 46,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    height: '100%',
  },
  centerPad: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 2,
  },
  emptyHint: {
    fontSize: 10,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 2,
    textAlign: 'center',
    lineHeight: 18,
  },
  tmRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
  },
  tmAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  tmName: {
    fontSize: 14,
    fontWeight: '700',
  },
  tmHandle: {
    fontSize: 10,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 1.5,
  },
  tmChip: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  tmChipText: {
    fontSize: 8,
    fontWeight: '900',
    textTransform: 'uppercase',
    color: '#2563eb',
  },
  confirmHead: {
    alignItems: 'center',
    marginBottom: 24,
    marginTop: 8,
  },
  confirmAvatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 4,
    borderColor: '#fff',
    marginBottom: 16,
    backgroundColor: '#e5e7eb',
  },
  tmBadge: {
    position: 'absolute',
    right: -4,
    bottom: 6,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#2563eb',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  tmBadgeImg: {
    width: 15,
    height: 15,
    tintColor: '#fff',
  },
  confirmName: {
    fontSize: 20,
    fontWeight: '900',
    letterSpacing: -0.5,
  },
  confirmNumber: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 2,
    marginTop: 4,
  },
});
