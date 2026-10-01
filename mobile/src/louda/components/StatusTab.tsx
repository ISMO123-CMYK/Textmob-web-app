import React, { memo, useState } from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  ScrollView,
  Modal,
  StyleSheet,
  Alert,
} from 'react-native';
import { useLoudaTheme, StatusRing } from './primitives';
import { Icons } from '../icons';
import { DEFAULT_AVATAR } from '../constants';
import * as api from '../api';

// Port of StatusTab (StatusComponents.jsx:67-217)
export const StatusTab = memo(function StatusTab({
  user,
  contacts,
  statuses,
  onOpenCreator,
  onOpenViewer,
  onOpenCamera,
}: {
  user: any;
  contacts: any[];
  statuses: any[];
  onOpenCreator: () => void;
  onOpenViewer: (id: string) => void;
  onOpenCamera: () => void;
}) {
  const { p } = useLoudaTheme();
  const [showMyList, setShowMyList] = useState(false);
  const myStatuses = statuses.filter((s) => s.user_id === user.id);
  const contactStatuses = statuses.filter((s) => s.user_id !== user.id);

  // Group by user (web 78-87)
  const groupedContacts = contacts
    .map((c) => {
      const userStatuses = contactStatuses.filter((s) => s.user_id === c.id);
      return {
        ...c,
        statuses: userStatuses,
        latestTimestamp: userStatuses.length
          ? Math.max(...userStatuses.map((s) => new Date(s.timestamp).getTime()))
          : 0,
      };
    })
    .filter((c) => c.statuses.length > 0)
    .sort((a, b) => b.latestTimestamp - a.latestTimestamp);

  const formatTime = (ts: number) => {
    const d = new Date(ts);
    const today = new Date();
    const t = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    if (d.getDate() === today.getDate() && d.getMonth() === today.getMonth())
      return `Today, ${t}`;
    return `Yesterday, ${t}`;
  };

  const handleDeleteStatus = (statusId: string) => {
    Alert.alert('Delete', 'Delete this status update?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await api.deleteStatus(statusId, user.id);
            if (myStatuses.length === 1) setShowMyList(false);
          } catch (err) {
            Alert.alert('', 'Failed to delete status');
          }
        },
      },
    ]);
  };

  return (
    <View style={[s.root, { backgroundColor: p.card }]}>
      <ScrollView>
        {/* Header (web 115-121) */}
        <View style={[s.header, { borderBottomColor: p.borderLight, backgroundColor: p.card }]}>
          <Text style={[s.h1, { color: p.text }]}>Status</Text>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <TouchableOpacity style={[s.headBtn, { backgroundColor: p.cardMuted }]} onPress={onOpenCamera}>
              <Icons.camera size={17} color={p.textSecondary} />
            </TouchableOpacity>
            <TouchableOpacity style={[s.headBtn, { backgroundColor: p.cardMuted }]} onPress={onOpenCreator}>
              <Icons.edit size={17} color={p.textSecondary} />
            </TouchableOpacity>
          </View>
        </View>

        {/* My status row (web 123-139) */}
        <View style={s.section}>
          <TouchableOpacity
            activeOpacity={0.8}
            style={s.row}
            onPress={() => (myStatuses.length > 0 ? setShowMyList(true) : onOpenCreator())}
          >
            <View style={s.avatarBox}>
              <StatusRing statuses={myStatuses} currentUserId={user.id} />
              <Image source={{ uri: user.avatar_url || DEFAULT_AVATAR }} style={s.avatar} />
              {myStatuses.length === 0 && (
                <View style={s.plusBadge}>
                  <Icons.plus size={13} color="#fff" />
                </View>
              )}
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[s.rowTitle, { color: p.text }]}>My Status</Text>
              <Text style={[s.rowSub, { color: p.textMuted }]}>
                {myStatuses.length > 0
                  ? `${myStatuses.length} update${myStatuses.length > 1 ? 's' : ''}`
                  : 'Tap to add status update'}
              </Text>
            </View>
          </TouchableOpacity>
        </View>

        <View style={[s.divider, { backgroundColor: p.cardMuted }]} />

        {/* Recent updates (web 143-161) */}
        <View style={s.section}>
          <Text style={[s.sectionLabel, { color: p.textMuted }]}>Recent updates</Text>
          {groupedContacts.length === 0 && (
            <Text style={[s.empty, { color: p.textMuted }]}>No recent updates.</Text>
          )}
          <View style={{ gap: 4 }}>
            {groupedContacts.map((c) => (
              <TouchableOpacity
                key={c.id}
                activeOpacity={0.8}
                style={s.row}
                onPress={() => onOpenViewer(c.id)}
              >
                <View style={s.avatarBox}>
                  <StatusRing statuses={c.statuses} currentUserId={user.id} />
                  <Image source={{ uri: c.avatar_url || DEFAULT_AVATAR }} style={s.avatar} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[s.rowTitle, { color: p.text }]} numberOfLines={1}>
                    {c.name || c.number}
                  </Text>
                  <Text style={[s.rowSub, { color: p.textMuted }]}>{formatTime(c.latestTimestamp)}</Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </ScrollView>

      {/* My Statuses list (web 164-214) */}
      <Modal visible={showMyList} animationType="slide" onRequestClose={() => setShowMyList(false)}>
        <View style={[s.root, { backgroundColor: p.card }]}>
          <View style={[s.header, { borderBottomColor: p.borderLight, backgroundColor: p.card }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <TouchableOpacity onPress={() => setShowMyList(false)} style={{ padding: 4 }}>
                <Icons.arrowLeft size={22} color={p.textMuted} />
              </TouchableOpacity>
              <Text style={[s.h2, { color: p.text }]}>My Status Updates</Text>
            </View>
            <TouchableOpacity
              style={s.addNew}
              onPress={() => {
                setShowMyList(false);
                onOpenCreator();
              }}
            >
              <Icons.plus size={15} color="#E64A19" />
              <Text style={s.addNewText}>Add New</Text>
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }}>
            {myStatuses.map((st) => (
              <TouchableOpacity
                key={st.id}
                activeOpacity={0.8}
                style={[s.myRow, { backgroundColor: p.cardMuted, borderColor: p.borderLight }]}
                onPress={() => {
                  setShowMyList(false);
                  onOpenViewer(user.id);
                }}
              >
                <View style={s.thumb}>
                  {st.type === 'text' ? (
                    <Text
                      style={[
                        s.thumbText,
                        { backgroundColor: st.settings?.bg || '#000', fontFamily: undefined },
                      ]}
                      numberOfLines={3}
                    >
                      {st.content}
                    </Text>
                  ) : st.type === 'image' ? (
                    <Image source={{ uri: st.media_url }} style={s.thumbImg} />
                  ) : (
                    <View style={[s.thumbImg, { alignItems: 'center', justifyContent: 'center' }]}>
                      <Icons.play size={18} color="#fff" />
                    </View>
                  )}
                </View>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                    <Text style={[s.myTitle, { color: p.text }]} numberOfLines={1}>
                      {st.type === 'text'
                        ? st.content
                        : `${st.type.charAt(0).toUpperCase() + st.type.slice(1)} update`}
                    </Text>
                    <Text style={{ fontSize: 11, color: p.textMuted, fontWeight: '500' }}>
                      {formatTime(st.timestamp)}
                    </Text>
                  </View>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                    <View style={[s.viewsChip, { backgroundColor: p.card }]}>
                      <Icons.eye size={13} color={p.textSecondary} />
                      <Text style={{ fontSize: 11, fontWeight: '700', color: p.textSecondary }}>
                        {st.views?.length || 0} views
                      </Text>
                    </View>
                    {!!st.music?.name && (
                      <Text style={{ fontSize: 11, color: p.textMuted, fontWeight: '700' }} numberOfLines={1}>
                        ðŸŽµ {st.music.name}
                      </Text>
                    )}
                  </View>
                </View>
                <TouchableOpacity style={{ padding: 8 }} onPress={() => handleDeleteStatus(st.id)}>
                  <Icons.trash size={18} color={p.textMuted} />
                </TouchableOpacity>
              </TouchableOpacity>
            ))}
            {myStatuses.length === 0 && (
              <Text style={[s.empty, { color: p.textMuted, paddingVertical: 64 }]}>
                No active status updates.
              </Text>
            )}
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
});

