import React, { useState } from 'react';
import {
  View,
  Text,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  TextInput,
} from 'react-native';
import { Ripple } from '../../components/Ripple';
import * as ImagePicker from 'expo-image-picker';
import { useLoudaTheme, Button, Input, Toggle, Section } from './primitives';
import { Icons } from '../icons';
import { DEFAULT_AVATAR } from '../constants';
import { getOptimizedMediaUrl } from '../utils';
import * as api from '../api';
import { loudaAlert, TRANSLATION_TTS_DISABLED } from '../utils';
import { usePushNotifications } from '../../hooks/usePushNotifications';
import { InAppCamera } from './InAppCamera';

const VOICE_GROUPS = [
  { label: 'English', voices: [
    { v: 'Zainab', n: 'Zainab (Female)' },
    { v: 'Osagie', n: 'Osagie (Male)' },
  ]},
  { label: 'Yoruba', voices: [
    { v: 'Idera', n: 'Idera (Female)' },
    { v: 'Femi', n: 'Femi (Male)' },
  ]},
  { label: 'Igbo', voices: [
    { v: 'Chinenye', n: 'Chinenye (Female)' },
    { v: 'Nonso', n: 'Nonso (Male)' },
  ]},
];

const LANGS = [
  { v: 'en', n: 'English' },
  { v: 'ar', n: 'Arabic' },
  { v: 'fr', n: 'French' },
  { v: 'yo', n: 'Yoruba' },
  { v: 'ig', n: 'Igbo' },
  { v: 'ha', n: 'Hausa' },
];

