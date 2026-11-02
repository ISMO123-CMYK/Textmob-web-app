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
  isNew?: boolean;
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
        ? res.data.map(t => String((t && t.tag) || '').replace(/^#+/, '').trim().toLowerCase()).filter(Boolean)
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
  const requestIdRef = useRef(0);
  const lastInsertRef = useRef<string | null>(null);

  useEffect(() => {
    const requestId = ++requestIdRef.current;
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
    const match = before.match(/[@#][a-zA-Z0-9_-]*$/);
    if (match) {
      const token = match[0];
      const type = token[0] as '@' | '#';
      const query = token.slice(1);
      const start = cursorPosition - token.length;
      setTrigger({ type, query, start });
      if (timerRef.current) clearTimeout(timerRef.current);
      if (query.length >= 1) {
        if (type === '#') {
          setSuggestions([{ id: 'new:' + query.toLowerCase(), label: '#' + query, type: 'hashtag', isNew: true }]);
        } else {
          setSuggestions([]);
        }
        timerRef.current = setTimeout(() => fetchSuggestions(type, query, requestId), 200);
      } else {
        setSuggestions([]);
      }
    } else {
      setSuggestions([]);
      setTrigger(null);
    }
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [text, cursorPosition]);

  const fetchSuggestions = async (type: '@' | '#', query: string, requestId: number) => {
    try {
      if (type === '@') {
        const res = await searchUsersAPI(query, 6);
        if (requestId === requestIdRef.current && res.ok && Array.isArray(res.data)) {
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
        if (requestId !== requestIdRef.current) return;
        const needle = query.toLowerCase();
        const matches: Suggestion[] = tags
          .filter(t => t.toLowerCase().indexOf(needle) === 0)
          .slice(0, 5)
          .map(t => ({
            id: t,
            label: `#${t}`,
            type: 'hashtag' as const,
          }));
        const hasExact = matches.some(item => item.label.toLowerCase() === '#' + needle);
        if (!hasExact) {
          matches.push({
            id: 'new:' + needle,
            label: '#' + needle,
            type: 'hashtag' as const,
            isNew: true,
          });
        }
        setSuggestions(matches.slice(0, 6));
      }
    } catch (e) { /* keep the typed hashtag suggestion available */ }
  };

  const handleSelect = (s: Suggestion) => {
    if (!trigger) return;
    requestIdRef.current += 1;
    if (timerRef.current) clearTimeout(timerRef.current);
    // Re-derive the whole token because selection offsets can lag.
    let tokenStart = trigger.start;
    if (trigger.type === '#') {
      while (tokenStart > 0 && text.charAt(tokenStart - 1) === '#') tokenStart -= 1;
    }
    const rest = text.slice(tokenStart);
    const tokenPattern = trigger.type === '#'
      ? /^#+[a-zA-Z0-9_-]*/
      : /^@+[a-zA-Z0-9_.]*/;
    const m = rest.match(tokenPattern);
    const end = tokenStart + (m ? m[0].length : rest.charAt(0) === trigger.type ? 1 : 0);
    const before = text.slice(0, tokenStart);
    const suffix = text.slice(end);
    const after = suffix.charAt(0) === ' ' ? suffix.slice(1) : suffix;
    const label = s.type === 'user'
      ? `@${s.username}`
      : '#' + s.label.replace(/^#+/, '');
    const newText = before + label + ' ' + after;
    // Keep the picker closed until the user types again.
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
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={[styles.suggestionLabel, { color: colors.textPrimary }]} numberOfLines={1}>{item.label}</Text>
              {item.isNew && <Text style={{ fontSize: 10, color: colors.textSecondary, marginTop: 2 }}>Add this new hashtag</Text>}
            </View>
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
