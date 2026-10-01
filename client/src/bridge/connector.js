/**
 * Textmob ↔ Louda global connector (src/bridge/connector.js)
 *
 * The ONE shared utility layer between the two frontends.
 * All cross-app communication goes through here IN-CODE —
 * no `?from=textmob&userId=` params, no iframe postMessage.
 *
 * v1 surface:
 *  identity  — getTextmobUser / getLoudaUserId / ensureLoudaSession
 *  intents   — openChatWith / sharePostToLouda / shareSnapToLouda / addLoudaContact
 *  live      — connectLoudaSocket / onLoudaUnread / getLoudaUnread
 *  nav       — navigateToLouda / navigateToTextmob
 *
 * Events emitted on window:
 *  'louda:unread'    { count }          — unread badge updates
 *  'louda:open-chat' { username }       — Louda UI should open/create DM
 *  'louda:share'     { kind, payload }  — Louda UI should prefill forward/compose
 *  'louda:session'   { loudaUserId }    — session established / cleared
 */
import { io } from 'socket.io-client';
import { apiFetch } from '../config/api';

// ─── endpoints ──────────────────────────────────────────────
export const LOUDA_PROD_URL = 'https://louda-back-end.onrender.com';

// Single backend: the real Louda API in every environment.
// (Local override still possible via VITE_LOUDA_API_URL when hacking on
// the Louda backend itself. Merging the two backends is out of scope —
// standalone Louda clients depend on this API.)
export const LOUDA_API_URL =
  (typeof import.meta !== 'undefined' && import.meta.env?.VITE_LOUDA_API_URL) ||
  LOUDA_PROD_URL;

// Resolved base: local dev backend if reachable, else production fallback.
// (Dev browsers point at localhost:3000, but the Louda backend usually isn't
// running locally — retrying prod beats a dead "Failed to fetch".)
let loudaBaseOverride = null;
function getLoudaBase() {
  return loudaBaseOverride || LOUDA_API_URL;
}

async function loudaFetch(path, options = {}, { timeoutMs = 45000 } = {}) {
  const attempt = async (base) =>
    fetch(`${base}${path}`, { ...options, signal: AbortSignal.timeout(timeoutMs) });
  try {
    return await attempt(getLoudaBase());
  } catch (e) {
    const isNetworkFailure = e instanceof TypeError;
    if (isNetworkFailure && getLoudaBase() !== LOUDA_PROD_URL) {
      loudaBaseOverride = LOUDA_PROD_URL;
      return attempt(LOUDA_PROD_URL);
    }
    throw e;
  }
}

// ─── field + phone normalisation (single source of truth) ──
// Louda backend stores: { username, full_name, avatar_url, phone (+E.164) }
// Textmob Supabase users: { username, fullname, profile_pic, phone, email }
export function normalizePhone(phone) {
  if (!phone) return null;
  const raw = String(phone).replace(/[\s\-()./\\+]+/g, '');
  if (!raw) return null;
  if (raw.startsWith('00')) return `+${raw.slice(2)}`;
  if (raw.startsWith('0')) return `+234${raw.slice(1)}`;
  return `+${raw}`;
}

export function mapTextmobProfile(tmUser = {}) {
  return {
    username: tmUser.username || tmUser.id || '',
    full_name: tmUser.fullname || tmUser.full_name || tmUser.username || '',
    avatar_url: tmUser.profile_pic || tmUser.avatar_url || null,
    email: tmUser.email || null,
    phone: normalizePhone(tmUser.phone),
  };
}

// ─── identity ───────────────────────────────────────────────
export function getTextmobUser() {
  try {
    return localStorage.getItem('currentUser') || '';
  } catch {
    return '';
  }
}

export function getLoudaUserId() {
  try {
    return localStorage.getItem('userId') || '';
  } catch {
    return '';
  }
}

function setLoudaUserId(id) {
  try {
    if (id) localStorage.setItem('userId', id);
    else localStorage.removeItem('userId');
  } catch {
    /* storage unavailable */
  }
  window.dispatchEvent(new CustomEvent('louda:session', { detail: { loudaUserId: id || null } }));
}

let sessionPromise = null;

/**
 * Ensure the Textmob user has a linked Louda session.
 * Replaces the old `?from=textmob&userId=` iframe handshake.
 * Idempotent — concurrent callers share one in-flight request.
 */
