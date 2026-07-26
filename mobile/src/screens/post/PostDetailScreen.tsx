import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  ActivityIndicator, TextInput, Image, Alert,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import { getPostAPI, addCommentAPI, deleteCommentAPI, likePostAPI, getPostReactionsAPI, reactPostAPI, votePollAPI, Post, Comment } from '../../api/posts';
import { searchUsersAPI, UserProfile } from '../../api/users';
import { getProfileAPI } from '../../api/auth';
import useProfileCache from '../../hooks/useProfileCache';
import PostCard from '../../components/PostCard';
import { timeAgo } from '../../utils/format';
import { apiGet } from '../../api/client';

const DEFAULT_PIC = 'https://res.cloudinary.com/dzvm9xe1i/image/upload/v1746095979/profile-pictures/e2st5nispbicnhnir9cf.jpg';

function CommentRow({ item, colors, borderColor, onPress, onReply, onDelete, replyToId, setReplyToId, replyText, setReplyText, handleSubmitReply, username, postUsername }: {
  item: Comment; colors: any; borderColor: string; onPress: (u: string) => void;
  onReply: (id: string, name: string) => void; onDelete: (id: string) => void;
  replyToId: string | null; setReplyToId: (id: string | null) => void;
  replyText: string; setReplyText: (t: string) => void;
  handleSubmitReply: (parentId: string) => void;
  username: string | null; postUsername: string | undefined;
}) {
  const profile = useProfileCache(item.username);
  const isReplying = replyToId === item.id;
  return (
    <View>
      <TouchableOpacity style={[styles.commentRow, { borderBottomColor: borderColor }]} onPress={() => onPress(item.username)}>
        <Image source={{ uri: profile?.profile_pic || DEFAULT_PIC }} style={[styles.commentAvatar, { backgroundColor: colors.border }]} />
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <Text style={[styles.commentUser, { color: colors.textPrimary }]}>{profile?.fullname || item.username}</Text>
            <Text style={[styles.commentTime, { color: colors.textSecondary }]}>{timeAgo(item.created_at || '')}</Text>
          </View>
          <Text style={[styles.commentText, { color: colors.textSecondary }]}>{item.text}</Text>
          <View style={{ flexDirection: 'row', gap: 12, marginTop: 4 }}>
            <TouchableOpacity onPress={() => onReply(item.id, item.username)}>
              <Text style={{ fontSize: 11, fontWeight: '600', color: colors.primary }}>Reply</Text>
            </TouchableOpacity>
            {(username === item.username || username === postUsername) && (
              <TouchableOpacity onPress={() => onDelete(item.id)}>
                <Text style={{ fontSize: 11, fontWeight: '600', color: '#ef4444' }}>Delete</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </TouchableOpacity>
      {isReplying && (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 14, paddingBottom: 8, paddingLeft: 54 }}>
          <TextInput
            style={{ flex: 1, borderRadius: 22, paddingHorizontal: 16, paddingVertical: 8, fontSize: 13, backgroundColor: colors.border, color: colors.textPrimary }}
            placeholder={`Reply to @${item.username}...`}
            placeholderTextColor={colors.textSecondary}
            value={replyText}
            onChangeText={setReplyText}
            onSubmitEditing={() => handleSubmitReply(item.id)}
            returnKeyType="send"
            autoFocus
          />
          {replyText.trim().length > 0 && (
            <TouchableOpacity onPress={() => handleSubmitReply(item.id)}>
              <Ionicons name="send" size={16} color={colors.primary} />
            </TouchableOpacity>
          )}
        </View>
      )}
    </View>
  );
}
const MemoCommentRow = React.memo(CommentRow);

