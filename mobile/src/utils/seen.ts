import { storage, KEYS } from './storage';

let seenIdsCache: Set<string> | null = null;
let seenInitPromise: Promise<void> | null = null;

async function init() {
  if (seenIdsCache) return;
  try {
    const raw = await storage.getStore(KEYS.VIEWED_IDS);
    seenIdsCache = new Set(raw ? JSON.parse(raw) : []);
  } catch {
    seenIdsCache = new Set();
  }
}

function ensureCache() {
  if (!seenIdsCache) seenIdsCache = new Set();
}

export function getSeenParam(): string {
  ensureCache();
  return Array.from(seenIdsCache!).join(',');
}

export function markSeen(ids: string[]) {
  ensureCache();
  ids.forEach(id => seenIdsCache!.add(String(id)));
  storage.setStore(KEYS.VIEWED_IDS, JSON.stringify(Array.from(seenIdsCache!)));
}

export function resetSeen() {
  seenIdsCache = new Set();
  storage.setStore(KEYS.VIEWED_IDS, JSON.stringify([]));
}

// Inline init
if (!seenInitPromise) {
  seenInitPromise = init();
}