export function ensureLoudaSession() {
  if (sessionPromise) return sessionPromise;
  sessionPromise = (async () => {
    const username = getTextmobUser();
    if (!username) throw new Error('Not logged in to Textmob');
    const existing = getLoudaUserId();

    const verifyRes = await loudaFetch(
      `/api/textmob/verify?userId=${encodeURIComponent(username)}`
    );
    const verify = await verifyRes.json().catch(() => ({}));
    if (!verifyRes.ok || verify.error) {
      throw new Error(verify.error || 'Textmob account not found in Louda');
    }
    const profile = mapTextmobProfile(verify.textmobUser || { username });

    if (verify.alreadyInLouda && verify.loudaUserId) {
      if (existing && existing !== verify.loudaUserId) {
        try {
          localStorage.removeItem('userId');
        } catch { /* noop */ }
      }
      setLoudaUserId(verify.loudaUserId);
      return { loudaUserId: verify.loudaUserId, profile, isNew: false };
    }

    if (!profile.phone) throw new Error('Add a phone number to connect Louda');
    const connectRes = await loudaFetch(`/api/textmob/connect`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: profile.username,
        phone: profile.phone,
        full_name: profile.full_name,
        avatar_url: profile.avatar_url,
        email: profile.email,
        currentSessionUserId: existing || undefined,
      }),
    });
    const connected = await connectRes.json().catch(() => ({}));
    if (!connectRes.ok || connected.error) {
      throw new Error(connected.message || connected.error || 'Failed to connect Louda');
    }
    setLoudaUserId(connected.userId);
    return { loudaUserId: connected.userId, profile, isNew: true };
  })();

  // Allow retry after failure; keep success cached for the page lifetime.
  sessionPromise.catch(() => {
    sessionPromise = null;
  });
  return sessionPromise;
}

/** Clear Louda session — call from Textmob logout / account switch. */export function clearLoudaSession() {
  disconnectLoudaSocket();
  try {
    localStorage.removeItem('userId');
  } catch { /* noop */ }
  sessionPromise = null;
  window.dispatchEvent(new CustomEvent('louda:session', { detail: { loudaUserId: null } }));
}

/**
 * Auto-provision + log in the Louda user for the current Textmob session.
 * Fire-and-forget: call after signup/login/switch; never throws.
 * The Louda identity is fully derived — there is no Louda logout.
 */
export function provisionLoudaSession() {
  try {
    ensureLoudaSession()
      .then(() => connectLoudaSocket().catch(() => {}))
      .catch(() => {});
  } catch {
    /* provisioning must never break auth */
  }
}

// ─── intents (queued until Louda UI consumes them) ──────────
const pendingIntents = [];

function emitIntent(type, detail) {
  pendingIntents.push({ type, detail });
  window.dispatchEvent(new CustomEvent(type, { detail }));
}

/** Louda UI calls this on mount to drain intents fired before it loaded. */
export function drainPendingIntents() {
  const items = pendingIntents.splice(0, pendingIntents.length);
  return items;
}

/** Open (or create) a DM with a Textmob username. Replaces `/chats?with=`. */
export function openChatWith(username) {
  if (!username) return;
  emitIntent('louda:open-chat', { username });
  navigateToLouda('/chats');
}

/** Prefill Louda forward/compose with a Textmob post. */
export function sharePostToLouda(post) {
  if (!post) return;
  const payload = {
    kind: 'post',
    postId: post.id,
    text: post.text || '',
    media: Array.isArray(post.media) ? post.media : [],
    author: post.username || '',
    url: `https://textmob.web.app/post/${post.id}`,
  };
  emitIntent('louda:share', payload);
  navigateToLouda('/chats');
}

/** Prefill Louda forward/compose with a Textmob snap (link only). */
export function shareSnapToLouda(snap) {
  if (!snap) return;
  emitIntent('louda:share', {
    kind: 'snap',
    snapId: snap.id,
    text: snap.caption || snap.text || '',
    media: snap.videoUrl ? [snap.videoUrl] : snap.media || [],
    author: snap.username || '',
    url: `https://textmob.web.app/snaps/${snap.id}`,
  });
  navigateToLouda('/chats');
}

/** Create-or-find a Louda contact from a Textmob user. */
export async function addLoudaContact({ username, phone, name, avatar } = {}) {
  const { loudaUserId } = await ensureLoudaSession();
  const res = await loudaFetch(`/api/contacts`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      userId: loudaUserId,
      contact: { username, phone: normalizePhone(phone), name: name || username, avatar_url: avatar || null },
    }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || data.error) throw new Error(data.error || 'Could not add contact');
  return data;
}

// ─── live unread (events first, polling fallback) ───────────
let unreadCount = 0;
let unreadListeners = new Set();
let socketRef = null;
let refetchTimer = null;

export function getUnreadCount() {
  return unreadCount;
}

function publishUnread(count) {
  unreadCount = typeof count === 'number' ? count : 0;
  const detail = { count: unreadCount };
  unreadListeners.forEach((cb) => {
    try {
      cb(unreadCount);
    } catch { /* listener error must not break publisher */ }
  });
  window.dispatchEvent(new CustomEvent('louda:unread', { detail }));
}

/** Subscribe to unread updates. Returns unsubscribe fn. Replaces 5s polling. */
export function onLoudaUnread(cb) {
  if (typeof cb !== 'function') return () => {};
  unreadListeners.add(cb);
  try {
    cb(unreadCount);
  } catch { /* noop */ }
  return () => unreadListeners.delete(cb);
}

