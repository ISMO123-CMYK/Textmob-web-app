import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  ScrollView, Alert, Image, Modal, TextInput, ActivityIndicator, Linking
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import {
  getAccountStatsAPI, getProfileAPI, updateProfileAPI,
  changePasswordAPI, updateProfileTypeAPI, deactivateAccountAPI,
  updateNotificationPrefsAPI
} from '../../api/auth';
import { migrateFriendsAPI } from '../../api/users';
import { apiGet, apiPost, apiDelete } from '../../api/client';
import useProfileCache, { invalidateProfileCache } from '../../hooks/useProfileCache';

const DEFAULT_PIC = 'https://res.cloudinary.com/dzvm9xe1i/image/upload/v1746095979/profile-pictures/e2st5nispbicnhnir9cf.jpg';

export default function AccountsCenterScreen({ navigation }: { navigation: any }) {
  const { colors, isDark } = useTheme();
  const { username, logout } = useAuth();
  const profile = useProfileCache(username || '');

  const [stats, setStats] = useState<{ mobcoins: number; rank: number | null } | null>(null);
  const [activeSub, setActiveSub] = useState<string | null>(null);
  const [posts, setPosts] = useState<any[]>([]);
  const [profileData, setProfileData] = useState<any>(null);

  useEffect(() => {
    if (username) {
      getAccountStatsAPI(username).then(r => { if (r.ok && r.data != null) setStats(r.data); });
      apiGet(`/get-user-posts?username=${encodeURIComponent(username)}`).then(r => {
        if (r.ok && Array.isArray(r.data)) setPosts(r.data);
      });
      getProfileAPI(username).then(r => { if (r.ok && r.data != null) setProfileData(r.data); });
    }
  }, [username]);

  const handleNav = (key: string) => {
    switch (key) {
      case 'home': setActiveSub('home'); break;
      case 'monetize': setActiveSub('monetize'); break;
      case 'analytics': setActiveSub('analytics'); break;
      case 'composer': setActiveSub('composer'); break;
      case 'posts': setActiveSub('posts'); break;
      case 'snaps': setActiveSub('snaps'); break;
      case 'grow': setActiveSub('grow'); break;
      case 'leaderboard': setActiveSub('leaderboard'); break;
      case 'profile': setActiveSub('profile'); break;
      case 'prefs': setActiveSub('prefs'); break;
      case 'danger': setActiveSub('danger'); break;
      case 'verification': setActiveSub('verification'); break;
    }
  };

  const handleLogout = () => {
    Alert.alert('Log Out', 'Are you sure you want to log out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Log Out', style: 'destructive', onPress: () => { logout(); navigation.reset({ index: 0, routes: [{ name: 'Login' }] }); } },
    ]);
  };

  const effectiveProfile = profileData || profile;
  const isOrg = (effectiveProfile?.profile_type || '').toLowerCase() === 'organisation';
  const postsCount = posts.length;

  const accent = isOrg ? '#7c3aed' : colors.primary;

  const renderSubScreen = () => {
    switch (activeSub) {
      case 'home': return <OverviewTab username={username} profile={profile} profileData={profileData} stats={stats} posts={posts} isOrg={isOrg} colors={colors} isDark={isDark} setActiveSub={setActiveSub} accent={accent} />;
      case 'monetize': return <MonetizationTab username={username} stats={stats} isOrg={isOrg} colors={colors} isDark={isDark} />;

      case 'analytics': return <AnalyticsTab posts={posts} stats={stats} profile={profile} isOrg={isOrg} colors={colors} />;
      case 'composer': return <ComposerTab username={username} posts={posts} setPosts={setPosts} colors={colors} isDark={isDark} setActiveSub={setActiveSub} />;
      case 'posts': return <PostsTab posts={posts} setPosts={setPosts} username={username} colors={colors} isDark={isDark} setActiveSub={setActiveSub} />;
      case 'snaps': return <SnapsTab posts={posts} setPosts={setPosts} colors={colors} isDark={isDark} />;
      case 'grow': return <GrowTab stats={stats} profile={profile} postsCount={postsCount} username={username} isOrg={isOrg} colors={colors} setActiveSub={setActiveSub} accent={accent} />;
      case 'leaderboard': return <LeaderboardTab colors={colors} />;
      case 'profile': return <EditProfileTab profile={profileData || profile} setProfileData={setProfileData} username={username} isOrg={isOrg} colors={colors} isDark={isDark} accent={accent} />;
      case 'prefs': return <PrefsTab user={profileData || profile} setProfileData={setProfileData} username={username} colors={colors} isDark={isDark} accent={accent} />;
      case 'verification': return <VerificationTab colors={colors} />;
      case 'danger': return <DangerTab username={username} handleLogout={handleLogout} colors={colors} isDark={isDark} />;
      default: return null;
    }
  };

  const SECTIONS = [
    {
      label: 'Dashboard',
      items: [
        { key: 'home', label: 'Overview', icon: 'home-outline' as const },
        { key: 'monetize', label: 'Earnings', icon: 'cash-outline' as const },
        { key: 'analytics', label: 'Analytics', icon: 'bar-chart-outline' as const },
      ],
    },
    {
      label: 'Content',
      items: [
        { key: 'composer', label: 'New Post', icon: 'add-circle-outline' as const },
        { key: 'posts', label: 'My Posts', icon: 'document-text-outline' as const },
        { key: 'snaps', label: 'Snaps Studio', icon: 'videocam-outline' as const },
      ],
    },
    {
      label: 'Growth',
      items: [
        { key: 'grow', label: 'Milestones', icon: 'trending-up-outline' as const },
        { key: 'leaderboard', label: 'Leaderboard', icon: 'trophy-outline' as const },
      ],
    },
    {
      label: 'Settings',
      items: [
        { key: 'profile', label: 'Edit Profile', icon: 'person-outline' as const },
        { key: 'prefs', label: 'Preferences', icon: 'settings-outline' as const },
        { key: 'danger', label: 'Log Out', icon: 'log-out-outline' as const },
      ],
    },
  ];

  const iconMap: Record<string, { focused: keyof typeof Ionicons.glyphMap; unfocused: keyof typeof Ionicons.glyphMap }> = {
    'home-outline': { focused: 'home', unfocused: 'home-outline' },
    'cash-outline': { focused: 'cash', unfocused: 'cash-outline' },
    'checkmark-circle-outline': { focused: 'checkmark-circle', unfocused: 'checkmark-circle-outline' },
    'bar-chart-outline': { focused: 'bar-chart', unfocused: 'bar-chart-outline' },
    'add-circle-outline': { focused: 'add-circle', unfocused: 'add-circle-outline' },
    'document-text-outline': { focused: 'document-text', unfocused: 'document-text-outline' },
    'videocam-outline': { focused: 'videocam', unfocused: 'videocam-outline' },
    'trending-up-outline': { focused: 'trending-up', unfocused: 'trending-up-outline' },
    'trophy-outline': { focused: 'trophy', unfocused: 'trophy-outline' },
    'person-outline': { focused: 'person', unfocused: 'person-outline' },
    'settings-outline': { focused: 'settings', unfocused: 'settings-outline' },
    'log-out-outline': { focused: 'log-out', unfocused: 'log-out-outline' },
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={[styles.header, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => activeSub ? setActiveSub(null) : navigation.goBack()} style={{ padding: 4 }}>
          <Ionicons name="arrow-back" size={22} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>
          {activeSub ? getTabLabel(activeSub) : 'Accounts Center'}
        </Text>
        <View style={{ width: 40 }} />
      </View>

      {activeSub ? renderSubScreen() : (
        <ScrollView contentContainerStyle={{ paddingBottom: 100 }}>
          <TouchableOpacity style={[styles.profileCard, { backgroundColor: colors.card, borderBottomColor: colors.border }]} onPress={() => navigation.navigate('Profile', { username })}>
            <Image source={{ uri: profile.profile_pic || DEFAULT_PIC }} style={styles.profileAvatar} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.profileName, { color: colors.textPrimary }]}>@{username}</Text>
              {stats && (
                <View style={{ flexDirection: 'row', gap: 16, marginTop: 2 }}>
                  <Text style={styles.profileStat}>{stats.mobcoins} coins</Text>
                  {stats.rank && <Text style={styles.profileStat}>#{stats.rank} rank</Text>}
                </View>
              )}
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
          </TouchableOpacity>

          {SECTIONS.map((section, si) => (
            <View key={si} style={{ marginTop: 16, paddingHorizontal: 12 }}>
              <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>{section.label}</Text>
              <View style={[styles.sectionCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                {section.items.map((item, ii) => {
                  const im = iconMap[item.icon];
                  return (
                    <TouchableOpacity
                      key={item.key}
                      style={[styles.menuRow, ii < section.items.length - 1 && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border }]}
                      onPress={() => handleNav(item.key)}
                    >
                      <View style={[styles.menuIcon, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : '#f3f4f6' }]}>
                        <Ionicons name={im.focused} size={18} color={item.key === 'danger' ? '#dc2626' : colors.primary} />
                      </View>
                      <Text style={[styles.menuText, { color: item.key === 'danger' ? '#dc2626' : colors.textPrimary }]}>{item.label}</Text>
                      <Ionicons name="chevron-forward" size={16} color={colors.textSecondary} />
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          ))}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

function getTabLabel(key: string): string {
  const labels: Record<string, string> = {
    home: 'Overview', monetize: 'Earnings',
    analytics: 'Analytics', composer: 'New Post', posts: 'My Posts',
    snaps: 'Snaps Studio', grow: 'Milestones', leaderboard: 'Leaderboard',
    profile: 'Edit Profile', prefs: 'Preferences', danger: 'Account',
  };
  return labels[key] || key.charAt(0).toUpperCase() + key.slice(1);
}

function OverviewTab({ username, profile, profileData, stats, posts, isOrg, colors, isDark, setActiveSub, accent }: any) {
  const followers = (profile?.followers || []).length;
  const likesCount = posts.reduce((acc: number, p: any) => acc + (p.likes?.length || 0), 0);
  const commentsCount = posts.reduce((acc: number, p: any) => acc + (p.comments?.length || 0), 0);
  const totalInteractions = likesCount + commentsCount;
  const mobcoins = stats?.mobcoins ?? 0;
  const rank = stats?.rank ?? null;
  const avgInteractions = posts.length ? (totalInteractions / posts.length).toFixed(1) : '0';
  const ngnValue = (mobcoins * 0.1).toLocaleString();

  return (
    <ScrollView style={{ padding: 16 }}>
      {!profile?.verified && (
        <TouchableOpacity onPress={() => Linking.openURL('https://wa.me/2347087421125')} style={[styles.cardBlock, { backgroundColor: colors.card, borderColor: '#bfdbfe', marginBottom: 12, flexDirection: 'row', alignItems: 'center', gap: 12 }]}>
          <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: '#eff6ff', alignItems: 'center', justifyContent: 'center' }}>
            <Ionicons name="checkmark-circle" size={22} color="#2563eb" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontWeight: '700', fontSize: 13, color: colors.textPrimary }}>Get verified</Text>
            <Text style={{ fontSize: 11, color: colors.textSecondary }}>Contact us on WhatsApp</Text>
          </View>
          <View style={{ backgroundColor: '#2563eb', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8 }}>
            <Text style={{ color: '#fff', fontWeight: '700', fontSize: 11 }}>Contact</Text>
          </View>
        </TouchableOpacity>
      )}
      {!isOrg && (
        <View style={[styles.cardBlock, { backgroundColor: colors.card, borderColor: '#e9d5ff', marginBottom: 12, flexDirection: 'row', alignItems: 'center', gap: 12 }]}>
          <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: '#faf5ff', alignItems: 'center', justifyContent: 'center' }}>
            <Ionicons name="flash" size={22} color="#9333ea" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontWeight: '700', fontSize: 13, color: colors.textPrimary }}>Switch to Professional</Text>
            <Text style={{ fontSize: 11, color: colors.textSecondary }}>Unlock earnings & analytics</Text>
          </View>
          <TouchableOpacity onPress={() => setActiveSub('profile')} style={{ backgroundColor: '#2563eb', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8 }}>
            <Text style={{ color: '#fff', fontWeight: '700', fontSize: 11 }}>Switch</Text>
          </TouchableOpacity>
        </View>
      )}
      <Text style={[styles.subTitle, { color: colors.textPrimary }]}>Dashboard</Text>
      <View style={{ borderRadius: 16, overflow: 'hidden', marginBottom: 16 }}>
        <View style={{ padding: 20, backgroundColor: isOrg ? '#7c3aed' : '#2563eb' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 }}>
            <Image source={{ uri: profile?.profile_pic || DEFAULT_PIC }} style={{ width: 44, height: 44, borderRadius: 10, borderWidth: 2, borderColor: 'rgba(255,255,255,0.2)' }} />
            <View style={{ flex: 1 }}>
              <Text style={{ color: '#fff', fontWeight: '700', fontSize: 15 }}>{profile?.fullname || username}</Text>
              <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 11 }}>@{username}</Text>
            </View>
            {isOrg && <View style={{ backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4 }}><Text style={{ color: '#fff', fontSize: 9, fontWeight: '800' }}>PRO</Text></View>}
          </View>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {[
              { label: 'Followers', value: followers.toLocaleString() },
              { label: 'Balance', value: `₦${ngnValue}` },
              { label: 'Interactions', value: totalInteractions.toLocaleString() },
            ].map(s => (
              <View key={s.label} style={{ flex: 1, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 10, padding: 10, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' }}>
                <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 9, marginBottom: 4 }}>{s.label}</Text>
                <Text style={{ color: '#fff', fontWeight: '800', fontSize: 16 }}>{s.value}</Text>
              </View>
            ))}
          </View>
        </View>
      </View>
      <View style={{ flexDirection: 'row', gap: 8, marginBottom: 16 }}>
        {[
          { label: 'New Post', icon: 'add-circle', tab: 'composer', bg: '#eff6ff', color: '#2563eb' },
          { label: 'Earnings', icon: 'cash', tab: 'monetize', bg: '#ecfdf5', color: '#059669' },
          { label: 'Analytics', icon: 'bar-chart', tab: 'analytics', bg: '#faf5ff', color: '#9333ea' },
          { label: 'Profile', icon: 'person', tab: 'profile', bg: '#fff7ed', color: '#ea580c' },
        ].map(a => (
          <TouchableOpacity key={a.tab} onPress={() => setActiveSub(a.tab)} style={{ flex: 1, alignItems: 'center', gap: 6, padding: 10, borderRadius: 12, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border }}>
            <View style={{ width: 32, height: 32, borderRadius: 8, backgroundColor: a.bg, alignItems: 'center', justifyContent: 'center' }}>
              <Ionicons name={a.icon as any} size={16} color={a.color} />
            </View>
            <Text style={{ fontSize: 9, fontWeight: '600', color: colors.textSecondary }}>{a.label}</Text>
          </TouchableOpacity>
        ))}
      </View>
      <View style={[styles.cardBlock, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
          <Text style={{ fontSize: 13, fontWeight: '600', color: colors.textPrimary }}>Avg. interactions</Text>
          <Text style={{ fontSize: 15, fontWeight: '800', color: accent }}>{avgInteractions}</Text>
        </View>
        <View style={{ height: 6, backgroundColor: isDark ? '#374151' : '#f3f4f6', borderRadius: 3, overflow: 'hidden' }}>
          <View style={{ height: '100%', backgroundColor: accent, width: `${Math.min(100, (Number(avgInteractions) / 5) * 100)}%`, borderRadius: 3 }} />
        </View>
        <Text style={{ color: colors.textSecondary, fontSize: 11, marginTop: 6 }}>{totalInteractions} total across {posts.length} posts</Text>
      </View>
      {rank && (
        <TouchableOpacity style={[styles.cardBlock, { backgroundColor: colors.card, borderColor: colors.border, flexDirection: 'row', alignItems: 'center', gap: 12 }]} onPress={() => setActiveSub('grow')}>
          <View style={{ width: 36, height: 36, borderRadius: 8, backgroundColor: '#fefce8', alignItems: 'center', justifyContent: 'center' }}>
            <Ionicons name="trophy" size={18} color="#eab308" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontWeight: '700', fontSize: 13, color: colors.textPrimary }}>#{rank} on leaderboard</Text>
            <Text style={{ fontSize: 11, color: colors.textSecondary }}>Keep posting to climb higher</Text>
          </View>
          <Ionicons name="chevron-forward" size={16} color={colors.textSecondary} />
        </TouchableOpacity>
      )}
    </ScrollView>
  );
}