export default function PostDetailScreen({ route, navigation }: { route: any; navigation: any }) {
  const { colors, isDark } = useTheme();
  const { username } = useAuth();
  const { socket, on, off } = useSocket();
  const insets = useSafeAreaInsets();
  const { postId } = route.params || {};

  const [post, setPost] = useState<Post | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentText, setCommentText] = useState('');
  const [mentionResults, setMentionResults] = useState<UserProfile[]>([]);
  const [showMentions, setShowMentions] = useState(false);
  const [reactionsOpenFor, setReactionsOpenFor] = useState<string | number | null>(null);
  const [reactionCounts, setReactionCounts] = useState<Record<string, { counts: Record<string, number>; userReaction: string | null }>>({});
  const [group, setGroup] = useState<any>(null);
  const [accessDenied, setAccessDenied] = useState(false);
  const [replyToId, setReplyToId] = useState<string | null>(null);
  const [replyToName, setReplyToName] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');
  const inputRef = useRef<TextInput>(null);

  useEffect(() => {
    if (!postId) return;
    setLoading(true);
    setError('');
    getPostAPI(postId).then(r => {
      if (r.ok && r.data) {
        const p = r.data;
        setPost(p);
        function flattenComments(comments, parentId = null) {
          if (!comments) return [];
          const result = [];
          for (const c of comments) {
            result.push({ ...c, parentId: parentId || c.parentId || null, replies: undefined });
            if (c.replies) result.push(...flattenComments(c.replies, c.id));
          }
          return result;
        }
        setComments(flattenComments(p.comments));
        if (p.type?.startsWith('group-post-')) {
          const groupId = p.type.replace('group-post-', '');
          apiGet(`/groups/${groupId}/light?username=${username || ''}`).then(gr => {
            if (gr.ok) setGroup(gr.data);
            else if (gr.status === 403) setAccessDenied(true);
          });
        }
      } else {
        setError('Post not found');
      }
      setLoading(false);
    }).catch(() => { setError('Failed to load post'); setLoading(false); });
  }, [postId, username]);

  useEffect(() => {
    const handler = (e: any) => {
      if (e?.postId === postId) {
        const newC: Comment = { id: e.id || Date.now().toString(), username: e.username, text: e.text, created_at: e.created_at || new Date().toISOString() };
        setComments(prev => prev.some(c => String(c.id) === String(newC.id)) ? prev : [...prev, newC]);
      }
    };
    on('new-comment', handler);
    return () => off('new-comment', handler);
  }, [postId, on, off]);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const atMatch = commentText.match(/@(\w*)$/);
    if (atMatch && atMatch[1].length >= 1) {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        searchUsersAPI(atMatch[1], 6).then(r => {
          if (r.ok && r.data) { setMentionResults(r.data); setShowMentions(true); }
        });
      }, 300);
    } else {
      setShowMentions(false);
    }
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [commentText]);

  const selectMention = useCallback((user: UserProfile) => {
    const match = commentText.match(/@(\w*)$/);
    if (match) {
      const before = commentText.slice(0, commentText.length - match[0].length);
      setCommentText(before + `@${user.username} `);
    }
    setShowMentions(false);
    inputRef.current?.focus();
  }, [commentText]);

  const handleComment = useCallback(async (parentId?: string) => {
    if (!username || !commentText.trim() || !post) return;
    const newC: Comment = { id: Date.now().toString(), username, text: commentText.trim(), created_at: new Date().toISOString(), parentId };
    setComments(prev => [...prev, newC]);
    setCommentText('');
    setShowMentions(false);
    setReplyToId(null);
    setReplyToName(null);
    await addCommentAPI(postId, username, commentText.trim(), parentId).catch(() => {});
  }, [username, commentText, post, postId]);

  const handleDeleteComment = useCallback(async (commentId: string) => {
    if (!username || !post) return;
    setComments(prev => prev.filter(c => c.id !== commentId && c.parentId !== commentId));
    await deleteCommentAPI(postId, commentId, username).catch(() => {});
  }, [username, post, postId]);

  const handleReplySubmit = useCallback((parentId: string) => {
    if (!username || !replyText.trim() || !post) return;
    const newC: Comment = { id: Date.now().toString(), username, text: replyText.trim(), created_at: new Date().toISOString(), parentId };
    setComments(prev => [...prev, newC]);
    setReplyText('');
    setReplyToId(null);
    setReplyToName(null);
    addCommentAPI(postId, username, replyText.trim(), parentId).catch(() => {});
  }, [username, replyText, post, postId]);

  const handleLike = useCallback(() => {
    if (!username) return;
    setPost(prev => prev ? { ...prev, likes: prev.likes?.includes(username) ? prev.likes.filter(u => u !== username) : [...(prev.likes || []), username] } : prev);
    likePostAPI(postId, username).catch(() => {});
  }, [username, postId]);

  const handleReact = useCallback((pid: string | number, reaction: string, etext: string) => {
    if (!username) return;
    reactPostAPI(String(pid), username, reaction, etext).then(res => {
      if (res.ok && res.data?.reactions) {
        const counts: Record<string, number> = {};
        let ur: string | null = null;
        res.data.reactions.forEach((r: any) => {
          counts[r.reaction] = (counts[r.reaction] || 0) + 1;
          if (r.username === username) ur = r.reaction;
        });
        setReactionCounts(c => ({ ...c, [String(pid)]: { counts, userReaction: ur } }));
      }
    });
  }, [username]);

  const handlePollVote = useCallback((pid: string | number, optionId: string | number) => {
    if (!username) return;
    setPost(prev => prev ? {
      ...prev,
      options: prev.options?.map(o => {
        const votes = o.votes.filter(v => v !== username);
        if (o.id === optionId) votes.push(username);
        return { ...o, votes };
      }),
    } : prev);
    votePollAPI(String(pid), optionId, username).catch(() => {});
  }, [username]);

  const navigateToProfile = useCallback((u: string) => {
    navigation.navigate('Profile', { username: u });
  }, [navigation]);

  const renderHeader = useCallback(() => (
    <View style={{ padding: 8 }}>
      <PostCard
        post={post!}
        showViewButton={false}
        showCommentInput
        reactionCounts={reactionCounts}
        onReact={handleReact}
        onVotePoll={handlePollVote}
        onLike={handleLike}
      />
    </View>
  ), [post, reactionCounts, handleReact, handlePollVote, handleLike]);

  const topLevelComments = useMemo(() => comments.filter(c => !c.parentId), [comments]);

  const getReplies = useCallback((parentId: string) => comments.filter(c => c.parentId === parentId), [comments]);

  const handleReplyPress = useCallback((id: string, name: string) => {
    setReplyToId(id);
    setReplyToName(name);
  }, []);

  const renderComment = useCallback(({ item }: { item: Comment }) => {
    const replies = getReplies(item.id);
    return (
      <View>
        <MemoCommentRow
          item={item}
          colors={colors}
          borderColor={colors.border}
          onPress={navigateToProfile}
          onReply={handleReplyPress}
          onDelete={handleDeleteComment}
          replyToId={replyToId}
          setReplyToId={setReplyToId}
          replyText={replyText}
          setReplyText={setReplyText}
          handleSubmitReply={handleReplySubmit}
          username={username}
          postUsername={post?.username}
        />
        {replies.map(reply => (
          <View key={reply.id} style={{ paddingLeft: 40 }}>
            <MemoCommentRow
              item={reply}
              colors={colors}
              borderColor={colors.border}
              onPress={navigateToProfile}
              onReply={handleReplyPress}
              onDelete={handleDeleteComment}
              replyToId={replyToId}
              setReplyToId={setReplyToId}
              replyText={replyText}
              setReplyText={setReplyText}
              handleSubmitReply={handleReplySubmit}
              username={username}
              postUsername={post?.username}
            />
          </View>
        ))}
      </View>
    );
  }, [colors, navigateToProfile, handleDeleteComment, handleReplyPress, replyToId, replyText, handleReplySubmit, username, post?.username, getReplies]);

  const keyExtractor = useCallback((item: Comment, idx: number) => item.id || String(idx), []);

  const isEmpty = useCallback(() => (
    <Text style={[styles.noComments, { color: colors.textSecondary }]}>No comments yet. Be the first!</Text>
  ), [colors.textSecondary]);

  if (loading) {
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
        <View style={[styles.header, { borderBottomColor: colors.border }]}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={22} color={colors.textPrimary} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Post</Text>
        </View>
        <View style={styles.loadingWrap}><ActivityIndicator size="large" color={colors.primary} /></View>
      </SafeAreaView>
    );
  }

  if (error || !post) {
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
        <View style={[styles.header, { borderBottomColor: colors.border }]}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={22} color={colors.textPrimary} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Post</Text>
        </View>
        <View style={styles.loadingWrap}>
          <Text style={{ color: colors.textSecondary }}>{error || 'Post not found'}</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (accessDenied) {
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
        <View style={[styles.header, { borderBottomColor: colors.border }]}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={22} color={colors.textPrimary} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Post</Text>
        </View>
        <View style={styles.loadingWrap}>
          <Ionicons name="lock-closed" size={32} color={colors.textSecondary} />
          <Text style={{ color: colors.textSecondary, marginTop: 8 }}>Access denied</Text>
        </View>
      </SafeAreaView>
    );
  }

  const sendVisible = commentText.trim().length > 0;

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Post</Text>
        <View style={{ width: 40 }} />
      </View>

      <FlatList
        data={topLevelComments}
        keyExtractor={keyExtractor}
        ListHeaderComponent={renderHeader}
        renderItem={renderComment}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={isEmpty}
        keyboardShouldPersistTaps="handled"
        extraData={replyToId}
      />

      <View style={[styles.bottomInput, { backgroundColor: colors.card, borderTopColor: colors.border, paddingBottom: insets.bottom + 10 }]}>
        {username ? (
          <View style={{ flex: 1, position: 'relative' }}>
            {replyToId && replyToName && (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 4, paddingBottom: 4 }}>
                <Ionicons name="return-down-forward" size={14} color={colors.primary} />
                <Text style={{ fontSize: 11, color: colors.primary, fontWeight: '600' }}>Replying to @{replyToName}</Text>
                <TouchableOpacity onPress={() => { setReplyToId(null); setReplyToName(null); }}>
                  <Ionicons name="close-circle" size={14} color={colors.textSecondary} />
                </TouchableOpacity>
              </View>
            )}
            <View style={styles.inputRow}>
              <TextInput
                ref={inputRef}
                style={[styles.input, { backgroundColor: isDark ? '#1e293b' : '#f3f4f6', color: colors.textPrimary }]}
                placeholder={replyToId ? "Write a reply..." : "Write a comment..."}
                placeholderTextColor={colors.textSecondary}
                value={commentText}
                onChangeText={setCommentText}
                onSubmitEditing={() => handleComment(replyToId || undefined)}
                returnKeyType="send"
              />
              {sendVisible && (
                <TouchableOpacity onPress={() => handleComment(replyToId || undefined)} style={styles.sendBtn}>
                  <Ionicons name="send" size={18} color={colors.primary} />
                </TouchableOpacity>
              )}
            </View>
            {showMentions && mentionResults.length > 0 && (
              <View style={[styles.mentionDropdown, { backgroundColor: colors.card, borderColor: colors.border }]}>
                {mentionResults.slice(0, 4).map(user => (
                  <TouchableOpacity key={user.username} style={styles.mentionRow} onPress={() => selectMention(user)}>
                    <Image source={{ uri: user.profile_pic || DEFAULT_PIC }} style={{ width: 24, height: 24, borderRadius: 12 }} />
                    <Text style={[styles.mentionName, { color: colors.textPrimary }]}>@{user.username}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
        ) : (
          <TouchableOpacity style={[styles.guestInput, { backgroundColor: isDark ? '#1e293b' : '#f3f4f6' }]} onPress={() => Alert.alert('Sign in', 'Log in to comment')}>
            <Text style={{ color: colors.textSecondary, fontSize: 13 }}><Text style={{ fontWeight: '700', color: colors.primary }}>Log in</Text> to leave a comment</Text>
          </TouchableOpacity>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', height: 52, paddingHorizontal: 8, borderBottomWidth: StyleSheet.hairlineWidth },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '700', flex: 1 },
  loadingWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  listContent: { paddingBottom: 100 },
  commentRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, padding: 14, borderBottomWidth: StyleSheet.hairlineWidth },
  commentAvatar: { width: 32, height: 32, borderRadius: 16 },
  commentUser: { fontSize: 13, fontWeight: '700' },
  commentTime: { fontSize: 10 },
  commentText: { fontSize: 13, lineHeight: 18, marginTop: 2 },
  noComments: { textAlign: 'center', padding: 40, fontSize: 13 },
  bottomInput: { padding: 10, borderTopWidth: StyleSheet.hairlineWidth },
  inputRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  input: { flex: 1, borderRadius: 22, paddingHorizontal: 16, paddingVertical: 10, fontSize: 14 },
  sendBtn: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  mentionDropdown: { position: 'absolute', bottom: '100%', left: 0, right: 0, borderRadius: 12, borderWidth: 1, marginBottom: 4, overflow: 'hidden' },
  mentionRow: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 10 },
  mentionName: { fontSize: 13, fontWeight: '600' },
  guestInput: { borderRadius: 22, paddingVertical: 12, paddingHorizontal: 16, alignItems: 'center' },
});
