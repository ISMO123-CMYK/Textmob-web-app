import React, { useState, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  ScrollView, Alert, Image, Linking, Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { apiGet, apiPost } from '../../api/client';
import useProfileCache from '../../hooks/useProfileCache';
import { storage, KEYS } from '../../utils/storage';

const DEFAULT_PIC = 'https://res.cloudinary.com/dzvm9xe1i/image/upload/v1746095979/profile-pictures/e2st5nispbicnhnir9cf.jpg';

export default function MenuScreen({ navigation }: { navigation: any }) {
  const { colors, isDark } = useTheme();
  const { username, logout, login } = useAuth();
  const profile = useProfileCache(username || '');
  const [savedAccounts, setSavedAccounts] = useState<any[]>([]);
  const [showSwitchModal, setShowSwitchModal] = useState(false);

  useEffect(() => {
    storage.getStore(KEYS.SAVED_ACCOUNTS).then((val) => {
      if (val) {
        try {
          setSavedAccounts(JSON.parse(val).map((a: any) => ({ ...a, username: a.username?.toLowerCase() })));
        } catch (e) { /* ignore */ }
      }
    });
  }, []);

  const handleSwitchAccount = async (targetUsername: string, password: string) => {
    setShowSwitchModal(false);
    const result = await login(targetUsername, password);
    if (result.success) {
      navigation.reset({ index: 0, routes: [{ name: 'MainTabs' }] });
    } else {
      Alert.alert('Switch failed', result.error || 'Could not switch account');
    }
  };

  const removeSavedAccount = (targetUsername: string) => {
    const filtered = savedAccounts.filter((a) => a.username !== targetUsername);
    setSavedAccounts(filtered);
    storage.setStore(KEYS.SAVED_ACCOUNTS, JSON.stringify(filtered));
  };

  const handleClearCache = async () => {
    try {
      const currentUser = await storage.getSecure(KEYS.CURRENT_USER);
      const savedAccounts = await storage.getStore(KEYS.SAVED_ACCOUNTS);
      await storage.clearStore();
      if (currentUser) await storage.setSecure(KEYS.CURRENT_USER, currentUser);
      if (savedAccounts) await storage.setStore(KEYS.SAVED_ACCOUNTS, savedAccounts);
      Alert.alert('Cache Cleared', 'App cache has been refreshed successfully.');
    } catch {
      Alert.alert('Error', 'Failed to clear cache.');
    }
  };

  const handleLogout = () => {
    Alert.alert('Log Out', 'Are you sure you want to log out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Log Out', style: 'destructive', onPress: () => { logout(); navigation.reset({ index: 0, routes: [{ name: 'Login' }] }); } },
    ]);
  };

  const sections = [
    {
      title: 'Explore',
      items: [
        { label: 'Your Profile', description: 'See how people view you', icon: 'person-outline' as const, action: () => navigation.navigate('Profile', { username }) },
        { label: 'Activity', description: 'Who noticed you today', icon: 'notifications-outline' as const, action: () => navigation.navigate('Activity') },
        { label: 'Connections', description: 'Your people, your reach', icon: 'people-outline' as const, action: () => navigation.navigate('Connections') },
        { label: 'Snaps', description: 'Short content. Fast attention', icon: 'videocam-outline' as const, action: () => navigation.navigate('Snaps') },
        { label: 'Discover', description: 'Find what is trending now', icon: 'search-outline' as const, action: () => navigation.navigate('Search') },
      ],
    },
    {
      title: 'Money & Control',
      items: [
        { label: 'Wallet', description: 'Your Mobcoins, your power', icon: 'wallet-outline' as const, action: () => navigation.navigate('Wallet') },
        { label: 'Accounts Center', description: 'Switch modes, manage identity', icon: 'settings-outline' as const, action: () => navigation.navigate('AccountsCenter') },
      ],
    },
    {
      title: 'Boost & Status',
      items: [
        { label: 'Hall of Fame', description: 'Top users this week', icon: 'trophy-outline' as const, action: () => navigation.navigate('HallOfFame') },
        { label: 'About Textmob', description: 'How the system works', icon: 'information-circle-outline' as const, action: () => navigation.navigate('About') },
      ],
    },
    {
      title: 'System',
      items: [
        { label: 'Switch Account', description: 'Switch to another saved account', icon: 'people-outline' as const, action: () => setShowSwitchModal(true) },
        { label: 'Clear App Cache', description: 'Refresh data and fix glitches', icon: 'refresh-outline' as const, action: handleClearCache },
      ],
    },
  ];

  const s = makeStyles(colors, isDark);

  return (
    <SafeAreaView edges={['top']} style={[s.safe, { backgroundColor: colors.background }]}>
      <View style={[s.header, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <View style={s.headerContent}>
          <Text style={[s.headerTitle, { color: colors.textPrimary }]}>Menu</Text>
          <Text style={[s.headerSubtitle, { color: colors.textSecondary }]}>@{username}</Text>
        </View>
        <Image source={{ uri: profile.profile_pic || DEFAULT_PIC }} style={s.avatar} />
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 120 }} style={{ flex: 1 }}>
        {/* Featured Card */}
        <View style={[s.featuredCard, { borderColor: isDark ? '#1e3a8a' : '#dbeafe', backgroundColor: isDark ? '#172554' : '#eff6ff' }]}>
          <View style={{ flex: 1, marginRight: 8 }}>
            <Text style={s.featuredBadge}>YOUR NEXT MOVE</Text>
            <Text style={[s.featuredTitle, { color: colors.textPrimary }]}>Grow faster from here</Text>
            <Text style={[s.featuredDesc, { color: colors.textSecondary }]}>
              Manage your profile, earnings, and account tools in one place.
            </Text>
          </View>
          <View style={[s.featuredIconWrap, { backgroundColor: '#2563eb' }]}>
            <Ionicons name="settings-outline" size={24} color="#fff" />
          </View>
        </View>
        <View style={s.featuredButtons}>
          <TouchableOpacity style={[s.featuredBtn, { backgroundColor: '#2563eb' }]} onPress={() => navigation.navigate('AccountsCenter')}>
            <Text style={s.featuredBtnText}>Accounts Center</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[s.featuredBtnSec, { borderColor: '#3b82f6' }]} onPress={() => navigation.navigate('Wallet')}>
            <Text style={[s.featuredBtnSecText, { color: '#2563eb' }]}>View Wallet</Text>
          </TouchableOpacity>
        </View>

        {sections.map((section, si) => (
          <View key={si} style={{ marginTop: 20, paddingHorizontal: 16 }}>
            <Text style={[s.sectionLabel, { color: colors.textSecondary }]}>{section.title}</Text>
            <View style={[s.sectionCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              {section.items.map((item, ii) => (
                <TouchableOpacity
                  key={ii}
                  style={[s.menuRow, ii < section.items.length - 1 && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border }]}
                  onPress={item.action}
                >
                  <View style={[s.menuIconWrap, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : '#f3f4f6' }]}>
                    <Ionicons name={item.icon} size={18} color={colors.primary} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[s.rowLabel, { color: colors.textPrimary }]}>{item.label}</Text>
                    <Text style={[s.rowDesc, { color: colors.textSecondary }]}>{item.description}</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={16} color={colors.textSecondary} />
                </TouchableOpacity>
              ))}
            </View>
          </View>
        ))}

        <TouchableOpacity style={s.logoutBtn} onPress={handleLogout}>
          <View style={[s.logoutIconWrap, { backgroundColor: '#fee2e2' }]}>
            <Ionicons name="log-out-outline" size={18} color="#dc2626" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.logoutLabel}>Log Out</Text>
            <Text style={s.logoutDesc}>End this session</Text>
          </View>
          <Ionicons name="chevron-forward" size={16} color="#fca5a5" />
        </TouchableOpacity>

        {/* Switch Account Modal */}
        <Modal visible={showSwitchModal} transparent animationType="fade" onRequestClose={() => setShowSwitchModal(false)}>
          <TouchableOpacity style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }} activeOpacity={1} onPress={() => setShowSwitchModal(false)}>
            <View style={{ backgroundColor: colors.card, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 40 }} onStartShouldSetResponder={() => true}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                <Text style={{ fontSize: 18, fontWeight: '700', color: colors.textPrimary }}>Switch Account</Text>
                <TouchableOpacity onPress={() => setShowSwitchModal(false)}>
                  <Ionicons name="close" size={24} color={colors.textSecondary} />
                </TouchableOpacity>
              </View>
              {savedAccounts.length === 0 ? (
                <Text style={{ color: colors.textSecondary, textAlign: 'center', paddingVertical: 24 }}>No saved accounts</Text>
              ) : (
                savedAccounts.map((acc) => (
                  <View key={acc.username} style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border }}>
                    <TouchableOpacity style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12 }}
                      onPress={() => handleSwitchAccount(acc.username, acc.password)}>
                      <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: '#dbeafe', alignItems: 'center', justifyContent: 'center' }}>
                        <Text style={{ color: '#2563eb', fontWeight: '800', fontSize: 14 }}>{acc.username.slice(0, 2).toUpperCase()}</Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={{ color: colors.textPrimary, fontWeight: '600', fontSize: 15 }}>@{acc.username}</Text>
                        <Text style={{ color: '#2563eb', fontSize: 12, fontWeight: '600' }}>Tap to switch</Text>
                      </View>
                      <Ionicons name="log-in-outline" size={18} color="#2563eb" />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => removeSavedAccount(acc.username)} style={{ padding: 8 }}>
                      <Ionicons name="close" size={18} color={colors.textSecondary} />
                    </TouchableOpacity>
                  </View>
                ))
              )}
            </View>
          </TouchableOpacity>
        </Modal>
      </ScrollView>
    </SafeAreaView>
  );
}

