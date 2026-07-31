import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { getPostAPI, editPostAPI } from '../../api/posts';

export default function PostUpdateScreen({ route, navigation }: any) {
  const { postId } = route.params || {};
  const { colors, isDark } = useTheme();
  const { username } = useAuth();

  const [post, setPost] = useState<any>(null);
  const [text, setText] = useState('');
  const [title, setTitle] = useState('');
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!postId) return;
    getPostAPI(postId)
      .then(res => {
        if (res.ok && res.data) {
          setPost(res.data);
          setText(res.data.text || '');
          setTitle(res.data.title || '');
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [postId]);

  async function handleSave() {
    if (!username || !postId) return;
    setSaving(true);
    try {
      const res = await editPostAPI(postId, username, text, title);
      if (res.ok) {
        navigation.goBack();
      }
    } catch {} finally {
      setSaving(false);
    }
  }

  const s = makeStyles(colors, isDark);

  if (loading) {
    return (
      <SafeAreaView edges={['top']} style={[s.safe, { backgroundColor: colors.background }]}>
        <View style={{ padding: 16 }}><View style={s.skeleton} /></View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={['top']} style={[s.safe, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[s.header, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}>
          <Ionicons name="close" size={22} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={[s.headerTitle, { color: colors.textPrimary }]}>Edit Post</Text>
        <TouchableOpacity
          onPress={handleSave}
          disabled={saving}
          style={[s.saveBtn, { backgroundColor: '#2563eb', opacity: saving ? 0.5 : 1 }]}
        >
          <Text style={s.saveBtnText}>{saving ? 'Saving...' : 'Save'}</Text>
        </TouchableOpacity>
      </View>

      {/* Form */}
      <View style={s.form}>
        <TextInput
          value={title}
          onChangeText={setTitle}
          placeholder="Title"
          placeholderTextColor={colors.textSecondary}
          style={[s.titleInput, { color: colors.textPrimary, backgroundColor: isDark ? '#1e293b' : '#f9fafb', borderColor: colors.border }]}
        />
        <TextInput
          value={text}
          onChangeText={setText}
          placeholder="What's on your mind?"
          placeholderTextColor={colors.textSecondary}
          multiline
          numberOfLines={6}
          textAlignVertical="top"
          style={[s.textInput, { color: colors.textPrimary, backgroundColor: isDark ? '#1e293b' : '#f9fafb', borderColor: colors.border }]}
        />
      </View>
    </SafeAreaView>
  );
}

const makeStyles = (colors: any, isDark: boolean) => StyleSheet.create({
  safe: { flex: 1 },
  skeleton: { height: 160, backgroundColor: isDark ? '#1e293b' : '#f3f4f6', borderRadius: 16 },
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 12, height: 52,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  backBtn: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', marginRight: 8 },
  headerTitle: { flex: 1, fontSize: 16, fontWeight: '800' },
  saveBtn: { paddingHorizontal: 16, paddingVertical: 7, borderRadius: 20 },
  saveBtnText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  form: { padding: 16, gap: 12 },
  titleInput: {
    width: '100%', paddingHorizontal: 14, paddingVertical: 12,
    borderRadius: 16, fontSize: 14, fontWeight: '700',
    borderWidth: 1,
  },
  textInput: {
    width: '100%', paddingHorizontal: 14, paddingVertical: 12,
    borderRadius: 16, fontSize: 14, minHeight: 160,
    borderWidth: 1,
  },
});
