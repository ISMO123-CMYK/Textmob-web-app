import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, Alert, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { createEventAPI } from '../../api/events';

export default function CreateEventScreen({ navigation }: any) {
  const { colors, isDark } = useTheme();
  const { username } = useAuth();

  const [title, setTitle] = useState('');
  const [text, setText] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [location, setLocation] = useState('');
  const [registrationUrl, setRegistrationUrl] = useState('');
  const [posting, setPosting] = useState(false);
  const [error, setError] = useState('');

  const isValid = title.trim().length > 0 && date.length > 0 && time.length > 0 && text.trim().length > 0;
  const today = new Date().toISOString().split('T')[0];

  async function handleSubmit() {
    if (!isValid || posting || !username) return;
    setError('');
    setPosting(true);
    try {
      const res = await createEventAPI({
        username,
        title: title.trim(),
        text: text.trim(),
        scheduled_for: `${date}T${time}`,
        location: location.trim() || undefined,
        registration_url: registrationUrl.trim() || undefined,
        visib: 'public',
      });
      if (res.ok) {
        navigation.goBack();
      } else {
        setError(res.error || 'Something went wrong.');
        setPosting(false);
      }
    } catch (err: any) {
      setError(err?.message || 'Something went wrong.');
      setPosting(false);
    }
  }

  const inputClass = (icon?: boolean) => ({
    backgroundColor: isDark ? '#1e293b' : '#f9fafb',
    borderColor: colors.border,
    color: colors.textPrimary,
    paddingLeft: icon ? 40 : 14,
  });

  const s = makeStyles(colors, isDark);

  return (
    <SafeAreaView edges={['top']} style={[s.safe, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[s.header, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}>
          <Ionicons name="chevron-back" size={22} color={colors.textPrimary} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={[s.headerTitle, { color: colors.textPrimary }]}>Create event</Text>
          <Text style={[s.headerSub, { color: colors.textSecondary }]}>Events are public · visible to everyone</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={s.form} keyboardShouldPersistTaps="handled">
        {/* Title */}
        <View style={s.fieldGroup}>
          <Text style={[s.label, { color: colors.textSecondary }]}>Event title <Text style={{ color: '#ef4444' }}>*</Text></Text>
          <TextInput
            value={title}
            onChangeText={setTitle}
            placeholder="e.g. Textmob Lagos Meetup"
            placeholderTextColor={colors.textSecondary}
            maxLength={120}
            style={[s.input, inputClass()]}
          />
          {title.length > 80 && (
            <Text style={[s.charCount, { color: colors.textSecondary }]}>{title.length}/120</Text>
          )}
        </View>

        {/* Description */}
        <View style={s.fieldGroup}>
          <Text style={[s.label, { color: colors.textSecondary }]}>Description <Text style={{ color: '#ef4444' }}>*</Text></Text>
          <TextInput
            value={text}
            onChangeText={setText}
            placeholder="Tell people what to expect…"
            placeholderTextColor={colors.textSecondary}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
            style={[s.input, s.textArea, inputClass()]}
          />
        </View>

        {/* Date & Time */}
        <View style={s.row}>
          <View style={[s.fieldGroup, { flex: 1 }]}>
            <Text style={[s.label, { color: colors.textSecondary }]}>Date <Text style={{ color: '#ef4444' }}>*</Text></Text>
            <TextInput
              value={date}
              onChangeText={setDate}
              placeholder="YYYY-MM-DD"
              placeholderTextColor={colors.textSecondary}
              style={[s.input, inputClass()]}
            />
          </View>
          <View style={[s.fieldGroup, { flex: 1 }]}>
            <Text style={[s.label, { color: colors.textSecondary }]}>Time <Text style={{ color: '#ef4444' }}>*</Text></Text>
            <TextInput
              value={time}
              onChangeText={setTime}
              placeholder="HH:MM"
              placeholderTextColor={colors.textSecondary}
              style={[s.input, inputClass()]}
            />
          </View>
        </View>

        {/* Location */}
        <View style={s.fieldGroup}>
          <Text style={[s.label, { color: colors.textSecondary }]}>Location <Text style={[s.optional, { color: colors.textSecondary }]}>optional</Text></Text>
          <View>
            <Ionicons name="location-outline" size={16} color={colors.textSecondary} style={s.inputIcon} />
            <TextInput
              value={location}
              onChangeText={setLocation}
              placeholder="Lagos Tech Hub, Online…"
              placeholderTextColor={colors.textSecondary}
              style={[s.input, inputClass(true)]}
            />
          </View>
        </View>

        {/* Registration URL */}
        <View style={s.fieldGroup}>
          <Text style={[s.label, { color: colors.textSecondary }]}>Registration link <Text style={[s.optional, { color: colors.textSecondary }]}>optional</Text></Text>
          <View>
            <Ionicons name="link-outline" size={16} color={colors.textSecondary} style={s.inputIcon} />
            <TextInput
              value={registrationUrl}
              onChangeText={setRegistrationUrl}
              placeholder="https://"
              placeholderTextColor={colors.textSecondary}
              autoCapitalize="none"
              keyboardType="url"
              style={[s.input, inputClass(true)]}
            />
          </View>
        </View>

        {/* Preview */}
        {(title.trim() || date) && (
          <View style={[s.previewCard, { borderColor: colors.border }]}>
            <View style={s.previewBar} />
            <View style={s.previewContent}>
              <Text style={[s.previewLabel, { color: colors.textSecondary }]}>Preview</Text>
              {date && time && (
                <View style={s.previewDateBadge}>
                  <Ionicons name="calendar-outline" size={11} color="#2563eb" />
                  <Text style={s.previewDateText}>
                    {new Date(`${date}T${time}`).toLocaleString(undefined, {
                      weekday: 'short', month: 'short', day: 'numeric',
                      hour: '2-digit', minute: '2-digit',
                    })}
                  </Text>
                </View>
              )}
              {title.trim() && <Text style={[s.previewTitle, { color: colors.textPrimary }]}>{title.trim()}</Text>}
              {location.trim() && (
                <View style={s.previewLocationRow}>
                  <Ionicons name="location-outline" size={11} color={colors.textSecondary} />
                  <Text style={[s.previewLocation, { color: colors.textSecondary }]}>{location.trim()}</Text>
                </View>
              )}
            </View>
          </View>
        )}

        {/* Error */}
        {error ? <Text style={s.errorText}>{error}</Text> : null}

        {/* Submit */}
        <TouchableOpacity
          onPress={handleSubmit}
          disabled={!isValid || posting}
          style={[s.submitBtn, { backgroundColor: isValid && !posting ? '#2563eb' : isDark ? '#334155' : '#e5e7eb' }]}
        >
          <Text style={[s.submitText, { color: isValid && !posting ? '#fff' : colors.textSecondary }]}>
            {posting ? 'Creating…' : 'Create event'}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const makeStyles = (colors: any, isDark: boolean) => StyleSheet.create({
  safe: { flex: 1 },
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 8, paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  backBtn: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', marginRight: 4 },
  headerTitle: { fontSize: 15, fontWeight: '800', lineHeight: 18 },
  headerSub: { fontSize: 11, marginTop: 2 },
  form: { padding: 16, paddingBottom: 40, gap: 20 },
  fieldGroup: { gap: 6 },
  label: { fontSize: 11, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 1 },
  optional: { fontSize: 10, fontWeight: '400', textTransform: 'none', letterSpacing: 0 },
  input: {
    borderWidth: 1, borderRadius: 14,
    paddingVertical: 11, paddingHorizontal: 14,
    fontSize: 14,
  },
  textArea: { minHeight: 100, borderRadius: 16 },
  row: { flexDirection: 'row', gap: 12 },
  inputIcon: { position: 'absolute', left: 12, top: 14, zIndex: 1 },
  charCount: { fontSize: 10, textAlign: 'right' },
  previewCard: { borderWidth: 1, borderRadius: 16, overflow: 'hidden' },
  previewBar: { height: 3, backgroundColor: '#2563eb' },
  previewContent: { padding: 14 },
  previewLabel: { fontSize: 10, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 },
  previewDateBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10,
    backgroundColor: '#eff6ff', alignSelf: 'flex-start', marginBottom: 6,
  },
  previewDateText: { fontSize: 10, fontWeight: '700', color: '#2563eb' },
  previewTitle: { fontSize: 14, fontWeight: '700' },
  previewLocationRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 6 },
  previewLocation: { fontSize: 11 },
  errorText: { fontSize: 12, color: '#ef4444', textAlign: 'center' },
  submitBtn: { paddingVertical: 14, borderRadius: 28, alignItems: 'center', marginTop: 8 },
  submitText: { fontSize: 14, fontWeight: '700' },
});
