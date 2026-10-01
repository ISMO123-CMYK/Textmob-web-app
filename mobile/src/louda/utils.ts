import { LOUDA_API_URL, TTS_VOICES } from './constants';

// ─── Cloudinary optimization (LoudaApp.jsx:62) ───
export const getOptimizedMediaUrl = (url: string, type = 'auto', quality: string | null = null): string => {
  if (!url || !url.includes('cloudinary.com')) return url;
  const savedQuality = quality || 'auto';
  const qualityMap: Record<string, string> = { low: 'q_30', medium: 'q_60', high: 'q_80', original: 'q_100', auto: 'q_auto' };
  const q = qualityMap[savedQuality] || 'q_auto';
  if (url.includes('/upload/') && !url.includes('q_')) {
    return url.replace('/upload/', `/upload/${q},f_auto/`);
  }
  return url;
};

// ─── Time ago (LoudaApp.jsx:567) ───
export function formatTimeAgo(dateStr?: string | null): string {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  const now = new Date();
  const diff = Math.floor((now.getTime() - date.getTime()) / 1000);
  if (diff < 60) return 'just now';
  const min = Math.floor(diff / 60);
  if (min < 60) return `${min} min ago`;
  const hrs = Math.floor(min / 60);
  if (hrs < 24) return `${hrs} hour${hrs > 1 ? 's' : ''} ago`;
  const days = Math.floor(hrs / 24);
  return `${days} day${days > 1 ? 's' : ''} ago`;
}

// Clock time for bubbles (HH:MM)
export function formatMessageTime(dateStr?: string | null): string {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr);
    let h = d.getHours();
    const m = d.getMinutes().toString().padStart(2, '0');
    const ampm = h >= 12 ? 'PM' : 'AM';
    h = h % 12 || 12;
    return `${h}:${m} ${ampm}`;
  } catch {
    return '';
  }
}

// Day divider label
export function formatDayLabel(dateStr?: string | null): string {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr);
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const startOfThat = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
    const dayMs = 86400000;
    const diffDays = Math.round((startOfToday - startOfThat) / dayMs);
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return d.toLocaleDateString(undefined, { weekday: 'long' });
    return d.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: d.getFullYear() !== now.getFullYear() ? 'numeric' : undefined });
  } catch {
    return '';
  }
}

// Voice note duration mm:ss
export function formatDuration(seconds: number): string {
  if (!isFinite(seconds) || seconds < 0) seconds = 0;
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

// ─── Translate (LoudaApp.jsx:505) ───
export const translateMessage = async (text: string, toLang: string): Promise<string | null> => {
  try {
    const res = await fetch(`${LOUDA_API_URL}/api/translate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, from: 'auto', to: toLang }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Translation failed');
    return data.translation || null;
  } catch (e) {
    console.error('[TRANSLATE]', e);
    return null;
  }
};

// ─── TTS (LoudaApp.jsx:522) — returns playable url ───
export const fetchTTS = async (text: string, voice: string): Promise<string | null> => {
  const activeVoice = TTS_VOICES.includes(voice) ? voice : 'Zainab';
  try {
    const res = await fetch(`${LOUDA_API_URL}/api/tts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, voice: activeVoice }),
    });
    if (!res.ok) {
      const e = await res.json();
      throw new Error(e.error);
    }
    const contentType = res.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      const data = await res.json();
      if (data.cachedUrl) return data.cachedUrl;
      return null;
    }
    // Raw audio buffer -> object URL equivalent (RN: return response url is not possible;
    // caller uses apiTtsBlob). Kept for parity; web used blob.
    return null;
  } catch (e: any) {
    console.error('[TTS]', e);
    return null;
  }
};

// ─── Phone normalisation (connector.js:60) ───
export function normalizePhone(phone?: string | null): string | null {
  if (!phone) return null;
  const raw = String(phone).replace(/[\s\-()./\\+]+/g, '');
  if (!raw) return null;
  if (raw.startsWith('00')) return `+${raw.slice(2)}`;
  if (raw.startsWith('0')) return `+234${raw.slice(1)}`;
  return `+${raw}`;
}

// ─── Textmob profile -> Louda profile (connector.js:69) ───
export function mapTextmobProfile(tmUser: any = {}): any {
  return {
    username: tmUser.username || tmUser.id || '',
    full_name: tmUser.fullname || tmUser.full_name || tmUser.username || '',
    avatar_url: tmUser.profile_pic || tmUser.avatar_url || null,
    email: tmUser.email || null,
    phone: normalizePhone(tmUser.phone),
  };
}

