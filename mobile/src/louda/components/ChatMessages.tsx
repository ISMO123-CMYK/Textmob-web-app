import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  LayoutChangeEvent,
  Keyboard,
  Platform,
  Image,
  ActivityIndicator,
  useWindowDimensions,
} from 'react-native';
import { Ripple } from '../../components/Ripple';
import * as Clipboard from 'expo-clipboard';
import { useLoudaTheme, ContextMenu } from './primitives';
import { Icons } from '../icons';
import { MessageBubble } from './MessageBubble';
import { ReadByModal } from './ReadByModal';
import { JumpToLatest } from './LazyImage';
import { bulkDeleteMessages } from '../api';
import { emitLoudaSocket } from '../socket';
import { playTTS, loudaAlert } from '../utils';
import { chatMessagesJumpRef } from '../bus';

const QUICK_REACTIONS = ['👍', '❤️', '😂', '😮', '😢', '🙏', '🔥', '👎'];

function ReactionPicker({
  onReact,
  onClose,
}: {
  onReact: (emoji: string) => void;
  onClose: () => void;
}) {
  const { p } = useLoudaTheme();
  return (
    <View style={[s.reactionPicker, { backgroundColor: p.card, borderColor: p.borderLight }]}>
      {QUICK_REACTIONS.map((emoji) => (
        <Ripple
          key={emoji}
          onPress={() => {
            onReact(emoji);
            onClose();
          }}
          style={s.reactionBtn}
        >
          <Text style={{ fontSize: 18 }}>{emoji}</Text>
        </Ripple>
      ))}
    </View>
  );
}