/** Fallback REST refetch (Textmob server aggregates Louda Supabase). */
export async function refreshLoudaUnread() {
  const user = getTextmobUser();
  if (!user) {
    publishUnread(0);
    return 0;
  }
  try {
    const res = await apiFetch(`/api/louda-unread?username=${encodeURIComponent(user)}`);
    const data = res.ok ? await res.json() : null;
    const messages = Number(data?.unreadCount ?? data?.unread ?? 0) || 0;
    const statuses = await refreshLoudaStatusCount().catch(() => 0);
    const total = messages + statuses;
    publishUnread(total);
    return total;
  } catch {
    return unreadCount;
  }
}

/**
 * Unviewed-status authors (excluding self) — same rule as Louda's own
 * status badge. Folded into the Messages badge so statuses get seen.
 * Returns 0 when there is no linked session yet (never creates one here).
 */
export async function refreshLoudaStatusCount() {
  const loudaUserId = getLoudaUserId();
  if (!loudaUserId) return 0;
  const res = await loudaFetch('/api/status', {
    headers: { 'x-user-id': loudaUserId },
  });
  if (!res.ok) return 0;
  const list = await res.json().catch(() => null);
  if (!Array.isArray(list)) return 0;
  const unviewed = new Set();
  for (const s of list) {
    if (!s || String(s.user_id) === String(loudaUserId)) continue;
    const views = Array.isArray(s.views) ? s.views : [];
    if (!views.some((v) => String(v?.userId) === String(loudaUserId))) {
      unviewed.add(String(s.user_id));
    }
  }
  return unviewed.size;
}

function scheduleRefetch(ms = 500) {
  clearTimeout(refetchTimer);
  refetchTimer = setTimeout(() => {
    refreshLoudaUnread().catch(() => {});
  }, ms);
}

/**
 * Open the Louda realtime socket in the Textmob window.
 * Uses `window.loudaSocket` — NEVER touches `window.socket` (Textmob's).
 */
export async function connectLoudaSocket() {
  if (socketRef?.connected) return socketRef;
  const { loudaUserId } = await ensureLoudaSession();
  if (socketRef) {
    try {
      socketRef.disconnect();
    } catch { /* noop */ }
    socketRef = null;
  }
  const s = io(getLoudaBase(), {
    query: { userId: loudaUserId },
    transports: ['websocket'],
    reconnection: true,
  });
  socketRef = s;
  if (typeof window !== 'undefined') window.loudaSocket = s;

  s.on('new-message', () => scheduleRefetch());
  s.on('new-group-message', () => scheduleRefetch());
  s.on('contacts-updated', () => scheduleRefetch());
  s.on('groups-updated', () => scheduleRefetch());
  s.on('messages-read', () => scheduleRefetch(1500));
  s.on('message-status', () => scheduleRefetch(1500));
  s.on('new-status', () => scheduleRefetch());
  s.on('status-viewed', () => scheduleRefetch(1500));
  s.on('status-deleted', () => scheduleRefetch());
  s.on('reconnect', () => refreshLoudaUnread().catch(() => {}));
  return s;
}

export function disconnectLoudaSocket() {  clearTimeout(refetchTimer);
  if (socketRef) {
    try {
      socketRef.removeAllListeners();
      socketRef.disconnect();
    } catch { /* noop */ }
    socketRef = null;
  }
  if (typeof window !== 'undefined' && window.loudaSocket) {
    try {
      delete window.loudaSocket;
    } catch {
      window.loudaSocket = undefined;
    }
  }
}

/**
 * Re-assert online presence on the Louda network without opening /chats.
 * No-op when already connected; otherwise (re)connects. Call after anything
 * that may have dropped the shared connection (e.g. Messages view unmount),
 * and on app foreground. Never throws.
 */
export function refreshLoudaPresence() {
  try {
    if (!getTextmobUser()) return;
    connectLoudaSocket().catch(() => {});
  } catch {
    /* presence must never break the app */
  }
}

// ─── navigation ─────────────────────────────────────────────
export function navigateToLouda(path = '/chats') {
  if (window.Lexum?.navigate) window.Lexum.navigate(path);
  else window.location.hash = path.startsWith('/') ? `#${path}` : path;
}

export function navigateToTextmob(path = '/') {
  if (window.Lexum?.navigate) window.Lexum.navigate(path);
  else window.location.hash = path.startsWith('/') ? `#${path}` : path;
}

export default {
  LOUDA_API_URL,
  normalizePhone,
  mapTextmobProfile,
  getTextmobUser,
  getLoudaUserId,
  ensureLoudaSession,
  clearLoudaSession,
  provisionLoudaSession,
  openChatWith,
  sharePostToLouda,
  shareSnapToLouda,
  addLoudaContact,
  drainPendingIntents,
  getUnreadCount,
  onLoudaUnread,
  refreshLoudaUnread,
  refreshLoudaStatusCount,
  connectLoudaSocket,
  disconnectLoudaSocket,
  refreshLoudaPresence,
  navigateToLouda,
  navigateToTextmob,
};
