import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { Ripple } from '../../components/Ripple';
import { useLoudaTheme } from './primitives';
import { Icons } from '../icons';
import { searchChatMessages } from '../api';

// Port of InChatSearch (LoudaApp.jsx:1290-1382)
export function InChatSearch({
  chatId,
  isGroup,
  onClose,
  onJumpToMessage,
}: {
  chatId?: string;
  isGroup?: boolean;
  onClose: () => void;
  onJumpToMessage?: (id: string) => void;
}) {
  const { p } = useLoudaTheme();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [currentIdx, setCurrentIdx] = useState(0);
  const inputRef = useRef<TextInput>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    if (!chatId) {
      setResults([]);
      return;
    }
    if (!query || query.length < 2) {
      setResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const data = await searchChatMessages(chatId, query, isGroup);
        const list = data || [];
        setResults(list);
        setCurrentIdx(0);
        if (list.length > 0 && onJumpToMessage) onJumpToMessage(list[0].id);
      } catch {
        setResults([]);
      }
      setLoading(false);
    }, 400);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, chatId, isGroup]);

  const navigate = (dir: 1 | -1) => {
    const newIdx = Math.max(0, Math.min(results.length - 1, currentIdx + dir));
    setCurrentIdx(newIdx);
    if (results[newIdx] && onJumpToMessage) onJumpToMessage(results[newIdx].id);
  };

  return (
    <View style={[s.wrap, { backgroundColor: p.card, borderBottomColor: p.borderLight }]}>
      <View style={s.row}>
        <View style={[s.inputWrap, { backgroundColor: p.cardMuted }]}>
          <TextInput
            ref={inputRef}
            value={query}
            onChangeText={setQuery}
            placeholder="Search in conversation..."
            placeholderTextColor="#9ca3af"
            style={[s.input, { color: p.text }]}
            returnKeyType="search"
            onSubmitEditing={() => navigate(1)}
          />
          {loading && <ActivityIndicator color={p.accent} size="small" />}
        </View>
        {results.length > 0 && (
          <Text style={[s.counter, { color: p.textMuted }]}>
            {currentIdx + 1}/{results.length}
          </Text>
        )}
        <Ripple onPress={() => navigate(-1)} disabled={currentIdx <= 0} hitSlop={6}>
          <Icons.chevronRight
            size={16}
            color={currentIdx <= 0 ? '#d1d5db' : '#6b7280'}
            style={{ transform: [{ rotate: '180deg' }] }}
          />
        </Ripple>
        <Ripple
          onPress={() => navigate(1)}
          disabled={currentIdx >= results.length - 1}
          hitSlop={6}
        >
          <Icons.chevronRight
            size={16}
            color={currentIdx >= results.length - 1 ? '#d1d5db' : '#6b7280'}
          />
        </Ripple>
        <Ripple onPress={onClose} hitSlop={6}>
          <Icons.x size={16} color="#6b7280" />
        </Ripple>
      </View>

      {results.length > 0 && query.length >= 2 && (
        <ScrollView
          style={[s.results, { backgroundColor: p.card, borderColor: p.border }]}
          keyboardShouldPersistTaps="handled"
        >
          {results.map((r, idx) => (
            <Ripple
              key={r.id}
              onPress={() => {
                setCurrentIdx(idx);
                onJumpToMessage?.(r.id);
              }}
              style={[
                s.resultRow,
                {
                  backgroundColor: idx === currentIdx ? p.accentSoft : 'transparent',
                  borderLeftColor: idx === currentIdx ? p.accent : 'transparent',
                },
              ]}
            >
              <View style={s.resultTop}>
                <Text style={[s.sender, { color: p.textSecondary }]}>{r.senderName}</Text>
                <Text style={[s.date, { color: p.textMuted }]}>
                  {new Date(r.timestamp).toLocaleDateString()}
                </Text>
              </View>
              <Text numberOfLines={2} style={[s.text, { color: p.textMuted }]}>
                {r.text}
              </Text>
            </Ripple>
          ))}
        </ScrollView>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  wrap: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    zIndex: 30,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  inputWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingRight: 6,
  },
  input: { flex: 1, paddingVertical: 8, fontSize: 14 },
  counter: { fontSize: 10, fontWeight: '700', whiteSpace: 'nowrap' } as any,
  // Floating dropdown under the search bar (web: absolute top-full,
  // left-0 right-0, max-h-64, z-50 — overlays the message list instead of
  // pushing it down)
  results: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    maxHeight: 240,
    zIndex: 50,
    borderWidth: StyleSheet.hairlineWidth,
    borderTopWidth: 0,
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 12,
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 12,
  },
  resultRow: {
    padding: 12,
    borderLeftWidth: 4,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  resultTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  sender: { fontSize: 12, fontWeight: '700' },
  date: { fontSize: 10 },
  text: { fontSize: 14 },
});
