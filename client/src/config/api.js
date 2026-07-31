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

async function apiFetch(endpoint, options = {}) {
  const method = (options.method || 'GET').toUpperCase();
  const url = endpoint.startsWith('http')
    ? endpoint
    : `${API_BASE_URL}${endpoint.startsWith('/') ? '' : '/'}${endpoint}`;

  const online = isOnline();
  const offlineMode = isOfflineMode();
  const dataSaver = isDataSaver();
  const readOp = isReadOp(endpoint, method);
  const cacheKey = getCacheKey(endpoint, options);

  if (!online) {
    if (!offlineMode) {
      return new Response(JSON.stringify({
        error: 'You are offline. Enable Offline Mode in Settings to browse cached content.',
        offline: true
      }), {
        status: 503,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    if (!readOp) {
      return new Response(JSON.stringify({
        error: 'Action cannot be performed while offline',
        offline: true
      }), {
        status: 503,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    const cached = getCachedFiltered(cacheKey);
    if (cached) {
      return new Response(JSON.stringify(cached), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    return new Response(JSON.stringify({
      error: 'No cached content available. Go online to load data first.',
      offline: true
    }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  const res = await fetch(url, options);

  if (res.ok) {
    const contentType = res.headers.get('content-type') || '';
    if (contentType.includes('application/json') || contentType.includes('text/plain')) {
      try {
        const cloned = res.clone();
        const data = await cloned.json();
        cacheData(cacheKey, data);
      } catch {}
    }
  }

  return res;
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
