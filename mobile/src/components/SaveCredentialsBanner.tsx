import React, { useState, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useIsFocused } from '@react-navigation/native';
import { useTheme } from '../context/ThemeContext';
import { storage, KEYS } from '../utils/storage';

interface PendingCredentials {
  username: string;
  password: string;
  profile_pic: string;
}

interface SaveCredentialsBannerProps {
  onDismiss?: () => void;
}

export default function SaveCredentialsBanner({ onDismiss }: SaveCredentialsBannerProps) {
  const { colors } = useTheme();
  const isFocused = useIsFocused();
  const [pending, setPending] = useState<PendingCredentials | null>(null);
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    if (!isFocused) return;
    (async () => {
      const dismissed = await storage.getStore(KEYS.CREDENTIALS_BANNER_DISMISSED);
      if (dismissed === 'true') { setPending(null); return; }
      const val = await storage.getStore(KEYS.PENDING_CREDENTIALS);
      if (val) {
        try { setPending(JSON.parse(val)); } catch (e) { /* ignore */ }
      } else {
        setPending(null);
      }
    })();
  }, [isFocused]);

  async function loadSavedAccounts(): Promise<any[]> {
    try {
      const raw = JSON.parse((await storage.getStore(KEYS.SAVED_ACCOUNTS)) || '[]');
      return Array.isArray(raw) ? raw : [];
    } catch {
      return [];
    }
  }

  async function handleSave() {
    if (!pending) return;
    const current = await loadSavedAccounts();
    const idx = current.findIndex((a) => (a?.username || '').toLowerCase() === pending.username.toLowerCase());
    if (idx === -1) {
      current.push(pending);
    } else {
      current[idx] = { ...current[idx], ...pending };
    }
    await storage.setStore(KEYS.SAVED_ACCOUNTS, JSON.stringify(current));
    await storage.removeStore(KEYS.PENDING_CREDENTIALS);
    await storage.setStore(KEYS.CREDENTIALS_BANNER_DISMISSED, 'true');
    setPending(null);
    setHidden(true);
    if (onDismiss) onDismiss();
  }

  async function handleNoThanks() {
    await storage.setStore(KEYS.CREDENTIALS_BANNER_DISMISSED, 'true');
    await storage.removeStore(KEYS.PENDING_CREDENTIALS);
    setPending(null);
    setHidden(true);
    if (onDismiss) onDismiss();
  }

  if (hidden || !pending) return null;

  return (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={styles.iconCircle}>
        <Ionicons name="key" size={16} color="#fff" />
      </View>
      <View style={styles.content}>
        <Text style={[styles.title, { color: colors.textPrimary }]}>
          Save your login details?
        </Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          Get one-tap access next time you sign in.
        </Text>
        <View style={styles.actions}>
          <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
            <Text style={styles.saveBtnText}>Save</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.noBtn} onPress={handleNoThanks}>
            <Text style={[styles.noBtnText, { color: colors.textSecondary }]}>No thanks</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 14,
    padding: 12,
    marginHorizontal: 12,
    marginTop: 8,
    gap: 12,
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#2563eb',
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: { flex: 1 },
  title: { fontSize: 14, fontWeight: '700' },
  subtitle: { fontSize: 11, marginTop: 2 },
  actions: { flexDirection: 'row', gap: 10, marginTop: 10 },
  saveBtn: {
    backgroundColor: '#2563eb',
    borderRadius: 20,
    paddingHorizontal: 18,
    paddingVertical: 7,
  },
  saveBtnText: { color: '#fff', fontSize: 13, fontWeight: '700' },
  noBtn: {
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  noBtnText: { fontSize: 13, fontWeight: '600' },
});
