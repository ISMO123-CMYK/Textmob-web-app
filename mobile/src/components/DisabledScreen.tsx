// Full-screen block shown while the session user is disabled.
// Port of client/src/components/layout/AppWrapper.jsx <DisabledScreen />.
import React from 'react';
import {
  View, Text, ScrollView, StyleSheet, Linking, TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/build/Ionicons';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';

const APPEAL_LINKS = [
  {
    label: '07087421125',
    url: 'https://wa.me/2347087421125?text=I%20want%20to%20appeal%20my%20suspended%20Textmob%20account',
  },
  {
    label: '070505781322',
    url: 'https://wa.me/2347050578132?text=I%20want%20to%20appeal%20my%20suspended%20Textmob%20account',
  },
];

export default function DisabledScreen() {
  const { colors, isDark } = useTheme();
  const { logout } = useAuth();

  const openLink = (url: string) => {
    Linking.openURL(url).catch(() => {});
  };

  return (
    <SafeAreaView style={[s.safe, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={s.scroll}>
        <View style={[s.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={s.header}>
            <View style={s.icon}><Ionicons name="lock-closed" size={26} color="#fff" /></View>
            <Text style={s.headerTitle}>Account Disabled</Text>
            <Text style={s.headerSub}>
              Your account has been disabled for violating our Terms of Service.
            </Text>
          </View>

          <View style={s.body}>
            <Text style={[s.sectionTitle, { color: colors.textSecondary }]}>Why this happened</Text>
            <Text style={[s.paragraph, { color: isDark ? '#cbd5e1' : '#334155' }]}>
              After a recent review, we determined that your account activity did not comply with our
              Terms and Conditions. As a result, your access has been restricted.
            </Text>
            <Text style={[s.paragraph, { color: isDark ? '#cbd5e1' : '#334155' }]}>
              You are no longer able to post, like, comment, or interact with content on Textmob.
            </Text>

            <View style={s.divider} />

            <Text style={[s.sectionTitle, { color: colors.textSecondary }]}>How to appeal</Text>
            <Text style={[s.paragraph, { color: isDark ? '#cbd5e1' : '#334155' }]}>
              If you believe this was a mistake or would like to request reactivation, please reach
              out to our support team via WhatsApp:
            </Text>

            <View style={[s.appealBox, { backgroundColor: isDark ? '#0f172a' : '#f8fafc', borderColor: colors.border }]}>
              <Text style={[s.appealTitle, { color: colors.textPrimary }]}>Contact Support</Text>
              {APPEAL_LINKS.map((l, i) => (
                <TouchableOpacity
                  key={l.url}
                  style={[s.waBtn, { borderColor: colors.border, backgroundColor: colors.card, marginBottom: i === APPEAL_LINKS.length - 1 ? 0 : 8 }]}
                  onPress={() => openLink(l.url)}
                  activeOpacity={0.7}
                >
                  <Ionicons name="logo-whatsapp" size={18} color="#2563eb" />
                  <Text style={[s.waText, { color: colors.textPrimary }]}>{l.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <TouchableOpacity
            style={[s.footer, { borderTopColor: colors.border }]}
            onPress={() => logout()}
            activeOpacity={0.7}
          >
            <Ionicons name="log-out-outline" size={15} color="#ef4444" />
            <Text style={s.footerText}>Log out</Text>
          </TouchableOpacity>
        </View>

        <Text style={[s.copyright, { color: colors.textSecondary }]}>
          © 2026 Textmob. All rights reserved.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1 },
  scroll: { flexGrow: 1, justifyContent: 'center', padding: 20 },
  card: { borderRadius: 16, overflow: 'hidden', borderWidth: StyleSheet.hairlineWidth, maxWidth: 480, width: '100%', alignSelf: 'center' },
  header: { backgroundColor: '#dc2626', padding: 26, alignItems: 'center' },
  icon: {
    width: 54, height: 54, borderRadius: 27, backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center', justifyContent: 'center', marginBottom: 14,
  },
  headerTitle: { color: '#fff', fontSize: 21, fontWeight: '800', marginBottom: 6, textAlign: 'center' },
  headerSub: { color: 'rgba(255,255,255,0.88)', fontSize: 13.5, lineHeight: 20, textAlign: 'center' },
  body: { padding: 24 },
  sectionTitle: { fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10 },
  paragraph: { fontSize: 14, lineHeight: 22, marginBottom: 10 },
  divider: { height: 1, backgroundColor: 'rgba(148,163,184,0.3)', marginVertical: 18 },
  appealBox: { borderRadius: 12, padding: 16, borderWidth: StyleSheet.hairlineWidth, marginTop: 4 },
  appealTitle: { fontSize: 14, fontWeight: '700', marginBottom: 12 },
  waBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 12,
    paddingHorizontal: 16, borderRadius: 10, borderWidth: 1,
  },
  waText: { fontSize: 14, fontWeight: '600' },
  footer: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    paddingVertical: 15, borderTopWidth: StyleSheet.hairlineWidth,
  },
  footerText: { color: '#ef4444', fontSize: 13, fontWeight: '700' },
  copyright: { fontSize: 11, textAlign: 'center', marginTop: 16 },
});
