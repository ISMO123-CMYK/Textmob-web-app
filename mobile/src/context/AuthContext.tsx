import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { User, loginAPI, signupAPI, verifyUserAPI, getProfileAPI } from '../api/auth';
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

  const username = user?.username || null;

  const refreshProfile = useCallback(async () => {
    const stored = await storage.getSecure(KEYS.CURRENT_USER);
    if (stored) {
      const res = await getProfileAPI(stored);
      if (res.ok && res.data) {
        setUser(res.data);
      }
    }
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const stored = await storage.getSecure(KEYS.CURRENT_USER);
        if (stored && stored !== 'undefined') {
          const verifyRes = await verifyUserAPI(stored);
          if (verifyRes.ok && verifyRes.data?.exists === false) {
            await storage.clearStore();
            await storage.removeSecure(KEYS.CURRENT_USER);
          } else if (verifyRes.ok) {
            const profileRes = await getProfileAPI(stored);
            if (profileRes.ok && profileRes.data) {
              setUser(profileRes.data);
            }
          }
        }
      } catch { }
      setIsChecking(false);
    })();
  }, []);

  const login = useCallback(async (identifier: string, password: string) => {
    setIsLoading(true);
    try {
      const res = await loginAPI(identifier, password);
      if (res.ok && res.data?.user) {
        const u = res.data.user;
        setUser(u);
        await storage.setSecure(KEYS.CURRENT_USER, u.username);
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
