import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { User, loginAPI, signupAPI, getProfileAPI } from '../api/auth';
import { storage, KEYS } from '../utils/storage';

interface AuthContextType {
  user: User | null;
  username: string | null;
  isLoading: boolean;
  isChecking: boolean;
  login: (identifier: string, password: string) => Promise<{ success: boolean; error?: string }>;
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
    if (res.ok && res.data && mountedRef.current) {
      setUser(res.data);
    }
  }, [username]);

  useEffect(() => {
    mountedRef.current = true;
    (async () => {
      try {
        const stored = await storage.getSecure(KEYS.CURRENT_USER);
        if (stored && stored !== 'undefined') {
          // Instantly set minimal cached user so splash hides immediately
          const cachedProfile = await storage.getStore('CACHED_USER_PROFILE_' + stored);
          if (cachedProfile && mountedRef.current) {
            setUser(cachedProfile);
          } else if (mountedRef.current) {
            setUser({ username: stored, full_name: stored, id: '', created_at: '' } as User);
          }

          // Refresh fresh profile data asynchronously in background
          getProfileAPI(stored).then(profileRes => {
            if (profileRes.ok && profileRes.data && mountedRef.current) {
              setUser(profileRes.data);
              storage.setStore('CACHED_USER_PROFILE_' + stored, profileRes.data);
            }
          }).catch(() => {});
        }
      } catch { }
      if (mountedRef.current) setIsChecking(false);
    })();
    return () => { mountedRef.current = false; };
  }, []);

  const login = useCallback(async (identifier: string, password: string) => {
    setIsLoading(true);
    try {
      const res = await loginAPI(identifier, password);
      if (res.ok && res.data?.user) {
        const u = res.data.user;
        setUser(u);
        await storage.setSecure(KEYS.CURRENT_USER, u.username);
        await storage.setStore('CACHED_USER_PROFILE_' + u.username, u);
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
        setUser(u);
        await storage.setSecure(KEYS.CURRENT_USER, u.username);
        await storage.setStore('CACHED_USER_PROFILE_' + u.username, u);
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
  }, []);

  return (
    <AuthContext.Provider value={{ user, username, isLoading, isChecking, login, signup, logout, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
