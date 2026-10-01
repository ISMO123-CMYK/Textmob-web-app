import React, { memo, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  Animated,
  PanResponder,
} from 'react-native';
import { useLoudaTheme } from './primitives';
import { Icons } from '../icons';
import { DEFAULT_AVATAR } from '../constants';
import { parseRichText } from '../richText';
import { extractUrl, playTTS } from '../utils';
import { LazyImage } from './LazyImage';
import { LinkPreview } from './LinkPreview';
import { AudioPlayer } from './AudioPlayer';
import { VideoPlayer } from './VideoPlayer';
import { RichText } from './RichText';

const EMOJI_ONLY_RE =
  /^(?:(?:\ud83c[\udde6-\uddff]){2}|[\ud800-\udbff][\udc00-\udfff]|[\u2700-\u27bf]|[\u2600-\u26ff]|\u2b50|\u2b55|\u200d|\ufe0f|\s)+$/;

function gridItems(count: number) {
  const n = Math.min(count, 4);
  if (n === 1) return [{ w: 250, h: 250 }];
  if (n === 2) return [{ w: 124, h: 124 }, { w: 124, h: 124 }];
  if (n === 3)
    return [
      { w: 124, h: 250 },
      { w: 124, h: 124 },
      { w: 124, h: 124 },
    ];
  return [
    { w: 124, h: 124 },
    { w: 124, h: 124 },
    { w: 124, h: 124 },
    { w: 124, h: 124 },
  ];
}

