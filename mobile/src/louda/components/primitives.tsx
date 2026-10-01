import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Pressable,
  Modal as RNModal,
  ScrollView,
  StyleSheet,
  KeyboardTypeOptions,
  useWindowDimensions,
} from 'react-native';
import Svg, { Circle, G } from 'react-native-svg';
import { useTheme } from '../../context/ThemeContext';
import { loudaPalette } from '../theme';
import { Icons } from '../icons';
import type { StatusItem } from '../types';

export function useLoudaTheme() {
  const { isDark } = useTheme();
  return { isDark, p: loudaPalette(isDark) };
}

// ─── Button (LoudaApp.jsx:639) ───
type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'accent';

export function Button({
  children,
  variant = 'primary',
  disabled = false,
  onPress,
  style,
}: {
  children: React.ReactNode;
  variant?: ButtonVariant;
  disabled?: boolean;
  onPress?: () => void;
  style?: any;
}) {
  const { p } = useLoudaTheme();
  const bg =
    variant === 'primary'
      ? p.accent
      : variant === 'danger'
        ? p.danger
        : variant === 'accent'
          ? '#FFB300'
          : p.cardMuted;
  const color =
    variant === 'primary' || variant === 'danger'
      ? '#ffffff'
      : variant === 'accent'
        ? '#5D4037'
        : p.text;
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.85}
      style={[
        s.btnBase,
        { backgroundColor: bg, opacity: disabled ? 0.5 : 1 },
        style,
      ]}
    >
      <Text style={[s.btnText, { color }]}>{children}</Text>
    </TouchableOpacity>
  );
}

// ─── Input (LoudaApp.jsx:654) ───
export function Input({
  label,
  value,
  onChangeText,
  onChange,
  placeholder,
  keyboardType = 'default',
  secureTextEntry,
  editable = true,
  error = '',
  style,
  autoCapitalize,
}: {
  label?: string;
  value: string;
  onChangeText?: (v: string) => void;
  onChange?: (e: { target: { value: string } }) => void;
  placeholder?: string;
  keyboardType?: KeyboardTypeOptions | 'default';
  secureTextEntry?: boolean;
  editable?: boolean;
  error?: string;
  style?: any;
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
}) {
  const { p } = useLoudaTheme();
  const [focused, setFocused] = useState(false);
  const handle = useCallback(
    (v: string) => {
      onChangeText?.(v);
      onChange?.({ target: { value: v } });
    },
    [onChangeText, onChange],
  );
  return (
    <View style={[s.mb3, style]}>
      {!!label && <Text style={s.inputLabel}>{label}</Text>}
      <TextInput
        value={value}
        onChangeText={handle}
        placeholder={placeholder}
        placeholderTextColor={p.textMuted}
        keyboardType={keyboardType}
        secureTextEntry={secureTextEntry}
        editable={editable}
        autoCapitalize={autoCapitalize}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        style={[
          s.input,
          {
            backgroundColor: p.cardMuted,
            borderColor: error ? p.danger : focused ? p.accent : p.border,
            color: p.text,
          },
        ]}
      />
      {!!error && <Text style={[s.errorText, { color: p.danger }]}>{error}</Text>}
    </View>
  );
}

