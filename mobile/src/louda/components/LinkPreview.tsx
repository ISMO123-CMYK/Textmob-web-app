import React, { memo, useEffect, useState } from 'react';
import { View, Text, Image, TouchableOpacity, Linking, StyleSheet } from 'react-native';
import { useLoudaTheme } from './primitives';
import { LOUDA_API_URL as API_BASE_URL } from '../constants';

// Port of LinkPreview (StatusComponents.jsx, LinkPreview export)
export const LinkPreview = memo(function LinkPreview({ url }: { url: string }) {
  const { p } = useLoudaTheme();
  const [preview, setPreview] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!url) return;
    setLoading(true);
    fetch(`${API_BASE_URL}/api/misc/link-preview?url=${encodeURIComponent(url)}`)
      .then((res) => res.json())
      .then((data) => {
        setPreview(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [url]);

  if (loading) {
    return <Text style={[s.loading, { color: p.textMuted }]}>Loading preview...</Text>;
  }
  if (!preview || !preview.title) {
    return (
      <TouchableOpacity onPress={() => Linking.openURL(url).catch(() => {})}>
        <Text style={[s.fallback, { color: '#2563eb' }]} numberOfLines={3}>
          {url}
        </Text>
      </TouchableOpacity>
    );
  }

  let hostname = '';
  try {
    hostname = new URL(url).hostname;
  } catch {
    hostname = url;
  }

  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={() => Linking.openURL(url).catch(() => {})}
      style={[s.card, { backgroundColor: 'rgba(0,0,0,0.05)', borderColor: p.border }]}
    >
      {!!preview.image && (
        <Image source={{ uri: preview.image }} style={s.image} resizeMode="cover" />
      )}
      <View style={{ padding: 12 }}>
        <Text numberOfLines={1} style={[s.title, { color: p.text }]}>
          {preview.title}
        </Text>
        {!!preview.description && (
          <Text numberOfLines={2} style={[s.desc, { color: p.textMuted }]}>
            {preview.description}
          </Text>
        )}
        <Text style={[s.host, { color: p.textMuted }]}>{hostname}</Text>
      </View>
    </TouchableOpacity>
  );
});

const s = StyleSheet.create({
  loading: { fontSize: 11, marginTop: 4 },
  fallback: { fontSize: 14, fontWeight: '600', marginTop: 4, textDecorationLine: 'none' },
  card: {
    marginTop: 8,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  image: { width: '100%', height: 128 },
  title: { fontSize: 14, fontWeight: '700' },
  desc: { fontSize: 11, marginTop: 4, lineHeight: 15 },
  host: {
    fontSize: 9,
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    marginTop: 6,
    fontWeight: '700',
    opacity: 0.7,
  },
});
