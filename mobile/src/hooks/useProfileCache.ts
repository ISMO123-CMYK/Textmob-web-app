import { useState, useEffect } from 'react';
import { getProfileAPI } from '../api/auth';

const profileCache = new Map<string, any>();
const listeners = new Map<string, Set<(profile: any) => void>>();
const inflightRequests: Record<string, Promise<any>> = {};

const DEFAULT_PIC = 'https://res.cloudinary.com/dzvm9xe1i/image/upload/v1746095979/profile-pictures/e2st5nispbicnhnir9cf.jpg';

function notifyListeners(username: string, profile: any) {
  const set = listeners.get(username);
  if (set) {
    set.forEach(fn => fn(profile));
  }
}

export async function fetchProfile(username: string) {
  if (!username || username === 'undefined') return null;

  if (profileCache.has(username)) {
    const p = profileCache.get(username);
    notifyListeners(username, p);
    return p;
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
      profileCache.set(username, profile);
      notifyListeners(username, profile);
      return profile;
    } catch {
      const fallback = {
        fullname: username,
        profile_pic: DEFAULT_PIC,
        verified: false,
        followers: [],
        following: [],
        profile_type: 'Individual',
        phone: '',
        email: '',
        notification_prefs: {},
      };
      profileCache.set(username, fallback);
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
  const [profile, setProfile] = useState<any>(profileCache.get(username) || null);

  useEffect(() => {
    if (!username || username === 'undefined') return;

    const cached = profileCache.get(username);
    if (cached) {
      setProfile(cached);
      return;
    }

    const handler = (p: any) => setProfile(p);
    if (!listeners.has(username)) {
      listeners.set(username, new Set());
    }
    listeners.get(username)!.add(handler);
    fetchProfile(username);

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
