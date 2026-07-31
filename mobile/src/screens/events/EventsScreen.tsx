import React, { useState, useEffect } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  ActivityIndicator, Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { likePostAPI } from '../../api/posts';
import { apiGet } from '../../api/client';
import { useNavigation } from '@react-navigation/native';

export default function EventsScreen() {
  const { colors, isDark } = useTheme();
  const { username } = useAuth();
  const navigation = useNavigation<any>();

  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeId, setActiveId] = useState<string | number | null>(null);

  useEffect(() => { loadEvents(); }, []);

  const loadEvents = async () => {
    setLoading(true);
    try {
      const res = await apiGet(`/events-feed?username=${encodeURIComponent(username || '')}`);
      if (res.ok && res.data) {
        const list = res.data.events || res.data;
        setEvents(Array.isArray(list) ? list : []);
      }
    } catch {}
    setLoading(false);
  };

  const handleInterest = async (postId: string | number) => {
    if (!username) return;
    setEvents(prev => prev.map(e => e.id === postId ? { ...e, likes: e.likes?.includes(username) ? e.likes.filter((u: string) => u !== username) : [...(e.likes || []), username] } : e));
    await likePostAPI(String(postId), username).catch(() => {});
  };

  const s = makeStyles(colors, isDark);

  return (
    <SafeAreaView style={[s.safe, { backgroundColor: colors.background }]}>
      <View style={[s.header, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <View style={{ flex: 1 }}>
          <Text style={[s.headerTitle, { color: colors.textPrimary }]}>Events</Text>
          <Text style={{ fontSize: 11, color: colors.textSecondary, marginTop: 1 }}>Explore community meetups and events</Text>
        </View>
        <TouchableOpacity onPress={() => navigation.navigate('CreateEvent')} style={s.createBtn}>
          <Text style={s.createBtnText}>+ Create</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={{ padding: 16, gap: 12 }}>
          {[0, 1, 2].map(i => (
            <View key={i} style={[s.skeleton, { backgroundColor: isDark ? '#1e293b' : '#e5e7eb' }]} />
          ))}
        </View>
      ) : (
        <FlatList
          data={events}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={s.listContent}
          renderItem={({ item }) => {
            const ended = new Date(item.scheduled_for || '') <= new Date();
            const liked = item.likes?.includes(username || '');
            const expanded = activeId === item.id;
            const dateStr = item.scheduled_for ? new Date(item.scheduled_for).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '';
            return (
              <View style={[s.eventRow, { borderBottomColor: colors.border }]}>
                <TouchableOpacity onPress={() => setActiveId(expanded ? null : item.id)} style={s.rowClickable}>
                  <View style={{ flex: 1, paddingRight: 8 }}>
                    <View style={[s.dateBadge, { backgroundColor: isDark ? 'rgba(59,130,246,0.15)' : '#eff6ff' }]}>
                      <Ionicons name="calendar-outline" size={11} color="#2563eb" />
                      <Text style={s.dateText}>{dateStr}{ended ? ' · Ended' : ''}</Text>
                    </View>
                    <Text style={[s.eventTitle, { color: colors.textPrimary }]}>{item.title || item.text}</Text>
                    <Text style={s.byAuthor}>
                      by{' '}
                      <Text
                        onPress={() => navigation.navigate('Profile', { username: item.username })}
                        style={{ color: '#2563eb', fontWeight: '700' }}
                      >
                        @{item.username}
                      </Text>
                    </Text>
                  </View>
                  <Ionicons name="chevron-down" size={16} color={colors.textSecondary} style={expanded && { transform: [{ rotate: '180deg' }] }} />
                </TouchableOpacity>

                {expanded && (
                  <View style={s.expandedBox}>
                    {item.text && <Text style={[s.eventDesc, { color: colors.textSecondary }]}>{item.text}</Text>}
                    {item.location && (
                      <View style={s.locationRow}>
                        <Ionicons name="location-outline" size={13} color={colors.textSecondary} />
                        <Text style={{ fontSize: 12, color: colors.textSecondary }}>{item.location}</Text>
                      </View>
                    )}
                    {item.registration_url && (
                      <TouchableOpacity style={s.registerLink} onPress={() => Linking.openURL(item.registration_url)}>
                        <Ionicons name="open-outline" size={13} color="#2563eb" />
                        <Text style={{ fontSize: 12, fontWeight: '700', color: '#2563eb' }}>Register / Learn more</Text>
                      </TouchableOpacity>
                    )}
                    <TouchableOpacity
                      style={[s.interestBtn, liked ? { backgroundColor: '#2563eb' } : ended ? { backgroundColor: isDark ? '#334155' : '#e5e7eb' } : { backgroundColor: isDark ? 'rgba(59,130,246,0.15)' : '#eff6ff' }]}
                      onPress={() => !ended && handleInterest(item.id)}
                      disabled={ended}
                    >
                      <Ionicons name={liked ? 'heart' : 'heart-outline'} size={14} color={liked ? '#fff' : ended ? colors.textSecondary : '#2563eb'} />
                      <Text style={[s.interestText, { color: liked ? '#fff' : ended ? colors.textSecondary : '#2563eb' }]}>
                        {ended ? `${item.likes?.length || 0} attended` : liked ? `${item.likes?.length || 0} interested · remove` : `${item.likes?.length || 0} interested`}
                      </Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            );
          }}
          ListEmptyComponent={
            <View style={s.emptyState}>
              <Ionicons name="calendar-outline" size={48} color={colors.textSecondary} />
              <Text style={[s.emptyLabel, { color: colors.textSecondary }]}>No upcoming events.</Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const makeStyles = (colors: any, isDark: boolean) => StyleSheet.create({
  safe: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', height: 60, paddingHorizontal: 16, borderBottomWidth: StyleSheet.hairlineWidth },
  headerTitle: { fontSize: 18, fontWeight: '800' },
  createBtn: { paddingHorizontal: 16, paddingVertical: 6, borderRadius: 20, backgroundColor: '#2563eb' },
  createBtnText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  skeleton: { height: 80, borderRadius: 16, marginBottom: 12 },
  listContent: { paddingBottom: 100 },
  eventRow: { borderBottomWidth: StyleSheet.hairlineWidth, paddingVertical: 14 },
  rowClickable: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16 },
  dateBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10, alignSelf: 'flex-start', marginBottom: 6 },
  dateText: { fontSize: 10, fontWeight: '700', color: '#2563eb' },
  eventTitle: { fontSize: 14, fontWeight: '700' },
  byAuthor: { fontSize: 11, color: '#9ca3af', marginTop: 2 },
  expandedBox: { paddingHorizontal: 16, marginTop: 10, gap: 10 },
  eventDesc: { fontSize: 13, lineHeight: 18 },
  locationRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  registerLink: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  interestBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 8, paddingHorizontal: 14, borderRadius: 20, alignSelf: 'flex-start' },
  interestText: { fontSize: 12, fontWeight: '700' },
  emptyState: { alignItems: 'center', paddingTop: 100 },
  emptyLabel: { fontSize: 14, marginTop: 8 },
});
