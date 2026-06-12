import { useState, useEffect } from 'react';
import { apiFetch } from '../config/api';

// In-memory cache registry for the current app session
const profileCache = new Map();
const listeners = new Map();
const inflightRequests = {};

const DEFAULT_PIC = 'https://cloudinary.com';

function getProfile(username) {
  if (!username || username === 'undefined') return null;
  return profileCache.get(username) || null;
}

async function fetchProfile(username) {
  if (!username || username === 'undefined') return null;

  // Return immediately if already cached in this session
  if (profileCache.has(username)) {
    let p = profileCache.get(username);
    notifyListeners(username, p);
    return p;
  }

  if (inflightRequests[username]) return inflightRequests[username];

  inflightRequests[username] = (async () => {
    try {
      let res = await apiFetch(`/profile/${encodeURIComponent(username)}`);
      if (!res.ok) throw Error('fail');
      let data = await res.json();
      let profile = {
        fullname: data.fullname || username,
        profile_pic: data.profile_pic || DEFAULT_PIC,
        verified: data.verified || false,
        bio: data.bio || '',
        followers: data.followers || [],
        following: data.following || [],
        notifications: data.notifications || []
      };
      profileCache.set(username, profile);
      notifyListeners(username, profile);
      return profile;
    } catch {
      let fallback = {
        fullname: username,
        profile_pic: DEFAULT_PIC,
        verified: false,
        notifications: []
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

function notifyListeners(username, profile) {
  let set = listeners.get(username);
  if (set) {
    set.forEach(fn => fn(profile));
  }
}

// Custom hook with live session caching updates
export default function useProfileCache(username) {
  const [profile, setProfile] = useState(getProfile(username));

  useEffect(() => {
    if (!username || username === 'undefined') return;

    let cached = profileCache.get(username);
    if (cached) {
      setProfile(cached);
      return;
    }

    let handler = p => setProfile(p);
    if (!listeners.has(username)) {
      listeners.set(username, new Set());
    }
    listeners.get(username).add(handler);
    fetchProfile(username);

    return () => {
      let set = listeners.get(username);
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
    notifications: []
  };
}

export function getProfileSync(username) {
  return getProfile(username) || {
    fullname: username || 'Guest',
    profile_pic: DEFAULT_PIC,
    verified: false,
    notifications: []
  };
}

export { profileCache, fetchProfile };
