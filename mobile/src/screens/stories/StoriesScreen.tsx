import React, { useState, useEffect } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  ActivityIndicator, Image, Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { getSparksAPI, Spark } from '../../api/snaps';
import * as ImagePicker from 'expo-image-picker';
import { uploadFile } from '../../api/client';
import { timeAgo } from '../../utils/format';

export default function StoriesScreen({ navigation }: { navigation: any }) {
  const { colors, isDark } = useTheme();
  const { username } = useAuth();

  const [stories, setStories] = useState<Spark[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [viewingStory, setViewingStory] = useState<Spark | null>(null);

  useEffect(() => { loadStories(); }, []);

  const loadStories = async () => {
    setLoading(true);
    const res = await getSparksAPI(username || '');
    if (res.ok && res.data) {
      setStories(res.data);
    }
    setLoading(false);
  };

  const pickMedia = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images', 'videos'],
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) {
      setShowCreate(false);
      setUploading(true);
      const formData = new FormData();
      formData.append('username', username || '');
      formData.append('caption', '');
      formData.append('media', {
        uri: result.assets[0].uri,
        type: result.assets[0].type || 'image/jpeg',
        name: result.assets[0].fileName || `story_${Date.now()}.jpg`,
      } as any);

      await uploadFile('/create-spark', formData);
      setUploading(false);
      loadStories();
    }
  };

  const s = makeStyles(colors, isDark);

  return (
    <SafeAreaView style={[s.safe, { backgroundColor: colors.background }]}>
      <View style={[s.header, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={[s.headerTitle, { color: colors.textPrimary }]}>Stories</Text>
        <TouchableOpacity onPress={() => setShowCreate(true)}>
          <Ionicons name="add" size={24} color="#2563eb" />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={s.loadingWrap}><ActivityIndicator size="large" color={colors.primary} /></View>
      ) : (
        <FlatList
          data={stories}
          keyExtractor={(_, i) => String(i)}
          numColumns={3}
          renderItem={({ item }) => (
            <TouchableOpacity style={s.storyItem} onPress={() => setViewingStory(item)}>
              {item.media?.[0] ? (
                <Image source={{ uri: item.media[0] }} style={s.storyMedia} />
              ) : (
                <View style={[s.storyTextOnly, { backgroundColor: colors.border }]}>
                  <Text style={[s.storyUser, { color: colors.textPrimary }]}>{item.username}</Text>
                </View>
              )}
              <View style={s.storyOverlay}>
                <Text style={s.storyUserOverlay}>{item.username}</Text>
              </View>
            </TouchableOpacity>
          )}
          contentContainerStyle={{ paddingBottom: 100 }}
          ListEmptyComponent={
            <View style={s.emptyState}>
              <Ionicons name="camera" size={40} color={colors.textSecondary} />
              <Text style={[s.emptyLabel, { color: colors.textSecondary }]}>No stories yet</Text>
            </View>
          }
        />
      )}

      <Modal visible={showCreate} transparent animationType="slide">
        <TouchableOpacity style={s.modalOverlay} activeOpacity={1} onPress={() => setShowCreate(false)}>
          <View style={[s.modalContent, { backgroundColor: colors.card }]}>
            <TouchableOpacity style={s.createOption} onPress={pickMedia}>
              <Ionicons name="images" size={24} color={colors.textPrimary} />
              <Text style={[s.createOptionText, { color: colors.textPrimary }]}>Upload Photo/Video</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      <Modal visible={!!viewingStory} transparent animationType="fade">
        <View style={s.viewerOverlay}>
          <TouchableOpacity style={s.viewerClose} onPress={() => setViewingStory(null)}>
            <Ionicons name="close" size={24} color="#fff" />
          </TouchableOpacity>
          {viewingStory?.media?.[0] && (
            <Image source={{ uri: viewingStory.media[0] }} style={s.viewerMedia} resizeMode="contain" />
          )}
          <Text style={s.viewerUser}>@{viewingStory?.username}</Text>
        </View>
      </Modal>

      {uploading && (
        <View style={s.uploadingOverlay}>
          <ActivityIndicator size="large" color="#fff" />
          <Text style={{ color: '#fff', marginTop: 8 }}>Uploading story...</Text>
        </View>
      )}
    </SafeAreaView>
  );
}

const makeStyles = (colors: any, isDark: boolean) => StyleSheet.create({
  safe: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 52,
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerTitle: { fontSize: 18, fontWeight: '700' },
  loadingWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  storyItem: { flex: 1, aspectRatio: 0.75, margin: 2, borderRadius: 8, overflow: 'hidden' },
  storyMedia: { width: '100%', height: '100%' },
  storyTextOnly: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 8 },
  storyUser: { fontSize: 12, fontWeight: '600' },
  storyOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 6,
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  storyUserOverlay: { color: '#fff', fontSize: 10, fontWeight: '600' },
  emptyState: { alignItems: 'center', paddingTop: 100 },
  emptyLabel: { fontSize: 14, marginTop: 8 },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 40,
  },
  createOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 16,
    borderRadius: 12,
  },
  createOptionText: { fontSize: 16, fontWeight: '600' },
  viewerOverlay: {
    flex: 1,
    backgroundColor: '#000',
    alignItems: 'center',
    justifyContent: 'center',
  },
  viewerClose: { position: 'absolute', top: 60, right: 20, zIndex: 10, width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  viewerMedia: { width: '100%', height: '80%' },
  viewerUser: { color: '#fff', fontSize: 16, fontWeight: '700', marginTop: 16 },
  uploadingOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0,0,0,0.7)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 100,
  },
});
