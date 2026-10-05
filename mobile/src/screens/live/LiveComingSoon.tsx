import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { LIVE_SOON_BADGE, LIVE_SOON_TITLE, LIVE_SOON_BODY } from '../../config/live';

/**
 * Placeholder shown anywhere live streaming used to be reachable
 * (home Feed/Live switch, LiveView, CreateLive). Original screens stay
 * intact — they're only gated by LIVE_STREAMING_ENABLED.
 */
export default function LiveComingSoon() {
  const { colors, isDark } = useTheme();
  return (
    <View style={[s.wrap, { backgroundColor: colors.background }]}>
      <View style={[s.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={s.dotRing}>
          <View style={s.dot} />
        </View>
        <Text style={[s.title, { color: colors.textPrimary }]}>{LIVE_SOON_TITLE}</Text>
        <Text style={[s.body, { color: colors.textSecondary }]}>{LIVE_SOON_BODY}</Text>
        <Text style={[s.badge, { color: isDark ? '#64748b' : '#94a3b8' }]}>{LIVE_SOON_BADGE}</Text>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 },
  card: {
    width: '100%',
    maxWidth: 360,
    borderRadius: 18,
    borderWidth: 1,
    paddingVertical: 32,
    paddingHorizontal: 22,
    alignItems: 'center',
  },
  dotRing: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: 'rgba(220,38,38,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(220,38,38,0.20)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  dot: { width: 12, height: 12, borderRadius: 6, backgroundColor: '#dc2626' },
  title: { fontSize: 16, fontWeight: '800', textAlign: 'center', marginBottom: 8 },
  body: { fontSize: 13, lineHeight: 19, textAlign: 'center' },
  badge: {
    marginTop: 18,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
});
