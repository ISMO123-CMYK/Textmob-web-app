// Louda REST API — exact endpoints used by web LoudaApp.jsx + bridge/connector.js.
import { LOUDA_API_URL, LOUDA_PROD_URL } from './constants';
import { API_BASE_URL as TEXMOB_API_URL } from '../api/client';

let loudaBaseOverride: string | null = null;
function getLoudaBase(): string {
  return loudaBaseOverride || LOUDA_API_URL;
}

export function resetLoudaBase() { loudaBaseOverride = null; }

export async function loudaFetch(path: string, options: RequestInit = {}, timeoutMs = 45000): Promise<Response> {
  const attempt = async (base: string) => {
    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), timeoutMs);
    try {
      return await fetch(`${base}${path}`, { ...options, signal: controller.signal });
    } finally {
      clearTimeout(t);
    }
  };
  try {
    return await attempt(getLoudaBase());
  } catch (e: any) {
    const isNetworkFailure = e instanceof TypeError || e?.name === 'AbortError' || e?.message === 'Network request failed';
    if (isNetworkFailure && getLoudaBase() !== LOUDA_PROD_URL) {
      loudaBaseOverride = LOUDA_PROD_URL;
      return attempt(LOUDA_PROD_URL);
    }
    throw e;
  }
}

async function j(res: Response): Promise<any> {
  const ct = res.headers.get('content-type') || '';
  if (ct.includes('application/json')) return res.json().catch(() => ({}));
  const text = await res.text().catch(() => '');
  try { return JSON.parse(text); } catch { return text; }
}

async function req<T = any>(path: string, options: RequestInit = {}, timeoutMs = 45000): Promise<T> {
  const res = await loudaFetch(path, options, timeoutMs);
  const data = await j(res);
  if (!res.ok) {
    const err: any = new Error((data && (data.error || data.message)) || `HTTP ${res.status}`);
    err.status = res.status;
    err.data = data;
    throw err;
  }
  return data as T;
}

const jsonBody = (body: any): RequestInit => ({
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(body),
});

// ─── auth / user ───
export const loudaSignup = (payload: any) => req('/api/signup', jsonBody(payload));
export const loudaLogin = (payload: any) => req('/api/login', jsonBody(payload));
export const getUser = (userId: string) => req(`/api/user/${encodeURIComponent(userId)}`);
export const updateUser = (payload: any) => req('/api/user/update', jsonBody(payload));
export const changePassword = (payload: any) => req('/api/user/change-password', jsonBody(payload));
export const updateLastSeen = (userId: string) => req('/api/user/last-seen', jsonBody({ userId })).catch(() => {});
export const registerFcmToken = (payload: any) => req('/api/user/fcm-token', jsonBody(payload)).catch(() => {});
export const getPreferences = (userId: string) => req(`/api/user/preferences?userId=${encodeURIComponent(userId)}`).catch(() => ({}));
export const savePreferences = (payload: any) => req('/api/user/preferences', jsonBody(payload)).catch(() => ({}));
export const getUserById = (userId: string) => req(`/api/user/${encodeURIComponent(userId)}`).catch(() => null);
export const getUserByPhone = (phone: string) => req(`/api/user/by-phone?phone=${encodeURIComponent(phone)}`).catch(() => null);

// ─── Textmob bridge ───
export const textmobVerify = (userId: string) => req(`/api/textmob/verify?userId=${encodeURIComponent(userId)}`);
export const textmobConnect = (payload: any) => req('/api/textmob/connect', jsonBody(payload));
export const textmobSearch = (query: string) => req(`/api/textmob/search?query=${encodeURIComponent(query)}`).catch(() => []);