const makeStyles = (colors: any, isDark: boolean) => StyleSheet.create({
  safe: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', height: 60, paddingHorizontal: 16, borderBottomWidth: StyleSheet.hairlineWidth },
  headerContent: { flex: 1 },
  headerTitle: { fontSize: 18, fontWeight: '700' },
  headerSubtitle: { fontSize: 12, marginTop: 1 },
  avatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#e5e7eb' },
  featuredCard: { margin: 16, marginBottom: 8, borderRadius: 20, borderWidth: 1, padding: 16, flexDirection: 'row', alignItems: 'center' },
  featuredBadge: { fontSize: 10, fontWeight: '800', color: '#3b82f6', letterSpacing: 1 },
  featuredTitle: { fontSize: 15, fontWeight: '800', marginTop: 4 },
  featuredDesc: { fontSize: 12, marginTop: 4, lineHeight: 16 },
  featuredIconWrap: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  featuredButtons: { flexDirection: 'row', gap: 8, paddingHorizontal: 16, marginBottom: 8 },
  featuredBtn: { flex: 1, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  featuredBtnText: { color: '#fff', fontSize: 13, fontWeight: '700' },
  featuredBtnSec: { flex: 1, height: 40, borderRadius: 12, borderWidth: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff' },
  featuredBtnSecText: { fontSize: 13, fontWeight: '700' },
  sectionLabel: { fontSize: 10, fontWeight: '800', textTransform: 'uppercase', paddingHorizontal: 4, marginBottom: 6, letterSpacing: 0.5 },
  sectionCard: { borderRadius: 16, borderWidth: 1, overflow: 'hidden' },
  menuRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12 },
  menuIconWrap: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  rowLabel: { fontSize: 13, fontWeight: '700' },
  rowDesc: { fontSize: 11, marginTop: 1 },
  logoutBtn: { flexDirection: 'row', alignItems: 'center', gap: 12, margin: 16, padding: 12, borderRadius: 16, borderWidth: 1, borderColor: '#fecaca', backgroundColor: '#fff5f5' },
  logoutIconWrap: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  logoutLabel: { fontSize: 13, fontWeight: '700', color: '#dc2626' },
  logoutDesc: { fontSize: 11, color: '#ef4444', marginTop: 1 },
});
