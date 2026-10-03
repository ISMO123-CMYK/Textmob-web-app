import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { Ripple } from '../../components/Ripple';
import { useRoute } from '@react-navigation/native';
import { ensureLoudaSession } from '../../louda/session';
import LoudaHomeScreen from '../../louda/LoudaHomeScreen';

// Native Louda client (replaces the old WebView at mobile#ChatsScreen:1-73).
// Gate on the Louda identity session first — the store boot (store.tsx:391)
// reuses the same memoized ensureLoudaSession() promise, so this only adds
// an error state before the app tree mounts.
export default function ChatsScreen() {
  const route = useRoute<any>();
  const withUsername =
    typeof route.params?.with === 'string' && route.params.with ? route.params.with : undefined;
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setReady(false);
    setError(null);
    ensureLoudaSession()
      .then(() => {
        if (!cancelled) setReady(true);
      })
      .catch((e: any) => {
        if (!cancelled) setError(e?.message || 'Could not start Messaging');
      });
    return () => {
      cancelled = true;
    };
  }, [attempt]);

  const retry = useCallback(() => setAttempt((a) => a + 1), []);

  if (error) {
    return (
      <View style={s.center}>
        <Text style={s.errTitle}>Messaging unavailable</Text>
        <Text style={s.errMsg}>{error}</Text>
        <Ripple style={s.retryBtn} onPress={retry}>
          <Text style={s.retryText}>Try again</Text>
        </Ripple>
      </View>
    );
  }

  if (!ready) {
    return (
      <View style={s.center}>
        <ActivityIndicator size="large" color="#2563eb" />
      </View>
    );
  }

  return <LoudaHomeScreen initialWithUsername={withUsername} />;
}

const s = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#000',
    paddingHorizontal: 32,
  },
  errTitle: { color: '#fff', fontSize: 18, fontWeight: '800', marginBottom: 8 },
  errMsg: { color: '#9ca3af', fontSize: 14, textAlign: 'center', marginBottom: 24 },
  retryBtn: {
    backgroundColor: '#2563eb',
    paddingHorizontal: 28,
    paddingVertical: 12,
    borderRadius: 999,
  },
  retryText: { color: '#fff', fontSize: 15, fontWeight: '700' },
});