const s = StyleSheet.create({
  root: { flex: 1 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    backgroundColor: 'rgba(255,255,255,0.92)',
    zIndex: 10,
  },
  h1: { fontSize: 22, fontWeight: '900', letterSpacing: -0.5 },
  h2: { fontSize: 17, fontWeight: '900' },
  headBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  section: { paddingHorizontal: 16, paddingVertical: 12 },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 3,
    marginBottom: 12,
    paddingHorizontal: 8,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    padding: 8,
    borderRadius: 16,
  },
  avatarBox: { width: 56, height: 56, flexShrink: 0 },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    position: 'absolute',
    top: 2,
    left: 2,
  },
  plusBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#2563eb',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2.5,
    borderColor: '#fff',
  },
  rowTitle: { fontSize: 16, fontWeight: '700', marginBottom: 4 },
  rowSub: { fontSize: 13, fontWeight: '500' },
  divider: { height: 6, width: '100%' },
  empty: { textAlign: 'center', paddingVertical: 40, fontSize: 14, fontWeight: '500' },
  addNew: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: 'rgba(230,74,25,0.08)',
  },
  addNewText: { fontSize: 13, fontWeight: '700', color: '#E64A19' },
  myRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 12,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
  },
  thumb: {
    width: 56,
    height: 56,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#000',
    flexShrink: 0,
  },
  thumbImg: { width: '100%', height: '100%' },
  thumbText: {
    width: '100%',
    height: '100%',
    color: '#fff',
    fontSize: 10,
    fontWeight: '700',
    textAlign: 'center',
    textAlignVertical: 'center',
    padding: 4,
  },
  myTitle: { fontSize: 14, fontWeight: '700', flexShrink: 1 },
  viewsChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
});
