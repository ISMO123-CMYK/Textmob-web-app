import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { User, loginAPI, signupAPI, getProfileAPI } from '../api/auth';
import { clearApiCache } from '../api/client';
import { storage, KEYS } from '../utils/storage';

interface AuthContextType {
  user: User | null;
  username: string | null;
  isLoading: boolean;
  isChecking: boolean;
  login: (identifier: string, password: string, rememberMe?: boolean) => Promise<{ success: boolean; error?: string }>;
  signup: (formData: FormData) => Promise<{ success: boolean; error?: string; username?: string }>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  username: null,
  isLoading: false,
  isChecking: true,
  login: async () => ({ success: false }),
  signup: async () => ({ success: false }),
  logout: async () => {},
  refreshProfile: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isChecking, setIsChecking] = useState(true);
  const mountedRef = useRef(true);

  const username = user?.username || null;

  const refreshProfile = useCallback(async () => {
    if (!username) return;
    const res = await getProfileAPI(username);
    if (res.ok && res.data && res.data.username && mountedRef.current) {
      setUser(res.data);
    } else if (res.ok && res.data && !res.data.username && res.status !== 0 && mountedRef.current) {
      setUser(null);
      storage.removeSecure(KEYS.CURRENT_USER).catch(() => {});
      storage.removeStore('CACHED_USER_PROFILE_' + username).catch(() => {});
      clearApiCache();
    }
  }, [username]);

  useEffect(() => {
    mountedRef.current = true;
    (async () => {
      try {
        const stored = await storage.getSecure(KEYS.CURRENT_USER);
        if (stored && stored !== 'undefined') {
          // Instantly set minimal cached user so splash hides immediately
          const cachedProfileRaw = await storage.getStore('CACHED_USER_PROFILE_' + stored);
          let cachedProfile: User | null = null;
          try { cachedProfile = cachedProfileRaw ? JSON.parse(cachedProfileRaw) : null; } catch { }
          if (cachedProfile && cachedProfile.username && mountedRef.current) {
            setUser(cachedProfile);
          } else if (mountedRef.current) {
            setUser({ username: stored, fullname: stored, profile_pic: '', id: '', created_at: '' } as User);
          }

          // Refresh fresh profile data asynchronously in background
          getProfileAPI(stored).then(profileRes => {
            if (!mountedRef.current) return;
            if (profileRes.ok && profileRes.data) {
              // The profile endpoint 200s with { error: "User not found" } and no
              // username when the account no longer exists — treat it as logged out
              // instead of keeping a ghost session.
              if (profileRes.data.username) {
                setUser(profileRes.data);
                storage.setStore('CACHED_USER_PROFILE_' + stored, JSON.stringify(profileRes.data));
                return;
              }
            }
            // User no longer exists on the server (only if the response wasn't a
            // network failure) → drop the session so the app lands on Login.
            if (profileRes.status && profileRes.status !== 0) {
              setUser(null);
              storage.removeSecure(KEYS.CURRENT_USER).catch(() => {});
              storage.removeStore('CACHED_USER_PROFILE_' + stored).catch(() => {});
              storage.removeStore(KEYS.PENDING_CREDENTIALS).catch(() => {});
              clearApiCache();
            }
          }).catch(() => {});
        }
      } catch { }
      if (mountedRef.current) setIsChecking(false);
    })();
    return () => { mountedRef.current = false; };
  }, []);

  const login = useCallback(async (identifier: string, password: string, rememberMe?: boolean) => {
    setIsLoading(true);
    try {
      const res = await loginAPI(identifier, password);
      if (res.ok && res.data?.user) {
        const u = res.data.user;
        const profile_pic = u.profile_pic || '';
        const savedRaw = await storage.getStore(KEYS.SAVED_ACCOUNTS);
        let saved: { username?: string; password?: string; profile_pic?: string }[] = [];
        try { saved = JSON.parse(savedRaw || '[]'); } catch { }
        const alreadySaved = saved.some((a) => (a.username || '').toLowerCase() === u.username.toLowerCase());

        if (rememberMe) {
          if (!alreadySaved) {
            saved.push({ username: u.username, password, profile_pic });
          } else {
            saved = saved.map((a) => (a.username || '').toLowerCase() === u.username.toLowerCase()
              ? { ...a, username: u.username, password, profile_pic }
              : a);
          }
          await storage.setStore(KEYS.SAVED_ACCOUNTS, JSON.stringify(saved));
        } else if (!alreadySaved) {
          // Stash pending credentials BEFORE the user state is set so the
          // SaveCredentialsBanner is guaranteed to find them on mount.
          await storage.setStore(KEYS.PENDING_CREDENTIALS, JSON.stringify({ username: u.username, password, profile_pic }));
        }

        setUser(u);
        await storage.setSecure(KEYS.CURRENT_USER, u.username);
        await storage.setStore('CACHED_USER_PROFILE_' + u.username, JSON.stringify(u));
        clearApiCache();
        return { success: true };
      }
      return { success: false, error: res.error || 'Invalid credentials' };
    } catch (err: any) {
      return { success: false, error: err?.message || 'Login failed' };
    } finally {
      setIsLoading(false);
    }
  }, []);

  const signup = useCallback(async (formData: FormData) => {
    setIsLoading(true);
    try {
      const res = await signupAPI(formData);
      if (res.ok && res.data) {
        const u = res.data;
        const pw = formData.get('password') as string | null;
        if (pw) {
          const savedRaw = await storage.getStore(KEYS.SAVED_ACCOUNTS);
          let saved: { username?: string }[] = [];
          try { saved = JSON.parse(savedRaw || '[]'); } catch { }
          if (!saved.some((a) => (a.username || '').toLowerCase() === u.username.toLowerCase())) {
            await storage.setStore(KEYS.PENDING_CREDENTIALS, JSON.stringify({ username: u.username, password: pw, profile_pic: u.profile_pic || '' }));
          }
        }
        setUser(u);
        await storage.setSecure(KEYS.CURRENT_USER, u.username);
        await storage.setStore('CACHED_USER_PROFILE_' + u.username, JSON.stringify(u));
        return { success: true, username: u.username };
      }
      return { success: false, error: res.error || 'Signup failed' };
    } catch (err: any) {
      return { success: false, error: err?.message || 'Signup failed' };
    } finally {
      setIsLoading(false);
    }
  }, []);

  const logout = useCallback(async () => {
    setUser(null);
    setIsLoading(false);
    await storage.removeSecure(KEYS.CURRENT_USER);
    await storage.removeStore(KEYS.CACHED_PROFILE_PIC);
    await storage.removeStore(KEYS.PENDING_CREDENTIALS);
    clearApiCache();
  }, []);

  return (
    <AuthContext.Provider value={{ user, username, isLoading, isChecking, login, signup, logout, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
