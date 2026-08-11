import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ActivityIndicator, ScrollView, KeyboardAvoidingView, Platform,
  Image, Modal, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { createPostAPI, getPostAPI, Post } from '../../api/posts';
import { searchUsersAPI, UserProfile } from '../../api/users';
import { apiGet } from '../../api/client';
import { CATEGORIES, CATEGORY_IDS } from '../../data/categories';
import type { Category } from '../../data/categories';
import * as ImagePicker from 'expo-image-picker';
import { useNavigation } from '@react-navigation/native';

import useProfileCache from '../../hooks/useProfileCache';
import SafeHTML from '../../components/SafeHTML';

const DEFAULT_PIC = 'https://res.cloudinary.com/dzvm9xe1i/image/upload/v1746095979/profile-pictures/e2st5nispbicnhnir9cf.jpg';

const MOODS = [
  { emoji: '😊', label: 'Happy' },
  { emoji: '😢', label: 'Sad' },
  { emoji: '🎉', label: 'Excited' },
  { emoji: '😣', label: 'Angry' },
  { emoji: '🥰', label: 'Loved' },
  { emoji: '🙏', label: 'Grateful' },
  { emoji: '😴', label: 'Tired' },
  { emoji: '😕', label: 'Confused' },
  { emoji: '😬', label: 'Nervous' },
  { emoji: '🌟', label: 'Hopeful' },
  { emoji: '🏆', label: 'Proud' },
  { emoji: '✨', label: 'Inspired' },
  { emoji: '😔', label: 'Lonely' },
  { emoji: '😓', label: 'Stressed' },
  { emoji: '😌', label: 'Relaxed' },
];

interface PollOption { id: string; text: string; }