// ─── Phone Input (LoudaApp.jsx:670-755) ───
export const COUNTRY_CODES = [
  { code: '+234', flag: '🇳🇬', name: 'Nigeria' },
  { code: '+1', flag: '🇺🇸', name: 'USA' },
  { code: '+44', flag: '🇬🇧', name: 'UK' },
  { code: '+233', flag: '🇬🇭', name: 'Ghana' },
  { code: '+254', flag: '🇰🇪', name: 'Kenya' },
  { code: '+27', flag: '🇿🇦', name: 'South Africa' },
  { code: '+91', flag: '🇮🇳', name: 'India' },
  { code: '+971', flag: '🇦🇪', name: 'UAE' },
  { code: '+49', flag: '🇩🇪', name: 'Germany' },
  { code: '+33', flag: '🇫🇷', name: 'France' },
  { code: '+86', flag: '🇨🇳', name: 'China' },
  { code: '+81', flag: '🇯🇵', name: 'Japan' },
  { code: '+55', flag: '🇧🇷', name: 'Brazil' },
  { code: '+20', flag: '🇪🇬', name: 'Egypt' },
  { code: '+212', flag: '🇲🇦', name: 'Morocco' },
  { code: '+251', flag: '🇪🇹', name: 'Ethiopia' },
  { code: '+255', flag: '🇹🇿', name: 'Tanzania' },
  { code: '+256', flag: '🇺🇬', name: 'Uganda' },
  { code: '+237', flag: '🇨🇲', name: 'Cameroon' },
];