// --- push notify (Textmob server, fire-and-forget; never blocks the send path) ---
export function notifyLoudaMessage(payload: {
  senderId: string;
  senderName: string;
  isGroup: boolean;
  chatId: string;
  toUserId?: string;
  groupId?: string;
  preview: string;
}): void {
  try {
    fetch(`${TEXMOB_API_URL}/api/louda/message-notify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    }).catch(() => {});
  } catch (e) {
    // push must never break message sending
  }
}

// Status uploads are stored in the Louda backend, so Textmob needs an explicit
// ping to build the Activity rows + pushes for everyone invited to see it.
export function notifyStatusUpload(payload: {
  username: string;
  recipients: string[];
  statusId?: string;
  caption?: string;
  media?: string | null;
}): void {
  try {
    fetch(`${TEXMOB_API_URL}/api/louda/status-notify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    }).catch(() => {});
  } catch (e) {
    // status upload must never break because of a notification
  }
}

// ─── contacts ───
export const getContacts = (userId: string) => req(`/api/contacts?userId=${encodeURIComponent(userId)}`).catch(() => []);
export const createContact = (payload: any) => req('/api/contacts', jsonBody(payload));
export const addContact = (payload: any) => req('/api/contacts/add', jsonBody(payload));
export const archiveContact = (payload: any) => req('/api/contacts/archive', jsonBody(payload));
export const deleteContact = (payload: any) => req('/api/contacts/delete', jsonBody(payload));
export const updateContactName = (payload: any) => req('/api/contacts/update-name', jsonBody(payload));
export const bulkDeleteContacts = (payload: any) => req('/api/contacts/bulk-delete', jsonBody(payload));
export const bulkArchiveContacts = (payload: any) => req('/api/contacts/bulk-archive', jsonBody(payload));
export const unarchiveContacts = (payload: any) => req('/api/contacts/unarchive', jsonBody(payload));

// ─── groups ───
export const getGroups = (userId: string) => req(`/api/groups/${encodeURIComponent(userId)}`).catch(() => []);
export const createGroup = (payload: any) => req('/api/groups/create', jsonBody(payload));
export const addMembers = (groupId: string, payload: any) => req(`/api/groups/${groupId}/add-members`, jsonBody(payload));
export const removeMember = (groupId: string, payload: any) => req(`/api/groups/${groupId}/remove-member`, jsonBody(payload));
export const promoteAdmin = (groupId: string, payload: any) => req(`/api/groups/${groupId}/promote-admin`, jsonBody(payload));
export const demoteAdmin = (groupId: string, payload: any) => req(`/api/groups/${groupId}/demote-admin`, jsonBody(payload));
export const updateNickname = (groupId: string, payload: any) => req(`/api/groups/${groupId}/update-nickname`, jsonBody(payload));
export const renameGroup = (groupId: string, payload: any) => req(`/api/groups/${groupId}/name`, jsonBody(payload));
export const updateGroupSettings = (groupId: string, payload: any) => req(`/api/groups/${groupId}/settings`, jsonBody(payload));
export const archiveGroup = (groupId: string, payload: any) => req(`/api/groups/${groupId}/archive`, jsonBody(payload));
export const unarchiveGroup = (groupId: string, payload: any) => req(`/api/groups/${groupId}/unarchive`, jsonBody(payload));
export const deleteGroup = (groupId: string, payload: any) => req(`/api/groups/${groupId}/delete`, jsonBody(payload));
export const leaveGroup = (groupId: string, payload: any) => req(`/api/groups/${groupId}/leave`, jsonBody(payload));
export const setGroupAvatar = (groupId: string, payload: any) => req(`/api/groups/${groupId}/avatar`, jsonBody(payload));
export const setUserAvatar = (payload: any) => req('/api/user/avatar', jsonBody(payload));
export const bulkLeaveGroups = (payload: any) => req('/api/groups/bulk-leave', jsonBody(payload));

// ─── chats / messages ───
export const getMessages = (chatId: string, isGroup: boolean, limit = 20, before?: string | null) => {
  const base = isGroup ? `/api/groups/single/${chatId}` : `/api/chats/single/${chatId}`;
  const qs = `?limit=${limit}${before ? `&before=${encodeURIComponent(before)}` : ''}`;
  return req(base + qs).catch(() => ({} as any));
};
export const getChat = (userId: string, contactId: string) =>
  req(`/api/chats/${encodeURIComponent(userId)}/${encodeURIComponent(contactId)}`).catch(() => null);