// Port of ChatMessages (LoudaApp.jsx:1807-2179)
export function ChatMessages({
  messages,
  userId,
  isGroup,
  isAdmin,
  chatId,
  onDeleteMessage: _onDeleteMessage,
  typingUsers,
  onReply,
  onForward,
  lazyLoadEnabled,
  onLoadMore,
  hasMore,
  membersMap,
  members,
  translations,
  userVoice,
  onViewInfo,
  onEdit,
  onViewMedia,
  onViewProfile,
  chatName,
  userName,
  user,
  onAddContact,
  onOpenStatus,
  wallpaper,
  isLoading,
}: {
  messages: any[];
  isLoading?: boolean;
  userId?: string;
  isGroup?: boolean;
  isAdmin?: boolean;
  chatId?: string;
  onDeleteMessage?: (id: string) => void;
  typingUsers?: string[];
  onReply?: (r: any) => void;
  onForward?: (payload: any) => void;
  lazyLoadEnabled?: boolean;
  onLoadMore?: () => void;
  hasMore?: boolean;
  membersMap?: any;
  members?: any[];
  translations?: Record<string, string>;
  userVoice?: string;
  onViewInfo?: (m: any) => void;
  onEdit?: (m: any) => void;
  onViewMedia?: (m: { src: string; type: string }) => void;
  onViewProfile?: (userId: string) => void;
  chatName?: string;
  userName?: string;
  user?: any;
  onAddContact?: (phone: string) => void;
  onOpenStatus?: (statusId: string) => void;
  wallpaper?: string;
}) {
  const { p } = useLoudaTheme();
  const { width } = useWindowDimensions();
  const [readByMessage, setReadByMessage] = useState<any>(null);
  const [selectedMessages, setSelectedMessages] = useState<Set<string>>(new Set());
  const [selectionMode, setSelectionMode] = useState(false);
  const [showReactionPicker, setShowReactionPicker] = useState(false);
  const [dropdownPos, setDropdownPos] = useState<{ x: number; y: number } | null>(null);
  const [highlightId, setHighlightId] = useState<string | null>(null);
  const [showJump, setShowJump] = useState(false);
  const [atTop, setAtTop] = useState(false);

  const scrollRef = useRef<ScrollView>(null);
  const positionsRef = useRef<Map<string, number>>(new Map());
  const viewportH = useRef(1);
  const contentH = useRef(1);
  const offsetRef = useRef(0);
  const initialDone = useRef(false);
  const chatChangedRef = useRef(chatId);
  const restoreRef = useRef<{ prevH: number; prevOffset: number } | null>(null);
  const loadingMoreRef = useRef(false);
  const unreadRef = useRef<View>(null);

  if (chatChangedRef.current !== chatId) {
    chatChangedRef.current = chatId;
    initialDone.current = false;
    positionsRef.current = new Map();
  }

  const toggleSelect = useCallback(
    (msgId: string, isLongPress?: boolean) => {
      if (isLongPress && !selectionMode) {
        setSelectionMode(true);
        setSelectedMessages(new Set([msgId]));
        return;
      }
      if (!selectionMode) return;
      setSelectedMessages((prev) => {
        const next = new Set(prev);
        if (next.has(msgId)) next.delete(msgId);
        else next.add(msgId);
        if (next.size === 0) setSelectionMode(false);
        return next;
      });
    },
    [selectionMode],
  );

  const exitSelection = () => {
    setSelectionMode(false);
    setSelectedMessages(new Set());
    setShowReactionPicker(false);
    setDropdownPos(null);
  };

  const getSelectedTexts = () =>
    messages.filter((m) => selectedMessages.has(m.id) && m.text).map((m: any) => m.text);

  const handleBulkDelete = async () => {
    const ids = [...selectedMessages];
    try {
      const res = await bulkDeleteMessages({ chatId, messageIds: ids, isGroup, userId });
      if ((res as any)?.ok !== false) exitSelection();
      else loudaAlert({ title: 'Error', message: (res as any)?.error || 'Failed to delete' });
    } catch {
      loudaAlert({ title: 'Error', message: 'Failed to delete' });
    }
  };

  const handleBulkCopy = async () => {
    const texts = getSelectedTexts();
    if (texts.length > 0) await Clipboard.setStringAsync(texts.join('\n'));
    exitSelection();
    loudaAlert({ title: 'Copied', message: `${texts.length} message(s) copied` });
  };

  const handleBulkForward = () => {
    const selectedMsgs = messages.filter((m: any) => selectedMessages.has(m.id));
    if (selectedMsgs.length > 0) {
      onForward?.({
        texts: selectedMsgs.filter((m: any) => m.text).map((m: any) => m.text),
        messageIds: [...selectedMessages],
        messages: selectedMsgs,
      });
    }
    exitSelection();
  };

  const handleReact = (emoji: string) => {
    if (selectedMessages.size !== 1) return;
    const messageId = [...selectedMessages][0];
    emitLoudaSocket('react-to-message', { chatId, messageId, emoji, isGroup });
    exitSelection();
  };

  const handlePinToggle = () => {
    if (selectedMessages.size !== 1) return;
    const messageId = [...selectedMessages][0];
    const msg = messages.find((m: any) => m.id === messageId);
    if (!msg) return;
    if (msg.is_pinned) emitLoudaSocket('unpin-message', { chatId, messageId, isGroup });
    else emitLoudaSocket('pin-message', { chatId, messageId, isGroup });
    exitSelection();
  };

  // Unread Divider Logic (LoudaApp.jsx:1889-1900)
  const firstUnreadIndex = useMemo(() => {
    if (!messages.length) return -1;
    return messages.findIndex((m: any) => {
      if (m.from === userId) return false;
      if (isGroup) {
        if (!m.read_by) return true;
        return !m.read_by.some((r: any) => (typeof r === 'object' ? r.userId : r) === userId);
      }
      return m.status !== 'read';
    });
  }, [messages, userId, isGroup]);

  const jumpToMessage = useCallback(
    (id: string) => {
      const y = positionsRef.current.get(id);
      if (y == null) return;
      scrollRef.current?.scrollTo({
        y: Math.max(0, y - viewportH.current / 2),
        animated: true,
      });
      setHighlightId(id);
      setTimeout(() => setHighlightId((cur) => (cur === id ? null : cur)), 2000);
    },
    [],
  );

  // Expose jump for pinned banner / InChatSearch (web scrollIntoView parity)
  useEffect(() => {
    chatMessagesJumpRef.current = jumpToMessage;
    return () => {
      chatMessagesJumpRef.current = null;
    };
  }, [jumpToMessage]);

  const handleJumpReply = useCallback(
    (replyTo: any) => {
      if (replyTo?.quotedStatusId) {
        onOpenStatus?.(replyTo.quotedStatusId);
        return;
      }
      if (replyTo?.id) jumpToMessage(replyTo.id);
    },
    [onOpenStatus, jumpToMessage],
  );

  // Stable "read by" opener — an inline () => setReadByMessage(msg) here
  // would hand MessageBubble a fresh function every render and defeat its
  // React.memo.
  const showReadBy = useCallback((m: any) => setReadByMessage(m), []);

  // Initial positioning: bottom on open (or unread divider), like web
  useEffect(() => {
    if (initialDone.current || messages.length === 0) return;
    const t = setTimeout(() => {
      initialDone.current = true;
      if (firstUnreadIndex !== -1) {
        const y = positionsRef.current.get(messages[firstUnreadIndex]?.id);
        if (y != null) {
          scrollRef.current?.scrollTo({
            y: Math.max(0, y - viewportH.current / 2),
            animated: false,
          });
          return;
        }
      }
      scrollRef.current?.scrollTo({ y: Math.max(0, contentH.current - viewportH.current), animated: false });
    }, 150);
    return () => clearTimeout(t);
  }, [messages, firstUnreadIndex]);

  // Follow keyboard: keep messages pinned to bottom when user is already near it
  useEffect(() => {
    const ev = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const sub = Keyboard.addListener(ev, () => {
      if (offsetRef.current >= contentH.current - viewportH.current - 200) {
        requestAnimationFrame(() =>
          scrollRef.current?.scrollToEnd({ animated: false }),
        );
      }
    });
    return () => sub.remove();
  }, []);

  // Auto-scroll to first unread once it appears
  useEffect(() => {
    if (firstUnreadIndex === -1 || !initialDone.current) return;
    const id = messages[firstUnreadIndex]?.id;
    if (!id) return;
    const t = setTimeout(() => jumpToMessage(id), 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [firstUnreadIndex]);

  const triggerLoadMore = () => {
    if (!hasMore || loadingMoreRef.current || !onLoadMore) return;
    loadingMoreRef.current = true;
    restoreRef.current = { prevH: contentH.current, prevOffset: offsetRef.current };
    onLoadMore();
    setTimeout(() => {
      loadingMoreRef.current = false;
    }, 800);
  };

  const onContentSizeChange = (_w: number, h: number) => {
    const prev = restoreRef.current;
    if (prev && h > prev.prevH) {
      restoreRef.current = null;
      const added = h - prev.prevH;
      scrollRef.current?.scrollTo({ y: prev.prevOffset + added, animated: false });
    }
    contentH.current = h;
  };

  const handleScroll = (e: any) => {
    const { contentOffset, contentSize, layoutMeasurement } = e.nativeEvent;
    offsetRef.current = contentOffset.y;
    contentH.current = contentSize.height;
    viewportH.current = layoutMeasurement.height;
    if (contentOffset.y <= 4 && hasMore) triggerLoadMore();
    const distFromBottom = contentSize.height - contentOffset.y - layoutMeasurement.height;
    setShowJump(distFromBottom > 200);
    setAtTop(contentOffset.y <= 4);
  };

  const singleSelectedMessage =
    selectedMessages.size === 1
      ? messages.find((m: any) => m.id === [...selectedMessages][0])
      : null;

  const handleReplySingle = () => {
    if (singleSelectedMessage && onReply) {
      let resolvedName: any = singleSelectedMessage.senderName;
      if (!resolvedName && membersMap) {
        const member = membersMap[singleSelectedMessage.from];
        resolvedName = typeof member === 'object' ? member.name : member;
      }
      if (!resolvedName && members)
        resolvedName = members.find((m: any) => m.user_id === singleSelectedMessage.from)?.nickname;
      if (!resolvedName && !isGroup)
        resolvedName =
          singleSelectedMessage.from === userId
            ? userName || 'You'
            : chatName || 'Contact';
      if (!resolvedName) resolvedName = 'User';
      onReply({
        id: singleSelectedMessage.id,
        text: singleSelectedMessage.text,
        from: singleSelectedMessage.from,
        fromName: resolvedName,
      });
    }
    exitSelection();
  };

  const canDeleteAll = useMemo(() => {
    for (const msgId of selectedMessages) {
      const msg = messages.find((m: any) => m.id === msgId);
      if (!msg) continue;
      const isOwner = msg.from === userId;
      const isAllowed = isOwner || (isGroup && isAdmin);
      if (!isAllowed) return false;
    }
    return true;
  }, [selectedMessages, messages, userId, isGroup, isAdmin]);

  const formatDateLabel = (ts: string) => {
    const d = new Date(ts);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    if (d.toDateString() === today.toDateString()) return 'Today';
    if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';
    return d.toLocaleDateString(undefined, {
      weekday: 'long',
      month: 'short',
      day: 'numeric',
    });
  };

  const unreadCount = useMemo(() => {
    if (firstUnreadIndex === -1) return 0;
    return messages.slice(firstUnreadIndex).filter((m: any) => {
      if (m.from === userId) return false;
      if (isGroup) return !m.read_by || !m.read_by.some((r: any) => (typeof r === 'object' ? r.userId : r) === userId);
      return m.status !== 'read';
    }).length;
  }, [messages, firstUnreadIndex, userId, isGroup]);

  const dropdownOptions = useMemo(() => {
    if (!singleSelectedMessage) return [];
    const opts: any[] = [];
    if (onViewInfo)
      opts.push({
        label: 'Message Info',
        icon: <Icons.info size={16} color={p.textMuted} />,
        onClick: () => {
          onViewInfo(singleSelectedMessage);
          exitSelection();
        },
      });
    opts.push({
      label: 'Read Aloud',
      icon: <Icons.volume size={16} color={p.textMuted} />,
      onClick: () => {
        playTTS(singleSelectedMessage.text, userVoice);
        exitSelection();
      },
    });
    if (singleSelectedMessage.from === userId && onEdit)
      opts.push({
        label: 'Edit Message',
        icon: <Icons.edit size={16} color="#2563eb" />,
        onClick: () => {
          onEdit(singleSelectedMessage);
          exitSelection();
        },
      });
    return opts;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [singleSelectedMessage, onViewInfo, onEdit, userVoice, userId]);

  return (
    <>
      {selectionMode && (
        <View style={[s.selectionBar, { backgroundColor: p.card, borderBottomColor: p.borderLight }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <Ripple onPress={exitSelection} style={s.selIcon} hitSlop={6}>
              <Icons.x size={20} color="#6b7280" />
            </Ripple>
            <Text style={[s.selCount, { color: p.accent }]}>{selectedMessages.size} selected</Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
            {singleSelectedMessage && (
              <Ripple onPress={handleReplySingle} style={s.selIcon} hitSlop={6}>
                <Icons.reply size={18} color="#6b7280" />
              </Ripple>
            )}
            {singleSelectedMessage && (
              <View>
                <Ripple
                  onPress={() => setShowReactionPicker((v) => !v)}
                  style={s.selIcon}
                  hitSlop={6}
                >
                  <Text style={{ fontSize: 18 }}>😊</Text>
                </Ripple>
                {showReactionPicker && (
                  <View style={{ position: 'absolute', top: 40, right: 0, zIndex: 60 }}>
                    <ReactionPicker onReact={handleReact} onClose={() => setShowReactionPicker(false)} />
                  </View>
                )}
              </View>
            )}
            {singleSelectedMessage && (
              <Ripple onPress={handlePinToggle} style={s.selIcon} hitSlop={6}>
                <Icons.pin
                  size={18}
                  color={singleSelectedMessage.is_pinned ? p.accent : '#6b7280'}
                />
              </Ripple>
            )}
            <Ripple onPress={handleBulkCopy} style={s.selIcon} hitSlop={6}>
              <Icons.copy size={18} color="#6b7280" />
            </Ripple>
            <Ripple onPress={handleBulkForward} style={s.selIcon} hitSlop={6}>
              <Icons.share size={18} color="#6b7280" />
            </Ripple>
            {canDeleteAll && (
              <Ripple onPress={handleBulkDelete} style={s.selIcon} hitSlop={6}>
                <Icons.trash size={18} color="#ef4444" />
              </Ripple>
            )}
            {singleSelectedMessage?.text && (
              <Ripple
                onPress={() => setDropdownPos({ x: width, y: 56 })}
                style={s.selIcon}
                hitSlop={6}
              >
                <Icons.more size={18} color="#6b7280" />
              </Ripple>
            )}
          </View>
        </View>
      )}

      <View style={{ flex: 1, backgroundColor: p.chatBg }} onLayout={(e) => (viewportH.current = e.nativeEvent.layout.height)}>
        {/* Chat wallpaper (web LoudaApp.jsx:9050 — bg-cover/bg-center over chatBg) */}
        {!!wallpaper && (
          <Image
            source={{ uri: wallpaper }}
            style={StyleSheet.absoluteFill}
            resizeMode="cover"
          />
        )}
        <ScrollView
          ref={scrollRef}
          style={{ flex: 1 }}
          contentContainerStyle={{ padding: 16, paddingBottom: 24 }}
          onScroll={handleScroll}
          scrollEventThrottle={64}
          onContentSizeChange={onContentSizeChange}
          keyboardShouldPersistTaps="handled"
        >
          {!!hasMore && (
            <Text style={[s.loadingMore, { color: p.textMuted }]}>Loading history...</Text>
          )}

          {isLoading && messages.length === 0 && (
            <View style={s.empty}>
              <ActivityIndicator size="large" color={p.accent} />
            </View>
          )}

          {messages.length === 0 && !hasMore && !isLoading && (
            <View style={s.empty}>
              <Text style={{ fontSize: 56, opacity: 0.3 }}>💬</Text>
              <Text style={[s.emptyTitle, { color: p.textMuted }]}>No messages yet</Text>
              <Text style={[s.emptySub, { color: p.textMuted }]}>
                Say hello to start the conversation!
              </Text>
            </View>
          )}

          {messages.map((msg: any, i: number) => {
            const isUnreadStart = i === firstUnreadIndex;
            const prevMsg = i > 0 ? messages[i - 1] : null;
            const nextMsg = i < messages.length - 1 ? messages[i + 1] : null;

            let showDateSeparator = false;
            if (i === 0) showDateSeparator = true;
            else if (prevMsg) {
              const currDate = new Date(msg.timestamp).toDateString();
              const prevDate = new Date(prevMsg.timestamp).toDateString();
              if (currDate !== prevDate) showDateSeparator = true;
            }

            const isSameSenderAsPrev =
              prevMsg &&
              prevMsg.from === msg.from &&
              !showDateSeparator &&
              !isUnreadStart;
            const isSameSenderAsNext =
              nextMsg &&
              nextMsg.from === msg.from &&
              new Date(nextMsg.timestamp).toDateString() === new Date(msg.timestamp).toDateString();
            const isFirstInGroup = !isSameSenderAsPrev;
            const isLastInGroup = !isSameSenderAsNext;

            return (
              <View
                key={msg.id || i}
                onLayout={(e: LayoutChangeEvent) => {
                  if (msg.id) positionsRef.current.set(msg.id, e.nativeEvent.layout.y);
                }}
                style={{ marginBottom: isLastInGroup ? 6 : 1 }}
                ref={isUnreadStart ? unreadRef : undefined}
                nativeID={msg.id ? `msg-${msg.id}` : undefined}
              >
                {showDateSeparator && (
                  <View style={s.dateRow}>
                    <Text style={[s.datePill, { backgroundColor: p.card, borderColor: p.borderLight, color: p.textMuted }]}>
                      {formatDateLabel(msg.timestamp)}
                    </Text>
                  </View>
                )}

                {isUnreadStart && (
                  <View style={s.unreadRow}>
                    <Text style={[s.unreadPill, { backgroundColor: '#dcfce7', color: '#166534' }]}>
                      {unreadCount} Unread Messages
                    </Text>
                  </View>
                )}

                <MessageBubble
                  message={msg}
                  isSentByMe={msg.from === userId}
                  onViewMedia={onViewMedia}
                  lazyLoadEnabled={lazyLoadEnabled}
                  isGroup={isGroup}
                  membersMap={membersMap}
                  onShowReadBy={showReadBy}
                  translatedText={translations?.[msg.id]}
                  userVoice={userVoice}
                  onViewProfile={onViewProfile}
                  isSelected={selectedMessages.has(msg.id)}
                  onSelect={toggleSelect}
                  selectionMode={selectionMode}
                  onReply={onReply}
                  bubbleDensity={
                    isSameSenderAsPrev
                      ? 'compact'
                      : user?.preferences?.ui?.bubbleDensity || 'comfortable'
                  }
                  showSenderName={isGroup && isFirstInGroup && msg.from !== userId}
                  onJumpToReply={handleJumpReply}
                  onAddContact={onAddContact}
                  highlighted={highlightId === msg.id}
                />
              </View>
            );
          })}

          {typingUsers && typingUsers.length > 0 && (
            <View style={s.typingRow}>
              <View style={[s.typingPill, { backgroundColor: p.cardMuted }]}>
                <View style={{ flexDirection: 'row', gap: 3, marginRight: 6 }}>
                  {[0, 1, 2].map((d) => (
                    <View
                      key={d}
                      style={[
                        s.typingDot,
                        {
                          backgroundColor: p.textMuted,
                          opacity: 1 - d * 0.3,
                        },
                      ]}
                    />
                  ))}
                </View>
                <Text style={[s.typingText, { color: p.textMuted }]}>
                  {typingUsers.length === 1
                    ? `${typingUsers[0]} is typing...`
                    : `${typingUsers.length} people are typing...`}
                </Text>
              </View>
            </View>
          )}
        </ScrollView>

        <JumpToLatest
          visible={showJump}
          onPress={() =>
            scrollRef.current?.scrollTo({
              y: Math.max(0, contentH.current - viewportH.current),
              animated: true,
            })
          }
        />
      </View>

      <ReadByModal
        readBy={readByMessage?.read_by}
        isOpen={!!readByMessage}
        onClose={() => setReadByMessage(null)}
        members={members}
      />

      <ContextMenu
        position={dropdownPos}
        options={dropdownOptions}
        onClose={() => setDropdownPos(null)}
      />
    </>
  );
}

const s = StyleSheet.create({
  selectionBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    zIndex: 40,
  },
  selIcon: { padding: 8, borderRadius: 12 },
  selCount: { fontSize: 16, fontWeight: '700' },
  reactionPicker: {
    flexDirection: 'row',
    gap: 4,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderWidth: StyleSheet.hairlineWidth,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
  reactionBtn: { padding: 4 },
  loadingMore: {
    textAlign: 'center',
    paddingVertical: 8,
    fontSize: 12,
  },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    opacity: 0.6,
    paddingTop: 160,
    gap: 6,
  },
  emptyTitle: {
    fontSize: 14,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 3,
  },
  emptySub: { fontSize: 12, marginTop: 4 },
  dateRow: { alignItems: 'center', marginVertical: 16 },
  datePill: {
    fontSize: 10,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 4,
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 999,
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 2,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
  unreadRow: { alignItems: 'center', marginVertical: 16 },
  unreadPill: {
    fontSize: 12,
    fontWeight: '700',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 999,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 2,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
  typingRow: { padding: 12, marginBottom: 16 },
  typingPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderTopLeftRadius: 0,
    alignSelf: 'flex-start',
  },
  typingDot: { width: 4, height: 4, borderRadius: 2 },
  typingText: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1 },
});
