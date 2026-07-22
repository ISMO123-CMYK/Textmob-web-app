import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ActivityIndicator, ScrollView, KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../context/ThemeContext';
import { forgotPasswordAPI, verifyResetCodeAPI, resetPasswordAPI } from '../../api/auth';
import { isValidPassword, getPasswordStrength } from '../../utils/validators';

type Phase = 'request' | 'verify' | 'reset';

export default function ForgotPasswordScreen({ navigation }: { navigation: any }) {
  const { colors, isDark } = useTheme();

  const [phase, setPhase] = useState<Phase>('request');
  const [identifier, setIdentifier] = useState('');
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [maskedEmail, setMaskedEmail] = useState('');

  const TITLES: Record<Phase, string> = {
    request: 'Find your account',
    verify: 'Enter the code',
    reset: 'Set new password',
  };
  const SUBTITLES: Record<Phase, string> = {
    request: "We'll send a verification code to your email",
    verify: 'Check your email for the 4-digit code',
    reset: 'Choose a strong new password',
  };

  async function requestCode() {
    if (!identifier) { setError('Enter your email, username, or phone'); return; }
    setLoading(true);
    setError('');
    const res = await forgotPasswordAPI(identifier);
    if (res.ok) {
      setMaskedEmail(res.data?.email || 'your email');
      setPhase('verify');
    } else {
      setError(res.error || 'Failed to send code');
    }
    setLoading(false);
  }

  async function verifyCode() {
    if (!code) { setError('Enter the 4-digit code'); return; }
    if (code.length < 4) { setError('Code must be 4 digits'); return; }
    setLoading(true);
    setError('');
    const res = await verifyResetCodeAPI(identifier, code);
    if (res.ok) {
      setPhase('reset');
    } else {
      setError(res.error || 'Invalid or expired code');
    }
    setLoading(false);
  }

  async function resetPw() {
    if (!newPassword || !confirmPassword) { setError('Fill both password fields'); return; }
    if (newPassword !== confirmPassword) { setError("Passwords don't match"); return; }
    const pwCheck = isValidPassword(newPassword);
    if (!pwCheck.valid) { setError(pwCheck.message); return; }
    setLoading(true);
    setError('');
    const res = await resetPasswordAPI(identifier, code, newPassword);
    if (res.ok) {
      navigation.navigate('Login');
    } else {
      setError(res.error || 'Failed to reset password');
    }
    setLoading(false);
  }

  const pwStrength = newPassword ? getPasswordStrength(newPassword) : null;

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
          <View style={s.card}>
            <View style={s.cardAccent} />

            <Text style={s.title}>{TITLES[phase]}</Text>
            <Text style={s.subtitle}>{SUBTITLES[phase]}</Text>

            {error ? <Text style={s.errorText}>{error}</Text> : null}

            {phase === 'request' && (
              <>
                <TextInput
                  style={s.input}
                  placeholder="Email, username, or phone"
                  placeholderTextColor={colors.textSecondary}
                  value={identifier}
                  onChangeText={setIdentifier}
                  autoCapitalize="none"
                />
                <TouchableOpacity
                  style={[s.primaryBtn, loading && s.primaryBtnDisabled]}
                  onPress={requestCode}
                  disabled={loading}
                >
                  {loading ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <Text style={s.primaryBtnText}>Send code</Text>
                  )}
                </TouchableOpacity>
              </>
            )}

            {phase === 'verify' && (
              <>
                <Text style={s.emailHint}>A 4-digit code was sent to {maskedEmail}</Text>
                <TextInput
                  style={s.codeInput}
                  value={code}
                  onChangeText={(v) => setCode(v.replace(/[^0-9]/g, '').slice(0, 4))}
                  placeholder="0000"
                  placeholderTextColor={colors.textSecondary}
                  keyboardType="number-pad"
                  maxLength={4}
                />
                <TouchableOpacity
                  style={[s.primaryBtn, loading && s.primaryBtnDisabled]}
                  onPress={verifyCode}
                  disabled={loading}
                >
                  {loading ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <Text style={s.primaryBtnText}>Verify code</Text>
                  )}
                </TouchableOpacity>
              </>
            )}

            {phase === 'reset' && (
              <>
                <View style={s.inputs}>
                  <TextInput
                    style={s.input}
                    placeholder="New password"
                    placeholderTextColor={colors.textSecondary}
                    value={newPassword}
                    onChangeText={setNewPassword}
                    secureTextEntry
                  />
                  {newPassword && pwStrength && (
                    <View style={s.strengthRow}>
                      <View style={[s.strengthBar, { width: `${(pwStrength.score / 5) * 100}%`, backgroundColor: pwStrength.color }]} />
                      <Text style={[s.strengthLabel, { color: pwStrength.color }]}>{pwStrength.label}</Text>
                    </View>
                  )}
                  <TextInput
                    style={s.input}
                    placeholder="Confirm password"
                    placeholderTextColor={colors.textSecondary}
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    secureTextEntry
                  />
                </View>
                <TouchableOpacity
                  style={[s.primaryBtn, loading && s.primaryBtnDisabled]}
                  onPress={resetPw}
                  disabled={loading}
                >
                  {loading ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <Text style={s.primaryBtnText}>Reset password</Text>
                  )}
                </TouchableOpacity>
              </>
            )}

            <TouchableOpacity onPress={() => navigation.navigate('Login')} style={s.backLink}>
              <Text style={s.backLinkText}>← Back to sign in</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function makeStyles(colors: any, isDark: boolean) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: colors.background },
    scroll: { flexGrow: 1, alignItems: 'center', justifyContent: 'center', padding: 16 },
    card: {
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 16,
      padding: 24,
      width: '100%',
      maxWidth: 360,
    },
    cardAccent: { width: 32, height: 4, backgroundColor: '#2563eb', borderRadius: 2, marginBottom: 20 },
    title: { fontSize: 20, fontWeight: '700', color: colors.textPrimary },
    subtitle: { fontSize: 12, color: colors.textSecondary, marginTop: 2, marginBottom: 16 },
    errorText: { fontSize: 12, color: '#ef4444', marginBottom: 8, textAlign: 'center' },
    input: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 12,
      paddingHorizontal: 16,
      paddingVertical: 14,
      fontSize: 14,
      backgroundColor: isDark ? '#1e293b' : '#f9fafb',
      color: colors.textPrimary,
      marginBottom: 12,
    },
    inputs: { gap: 10, marginBottom: 4 },
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
    emailHint: { fontSize: 12, color: colors.textSecondary, marginBottom: 12, textAlign: 'center' },
    codeInput: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 16,
      padding: 16,
      fontSize: 28,
      fontWeight: '900',
      letterSpacing: 12,
      textAlign: 'center',
      backgroundColor: isDark ? '#1e293b' : '#f9fafb',
      color: colors.textPrimary,
      marginBottom: 12,
    },
    strengthRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
    strengthBar: { height: 3, borderRadius: 1.5, flex: 1 },
    strengthLabel: { fontSize: 10, fontWeight: '600' },
    backLink: { alignItems: 'center', marginTop: 4 },
    backLinkText: { fontSize: 12, color: colors.textSecondary, textAlign: 'center' },
  });
}