export default function CreatePostScreen({ route }: { route: any }) {
  const { colors, isDark } = useTheme();
  const { username } = useAuth();
  const profile = useProfileCache(username || '');
  const navigation = useNavigation<any>();
  const quotePostId = route?.params?.quotePostId || route?.params?.quoteId;
  const sharedText = route?.params?.sharedText;
  const sharedMedia = route?.params?.sharedMedia as { uri: string; name: string; type: string }[] | undefined;

  const [text, setText] = useState(sharedText || '');
  const [parsed, setParsed] = useState('');
  const [selection, setSelection] = useState({ start: 0, end: 0 });
  const inputRef = useRef<TextInput>(null);
  const [media, setMedia] = useState<string[]>(() => (sharedMedia || []).map(m => m.uri));
  const [mediaFiles, setMediaFiles] = useState<any[]>(() => (sharedMedia || []).map(m => ({ uri: m.uri, fileName: m.name || `shared_${Date.now()}`, mimeType: m.type || 'image/jpeg' })));
  const [loading, setLoading] = useState(false);
  const [mentionResults, setMentionResults] = useState<UserProfile[]>([]);
  const [showMentions, setShowMentions] = useState(false);
  const [mentionQuery, setMentionQuery] = useState('');
  const [showMoodPicker, setShowMoodPicker] = useState(false);
  const [selectedMood, setSelectedMood] = useState<{ emoji: string; label: string } | null>(null);
  const [showPollBuilder, setShowPollBuilder] = useState(false);
  const [pollOptions, setPollOptions] = useState<PollOption[]>([{ id: '1', text: '' }, { id: '2', text: '' }]);
  const [quotedPost, setQuotedPost] = useState<Post | null>(null);
  const [showPreview, setShowPreview] = useState(true);
  const [postCategories, setPostCategories] = useState<string[]>([]);
  const insertMarkdown = useCallback((before: string, after: string = '') => {
    const { start, end } = selection;
    const selected = text.slice(start, end);
    const wrapped = selected ? `${before}${selected}${after}` : before;
    const newText = text.slice(0, start) + wrapped + text.slice(end);
    setText(newText);
    const cursor = start + wrapped.length;
    setSelection({ start: cursor, end: cursor });
  }, [text, selection]);

  // Fetch quoted post if quotePostId is provided
  useEffect(() => {
    if (quotePostId) {
      apiGet(`/get-post?postId=${encodeURIComponent(quotePostId)}`).then(r => {
        if (r.ok && r.data) setQuotedPost(r.data);
      });
    }
  }, [quotePostId]);

  // Parse @mentions for autocomplete
  useEffect(() => {
    const atMatch = text.match(/@(\w*)$/);
    if (atMatch && atMatch[1].length >= 1) {
      const q = atMatch[1];
      setMentionQuery(q);
      searchUsersAPI(q, 6).then(r => {
        if (r.ok && r.data) {
          setMentionResults(r.data);
          setShowMentions(true);
        }
      });
    } else {
      setShowMentions(false);
      setMentionResults([]);
    }
  }, [text]);

  const selectMention = (user: UserProfile) => {
    const replace = `@${user.username} `;
    const match = text.match(/@(\w*)$/);
    if (match) {
      const before = text.slice(0, text.length - match[0].length);
      setText(before + replace);
    }
    setShowMentions(false);
  };

  const pickMedia = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images', 'videos'],
      allowsMultipleSelection: true,
      quality: 0.8,
    });
    if (!result.canceled && result.assets) {
      const uris = result.assets.map(a => a.uri);
      setMedia(prev => [...prev, ...uris]);
      setMediaFiles(prev => [...prev, ...result.assets]);
    }
  };

  const addPollOption = () => {
    if (pollOptions.length >= 6) return;
    setPollOptions(prev => [...prev, { id: String(Date.now()), text: '' }]);
  };

  const removePollOption = (id: string) => {
    if (pollOptions.length <= 2) return;
    setPollOptions(prev => prev.filter(o => o.id !== id));
  };

  const updatePollOption = (id: string, text: string) => {
    setPollOptions(prev => prev.map(o => o.id === id ? { ...o, text } : o));
  };

  const handleSubmit = async () => {
    if (!username) return;
    const hasText = text.trim().length > 0;
    const hasMedia = media.length > 0;
    const hasPoll = showPollBuilder && pollOptions.some(o => o.text.trim());
    if (!hasText && !hasMedia && !hasPoll) return;

    setLoading(true);
    const formData = new FormData();
    formData.append('username', username);
    formData.append('text', parsed || text);
    if (quotePostId) formData.append('quoted_post_id', quotePostId);
    if (selectedMood) formData.append('activities', selectedMood.label);

    for (const file of mediaFiles) {
      const filename = file.fileName || `media_${Date.now()}.jpg`;
      formData.append('media', { uri: file.uri, type: file.mimeType || 'image/jpeg', name: filename } as any);
    }

    if (showPollBuilder) {
      const validOptions = pollOptions.filter(o => o.text.trim());
      if (validOptions.length >= 2) {
        formData.append('type', 'poll');
        validOptions.forEach((o, i) => formData.append(`option_${i + 1}`, o.text.trim()));
      }
    }

    if (postCategories.length > 0) formData.append('categories', JSON.stringify(postCategories));

    const res = await createPostAPI(formData);
    setLoading(false);
    if (res.ok) {
      navigation.goBack();
    } else {
      Alert.alert('Error', res.error || 'Failed to create post');
    }
  };

  const s = makeStyles(colors, isDark);
  const canSubmit = text.trim().length > 0 || media.length > 0 || (showPollBuilder && pollOptions.some(o => o.text.trim()));

  return (
    <SafeAreaView style={[s.safe, { backgroundColor: colors.background }]}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        {/* Header */}
        <View style={[s.header, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={s.headerBtn}>
            <Ionicons name="close" size={22} color={colors.textSecondary} />
          </TouchableOpacity>
          <Text style={[s.headerTitle, { color: colors.textPrimary }]}>New Post</Text>
          <TouchableOpacity
            style={[s.postBtn, (!canSubmit || loading) && { opacity: 0.5 }]}
            onPress={handleSubmit}
            disabled={!canSubmit || loading}
          >
            {loading ? <ActivityIndicator color="#fff" size="small" /> : <Text style={s.postBtnText}>Post</Text>}
          </TouchableOpacity>
        </View>

        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16, paddingBottom: 120 }} keyboardShouldPersistTaps="handled">
          <View style={{ flexDirection: 'row', gap: 12, alignItems: 'flex-start' }}>
            <Image
              source={{ uri: profile?.profile_pic || DEFAULT_PIC }}
              style={{ width: 42, height: 42, borderRadius: 21, backgroundColor: colors.border }}
            />
            <View style={{ flex: 1 }}>
              {/* Mood indicator inside row header */}
              {selectedMood && (
                <TouchableOpacity
                  style={[s.moodBadge, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : '#f3f4f6', marginBottom: 8 }]}
                  onPress={() => setShowMoodPicker(true)}
                >
                  <Text style={{ fontSize: 13 }}>{selectedMood.emoji}</Text>
                  <Text style={[s.moodLabel, { color: colors.textSecondary }]}>is feeling {selectedMood.label}</Text>
                  <TouchableOpacity onPress={() => setSelectedMood(null)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                    <Ionicons name="close" size={14} color={colors.textSecondary} />
                  </TouchableOpacity>
                </TouchableOpacity>
              )}

              {/* Text input */}
              <TextInput
                ref={inputRef}
                style={[s.textInput, { color: colors.textPrimary }]}
                placeholder="What's on your mind?"
                placeholderTextColor={colors.textSecondary}
                value={text}
                onChangeText={setText}
                onSelectionChange={e => setSelection(e.nativeEvent.selection)}
                selection={selection}
                multiline
                textAlignVertical="top"
                autoFocus
              />
            </View>
          </View>

          {/* Mention autocomplete */}
          {showMentions && mentionResults.length > 0 && (
            <View style={[s.mentionSheet, { backgroundColor: colors.card, borderColor: colors.border }]}>
              {mentionResults.map(user => (
                <TouchableOpacity key={user.username} style={s.mentionRow} onPress={() => selectMention(user)}>
                  <Image source={{ uri: user.profile_pic || DEFAULT_PIC }} style={{ width: 28, height: 28, borderRadius: 14 }} />
                  <Text style={[s.mentionName, { color: colors.textPrimary }]}>@{user.username}</Text>
                  <Text style={[s.mentionFull, { color: colors.textSecondary }]}>{user.fullname}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* Media preview */}
          {media.length > 0 && (
            <View style={s.mediaRow}>
              {media.map((uri, i) => (
                <View key={i} style={s.mediaItem}>
                  <Image source={{ uri }} style={s.mediaPreview} />
                  <TouchableOpacity style={s.removeMedia} onPress={() => { setMedia(prev => prev.filter((_, idx) => idx !== i)); setMediaFiles(prev => prev.filter((_, idx) => idx !== i)); }}>
                    <Ionicons name="close" size={12} color="#fff" />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}

          {/* Quoted post preview */}
          {quotedPost && (
            <View style={[s.quoteCard, { backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : '#f9fafb', borderColor: colors.border }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                <Image source={{ uri: DEFAULT_PIC }} style={{ width: 20, height: 20, borderRadius: 10 }} />
                <Text style={[s.quoteName, { color: colors.textPrimary }]}>{quotedPost.fullname || quotedPost.username}</Text>
              </View>
              <Text style={[s.quoteText, { color: colors.textSecondary }]} numberOfLines={2}>{quotedPost.text}</Text>
              <TouchableOpacity style={{ position: 'absolute', top: 4, right: 4 }} onPress={() => setQuotedPost(null)}>
                <Ionicons name="close" size={16} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>
          )}

          {/* Category picker (multi-select) */}
          {!showPollBuilder && (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 10 }}>
              <Text style={[s.sectionLabel, { color: colors.textSecondary, width: '100%', marginBottom: 4 }]}>CATEGORIES</Text>
              {CATEGORIES.map(cat => (
                <TouchableOpacity key={cat.id} onPress={() => setPostCategories(prev => prev.includes(cat.id) ? prev.filter(c => c !== cat.id) : [...prev, cat.id])}
                  style={[s.catChip, { backgroundColor: postCategories.includes(cat.id) ? cat.color + '30' : isDark ? '#1e293b' : '#f3f4f6' }]}>
                  <Text style={[s.catChipText, { color: postCategories.includes(cat.id) ? cat.color : colors.textSecondary }]}>{cat.name}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* Poll builder */}
          {showPollBuilder && (
            <View style={[s.pollSection, { borderColor: colors.border }]}>
              <Text style={[s.pollTitle, { color: colors.textSecondary }]}>Poll</Text>
              {pollOptions.map((opt) => (
                <View key={opt.id} style={s.pollRow}>
                  <TextInput
                    style={[s.pollInput, { backgroundColor: isDark ? '#1e293b' : '#f3f4f6', color: colors.textPrimary }]}
                    placeholder={`Option ${pollOptions.indexOf(opt) + 1}`}
                    placeholderTextColor={colors.textSecondary}
                    value={opt.text}
                    onChangeText={t => updatePollOption(opt.id, t)}
                  />
                  {pollOptions.length > 2 && (
                    <TouchableOpacity onPress={() => removePollOption(opt.id)}>
                      <Ionicons name="close-circle" size={18} color="#ef4444" />
                    </TouchableOpacity>
                  )}
                </View>
              ))}
              {pollOptions.length < 6 && (
                <TouchableOpacity style={s.addPollBtn} onPress={addPollOption}>
                  <Ionicons name="add-circle-outline" size={18} color={colors.primary} />
                  <Text style={[s.addPollText, { color: colors.primary }]}>Add option</Text>
                </TouchableOpacity>
              )}
            </View>
          )}

          {/* Markdown formatting toolbar */}
          <View style={[s.mdToolbar, { borderTopColor: colors.border }]}>
            <TouchableOpacity style={s.mdBtn} onPress={() => insertMarkdown('**', '**')}>
              <Text style={[s.mdBtnText, { color: colors.textPrimary }]}>B</Text>
            </TouchableOpacity>
            <TouchableOpacity style={s.mdBtn} onPress={() => insertMarkdown('*', '*')}>
              <Text style={[s.mdBtnText, { color: colors.textPrimary, fontStyle: 'italic' }]}>I</Text>
            </TouchableOpacity>
            <TouchableOpacity style={s.mdBtn} onPress={() => insertMarkdown('~~', '~~')}>
              <Text style={[s.mdBtnText, { color: colors.textPrimary, textDecorationLine: 'line-through' }]}>S</Text>
            </TouchableOpacity>
            <TouchableOpacity style={s.mdBtn} onPress={() => insertMarkdown('`', '`')}>
              <Text style={[s.mdBtnText, { color: colors.textPrimary, fontFamily: 'monospace' }]}>{'<>'}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={s.mdBtn} onPress={() => insertMarkdown('\n# ', '')}>
              <Text style={[s.mdBtnText, { color: colors.textPrimary }]}>H</Text>
            </TouchableOpacity>
            <TouchableOpacity style={s.mdBtn} onPress={() => insertMarkdown('\n> ', '')}>
              <Text style={[s.mdBtnText, { color: colors.textPrimary }]}>{'">"'}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={s.mdBtn} onPress={() => insertMarkdown('\n- ', '')}>
              <Text style={[s.mdBtnText, { color: colors.textPrimary }]}>{'•'}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[s.mdBtn, showPreview && { backgroundColor: isDark ? 'rgba(59,130,246,0.15)' : '#eff6ff' }]}
              onPress={() => setShowPreview(p => !p)}
            >
              <Ionicons name={showPreview ? 'eye' : 'eye-off-outline'} size={16} color={showPreview ? '#2563eb' : colors.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* Markdown preview */}
          {showPreview && text.trim() ? (
            <View style={[s.previewCard, { backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : '#f9fafb', borderColor: colors.border }]}>
              <Text style={[s.previewLabel, { color: colors.textSecondary }]}>Preview</Text>
              <SafeHTML text={text} style={{ fontSize: 14, lineHeight: 20, color: colors.textPrimary }} />
            </View>
          ) : null}

          {/* Actions toolbar */}
          <View style={s.toolbar}>
            <TouchableOpacity
              style={[s.toolbarItem, media.length > 0 && { backgroundColor: isDark ? 'rgba(37,99,235,0.12)' : '#eff6ff' }]}
              onPress={pickMedia}
              disabled={showPollBuilder}
            >
              <Ionicons name="image-outline" size={20} color={showPollBuilder ? colors.border : media.length > 0 ? '#2563eb' : colors.textSecondary} />
              <Text style={[s.toolbarLabel, { color: showPollBuilder ? colors.border : media.length > 0 ? '#2563eb' : colors.textSecondary }]}>Media</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[s.toolbarItem, selectedMood && { backgroundColor: isDark ? 'rgba(37,99,235,0.12)' : '#eff6ff' }]}
              onPress={() => setShowMoodPicker(true)}
            >
              {selectedMood ? (
                <Text style={{ fontSize: 18 }}>{selectedMood.emoji}</Text>
              ) : (
                <Ionicons name="happy-outline" size={20} color={colors.textSecondary} />
              )}
              <Text style={[s.toolbarLabel, { color: selectedMood ? '#2563eb' : colors.textSecondary }]}>{selectedMood ? selectedMood.label : 'Feeling'}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[s.toolbarItem, showPollBuilder && { backgroundColor: isDark ? 'rgba(37,99,235,0.12)' : '#eff6ff' }]}
              onPress={() => setShowPollBuilder(!showPollBuilder)}
              disabled={media.length > 0}
            >
              <Ionicons name="bar-chart-outline" size={20} color={media.length > 0 ? colors.border : showPollBuilder ? '#2563eb' : colors.textSecondary} />
              <Text style={[s.toolbarLabel, { color: media.length > 0 ? colors.border : showPollBuilder ? '#2563eb' : colors.textSecondary }]}>Poll</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={s.toolbarItem}
              onPress={() => {}}
            >
              <Ionicons name="globe-outline" size={20} color={colors.textSecondary} />
              <Text style={[s.toolbarLabel, { color: colors.textSecondary }]}>Public</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Mood picker modal */}
      <Modal visible={showMoodPicker} transparent animationType="slide" onRequestClose={() => setShowMoodPicker(false)}>
        <TouchableOpacity style={s.moodOverlay} activeOpacity={1} onPress={() => setShowMoodPicker(false)}>
          <View style={[s.moodSheet, { backgroundColor: colors.card }]}>
            <View style={s.moodHandle} />
            <Text style={[s.moodSheetTitle, { color: colors.textSecondary }]}>How are you feeling?</Text>
            <View style={s.moodGrid}>
              {MOODS.map(m => (
                <TouchableOpacity key={m.label} style={[s.moodItem, selectedMood?.label === m.label && { backgroundColor: colors.primary + '20' }]} onPress={() => { setSelectedMood(m); setShowMoodPicker(false); }}>
                  <Text style={{ fontSize: 28 }}>{m.emoji}</Text>
                  <Text style={[s.moodItemLabel, { color: colors.textSecondary }]}>{m.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}

const makeStyles = (colors: any, isDark: boolean) => StyleSheet.create({
  safe: { flex: 1 },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    height: 52, paddingHorizontal: 16, borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 16, fontWeight: '700' },
  postBtn: { backgroundColor: '#2563eb', paddingHorizontal: 20, paddingVertical: 8, borderRadius: 20 },
  postBtnText: { color: '#fff', fontSize: 14, fontWeight: '700' },
  moodBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 16, alignSelf: 'flex-start', marginBottom: 8 },
  moodLabel: { fontSize: 12, fontWeight: '600' },
  textInput: { fontSize: 16, lineHeight: 24, minHeight: 160, paddingVertical: 4, paddingHorizontal: 4, marginBottom: 12 },
  mentionSheet: { borderRadius: 12, borderWidth: 1, marginBottom: 12, maxHeight: 200 },
  mentionRow: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 10 },
  mentionName: { fontSize: 13, fontWeight: '600' },
  mentionFull: { fontSize: 11, flex: 1 },
  mediaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  mediaItem: { position: 'relative', width: 80, height: 80, borderRadius: 8, overflow: 'hidden' },
  mediaPreview: { width: '100%', height: '100%' },
  removeMedia: { position: 'absolute', top: 4, right: 4, width: 22, height: 22, borderRadius: 11, backgroundColor: 'rgba(0,0,0,0.6)', alignItems: 'center', justifyContent: 'center' },
  quoteCard: { borderRadius: 12, borderWidth: 1, padding: 12, marginBottom: 12, position: 'relative' },
  quoteName: { fontSize: 12, fontWeight: '700' },
  quoteText: { fontSize: 12, lineHeight: 16 },
  pollSection: { borderWidth: 1, borderRadius: 12, padding: 14, marginBottom: 12 },
  pollTitle: { fontSize: 10, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 },
  pollRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  pollInput: { flex: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8, fontSize: 13 },
  addPollBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
  addPollText: { fontSize: 13, fontWeight: '600' },
  sectionLabel: { fontSize: 10, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 1 },
  catChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16 },
  catChipText: { fontSize: 12, fontWeight: '600' },
  mdToolbar: { flexDirection: 'row', gap: 4, borderTopWidth: StyleSheet.hairlineWidth, paddingTop: 8, marginTop: 8 },
  mdBtn: { width: 34, height: 34, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  mdBtnText: { fontSize: 13, fontWeight: '700' },
  previewCard: { borderRadius: 12, borderWidth: 1, padding: 12, marginTop: 8, marginBottom: 8 },
  previewLabel: { fontSize: 9, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 },
  toolbar: { flexDirection: 'row', gap: 6, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border, paddingTop: 12, marginTop: 8 },
  toolbarItem: { flexDirection: 'column', alignItems: 'center', gap: 2, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 14 },
  toolbarLabel: { fontSize: 9, fontWeight: '700' },
  moodOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.4)' },
  moodSheet: { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingBottom: 40 },
  moodHandle: { width: 36, height: 4, borderRadius: 2, backgroundColor: '#d1d5db', alignSelf: 'center', marginBottom: 16 },
  moodSheetTitle: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1.2, textAlign: 'center', marginBottom: 16 },
  moodGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 12 },
  moodItem: { alignItems: 'center', padding: 10, borderRadius: 14, width: '23%' },
  moodItemLabel: { fontSize: 10, fontWeight: '600', marginTop: 2 },
});
