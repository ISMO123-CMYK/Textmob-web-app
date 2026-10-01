// Louda design tokens — ported from client/src/louda/louda.css (--safari-green etc.)
// and the Tailwind utility classes used throughout LoudaApp.jsx.

export const LOUDA_ACCENT = '#2563eb';
export const LOUDA_ACCENT_DARK = '#1d4ed8';
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
  accentSoft: 'rgba(37,99,235,0.10)',
  accentTint: 'rgba(37,99,235,0.05)',
  pageBg: '#f0f2f5',
  card: '#ffffff',
  cardMuted: '#f9fafb',
  chatBg: '#efeae2',
  chatWallpaperFallback: '#efeae2',
  text: '#111827',
  textSecondary: '#4b5563',
  textMuted: '#9ca3af',
  textInverse: '#ffffff',
  border: '#e5e7eb',
  borderLight: '#f3f4f6',
  bubbleSent: LOUDA_ACCENT,
  bubbleSentText: '#ffffff',
  bubbleReceived: '#ffffff',
  bubbleReceivedText: '#111827',
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
  selectionBar: '#5D4037',
};

const dark: LoudaPalette = {
  accent: '#3b82f6',
  accentDark: '#2563eb',
  accentSoft: 'rgba(59,130,246,0.16)',
  accentTint: 'rgba(59,130,246,0.08)',
  pageBg: '#111827',
  card: '#1f2937',
  cardMuted: '#111827',
  chatBg: '#0b141a',
  chatWallpaperFallback: '#0b141a',
  text: '#f3f4f6',
  textSecondary: '#d1d5db',
  textMuted: '#9ca3af',
  textInverse: '#ffffff',
  border: '#374151',
  borderLight: '#2b3440',
  bubbleSent: '#2563eb',
  bubbleSentText: '#ffffff',
  bubbleReceived: '#1f2937',
  bubbleReceivedText: '#f3f4f6',
  headerBg: '#1f2937',
  headerText: '#f3f4f6',
  inputBg: '#1f2937',
  danger: '#f87171',
  dangerSoft: 'rgba(248,113,113,0.14)',
  warning: '#fbbf24',
  warningSoft: 'rgba(251,191,36,0.14)',
  success: '#34d399',
  overlay: 'rgba(0,0,0,0.7)',
  bubbleShadow: 'rgba(0,0,0,0.25)',
  skeleton: '#374151',
  badgeBg: '#3b82f6',
  selectionBar: '#4e342e',
};

export const lightLouda = light;
export const darkLouda = dark;

export function loudaPalette(isDark: boolean): LoudaPalette {
  return isDark ? dark : light;
}
