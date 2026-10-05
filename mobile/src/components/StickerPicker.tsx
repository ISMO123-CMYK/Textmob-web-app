import React, { useState, useRef, useEffect, useCallback } from 'react';
import { View, Text, TextInput, FlatList, Image, ActivityIndicator, Modal, Pressable, StyleSheet, Platform, KeyboardAvoidingView } from 'react-native';
import { Ripple } from './Ripple';
import Ionicons from '@expo/vector-icons/build/Ionicons';
import { searchGiphStickers, StickerResult } from '../utils/stickerUtils';

interface StickerPickerProps {
  visible: boolean;
  onSelect: (url: string) => void;
  onClose: () => void;
}

export default function StickerPicker({ visible, onSelect, onClose }: StickerPickerProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<StickerResult[]>([]);
  const [loading, setLoading] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const search = useCallback((q: string) => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    if (abortRef.current) abortRef.current.abort();
    if (!q.trim()) {
      setResults([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const controller = new AbortController();
    abortRef.current = controller;
    timeoutRef.current = setTimeout(async () => {
      const data = await searchGiphStickers(q, controller.signal);
      if (data !== null) setResults(data);
      setLoading(false);
    }, 300);
  }, []);

  useEffect(() => {
    if (visible) {
      search(query);
    }
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      if (abortRef.current) abortRef.current.abort();
    };
  }, [query, visible, search]);

  const handleSelect = (url: string) => {
    onSelect(url);
    setQuery('');
    setResults([]);
    onClose();
  };

  const handleClose = () => {
    setQuery('');
    setResults([]);
    onClose();
  };

  const renderItem = ({ item }: { item: StickerResult }) => (
    <Ripple style={styles.gridItem} onPress={() => handleSelect(item.url)} activeOpacity={0.7}>
      <Image source={{ uri: item.url }} style={styles.stickerImage} resizeMode="cover" />
    </Ripple>
  );

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={handleClose}>
      {/* Keeps the search field above the keyboard — Android's window resize
          does not apply inside a Modal, iOS needs the padding behaviour. */}
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <Pressable style={styles.overlay} onPress={handleClose}>
        <Pressable style={styles.container} onPress={e => e.stopPropagation()}>
          <View style={styles.handle} />
          <View style={styles.header}>
            <View style={styles.searchWrap}>
              <Ionicons name="search-outline" size={16} color="#9ca3af" />
              <TextInput
                style={styles.searchInput}
                placeholder="Search stickers..."
                placeholderTextColor="#9ca3af"
                value={query}
                onChangeText={setQuery}
                autoFocus
              />
              {query.length > 0 && (
                <Ripple onPress={() => setQuery('')}>
                  <Ionicons name="close-circle" size={16} color="#9ca3af" />
                </Ripple>
              )}
            </View>
            <Ripple onPress={handleClose} style={styles.closeBtn}>
              <Ionicons name="close" size={20} color="#6b7280" />
            </Ripple>
          </View>
          <FlatList
            data={results}
            renderItem={renderItem}
            keyExtractor={item => item.id}
            numColumns={3}
            contentContainerStyle={styles.grid}
            columnWrapperStyle={styles.row}
            ListEmptyComponent={
              loading ? (
                <View style={styles.emptyWrap}>
                  <ActivityIndicator size="small" color="#9ca3af" />
                  <Text style={styles.emptyText}>Searching...</Text>
                </View>
              ) : (
                <View style={styles.emptyWrap}>
                  <Text style={styles.emptyText}>
                    {query ? 'No stickers found' : 'Search for stickers'}
                  </Text>
                </View>
              )
            }
          />
          </Pressable>
        </Pressable>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  container: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '55%',
    paddingBottom: 34,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#d1d5db',
    alignSelf: 'center',
    marginTop: 10,
    marginBottom: 4,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 10,
  },
  searchWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f3f4f6',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: '#111827',
    padding: 0,
  },
  closeBtn: {
    padding: 4,
  },
  grid: {
    paddingHorizontal: 12,
    paddingBottom: 8,
  },
  row: {
    justifyContent: 'flex-start',
    gap: 6,
  },
  gridItem: {
    width: '31%',
    aspectRatio: 1,
    borderRadius: 10,
    overflow: 'hidden',
    backgroundColor: '#f3f4f6',
    marginBottom: 6,
  },
  stickerImage: {
    width: '100%',
    height: '100%',
  },
  emptyWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
    width: '100%',
  },
  emptyText: {
    fontSize: 13,
    color: '#9ca3af',
    marginTop: 8,
  },
});
