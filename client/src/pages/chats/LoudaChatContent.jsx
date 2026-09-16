import { useEffect, useRef, useState } from 'react';
import '../../louda/louda.css';
import { MobileHome } from '../../louda/LoudaApp.jsx';
import { ensureLoudaSession, getTextmobUser, openChatWith, refreshLoudaPresence } from '../../bridge/connector.js';
import { DEFAULT_AVATAR } from '../../utils/defaultAvatar.js';

// Shared fallback (utils/defaultAvatar.js) — always available, no network.
const AVATAR_FALLBACK = DEFAULT_AVATAR;

function swapBrokenImg(img) {
  if (!img || img.tagName !== 'IMG') return;
  // Allow re-swap if the src changed since the last fallback (React reuses nodes).
  const key = img.currentSrc || img.src;
  if (!key || img.dataset.fbk === key || key === AVATAR_FALLBACK) return;
  img.dataset.fbk = key;
  img.src = AVATAR_FALLBACK;
}

// Louda's UI calls window.Lexum.alert(...) (~80 sites). Textmob's Lexum router
// has no alert API, so provide a set-if-missing shim backed by Textmob toasts.
if (typeof window !== 'undefined' && window.Lexum && !window.Lexum.alert) {
  window.Lexum.alert = ({ title, message } = {}) => {
    try {
      if (window.showNotification) {
        window.showNotification({ title: title || 'Messages', message: message || '', type: 'info' });
      } else {
        console.log(`[Louda] ${title || ''}: ${message || ''}`);
      }
    } catch {
      /* toast must never crash chat */
    }
  };
}

function readWithParam() {
  try {
    return new URLSearchParams(window.location.search).get('with');
  } catch {
    return null;
  }
}

/**
 * Louda embedded in the Textmob shell (/chats).
 * - Establishes the linked Louda session IN-CODE via the bridge
 *   (replaces the old `?from=textmob&userId=` iframe handshake).
 * - Mounts Louda's home UI only after the session exists.
 * - Scopes all Louda styling under .louda-scope (see louda.css).
 */
export default function LoudaChatContent() {
  // Guests never reach the session effect — decided once during render.
  const [session, setSession] = useState(() => {
    const user = getTextmobUser();
    return user && user !== 'undefined' ? 'pending' : 'guest';
  });
  const [error, setError] = useState('');
  const wrapRef = useRef(null);

  // Global avatar safety net: any <img> inside Louda that fails to load
  // (profile pics, chat avatars, media thumbs) gets the placeholder.
  useEffect(() => {
    if (session !== 'ready' || !wrapRef.current) return;
    const root = wrapRef.current;
    const onErr = (e) => swapBrokenImg(e.target);
    root.addEventListener('error', onErr, true);
    // Sweep images that already failed before the listener attached.
    root.querySelectorAll('img').forEach((img) => {
      if (img.complete && img.naturalWidth === 0) swapBrokenImg(img);
    });
    return () => root.removeEventListener('error', onErr, true);
  }, [session]);

  useEffect(() => {
    if (session === 'guest') {
      if (window.Lexum?.navigate) window.Lexum.navigate('/auth');
      else window.location.hash = '#/auth';
    }
  }, [session]);

  useEffect(() => {
    if (session !== 'pending') return;
    let cancelled = false;
    ensureLoudaSession()
      .then(() => {
        if (cancelled) return;
        // App-level presence socket (online everywhere, not just on /chats).
        refreshLoudaPresence();
        // Legacy deep link /chats?with=<username> (profile Message button):
        // queue an open-chat intent for the Louda UI to consume.
        const withUser = readWithParam();
        if (withUser) openChatWith(withUser);
        setSession('ready');
      })
      .catch((e) => {
        if (cancelled) return;
        setError(e?.message || 'Could not connect Messages.');
        setSession('failed');
      });
    return () => {
      cancelled = true;
    };
  }, [session]);

  if (session === 'pending') {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-10 h-10 rounded-full border-2 border-gray-200 border-t-blue-600 animate-spin" />
      </div>
    );
  }

  if (session === 'guest' || session === 'failed') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] px-6 text-center">
        <p className="text-sm font-bold text-gray-900">Couldn&apos;t open Messages</p>
        <p className="mt-1 text-xs text-gray-500">{session === 'guest' ? 'Log in to use messages.' : error}</p>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="mt-4 px-4 py-2 rounded-full text-xs font-bold bg-blue-600 text-white hover:bg-blue-700 transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div
      ref={wrapRef}
      className="louda-scope louda-embed w-full h-full"
      // Opt out of Textmob's global twemoji passes (Home runs twemoji.parse
      // over document.body every 5s — re-parsing chat DOM distorts messages).
      data-twemoji-ignore
    >
      <MobileHome />
    </div>
  );
}
