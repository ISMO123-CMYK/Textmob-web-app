import React from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  ScrollView, Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../context/ThemeContext';

export default function AboutScreen({ navigation }: { navigation: any }) {
  const { colors, isDark } = useTheme();

  const s = makeStyles(colors, isDark);

  return (
    <SafeAreaView style={[s.safe, { backgroundColor: colors.background }]}>
      <View style={[s.header, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={[s.headerTitle, { color: colors.textPrimary }]}>About</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={{ padding: 24, gap: 20 }}>
        <View style={s.logoArea}>
          <Ionicons name="phone-portrait" size={64} color={colors.textPrimary} />
          <Text style={[s.appName, { color: colors.textPrimary }]}>Textmob</Text>
          <Text style={[s.version, { color: colors.textSecondary }]}>Version 1.0.0</Text>
        </View>

        <Text style={[s.description, { color: colors.textSecondary }]}>
          Textmob is a social media platform for sharing thoughts, photos, videos, and connecting with people around the world.
        </Text>

        <TouchableOpacity style={[s.linkRow, { borderBottomColor: colors.border }]} onPress={() => Linking.openURL('https://textmob.web.app/privacy.html')}>
          <Text style={s.linkText}>Privacy Policy</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[s.linkRow, { borderBottomColor: colors.border }]} onPress={() => Linking.openURL('https://textmob.web.app/terms.html')}>
          <Text style={s.linkText}>Terms of Service</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[s.linkRow, { borderBottomColor: colors.border }]} onPress={() => Linking.openURL('https://textmob..web.app/about.html')}>
          <Text style={s.linkText}>Contact Support</Text>
        </TouchableOpacity>
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
