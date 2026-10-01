import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  Image,
  Modal,
  Pressable,
  ScrollView,
  Animated,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  TextInput,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useLoudaTheme, Button } from './primitives';
import { Icons } from '../icons';
import { DEFAULT_AVATAR } from '../constants';
import { chatMessagesJumpRef } from '../bus';
import { useLoudaStore } from '../store';

// Port of UnifiedProfileView (LoudaApp.jsx:4301-4799) — the right-side
// profile drawer used for chat info, own profile and member profiles.
export function UnifiedProfileView({
  chat,
  user,
  messages,
  contacts,
  groups,
  onClose,
  onAction,
  onUpdateField,
  onUploadAvatar,
  isBlocked,
  onToggleBlock,
  initialViewState = 'main',
}: {
  chat: any;
  user: any;
  messages: any[];
  contacts: any[];
  groups: any[];
  onClose: () => void;
  onAction: (action: string, data?: any) => void;
  onUpdateField: (id: string, field: string, value: any, isGroup: boolean) => void;
  onUploadAvatar: (id: string, file: any, isGroup: boolean) => void;
  isBlocked: boolean;
  onToggleBlock: (id: string) => void;
  initialViewState?: 'main' | 'settings' | 'admin';
}) {
  const { p } = useLoudaTheme();
  const { setMediaView } = useLoudaStore();

  const isGroup = chat?.isGroup || !!chat?.members || !!chat?.admin_id;
  const isMe = user && chat && String(user.id) === String(chat.id) && !isGroup;
  const isAdmin = isGroup && user && chat && String(chat.admin_id) === String(user.id);
  const isInContacts = !isGroup && chat && contacts?.some((c) => String(c.id) === String(chat.id));

  const [viewState, setViewState] = useState<'main' | 'settings' | 'admin'>(initialViewState);
  const [showAvatarOptions, setShowAvatarOptions] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editValue, setEditValue] = useState('');
  const [editField, setEditField] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [urlPrompt, setUrlPrompt] = useState(false);
  const [urlValue, setUrlValue] = useState('');
  const scrollY = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    setViewState(initialViewState);
  }, [initialViewState]);

  const mediaMessages = useMemo(() => {
    if (!messages) return [];
    return messages
      .filter((m: any) => m.media && m.media.length > 0)
      .flatMap((m: any) => m.media.map((media: any) => ({ ...media, messageId: m.id, timestamp: m.timestamp })))
      .reverse();
  }, [messages]);

  const pinnedMessages = useMemo(() => {
    if (!messages) return [];
    return messages.filter((m: any) => m.is_pinned).reverse();
  }, [messages]);

  const handleEdit = (field: string, current: string) => {
    setEditField(field);
    setEditValue(current || '');
    setEditing(true);
  };

  const handleSave = () => {
    if (editField) onUpdateField(chat.id, editField, editValue, isGroup);
    setEditing(false);
    setEditField(null);
  };

  const pickAvatar = async (fromCamera: boolean) => {
    setShowAvatarOptions(false);
    try {
      let res: ImagePicker.ImagePickerResult;
      if (fromCamera) {
        const perm = await ImagePicker.requestCameraPermissionsAsync();
        if (!perm.granted) return;
        res = await ImagePicker.launchCameraAsync({ quality: 0.8 });
      } else {
        res = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ['images'],
          quality: 0.8,
        });
      }
      if (res.canceled || !res.assets?.length) return;
      const asset = res.assets[0];
      setUploading(true);
      await onUploadAvatar(chat.id, { uri: asset.uri, name: asset.fileName || 'avatar.jpg', type: asset.mimeType || 'image/jpeg' }, isGroup);
    } finally {
      setUploading(false);
    }
  };

  const pickBackground = async () => {
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.7,
    });
    if (res.canceled || !res.assets?.length) return;
    const asset = res.assets[0];
    onAction('setBackground', { id: chat.id, bgUrl: asset.uri });
  };

  const canEditName =
    isMe ||
    isAdmin ||
    (!isGroup &&
      !isMe &&
      isInContacts &&
      chat?.is_system !== 'ai' &&
      chat?.id !== '22222222-2222-2222-2222-222222222222' &&
      chat?.number !== 'support');

  const isSpecial =
    chat?.id === '11111111-1111-1111-1111-111111111111' ||
    chat?.id === '22222222-2222-2222-2222-222222222222' ||
    chat?.number === 'support' ||
    chat?.is_system === 'ai';

  return (
    <Modal transparent animationType="fade" statusBarTranslucent visible onRequestClose={onClose}>
      {/* Overlay + right drawer (web 4364-4365) */}
      <Pressable style={s.overlay} onPress={onClose}>
        <Pressable style={[s.drawer, { backgroundColor: p.card }]} onPress={(e) => e.stopPropagation()}>
          <Animated.ScrollView
            scrollEventThrottle={16}
            onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], {
              useNativeDriver: true,
            })}
          >
            {/* Parallax hero header (web 4367-4375) */}
            <View style={s.hero}>
              <Animated.Image
                source={{ uri: chat?.avatar_url || DEFAULT_AVATAR }}
                style={[s.heroImg, { transform: [{ translateY: Animated.multiply(scrollY, 0.3) }] }]}
                resizeMode="cover"
              />
              <View style={[s.heroShade, { backgroundColor: 'rgba(0,0,0,0.15)' }]} />
              <View style={[s.heroShade, s.heroShadeTop]} />
              <View style={[s.heroShade, s.heroShadeBottom]} />

              {/* Top buttons (web 4377-4385) */}
              <View style={s.heroTop}>
                <TouchableOpacity style={s.heroBtn} onPress={onClose} activeOpacity={0.8}>
                  <Icons.arrowLeft size={20} color="#fff" />
                </TouchableOpacity>
                {(isMe || isAdmin) && (
                  <TouchableOpacity
                    style={s.heroBtn}
                    onPress={() => setShowAvatarOptions(true)}
                    disabled={uploading}
                    activeOpacity={0.8}
                  >
                    {uploading ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <Icons.camera size={19} color="#fff" />
                    )}
                  </TouchableOpacity>
                )}
              </View>

              {/* Name block (web 4432-4471) */}
              <View style={s.heroNames}>
                <View style={s.nameRow}>
                  <Text style={s.heroName} numberOfLines={1}>
                    {chat?.name || chat?.full_name}
                  </Text>
                  {canEditName && (
                    <TouchableOpacity onPress={() => handleEdit('name', chat?.name || chat?.full_name)}>
                      <Icons.edit size={18} color="#fff" />
                    </TouchableOpacity>
                  )}
                </View>

                {isGroup &&
                  (() => {
                    const myMember = chat?.members?.find(
                      (m: any) => String(m.user_id) === String(user?.id),
                    );
                    const myNickname = myMember?.nickname;
                    return myNickname ? (
                      <View style={s.nickRow}>
                        <View style={s.nickChip}>
                          <Text style={s.nickChipText}>You: @{myNickname}</Text>
                        </View>
                        <TouchableOpacity
                          onPress={() => handleEdit('nickname', myNickname)}
                          style={{ transform: [{ scale: 0.75 }] }}
                        >
                          <Icons.edit size={16} color="#fff" />
                        </TouchableOpacity>
                      </View>
                    ) : (
                      <TouchableOpacity
                        style={s.setNick}
                        onPress={() => handleEdit('nickname', '')}
                      >
                        <Text style={s.setNickText}>+ Set your nickname</Text>
                      </TouchableOpacity>
                    );
                  })()}

                {!isGroup && chat?.nickname && chat?.is_system !== 'ai' && (
                  <View style={s.nickRow}>
                    <View style={s.nickChip}>
                      <Text style={s.nickChipText}>@{chat.nickname}</Text>
                    </View>
                    {isMe && (
                      <TouchableOpacity
                        onPress={() => handleEdit('nickname', chat.nickname)}
                        style={{ transform: [{ scale: 0.75 }] }}
                      >
                        <Icons.edit size={16} color="#fff" />
                      </TouchableOpacity>
                    )}
                  </View>
                )}

                {!isGroup && chat?.is_system !== 'ai' && (
                  <Text style={s.heroSub}>{chat?.phone || chat?.number}</Text>
                )}
                {isGroup && (
                  <Text style={s.heroSub}>{chat?.members?.length} members</Text>
                )}
              </View>
            </View>

            {/* Body sheet (web 4474) */}
            <View style={[s.body, { backgroundColor: p.card, borderColor: p.borderLight }]}>
              {/* About (web 4478-4492) */}
              <View style={s.sectionHead}>
                <Text style={[s.sectionLabel, { color: p.accent }]}>About</Text>
                {(isMe || isAdmin) && (
                  <TouchableOpacity
                    onPress={() => handleEdit('description', chat?.description || chat?.status)}
                    style={s.iconBtn}
                  >
                    <Icons.edit size={15} color={p.textMuted} />
                  </TouchableOpacity>
                )}
              </View>
              <View style={[s.aboutCard, { backgroundColor: p.cardMuted, borderColor: p.borderLight }]}>
                <Text style={[s.aboutText, { color: p.textSecondary }]}>
                  {chat?.description ||
                    chat?.preferences?.status ||
                    chat?.status ||
                    (isGroup ? 'No group description' : 'Hey there! I am using Textmob.')}
                </Text>
              </View>

              {/* Members (web 4494-4549) */}
              {isGroup && (
                <View style={s.section}>
                  <View style={s.sectionHead}>
                    <Text style={[s.sectionLabel, { color: p.accent }]}>
                      {chat.members?.length} Members
                    </Text>
                    {isAdmin && (
                      <TouchableOpacity onPress={() => onAction('addMembers', chat)}>
                        <Text style={[s.sectionAction, { color: p.accent }]}>+ Add Members</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                  <View style={{ gap: 12 }}>
                    {chat.members?.map((m: any) => (
                      <TouchableOpacity
                        key={m.user_id}
                        activeOpacity={0.8}
                        onPress={() => onAction('viewMember', m.user_id)}
                        style={[
                          s.memberRow,
                          { backgroundColor: p.cardMuted, borderColor: 'transparent' },
                        ]}
                      >
                        <Image
                          source={{ uri: m.avatar_url || DEFAULT_AVATAR }}
                          style={[s.memberAvatar, { borderColor: 'rgba(230,74,25,0.15)' }]}
                        />
                        <View style={{ flex: 1, minWidth: 0 }}>
                          <View style={s.memberNameRow}>
                            <Text style={[s.memberName, { color: p.text }]} numberOfLines={1}>
                              {m.nickname || m.real_name}
                            </Text>
                            {m.role === 'admin' && (
                              <View style={[s.adminChip, { backgroundColor: p.accentSoft }]}>
                                <Text style={{ color: p.accent, fontSize: 9, fontWeight: '900' }}>
                                  ADMIN
                                </Text>
                              </View>
                            )}
                          </View>
                          <Text style={[s.memberSub, { color: p.textMuted }]} numberOfLines={1}>
                            {m.status || (m.role === 'admin' ? 'Group Admin' : 'Member')}
                          </Text>
                        </View>
                        {isAdmin && m.user_id !== user?.id && (
                          <View style={s.memberActions}>
                            {m.role !== 'admin' ? (
                              <TouchableOpacity
                                style={s.memberAction}
                                onPress={() => onAction('promoteAdmin', m.user_id)}
                              >
                                <Icons.shieldPlus size={18} color="#22c55e" />
                              </TouchableOpacity>
                            ) : (
                              String(chat.admin_id) === String(user?.id) && (
                                <TouchableOpacity
                                  style={s.memberAction}
                                  onPress={() => onAction('demoteAdmin', m.user_id)}
                                >
                                  <Icons.shieldMinus size={18} color="#f59e0b" />
                                </TouchableOpacity>
                              )
                            )}
                            <TouchableOpacity
                              style={s.memberAction}
                              onPress={() => onAction('removeMember', m.user_id)}
                            >
                              <Icons.trash size={17} color="#ef4444" />
                            </TouchableOpacity>
                          </View>
                        )}
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              )}

              {/* Pinned messages (web 4550-4586) */}
              {pinnedMessages.length > 0 && (
                <View style={s.section}>
                  <View style={s.sectionHead}>
                    <Text style={[s.sectionLabel, { color: '#d97706' }]}>Pinned Messages</Text>
                    <Text style={[s.sectionCount, { color: p.textMuted }]}>
                      {pinnedMessages.length} pinned
                    </Text>
                  </View>
                  <View style={{ gap: 8 }}>
                    {pinnedMessages.map((m: any) => (
                      <TouchableOpacity
                        key={m.id}
                        activeOpacity={0.8}
                        style={[s.pinnedCard, { backgroundColor: 'rgba(245,158,11,0.08)', borderColor: 'rgba(245,158,11,0.25)' }]}
                        onPress={() => {
                          onClose();
                          // web 4563: close then scroll+flash the message in chat
                          setTimeout(() => chatMessagesJumpRef.current?.(m.id), 100);
                        }}
                      >
                        <Icons.pin size={15} color="#d97706" />
                        <View style={{ flex: 1, minWidth: 0 }}>
                          <Text style={[s.pinnedText, { color: p.text }]} numberOfLines={2}>
                            {m.text || 'Media Message'}
                          </Text>
                          <Text style={[s.pinnedDate, { color: p.textMuted }]}>
                            {new Date(m.timestamp).toLocaleDateString()}
                          </Text>
                        </View>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              )}

              {/* Configuration (web 4588-4610) */}
              <View style={s.section}>
                <View style={s.sectionHead}>
                  <Text style={[s.sectionLabel, { color: '#a855f7' }]}>Configuration</Text>
                </View>
                <View style={{ gap: 8 }}>
                  <TouchableOpacity
                    style={[s.configRow, { backgroundColor: p.cardMuted, borderColor: p.borderLight }]}
                    onPress={() => setViewState('settings')}
                  >
                    <View style={s.configLeft}>
                      <Icons.settings size={17} color="#a855f7" />
                      <Text style={[s.configText, { color: p.textSecondary }]}>Chat Settings</Text>
                    </View>
                    <Icons.chevronRight size={17} color={p.textMuted} />
                  </TouchableOpacity>
                  {isAdmin && (
                    <TouchableOpacity
                      style={[s.configRow, { backgroundColor: 'rgba(239,68,68,0.08)', borderColor: 'rgba(239,68,68,0.3)' }]}
                      onPress={() => setViewState('admin')}
                    >
                      <View style={s.configLeft}>
                        <Icons.lock size={17} color="#ef4444" />
                        <Text style={[s.configText, { color: '#b91c1c' }]}>Admin Controls</Text>
                      </View>
                      <Icons.chevronRight size={17} color="#ef4444" />
                    </TouchableOpacity>
                  )}
                </View>
              </View>

              {/* Media & Docs (web 4611-4641) */}
              <View style={s.section}>
                <View style={s.sectionHead}>
                  <Text style={[s.sectionLabel, { color: p.accent }]}>Media & Docs</Text>
                  <Text style={[s.sectionCount, { color: p.textMuted }]}>
                    {mediaMessages.length} items
                  </Text>
                </View>
                {mediaMessages.length > 0 ? (
                  <View style={s.mediaGrid}>
                    {mediaMessages.slice(0, 6).map((m: any, i: number) => (
                      <TouchableOpacity
                        key={i}
                        style={[s.mediaCell, { backgroundColor: p.cardMuted, borderColor: p.borderLight }]}
                        activeOpacity={0.8}
                        onPress={() => setMediaView({ src: m.url, type: m.type })}
                      >
                        {m.type === 'video' ? (
                          <View style={s.mediaPh}>
                            <Icons.play size={20} color="#fff" />
                          </View>
                        ) : m.type === 'audio' || m.type === 'voice' ? (
                          <View style={[s.mediaPh, { backgroundColor: 'rgba(22,163,74,0.12)' }]}>
                            <Icons.audio size={20} color="#16a34a" />
                          </View>
                        ) : m.type === 'file' || m.type === 'document' ? (
                          <View style={[s.mediaPh, { backgroundColor: 'rgba(59,130,246,0.12)' }]}>
                            <Icons.file size={20} color="#2563eb" />
                            <Text style={s.mediaDocName} numberOfLines={1}>
                              {m.name || 'Doc'}
                            </Text>
                          </View>
                        ) : (
                          <Image source={{ uri: m.url }} style={s.mediaImg} resizeMode="cover" />
                        )}
                      </TouchableOpacity>
                    ))}
                  </View>
                ) : (
                  <View style={[s.mediaEmpty, { borderColor: p.borderLight }]}>
                    <Icons.image size={30} color={p.textMuted} />
                    <Text style={[s.mediaEmptyText, { color: p.textMuted }]}>No media shared</Text>
                  </View>
                )}
              </View>

              {/* Groups in common (web 4643-4670) */}
              {!isMe && !isGroup && contacts && !isSpecial && (() => {
                const viewedUserId = chat?.id;
                if (!viewedUserId) return null;
                const sharedGroups = (groups || []).filter(
                  (g: any) => g.members_ids && g.members_ids.includes(viewedUserId),
                );
                if (sharedGroups.length === 0) return null;
                return (
                  <View style={s.section}>
                    <View style={s.sectionHead}>
                      <Text style={[s.sectionLabel, { color: p.accent }]}>
                        Groups in Common ({sharedGroups.length})
                      </Text>
                    </View>
                    <View style={{ gap: 8 }}>
                      {sharedGroups.map((g: any) => (
                        <TouchableOpacity
                          key={g.id}
                          style={[s.memberRow, { backgroundColor: p.cardMuted, borderColor: 'transparent' }]}
                          activeOpacity={0.8}
                          onPress={() => onAction('message', { ...g, isGroup: true })}
                        >
                          <Image
                            source={{ uri: g.avatar_url || DEFAULT_AVATAR }}
                            style={[s.sharedAvatar, { borderColor: 'rgba(230,74,25,0.15)' }]}
                          />
                          <View style={{ flex: 1, minWidth: 0 }}>
                            <Text style={[s.memberName, { color: p.text }]} numberOfLines={1}>
                              {g.name}
                            </Text>
                            <Text style={[s.memberSub, { color: p.textMuted }]}>
                              {g.members_ids?.length || 0} members
                            </Text>
                          </View>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                );
              })()}

              {/* Danger zone (web 4672-4691) */}
              <View style={[s.dangerSection, { borderColor: p.borderLight }]}>
                {!isGroup &&
                  isInContacts &&
                  !isSpecial && (
                    <TouchableOpacity
                      style={[s.dangerBtn, { backgroundColor: 'rgba(239,68,68,0.08)' }]}
                      onPress={() => onAction('delete', chat)}
                    >
                      <Text style={s.dangerText}>Delete Contact</Text>
                      <Icons.trash size={16} color="#ef4444" />
                    </TouchableOpacity>
                  )}
                {isGroup && (
                  <TouchableOpacity
                    style={[s.dangerBtn, { backgroundColor: 'rgba(239,68,68,0.08)' }]}
                    onPress={() => onAction('leave', chat)}
                  >
                    <Text style={s.dangerText}>Leave Group</Text>
                    <Icons.trash size={16} color="#ef4444" />
                  </TouchableOpacity>
                )}
                {!isMe && !isGroup && !isSpecial && (
                  <TouchableOpacity
                    style={[
                      s.dangerBtn,
                      {
                        backgroundColor: isBlocked
                          ? p.cardMuted
                          : 'rgba(148,163,184,0.1)',
                      },
                    ]}
                    onPress={() => onToggleBlock(chat.id)}
                  >
                    <Text style={[s.dangerText, { color: isBlocked ? p.text : p.textMuted }]}>
                      {isBlocked ? 'Unblock Contact' : 'Block Contact'}
                    </Text>
                    <Icons.block size={16} color={isBlocked ? p.text : p.textMuted} />
                  </TouchableOpacity>
                )}
              </View>
            </View>
          </Animated.ScrollView>

          {/* ─── Sub-view: settings / admin (web 4695-4772) ─── */}
          {viewState !== 'main' && (
            <View style={[s.subview, { backgroundColor: p.card }]}>
              <View style={[s.subviewHead, { borderBottomColor: p.borderLight }]}>
                <TouchableOpacity
                  style={[s.subviewBack, { backgroundColor: p.cardMuted }]}
                  onPress={() => setViewState('main')}
                >
                  <Icons.arrowLeft size={18} color={p.textSecondary} />
                </TouchableOpacity>
                <Text style={[s.subviewTitle, { color: p.text }]}>
                  {viewState === 'settings' ? 'Chat Settings' : 'Admin Controls'}
                </Text>
              </View>
              <ScrollView contentContainerStyle={{ padding: 16, gap: 24 }}>
                {viewState === 'settings' && (
                  <View>
                    <Text style={[s.sectionLabel, { color: '#a855f7', marginBottom: 12 }]}>
                      Chat Background
                    </Text>
                    <View style={{ gap: 8 }}>
                      <TouchableOpacity
                        style={[s.configRow, { backgroundColor: p.cardMuted, borderColor: p.borderLight }]}
                        onPress={pickBackground}
                      >
                        <View style={s.configLeft}>
                          <Icons.image size={17} color="#a855f7" />
                          <Text style={[s.configText, { color: p.textSecondary }]}>Upload Image</Text>
                        </View>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[s.configRow, { backgroundColor: p.cardMuted, borderColor: p.borderLight }]}
                        onPress={() => {
                          setUrlValue('');
                          setUrlPrompt(true);
                        }}
                      >
                        <View style={s.configLeft}>
                          <Icons.search size={17} color="#a855f7" />
                          <Text style={[s.configText, { color: p.textSecondary }]}>Use URL</Text>
                        </View>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[s.configRow, { backgroundColor: p.cardMuted, borderColor: p.borderLight }]}
                        onPress={() => onAction('setBackground', { id: chat.id, bgUrl: null })}
                      >
                        <Text style={[s.configText, { color: '#ef4444', fontWeight: '700' }]}>
                          Remove Background
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                )}

                {viewState === 'admin' && isAdmin && (
                  <View>
                    <Text style={[s.sectionLabel, { color: '#ef4444', marginBottom: 12 }]}>
                      Permissions
                    </Text>
                    <View
                      style={[
                        s.configRow,
                        { backgroundColor: p.cardMuted, borderColor: p.borderLight, alignItems: 'center' },
                      ]}
                    >
                      <View style={s.configLeft}>
                        <Icons.lock size={17} color="#ef4444" />
                        <View style={{ flexShrink: 1 }}>
                          <Text style={[s.configText, { color: p.textSecondary }]}>
                            Admin-Only Messaging
                          </Text>
                          <Text style={{ fontSize: 10, color: p.textMuted }}>
                            Only admins can send messages.
                          </Text>
                        </View>
                      </View>
                      <ToggleSw
                        value={!!chat?.settings?.admin_only}
                        onChange={(v) =>
                          onUpdateField(chat.id, 'settings.admin_only', v, isGroup)
                        }
                      />
                    </View>
                  </View>
                )}
              </ScrollView>
            </View>
          )}
        </Pressable>
      </Pressable>

      {/* ─── Avatar options (web 4389-4412) ─── */}
      {showAvatarOptions && (
        <Modal transparent statusBarTranslucent visible onRequestClose={() => setShowAvatarOptions(false)}>
          <Pressable style={s.ovCenter} onPress={() => setShowAvatarOptions(false)}>
            <Pressable
              style={[s.sheetCard, { backgroundColor: p.card }]}
              onPress={(e) => e.stopPropagation()}
            >
              <Text style={[s.sheetTitle, { color: p.text }]}>Update Photo</Text>
              <TouchableOpacity
                style={[s.sheetRow, { backgroundColor: p.cardMuted }]}
                onPress={() => pickAvatar(true)}
              >
                <Icons.camera size={19} color="#22c55e" />
                <Text style={[s.sheetRowText, { color: p.textSecondary }]}>Take Photo</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.sheetRow, { backgroundColor: p.cardMuted }]}
                onPress={() => pickAvatar(false)}
              >
                <Icons.image size={19} color="#3b82f6" />
                <Text style={[s.sheetRowText, { color: p.textSecondary }]}>Upload Image</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={s.sheetCancel}
                onPress={() => setShowAvatarOptions(false)}
              >
                <Text style={{ color: p.textMuted, fontSize: 12, fontWeight: '900' }}>CANCEL</Text>
              </TouchableOpacity>
            </Pressable>
          </Pressable>
        </Modal>
      )}

      {/* ─── URL prompt (web window.prompt, 4730) ─── */}
      {urlPrompt && (
        <Modal transparent statusBarTranslucent visible onRequestClose={() => setUrlPrompt(false)}>
          <Pressable style={s.ovCenter} onPress={() => setUrlPrompt(false)}>
            <Pressable
              style={[s.sheetCard, { backgroundColor: p.card }]}
              onPress={(e) => e.stopPropagation()}
            >
              <Text style={[s.sheetTitle, { color: p.text }]}>Background URL</Text>
              <TextInput
                value={urlValue}
                onChangeText={setUrlValue}
                placeholder="https://…"
                placeholderTextColor={p.textMuted}
                autoCapitalize="none"
                style={[
                  s.urlInput,
                  { backgroundColor: p.cardMuted, borderColor: p.borderLight, color: p.text },
                ]}
              />
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <Button
                  variant="secondary"
                  style={{ flex: 1 }}
                  onPress={() => setUrlPrompt(false)}
                >
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  style={{ flex: 1 }}
                  onPress={() => {
                    if (urlValue) onAction('setBackground', { id: chat.id, bgUrl: urlValue });
                    setUrlPrompt(false);
                  }}
                >
                  Save
                </Button>
              </View>
            </Pressable>
          </Pressable>
        </Modal>
      )}

      {/* ─── Edit field (web 4775-4796) ─── */}
      {editing && (
        <Modal transparent statusBarTranslucent visible onRequestClose={() => setEditing(false)}>
          <Pressable style={s.ovCenter} onPress={() => setEditing(false)}>
            <Pressable
              style={[s.editCard, { backgroundColor: p.card }]}
              onPress={(e) => e.stopPropagation()}
            >
              <Text style={[s.editTitle, { color: p.text }]}>
                Edit {editField}
              </Text>
              <TextInput
                autoFocus
                multiline
                value={editValue}
                onChangeText={setEditValue}
                placeholder={`Enter your ${editField}...`}
                placeholderTextColor={p.textMuted}
                style={[
                  s.editInput,
                  { backgroundColor: p.cardMuted, color: p.text, borderColor: 'transparent' },
                ]}
              />
              <View style={{ flexDirection: 'row', gap: 12 }}>
                <Button variant="secondary" style={{ flex: 1 }} onPress={() => setEditing(false)}>
                  Cancel
                </Button>
                <Button variant="primary" style={{ flex: 1 }} onPress={handleSave}>
                  Save
                </Button>
              </View>
            </Pressable>
          </Pressable>
        </Modal>
      )}
    </Modal>
  );
}

function ToggleSw({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={() => onChange(!value)}
      style={[s.track, { backgroundColor: value ? '#dc2626' : '#d1d5db' }]}
    >
      <View style={[s.knob, { transform: [{ translateX: value ? 22 : 0 }] }]} />
    </TouchableOpacity>
  );
}

const s = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  drawer: {
    width: '100%',
    flex: 1,
    overflow: 'hidden',
  },
  hero: {
    height: 300,
    width: '100%',
    overflow: 'hidden',
    justifyContent: 'flex-end',
  },
  heroImg: {
    ...StyleSheet.absoluteFill,
    width: '100%',
    height: '100%',
  },
  heroShade: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
  },
  heroShadeTop: {
    top: 0,
    height: 70,
    bottom: undefined,
    backgroundColor: 'rgba(0,0,0,0.28)',
  },
  heroShadeBottom: {
    top: undefined,
    height: 170,
    bottom: 0,
    backgroundColor: 'rgba(17,24,39,0.78)',
  },
  heroTop: {
    position: 'absolute',
    top: 16,
    left: 16,
    right: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    zIndex: 10,
  },
  heroBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.22)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroNames: {
    paddingHorizontal: 24,
    paddingBottom: 24,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  heroName: {
    color: '#fff',
    fontSize: 28,
    fontWeight: '900',
    flexShrink: 1,
  },
  nickRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
    opacity: 0.85,
  },
  nickChip: {
    backgroundColor: 'rgba(255,255,255,0.22)',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 8,
  },
  nickChipText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
    fontStyle: 'italic',
  },
  setNick: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.22)',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    marginBottom: 12,
  },
  setNickText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
    opacity: 0.85,
  },
  heroSub: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  body: {
    marginTop: -24,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    padding: 24,
    paddingTop: 32,
    gap: 40,
    borderWidth: StyleSheet.hairlineWidth,
  },
  section: {
    gap: 14,
  },
  sectionHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 3,
    textTransform: 'uppercase',
    opacity: 0.75,
  },
  sectionAction: {
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  sectionCount: {
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  iconBtn: {
    padding: 6,
    borderRadius: 8,
  },
  aboutCard: {
    padding: 20,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
  },
  aboutText: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '500',
  },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 12,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
  },
  memberAvatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    borderWidth: 2,
  },
  sharedAvatar: {
    width: 40,
    height: 40,
    borderRadius: 12,
    borderWidth: 1,
  },
  memberNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  memberName: {
    fontSize: 15,
    fontWeight: '700',
    flexShrink: 1,
  },
  adminChip: {
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
  },
  memberSub: {
    fontSize: 13,
    fontWeight: '500',
    marginTop: 2,
  },
  memberActions: {
    flexDirection: 'row',
    gap: 4,
  },
  memberAction: {
    padding: 8,
    borderRadius: 8,
  },
  pinnedCard: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'flex-start',
    padding: 16,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
  },
  pinnedText: {
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 17,
  },
  pinnedDate: {
    fontSize: 9,
    fontWeight: '900',
    marginTop: 4,
    textTransform: 'uppercase',
  },
  configRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    gap: 10,
  },
  configLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
    minWidth: 0,
  },
  configText: {
    fontSize: 14,
    fontWeight: '700',
  },
  mediaGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  mediaCell: {
    width: '31%',
    aspectRatio: 1,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mediaImg: {
    width: '100%',
    height: '100%',
  },
  mediaPh: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.4)',
    gap: 4,
    padding: 8,
  },
  mediaDocName: {
    fontSize: 8,
    fontWeight: '900',
    textTransform: 'uppercase',
    color: '#2563eb',
    textAlign: 'center',
  },
  mediaEmpty: {
    paddingVertical: 48,
    borderRadius: 32,
    borderWidth: 2,
    borderStyle: 'dashed',
    alignItems: 'center',
    gap: 12,
    opacity: 0.5,
  },
  mediaEmptyText: {
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 3,
    textTransform: 'uppercase',
  },
  dangerSection: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: 24,
    gap: 12,
  },
  dangerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 16,
  },
  dangerText: {
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 2,
    textTransform: 'uppercase',
    fontStyle: 'italic',
    color: '#ef4444',
  },
  subview: {
    ...StyleSheet.absoluteFill,
    zIndex: 50,
  },
  subviewHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    padding: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  subviewBack: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  subviewTitle: {
    fontSize: 17,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: -0.5,
  },
  track: {
    width: 46,
    height: 24,
    borderRadius: 12,
    padding: 2,
    justifyContent: 'center',
  },
  knob: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#fff',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(0,0,0,0.15)',
  },
  ovCenter: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  sheetCard: {
    width: '100%',
    maxWidth: 320,
    borderRadius: 32,
    padding: 24,
    gap: 12,
  },
  sheetTitle: {
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '900',
    fontStyle: 'italic',
    textTransform: 'uppercase',
    letterSpacing: -1,
    marginBottom: 8,
  },
  sheetRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    padding: 16,
    borderRadius: 16,
  },
  sheetRowText: {
    fontSize: 15,
    fontWeight: '700',
  },
  sheetCancel: {
    alignItems: 'center',
    paddingVertical: 10,
    marginTop: 4,
  },
  urlInput: {
    borderWidth: 2,
    borderRadius: 16,
    padding: 14,
    fontSize: 14,
    marginBottom: 8,
  },
  editCard: {
    width: '100%',
    maxWidth: 340,
    borderRadius: 32,
    padding: 28,
  },
  editTitle: {
    fontSize: 20,
    fontWeight: '900',
    textTransform: 'uppercase',
    fontStyle: 'italic',
    letterSpacing: -0.5,
    marginBottom: 24,
  },
  editInput: {
    minHeight: 120,
    borderRadius: 16,
    padding: 16,
    fontSize: 15,
    fontWeight: '500',
    textAlignVertical: 'top',
    marginBottom: 32,
  },
});
