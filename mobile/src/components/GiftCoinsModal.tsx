import React, { useState, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, Modal,
  TextInput, ActivityIndicator, Image, ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { apiPost } from '../api/client';

const COIN_PACKS = [5, 10, 25, 50, 100, 200, 500, 1000];

interface GiftCoinsModalProps {
  visible: boolean;
  onClose: () => void;
  recipientUsername: string;
  recipientAvatar?: string;
  recipientFullname?: string;
  postId?: string | number;
}

export default function GiftCoinsModal({
  visible, onClose, recipientUsername, recipientAvatar, recipientFullname, postId,
}: GiftCoinsModalProps) {
  const { colors, isDark } = useTheme();
  const { username } = useAuth();
  const [amount, setAmount] = useState('');
  const [sending, setSending] = useState(false);
  const [status, setStatus] = useState<{ error?: string; success?: string } | null>(null);
  const [balance, setBalance] = useState<number | null>(null);

  useEffect(() => {
    if (visible) {
      setAmount('');
      setStatus(null);
      setSending(false);
      fetchBalance();
    }
  }, [visible]);

  async function fetchBalance() {
    if (!username) return;
    try {
      const res = await apiPost('/t/wallet', { userId: username });
      if (res.ok && res.data) {
        setBalance(res.data.mobcoins ?? 0);
      }
    } catch {}
  }

  function handlePackClick(value: number) {
    setAmount(String(value));
    setStatus(null);
  }

  async function handleSend() {
    setStatus(null);
    const numAmount = parseInt(amount, 10);
    if (!recipientUsername) return setStatus({ error: 'Invalid recipient.' });
    if (!numAmount || numAmount <= 0) return setStatus({ error: 'Enter a valid amount.' });
    if (!username) return setStatus({ error: 'Sign in to send.' });
    if (username === recipientUsername) return setStatus({ error: 'Cannot send to yourself.' });
    if (balance !== null && numAmount > balance) return setStatus({ error: 'Insufficient Mobcoins.' });
    setSending(true);
    try {
      const res = await apiPost('/t/send-mobcoins', {
        fromId: username,
        toIds: [recipientUsername],
        amount: numAmount,
        postId: postId || null,
      });
      if (!res.ok) return setStatus({ error: res.error || 'Failed to send.' });
      setStatus({ success: 'Sent successfully!' });
      setBalance(prev => (prev !== null ? prev - numAmount : null));
      setTimeout(() => onClose(), 1500);
    } catch {
      setStatus({ error: 'Network error.' });
    } finally {
      setSending(false);
    }
  }

  const s = makeStyles(colors, isDark);
  const initials = (recipientFullname || recipientUsername || '?').slice(0, 2).toUpperCase();

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableOpacity style={s.overlay} activeOpacity={1} onPress={onClose}>
        <View style={[s.sheet, { backgroundColor: colors.card }]}>
          <View style={s.handle} />
          {/* Header */}
          <View style={[s.section, s.headerSection, { borderBottomColor: colors.border }]}>
            <Text style={[s.modalTitle, { color: colors.textPrimary }]}>Gift Mobcoins</Text>
            <TouchableOpacity onPress={onClose} style={s.closeBtn}>
              <Ionicons name="close" size={18} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>
          {/* Recipient */}
          <View style={[s.section, s.recipientRow, { backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)' }]}>
            <View style={s.avatarWrap}>
              {recipientAvatar ? (
                <Image source={{ uri: recipientAvatar }} style={s.avatar} />
              ) : (
                <View style={[s.avatarFallback, { backgroundColor: colors.primary }]}>
                  <Text style={s.avatarInitials}>{initials}</Text>
                </View>
              )}
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[s.recipientName, { color: colors.textPrimary }]}>{recipientFullname || recipientUsername}</Text>
              <Text style={[s.recipientUser, { color: colors.textSecondary }]}>@{recipientUsername}</Text>
            </View>
            {balance !== null && (
              <View style={[s.balanceBadge, { backgroundColor: isDark ? 'rgba(251,191,36,0.15)' : '#fffbeb', borderColor: isDark ? 'rgba(251,191,36,0.3)' : '#fef3c7' }]}>
                <Ionicons name="wallet-outline" size={12} color="#d97706" />
                <Text style={s.balanceText}>{balance}</Text>
              </View>
            )}
          </View>
          {/* Quick Send */}
          <View style={s.section}>
            <Text style={[s.sectionLabel, { color: colors.textSecondary }]}>Quick Send</Text>
            <View style={s.packGrid}>
              {COIN_PACKS.map(v => (
                <TouchableOpacity
                  key={v}
                  style={[s.packBtn, amount === String(v) && s.packBtnActive, { borderColor: colors.border }]}
                  onPress={() => handlePackClick(v)}
                >
                  <Text style={[s.packText, amount === String(v) && s.packTextActive]}>{v}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
          {/* Custom Amount */}
          <View style={s.section}>
            <Text style={[s.sectionLabel, { color: colors.textSecondary }]}>Custom Amount</Text>
            <View style={[s.customInputRow, { borderColor: colors.border }]}>
              <Ionicons name="wallet-outline" size={16} color="#d97706" />
              <TextInput
                style={[s.customInput, { color: colors.textPrimary }]}
                value={amount}
                onChangeText={t => { setAmount(t); setStatus(null); }}
                placeholder="Enter amount"
                placeholderTextColor={colors.textSecondary}
                keyboardType="number-pad"
              />
              <Text style={[s.coinLabel, { color: colors.textSecondary }]}>Mobcoins</Text>
            </View>
          </View>
          {/* Status */}
          {status?.error && (
            <View style={[s.statusBox, { backgroundColor: isDark ? 'rgba(239,68,68,0.1)' : '#fef2f2', borderColor: isDark ? 'rgba(239,68,68,0.3)' : '#fecaca' }]}>
              <Text style={s.statusError}>{status.error}</Text>
            </View>
          )}
          {status?.success && (
            <View style={[s.statusBox, { backgroundColor: isDark ? 'rgba(16,185,129,0.1)' : '#f0fdf4', borderColor: isDark ? 'rgba(16,185,129,0.3)' : '#bbf7d0' }]}>
              <Text style={s.statusSuccess}>{status.success}</Text>
            </View>
          )}
          {/* Actions */}
          <View style={[s.actionRow, { borderTopColor: colors.border }]}>
            <TouchableOpacity style={[s.actionBtn, s.cancelBtn, { borderColor: colors.border }]} onPress={onClose}>
              <Text style={[s.cancelText, { color: colors.textSecondary }]}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[s.actionBtn, s.sendBtn, (sending || !!status?.success) && { opacity: 0.4 }]}
              onPress={handleSend}
              disabled={sending || !!status?.success}
            >
              {sending ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={s.sendText}>{status?.success ? 'Sent!' : 'Send Gift'}</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </TouchableOpacity>
    </Modal>
  );
}

const makeStyles = (colors: any, isDark: boolean) => StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.4)' },
  sheet: { borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingBottom: 40, maxHeight: '90%' },
  handle: { width: 36, height: 4, borderRadius: 2, backgroundColor: '#d1d5db', alignSelf: 'center', marginTop: 10, marginBottom: 8 },
  section: { paddingHorizontal: 20 },
  headerSection: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth },
  modalTitle: { fontSize: 16, fontWeight: '800' },
  closeBtn: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  recipientRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
  avatarWrap: { width: 40, height: 40, borderRadius: 20, overflow: 'hidden' },
  avatar: { width: 40, height: 40, borderRadius: 20 },
  avatarFallback: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  avatarInitials: { color: '#fff', fontSize: 12, fontWeight: '700' },
  recipientName: { fontSize: 13, fontWeight: '700' },
  recipientUser: { fontSize: 11, marginTop: 1 },
  balanceBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 16, borderWidth: 1 },
  balanceText: { fontSize: 11, fontWeight: '700', color: '#d97706' },
  sectionLabel: { fontSize: 10, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10, marginTop: 14 },
  packGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  packBtn: { paddingVertical: 10, paddingHorizontal: 16, borderRadius: 12, borderWidth: 1, minWidth: 60, alignItems: 'center' },
  packBtnActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  packText: { fontSize: 13, fontWeight: '700', color: colors.textSecondary },
  packTextActive: { color: '#fff' },
  customInputRow: { flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10 },
  customInput: { flex: 1, fontSize: 14, fontWeight: '700' },
  coinLabel: { fontSize: 11, fontWeight: '600' },
  statusBox: { marginHorizontal: 20, marginTop: 10, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, borderWidth: 1 },
  statusError: { fontSize: 12, fontWeight: '600', color: '#dc2626' },
  statusSuccess: { fontSize: 12, fontWeight: '600', color: '#16a34a' },
  actionRow: { flexDirection: 'row', gap: 10, paddingHorizontal: 20, paddingTop: 14, marginTop: 10, borderTopWidth: StyleSheet.hairlineWidth },
  actionBtn: { flex: 1, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  cancelBtn: { borderWidth: 1 },
  cancelText: { fontSize: 13, fontWeight: '700' },
  sendBtn: { backgroundColor: colors.primary },
  sendText: { fontSize: 13, fontWeight: '700', color: '#fff' },
});
