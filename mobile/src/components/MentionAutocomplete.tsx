import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, TouchableOpacity, FlatList, StyleSheet, ActivityIndicator,
} from 'react-native';
import { searchUsersAPI } from '../api/users';
import { apiGet } from '../api/client';

interface Suggestion {
  id: string;
  label: string;
  type: 'user' | 'hashtag';
  username?: string;
  avatar?: string;
}

interface Props {
  text: string;
  cursorPosition: number;
  onChangeText: (text: string) => void;
  onSelect?: () => void;
  colors: any;
  isDark: boolean;
}

export default function MentionAutocomplete({ text, cursorPosition, onChangeText, onSelect, colors, isDark }: Props) {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [trigger, setTrigger] = useState<{ type: '@' | '#'; query: string; start: number } | null>(null);
  const timerRef = useRef<any>(null);

  useEffect(() => {
    if (cursorPosition < 0 || !text) {
      setSuggestions([]);
      setTrigger(null);
      return;
    }
    const before = text.slice(0, cursorPosition);
    const match = before.match(/[@#][a-zA-Z0-9_]*$/);
    if (match) {
      const token = match[0];
      const type = token[0] as '@' | '#';
      const query = token.slice(1);
      const start = cursorPosition - token.length;
      setTrigger({ type, query, start });
      if (timerRef.current) clearTimeout(timerRef.current);
      if (query.length >= 1) {
        timerRef.current = setTimeout(() => fetchSuggestions(type, query), 200);
      } else {
        setSuggestions([]);
      }
    } else {
      setSuggestions([]);
      setTrigger(null);
    }
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [text, cursorPosition]);

  const fetchSuggestions = async (type: '@' | '#', query: string) => {
    try {
      if (type === '@') {
        const res = await searchUsersAPI(query, 6);
        if (res.ok && Array.isArray(res.data)) {
          setSuggestions(res.data.map((u: any) => ({
            id: u.username || u.id,
            label: `@${u.username}`,
            type: 'user' as const,
            username: u.username,
            avatar: u.profile_pic,
          })));
        }
      } else {
        const res = await apiGet(`/hashtag?q=${encodeURIComponent(query)}&limit=6`);
        if (res.ok && Array.isArray(res.data)) {
          setSuggestions(res.data.map((h: any) => ({
            id: h.tag || h,
            label: `#${h.tag || h}`,
            type: 'hashtag' as const,
          })));
        }
      }
    } catch {}
  };

  const handleSelect = (s: Suggestion) => {
    if (!trigger) return;
    const before = text.slice(0, trigger.start);
    const after = text.slice(cursorPosition);
    const insertion = s.type === 'user' ? `@${s.username} ` : `${s.label} `;
    const newText = before + insertion + after;
    onChangeText(newText);
    setSuggestions([]);
    setTrigger(null);
    onSelect?.();
  };

  if (suggestions.length === 0) return null;

  return (
    <View style={styles.container}>
      <FlatList
        data={suggestions}
        keyExtractor={(item) => item.id}
        keyboardShouldPersistTaps="always"
        style={[styles.list, { backgroundColor: isDark ? '#1e293b' : '#fff', borderColor: colors.border }]}
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.suggestionRow} onPress={() => handleSelect(item)}>
            <View style={[styles.avatar, { backgroundColor: item.type === 'hashtag' ? (isDark ? '#374151' : '#f3f4f6') : '#e0e7ff' }]}>
              <Text style={styles.avatarText}>{item.type === 'hashtag' ? '#' : '@'}</Text>
            </View>
            <Text style={[styles.suggestionLabel, { color: colors.textPrimary }]} numberOfLines={1}>{item.label}</Text>
          </TouchableOpacity>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { position: 'absolute', bottom: '100%', left: 0, right: 0, zIndex: 100, marginBottom: 4 },
  list: { maxHeight: 200, borderRadius: 12, borderWidth: 1, overflow: 'hidden' },
  suggestionRow: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 10, paddingHorizontal: 14 },
  avatar: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 13, fontWeight: '700', color: '#6366f1' },
  suggestionLabel: { fontSize: 14, fontWeight: '600', flex: 1 },
});
