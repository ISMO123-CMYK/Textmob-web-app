import React, { createContext, useContext, useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { User, loginAPI, signupAPI, getProfileAPI, verifyUserAPI, checkDisabledAPI, isDisabledUser } from '../api/auth';
import { clearApiCache } from '../api/client';
import { storage, KEYS } from '../utils/storage';
import { unregisterTokenFor, clearPushPreferences } from '../louda/push';
import { clearTextmobUserCache } from '../louda/session';

interface AuthContextType {
  user: User | null;
  username: string | null;
  isLoading: boolean;
  isChecking: boolean;
  isDisabled: boolean;
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
  isDisabled: false,
  login: async () => ({ success: false }),
  signup: async () => ({ success: false }),
  logout: async () => {},
  refreshProfile: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isChecking, setIsChecking] = useState(true);
  const [isDisabled, setIsDisabled] = useState(false);
  const mountedRef = useRef(true);

  const username = user?.username || null;

  const clearSession = useCallback(async (name: string) => {
    const clean = name && name !== 'undefined' ? name : '';

    // Release the device token BEFORE the session disappears: afterwards we no
    // longer know whose token it is, and a token left on the server keeps
    // pushing to a phone that has logged out (the same token then gets
    // registered under the next account, notifying both).
    // Flip the UI first so this never waits on the network.
    setUser(null);
    setIsDisabled(false);
    setIsLoading(false);

    if (clean) await unregisterTokenFor(clean).catch(() => {});
    await clearPushPreferences();
    clearTextmobUserCache();

    await storage.removeSecure(KEYS.CURRENT_USER);
    await storage.removeStore(KEYS.CACHED_PROFILE_PIC);
    await storage.removeStore(KEYS.PENDING_CREDENTIALS);
    if (clean) await storage.removeStore('CACHED_USER_PROFILE_' + clean).catch(() => {});
    clearApiCache();
  }, []);

  // Mirror of the web AppWrapper poll: does the account still exist, and is it
  // disabled? Network blips never log anyone out — only an explicit answer does.
  const runSessionCheck = useCallback(async (name: string) => {
    try {
      const [existsRes, disabledRes] = await Promise.all([
        verifyUserAPI(name),
        checkDisabledAPI(name),
      ]);
      if (!mountedRef.current) return;
      if (existsRes.ok && existsRes.data && existsRes.data.exists === false) {
        await clearSession(name);
        return;
      }
      if (disabledRes.ok && disabledRes.data) {
        setIsDisabled(disabledRes.data.disabled === true);
      }
    } catch { /* ignore */ }
  }, [clearSession]);

  const refreshProfile = useCallback(async () => {
    if (!username) return;
    const res = await getProfileAPI(username);
    if (!mountedRef.current) return;
    if (res.ok && res.data && res.data.username) {
      setUser(res.data);
    } else if (res.status === 0 || !res.ok) {
      // Network error or timeout — keep stale data, do NOT log out
    } else if (res.ok && res.data && !res.data.username) {
      // Server explicitly says user doesn't exist (e.g. deleted/banned)
      await clearSession(username);
    }
  }, [username, clearSession]);

  useEffect(() => {
    if (!username) return;
    runSessionCheck(username);
    const interval = setInterval(() => runSessionCheck(username), 10000);
    return () => clearInterval(interval);
  }, [username, runSessionCheck]);

  useEffect(() => {
    mountedRef.current = true;
    const failSafe = setTimeout(() => { if (mountedRef.current) setIsChecking(false); }, 2500);
    (async () => {
      try {
        const stored = await storage.getSecure(KEYS.CURRENT_USER);
        if (stored && stored !== 'undefined') {
          // Instantly set minimal cached user so splash hides immediately
          const cachedProfileRaw = await storage.getStore('CACHED_USER_PROFILE_' + stored);
          let cachedProfile: User | null = null;
          try { cachedProfile = cachedProfileRaw ? JSON.parse(cachedProfileRaw) : null; } catch (e) { /* ignore */ }
          if (cachedProfile && cachedProfile.username && mountedRef.current) {
            setUser(cachedProfile);
          } else if (mountedRef.current) {
            setUser({ username: stored, fullname: stored, profile_pic: '', id: '', created_at: '' } as User);
          }

          // Refresh fresh profile data asynchronously in background
          getProfileAPI(stored).then(profileRes => {
            if (!mountedRef.current) return;
            if (profileRes.ok && profileRes.data) {
              if (profileRes.data.username) {
                setUser(profileRes.data);
                storage.setStore('CACHED_USER_PROFILE_' + stored, JSON.stringify(profileRes.data));
                return;
              }
            }
            if (profileRes.status && profileRes.status !== 0) {
              clearSession(stored);
            }
          }).catch(() => {});
        }
      } catch (e) { /* ignore */ }
      clearTimeout(failSafe);
      if (mountedRef.current) setIsChecking(false);
    })();
    return () => { mountedRef.current = false; clearTimeout(failSafe); };
  }, []);

  const login = useCallback(async (identifier: string, password: string, rememberMe?: boolean) => {
    setIsLoading(true);
    try {
      const res = await loginAPI(identifier, password);
      if (res.ok && res.data?.user) {
        const u = res.data.user;
        // Server returns the raw user row (disabled TEXT "true"/"false").
        if (isDisabledUser(u)) {
          return {
            success: false,
            error: 'Your account has been disabled for violating our Terms of Service.',
          };
        }
        const profile_pic = u.profile_pic || '';
        const savedRaw = await storage.getStore(KEYS.SAVED_ACCOUNTS);
        let saved: { username?: string; password?: string; profile_pic?: string }[] = [];
        try { saved = JSON.parse(savedRaw || '[]'); } catch (e) { /* ignore */ }
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
          try { saved = JSON.parse(savedRaw || '[]'); } catch (e) { /* ignore */ }
          if (!saved.some((a) => (a.username || '').toLowerCase() === u.username.toLowerCase())) {
            await storage.setStore(KEYS.PENDING_CREDENTIALS, JSON.stringify({ username: u.username, password: pw, profile_pic: u.profile_pic || '' }));
          }
        }
        // The server answers /signup with {message} only — there is no user
        // row to sign in with yet. Creating a session here produced a ghost
        // user with no username; LoginAfterSignup performs the real login.
        if (u.username) {
          setUser(u);
          await storage.setSecure(KEYS.CURRENT_USER, u.username);
          await storage.setStore('CACHED_USER_PROFILE_' + u.username, JSON.stringify(u));
        }
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
    const name = user?.username || (await storage.getSecure(KEYS.CURRENT_USER).catch(() => null)) || '';
    await clearSession(name);
  }, [user, clearSession]);

  const value = useMemo(
    () => ({ user, username, isLoading, isChecking, isDisabled, login, signup, logout, refreshProfile }),
    [user, username, isLoading, isChecking, isDisabled, login, signup, logout, refreshProfile],
  );

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