export const searchChatMessages = (chatId: string, q: string, isGroup = false) =>
  req(`/api/chats/single/${chatId}/search?q=${encodeURIComponent(q)}&isGroup=${isGroup}`).catch(() => []);
export const updateChatSettings = (chatId: string, payload: any) => req(`/api/chats/${chatId}/settings`, jsonBody(payload));
export const deleteMessages = (payload: any) => req('/api/chats/messages/delete', jsonBody(payload));
export const bulkDeleteMessages = (payload: any) => req('/api/chats/messages/bulk-delete', jsonBody(payload));
export const bulkForwardMessages = (payload: any) => req('/api/chats/messages/bulk-forward', jsonBody(payload));
export const getMediaGallery = (userId: string) => req(`/api/chats/media/${encodeURIComponent(userId)}`).catch(() => []);

// ─── status ───
export const getStatuses = (userId: string) =>
  req('/api/status', { headers: { 'x-user-id': userId } }).catch(() => []);
export const createStatus = (userId: string, payload: any) => req('/api/status', jsonBody({ userId, ...payload }));
export const deleteStatus = (id: string, userId: string) =>
  req(`/api/status/${id}`, { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId }) });
export const viewStatus = (id: string, userId: string) => req(`/api/status/${id}/view`, jsonBody({ userId }));

// ─── upload / misc ───
export const uploadFile = async (file: { uri: string; name?: string; type?: string; kind?: string }): Promise<any> => {
  const form = new FormData();
  form.append('file', {
    uri: file.uri,
    name: file.name || 'upload.jpg',
    type: file.type || 'image/jpeg',
  } as any);
  // Web sends an explicit `type` form field (image|video|file|voice) — LoudaApp.jsx:3389
  if (file.kind) form.append('type', file.kind);
  const res = await loudaFetch('/api/upload', { method: 'POST', body: form }, 120000);
  const data = await j(res);
  if (!res.ok) throw new Error(data?.error || 'Upload failed');
  return data;
};
export const deleteUpload = (payload: any) => req('/api/upload/delete', jsonBody(payload));
export const linkPreview = (url: string) => req(`/api/misc/link-preview?url=${encodeURIComponent(url)}`).catch(() => null);

// ─── textmob unread (aggregated on Textmob server) ───
export async function fetchTextmobLoudaUnread(username: string): Promise<number> {
  try {
    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), 15000);
    const res = await fetch(
      `https://textmob-provider-api-99ii.onrender.com/api/louda-unread?username=${encodeURIComponent(username)}`,
      { signal: controller.signal },
    );
    clearTimeout(t);
    if (!res.ok) return 0;
    const data = await res.json().catch(() => null);
    return Number(data?.unreadCount ?? data?.unread ?? 0) || 0;
  } catch {
    return 0;
  }
}

// ─── status count (connector.js:313) ───
export async function fetchUnviewedStatusCount(): Promise<number> {
  // Dynamic import breaks the session <-> api require cycle (session statically
  // imports this module; deferring here keeps both fully initialized first).
  const { getLoudaUserId } = await import('./session');
  const loudaUserId = await getLoudaUserId();
  if (!loudaUserId) return 0;
  try {
    const list = await getStatuses(loudaUserId);
    if (!Array.isArray(list)) return 0;
    const unviewed = new Set<string>();
    for (const s of list) {
      if (!s || String(s.user_id) === String(loudaUserId)) continue;
      const views = Array.isArray(s.views) ? s.views : [];
      if (!views.some((v: any) => String(v?.userId) === String(loudaUserId))) {
        unviewed.add(String(s.user_id));
      }
    }
    return unviewed.size;
  } catch {
    return 0;
  }
}