// Port of MessageBubble (LoudaApp.jsx:1534-1805)
export const MessageBubble = memo(function MessageBubble({
  message,
  isSentByMe,
  isGroup,
  onShowReadBy,
  translatedText,
  userVoice,
  onViewMedia,
  lazyLoadEnabled,
  onViewProfile,
  isSelected,
  onSelect,
  selectionMode,
  onReply,
  bubbleDensity = 'comfortable',
  showSenderName,
  membersMap,
  onJumpToReply,
  onAddContact,
  highlighted,
}: {
  message: any;
  isSentByMe?: boolean;
  isGroup?: boolean;
  onShowReadBy?: () => void;
  translatedText?: string | null;
  userVoice?: string;
  onViewMedia?: (m: { src: string; type: string }) => void;
  lazyLoadEnabled?: boolean;
  onViewProfile?: (userId: string) => void;
  isSelected?: boolean;
  onSelect?: (id: string, isLongPress?: boolean) => void;
  selectionMode?: boolean;
  onReply?: (r: { id: string; text?: string; from: string; fromName?: string }) => void;
  bubbleDensity?: 'compact' | 'comfortable' | 'spacious';
  showSenderName?: boolean;
  membersMap?: any;
  onJumpToReply?: (replyTo: any) => void;
  onAddContact?: (phone: string) => void;
  highlighted?: boolean;
}) {
  const { p } = useLoudaTheme();
  const {
    id,
    from,
    text,
    type,
    timestamp,
    media,
    sticker_url,
    status,
    senderName,
    reply_to,
    reactions,
    is_pinned,
    is_edited,
  } = message;
  const [revealedMedia, setRevealedMedia] = useState<Record<number, boolean>>({});
  const [hideTranslation, setHideTranslation] = useState(false);
  const swipe = useRef(new Animated.Value(0)).current;
  const highlight = useRef(new Animated.Value(0)).current;

  const resolvedSenderName = useMemo(() => {
    if (senderName) return senderName;
    return from === 'Me' ? 'Me' : 'Contact';
  }, [senderName, from]);

  // PanResponder is created once; keep latest props reachable from its handlers
  const latest = useRef<any>({});
  latest.current = {
    selectionMode,
    onReply,
    id,
    text,
    from,
    resolvedSenderName,
  };

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, g) =>
        !latest.current.selectionMode && g.dx > 8 && Math.abs(g.dx) > Math.abs(g.dy),
      onPanResponderMove: (_, g) => {
        if (g.dx > 0) swipe.setValue(Math.min(g.dx * 0.5, 70));
      },
      onPanResponderRelease: (_, g) => {
        const offset = Math.min(g.dx * 0.5, 70);
        const cur = latest.current;
        if (offset >= 50 && cur.onReply) {
          cur.onReply({
            id: cur.id,
            text: cur.text,
            from: cur.from,
            fromName: cur.resolvedSenderName,
          });
        }
        Animated.spring(swipe, { toValue: 0, useNativeDriver: true, speed: 28 }).start();
      },
      onPanResponderTerminate: () => {
        Animated.spring(swipe, { toValue: 0, useNativeDriver: true, speed: 28 }).start();
      },
    }),
  ).current;

  // Web flash-highlight: accent-tinted background fading out over 2s
  useEffect(() => {
    if (highlighted) {
      highlight.setValue(1);
      Animated.timing(highlight, {
        toValue: 0,
        duration: 2000,
        useNativeDriver: false,
      }).start();
    } else {
      highlight.setValue(0);
    }
  }, [highlighted, highlight]);

  const swipeIconOpacity = swipe.interpolate({
    inputRange: [0, 20, 60],
    outputRange: [0, 0, 1],
    extrapolate: 'clamp',
  });

  const margin = bubbleDensity === 'compact' ? 2 : bubbleDensity === 'spacious' ? 12 : 6;
  const bubblePad =
    bubbleDensity === 'compact'
      ? { paddingVertical: 2, paddingHorizontal: 8, fontSize: 13 }
      : bubbleDensity === 'spacious'
        ? { paddingVertical: 10, paddingHorizontal: 14, fontSize: 14 }
        : { paddingVertical: 4, paddingHorizontal: 8, fontSize: 13.5 };

  const mediaItems = media && media.length > 0 && type !== 'sticker' && !sticker_url;
  const onlyVoice =
    mediaItems &&
    media.length === 1 &&
    (media[0].type === 'voice' || media[0].type === 'audio') &&
    !text;

  const url = text ? extractUrl(text) : null;

  const trimmed = (text || '').trim();
  const isOnlyEmoji = trimmed.length > 0 && EMOJI_ONLY_RE.test(trimmed.replace(/\s/g, ''));
  const emojiCount = isOnlyEmoji ? [...trimmed.replace(/\s/g, '')].length : 0;

  const renderText = () => {
    if (!text) return null;
    // Web only special-cases 1-3 emojis (text-5xl/4xl/3xl); 4+ falls through
    // to the normal 15px render (LoudaApp.jsx:1702-1716)
    if (isOnlyEmoji && emojiCount >= 1 && emojiCount <= 3) {
      const size = emojiCount === 1 ? 48 : emojiCount === 2 ? 36 : 24;
      return (
        <Text
          selectable
          style={{ fontSize: size, lineHeight: size * 1.3, paddingHorizontal: 4, paddingVertical: 8 }}
        >
          {text}
        </Text>
      );
    }
    return (
      <View style={{ paddingHorizontal: 4 }}>
        <RichText html={parseRichText(text)} onAddContact={onAddContact} />
      </View>
    );
  };

  const replyName =
    reply_to?.quotedStatusId != null ? 'Status' : reply_to?.fromName;

  const rowBg = highlighted
    ? highlight.interpolate({
        inputRange: [0, 1],
        outputRange: ['transparent', `${p.accent}40`],
      })
    : isSelected
      ? 'rgba(59,130,246,0.1)'
      : 'transparent';

  return (
    <Animated.View
      style={[
        s.row,
        {
          marginBottom: margin,
          justifyContent: isSentByMe ? 'flex-end' : 'flex-start',
          backgroundColor: rowBg as any,
          transform: [{ translateX: swipe }],
        },
      ]}
      {...panResponder.panHandlers}
    >
      {/* Swipe-to-reply affordance (LoudaApp.jsx:1588-1594) */}
      <Animated.View
        pointerEvents="none"
        style={[s.swipeIcon, { opacity: swipeIconOpacity }]}
      >
        <View style={[s.swipeIconCircle, { backgroundColor: `${p.accent}1A` }]}>
          <Icons.reply size={16} color={p.accent} />
        </View>
      </Animated.View>
      {!isSentByMe && isGroup && (
        <View style={s.avatarCol}>
          {showSenderName ? (
            <TouchableOpacity onPress={() => onViewProfile?.(from)} activeOpacity={0.8}>
              <Image
                source={{ uri: membersMap?.[from]?.avatar_url || DEFAULT_AVATAR }}
                style={s.groupAvatar}
              />
            </TouchableOpacity>
          ) : null}
        </View>
      )}

      <TouchableOpacity
        activeOpacity={0.9}
        onPress={() => (selectionMode ? onSelect?.(id) : undefined)}
        onLongPress={() => onSelect?.(id, true)}
        delayLongPress={280}
        style={[
          s.col,
          { alignItems: isSentByMe ? 'flex-end' : 'flex-start' },
        ]}
      >
        <View
          style={[
            s.bubble,
            bubblePad,
            {
              backgroundColor: isSentByMe ? p.accent : p.card,
              borderTopRightRadius: isSentByMe ? 4 : 16,
              borderTopLeftRadius: isSentByMe ? 16 : 4,
              shadowColor: '#000',
              shadowOpacity: isSentByMe ? 0.06 : 0.04,
              shadowRadius: 1,
              shadowOffset: { width: 0, height: 1 },
              elevation: 1,
              borderWidth: isSelected ? 2 : 0,
              borderColor: isSelected ? '#60a5fa' : 'transparent',
            },
            highlighted
              ? { backgroundColor: 'rgba(230,74,25,0.4)' }
              : null,
          ]}
        >
          {showSenderName && (
            <TouchableOpacity onPress={() => onViewProfile?.(from)} activeOpacity={0.7}>
              <Text style={[s.senderName, { color: p.accent }]}>{resolvedSenderName}</Text>
            </TouchableOpacity>
          )}

          {reply_to && (
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => onJumpToReply?.(reply_to)}
              style={[s.replyBlock, { borderColor: p.accent, backgroundColor: 'rgba(0,0,0,0.05)' }]}
            >
              <Text style={[s.replyName, { color: p.accent }]} numberOfLines={1}>
                {replyName}
              </Text>
              <Text style={[s.replyText, { color: p.textMuted }]} numberOfLines={1}>
                {reply_to.text
                  ? reply_to.text.length > 60
                    ? reply_to.text.slice(0, 60) + '...'
                    : reply_to.text
                  : 'Media Message'}
              </Text>
            </TouchableOpacity>
          )}

          {mediaItems && (
            <View
              style={[
                onlyVoice ? { paddingVertical: 4 } : s.mediaGrid,
                !onlyVoice && { maxWidth: 250, marginBottom: 4, borderRadius: 12, overflow: 'hidden' },
              ]}
            >
              {media.slice(0, 4).map((m: any, i: number) => {
                const isLazy = lazyLoadEnabled && !revealedMedia[i];
                const dims = gridItems(Math.min(media.length, 4))[i];
                if (m.type === 'voice' || m.type === 'audio') {
                  if (isLazy) return <RevealButton key={i} label="Show Audio" onReveal={() => setRevealedMedia((s) => ({ ...s, [i]: true }))} />;
                  return (
                    <View key={i} style={{ width: 250, paddingVertical: 2 }}>
                      <AudioPlayer src={m.url} />
                    </View>
                  );
                }
                if (isLazy)
                  return (
                    <RevealButton
                      key={i}
                      label={`Show ${m.type === 'video' ? 'Video' : 'Image'}`}
                      width={dims?.w}
                      height={dims?.h}
                      onReveal={() => setRevealedMedia((s) => ({ ...s, [i]: true }))}
                    />
                  );
                return (
                  <TouchableOpacity
                    key={i}
                    activeOpacity={0.85}
                    onPress={() => onViewMedia?.({ src: m.url, type: m.type })}
                    style={[dims && { width: dims.w, height: dims.h }, s.mediaItem]}
                  >
                    {m.type === 'video' ? (
                      <VideoPlayer src={m.url} previewMode onPress={() => onViewMedia?.({ src: m.url, type: m.type })} />
                    ) : m.type === 'file' || m.type === 'document' ? (
                      <View style={s.fileItem}>
                        <Icons.file size={28} color="#2563eb" />
                        <Text numberOfLines={1} style={s.fileName}>
                          {m.name || 'Document'}
                        </Text>
                      </View>
                    ) : (
                      <LazyImage
                        src={m.url}
                        style={{ width: '100%', height: '100%' }}
                        contentFit="contain"
                      />
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          )}

          {(type === 'sticker' || sticker_url) && (
            <View style={{ marginBottom: 4 }}>
              <LazyImage
                src={sticker_url}
                style={{ width: 128, height: 128, backgroundColor: 'transparent' }}
                contentFit="contain"
              />
            </View>
          )}

          {renderText()}

          {!!url && <LinkPreview url={url} />}

          {translatedText && (
            <View style={[s.translation, { borderTopColor: 'rgba(0,0,0,0.05)' }]}>
              {!hideTranslation ? (
                <View style={{ flexDirection: 'row', gap: 6, alignItems: 'flex-start', opacity: 0.85 }}>
                  <Text style={{ fontSize: 10, marginTop: 2, opacity: 0.7 }}>🌐</Text>
                  <View style={{ flex: 1 }}>
                    <RichText
                      html={parseRichText(translatedText)}
                      onAddContact={onAddContact}
                      style={{ fontSize: 11, fontStyle: 'italic', color: '#6b7280' }}
                    />
                  </View>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <TouchableOpacity
                      onPress={() => playTTS(translatedText, userVoice)}
                      style={{ padding: 4 }}
                    >
                      <Icons.mic size={14} color={p.accent} />
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => setHideTranslation(true)}
                      style={{ padding: 4 }}
                    >
                      <Text style={[s.hideBtn, { color: p.textMuted }]}>Hide</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ) : (
                <TouchableOpacity
                  onPress={() => setHideTranslation(false)}
                  style={{ flexDirection: 'row', gap: 4, alignItems: 'center', paddingVertical: 2 }}
                >
                  <Text style={{ fontSize: 10 }}>🌐</Text>
                  <Text style={[s.showBtn, { color: p.textMuted }]}>Show translation</Text>
                </TouchableOpacity>
              )}
            </View>
          )}

          <View style={s.footer}>
            {is_edited && <Text style={[s.edited, { color: p.textMuted }]}>Edited</Text>}
            <Text style={[s.time, { color: isSentByMe ? p.textMuted : p.textMuted }]}>
              {new Date(timestamp).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
            </Text>
            {isSentByMe && (
              <TouchableOpacity
                onPress={() => {
                  if (isGroup && onShowReadBy) onShowReadBy();
                }}
                hitSlop={6}
              >
                {status === 'read' ? (
                  <Icons.checkDouble size={14} color="#3b82f6" />
                ) : (
                  <Icons.check size={14} color="#9ca3af" />
                )}
              </TouchableOpacity>
            )}
          </View>

          {is_pinned && (
            <View style={s.pinnedRow}>
              <Icons.pin size={10} color="#d97706" />
              <Text style={s.pinnedText}>Pinned</Text>
            </View>
          )}
        </View>

        {reactions && reactions.length > 0 && (
          <View
            style={[
              s.reactionsRow,
              { justifyContent: isSentByMe ? 'flex-end' : 'flex-start' },
            ]}
          >
            {(
              Object.entries(
                reactions.reduce((acc: Record<string, any[]>, r: any) => {
                  (acc[r.emoji] = acc[r.emoji] || []).push(r);
                  return acc;
                }, {}),
              ) as [string, any[]][]
            ).map(([emoji, users]) => (
              <View key={emoji} style={[s.reactionChip, { backgroundColor: p.card, borderColor: p.borderLight }]}>
                <Text style={{ fontSize: 12 }}>{emoji}</Text>
                {users.length > 1 && (
                  <Text style={[s.reactionCount, { color: p.textMuted }]}>{users.length}</Text>
                )}
              </View>
            ))}
          </View>
        )}
      </TouchableOpacity>
    </Animated.View>
  );
});

function RevealButton({
  label,
  onReveal,
  width,
  height,
}: {
  label: string;
  onReveal: () => void;
  width?: number;
  height?: number;
}) {
  const { p } = useLoudaTheme();
  const isAudio = label === 'Show Audio';
  return (
    <View
        style={[
          s.reveal,
          isAudio
            ? { width: '100%', paddingVertical: 16 }
            : { width: width ?? 250, height: height ?? 80 },
        ]}
    >
      <TouchableOpacity
        onPress={(e) => {
          e.stopPropagation?.();
          onReveal();
        }}
        style={[
          s.revealBtn,
          isAudio
            ? { backgroundColor: 'transparent' }
            : { backgroundColor: p.accent },
        ]}
      >
        <Text
          style={[
            s.revealText,
            isAudio && { color: p.accent, fontWeight: '800' },
          ]}
        >
          {label}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const s = StyleSheet.create({
  row: {
    flexDirection: 'row',
    paddingHorizontal: 8,
    alignItems: 'flex-end',
  },
  swipeIcon: {
    position: 'absolute',
    left: -40,
    top: '50%',
    marginTop: -14,
  },
  swipeIconCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarCol: { width: 32, marginRight: 8 },
  groupAvatar: { width: 32, height: 32, borderRadius: 16 },
  col: { maxWidth: '70%' },
  bubble: {
    width: '100%',
    borderRadius: 16,
    minHeight: 30,
  },
  senderName: {
    fontSize: 11,
    fontWeight: '900',
    marginBottom: 2,
  },
  replyBlock: {
    borderLeftWidth: 3,
    borderRadius: 6,
    padding: 4,
    marginBottom: 4,
    width: '100%',
    minWidth: 0,
    overflow: 'hidden',
    opacity: 0.95,
  },
  replyName: { fontSize: 10, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 1 },
  replyText: { fontSize: 12, fontStyle: 'italic' },
  mediaGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 2,
    maxWidth: 250,
  },
  mediaItem: {
    backgroundColor: '#f3f4f6',
    overflow: 'hidden',
  },
  fileItem: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#eff6ff',
    padding: 12,
  },
  fileName: { fontSize: 10, fontWeight: '700', textTransform: 'uppercase', color: '#2563eb', paddingHorizontal: 8 },
  reveal: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f3f4f6',
    borderStyle: 'dashed',
    borderWidth: 2,
    borderColor: '#d1d5db',
    borderRadius: 8,
  },
  revealBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
  },
  revealText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  translation: {
    marginTop: 6,
    paddingTop: 6,
    borderTopWidth: StyleSheet.hairlineWidth,
    width: '100%',
    userSelect: 'none',
  },
  hideBtn: { fontSize: 9, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 1 },
  showBtn: { fontSize: 10, fontWeight: '800', textDecorationLine: 'underline' },
  footer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
    paddingHorizontal: 4,
  },
  edited: { fontSize: 8, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 1, marginRight: 4 },
  time: { fontSize: 9, fontWeight: '900', textTransform: 'uppercase' },
  pinnedRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4, paddingHorizontal: 4 },
  pinnedText: { fontSize: 9, fontWeight: '700', color: '#d97706', textTransform: 'uppercase', letterSpacing: 1 },
  reactionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
    marginTop: 2,
  },
  reactionChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 1,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
  reactionCount: { fontSize: 10, fontWeight: '700' },
});
