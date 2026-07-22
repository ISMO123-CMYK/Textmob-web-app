import React, { useState, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ActivityIndicator,
  ScrollView, TextInput, Modal,
  KeyboardAvoidingView, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { getWalletAPI, sendMobcoinsAPI, getPayoutsAPI, redeemAPI } from '../../api/wallet';
import { searchUsersAPI } from '../../api/users';

export default function WalletScreen({ navigation }: { navigation: any }) {
  const { colors, isDark } = useTheme();
  const { username } = useAuth();

  const [balance, setBalance] = useState(0);
  const [user, setUser] = useState<any>({});
  const [payouts, setPayouts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showBalance, setShowBalance] = useState(true);
  const [walletMode, setWalletMode] = useState<'balance' | 'live'>('balance');
  const [activeTab, setActiveTab] = useState('actions');

  const [showSendModal, setShowSendModal] = useState(false);
  const [showGiftModal, setShowGiftModal] = useState(false);
  const [showEarnModal, setShowEarnModal] = useState(false);
  const [showLearnModal, setShowLearnModal] = useState(false);
  const [showRedeemModal, setShowRedeemModal] = useState(false);
  const [alertModal, setAlertModal] = useState({ open: false, title: '', message: '' });

  const [searchQ, setSearchQ] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<any[]>([]);
  const [amount, setAmount] = useState('');
  const [sending, setSending] = useState(false);

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
        setUser({
          fullname: walletRes.data.fullname,
          username: walletRes.data.username,
          isOrg: (walletRes.data.profile_type || '').toLowerCase() === 'organisation',
        });
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
    setSelectedUsers(prev =>
      prev.find(u => u.username === user.username)
        ? prev.filter(u => u.username !== user.username)
        : [...prev, user]
    );
  };

  const handleSend = async () => {
    const amountNum = Number(amount);
    if (!amountNum || amountNum <= 0) { setMessage('Enter a valid amount'); return; }
    if (amountNum > balance) { setMessage('Insufficient balance'); return; }
    if (selectedUsers.length === 0) { setMessage('Select at least one recipient'); return; }
    setSending(true);
    const res = await sendMobcoinsAPI(username || '', selectedUsers.map(u => u.username), amountNum);
    setSending(false);
    if (res.ok) {
      setMessage('Sent successfully!');
      setBalance(prev => prev - amountNum);
      setTimeout(() => { setShowSendModal(false); setSelectedUsers([]); setAmount(''); setSearchQ(''); setSearchResults([]); setMessage(''); }, 1200);
    } else {
      setMessage('Failed to send');
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
      setMessage('Redemption submitted!');
      setTimeout(() => { setShowRedeemModal(false); setRedeemAmount(''); setPayoutDetails({ bank: '', account_no: '', name: '', network: 'MTN', phone: '' }); setMessage(''); }, 1500);
    } else {
      setMessage('Redemption failed. Try again.');
    }
  };

  const showAlert = (title: string, msg: string) => setAlertModal({ open: true, title, message: msg });

  const s = makeStyles(colors, isDark);

  if (loading) {
    return (
      <SafeAreaView style={[s.safe, { backgroundColor: colors.background }]}>
        <View style={s.loadingWrap}><ActivityIndicator size="large" color={colors.primary} /></View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[s.safe, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={{ paddingBottom: 100 }}>
        {/* Header */}
        <View style={s.headerWrap}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={{ padding: 4 }}>
              <Ionicons name="arrow-back" size={22} color={colors.textPrimary} />
            </TouchableOpacity>
            <View>
              <Text style={[s.headerTitle, { color: colors.textPrimary }]}>Wallet</Text>
              {user.username && <Text style={[s.headerUser, { color: colors.textSecondary }]}>@{user.username}</Text>}
            </View>
          </View>
          <TouchableOpacity onPress={() => loadWallet()} style={{ padding: 4 }}>
            <Ionicons name="refresh-outline" size={20} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>

        {/* Balance Card */}
        <View style={s.balanceCard}>
          <View style={s.balanceGridBg} />
          <View style={s.balanceContent}>
            <View style={s.balanceRow}>
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                  <Text style={s.balanceLabel}>{walletMode === 'live' ? 'WALLET VALUE (NGN)' : 'MOBCOINS BALANCE'}</Text>
                  <TouchableOpacity
                    style={[s.modeToggle, walletMode === 'live' && { backgroundColor: '#16a34a' }]}
                    onPress={() => setWalletMode(prev => prev === 'balance' ? 'live' : 'balance')}
                  >
                    <Text style={s.modeToggleText}>{walletMode === 'live' ? 'Live' : 'Wallet'}</Text>
                  </TouchableOpacity>
                </View>
                <Text style={s.balanceAmount}>
                  {showBalance
                    ? (walletMode === 'live' ? `₦${(balance * 0.1).toLocaleString()}` : balance.toLocaleString())
                    : '·····'}
                </Text>
                {user.fullname && <Text style={s.balanceGreeting}>Hi, {user.fullname}</Text>}
              </View>
              <TouchableOpacity style={s.eyeBtn} onPress={() => setShowBalance(!showBalance)}>
                <Ionicons name={showBalance ? 'eye-outline' : 'eye-off-outline'} size={18} color="rgba(255,255,255,0.7)" />
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Tabs */}
        <View style={[s.tabBar, { backgroundColor: isDark ? '#1e293b' : '#f3f4f6' }]}>
          {['actions', 'redeem', 'history'].map(tab => (
            <TouchableOpacity
              key={tab}
              style={[s.tab, activeTab === tab && { backgroundColor: colors.card, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 3, elevation: 1 }]}
              onPress={() => setActiveTab(tab)}
            >
              <Text style={[s.tabText, { color: activeTab === tab ? colors.textPrimary : colors.textSecondary }]}>
                {tab === 'actions' ? 'Send/Earn' : tab.charAt(0).toUpperCase() + tab.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Actions Tab */}
        {activeTab === 'actions' && (
          <View style={s.actionsSection}>
            <View style={s.actionsGrid}>
              <TouchableOpacity style={[s.actionCard, { backgroundColor: isDark ? '#1e293b' : '#f9fafb' }]} onPress={() => setShowSendModal(true)}>
                <View style={[s.actionIcon, { backgroundColor: isDark ? 'rgba(37,99,235,0.15)' : '#eff6ff' }]}>
                  <Ionicons name="send-outline" size={20} color="#2563eb" />
                </View>
                <Text style={[s.actionLabel, { color: colors.textPrimary }]}>Send</Text>
                <Text style={[s.actionDesc, { color: colors.textSecondary }]}>Transfer coins</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[s.actionCard, { backgroundColor: isDark ? '#1e293b' : '#f9fafb' }]} onPress={() => setShowEarnModal(true)}>
                <View style={[s.actionIcon, { backgroundColor: isDark ? 'rgba(245,158,11,0.15)' : '#fffbeb' }]}>
                  <Ionicons name="cash-outline" size={20} color="#d97706" />
                </View>
                <Text style={[s.actionLabel, { color: colors.textPrimary }]}>Earn</Text>
                <Text style={[s.actionDesc, { color: colors.textSecondary }]}>Get more coins</Text>
              </TouchableOpacity>
            </View>
            <TouchableOpacity style={[s.learnCard, { backgroundColor: isDark ? '#1e293b' : '#f9fafb' }]} onPress={() => setShowLearnModal(true)}>
              <View style={[s.learnIcon, { backgroundColor: isDark ? 'rgba(37,99,235,0.15)' : '#eff6ff' }]}>
                <Ionicons name="bulb-outline" size={20} color="#2563eb" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[s.learnTitle, { color: colors.textPrimary }]}>How to earn Mobcoins</Text>
                <Text style={[s.learnDesc, { color: colors.textSecondary }]}>Tips to grow your balance</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>
        )}

        {/* Redeem Tab */}
        {activeTab === 'redeem' && (
          <View style={s.actionsSection}>
            {!user.isOrg ? (
              <View style={[s.emptyCard, { backgroundColor: isDark ? '#1e293b' : '#f9fafb' }]}>
                <Ionicons name="briefcase-outline" size={28} color={colors.textSecondary} />
                <Text style={[s.emptyTitle, { color: colors.textPrimary }]}>Upgrade to Professional</Text>
                <Text style={[s.emptyDesc, { color: colors.textSecondary }]}>Personal accounts cannot redeem earnings. Go to Edit Profile to switch mode.</Text>
              </View>
            ) : (
              <>
                <View style={[s.infoBox, { backgroundColor: isDark ? 'rgba(37,99,235,0.1)' : '#eff6ff', borderColor: isDark ? 'rgba(37,99,235,0.2)' : '#bfdbfe' }]}>
                  <Text style={[s.infoBoxTitle, { color: isDark ? '#93c5fd' : '#1e40af' }]}>How Redemption Works</Text>
                  <View style={s.infoRow}>
                    <Text style={[s.infoBullet, { color: isDark ? '#93c5fd' : '#1e40af' }]}>•</Text>
                    <Text style={[s.infoText, { color: isDark ? '#93c5fd' : '#1e40af' }]}><Text style={{ fontWeight: '700' }}>Rate:</Text> 1 Mobcoin = ₦0.10 (500 coins = ₦50).</Text>
                  </View>
                  <View style={s.infoRow}>
                    <Text style={[s.infoBullet, { color: isDark ? '#93c5fd' : '#1e40af' }]}>•</Text>
                    <Text style={[s.infoText, { color: isDark ? '#93c5fd' : '#1e40af' }]}><Text style={{ fontWeight: '700' }}>Minimum:</Text> You need at least 2,000 coins to redeem.</Text>
                  </View>
                  <View style={s.infoRow}>
                    <Text style={[s.infoBullet, { color: isDark ? '#93c5fd' : '#1e40af' }]}>•</Text>
                    <Text style={[s.infoText, { color: isDark ? '#93c5fd' : '#1e40af' }]}><Text style={{ fontWeight: '700' }}>Schedule:</Text> Payouts are processed every Saturday.</Text>
                  </View>
                  <View style={s.infoRow}>
                    <Text style={[s.infoBullet, { color: isDark ? '#93c5fd' : '#1e40af' }]}>•</Text>
                    <Text style={[s.infoText, { color: isDark ? '#93c5fd' : '#1e40af' }]}><Text style={{ fontWeight: '700' }}>Limit:</Text> You can only make one redemption request per week.</Text>
                  </View>
                </View>
                <TouchableOpacity style={[s.redeemOption, { backgroundColor: isDark ? '#1e293b' : '#f9fafb' }]} onPress={() => { setRedeemType('AIRTIME'); setMessage(''); setShowRedeemModal(true); }}>
                  <View style={[s.redeemIcon, { backgroundColor: isDark ? 'rgba(22,163,74,0.15)' : '#f0fdf4' }]}>
                    <Ionicons name="phone-portrait-outline" size={22} color="#16a34a" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[s.redeemLabel, { color: colors.textPrimary }]}>Redeem for Airtime</Text>
                    <Text style={[s.redeemSub, { color: colors.textSecondary }]}>Instant top-up for your phone</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
                </TouchableOpacity>
                <TouchableOpacity style={[s.redeemOption, { backgroundColor: isDark ? '#1e293b' : '#f9fafb' }]} onPress={() => { setRedeemType('CASH'); setMessage(''); setShowRedeemModal(true); }}>
                  <View style={[s.redeemIcon, { backgroundColor: isDark ? 'rgba(99,102,241,0.15)' : '#eef2ff' }]}>
                    <Ionicons name="wallet-outline" size={22} color="#6366f1" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[s.redeemLabel, { color: colors.textPrimary }]}>Redeem for Cash</Text>
                    <Text style={[s.redeemSub, { color: colors.textSecondary }]}>Direct bank transfer to your account</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
                </TouchableOpacity>
              </>
            )}
          </View>
        )}

        {/* History Tab */}
        {activeTab === 'history' && (
          <View style={s.actionsSection}>
            {payouts.length === 0 ? (
              <View style={[s.emptyCard, { backgroundColor: isDark ? '#1e293b' : '#f9fafb' }]}>
                <Ionicons name="receipt-outline" size={32} color={colors.textSecondary} />
                <Text style={{ color: colors.textSecondary, fontSize: 13, marginTop: 8 }}>No payout history yet.</Text>
              </View>
            ) : (
              payouts.map((p, i) => (
                <View key={p.id || i} style={[s.payoutRow, { backgroundColor: isDark ? '#1e293b' : '#f9fafb' }]}>
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Text style={[s.payoutType, { color: colors.textPrimary }]}>
                        {p.type === 'CASH' ? 'Bank Transfer' : `Airtime (${p.payout_details?.network || ''})`}
                      </Text>
                      <View style={[s.payoutBadge, {
                        backgroundColor: p.status === 'COMPLETED' ? '#dcfce7' : p.status === 'REJECTED' ? '#fef2f2' : '#fefce8'
                      }]}>
                        <Text style={[s.payoutBadgeText, {
                          color: p.status === 'COMPLETED' ? '#16a34a' : p.status === 'REJECTED' ? '#dc2626' : '#ca8a04'
                        }]}>{p.status}</Text>
                      </View>
                    </View>
                    <Text style={[s.payoutDetail, { color: colors.textSecondary }]} numberOfLines={1}>
                      {p.type === 'CASH' ? `${p.payout_details?.bank || ''} • ${p.payout_details?.account_no || ''}` : p.payout_details?.phone || ''}
                    </Text>
                    <Text style={[s.payoutDate, { color: colors.textSecondary }]}>
                      {p.created_at ? new Date(p.created_at).toLocaleDateString() : ''}
                    </Text>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={[s.payoutValue, { color: colors.textPrimary }]}>₦{Number(p.naira_value || 0).toLocaleString()}</Text>
                    <Text style={[s.payoutCoins, { color: colors.textSecondary }]}>{(p.coin_amount || 0).toLocaleString()} coins</Text>
                  </View>
                </View>
              ))
            )}
          </View>
        )}

        {/* Info Card */}
        <View style={[s.infoCard, { backgroundColor: isDark ? '#1e293b' : '#f9fafb' }]}>
          <View style={[s.infoCardIcon, { backgroundColor: isDark ? 'rgba(37,99,235,0.15)' : '#eff6ff' }]}>
            <Ionicons name="information-circle-outline" size={20} color="#2563eb" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[s.infoCardTitle, { color: colors.textPrimary }]}>What are Mobcoins?</Text>
            <Text style={[s.infoCardDesc, { color: colors.textSecondary }]}>
              Mobcoins are reward points earned by being active on Textmob. You can redeem them for real money or airtime once you reach the 2,000 coin threshold.
            </Text>
          </View>
        </View>
      </ScrollView>

      {/* Send Modal */}
      <Modal visible={showSendModal} animationType="slide" onRequestClose={() => setShowSendModal(false)} transparent>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
          <TouchableOpacity style={s.modalOverlay} activeOpacity={1} onPress={() => setShowSendModal(false)} />
          <View style={[s.bottomSheet, { backgroundColor: colors.card }]}>
            <View style={s.sheetHandle} />
            <ScrollView>
              <Text style={[s.sheetTitle, { color: colors.textPrimary }]}>Send Mobcoins</Text>
              <View style={[s.balanceHint, { backgroundColor: isDark ? '#1e293b' : '#f9fafb' }]}>
                <Text style={[s.balanceHintText, { color: colors.textSecondary }]}>
                  Available balance: <Text style={{ fontWeight: '700', color: colors.textPrimary }}>{balance.toLocaleString()} Mobcoins</Text>
                </Text>
              </View>
              <Text style={[s.fieldLabel, { color: colors.textSecondary }]}>Recipient</Text>
              <View style={[s.searchRow, { backgroundColor: isDark ? '#1e293b' : '#f9fafb' }]}>
                <Ionicons name="search-outline" size={16} color={colors.textSecondary} />
                <TextInput
                  style={[s.searchInput, { color: colors.textPrimary }]}
                  placeholder="Search by name or username..."
                  placeholderTextColor={colors.textSecondary}
                  value={searchQ}
                  onChangeText={searchUsers}
                />
              </View>
              {searchResults.length > 0 && (
                <View style={[s.searchResultsWrap, { borderColor: colors.border }]}>
                  {searchResults.slice(0, 5).map(u => (
                    <TouchableOpacity
                      key={u.username}
                      style={[s.searchResultItem, { borderBottomColor: colors.border }]}
                      onPress={() => { toggleUser(u); setSearchQ(''); setSearchResults([]); }}
                    >
                      <View style={[s.avatarSmall, { backgroundColor: colors.primary }]}>
                        <Text style={s.avatarSmallText}>{(u.fullname || u.username || '?')[0].toUpperCase()}</Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={[s.searchUserName, { color: colors.textPrimary }]}>{u.fullname || u.username}</Text>
                        <Text style={[s.searchUserHandle, { color: colors.textSecondary }]}>@{u.username}</Text>
                      </View>
                      {selectedUsers.some(s => s.username === u.username) && (
                        <Text style={{ fontSize: 10, fontWeight: '700', color: colors.primary }}>Added</Text>
                      )}
                    </TouchableOpacity>
                  ))}
                </View>
              )}
              {selectedUsers.length > 0 && (
                <View style={s.selectedWrap}>
                  {selectedUsers.map(u => (
                    <View key={u.username} style={[s.selectedChip, { backgroundColor: colors.primary }]}>
                      <Text style={s.selectedChipText}>{u.fullname || u.username}</Text>
                      <TouchableOpacity onPress={() => toggleUser(u)}>
                        <Ionicons name="close-circle" size={16} color="#fff" />
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              )}
              <Text style={[s.fieldLabel, { color: colors.textSecondary }]}>Amount</Text>
              <View style={[s.amountRow, { backgroundColor: isDark ? '#1e293b' : '#f9fafb' }]}>
                <Ionicons name="cash-outline" size={16} color="#d97706" />
                <TextInput
                  style={[s.amountInput, { color: colors.textPrimary }]}
                  placeholder="0"
                  placeholderTextColor={colors.textSecondary}
                  value={amount}
                  onChangeText={setAmount}
                  keyboardType="decimal-pad"
                />
              </View>
              {message ? (
                <Text style={[s.messageText, { color: message.includes('success') ? '#16a34a' : '#ef4444' }]}>{message}</Text>
              ) : null}
              <TouchableOpacity style={[s.primaryBtn, sending && { opacity: 0.5 }]} onPress={handleSend} disabled={sending}>
                {sending ? <ActivityIndicator color="#fff" size="small" /> : <Text style={s.primaryBtnText}>Send Mobcoins</Text>}
              </TouchableOpacity>
              <TouchableOpacity style={s.cancelSheetBtn} onPress={() => { setShowSendModal(false); setMessage(''); }}>
                <Text style={[s.cancelSheetText, { color: colors.textSecondary }]}>Cancel</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Redeem Modal */}
      <Modal visible={showRedeemModal} animationType="slide" onRequestClose={() => setShowRedeemModal(false)} transparent>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
          <TouchableOpacity style={s.modalOverlay} activeOpacity={1} onPress={() => setShowRedeemModal(false)} />
          <View style={[s.bottomSheet, { backgroundColor: colors.card }]}>
            <View style={s.sheetHandle} />
            <ScrollView>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                <Text style={[s.sheetTitle, { color: colors.textPrimary, marginBottom: 0 }]}>
                  Redeem for {redeemType === 'CASH' ? 'Cash' : 'Airtime'}
                </Text>
                <TouchableOpacity onPress={() => setShowRedeemModal(false)}>
                  <Ionicons name="close" size={22} color={colors.textSecondary} />
                </TouchableOpacity>
              </View>
              <View style={[s.estValueBox, { backgroundColor: isDark ? 'rgba(37,99,235,0.1)' : '#eff6ff' }]}>
                <Text style={[s.estLabel, { color: colors.primary }]}>ESTIMATED VALUE</Text>
                <Text style={[s.estAmount, { color: colors.primary }]}>₦{Number(Number(redeemAmount || 0) * 0.1).toLocaleString()}</Text>
                <Text style={[s.estMin, { color: colors.primary }]}>Min. 2,000 Mobcoins (₦200)</Text>
              </View>
              <Text style={[s.fieldLabel, { color: colors.textSecondary }]}>Amount to Redeem</Text>
              <TextInput style={[s.input, { backgroundColor: isDark ? '#1e293b' : '#f9fafb', color: colors.textPrimary }]}
                placeholder="Enter amount (min. 2000)" placeholderTextColor={colors.textSecondary}
                value={redeemAmount} onChangeText={setRedeemAmount} keyboardType="decimal-pad"
              />
              {redeemType === 'CASH' ? (
                <>
                  <Text style={[s.fieldLabel, { color: colors.textSecondary }]}>Bank Name</Text>
                  <TextInput style={[s.input, { backgroundColor: isDark ? '#1e293b' : '#f9fafb', color: colors.textPrimary }]}
                    placeholder="e.g. Opay, Kuda, Zenith..." placeholderTextColor={colors.textSecondary}
                    value={payoutDetails.bank} onChangeText={t => setPayoutDetails(p => ({ ...p, bank: t }))}
                  />
                  <Text style={[s.fieldLabel, { color: colors.textSecondary }]}>Account Number</Text>
                  <TextInput style={[s.input, { backgroundColor: isDark ? '#1e293b' : '#f9fafb', color: colors.textPrimary }]}
                    placeholder="10-digit number" placeholderTextColor={colors.textSecondary} keyboardType="number-pad"
                    value={payoutDetails.account_no} onChangeText={t => setPayoutDetails(p => ({ ...p, account_no: t }))}
                  />
                  <Text style={[s.fieldLabel, { color: colors.textSecondary }]}>Account Name</Text>
                  <TextInput style={[s.input, { backgroundColor: isDark ? '#1e293b' : '#f9fafb', color: colors.textPrimary }]}
                    placeholder="Your full name as on bank" placeholderTextColor={colors.textSecondary}
                    value={payoutDetails.name} onChangeText={t => setPayoutDetails(p => ({ ...p, name: t }))}
                  />
                </>
              ) : (
                <>
                  <Text style={[s.fieldLabel, { color: colors.textSecondary }]}>Network</Text>
                  <View style={{ flexDirection: 'row', gap: 6, marginBottom: 10 }}>
                    {['MTN', 'Airtel', 'Glo', '9mobile'].map(net => (
                      <TouchableOpacity key={net} style={[s.netBtn, payoutDetails.network === net.toUpperCase() && { backgroundColor: colors.primary }]}
                        onPress={() => setPayoutDetails(p => ({ ...p, network: net.toUpperCase() }))}
                      >
                        <Text style={[s.netBtnText, { color: payoutDetails.network === net.toUpperCase() ? '#fff' : colors.textSecondary }]}>{net}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                  <Text style={[s.fieldLabel, { color: colors.textSecondary }]}>Phone Number</Text>
                  <TextInput style={[s.input, { backgroundColor: isDark ? '#1e293b' : '#f9fafb', color: colors.textPrimary }]}
                    placeholder="080..." placeholderTextColor={colors.textSecondary} keyboardType="phone-pad"
                    value={payoutDetails.phone} onChangeText={t => setPayoutDetails(p => ({ ...p, phone: t }))}
                  />
                </>
              )}
              {message ? (
                <Text style={[s.messageText, { color: message.includes('fail') || message.includes('Insufficient') || message.includes('wait') ? '#ef4444' : '#16a34a' }]}>{message}</Text>
              ) : null}
              <TouchableOpacity style={[s.primaryBtn, redeeming && { opacity: 0.5 }]} onPress={handleRedeem} disabled={redeeming}>
                {redeeming ? <ActivityIndicator color="#fff" size="small" /> : <Text style={s.primaryBtnText}>Confirm</Text>}
              </TouchableOpacity>
              <TouchableOpacity style={s.cancelSheetBtn} onPress={() => { setShowRedeemModal(false); setMessage(''); }}>
                <Text style={[s.cancelSheetText, { color: colors.textSecondary }]}>Cancel</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Gift Modal */}
      <Modal visible={showGiftModal} animationType="slide" onRequestClose={() => setShowGiftModal(false)} transparent>
        <TouchableOpacity style={s.modalOverlay} activeOpacity={1} onPress={() => setShowGiftModal(false)} />
        <View style={[s.bottomSheet, { backgroundColor: colors.card, alignItems: 'center', paddingVertical: 32 }]}>
          <View style={[s.giftIconWrap, { backgroundColor: isDark ? 'rgba(236,72,153,0.15)' : '#fdf2f8' }]}>
            <Ionicons name="gift-outline" size={32} color="#ec4899" />
          </View>
          <Text style={[s.sheetTitle, { color: colors.textPrimary, textAlign: 'center' }]}>Gifting coming soon</Text>
          <Text style={[s.giftDesc, { color: colors.textSecondary }]}>
            Surprise your friends with gift boxes! This feature is being tuned. For now, please use the Send tab to transfer coins.
          </Text>
          <TouchableOpacity style={[s.primaryBtn, { width: '100%' }]} onPress={() => setShowGiftModal(false)}>
            <Text style={s.primaryBtnText}>Got it</Text>
          </TouchableOpacity>
        </View>
      </Modal>

      {/* Earn Modal */}
      <Modal visible={showEarnModal} animationType="slide" onRequestClose={() => setShowEarnModal(false)} transparent>
        <TouchableOpacity style={s.modalOverlay} activeOpacity={1} onPress={() => setShowEarnModal(false)} />
        <View style={[s.bottomSheet, { backgroundColor: colors.card }]}>
          <View style={s.sheetHandle} />
          <ScrollView contentContainerStyle={{ alignItems: 'center' }}>
            <View style={[s.earnIconBig, { backgroundColor: isDark ? 'rgba(245,158,11,0.15)' : '#fffbeb' }]}>
              <Ionicons name="cash-outline" size={28} color="#d97706" />
            </View>
            <Text style={[s.sheetTitle, { color: colors.textPrimary, textAlign: 'center' }]}>Earning is coming soon</Text>
            <Text style={[s.giftDesc, { color: colors.textSecondary, textAlign: 'center' }]}>
              We're building ways for you to earn Mobcoins, through watch rewards, daily check-ins, referrals, and more. Stay tuned!
            </Text>
            <TouchableOpacity style={[s.primaryBtn, { width: '100%' }]} onPress={() => setShowEarnModal(false)}>
              <Text style={s.primaryBtnText}>Got it</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </Modal>

      {/* Learn Modal */}
      <Modal visible={showLearnModal} animationType="slide" onRequestClose={() => setShowLearnModal(false)} transparent>
        <TouchableOpacity style={s.modalOverlay} activeOpacity={1} onPress={() => setShowLearnModal(false)} />
        <View style={[s.bottomSheet, { backgroundColor: colors.card }]}>
          <View style={s.sheetHandle} />
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <Text style={[s.sheetTitle, { color: colors.textPrimary, marginBottom: 0 }]}>How to earn Mobcoins</Text>
            <TouchableOpacity onPress={() => setShowLearnModal(false)}>
              <Ionicons name="close" size={22} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>
          <ScrollView>
            {[
              { icon: 'create-outline', color: '#2563eb', bg: '#eff6ff', label: 'Post regularly', sub: 'Share posts, thoughts, snaps and events. Active creators earn more.' },
              { icon: 'heart-outline', color: '#ef4444', bg: '#fef2f2', label: 'React & like content', sub: 'Engage with posts from people you follow. Every reaction counts.' },
              { icon: 'chatbubble-outline', color: '#16a34a', bg: '#f0fdf4', label: 'Comment meaningfully', sub: 'Leave thoughtful comments on posts. Quality over quantity.' },
              { icon: 'people-outline', color: '#9333ea', bg: '#faf5ff', label: 'Grow your network', sub: 'Add friends and follow people. A bigger network means more engagement.' },
              { icon: 'time-outline', color: '#d97706', bg: '#fffbeb', label: 'Stay consistent', sub: 'Show up daily. Consistent activity is rewarded over time.' },
            ].map((item, i) => (
              <View key={i} style={[s.learnRow, { backgroundColor: isDark ? '#1e293b' : '#f9fafb' }]}>
                <View style={[s.learnRowIcon, { backgroundColor: isDark ? `${item.color}25` : item.bg }]}>
                  <Ionicons name={item.icon as any} size={18} color={item.color} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[s.learnRowLabel, { color: colors.textPrimary }]}>{item.label}</Text>
                  <Text style={[s.learnRowSub, { color: colors.textSecondary }]}>{item.sub}</Text>
                </View>
              </View>
            ))}
          </ScrollView>
          <TouchableOpacity style={[s.primaryBtn, { marginTop: 12 }]} onPress={() => setShowLearnModal(false)}>
            <Text style={s.primaryBtnText}>Got it</Text>
          </TouchableOpacity>
        </View>
      </Modal>

      {/* Alert Modal */}
      <Modal visible={alertModal.open} transparent animationType="fade" onRequestClose={() => setAlertModal({ open: false, title: '', message: '' })}>
        <TouchableOpacity style={s.alertOverlay} activeOpacity={1} onPress={() => setAlertModal({ open: false, title: '', message: '' })}>
          <View style={[s.alertBox, { backgroundColor: colors.card }]}>
            <Text style={[s.alertTitle, { color: colors.textPrimary }]}>{alertModal.title}</Text>
            <Text style={[s.alertMsg, { color: colors.textSecondary }]}>{alertModal.message}</Text>
            <TouchableOpacity style={[s.alertBtn, { backgroundColor: colors.primary }]}
              onPress={() => setAlertModal({ open: false, title: '', message: '' })}
            >
              <Text style={s.alertBtnText}>OK</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}

const makeStyles = (colors: any, isDark: boolean) => StyleSheet.create({
  safe: { flex: 1 },
  loadingWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  headerWrap: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 12, paddingBottom: 4 },
  headerTitle: { fontSize: 22, fontWeight: '800' },
  headerUser: { fontSize: 12, marginTop: 1 },
  balanceCard: {
    marginHorizontal: 16, marginTop: 12, borderRadius: 20, backgroundColor: '#2563eb', overflow: 'hidden', position: 'relative',
  },
  balanceGridBg: {
    position: 'absolute', inset: 0, opacity: 0.06,
    backgroundColor: 'transparent',
  },
  balanceContent: { padding: 24 },
  balanceRow: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' },
  balanceLabel: { color: 'rgba(255,255,255,0.7)', fontSize: 11, fontWeight: '700', letterSpacing: 1 },
  modeToggle: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.15)' },
  modeToggleText: { color: '#fff', fontSize: 9, fontWeight: '800', letterSpacing: 0.5 },
  balanceAmount: { color: '#fff', fontSize: 42, fontWeight: '900', letterSpacing: -1 },
  balanceGreeting: { color: 'rgba(255,255,255,0.6)', fontSize: 12, marginTop: 6 },
  eyeBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.1)', alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  tabBar: { flexDirection: 'row', marginHorizontal: 16, marginTop: 16, borderRadius: 16, padding: 4, gap: 2 },
  tab: { flex: 1, alignItems: 'center', paddingVertical: 10, borderRadius: 12 },
  tabText: { fontSize: 12, fontWeight: '700' },
  actionsSection: { paddingHorizontal: 16, paddingTop: 16, gap: 12 },
  actionsGrid: { flexDirection: 'row', gap: 10 },
  actionCard: { flex: 1, padding: 16, borderRadius: 16 },
  actionIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  actionLabel: { fontSize: 14, fontWeight: '700' },
  actionDesc: { fontSize: 11, marginTop: 2 },
  learnCard: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16, borderRadius: 16 },
  learnIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  learnTitle: { fontSize: 14, fontWeight: '700' },
  learnDesc: { fontSize: 11, marginTop: 1 },
  emptyCard: { alignItems: 'center', padding: 32, borderRadius: 16, gap: 8 },
  emptyTitle: { fontSize: 15, fontWeight: '700' },
  emptyDesc: { fontSize: 12, textAlign: 'center', lineHeight: 17 },
  infoBox: { padding: 16, borderRadius: 16, borderWidth: 1, gap: 8 },
  infoBoxTitle: { fontSize: 14, fontWeight: '700', marginBottom: 4 },
  infoRow: { flexDirection: 'row', gap: 6, alignItems: 'flex-start' },
  infoBullet: { fontSize: 14, fontWeight: '700', lineHeight: 18 },
  infoText: { fontSize: 12, lineHeight: 18, flex: 1 },
  redeemOption: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 18, borderRadius: 16 },
  redeemIcon: { width: 48, height: 48, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  redeemLabel: { fontSize: 16, fontWeight: '700' },
  redeemSub: { fontSize: 12, marginTop: 2 },
  payoutRow: { padding: 16, borderRadius: 16, marginBottom: 8 },
  payoutType: { fontSize: 13, fontWeight: '700' },
  payoutBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 },
  payoutBadgeText: { fontSize: 10, fontWeight: '700', textTransform: 'uppercase' },
  payoutDetail: { fontSize: 11, marginTop: 4 },
  payoutDate: { fontSize: 10, marginTop: 2 },
  payoutValue: { fontSize: 14, fontWeight: '700' },
  payoutCoins: { fontSize: 10, marginTop: 2 },
  infoCard: { flexDirection: 'row', gap: 12, padding: 16, borderRadius: 16, marginHorizontal: 16, marginTop: 16, alignItems: 'flex-start' },
  infoCardIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  infoCardTitle: { fontSize: 14, fontWeight: '700', marginBottom: 4 },
  infoCardDesc: { fontSize: 12, lineHeight: 17 },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' },
  bottomSheet: { borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 20, paddingBottom: 34, maxHeight: '85%' },
  sheetHandle: { width: 36, height: 4, borderRadius: 2, backgroundColor: '#e2e8f0', alignSelf: 'center', marginBottom: 16 },
  sheetTitle: { fontSize: 17, fontWeight: '700', marginBottom: 16 },
  balanceHint: { padding: 12, borderRadius: 12, marginBottom: 16 },
  balanceHintText: { fontSize: 12 },
  fieldLabel: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 8 },
  searchRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, borderRadius: 12, marginBottom: 8 },
  searchInput: { flex: 1, paddingVertical: 10, fontSize: 13 },
  searchResultsWrap: { borderWidth: 1, borderRadius: 12, marginBottom: 12 },
  searchResultItem: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 10, borderBottomWidth: StyleSheet.hairlineWidth },
  avatarSmall: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  avatarSmallText: { fontSize: 12, fontWeight: '700', color: '#fff' },
  searchUserName: { fontSize: 13, fontWeight: '600' },
  searchUserHandle: { fontSize: 11 },
  selectedWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 12 },
  selectedChip: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 14 },
  selectedChipText: { fontSize: 11, color: '#fff', fontWeight: '600' },
  amountRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, borderRadius: 12, marginBottom: 12 },
  amountInput: { flex: 1, paddingVertical: 10, fontSize: 15 },
  messageText: { fontSize: 12, textAlign: 'center', marginBottom: 12, fontWeight: '600' },
  primaryBtn: { backgroundColor: '#2563eb', borderRadius: 14, paddingVertical: 14, alignItems: 'center' },
  primaryBtnText: { color: '#fff', fontSize: 14, fontWeight: '700' },
  cancelSheetBtn: { alignItems: 'center', paddingVertical: 12, marginTop: 4 },
  cancelSheetText: { fontSize: 13, fontWeight: '600' },
  estValueBox: { borderRadius: 16, padding: 16, alignItems: 'center', marginBottom: 16 },
  estLabel: { fontSize: 10, fontWeight: '700', letterSpacing: 1, marginBottom: 4 },
  estAmount: { fontSize: 32, fontWeight: '900' },
  estMin: { fontSize: 10, marginTop: 4 },
  input: { borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 13, marginBottom: 12 },
  netBtn: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 10, borderWidth: 1, borderColor: colors.border },
  netBtnText: { fontSize: 11, fontWeight: '600' },
  giftIconWrap: { width: 56, height: 56, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  giftDesc: { fontSize: 12, lineHeight: 18, marginBottom: 20, paddingHorizontal: 8 },
  earnIconBig: { width: 56, height: 56, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  learnRow: { flexDirection: 'row', gap: 12, padding: 12, borderRadius: 14, marginBottom: 8 },
  learnRowIcon: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  learnRowLabel: { fontSize: 13, fontWeight: '700' },
  learnRowSub: { fontSize: 11, marginTop: 2, lineHeight: 15 },
  alertOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  alertBox: { width: '100%', maxWidth: 300, borderRadius: 20, padding: 24, alignItems: 'center' },
  alertTitle: { fontSize: 17, fontWeight: '700', marginBottom: 6 },
  alertMsg: { fontSize: 13, textAlign: 'center', marginBottom: 16, lineHeight: 18 },
  alertBtn: { paddingHorizontal: 32, paddingVertical: 10, borderRadius: 20 },
  alertBtnText: { color: '#fff', fontSize: 14, fontWeight: '700' },
});