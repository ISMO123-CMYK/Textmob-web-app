import { storage, KEYS } from './storage';

const CACHE_PREFIX = 'tmob_cache_';
const OFFLINE_MODE_KEY = 'tmob_offline_mode';
const DATA_SAVER_KEY = 'tmob_data_saver';

const CURRENT_VERSION = '1.0.0';

export async function initCache() {
  try {
    const stored = await storage.getStore(CACHE_PREFIX + 'version');
    if (stored !== CURRENT_VERSION) {
      const keys = await getAllCacheKeys();
      for (const k of keys) {
        await storage.removeStore(k);
      }
      await storage.setStore(CACHE_PREFIX + 'version', CURRENT_VERSION);
    }
  } catch (e) { /* ignore */ }
}

async function getAllCacheKeys(): Promise<string[]> {
  try {
    const allKeys = await storage.getAllKeys();
    return allKeys.filter(k => k.startsWith(CACHE_PREFIX) && k !== CACHE_PREFIX + 'version');
  } catch {
    return [];
  }
}

export function isOnline() {
  return true;
}

export async function isOfflineMode(): Promise<boolean> {
  const val = await storage.getStore(OFFLINE_MODE_KEY);
  return val === 'true';
}

export async function isDataSaver(): Promise<boolean> {
  const val = await storage.getStore(DATA_SAVER_KEY);
  return val === 'true';
}

export async function setOfflineMode(enabled: boolean) {
  await storage.setStore(OFFLINE_MODE_KEY, enabled ? 'true' : 'false');
}

export async function setDataSaver(enabled: boolean) {
  await storage.setStore(DATA_SAVER_KEY, enabled ? 'true' : 'false');
}

interface CacheEntry {
  v: string;
  ts: number;
  data: any;
}

export async function cacheData(key: string, data: any) {
  if (!data) return;
  try {
    const cacheKey = CACHE_PREFIX + key;
    const raw = await storage.getStore(cacheKey);
    const existing: CacheEntry | null = raw ? JSON.parse(raw) : null;

    if (existing && Array.isArray(existing.data) && Array.isArray(data)) {
      const map = new Map();
      existing.data.forEach((item: any) => {
        if (item && item.id) map.set(String(item.id), item);
      });
      data.forEach((item: any) => {
        if (item && item.id) map.set(String(item.id), item);
      });
      const merged = Array.from(map.values());
      await storage.setStore(cacheKey, JSON.stringify({
        v: CURRENT_VERSION,
        ts: Date.now(),
        data: merged,
      }));
    } else if (existing && existing.data && typeof existing.data === 'object' && typeof data === 'object' && !Array.isArray(data) && !Array.isArray(existing.data)) {
      const merged = { ...existing.data, ...data };
      await storage.setStore(cacheKey, JSON.stringify({
        v: CURRENT_VERSION,
        ts: Date.now(),
        data: merged,
      }));
    } else {
      await storage.setStore(cacheKey, JSON.stringify({
        v: CURRENT_VERSION,
        ts: Date.now(),
        data,
      }));
    }
  } catch (e) { /* ignore */ }
}

export async function getCached(key: string): Promise<any | null> {
  try {
    const raw = await storage.getStore(CACHE_PREFIX + key);
    if (!raw) return null;
    const parsed: CacheEntry = JSON.parse(raw);
    if (!parsed || !parsed.data) return null;
    return parsed.data;
  } catch { return null; }
}

export async function getSeenIds(): Promise<Set<string>> {
  try {
    const raw = await storage.getStore(KEYS.VIEWED_IDS);
    return new Set(raw ? JSON.parse(raw) : []);
  } catch { return new Set(); }
}

export async function markSeen(ids: string[]) {
  try {
    const existing = await getSeenIds();
    ids.forEach(id => existing.add(String(id)));
    const arr = Array.from(existing).slice(-2000);
    await storage.setStore(KEYS.VIEWED_IDS, JSON.stringify(arr));
  } catch (e) { /* ignore */ }
}

export async function filterSeen(items: any[]): Promise<any[]> {
  if (!Array.isArray(items)) return items;
  const seen = await getSeenIds();
  return items.filter(item => item && item.id && !seen.has(String(item.id)));
}

export async function getCachedFiltered(key: string): Promise<any | null> {
  const data = await getCached(key);
  if (Array.isArray(data)) return filterSeen(data);
  return data;
}

export async function clearCache() {
  const keys = await getAllCacheKeys();
  for (const k of keys) {
    await storage.removeStore(k);
  }
}

export async function getCacheSize(): Promise<string> {
  let total = 0;
  const keys = await getAllCacheKeys();
  for (const k of keys) {
    const v = await storage.getStore(k);
    if (v) total += v.length;
  }
  return (total / 1024).toFixed(1);
}
