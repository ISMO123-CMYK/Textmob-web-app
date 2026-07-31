import { apiPost } from '../api/client';
import { storage } from './storage';
import { Platform, AppState, Dimensions } from 'react-native';

const HEARTBEAT_INTERVAL = 30000;
const SCROLL_DEPTH_THRESHOLDS = [25, 50, 75, 90, 100];

let heartbeatTimer: ReturnType<typeof setInterval> | null = null;
let sessionStart: number | null = null;
let currentUsername: string | null = null;
let trackedScrollDepths: Set<number> | null = null;
let appStateSubscription: any = null;

async function getUsername(): Promise<string | null> {
  try {
    return await storage.getSecure('currentUser');
  } catch {
    return null;
  }
}

function getDeviceInfo() {
  const { width, height } = Dimensions.get('window');
  return {
    platform: Platform.OS,
    osVersion: Platform.Version,
    deviceType: Platform.OS === 'web' ? 'web' : 'mobile',
    screen: `${width}x${height}`,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    language: Platform.OS === 'web' ? navigator.language : undefined,
  };
}

async function track(event: string, metadata: Record<string, any> = {}) {
  const u = currentUsername || await getUsername();
  if (!u) return;
  const payload = { username: u, event, metadata };
  if (event === 'app_open') {
    payload.metadata.device = getDeviceInfo();
  }
  apiPost('/tatu', payload).catch(() => {});
}

function startHeartbeat() {
  stopHeartbeat();
  heartbeatTimer = setInterval(() => {
    track('heartbeat');
  }, HEARTBEAT_INTERVAL);
}

function stopHeartbeat() {
  if (heartbeatTimer) {
    clearInterval(heartbeatTimer);
    heartbeatTimer = null;
  }
}

export function initTracking() {
  getUsername().then(u => {
    currentUsername = u;
    sessionStart = Date.now();
    track('app_open');
    if (u) startHeartbeat();
  });

  appStateSubscription = AppState.addEventListener('change', (nextState) => {
    if (nextState === 'active') {
      getUsername().then(u => {
        currentUsername = u;
        sessionStart = Date.now();
        track('app_open');
        if (u) startHeartbeat();
      });
    } else if (nextState === 'background' || nextState === 'inactive') {
      const elapsed = sessionStart ? Math.floor((Date.now() - sessionStart) / 1000) : 0;
      if (elapsed > 0) track('app_close', { elapsedSeconds: elapsed });
      sessionStart = null;
      stopHeartbeat();
    }
  });
}

export function trackScrollDepth(currentDepth: number) {
  if (!trackedScrollDepths) trackedScrollDepths = new Set();
  for (const t of SCROLL_DEPTH_THRESHOLDS) {
    if (currentDepth >= t && !trackedScrollDepths.has(t)) {
      trackedScrollDepths.add(t);
      track('scroll_depth', { depth: t });
    }
  }
}

export function trackPageView(path: string, title?: string) {
  track('page_view', { path, title: title || '' });
}

export function trackActivity(event: string, metadata: Record<string, any> = {}) {
  track(event, metadata);
}

export function stopTracking() {
  stopHeartbeat();
  if (appStateSubscription) {
    appStateSubscription.remove();
    appStateSubscription = null;
  }
}
