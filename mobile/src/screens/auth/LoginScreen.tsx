import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ActivityIndicator, ScrollView, KeyboardAvoidingView, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { storage, KEYS } from '../../utils/storage';
import { isValidEmail, isValidUsername, isValidPhone } from '../../utils/validators';

interface SavedAccount {
  username: string;
  password: string;
  profile_pic: string;
}

export default function LoginScreen({ navigation }: { navigation: any }) {
  const { colors, isDark } = useTheme();
  const { login, isLoading } = useAuth();

  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [attempts, setAttempts] = useState(0);
  const [error, setError] = useState('');
  const [savedAccounts, setSavedAccounts] = useState<SavedAccount[]>([]);
  const [showSavedAccounts, setShowSavedAccounts] = useState(false);

  useEffect(() => {
    loadSavedAccounts();
  }, []);

  function loadSavedAccounts() {
    storage.getStore(KEYS.SAVED_ACCOUNTS).then((val) => {
      if (val) {
        try {
          const accounts = JSON.parse(val).map((a: SavedAccount) => ({
            ...a,
            username: a.username.toLowerCase(),
          }));
          setSavedAccounts(accounts);
        } catch { }
      }
    });
  }

  async function handleLogin(id: string, pw: string) {
    if (!id || !pw) {
      setError('Please fill in all fields');
      return;
    }
    setError('');

    const result = await login(id, pw);
    if (result.success) {
      if (rememberMe) {
        const current = [...savedAccounts];
        if (!current.some((a) => a.username === id.toLowerCase())) {
          current.push({
            username: id.toLowerCase(),
            password: pw,
            profile_pic: '',
          });
          storage.setStore(KEYS.SAVED_ACCOUNTS, JSON.stringify(current));
        }
      }
    } else {
      const newAttempts = attempts + 1;
      setAttempts(newAttempts);
      if (newAttempts >= 5) {
        setError('Too many attempts. Please reset your password.');
      } else {
        setError(result.error || 'Invalid credentials');
      }
    }
  }

  async function autoLogin(username: string, pw: string) {
    const result = await login(username, pw);
    if (!result.success) {
      setError(result.error || 'Login failed');
    }
  }

  function removeAccount(username: string) {
    const filtered = savedAccounts.filter((a) => a.username !== username);
    setSavedAccounts(filtered);
    storage.setStore(KEYS.SAVED_ACCOUNTS, JSON.stringify(filtered));
  }

  function switchToSignup() {
    navigation.navigate('Signup');
  }

  function switchToForgotPassword() {
    navigation.navigate('ForgotPassword');
  }

  const s = makeStyles(colors, isDark);

  return (
    <SafeAreaView style={s.safe}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={s.scroll}
          keyboardShouldPersistTaps="handled"
        >
          {/* Logo */}
          <View style={s.logoRow}>
            <Text style={s.logoText}>
              t<Text style={s.logoDot}>..</Text>
            </Text>
            <Text style={s.logoLabel}>Textmob</Text>
          </View>

          {/* Card */}
          <View style={s.card}>
            <View style={s.cardAccent} />

            <View style={s.formSection}>
              <Text style={s.title}>Welcome back</Text>
              <Text style={s.subtitle}>Sign in to continue to Textmob</Text>
            </View>

            {/* Saved Accounts */}
            {savedAccounts.length > 0 && !showSavedAccounts && (
              <TouchableOpacity
                style={s.savedAccountsBtn}
                onPress={() => setShowSavedAccounts(true)}
              >
                <Text style={s.savedAccountsBtnText}>
                  Switch account ({savedAccounts.length} saved)
                </Text>
              </TouchableOpacity>
            )}

            {showSavedAccounts && (
              <View style={s.savedAccountsList}>
                {savedAccounts.map((acc) => (
                  <View key={acc.username} style={s.savedAccountRow}>
                    <TouchableOpacity
                      style={s.savedAccountItem}
                      onPress={() => autoLogin(acc.username, acc.password)}
                    >
                      <View style={s.savedAvatar} />
                      <View style={{ flex: 1 }}>
                        <Text style={s.savedName}>{acc.username}</Text>
                        <Text style={s.savedHint}>Tap to sign in</Text>
                      </View>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => removeAccount(acc.username)}
                      style={s.removeBtn}
                    >
                      <Ionicons name="close" size={16} color={colors.textSecondary} />
                    </TouchableOpacity>
                  </View>
                ))}
                <TouchableOpacity
                  onPress={() => setShowSavedAccounts(false)}
                  style={s.hideSavedBtn}
                >
                  <Text style={[s.savedAccountsBtnText, { color: colors.textSecondary }]}>
                    Hide saved accounts
                  </Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Inputs */}
            <View style={s.inputs}>
              <TextInput
                style={s.input}
                placeholder="Email, username, or phone"
                placeholderTextColor={colors.textSecondary}
                value={identifier}
                onChangeText={setIdentifier}
                autoCapitalize="none"
                autoCorrect={false}
              />
              <TextInput
                style={s.input}
                placeholder="Password"
                placeholderTextColor={colors.textSecondary}
                value={password}
                onChangeText={setPassword}
                secureTextEntry
              />
            </View>

            {/* Error */}
            {error ? (
              <Text style={s.errorText}>{error}</Text>
            ) : null}

            {/* Remember me + Forgot */}
            <View style={s.rememberRow}>
              <TouchableOpacity
                style={s.rememberCheck}
                onPress={() => setRememberMe(!rememberMe)}
              >
                <View style={[s.checkbox, rememberMe && s.checkboxActive]}>
                  {rememberMe && (
                    <Ionicons name="checkmark" size={12} color="#fff" />
                  )}
                </View>
                <Text style={s.rememberLabel}>Remember me</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={switchToForgotPassword}>
                <Text style={s.forgotLink}>Forgot password?</Text>
              </TouchableOpacity>
            </View>

            {/* Sign in button */}
            <TouchableOpacity
              style={[s.primaryBtn, isLoading && s.primaryBtnDisabled]}
              onPress={() => handleLogin(identifier, password)}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={s.primaryBtnText}>Sign in</Text>
              )}
            </TouchableOpacity>

            {/* Divider */}
            <View style={s.divider}>
              <View style={s.dividerLine} />
              <Text style={s.dividerText}>or</Text>
              <View style={s.dividerLine} />
            </View>

            {/* Create account */}
            <TouchableOpacity style={s.secondaryBtn} onPress={switchToSignup}>
              <Text style={s.secondaryBtnText}>Create account</Text>
            </TouchableOpacity>
          </View>

          {/* Terms */}
          <Text style={s.terms}>
            By continuing, you agree to our{' '}
            <Text style={s.termsLink}>Terms</Text> and{' '}
            <Text style={s.termsLink}>Privacy Policy</Text>
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function makeStyles(colors: any, isDark: boolean) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: colors.background },
    scroll: {
      flexGrow: 1,
      alignItems: 'center',
      justifyContent: 'center',
      padding: 16,
    },
    logoRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      marginBottom: 24,
    },
    logoText: {
      fontSize: 24,
      fontWeight: '900',
      letterSpacing: -0.8,
      color: '#2563eb',
      lineHeight: 24,
    },
    logoDot: { color: '#60a5fa' },
    logoLabel: { fontSize: 13, fontWeight: '700', color: '#9ca3af' },
    card: {
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 16,
      padding: 24,
      width: '100%',
      maxWidth: 360,
    },
    cardAccent: {
      width: 32,
      height: 4,
      backgroundColor: '#2563eb',
      borderRadius: 2,
      marginBottom: 20,
    },
    formSection: { marginBottom: 16 },
    title: { fontSize: 20, fontWeight: '700', color: colors.textPrimary },
    subtitle: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
    savedAccountsBtn: { marginBottom: 12 },
    savedAccountsBtnText: {
      fontSize: 12,
      color: '#2563eb',
      fontWeight: '600',
      textAlign: 'center',
    },
    savedAccountsList: {
      marginBottom: 12,
      backgroundColor: colors.background,
      borderRadius: 12,
      padding: 8,
    },
    savedAccountRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 6,
    },
    savedAccountItem: { flexDirection: 'row', alignItems: 'center', flex: 1, gap: 8 },
    savedAvatar: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: colors.border,
    },
    savedName: { fontSize: 14, fontWeight: '600', color: colors.textPrimary },
    savedHint: { fontSize: 11, color: colors.textSecondary },
    removeBtn: { padding: 8 },

    hideSavedBtn: { alignItems: 'center', paddingVertical: 4 },
    inputs: { gap: 10, marginBottom: 12 },
    input: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 12,
      paddingHorizontal: 16,
      paddingVertical: 14,
      fontSize: 14,
      backgroundColor: isDark ? '#1e293b' : '#f9fafb',
      color: colors.textPrimary,
    },
    errorText: {
      fontSize: 12,
      color: '#ef4444',
      marginBottom: 8,
      textAlign: 'center',
    },
    rememberRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 16,
    },
    rememberCheck: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    checkbox: {
      width: 16,
      height: 16,
      borderRadius: 4,
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.card,
    },
    checkboxActive: { backgroundColor: '#2563eb', borderColor: '#2563eb' },
    checkmark: { color: '#fff', fontSize: 10, fontWeight: '800' },
    rememberLabel: { fontSize: 12, fontWeight: '500', color: colors.textSecondary },
    forgotLink: { fontSize: 12, fontWeight: '700', color: '#2563eb' },
    primaryBtn: {
      height: 44,
      borderRadius: 22,
      backgroundColor: '#2563eb',
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 12,
    },
    primaryBtnDisabled: { opacity: 0.5 },
    primaryBtnText: { color: '#fff', fontSize: 14, fontWeight: '700' },
    divider: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      marginBottom: 12,
    },
    dividerLine: { flex: 1, height: 1, backgroundColor: colors.border },
    dividerText: { fontSize: 11, color: colors.textSecondary, fontWeight: '500' },
    secondaryBtn: {
      height: 44,
      borderRadius: 22,
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: 'center',
      justifyContent: 'center',
    },
    secondaryBtnText: { fontSize: 14, fontWeight: '700', color: colors.textPrimary },
    terms: {
      fontSize: 11,
      color: colors.textSecondary,
      textAlign: 'center',
      marginTop: 16,
    },
    termsLink: { color: '#3b82f6', fontWeight: '500' },
  });
}
