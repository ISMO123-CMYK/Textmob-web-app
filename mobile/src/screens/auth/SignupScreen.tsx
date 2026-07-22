import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ActivityIndicator, ScrollView, KeyboardAvoidingView, Platform,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { isValidEmail, isValidUsername, isValidPhone, isValidPassword, getPasswordStrength } from '../../utils/validators';

interface Step {
  title: string;
  subtitle: string;
  fields: { name: string; label: string; type: string; required: boolean; options?: string[] }[];
}

const STEPS: Step[] = [
  {
    title: 'Your identity',
    subtitle: 'Start with what to call you',
    fields: [
      { name: 'fullName', label: 'Full name', type: 'text', required: true },
      { name: 'username', label: 'Username', type: 'text', required: true },
    ],
  },
  {
    title: 'Stay connected',
    subtitle: 'How should we reach you?',
    fields: [
      { name: 'email', label: 'Email address', type: 'email', required: true },
      { name: 'phone', label: 'Phone number', type: 'phone', required: false },
      { name: 'profile_type', label: 'Profile type', type: 'select', required: true, options: ['Individual', 'Organisation'] },
    ],
  },
  {
    title: 'Lock it down',
    subtitle: 'Choose a strong password',
    fields: [
      { name: 'password', label: 'Password', type: 'password', required: true },
      { name: 'confirmPassword', label: 'Confirm password', type: 'password', required: true },
    ],
  },
];

