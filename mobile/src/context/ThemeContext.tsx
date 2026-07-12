import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
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

  useEffect(() => {
    (async () => {
      const saved = await storage.getStore(KEYS.DARK_MODE);
      if (saved === 'light' || saved === 'dark' || saved === 'system') {
        setThemeModeState(saved);
      }
    })();
  }, []);

  const isDark = themeMode === 'system' ? systemScheme === 'dark' : themeMode === 'dark';
  const colors = isDark ? darkColors : lightColors;

  const setThemeMode = useCallback(async (mode: ThemeMode) => {
    setThemeModeState(mode);
    await storage.setStore(KEYS.DARK_MODE, mode);
  }, []);

  const toggleTheme = useCallback(async () => {
    const next = isDark ? 'light' : 'dark';
    setThemeModeState(next);
    await storage.setStore(KEYS.DARK_MODE, next);
  }, [isDark]);

  return (
    <ThemeContext.Provider value={{ isDark, colors, themeMode, setThemeMode, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);
