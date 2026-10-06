import { useCallback, useEffect, useState, useSyncExternalStore } from 'react';
import { apiFetch } from '../../config/api';

export const CATEGORIES = ['all', 'general', 'football', 'technology', 'music', 'politics', 'religion', 'entertainment', 'gaming', 'business', 'education'];
export const REACTION_EMOJIS = ['❤️', '🔥', '😂', '👍', '😮', '😢', '👏', '🙏', '💯', '😍'];

export function timeAgo(d) {
  if (!d) return '';
  const diff = Date.now() - new Date(d).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'now';
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  return `${Math.floor(hrs / 24)}d`;
}

export function clockTime(d) {
  if (!d) return '';
  try { return new Date(d).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }); } catch { return ''; }
}

export function dayLabel(d) {
  if (!d) return '';
  const date = new Date(d);
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const that = new Date(date); that.setHours(0, 0, 0, 0);
  const diff = Math.round((today.getTime() - that.getTime()) / 86400000);
  if (diff <= 0) return 'Today';
  if (diff === 1) return 'Yesterday';
  try { return date.toLocaleDateString([], { month: 'long', day: 'numeric', year: 'numeric' }); } catch { return ''; }
}

export function formatDuration(secs) {
  if (!secs) return '0m';
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

const mediaServerSnapshot = () => true;

export function useMediaQuery(query) {
  const subscribe = useCallback((onChange) => {
    if (typeof window === 'undefined' || !window.matchMedia) return undefined;
    const mq = window.matchMedia(query);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, [query]);
  const getSnapshot = useCallback(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return true;
    return window.matchMedia(query).matches;
  }, [query]);
  return useSyncExternalStore(subscribe, getSnapshot, mediaServerSnapshot);
}

export function renderMarkdown(text) {
  if (!text) return null;
  const parts = [];
  const regex = /(\*\*(.+?)\*\*|__(.+?)__|\*(.+?)\*|_(.+?)_|`(.+?)`|~~(.+?)~~|(https?:\/\/[^\s]+))/g;
  let lastIndex = 0;
  let match;
  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) parts.push(text.slice(lastIndex, match.index));
    if (match[2] || match[3]) parts.push(<strong key={match.index}>{match[2] || match[3]}</strong>);
    else if (match[4] || match[5]) parts.push(<em key={match.index}>{match[4] || match[5]}</em>);
    else if (match[6]) parts.push(<code key={match.index} className="bg-gray-100 px-1.5 py-0.5 rounded text-[13px] font-mono">{match[6]}</code>);
    else if (match[7]) parts.push(<del key={match.index}>{match[7]}</del>);
    else if (match[8]) parts.push(<a key={match.index} href={match[8]} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">{match[8]}</a>);
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < text.length) parts.push(text.slice(lastIndex));
  return parts.length > 0 ? parts : text;
}

let _msgAudioCtx = null;
export function playMessageSound() {
  try {
    if (!_msgAudioCtx) _msgAudioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const ctx = _msgAudioCtx;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = 'sine';
    osc.frequency.setValueAtTime(880, ctx.currentTime);
    osc.frequency.setValueAtTime(1100, ctx.currentTime + 0.05);
    gain.gain.setValueAtTime(0.08, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.15);
  } catch { /* audio is best-effort (autoplay policies etc.) */ }
}

/* ── Profile pic / verified cache — shared across every discussions view so a
   user is fetched at most once for the whole session, and updates fan out to
   every mounted view at once. ── */
const userMetaCache = new Map();
const userMetaInflight = new Map();

export function fetchUserMeta(username) {
  if (!username) return Promise.resolve(null);
  if (userMetaCache.has(username)) return Promise.resolve(userMetaCache.get(username));
  if (userMetaInflight.has(username)) return userMetaInflight.get(username);
  const p = apiFetch(`/profile-pic/${username}`)
    .then(r => (r && r.ok ? r.json() : {}))
    .then(d => {
      const meta = { pic: (d && d.profile_pic) || '', verified: !!(d && d.verified) };
      userMetaCache.set(username, meta);
      return meta;
    })
    .catch(() => {
      const meta = { pic: '', verified: false };
      userMetaCache.set(username, meta);
      return meta;
    })
    .finally(() => userMetaInflight.delete(username));
  userMetaInflight.set(username, p);
  return p;
}

function sameMeta(a, b) {
  const ka = Object.keys(a); const kb = Object.keys(b);
  if (ka.length !== kb.length) return false;
  return ka.every(k => a[k] === b[k]);
}

/** username -> { pic, verified } for the given list; fetches only what is missing. */
export function useUserMeta(usernames) {
  const key = usernames.join(',');
  const [meta, setMeta] = useState(() => {
    const out = {};
    usernames.forEach(u => { const m = userMetaCache.get(u); if (m) out[u] = m; });
    return out;
  });
  useEffect(() => {
    const list = key ? key.split(',') : [];
    const sync = () => {
      const out = {};
      list.forEach(u => { const m = userMetaCache.get(u); if (m) out[u] = m; });
      setMeta(prev => (sameMeta(prev, out) ? prev : out));
    };
    sync();
    const missing = list.filter(u => u && !userMetaCache.has(u));
    if (missing.length === 0) return undefined;
    let alive = true;
    Promise.all(missing.map(fetchUserMeta)).then(() => { if (alive) sync(); });
    return () => { alive = false; };
  }, [key]);
  return meta;
}

