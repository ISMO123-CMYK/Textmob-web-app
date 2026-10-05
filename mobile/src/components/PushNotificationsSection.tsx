import React from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import Ionicons from '@expo/vector-icons/build/Ionicons';
import { Ripple } from './Ripple';
import { usePushNotifications } from '../hooks/usePushNotifications';

/**
 * The single push-notification control shared by Accounts Center, Menu and
 * Louda Settings. Same hook => same OS permission + same server token in
 * both Textmob and Louda, so one switch really does turn both off.
 */
export function PushNotificationsSection({
  colors,
  isDark,
  accent = '#2563eb',
  label = 'PUSH NOTIFICATIONS',
  showLabel = true,
  title = 'Push notifications',
  description = 'Message, activity and Louda alerts on this device.',
  style,
}: {
  colors: any;
  isDark: boolean;
  accent?: string;
  label?: string;
  showLabel?: boolean;
  title?: string;
  description?: string;
  style?: any;
}) {
  const { enabled, loading, busy, setEnabled } = usePushNotifications();

  const onToggle = () => {
    if (loading || busy) return;
    setEnabled(!enabled).catch(() => {});
  };

  return (
    <View style={style}>
      {showLabel && (
        <Text style={[s.sectionLabel, { color: colors.textSecondary }]}>{label}</Text>
      )}
      <View style={[s.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={s.row}>
          <View style={[s.icon, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : '#f3f4f6' }]}>
            <Ionicons name="notifications-outline" size={18} color={accent} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[s.title, { color: colors.textPrimary }]}>{title}</Text>
            <Text style={[s.desc, { color: colors.textSecondary }]}>{description}</Text>
          </View>
          {loading ? (
            <ActivityIndicator size="small" color={accent} />
          ) : (
            <Ripple
              onPress={onToggle}
              disabled={busy}
              accessibilityLabel="Toggle push notifications"
              style={[
                s.switch,
                { backgroundColor: enabled ? accent : '#d1d5db' },
                busy && { opacity: 0.6 },
              ]}
            >
              <View style={[s.knob, { alignSelf: enabled ? 'flex-end' : 'flex-start' }]} />
            </Ripple>
          )}
        </View>
        <Text style={[s.hint, { color: colors.textSecondary }]}>
          {enabled
            ? 'On — Textmob activity and Louda messages both use this switch.'
            : 'Off — no push on this device. Turn on and allow the system prompt to re-enable.'}
        </Text>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  sectionLabel: {
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 8,
    marginTop: 16,
    textTransform: 'uppercase',
  },
  card: { borderRadius: 14, borderWidth: 1, padding: 14 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  icon: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 14, fontWeight: '700' },
  desc: { fontSize: 11, marginTop: 2, lineHeight: 15 },
  switch: { width: 46, height: 26, borderRadius: 13, padding: 3, justifyContent: 'center' },
  knob: { width: 20, height: 20, borderRadius: 10, backgroundColor: '#fff' },
  hint: { fontSize: 10, lineHeight: 15, marginTop: 10 },
});
