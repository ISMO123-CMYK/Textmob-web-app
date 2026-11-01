// Louda design tokens — ported from client/src/louda/louda.css (--safari-green etc.)
// and the Tailwind utility classes used throughout LoudaApp.jsx.

export const LOUDA_ACCENT = '#2B3EE8';
export const LOUDA_ACCENT_DARK = '#2130CB';
export const LOUDA_BROWN = '#5D4037';
export const LOUDA_ORANGE = '#E64A19';
export const LOUDA_AMBER = '#FFB300';

export type LoudaPalette = {
  accent: string;
  accentDark: string;
  accentSoft: string;
  accentTint: string;
  pageBg: string;
  card: string;
  cardMuted: string;
  chatBg: string;
  chatWallpaperFallback: string;
  text: string;
  textSecondary: string;
  textMuted: string;
  textInverse: string;
  border: string;
  borderLight: string;
  bubbleSent: string;
  bubbleSentText: string;
  bubbleReceived: string;
  bubbleReceivedText: string;
  headerBg: string;
  headerText: string;
  inputBg: string;
  danger: string;
  dangerSoft: string;
  warning: string;
  warningSoft: string;
  success: string;
  overlay: string;
  bubbleShadow: string;
  skeleton: string;
  badgeBg: string;
  selectionBar: string;
};

const light: LoudaPalette = {
  accent: LOUDA_ACCENT,
  accentDark: LOUDA_ACCENT_DARK,
  accentSoft: 'rgba(43,62,232,0.10)',
  accentTint: 'rgba(43,62,232,0.05)',
  pageBg: '#F7F8FC',
  card: '#ffffff',
  cardMuted: '#F8F9FD',
  chatBg: '#F7F8FC',
  chatWallpaperFallback: '#F7F8FC',
  text: '#172033',
  textSecondary: '#667085',
  textMuted: '#8A94A6',
  textInverse: '#ffffff',
  border: '#E7EAF2',
  borderLight: '#EEF0F6',
  bubbleSent: LOUDA_ACCENT,
  bubbleSentText: '#ffffff',
  bubbleReceived: '#ffffff',
  bubbleReceivedText: '#172033',
  headerBg: '#ffffff',
  headerText: '#111827',
  inputBg: '#ffffff',
  danger: '#ef4444',
  dangerSoft: 'rgba(239,68,68,0.10)',
  warning: '#f59e0b',
  warningSoft: 'rgba(245,158,11,0.12)',
  success: '#10b981',
  overlay: 'rgba(0,0,0,0.5)',
  bubbleShadow: 'rgba(0,0,0,0.06)',
  skeleton: '#e5e7eb',
  badgeBg: LOUDA_ACCENT,
  selectionBar: '#2B3EE8',
};

const dark: LoudaPalette = {
  accent: '#8290FF',
  accentDark: '#A0AAFF',
  accentSoft: 'rgba(130,144,255,0.16)',
  accentTint: 'rgba(130,144,255,0.08)',
  pageBg: '#101525',
  card: '#192238',
  cardMuted: '#141C30',
  chatBg: '#101525',
  chatWallpaperFallback: '#101525',
  text: '#F4F6FF',
  textSecondary: '#A6B0C7',
  textMuted: '#9AA6C0',
  textInverse: '#ffffff',
  border: '#2B3650',
  borderLight: '#242F48',
  bubbleSent: '#8290FF',
  bubbleSentText: '#ffffff',
  bubbleReceived: '#192238',
  bubbleReceivedText: '#F4F6FF',
  headerBg: '#192238',
  headerText: '#F4F6FF',
  inputBg: '#192238',
  danger: '#f87171',
  dangerSoft: 'rgba(248,113,113,0.14)',
  warning: '#fbbf24',
  warningSoft: 'rgba(251,191,36,0.14)',
  success: '#34d399',
  overlay: 'rgba(0,0,0,0.7)',
  bubbleShadow: 'rgba(0,0,0,0.25)',
  skeleton: '#374151',
  badgeBg: '#8290FF',
  selectionBar: '#8290FF',
};

export const lightLouda = light;
export const darkLouda = dark;

export function loudaPalette(isDark: boolean): LoudaPalette {
  return isDark ? dark : light;
}