// Port of SettingsScreen (LoudaApp.jsx:5909-6417)
export function SettingsScreen({
  user,
  onSave,
  onClose,
  blockedUsers,
  onToggleBlock,
  contacts,
  onUpdateProfile,
  onUploadAvatar,
}: {
  user: any;
  onSave: (prefs: any) => Promise<void>;
  onClose: () => void;
  blockedUsers: string[];
  onToggleBlock: (id: string) => void;
  contacts: any[];
  onUpdateProfile: (updates: any) => Promise<void>;
  onUploadAvatar: (id: string, file: any, isGroup: boolean) => void;
}) {
  const { p } = useLoudaTheme();
  const [view, setView] = useState('main');
  const [tempPrefs, setTempPrefs] = useState(JSON.parse(JSON.stringify(user.preferences || {})));
  const [tempUser, setTempUser] = useState({
    full_name: user.full_name || '',
    username: user.username || '',
    email: user.email || '',
  });
  const [hasChanges, setHasChanges] = useState(false);
  const [showAvatarOptions, setShowAvatarOptions] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  // SAME source of truth as Accounts Center / Menu (Textmob + Louda together).
  const {
    enabled: notifEnabled,
    loading: notifLoading,
    busy: notifBusy,
    setEnabled: setNotifEnabled,
  } = usePushNotifications();
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [passwordForm, setPasswordForm] = useState({ current: '', newPass: '', confirm: '' });
  const [passwordError, setPasswordError] = useState('');
  const [passwordLoading, setPasswordLoading] = useState(false);

  const update = (path: string, value: any) => {
    const keys = path.split('.');
    const newPrefs = JSON.parse(JSON.stringify(tempPrefs));
    let cur = newPrefs;
    for (let i = 0; i < keys.length - 1; i++) {
      if (!cur[keys[i]]) cur[keys[i]] = {};
      cur = cur[keys[i]];
    }
    cur[keys[keys.length - 1]] = value;
    setTempPrefs(newPrefs);
    setHasChanges(true);
  };

  const handleSaveAll = async () => {
    if (view === 'personal') {
      await onUpdateProfile(tempUser);
    }
    await onSave(tempPrefs);
    setHasChanges(false);
    if (view !== 'main') setView('main');
  };

  const pickAvatar = async (fromCamera: boolean) => {
    setShowAvatarOptions(false);
    if (fromCamera) {
      // Camera mounts INSIDE this RN Modal (own native window — the global
      // overlay would render behind it).
      setShowCamera(true);
      return;
    }
    try {
      const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.8 });
      if (res.canceled || !res.assets?.length) return;
      const asset = res.assets[0];
      onUploadAvatar(user.id, { uri: asset.uri, name: asset.fileName || 'avatar.jpg', type: asset.mimeType || 'image/jpeg' }, false);
    } catch (e) {
      console.error(e);
    }
  };

  const onCameraCapture = (file: { uri: string; fileName: string; mimeType: string }) => {
    setShowCamera(false);
    Promise.resolve(
      onUploadAvatar(user.id, { uri: file.uri, name: file.fileName, type: file.mimeType }, false),
    ).catch((e) => console.error(e));
  };

  // Same switch as Accounts Center + Menu: request OS permission and register
  // the shared Expo token (on), or drop it server-side (off). The server then
  // keeps Louda's own push_enabled flag in sync for chat messages.
  const onTogglePush = async (next: boolean) => {
    try {
      const ok = await setNotifEnabled(next);
      if (next && !ok) {
        loudaAlert({ title: 'Notice', message: 'Push permission denied or blocked by device.' });
        return;
      }
      loudaAlert({
        title: ok ? 'Success' : 'Push notifications',
        message: ok
          ? 'Push notifications enabled for messages and activity.'
          : 'Push notifications disabled for this device.',
      });
    } catch (e) {
      console.error('[Push] toggle failed', e);
    }
  };

  const menuItems = [
    { id: 'personal', label: 'Personal Info', icon: Icons.user, color: '#3b82f6' },
    { id: 'privacy', label: 'Privacy & Security', icon: Icons.lock, color: '#a855f7' },
    { id: 'blocked', label: 'Blocked Users', icon: Icons.block, color: '#ef4444' },
    { id: 'voice', label: 'Voice & Language', icon: Icons.mic, color: '#22c55e' },
    { id: 'notifications', label: 'Notifications', icon: Icons.bell, color: '#f59e0b' },
    { id: 'media', label: 'Media & Data', icon: Icons.image, color: '#f43f5e' },
    { id: 'account', label: 'Account & Security', icon: Icons.lock, color: '#6366f1' },
    { id: 'about', label: 'About', icon: Icons.chat, color: '#14b8a6' },
  ];

  return (
    <Modal transparent animationType="fade" statusBarTranslucent visible onRequestClose={onClose}>
      <Pressable style={s.overlay} onPress={onClose}>
        <Pressable style={[s.drawer, { backgroundColor: p.card }]} onPress={(e) => e.stopPropagation()}>
          {/* Header (web 6024-6036) */}
          <View style={[s.head, { borderBottomColor: p.borderLight, backgroundColor: p.card }]}>
            {view !== 'main' && (
              <Ripple style={[s.headBtn, { backgroundColor: p.cardMuted }]} onPress={() => setView('main')}>
                <Icons.arrowLeft size={17} color={p.textSecondary} />
              </Ripple>
            )}
            <Text style={s.headTitle} numberOfLines={1}>
              {view === 'main'
                ? 'Settings'
                : view.charAt(0).toUpperCase() + view.slice(1).replace(/([A-Z])/g, ' $1')}
            </Text>
            <Ripple style={[s.headBtn, { backgroundColor: p.cardMuted }]} onPress={onClose}>
              <Icons.x size={17} color={p.textMuted} />
            </Ripple>
          </View>

          <ScrollView contentContainerStyle={{ padding: 16, gap: 16, paddingBottom: 40 }}>
            {/* ─── Main ─── */}
            {view === 'main' && (
              <View style={{ gap: 8 }}>
                <View style={[s.profileCard, { backgroundColor: p.cardMuted, borderColor: p.borderLight }]}>
                  <View style={{ marginBottom: 8 }}>
                    <Image
                      source={{ uri: getOptimizedMediaUrl(user.avatar_url || DEFAULT_AVATAR) }}
                      style={s.profileAvatar}
                    />
                    <Ripple
                      style={s.avatarBadge}
                      onPress={() => setShowAvatarOptions(true)}
                      activeOpacity={0.85}
                    >
                      <Icons.camera size={13} color="#fff" />
                    </Ripple>
                  </View>
                  <Text style={[s.profileName, { color: p.text }]}>
                    {user.full_name || 'Anonymous'}
                  </Text>
                  <Text style={[s.profileHandle, { color: p.textMuted }]}>
                    @{user.username || 'user'}
                  </Text>
                </View>

                {menuItems.map((item) => {
                  const I = item.icon;
                  return (
                    <Ripple
                      key={item.id}
                      activeOpacity={0.8}
                      style={[s.menuRow, { backgroundColor: p.card, borderColor: p.borderLight }]}
                      onPress={() => setView(item.id)}
                    >
                      <View style={s.menuLeft}>
                        <View style={[s.menuIcon, { backgroundColor: `${item.color}1A` }]}>
                          <I size={17} color={item.color} />
                        </View>
                        <Text style={[s.menuLabel, { color: p.textSecondary }]}>{item.label}</Text>
                      </View>
                      <Icons.chevronRight size={17} color={p.textMuted} />
                    </Ripple>
                  );
                })}
              </View>
            )}

            {/* ─── Personal (web 6041-6099) ─── */}
            {view === 'personal' && (
              <View style={{ gap: 24 }}>
                <View style={{ alignItems: 'center', marginBottom: 8 }}>
                  <View>
                    <Image
                      source={{ uri: getOptimizedMediaUrl(user.avatar_url || DEFAULT_AVATAR) }}
                      style={s.bigAvatar}
                    />
                    <Ripple
                      style={[s.avatarBadge, s.avatarBadgeLg]}
                      onPress={() => setShowAvatarOptions(true)}
                      activeOpacity={0.85}
                    >
                      <Icons.camera size={15} color="#fff" />
                    </Ripple>
                  </View>
                  <Text style={[s.changePic, { color: p.textMuted }]}>Change Profile Picture</Text>
                </View>

                <View style={{ gap: 16 }}>
                  <Input
                    label="Full Name"
                    value={tempUser.full_name}
                    onChangeText={(v) => {
                      setTempUser({ ...tempUser, full_name: v });
                      setHasChanges(true);
                    }}
                  />
                  <Input
                    label="Username"
                    value={tempUser.username}
                    onChangeText={(v) => {
                      setTempUser({ ...tempUser, username: v });
                      setHasChanges(true);
                    }}
                  />
                  <Input
                    label="Email Address"
                    value={tempUser.email}
                    onChangeText={(v) => {
                      setTempUser({ ...tempUser, email: v });
                      setHasChanges(true);
                    }}
                    keyboardType="email-address"
                    autoCapitalize="none"
                  />
                  <View>
                    <Text style={s.fieldLabel}>Phone Number (Permanent)</Text>
                    <TextInput
                      editable={false}
                      value={user.phone}
                      style={[
                        s.disabledInput,
                        { backgroundColor: p.cardMuted, color: p.textMuted },
                      ]}
                    />
                  </View>
                </View>
              </View>
            )}

            {/* ─── Privacy placeholder (web 6103-6113) ─── */}
            {view === 'privacy' && (
              <View style={s.placeholder}>
                <View style={[s.placeholderIcon, { backgroundColor: 'rgba(168,85,247,0.1)' }]}>
                  <Text style={{ fontSize: 34 }}>🔒</Text>
                </View>
                <Text style={[s.placeholderTitle, { color: p.text }]}>Privacy & Security</Text>
                <Text style={[s.placeholderSub, { color: p.textMuted }]}>
                  Advanced privacy controls are coming soon to Textmob.
                </Text>
              </View>
            )}

            {/* ─── Blocked (web 6115-6145) ─── */}
            {view === 'blocked' && (
              <View style={{ gap: 16 }}>
                <Text style={s.blockedHead}>Manage Blocked Contacts</Text>
                {blockedUsers && blockedUsers.length > 0 ? (
                  <View style={{ gap: 8 }}>
                    {blockedUsers.map((id) => {
                      const contact = contacts?.find((c) => String(c.id) === String(id));
                      return (
                        <View
                          key={id}
                          style={[
                            s.blockedRow,
                            { backgroundColor: p.cardMuted, borderColor: p.borderLight },
                          ]}
                        >
                          <View style={s.blockedLeft}>
                            <Image
                              source={{ uri: contact?.avatar_url || DEFAULT_AVATAR }}
                              style={s.blockedAvatar}
                            />
                            <View>
                              <Text style={[s.blockedName, { color: p.text }]}>
                                {contact?.name || 'Unknown'}
                              </Text>
                              <Text style={[s.blockedPhone, { color: p.textMuted }]}>
                                {contact?.phone}
                              </Text>
                            </View>
                          </View>
                          <Ripple
                            style={s.unblockBtn}
                            onPress={() => onToggleBlock(id)}
                          >
                            <Text style={s.unblockText}>Unblock</Text>
                          </Ripple>
                        </View>
                      );
                    })}
                  </View>
                ) : (
                  <View style={{ alignItems: 'center', paddingVertical: 48, opacity: 0.4 }}>
                    <Text style={{ fontSize: 44, marginBottom: 14 }}>🚫</Text>
                    <Text style={{ fontWeight: '700', color: p.text }}>No blocked users</Text>
                  </View>
                )}
              </View>
            )}

            {/* ─── Voice & Language (web 6147-6190) ─── */}
            {view === 'voice' && (
              <View style={{ gap: 32 }}>
                {TRANSLATION_TTS_DISABLED && (
                  <View
                    style={{
                      backgroundColor: 'rgba(245,158,11,0.14)',
                      borderRadius: 12,
                      borderWidth: StyleSheet.hairlineWidth,
                      borderColor: 'rgba(245,158,11,0.45)',
                      padding: 12,
                    }}
                  >
                    <Text style={{ color: '#f59e0b', fontSize: 12, fontWeight: '800' }}>
                      Work in progress
                    </Text>
                    <Text style={{ color: '#f59e0b', fontSize: 12, marginTop: 2 }}>
                      Translation and text-to-speech are being rebuilt and are temporarily
                      disabled.
                    </Text>
                  </View>
                )}
                <Section title="Voice Settings">
                  <Text style={s.selectLabel}>Preferred TTS Voice</Text>
                  <View style={{ gap: 8 }}>
                    {VOICE_GROUPS.map((g) => (
                      <View key={g.label}>
                        <Text style={[s.groupLabel, { color: p.textMuted }]}>{g.label}</Text>
                        <View style={s.chipRow}>
                          {g.voices.map((o) => {
                            const active = (tempPrefs.preferred_voice || 'Zainab') === o.v;
                            return (
                              <Ripple
                                key={o.v}
                                activeOpacity={0.8}
                                disabled={TRANSLATION_TTS_DISABLED}
                                onPress={() => update('preferred_voice', o.v)}
                                style={[
                                  s.chip,
                                  {
                                    backgroundColor: active ? p.accent : p.cardMuted,
                                    borderColor: active ? p.accent : p.borderLight,
                                    opacity: TRANSLATION_TTS_DISABLED ? 0.5 : 1,
                                  },
                                ]}
                              >
                                <Text
                                  style={{
                                    color: active ? '#fff' : p.textSecondary,
                                    fontSize: 13,
                                    fontWeight: '700',
                                  }}
                                >
                                  {o.n}
                                </Text>
                              </Ripple>
                            );
                          })}
                        </View>
                      </View>
                    ))}
                  </View>
                </Section>

                <Section title="Localization">
                  <Text style={s.selectLabel}>App Language</Text>
                  <View style={s.chipRow}>
                    {LANGS.map((o) => {
                      const active =
                        (tempPrefs.language_preferences?.preferred_language || 'en') === o.v;
                      return (
                        <Ripple
                          key={o.v}
                          activeOpacity={0.8}
                          onPress={() => update('language_preferences.preferred_language', o.v)}
                          style={[
                            s.chip,
                            {
                              backgroundColor: active ? p.accent : p.cardMuted,
                              borderColor: active ? p.accent : p.borderLight,
                            },
                          ]}
                        >
                          <Text
                            style={{
                              color: active ? '#fff' : p.textSecondary,
                              fontSize: 13,
                              fontWeight: '700',
                            }}
                          >
                            {o.n}
                          </Text>
                        </Ripple>
                      );
                    })}
                  </View>
                  <View style={[s.subSection, { borderTopColor: p.borderLight }]}>
                    <Toggle
                      label="Auto Show Translated Messages"
                      checked={tempPrefs.language_preferences?.auto_translate === true}
                      disabled={TRANSLATION_TTS_DISABLED}
                      onChange={() =>
                        update(
                          'language_preferences.auto_translate',
                          !(tempPrefs.language_preferences?.auto_translate === true),
                        )
                      }
                    />
                    <Text style={[s.hint, { color: p.textMuted }]}>
                      {TRANSLATION_TTS_DISABLED
                        ? 'Work in progress — translation is temporarily disabled.'
                        : 'Automatically displays a subtle translated version under received messages.'}
                    </Text>
                  </View>
                </Section>
              </View>
            )}

            {/* ─── Notifications (web 6192-6236) ─── */}
            {view === 'notifications' && (
              <View>
                <Section title="Push Notifications">
                  <Toggle
                    label="Enable Push Notifications"
                    checked={notifEnabled}
                    onChange={onTogglePush}
                    disabled={notifLoading || notifBusy}
                  />
                  <Text style={[s.hint, { color: p.textMuted }]}>
                    One switch for everything: direct messages, group messages, contact status
                    updates, and Textmob activity — same as Accounts Center and Menu.
                  </Text>
                </Section>
              </View>
            )}

            {/* ─── Media (web 6238-6250) ─── */}
            {view === 'media' && (
              <View>
                <Section title="Media & Data Usage">
                  <Toggle
                    label="Lazy Load Media"
                    checked={tempPrefs.media?.lazy_load_images !== false}
                    onChange={() =>
                      update('media.lazy_load_images', !(tempPrefs.media?.lazy_load_images !== false))
                    }
                  />
                  <Text style={[s.hint, { color: p.textMuted }]}>
                    If enabled, images & videos will show a "Show Media" button to save data.
                  </Text>
                </Section>
              </View>
            )}

            {/* ─── Account (web 6252-6306) ─── */}
            {view === 'account' && (
              <View style={{ gap: 16 }}>
                <Section title="Profile">
                  <View style={{ gap: 8 }}>
                    {[
                      { label: 'Phone', value: user.phone },
                      { label: 'Email', value: user.email || 'Not set' },
                      { label: 'Username', value: `@${user.username}` },
                    ].map((row) => (
                      <View
                        key={row.label}
                        style={[s.infoRow, { backgroundColor: p.cardMuted }]}
                      >
                        <Text style={{ fontSize: 14, color: p.textSecondary, fontWeight: '500' }}>
                          {row.label}
                        </Text>
                        <Text style={{ fontSize: 14, color: p.text, fontWeight: '700' }}>
                          {row.value}
                        </Text>
                      </View>
                    ))}
                  </View>
                </Section>

                <Section title="Security">
                  {showPasswordForm ? (
                    <View style={{ gap: 12 }}>
                      {!!passwordError && (
                        <Text style={{ fontSize: 12, color: '#ef4444', fontWeight: '700' }}>
                          {passwordError}
                        </Text>
                      )}
                      <TextInput
                        placeholder="Current Password"
                        placeholderTextColor={p.textMuted}
                        secureTextEntry
                        value={passwordForm.current}
                        onChangeText={(v) => setPasswordForm({ ...passwordForm, current: v })}
                        style={[s.pwInput, { backgroundColor: p.cardMuted, color: p.text }]}
                      />
                      <TextInput
                        placeholder="New Password"
                        placeholderTextColor={p.textMuted}
                        secureTextEntry
                        value={passwordForm.newPass}
                        onChangeText={(v) => setPasswordForm({ ...passwordForm, newPass: v })}
                        style={[s.pwInput, { backgroundColor: p.cardMuted, color: p.text }]}
                      />
                      <TextInput
                        placeholder="Confirm New Password"
                        placeholderTextColor={p.textMuted}
                        secureTextEntry
                        value={passwordForm.confirm}
                        onChangeText={(v) => setPasswordForm({ ...passwordForm, confirm: v })}
                        style={[s.pwInput, { backgroundColor: p.cardMuted, color: p.text }]}
                      />
                      <View style={{ flexDirection: 'row', gap: 8 }}>
                        <Ripple
                          style={[s.pwBtn, { backgroundColor: p.cardMuted }]}
                          onPress={() => {
                            setShowPasswordForm(false);
                            setPasswordError('');
                            setPasswordForm({ current: '', newPass: '', confirm: '' });
                          }}
                        >
                          <Text style={{ fontSize: 14, fontWeight: '700', color: p.textSecondary }}>
                            Cancel
                          </Text>
                        </Ripple>
                        <Ripple
                          style={[s.pwBtn, { backgroundColor: '#16a34a', opacity: passwordLoading ? 0.5 : 1 }]}
                          disabled={passwordLoading}
                          onPress={async () => {
                            if (!passwordForm.current || !passwordForm.newPass)
                              return setPasswordError('All fields required');
                            if (passwordForm.newPass.length < 6)
                              return setPasswordError('Min 6 characters');
                            if (passwordForm.newPass !== passwordForm.confirm)
                              return setPasswordError("Passwords don't match");
                            setPasswordLoading(true);
                            setPasswordError('');
                            try {
                              const data: any = await api.changePassword({
                                userId: user.id,
                                currentPassword: passwordForm.current,
                                newPassword: passwordForm.newPass,
                              });
                              if (data?.error) throw new Error(data.error);
                              setShowPasswordForm(false);
                              setPasswordForm({ current: '', newPass: '', confirm: '' });
                              loudaAlert({ title: 'Success', message: 'Password changed!' });
                            } catch (e: any) {
                              setPasswordError(e.message || 'Failed');
                            } finally {
                              setPasswordLoading(false);
                            }
                          }}
                        >
                          <Text style={{ fontSize: 14, fontWeight: '700', color: '#fff' }}>
                            {passwordLoading ? 'Saving...' : 'Save'}
                          </Text>
                        </Ripple>
                      </View>
                    </View>
                  ) : (
                    <Ripple
                      style={[s.infoRow, { backgroundColor: p.cardMuted }]}
                      onPress={() => setShowPasswordForm(true)}
                    >
                      <Text style={{ fontSize: 14, fontWeight: '700', color: p.textSecondary }}>
                        Change Password
                      </Text>
                      <Icons.chevronRight size={16} color={p.textMuted} />
                    </Ripple>
                  )}
                  <View style={[s.infoRow, { backgroundColor: p.cardMuted, marginTop: 8 }]}>
                    <Text style={{ fontSize: 14, fontWeight: '700', color: p.textSecondary }}>
                      Active Sessions
                    </Text>
                    <Icons.chevronRight size={16} color={p.textMuted} />
                  </View>
                </Section>
              </View>
            )}

            {/* ─── About (web 6308-6353) ─── */}
            {view === 'about' && (
              <View style={{ gap: 16 }}>
                <View style={{ alignItems: 'center', paddingVertical: 18 }}>
                  <View style={s.aboutLogo}>
                    <Text style={{ color: '#fff', fontSize: 22, fontWeight: '900' }}>T</Text>
                  </View>
                  <Text style={{ fontSize: 17, fontWeight: '900', color: p.text, marginTop: 10 }}>
                    Textmob
                  </Text>
                  <Text style={{ fontSize: 11, fontWeight: '700', color: p.textMuted, marginTop: 4 }}>
                    v1.0.0
                  </Text>
                </View>

                <Section title="Mission">
                  <Text style={[s.aboutP, { color: p.textSecondary }]}>
                    Messaging built for multilingual African communication. Your privacy is sacred,
                    your language matters, your data is respected.
                  </Text>
                </Section>

                <Section title="Identity">
                  <View style={{ gap: 8 }}>
                    {[
                      { label: 'Privacy First', desc: 'End-to-end privacy controls' },
                      { label: 'No Language Left Behind', desc: 'Yoruba, Igbo, Hausa & more' },
                      { label: 'Low Data Friendly', desc: 'Built for African networks' },
                      { label: 'Accessible', desc: 'Read aloud, font scaling, voice notes' },
                    ].map((item, i) => (
                      <View key={i} style={[s.identityRow, { backgroundColor: p.cardMuted }]}>
                        <Text style={{ fontSize: 14, fontWeight: '700', color: p.text }}>
                          {item.label}
                        </Text>
                        <Text style={{ fontSize: 12, color: p.textMuted }}>{item.desc}</Text>
                      </View>
                    ))}
                  </View>
                </Section>

                <Section title="Supported Languages">
                  <View style={s.chipRow}>
                    {['English', 'Arabic', 'French', 'Yoruba', 'Igbo', 'Hausa'].map((lang) => (
                      <View
                        key={lang}
                        style={[s.chip, { backgroundColor: 'rgba(34,197,94,0.1)', borderColor: 'rgba(34,197,94,0.3)' }]}
                      >
                        <Text style={{ fontSize: 12, fontWeight: '700', color: '#15803d' }}>
                          {lang}
                        </Text>
                      </View>
                    ))}
                  </View>
                </Section>

                <Section title="Legal">
                  <View style={{ gap: 8 }}>
                    <View style={[s.infoRow, { backgroundColor: p.cardMuted }]}>
                      <Text style={{ fontSize: 14, fontWeight: '700', color: p.textSecondary }}>
                        Privacy Policy
                      </Text>
                      <Icons.chevronRight size={16} color={p.textMuted} />
                    </View>
                    <View style={[s.infoRow, { backgroundColor: p.cardMuted }]}>
                      <Text style={{ fontSize: 14, fontWeight: '700', color: p.textSecondary }}>
                        Terms of Service
                      </Text>
                      <Icons.chevronRight size={16} color={p.textMuted} />
                    </View>
                  </View>
                </Section>
              </View>
            )}

            {/* Save row (web 6355-6367) */}
            {view !== 'main' && (
              <View style={[s.saveRow, { borderTopColor: p.borderLight }]}>
                <Button variant="secondary" style={{ flex: 1 }} onPress={() => setView('main')}>
                  Back
                </Button>
                <Button
                  variant="primary"
                  style={{ flex: 1 }}
                  disabled={!hasChanges}
                  onPress={handleSaveAll}
                >
                  Save Changes
                </Button>
              </View>
            )}
          </ScrollView>
        </Pressable>
      </Pressable>

      {/* Avatar options (web 6372-6396) */}
      {showAvatarOptions && (
        <Modal transparent statusBarTranslucent visible onRequestClose={() => setShowAvatarOptions(false)}>
          <Pressable style={s.ovCenter} onPress={() => setShowAvatarOptions(false)}>
            <Pressable style={[s.sheetCard, { backgroundColor: p.card }]} onPress={(e) => e.stopPropagation()}>
              <Text style={[s.sheetTitle, { color: p.text }]}>Profile Photo</Text>
              <Ripple style={[s.sheetRow, { backgroundColor: p.cardMuted }]} onPress={() => pickAvatar(true)}>
                <Icons.camera size={19} color="#22c55e" />
                <Text style={{ fontSize: 15, fontWeight: '700', color: p.textSecondary }}>Take Photo</Text>
              </Ripple>
              <Ripple style={[s.sheetRow, { backgroundColor: p.cardMuted }]} onPress={() => pickAvatar(false)}>
                <Icons.image size={19} color="#3b82f6" />
                <Text style={{ fontSize: 15, fontWeight: '700', color: p.textSecondary }}>Upload Image</Text>
              </Ripple>
              <Ripple style={{ alignItems: 'center', paddingVertical: 10, marginTop: 4 }} onPress={() => setShowAvatarOptions(false)}>
                <Text style={{ color: p.textMuted, fontSize: 12, fontWeight: '900' }}>CANCEL</Text>
              </Ripple>
            </Pressable>
          </Pressable>
        </Modal>
      )}
      {/* In-modal camera (photo avatar) — RN Modal is its own window. */}
      {showCamera && (
        <InAppCamera
          mode="photo"
          filePrefix="avatar"
          onCancel={() => setShowCamera(false)}
          onCapture={onCameraCapture}
        />
      )}
    </Modal>
  );
}

