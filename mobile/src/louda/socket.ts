import { io, Socket } from 'socket.io-client';
import { createAudioPlayer } from 'expo-audio';
import { LOUDA_API_URL } from './constants';

export type LoudaConnectionState = 'disconnected' | 'connecting' | 'connected' | 'reconnecting';

type Handler = (...args: any[]) => void;

const NOTIFICATION_SOUND =
  'https://ldepewastfyohswgtgbb.supabase.co/storage/v1/object/public/LOUDA/dragon-studio-new-notification-3-398649.mp3';

let socket: Socket | null = null;
let currentUserId: string | null = null;
let connectionState: LoudaConnectionState = 'disconnected';
// Websocket-only mirrors the web app, but it is also the one transport a
// mobile network can block outright. Flip this after the first connect error
// and rebuild through polling, which cannot be blocked the same way.
let allowPollingFallback = false;

const eventHandlers = new Map<string, Set<Handler>>();
const stateHandlers = new Set<(s: LoudaConnectionState) => void>();
const typingHandlers = new Set<() => void>();
const presenceHandlers = new Set<() => void>();

let typingRegistry: Record<string, string[]> = {};
const typingTimers: Record<string, any> = {};
let onlineFriends: string[] = [];
let statusPollTimer: any = null;
let notificationPlayer: any = null;
let pendingUserIds: string[] = [];

function emitLocal(event: string, ...args: any[]) {
  const set = eventHandlers.get(event);
  if (!set) return;
  set.forEach((h) => {
    try {
      h(...args);
    } catch (e) {
      console.warn('[LoudaSocket] handler error', event, e);
    }
  });
}

function setState(next: LoudaConnectionState) {
  if (connectionState === next) return;
  connectionState = next;
  stateHandlers.forEach((h) => {
    try {
      h(next);
    } catch {}
  });
}

function playNotificationSound() {
  try {
    if (typeof createAudioPlayer !== 'function') return;
    if (!notificationPlayer) {
      notificationPlayer = createAudioPlayer({ uri: NOTIFICATION_SOUND });
    }
    const p = notificationPlayer;
    if (!p) return;
    // Guard every call: a partially-created player on Android used to throw
    // "TypeError: undefined is not a function" and take the beep with it.
    try {
      if (typeof p.currentTime === 'number' && p.currentTime > 0 && typeof p.seekTo === 'function') {
        p.seekTo(0);
      }
    } catch {}
    if (typeof p.play === 'function') p.play();
  } catch (e) {
    console.warn('[LoudaSocket] sound failed', e);
  }
}

function upsertTyper(targetId: string, nickname: string) {
  const current = typingRegistry[targetId] || [];
  if (current.includes(nickname)) return;
  typingRegistry = { ...typingRegistry, [targetId]: [...current, nickname] };
  notifyTyping();

  const key = `${targetId}_${nickname}`;
  if (typingTimers[key]) clearTimeout(typingTimers[key]);
  typingTimers[key] = setTimeout(() => {
    removeTyper(targetId, nickname);
    delete typingTimers[key];
  }, 3000);
}

function removeTyper(targetId: string, nickname: string) {
  const current = typingRegistry[targetId] || [];
  const filtered = current.filter((n) => n !== nickname);
  const next = { ...typingRegistry };
  if (filtered.length === 0) delete next[targetId];
  else next[targetId] = filtered;
  typingRegistry = next;
  notifyTyping();
}

function notifyTyping() {
  typingHandlers.forEach((h) => {
    try {
      h();
    } catch {}
  });
}

function setOnline(id: string, online: boolean) {
  if (online) {
    if (!onlineFriends.includes(id)) onlineFriends = [...onlineFriends, id];
  } else {
    onlineFriends = onlineFriends.filter((x) => x !== id);
  }
  presenceHandlers.forEach((h) => {
    try {
      h();
    } catch {}
  });
}

