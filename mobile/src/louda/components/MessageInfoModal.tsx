import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { useLoudaTheme, LoudaModal } from './primitives';
import { Icons } from '../icons';
import { playTTS, loudaAlert } from '../utils';
import { useLoudaStore } from '../store';

// Port of MessageInfoModal (LoudaApp.jsx:3877-3994)
export function MessageInfoModal({
  message,
  onClose,
}: {
  message: any;
  onClose: () => void;
}) {
  const { p } = useLoudaTheme();
  const { user } = useLoudaStore();
  const [playingOriginal, setPlayingOriginal] = useState(false);
  const [playingTranslated, setPlayingTranslated] = useState(false);
  const [copiedOriginal, setCopiedOriginal] = useState(false);
  const [copiedTranslated, setCopiedTranslated] = useState(false);

  if (!message) return null;

  const userLang =
    user?.preferences?.language_preferences?.preferred_language || 'en';
  const userVoice = user?.preferences?.preferred_voice || 'Zainab';
  const translation = message.translations?.[userLang];

  const handlePlay = async (text: string, voice: string, setPlaying: (v: boolean) => void) => {
    if (!text) return;
    setPlaying(true);
    try {
      await playTTS(text, voice);
    } catch (e) {
      console.error(e);
      loudaAlert({ title: 'Error', message: 'Failed to play audio' });
    } finally {
      setPlaying(false);
    }
  };

  const copyToClipboard = async (text: string, setCopied: (v: boolean) => void) => {
    await Clipboard.setStringAsync(text || '');
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const sentTime = new Date(message.timestamp).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });
  const isRead = message.status === 'read';

  const ActionBtn = ({
    label,
    activeLabel,
    isActive,
    icon,
    onPress,
    disabled,
  }: {
    label: string;
    activeLabel: string;
    isActive: boolean;
    icon: any;
    onPress: () => void;
    disabled?: boolean;
  }) => {
    const I = icon;
    return (
      <TouchableOpacity
        activeOpacity={0.8}
        onPress={onPress}
        disabled={disabled}
        style={[
          s.action,
          {
            backgroundColor: isActive ? p.accentSoft : p.cardMuted,
          },
        ]}
      >
        {isActive && label === 'Play' ? (
          <ActivityIndicator size={12} color={p.accent} />
        ) : (
          <I size={13} color={isActive ? p.accent : p.textMuted} />
        )}
        <Text style={{ color: isActive ? p.accent : p.textSecondary, fontSize: 12, fontWeight: '800' }}>
          {isActive ? activeLabel : label}
        </Text>
      </TouchableOpacity>
    );
  };

  return (
    <LoudaModal isOpen onClose={onClose} title="Message Info">
      <View style={s.section}>
        <Text style={[s.eyebrow, { color: p.textMuted }]}>Original</Text>
        <Text style={[s.body, { color: p.text }]}>
          {message.text || (
            <Text style={{ fontStyle: 'italic', color: p.textMuted, fontSize: 12 }}>
              Media message
            </Text>
          )}
        </Text>
        <View style={s.actions}>
          <ActionBtn
            label={copiedOriginal ? 'Copied' : 'Copy'}
            activeLabel="Copied"
            isActive={copiedOriginal}
            icon={copiedOriginal ? Icons.check : Icons.file}
            onPress={() => copyToClipboard(message.text || '', setCopiedOriginal)}
          />
          <ActionBtn
            label={playingOriginal ? 'Playing...' : 'Play'}
            activeLabel="Playing..."
            isActive={playingOriginal}
            icon={Icons.audio}
            disabled={playingOriginal || !message.text}
            onPress={() => handlePlay(message.text, userVoice, setPlayingOriginal)}
          />
        </View>
      </View>

      {translation ? (
        <View style={s.section}>
          <View style={s.transHeader}>
            <Text style={[s.eyebrow, { color: p.accent }]}>Translation</Text>
            <View style={[s.langChip, { backgroundColor: p.cardMuted }]}>
              <Text style={{ color: p.textMuted, fontSize: 9, fontWeight: '800' }}>
                {userLang}
              </Text>
            </View>
          </View>
          <Text style={[s.body, s.transBody, { color: p.textSecondary }]}>{translation}</Text>
          <View style={s.actions}>
            <ActionBtn
              label={copiedTranslated ? 'Copied' : 'Copy'}
              activeLabel="Copied"
              isActive={copiedTranslated}
              icon={copiedTranslated ? Icons.check : Icons.file}
              onPress={() => copyToClipboard(translation, setCopiedTranslated)}
            />
            <ActionBtn
              label={playingTranslated ? 'Playing...' : 'Play'}
              activeLabel="Playing..."
              isActive={playingTranslated}
              icon={Icons.audio}
              disabled={playingTranslated}
              onPress={() => handlePlay(translation, userLang, setPlayingTranslated)}
            />
          </View>
        </View>
      ) : (
        !!message.text && (
          <View style={[s.section, s.center]}>
            <Text style={{ color: p.textMuted, fontSize: 12 }}>No translation yet</Text>
          </View>
        )
      )}

      <View style={s.metaRow}>
        <View style={{ flexDirection: 'row' }}>
          <Text style={{ color: p.textMuted, fontSize: 12, fontWeight: '500' }}>Sent </Text>
          <Text style={{ color: p.textSecondary, fontSize: 12, fontWeight: '700' }}>
            {sentTime}
          </Text>
        </View>
        <View style={s.statusWrap}>
          <Text style={{ fontSize: 13, letterSpacing: -2 }}>
            {message.status === 'sent' ? '✓' : '✓✓'}
          </Text>
          <Text
            style={[
              s.statusText,
              { color: isRead ? '#3b82f6' : p.textMuted },
            ]}
          >
            {(message.status || 'sent').toString()}
          </Text>
        </View>
      </View>
    </LoudaModal>
  );
}

const s = StyleSheet.create({
  section: {
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(128,128,128,0.2)',
  },
  center: { alignItems: 'center' },
  eyebrow: {
    fontSize: 10,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 8,
  },
  body: { fontSize: 15, lineHeight: 21, marginBottom: 12 },
  transBody: { fontStyle: 'italic' },
  transHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  langChip: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    textTransform: 'uppercase',
  },
  actions: { flexDirection: 'row', gap: 8 },
  action: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 14,
    paddingBottom: 10,
  },
  statusWrap: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  statusText: { fontSize: 12, fontWeight: '800', textTransform: 'capitalize' },
});