export default function SignupScreen({ navigation }: { navigation: any }) {
  const { colors, isDark } = useTheme();
  const { signup, isLoading } = useAuth();

  const [step, setStep] = useState(0);
  const [success, setSuccess] = useState(false);
  const [manualUsername, setManualUsername] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState<Record<string, string>>({
    fullName: '', username: '', phone: '', email: '',
    password: '', confirmPassword: '', profile_type: '',
  });

  useEffect(() => {
    if (form.fullName && !manualUsername && step === 0) {
      const auto = form.fullName.toLowerCase().replace(/\s+/g, '').replace(/[^a-z0-9]/g, '').substring(0, 20);
      setForm((prev) => ({ ...prev, username: auto }));
    }
  }, [form.fullName, manualUsername, step]);

  function updateField(name: string, value: string) {
    if (name === 'username') {
      value = value.toLowerCase().replace(/[^a-z0-9]/g, '');
      setManualUsername(true);
    }
    if (name === 'phone') {
      value = value.replace(/[^0-9\s\-\(\)\+]/g, '');
    }
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  function validateStep(): boolean {
    const fields = STEPS[step].fields;
    for (const field of fields) {
      if (field.required && !form[field.name]) {
        setError(`${field.label} is required`);
        return false;
      }
      if (field.name === 'username' && form.username && !isValidUsername(form.username)) {
        setError('Username must be 3-30 characters (letters, numbers, underscores)');
        return false;
      }
      if (field.name === 'email' && form.email && !isValidEmail(form.email)) {
        setError('Please enter a valid email address');
        return false;
      }
      if (field.name === 'phone' && form.phone && !isValidPhone(form.phone)) {
        setError('Please enter a valid phone number');
        return false;
      }
      if (field.name === 'password' && form.password) {
        const pwCheck = isValidPassword(form.password);
        if (!pwCheck.valid) {
          setError(pwCheck.message);
          return false;
        }
      }
    }
    if (step === 2 && form.password !== form.confirmPassword) {
      setError("Passwords don't match");
      return false;
    }
    setError('');
    return true;
  }

  function nextStep() {
    if (validateStep()) {
      if (step < STEPS.length - 1) {
        setStep(step + 1);
      } else {
        submitSignup();
      }
    }
  }

  function prevStep() {
    setError('');
    setStep(Math.max(0, step - 1));
  }

  async function submitSignup() {
    if (!validateStep()) return;

    const body = new FormData();
    Object.entries(form).forEach(([k, v]) => {
      if (v !== null && v !== '') body.append(k, v);
    });

    const result = await signup(body);
    if (result.success) {
      setSuccess(true);
    } else {
      setError(result.error || 'Signup failed');
    }
  }

  async function loginAfterSignup() {
    try {
      const { login } = useAuth();
      await login(form.username, form.password);
    } catch { }
  }

  const currentStep = STEPS[step];
  const pwStrength = form.password ? getPasswordStrength(form.password) : null;

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
            {/* Step indicator */}
            <View style={s.stepIndicator}>
              {STEPS.map((_, i) => (
                <View
                  key={i}
                  style={[
                    s.stepDot,
                    i < step && s.stepDotPast,
                    i === step && s.stepDotActive,
                  ]}
                />
              ))}
              <Text style={s.stepCount}>{step + 1} / {STEPS.length}</Text>
            </View>

            <Text style={s.title}>{currentStep.title}</Text>
            <Text style={s.subtitle}>{currentStep.subtitle}</Text>

            {error ? <Text style={s.errorText}>{error}</Text> : null}

            <View style={s.inputs}>
              {currentStep.fields.map((field) => (
                <View key={field.name}>
                  {field.type === 'select' ? (
                    <View style={s.selectWrapper}>
                      <TextInput
                        style={s.input}
                        value={form[field.name]}
                        placeholder={`Select ${field.label}`}
                        placeholderTextColor={colors.textSecondary}
                        editable={false}
                      />
                      <TouchableOpacity
                        style={s.selectOverlay}
                        onPress={() => {
                          const options = field.options || [];
                          const current = form[field.name];
                          const idx = options.indexOf(current);
                          const next = options[(idx + 1) % options.length];
                          updateField(field.name, next === form[field.name] ? '' : next);
                        }}
                      >
                        <Text style={s.selectValue}>
                          {form[field.name] || 'Tap to select'}
                        </Text>
                      </TouchableOpacity>
                      <Text style={s.selectArrow}>▼</Text>
                    </View>
                  ) : (
                    <TextInput
                      style={s.input}
                      placeholder={field.label}
                      placeholderTextColor={colors.textSecondary}
                      value={form[field.name]}
                      onChangeText={(v) => updateField(field.name, v)}
                      secureTextEntry={field.type === 'password'}
                      autoCapitalize={field.name === 'email' ? 'none' : 'sentences'}
                      autoCorrect={false}
                      keyboardType={field.type === 'email' ? 'email-address' : field.type === 'phone' ? 'phone-pad' : 'default'}
                    />
                  )}
                  {field.name === 'password' && form.password && pwStrength && (
                    <View style={s.strengthRow}>
                      <View style={[s.strengthBar, { width: `${(pwStrength.score / 5) * 100}%`, backgroundColor: pwStrength.color }]} />
                      <Text style={[s.strengthLabel, { color: pwStrength.color }]}>{pwStrength.label}</Text>
                    </View>
                  )}
                </View>
              ))}
            </View>

            {/* Nav buttons */}
            <View style={s.navRow}>
              {step > 0 && (
                <TouchableOpacity style={s.backBtn} onPress={prevStep}>
                  <Text style={s.backBtnText}>Back</Text>
                </TouchableOpacity>
              )}
              {step < STEPS.length - 1 ? (
                <TouchableOpacity
                  style={[s.primaryBtn, { flex: 1 }]}
                  onPress={nextStep}
                >
                  <Text style={s.primaryBtnText}>Continue →</Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  style={[s.primaryBtn, { flex: 1 }, isLoading && s.primaryBtnDisabled]}
                  onPress={submitSignup}
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <Text style={s.primaryBtnText}>Join Textmob</Text>
                  )}
                </TouchableOpacity>
              )}
            </View>

            <TouchableOpacity onPress={() => navigation.navigate('Login')} style={s.switchBtn}>
              <Text style={s.switchBtnText}>
                Already have an account? <Text style={s.switchBtnLink}>Sign in</Text>
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Success Modal */}
      <Modal visible={success} transparent animationType="fade">
        <View style={s.modalOverlay}>
          <View style={s.modalContent}>
            <View style={s.successIcon}>
              <Ionicons name="checkmark" size={32} color="#10b981" />
            </View>
            <Text style={s.successTitle}>You're in!</Text>
            <Text style={s.successSubtitle}>Your Textmob account is ready</Text>

            <View style={s.successDetails}>
              <View>
                <Text style={s.detailLabel}>Full Name</Text>
                <Text style={s.detailValue}>{form.fullName}</Text>
              </View>
              <View>
                <Text style={s.detailLabel}>Username</Text>
                <Text style={s.detailValue}>@{form.username}</Text>
              </View>
            </View>

            <TouchableOpacity
              style={s.primaryBtn}
              onPress={async () => {
                await loginAfterSignup();
              }}
            >
              <Text style={s.primaryBtnText}>Go to Textmob →</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
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
    stepIndicator: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      marginBottom: 16,
    },
    stepDot: {
      height: 6,
      width: 16,
      borderRadius: 3,
      backgroundColor: '#e5e7eb',
    },
    stepDotPast: { width: 24, backgroundColor: '#93c5fd' },
    stepDotActive: { width: 32, backgroundColor: '#2563eb' },
    stepCount: { marginLeft: 'auto', fontSize: 11, color: colors.textSecondary, fontWeight: '500' },
    title: { fontSize: 20, fontWeight: '700', color: colors.textPrimary },
    subtitle: { fontSize: 12, color: colors.textSecondary, marginTop: 2, marginBottom: 16 },
    errorText: { fontSize: 12, color: '#ef4444', marginBottom: 8, textAlign: 'center' },
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
    selectWrapper: { position: 'relative' },
    selectOverlay: {
      position: 'absolute',
      top: 0, left: 0, right: 0, bottom: 0,
      justifyContent: 'center',
      paddingHorizontal: 16,
    },
    selectValue: { fontSize: 14, color: colors.textPrimary },
    selectArrow: {
      position: 'absolute',
      right: 12,
      top: 14,
      fontSize: 10,
      color: colors.textSecondary,
    },
    strengthRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginTop: 4,
    },
    strengthBar: { height: 3, borderRadius: 1.5, flex: 1 },
    strengthLabel: { fontSize: 10, fontWeight: '600' },
    navRow: { flexDirection: 'row', gap: 8, marginTop: 4 },
    primaryBtn: {
      height: 44,
      borderRadius: 22,
      backgroundColor: '#2563eb',
      alignItems: 'center',
      justifyContent: 'center',
    },
    primaryBtnDisabled: { opacity: 0.5 },
    primaryBtnText: { color: '#fff', fontSize: 14, fontWeight: '700' },
    backBtn: {
      height: 44,
      paddingHorizontal: 20,
      borderRadius: 22,
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: 'center',
      justifyContent: 'center',
    },
    backBtnText: { fontSize: 14, fontWeight: '600', color: colors.textSecondary },
    switchBtn: { alignItems: 'center', marginTop: 12 },
    switchBtnText: { fontSize: 12, color: colors.textSecondary },
    switchBtnLink: { fontWeight: '700', color: '#2563eb' },
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.5)',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 16,
    },
    modalContent: {
      backgroundColor: '#fff',
      borderRadius: 16,
      padding: 24,
      width: '100%',
      maxWidth: 340,
      alignItems: 'center',
    },
    successIcon: {
      width: 64,
      height: 64,
      borderRadius: 32,
      backgroundColor: '#f0fdf4',
      borderWidth: 2,
      borderColor: '#bbf7d0',
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 16,
    },

    successTitle: { fontSize: 16, fontWeight: '700', color: '#0f172a', marginBottom: 4 },
    successSubtitle: { fontSize: 12, color: '#64748b', marginBottom: 20 },
    successDetails: {
      width: '100%',
      backgroundColor: '#f9fafb',
      borderWidth: 1,
      borderColor: '#f3f4f6',
      borderRadius: 16,
      padding: 16,
      marginBottom: 20,
      gap: 12,
    },
    detailLabel: {
      fontSize: 9,
      fontWeight: '700',
      color: '#9ca3af',
      textTransform: 'uppercase',
      letterSpacing: 1.2,
    },
    detailValue: { fontSize: 14, fontWeight: '600', color: '#1e293b', marginTop: 2 },
  });
}
