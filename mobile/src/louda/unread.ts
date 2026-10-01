import { fetchTextmobLoudaUnread, fetchUnviewedStatusCount } from './api';
import { getTextmobUser, ensureLoudaSession } from './session';
import {
  connectLoudaSocket,
  onLoudaSocket,
  getLoudaSocket,
} from './socket';

export type LoudaUnreadSnapshot = {
  messages: number;
  statuses: number;
  total: number;
};

let snapshot: LoudaUnreadSnapshot = { messages: 0, statuses: 0, total: 0 };
const listeners = new Set<(s: LoudaUnreadSnapshot) => void>();
let refetchTimer: any = null;
let reconcileTimer: any = null;
let unsubscribers: (() => void)[] = [];
let started = false;

function publish(next: LoudaUnreadSnapshot) {
  snapshot = next;
  listeners.forEach((cb) => {
    try {
      cb(next);
    } catch {}
  });
}

function scheduleRefetch(ms = 500) {
  if (refetchTimer) clearTimeout(refetchTimer);
  refetchTimer = setTimeout(() => {
    refetchTimer = null;
    refreshLoudaUnread().catch(() => {});
  }, ms);
}

/** connector.js:289 — messages (Textmob server) + unviewed status authors. */
export async function refreshLoudaUnread(): Promise<number> {
  const username = await getTextmobUser();
  if (!username) {
    publish({ messages: 0, statuses: 0, total: 0 });
    return 0;
  }
  try {
    const messages = await fetchTextmobLoudaUnread(username);
    const statuses = await fetchUnviewedStatusCount().catch(() => 0);
    publish({ messages, statuses, total: messages + statuses });
    return messages + statuses;
  } catch {
    return snapshot.total;
  }
}

export function getLoudaUnread(): LoudaUnreadSnapshot {
  return snapshot;
}

export function subscribeLoudaUnread(cb: (s: LoudaUnreadSnapshot) => void): () => void {
  listeners.add(cb);
  cb(snapshot);
  return () => listeners.delete(cb);
}

const REFETCH_EVENTS: [string, number][] = [
  ['new-message', 500],
  ['new-group-message', 500],
  ['contacts-updated', 500],
  ['groups-updated', 500],
  ['messages-read', 1500],
  ['message-status', 1500],
  ['new-status', 500],
  ['status-viewed', 1500],
  ['status-deleted', 500],
];

/**
 * Opens/keeps the Louda socket alive and reconciles the badge.
 * Safe to call multiple times; returns a stop function.
 */
export function startLoudaUnreadBridge(): () => void {
  if (started) return stopLoudaUnreadBridge;
  started = true;

  (async () => {
    try {
      const { loudaUserId } = await ensureLoudaSession();
      if (loudaUserId) connectLoudaSocket(loudaUserId);
    } catch (e) {
      console.warn('[LoudaUnread] session failed', e);
    }
  })();

  unsubscribers = REFETCH_EVENTS.map(([event, ms]) =>
    onLoudaSocket(event, () => scheduleRefetch(ms))
  );
  unsubscribers.push(onLoudaSocket('reconnect', () => refreshLoudaUnread().catch(() => {})));

  if (reconcileTimer) clearInterval(reconcileTimer);
  reconcileTimer = setInterval(() => refreshLoudaUnread().catch(() => {}), 45000);

  refreshLoudaUnread().catch(() => {});

  return stopLoudaUnreadBridge;
}

export function stopLoudaUnreadBridge() {
  started = false;
  if (refetchTimer) {
    clearTimeout(refetchTimer);
    refetchTimer = null;
  }
  if (reconcileTimer) {
    clearInterval(reconcileTimer);
    reconcileTimer = null;
  }
  unsubscribers.forEach((u) => {
    try {
      u();
    } catch {}
  });
  unsubscribers = [];
}

export function hasActiveLoudaSocket(): boolean {
  const s = getLoudaSocket();
  return !!s && s.connected;
}