function registerCoreHandlers(s: Socket) {
  s.on('connect', () => {
    console.log('[LoudaSocket] connected');
    setState('connected');
    pendingUserIds.forEach((id) => s.emit('send-message-queued', { userId: id }));
    pendingUserIds = [];
  });
  s.on('connect_error', (err: any) => {
    // Previously unhandled: a blocked WebSocket (carrier/proxy/hotspot) left
    // the app stuck on "connecting" forever with every emit buffered and no
    // log line to explain it.
    console.warn('[LoudaSocket] connect_error', err?.message || err);
    setState('reconnecting');
    if (allowPollingFallback) return;
    allowPollingFallback = true;
    const uid = currentUserId;
    console.warn('[LoudaSocket] websocket blocked — retrying via polling transport');
    setTimeout(() => {
      if (!uid || currentUserId !== uid) return;
      try {
        disconnectLoudaSocket();
      } catch {}
      connectLoudaSocket(uid);
    }, 500);
  });
  s.on('disconnect', () => {
    console.log('[LoudaSocket] disconnected');
    setState('disconnected');
  });
  s.on('reconnecting', () => setState('reconnecting'));
  s.on('reconnect', () => {
    console.log('[LoudaSocket] reconnected');
    setState('connected');
    emitLocal('reconnect');
  });

  s.on('sync-statuses', (data) => emitLocal('sync-statuses', data));
  s.on('new-status', (status) => emitLocal('new-status', status));
  s.on('status-deleted', (statusId) => emitLocal('status-deleted', statusId));
  s.on('status-viewed', (payload) => emitLocal('status-viewed', payload));
  s.on('status-reacted', (payload) => emitLocal('status-reacted', payload));

  s.on('contacts-updated', () => emitLocal('contacts-updated'));
  s.on('groups-updated', () => emitLocal('groups-updated'));
  s.on('user-updated', (payload) => emitLocal('user-updated', payload));

  s.on('initial-online', (list: string[]) => {
    (list || []).forEach((id) => {
      if (!onlineFriends.includes(id)) onlineFriends = [...onlineFriends, id];
    });
    presenceHandlers.forEach((h) => {
      try {
        h();
      } catch {}
    });
    emitLocal('initial-online', list);
  });
  s.on('status-update', ({ friendId, online, lastSeen }: any) => {
    setOnline(friendId, online);
    emitLocal('status-update', { friendId, online, lastSeen });
  });
  s.on('sync-online-status', (list: string[]) => {
    onlineFriends = list || [];
    presenceHandlers.forEach((h) => {
      try {
        h();
      } catch {}
    });
    emitLocal('sync-online-status', list);
  });

  s.on('new-message', (payload: any) => {
    if (payload?.message?.from !== currentUserId) playNotificationSound();
    emitLocal('new-message', payload);
  });
  s.on('new-group-message', (payload: any) => {
    if (payload?.message?.from !== currentUserId) playNotificationSound();
    emitLocal('new-group-message', payload);
  });

  s.on('message-edited', (payload) => emitLocal('message-edited', payload));
  s.on('message-translated', (payload) => emitLocal('message-translated', payload));
  s.on('group-created', (payload) => emitLocal('group-created', payload));
  s.on('added-to-group', (payload) => emitLocal('added-to-group', payload));
  s.on('group-updated', (payload) => emitLocal('group-updated', payload));
  s.on('member-left', (payload) => emitLocal('member-left', payload));
  s.on('message-status', (payload) => emitLocal('message-status', payload));
  s.on('messages-read', (payload) => emitLocal('messages-read', payload));
  s.on('message-deleted', (payload) => emitLocal('message-deleted', payload));
  s.on('message-reacted', (payload) => emitLocal('message-reacted', payload));
  s.on('message-pinned', (payload) => emitLocal('message-pinned', payload));
  s.on('message-unpinned', (payload) => emitLocal('message-unpinned', payload));

  s.on('typing', ({ to, isGroup, nickname, from }: any) => {
    const targetId = isGroup ? to : from;
    if (targetId && nickname) upsertTyper(String(targetId), nickname);
    emitLocal('typing', { to, isGroup, nickname, from });
  });
  s.on('stop-typing', ({ to, isGroup, nickname, from }: any) => {
    const targetId = isGroup ? to : from;
    if (targetId && nickname) {
      removeTyper(String(targetId), nickname);
      const key = `${targetId}_${nickname}`;
      if (typingTimers[key]) {
        clearTimeout(typingTimers[key]);
        delete typingTimers[key];
      }
    }
    emitLocal('stop-typing', { to, isGroup, nickname, from });
  });
}

export function connectLoudaSocket(userId: string): Socket {
  if (socket && currentUserId === userId && socket.connected) return socket;
  if (socket) disconnectLoudaSocket();

  currentUserId = userId;
  setState('connecting');
  const s = io(LOUDA_API_URL, {
    query: { userId },
    transports: allowPollingFallback ? ['polling', 'websocket'] : ['websocket'],
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelayMax: 10000,
    timeout: 15000,
  });
  socket = s;
  registerCoreHandlers(s);

  if (statusPollTimer) clearInterval(statusPollTimer);
  statusPollTimer = setInterval(() => {
    if (socket && socket.connected) socket.emit('request-status-sync');
  }, 5000);

  return s;
}

export function disconnectLoudaSocket() {
  if (statusPollTimer) {
    clearInterval(statusPollTimer);
    statusPollTimer = null;
  }
  if (socket) {
    try {
      socket.disconnect();
    } catch {}
  }
  socket = null;
  currentUserId = null;
  typingRegistry = {};
  onlineFriends = [];
  pendingUserIds = [];
  setState('disconnected');
}

export function getLoudaSocket(): Socket | null {
  return socket;
}

export type EmitResult = 'sent' | 'queued' | 'dropped';

export function emitLoudaSocket(event: string, payload?: any): EmitResult {
  // Web parity: the web app calls s.emit() unconditionally and socket.io
  // buffers emits while disconnected, flushing them on reconnect. Emit
  // whenever a socket exists — never silently drop payloads. The return value
  // tells the caller whether anything actually went out.
  if (socket) {
    socket.emit(event, payload);
    return socket.connected ? 'sent' : 'queued';
  }
  return 'dropped';
}

export function onLoudaSocket(event: string, handler: Handler): () => void {
  let set = eventHandlers.get(event);
  if (!set) {
    set = new Set();
    eventHandlers.set(event, set);
  }
  set.add(handler);
  return () => {
    const s = eventHandlers.get(event);
    if (s) {
      s.delete(handler);
      if (s.size === 0) eventHandlers.delete(event);
    }
  };
}

export function subscribeLoudaConnection(cb: (s: LoudaConnectionState) => void): () => void {
  stateHandlers.add(cb);
  cb(connectionState);
  return () => stateHandlers.delete(cb);
}

export function getLoudaConnectionState(): LoudaConnectionState {
  return connectionState;
}

export function getTypingRegistry(): Record<string, string[]> {
  return typingRegistry;
}

export function subscribeTyping(cb: () => void): () => void {
  typingHandlers.add(cb);
  return () => typingHandlers.delete(cb);
}

export function getOnlineFriends(): string[] {
  return onlineFriends;
}

export function subscribePresence(cb: () => void): () => void {
  presenceHandlers.add(cb);
  return () => presenceHandlers.delete(cb);
}

export function setPendingDelivery(userId: string) {
  if (!pendingUserIds.includes(userId)) pendingUserIds.push(userId);
}

export function getLoudaUserIdSync(): string | null {
  return currentUserId;
}
