import { useState, useEffect, useRef } from 'react';
import { getProfileAPI } from '../api/auth';

const MAX_CACHE_SIZE = 50;
const CACHE_TTL = 5 * 60 * 1000;

interface CacheEntry {
  profile: any;
  timestamp: number;
}

const profileCache = new Map<string, CacheEntry>();
const listeners = new Map<string, Set<(profile: any) => void>>();
const inflightRequests: Record<string, Promise<any>> = {};

const DEFAULT_PIC = 'https://res.cloudinary.com/dzvm9xe1i/image/upload/v1746095979/profile-pictures/e2st5nispbicnhnir9cf.jpg';

function evictIfNeeded() {
  if (profileCache.size < MAX_CACHE_SIZE) return;
  let oldest: string | null = null;
  let oldestTime = Infinity;
  for (const [key, entry] of profileCache) {
    if (entry.timestamp < oldestTime) {
      oldestTime = entry.timestamp;
      oldest = key;
    }
  }
  if (oldest) profileCache.delete(oldest);
}

function isCacheValid(key: string): boolean {
  const entry = profileCache.get(key);
  if (!entry) return false;
  if (Date.now() - entry.timestamp > CACHE_TTL) {
    profileCache.delete(key);
    return false;
  }
  return true;
}

function notifyListeners(username: string, profile: any) {
  const set = listeners.get(username);
  if (set) {
    set.forEach(fn => fn(profile));
  }
}

export async function fetchProfile(username: string) {
  if (!username || username === 'undefined') return null;

  if (isCacheValid(username)) {
    const entry = profileCache.get(username)!;
    notifyListeners(username, entry.profile);
    return entry.profile;
  }

  if (inflightRequests[username]) return inflightRequests[username];

  inflightRequests[username] = (async () => {
    try {
      const res = await getProfileAPI(username);
      if (!res.ok || !res.data) throw new Error('fail');
      const data = res.data;
      const profile = {
        fullname: data.fullname || username,
        profile_pic: data.profile_pic || DEFAULT_PIC,
        verified: data.verified || false,
        biography: data.biography || '',
        followers: data.followers || [],
        following: data.following || [],
        profile_type: data.profile_type || 'Individual',
        phone: data.phone || '',
        email: data.email || '',
        notification_prefs: data.notification_prefs || {},
      };
      evictIfNeeded();
      profileCache.set(username, { profile, timestamp: Date.now() });
      notifyListeners(username, profile);
      return profile;
    } catch {
      const fallback = {
        fullname: username,
        profile_pic: DEFAULT_PIC,
        verified: false,
        biography: '',
        followers: [],
        following: [],
        profile_type: 'Individual',
        phone: '',
        email: '',
        notification_prefs: {},
      };
      notifyListeners(username, fallback);
      return fallback;
    } finally {
      delete inflightRequests[username];
    }
  })();

  return inflightRequests[username];
}

export function invalidateProfileCache(username: string) {
  profileCache.delete(username);
}

export default function useProfileCache(username: string) {
  const [profile, setProfile] = useState<any>(() => {
    if (!username) return null;
    const cached = profileCache.get(username);
    if (cached && Date.now() - cached.timestamp <= CACHE_TTL) {
      return cached.profile;
    }
    return null;
  });
  const prevUsernameRef = useRef(username);

  useEffect(() => {
    if (!username || username === 'undefined') return;

    prevUsernameRef.current = username;

    const cached = profileCache.get(username);
    if (cached && Date.now() - cached.timestamp <= CACHE_TTL) {
      setProfile(cached.profile);
    }

    const handler = (p: any) => {
      if (prevUsernameRef.current === username) {
        setProfile(p);
      }
    };
    if (!listeners.has(username)) {
      listeners.set(username, new Set());
    }
    listeners.get(username)!.add(handler);

    if (!cached || Date.now() - cached.timestamp > CACHE_TTL) {
      fetchProfile(username);
    }

    return () => {
      const set = listeners.get(username);
      if (set) {
        set.delete(handler);
        if (set.size === 0) listeners.delete(username);
      }
    };
  }, [username]);

  return profile || {
    fullname: username || 'Loading...',
    profile_pic: DEFAULT_PIC,
    verified: false,
    followers: [],
    following: [],
    profile_type: 'Individual',
  };
}
