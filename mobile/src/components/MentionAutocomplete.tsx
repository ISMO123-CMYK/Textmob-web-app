import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, FlatList, StyleSheet, ActivityIndicator,
} from 'react-native';
import { Ripple } from './Ripple';
import { searchUsersAPI } from '../api/users';
import { apiGet } from '../api/client';

interface Suggestion {
  id: string;
  label: string;
  type: 'user' | 'hashtag';
  username?: string;
  avatar?: string;
}

// /trending-hashtags scans a few hundred posts server-side, and the endpoint the
// `#` branch used to call does not exist at all. Load the trending list once and
// filter it locally instead of issuing a request per keystroke.
let trendingTagsCache: { at: number; tags: string[] } | null = null;
const TRENDING_TAGS_TTL = 5 * 60 * 1000;

async function loadTrendingHashtags(): Promise<string[]> {
  if (trendingTagsCache && Date.now() - trendingTagsCache.at < TRENDING_TAGS_TTL) {
    return trendingTagsCache.tags;
  }
  try {
    const res = await apiGet<Array<{ tag?: string }>>('/trending-hashtags');
    const tags =
      res.ok && Array.isArray(res.data)
        ? res.data.map(t => (t && t.tag) || '').filter(Boolean)
        : (trendingTagsCache?.tags || []);
    trendingTagsCache = { at: Date.now(), tags };
    return tags;
  } catch {
    return trendingTagsCache?.tags || [];
  }
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
  const lastInsertRef = useRef<string | null>(null);

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    // Selecting a suggestion rewrites the whole string while the parent still
    // reports the pre-insert caret, so `before` would match a token in the
    // middle of the replacement and immediately reopen the sheet on it. Stay
    // closed until the user actually types again.
    if (lastInsertRef.current !== null) {
      if (lastInsertRef.current === text) {
        setSuggestions([]);
        setTrigger(null);
        return;
      }
      lastInsertRef.current = null;
    }
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
        const tags = await loadTrendingHashtags();
        const needle = query.toLowerCase();
        setSuggestions(
          tags
            .filter(t => t.toLowerCase().includes(needle))
            .slice(0, 6)
            .map(t => ({
              id: t,
              label: `#${t}`,
              type: 'hashtag' as const,
            }))
        );
      }
    } catch (e) { /* ignore */ }
  };

  const handleSelect = (s: Suggestion) => {
    if (!trigger) return;
    // `cursorPosition` comes from onSelectionChange, which can lag a keystroke
    // (and is unreliable on Android). Re-derive the token's end from the text
    // itself so the typed fragment is always fully replaced — otherwise its
    // tail survives and you get "#football #foo".
    const rest = text.slice(trigger.start);
    const m = rest.match(/^[@#][a-zA-Z0-9_]*/);
    const end = trigger.start + (m ? m[0].length : rest.charAt(0) === trigger.type ? 1 : 0);
    const before = text.slice(0, trigger.start);
    const after = text.slice(end);
    const insertion = s.type === 'user' ? `@${s.username} ` : `${s.label} `;
    const newText = before + insertion + after;
    // Block the effect below from re-opening the sheet against a cursor that
    // has not moved yet — that was a second insert of the same token.
    lastInsertRef.current = newText;
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
          <Ripple style={styles.suggestionRow} onPress={() => handleSelect(item)}>
            <View style={[styles.avatar, { backgroundColor: item.type === 'hashtag' ? (isDark ? '#374151' : '#f3f4f6') : '#e0e7ff' }]}>
              <Text style={styles.avatarText}>{item.type === 'hashtag' ? '#' : '@'}</Text>
            </View>
            <Text style={[styles.suggestionLabel, { color: colors.textPrimary }]} numberOfLines={1}>{item.label}</Text>
          </Ripple>
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