const s = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  drawer: {
    width: '100%',
    maxWidth: 512,
    flex: 1,
    overflow: 'hidden',
  },
  head: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headTitle: {
    flex: 1,
    fontSize: 20,
    fontWeight: '900',
    color: '#5D4037',
    textTransform: 'uppercase',
    letterSpacing: -1,
    fontStyle: 'italic',
  },
  profileCard: {
    alignItems: 'center',
    paddingVertical: 18,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    marginBottom: 8,
  },
  profileAvatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 4,
    borderColor: '#fff',
  },
  avatarBadge: {
    position: 'absolute',
    right: -2,
    bottom: -2,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#16a34a',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarBadgeLg: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  profileName: {
    fontSize: 15,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: -0.5,
    marginTop: 8,
  },
  profileHandle: {
    fontSize: 11,
    fontWeight: '700',
    marginTop: 2,
  },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
  },
  menuLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  menuIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuLabel: {
    fontSize: 14,
    fontWeight: '700',
  },
  bigAvatar: {
    width: 96,
    height: 96,
    borderRadius: 48,
    borderWidth: 4,
    borderColor: '#fff',
  },
  changePic: {
    fontSize: 11,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 3,
    marginTop: 16,
  },
  fieldLabel: {
    fontSize: 10,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 2,
    color: '#9ca3af',
    marginBottom: 6,
  },
  disabledInput: {
    borderWidth: 0,
    borderRadius: 12,
    padding: 16,
    fontSize: 15,
    fontWeight: '700',
  },
  placeholder: {
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 40,
  },
  placeholderIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 22,
  },
  placeholderTitle: {
    fontSize: 19,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: -1,
    marginBottom: 8,
  },
  placeholderSub: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 2,
    textAlign: 'center',
    lineHeight: 18,
    maxWidth: 220,
  },
  blockedHead: {
    fontSize: 11,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 2,
    color: '#9ca3af',
  },
  blockedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
  },
  blockedLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  blockedAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  blockedName: {
    fontSize: 14,
    fontWeight: '700',
  },
  blockedPhone: {
    fontSize: 10,
    fontWeight: '700',
    marginTop: 2,
  },
  unblockBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(239,68,68,0.25)',
  },
  unblockText: {
    fontSize: 11,
    fontWeight: '900',
    textTransform: 'uppercase',
    color: '#ef4444',
  },
  selectLabel: {
    fontSize: 12,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 1,
    color: '#9ca3af',
    marginBottom: 12,
  },
  groupLabel: {
    fontSize: 10,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 2,
    marginBottom: 6,
    marginTop: 4,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 12,
    borderWidth: 1,
  },
  subSection: {
    marginTop: 14,
    paddingTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  hint: {
    fontSize: 12,
    marginTop: 6,
    lineHeight: 17,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: 12,
  },
  pwInput: {
    borderRadius: 12,
    padding: 12,
    fontSize: 14,
    fontWeight: '500',
  },
  pwBtn: {
    flex: 1,
    padding: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  aboutLogo: {
    width: 64,
    height: 64,
    borderRadius: 16,
    backgroundColor: '#5D4037',
    alignItems: 'center',
    justifyContent: 'center',
  },
  aboutP: {
    fontSize: 14,
    lineHeight: 21,
  },
  identityRow: {
    padding: 12,
    borderRadius: 12,
    gap: 2,
  },
  saveRow: {
    flexDirection: 'row',
    gap: 12,
    paddingTop: 16,
    marginTop: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  ovCenter: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  sheetCard: {
    width: '100%',
    maxWidth: 320,
    borderRadius: 32,
    padding: 24,
    gap: 12,
  },
  sheetTitle: {
    textAlign: 'center',
    fontSize: 15,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: -1,
    marginBottom: 8,
  },
  sheetRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    padding: 16,
    borderRadius: 16,
  },
});
