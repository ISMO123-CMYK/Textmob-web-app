// Port of client/src/bridge/connector.js — identity + intents (mobile RN version).
// storage keys mirror web: localStorage 'currentUser' (Textmob) + 'userId' (Louda).
import { getSecure, setSecure, removeSecure, getStore, setStore, removeStore } from '../utils/storage';
import { textmobVerify, textmobConnect, loudaFetch } from './api';
import { mapTextmobProfile, normalizePhone } from './utils';

export const LOUDA_USER_ID_KEY = 'loudaUserId';

// Cached for synchronous fallbacks (e.g. typing nickname parity with web's
// localStorage.getItem('username'))
let cachedTextmobUsername = '';

// ─── identity ───
export async function getTextmobUser(): Promise<string> {
  try {
    const v = await getSecure('currentUser');
    cachedTextmobUsername = v && v !== 'undefined' ? v : '';
    return cachedTextmobUsername;
  } catch {
    return cachedTextmobUsername;
  }
}

export function getTextmobUserSync(): string {
  return cachedTextmobUsername;
}

// Logout must drop the synchronous cache too — otherwise a registration fired
// right after switching accounts still resolves to the PREVIOUS username.
export function clearTextmobUserCache() {
  cachedTextmobUsername = '';
}

export async function getLoudaUserId(): Promise<string> {
  try {
    const v = await getStore(LOUDA_USER_ID_KEY);
    return v || '';
  } catch {
    return '';
  }
}

async function setLoudaUserId(id: string | null) {
  try {
    if (id) await setStore(LOUDA_USER_ID_KEY, id);
    else await removeStore(LOUDA_USER_ID_KEY);
  } catch { /* storage unavailable */ }
  emitSessionEvent(id || null);
}

// ─── simple event bus (replaces window CustomEvent) ───
type Listener = (detail: any) => void;
const listeners = new Map<string, Set<Listener>>();

export function onLoudaEvent(type: string, cb: Listener): () => void {
  if (!listeners.has(type)) listeners.set(type, new Set());
  listeners.get(type)!.add(cb);
  return () => listeners.get(type)?.delete(cb)!;
}

export function emitLoudaEvent(type: string, detail?: any) {
  const set = listeners.get(type);
  if (set) set.forEach((cb) => { try { cb(detail); } catch { /* listener error must not break publisher */ } });
}

function emitSessionEvent(loudaUserId: string | null) {
  emitLoudaEvent('louda:session', { loudaUserId });
}

// ─── ensureLoudaSession (connector.js:113) ───
let sessionPromise: Promise<{ loudaUserId: string; profile: any; isNew: boolean }> | null = null;

export function ensureLoudaSession(): Promise<{ loudaUserId: string; profile: any; isNew: boolean }> {
  if (sessionPromise) return sessionPromise;
  sessionPromise = (async () => {
    const username = await getTextmobUser();
    if (!username) throw new Error('Not logged in to Textmob');
    const existing = await getLoudaUserId();

    const verifyRes = await loudaFetch(`/api/textmob/verify?userId=${encodeURIComponent(username)}`);
    const verify: any = await verifyRes.json().catch(() => ({}));
    if (!verifyRes.ok || verify.error) {
      throw new Error(verify.error || 'Textmob account not found in Louda');
    }
    const profile = mapTextmobProfile(verify.textmobUser || { username });

    if (verify.alreadyInLouda && verify.loudaUserId) {
      if (existing && existing !== verify.loudaUserId) {
        await removeStore(LOUDA_USER_ID_KEY);
      }
      await setLoudaUserId(verify.loudaUserId);
      return { loudaUserId: verify.loudaUserId, profile, isNew: false };
    }

    if (!profile.phone) throw new Error('Add a phone number to connect Louda');
    const connected: any = await textmobConnect({
      userId: profile.username,
      phone: profile.phone,
      full_name: profile.full_name,
      avatar_url: profile.avatar_url,
      email: profile.email,
      currentSessionUserId: existing || undefined,
    });
    if (connected.error) throw new Error(connected.message || connected.error || 'Failed to connect Louda');
    await setLoudaUserId(connected.userId);
    return { loudaUserId: connected.userId, profile, isNew: true };
  })();

  sessionPromise.catch(() => { sessionPromise = null; });
  return sessionPromise;
}

export async function clearLoudaSession() {
  const { disconnectLoudaSocket } = await import('./socket');
  disconnectLoudaSocket();
  await removeStore(LOUDA_USER_ID_KEY);
  sessionPromise = null;
  emitSessionEvent(null);
}

export async function provisionLoudaSession() {
  try {
    const { connectLoudaSocket } = await import('./socket');
    ensureLoudaSession()
      .then((r) => connectLoudaSocket(r.loudaUserId))
      .catch(() => {});
  } catch { /* provisioning must never break auth */ }
}

// ─── intents (queued until Louda UI consumes them) ───
const pendingIntents: { type: string; detail: any }[] = [];

function emitIntent(type: string, detail: any) {
  pendingIntents.push({ type, detail });
  emitLoudaEvent(type, detail);
}

export function drainPendingIntents(): { type: string; detail: any }[] {
  return pendingIntents.splice(0, pendingIntents.length);
}

export async function openChatWith(username: string, opts?: { focusComposer?: boolean }) {
  if (!username) return;
  emitIntent('louda:open-chat', { username, focusComposer: !!opts?.focusComposer });
}

export async function openGroupChatWith(groupId: string) {
  if (!groupId) return;
  emitIntent('louda:open-group', { groupId });
}

export function sharePostToLouda(post: any) {
  if (!post) return;
  emitIntent('louda:share', {
    kind: 'post',
    postId: post.id,
    text: post.text || '',
    media: Array.isArray(post.media) ? post.media : [],
    author: post.username || '',
    url: `https://textmob.web.app/post/${post.id}`,
  });
}

export function shareSnapToLouda(snap: any) {
  if (!snap) return;
  emitIntent('louda:share', {
    kind: 'snap',
    snapId: snap.id,
    text: snap.caption || snap.text || '',
    media: snap.videoUrl ? [snap.videoUrl] : snap.media || [],
    author: snap.username || '',
    url: `https://textmob.web.app/snaps/${snap.id}`,
  });
}

export async function addLoudaContact({ username, phone, name, avatar }: any = {}) {
  const { loudaUserId } = await ensureLoudaSession();
  const res = await loudaFetch('/api/contacts', jsonBody({
    userId: loudaUserId,
    contact: { username, phone: normalizePhone(phone), name: name || username, avatar_url: avatar || null },
  }));
  const data = await res.json().catch(() => ({}));
  if (!res.ok || data.error) throw new Error(data.error || 'Could not add contact');
  return data;
}

function jsonBody(body: any): RequestInit {
  return { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) };
}
