import { initCache, isOnline, isOfflineMode, isDataSaver, cacheData, getCached, getCachedFiltered } from '../utils/cache';
import { getMediaUrl } from '../utils/cloudinary';

const API_BASE_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
  ? 'http://localhost:5000'
  : 'https://textmob-provider-api-99ii.onrender.com';

const READ_ENDPOINTS = [
  '/get-posts', '/snaps-feed', '/get-post', '/get-user-posts',
  '/get-suggestions-feed', '/get-snaps-feed', '/profile/',
  '/get-sparks', '/get-live-posts', '/get-live-streams',
  '/get-events-feed', '/get-notifications', '/get-followers',
  '/get-following', '/get-post-reactions', '/get-leaderboard',
  '/api/user/stats', '/api/user/payouts', '/api/user/balance',
  '/api/user/transactions', '/search', '/searchGeneral',
  '/searchSuggest', '/hashtag',
];

function isReadOp(endpoint, method) {
  if (method === 'GET' || !method) return true;
  if (method === 'POST') {
    return READ_ENDPOINTS.some(e => endpoint.includes(e));
  }
  return false;
}

function getCacheKey(endpoint, options) {
  const key = endpoint.split('?')[0];
  return key.replace(/[^a-zA-Z0-9_/-]/g, '_');
}

initCache();

let worker = null;
let msgId = 0;
const pending = new Map();

function getWorker() {
  if (worker) return worker;
  try {
    worker = new Worker(new URL('../workers/apiWorker.js', import.meta.url), { type: 'module' });
    worker.onmessage = (e) => {
      const { id, ok, data, status, error } = e.data;
      const p = pending.get(id);
      if (!p) return;
      pending.delete(id);
      p.resolve({ ok, data, status, error });
    };
    worker.onerror = (e) => {
      console.warn('API worker error:', e);
    };
  } catch (err) {
    console.warn('Worker init failed, using main thread fetch:', err);
    worker = null;
  }
  return worker;
}

function workerFetch(endpoint, options) {
  const w = getWorker();
  const id = ++msgId;

  return new Promise((resolve) => {
    if (!w) {
      mainThreadFetch(endpoint, options).then(resolve);
      return;
    }
    const body = options?.body;
    if (body instanceof FormData) {
      mainThreadFetch(endpoint, options).then(resolve);
      return;
    }
    pending.set(id, { resolve });
    const serializable = typeof body === 'string' ? body : body ? JSON.stringify(body) : undefined;
    w.postMessage({ id, endpoint, options: { ...options, body: serializable } });
  });
}

async function mainThreadFetch(endpoint, options = {}) {
  const method = (options.method || 'GET').toUpperCase();
  const url = endpoint.startsWith('http')
    ? endpoint
    : `${API_BASE_URL}${endpoint.startsWith('/') ? '' : '/'}${endpoint}`;

  const res = await fetch(url, options);
  let data;
  try { data = await res.json(); } catch { data = await res.text(); }

  return { ok: res.ok, data, status: res.status };
}

class WorkerResponse {
  constructor(result) {
    this._ok = result.ok;
    this._data = result.data;
    this._status = result.status;
    this.ok = result.ok;
    this.status = result.status;
  }
  async json() { return this._data; }
  async text() {
    return typeof this._data === 'string' ? this._data : JSON.stringify(this._data);
  }
  async blob() {
    const text = typeof this._data === 'string' ? this._data : JSON.stringify(this._data);
    return new Blob([text], { type: 'application/json' });
  }
  clone() { return new WorkerResponse(this); }
}

async function apiFetch(endpoint, options = {}) {
  const method = (options.method || 'GET').toUpperCase();
  const online = isOnline();
  const offlineMode = isOfflineMode();
  const readOp = isReadOp(endpoint, method);
  const cacheKey = getCacheKey(endpoint, options);

  if (!online) {
    if (!offlineMode) {
      return new WorkerResponse({ ok: false, data: { error: 'You are offline.', offline: true }, status: 503 });
    }
    if (!readOp) {
      return new WorkerResponse({ ok: false, data: { error: 'Action cannot be performed offline', offline: true }, status: 503 });
    }
    const cached = getCachedFiltered(cacheKey);
    if (cached) {
      return new WorkerResponse({ ok: true, data: cached, status: 200 });
    }
    return new WorkerResponse({ ok: false, data: { error: 'No cached content.', offline: true }, status: 503 });
  }

  const result = await workerFetch(endpoint, options);

  if (result.ok && cacheKey) {
    cacheData(cacheKey, result.data);
  }

  return new WorkerResponse(result);
}

function getCurrentUser() {
  return localStorage.getItem('currentUser') || '';
}

function getChart() {
  return typeof window !== 'undefined' && window.Chart ? window.Chart : null;
}

export {
  API_BASE_URL,
  apiFetch,
  getCurrentUser,
  getChart,
  getMediaUrl,
  isDataSaver,
};
