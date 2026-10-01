export const LOUDA_PROD_URL = 'https://louda-back-end.onrender.com';

// Single backend: real Louda API everywhere (mirrors web connector.js).
// Override with EXPO_PUBLIC_LOUDA_API_URL when hacking on Louda backend locally.
export const LOUDA_API_URL =
  (typeof process !== 'undefined' && (process.env as any)?.EXPO_PUBLIC_LOUDA_API_URL) ||
  LOUDA_PROD_URL;

// Textmob provider (for /api/louda-unread aggregation + profile lookup)
export const TEXTMOB_API_URL = 'https://textmob-provider-api-99ii.onrender.com';

export const DEFAULT_AVATAR =
  'data:image/svg+xml;utf8,' +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><circle cx="32" cy="32" r="32" fill="#e5e7eb"/><circle cx="32" cy="24" r="11" fill="#9ca3af"/><path d="M12 54c4-11 12-16 20-16s16 5 20 16" fill="#9ca3af"/></svg>`,
  );

export const TTS_VOICES = [
  'Idera', 'Zainab', 'Chinenye', 'Umar', 'Emma', 'Osagie', 'Wura',
  'Jude', 'Adaora', 'Femi', 'Regina', 'Nonso', 'Mary', 'Remi', 'Adam',
];

export const REACTION_EMOJIS = ['❤️', '😂', '😮', '😢', '👍', '🔥', '👏', '🙏', '💯', '😍'];

// Web custom SVG reactions (joy, heart-eyes, kiss, cry, fold, clap, party, 100)
// map to closest emoji for native parity.
export const CUSTOM_REACTIONS = ['😂', '😍', '😘', '😭', '🙏', '👏', '🎉', '💯'];

export const STATUS_BG_COLORS = [
  '#2563eb', '#7c3aed', '#db2777', '#059669', '#ea580c', '#0f172a',
];

export const TRANSLATE_LANGS = [
  { code: 'en', label: 'English' },
  { code: 'yo', label: 'Yoruba' },
  { code: 'ig', label: 'Igbo' },
  { code: 'ha', label: 'Hausa' },
];