function MonetizationTab({ username, stats, isOrg, colors, isDark }: any) {
  const accentBg = isOrg ? '#7c3aed' : '#2563eb';
  const [balance, setBalance] = useState(stats?.mobcoins || 0);
  const [payouts, setPayouts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showRedeem, setShowRedeem] = useState(false);
  const [redeemType, setRedeemType] = useState('CASH');
  const [redeemAmount, setRedeemAmount] = useState('');
  const [details, setDetails] = useState({ bank: '', account_no: '', name: '', network: 'MTN', phone: '' });
  const [status, setStatus] = useState<{ ok: boolean; text: string } | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    apiGet(`/api/user/payouts?userId=${encodeURIComponent(username)}`).then(r => {
      if (r.ok) setPayouts(r.data);
      setLoading(false);
    });
  }, [username]);

  const handleRedeem = async () => {
    const amount = Number(redeemAmount);
    if (amount < 2000) return setStatus({ ok: false, text: 'Minimum 2,000 coins required' });
    if (amount > balance) return setStatus({ ok: false, text: 'Not enough coins' });
    setSubmitting(true);
    try {
      const res = await apiPost('/api/redeem', {
        userId: username, amount, type: redeemType,
        details: redeemType === 'CASH' ? { bank: details.bank, account_no: details.account_no, name: details.name } : { network: details.network, phone: details.phone }
      });
      if (res.ok) {
        setStatus({ ok: true, text: 'Request sent!' });
        setBalance((prev: number) => prev - amount);
        setTimeout(() => setShowRedeem(false), 2000);
      } else throw new Error(res.data?.error || 'Request failed');
    } catch (err: any) { setStatus({ ok: false, text: err.message }); }
    finally { setSubmitting(false); }
  };

  const ngnValue = (balance * 0.1).toLocaleString();

  return (
    <ScrollView style={{ padding: 16 }}>
      <View style={{ borderRadius: 16, overflow: 'hidden', marginBottom: 16, backgroundColor: '#059669', padding: 20 }}>
        <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 11, marginBottom: 4 }}>Total balance</Text>
        <Text style={{ color: '#fff', fontSize: 28, fontWeight: '800', marginBottom: 4 }}>₦{ngnValue}</Text>
        <Text style={{ color: 'rgba(255,255,255,0.6)', fontSize: 11 }}>= {balance.toLocaleString()} coins</Text>
        <View style={{ flexDirection: 'row', gap: 12, marginTop: 16, alignItems: 'center' }}>
          <TouchableOpacity
            disabled={!isOrg || balance < 2000}
            onPress={() => isOrg ? setShowRedeem(true) : Alert.alert('Access Restricted', 'Switch to Professional account to redeem earnings.')}
            style={{ flex: 1, height: 44, borderRadius: 10, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', opacity: (!isOrg || balance < 2000) ? 0.4 : 1 }}
          >
            <Text style={{ color: '#059669', fontWeight: '700', fontSize: 13 }}>{isOrg ? 'Cash out' : 'Upgrade to cash out'}</Text>
          </TouchableOpacity>
          <View style={{ paddingLeft: 12, borderLeftWidth: 1, borderLeftColor: 'rgba(255,255,255,0.1)' }}>
            <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 9 }}>Minimum</Text>
            <Text style={{ color: '#fff', fontWeight: '700', fontSize: 13 }}>2,000 coins</Text>
          </View>
        </View>
      </View>
      {!isOrg && (
        <View style={{ backgroundColor: '#fef3c7', borderWidth: 1, borderColor: '#fcd34d', borderRadius: 12, padding: 14, marginBottom: 16 }}>
          <Text style={{ color: '#92400e', fontSize: 12 }}>Personal accounts cannot redeem earnings. Switch to Professional in Edit Profile.</Text>
        </View>
      )}
      <Text style={[styles.subTitle, { color: colors.textPrimary }]}>Payout History</Text>
      {loading ? (
        <ActivityIndicator size="small" color={colors.primary} />
      ) : payouts.length === 0 ? (
        <View style={[styles.cardBlock, { backgroundColor: colors.card, borderColor: colors.border, alignItems: 'center', paddingVertical: 32 }]}>
          <Ionicons name="cash-outline" size={32} color={colors.textSecondary} />
          <Text style={{ color: colors.textSecondary, fontSize: 13, marginTop: 8 }}>No payouts yet</Text>
        </View>
      ) : (
        payouts.map((p, i) => (
          <View key={i} style={[styles.cardBlock, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={{ color: colors.textPrimary, fontWeight: '600' }}>{p.amount} coins - {p.type}</Text>
            <Text style={{ color: colors.textSecondary, fontSize: 11 }}>{new Date(p.created_at).toLocaleDateString()} · {p.status}</Text>
          </View>
        ))
      )}

      <Modal visible={showRedeem} transparent animationType="slide" onRequestClose={() => setShowRedeem(false)}>
        <View style={styles.modalOverlay}>
          <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'flex-end' }}>
            <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
              <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>Cash Out</Text>
              <TextInput
                placeholder="Amount (min 2,000)"
                placeholderTextColor={colors.textSecondary}
                value={redeemAmount}
                onChangeText={setRedeemAmount}
                keyboardType="numeric"
                style={[styles.input, { backgroundColor: isDark ? '#1e293b' : '#f8fafc', color: colors.textPrimary, borderColor: colors.border }]}
              />
              <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12 }}>
                {['CASH', 'AIRTIME'].map(t => (
                  <TouchableOpacity key={t} onPress={() => setRedeemType(t)} style={{ flex: 1, paddingVertical: 10, borderRadius: 8, backgroundColor: redeemType === t ? accentBg : isDark ? '#1e293b' : '#f8fafc', alignItems: 'center' }}>
                    <Text style={{ color: redeemType === t ? '#fff' : colors.textPrimary, fontWeight: '600', fontSize: 12 }}>{t}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              {redeemType === 'CASH' ? (
                <>
                  <TextInput placeholder="Bank name" placeholderTextColor={colors.textSecondary} value={details.bank} onChangeText={v => setDetails(prev => ({ ...prev, bank: v }))} style={[styles.input, { backgroundColor: isDark ? '#1e293b' : '#f8fafc', color: colors.textPrimary, borderColor: colors.border }]} />
                  <TextInput placeholder="Account number" placeholderTextColor={colors.textSecondary} value={details.account_no} onChangeText={v => setDetails(prev => ({ ...prev, account_no: v }))} keyboardType="numeric" style={[styles.input, { backgroundColor: isDark ? '#1e293b' : '#f8fafc', color: colors.textPrimary, borderColor: colors.border }]} />
                  <TextInput placeholder="Account name" placeholderTextColor={colors.textSecondary} value={details.name} onChangeText={v => setDetails(prev => ({ ...prev, name: v }))} style={[styles.input, { backgroundColor: isDark ? '#1e293b' : '#f8fafc', color: colors.textPrimary, borderColor: colors.border }]} />
                </>
              ) : (
                <>
                  <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12 }}>
                    {['MTN', 'GLO', 'AIRTEL', '9MOBILE'].map(n => (
                      <TouchableOpacity key={n} onPress={() => setDetails(prev => ({ ...prev, network: n }))} style={{ paddingVertical: 6, paddingHorizontal: 12, borderRadius: 6, backgroundColor: details.network === n ? accentBg : isDark ? '#1e293b' : '#f8fafc' }}>
                        <Text style={{ color: details.network === n ? '#fff' : colors.textPrimary, fontWeight: '600', fontSize: 10 }}>{n}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                  <TextInput placeholder="Phone number" placeholderTextColor={colors.textSecondary} value={details.phone} onChangeText={v => setDetails(prev => ({ ...prev, phone: v }))} keyboardType="phone-pad" style={[styles.input, { backgroundColor: isDark ? '#1e293b' : '#f8fafc', color: colors.textPrimary, borderColor: colors.border }]} />
                </>
              )}
              {status && (
                <View style={{ backgroundColor: status.ok ? '#d1fae5' : '#fee2e2', padding: 10, borderRadius: 8, marginBottom: 12 }}>
                  <Text style={{ color: status.ok ? '#065f46' : '#991b1b', fontSize: 12, fontWeight: '600' }}>{status.text}</Text>
                </View>
              )}
              <TouchableOpacity style={{ backgroundColor: '#10b981', paddingVertical: 14, borderRadius: 12, alignItems: 'center' }} onPress={handleRedeem} disabled={submitting}>
                {submitting ? <ActivityIndicator color="#fff" /> : <Text style={{ color: '#fff', fontWeight: '800', fontSize: 15 }}>Submit</Text>}
              </TouchableOpacity>
              <TouchableOpacity style={{ marginTop: 12, paddingVertical: 12, alignItems: 'center' }} onPress={() => setShowRedeem(false)}>
                <Text style={{ color: colors.textSecondary }}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </Modal>
    </ScrollView>
  );
}

function VerificationTab({ colors }: any) {
  return (
    <ScrollView style={{ padding: 16 }}>
      <Text style={[styles.subTitle, { color: colors.textPrimary }]}>Get Verified</Text>
      <View style={[styles.cardBlock, { backgroundColor: colors.card, borderColor: colors.border, alignItems: 'center', paddingVertical: 32 }]}>
        <View style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: '#eff6ff', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
          <Ionicons name="checkmark-circle" size={28} color="#2563eb" />
        </View>
        <Text style={{ color: colors.textSecondary, fontSize: 13, textAlign: 'center', marginBottom: 20, paddingHorizontal: 16 }}>
          Contact us on WhatsApp to get verified.
        </Text>
        <TouchableOpacity
          style={{ backgroundColor: '#25D366', paddingHorizontal: 24, paddingVertical: 14, borderRadius: 12, flexDirection: 'row', alignItems: 'center', gap: 8 }}
          onPress={() => Linking.openURL('https://wa.me/2347087421125')}
        >
          <Ionicons name="logo-whatsapp" size={20} color="#fff" />
          <Text style={{ color: '#fff', fontWeight: '800', fontSize: 14 }}>Chat on WhatsApp</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

function AnalyticsTab({ posts, stats, profile, isOrg, colors }: any) {
  const likesCount = posts.reduce((acc: number, p: any) => acc + (p.likes?.length || 0), 0);
  const commentsCount = posts.reduce((acc: number, p: any) => acc + (p.comments?.length || 0), 0);
  const totalInteractions = likesCount + commentsCount;
  const mobcoins = stats?.mobcoins ?? 0;

  if (!isOrg) {
    return (
      <ScrollView style={{ padding: 16 }} contentContainerStyle={{ alignItems: 'center', paddingTop: 64 }}>
        <View style={{ width: 48, height: 48, borderRadius: 12, backgroundColor: '#faf5ff', alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}>
          <Ionicons name="bar-chart" size={24} color="#9333ea" />
        </View>
        <Text style={{ fontWeight: '700', fontSize: 15, color: colors.textPrimary, marginBottom: 4 }}>Analytics for Professional</Text>
        <Text style={{ color: colors.textSecondary, fontSize: 12, textAlign: 'center' }}>Switch to a Professional account in Edit Profile to unlock detailed analytics.</Text>
      </ScrollView>
    );
  }

  return (
    <ScrollView style={{ padding: 16 }}>
      <Text style={[styles.subTitle, { color: colors.textPrimary }]}>Analytics</Text>
      <View style={[styles.cardBlock, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 }}>
          <View style={{ flex: 1, alignItems: 'center', padding: 12 }}>
            <Text style={{ fontSize: 22, fontWeight: '800', color: '#2563eb' }}>{likesCount}</Text>
            <Text style={{ color: colors.textSecondary, fontSize: 11 }}>Likes</Text>
          </View>
          <View style={{ flex: 1, alignItems: 'center', padding: 12 }}>
            <Text style={{ fontSize: 22, fontWeight: '800', color: '#059669' }}>{commentsCount}</Text>
            <Text style={{ color: colors.textSecondary, fontSize: 11 }}>Comments</Text>
          </View>
          <View style={{ flex: 1, alignItems: 'center', padding: 12 }}>
            <Text style={{ fontSize: 22, fontWeight: '800', color: '#d97706' }}>{mobcoins}</Text>
            <Text style={{ color: colors.textSecondary, fontSize: 11 }}>Coins</Text>
          </View>
        </View>
      </View>
      <View style={[styles.cardBlock, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Text style={[styles.cardHeader, { color: colors.textPrimary }]}>Interaction Summary</Text>
        <Text style={{ color: colors.textSecondary, fontSize: 14, marginVertical: 8 }}>
          Total Interactions: {totalInteractions}
        </Text>
        <Text style={{ color: colors.textSecondary, fontSize: 13 }}>
          Based on {posts.length} posts
        </Text>
      </View>
    </ScrollView>
  );
}

function ComposerTab({ username, posts, setPosts, colors, isDark, setActiveSub }: any) {
  const [text, setText] = useState('');
  const [postType, setPostType] = useState('post');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!text.trim()) return;
    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('username', username);
      formData.append('text', text);
      formData.append('type', postType);
      const res = await apiPost('/create-post', formData);
      if (res.ok) {
        setText('');
        Alert.alert('Posted!', 'Your post is live.');
        setActiveSub('posts');
        if (res.data?.id) {
          setPosts((prev: any[]) => [{ id: res.data.id, text, type: postType, likes: [], comments: [], created_at: new Date().toISOString() }, ...prev]);
        }
      } else {
        Alert.alert('Error', res.data?.error || 'Failed to post');
      }
    } catch {
      Alert.alert('Error', 'Failed to post');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ScrollView style={{ padding: 16 }}>
      <Text style={[styles.subTitle, { color: colors.textPrimary }]}>New Post</Text>
      <TextInput
        placeholder="What's on your mind?"
        placeholderTextColor={colors.textSecondary}
        value={text}
        onChangeText={setText}
        multiline
        numberOfLines={6}
        style={[styles.input, { backgroundColor: isDark ? '#1e293b' : '#f8fafc', color: colors.textPrimary, borderColor: colors.border, minHeight: 140, textAlignVertical: 'top', paddingTop: 14 }]}
      />
      <View style={{ flexDirection: 'row', gap: 8, marginBottom: 16 }}>
        {[
          { key: 'post', label: 'Text' },
          { key: 'poll', label: 'Poll' },
        ].map(t => (
          <TouchableOpacity key={t.key} onPress={() => setPostType(t.key)} style={{ paddingVertical: 8, paddingHorizontal: 16, borderRadius: 8, backgroundColor: postType === t.key ? '#2563eb' : isDark ? '#1e293b' : '#f3f4f6' }}>
            <Text style={{ color: postType === t.key ? '#fff' : colors.textPrimary, fontWeight: '600', fontSize: 12 }}>{t.label}</Text>
          </TouchableOpacity>
        ))}
      </View>
      <TouchableOpacity
        onPress={handleSubmit}
        disabled={submitting || !text.trim()}
        style={{ backgroundColor: '#2563eb', paddingVertical: 14, borderRadius: 12, alignItems: 'center', opacity: (!text.trim() || submitting) ? 0.5 : 1 }}
      >
        {submitting ? <ActivityIndicator color="#fff" /> : <Text style={{ color: '#fff', fontWeight: '800', fontSize: 15 }}>Post</Text>}
      </TouchableOpacity>
    </ScrollView>
  );
}

function PostsTab({ posts, setPosts, username, colors, isDark, setActiveSub }: any) {
  const [editingPost, setEditingPost] = useState<any>(null);
  const [editText, setEditText] = useState('');
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [boostingPost, setBoostingPost] = useState<any>(null);
  const [boostAmount, setBoostAmount] = useState(1);
  const [boosting, setBoosting] = useState(false);
  const [balance, setBalance] = useState(0);
  const filtered = posts.filter((p: any) => p.type !== 'snap');

  useEffect(() => {
    apiGet(`/api/user/stats?username=${encodeURIComponent(username)}`).then((r: any) => {
      if (r.ok && r.data) setBalance(r.data.mobcoins || 0);
    }).catch(() => {});
  }, [username]);

  const saveEdit = async () => {
    setSaving(true);
    try {
      const res = await apiPost('/edit-post', { postId: editingPost.id, username, text: editText });
      if (res.ok) {
        setPosts((prev: any[]) => prev.map((p: any) => p.id === editingPost.id ? { ...p, text: editText } : p));
        setEditingPost(null);
      } else {
        Alert.alert('Error', res.data?.error || 'Failed to edit');
      }
    } catch {
      Alert.alert('Error', 'Failed to edit');
    } finally {
      setSaving(false);
    }
  };

  const deletePost = (postId: string) => {
    Alert.alert('Delete Post', 'Delete this post permanently?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        setDeletingId(postId);
        try {
          const res = await apiDelete(`/delete-post?postId=${encodeURIComponent(postId)}`);
          if (res.ok) setPosts((prev: any[]) => prev.filter((p: any) => p.id !== postId));
        } catch { }
        finally { setDeletingId(null); }
      }},
    ]);
  };

  const handleBoost = async () => {
    if (!boostingPost || boostAmount < 1) return;
    const cost = boostAmount * 500;
    if (balance < cost) { Alert.alert('Insufficient Balance', `Need ${cost.toLocaleString()} mobcoins, have ${balance.toLocaleString()}.`); return; }
    setBoosting(true);
    try {
      const res = await apiPost('/api/boost-post', { postId: boostingPost.id, username, boostAmount });
      if (!res.ok || res.data?.error) { Alert.alert('Error', res.data?.error || 'Boost failed'); return; }
      setBalance((prev: number) => prev - cost);
      const fresh = await apiGet(`/get-user-posts?username=${encodeURIComponent(username)}`);
      if (fresh.ok && fresh.data) setPosts(fresh.data);
      setBoostingPost(null);
      setBoostAmount(1);
      Alert.alert('Boosted!', `+${boostAmount} pts (cost: ${cost.toLocaleString()} mobcoins).`);
    } catch { Alert.alert('Error', 'Boost failed'); }
    finally { setBoosting(false); }
  };

  if (!filtered.length) {
    return (
      <ScrollView style={{ padding: 16 }} contentContainerStyle={{ alignItems: 'center', paddingTop: 64 }}>
        <View style={{ width: 48, height: 48, borderRadius: 12, backgroundColor: isDark ? '#374151' : '#f3f4f6', alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}>
          <Ionicons name="document-text-outline" size={24} color={colors.textSecondary} />
        </View>
        <Text style={{ fontWeight: '700', fontSize: 15, color: colors.textPrimary, marginBottom: 4 }}>No posts yet</Text>
        <Text style={{ color: colors.textSecondary, fontSize: 12, marginBottom: 16, textAlign: 'center' }}>Create your first post to get started.</Text>
        <TouchableOpacity onPress={() => setActiveSub('composer')} style={{ backgroundColor: '#2563eb', paddingHorizontal: 24, paddingVertical: 10, borderRadius: 10 }}>
          <Text style={{ color: '#fff', fontWeight: '700', fontSize: 13 }}>New post</Text>
        </TouchableOpacity>
      </ScrollView>
    );
  }

  return (
    <ScrollView style={{ padding: 16 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <View>
          <Text style={[styles.subTitle, { color: colors.textPrimary, marginBottom: 0 }]}>My Posts</Text>
          <Text style={{ color: colors.textSecondary, fontSize: 11 }}>{filtered.length} posts</Text>
        </View>
        <TouchableOpacity onPress={() => setActiveSub('composer')} style={{ backgroundColor: '#2563eb', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8 }}>
          <Text style={{ color: '#fff', fontWeight: '700', fontSize: 11 }}>New post</Text>
        </TouchableOpacity>
      </View>

      {filtered.map((post: any) => (
        <View key={post.id} style={[styles.cardBlock, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <View style={{ flex: 1 }}>
              <Text style={{ fontWeight: '600', fontSize: 13, color: colors.textPrimary, textTransform: 'capitalize' }}>{post.type || 'Post'}</Text>
              <Text style={{ color: colors.textSecondary, fontSize: 10, marginTop: 2 }}>
                {post.created_at ? new Date(post.created_at).toLocaleDateString() : ''}
              </Text>
            </View>
            <View style={{ flexDirection: 'row', gap: 4 }}>
              <TouchableOpacity onPress={() => { setEditingPost(post); setEditText(post.text?.replace(/<[^>]*>/g, '') || ''); }} style={{ width: 32, height: 32, borderRadius: 8, backgroundColor: isDark ? '#374151' : '#f3f4f6', alignItems: 'center', justifyContent: 'center' }}>
                <Ionicons name="pencil" size={14} color={colors.textSecondary} />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => deletePost(post.id)} disabled={deletingId === post.id} style={{ width: 32, height: 32, borderRadius: 8, backgroundColor: isDark ? '#374151' : '#f3f4f6', alignItems: 'center', justifyContent: 'center' }}>
                <Ionicons name="trash-outline" size={14} color="#dc2626" />
              </TouchableOpacity>
            </View>
          </View>
          <Text style={{ color: colors.textPrimary, fontSize: 13, marginTop: 8, lineHeight: 20 }}>{post.text?.replace(/<[^>]*>/g, '')}</Text>
          <View style={{ flexDirection: 'row', gap: 16, marginTop: 8 }}>
            <Text style={{ color: colors.textSecondary, fontSize: 11 }}>
              <Ionicons name="heart-outline" size={11} /> {post.likes?.length || 0}
            </Text>
            <Text style={{ color: colors.textSecondary, fontSize: 11 }}>
              <Ionicons name="chatbubble-outline" size={11} /> {post.comments?.length || 0}
            </Text>
            {post.type === 'poll' && <Text style={{ color: '#2563eb', fontSize: 10, fontWeight: '600' }}>Poll</Text>}
          </View>
          <TouchableOpacity onPress={() => { setBoostingPost(post); setBoostAmount(1); }} style={{ marginTop: 10, paddingVertical: 10, borderRadius: 10, borderWidth: 1, borderColor: '#fed7aa', backgroundColor: '#fff7ed', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
            <Ionicons name="flash" size={14} color="#f97316" />
            <Text style={{ fontSize: 13, fontWeight: '700', color: '#f97316' }}>Boost Post</Text>
            {post.boost_score > 0 && <Text style={{ fontSize: 11, color: '#f97316', opacity: 0.7 }}>({post.boost_score} pts)</Text>}
          </TouchableOpacity>
        </View>
      ))}

      {/* Boost Modal */}
      <Modal visible={!!boostingPost} transparent animationType="slide" onRequestClose={() => setBoostingPost(null)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
            <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>Boost Post</Text>
            {boostingPost && (
              <>
                <View style={{ backgroundColor: '#fff7ed', borderRadius: 12, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: '#fed7aa' }}>
                  <Text style={{ fontSize: 11, color: colors.textSecondary }}>Current boost score</Text>
                  <Text style={{ fontSize: 22, fontWeight: '800', color: '#f97316' }}>{boostingPost.boost_score || 0} pts</Text>
                </View>

                <Text style={{ fontSize: 13, fontWeight: '600', color: colors.textPrimary, marginBottom: 8 }}>Boost amount</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                  <TouchableOpacity onPress={() => setBoostAmount(Math.max(1, boostAmount - 1))} style={{ width: 40, height: 40, borderRadius: 8, backgroundColor: isDark ? '#374151' : '#f3f4f6', alignItems: 'center', justifyContent: 'center' }}>
                    <Text style={{ fontSize: 18, fontWeight: '700', color: colors.textPrimary }}>−</Text>
                  </TouchableOpacity>
                  <TextInput
                    value={String(boostAmount)}
                    onChangeText={t => setBoostAmount(Math.min(100, Math.max(1, parseInt(t) || 1)))}
                    keyboardType="number-pad"
                    style={{ flex: 1, height: 40, textAlign: 'center', backgroundColor: isDark ? '#1e293b' : '#f8fafc', borderRadius: 8, borderWidth: 1, borderColor: colors.border, color: colors.textPrimary, fontWeight: '700', fontSize: 15 }}
                  />
                  <TouchableOpacity onPress={() => setBoostAmount(Math.min(100, boostAmount + 1))} style={{ width: 40, height: 40, borderRadius: 8, backgroundColor: isDark ? '#374151' : '#f3f4f6', alignItems: 'center', justifyContent: 'center' }}>
                    <Text style={{ fontSize: 18, fontWeight: '700', color: colors.textPrimary }}>+</Text>
                  </TouchableOpacity>
                </View>

                <View style={{ backgroundColor: isDark ? '#1e293b' : '#f8fafc', borderRadius: 12, padding: 14, marginBottom: 16 }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
                    <Text style={{ fontSize: 12, color: colors.textSecondary }}>Cost</Text>
                    <Text style={{ fontSize: 12, fontWeight: '700', color: colors.textPrimary }}>{(boostAmount * 500).toLocaleString()} mobcoins</Text>
                  </View>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
                    <Text style={{ fontSize: 12, color: colors.textSecondary }}>Balance</Text>
                    <Text style={{ fontSize: 12, fontWeight: '700', color: balance >= boostAmount * 500 ? '#10b981' : '#ef4444' }}>{balance.toLocaleString()} mobcoins</Text>
                  </View>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                    <Text style={{ fontSize: 12, color: colors.textSecondary }}>New score</Text>
                    <Text style={{ fontSize: 12, fontWeight: '700', color: '#f97316' }}>{(boostingPost.boost_score || 0) + boostAmount} pts</Text>
                  </View>
                </View>

                <View style={{ flexDirection: 'row', gap: 12 }}>
                  <TouchableOpacity onPress={() => setBoostingPost(null)} style={{ flex: 1, paddingVertical: 14, borderRadius: 12, borderWidth: 1, borderColor: colors.border, alignItems: 'center' }}>
                    <Text style={{ color: colors.textSecondary, fontWeight: '600' }}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={handleBoost} disabled={boosting || balance < boostAmount * 500} style={{ flex: 1, paddingVertical: 14, borderRadius: 12, backgroundColor: '#f97316', alignItems: 'center', opacity: (boosting || balance < boostAmount * 500) ? 0.5 : 1, flexDirection: 'row', justifyContent: 'center', gap: 6 }}>
                    {boosting ? <ActivityIndicator color="#fff" /> : <><Ionicons name="flash" size={16} color="#fff" /><Text style={{ color: '#fff', fontWeight: '800' }}>Boost {boostAmount}pt</Text></>}
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>

      <Modal visible={!!editingPost} transparent animationType="slide" onRequestClose={() => setEditingPost(null)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
            <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>Edit post</Text>
            <TextInput
              value={editText}
              onChangeText={setEditText}
              multiline
              numberOfLines={5}
              style={[styles.input, { backgroundColor: isDark ? '#1e293b' : '#f8fafc', color: colors.textPrimary, borderColor: colors.border, minHeight: 120, textAlignVertical: 'top', paddingTop: 14 }]}
            />
            <View style={{ flexDirection: 'row', gap: 12 }}>
              <TouchableOpacity onPress={() => setEditingPost(null)} style={{ flex: 1, paddingVertical: 14, borderRadius: 12, borderWidth: 1, borderColor: colors.border, alignItems: 'center' }}>
                <Text style={{ color: colors.textSecondary, fontWeight: '600' }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={saveEdit} disabled={saving} style={{ flex: 1, paddingVertical: 14, borderRadius: 12, backgroundColor: '#2563eb', alignItems: 'center', opacity: saving ? 0.5 : 1 }}>
                {saving ? <ActivityIndicator color="#fff" /> : <Text style={{ color: '#fff', fontWeight: '800' }}>Save</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

function SnapsTab({ posts, setPosts, colors, isDark }: any) {
  const snaps = posts.filter((p: any) => p.type === 'snap');
  const [preview, setPreview] = useState<any>(null);

  const deleteSnap = async (snapId: string) => {
    try {
      const res = await apiDelete(`/delete-post?postId=${encodeURIComponent(snapId)}`);
      if (res.ok) {
        setPosts((prev: any[]) => prev.filter((p: any) => p.id !== snapId));
        setPreview(null);
      }
    } catch { }
  };

  return (
    <ScrollView style={{ padding: 16 }}>
      <Text style={[styles.subTitle, { color: colors.textPrimary }]}>Snaps Studio</Text>
      {snaps.length === 0 ? (
        <View style={[styles.cardBlock, { backgroundColor: colors.card, borderColor: colors.border, alignItems: 'center', paddingVertical: 64 }]}>
          <Ionicons name="videocam-outline" size={40} color={colors.textSecondary} />
          <Text style={{ color: colors.textSecondary, fontSize: 13, marginTop: 8 }}>No snaps yet</Text>
        </View>
      ) : (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 2 }}>
          {snaps.map((snap: any) => (
            <TouchableOpacity key={snap.id} onPress={() => setPreview(snap)} style={{ width: '32%', aspectRatio: 9 / 16, backgroundColor: '#111827', borderRadius: 4, overflow: 'hidden' }}>
              {snap.media?.[0] && (
                <Image source={{ uri: snap.media[0] }} style={{ width: '100%', height: '100%', opacity: 0.8 }} />
              )}
              <View style={{ position: 'absolute', bottom: 6, left: 6, backgroundColor: 'rgba(0,0,0,0.4)', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2, flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <Ionicons name="heart" size={10} color="#fff" />
                <Text style={{ color: '#fff', fontSize: 9, fontWeight: '600' }}>{snap.likes?.length || 0}</Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      )}

      <Modal visible={!!preview} transparent animationType="slide" onRequestClose={() => setPreview(null)}>
        <View style={[styles.modalOverlay, { justifyContent: 'center', padding: 24 }]}>
          <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
            <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>Snap Preview</Text>
            {preview?.media?.[0] && (
              <Image source={{ uri: preview.media[0] }} style={{ width: '100%', height: 300, borderRadius: 12, marginBottom: 16 }} resizeMode="contain" />
            )}
            <TouchableOpacity onPress={() => deleteSnap(preview?.id)} style={{ backgroundColor: '#dc2626', paddingVertical: 14, borderRadius: 12, alignItems: 'center' }}>
              <Text style={{ color: '#fff', fontWeight: '800' }}>Delete snap</Text>
            </TouchableOpacity>
            <TouchableOpacity style={{ marginTop: 8, paddingVertical: 12, alignItems: 'center' }} onPress={() => setPreview(null)}>
              <Text style={{ color: colors.textSecondary }}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

function GrowTab({ stats, profile, postsCount, username, isOrg, colors, setActiveSub, accent }: any) {
  const mobcoins = stats?.mobcoins ?? 0;
  const rank = stats?.rank ?? null;
  const streak = stats?.streak ?? 0;
  const followers = (profile?.followers || []).length;

  const milestones = [
    { label: '5 posts', desc: 'Publish 5 posts', done: postsCount >= 5, tab: null },
    { label: '10 followers', desc: 'Reach 10 followers', done: followers >= 10, tab: null },
    { label: '2,000 coins', desc: 'Earn 2,000 coins', done: mobcoins >= 2000, tab: 'monetize' },
    { label: '20 posts', desc: 'Publish 20 posts', done: postsCount >= 20, tab: null },
    { label: '50 followers', desc: 'Reach 50 followers', done: followers >= 50, tab: null },
    { label: '50 posts', desc: 'Reach 50 posts', done: postsCount >= 50, tab: null },
    { label: '5,000 coins', desc: 'Earn 5,000 coins', done: mobcoins >= 5000, tab: 'monetize' },
    { label: '100 followers', desc: 'Reach 100 followers', done: followers >= 100, tab: null },
    { label: '10,000 coins', desc: 'Earn 10,000 coins', done: mobcoins >= 10000, tab: 'monetize' },
    { label: '100 posts', desc: 'Publish 100 posts', done: postsCount >= 100, tab: null },
    { label: '250 followers', desc: 'Reach 250 followers', done: followers >= 250, tab: null },
    { label: '25,000 coins', desc: 'Earn 25,000 coins', done: mobcoins >= 25000, tab: 'monetize' },
    { label: '200 posts', desc: 'Publish 200 posts', done: postsCount >= 200, tab: null },
    { label: '500 followers', desc: 'Reach 500 followers', done: followers >= 500, tab: null },
    { label: '50,000 coins', desc: 'Earn 50,000 coins', done: mobcoins >= 50000, tab: 'monetize' },
    { label: '500 posts', desc: 'Publish 500 posts', done: postsCount >= 500, tab: null },
    { label: '1,000 followers', desc: 'Reach 1,000 followers', done: followers >= 1000, tab: null },
    { label: '100,000 coins', desc: 'Earn 100,000 coins', done: mobcoins >= 100000, tab: 'monetize' },
    { label: '1,000 posts', desc: 'Publish 1,000 posts', done: postsCount >= 1000, tab: null },
    { label: '5,000 followers', desc: 'Reach 5,000 followers', done: followers >= 5000, tab: null },
  ];

  const tips = [
    { icon: 'trending-up-outline', title: 'Post every day', body: 'Accounts that post daily grow 3x faster.' },
    { icon: 'chatbubbles-outline', title: 'Reply to comments', body: "Every reply pushes your post higher in feeds." },
    { icon: 'bar-chart-outline', title: 'Create polls', body: 'Poll posts get 2x more engagement on average.' },
    { icon: 'videocam-outline', title: 'Go live', body: 'Live streams push you to the top of feeds.' },
  ];

  return (
    <ScrollView style={{ padding: 16 }}>
      <Text style={[styles.subTitle, { color: colors.textPrimary }]}>Milestones</Text>
      <View style={{ gap: 8, marginBottom: 16 }}>
        {milestones.map((m, i) => (
          <TouchableOpacity key={i} onPress={() => m.done && m.tab ? setActiveSub(m.tab) : null}
            style={[styles.cardBlock, { backgroundColor: m.done ? '#ecfdf5' : colors.card, borderColor: m.done ? '#a7f3d0' : colors.border, opacity: m.done ? 1 : 0.6 }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <Ionicons name={m.done ? 'checkmark-circle' : 'ellipse-outline'} size={24} color={m.done ? '#10b981' : colors.textSecondary} />
              <View style={{ flex: 1 }}>
                <Text style={{ fontWeight: '700', fontSize: 13, color: m.done ? '#065f46' : colors.textPrimary }}>{m.label}</Text>
                <Text style={{ fontSize: 11, color: colors.textSecondary }}>{m.desc}</Text>
              </View>
              {m.done && <Ionicons name="checkmark" size={18} color="#10b981" />}
            </View>
          </TouchableOpacity>
        ))}
      </View>
      <View style={{ flexDirection: 'row', gap: 12, marginBottom: 16 }}>
        <View style={[styles.cardBlock, { flex: 1, backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={{ width: 32, height: 32, borderRadius: 8, backgroundColor: '#fff7ed', alignItems: 'center', justifyContent: 'center', marginBottom: 8 }}>
            <Ionicons name="flame" size={16} color="#ea580c" />
          </View>
          <Text style={{ color: colors.textSecondary, fontSize: 10 }}>Streak</Text>
          <Text style={{ fontWeight: '800', fontSize: 18, color: colors.textPrimary }}>{streak}d</Text>
        </View>
        <View style={[styles.cardBlock, { flex: 1, backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={{ width: 32, height: 32, borderRadius: 8, backgroundColor: '#fefce8', alignItems: 'center', justifyContent: 'center', marginBottom: 8 }}>
            <Ionicons name="trophy" size={16} color="#eab308" />
          </View>
          <Text style={{ color: colors.textSecondary, fontSize: 10 }}>Rank</Text>
          <Text style={{ fontWeight: '800', fontSize: 18, color: colors.textPrimary }}>{rank ? `#${rank}` : '-'}</Text>
        </View>
      </View>

      <Text style={{ fontSize: 13, fontWeight: '700', color: colors.textSecondary, marginBottom: 12 }}>TIPS TO GROW FASTER</Text>
      <View style={{ gap: 8, marginBottom: 24 }}>
        {tips.map((tip, idx) => (
          <View key={idx} style={[styles.cardBlock, { backgroundColor: colors.card, borderColor: colors.border, flexDirection: 'row', gap: 12 }]}>
            <View style={{ width: 36, height: 36, borderRadius: 8, backgroundColor: isDark ? '#374151' : '#f3f4f6', alignItems: 'center', justifyContent: 'center', marginTop: 2 }}>
              <Ionicons name={tip.icon as any} size={18} color={colors.textSecondary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontWeight: '600', color: colors.textPrimary, fontSize: 13 }}>{tip.title}</Text>
              <Text style={{ fontSize: 11, color: colors.textSecondary, marginTop: 2, lineHeight: 16 }}>{tip.body}</Text>
            </View>
          </View>
        ))}
      </View>

      <View style={{ flexDirection: 'row', gap: 12 }}>
        <TouchableOpacity onPress={() => setActiveSub('composer')} style={{ flex: 1, paddingVertical: 14, borderRadius: 12, backgroundColor: accent, alignItems: 'center' }}>
          <Text style={{ color: '#fff', fontWeight: '800', fontSize: 13 }}>New post</Text>
        </TouchableOpacity>
        <TouchableOpacity style={{ flex: 1, paddingVertical: 14, borderRadius: 12, borderWidth: 1, borderColor: colors.border, alignItems: 'center' }}>
          <Text style={{ color: colors.textPrimary, fontWeight: '600', fontSize: 13 }}>Go live</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

function LeaderboardTab({ colors }: any) {
  return (
    <ScrollView style={{ padding: 16 }} contentContainerStyle={{ alignItems: 'center', paddingTop: 64 }}>
      <View style={{ width: 48, height: 48, borderRadius: 12, backgroundColor: '#f3f4f6', alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}>
        <Ionicons name="trophy" size={24} color="#d1d5db" />
      </View>
      <Text style={{ fontWeight: '700', fontSize: 15, color: colors.textPrimary }}>Leaderboard coming soon</Text>
    </ScrollView>
  );
}

function EditProfileTab({ profile, setProfileData, username, isOrg, colors, isDark, accent }: any) {
  const [fields, setFields] = useState({
    fullName: profile?.fullname || '',
    phone: profile?.phone || '',
    email: profile?.email || '',
    biography: profile?.biography || '',
  });
  const [photoFile, setPhotoFile] = useState<any>(null);
  const [photoPreview, setPhotoPreview] = useState(profile?.profile_pic || DEFAULT_PIC);
  const [saving, setSaving] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [passwordModal, setPasswordModal] = useState(false);
  const [pwFields, setPwFields] = useState({ current: '', newPw: '', confirm: '' });
  const [pwSaving, setPwSaving] = useState(false);
  const [pwStatus, setPwStatus] = useState<{ ok: boolean; text: string } | null>(null);
  const [modeModal, setModeModal] = useState(false);
  const [migrationModal, setMigrationModal] = useState(false);
  const [modeSaving, setModeSaving] = useState(false);

  const handlePhotoPick = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.8, allowsEditing: true });
    if (!result.canceled && result.assets?.[0]) {
      setPhotoFile(result.assets[0]);
      setPhotoPreview(result.assets[0].uri);
    }
  };

  const handleProfileUpdate = async () => {
    setSaving(true); setStatusMsg(null);
    try {
      const formData = new FormData();
      if (fields.fullName) formData.append('fullName', fields.fullName);
      formData.append('phone', fields.phone || '');
      if (fields.email) formData.append('email', fields.email);
      if (fields.biography !== undefined) formData.append('biography', fields.biography);
      if (photoFile) {
        formData.append('profilePicture', {
          uri: photoFile.uri,
          type: photoFile.mimeType || 'image/jpeg',
          name: photoFile.fileName || 'photo.jpg',
        } as any);
      }
      const res = await updateProfileAPI(username, formData);
      if (!res.ok) throw new Error(res.error || 'Update failed');
      if (res.data?.updatedFields) {
        setProfileData((prev: any) => ({ ...prev, ...res.data.updatedFields }));
      } else if (res.data) {
        setProfileData((prev: any) => ({ ...prev, ...res.data }));
      }
      invalidateProfileCache(username);
      setStatusMsg({ text: 'Profile updated!', ok: true });
    } catch (err: any) { setStatusMsg({ text: err.message, ok: false }); }
    finally { setSaving(false); }
  };

  const handlePasswordChange = async () => {
    if (!pwFields.current) return setPwStatus({ text: 'Enter your current password', ok: false });
    if (pwFields.newPw.length < 8) return setPwStatus({ text: 'New password needs at least 8 characters', ok: false });
    if (!/[A-Z]/.test(pwFields.newPw)) return setPwStatus({ text: 'Add at least one uppercase letter', ok: false });
    if (!/\d/.test(pwFields.newPw)) return setPwStatus({ text: 'Add at least one number', ok: false });
    if (pwFields.newPw !== pwFields.confirm) return setPwStatus({ text: "Passwords don't match", ok: false });
    setPwSaving(true); setPwStatus(null);
    try {
      const res = await changePasswordAPI(username, pwFields.current, pwFields.newPw);
      if (!res.ok) throw new Error(res.error || 'Failed to change password');
      setPwStatus({ text: 'Password updated!', ok: true });
      setPwFields({ current: '', newPw: '', confirm: '' });
      setTimeout(() => setPasswordModal(false), 1200);
    } catch (err: any) { setPwStatus({ text: err.message, ok: false }); }
    finally { setPwSaving(false); }
  };

  const handleModeSwitch = async (newType: string, migrate = false) => {
    setModeSaving(true);
    try {
      if (migrate) {
        await apiPost('/api/migrate-friends', { username });
      }
      const res = await updateProfileTypeAPI(username, newType);
      if (!res.ok) throw new Error(res.error || 'Failed to switch mode');
      const updatedType = res.data?.profile_type;
      if (updatedType) setProfileData((prev: any) => ({ ...prev, profile_type: updatedType }));
      invalidateProfileCache(username);
      const uiDisplayText = updatedType === 'Organisation' ? 'Professional' : 'Personal';
      setStatusMsg({ text: `Switched to ${uiDisplayText}!`, ok: true });
    } catch (err: any) { setStatusMsg({ text: err.message, ok: false }); }
    finally { setModeSaving(false); setModeModal(false); }
  };

  return (
    <>
    <ScrollView style={{ padding: 16 }}>
      <Text style={[styles.subTitle, { color: colors.textPrimary }]}>Edit Profile</Text>

      <TouchableOpacity onPress={handlePhotoPick} style={[styles.cardBlock, { backgroundColor: colors.card, borderColor: colors.border, flexDirection: 'row', alignItems: 'center', gap: 16 }]}>
        <Image source={{ uri: photoPreview }} style={{ width: 60, height: 60, borderRadius: 12 }} />
        <View>
          <Text style={{ fontWeight: '600', color: colors.textPrimary, fontSize: 13 }}>Profile photo</Text>
          <Text style={{ color: accent, fontSize: 12, fontWeight: '600', marginTop: 4 }}>Change photo</Text>
        </View>
      </TouchableOpacity>

      <TouchableOpacity onPress={() => setModeModal(true)} style={[styles.cardBlock, { backgroundColor: colors.card, borderColor: colors.border, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }]}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Ionicons name="flash" size={18} color={isOrg ? '#7c3aed' : colors.textSecondary} />
          <View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <Text style={{ fontWeight: '600', color: colors.textPrimary, fontSize: 13 }}>Account type</Text>
              {isOrg && <View style={{ backgroundColor: '#7c3aed', paddingHorizontal: 6, paddingVertical: 1, borderRadius: 3 }}><Text style={{ color: '#fff', fontSize: 9, fontWeight: '800' }}>PRO</Text></View>}
            </View>
            <Text style={{ fontSize: 11, color: colors.textSecondary }}>{isOrg ? 'Professional account' : 'Personal account'}</Text>
          </View>
        </View>
        <Ionicons name="chevron-forward" size={16} color={colors.textSecondary} />
      </TouchableOpacity>

      <View style={[styles.cardBlock, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Text style={{ fontSize: 11, fontWeight: '700', color: colors.textSecondary, marginBottom: 12 }}>PERSONAL DETAILS</Text>
        <TextInput placeholder="Full name" placeholderTextColor={colors.textSecondary} value={fields.fullName} onChangeText={v => setFields(prev => ({ ...prev, fullName: v }))} style={[styles.input, { backgroundColor: isDark ? '#1e293b' : '#f8fafc', color: colors.textPrimary, borderColor: colors.border }]} />
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <TextInput placeholder="Phone" placeholderTextColor={colors.textSecondary} value={fields.phone} onChangeText={v => setFields(prev => ({ ...prev, phone: v }))} keyboardType="phone-pad" style={[styles.input, { flex: 1, backgroundColor: isDark ? '#1e293b' : '#f8fafc', color: colors.textPrimary, borderColor: colors.border }]} />
          <TextInput placeholder="Email" placeholderTextColor={colors.textSecondary} value={fields.email} onChangeText={v => setFields(prev => ({ ...prev, email: v }))} keyboardType="email-address" style={[styles.input, { flex: 1, backgroundColor: isDark ? '#1e293b' : '#f8fafc', color: colors.textPrimary, borderColor: colors.border }]} />
        </View>
        <TextInput placeholder="Bio" placeholderTextColor={colors.textSecondary} value={fields.biography} onChangeText={v => setFields(prev => ({ ...prev, biography: v }))} multiline numberOfLines={3} style={[styles.input, { backgroundColor: isDark ? '#1e293b' : '#f8fafc', color: colors.textPrimary, borderColor: colors.border, minHeight: 80, textAlignVertical: 'top', paddingTop: 14 }]} />
        {statusMsg && (
          <View style={{ backgroundColor: statusMsg.ok ? '#d1fae5' : '#fee2e2', padding: 10, borderRadius: 8, marginBottom: 12 }}>
            <Text style={{ color: statusMsg.ok ? '#065f46' : '#991b1b', fontSize: 12, fontWeight: '600' }}>{statusMsg.text}</Text>
          </View>
        )}
          <TouchableOpacity onPress={handleProfileUpdate} disabled={saving} style={{ backgroundColor: accent, paddingVertical: 14, borderRadius: 12, alignItems: 'center', opacity: saving ? 0.5 : 1 }}>
          {saving ? <ActivityIndicator color="#fff" /> : <Text style={{ color: '#fff', fontWeight: '800', fontSize: 15 }}>Save changes</Text>}
        </TouchableOpacity>
      </View>

      <TouchableOpacity onPress={() => { setPasswordModal(true); setPwStatus(null); setPwFields({ current: '', newPw: '', confirm: '' }); }} style={[styles.cardBlock, { backgroundColor: colors.card, borderColor: colors.border, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }]}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <Ionicons name="lock-closed-outline" size={18} color={colors.textSecondary} />
          <View>
            <Text style={{ fontWeight: '600', color: colors.textPrimary, fontSize: 13 }}>Password</Text>
            <Text style={{ fontSize: 11, color: colors.textSecondary }}>Change your login password</Text>
          </View>
        </View>
        <Text style={{ color: accent, fontSize: 12, fontWeight: '600' }}>Change</Text>
      </TouchableOpacity>

      <Modal visible={passwordModal} transparent animationType="slide" onRequestClose={() => setPasswordModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
            <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>Change password</Text>
            <TextInput placeholder="Current password" placeholderTextColor={colors.textSecondary} value={pwFields.current} onChangeText={v => setPwFields(prev => ({ ...prev, current: v }))} secureTextEntry style={[styles.input, { backgroundColor: isDark ? '#1e293b' : '#f8fafc', color: colors.textPrimary, borderColor: colors.border }]} />
            <TextInput placeholder="New password (8+ chars)" placeholderTextColor={colors.textSecondary} value={pwFields.newPw} onChangeText={v => setPwFields(prev => ({ ...prev, newPw: v }))} secureTextEntry style={[styles.input, { backgroundColor: isDark ? '#1e293b' : '#f8fafc', color: colors.textPrimary, borderColor: colors.border }]} />
            <TextInput placeholder="Confirm new password" placeholderTextColor={colors.textSecondary} value={pwFields.confirm} onChangeText={v => setPwFields(prev => ({ ...prev, confirm: v }))} secureTextEntry style={[styles.input, { backgroundColor: isDark ? '#1e293b' : '#f8fafc', color: colors.textPrimary, borderColor: colors.border }]} />
            {pwStatus && (
              <View style={{ backgroundColor: pwStatus.ok ? '#d1fae5' : '#fee2e2', padding: 10, borderRadius: 8, marginBottom: 12 }}>
                <Text style={{ color: pwStatus.ok ? '#065f46' : '#991b1b', fontSize: 12, fontWeight: '600' }}>{pwStatus.text}</Text>
              </View>
            )}
            <View style={{ flexDirection: 'row', gap: 12 }}>
              <TouchableOpacity onPress={() => setPasswordModal(false)} style={{ flex: 1, paddingVertical: 14, borderRadius: 12, borderWidth: 1, borderColor: colors.border, alignItems: 'center' }}>
                <Text style={{ color: colors.textSecondary, fontWeight: '600' }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handlePasswordChange} disabled={pwSaving} style={{ flex: 1, paddingVertical: 14, borderRadius: 12, backgroundColor: accent, alignItems: 'center', opacity: pwSaving ? 0.5 : 1 }}>
                {pwSaving ? <ActivityIndicator color="#fff" /> : <Text style={{ color: '#fff', fontWeight: '800' }}>Update</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={modeModal} transparent animationType="slide" onRequestClose={() => setModeModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
            <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>Switch account type</Text>

            <View style={[styles.cardBlock, { borderColor: !isOrg ? '#bfdbfe' : colors.border, borderWidth: 2, backgroundColor: !isOrg ? '#eff6ff' : colors.card }]}>
              <View style={{ flexDirection: 'row', gap: 12 }}>
                <View style={{ width: 36, height: 36, borderRadius: 8, backgroundColor: '#dbeafe', alignItems: 'center', justifyContent: 'center' }}>
                  <Ionicons name="person" size={18} color="#2563eb" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontWeight: '700', color: colors.textPrimary, fontSize: 13 }}>Personal</Text>
                  <Text style={{ fontSize: 11, color: colors.textSecondary }}>Standard access for social discovery</Text>
                </View>
                {!isOrg && <Ionicons name="checkmark-circle" size={20} color="#2563eb" />}
              </View>
              {isOrg && (
                <TouchableOpacity onPress={() => handleModeSwitch('Individual')} disabled={modeSaving} style={{ marginTop: 12, paddingVertical: 10, borderRadius: 8, borderWidth: 1, borderColor: colors.border, alignItems: 'center' }}>
                  <Text style={{ color: colors.textPrimary, fontWeight: '600', fontSize: 12 }}>{modeSaving ? 'Switching...' : 'Switch to Personal'}</Text>
                </TouchableOpacity>
              )}
            </View>

            <View style={[styles.cardBlock, { borderColor: isOrg ? '#d8b4fe' : colors.border, borderWidth: 2, backgroundColor: isOrg ? '#faf5ff' : colors.card }]}>
              <View style={{ flexDirection: 'row', gap: 12 }}>
                <View style={{ width: 36, height: 36, borderRadius: 8, backgroundColor: '#ede9fe', alignItems: 'center', justifyContent: 'center' }}>
                  <Ionicons name="flash" size={18} color="#7c3aed" />
                </View>
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                    <Text style={{ fontWeight: '700', color: colors.textPrimary, fontSize: 13 }}>Professional</Text>
                    <View style={{ backgroundColor: '#7c3aed', paddingHorizontal: 6, paddingVertical: 1, borderRadius: 3 }}><Text style={{ color: '#fff', fontSize: 9, fontWeight: '800' }}>PRO</Text></View>
                  </View>
                  <Text style={{ fontSize: 11, color: colors.textSecondary }}>Unlocks earnings, analytics, and Pro badge</Text>
                </View>
                {isOrg && <Ionicons name="checkmark-circle" size={20} color="#7c3aed" />}
              </View>
              {!isOrg && (
                <TouchableOpacity onPress={() => setMigrationModal(true)} style={{ marginTop: 12, paddingVertical: 10, borderRadius: 8, backgroundColor: '#7c3aed', alignItems: 'center' }}>
                  <Text style={{ color: '#fff', fontWeight: '600', fontSize: 12 }}>{modeSaving ? 'Switching...' : 'Switch to Professional'}</Text>
                </TouchableOpacity>
              )}
            </View>

            <Text style={{ color: colors.textSecondary, fontSize: 11, textAlign: 'center' }}>You can switch back at any time.</Text>
          </View>
        </View>
      </Modal>

      <Modal visible={migrationModal} transparent animationType="fade" onRequestClose={() => setMigrationModal(false)}>
        <View style={[styles.modalOverlay, { justifyContent: 'center', padding: 24 }]}>
          <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
            <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>Migrate Friends?</Text>
            <Text style={{ color: colors.textSecondary, fontSize: 13, marginBottom: 20 }}>Do you want to migrate your friends to followers for your new Organisation account?</Text>
            <TouchableOpacity onPress={() => { setMigrationModal(false); handleModeSwitch('Organisation', true); }} style={{ backgroundColor: '#7c3aed', paddingVertical: 14, borderRadius: 12, alignItems: 'center', marginBottom: 8 }}>
              <Text style={{ color: '#fff', fontWeight: '800' }}>Yes, migrate</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => { setMigrationModal(false); handleModeSwitch('Organisation', false); }} style={{ paddingVertical: 14, borderRadius: 12, borderWidth: 1, borderColor: colors.border, alignItems: 'center' }}>
              <Text style={{ color: colors.textSecondary, fontWeight: '600' }}>No, skip</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </ScrollView>
    </>
  );
}

function PrefsTab({ user, setProfileData, username, colors, isDark, accent }: any) {
  const { themeMode, setThemeMode } = useTheme();
  const [offlineMode, setOfflineMode] = useState(false);
  const [dataSaver, setDataSaver] = useState(false);
  const [notifs, setNotifs] = useState(user?.notification_prefs || {
    likes: { inApp: true, email: true },
    comments: { inApp: true, email: true },
    mentions: { inApp: true, email: true },
    followers: { inApp: true, email: true },
    newPost: { inApp: true, email: false },
    messages: { inApp: true, email: true },
    mobcoins: { inApp: true, email: true },
    events: { inApp: true, email: true },
  });
  const [autoSaving, setAutoSaving] = useState(false);

  const updateNotifPref = async (key: string, channel: string) => {
    if (!user) return;
    const prefVal = notifs[key] || { inApp: true, email: true };
    const updated = { ...notifs, [key]: { ...prefVal, [channel]: !prefVal[channel] } };
    setNotifs(updated);
    setAutoSaving(true);
    try {
      const res = await updateNotificationPrefsAPI(username, updated);
      if (res.ok && setProfileData) setProfileData((prev: any) => ({ ...prev, notification_prefs: updated }));
    } catch { setNotifs(user?.notification_prefs || notifs); }
    setTimeout(() => setAutoSaving(false), 600);
  };

  const notifSections = [
    {
      title: 'Activity',
      items: [
        { id: 'likes', label: 'Likes', sub: 'When someone likes your post' },
        { id: 'comments', label: 'Comments', sub: 'When someone comments on your post' },
        { id: 'mentions', label: 'Mentions', sub: `When someone tags @${username}` },
      ],
    },
    {
      title: 'Network',
      items: [
        { id: 'followers', label: 'New followers', sub: 'When someone follows you' },
        { id: 'newPost', label: 'New posts', sub: 'Updates from people you follow' },
        { id: 'messages', label: 'Messages', sub: 'Direct messages' },
      ],
    },
    {
      title: 'Finance',
      items: [
        { id: 'mobcoins', label: 'Mobcoins', sub: 'When your coin balance changes' },
        { id: 'events', label: 'Events', sub: 'Event invitations and updates' },
      ],
    },
  ];

  return (
    <ScrollView style={{ padding: 16 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <Text style={[styles.subTitle, { color: colors.textPrimary, marginBottom: 0 }]}>Preferences</Text>
        {autoSaving && <Text style={{ color: '#2563eb', fontSize: 11 }}>Saving...</Text>}
      </View>

      <View style={[styles.cardBlock, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Text style={[styles.cardHeader, { color: colors.textPrimary }]}>Theme</Text>
        {[
          { value: 'system', label: 'Follow system' },
          { value: 'light', label: 'Light mode' },
          { value: 'dark', label: 'Dark mode' },
        ].map(t => (
          <TouchableOpacity key={t.value} onPress={() => setThemeMode(t.value as any)} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.border }}>
            <Text style={{ color: colors.textPrimary, fontSize: 13 }}>{t.label}</Text>
            {themeMode === t.value && <Ionicons name="checkmark-circle" size={18} color={accent} />}
          </TouchableOpacity>
        ))}
      </View>

      {/* Offline Mode */}
      <Text style={{ fontSize: 13, fontWeight: '700', color: colors.textSecondary, marginBottom: 8, marginTop: 8 }}>DATA & OFFLINE</Text>
      <View style={[styles.cardBlock, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
          <View style={{ flex: 1 }}>
            <Text style={{ fontWeight: '600', color: colors.textPrimary, fontSize: 13 }}>Offline Mode</Text>
            <Text style={{ fontSize: 11, color: colors.textSecondary }}>Browse cached content when offline</Text>
          </View>
          <TouchableOpacity
            onPress={() => {
              const next = !offlineMode;
              setOfflineMode(next);
              try { AsyncStorage.setItem('tmob_offline_mode', next ? 'true' : 'false'); } catch {}
            }}
            style={{ width: 44, height: 24, borderRadius: 12, backgroundColor: offlineMode ? '#2563eb' : '#d1d5db', padding: 2, justifyContent: 'center' }}
          >
            <View style={{ width: 20, height: 20, borderRadius: 10, backgroundColor: '#fff', alignSelf: offlineMode ? 'flex-end' : 'flex-start' }} />
          </TouchableOpacity>
        </View>
        <Text style={{ fontSize: 10, color: colors.textSecondary, marginTop: 8, lineHeight: 16 }}>
          {offlineMode ? 'Content you load will be cached for offline browsing.' : 'Turn on to cache posts and snaps for offline browsing.'}
        </Text>
      </View>

      <View style={[styles.cardBlock, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
          <View style={{ flex: 1 }}>
            <Text style={{ fontWeight: '600', color: colors.textPrimary, fontSize: 13 }}>Data Saver</Text>
            <Text style={{ fontSize: 11, color: colors.textSecondary }}>Lower quality images to save data</Text>
          </View>
          <TouchableOpacity
            onPress={() => {
              const next = !dataSaver;
              setDataSaver(next);
              try { AsyncStorage.setItem('tmob_data_saver', next ? 'true' : 'false'); } catch {}
            }}
            style={{ width: 44, height: 24, borderRadius: 12, backgroundColor: dataSaver ? '#2563eb' : '#d1d5db', padding: 2, justifyContent: 'center' }}
          >
            <View style={{ width: 20, height: 20, borderRadius: 10, backgroundColor: '#fff', alignSelf: dataSaver ? 'flex-end' : 'flex-start' }} />
          </TouchableOpacity>
        </View>
        <Text style={{ fontSize: 10, color: colors.textSecondary, marginTop: 8, lineHeight: 16 }}>
          {dataSaver ? 'Images will use low-quality Cloudinary compression.' : 'Images load at original quality.'}
        </Text>
      </View>

      <Text style={{ fontSize: 13, fontWeight: '700', color: colors.textSecondary, marginBottom: 8, marginTop: 8 }}>NOTIFICATIONS</Text>
      {notifSections.map((section, sIdx) => (
        <View key={sIdx} style={[styles.cardBlock, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={{ fontSize: 11, fontWeight: '700', color: colors.textSecondary, marginBottom: 8, textTransform: 'uppercase' }}>{section.title}</Text>
          {section.items.map(item => {
            const prefVal = notifs[item.id] || { inApp: true, email: true };
            return (
              <View key={item.id} style={{ marginBottom: 12, borderBottomWidth: 1, borderBottomColor: colors.border, paddingBottom: 12 }}>
                <Text style={{ fontWeight: '600', color: colors.textPrimary, fontSize: 13 }}>{item.label}</Text>
                <Text style={{ color: colors.textSecondary, fontSize: 11, marginBottom: 8 }}>{item.sub}</Text>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  {['inApp', 'email'].map(channel => (
                    <TouchableOpacity key={channel} onPress={() => updateNotifPref(item.id, channel)} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 6, paddingHorizontal: 10, borderRadius: 6, backgroundColor: prefVal[channel] ? '#eff6ff' : isDark ? '#1e293b' : '#f3f4f6', borderWidth: 1, borderColor: prefVal[channel] ? '#bfdbfe' : colors.border }}>
                      <View style={{ width: 28, height: 16, borderRadius: 8, backgroundColor: prefVal[channel] ? '#2563eb' : '#d1d5db', padding: 2 }}>
                        <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: '#fff', transform: [{ translateX: prefVal[channel] ? 12 : 0 }] }} />
                      </View>
                      <Text style={{ fontSize: 11, fontWeight: '600', color: prefVal[channel] ? '#2563eb' : colors.textSecondary }}>{channel === 'inApp' ? 'In-app' : 'Email'}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            );
          })}
        </View>
      ))}
    </ScrollView>
  );
}

function DangerTab({ username, handleLogout, colors, isDark }: any) {
  const [confirmVal, setConfirmVal] = useState('');
  const [deactivating, setDeactivating] = useState(false);

  const handleDeactivate = async () => {
    if (confirmVal !== username) return;
    setDeactivating(true);
    try {
      const res = await deactivateAccountAPI(username);
      if (res.ok) {
        handleLogout();
      } else {
        Alert.alert('Error', res.error || 'Deactivation failed');
      }
    } catch {
      Alert.alert('Error', 'Deactivation failed');
    } finally {
      setDeactivating(false);
    }
  };

  return (
    <ScrollView style={{ padding: 16 }}>
      <Text style={[styles.subTitle, { color: colors.textPrimary }]}>Account</Text>

      <View style={[styles.cardBlock, { backgroundColor: colors.card, borderColor: colors.border, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }]}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <Ionicons name="log-out-outline" size={18} color={colors.textSecondary} />
          <View>
            <Text style={{ fontWeight: '600', color: colors.textPrimary, fontSize: 13 }}>Log out</Text>
            <Text style={{ fontSize: 11, color: colors.textSecondary }}>Sign out of your account</Text>
          </View>
        </View>
        <TouchableOpacity onPress={handleLogout} style={{ paddingVertical: 8, paddingHorizontal: 14, backgroundColor: isDark ? '#374151' : '#f3f4f6', borderRadius: 8 }}>
          <Text style={{ color: colors.textPrimary, fontWeight: '600', fontSize: 12 }}>Log out</Text>
        </TouchableOpacity>
      </View>

      <View style={[styles.cardBlock, { backgroundColor: colors.card, borderColor: '#fecaca', borderWidth: 2 }]}>
        <View style={{ backgroundColor: '#fef2f2', padding: 12, borderRadius: 10, marginBottom: 16 }}>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <Ionicons name="warning" size={18} color="#dc2626" />
            <View style={{ flex: 1 }}>
              <Text style={{ fontWeight: '700', color: '#991b1b', fontSize: 13 }}>Delete account</Text>
              <Text style={{ fontSize: 11, color: '#b91c1c', marginTop: 4 }}>This will permanently delete your account, all posts, and data. Cannot be undone.</Text>
            </View>
          </View>
        </View>
        <Text style={{ fontSize: 11, color: colors.textSecondary, marginBottom: 8 }}>Type <Text style={{ fontWeight: '700', color: colors.textPrimary }}>@{username}</Text> to confirm</Text>
        <TextInput
          placeholder={`@${username}`}
          placeholderTextColor={colors.textSecondary}
          value={confirmVal}
          onChangeText={setConfirmVal}
          style={[styles.input, { backgroundColor: isDark ? '#1e293b' : '#f8fafc', color: colors.textPrimary, borderColor: colors.border }]}
        />
        <TouchableOpacity
          onPress={handleDeactivate}
          disabled={confirmVal !== username || deactivating}
          style={{ backgroundColor: '#dc2626', paddingVertical: 14, borderRadius: 12, alignItems: 'center', marginTop: 12, opacity: (confirmVal !== username || deactivating) ? 0.3 : 1 }}
        >
          {deactivating ? <ActivityIndicator color="#fff" /> : <Text style={{ color: '#fff', fontWeight: '800', fontSize: 15 }}>Delete my account permanently</Text>}
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', height: 56, paddingHorizontal: 16, borderBottomWidth: StyleSheet.hairlineWidth },
  headerTitle: { fontSize: 18, fontWeight: '800' },
  profileCard: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16, borderBottomWidth: StyleSheet.hairlineWidth },
  profileAvatar: { width: 48, height: 48, borderRadius: 24 },
  profileName: { fontSize: 16, fontWeight: '700' },
  profileStat: { fontSize: 11, color: '#6b7280' },
  sectionLabel: { fontSize: 10, fontWeight: '800', textTransform: 'uppercase', paddingHorizontal: 4, marginBottom: 6, letterSpacing: 0.5 },
  sectionCard: { borderRadius: 16, borderWidth: 1, overflow: 'hidden' },
  menuRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14 },
  menuIcon: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  menuText: { fontSize: 14, fontWeight: '600', flex: 1 },
  subTitle: { fontSize: 20, fontWeight: '800', marginBottom: 16 },
  cardBlock: { borderWidth: 1, borderRadius: 16, padding: 16, marginBottom: 16 },
  cardHeader: { fontSize: 15, fontWeight: '700', marginBottom: 8 },
  metricRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 12 },
  metricItem: { alignItems: 'center', flex: 1 },
  metricVal: { fontSize: 20, fontWeight: '800', color: '#2563eb' },
  statusBanner: { padding: 24, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  bannerText: { color: '#fff', fontSize: 18, fontWeight: '800', marginTop: 8 },
  bannerSub: { color: 'rgba(255,255,255,0.85)', fontSize: 13, marginTop: 4, textAlign: 'center' },
  payBtn: { marginTop: 16, backgroundColor: '#fff', paddingVertical: 10, paddingHorizontal: 20, borderRadius: 12 },
  reqRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 40 },
  modalTitle: { fontSize: 18, fontWeight: '800', marginBottom: 8 },
  payDetails: { padding: 16, borderRadius: 12, marginBottom: 20 },
  payLabel: { fontSize: 10, fontWeight: '700', color: '#64748b', textTransform: 'uppercase', marginBottom: 2 },
  payValue: { fontSize: 14, fontWeight: '700', marginBottom: 12 },
  payValueBig: { fontSize: 22, fontWeight: '900', letterSpacing: 1 },
  confirmBtn: { backgroundColor: '#10b981', paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
  confirmText: { color: '#fff', fontWeight: '800', fontSize: 15 },
  closeBtn: { marginTop: 12, paddingVertical: 12, alignItems: 'center' },
  input: { width: '100%', height: 48, borderRadius: 12, paddingHorizontal: 14, fontSize: 14, borderWidth: 1, marginBottom: 12 },
});
