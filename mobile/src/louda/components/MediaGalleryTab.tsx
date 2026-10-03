import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  Image,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Vibration,
} from 'react-native';
import { Ripple } from '../../components/Ripple';
import * as ImagePicker from 'expo-image-picker';
import { useLoudaTheme } from './primitives';
import { Icons } from '../icons';
import * as api from '../api';
import { useLoudaStore } from '../store';

// Port of MediaGalleryTab (LoudaApp.jsx:6421-6685)
export function MediaGalleryTab({
  userId,
  onViewMedia,
  onShare,
}: {
  userId: string;
  onViewMedia: (v: { src: string; type: string; mediaList?: any[] }) => void;
  onShare: (payload: { files: any[] }) => void;
}) {
  const { p } = useLoudaTheme();
  const { setCameraRequest } = useLoudaStore();
  const [mediaItems, setMediaItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'image' | 'video' | 'audio'>('all');
  const [gridSize, setGridSize] = useState<'compact' | 'normal' | 'large'>('normal');
  const [selectedItems, setSelectedItems] = useState<Set<number>>(new Set());
  const [selectionMode, setSelectionMode] = useState(false);

  useEffect(() => {
    let alive = true;
    api
      .getMediaGallery(userId)
      .then((data: any) => {
        if (!alive) return;
        setMediaItems(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch((err: any) => {
        console.error(err);
        setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [userId]);

  const filteredItems = useMemo(() => {
    if (filter === 'all') return mediaItems;
    if (filter === 'image') return mediaItems.filter((m) => m.type === 'image' || !m.type);
    if (filter === 'video') return mediaItems.filter((m) => m.type === 'video');
    if (filter === 'audio')
      return mediaItems.filter((m) => m.type === 'audio' || m.type === 'voice');
    return mediaItems;
  }, [mediaItems, filter]);

  const toggleSelectItem = (index: number) => {
    setSelectedItems((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      if (next.size === 0) setSelectionMode(false);
      else setSelectionMode(true);
      return next;
    });
  };

  const handleSelectAll = () => {
    if (selectedItems.size === filteredItems.length) {
      setSelectedItems(new Set());
      setSelectionMode(false);
    } else {
      setSelectedItems(new Set(filteredItems.map((_, i) => i)));
      setSelectionMode(true);
    }
  };

  const uploadMedia = async () => {
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images', 'videos'],
      allowsMultipleSelection: true,
      quality: 0.8,
    });
    if (res.canceled || !res.assets?.length) return;
    onShare({
      files: res.assets.map((a) => ({
        uri: a.uri,
        name: a.fileName || `media_${Date.now()}`,
        type: a.mimeType || 'image/jpeg',
        size: a.fileSize ?? 0,
      })),
    });
  };

  const openCamera = () => {
    // In-app camera (web parity: photo + video, LoudaApp.jsx:6701)
    setCameraRequest({
      mode: 'both',
      onCapture: (file: any) =>
        onShare({
          files: [
            { uri: file.uri, name: file.fileName, type: file.mimeType, size: file.fileSize ?? 0 },
          ],
        }),
    });
  };

  if (loading) {
    return (
      <View style={[s.loading, { backgroundColor: p.card }]}>
        <ActivityIndicator size="large" color={p.accent} />
      </View>
    );
  }

  const numColumns = gridSize === 'large' ? 2 : gridSize === 'compact' ? 4 : 3;

  return (
    <View style={[s.root, { backgroundColor: p.card }]}>
      {/* Header (web 6519-6588) */}
      <View style={[s.header, { borderBottomColor: p.borderLight, backgroundColor: p.card }]}>
        <View style={s.headerTop}>
          <View style={s.titleRow}>
            <Text style={[s.title, { color: p.text }]}>Gallery</Text>
            <View style={[s.countChip, { backgroundColor: p.cardMuted }]}>
              <Text style={{ fontSize: 11, fontWeight: '700', color: p.textSecondary }}>
                {filteredItems.length}
              </Text>
            </View>
          </View>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <Ripple
              style={[s.actionBtn, { backgroundColor: 'rgba(59,130,246,0.1)' }]}
              onPress={uploadMedia}
            >
              <Icons.plus size={17} color="#2563eb" />
            </Ripple>
            <Ripple
              style={[s.actionBtn, { backgroundColor: 'rgba(34,197,94,0.1)' }]}
              onPress={openCamera}
            >
              <Icons.camera size={17} color="#16a34a" />
            </Ripple>
          </View>
        </View>

        {/* Filters + grid size (web 6551-6587) */}
        <View style={s.controlsRow}>
          <View style={[s.pillGroup, { backgroundColor: p.cardMuted }]}>
            {([
              { id: 'all', label: 'All' },
              { id: 'image', label: 'Photos' },
              { id: 'video', label: 'Videos' },
              { id: 'audio', label: 'Audio' },
            ] as const).map((f) => (
              <Ripple
                key={f.id}
                style={[s.pill, filter === f.id && { backgroundColor: p.card }]}
                onPress={() => {
                  setFilter(f.id);
                  setSelectedItems(new Set());
                  setSelectionMode(false);
                }}
              >
                <Text
                  style={{
                    fontSize: 12,
                    fontWeight: '700',
                    color: filter === f.id ? p.text : p.textMuted,
                  }}
                >
                  {f.label}
                </Text>
              </Ripple>
            ))}
          </View>
          <View style={[s.pillGroup, { backgroundColor: p.cardMuted }]}>
            {([
              { id: 'large', label: 'Large' },
              { id: 'normal', label: 'Normal' },
              { id: 'compact', label: 'Compact' },
            ] as const).map((g) => (
              <Ripple
                key={g.id}
                style={[s.pill, gridSize === g.id && { backgroundColor: p.card }]}
                onPress={() => setGridSize(g.id)}
              >
                <Text
                  style={{
                    fontSize: 12,
                    fontWeight: '700',
                    color: gridSize === g.id ? p.text : p.textMuted,
                  }}
                >
                  {g.label}
                </Text>
              </Ripple>
            ))}
          </View>
        </View>
      </View>

      {/* Batch selection bar (web 6591-6603) */}
      {selectionMode && (
        <View style={s.selectBar}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <Ripple
              onPress={() => {
                setSelectedItems(new Set());
                setSelectionMode(false);
              }}
              style={{ padding: 4 }}
            >
              <Icons.x size={18} color="#fff" />
            </Ripple>
            <Text style={s.selectCount}>{selectedItems.size} selected</Text>
            <Ripple onPress={handleSelectAll}>
              <Text style={s.selectAll}>
                {selectedItems.size === filteredItems.length ? 'Deselect All' : 'Select All'}
              </Text>
            </Ripple>
          </View>
        </View>
      )}

      {/* Grid (web 6606-6671) */}
      <FlatList
        key={`cols-${numColumns}`}
        data={filteredItems}
        numColumns={numColumns}
        keyExtractor={(_, i) => String(i)}
        contentContainerStyle={{ padding: 2, gap: 2 }}
        columnWrapperStyle={{ gap: 2 }}
        style={{ flex: 1, backgroundColor: p.cardMuted }}
        ListEmptyComponent={
          <View style={s.empty}>
            <Icons.image size={56} color={p.textMuted} />
            <Text style={[s.emptyText, { color: p.textMuted }]}>
              No {filter !== 'all' ? filter : 'Media'} Found
            </Text>
          </View>
        }
        renderItem={({ item, index }) => {
          const isSelected = selectedItems.has(index);
          return (
            <Ripple
              activeOpacity={0.85}
              style={[
                s.cell,
                isSelected && { transform: [{ scale: 0.96 }], borderColor: '#E64A19', borderWidth: 3, borderRadius: 12 },
              ]}
              onLongPress={() => {
                if (selectionMode) return;
                Vibration.vibrate(50);
                toggleSelectItem(index);
              }}
              onPress={() => {
                if (selectionMode) {
                  toggleSelectItem(index);
                } else {
                  onViewMedia({ src: item.url, type: item.type, mediaList: filteredItems });
                }
              }}
            >
              {item.type === 'video' ? (
                <View style={[s.cellFill, { backgroundColor: '#1f2937' }]}>
                  <Icons.play size={26} color="#fff" />
                </View>
              ) : item.type === 'audio' || item.type === 'voice' ? (
                <View style={[s.cellFill, { backgroundColor: 'rgba(236,253,245,1)' }]}>
                  <Icons.audio size={24} color="#22c55e" />
                  <Text style={s.audioLabel}>Audio</Text>
                </View>
              ) : (
                <Image source={{ uri: item.url }} style={s.cellFill} resizeMode="cover" />
              )}

              {/* Selection circle (web 6646-6653) */}
              <Ripple
                style={[s.checkWrap, { opacity: selectionMode || isSelected ? 1 : 0.6 }]}
                onPress={() => toggleSelectItem(index)}
                hitSlop={6}
              >
                <View
                  style={[
                    s.circle,
                    isSelected
                      ? { backgroundColor: '#E64A19', borderColor: '#E64A19' }
                      : { backgroundColor: 'rgba(0,0,0,0.3)', borderColor: 'rgba(255,255,255,0.8)' },
                  ]}
                >
                  {isSelected && <Icons.check size={11} color="#fff" />}
                </View>
              </Ripple>

              {/* Video badge (web 6656-6660) */}
              {item.type === 'video' && (
                <View style={s.videoBadge}>
                  <Text style={{ color: '#fff', fontSize: 9, fontWeight: '700' }}>Video</Text>
                </View>
              )}

              {/* Sender/date overlay (web 6663-6666) — always visible on mobile (no hover) */}
              <View style={s.metaOverlay}>
                <Text style={s.metaName} numberOfLines={1}>
                  {item.senderName || 'Contact'}
                </Text>
                <Text style={s.metaDate}>
                  {new Date(item.timestamp || Date.now()).toLocaleDateString()}
                </Text>
              </View>
            </Ripple>
          );
        }}
      />
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1 },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
    gap: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    zIndex: 20,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  title: {
    fontSize: 20,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: -0.5,
  },
  countChip: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 999,
  },
  actionBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  controlsRow: { gap: 8 },
  pillGroup: {
    flexDirection: 'row',
    borderRadius: 12,
    padding: 4,
    gap: 4,
  },
  pill: {
    flex: 1,
    paddingVertical: 7,
    borderRadius: 9,
    alignItems: 'center',
  },
  selectBar: {
    backgroundColor: '#E64A19',
    paddingHorizontal: 20,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    zIndex: 30,
  },
  selectCount: { color: '#fff', fontSize: 14, fontWeight: '700', letterSpacing: 0.3 },
  selectAll: { color: '#fff', fontSize: 12, fontWeight: '700', textDecorationLine: 'underline', opacity: 0.9 },
  cell: {
    flex: 1,
    aspectRatio: 1,
    overflow: 'hidden',
    backgroundColor: '#e5e7eb',
  },
  cellFill: {
    ...StyleSheet.absoluteFill,
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  audioLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#6b7280',
  },
  checkWrap: {
    position: 'absolute',
    top: 8,
    left: 8,
    zIndex: 20,
  },
  circle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  videoBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    zIndex: 10,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  metaOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.55)',
    paddingHorizontal: 8,
    paddingVertical: 5,
    zIndex: 10,
  },
  metaName: { color: '#fff', fontSize: 11, fontWeight: '700' },
  metaDate: { color: 'rgba(255,255,255,0.7)', fontSize: 9, marginTop: 1 },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
    opacity: 0.6,
    gap: 14,
    marginTop: 60,
  },
  emptyText: {
    fontSize: 13,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 3,
  },
});
