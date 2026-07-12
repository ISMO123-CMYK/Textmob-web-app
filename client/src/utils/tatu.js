import { apiFetch } from '../config/api';

const HEARTBEAT_INTERVAL = 30000;
const SCROLL_THROTTLE = 800;
let heartbeatTimer = null;
let sessionStart = null;
let username = null;
let lastPath = null;
let trackedScrollDepths = null;
let scrollTimer = null;

function getUsername() {
  try { return localStorage.getItem('currentUser') || null; }
  catch { return null; }
}

function getDeviceModel(ua) {
  // iPhone: "iPhone15,2" or "iPhone13,4" etc.
  let m = ua.match(/iPhone\d+,\d+/);
  if (m) {
    const map = {
      'iPhone14,2':'iPhone 13 Pro','iPhone14,3':'iPhone 13 Pro Max','iPhone14,4':'iPhone 13 mini',
      'iPhone14,5':'iPhone 13','iPhone14,6':'iPhone SE 3rd Gen','iPhone14,7':'iPhone 14',
      'iPhone14,8':'iPhone 14 Plus','iPhone15,2':'iPhone 14 Pro','iPhone15,3':'iPhone 14 Pro Max',
      'iPhone15,4':'iPhone 15','iPhone15,5':'iPhone 15 Plus','iPhone16,1':'iPhone 15 Pro',
      'iPhone16,2':'iPhone 15 Pro Max','iPhone17,1':'iPhone 16 Pro','iPhone17,2':'iPhone 16 Pro Max',
      'iPhone17,3':'iPhone 16','iPhone17,4':'iPhone 16 Plus',
      'iPhone12,1':'iPhone 11','iPhone12,3':'iPhone 11 Pro','iPhone12,5':'iPhone 11 Pro Max',
      'iPhone12,8':'iPhone SE 2nd Gen','iPhone13,1':'iPhone 12 mini','iPhone13,2':'iPhone 12',
      'iPhone13,3':'iPhone 12 Pro','iPhone13,4':'iPhone 12 Pro Max',
    };
    return map[m[0]] || m[0];
  }
  // iPad
  m = ua.match(/iPad[\d,]+|iPad\d+,\d+/);
  if (m) return m[0];
  // Android: "SM-S928B", "Pixel 8 Pro", "CPHXXXX" etc.
  m = ua.match(/Android [\d.]+;.*?; ([^;)]+)/);
  if (m) return m[1].trim();
  // macOS
  if (/Mac OS X/.test(ua)) {
    const v = ua.match(/Mac OS X ([\d_]+)/);
    return 'Mac' + (v ? ' (' + v[1].replace(/_/g, '.') + ')' : '');
  }
  // Windows
  if (/Windows NT/.test(ua)) {
    const v = ua.match(/Windows NT ([\d.]+)/);
    return 'Windows' + (v ? ' ' + v[1] : '');
  }
  return ua.match(/^Mozilla\/[\d.]+ \([^;]+; ([^;)]+)/)?.[1] || 'Unknown';
}

