import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { useColorScheme } from 'react-native';
import { colors as lightColors, darkColors } from '../theme/colors';
import { storage, KEYS } from '../utils/storage';

type ThemeMode = 'light' | 'dark' | 'system';

interface ThemeContextType {
  isDark: boolean;
  colors: typeof lightColors;
  themeMode: ThemeMode;
  setThemeMode: (mode: ThemeMode) => Promise<void>;
  toggleTheme: () => Promise<void>;
}

const ThemeContext = createContext<ThemeContextType>({
  isDark: false,
  colors: lightColors,
  themeMode: 'system',
  setThemeMode: async () => {},
  toggleTheme: async () => {},
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const systemScheme = useColorScheme();
  const [themeMode, setThemeModeState] = useState<ThemeMode>('system');
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const saved = await storage.getStore(KEYS.DARK_MODE);
      if (mounted) {
        if (saved === 'light' || saved === 'dark' || saved === 'system') {
          setThemeModeState(saved);
        }
        setReady(true);
      }
    })();
    return () => { mounted = false; };
  }, []);

  const isDark = themeMode === 'system' ? systemScheme === 'dark' : themeMode === 'dark';
  const colors = isDark ? darkColors : lightColors;

  const setThemeMode = useCallback(async (mode: ThemeMode) => {
    setThemeModeState(mode);
    await storage.setStore(KEYS.DARK_MODE, mode);
  }, []);

  const toggleTheme = useCallback(async () => {
    setThemeModeState(prev => {
      const next = prev === 'system' ? (systemScheme === 'dark' ? 'light' : 'dark') : (prev === 'dark' ? 'light' : 'dark');
      storage.setStore(KEYS.DARK_MODE, next);
      return next;
    });
  }, [systemScheme]);

  // Memoized: an unstable value re-renders EVERY useTheme consumer (the whole
  // app) on each provider render. MUST sit above the `!ready` early return —
  // hooks after a conditional return change hook order and crash React.
  const value = useMemo(
    () => ({ isDark, colors, themeMode, setThemeMode, toggleTheme }),
    [isDark, colors, themeMode, setThemeMode, toggleTheme],
  );

  if (!ready) {
    return <>{children}</>;
  }

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);
