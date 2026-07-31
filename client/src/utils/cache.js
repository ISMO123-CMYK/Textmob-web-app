const CACHE_PREFIX = 'tmob_cache_';
const VERSION_KEY = CACHE_PREFIX + 'version';
const OFFLINE_MODE_KEY = 'tmob_offline_mode';
const DATA_SAVER_KEY = 'tmob_data_saver';
const SEEN_KEY = '__tmob_viewed_ids';

const CURRENT_VERSION = (() => {
  const meta = document.querySelector('meta[name=app-version]');
  return meta ? meta.content : '0.0.0';
})();

export function initCache() {
  const stored = localStorage.getItem(VERSION_KEY);
  if (stored !== CURRENT_VERSION) {
    const keys = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith(CACHE_PREFIX)) keys.push(k);
    }
    keys.forEach(k => localStorage.removeItem(k));
    localStorage.setItem(VERSION_KEY, CURRENT_VERSION);
  }
}

export function isOnline() {
  return navigator.onLine;
}

export function isOfflineMode() {
  return localStorage.getItem(OFFLINE_MODE_KEY) === 'true';
}

export function isDataSaver() {
  return localStorage.getItem(DATA_SAVER_KEY) === 'true';
}

export function setOfflineMode(enabled) {
  localStorage.setItem(OFFLINE_MODE_KEY, enabled ? 'true' : 'false');
}

export function setDataSaver(enabled) {
  localStorage.setItem(DATA_SAVER_KEY, enabled ? 'true' : 'false');
}

export function cacheData(key, data) {
  if (!data) return;
  try {
    const cacheKey = CACHE_PREFIX + key;
    const existing = (() => {
      try {
        const raw = localStorage.getItem(cacheKey);
        return raw ? JSON.parse(raw) : null;
      } catch { return null; }
    })();

    if (existing && Array.isArray(existing.data) && Array.isArray(data)) {
      const map = new Map();
      existing.data.forEach(item => {
        if (item && item.id) map.set(String(item.id), item);
      });
      data.forEach(item => {
        if (item && item.id) map.set(String(item.id), item);
      });
      const merged = Array.from(map.values());
      localStorage.setItem(cacheKey, JSON.stringify({
        v: CURRENT_VERSION,
        ts: Date.now(),
        data: merged
      }));
    } else if (existing && existing.data && typeof existing.data === 'object' && typeof data === 'object' && !Array.isArray(data) && !Array.isArray(existing.data)) {
      const merged = { ...existing.data, ...data };
      localStorage.setItem(cacheKey, JSON.stringify({
        v: CURRENT_VERSION,
        ts: Date.now(),
        data: merged
      }));
    } else {
      localStorage.setItem(cacheKey, JSON.stringify({
        v: CURRENT_VERSION,
        ts: Date.now(),
        data
      }));
    }
  } catch {}
}

export function getCached(key) {
  try {
    const raw = localStorage.getItem(CACHE_PREFIX + key);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || !parsed.data) return null;
    return parsed.data;
  } catch { return null; }
}

export function getSeenIds() {
  try {
    const raw = localStorage.getItem(SEEN_KEY);
    return new Set(raw ? JSON.parse(raw) : []);
  } catch { return new Set(); }
}

export function markSeen(ids) {
  try {
    const existing = getSeenIds();
    ids.forEach(id => existing.add(String(id)));
    const arr = Array.from(existing).slice(-2000);
    localStorage.setItem(SEEN_KEY, JSON.stringify(arr));
  } catch {}
}

export function filterSeen(items) {
  if (!Array.isArray(items)) return items;
  const seen = getSeenIds();
  return items.filter(item => item && item.id && !seen.has(String(item.id)));
}

export function getCachedFiltered(key) {
  const data = getCached(key);
  if (Array.isArray(data)) return filterSeen(data);
  return data;
}

export function clearCache() {
  const keys = [];
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (k && k.startsWith(CACHE_PREFIX)) keys.push(k);
  }
  keys.forEach(k => localStorage.removeItem(k));
}

export function getCacheSize() {
  let total = 0;
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (k && k.startsWith(CACHE_PREFIX)) {
      const v = localStorage.getItem(k);
      if (v) total += v.length;
    }
  }
  return (total / 1024).toFixed(1);
}