function getDeviceInfo() {
  const ua = navigator.userAgent;
  const isMobile = /android|iphone|ipad|ipod|windows phone|mobile/i.test(ua);
  const isTablet = /tablet|ipad|playbook|silk/i.test(ua);
  let browser = 'Unknown';
  if (/Firefox\//.test(ua)) browser = 'Firefox';
  else if (/Edg\/|Edge\//.test(ua)) browser = 'Edge';
  else if (/Chrome\//.test(ua) && !/Edg\//.test(ua)) browser = 'Chrome';
  else if (/Safari\//.test(ua) && !/Chrome\//.test(ua)) browser = 'Safari';
  let os = 'Unknown';
  if (/Windows NT/.test(ua)) os = 'Windows';
  else if (/Mac OS X/.test(ua)) os = 'macOS';
  else if (/Android/.test(ua)) os = 'Android';
  else if (/iPhone|iPad/.test(ua)) os = 'iOS';
  else if (/Linux/.test(ua)) os = 'Linux';
  return {
    browser, os,
    model: getDeviceModel(ua),
    deviceType: isTablet ? 'tablet' : isMobile ? 'mobile' : 'desktop',
    screen: screen.width + 'x' + screen.height,
    viewport: innerWidth + 'x' + innerHeight,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    language: navigator.language,
  };
}

function track(event, metadata = {}) {
  const u = username || getUsername();
  const payload = { username: u, event, metadata };
  if (u && event === 'app_open') payload.metadata.device = getDeviceInfo();
  apiFetch('/tatu', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  }).catch(() => {});
}

function startHeartbeat() {
  stopHeartbeat();
  heartbeatTimer = setInterval(() => {
    track('heartbeat');
    const path = location.pathname + location.hash;
    if (path !== lastPath) { lastPath = path; track('page_view', { path, title: document.title }); }
  }, HEARTBEAT_INTERVAL);
}

function stopHeartbeat() {
  if (heartbeatTimer) { clearInterval(heartbeatTimer); heartbeatTimer = null; }
}

function handleVisibilityChange() {
  if (document.hidden) {
    const elapsed = sessionStart ? Math.floor((Date.now() - sessionStart) / 1000) : 0;
    if (elapsed > 0) track('app_close', { elapsedSeconds: elapsed });
    sessionStart = null;
    stopHeartbeat();
  } else {
    username = getUsername();
    sessionStart = Date.now();
    track('app_open');
    if (username) startHeartbeat();
  }
}

function handleScroll() {
  const scrollTop = window.scrollY;
  const docHeight = document.documentElement.scrollHeight - window.innerHeight;
  if (docHeight <= 0) return;
  const depth = Math.round((scrollTop / docHeight) * 100);
  const thresholds = [25, 50, 75, 90, 100];
  for (const t of thresholds) {
    if (depth >= t && !trackedScrollDepths.has(t)) {
      trackedScrollDepths.add(t);
      track('scroll_depth', { depth: t, path: location.pathname });
    }
  }
}

function initScrollTracking() {
  trackedScrollDepths = new Set();
  window.addEventListener('scroll', () => {
    if (scrollTimer) clearTimeout(scrollTimer);
    scrollTimer = setTimeout(handleScroll, SCROLL_THROTTLE);
  }, { passive: true });
}

function trackPageView() {
  const path = location.pathname + location.hash;
  if (path !== lastPath) { lastPath = path; track('page_view', { path, title: document.title }); }
}

export function initTracking() {
  username = getUsername();
  sessionStart = Date.now();
  lastPath = location.pathname + location.hash;
  track('app_open');
  track('page_view', { path: lastPath, title: document.title });
  if (username) startHeartbeat();
  initScrollTracking();
  document.addEventListener('visibilitychange', handleVisibilityChange);
  window.addEventListener('popstate', trackPageView);
  window.addEventListener('hashchange', trackPageView);
  const origNavigate = window.Lexum?.navigate;
  if (origNavigate) {
    window.Lexum.navigate = function (path) {
      origNavigate.call(window.Lexum, path);
      trackPageView();
    };
  }
  window.addEventListener('beforeunload', () => {
    const elapsed = sessionStart ? Math.floor((Date.now() - sessionStart) / 1000) : 0;
    if (elapsed > 0) {
      const base = location.origin === 'http://localhost:5173' ? 'http://localhost:5000' : 'https://textmob-provider-api-99ii.onrender.com';
      navigator.sendBeacon(base + '/tatu', JSON.stringify({
        username: username || getUsername(),
        event: 'app_close',
        metadata: { elapsedSeconds: elapsed }
      }));
    }
  });
}

export function trackActivity(event, metadata = {}) {
  track(event, metadata);
}

export function stopTracking() {
  stopHeartbeat();
  document.removeEventListener('visibilitychange', handleVisibilityChange);
  window.removeEventListener('popstate', trackPageView);
  window.removeEventListener('hashchange', trackPageView);
  if (scrollTimer) clearTimeout(scrollTimer);
}