export function PhoneInput({
  value,
  onChange,
  label,
  error = '',
}: {
  value?: string;
  onChange: (v: string) => void;
  label?: string;
  error?: string;
}) {
  const { p } = useLoudaTheme();
  const [countryCode, setCountryCode] = useState('+234');
  const [number, setNumber] = useState('');
  const [pickerOpen, setPickerOpen] = useState(false);

  useEffect(() => {
    if (value) {
      const match = COUNTRY_CODES.find(c => value.startsWith(c.code));
      if (match) {
        setCountryCode(match.code);
        const nextNum = value.slice(match.code.length).replace(/[^0-9]/g, '');
        if (nextNum !== number) setNumber(nextNum);
      } else {
        const clean = value.replace(/[^0-9]/g, '');
        const finalNumber = clean.startsWith('0') ? clean.slice(1) : clean;
        if (finalNumber !== number) setNumber(finalNumber);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  const handleNumberChange = (raw: string) => {
    let num = raw.replace(/[^0-9]/g, '');
    if (num.startsWith('0')) num = num.slice(1);
    setNumber(num);
    onChange(countryCode + num);
  };

  const handleCodeChange = (code: string) => {
    setCountryCode(code);
    onChange(code + number);
    setPickerOpen(false);
  };

  const current = COUNTRY_CODES.find(c => c.code === countryCode);

  return (
    <View style={[s.mb3, { width: '100%' }]}>
      {!!label && <Text style={s.inputLabel}>{label}</Text>}
      <View style={s.phoneRow}>
        <TouchableOpacity
          onPress={() => setPickerOpen(true)}
          style={[s.phoneCode, { backgroundColor: p.cardMuted, borderColor: p.border }]}
        >
          <Text style={[s.phoneCodeText, { color: p.textSecondary }]}>
            {current ? `${current.flag} ${current.code}` : countryCode}
          </Text>
        </TouchableOpacity>
        <TextInput
          value={number}
          onChangeText={handleNumberChange}
          keyboardType="phone-pad"
          maxLength={15}
          placeholder="Phone number"
          placeholderTextColor={p.textMuted}
          style={[
            s.phoneInput,
            { backgroundColor: p.cardMuted, borderColor: p.border, color: p.text },
          ]}
        />
      </View>
      {!!error && <Text style={[s.errorText, { color: p.danger }]}>{error}</Text>}
      <RNModal visible={pickerOpen} transparent animationType="fade" onRequestClose={() => setPickerOpen(false)}>
        <Pressable style={[s.pickerOverlay, { backgroundColor: p.overlay }]} onPress={() => setPickerOpen(false)}>
          <View style={[s.pickerSheet, { backgroundColor: p.card }]}>
            <ScrollView style={{ maxHeight: 420 }}>
              {COUNTRY_CODES.map(c => (
                <TouchableOpacity
                  key={c.code}
                  onPress={() => handleCodeChange(c.code)}
                  style={[s.pickerRow, { backgroundColor: c.code === countryCode ? p.accentTint : 'transparent' }]}
                >
                  <Text style={{ fontSize: 18 }}>{c.flag}</Text>
                  <Text style={[s.pickerRowText, { color: p.text }]}>
                    {c.name} {c.code}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </Pressable>
      </RNModal>
    </View>
  );
}

// ─── Modal (LoudaApp.jsx:757) ───
export function LoudaModal({
  isOpen,
  onClose,
  title,
  children,
  footer,
  style,
}: {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  style?: any;
}) {
  const { p } = useLoudaTheme();
  if (!isOpen) return null;
  return (
    <RNModal visible transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <View style={[s.modalOverlay, { backgroundColor: p.overlay }]}>
        <Pressable style={{ flex: 1 }} onPress={onClose} />
        <View style={[s.modalSheet, { backgroundColor: p.card, borderColor: p.borderLight }, style]}>
          <View style={[s.modalHeader, { borderBottomColor: p.borderLight }]}>
            <Text style={[s.modalTitle, { color: p.accent }]} numberOfLines={1}>
              {title}
            </Text>
            <TouchableOpacity
              onPress={onClose}
              style={[s.modalClose, { backgroundColor: p.cardMuted }]}
              hitSlop={8}
            >
              <Icons.x size={16} color={p.textMuted} />
            </TouchableOpacity>
          </View>
          <ScrollView style={s.modalBody} contentContainerStyle={{ paddingBottom: 24 }}>
            {children}
          </ScrollView>
          {!!footer && (
            <View style={[s.modalFooter, { borderTopColor: p.borderLight }]}>{footer}</View>
          )}
        </View>
      </View>
    </RNModal>
  );
}

// ─── Toggle (LoudaApp.jsx:775) ───
export function Toggle({
  label,
  checked,
  onChange,
  disabled = false,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
}) {
  const { p } = useLoudaTheme();
  return (
    <TouchableOpacity
      activeOpacity={0.8}
      disabled={disabled}
      onPress={() => onChange(!checked)}
      style={[s.toggleRow, { opacity: disabled ? 0.5 : 1 }]}
    >
      <Text style={[s.toggleLabel, { color: p.text }]}>{label}</Text>
      <View
        style={[
          s.toggleTrack,
          { backgroundColor: checked ? p.accent : '#d1d5db' },
        ]}
      >
        <View
          style={[
            s.toggleKnob,
            { transform: [{ translateX: checked ? 24 : 0 }] },
          ]}
        />
      </View>
    </TouchableOpacity>
  );
}

// ─── Section (LoudaApp.jsx:788) ───
export function Section({ title, children }: { title: string; children: React.ReactNode }) {
  const { p } = useLoudaTheme();
  return (
    <View style={{ marginBottom: 32 }}>
      <Text style={[s.sectionTitle, { color: p.text }]}>{title}</Text>
      {children}
    </View>
  );
}

// ─── Context Menu (LoudaApp.jsx:795) ───
export interface ContextMenuOption {
  label: string;
  icon?: React.ReactNode;
  danger?: boolean;
  onClick: () => void;
}

export function ContextMenu({
  position,
  options,
  onClose,
}: {
  position: { x: number; y: number } | null;
  options: ContextMenuOption[];
  onClose: () => void;
}) {
  const { p } = useLoudaTheme();
  const { width, height } = useWindowDimensions();
  if (!position) return null;
  const left = Math.max(8, Math.min(position.x, width - 220));
  const top = Math.max(8, Math.min(position.y, height - 40 - options.length * 44));
  return (
    <RNModal visible transparent animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <Pressable style={StyleSheet.absoluteFill} onPress={onClose}>
        <View
          style={[
            s.contextMenu,
            {
              backgroundColor: p.card,
              borderColor: p.borderLight,
              left,
              top,
            },
          ]}
        >
          {options.map((opt, i) => (
            <TouchableOpacity
              key={i}
              onPress={() => {
                opt.onClick();
                onClose();
              }}
              style={s.contextItem}
            >
              {opt.icon ? (
                <View style={{ width: 16, alignItems: 'center' }}>{opt.icon}</View>
              ) : null}
              <Text
                style={[
                  s.contextItemText,
                  { color: opt.danger ? p.danger : p.textSecondary },
                ]}
              >
                {opt.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </Pressable>
    </RNModal>
  );
}

// ─── Status Ring (LoudaApp.jsx:815) ───
export function StatusRing({
  statuses,
  currentUserId,
  size = 56,
}: {
  statuses?: StatusItem[];
  currentUserId?: string;
  size?: number;
}) {
  const { p } = useLoudaTheme();
  if (!statuses || statuses.length === 0) return null;
  const radius = (size / 2) - 1;
  const circumference = 2 * Math.PI * radius;
  const gap = statuses.length > 1 ? 4 : 0;
  const dashLength = circumference / statuses.length - gap;
  const anglePerSegment = 360 / statuses.length;

  return (
    <Svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      style={StyleSheet.absoluteFill}
    >
      {statuses.map((st, i) => {
        const isViewed = !!(st.views && st.views.some((v: { userId?: string }) => v.userId === currentUserId));
        return (
          <G key={st.id} rotation={i * anglePerSegment - 90} origin={`${size / 2}, ${size / 2}`}>
            <Circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="none"
              stroke={isViewed ? '#9ca3af' : p.accent}
              strokeWidth={2.5}
              strokeDasharray={`${dashLength} ${circumference - dashLength}`}
              strokeDashoffset={-gap / 2}
              strokeLinecap="round"
            />
          </G>
        );
      })}
    </Svg>
  );
}

// ─── Styles ───
const s = StyleSheet.create({
  mb3: { marginBottom: 12 },
  btnBase: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    minHeight: 42,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  btnText: { fontSize: 14, fontWeight: '700', textAlign: 'center' },
  inputLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#9ca3af',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 6,
    paddingHorizontal: 2,
  },
  input: {
    width: '100%',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    fontSize: 14,
    minHeight: 42,
  },
  errorText: { fontSize: 11, fontWeight: '700', marginTop: 4, paddingHorizontal: 2 },
  phoneRow: { flexDirection: 'row', gap: 8, width: '100%' },
  phoneCode: {
    width: 96,
    borderRadius: 12,
    borderWidth: 1,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  phoneCodeText: { fontSize: 12, fontWeight: '700' },
  phoneInput: {
    flex: 1,
    minWidth: 0,
    borderRadius: 12,
    borderWidth: 1,
    paddingVertical: 12,
    paddingHorizontal: 12,
    fontSize: 14,
    fontWeight: '700',
  },
  pickerOverlay: { flex: 1, justifyContent: 'flex-end' },
  pickerSheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 24,
  },
  pickerRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14 },
  pickerRowText: { fontSize: 15, fontWeight: '600' },
  modalOverlay: { flex: 1, justifyContent: 'flex-end' },
  modalSheet: {
    height: '100%',
    width: '100%',
    borderTopLeftRadius: 0,
    borderTopRightRadius: 0,
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 18,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  modalTitle: {
    fontSize: 15,
    fontWeight: '900',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    flex: 1,
    marginRight: 12,
  },
  modalClose: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalBody: { flex: 1, paddingHorizontal: 24, paddingTop: 24 },
  modalFooter: {
    paddingHorizontal: 24,
    paddingVertical: 18,
    flexDirection: 'row',
    gap: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
  },
  toggleLabel: { fontSize: 14, fontWeight: '500', flex: 1, marginRight: 12 },
  toggleTrack: { width: 48, height: 24, borderRadius: 12, justifyContent: 'center' },
  toggleKnob: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#ffffff',
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 2,
    shadowOffset: { width: 0, height: 1 },
    elevation: 2,
  },
  sectionTitle: { fontSize: 18, fontWeight: '700', marginBottom: 16 },
  contextMenu: {
    position: 'absolute',
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    minWidth: 180,
    paddingVertical: 8,
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
  contextItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  contextItemText: { fontSize: 14, fontWeight: '700' },
});
