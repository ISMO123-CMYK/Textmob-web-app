import { storage, KEYS } from './storage';

const MAX_SEEN_IDS = 3000;
const FLUSH_DELAY = 2000;

let seenIdsCache: Set<string> | null = null;
let seenInitPromise: Promise<void> | null = null;
let flushTimer: ReturnType<typeof setTimeout> | null = null;
let dirty = false;

async function init() {
  if (seenIdsCache) return;
  try {
    const raw = await storage.getStore(KEYS.VIEWED_IDS);
    seenIdsCache = new Set(raw ? JSON.parse(raw) : []);
    trim();
  } catch {
    seenIdsCache = new Set();
  }
}

function ensureCache() {
  if (!seenIdsCache) seenIdsCache = new Set();
}

function trim() {
  if (!seenIdsCache || seenIdsCache.size <= MAX_SEEN_IDS) return;
  const arr = Array.from(seenIdsCache);
  seenIdsCache = new Set(arr.slice(arr.length - MAX_SEEN_IDS));
}

async function persist() {
  if (!dirty || !seenIdsCache) return;
  dirty = false;
  try {
    await storage.setStore(KEYS.VIEWED_IDS, JSON.stringify(Array.from(seenIdsCache)));
  } catch (e) { /* ignore */ }
}

function scheduleFlush() {
  if (flushTimer) return;
  flushTimer = setTimeout(() => {
    flushTimer = null;
    persist();
  }, FLUSH_DELAY);
}

export function getSeenParam(): string {
  ensureCache();
  const arr = Array.from(seenIdsCache!);
  const recent = arr.slice(Math.max(0, arr.length - 1500));
  return recent.join(',');
}

export function markSeen(ids: string[]) {
  ensureCache();
  let added = false;
  ids.forEach(id => {
    const key = String(id);
    if (!seenIdsCache!.has(key)) {
      seenIdsCache!.add(key);
      added = true;
    }
  });
  if (!added) return;
  trim();
  dirty = true;
  scheduleFlush();
}

export function resetSeen() {
  seenIdsCache = new Set();
  dirty = true;
  scheduleFlush();
}

// Lazy init — do not block JS thread at import. Init on first use, non-blocking.
export function initSeenBackground() {
  if (!seenInitPromise) seenInitPromise = init();
  return seenInitPromise;
}
// Kick off in next tick, not current import tick, to avoid thundering herd with AuthContext
setTimeout(() => { initSeenBackground().catch(() => {}); }, 0);
