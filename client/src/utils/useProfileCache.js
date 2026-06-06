import { useState, useEffect } from 'react';
import { apiFetch } from '../config/api';

// Profile cache – mirrors On, kn, Mn, An, jn from the minified bundle
const profileCache = new Map();  // On
const listeners = new Map();     // kn
const inflightRequests = {};

const DEFAULT_PIC = 'https://res.cloudinary.com/dzvm9xe1i/image/upload/v1746095979/profile-pictures/e2st5nispbicnhnir9cf.jpg';

function readFromLS(username) {
  try {
    let raw = localStorage.getItem(`__tmob_p_${username}`);
    if (raw) {
      let p = JSON.parse(raw);
      if (p && p.fullname) return p;
    }
  } catch {}
  return null;
}

function writeToLS(username, profile) {
  try {
    localStorage.setItem(`__tmob_p_${username}`, JSON.stringify(profile));
  } catch {}
}

function getProfile(username) {
  if (!username || username === 'undefined') return null;
  let cached = profileCache.get(username);
  if (cached) return cached;
  let ls = readFromLS(username);
  if (ls) {
    profileCache.set(username, ls);
    return ls;
  }
  return null;
}

async function fetchProfile(username) {
  if (!username || username === 'undefined') return null;
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
        bio: data.bio || '',
        followers: data.followers || [],
        following: data.following || [],
        notifications: data.notifications || []
      };
      profileCache.set(username, profile);
      writeToLS(username, profile);
      notifyListeners(username, profile);
      return profile;
    } catch {
      let fallback = {
        fullname: username,
        profile_pic: DEFAULT_PIC,
        notifications: []
      };
      profileCache.set(username, fallback);
      writeToLS(username, fallback);
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

// Nn – hook to get a profile with live updates
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
    notifications: []
  };
}

// Pn – synchronous getter (no hook)
export function getProfileSync(username) {
  return getProfile(username) || {
    fullname: username || 'Guest',
    profile_pic: DEFAULT_PIC,
    notifications: []
  };
}

// Expose the cache and fetch for RichText
export { profileCache, fetchProfile };
