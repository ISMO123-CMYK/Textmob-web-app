// Native port of the MobileHome brain (LoudaApp.jsx:6692-9072).
// State, data loading, socket wiring and every handler the web component keeps
// in its own closure — exposed through one context so screens can render it.
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { Alert, AppState } from 'react-native';
import { getStore, setStore } from '../utils/storage';
import * as api from './api';
import {
  drainPendingIntents,
  ensureLoudaSession,
  getTextmobUserSync,
  onLoudaEvent,
} from './session';
import { subscribePendingChatShare } from './pendingShare';
import {
  connectLoudaSocket,
  emitLoudaSocket,
  getLoudaConnectionState,
  getOnlineFriends,
  getTypingRegistry,
  onLoudaSocket,
  subscribeLoudaConnection,
  subscribePresence,
  subscribeTyping,
} from './socket';
import { formatTimeAgo, loudaAlert, translateMessage } from './utils';
import { withExtension } from '../utils/media';
import { Icons } from './icons';

// ─── dedupe helpers ───
// Server rows, socket echoes and pagination overlaps can all deliver the same
// id twice — React then dies on duplicate keys, so every append/replace path
// funnels through these.
function uniqByIdList<T extends { id?: any }>(list: T[]): T[] {
  if (!Array.isArray(list)) return list;
  const seen = new Set<any>();
  const out: T[] = [];
  for (const item of list) {
    const key = item?.id;
    if (key !== undefined && key !== null) {
      if (seen.has(key)) continue;
      seen.add(key);
    }
    out.push(item);
  }
  return out;
}
function uniqByField(list: any[], field: string): any[] {
  if (!Array.isArray(list)) return list;
  const seen = new Set<any>();
  return list.filter((item) => {
    const key = item?.[field];
    if (key === undefined || key === null) return true;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
// Maps with element identity preserved: returns `prev` itself when no element
// actually changed. `prev.map(...)` always allocates a new array, which bumps
// the contacts reference, recomputes `memoizedChats` (filter + sort + date
// parse) and re-renders the whole chat list — all for a presence tick that
// changed nothing.
function mapListPreserve<T>(prev: T[], fn: (item: T) => T): T[] {
  if (!Array.isArray(prev)) return prev;
  let changed = false;
  const next = prev.map((item) => {
    const mapped = fn(item);
    if (mapped !== item) changed = true;
    return mapped;
  });
  return changed ? next : prev;
}
function appendUniqueMsg(prev: any[], message: any): any[] {
  if (!message) return prev;
  if (message.id != null && prev.some((m) => m?.id === message.id)) return prev;
  return [...prev, message];
}
function prependUniqueMsgs(newer: any[], prev: any[]): any[] {
  if (!Array.isArray(newer) || !newer.length) return prev;
  const seen = new Set(prev.map((m) => m?.id));
  const fresh = newer.filter((m) => m?.id == null || !seen.has(m.id));
  return fresh.length ? [...fresh, ...prev] : prev;
}

// Push notify payload for a chat send (mirrors web fireLoudaPushNotify).
function buildPushNotifyPayload(user: any, chat: any, msg: any) {
  if (!user || !user.id || !chat) return null;
  const senderName = (user.full_name || user.username) || getTextmobUserSync() || 'Someone';
  const text = typeof msg?.text === 'string' ? msg.text.trim() : '';
  const mediaType = msg?.media && msg.media.length ? msg.media[0].type : '';
  const preview =
    text || (mediaType === 'video' ? 'Video' : mediaType === 'image' ? 'Photo' : 'File');
  return {
    senderId: user.id,
    senderName,
    isGroup: !!chat.isGroup,
    chatId: chat.isGroup ? chat.id : chat.chatId || '',
    toUserId: chat.isGroup ? undefined : chat.id,
    groupId: chat.isGroup ? chat.id : undefined,
    preview,
  };
}

// ─── shapes ───
export type LoudaMessage = {
  id: string;
  chat_id?: string;
  group_id?: string | null;
  from?: string;
  sender_id?: string;
  fromName?: string;
  fromAvatar?: string;
  name?: string;
  avatar?: string;
  text?: string | null;
  timestamp?: string;
  created_at?: string;
  status?: 'sent' | 'delivered' | 'read' | string;
  read_by?: any[];
  reactions?: any[];
  reply_to?: any;
  quotedStatus?: any;
  is_pinned?: boolean;
  is_edited?: boolean;
  edited_at?: string;
  is_system?: boolean | string;
  media?: any;
  media_type?: string;
  type?: string;
  translations?: Record<string, string> | null;
  annotations?: any;
  [k: string]: any;
};

export type LoudaChat = {
  id: string;
  isGroup: boolean;
  chatId?: string;
  name?: string;
  avatar_url?: string | null;
  archived?: boolean;
  unreadCount?: number;
  unread_count?: number;
  lastMessage?: string | null;
  lastMessageTime?: string | null;
  lastMessageStatus?: string;
  online?: boolean;
  statusText?: string;
  lastSeen?: string | null;
  typing?: boolean;
  is_system?: string;
  number?: string;
  phone?: string;
  members?: any[];
  membersMap?: Record<string, any>;
  admin_id?: string;
  settings?: any;
  description?: string;
  [k: string]: any;
};

export type ActiveTab = 'chats' | 'status' | 'gallery' | 'archived' | 'settings';

type ContextMenuState = { position: { x: number; y: number }; options: any[] } | null;

export type LoudaStoreValue = {
  // data
  user: any;
  contacts: any[];
  groups: any[];
  statuses: any[];
  messages: LoudaMessage[];
  selectedChat: LoudaChat | null;
  activeTab: ActiveTab;
  blockedUsers: string[];
  chatBgs: Record<string, string>;
  typingRegistry: Record<string, string[]>;
  connectionState: string;
  isLoadingChats: boolean;
  isLoadingMore: boolean;
  hasMoreMessages: boolean;
  searchQuery: string;
  showChatSearch: boolean;
  memoizedChats: any[];
  totalUnreadChats: number;
  totalUnreadArchived: number;
  totalUnreadStatuses: number;

  // ui state
  showSettings: boolean;
  showAddContact: boolean;
  showCreateGroup: boolean;
  showChatInfo: boolean;
  tempContact: any;
  phoneInput: string;
  showAddMembers: any;
  showStatusCreator: boolean;
  viewerTarget: string | null;
  viewerStatusId: string | null;
  showStatusCamera: boolean;
  statusCameraMedia: any;
  // Shared in-app camera request (non-modal screens only — RN Modals sit in
  // their own window, so those mount <InAppCamera> inline themselves).
  cameraRequest: {
    mode?: 'photo' | 'video' | 'both';
    maxVideoSeconds?: number;
    hint?: string;
    filePrefix?: string;
    onCapture: (file: any) => void;
  } | null;
  messagesLoading: boolean;
  contextMenu: ContextMenuState;
  replyTo: any;
  translations: Record<string, string>;
  messageInfo: any;
  editingMessage: any;
  mediaView: { src: string; type: string; mediaList?: any[] } | null;
  viewProfile: any;
  mobileMenuOpen: boolean;
  forwardPayload: any;
  sharePayload: any;
  selectedChats: Set<string>;
  chatSelectionMode: boolean;
  tmSearchQuery: string;
  tmSearchResults: any[];
  isSearchingTm: boolean;
  tmSearchMode: boolean;

  // setters (state the screens mutate directly)
  setUser: React.Dispatch<any>;
  setActiveTab: React.Dispatch<ActiveTab>;
  setSelectedChat: React.Dispatch<LoudaChat | null>;
  setShowSettings: React.Dispatch<boolean>;
  setShowAddContact: React.Dispatch<boolean>;
  setShowCreateGroup: React.Dispatch<boolean>;
  setShowChatInfo: React.Dispatch<boolean>;
  setTempContact: React.Dispatch<any>;
  setPhoneInput: React.Dispatch<string>;
  setShowAddMembers: React.Dispatch<any>;
  setShowStatusCreator: React.Dispatch<boolean>;
  setViewerTarget: React.Dispatch<string | null>;
  setViewerStatusId: React.Dispatch<string | null>;
  setShowStatusCamera: React.Dispatch<boolean>;
  setStatusCameraMedia: React.Dispatch<any>;
  setCameraRequest: React.Dispatch<any>;
  setContextMenu: React.Dispatch<ContextMenuState>;
  setReplyTo: React.Dispatch<any>;
  setTranslations: React.Dispatch<Record<string, string>>;
  setMessageInfo: React.Dispatch<any>;
  setEditingMessage: React.Dispatch<any>;
  setMediaView: React.Dispatch<any>;
  setViewProfile: React.Dispatch<any>;
  setMobileMenuOpen: React.Dispatch<boolean>;
  setForwardPayload: React.Dispatch<any>;
  setSharePayload: React.Dispatch<any>;
  setSelectedChats: React.Dispatch<Set<string>>;
  setChatSelectionMode: React.Dispatch<boolean>;
  setSearchQuery: React.Dispatch<string>;
  setShowChatSearch: React.Dispatch<boolean>;
  setTmSearchQuery: React.Dispatch<string>;
  setTmSearchResults: React.Dispatch<any[]>;
  setIsSearchingTm: React.Dispatch<boolean>;
  setTmSearchMode: React.Dispatch<boolean>;
  setStatuses: React.Dispatch<any[]>;
  setMessages: React.Dispatch<LoudaMessage[]>;

  // handlers
  loadContacts: (userId?: string) => Promise<void>;
  loadGroups: (userId?: string) => Promise<void>;
  loadStatuses: () => Promise<void>;
  handleLoadMore: () => Promise<void>;
  findUserByPhone: () => Promise<void>;
  confirmAddContact: () => Promise<void>;
  createGroup: (name: string, description: string, memberIds: string[]) => Promise<void>;
  addGroupMembers: (groupId: string, memberIds: string[]) => Promise<void>;
  updateContactName: (contactId: string, newName: string) => Promise<void>;
  updateGroupNickname: (groupId: string, nickname: string) => Promise<void>;
  deleteChat: (chatId: string, forBoth: boolean, isGroup: boolean) => Promise<void>;
  archiveChat: (chat: any) => Promise<void>;
  unarchiveChat: (chat: any) => Promise<void>;
  handleForwardInitiate: (payload: any) => void;
  handleConfirmForward: (targets: any[]) => Promise<void>;
  handleConfirmShareMedia: (targets: any[]) => Promise<void>;
  handleSave: (prefs: any) => Promise<void>;
  handleUpdateProfile: (updates: any) => Promise<void>;
  handleUpdateField: (id: string, field: string, value: any, isGroup: boolean) => Promise<void>;
  handleSend: (msg: any) => void;
  handleEditMessage: (messageId: string, newText: string) => void;
  handleTyping: () => void;
  onDeleteMessage: (messageId: string) => Promise<void>;
  onUploadAvatar: (id: string, fileOrUrl: any, isGroup: boolean) => Promise<void>;
  handleContextMenu: (position: { x: number; y: number }, chat: any) => void;
  handleTabChange: (tabId: ActiveTab) => void;
  handleProfileAction: (action: string, data?: any) => void;
  handleViewProfile: (c: any) => void;
  handleRemoveMember: (groupId: string, targetMemberId: string) => Promise<void>;
  handlePromoteAdmin: (groupId: string, targetMemberId: string) => Promise<void>;
  handleDemoteAdmin: (groupId: string, targetMemberId: string) => Promise<void>;
  closeSettings: () => void;
  toggleChatSelect: (chatId: string, isLongPress?: boolean) => void;
  exitChatSelection: () => void;
  handleBulkChatDelete: () => Promise<void>;
  handleBulkChatArchive: () => Promise<void>;
  toggleBlockUser: (userId: string) => void;
  handleTranslate: (messageId: string, text: string) => Promise<void>;
  handleViewInfo: (message: any) => Promise<void>;
  openChatWithUsername: (username: string, focusComposer?: boolean) => Promise<void>;
  openGroupChatById: (groupId: string) => void;
  pendingComposerFocus: boolean;
  setPendingComposerFocus: (v: boolean) => void;
  onExit?: () => void;
};

const LoudaStoreContext = createContext<LoudaStoreValue | null>(null);

export function useLoudaStore(): LoudaStoreValue {
  const v = useContext(LoudaStoreContext);
  if (!v) throw new Error('useLoudaStore must be used inside LoudaStoreProvider');
  return v;
}

const SUPPORT_ID = '22222222-2222-2222-2222-222222222222';
const AI_ID = '11111111-1111-1111-1111-111111111111';
const KEY_BLOCKED = 'louda:blockedUsers';
const KEY_CHAT_BGS = 'louda:chatBgs';

export function LoudaStoreProvider({
  children,
  onExit,
}: {
  children: React.ReactNode;
  onExit?: () => void;
}) {
  // ─── state (mirrors LoudaApp.jsx:6693-6892) ───
  const [user, setUser] = useState<any>(null);
  const [contacts, setContacts] = useState<any[]>([]);
  const [groups, setGroups] = useState<any[]>([]);
  const [selectedChat, setSelectedChat] = useState<LoudaChat | null>(null);
  const [messages, setMessages] = useState<LoudaMessage[]>([]);
  const [activeTab, setActiveTab] = useState<ActiveTab>('chats');
  const [showSettings, setShowSettings] = useState(false);
  const [showAddContact, setShowAddContact] = useState(false);
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [showChatInfo, setShowChatInfo] = useState(false);
  const [tempContact, setTempContact] = useState<any>(null);
  const [phoneInput, setPhoneInput] = useState('');
  const [showAddMembers, setShowAddMembers] = useState<any>(null);
  const [statuses, setStatuses] = useState<any[]>([]);
  const [showStatusCreator, setShowStatusCreator] = useState(false);
  const [viewerTarget, setViewerTarget] = useState<string | null>(null);
  const [viewerStatusId, setViewerStatusId] = useState<string | null>(null);
  const [showStatusCamera, setShowStatusCamera] = useState(false);
  const [statusCameraMedia, setStatusCameraMedia] = useState<any>(null);
  const [cameraRequest, setCameraRequest] = useState<any>(null);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [typingRegistry, setTypingRegistry] = useState<Record<string, string[]>>({});
  const [contextMenu, setContextMenu] = useState<ContextMenuState>(null);
  const [replyTo, setReplyTo] = useState<any>(null);
  // Set by a push-tap intent: the next chat that opens should focus its
  // composer so the user can reply without another tap.
  const [pendingComposerFocus, setPendingComposerFocus] = useState(false);
  const [hasMoreMessages, setHasMoreMessages] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [translations, setTranslations] = useState<Record<string, string>>({});
  // Mirror of `translations` so handleTranslate can stay referentially stable
  // (it's a dep of the socket-wiring effect — unstable meant tearing down and
  // re-subscribing all 29 socket handlers every time a translation landed).
  const translationsRef = useRef(translations);
  useEffect(() => {
    translationsRef.current = translations;
  }, [translations]);
  const [messageInfo, setMessageInfo] = useState<any>(null);
  const [editingMessage, setEditingMessage] = useState<any>(null);
  const [mediaView, setMediaView] = useState<any>(null);
  const [viewProfile, setViewProfile] = useState<any>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [forwardPayload, setForwardPayload] = useState<any>(null);
  const [sharePayload, setSharePayload] = useState<any>(null);
  const [selectedChats, setSelectedChats] = useState<Set<string>>(new Set());
  const [chatSelectionMode, setChatSelectionMode] = useState(false);
  const [connectionState, setConnectionState] = useState<string>(() => getLoudaConnectionState());
  const [blockedUsers, setBlockedUsers] = useState<string[]>([]);
  const [chatBgs, setChatBgs] = useState<Record<string, string>>({});
  const [showChatSearch, setShowChatSearch] = useState(false);
  const [isLoadingChats, setIsLoadingChats] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [tmSearchQuery, setTmSearchQuery] = useState('');
  const [tmSearchResults, setTmSearchResults] = useState<any[]>([]);
  const [isSearchingTm, setIsSearchingTm] = useState(false);
  const [tmSearchMode, setTmSearchMode] = useState(false);

  const selectedChatRef = useRef<LoudaChat | null>(selectedChat);
  const userIdRef = useRef<string>('');
  const typingTimerRef = useRef<any>(null);
  const userRef = useRef<any>(null);
  const viewProfileRef = useRef<any>(null);
  // Slow-message fixes: remember resolved chat ids and per-chat message
  // pages so reopening a chat paints instantly (stale-while-revalidate).
  const chatIdCacheRef = useRef<Record<string, string>>({});
  const messagesCacheRef = useRef<
    Record<string, { messages: LoudaMessage[]; hasMore: boolean }>
  >({});
  const messagesKeyRef = useRef<string | null>(null);

  const putMessagesCache = (
    key: string,
    entry: { messages: LoudaMessage[]; hasMore: boolean },
  ) => {
    messagesCacheRef.current[key] = entry;
    const keys = Object.keys(messagesCacheRef.current);
    if (keys.length > 12) delete messagesCacheRef.current[keys[0]];
  };

  useEffect(() => {
    selectedChatRef.current = selectedChat;
  }, [selectedChat]);
  useEffect(() => {
    userRef.current = user;
  }, [user]);
  useEffect(() => {
    viewProfileRef.current = viewProfile;
  }, [viewProfile]);

  // ─── loaders (LoudaApp.jsx:7255-7349) ───
  const mapContactStatus = useCallback(
    (c: any, isOnline: boolean, lastSeenVal: any) => {
      if (c.id === SUPPORT_ID || c.number === 'support') {
        if (c.online === false && c.statusText === 'Support') return c;
        return { ...c, online: false, statusText: 'Support' };
      }
      const statusText = isOnline
        ? 'Online'
        : lastSeenVal
          ? `Last seen ${formatTimeAgo(lastSeenVal)}`
          : 'Offline';
      // Identity bail-out: spreading an unchanged contact produces a new
      // object every call, which cascades into a new contacts array and a
      // full chat-list re-sort. Only allocate when something really moved.
      if (c.online === isOnline && c.statusText === statusText) return c;
      return { ...c, online: isOnline, statusText };
    },
    [],
  );

  const loadContacts = useCallback(async (userId?: string) => {
    const id = userId || userIdRef.current;
    if (!id) return;
    try {
      const data = await api.getContacts(id);
      if (!Array.isArray(data)) return;
      setContacts((prev) => {
        const onlineMap = new Map(prev.map((p: any) => [p.id, p.online]));
        const onlineList = getOnlineFriends();
        return uniqByIdList(
          data.map((c: any) => {
            const isOnline = onlineMap.get(c.id) || onlineList.includes(c.id) || false;
            return mapContactStatus(c, isOnline, c.lastSeen);
          }),
        );
      });
    } catch (e: any) {
      console.error('[Louda] loadContacts failed', e);
      loudaAlert({ title: 'Error', message: e?.message || 'Failed to load contacts' });
    }
  }, [mapContactStatus]);

  const loadGroups = useCallback(async (userId?: string) => {
    const id = userId || userIdRef.current;
    if (!id) return;
    try {
      const data = await api.getGroups(id);
      if (!Array.isArray(data)) return;
      setGroups(
        uniqByIdList(
          data.map((g: any) => ({
            ...g,
            members: uniqByField(g.members, 'user_id'),
            lastMessage: g.last_message_preview || 'No messages yet',
          })),
        ),
      );
    } catch (e: any) {
      console.error('[Louda] loadGroups failed', e);
      loudaAlert({ title: 'Error', message: e?.message || 'Failed to load groups' });
    }
  }, []);

  const loadStatuses = useCallback(async () => {
    const id = userIdRef.current;
    if (!id) return;
    try {
      const data = await api.getStatuses(id);
      if (Array.isArray(data)) setStatuses(data);
    } catch (e) {
      console.error('[Louda] loadStatuses failed', e);
    }
  }, []);

  const fetchChatId = useCallback(async (contactId: string) => {
    try {
      const data = await api.getChat(userIdRef.current, contactId);
      if (!data) throw new Error('Failed');
      return data.id;
    } catch (e) {
      console.error('[Louda] fetchChatId failed', e);
      return null;
    }
  }, []);

  // ─── boot (LoudaApp.jsx:7370-7402) ───
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { loudaUserId } = await ensureLoudaSession();
        if (cancelled) return;
        userIdRef.current = loudaUserId;

        try {
          const [rawBlocked, rawBgs] = await Promise.all([
            getStore(KEY_BLOCKED),
            getStore(KEY_CHAT_BGS),
          ]);
          if (rawBlocked) setBlockedUsers(JSON.parse(rawBlocked) || []);
          if (rawBgs) setChatBgs(JSON.parse(rawBgs) || {});
        } catch {}

        // These four used to run back-to-back, so opening Messages cost four
        // serial round-trips to the server. None of them depend on each other
        // (every loader takes loudaUserId / userIdRef, not the `user` state),
        // so fire them together: one round-trip instead of four.
        await Promise.all([
          api.getUser(loudaUserId).then((data) => {
            if (!data || data.error) throw new Error(data?.error || 'Failed to load user');
            if (!cancelled) setUser(data);
          }),
          loadContacts(loudaUserId),
          loadGroups(loudaUserId),
          loadStatuses(),
        ]);
        if (cancelled) return;
        setIsLoadingChats(false);
        connectLoudaSocket(loudaUserId);
      } catch (e: any) {
        console.error('[Louda] boot failed', e);
        if (!cancelled) {
          setUser({});
          setIsLoadingChats(false);
          loudaAlert({ title: 'Error', message: e?.message || 'Could not start Messaging' });
        }
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ─── last-seen heartbeat (LoudaApp.jsx:597-620) ───
  useEffect(() => {
    const beat = () => {
      if (userIdRef.current) api.updateLastSeen(userIdRef.current);
    };
    beat();
    const iv = setInterval(beat, 45000);
    const sub = AppState.addEventListener('change', (s) => {
      if (s === 'active') beat();
    });
    return () => {
      clearInterval(iv);
      sub.remove();
    };
  }, []);

  // ─── translate helpers (LoudaApp.jsx:7099-7122) ───
  const handleTranslate = useCallback(async (messageId: string, text: string) => {
    if (translationsRef.current[messageId]) return;
    const lang = userRef.current?.preferences?.language_preferences?.preferred_language || 'en';
    const result = await translateMessage(text, lang);
    if (result) {
      translationsRef.current = { ...translationsRef.current, [messageId]: result };
      setTranslations(translationsRef.current);
    }
  }, []);

  const handleViewInfo = useCallback(
    async (message: any) => {
      const lang = userRef.current?.preferences?.language_preferences?.preferred_language || 'en';
      if (!message.translations?.[lang] && message.text) {
        const result = await translateMessage(message.text, lang);
        if (result) {
          setMessageInfo({
            ...message,
            translations: { ...message.translations, [lang]: result },
          });
          return;
        }
      }
      setMessageInfo(message);
    },
    [],
  );

  // ─── socket wiring (LoudaApp.jsx:7404-7795) ───
  useEffect(() => {
    const unsubs: Array<() => void> = [];
    const on = (event: string, handler: (...args: any[]) => void) => {
      unsubs.push(onLoudaSocket(event, handler));
    };
    const uid = () => userIdRef.current;

    on('sync-statuses', (data: any) => Array.isArray(data) && setStatuses(data));
    on('new-status', (status: any) => setStatuses((prev) => [...prev, status]));
    on('status-deleted', (statusId: string) =>
      setStatuses((prev) => prev.filter((st) => st.id !== statusId)),
    );
    on('status-viewed', ({ statusId, viewData }: any) =>
      setStatuses((prev) =>
        prev.map((st) =>
          st.id === statusId ? { ...st, views: [...(st.views || []), viewData] } : st,
        ),
      ),
    );
    on('status-reacted', ({ statusId, reactionData }: any) =>
      setStatuses((prev) =>
        prev.map((st) =>
          st.id === statusId ? { ...st, reactions: [...(st.reactions || []), reactionData] } : st,
        ),
      ),
    );

    on('contacts-updated', () => loadContacts());
    on('groups-updated', () => loadGroups());

    on('user-updated', ({ userId: updatedUserId, updates }: any) => {
      setContacts((prev) =>
        prev.map((c) => (String(c.id) === String(updatedUserId) ? { ...c, ...updates } : c)),
      );
      setGroups((prev) =>
        prev.map((g) => {
          if (g.membersMap && g.membersMap[updatedUserId]) {
            const newMembersMap = { ...g.membersMap };
            const old = newMembersMap[updatedUserId];
            if (typeof old === 'object') {
              newMembersMap[updatedUserId] = {
                ...old,
                name: updates.full_name || updates.username || old.name,
                avatar_url: updates.avatar_url || old.avatar_url,
              };
            } else {
              newMembersMap[updatedUserId] =
                updates.full_name || updates.username || updates.name || old;
            }
            return { ...g, membersMap: newMembersMap };
          }
          return g;
        }),
      );
      const cur = selectedChatRef.current;
      if (cur && !cur.isGroup && String(cur.id) === String(updatedUserId)) {
        setSelectedChat((prev) => (prev ? { ...prev, ...updates } : prev));
      }
    });

    const applyPresence = () => {
      const online = getOnlineFriends();
      setContacts((prev) =>
        mapListPreserve(prev, (c) => mapContactStatus(c, online.includes(c.id), c.lastSeen)),
      );
    };

    on('initial-online', applyPresence);
    on('sync-online-status', (syncedFriends: string[]) => {
      setContacts((prev) =>
        mapListPreserve(prev, (c) => {
          const isOnline = (syncedFriends || []).includes(c.id);
          return mapContactStatus(c, isOnline, c.lastSeen);
        }),
      );
    });
    on('status-update', ({ friendId, online, lastSeen }: any) => {
      setContacts((prev) =>
        mapListPreserve(prev, (c) =>
          c.id === friendId ? mapContactStatus(c, online, lastSeen) : c,
        ),
      );
      const cur = selectedChatRef.current;
      if (cur && !cur.isGroup && cur.id === friendId) {
        setSelectedChat((prev) => {
          if (!prev) return prev;
          const mapped = mapContactStatus({ ...prev, lastSeen }, online, lastSeen);
          return {
            ...prev,
            online: mapped.online,
            lastSeen: (mapped as any).lastSeen,
            statusText: mapped.statusText,
          };
        });
      }
    });

    const autoTranslate = () =>
      userRef.current?.preferences?.language_preferences?.auto_translate ?? false;

    on('new-message', ({ chatId, message }: any) => {
      const currentChat = selectedChatRef.current;
      if (currentChat && !currentChat.isGroup && currentChat.chatId === chatId) {
        setMessages((prev) => appendUniqueMsg(prev, message));
        if (autoTranslate() && message.from !== uid() && message.text) {
          handleTranslate(message.id, message.text);
        }
        if (message.from !== uid()) {
          emitLoudaSocket('mark-read', { chatId, messageIds: [message.id], isGroup: false });
        }
      } else if (message.from !== uid()) {
        setContacts((prev) =>
          prev.map((c) =>
            c.id === message.from
              ? {
                  ...c,
                  unreadCount: (c.unreadCount || 0) + 1,
                  lastMessage: message.text || 'Media',
                  lastMessageTime: message.timestamp,
                  lastMessageStatus: 'received',
                }
              : c,
          ),
        );
      }
    });

    on('new-group-message', ({ groupId, message }: any) => {
      const currentChat = selectedChatRef.current;
      if (currentChat && currentChat.isGroup && currentChat.id === groupId) {
        setMessages((prev) => appendUniqueMsg(prev, message));
        if (autoTranslate() && message.from !== uid() && message.text) {
          handleTranslate(message.id, message.text);
        }
        if (message.from !== uid()) {
          emitLoudaSocket('mark-read', { chatId: groupId, messageIds: [message.id], isGroup: true });
        }
      } else if (message.from !== uid()) {
        setGroups((prev) =>
          prev.map((g) => {
            if (g.id !== groupId) return g;
            const senderMember = g.members?.find((m: any) => m.user_id === message.from);
            const senderName = senderMember
              ? (senderMember.nickname || senderMember.real_name || '').split(' ')[0]
              : '';
            return {
              ...g,
              unreadCount: (g.unreadCount || 0) + 1,
              lastMessage: senderName
                ? `${senderName}: ${message.text || 'Media'}`
                : message.text || 'Media',
              lastMessageTime: message.timestamp,
              lastMessageStatus: 'received',
            };
          }),
        );
      }
    });

    on('message-edited', ({ messageId, newText }: any) => {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === messageId
            ? { ...m, text: newText, is_edited: true, edited_at: new Date().toISOString(), translations: {} }
            : m,
        ),
      );
      setMessageInfo((prev: any) =>
        prev && prev.id === messageId
          ? { ...prev, text: newText, annotations: {}, translations: {} }
          : prev,
      );
    });

    on('message-translated', ({ messageId, translations: newTranslations }: any) => {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === messageId
            ? { ...m, translations: { ...(m.translations || {}), ...newTranslations } }
            : m,
        ),
      );
      setMessageInfo((prev: any) =>
        prev && prev.id === messageId
          ? { ...prev, translations: { ...(prev.translations || {}), ...newTranslations } }
          : prev,
      );
    });

    on('group-created', () => loadGroups());
    on('added-to-group', () => loadGroups());
    on('group-updated', () => loadGroups());
    on('member-left', () => loadGroups());

    on('message-status', ({ chatId, groupId, messageId, status }: any) => {
      const currentChat = selectedChatRef.current;
      const id = chatId || groupId;
      if (!groupId) {
        setContacts((prev) =>
          mapListPreserve(prev, (c) =>
            c.chatId === id && c.lastMessageStatus !== status
              ? { ...c, lastMessageStatus: status }
              : c,
          ),
        );
      }
      if (
        currentChat &&
        ((currentChat.isGroup && currentChat.id === id) ||
          (!currentChat.isGroup && currentChat.chatId === id))
      ) {
        setMessages((prev) =>
          mapListPreserve(prev, (m) =>
            m.id === messageId && m.status !== status ? { ...m, status } : m,
          ),
        );
      }
    });

    on('messages-read', ({ chatId, groupId, messageIds, readBy }: any) => {
      const currentChat = selectedChatRef.current;
      const id = chatId || groupId;
      if (!groupId) {
        setContacts((prev) =>
          mapListPreserve(prev, (c) =>
            c.chatId === id && c.lastMessageStatus !== 'read'
              ? { ...c, lastMessageStatus: 'read' }
              : c,
          ),
        );
      }
      if (
        currentChat &&
        ((currentChat.isGroup && currentChat.id === id) ||
          (!currentChat.isGroup && currentChat.chatId === id))
      ) {
        setMessages((prev) =>
          mapListPreserve(prev, (m) => {
            if (messageIds?.includes(m.id)) {
              if (!currentChat.isGroup) {
                return m.status === 'read' ? m : { ...m, status: 'read' };
              }
              const read_by = m.read_by || [];
              const alreadyRead = read_by.find(
                (r: any) =>
                  (typeof r === 'string' && r === readBy?.userId) ||
                  (typeof r === 'object' && r.userId === readBy?.userId),
              );
              if (!alreadyRead && readBy) return { ...m, read_by: [...read_by, readBy] };
            }
            return m;
          }),
        );
      }
    });

    on('message-deleted', ({ chatId, groupId, messageId }: any) => {
      const currentChat = selectedChatRef.current;
      const id = chatId || groupId;
      if (
        currentChat &&
        ((currentChat.isGroup && currentChat.id === id) ||
          (!currentChat.isGroup && currentChat.chatId === id))
      ) {
        setMessages((prev) => prev.filter((m) => m.id !== messageId));
      }
    });

    const matchesCurrent = (chatId: string, isGroup?: boolean) => {
      const currentChat = selectedChatRef.current;
      return (
        !!currentChat &&
        ((!!isGroup && currentChat.isGroup && currentChat.id === chatId) ||
          (!isGroup && !currentChat.isGroup && currentChat.chatId === chatId))
      );
    };

    on('message-reacted', ({ chatId, messageId, reactions, isGroup }: any) => {
      if (matchesCurrent(chatId, isGroup)) {
        setMessages((prev) => prev.map((m) => (m.id === messageId ? { ...m, reactions } : m)));
      }
    });
    on('message-pinned', ({ chatId, messageId, isGroup }: any) => {
      if (matchesCurrent(chatId, isGroup)) {
        setMessages((prev) => prev.map((m) => (m.id === messageId ? { ...m, is_pinned: true } : m)));
      }
    });
    on('message-unpinned', ({ chatId, messageId, isGroup }: any) => {
      if (matchesCurrent(chatId, isGroup)) {
        setMessages((prev) => prev.map((m) => (m.id === messageId ? { ...m, is_pinned: false } : m)));
      }
    });

    on('reconnect', () => {
      loadContacts();
      loadGroups();
    });

    unsubs.push(subscribeLoudaConnection(setConnectionState));
    unsubs.push(subscribeTyping(() => setTypingRegistry({ ...getTypingRegistry() })));
    unsubs.push(subscribePresence(applyPresence));
    setTypingRegistry({ ...getTypingRegistry() });
    setConnectionState(getLoudaConnectionState());

    return () => unsubs.forEach((u) => u());
  }, [loadContacts, loadGroups, handleTranslate, mapContactStatus]);

  // ─── open chat (LoudaApp.jsx:7858-7924) ───
  useEffect(() => {
    // Cache the messages currently on screen BEFORE any early return — runs
    // on chat switch and on close, so the previous chat repaints instantly
    // on its next open.
    const prevKey = messagesKeyRef.current;
    if (prevKey) putMessagesCache(prevKey, { messages, hasMore: hasMoreMessages });

    if (!selectedChat || !user?.id) {
      messagesKeyRef.current = null;
      setMessagesLoading(false);
      return;
    }

    const isGroup = !!selectedChat.isGroup;
    const contactId = String(selectedChat.id);
    const cacheKey = (isGroup ? 'g:' : 'c:') + contactId;
    const cached = messagesCacheRef.current[cacheKey];

    // Stale-while-revalidate: paint the cached page instantly instead of an
    // empty spinner while the network round-trip completes.
    if (cached) {
      setMessages(cached.messages);
      setHasMoreMessages(cached.hasMore);
      setMessagesLoading(false);
    } else {
      setMessages([]);
      setHasMoreMessages(false);
      setMessagesLoading(true);
    }
    // From here on, `messages` belongs to this chat — so a failed open still
    // caches under the right key on the next switch/close.
    messagesKeyRef.current = cacheKey;

    let stale = false;

    const openChat = async () => {
      let chatIdToUse: string | null = isGroup
        ? contactId
        : selectedChat.chatId ||
          (selectedChat as any).chat_id ||
          chatIdCacheRef.current[contactId] ||
          null;
      let loadedMessages: LoudaMessage[] = [];
      let fullData: any;

      if (isGroup) {
        fullData = await api.getMessages(chatIdToUse!, true);
        loadedMessages = fullData?.messages || [];
        if (!stale) setSelectedChat((prev) => (prev ? { ...prev, ...fullData, isGroup: true } : prev));
      } else {
        if (chatIdToUse) {
          // Short-circuit: reuse the known chat id — skips the fetchChatId
          // round trip that used to gate every open.
          const fast = await api.getMessages(chatIdToUse, false, 20);
          if (Array.isArray(fast?.messages)) {
            fullData = fast;
            loadedMessages = fast.messages;
          } else {
            chatIdToUse = null; // stale/invalid cached id → re-resolve
          }
        }
        if (!chatIdToUse) {
          chatIdToUse = await fetchChatId(contactId);
          if (!chatIdToUse) {
            if (stale) return;
            loudaAlert({ title: 'Error', message: 'Could not open chat' });
            setSelectedChat(null);
            return;
          }
          fullData = await api.getMessages(chatIdToUse, false, 20);
          loadedMessages = fullData?.messages || [];
        }
        if (!stale) setSelectedChat((prev) => (prev ? { ...prev, chatId: chatIdToUse! } : prev));
        // Persist the resolved id: the ref survives loadContacts wiping
        // contact rows, the setContacts patch feeds memoizedChats/selectedChat.
        chatIdCacheRef.current[contactId] = chatIdToUse;
        setContacts((prev) =>
          prev.map((c: any) =>
            String(c.id) === contactId ? { ...c, chatId: chatIdToUse! } : c,
          ),
        );
      }

      if (stale) return;

      // Union fresh page + cached history (older pages from handleLoadMore),
      // de-duped and sorted oldest → newest — never a blind replace.
      const merged = uniqByIdList([...loadedMessages, ...(cached?.messages || [])]).sort(
        (a: any, b: any) =>
          new Date(a.timestamp || a.created_at || 0).getTime() -
          new Date(b.timestamp || b.created_at || 0).getTime(),
      );
      setMessages(merged);
      const more = loadedMessages.length >= 20 || (cached?.hasMore ?? false);
      setHasMoreMessages(more);
      putMessagesCache(cacheKey, { messages: merged, hasMore: more });
      messagesKeyRef.current = cacheKey;

      const autoTranslate =
        userRef.current?.preferences?.language_preferences?.auto_translate ?? false;
      if (autoTranslate) {
        loadedMessages.forEach((m: any) => {
          if (m.from !== userRef.current?.id && m.text) handleTranslate(m.id, m.text);
        });
      }

      const currentUserId = userIdRef.current;
      const unreadIds = loadedMessages
        .filter((m: any) => {
          if (m.from === currentUserId) return false;
          if (isGroup) {
            if (!m.read_by) return true;
            return !m.read_by.some((r: any) =>
              typeof r === 'object' ? r.userId === currentUserId : r === currentUserId,
            );
          }
          return m.status !== 'read';
        })
        .map((m: any) => m.id);
      if (unreadIds.length > 0) {
        emitLoudaSocket('mark-read', {
          chatId: chatIdToUse,
          messageIds: unreadIds,
          isGroup,
        });
      }
    };

    openChat().finally(() => {
      if (!stale) setMessagesLoading(false);
    });
    return () => {
      stale = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedChat?.id, user?.id]);

  const handleLoadMore = useCallback(async () => {
    const chat = selectedChatRef.current;
    if (!chat || isLoadingMore || !messages.length) return;
    setIsLoadingMore(true);
    try {
      const oldest = messages[0].timestamp || messages[0].created_at;
      const chatId = chat.isGroup ? chat.id : chat.chatId;
      if (!chatId) return;
      const data = await api.getMessages(chatId, chat.isGroup, 20, oldest);
      const newMessages = data?.messages || [];
      if (newMessages.length < 20) setHasMoreMessages(false);
      if (newMessages.length > 0) setMessages((prev) => prependUniqueMsgs(newMessages, prev));
    } catch (e) {
      console.error('[Louda] load more failed', e);
    }
    setIsLoadingMore(false);
  }, [isLoadingMore, messages]);

  // ─── Textmob bridge intents (LoudaApp.jsx:6898-6979) ───
  // Native share sheet → chat picker: ShareToTextmobScreen parks the payload
  // in pendingShare before navigating to Chats (delivered immediately if we
  // are already mounted).
  useEffect(() => subscribePendingChatShare((p) => setSharePayload(p)), []);

  const openChatWithUsername = useCallback(
    async (username?: string, focusComposer = false) => {
      if (!username) return;
      const digits = (p: any) => String(p || '').replace(/\D/g, '').replace(/^0/, '234');
      const phonesMatch = (a: any, b: any) => {
        const x = digits(a);
        const y = digits(b);
        if (!x || !y || Math.min(x.length, y.length) < 7) return false;
        return x === y || x.endsWith(y) || y.endsWith(x);
      };
      const matchContact = (list: any[], loudaUserId: string, tmPhone: string) =>
        (list || []).find(
          (c) =>
            (loudaUserId && String(c.id) === String(loudaUserId)) ||
            (tmPhone && (phonesMatch(c.number, tmPhone) || phonesMatch(c.phone, tmPhone))),
        );
      try {
        const me = userIdRef.current;
        if (!me) return;
        const v: any = await api.textmobVerify(username);
        if (!v || !v.textmobUser) {
          loudaAlert({ title: 'Not found', message: `Could not find @${username}` });
          return;
        }
        const tm = v.textmobUser;
        let list: any[] = (await api.getContacts(me)) as any[];
        if (!Array.isArray(list)) list = [];
        let contact = matchContact(list, v.loudaUserId, tm.phone);
        if (!contact) {
          if (!tm.phone) {
            loudaAlert({
              title: 'No phone number',
              message: `@${username} has no phone number to chat with.`,
            });
            return;
          }
          await api.addContact({
            userId: me,
            phone: tm.phone,
            customName: tm.fullname || tm.full_name || username,
          });
          list = (await api.getContacts(me)) as any[];
          if (!Array.isArray(list)) list = [];
          contact = matchContact(list, v.loudaUserId, tm.phone);
          loadContacts(me);
        }
        if (!contact) throw new Error('Could not open chat');
        setActiveTab('chats');
        setPendingComposerFocus(!!focusComposer);
        setSelectedChat({ ...contact, isGroup: false } as any);
      } catch (e: any) {
        console.error('[Louda bridge] open-chat failed:', e);
        loudaAlert({ title: 'Error', message: e?.message || `Could not open chat with @${username}` });
      }
    },
    [loadContacts],
  );

  // Push-tap routing: open a group chat by id (queued intent may arrive
  // before groups finish loading — park it until the list is ready).
  const pendingGroupIntentRef = useRef<string | null>(null);
  const openGroupChatById = useCallback(
    (groupId: string) => {
      if (!groupId) return;
      const g = (groups || []).find((x: any) => String(x?.id) === String(groupId));
      if (g) {
        pendingGroupIntentRef.current = null;
        setActiveTab('chats');
        setSelectedChat({ ...(g as any), isGroup: true } as any);
        return;
      }
      pendingGroupIntentRef.current = groupId;
    },
    [groups],
  );
  const openGroupChatByIdRef = useRef(openGroupChatById);
  useEffect(() => {
    openGroupChatByIdRef.current = openGroupChatById;
  }, [openGroupChatById]);
  useEffect(() => {
    const parked = pendingGroupIntentRef.current;
    if (!parked || !groups.length) return;
    const g = groups.find((x: any) => String(x?.id) === String(parked));
    pendingGroupIntentRef.current = null;
    if (g) {
      setActiveTab('chats');
      setSelectedChat({ ...(g as any), isGroup: true } as any);
    }
  }, [groups]);

  useEffect(() => {
    const formatShareText = (detail: any = {}) => String(detail.url || detail.text || '').trim();
    const buildShareMessage = (detail: any = {}) => ({
      text: formatShareText(detail),
      media: [],
    });

    const onOpenChat = (e: any) => openChatWithUsername(e?.username, !!e?.focusComposer);
    const onOpenGroup = (e: any) => openGroupChatByIdRef.current?.(e?.groupId);
    const onShare = (e: any) => {
      if (e) setForwardPayload({ messages: [buildShareMessage(e)] });
    };

    const un1 = onLoudaEvent('louda:open-chat', onOpenChat);
    const un1b = onLoudaEvent('louda:open-group', onOpenGroup);
    const un2 = onLoudaEvent('louda:share', onShare);
    try {
      drainPendingIntents().forEach(({ type, detail }) => {
        if (type === 'louda:open-chat' && detail?.username)
          openChatWithUsername(detail.username, !!detail.focusComposer);
        else if (type === 'louda:open-group' && detail?.groupId)
          openGroupChatByIdRef.current?.(detail.groupId);
        else if (type === 'louda:share' && detail)
          setForwardPayload({ messages: [buildShareMessage(detail)] });
      });
    } catch {}
    return () => {
      un1();
      un1b();
      un2();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openChatWithUsername]);

  // ─── derived lists (LoudaApp.jsx:6985-7009, 7124-7147) ───
  const totalUnreadChats = useMemo(() => {
    let count = 0;
    contacts
      .filter((c) => !c.archived && !blockedUsers.includes(String(c.id)))
      .forEach((c) => (count += c.unreadCount || 0));
    groups.filter((g) => !g.archived).forEach((g) => (count += g.unreadCount || 0));
    return count;
  }, [contacts, groups, blockedUsers]);

  const totalUnreadArchived = useMemo(() => {
    let count = 0;
    contacts
      .filter((c) => c.archived && !blockedUsers.includes(String(c.id)))
      .forEach((c) => (count += c.unreadCount || 0));
    groups.filter((g) => g.archived).forEach((g) => (count += g.unreadCount || 0));
    return count;
  }, [contacts, groups, blockedUsers]);

  const totalUnreadStatuses = useMemo(() => {
    if (!user || !statuses) return 0;
    const contactStatuses = statuses.filter((s) => s.user_id !== user.id);
    const unviewedUserIds = new Set<string>();
    contactStatuses.forEach((s) => {
      if (!(s.views || []).some((v: any) => v.userId === user.id)) {
        unviewedUserIds.add(s.user_id);
      }
    });
    return unviewedUserIds.size;
  }, [statuses, user]);

  const memoizedChats = useMemo(() => {
    const displayName = (c: any) =>
      c.name === 'Louda AI'
        ? 'Textmob AI'
        : c.name === 'Louda Support'
          ? 'Textmob Support'
          : c.name;
    const all = [
      ...contacts
        .filter((c) => !blockedUsers.includes(String(c.id)))
        .map((c) => ({ ...c, name: displayName(c), isGroup: false })),
      ...groups.map((g) => ({ ...g, isGroup: true })),
    ].sort((a: any, b: any) => {
      const ua = a.unreadCount || a.unread_count || 0;
      const ub = b.unreadCount || b.unread_count || 0;
      if ((ub > 0) !== (ua > 0)) return ub - ua;
      if (ub !== ua) return ub - ua;
      const timeA = new Date(a.lastMessageTime || 0).getTime();
      const timeB = new Date(b.lastMessageTime || 0).getTime();
      return timeB - timeA;
    });
    if (activeTab === 'archived') return all.filter((c) => c.archived);
    return all.filter((c) => !c.archived);
  }, [contacts, groups, activeTab, blockedUsers]);

  // ─── chat CRUD (LoudaApp.jsx:7926-8164) ───
  const findUserByPhone = useCallback(async () => {
    if (!phoneInput.trim()) return;
    try {
      const data: any = await api.getUserByPhone(phoneInput);
      if (!data || data.error) throw new Error(data?.error || 'User not found');
      if (String(data.id) === String(userRef.current?.id)) {
        loudaAlert({ title: 'Cannot Add Self', message: 'You cannot add yourself to your contacts.' });
        return;
      }
      if (
        contacts?.some(
          (c) =>
            String(c.id) === String(data.id) || c.number === data.phone || c.phone === data.phone,
        )
      ) {
        loudaAlert({
          title: 'Already in Contacts',
          message: `${data.full_name || data.phone} is already in your contacts.`,
        });
        return;
      }
      setTempContact({ number: data.phone, name: data.full_name, avatar_url: data.avatar_url });
    } catch (e: any) {
      console.error('[Louda] findUserByPhone failed', e);
      loudaAlert({ title: 'Error', message: e.message });
    }
  }, [phoneInput, contacts]);

  const confirmAddContact = useCallback(async () => {
    if (!tempContact) return;
    const isDuplicate = contacts?.some(
      (c) =>
        c.number === tempContact.number ||
        c.phone === tempContact.number ||
        String(c.id) === String(tempContact.id),
    );
    if (isDuplicate) {
      loudaAlert({ title: 'Already in Contacts', message: 'This contact is already in your contacts.' });
      return;
    }
    try {
      await api.addContact({
        userId: userIdRef.current,
        phone: tempContact.number,
        customName: tempContact.customName || tempContact.name,
      });
      setShowAddContact(false);
      setTempContact(null);
      setPhoneInput('');
      loadContacts(userIdRef.current);
      loudaAlert({ title: 'Success', message: 'Contact added' });
    } catch (e: any) {
      console.error('[Louda] add contact failed', e);
      loudaAlert({ title: 'Error', message: e.message });
    }
  }, [tempContact, contacts, loadContacts]);

  const createGroupFn = useCallback(
    async (name: string, description: string, memberIds: string[]) => {
      try {
        const data: any = await api.createGroup({
          userId: userIdRef.current,
          name,
          description,
          memberIds,
        });
        if (data?.error) throw new Error(data.error);
        setShowCreateGroup(false);
        loadGroups(userIdRef.current);
        loudaAlert({ title: 'Success', message: 'Group created' });
      } catch (e: any) {
        console.error('[Louda] create group failed', e);
        loudaAlert({ title: 'Error', message: e.message });
      }
    },
    [loadGroups],
  );

  const addGroupMembersFn = useCallback(
    async (groupId: string, memberIds: string[]) => {
      try {
        const data: any = await api.addMembers(groupId, { userId: userIdRef.current, memberIds });
        if (data?.error) throw new Error(data.error);
        loadGroups(userIdRef.current);
        loudaAlert({ title: 'Success', message: 'Members added' });
      } catch (e: any) {
        console.error('[Louda] add members failed', e);
        loudaAlert({ title: 'Error', message: e.message });
      }
    },
    [loadGroups],
  );

  const updateContactNameFn = useCallback(
    async (contactId: string, newName: string) => {
      if (contactId === AI_ID || contactId === SUPPORT_ID) {
        loudaAlert({
          title: 'Not Allowed',
          message: 'You cannot edit the nickname of Textmob AI or Support Team',
        });
        return;
      }
      try {
        const res = await api.updateContactName({
          userId: userIdRef.current,
          contactId,
          newName,
        });
        if ((res as any)?.error) throw new Error('Failed to update name');
        loadContacts(userIdRef.current);
        loudaAlert({ title: 'Success', message: 'Nickname updated' });
      } catch (e: any) {
        console.error('[Louda] update contact name failed', e);
        loudaAlert({ title: 'Error', message: 'Failed to update name' });
      }
    },
    [loadContacts],
  );

  const updateGroupNicknameFn = useCallback(
    async (groupId: string, nickname: string) => {
      try {
        const res = await api.updateNickname(groupId, {
          userId: userIdRef.current,
          memberId: userIdRef.current,
          nickname,
        });
        if ((res as any)?.error) throw new Error('Failed to update nickname');
        loadGroups(userIdRef.current);
        loudaAlert({ title: 'Success', message: 'Nickname updated' });
      } catch (e: any) {
        console.error('[Louda] update group nickname failed', e);
        loudaAlert({ title: 'Error', message: 'Failed to update nickname' });
      }
    },
    [loadGroups],
  );

  const deleteChat = useCallback(
    async (chatId: string, forBoth: boolean, isGroup: boolean) => {
      try {
        if (isGroup) {
          const isAdmin = selectedChatRef.current?.admin_id === userIdRef.current;
          if (isAdmin) await api.deleteGroup(chatId, { userId: userIdRef.current });
          else await api.leaveGroup(chatId, { userId: userIdRef.current });
        } else {
          await api.deleteContact({ userId: userIdRef.current, contactId: chatId, forBoth });
        }
        setSelectedChat(null);
        if (isGroup) loadGroups(userIdRef.current);
        else loadContacts(userIdRef.current);
        loudaAlert({ title: 'Success', message: isGroup ? 'Left group' : 'Contact deleted' });
      } catch (e) {
        console.error('[Louda] delete chat failed', e);
        loudaAlert({ title: 'Error', message: 'Failed to delete' });
      }
    },
    [loadContacts, loadGroups],
  );

  const archiveChat = useCallback(
    async (chat: any) => {
      try {
        if (chat.isGroup) await api.archiveGroup(chat.id, { userId: userIdRef.current, groupId: chat.id });
        else await api.archiveContact({ userId: userIdRef.current, contactId: chat.id });
        if (chat.isGroup) loadGroups(userIdRef.current);
        else loadContacts(userIdRef.current);
      } catch (e) {
        console.error('[Louda] archive failed', e);
      }
    },
    [loadContacts, loadGroups],
  );

  const unarchiveChat = useCallback(
    async (chat: any) => {
      try {
        if (chat.isGroup)
          await api.unarchiveGroup(chat.id, { userId: userIdRef.current, groupId: chat.id });
        else await api.unarchiveContacts({ userId: userIdRef.current, contactId: chat.id });
        if (chat.isGroup) loadGroups(userIdRef.current);
        else loadContacts(userIdRef.current);
      } catch (e) {
        console.error('[Louda] unarchive failed', e);
      }
    },
    [loadContacts, loadGroups],
  );

  // ─── forward / share (LoudaApp.jsx:8166-8266) ───
  const handleForwardInitiate = useCallback((payload: any) => setForwardPayload(payload), []);

  const handleConfirmForward = useCallback(
    async (targets: any[]) => {
      if (!forwardPayload || !targets.length) return;
      try {
        const fp =
          forwardPayload.messages && forwardPayload.messages.length
            ? forwardPayload
            : {
                ...forwardPayload,
                messages: (forwardPayload.texts || []).map((text: string) => ({ text, media: [] })),
              };
        if (!fp.messages.length) {
          loudaAlert({ title: 'Error', message: 'Nothing to forward' });
          return;
        }
        const resolved: any[] = [];
        for (const t of targets) {
          if (t.isGroup) {
            resolved.push(t);
            continue;
          }
          const chatId = await fetchChatId(t.id);
          if (chatId) resolved.push({ id: chatId, isGroup: false });
        }
        if (!resolved.length) {
          loudaAlert({ title: 'Error', message: 'Could not open the selected chat(s)' });
          return;
        }
        const res: any = await api.bulkForwardMessages({
          userId: userRef.current?.id,
          targets: resolved,
          payload: fp,
        });
        if (res?.error) {
          loudaAlert({ title: 'Error', message: res.error || 'Forwarding failed' });
          return;
        }
        loudaAlert({
          title: 'Success',
          message: `Message(s) forwarded to ${resolved.length} chat(s)`,
        });
        setForwardPayload(null);
      } catch (e) {
        console.error('[Louda] forward failed', e);
        loudaAlert({ title: 'Error', message: 'Forwarding failed' });
      }
    },
    [forwardPayload, fetchChatId],
  );

  const handleConfirmShareMedia = useCallback(
    async (targets: any[]) => {
      if (!sharePayload || !targets.length) return;
      const shareText: string =
        typeof sharePayload.text === 'string' ? sharePayload.text.trim() : '';
      const rawFiles = Array.isArray(sharePayload.files) ? sharePayload.files : [];
      if (!rawFiles.length && !shareText) return;

      let files = rawFiles;
      if (files.length > 6) {
        loudaAlert({ title: 'Notice', message: 'Only the first 6 files will be sent.' });
        files = files.slice(0, 6);
      }
      const validFiles = files.filter((f: any) => f.size == null || f.size <= 10 * 1024 * 1024);
      if (validFiles.length < files.length) {
        loudaAlert({
          title: 'Notice',
          message: 'Some files were skipped because they exceed the 10MB limit.',
        });
      }
      if (validFiles.length === 0 && !shareText) {
        loudaAlert({ title: 'Error', message: 'No valid files to send.' });
        setSharePayload(null);
        return;
      }

      // Memoized contact rows don't always carry a chat id — resolve like the
      // forward flow does, otherwise send-message goes out with chatId: undefined.
      const resolved: any[] = [];
      for (const t of targets) {
        if (t.isGroup) {
          resolved.push(t);
          continue;
        }
        const chatId = t.chatId || (await fetchChatId(t.id));
        if (chatId) resolved.push({ ...t, chatId });
      }
      if (!resolved.length) {
        loudaAlert({ title: 'Error', message: 'Could not open the selected chat(s)' });
        return;
      }

      if (validFiles.length) loudaAlert({ title: 'Sending...', message: 'Uploading media...' });
      try {
        const media: any[] = [];
        for (const f of validFiles) {
          const kind = f.type?.startsWith('image/')
            ? 'image'
            : f.type?.startsWith('video/')
              ? 'video'
              : 'file';
          const data = await api.uploadFile({
            uri: f.uri,
            // Web appends a `type` field on every upload (LoudaApp.jsx:3480);
            // without it the server has to guess the resource kind from the
            // filename, which also has to carry an extension.
            name: withExtension(f.name, f.type, f.uri),
            type: f.type,
            kind,
          });
          if (!data?.url) throw new Error('Upload failed');
          media.push({ type: data.type || kind, url: data.url });
        }
        for (const target of resolved) {
          const message = { text: shareText, media };
          if (target.isGroup) {
            emitLoudaSocket('send-group-message', {
              groupId: target.id,
              message,
            });
          } else {
            emitLoudaSocket('send-message', {
              chatId: target.chatId,
              toUserId: target.id,
              message,
            });
          }
          const notifyPayload = buildPushNotifyPayload(userRef.current, target, message);
          if (notifyPayload) api.notifyLoudaMessage(notifyPayload);
        }
        setSharePayload(null);
        loudaAlert({
          title: 'Success',
          message: `${validFiles.length ? 'Media' : 'Message'} sent to ${resolved.length} chat(s)!`,
        });
      } catch (e) {
        console.error('[Louda] share media failed', e);
        loudaAlert({ title: 'Error', message: 'Failed to share media.' });
      }
    },
    [sharePayload, fetchChatId],
  );

  // ─── settings / profile (LoudaApp.jsx:8269-8565) ───
  const handleSave = useCallback(
    async (newPrefs: any) => {
      try {
        const res: any = await api.savePreferences({
          userId: userIdRef.current || userRef.current?.id,
          preferences: newPrefs,
        });
        if (res?.error) throw new Error('Failed to save');
        setUser((prev: any) => ({ ...prev, preferences: newPrefs }));
        setShowSettings(false);
        setActiveTab((prev) => (prev === 'settings' ? 'chats' : prev));
        loudaAlert({ title: 'Success', message: 'Settings saved!' });
      } catch (e) {
        console.error('[Louda] save preferences failed', e);
        loudaAlert({ title: 'Error', message: 'Failed to save settings' });
      }
    },
    [],
  );

  const handleUpdateProfile = useCallback(async (updates: any) => {
    try {
      const res: any = await api.updateUser({ userId: userIdRef.current, ...updates });
      if (res?.error) throw new Error(res.error || 'Failed to update profile');
      setUser((prev: any) => ({ ...prev, ...updates }));
      loudaAlert({ title: 'Success', message: 'Profile updated' });
    } catch (e: any) {
      console.error('[Louda] update profile failed', e);
      loudaAlert({ title: 'Error', message: e.message });
    }
  }, []);

  const handleUpdateField = useCallback(
    async (id: string, field: string, value: any, isGroup: boolean) => {
      const currentUserId = userIdRef.current || userRef.current?.id;
      if (isGroup) {
        if (field === 'name') {
          await onSaveGroupName(id, value);
          if (selectedChatRef.current?.isGroup && selectedChatRef.current.id === id) {
            setSelectedChat((prev) => (prev ? { ...prev, name: value } : prev));
          }
          setViewProfile((prev: any) =>
            prev?.isGroup && prev.id === id ? { ...prev, name: value } : prev,
          );
        } else if (field === 'nickname') {
          await updateGroupNicknameFn(id, value);
          const mapMembers = (prev: any) =>
            prev?.members?.map((m: any) =>
              m.user_id === currentUserId ? { ...m, nickname: value } : m,
            );
          if (selectedChatRef.current?.isGroup && selectedChatRef.current.id === id) {
            setSelectedChat((prev) => (prev ? { ...prev, members: mapMembers(prev) } : prev));
          }
          setViewProfile((prev: any) =>
            prev?.isGroup && prev.id === id ? { ...prev, members: mapMembers(prev) } : prev,
          );
        } else if (field.startsWith('settings.')) {
          const settingKey = field.split('.')[1];
          await onSaveSettings(id, { [settingKey]: value });
        } else if (field === 'description') {
          await onSaveSettings(id, { description: value });
          if (selectedChatRef.current?.isGroup && selectedChatRef.current.id === id) {
            setSelectedChat((prev) => (prev ? { ...prev, description: value } : prev));
          }
          setViewProfile((prev: any) =>
            prev?.isGroup && prev.id === id ? { ...prev, description: value } : prev,
          );
        }
      } else {
        if (field === 'nickname' || field === 'name') {
          await updateContactNameFn(id, value);
          setContacts((prev) => prev.map((c) => (c.id === id ? { ...c, name: value } : c)));
          const cur = selectedChatRef.current;
          if (cur && !cur.isGroup && (cur.id === id || cur.chatId === id)) {
            setSelectedChat((prev) => (prev ? { ...prev, name: value } : prev));
          }
          setViewProfile((prev: any) =>
            prev && !prev.isGroup && prev.id === id ? { ...prev, name: value } : prev,
          );
        } else if (field.startsWith('settings.')) {
          const settingKey = field.split('.')[1];
          await onSaveChatSettings(selectedChatRef.current?.chatId || id, { [settingKey]: value });
        } else if (field === 'description') {
          if (id === currentUserId) {
            handleSave({ ...userRef.current?.preferences, status: value });
          } else {
            await onSaveChatSettings(selectedChatRef.current?.chatId || id, { description: value });
          }
        }
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [updateContactNameFn, updateGroupNicknameFn, handleSave],
  );

  const onSaveGroupName = useCallback(
    async (id: string, name: string) => {
      try {
        const res: any = await api.renameGroup(id, { name, userId: userIdRef.current });
        if (res?.error) throw new Error('Failed to update group name');
        loadGroups(userIdRef.current);
        loudaAlert({ title: 'Success', message: 'Group name updated' });
      } catch (e) {
        console.error('[Louda] rename group failed', e);
        loudaAlert({ title: 'Error', message: 'Failed to update group name' });
      }
    },
    [loadGroups],
  );

  const onSaveSettings = useCallback(
    async (id: string, settings: any) => {
      try {
        const res: any = await api.updateGroupSettings(id, { settings, userId: userIdRef.current });
        if (res?.error) throw new Error(res.error);
        setGroups((prev) =>
          prev.map((g) => (g.id === id ? { ...g, settings: { ...g.settings, ...settings } } : g)),
        );
        const cur = selectedChatRef.current;
        if (cur?.isGroup && cur.id === id) {
          setSelectedChat((prev) => (prev ? { ...prev, settings: { ...prev.settings, ...settings } } : prev));
        }
        setViewProfile((prev: any) =>
          prev?.isGroup && prev.id === id
            ? { ...prev, settings: { ...prev.settings, ...settings } }
            : prev,
        );
        loudaAlert({ title: 'Success', message: 'Settings updated' });
      } catch (error: any) {
        loudaAlert({
          title: 'Error',
          message: error?.message || 'Network error. Please try again.',
        });
      }
    },
    [],
  );

  const onSaveChatSettings = useCallback(async (id: string, settings: any) => {
    try {
      const res: any = await api.updateChatSettings(id, { settings, userId: userIdRef.current });
      if (res?.error) throw new Error(res.error);
      setContacts((prev) =>
        prev.map((c) => (c.chatId === id ? { ...c, settings: { ...c.settings, ...settings } } : c)),
      );
      const cur = selectedChatRef.current;
      if (!cur?.isGroup && cur?.chatId === id) {
        setSelectedChat((prev) => (prev ? { ...prev, settings: { ...prev.settings, ...settings } } : prev));
      }
      loudaAlert({ title: 'Success', message: 'Chat settings updated' });
    } catch (e: any) {
      loudaAlert({ title: 'Error', message: e?.message || 'Failed to update settings' });
    }
  }, []);

  // ─── messaging (LoudaApp.jsx:8383-8447) ───
  const handleSend = useCallback((msg: any) => {
    const chat = selectedChatRef.current;
    if (!chat) {
      loudaAlert({ title: 'Not sent', message: 'Open a conversation and try again.' });
      return;
    }
    const result = chat.isGroup
      ? emitLoudaSocket('send-group-message', { groupId: chat.id, message: msg })
      : emitLoudaSocket('send-message', {
          chatId: chat.chatId,
          toUserId: chat.id,
          message: msg,
        });
    // A dropped emit used to look exactly like a successful send. Queued is
    // fine (socket.io buffers until reconnect) — only a null socket is lost.
    if (result === 'dropped') {
      loudaAlert({
        title: 'Not sent',
        message: 'You are offline. Reconnect and send the message again.',
      });
      return;
    }
    if (result === 'queued') {
      loudaAlert({
        title: 'Sending…',
        message: 'You are offline — the message will go out when you reconnect.',
      });
    }
    const notifyPayload = buildPushNotifyPayload(userRef.current, chat, msg);
    if (notifyPayload) api.notifyLoudaMessage(notifyPayload);
  }, []);

  const handleEditMessage = useCallback((messageId: string, newText: string) => {
    const chat = selectedChatRef.current;
    if (!chat) return;
    emitLoudaSocket('edit-message', {
      chatId: chat.isGroup ? chat.id : chat.chatId,
      messageId,
      newText,
      isGroup: chat.isGroup,
    });
    setMessages((prev) =>
      prev.map((m) =>
        m.id === messageId ? { ...m, text: newText, is_edited: true, translations: {} } : m,
      ),
    );
    setEditingMessage(null);
  }, []);

  const handleTyping = useCallback(() => {
    try {
      const chat = selectedChatRef.current;
      if (!chat) return;
      const u = userRef.current;
      // Web 8413: user.full_name || user.username || localStorage 'username' || 'Someone'
      const nickname =
        (u && (u.full_name || u.username)) || getTextmobUserSync() || 'Someone';
      const targetId = chat.id;
      emitLoudaSocket('typing', { to: targetId, isGroup: chat.isGroup, nickname });
      if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
      typingTimerRef.current = setTimeout(() => {
        emitLoudaSocket('stop-typing', { to: targetId, isGroup: chat.isGroup, nickname });
        typingTimerRef.current = null;
      }, 1500);
    } catch (e) {
      console.error('[Louda] handleTyping failed', e);
    }
  }, []);

  const onDeleteMessage = useCallback(async (messageId: string) => {
    const chat = selectedChatRef.current;
    if (!chat) return;
    try {
      const res: any = await api.deleteMessages({
        chatId: chat.isGroup ? chat.id : chat.chatId,
        messageId,
        isGroup: chat.isGroup,
        userId: userIdRef.current,
      });
      if (res?.error) throw new Error(res.error);
      setMessages((prev) => prev.filter((m) => m.id !== messageId));
    } catch (e: any) {
      console.error('[Louda] delete message failed', e);
      loudaAlert({ title: 'Error', message: e?.message || 'Failed to delete message' });
    }
  }, []);

  const onUploadAvatar = useCallback(
    async (id: string, fileOrUrl: any, isGroup: boolean) => {
      let url = fileOrUrl;
      const userId = userIdRef.current;
      if (fileOrUrl && typeof fileOrUrl === 'object' && fileOrUrl.uri) {
        let uploadErr: any = null;
        for (let attempt = 0; attempt < 2; attempt++) {
          try {
            const uploadData = await api.uploadFile({
              uri: fileOrUrl.uri,
              name: fileOrUrl.name,
              type: fileOrUrl.type || 'image/jpeg',
            });
            url = uploadData.url;
            uploadErr = null;
            break;
          } catch (err) {
            uploadErr = err;
          }
        }
        if (uploadErr) {
          loudaAlert({
            title: 'Upload Failed',
            message:
              (uploadErr as any)?.message || 'Image upload failed. Check your connection and try again.',
          });
          return;
        }
      }
      try {
        const res: any = isGroup
          ? await api.setGroupAvatar(id, { avatar_url: url, userId })
          : await api.setUserAvatar({ avatar_url: url, userId });
        if (res?.error) throw new Error('Failed to update avatar');
        if (isGroup) {
          loadGroups(userId);
          const cur = selectedChatRef.current;
          if (cur?.isGroup && cur.id === id)
            setSelectedChat((prev) => (prev ? { ...prev, avatar_url: url } : prev));
          setViewProfile((prev: any) =>
            prev?.isGroup && prev.id === id ? { ...prev, avatar_url: url } : prev,
          );
        } else {
          setUser((prev: any) => ({ ...prev, avatar_url: url }));
          loadContacts(userId);
          const vp = selectedChatRef.current;
          if (vp && !vp.isGroup && String(vp.id) === String(id)) {
            setSelectedChat((prev) => (prev ? { ...prev, avatar_url: url } : prev));
          }
          // Web 8484-8486: refresh the open profile view too
          setViewProfile((prev: any) =>
            prev && !prev.isGroup && String(prev.id) === String(id)
              ? { ...prev, avatar_url: url }
              : prev,
          );
        }
        loudaAlert({ title: 'Success', message: 'Avatar updated' });
      } catch (e) {
        console.error('[Louda] avatar update failed', e);
        loudaAlert({ title: 'Error', message: 'Failed to update avatar' });
      }
    },
    [loadContacts, loadGroups],
  );

  // ─── group members (LoudaApp.jsx:8609-8678) ───
  const handleRemoveMember = useCallback(
    async (groupId: string, targetMemberId: string) => {
      Alert.alert('Confirm', 'Are you sure you want to remove this member?', [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              const res: any = await api.removeMember(groupId, {
                userId: userRef.current?.id,
                targetMemberId,
              });
              if (res?.error) throw new Error(res.error);
              loadGroups();
              // Web 8619: only patch group state + the open profile view when
              // the profile being edited is this group
              const openProfile = viewProfileRef.current;
              if (openProfile?.id === groupId) {
                setGroups((prev) =>
                  prev.map((g) => {
                    if (g.id !== groupId) return g;
                    const updatedMembers = (g.members || []).filter(
                      (m: any) => m.user_id !== targetMemberId,
                    );
                    return {
                      ...g,
                      members: updatedMembers,
                      members_ids: updatedMembers.map((m: any) => m.user_id),
                    };
                  }),
                );
                setViewProfile((prev: any) => {
                  if (!prev?.members) return prev;
                  const updatedMembers = prev.members.filter(
                    (m: any) => m.user_id !== targetMemberId,
                  );
                  return {
                    ...prev,
                    members: updatedMembers,
                    members_ids: updatedMembers.map((m: any) => m.user_id),
                  };
                });
              }
              loudaAlert({ title: 'Success', message: 'Member removed' });
            } catch (e: any) {
              loudaAlert({ title: 'Error', message: e.message });
            }
          },
        },
      ]);
    },
    [loadGroups],
  );

  const handlePromoteAdmin = useCallback(
    async (groupId: string, targetMemberId: string) => {
      try {
        const res: any = await api.promoteAdmin(groupId, {
          userId: userRef.current?.id,
          targetMemberId,
        });
        if (res?.error) throw new Error(res.error);
        loadGroups();
        loudaAlert({ title: 'Success', message: 'Member promoted to Admin' });
      } catch (e: any) {
        loudaAlert({ title: 'Error', message: e.message });
      }
    },
    [loadGroups],
  );

  const handleDemoteAdmin = useCallback(
    async (groupId: string, targetMemberId: string) => {
      try {
        const res: any = await api.demoteAdmin(groupId, {
          userId: userRef.current?.id,
          targetMemberId,
        });
        if (res?.error) throw new Error(res.error);
        loadGroups();
        loudaAlert({ title: 'Success', message: 'Member demoted from Admin' });
      } catch (e: any) {
        loudaAlert({ title: 'Error', message: e.message });
      }
    },
    [loadGroups],
  );

  // ─── profile actions / misc (LoudaApp.jsx:8682-8884, 8567-8584) ───
  const handleProfileAction = useCallback(
    (action: string, data?: any) => {
      const chat = selectedChatRef.current;
      if (action === 'message') {
        setSelectedChat(data);
        setViewProfile(null);
      } else if (action === 'delete') {
        deleteChat(data.id, false, data.isGroup);
        setViewProfile(null);
      } else if (action === 'leave') {
        deleteChat(data.id, false, true);
        setViewProfile(null);
        setShowChatInfo(false);
      } else if (action === 'viewMember') {
        const member = chat?.members?.find((m: any) => m.user_id === data);
        if (member) {
          setViewProfile({
            ...member,
            id: member.user_id,
            name: member.nickname || (member as any).real_name,
          });
        }
      } else if (action === 'removeMember') {
        handleRemoveMember(chat?.id || data, data);
      } else if (action === 'promoteAdmin') {
        handlePromoteAdmin(chat?.id || '', data);
      } else if (action === 'demoteAdmin') {
        handleDemoteAdmin(chat?.id || '', data);
      } else if (action === 'addMembers') {
        setShowAddMembers(data);
      } else if (action === 'setBackground') {
        setChatBgs((prev) => {
          const bgs = { ...prev };
          if (data.bgUrl) bgs[data.id] = data.bgUrl;
          else delete bgs[data.id];
          setStore(KEY_CHAT_BGS, JSON.stringify(bgs)).catch(() => {});
          return bgs;
        });
      }
    },
    [deleteChat, handleRemoveMember, handlePromoteAdmin, handleDemoteAdmin],
  );

  const closeSettings = useCallback(() => {
    setShowSettings(false);
    setActiveTab((prev) => (prev === 'settings' ? 'chats' : prev));
  }, []);

  const toggleChatSelect = useCallback((chatId: string, isLongPress?: boolean) => {
    if (isLongPress && !chatSelectionMode) {
      setChatSelectionMode(true);
      setSelectedChats(new Set([chatId]));
      return;
    }
    if (!chatSelectionMode) return;
    setSelectedChats((prev) => {
      const next = new Set(prev);
      if (next.has(chatId)) next.delete(chatId);
      else next.add(chatId);
      if (next.size === 0) setChatSelectionMode(false);
      return next;
    });
  }, [chatSelectionMode]);

  const exitChatSelection = useCallback(() => {
    setChatSelectionMode(false);
    setSelectedChats(new Set());
  }, []);

  const handleBulkChatDelete = useCallback(async () => {
    const ids = [...selectedChats];
    const groupIds: string[] = [];
    const contactIds: string[] = [];
    ids.forEach((id) => {
      const chat = memoizedChats.find((c) => c.id === id);
      if (chat) {
        if (chat.isGroup) groupIds.push(chat.id);
        else contactIds.push(chat.id);
      }
    });
    try {
      if (groupIds.length > 0) {
        await api.bulkLeaveGroups({ groupIds, userId: userIdRef.current });
      }
      if (contactIds.length > 0) {
        await api.bulkDeleteContacts({
          contactIds,
          userId: userIdRef.current,
          forBoth: false,
        });
      }
      exitChatSelection();
      if (groupIds.length > 0) loadGroups(userIdRef.current);
      if (contactIds.length > 0) loadContacts(userIdRef.current);
      if (selectedChat && ids.includes(selectedChat.id)) setSelectedChat(null);
      loudaAlert({ title: 'Success', message: 'Chat(s) deleted' });
    } catch (e) {
      loudaAlert({ title: 'Error', message: 'Failed to delete chats' });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedChats, memoizedChats, selectedChat, exitChatSelection, loadContacts, loadGroups]);

  const handleBulkChatArchive = useCallback(async () => {
    const ids = [...selectedChats];
    const groupIds: string[] = [];
    const contactIds: string[] = [];
    ids.forEach((id) => {
      const chat = memoizedChats.find((c) => c.id === id);
      if (chat) {
        if (chat.isGroup) groupIds.push(chat.id);
        else contactIds.push(chat.id);
      }
    });
    try {
      const archiveStatus = activeTab !== 'archived';
      if (groupIds.length > 0) {
        await Promise.all(
          groupIds.map((groupId) =>
            archiveStatus
              ? api.archiveGroup(groupId, { userId: userIdRef.current })
              : api.unarchiveGroup(groupId, { userId: userIdRef.current }),
          ),
        );
      }
      if (contactIds.length > 0) {
        await api.bulkArchiveContacts({
          contactIds,
          userId: userIdRef.current,
          archive: archiveStatus,
        });
      }
      exitChatSelection();
      if (groupIds.length > 0) loadGroups(userIdRef.current);
      if (contactIds.length > 0) loadContacts(userIdRef.current);
      if (selectedChat && ids.includes(selectedChat.id)) setSelectedChat(null);
      loudaAlert({
        title: 'Success',
        message: `Chat(s) ${archiveStatus ? 'archived' : 'unarchived'}`,
      });
    } catch (e) {
      loudaAlert({ title: 'Error', message: 'Failed to archive chats' });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedChats, memoizedChats, activeTab, selectedChat, exitChatSelection, loadContacts, loadGroups]);

  const handleContextMenu = useCallback(
    (position: { x: number; y: number }, chat: any) => {
      setContextMenu({
        position,
        options: [
          {
            label: chat.archived ? 'Unarchive' : 'Archive',
            icon: <Icons.archive size={16} color="#9ca3af" />,
            onClick: () => (chat.archived ? unarchiveChat(chat) : archiveChat(chat)),
          },
          {
            label: 'Delete',
            icon: <Icons.trash size={16} color="#9ca3af" />,
            danger: true,
            onClick: () => deleteChat(chat.id, false, chat.isGroup),
          },
        ],
      });
    },
    [archiveChat, unarchiveChat, deleteChat],
  );

  const handleTabChange = useCallback((tabId: ActiveTab) => {
    setActiveTab(tabId);
    if (tabId === 'settings') setShowSettings(true);
    if (tabId === 'chats') setSelectedChat(null);
  }, []);

  const handleViewProfile = useCallback((c: any) => setViewProfile(c), []);

  const toggleBlockUser = useCallback((userId: string) => {
    setBlockedUsers((prev) => {
      const next = prev.includes(String(userId))
        ? prev.filter((id) => id !== String(userId))
        : [...prev, String(userId)];
      setStore(KEY_BLOCKED, JSON.stringify(next)).catch(() => {});
      return next;
    });
  }, []);

  // MUST be memoized: an unstable context value re-renders every consumer on
  // every provider render. This provider owns 47 useState hooks and 26 socket
  // handlers, so without this a single typing indicator or presence tick
  // re-rendered LoudaHomeScreen, ChatListPane, ChatThreadPane and friends.
  const value: LoudaStoreValue = useMemo(() => ({
    user,
    contacts,
    groups,
    statuses,
    messages,
    selectedChat,
    activeTab,
    blockedUsers,
    chatBgs,
    typingRegistry,
    connectionState,
    isLoadingChats,
    isLoadingMore,
    hasMoreMessages,
    searchQuery,
    showChatSearch,
    memoizedChats,
    totalUnreadChats,
    totalUnreadArchived,
    totalUnreadStatuses,

    showSettings,
    showAddContact,
    showCreateGroup,
    showChatInfo,
    tempContact,
    phoneInput,
    showAddMembers,
    showStatusCreator,
    viewerTarget,
  viewerStatusId,
  setViewerStatusId,
    showStatusCamera,
    statusCameraMedia,
    cameraRequest,
    messagesLoading,
    contextMenu,
    replyTo,
    translations,
    messageInfo,
    editingMessage,
    mediaView,
    viewProfile,
    mobileMenuOpen,
    forwardPayload,
    sharePayload,
    selectedChats,
    chatSelectionMode,
    tmSearchQuery,
    tmSearchResults,
    isSearchingTm,
    tmSearchMode,

    setUser,
    setActiveTab,
    setSelectedChat,
    setShowSettings,
    setShowAddContact,
    setShowCreateGroup,
    setShowChatInfo,
    setTempContact,
    setPhoneInput,
    setShowAddMembers,
    setShowStatusCreator,
    setViewerTarget,
    setShowStatusCamera,
    setStatusCameraMedia,
    setCameraRequest,
    setContextMenu,
    setReplyTo,
    setTranslations,
    setMessageInfo,
    setEditingMessage,
    setMediaView,
    setViewProfile,
    setMobileMenuOpen,
    setForwardPayload,
    setSharePayload,
    setSelectedChats,
    setChatSelectionMode,
    setSearchQuery,
    setShowChatSearch,
    setTmSearchQuery,
    setTmSearchResults,
    setIsSearchingTm,
    setTmSearchMode,
    setStatuses,
    setMessages,

    loadContacts,
    loadGroups,
    loadStatuses,
    handleLoadMore,
    findUserByPhone,
    confirmAddContact,
    createGroup: createGroupFn,
    addGroupMembers: addGroupMembersFn,
    updateContactName: updateContactNameFn,
    updateGroupNickname: updateGroupNicknameFn,
    deleteChat,
    archiveChat,
    unarchiveChat,
    handleForwardInitiate,
    handleConfirmForward,
    handleConfirmShareMedia,
    handleSave,
    handleUpdateProfile,
    handleUpdateField,
    handleSend,
    handleEditMessage,
    handleTyping,
    onDeleteMessage,
    onUploadAvatar,
    handleContextMenu,
    handleTabChange,
    handleProfileAction,
    handleViewProfile,
    handleRemoveMember,
    handlePromoteAdmin,
    handleDemoteAdmin,
    closeSettings,
    toggleChatSelect,
    exitChatSelection,
    handleBulkChatDelete,
    handleBulkChatArchive,
    toggleBlockUser,
    handleTranslate,
    handleViewInfo,
    openChatWithUsername,
    openGroupChatById,
    pendingComposerFocus,
    setPendingComposerFocus,
    onExit,
  }), [user, contacts, groups, statuses, messages, selectedChat, activeTab, blockedUsers, chatBgs, typingRegistry, connectionState, isLoadingChats, isLoadingMore, hasMoreMessages, searchQuery, showChatSearch, memoizedChats, totalUnreadChats, totalUnreadArchived, totalUnreadStatuses, showSettings, showAddContact, showCreateGroup, showChatInfo, tempContact, phoneInput, showAddMembers, showStatusCreator, viewerTarget, viewerStatusId, setViewerStatusId, showStatusCamera, statusCameraMedia, cameraRequest, messagesLoading, contextMenu, replyTo, translations, messageInfo, editingMessage, mediaView, viewProfile, mobileMenuOpen, forwardPayload, sharePayload, selectedChats, chatSelectionMode, tmSearchQuery, tmSearchResults, isSearchingTm, tmSearchMode, setUser, setActiveTab, setSelectedChat, setShowSettings, setShowAddContact, setShowCreateGroup, setShowChatInfo, setTempContact, setPhoneInput, setShowAddMembers, setShowStatusCreator, setViewerTarget, setShowStatusCamera, setStatusCameraMedia, setCameraRequest, setContextMenu, setReplyTo, setTranslations, setMessageInfo, setEditingMessage, setMediaView, setViewProfile, setMobileMenuOpen, setForwardPayload, setSharePayload, setSelectedChats, setChatSelectionMode, setSearchQuery, setShowChatSearch, setTmSearchQuery, setTmSearchResults, setIsSearchingTm, setTmSearchMode, setStatuses, setMessages, loadContacts, loadGroups, loadStatuses, handleLoadMore, findUserByPhone, confirmAddContact, createGroupFn, addGroupMembersFn, updateContactNameFn, updateGroupNicknameFn, deleteChat, archiveChat, unarchiveChat, handleForwardInitiate, handleConfirmForward, handleConfirmShareMedia, handleSave, handleUpdateProfile, handleUpdateField, handleSend, handleEditMessage, handleTyping, onDeleteMessage, onUploadAvatar, handleContextMenu, handleTabChange, handleProfileAction, handleViewProfile, handleRemoveMember, handlePromoteAdmin, handleDemoteAdmin, closeSettings, toggleChatSelect, exitChatSelection, handleBulkChatDelete, handleBulkChatArchive, toggleBlockUser, handleTranslate, handleViewInfo, openChatWithUsername, openGroupChatById, pendingComposerFocus, setPendingComposerFocus, onExit]);

  return <LoudaStoreContext.Provider value={value}>{children}</LoudaStoreContext.Provider>;
}
