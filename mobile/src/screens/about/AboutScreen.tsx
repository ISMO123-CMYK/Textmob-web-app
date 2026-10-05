import React from 'react';
import {
  View, Text, StyleSheet,
  ScrollView, Linking,
} from 'react-native';
import { Ripple } from '../../components/Ripple';
import Ionicons from '@expo/vector-icons/build/Ionicons';
import Constants from 'expo-constants';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../context/ThemeContext';

export default function AboutScreen({ navigation }: { navigation: any }) {
  const { colors, isDark } = useTheme();

  const s = makeStyles(colors, isDark);
  const appVersion = (Constants.expoConfig && Constants.expoConfig.version) || '';

  return (
    <SafeAreaView style={[s.safe, { backgroundColor: colors.background }]}>
      <View style={[s.header, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <Ripple onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
        </Ripple>
        <Text style={[s.headerTitle, { color: colors.textPrimary }]}>About</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={{ padding: 24, gap: 20 }}>
        <View style={s.logoArea}>
          <Ionicons name="phone-portrait" size={64} color={colors.textPrimary} />
          <Text style={[s.appName, { color: colors.textPrimary }]}>Textmob</Text>
          <Text style={[s.version, { color: colors.textSecondary }]}>Version {appVersion || '1.0.0'}</Text>
        </View>

        <Text style={[s.description, { color: colors.textSecondary }]}>
          Textmob is where Africa comes to talk — a social network built around African conversations. See what&apos;s being discussed, share your take, and find your community.
        </Text>

        <Ripple style={[s.linkRow, { borderBottomColor: colors.border }]} onPress={() => Linking.openURL('https://textmob.web.app/privacy.html')}>
          <Text style={s.linkText}>Privacy Policy</Text>
        </Ripple>
        <Ripple style={[s.linkRow, { borderBottomColor: colors.border }]} onPress={() => Linking.openURL('https://textmob.web.app/terms.html')}>
          <Text style={s.linkText}>Terms of Service</Text>
        </Ripple>
        <Ripple style={[s.linkRow, { borderBottomColor: colors.border }]} onPress={() => Linking.openURL('https://textmob.web.app/about.html')}>
          <Text style={s.linkText}>Contact Support</Text>
        </Ripple>
      </ScrollView>
    </SafeAreaView>
  );
}

const makeStyles = (colors: any, isDark: boolean) => StyleSheet.create({
  safe: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 52,
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerTitle: { fontSize: 18, fontWeight: '700' },
  logoArea: { alignItems: 'center', paddingVertical: 32, gap: 4 },
  appName: { fontSize: 28, fontWeight: '800' },
  version: { fontSize: 13 },
  description: { fontSize: 14, lineHeight: 20, textAlign: 'center' },
  linkRow: {
    paddingVertical: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  linkText: { color: '#2563eb', fontSize: 15, fontWeight: '500' },
});
