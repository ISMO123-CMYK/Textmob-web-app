import React from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../context/ThemeContext';

const WEB_STREAM_URL = 'https://textmob.web.app';

export default function CreateLiveScreen({ navigation }: { navigation: any }) {
  const { colors } = useTheme();

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={styles.container}>
        <View style={styles.iconWrap}>
          <Ionicons name="radio-outline" size={48} color="#dc2626" />
        </View>
        <Text style={[styles.title, { color: colors.textPrimary }]}>Live Streaming</Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          Live streaming is not available on the mobile app.
        </Text>
        <TouchableOpacity
          style={styles.webBtn}
          onPress={() => Linking.openURL(WEB_STREAM_URL)}
          activeOpacity={0.8}
        >
          <Ionicons name="globe-outline" size={18} color="#fff" />
          <Text style={styles.webBtnText}>Go to textmob.web.app to stream</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => navigation.goBack()}
        >
          <Text style={[styles.backBtnText, { color: colors.textSecondary }]}>Go Back</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  iconWrap: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: 'rgba(220,38,38,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 28,
  },
  webBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#2563eb',
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 16,
    marginBottom: 16,
  },
  webBtnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
  backBtn: {
    paddingVertical: 10,
    paddingHorizontal: 20,
  },
  backBtnText: {
    fontSize: 14,
    fontWeight: '600',
  },
});