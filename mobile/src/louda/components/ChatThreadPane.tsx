import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  Keyboard,
  Platform,
} from 'react-native';
import { Ripple } from '../../components/Ripple';
import { useLoudaStore } from '../store';
import { useLoudaTheme } from './primitives';
import { Icons } from '../icons';
import { ChatHeader } from './ChatHeader';
import { InChatSearch } from './InChatSearch';
import { ChatMessages } from './ChatMessages';
import { ChatInput } from './ChatInput';
import { formatTimeAgo } from '../utils';
import { chatMessagesJumpRef } from '../bus';

// Port of the chat window (LoudaApp.jsx:9047-9191)
export function ChatThreadPane() {
  const {
    selectedChat,
    user,
    contacts,
    statuses,
    typingRegistry,
    messages,
    blockedUsers,
    chatBgs,
    connectionState,
    showChatSearch,
    replyTo,
    editingMessage,
    translations,
    hasMoreMessages,
    setSelectedChat,
    setShowChatSearch,
    setShowSettings,
    setShowAddContact,
    setShowChatInfo,
    setActiveTab,
    setPhoneInput,
    handleViewProfile,
    handleLoadMore,
    handleSend,
    handleTyping,
    handleEditMessage,
    setReplyTo,
    setEditingMessage,
    handleForwardInitiate,
    handleViewInfo,
    onDeleteMessage,
    setMediaView,
    setViewerStatusId,
    messagesLoading,
    pendingComposerFocus,
    setPendingComposerFocus,
  } = useLoudaStore();
  const { isDark, p } = useLoudaTheme();

  const chat = selectedChat;

  // Consume the push-tap focus intent: ChatInput focuses on the true edge, so
  // flip it back to false once the caret is in place.
  useEffect(() => {
    if (!pendingComposerFocus) return;
    const t = setTimeout(() => setPendingComposerFocus(false), 2000);
    return () => clearTimeout(t);
  }, [pendingComposerFocus, setPendingComposerFocus]);
  const chatKey = useMemo(() => {
    if (!chat) return undefined;
    return chat.isGroup ? chat.id : (chat.chatId ?? chat.id);
  }, [chat]);

  const statusInfo = useMemo(() => {
    if (!chat) return { statusText: '', isOnline: false };
    if (chat.isGroup) return { statusText: '', isOnline: false };
    if (chat.is_system === 'ai') return { statusText: 'Online', isOnline: true };
    const c = contacts.find((x: any) => x.id === chat.id);
    const statusText = c
      ? c.statusText
      : chat.statusText ||
        (chat.online
          ? 'Online'
          : chat.last_seen
            ? 'Last seen ' + formatTimeAgo(chat.last_seen)
            : 'Offline');
    return { statusText, isOnline: c ? c.online : !!chat.online };
  }, [chat, contacts]);

  const hasUnviewedStatus = useMemo(() => {
    if (!chat || chat.isGroup) return false;
    return statuses.some(
      (s: any) =>
        s.user_id === chat.id &&
        new Date(s.expires_at) > new Date() &&
        (!s.views || !s.views.some((v: any) => (v.user_id ?? v.userId) === user?.id)),
    );
  }, [chat, statuses, user?.id]);

  const typingArr = chat ? typingRegistry[chat.id] : undefined;
  const isTyping = !!typingArr?.length;
  const adminOnly =
    !!chat?.isGroup &&
    !!chat?.settings?.admin_only &&
    String(chat.admin_id) !== String(user?.id);

  const visibleMessages = useMemo(
    () => messages.filter((m: any) => !blockedUsers.includes(String(m.from))),
    [messages, blockedUsers],
  );

  // Stable callbacks (before the early return — hooks rule): inline lambdas
  // here would churn every render and defeat ChatMessages/MessageBubble memos.
  const onViewProfileUser = useCallback(
    (uid: string) => {
      const c = contacts.find((x: any) => x.id === uid);
      if (c) handleViewProfile(c);
      else handleViewProfile({ id: uid, name: 'User ' + uid });
    },
    [contacts, handleViewProfile],
  );

  const handleAddContact = useCallback((phone: string) => {
    setPhoneInput(phone);
    setShowAddContact(true);
  }, []);

  // Android 15 / edge-to-edge breaks softwareKeyboardLayoutMode=resize
  // (Expo SDK 57 targets API 35): the keyboard overlays the window instead
  // of resizing it, so the input sits underneath. Measure how much of this
  // pane the keyboard covers and pad the root by exactly that much
  // (clamped → 0 when the OS does resize properly). iOS keeps KAV 'padding'.
  const rootRef = useRef<View>(null);
  const [kbPad, setKbPad] = useState(0);

  useEffect(() => {
    if (Platform.OS !== 'android') return;
    let t1: ReturnType<typeof setTimeout> | undefined;
    let t2: ReturnType<typeof setTimeout> | undefined;
    const show = Keyboard.addListener('keyboardDidShow', (e: any) => {
      const apply = () => {
        rootRef.current?.measureInWindow((_x, y, _w, h) => {
          // bottom edge of the pane minus keyboard top = overlap to absorb
          const overlap = y + h - (e.endCoordinates?.screenY ?? 0);
          setKbPad(overlap > 0 ? Math.ceil(overlap) : 0);
        });
      };
      apply();
      // Re-measure while the keyboard/frame settles (animation + input growth)
      t1 = setTimeout(apply, 120);
      t2 = setTimeout(apply, 350);
    });
    const hide = Keyboard.addListener('keyboardDidHide', () => setKbPad(0));
    return () => {
      show.remove();
      hide.remove();
      if (t1) clearTimeout(t1);
      if (t2) clearTimeout(t2);
    };
  }, []);

  if (!chat || !chatKey) return null;

  return (
    <View
      ref={rootRef}
      style={[s.root, kbPad > 0 ? { paddingBottom: kbPad } : null]}
    >
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={0}
      >
      <ChatHeader
        chat={chat}
        hasUnviewedStatus={hasUnviewedStatus}
        isTyping={isTyping}
        statusText={statusInfo.statusText}
        isOnline={statusInfo.isOnline}
        onBack={() => {
          setShowChatSearch(false);
          setSelectedChat(null);
        }}
        onOpenArchived={() => {
          setActiveTab('archived');
          setSelectedChat(null);
        }}
        onShowChatInfo={() => setShowChatInfo(true)}
        isGroup={!!chat.isGroup}
        onViewProfile={handleViewProfile}
        onSearchClick={() => setShowChatSearch(!showChatSearch)}
      />

      {/* Connection State Banner (LoudaApp.jsx:9081-9089) */}
      {connectionState !== 'connected' && (
        <View
          style={[
            s.connBanner,
            {
              backgroundColor:
                connectionState === 'disconnected'
                  ? 'rgba(239,68,68,0.1)'
                  : 'rgba(245,158,11,0.1)',
            },
          ]}
        >
          {connectionState === 'disconnected' ? (
            <Text style={[s.connText, { color: '#dc2626' }]}>
              Connection lost. Waiting to reconnect...
            </Text>
          ) : (
            <Text style={[s.connText, { color: '#d97706' }]}>Reconnecting...</Text>
          )}
        </View>
      )}

      {/* Pinned message banner (LoudaApp.jsx:9092-9107) */}
      {messages.some((m: any) => m.is_pinned) && (
        <Ripple
          activeOpacity={0.8}
          style={[
            s.pinnedBanner,
            {
              backgroundColor: isDark ? p.card : '#fffbeb',
              borderColor: isDark ? p.border : '#fde68a',
            },
          ]}
          onPress={() => {
            const pinned = messages.find((m: any) => m.is_pinned);
            if (pinned) {
              // jump handled via InChatSearch-style dispatch: reuse messages map
              // through a custom event the ChatMessages listens for
              chatMessagesJumpRef.current?.(pinned.id);
            }
          }}
        >
          <Icons.pin size={12} color={isDark ? '#f59e0b' : '#b45309'} />
          <Text
            numberOfLines={1}
            style={[s.pinnedText, { color: isDark ? '#fbbf24' : '#b45309' }]}
          >
            {(messages.find((m: any) => m.is_pinned)?.text || 'Pinned message').slice(0, 60)}
          </Text>
          <Text style={[s.pinnedLabel, { color: isDark ? '#fbbf24' : '#b45309' }]}>
            PINNED
          </Text>
        </Ripple>
      )}

      {/* In-Chat Search (LoudaApp.jsx:9110-9124) */}
      {showChatSearch && (
        <InChatSearch
          chatId={chatKey}
          isGroup={!!chat.isGroup}
          onClose={() => setShowChatSearch(false)}
          onJumpToMessage={(msgId) => chatMessagesJumpRef.current?.(msgId)}
        />
      )}

      <ChatMessages
        messages={visibleMessages}
        isLoading={messagesLoading}
        wallpaper={chatBgs[chat.id]}
        members={chat.members}
        membersMap={chat.membersMap}
        userId={user?.id}
        isGroup={!!chat.isGroup}
        isAdmin={String(chat.admin_id) === String(user?.id)}
        chatId={chatKey}
        onDeleteMessage={onDeleteMessage}
        typingUsers={typingArr}
        onReply={setReplyTo}
        onForward={handleForwardInitiate}
        lazyLoadEnabled={user?.preferences?.media?.lazy_load_images}
        onLoadMore={handleLoadMore}
        hasMore={hasMoreMessages}
        translations={translations}
        userVoice={user?.preferences?.preferred_voice || 'Zainab'}
        onViewInfo={handleViewInfo}
        onViewProfile={onViewProfileUser}
        onViewMedia={setMediaView}
        chatName={chat.name}
        userName={user?.full_name || user?.username}
        user={user}
        onEdit={setEditingMessage}
        onAddContact={handleAddContact}
        onOpenStatus={setViewerStatusId}
      />

      {adminOnly ? (
        <View style={[s.adminBar, { backgroundColor: isDark ? p.cardMuted : '#f3f4f6', borderTopColor: isDark ? p.border : '#e5e7eb' }]}>
          <Text style={[s.adminBarText, { color: isDark ? p.textMuted : '#6b7280' }]}>
            Only admins can send messages in this group.
          </Text>
        </View>
      ) : (
        <ChatInput
          onSend={handleSend}
          onTyping={handleTyping}
          userId={user?.id}
          chatId={chatKey}
          isGroup={!!chat.isGroup}
          replyTo={replyTo}
          onCancelReply={() => setReplyTo(null)}
          editingMessage={editingMessage}
          onCancelEdit={() => setEditingMessage(null)}
          onEdit={handleEditMessage}
          focusComposer={pendingComposerFocus}
        />
      )}
      </KeyboardAvoidingView>
    </View>
  );
}

// Cross-component jump helper lives in ../bus (InChatSearch / pinned banner -> ChatMessages)

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: 'transparent' },
  connBanner: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  connText: { fontSize: 11, fontWeight: '800' },
  pinnedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  pinnedText: { flex: 1, fontSize: 11, fontWeight: '700' },
  pinnedLabel: { fontSize: 9, fontWeight: '900', letterSpacing: 1, opacity: 0.6 },
  adminBar: {
    padding: 16,
    alignItems: 'center',
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  adminBarText: { fontSize: 14, fontWeight: '700' },
});