// ─── extract first URL from text ───
export function extractUrl(text?: string | null): string | null {
  if (!text) return null;
  const m = text.match(/https?:\/\/[^\s<]+/);
  return m ? m[0] : null;
}

// ─── phone detection (parseRichText step 8) ───
export function isPhoneNumber(token: string): boolean {
  return /^(?:0[0-9]{10}|[0-9]{10}|\+[0-9]{11,14})$/.test(token);
}

export function phoneToArg(phone: string): string {
  return phone.startsWith('0') ? phone.slice(1) : phone;
}

// ─── markdown-lite for list preview (chat list last message) ───
export function stripMarkdown(text?: string | null): string {
  if (!text) return '';
  return text
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/[*_~`>#]/g, '')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/\s+/g, ' ')
    .trim();
}

// ─── avatar fallback helper ───
export function avatarOr(url: string | null | undefined, fallback: string): string {
  return url && url.length > 0 ? url : fallback;
}

// ─── media type detection ───
export function detectMediaType(url?: string | null): 'image' | 'video' | 'audio' | 'file' {
  if (!url) return 'file';
  const u = url.toLowerCase();
  if (/\.(png|jpe?g|gif|webp|bmp|svg)(\?|$)/.test(u)) return 'image';
  if (/\.(mp4|webm|mov|m4v|avi|mkv|3gp)(\?|$)/.test(u)) return 'video';
  if (/\.(mp3|wav|m4a|aac|ogg|oga|opus|webm)(\?|$)/.test(u)) return 'audio';
  if (u.includes('res.cloudinary.com') && u.includes('/video/')) return 'video';
  if (u.includes('res.cloudinary.com') && u.includes('/image/')) return 'image';
  if (u.includes('res.cloudinary.com') && u.includes('/audio/')) return 'audio';
  return 'file';
}

// ─── display file name from url ───
export function fileNameFromUrl(url?: string | null): string {
  if (!url) return 'File';
  try {
    const noQuery = url.split('?')[0];
    const seg = noQuery.split('/').pop() || 'File';
    return decodeURIComponent(seg);
  } catch {
    return 'File';
  }
}

// ─── debounce ───
export function debounce<T extends (...args: any[]) => any>(fn: T, wait = 300) {
  let t: any;
  return (...args: any[]) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), wait);
  };
}

// ─── Web parity: Lexum.alert shim ───
type AlertFn = (opts?: { title?: string; message?: string }) => void;
let alertImpl: AlertFn = ({ title, message } = {}) => {
  console.log(`[Louda] ${title || ''}: ${message || ''}`);
};
export function setLoudaAlertImpl(fn: AlertFn) { alertImpl = fn; }
export function loudaAlert(opts?: { title?: string; message?: string }) {
  try { alertImpl(opts); } catch { /* toast must never crash chat */ }
}

// ─── TTS playback (LoudaApp.jsx:522-561) ───
let ttsPlayer: import('expo-audio').AudioPlayer | null = null;
export async function playTTS(text: string, voice?: string) {
  const activeVoice = TTS_VOICES.includes(voice || '') ? (voice as string) : 'Zainab';
  try {
    const res = await fetch(`${LOUDA_API_URL}/api/tts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, voice: activeVoice }),
    });
    if (!res.ok) {
      const e = await res.json().catch(() => ({} as any));
      throw new Error(e.error || 'TTS failed');
    }
    const contentType = res.headers.get('content-type') || '';
    let uri: string | null = null;
    if (contentType.includes('application/json')) {
      const data = await res.json();
      uri = data.cachedUrl || null;
    } else {
      // Raw audio buffer → save to a temp file (AVPlayer/ExoPlayer can't do blobs)
      const blob = await res.blob();
      const b64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onerror = () => reject(new Error('read failed'));
        reader.onload = () => {
          const r = String(reader.result);
          resolve(r.substring(r.indexOf(',') + 1));
        };
        reader.readAsDataURL(blob);
      });
      const { Paths, File } = await import('expo-file-system');
      const file = new File(Paths.cache, `tts_${Date.now()}.mp3`);
      file.create({ intermediates: true, overwrite: true });
      file.write(b64, { encoding: 'base64' });
      uri = file.uri;
    }
    if (!uri) return;
    const { createAudioPlayer } = await import('expo-audio');
    ttsPlayer?.pause();
    ttsPlayer = createAudioPlayer({ uri });
    ttsPlayer.play();
  } catch (e: any) {
    console.error('[TTS]', e);
    loudaAlert({ title: 'TTS Error', message: e?.message || 'Failed to synthesize speech' });
  }
}
