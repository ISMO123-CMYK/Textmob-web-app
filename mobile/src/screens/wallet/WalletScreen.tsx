import React, { useState, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ActivityIndicator,
  SafeAreaView, ScrollView, TextInput, Alert, Modal, FlatList,
  KeyboardAvoidingView, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { getWalletAPI, sendMobcoinsAPI, getPayoutsAPI, redeemAPI, Transaction } from '../../api/wallet';
import { searchUsersAPI } from '../../api/users';

export default function WalletScreen({ navigation }: { navigation: any }) {
  const { colors, isDark } = useTheme();
  const { username } = useAuth();

  const [balance, setBalance] = useState(0);
  const [profile, setProfile] = useState<any>({});
  const [payouts, setPayouts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showBalance, setShowBalance] = useState(true);
  const [activeTab, setActiveTab] = useState('actions');

  // Modals
  const [showSend, setShowSend] = useState(false);
  const [showGift, setShowGift] = useState(false);
  const [showEarn, setShowEarn] = useState(false);
  const [showRedeem, setShowRedeem] = useState(false);
  const [alertModal, setAlertModal] = useState({ open: false, title: '', message: '' });

  // Send
  const [searchQ, setSearchQ] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<any[]>([]);
  const [amount, setAmount] = useState('');
  const [sending, setSending] = useState(false);

  // Redeem
  const [redeemType, setRedeemType] = useState('CASH');
  const [redeemAmount, setRedeemAmount] = useState('');
  const [payoutDetails, setPayoutDetails] = useState({ bank: '', account_no: '', name: '', network: 'MTN', phone: '' });
  const [redeeming, setRedeeming] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (username) loadWallet();
    else setLoading(false);
  }, [username]);

  const loadWallet = async () => {
    setLoading(true);
    try {
      const [walletRes, payoutsRes] = await Promise.all([
        getWalletAPI(username || ''),
        getPayoutsAPI(username || ''),
      ]);
      if (walletRes.ok && walletRes.data) {
        setProfile({ fullname: walletRes.data.fullname, username: walletRes.data.username, isOrg: (walletRes.data.profile_type || '').toLowerCase() === 'organisation' });
        setBalance(walletRes.data.mobcoins || 0);
      }
      if (payoutsRes.ok) setPayouts(payoutsRes.data || []);
    } catch {}
    setLoading(false);
  };

  const searchUsers = async (q: string) => {
    setSearchQ(q);
    if (q.trim().length < 2) { setSearchResults([]); return; }
    const res = await searchUsersAPI(q, 8, username);
    if (res.ok) setSearchResults(res.data || []);
  };

  const toggleUser = (user: any) => {
    setSelectedUsers(prev => prev.find(u => u.username === user.username) ? prev.filter(u => u.username !== user.username) : [...prev, user]);
  };

  const handleSend = async () => {
    const amountNum = Number(amount);
    if (!amountNum || amountNum <= 0) { setAlertModal({ open: true, title: 'Error', message: 'Enter a valid amount' }); return; }
    if (amountNum > balance) { setAlertModal({ open: true, title: 'Error', message: 'Insufficient balance' }); return; }
    if (selectedUsers.length === 0) { setAlertModal({ open: true, title: 'Error', message: 'Select at least one recipient' }); return; }
    setSending(true);
    const res = await sendMobcoinsAPI(username || '', selectedUsers.map(u => u.username), amountNum);
    setSending(false);
    if (res.ok) {
      setAlertModal({ open: true, title: 'Success', message: res.data?.message || 'Mobcoins sent!' });
      setBalance(prev => prev - amountNum);
      setShowSend(false);
      setSelectedUsers([]);
      setAmount('');
      setSearchQ('');
      setSearchResults([]);
    } else {
      setAlertModal({ open: true, title: 'Error', message: 'Failed to send' });
    }
  };

  const handleRedeem = async () => {
    const amountNum = Number(redeemAmount);
    if (!amountNum || amountNum < 2000) { setMessage('Minimum redemption is 2,000 Mobcoins'); return; }
    if (amountNum > balance) { setMessage('Insufficient Mobcoins'); return; }
    const details = redeemType === 'CASH'
      ? { bank: payoutDetails.bank, account_no: payoutDetails.account_no, name: payoutDetails.name }
      : { network: payoutDetails.network, phone: payoutDetails.phone };
    if (redeemType === 'CASH' && (!details.bank || !details.account_no || !details.name)) { setMessage('Fill in all bank details'); return; }
    if (redeemType === 'AIRTIME' && (!details.network || !details.phone)) { setMessage('Fill in airtime details'); return; }
    setRedeeming(true);
    setMessage('');
    const res = await redeemAPI(username || '', amountNum, redeemType, details);
    setRedeeming(false);
    if (res.ok) {
      setAlertModal({ open: true, title: 'Success', message: res.data?.message || 'Redemption submitted!' });
      setShowRedeem(false);
      setRedeemAmount('');
      setPayoutDetails({ bank: '', account_no: '', name: '', network: 'MTN', phone: '' });
    } else {
      setMessage('Redemption failed. Try again.');
    }
  };

  const s = makeStyles(colors, isDark);

  if (loading) {
    return (
      <SafeAreaView style={[s.safe, { backgroundColor: colors.background }]}>
        <View style={s.loadingWrap}><ActivityIndicator size="large" color={colors.primary} /></View>
      </SafeAreaView>
    );
  }

  const showAlert = (title: string, msg: string) => setAlertModal({ open: true, title, message: msg });

  const RedeemForm = () => (
    <>
      <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12 }}>
        {['CASH', 'AIRTIME'].map(t => (
          <TouchableOpacity key={t} style={[s.redeemTypeBtn, redeemType === t && { backgroundColor: colors.primary, borderColor: colors.primary }]}
            onPress={() => { setRedeemType(t); setPayoutDetails({ bank: '', account_no: '', name: '', network: 'MTN', phone: '' }); }}
          >
            <Text style={[s.redeemTypeText, { color: redeemType === t ? '#fff' : colors.textSecondary }]}>{t}</Text>
          </TouchableOpacity>
        ))}
      </View>
      <TextInput style={[s.input, { backgroundColor: isDark ? '#1e293b' : '#f3f4f6', color: colors.textPrimary }]}
        placeholder="Amount (min 2,000)" placeholderTextColor={colors.textSecondary}
        value={redeemAmount} onChangeText={setRedeemAmount} keyboardType="decimal-pad"
      />
      {redeemType === 'CASH' ? (
        <>
          <TextInput style={[s.input, { backgroundColor: isDark ? '#1e293b' : '#f3f4f6', color: colors.textPrimary }]}
            placeholder="Bank Name" placeholderTextColor={colors.textSecondary}
            value={payoutDetails.bank} onChangeText={t => setPayoutDetails(p => ({ ...p, bank: t }))}
          />
          <TextInput style={[s.input, { backgroundColor: isDark ? '#1e293b' : '#f3f4f6', color: colors.textPrimary }]}
            placeholder="Account Number" placeholderTextColor={colors.textSecondary} keyboardType="number-pad"
            value={payoutDetails.account_no} onChangeText={t => setPayoutDetails(p => ({ ...p, account_no: t }))}
          />
          <TextInput style={[s.input, { backgroundColor: isDark ? '#1e293b' : '#f3f4f6', color: colors.textPrimary }]}
            placeholder="Account Holder Name" placeholderTextColor={colors.textSecondary}
            value={payoutDetails.name} onChangeText={t => setPayoutDetails(p => ({ ...p, name: t }))}
          />
        </>
      ) : (
        <>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {['MTN', 'GLO', 'AIRTEL', '9MOBILE'].map(net => (
              <TouchableOpacity key={net} style={[s.netBtn, payoutDetails.network === net && { backgroundColor: colors.primary }]}
                onPress={() => setPayoutDetails(p => ({ ...p, network: net }))}
              >
                <Text style={[s.netBtnText, { color: payoutDetails.network === net ? '#fff' : colors.textSecondary }]}>{net}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <TextInput style={[s.input, { backgroundColor: isDark ? '#1e293b' : '#f3f4f6', color: colors.textPrimary }]}
            placeholder="Phone Number" placeholderTextColor={colors.textSecondary} keyboardType="phone-pad"
            value={payoutDetails.phone} onChangeText={t => setPayoutDetails(p => ({ ...p, phone: t }))}
          />
        </>
      )}
      {message ? <Text style={{ color: '#ef4444', fontSize: 13, textAlign: 'center' }}>{message}</Text> : null}
      <TouchableOpacity style={[s.primaryBtn, redeeming && { opacity: 0.5 }]} onPress={handleRedeem} disabled={redeeming}>
        {redeeming ? <ActivityIndicator color="#fff" size="small" /> : <Text style={s.primaryBtnText}>Redeem</Text>}
      </TouchableOpacity>
    </>
  );

  const SendModal = () => (
    <Modal visible={showSend} animationType="slide" onRequestClose={() => setShowSend(false)}>
      <SafeAreaView style={[s.safe, { backgroundColor: colors.background }]}>
        <View style={[s.modalHeader, { borderBottomColor: colors.border }]}>
          <TouchableOpacity onPress={() => setShowSend(false)}><Text style={{ fontSize: 16, color: colors.textSecondary }}>Cancel</Text></TouchableOpacity>
          <Text style={[s.modalTitle, { color: colors.textPrimary }]}>Send Mobcoins</Text>
          <View style={{ width: 50 }} />
        </View>
        <View style={{ padding: 16, flex: 1 }}>
          <TextInput style={[s.input, { backgroundColor: isDark ? '#1e293b' : '#f3f4f6', color: colors.textPrimary }]}
            placeholder="Search users..." placeholderTextColor={colors.textSecondary}
            value={searchQ} onChangeText={searchUsers}
          />
          {searchResults.length > 0 && (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginVertical: 8 }}>
              {searchResults.map(u => (
                <TouchableOpacity key={u.username} style={[s.userChip, selectedUsers.find(s => s.username === u.username) ? { backgroundColor: colors.primary } : { backgroundColor: isDark ? '#1e293b' : '#f3f4f6' }]}
                  onPress={() => toggleUser(u)}
                >
                  <Text style={{ fontSize: 12, fontWeight: '600', color: selectedUsers.find(s => s.username === u.username) ? '#fff' : colors.textPrimary }}>{u.fullname || u.username}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
          {selectedUsers.length > 0 && (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
              {selectedUsers.map(u => (
                <View key={u.username} style={[s.selectedChip, { backgroundColor: colors.primary }]}>
                  <Text style={{ fontSize: 11, color: '#fff', fontWeight: '600' }}>{u.fullname || u.username}</Text>
                  <TouchableOpacity onPress={() => toggleUser(u)}><Ionicons name="close-circle" size={14} color="#fff" /></TouchableOpacity>
                </View>
              ))}
            </View>
          )}
          <TextInput style={[s.input, { backgroundColor: isDark ? '#1e293b' : '#f3f4f6', color: colors.textPrimary }]}
            placeholder="Amount" placeholderTextColor={colors.textSecondary} keyboardType="decimal-pad"
            value={amount} onChangeText={setAmount}
          />
          <TouchableOpacity style={[s.primaryBtn, sending && { opacity: 0.5 }]} onPress={handleSend} disabled={sending}>
            {sending ? <ActivityIndicator color="#fff" size="small" /> : <Text style={s.primaryBtnText}>Send Mobcoins</Text>}
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </Modal>
  );

  return (
    <SafeAreaView style={[s.safe, { backgroundColor: colors.background }]}>
      <View style={[s.header, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={{ padding: 4 }}>
          <Ionicons name="arrow-back" size={22} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={[s.headerTitle, { color: colors.textPrimary }]}>Wallet</Text>
        <TouchableOpacity style={{ padding: 4 }} onPress={() => loadWallet()}>
          <Ionicons name="refresh-outline" size={20} color={colors.textSecondary} />
        </TouchableOpacity>
      </View>

      {/* Balance Card */}
      <View style={s.balanceCard}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Text style={s.balanceLabel}>Available Balance</Text>
          <TouchableOpacity onPress={() => setShowBalance(!showBalance)}>
            <Ionicons name={showBalance ? 'eye-outline' : 'eye-off-outline'} size={16} color="rgba(255,255,255,0.7)" />
          </TouchableOpacity>
        </View>
        <Text style={s.balanceAmount}>{showBalance ? balance.toLocaleString() : '*****'}</Text>
        <Text style={s.balanceCurrency}>MOBCOINS</Text>
      </View>

      {/* Tabs: Actions | Redeem | History */}
      <View style={[s.tabBar, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        {['actions', 'redeem', 'history'].map(tab => (
          <TouchableOpacity key={tab} style={[s.tab, activeTab === tab && { borderBottomColor: colors.primary, borderBottomWidth: 2 }]}
            onPress={() => setActiveTab(tab)}
          >
            <Text style={[s.tabText, { color: activeTab === tab ? colors.primary : colors.textSecondary }]}>{tab.charAt(0).toUpperCase() + tab.slice(1)}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 100 }}>
        {activeTab === 'actions' && (
          <View style={{ gap: 10 }}>
            <TouchableOpacity style={[s.actionCard, { backgroundColor: isDark ? '#1e293b' : '#f8fafc', borderColor: colors.border }]} onPress={() => setShowSend(true)}>
              <View style={[s.actionIcon, { backgroundColor: isDark ? 'rgba(59,130,246,0.15)' : '#eff6ff' }]}>
                <Ionicons name="send-outline" size={22} color="#2563eb" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[s.actionTitle, { color: colors.textPrimary }]}>Send Mobcoins</Text>
                <Text style={[s.actionDesc, { color: colors.textSecondary }]}>Send coins to other users</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
            </TouchableOpacity>
            <TouchableOpacity style={[s.actionCard, { backgroundColor: isDark ? '#1e293b' : '#f8fafc', borderColor: colors.border }]} onPress={() => setShowGift(true)}>
              <View style={[s.actionIcon, { backgroundColor: isDark ? 'rgba(245,158,11,0.15)' : '#fffbeb' }]}>
                <Ionicons name="gift-outline" size={22} color="#d97706" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[s.actionTitle, { color: colors.textPrimary }]}>Gift Mobcoins</Text>
                <Text style={[s.actionDesc, { color: colors.textSecondary }]}>Send a gift to someone</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
            </TouchableOpacity>
            <TouchableOpacity style={[s.actionCard, { backgroundColor: isDark ? '#1e293b' : '#f8fafc', borderColor: colors.border }]} onPress={() => setShowEarn(true)}>
              <View style={[s.actionIcon, { backgroundColor: isDark ? 'rgba(16,185,129,0.15)' : '#ecfdf5' }]}>
                <Ionicons name="trending-up-outline" size={22} color="#10b981" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[s.actionTitle, { color: colors.textPrimary }]}>Earn Mobcoins</Text>
                <Text style={[s.actionDesc, { color: colors.textSecondary }]}>Ways to earn free coins</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>
        )}

        {activeTab === 'redeem' && <RedeemForm />}

        {activeTab === 'history' && (
          payouts.length === 0 ? (
            <View style={{ alignItems: 'center', paddingTop: 60 }}>
              <Ionicons name="receipt-outline" size={48} color={colors.textSecondary} />
              <Text style={{ color: colors.textSecondary, marginTop: 8, fontSize: 13 }}>No redemption history</Text>
            </View>
          ) : (
            payouts.map((p, i) => (
              <View key={p.id || i} style={[s.payoutRow, { borderBottomColor: colors.border }]}>
                <View style={{ flex: 1 }}>
                  <Text style={[s.payoutType, { color: colors.textPrimary }]}>{p.type} · {p.coin_amount} coins</Text>
                  <Text style={[s.payoutValue, { color: colors.textSecondary }]}>= ₦{p.naira_value?.toLocaleString()}</Text>
                </View>
                <View style={[s.payoutBadge, {
                  backgroundColor: p.status === 'COMPLETED' ? '#dcfce7' : p.status === 'REJECTED' ? '#fef2f2' : '#fefce8'
                }]}>
                  <Text style={[s.payoutBadgeText, {
                    color: p.status === 'COMPLETED' ? '#16a34a' : p.status === 'REJECTED' ? '#dc2626' : '#ca8a04'
                  }]}>{p.status}</Text>
                </View>
              </View>
            ))
          )
        )}
      </ScrollView>

      <SendModal />

      {/* Gift Modal (redirects to GiftCoinsModal in post card) */}
      <Modal visible={showGift} animationType="slide" onRequestClose={() => setShowGift(false)}>
        <SafeAreaView style={[s.safe, { backgroundColor: colors.background }]}>
          <View style={[s.modalHeader, { borderBottomColor: colors.border }]}>
            <TouchableOpacity onPress={() => setShowGift(false)}><Text style={{ fontSize: 16, color: colors.textSecondary }}>Cancel</Text></TouchableOpacity>
            <Text style={[s.modalTitle, { color: colors.textPrimary }]}>Gift Mobcoins</Text>
            <View style={{ width: 50 }} />
          </View>
          <View style={{ padding: 16, flex: 1 }}>
            <Text style={{ fontSize: 14, color: colors.textSecondary, textAlign: 'center', marginBottom: 20 }}>
              Gift cards to send from a post or profile
            </Text>
            <View style={[s.infoCard, { backgroundColor: isDark ? '#1e293b' : '#f8fafc', borderColor: colors.border }]}>
              <Ionicons name="information-circle-outline" size={20} color="#2563eb" />
              <Text style={[s.infoText, { color: colors.textSecondary }]}>Open any post and tap the gift icon to send Mobcoins to the author</Text>
            </View>
          </View>
        </SafeAreaView>
      </Modal>

      {/* Earn Modal */}
      <Modal visible={showEarn} animationType="slide" onRequestClose={() => setShowEarn(false)}>
        <SafeAreaView style={[s.safe, { backgroundColor: colors.background }]}>
          <View style={[s.modalHeader, { borderBottomColor: colors.border }]}>
            <TouchableOpacity onPress={() => setShowEarn(false)}><Text style={{ fontSize: 16, color: colors.textSecondary }}>Close</Text></TouchableOpacity>
            <Text style={[s.modalTitle, { color: colors.textPrimary }]}>Earn Mobcoins</Text>
            <View style={{ width: 50 }} />
          </View>
          <View style={{ padding: 16, gap: 10 }}>
            {[
              { icon: 'create-outline', title: 'Create Posts', desc: 'Earn coins when your posts get engagement' },
              { icon: 'people-outline', title: 'Refer Friends', desc: 'Invite friends and earn 50 coins each' },
              { icon: 'flash-outline', title: 'Daily Login', desc: 'Log in daily for bonus coins' },
              { icon: 'trophy-outline', title: 'Leaderboard', desc: 'Top users earn bonus rewards weekly' },
            ].map((item, i) => (
              <View key={i} style={[s.earnRow, { borderBottomColor: colors.border }]}>
                <View style={[s.earnIcon, { backgroundColor: isDark ? 'rgba(59,130,246,0.1)' : '#eff6ff' }]}>
                  <Ionicons name={item.icon as any} size={20} color="#2563eb" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[s.earnTitle, { color: colors.textPrimary }]}>{item.title}</Text>
                  <Text style={[s.earnDesc, { color: colors.textSecondary }]}>{item.desc}</Text>
                </View>
              </View>
            ))}
          </View>
        </SafeAreaView>
      </Modal>

      {/* Alert Modal */}
      <Modal visible={alertModal.open} transparent animationType="fade" onRequestClose={() => setAlertModal({ open: false, title: '', message: '' })}>
        <View style={s.alertOverlay}>
          <View style={[s.alertBox, { backgroundColor: colors.card }]}>
            <Text style={[s.alertTitle, { color: colors.textPrimary }]}>{alertModal.title}</Text>
            <Text style={[s.alertMsg, { color: colors.textSecondary }]}>{alertModal.message}</Text>
            <TouchableOpacity style={[s.alertBtn, { backgroundColor: colors.primary }]}
              onPress={() => setAlertModal({ open: false, title: '', message: '' })}
            >
              <Text style={s.alertBtnText}>OK</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const makeStyles = (colors: any, isDark: boolean) => StyleSheet.create({
  safe: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', height: 52, paddingHorizontal: 16, borderBottomWidth: StyleSheet.hairlineWidth },
  headerTitle: { fontSize: 18, fontWeight: '700' },
  loadingWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  balanceCard: { backgroundColor: '#2563eb', borderRadius: 20, padding: 28, margin: 16, alignItems: 'center' },
  balanceLabel: { color: 'rgba(255,255,255,0.7)', fontSize: 13, fontWeight: '500' },
  balanceAmount: { color: '#fff', fontSize: 44, fontWeight: '800', marginVertical: 4, letterSpacing: -1 },
  balanceCurrency: { color: 'rgba(255,255,255,0.5)', fontSize: 11, fontWeight: '700', letterSpacing: 2 },
  tabBar: { flexDirection: 'row', borderBottomWidth: StyleSheet.hairlineWidth },
  tab: { flex: 1, alignItems: 'center', paddingVertical: 12 },
  tabText: { fontSize: 13, fontWeight: '600' },
  actionCard: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16, borderRadius: 14, borderWidth: 1 },
  actionIcon: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  actionTitle: { fontSize: 14, fontWeight: '700' },
  actionDesc: { fontSize: 12, marginTop: 1 },
  input: { borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14, fontSize: 14, marginBottom: 10 },
  primaryBtn: { backgroundColor: '#2563eb', borderRadius: 14, paddingVertical: 15, alignItems: 'center', marginTop: 8 },
  primaryBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', height: 52, paddingHorizontal: 16, borderBottomWidth: StyleSheet.hairlineWidth },
  modalTitle: { fontSize: 17, fontWeight: '700' },
  userChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16 },
  selectedChip: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 14 },
  redeemTypeBtn: { flex: 1, paddingVertical: 10, borderRadius: 10, alignItems: 'center', borderWidth: 1, borderColor: colors.border },
  redeemTypeText: { fontSize: 13, fontWeight: '700' },
  netBtn: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10, borderWidth: 1, borderColor: colors.border },
  netBtnText: { fontSize: 11, fontWeight: '600' },
  payoutRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth },
  payoutType: { fontSize: 13, fontWeight: '600' },
  payoutValue: { fontSize: 12, marginTop: 1 },
  payoutBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  payoutBadgeText: { fontSize: 10, fontWeight: '700' },
  earnRow: { flexDirection: 'row', gap: 12, paddingVertical: 14, borderBottomWidth: StyleSheet.hairlineWidth },
  earnIcon: { width: 40, height: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  earnTitle: { fontSize: 14, fontWeight: '600' },
  earnDesc: { fontSize: 12, marginTop: 1 },
  infoCard: { flexDirection: 'row', gap: 10, padding: 14, borderRadius: 12, borderWidth: 1, alignItems: 'flex-start' },
  infoText: { fontSize: 12, flex: 1, lineHeight: 17 },
  alertOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  alertBox: { width: '100%', maxWidth: 300, borderRadius: 20, padding: 24, alignItems: 'center' },
  alertTitle: { fontSize: 17, fontWeight: '700', marginBottom: 6 },
  alertMsg: { fontSize: 13, textAlign: 'center', marginBottom: 16, lineHeight: 18 },
  alertBtn: { paddingHorizontal: 32, paddingVertical: 10, borderRadius: 20 },
  alertBtnText: { color: '#fff', fontSize: 14, fontWeight: '700' },
});
