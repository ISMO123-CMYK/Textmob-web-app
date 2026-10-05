import { DEFAULT_AVATAR } from '../utils/defaultAvatar.js';
import React, { useState, useEffect, useRef, useMemo, memo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { io } from 'socket.io-client';
import { motion, AnimatePresence } from 'framer-motion';
import { LinkPreview, StatusTab, StatusCreator, StatusViewer } from './StatusComponents';
import { requestPushPermission, listenForForegroundMessages } from './firebase';
import { drainPendingIntents, refreshLoudaPresence } from '../bridge/connector.js';
import { API_BASE_URL as TEXMOB_API_URL, apiFetch } from '../config/api';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://louda-back-end.onrender.com';

// Fire-and-forget push notify to the Textmob server (never blocks sending).
function fireLoudaPushNotify(chat, msg, sender) {
  try {
    if (!sender || !sender.id || !chat) return;
    const senderName = sender.full_name || sender.username || localStorage.getItem('username') || 'Someone';
    const text = msg && typeof msg.text === 'string' ? msg.text.trim() : '';
    const mediaType = msg && msg.media && msg.media.length ? msg.media[0].type : '';
    const preview = text || (mediaType === 'video' ? 'Video' : mediaType === 'image' ? 'Photo' : 'File');
    apiFetch(`${TEXMOB_API_URL}/api/louda/message-notify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        senderId: sender.id,
        senderName,
        isGroup: !!chat.isGroup,
        chatId: chat.isGroup ? chat.id : chat.chatId || '',
        toUserId: chat.isGroup ? undefined : chat.id,
        groupId: chat.isGroup ? chat.id : undefined,
        preview,
      }),
    }).catch(() => {});
  } catch (e) {
    // push must never break message sending
  }
}

const Icons = {
  chat: <svg className="icon" viewBox="0 0 24 24"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>,
  archive: <svg className="icon" viewBox="0 0 24 24"><polyline points="21 8 21 21 3 21 3 8"></polyline><rect x="1" y="3" width="22" height="5"></rect><line x1="10" y1="12" x2="14" y2="12"></line></svg>,
  play: <svg className="icon" viewBox="0 0 24 24"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>,
  pause: <svg className="icon" viewBox="0 0 24 24"><rect x="6" y="4" width="4" height="16"></rect><rect x="14" y="4" width="4" height="16"></rect></svg>,
  mic: <svg className="icon" viewBox="0 0 24 24"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"></path><path d="M19 10v2a7 7 0 0 1-14 0v-2"></path><line x1="12" y1="19" x2="12" y2="23"></line><line x1="8" y1="23" x2="16" y2="23"></line></svg>,
  send: <svg className="icon" viewBox="0 0 24 24"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>,
  attach: <svg className="icon" viewBox="0 0 24 24"><path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"></path></svg>,
  image: <svg className="icon" viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>,
  video: <svg className="icon" viewBox="0 0 24 24"><polygon points="23 7 16 12 23 17 23 7"></polygon><rect x="1" y="5" width="15" height="14" rx="2" ry="2"></rect></svg>,
  x: <svg className="icon" viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>,
  more: <svg className="icon" viewBox="0 0 24 24"><circle cx="12" cy="12" r="1"></circle><circle cx="12" cy="5" r="1"></circle><circle cx="12" cy="19" r="1"></circle></svg>,
  search: <svg className="icon" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>,
  lock: <svg className="icon" viewBox="0 0 24 24"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>,
  chevronRight: <svg className="icon" viewBox="0 0 24 24"><polyline points="9 18 15 12 9 6"></polyline></svg>,
  phone: <svg className="icon" viewBox="0 0 24 24"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg>,
  edit: <svg className="icon" viewBox="0 0 24 24"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>,
  block: <svg className="icon" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"></circle><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"></line></svg>,
  check: <svg className="icon icon-sm" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"></polyline></svg>,
  checkDouble: <svg className="icon icon-sm" viewBox="0 0 24 24"><path d="M20 6L9 17l-5-5"></path><path d="M20 12l-5 5-2.5-2.5"></path></svg>,
  smile: <svg className="icon" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"></circle><path d="M8 14s1.5 2 4 2 4-2 4-2"></path><line x1="9" y1="9" x2="9.01" y2="9"></line><line x1="15" y1="9" x2="15.01" y2="9"></line></svg>,
  settings: <svg className="icon" viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>,
  user: <svg className="icon" viewBox="0 0 24 24"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>,
  users: <svg className="icon" viewBox="0 0 24 24"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>,
  plus: <svg className="icon" viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>,
  camera: <svg className="icon" viewBox="0 0 24 24"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path><circle cx="12" cy="13" r="4"></circle></svg>,
  file: <svg className="icon" viewBox="0 0 24 24"><path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"></path><polyline points="13 2 13 9 20 9"></polyline></svg>,
  mapPin: <svg className="icon" viewBox="0 0 24 24"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>,
  audio: <svg className="icon" viewBox="0 0 24 24"><path d="M3 18v-6a9 9 0 0 1 18 0v6"></path><path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z"></path></svg>,
  trash: <svg className="icon" viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>,
  arrowLeft: <svg className="icon" viewBox="0 0 24 24"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg>,
  loading: <svg className="icon animate-spin" viewBox="0 0 24 24"><path d="M12 2v4m0 12v4M4.93 4.93l2.83 2.83m8.48 8.48l2.83 2.83M2 12h4m12 0h4M4.93 19.07l2.83-2.83m8.48-8.48l2.83-2.83"></path></svg>,
  pin: <svg className="icon" viewBox="0 0 24 24"><path d="M21.16 7.33l-5.66-5.66a2 2 0 0 0-2.83 0l-1.88 1.88a2.9 2.9 0 0 1-2.06.85 2.9 2.9 0 0 1-2.06-.85L5.27 2.15l-3.12 3.12 1.4 1.4a2.9 2.9 0 0 1 0 4.12l-1.4 1.4L5.27 15.3l1.4-1.4a2.9 2.9 0 0 1 4.12 0l1.4 1.4-3.12 3.12 3.12 3.12L21.16 10.16a2 2 0 0 0 0-2.83z"></path></svg>,
  bell: <svg className="icon" viewBox="0 0 24 24"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path><path d="M13.73 21a2 2 0 0 1-3.46 0"></path></svg>,
  star: <svg className="icon" viewBox="0 0 24 24"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>,
  shieldPlus: <svg className="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path><line x1="12" y1="8" x2="12" y2="16"></line><line x1="8" y1="12" x2="16" y2="12"></line></svg>,
  shieldMinus: <svg className="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path><line x1="8" y1="12" x2="16" y2="12"></line></svg>,
  status: <svg className="icon" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9" strokeDasharray="7 3"></circle><circle cx="12" cy="12" r="5"></circle></svg>,
  reactJoy: <svg className="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><path d="M8 14s1.5 2 4 2 4-2 4-2"></path><line x1="9" y1="9" x2="9.01" y2="9"></line><line x1="15" y1="9" x2="15.01" y2="9"></line><path d="M16 11c0 1.5-1 2-1 2" fill="currentColor"></path><path d="M8 11c0 1.5 1 2 1 2" fill="currentColor"></path></svg>,
  reactHeartEyes: <svg className="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><path d="M8 14s1.5 2 4 2 4-2 4-2"></path><path d="M9 10c-1-1-2.5-1-3.5 0s-.5 2.5.5 3.5c1 1 3-1 3-3.5z" fill="currentColor"></path><path d="M15 10c1-1 2.5-1 3.5 0s.5 2.5-.5 3.5c-1 1-3-1-3-3.5z" fill="currentColor"></path></svg>,
  reactKiss: <svg className="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><path d="M8 9a2 2 0 0 1 2-2"></path><path d="M14 9a2 2 0 0 0 2-2"></path><path d="M10 15s1 1 2 1 2-1 2-1"></path><path d="M16 16c1-1 2-1 3 0" fill="currentColor"></path></svg>,
  reactCry: <svg className="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><path d="M8 15s1.5-2 4-2 4 2 4 2"></path><line x1="9" y1="9" x2="9.01" y2="9"></line><line x1="15" y1="9" x2="15.01" y2="9"></line><path d="M9 12v3a1 1 0 0 0 2 0v-3"></path></svg>,
  reactFold: <svg className="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M7 11v8a4 4 0 0 0 8 0v-8M11 11V7a2 2 0 0 1 4 0v4M7 15l-3-3a2 2 0 0 1 3-3v2"></path></svg>,
  reactClap: <svg className="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10 15v4a3 3 0 0 0 6 0v-4M14 15v-4a2 2 0 0 1 4 0v4M10 11l-3-3a2 2 0 0 1 3-3v2"></path></svg>,
  reactParty: <svg className="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5.8 11.3 2 22l10.7-3.8"></path><path d="M4 3h.01M2-2 2 22l10.7-3.8"></path><path d="M4 3h.01M22 8h.01M15 2h.01M22 20h.01M18 15h.01"></path></svg>,
  react100: <svg className="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 10h3v10H4zM10 10h4v10h-4zM17 10h3v10h-3zM4 6h16"></path></svg>,
  logout: <svg className="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>
};

// ─── Cloudinary Optimization ───
const getOptimizedMediaUrl = (url, type = 'auto', quality = null) => {
  if (!url || !url.includes('cloudinary.com')) return url;
  // Textmob port: fixed quality (theme media-quality setting removed)
  const savedQuality = quality || 'auto';
  const qualityMap = { low: 'q_30', medium: 'q_60', high: 'q_80', original: 'q_100', auto: 'q_auto' };
  const q = qualityMap[savedQuality] || 'q_auto';
  if (url.includes('/upload/')) {
  if (!url.includes('q_')) {
  return url.replace('/upload/', `/upload/${q},f_auto/`);
  }
  }
  return url;
};

// NOTE (Textmob port): Textmob theme customisation (font size, corner radius,
// accent colour) removed — design tokens come from louda.css (.louda-scope).

// ─── Custom Audio Player ───
const AudioPlayer = memo(({ src }) => {
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const audioRef = useRef(null);

  useEffect(() => {
  const audio = audioRef.current;
  if (!audio) return;

  const update = () => {
  setProgress((audio.currentTime / (audio.duration || 1)) * 100);
  };
  const onEnd = () => { setPlaying(false); setProgress(0); };
  const onLoad = () => {
  if (audio.duration && !isNaN(audio.duration)) {
  setDuration(audio.duration);
  }
  };

  audio.addEventListener('timeupdate', update);
  audio.addEventListener('ended', onEnd);
  audio.addEventListener('loadedmetadata', onLoad);
  audio.addEventListener('loadeddata', onLoad);

  // Initial check in case it's already loaded
  if (audio.duration && !isNaN(audio.duration)) {
  setDuration(audio.duration);
  }

  return () => {
  audio.removeEventListener('timeupdate', update);
  audio.removeEventListener('ended', onEnd);
  audio.removeEventListener('loadedmetadata', onLoad);
  audio.removeEventListener('loadeddata', onLoad);
  };
  }, [playing]);

  // Reset when src changes
  useEffect(() => {
  setProgress(0);
  setDuration(0);
  setPlaying(false);
  }, [src]);

  const toggle = (e) => {
  e.stopPropagation();
  if (playing) audioRef.current.pause();
  else audioRef.current.play().catch(err => console.error('Audio play error:', err));
  setPlaying(!playing);
  };

  const seek = (e) => {
  e.stopPropagation();
  if (!duration) return;
  const rect = e.currentTarget.getBoundingClientRect();
  const clickX = e.clientX - rect.left;
  const width = rect.width;
  const pct = clickX / width;
  audioRef.current.currentTime = pct * duration;
  };

  const fmtTime = (s) => {
  if (!s || isNaN(s)) return '0:00';
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec < 10 ? '0' : ''}${sec}`;
  };

  return (
  <div className="flex items-center gap-2 w-full max-w-full min-w-0 shrink bg-white/40  p-2 rounded-2xl backdrop-blur-sm border border-black/5" onClick={e => e.stopPropagation()}>
  <audio ref={audioRef} src={getOptimizedMediaUrl(src, 'audio')} preload="metadata" />
  <button onClick={toggle} className="w-10 h-10 shrink-0 rounded-full text-white flex items-center justify-center transition-all shadow-lg active:scale-95 ring-2 ring-white/20" style={{ background: 'var(--safari-green)' }}>
  <div className="w-4 h-4 flex items-center justify-center">
  {playing ? (
  <svg viewBox="0 0 24 24" fill="currentColor" className="w-full h-full"><path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" /></svg>
  ) : (
  <svg viewBox="0 0 24 24" fill="currentColor" className="w-full h-full"><path d="M8 5v14l11-7z" /></svg>
  )}
  </div>
  </button>
  <div className="flex-1 flex flex-col justify-center gap-0.5 min-w-0 max-w-full overflow-hidden">
  <div className="relative w-full h-7 flex items-center cursor-pointer group min-w-0 overflow-visible" onClick={seek}>
  <div className="absolute left-0 right-0 top-1/2 -translate-y-1/2 h-1 rounded-full bg-black/15 overflow-hidden">
  <div className="h-full rounded-full" style={{ width: `${Math.max(0, Math.min(100, progress))}%`, background: 'var(--safari-green)' }} />
  </div>
  <div className="absolute w-2.5 h-2.5 -ml-[5px] rounded-full ring-2 ring-white" style={{ left: `${Math.max(0, Math.min(100, progress))}%`, top: '50%', marginTop: -5, background: 'var(--safari-green)' }} />
  </div>
  <div className="flex justify-between items-center px-1">
  <span className="text-[10px] font-black tracking-widest tabular-nums" style={{ color: 'var(--safari-green)' }}>
  {fmtTime(audioRef.current?.currentTime || 0)}
  </span>
  <span className="text-[10px] text-gray-500  font-bold tabular-nums">
  {fmtTime(duration)}
  </span>
  </div>
  </div>
  </div>
  );
});

// ─── Custom Video Player ───
const VideoPlayer = memo(({ src, autoPlay, className, previewMode, onClick }) => {
  const [playing, setPlaying] = useState(autoPlay || false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [muted, setMuted] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const videoRef = useRef(null);
  const controlsTimeout = useRef(null);

  useEffect(() => {
  const video = videoRef.current;
  if (!video) return;
  const update = () => setProgress((video.currentTime / video.duration) * 100);
  const onEnd = () => { setPlaying(false); setProgress(0); setShowControls(true); };
  const onLoad = () => setDuration(video.duration);
  video.addEventListener('timeupdate', update);
  video.addEventListener('ended', onEnd);
  video.addEventListener('loadedmetadata', onLoad);
  if (autoPlay && !previewMode) video.play().catch(() => setPlaying(false));
  return () => {
  video.removeEventListener('timeupdate', update);
  video.removeEventListener('ended', onEnd);
  video.removeEventListener('loadedmetadata', onLoad);
  };
  }, [autoPlay, previewMode]);

  const handleInteraction = () => {
  if (previewMode) return;
  setShowControls(true);
  clearTimeout(controlsTimeout.current);
  if (playing) {
  controlsTimeout.current = setTimeout(() => setShowControls(false), 2500);
  }
  };

  const togglePlay = (e) => {
  e.stopPropagation();
  if (previewMode) {
  if (onClick) onClick(e);
  return;
  }
  if (playing) videoRef.current.pause();
  else videoRef.current.play();
  setPlaying(!playing);
  handleInteraction();
  };

  const seek = (e) => {
  if (previewMode) return;
  e.stopPropagation();
  const width = e.currentTarget.offsetWidth;
  const clickX = e.nativeEvent.offsetX;
  const pct = clickX / width;
  videoRef.current.currentTime = pct * duration;
  handleInteraction();
  };

  return (
  <div
  className={`relative group bg-black overflow-hidden flex items-center justify-center cursor-pointer ${className || 'w-full h-full'}`}
  onMouseMove={previewMode ? undefined : handleInteraction}
  onTouchStart={previewMode ? undefined : handleInteraction}
  onClick={previewMode ? onClick : togglePlay}
  >
  <video ref={videoRef} src={getOptimizedMediaUrl(src, 'video')} className="w-full h-full object-contain" playsInline preload="metadata" />
  <div className="absolute top-4 left-4 flex items-center gap-2 opacity-50 select-none pointer-events-none">
  <span className="text-white font-black tracking-tighter text-sm drop-shadow-md">TEXTMOB</span>
  </div>
  {previewMode ? (
  <div className="absolute inset-0 flex items-center justify-center bg-black/20 group-hover:bg-black/40 transition-colors pointer-events-none">
  <div className="w-16 h-16 rounded-full flex items-center justify-center text-white shadow-xl backdrop-blur-md transform scale-100 transition-transform group-hover:scale-110" style={{ background: 'color-mix(in srgb, var(--safari-green) 90%, transparent)' }}>
  {Icons.play}
  </div>
  </div>
  ) : (
  <div className={`absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent transition-opacity duration-300 ${showControls || !playing ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
  {!playing && (
  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
  <div className="w-16 h-16 rounded-full flex items-center justify-center text-white shadow-xl backdrop-blur-md transform scale-100 transition-transform pointer-events-auto hover:scale-110" onClick={togglePlay} style={{ background: 'color-mix(in srgb, var(--safari-green) 90%, transparent)' }}>
  {Icons.play}
  </div>
  </div>
  )}
  <div className="absolute bottom-0 left-0 right-0 p-4 flex flex-col gap-3 pointer-events-auto" onClick={e => e.stopPropagation()}>
  <div className="w-full h-2 bg-white/30 rounded-full cursor-pointer relative overflow-hidden group-hover:h-3 transition-all" onClick={seek}>
  <div className="absolute top-0 left-0 bottom-0 rounded-full transition-all" style={{ width: `${progress}%`, background: 'var(--safari-green)' }} />
  </div>
  <div className="flex items-center justify-between">
  <div className="flex items-center gap-4">
  <button onClick={togglePlay} className="text-white hover:text-green-400 transition-colors">
  {playing ? Icons.pause : Icons.play}
  </button>
  <span className="text-xs font-bold text-white font-mono drop-shadow-md">
  {Math.floor((progress / 100 * duration) / 60) || 0}:{String(Math.floor((progress / 100 * duration) % 60) || 0).padStart(2, '0')} / {Math.floor(duration / 60) || 0}:{String(Math.floor(duration % 60) || 0).padStart(2, '0')}
  </span>
  </div>
  <button onClick={(e) => { e.stopPropagation(); videoRef.current.muted = !muted; setMuted(!muted); handleInteraction(); }} className="text-white hover:text-green-400 transition-colors font-bold text-[10px] uppercase tracking-widest">
  {muted ? <span className="line-through text-red-400">Vol</span> : 'Vol'}
  </button>
  </div>
  </div>
  </div>
  )}
  </div>
  );
});

// ─── Media Modal ───
const MediaViewer = memo(({ src, type, onClose, messages, explicitMediaList, onForwardMedia }) => {
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [showUI, setShowUI] = useState(true);
  const [showMenu, setShowMenu] = useState(false);

  // Extract all media from current chat context
  const mediaList = useMemo(() => {
  let allMedia = [];
  if (explicitMediaList && explicitMediaList.length > 0) {
  allMedia = explicitMediaList.map(m => ({ url: m.url || m.src, type: m.type }));
  } else if (messages) {
  allMedia = messages.filter(m => m.media && m.media.length > 0)
  .flatMap(m => m.media.map(media => ({ url: media.url, type: media.type })));
  }
  // ensure current src is always in list
  if (!allMedia.find(m => m.url === src)) {
  allMedia.unshift({ url: src, type });
  }
  return allMedia;
  }, [messages, src, type]);

  const [currentIndex, setCurrentIndex] = useState(() => Math.max(0, mediaList.findIndex(m => m.url === src)));
  const currentMedia = mediaList[currentIndex] || { url: src, type };

  useEffect(() => {
  const esc = (e) => {
  if (e.key === 'Escape') onClose();
  if (e.key === 'ArrowRight') next();
  if (e.key === 'ArrowLeft') prev();
  };
  window.addEventListener('keydown', esc);
  return () => window.removeEventListener('keydown', esc);
  }, [currentIndex, mediaList.length]);

  const next = () => { if (currentIndex < mediaList.length - 1) { setCurrentIndex(c => c + 1); resetZoom(); } };
  const prev = () => { if (currentIndex > 0) { setCurrentIndex(c => c - 1); resetZoom(); } };
  const resetZoom = () => { setZoom(1); setPan({ x: 0, y: 0 }); };

  const handleDownload = async () => {
  try {
  const response = await fetch(currentMedia.url);
  const blob = await response.blob();
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `textmob_media_${Date.now()}.${blob.type.split('/')[1] || 'jpg'}`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  window.URL.revokeObjectURL(url);
  } catch (e) {
  console.error(e);
  window.open(currentMedia.url, '_blank');
  }
  };

  const handleForward = () => {
  setShowMenu(false);
  if (onForwardMedia) {
  onForwardMedia({
  messages: [{
  text: '',
  media: [{ type: currentMedia.type, url: currentMedia.url }]
  }]
  });
  }
  };

  const handleShare = async () => {
  try {
  if (navigator.share) {
  await navigator.share({
  title: 'Shared from Textmob',
  text: 'Check out this media from Textmob!',
  url: currentMedia.url
  });
  } else {
  Lexum.alert({ title: 'Error', message: 'Web Share API not supported on this browser.' });
  }
  } catch (e) {
  console.log('Error sharing', e);
  }
  };

  const handleDoubleTap = () => {
  if (zoom === 1) { setZoom(2); }
  else { resetZoom(); }
  };

  const DownloadIcon = <svg className="icon" viewBox="0 0 24 24"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>;
  const ShareIcon = <svg className="icon" viewBox="0 0 24 24"><circle cx="18" cy="5" r="3"></circle><circle cx="6" cy="12" r="3"></circle><circle cx="18" cy="19" r="3"></circle><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"></line><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"></line></svg>;
  const ZoomInIcon = <svg className="icon" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line><line x1="11" y1="8" x2="11" y2="14"></line><line x1="8" y1="11" x2="14" y2="11"></line></svg>;

  return (
  <div className="fixed inset-0 z-[120] bg-black flex flex-col animate-fade-in" onClick={() => setShowUI(!showUI)}>
  <AnimatePresence>
  {showUI && (
  <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="absolute top-0 left-0 right-0 p-4 bg-gradient-to-b from-black/80 to-transparent z-10 flex justify-between items-center" onClick={e => e.stopPropagation()}>
  <button className="text-white hover:text-gray-300 transition w-10 h-10 flex items-center justify-center rounded-full bg-white/10" onClick={onClose}>
  {Icons.arrowLeft}
  </button>
  <div className="flex items-center gap-4 relative">
  <span className="text-white text-xs font-bold bg-white/10 px-3 py-1 rounded-full">{currentIndex + 1} / {mediaList.length}</span>
  {currentMedia.type !== 'audio' && currentMedia.type !== 'voice' && (
  <button className="text-white hover:text-gray-300 transition w-10 h-10 flex items-center justify-center rounded-full bg-white/10" onClick={handleDoubleTap} title="Zoom">
  {ZoomInIcon}
  </button>
  )}
  <button className="text-white hover:text-gray-300 transition w-10 h-10 flex items-center justify-center rounded-full bg-white/10" onClick={() => setShowMenu(!showMenu)}>
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5"><circle cx="12" cy="12" r="1"></circle><circle cx="12" cy="5" r="1"></circle><circle cx="12" cy="19" r="1"></circle></svg>
  </button>
  {showMenu && (
  <div className="absolute top-12 right-0 bg-white  rounded-2xl shadow-2xl border border-gray-100  py-2 animate-modal-pop ring-1 ring-black/5 min-w-[180px]">
  <button onClick={() => { setShowMenu(false); handleShare(); }} className="w-full flex items-center gap-3 px-4 py-2.5 text-gray-700  hover:bg-green-500/5 group transition-all duration-150">
  <span className="w-4 h-4 text-gray-400 group-hover:text-green-600 transition-colors duration-150 group-hover:scale-110 transform">{ShareIcon}</span>
  <span className="text-sm font-bold group-hover:text-green-600 transition-colors duration-150">Share</span>
  </button>
  <button onClick={() => { setShowMenu(false); handleDownload(); }} className="w-full flex items-center gap-3 px-4 py-2.5 text-gray-700  hover:bg-green-500/5 group transition-all duration-150">
  <span className="w-4 h-4 text-gray-400 group-hover:text-green-600 transition-colors duration-150 group-hover:scale-110 transform">{DownloadIcon}</span>
  <span className="text-sm font-bold group-hover:text-green-600 transition-colors duration-150">Save</span>
  </button>
  <button onClick={handleForward} className="w-full flex items-center gap-3 px-4 py-2.5 text-gray-700  hover:bg-green-500/5 group transition-all duration-150">
  <span className="w-4 h-4 text-gray-400 group-hover:text-green-600 transition-colors duration-150 group-hover:scale-110 transform"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 14 20 9 15 4"></polyline><path d="M4 20v-7a4 4 0 0 1 4-4h12"></path></svg></span>
  <span className="text-sm font-bold group-hover:text-green-600 transition-colors duration-150">Forward</span>
  </button>
  </div>
  )}
  </div>
  </motion.div>
  )}
  </AnimatePresence>

  <div className="flex-1 flex items-center justify-center relative overflow-hidden" onClick={e => e.stopPropagation()}>
  {currentIndex > 0 && showUI && (
  <button className="absolute left-4 z-10 text-white w-12 h-12 flex items-center justify-center bg-black/50 hover:bg-black/80 rounded-full transition" onClick={prev}>
  <svg viewBox="0 0 24 24" className="w-6 h-6"><polyline points="15 18 9 12 15 6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
  </button>
  )}

  <motion.div
  className="w-full h-full flex items-center justify-center cursor-grab active:cursor-grabbing touch-none"
  drag={zoom > 1 ? true : "x"}
  dragConstraints={zoom > 1 ? { left: -300, right: 300, top: -300, bottom: 300 } : { left: 0, right: 0 }}
  onDoubleClick={handleDoubleTap}
  dragElastic={0.2}
  onDragEnd={(e, { offset, velocity }) => {
  if (zoom > 1) return;
  const swipe = offset.x * velocity.x;
  if (swipe < -100 && currentIndex < mediaList.length - 1) next();
  else if (swipe > 100 && currentIndex > 0) prev();
  }}
  >
  {currentMedia.type === 'video' ? (
  <div key={currentMedia.url} style={{ transform: `scale(${zoom})`, transition: zoom === 1 ? 'transform 0.3s ease-out' : 'none', width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
  <VideoPlayer src={currentMedia.url} autoPlay={true} className="w-full max-h-[90vh]" />
  </div>
  ) : (currentMedia.type === 'audio' || currentMedia.type === 'voice') ? (
  <div key={currentMedia.url} className="bg-white/5 p-6 md:p-10 rounded-[32px] backdrop-blur-3xl border border-white/10 flex flex-col items-center gap-6 shadow-2xl w-full max-w-sm mx-4">
  <div className="w-20 h-20 rounded-full text-white flex items-center justify-center text-4xl shadow-xl relative" style={{ background: 'var(--safari-green)', boxShadow: '0 0 30px color-mix(in srgb, var(--safari-green) 30%, transparent)' }}>
  {currentMedia.type === 'voice' ? Icons.mic : Icons.audio}
  </div>
  <div className="w-full">
  <AudioPlayer src={currentMedia.url} />
  </div>
  <div className="flex flex-col items-center gap-1">
  <span className="text-white font-black uppercase tracking-[0.3em] text-[9px] opacity-40">{currentMedia.type === 'voice' ? 'Voice Message' : 'Audio Track'}</span>
  </div>
  </div>
  ) : (
  <motion.img
  src={currentMedia.url}
  className="max-w-full max-h-full object-contain pointer-events-none"
  style={{ scale: zoom }}
  animate={{ scale: zoom }}
  transition={{ type: "spring", stiffness: 300, damping: 30 }}
  alt=""
  />
  )}
  </motion.div>

  {currentIndex < mediaList.length - 1 && showUI && (
  <button className="absolute right-4 z-10 text-white w-12 h-12 flex items-center justify-center bg-black/50 hover:bg-black/80 rounded-full transition" onClick={next}>
  <svg viewBox="0 0 24 24" className="w-6 h-6"><polyline points="9 18 15 12 9 6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
  </button>
  )}
  </div>

  </div>
  );
});

// ─── Profile Viewer ───



// ─── Translation Helper ───
const translateMessage = async (text, toLang) => {
  try {
  const res = await fetch(`${API_BASE_URL}/api/translate`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ text, from: 'auto', to: toLang })
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Translation failed');
  // Backend returns { translation, reasoning } — use .translation
  return data.translation || null;
  } catch (e) {
  console.error('[TRANSLATE]', e);
  return null;
  }
};

const playTTS = async (text, voice) => {
  // Validate voice name; match backend voice list from yarngpt.js
  const validVoices = ['Idera', 'Zainab', 'Chinenye', 'Umar', 'Emma', 'Osagie', 'Wura', 'Jude', 'Adaora', 'Femi', 'Regina', 'Nonso', 'Mary', 'Remi', 'Adam'];
  const activeVoice = validVoices.includes(voice) ? voice : 'Zainab';

  try {
  const res = await fetch(`${API_BASE_URL}/api/tts`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ text, voice: activeVoice })
  });

  if (!res.ok) {
  const e = await res.json();
  throw new Error(e.error);
  }

  const contentType = res.headers.get('content-type');

  // If response is JSON, it means we got a cached Cloudinary URL
  if (contentType && contentType.includes('application/json')) {
  const data = await res.json();
  if (data.cachedUrl) {
  const audio = new Audio(data.cachedUrl);
  audio.play();
  return;
  }
  }

  // Otherwise it's a raw audio buffer
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const audio = new Audio(url);
  audio.play();
  audio.onended = () => URL.revokeObjectURL(url);
  } catch (e) {
  console.error('[TTS]', e);
  if (typeof Lexum !== 'undefined') Lexum.alert({ title: 'TTS Error', message: e.message });
  }
};

const LANG_LABELS = { en: 'English', yo: 'Yorùbá', ig: 'Igbo', ha: 'Hausa' };


// Time ago formatter
function formatTimeAgo(dateStr) {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  const now = new Date();
  const diff = Math.floor((now - date) / 1000);
  if (diff < 60) return 'just now';
  const min = Math.floor(diff / 60);
  if (min < 60) return `${min} min ago`;
  const hrs = Math.floor(min / 60);
  if (hrs < 24) return `${hrs} hour${hrs > 1 ? 's' : ''} ago`;
  const days = Math.floor(hrs / 24);
  return `${days} day${days > 1 ? 's' : ''} ago`;
}

const isNativeMobileDevice = () => {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent || navigator.vendor || window.opera;
  const isMobileUA = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua);
  const hasTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  return isMobileUA || (hasTouch && window.innerWidth < 1024);
};

const isMobile = () => {
  if (typeof window === 'undefined') return false;
  return window.innerWidth < 768 || isNativeMobileDevice();
};

// ─────────────────────────────────────
// Auth & last_seen
// ─────────────────────────────────────
const updateLastSeen = async () => {
  const userId = localStorage.getItem('userId');
  if (!userId) return;
  try {
  await fetch(`${API_BASE_URL}/api/user/last-seen`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ userId })
  });
  } catch (e) {
  console.error('[ERROR] Failed to update last-seen:', e);
  }
};

// Auto-polling for active status.
// Textmob port: skipped when embedded in the Textmob shell (#app) —
// the shell owns routing/lifecycle; standalone Textmob keeps this.
const LOUDA_EMBEDDED = typeof document !== 'undefined' && !!document.getElementById('app');
if (!LOUDA_EMBEDDED) {
  setInterval(() => {
  const userId = localStorage.getItem('userId');
  if (userId) updateLastSeen();
  }, 45000);
}

const checkAuthAndRedirect = () => {
  if (LOUDA_EMBEDDED) return; // shell drives auth via bridge/connector.js
  const userId = localStorage.getItem('userId');
  if (userId && !window.location.hash.includes('home')) {
  console.log(`[DEBUG] User authenticated, redirecting to home`);
  updateLastSeen();
  Lexum.navigate('/home');
  }
};
if (!LOUDA_EMBEDDED) {
  window.addEventListener('hashchange', checkAuthAndRedirect);
  window.addEventListener('load', checkAuthAndRedirect);
}

// ─────────────────────────────────────
// Reusable Components
// ─────────────────────────────────────
const Button = ({ children, variant = 'primary', disabled = false, onClick, className = '' }) => {
  const base = 'px-4 py-2.5 rounded-xl text-sm font-bold transition-all duration-200 active:scale-[0.97] focus:outline-none focus:ring-2 flex items-center justify-center gap-2 cursor-pointer';
  const variants = {
  primary: 'bg-[var(--safari-green)] text-white hover:bg-[color-mix(in_srgb,var(--safari-green),black_10%)] shadow-sm focus:ring-[color-mix(in_srgb,var(--safari-green),transparent_70%)]',
  secondary: 'bg-gray-100  text-gray-700  hover:bg-gray-200  focus:ring-gray-300/30',
  danger: 'bg-red-500 text-white hover:bg-red-600 shadow-sm focus:ring-red-500/30',
  accent: 'bg-[#FFB300] text-[#5D4037] hover:bg-[#FFA000] shadow-sm focus:ring-[#FFB300]/30',
  };
  return (
  <button onClick={onClick} disabled={disabled}
  className={`${base} ${variants[variant]} ${disabled ? 'opacity-50 cursor-not-allowed grayscale' : ''} ${className}`}
  >{children}</button>
  );
};

const Input = ({ label, value, onChange, placeholder, type = 'text', error = '', className = '' }) => (
  <div className="mb-3">
  {label && <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1.5 px-0.5">{label}</label>}
  <div className="relative">
  <input
  type={type}
  value={value}
  onChange={onChange}
  placeholder={placeholder}
  className={`w-full px-3.5 py-2.5 bg-gray-50  border border-gray-200  focus:border-[var(--safari-green)] focus:bg-white  rounded-xl transition-all duration-200 outline-none text-sm text-gray-900  placeholder-gray-400 ${error ? 'border-red-400 bg-red-50' : ''} ${className}`}
  />
  </div>
  {error && <p className="text-red-500 text-[11px] font-bold mt-1 px-0.5">{error}</p>}
  </div>
);

// ─── Phone Input with Country Code ───
const COUNTRY_CODES = [
  { code: '+234', flag: '🇳🇬', name: 'Nigeria' },
  { code: '+1', flag: '🇺🇸', name: 'USA' },
  { code: '+44', flag: '🇬🇧', name: 'UK' },
  { code: '+233', flag: '🇬🇭', name: 'Ghana' },
  { code: '+254', flag: '🇰🇪', name: 'Kenya' },
  { code: '+27', flag: '🇿🇦', name: 'South Africa' },
  { code: '+91', flag: '🇮🇳', name: 'India' },
  { code: '+971', flag: '🇦🇪', name: 'UAE' },
  { code: '+49', flag: '🇩🇪', name: 'Germany' },
  { code: '+33', flag: '🇫🇷', name: 'France' },
  { code: '+86', flag: '🇨🇳', name: 'China' },
  { code: '+81', flag: '🇯🇵', name: 'Japan' },
  { code: '+55', flag: '🇧🇷', name: 'Brazil' },
  { code: '+20', flag: '🇪🇬', name: 'Egypt' },
  { code: '+212', flag: '🇲🇦', name: 'Morocco' },
  { code: '+251', flag: '🇪🇹', name: 'Ethiopia' },
  { code: '+255', flag: '🇹🇿', name: 'Tanzania' },
  { code: '+256', flag: '🇺🇬', name: 'Uganda' },
  { code: '+237', flag: '🇨🇲', name: 'Cameroon' },
];

const PhoneInput = ({ value, onChange, label, error = '' }) => {
  const [countryCode, setCountryCode] = useState('+234');
  const [number, setNumber] = useState('');

  useEffect(() => {
  if (value) {
  const match = COUNTRY_CODES.find(c => value.startsWith(c.code));
  if (match) {
  setCountryCode(match.code);
  // Aggressively strip everything except numbers
  const nextNum = value.slice(match.code.length).replace(/[^0-9]/g, '');
  if (nextNum !== number) {
  setNumber(nextNum);
  }
  } else {
  // Strip everything and handle leading zero
  const clean = value.replace(/[^0-9]/g, '');
  const finalNumber = clean.startsWith('0') ? clean.slice(1) : clean;
  if (finalNumber !== number) {
  setNumber(finalNumber);
  }
  }
  }
  }, [value]);

  const handleNumberChange = (e) => {
  let num = e.target.value.replace(/[^0-9]/g, '');
  if (num.startsWith('0')) num = num.slice(1);
  setNumber(num);
  onChange(countryCode + num);
  };

  const handleCodeChange = (e) => {
  setCountryCode(e.target.value);
  onChange(e.target.value + number);
  };

  return (
  <div className="mb-3 w-full">
  {label && <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 px-0.5">{label}</label>}
  <div className="flex gap-2 w-full">
  <select
  value={countryCode}
  onChange={handleCodeChange}
  className="w-24 bg-gray-50  border border-black/5  rounded-xl p-3 font-bold text-gray-700  focus:ring-2 focus:ring-[#E64A19] outline-none transition cursor-pointer text-xs"
  >
  {COUNTRY_CODES.map(c => (
  <option key={c.code} value={c.code}>{c.code}</option>
  ))}
  </select>
  <input
  type="tel"
  value={number}
  onChange={handleNumberChange}
  maxLength={15}
  placeholder="Phone number"
  className="flex-1 min-w-0 bg-gray-50  border border-black/5  rounded-xl p-3 font-bold text-gray-700  focus:ring-2 focus:ring-[#E64A19] outline-none transition text-sm"
  />
  </div>
  {error && <p className="text-red-500 text-[10px] font-bold mt-1 px-0.5">{error}</p>}
  </div>
  );
};

const Modal = ({ isOpen, onClose, title, children, footer, className = "" }) => {
  if (!isOpen) return null;
  return (
  <div className="fixed inset-0 bg-black/60 flex items-end md:items-center justify-center z-[130] backdrop-blur-sm" onClick={onClose}>
  <div className={`bg-white  w-full max-w-[500px] h-[100dvh] md:h-auto md:max-h-[85vh] md:overflow-hidden rounded-none md:rounded-3xl shadow-2xl flex flex-col animate-slide-up md:animate-modal-pop border border-gray-100  ${className}`} onClick={e => e.stopPropagation()}>
  <div className="flex justify-between items-center border-b border-gray-100  px-6 py-5 shrink-0">
  <h2 className="text-base font-black text-[var(--safari-green)] tracking-tight uppercase">{title}</h2>
  <button onClick={onClose}
  className="w-8 h-8 rounded-full flex items-center justify-center bg-gray-50  text-gray-400 hover:bg-red-50 hover:text-red-500  transition-all duration-200 cursor-pointer"
  >{Icons.x}</button>
  </div>
  <div className="flex-1 overflow-y-auto no-scrollbar px-6 py-6 custom-scrollbar">{children}</div>
  {footer && <div className="border-t border-gray-100  px-6 py-5 shrink-0 flex gap-2 bg-white  md:rounded-b-3xl">{footer}</div>}
  </div>
  </div>
  );
};

const Toggle = ({ label, checked, onChange, disabled = false }) => {
  return (
  <label className={`flex items-center justify-between py-3 cursor-pointer select-none ${disabled ? 'opacity-50' : ''}`}>
  <span className="text-gray-900  font-medium text-sm">{label}</span>
  <div className="relative">
  <input type="checkbox" className="sr-only" checked={checked} onChange={onChange} disabled={disabled} />
  <div className={`w-12 h-6 rounded-full transition`} style={checked ? { background: 'var(--safari-green)' } : { background: '#d1d5db' }}></div>
  <div className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow-md transition-transform ${checked ? 'translate-x-6' : ''}`}></div>
  </div>
  </label>
  );
};

const Section = ({ title, children }) => (
  <div className="mb-8">
  <h3 className="text-lg font-bold text-gray-900 mb-4">{title}</h3>
  {children}
  </div>
);

const ContextMenu = ({ position, options, onClose }) => {
  if (!position) return null;
  return (
  <div className="fixed inset-0 z-[60]" onClick={onClose}>
  <div
  className="absolute bg-white  rounded-2xl shadow-2xl border border-gray-100  py-2 animate-modal-pop ring-1 ring-black/5 min-w-[180px]"
  style={{ top: Math.min(position.y, window.innerHeight - 200), left: Math.min(position.x, window.innerWidth - 220) }}
  onClick={e => e.stopPropagation()}
  >
  {options.map((opt, i) => (
  <button key={i} onClick={() => { opt.onClick(); onClose(); }} className={`w-full flex items-center gap-3 px-4 py-2.5 group transition-all duration-150 ${opt.danger ? 'text-red-500 hover:bg-red-50 ' : 'text-gray-700  hover:bg-[color-mix(in_srgb,var(--safari-green),transparent_95%)]'}`}>
  {opt.icon && <span className="w-4 h-4 text-gray-400 group-hover:text-[var(--safari-green)]  transition-colors duration-150 group-hover:scale-110 transform">{opt.icon}</span>}
  <span className="text-sm font-bold group-hover:text-[var(--safari-green)]  transition-colors duration-150">{opt.label}</span>
  </button>
  ))}
  </div>
  </div>
  );
};

const StatusRing = ({ statuses, currentUserId }) => {
  if (!statuses || statuses.length === 0) return null;
  const radius = 27; // Circle radius for 56px wrapper (28px center)
  const circumference = 2 * Math.PI * radius;
  const gap = statuses.length > 1 ? 4 : 0;
  const dashLength = (circumference / statuses.length) - gap;
  const anglePerSegment = 360 / statuses.length;

  return (
  <svg className="absolute inset-0 w-full h-full pointer-events-none z-10" viewBox="0 0 56 56">
  {statuses.map((s, i) => {
  const isViewed = s.views && s.views.some(v => v.userId === currentUserId);
  return (
  <circle
  key={s.id}
  cx="28" cy="28" r={radius}
  fill="none"
  stroke={isViewed ? "#9ca3af" : "var(--safari-green)"}
  strokeWidth="2.5"
  strokeDasharray={`${dashLength} ${circumference - dashLength}`}
  strokeDashoffset={-gap / 2}
  strokeLinecap="round"
  transform={`rotate(${i * anglePerSegment - 90} 28 28)`}
  className="transition-colors duration-300"
  />
  );
  })}
  </svg>
  );
};

const ChatItem = memo(({ chat, onClick, isActive, isGroup = false, onContextMenu, selectionMode, isSelected, onSelect, isTyping, typingText, userStatuses = [], currentUserId, onAvatarClick }) => {
  const longPressRef = useRef(null);

  const handleTouchStart = (e) => {
  longPressRef.current = setTimeout(() => {
  if (onSelect) onSelect(chat.id, true);
  }, 500);
  };
  const handleTouchEnd = () => clearTimeout(longPressRef.current);
  const handleClick = (e) => {
  if (selectionMode && onSelect) { e.preventDefault(); e.stopPropagation(); onSelect(chat.id); }
  else if (onClick) onClick(e);
  };

  return (
  <div
  onClick={handleClick}
  onContextMenu={selectionMode ? (e) => { e.preventDefault(); e.stopPropagation(); onSelect(chat.id); } : onContextMenu}
  onTouchStart={handleTouchStart}
  onTouchEnd={handleTouchEnd}
  onTouchMove={handleTouchEnd}
  className={`flex items-center p-4 cursor-pointer select-none transition-colors hd ${isSelected ? 'bg-blue-500/10 border-l-4 border-blue-500' : isActive ? 'bg-[var(--safari-green)]/10 border-l-4 border-[var(--safari-green)]' : 'hover:bg-gray-50 border-l-4 border-transparent'}`}
  >
  {selectionMode && (
  <div className="flex items-center mr-3">
  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${isSelected ? 'bg-blue-500 border-blue-500 text-white scale-110' : 'border-gray-300'}`}>
  {isSelected && Icons.check}
  </div>
  </div>
  )}
  <div className="relative w-14 h-14 mr-4 flex-shrink-0" onClick={userStatuses.length > 0 && onAvatarClick ? (e) => { e.stopPropagation(); onAvatarClick(chat.id); } : undefined}>
  <StatusRing statuses={userStatuses} currentUserId={currentUserId} />
  <img
  src={chat.avatar_url || DEFAULT_AVATAR}
  className={`w-12 h-12 rounded-full absolute top-1 left-1 object-cover ${userStatuses.length > 0 ? 'cursor-pointer' : ''}`}
  alt=""
  />
  {(chat.online || chat.is_system === 'ai') && !isGroup && chat.id !== '22222222-2222-2222-2222-222222222222' && chat.number !== 'support' && (
  <div className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-[var(--safari-green)] border-2 border-white  rounded-full shadow-sm"></div>
  )}
  </div>
  <div className="flex-1 min-w-0">
  <div className="flex justify-between items-baseline mb-1">
  <h4 className={`font-bold truncate flex items-center gap-1.5 ${isSelected ? 'text-blue-800' : 'text-gray-900'}`}>
  <span>{chat.name}</span>
  {chat.is_system === 'ai' && (
  <span className="shrink-0 px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wider text-white bg-gradient-to-r from-purple-600 to-indigo-600 rounded shadow-sm">
  AI
  </span>
  )}
  </h4>
  {chat.lastMessageTime && (
  <span className="text-[11px] text-gray-500 font-medium">
  {new Date(chat.lastMessageTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
  </span>
  )}
  </div>
  <div className="flex justify-between items-center h-5">
  {isTyping ? (
  <p className="text-sm font-bold text-[var(--safari-green)] truncate flex-1 animate-pulse">
  {typingText || 'Typing...'}
  </p>
  ) : (
  <div className="flex items-center gap-1 flex-1 min-w-0 mr-2 text-sm text-gray-600 truncate">
  {chat.lastMessage?.startsWith('You: ') && (
  <span className="shrink-0 text-[14px] mr-1 tracking-[-0.15em]">
  {chat.lastMessageStatus === 'read' ? (
  <span className="text-blue-500">✓✓</span>
  ) : (
  <span className="text-gray-400">✓</span>
  )}
  </span>
  )}
  <span className="truncate">{chat.lastMessage?.replace('You: ', '') || 'No messages yet'}</span>
  </div>
  )}
  {Number(chat.unreadCount) > 0 && !isActive && !isSelected && !isTyping && (
  <span className="unread-badge" style={{ background: 'var(--safari-green)' }}>
  {chat.unreadCount}
  </span>
  )}
  </div>
  </div>
  </div>
  );
});

const ChatHeader = memo(({ chat, isTyping, statusText, isOnline, onBack, isGroup, onViewProfile, onOpenSettings, onOpenArchived, onShowChatInfo, onSearchClick, hasUnviewedStatus }) => {
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
  const handleClickOutside = (event) => {
  if (menuRef.current && !menuRef.current.contains(event.target)) setShowMenu(false);
  };
  document.addEventListener('mousedown', handleClickOutside);
  return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const menuOptions = [
  { label: 'View Profile', icon: Icons.user, onClick: () => { onViewProfile(chat); setShowMenu(false); } },
  { label: 'Chat Settings', icon: Icons.settings, onClick: () => { onViewProfile(chat, 'settings'); setShowMenu(false); } },

  { label: 'Archived Chats', icon: Icons.archive, onClick: () => { onOpenArchived(); setShowMenu(false); } },
  { label: 'Contact Info', icon: Icons.more, onClick: () => { onShowChatInfo(); setShowMenu(false); } },
  ];

  return (
  <div className="bg-white  border-b  p-2 md:p-3 flex items-center shadow-sm sticky top-0 z-30 backdrop-blur-md bg-white/90">
  {onBack && (
  <button onClick={onBack} className="text-gray-600  mr-2 p-2 rounded-full hover:bg-black/5  transition">
  {Icons.arrowLeft}
  </button>
  )}

  <div className="relative cursor-pointer group flex items-center" onClick={() => onViewProfile && onViewProfile(chat)}>
  <img
  src={chat.avatar_url || DEFAULT_AVATAR}
  className={`w-10 h-10 rounded-full mr-3 object-cover shadow-sm transition group-hover:scale-105 ${hasUnviewedStatus ? 'border-[3px] border-[var(--safari-green)] p-[1px]' : 'ring-2 ring-[var(--safari-green)]/25 group-hover:ring-[var(--safari-green)]/50'}`}
  alt=""
  />
  </div>

  <div className="flex-1 cursor-pointer overflow-hidden" onClick={() => onViewProfile && onViewProfile(chat)}>
  <h3 className="font-bold text-gray-900  text-base leading-tight truncate flex items-center gap-1.5">
  <span>{chat.name}</span>
  {chat.is_system === 'ai' && (
  <span className="shrink-0 px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wider text-white bg-gradient-to-r from-purple-600 to-indigo-600 rounded shadow-sm">
  AI
  </span>
  )}
  </h3>
  <div className="text-xs font-medium truncate flex items-center gap-1.5 h-4">
  {isTyping ? (
  <span className="text-[var(--safari-green)] animate-pulse flex items-center gap-1">
  <span className="inline-flex gap-0.5">
  <span className="w-0.5 h-0.5 bg-current rounded-full animate-bounce"></span>
  <span className="w-0.5 h-0.5 bg-current rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></span>
  <span className="w-0.5 h-0.5 bg-current rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></span>
  </span>
  {statusText.includes('typing') ? statusText : 'Typing...'}
  </span>
  ) : (
  <span className="text-gray-500  flex items-center gap-1.5">
  {isOnline && chat?.id !== '22222222-2222-2222-2222-222222222222' && chat?.number !== 'support' && (
  <span className="w-2 h-2 rounded-full bg-[var(--safari-green)] shadow-[0_0_4px_rgba(34,197,94,0.4)]"></span>
  )}
  {isGroup ? `${chat.members ? chat.members.length : 0} members` : (chat?.id === '22222222-2222-2222-2222-222222222222' || chat?.number === 'support' ? 'Support' : statusText)}
  </span>
  )}
  </div>
  </div>

  {onSearchClick && (
  <button
  onClick={onSearchClick}
  className="p-2 rounded-full text-gray-500 hover:text-[var(--safari-green)] hover:bg-gray-50  transition-all duration-300"
  aria-label="Search in chat"
  title="Search in chat (Ctrl+F)"
  >
  {Icons.search}
  </button>
  )}

  <div className="relative" ref={menuRef}>
  <button
  onClick={() => setShowMenu(!showMenu)}
  className={`p-2 rounded-full transition-all duration-300 ${showMenu ? 'bg-gray-100  text-[var(--safari-green)]' : 'text-gray-500 hover:text-[var(--safari-green)] hover:bg-gray-50 '}`}
  aria-label="More options"
  >
  {Icons.more}
  </button>
  {showMenu && (
  <div className="absolute right-0 mt-3 w-64 bg-white  rounded-2xl shadow-2xl border border-gray-100  py-2 z-[60] animate-modal-pop ring-1 ring-black/5">
  {menuOptions.map((opt, i) => (
  <button key={i} onClick={opt.onClick} className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-[color-mix(in_srgb,var(--safari-green),transparent_95%)] group transition-all duration-150">
  <span className="text-gray-400 group-hover:text-[var(--safari-green)] transition-colors duration-150 transform group-hover:scale-110">{opt.icon}</span>
  <span className="text-sm font-bold text-gray-700  group-hover:text-[var(--safari-green)] transition-colors duration-150">{opt.label}</span>
  </button>
  ))}
  </div>
  )}
  </div>
  </div>
  );
});

const MessageReceipts = ({ message, isGroup, isSentByMe, onClick }) => {
  if (!isSentByMe) return null;
  const { status, read_by } = message;
  const readCount = isGroup && read_by ? read_by.filter(r => (typeof r === 'object' ? r.userId : r) !== message.from).length : 0;

  const isRead = status === 'read' || readCount > 0;
  const isDelivered = status === 'delivered';

  return (
  <div onClick={onClick} className={`inline-flex items-center gap-0.5 ml-1 select-none ${isRead ? 'text-[#53bdeb]' : 'text-gray-400'}`} title={status}>
  {(isRead || isDelivered) ? Icons.checkDouble : Icons.check}
  {isGroup && readCount > 0 && <span className="text-[9px] font-bold ml-0.5">{readCount}</span>}
  </div>
  );
};

// Read By Modal - Shows who read a group message
const ReadByModal = ({ isOpen, readBy, onClose, members }) => {
  if (!isOpen) return null;

  const readers = useMemo(() => {
  if (!readBy) return [];
  const mapped = [];
  const seen = new Set();
  readBy.forEach(entry => {
  const userId = typeof entry === 'object' ? entry.userId : entry;
  const readAt = typeof entry === 'object' ? (entry.readAt || entry.timestamp) : null;
  const entryName = typeof entry === 'object' ? entry.name : null;
  const entryAvatar = typeof entry === 'object' ? entry.avatar : null;
  if (seen.has(userId)) return;
  seen.add(userId);
  const member = members && members.find(m => m.user_id === userId);
  mapped.push({
  userId,
  name: entryName || (member ? (member.nickname || member.real_name || member.phone) : 'Unknown User'),
  avatar: entryAvatar || (member ? member.avatar_url : null),
  readAt
  });
  });
  return mapped;
  }, [readBy, members]);

  return (
  <div className="fixed inset-0 bg-black/50 flex items-end md:items-center justify-center z-[130] backdrop-blur-[2px]" onClick={onClose}>
  <div className="bg-white  w-full max-w-sm md:max-h-[70vh] md:overflow-hidden rounded-t-3xl md:rounded-3xl shadow-2xl animate-modal-pop flex flex-col" onClick={e => e.stopPropagation()}>
  <div className="flex justify-between items-center px-5 py-4 border-b border-gray-100  shrink-0">
  <div className="flex items-center gap-2">
  <span className="text-blue-500 text-sm tracking-[-0.15em]">✓✓</span>
  <h3 className="text-sm font-black text-gray-900  uppercase tracking-tight">Read by {readers.length}</h3>
  </div>
  <button onClick={onClose} className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-gray-100  text-gray-400 transition-all duration-150">{Icons.x}</button>
  </div>
  <div className="flex-1 overflow-y-auto no-scrollbar px-2 py-2">
  {readers.length === 0 ? (
  <div className="text-center py-8">
  <p className="text-sm font-bold text-gray-400 italic">No one has read this yet</p>
  </div>
  ) : readers.map((r, i) => (
  <div key={r.userId || i} className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-gray-50  transition-colors duration-100">
  <img src={r.avatar || DEFAULT_AVATAR} className="w-9 h-9 rounded-full object-cover ring-1 ring-black/5" />
  <div className="flex-1 min-w-0">
  <p className="text-sm font-bold text-gray-900  truncate">{r.name}</p>
  <p className="text-[10px] text-gray-400 font-medium">
  {r.readAt ? new Date(r.readAt).toLocaleString([], { hour: 'numeric', minute: '2-digit' }) : 'Read'}
  </p>
  </div>
  </div>
  ))}
  </div>
  </div>
  </div>
  );
};

const ForwardModal = ({ isOpen, onClose, chats, onForward }) => {
  const [selected, setSelected] = useState(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  if (!isOpen) return null;

  const toggle = (id) => {
  setSelected(prev => {
  const text = new Set(prev);
  if (text.has(id)) text.delete(id); else text.add(id);
  return text;
  });
  };

  const handleConfirm = () => {
  if (selected.size === 0) return;
  const targets = [...selected].map(id => {
  const chat = chats.find(c => c.id === id);
  return { id, isGroup: !!chat?.isGroup };
  });
  onForward(targets);
  setSelected(new Set());
  onClose();
  };

  const filteredChats = chats.filter(chat => {
  if (!searchQuery) return true;
  const q = searchQuery.toLowerCase();
  return (chat.name || '').toLowerCase().includes(q);
  });

  return (
  <div className="fixed inset-0 bg-black/60 flex items-end md:items-center justify-center z-[130] backdrop-blur-sm" onClick={onClose}>
  <div className="bg-white  w-full max-w-sm h-[100dvh] md:h-auto md:max-h-[85vh] md:overflow-hidden rounded-none md:rounded-3xl p-7 shadow-2xl animate-slide-up flex flex-col" onClick={e => e.stopPropagation()}>
  <div className="flex justify-between items-center mb-4 shrink-0">
  <h3 className="text-xl font-black text-gray-900  uppercase italic tracking-tighter">Forward to...</h3>
  <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-50  text-gray-400 transition">{Icons.x}</button>
  </div>

  {/* Searching Input */}
  <div className="relative mb-4 shrink-0">
  <div className="absolute left-3 top-1/2 -translate-y-1/2 flex items-center text-gray-400">{Icons.search}</div>
  <input
  type="search"
  placeholder="Search contacts or groups..."
  value={searchQuery}
  onChange={(e) => setSearchQuery(e.target.value)}
  className="w-full pl-10 pr-4 py-2.5 bg-gray-100  border-none rounded-xl text-sm focus:ring-2 ring-green-500/50 outline-none "
  />
  </div>

  <div className="space-y-1.5 flex-1 overflow-y-auto no-scrollbar pr-1 mb-8">
  {filteredChats.map(chat => (
  <div key={chat.id} onClick={() => toggle(chat.id)} className={`flex items-center gap-4 p-3 rounded-2xl cursor-pointer transition-all ${selected.has(chat.id) ? 'bg-[color-mix(in_srgb,var(--safari-green),transparent_95%)] ring-2 ring-[var(--safari-green)] shadow-sm' : 'hover:bg-gray-50 '}`}>
  <img src={chat.avatar_url || DEFAULT_AVATAR} className="w-11 h-11 rounded-full object-cover shadow-sm" />
  <div className="flex-1 min-w-0">
  <p className="font-black text-sm text-gray-900  truncate tracking-tight">{chat.name}</p>
  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{chat.isGroup ? 'Group' : 'Contact'}</p>
  </div>
  <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${selected.has(chat.id) ? 'bg-[var(--safari-green)] border-[var(--safari-green)] text-white scale-110 shadow-lg shadow-[color-mix(in_srgb,var(--safari-green),transparent_70%)]' : 'border-gray-200 '}`}>
  {selected.has(chat.id) && <span className="text-xs">✓</span>}
  </div>
  </div>
  ))}
  {filteredChats.length === 0 && (
  <p className="text-center py-8 text-gray-500 text-sm">No results found</p>
  )}
  </div>

  <button
  onClick={handleConfirm}
  disabled={selected.size === 0}
  className={`w-full py-4 rounded-2xl font-black uppercase tracking-[0.25em] shadow-xl transition-all active:scale-95 ${selected.size > 0 ? 'bg-[var(--safari-green)] text-white hover:bg-[color-mix(in_srgb,var(--safari-green),black_10%)] shadow-[color-mix(in_srgb,var(--safari-green),transparent_80%)]' : 'bg-gray-100  text-gray-400 cursor-not-allowed opacity-50'}`}
  >
  Forward ({selected.size})
  </button>
  </div>
  </div>
  );
};

const LazyImage = ({ src, alt, className, onClick }) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const imgRef = useRef();
  const [isInView, setIsInView] = useState(false);

  useEffect(() => {
  const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
  if (entry.isIntersecting) {
  setIsInView(true);
  observer.disconnect();
  }
  });
  });
  if (imgRef.current) observer.observe(imgRef.current);
  return () => observer.disconnect();
  }, []);

  return (
  <div ref={imgRef} className={`relative overflow-hidden ${className}`} onClick={onClick}>
  {(!isInView || !isLoaded) && (
  <div className="absolute inset-0 bg-gray-200 animate-pulse" />
  )}
  {isInView && (
  <img
  src={getOptimizedMediaUrl(src, 'image')}
  alt={alt}
  className={`w-full h-full object-cover transition-opacity duration-500 ${isLoaded ? 'opacity-100' : 'opacity-0'}`}
  onLoad={() => setIsLoaded(true)}
  />
  )}
  </div>
  );
};

// ─── Jump to Latest Button ───
const JumpToLatest = ({ containerRef, messagesEndRef }) => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
  const el = containerRef?.current;
  if (!el) return;
  const handleScroll = () => {
  const distFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
  setVisible(distFromBottom > 200);
  };
  el.addEventListener('scroll', handleScroll, { passive: true });
  return () => el.removeEventListener('scroll', handleScroll);
  }, [containerRef]);

  if (!visible) return null;

  return (
  <button
  onClick={() => messagesEndRef?.current?.scrollIntoView({ behavior: 'smooth' })}
  className="sticky bottom-4 left-1/2 -translate-x-1/2 z-20 bg-white  text-gray-600  w-10 h-10 rounded-full shadow-lg border border-gray-200  flex items-center justify-center hover:scale-110 hover:shadow-xl transition-all duration-200 animate-bounce-gentle"
  title="Jump to latest"
  >
  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
  <polyline points="6 9 12 15 18 9"></polyline>
  </svg>
  </button>
  );
};

// ─── Chat List Skeleton ───
const ChatListSkeleton = () => (
  <div className="space-y-1 p-2 animate-pulse">
  {[...Array(6)].map((_, i) => (
  <div key={i} className="flex items-center p-4 gap-3 hd">
  <div className="w-12 h-12 rounded-full bg-gray-200  shrink-0"></div>
  <div className="flex-1 space-y-2">
  <div className="flex justify-between">
  <div className="h-3.5 bg-gray-200  rounded-full w-32"></div>
  <div className="h-2.5 bg-gray-100  rounded-full w-10"></div>
  </div>
  <div className="h-2.5 bg-gray-100  rounded-full w-48"></div>
  </div>
  </div>
  ))}
  </div>
);

// ─── Message Skeleton ───
const MessageSkeleton = () => (
  <div className="space-y-3 p-4 animate-pulse">
  {[...Array(5)].map((_, i) => {
  const isSent = i % 3 === 0;
  return (
  <div key={i} className={`flex ${isSent ? 'justify-end' : 'justify-start'}`}>
  <div className={`rounded-2xl p-3 space-y-1.5 ${isSent ? 'bg-[color-mix(in_srgb,var(--safari-green),transparent_85%)] ' : 'bg-gray-100 '}`}
  style={{ width: `${Math.random() * 30 + 35}%` }}>
  <div className="h-3 bg-gray-200/60  rounded-full w-full"></div>
  {Math.random() > 0.5 && <div className="h-3 bg-gray-200/40  rounded-full w-3/4"></div>}
  <div className="h-2 bg-gray-200/30  rounded-full w-12 ml-auto"></div>
  </div>
  </div>
  );
  })}
  </div>
);

// ─── In-Chat Search Panel ───
const InChatSearch = ({ chatId, isGroup, onClose, onJumpToMessage }) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [currentIdx, setCurrentIdx] = useState(0);
  const inputRef = useRef(null);

  useEffect(() => {
  inputRef.current?.focus();
  }, []);

  useEffect(() => {
  if (!chatId) {
  console.log('[DEBUG] InChatSearch: chatId is undefined. Waiting for valid ID.');
  setResults([]);
  return;
  }
  if (!query || query.length < 2) { setResults([]); return; }
  const timer = setTimeout(async () => {
  setLoading(true);
  try {
  const res = await fetch(`${API_BASE_URL}/api/chats/single/${chatId}/search?q=${encodeURIComponent(query)}&isGroup=${isGroup}`);
  const data = await res.json();
  setResults(data || []);
  setCurrentIdx(0);
  if (data.length > 0 && onJumpToMessage) onJumpToMessage(data[0].id);
  } catch { setResults([]); }
  setLoading(false);
  }, 400);
  return () => clearTimeout(timer);
  }, [query, chatId, isGroup]);

  const navigate = (dir) => {
  const newIdx = Math.max(0, Math.min(results.length - 1, currentIdx + dir));
  setCurrentIdx(newIdx);
  if (results[newIdx] && onJumpToMessage) onJumpToMessage(results[newIdx].id);
  };

  return (
  <div className="bg-white  border-b  px-3 py-2 flex flex-col gap-2 shadow-sm z-30 animate-slide-down relative">
  <div className="flex items-center gap-2">
  <div className="flex-1 relative">
  <input
  ref={inputRef}
  type="text"
  value={query}
  onChange={(e) => setQuery(e.target.value)}
  placeholder="Search in conversation..."
  className="w-full bg-gray-50  border-none rounded-xl px-4 py-2 text-sm outline-none focus:ring-2 ring-[var(--safari-green)]/30 transition"
  onKeyDown={(e) => {
  if (e.key === 'Enter') navigate(1);
  if (e.key === 'Escape') onClose();
  }}
  />
  {loading && <span className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 border-2 border-gray-300 border-t-[var(--safari-green)] rounded-full animate-spin"></span>}
  </div>
  {results.length > 0 && (
  <span className="text-[10px] font-bold text-gray-400 whitespace-nowrap">{currentIdx + 1}/{results.length}</span>
  )}
  <button onClick={() => navigate(-1)} className="p-1.5 rounded-full hover:bg-gray-100  text-gray-500 transition" disabled={currentIdx <= 0}>
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="18 15 12 9 6 15"></polyline></svg>
  </button>
  <button onClick={() => navigate(1)} className="p-1.5 rounded-full hover:bg-gray-100  text-gray-500 transition" disabled={currentIdx >= results.length - 1}>
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
  </button>
  <button onClick={onClose} className="p-1.5 rounded-full hover:bg-gray-100  text-gray-500 transition">
  {Icons.x}
  </button>
  </div>

  {results.length > 0 && query.length >= 2 && (
  <div className="absolute top-full left-0 right-0 max-h-64 overflow-y-auto bg-white  border  shadow-xl rounded-b-xl z-50 flex flex-col">
  {results.map((r, idx) => (
  <div
  key={r.id}
  className={`p-3 border-b  cursor-pointer hover:bg-gray-50  ${idx === currentIdx ? 'bg-[color-mix(in_srgb,var(--safari-green),transparent_95%)]  border-l-4 border-l-[var(--safari-green)]' : 'border-l-4 border-l-transparent'}`}
  onClick={() => {
  setCurrentIdx(idx);
  if (onJumpToMessage) onJumpToMessage(r.id);
  }}
  >
  <div className="flex justify-between items-center mb-1">
  <span className="text-xs font-bold text-gray-700 ">{r.senderName}</span>
  <span className="text-[10px] text-gray-400">{new Date(r.timestamp).toLocaleDateString()}</span>
  </div>
  <p className="text-sm text-gray-600  line-clamp-2">{r.text}</p>
  </div>
  ))}
  </div>
  )}
  </div>
  );
};

// ─── Reaction Picker (Quick Emoji Bar) ───
const ReactionPicker = ({ onReact, onClose }) => {
  const quickReactions = ['👍', '❤️', '😂', '😮', '😢', '🙏', '🔥', '👎'];
  return (
  <div className="flex gap-1 bg-white  rounded-full shadow-2xl border border-gray-100  px-2 py-1.5 animate-modal-pop" onClick={(e) => e.stopPropagation()}>
  {quickReactions.map(emoji => (
  <button
  key={emoji}
  onClick={() => { onReact(emoji); onClose(); }}
  className="text-lg hover:scale-125 transition-transform p-1 rounded-full hover:bg-gray-100  cursor-pointer"
  >
  {emoji}
  </button>
  ))}
  </div>
  );
};

const parseRichText = (text) => {
  if (!text) return { __html: '' };

  // 1. Escape raw HTML so user-typed <div...>, <script>, etc. are treated as plain text and NEVER executed!
  let html = text
  .replace(/&/g, "&amp;")
  .replace(/</g, "&lt;")
  .replace(/>/g, "&gt;")
  .replace(/"/g, "&quot;")
  .replace(/'/g, "&#039;");

  const placeholders = {};
  let pCount = 0;
  const save = (content) => {
  const tag = `@@@PL${pCount++}@@@`;
  placeholders[tag] = content;
  return tag;
  };

  // 2. Fenced Code Blocks ```lang\ncode\n```
  html = html.replace(/```([a-zA-Z0-9]*)\n([\s\S]*?)```/g, (_, lang, code) => {
  const langBadge = lang ? `<div class="bg-black/20  text-gray-700  px-2 py-0.5 rounded-t text-[10px] font-bold uppercase w-fit">${lang}</div>` : '';
  return save(`<div class="my-2 w-full max-w-full overflow-hidden rounded-xl border border-black/10  bg-black/5  shadow-inner">${langBadge}<pre class="p-3 text-[13px] font-mono overflow-x-auto max-w-full whitespace-pre text-gray-800 "><code>${code}</code></pre></div>`);
  });

  // 3. Inline Code `code`
  html = html.replace(/`([^`]+)`/g, (_, code) => {
  return save(`<code class="bg-black/10  px-1.5 py-0.5 rounded text-[13px] font-mono text-pink-600 ">${code}</code>`);
  });

  // 4. Images ![alt](url)
  html = html.replace(/!\[([^\]]*)\]\((https?:\/\/[^\)]+)\)/g, (_, alt, url) => {
  return save(`<img src="${url}" alt="${alt}" class="max-w-full h-auto rounded-xl my-2 shadow-md border border-black/5 " />`);
  });

  // 5. Reference Links [label][ref] and [ref]: url
  const refMap = {};
  html = html.replace(/^\[([^\]]+)\]:\s*(https?:\/\/[^\s]+)/gm, (_, ref, url) => {
  refMap[ref.toLowerCase()] = url;
  return ''; // remove definition line
  });
  html = html.replace(/\[([^\]]+)\]\[([^\]]+)\]/g, (match, label, ref) => {
  const url = refMap[ref.toLowerCase()];
  if (url) {
  return save(`<a href="${url}" target="_blank" rel="noopener noreferrer" class="text-blue-500  hover:underline break-all inline-block font-medium cursor-pointer">${label}</a>`);
  }
  return match;
  });

  // 6. Explicit Links [label](url)
  html = html.replace(/\[([^\]]+)\]\((https?:\/\/[^\)]+)\)/g, (_, label, url) => {
  return save(`<a href="${url}" target="_blank" rel="noopener noreferrer" class="text-blue-500  hover:underline break-all inline-block font-medium cursor-pointer">${label}</a>`);
  });

  // 7. Raw URLs https://...
  html = html.replace(/(https?:\/\/[^\s<]+)/g, (_, url) => {
  return save(`<a href="${url}" target="_blank" rel="noopener noreferrer" class="text-blue-500  hover:underline break-all inline-block font-medium cursor-pointer">${url}</a>`);
  });

  // 8. Phone Numbers
  html = html.replace(/(?:\b0[0-9]{10}\b)|(?:\+[0-9]{11,14}\b)/g, (match) => {
  const phoneArg = match.startsWith('0') ? match.slice(1) : match;
  return save(`<button onclick="window.dispatchEvent(new CustomEvent('open-add-contact', { detail: '${phoneArg}' }))" class="text-blue-500  hover:underline break-all inline-block font-medium cursor-pointer" title="Click to add contact">${match}</button>`);
  });

  // 9. Tables
  if (html.includes('|')) {
  const tableRegex = /((?:\|[^\n]+\|\n?)+)/g;
  html = html.replace(tableRegex, (match) => {
  const rows = match.trim().split('\n');
  if (rows.length < 2) return match;
  let tableHtml = `<table class="w-full my-3 border-collapse rounded-xl overflow-hidden shadow-sm border border-black/10  text-xs">`;
  rows.forEach((row, rIdx) => {
  if (row.includes('---')) return; // skip separator row
  const cols = row.split('|').filter(Boolean).map(c => c.trim());
  if (rIdx === 0) {
  tableHtml += `<thead class="bg-black/10  font-bold text-left"><tr>`;
  cols.forEach(col => { tableHtml += `<th class="p-2.5 border-b border-black/10  font-extrabold tracking-wider uppercase text-[11px]">${col}</th>`; });
  tableHtml += `</tr></thead><tbody>`;
  } else {
  tableHtml += `<tr>`;
  cols.forEach(col => { tableHtml += `<td class="p-2.5 border-b border-black/5 ">${col}</td>`; });
  tableHtml += `</tr>`;
  }
  });
  tableHtml += `</tbody></table>`;
  return save(tableHtml);
  });
  }

  // 10. Headings
  html = html.replace(/^######\s+(.*)$/gm, '<h6 class="text-xs font-bold mt-2 mb-1 uppercase tracking-wider">$1</h6>');
  html = html.replace(/^#####\s+(.*)$/gm, '<h5 class="text-sm font-bold mt-2 mb-1">$1</h5>');
  html = html.replace(/^####\s+(.*)$/gm, '<h4 class="text-sm font-bold mt-2 mb-1">$1</h4>');
  html = html.replace(/^###\s+(.*)$/gm, '<h3 class="text-base font-bold mt-2 mb-1">$1</h3>');
  html = html.replace(/^##\s+(.*)$/gm, '<h2 class="text-lg font-extrabold tracking-tight mt-3 mb-1.5 pb-0.5 border-b border-black/5 ">$1</h2>');
  html = html.replace(/^#\s+(.*)$/gm, '<h1 class="text-xl font-black tracking-tight mt-4 mb-2 pb-1 border-b border-black/10 ">$1</h1>');

  // 11. Task Lists & Lists
  html = html.replace(/^\s*\*\s+\[x\]\s+(.*)$/gm, '<div class="flex items-center gap-2 my-0.5"><input type="checkbox" checked disabled class="rounded border-gray-300 text-[var(--safari-green)] focus:ring-[var(--safari-green)] w-3.5 h-3.5" /><span>$1</span></div>');
  html = html.replace(/^\s*\*\s+\[\s\]\s+(.*)$/gm, '<div class="flex items-center gap-2 my-0.5"><input type="checkbox" disabled class="rounded border-gray-300 text-[var(--safari-green)] focus:ring-[var(--safari-green)] w-3.5 h-3.5" /><span>$1</span></div>');
  html = html.replace(/^\s*(?:\*|-)\s+(.*)$/gm, '<li class="my-0.5 ml-4 list-disc list-inside">$1</li>');
  html = html.replace(/^\s*\d+\.\s+(.*)$/gm, '<li class="my-0.5 ml-4 list-decimal list-inside">$1</li>');

  // 12. Blockquotes
  html = html.replace(/^\s*>\s+(.*)$/gm, '<blockquote class="pl-3.5 my-2.5 border-l-4 border-[var(--safari-green)] bg-black/5  py-1.5 pr-3 rounded-r-xl italic shadow-sm">$1</blockquote>');

  // 13. Horizontal Rules
  html = html.replace(/^\s*---\s*$/gm, '<hr class="my-4 border-0 h-[1px] bg-black/10 " />');

  // 14. Footnotes
  html = html.replace(/\[\^(\d+)\]:\s*(.*)$/gm, '<div class="text-xs text-gray-500  mt-2 border-t border-black/5  pt-1"><sup>$1</sup> $2</div>');
  html = html.replace(/\[\^(\d+)\]/g, '<sup class="text-[10px] bg-black/10  px-1 rounded cursor-pointer">$1</sup>');

  // 15. Bold, Italic, Strikethrough
  html = html.replace(/\*\*\*([^\*]+)\*\*\*/g, '<strong class="font-bold"><em class="italic">$1</em></strong>');
  html = html.replace(/\*\*([^\*]+)\*\*/g, '<strong class="font-bold">$1</strong>');
  html = html.replace(/\*([^\*]+)\*/g, '<em class="italic">$1</em>');
  html = html.replace(/_([^_]+)_/g, '<em class="italic">$1</em>');
  html = html.replace(/~~([^~]+)~~/g, '<del class="line-through opacity-70">$1</del>');

  // 16. Newlines
  html = html.replace(/\n/g, '<br />');

  // 17. Restore Placeholders
  Object.keys(placeholders).forEach(tag => {
  html = html.replace(tag, placeholders[tag]);
  });

  return { __html: html };
};

const MessageBubble = memo(({ message, isSentByMe, onContextMenu, isGroup, onShowReadBy, translatedText, userVoice, onViewMedia, lazyLoadEnabled, onViewProfile, isSelected, onSelect, selectionMode, onReply, bubbleDensity = 'comfortable', showSenderName, membersMap }) => {
  const { id, from, text, type, timestamp, media, sticker_url, status, senderName, reply_to, reactions, is_pinned, is_edited } = message;
  const [revealedMedia, setRevealedMedia] = useState({});
  const [swipeOffset, setSwipeOffset] = useState(0);
  const [hideTranslation, setHideTranslation] = useState(false);
  const touchStartX = useRef(0);
  const isSwiping = useRef(false);

  const resolvedSenderName = useMemo(() => {
  if (senderName) return senderName;
  return from === 'Me' ? 'Me' : 'Contact';
  }, [senderName, from]);

  const handleTouchStart = (e) => {
  if (selectionMode) return;
  touchStartX.current = e.touches[0].clientX;
  isSwiping.current = false;
  };

  const handleTouchMove = (e) => {
  if (selectionMode) return;
  const diff = e.touches[0].clientX - touchStartX.current;
  if (diff > 10) { // Swipe right
  isSwiping.current = true;
  const offset = Math.min(diff * 0.5, 70);
  setSwipeOffset(offset);
  }
  };

  const handleTouchEnd = () => {
  if (swipeOffset >= 50 && onReply) {
  onReply({ id, text, from, fromName: resolvedSenderName });
  }
  setSwipeOffset(0);
  isSwiping.current = false;
  };

  const handleClick = (e) => {
  if (selectionMode && onSelect) { e.preventDefault(); e.stopPropagation(); onSelect(id); }
  };

  return (
  <div id={`msg-${id}`}
  className={`flex ${isSentByMe ? 'justify-end' : 'justify-start'} ${bubbleDensity === 'compact' ? 'mb-0.5' : bubbleDensity === 'spacious' ? 'mb-3' : 'mb-1.5'} group relative px-2 select-none ${isSelected ? 'bg-blue-500/10' : ''} transition-all duration-200`}
  onContextMenu={(e) => { e.preventDefault(); onSelect(id, true); }}
  onTouchStart={handleTouchStart}
  onTouchMove={handleTouchMove}
  onTouchEnd={handleTouchEnd}
  onClick={handleClick}
  style={{
  transform: `translateX(${swipeOffset}px)`,
  transition: isSwiping.current ? 'none' : 'transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)'
  }}
  >
  {swipeOffset > 20 && (
  <div className="absolute left-[-40px] top-1/2 -translate-y-1/2 flex flex-col items-center" style={{ opacity: Math.min(swipeOffset / 60, 1) }}>
  <div className="p-1.5 rounded-full" style={{ background: 'color-mix(in srgb, var(--safari-green) 10%, transparent)', color: 'var(--safari-green)' }}>
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 17 4 12 9 7" /><path d="M20 18v-2a4 4 0 0 0-4-4H4" /></svg>
  </div>
  </div>
  )}

  {!isSentByMe && isGroup && (
  <div className="w-8 mr-2 shrink-0 flex flex-col items-center">
  {showSenderName ? (
  <img
  src={membersMap?.[from]?.avatar_url || DEFAULT_AVATAR}
  alt={resolvedSenderName}
  className="w-8 h-8 rounded-full cursor-pointer hover:opacity-80 transition object-cover"
  onClick={(e) => { e.stopPropagation(); if (onViewProfile) onViewProfile(from); }}
  />
  ) : null}
  </div>
  )}
  <div className={`flex flex-col ${isSentByMe ? 'items-end' : 'items-start'} max-w-[70%] md:max-w-[60%]`}>
  <div className={`relative w-fit rounded-xl ${bubbleDensity === 'compact' ? 'px-2 py-0.5 text-[13px]' : bubbleDensity === 'spacious' ? 'px-3.5 py-2.5 text-sm' : 'px-2 py-1 text-[13.5px]'} ${isSentByMe ? 'text-gray-900  rounded-tr-sm shadow-[0_1px_1px_rgba(0,0,0,0.06)]' : 'bg-white  text-gray-900  rounded-tl-sm shadow-[0_1px_1px_rgba(0,0,0,0.04)]'} ${isSelected ? 'ring-2 ring-blue-400/60 ring-offset-1' : ''}`} style={{ background: isSentByMe ? 'var(--safari-green)' : undefined }}>
  {showSenderName && (
  <div
  className="text-[11px] font-black mb-0.5 cursor-pointer hover:underline text-[var(--safari-green)] "
  onClick={() => onViewProfile && onViewProfile(from)}
  >
  {resolvedSenderName}
  </div>
  )}

  {reply_to && (
  <div className="bg-black/5  border-l-[3px] rounded-r p-1 mb-1 text-[12.5px] cursor-pointer opacity-90 flex flex-col w-full min-w-0 overflow-hidden"
  style={{ borderColor: 'var(--safari-green)' }}
  onClick={() => {
  if (reply_to.quotedStatusId) {
  window.dispatchEvent(new CustomEvent('open-status', { detail: reply_to.quotedStatusId }));
  return;
  }
  const target = document.getElementById(`msg-${reply_to.id}`);
  if (target) {
  target.scrollIntoView({ behavior: 'smooth', block: 'center' });
  target.classList.add('flash-highlight');
  setTimeout(() => target.classList.remove('flash-highlight'), 2000);
  }
  }}>
  <span className="text-[10px] font-black uppercase text-[var(--safari-green)]  tracking-wider flex items-center gap-1">
  {reply_to.fromName}
  </span>
  <span className="text-xs block truncate w-full min-w-0 text-gray-600  italic">
  {reply_to.text ? (reply_to.text.length > 60 ? reply_to.text.slice(0, 60) + '...' : reply_to.text) : 'Media Message'}
  </span>
  </div>
  )}

  {media && media.length > 0 && type !== 'sticker' && !sticker_url && (
  <div className={`${(media.length === 1 && (media[0].type === 'voice' || media[0].type === 'audio') && !text) ? 'bg-transparent py-1' : `media-grid rounded-xl overflow-hidden mb-1 ${media.length === 1 ? 'single' : media.length === 2 ? 'double' : media.length === 3 ? 'triple' : 'quad'}`}`} style={{ maxWidth: 'min(300px, 60vw)' }}>
  {media.slice(0, 4).map((m, i) => {
  const isLazy = lazyLoadEnabled && !revealedMedia[i];
  if (m.type === 'voice' || m.type === 'audio') {
  if (isLazy) return (
  <div key={i} className="col-span-full p-4 bg-gray-100  rounded-xl flex items-center justify-center border-2 border-dashed border-gray-300">
  <button onClick={(e) => { e.stopPropagation(); setRevealedMedia(prev => ({ ...prev, [i]: true })); }} className="flex items-center gap-2 text-[var(--safari-green)] font-bold hover:scale-105 transition">
  Show Audio
  </button>
  </div>
  );
  return (
  <div key={i} className="col-span-full py-0.5 pr-1 w-full max-w-full min-w-0 flex flex-col gap-0.5">
  <div className="flex items-center gap-1 w-full max-w-full min-w-0">
  <div className="flex-1 min-w-0 w-full max-w-full">
  <AudioPlayer src={m.url} />
  </div>
  </div>
  </div>
  );
  }
  if (isLazy) return (
  <div key={i} className="media-item bg-gray-200  flex flex-col items-center justify-center p-4 min-h-[150px] aspect-square">
  <button onClick={(e) => { e.stopPropagation(); setRevealedMedia(prev => ({ ...prev, [i]: true })); }} className="text-white px-3 py-1 rounded-full text-xs font-bold shadow-sm" style={{ background: 'var(--safari-green)' }}>
  Show {m.type === 'video' ? 'Video' : 'Image'}
  </button>
  </div>
  );
  return (
  <div key={i} className={`media-item relative cursor-pointer ${m.type === 'video' ? 'aspect-square md:aspect-video' : 'aspect-auto'}`} onClick={() => onViewMedia && onViewMedia({ src: m.url, type: m.type })}>
  {m.type === 'video' ? (
  <VideoPlayer src={m.url} autoPlay={false} previewMode={true} onClick={(e) => { e.stopPropagation(); if (onViewMedia) onViewMedia({ src: m.url, type: m.type }); }} className="w-full h-full aspect-square md:aspect-video" />
  ) : m.type === 'file' || m.type === 'document' ? (
  <div className="w-full h-full flex flex-col items-center justify-center text-blue-600 bg-blue-50 p-3 text-center">
  <div className="text-2xl mb-1">{Icons.file}</div>
  <span className="text-[10px] font-bold uppercase truncate w-full px-2">{m.name || 'Document'}</span>
  </div>
  ) : (
  <LazyImage src={m.url} className="w-full h-full object-contain" style={{ maxHeight: '400px' }} />
  )}
  </div>
  );
  })}
  </div>
  )}

  {(type === 'sticker' || sticker_url) && (
  <div className="mb-1">
  <LazyImage src={sticker_url} className="w-32 h-32 object-contain drop-shadow-sm" />
  </div>
  )}

  {text && (() => {
  const trimmed = text.trim();
  // Complex regex for matching emojis, including sequences and modifiers
  const emojiRegex = /^(?:(?:\ud83c[\udde6-\uddff]){2}|[\ud800-\udbff][\udc00-\udfff]|[\u2700-\u27bf]|[\u2600-\u26ff]|\u2b50|\u2b55|\u200d|\ufe0f)+$/;
  const isOnlyEmoji = emojiRegex.test(trimmed.replace(/\s/g, ''));

  if (isOnlyEmoji) {
  // Count emojis (handles multi-char emojis correctly)
  const emojis = [...trimmed.replace(/\s/g, '')];
  const count = emojis.length;

  if (count === 1) return (
  <div className="px-1 text-5xl leading-snug p-2 select-text" dangerouslySetInnerHTML={parseRichText(text)} />
  );
  if (count === 2) return (
  <div className="px-1 text-4xl leading-snug p-2 select-text" dangerouslySetInnerHTML={parseRichText(text)} />
  );
  if (count === 3) return (
  <div className="px-1 text-3xl leading-snug p-2 select-text" dangerouslySetInnerHTML={parseRichText(text)} />
  );
  }

  return (
  <div
  className="markdown-content px-1 text-[15px] leading-relaxed break-words"
  dangerouslySetInnerHTML={parseRichText(text)}
  />
  );
  })()}

  {text && text.match(/https?:\/\/[^\s]+/) && (
  <LinkPreview url={text.match(/https?:\/\/[^\s]+/)[0]} API_BASE_URL={API_BASE_URL} />
  )}

  {translatedText && (
  <div className="translation-text px-1 mt-1.5 border-t border-black/5  pt-1.5 select-none">
  {!hideTranslation ? (
  <div className="flex items-start gap-1.5 text-[11px] text-gray-500  leading-snug animate-fade-in opacity-85">
  <span className="text-[10px] opacity-70 mt-0.5 shrink-0">🌐</span>
  <span className="markdown-content italic flex-1 break-words" dangerouslySetInnerHTML={parseRichText(translatedText)} />
  <div className="flex items-center gap-1 shrink-0">
  <button onClick={(e) => { e.stopPropagation(); playTTS(translatedText, userVoice); }} className="text-[var(--safari-green)] opacity-80 hover:opacity-100 p-1 [&>svg]:w-3.5 [&>svg]:h-3.5 flex items-center justify-center" title="Listen">
  {Icons.mic}
  </button>
  <button onClick={(e) => { e.stopPropagation(); setHideTranslation(true); }} className="text-[9px] font-bold uppercase tracking-wider hover:underline opacity-60 hover:opacity-100 px-1 py-0.5" title="Hide translation">
  Hide
  </button>
  </div>
  </div>
  ) : (
  <button onClick={(e) => { e.stopPropagation(); setHideTranslation(false); }} className="flex items-center gap-1 text-[10px] font-bold text-gray-400 hover:text-gray-600  transition py-0.5 animate-fade-in">
  <span>🌐</span>
  <span className="underline">Show translation</span>
  </button>
  )}
  </div>
  )}

  <div className="flex justify-end items-center gap-1 mt-1 px-1 select-none">
  {is_edited && (
  <span className={`text-[8px] font-bold uppercase tracking-widest opacity-60 mr-1`}>
  Edited
  </span>
  )}
  <span className={`text-[9px] uppercase font-black tracking-tight ${isSentByMe ? 'text-gray-500 ' : 'text-gray-400'}`}>
  {new Date(timestamp).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
  </span>
  {isSentByMe && (
  <span
  onClick={(e) => { e.stopPropagation(); if (isGroup && onShowReadBy) onShowReadBy(); }}
  className={`${status === 'read' ? 'text-blue-500' : 'text-gray-400'} cursor-pointer hover:scale-110 transition`}
  title={isGroup ? 'View read info' : status}
  >
  {status === 'read' ? Icons.checkDouble : Icons.check}
  </span>
  )}
  </div>

  {/* Pinned indicator */}
  {is_pinned && (
  <div className="flex items-center gap-1 mt-1 px-1">
  <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="#d97706" stroke="none"><path d="M16 12V4h1V2H7v2h1v8l-2 2v2h5.2v6h1.6v-6H18v-2z" /></svg>
  <span className="text-[9px] font-bold text-amber-600 uppercase tracking-wider">Pinned</span>
  </div>
  )}
  </div>

  {/* Reactions display under the bubble */}
  {reactions && reactions.length > 0 && (
  <div className={`flex flex-wrap gap-1 mt-0.5 ${isSentByMe ? 'justify-end' : 'justify-start'}`}>
  {Object.entries(reactions.reduce((acc, r) => {
  if (!acc[r.emoji]) acc[r.emoji] = [];
  acc[r.emoji].push(r);
  return acc;
  }, {})).map(([emoji, users]) => (
  <span
  key={emoji}
  className="reaction-chip"
  title={users.map(u => u.userName || 'Someone').join(', ')}
  >
  <span>{emoji}</span>
  {users.length > 1 && <span className="text-[10px] text-gray-500 font-bold">{users.length}</span>}
  </span>
  ))}
  </div>
  )}
  </div>{/* end column wrapper */}
  </div>
  );
});

const ChatMessages = ({ messages, userId, isGroup, isAdmin, chatId, onDeleteMessage, typingUsers, onReply, onForward, lazyLoadEnabled, onLoadMore, hasMore, membersMap, members, translations, onTranslate, userVoice, onViewInfo, onEdit, onViewMedia, onViewProfile, chatName, userName, user, socket }) => {
  const [readByMessage, setReadByMessage] = useState(null);
  const messagesEndRef = useRef(null);
  const containerRef = useRef(null);
  const [prevHeight, setPrevHeight] = useState(0);
  const [selectedMessages, setSelectedMessages] = useState(new Set());
  const [selectionMode, setSelectionMode] = useState(false);
  const [showReactionPicker, setShowReactionPicker] = useState(false);

  const toggleSelect = (msgId, isLongPress) => {
  if (isLongPress && !selectionMode) {
  setSelectionMode(true);
  setSelectedMessages(new Set([msgId]));
  return;
  }
  if (!selectionMode) return;
  setSelectedMessages(prev => {
  const next = new Set(prev);
  if (next.has(msgId)) next.delete(msgId); else next.add(msgId);
  if (next.size === 0) setSelectionMode(false);
  return next;
  });
  };

  const exitSelection = () => { setSelectionMode(false); setSelectedMessages(new Set()); setShowReactionPicker(false); };

  const getSelectedTexts = () => messages.filter(m => selectedMessages.has(m.id) && m.text).map(m => m.text);

  const handleBulkDelete = async () => {
  const ids = [...selectedMessages];
  try {
  const res = await fetch(`${API_BASE_URL}/api/chats/messages/bulk-delete`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ chatId, messageIds: ids, isGroup, userId })
  });
  if (res.ok) exitSelection();
  else { const d = await res.json(); Lexum.alert({ title: 'Error', message: d.error }); }
  } catch (e) { Lexum.alert({ title: 'Error', message: 'Failed to delete' }); }
  };

  const handleBulkCopy = () => {
  const texts = getSelectedTexts();
  if (texts.length > 0) navigator.clipboard.writeText(texts.join('\n'));
  exitSelection();
  Lexum.alert({ title: 'Copied', message: `${texts.length} message(s) copied` });
  };

  const handleBulkForward = () => {
  const selectedMsgs = messages.filter(m => selectedMessages.has(m.id));
  if (selectedMsgs.length > 0) {
  if (onForward) onForward({
  texts: selectedMsgs.filter(m => m.text).map(m => m.text),
  messageIds: [...selectedMessages],
  messages: selectedMsgs
  });
  }
  exitSelection();
  };

  // ─── React to message ───
  const handleReact = (emoji) => {
  if (!socket || selectedMessages.size !== 1) return;
  const messageId = [...selectedMessages][0];
  socket.emit('react-to-message', { chatId, messageId, emoji, isGroup });
  exitSelection();
  };

  // ─── Pin/Unpin message ───
  const handlePinToggle = () => {
  if (!socket || selectedMessages.size !== 1) return;
  const messageId = [...selectedMessages][0];
  const msg = messages.find(m => m.id === messageId);
  if (!msg) return;
  if (msg.is_pinned) {
  socket.emit('unpin-message', { chatId, messageId, isGroup });
  } else {
  socket.emit('pin-message', { chatId, messageId, isGroup });
  }
  exitSelection();
  };

  // Unread Divider Logic
  let firstUnreadIndex = -1;
  if (messages.length > 0) {
  firstUnreadIndex = messages.findIndex(m => {
  if (m.from === userId) return false;
  if (isGroup) {
  if (!m.read_by) return true;
  return !m.read_by.some(r => (typeof r === 'object' ? r.userId : r) === userId);
  }
  return m.status !== 'read';
  });
  }

  const isInitialMount = useRef(true);
  const prevChatId = useRef(chatId);
  if (prevChatId.current !== chatId) {
  isInitialMount.current = true;
  prevChatId.current = chatId;
  }

  // Auto-scroll logic
  useEffect(() => {
  if (!containerRef.current) return;
  // If loading more, restore scroll position
  if (prevHeight > 0 && containerRef.current.scrollHeight > prevHeight) {
  containerRef.current.scrollTop = containerRef.current.scrollHeight - prevHeight;
  setPrevHeight(0);
  } else {
  // Once the user enters the app/chat, default state meets themselves at the bottom.
  // After that, no more auto scrolling unless user clicks button.
  if (firstUnreadIndex === -1 && isInitialMount.current) {
  messagesEndRef.current?.scrollIntoView({ behavior: 'auto' });
  setTimeout(() => {
  messagesEndRef.current?.scrollIntoView({ behavior: 'auto' });
  }, 100);
  isInitialMount.current = false;
  }
  }
  }, [messages, firstUnreadIndex]);

  const handleScroll = (e) => {
  if (e.target.scrollTop === 0 && hasMore) {
  setPrevHeight(e.target.scrollHeight);
  if (onLoadMore) onLoadMore();
  }
  };

  const unreadRef = useRef(null);
  useEffect(() => {
  if (firstUnreadIndex !== -1 && unreadRef.current) {
  console.log('[DEBUG] Scrolling to first unread message');
  unreadRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }
  }, [firstUnreadIndex]);

  const [selectionDropdownOpen, setSelectionDropdownOpen] = useState(false);
  const singleSelectedMessage = selectedMessages.size === 1 ? messages.find(m => m.id === [...selectedMessages][0]) : null;

  const handleReplySingle = () => {
  if (singleSelectedMessage && onReply) {
  let resolvedName = singleSelectedMessage.senderName;
  if (!resolvedName && membersMap) {
  const member = membersMap[singleSelectedMessage.from];
  resolvedName = typeof member === 'object' ? member.name : member;
  }
  if (!resolvedName && members) resolvedName = members.find(m => m.user_id === singleSelectedMessage.from)?.nickname;
  if (!resolvedName && !isGroup) resolvedName = singleSelectedMessage.from === userId ? (userName || 'You') : (chatName || 'Contact');
  if (!resolvedName) resolvedName = 'User';
  onReply({ id: singleSelectedMessage.id, text: singleSelectedMessage.text, from: singleSelectedMessage.from, fromName: resolvedName });
  }
  exitSelection();
  };

  const canDeleteAll = useMemo(() => {
  for (const msgId of selectedMessages) {
  const msg = messages.find(m => m.id === msgId);
  if (!msg) continue;
  // In 1v1 or group: Sender can always delete their own.
  // In group: Admin can delete anyone's message.
  const isOwner = msg.from === userId;
  const isAllowed = isOwner || (isGroup && isAdmin);
  if (!isAllowed) return false;
  }
  return true;
  }, [selectedMessages, messages, userId, isGroup, isAdmin]);

  return (
  <>
  {/* Selection Action Bar */}
  {selectionMode && (
  <div className="sticky top-0 z-40 bg-white  px-3 py-2 flex items-center justify-between border-b border-gray-100  animate-slide-down">
  <div className="flex items-center gap-3">
  <button onClick={exitSelection} className="p-1.5 rounded-lg hover:bg-gray-100  transition">
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-600 "><path d="M19 12H5" /><polyline points="12 19 5 12 12 5" /></svg>
  </button>
  <span className="font-bold text-base text-[var(--safari-green)]">{selectedMessages.size} selected</span>
  </div>
  <div className="flex items-center gap-0.5">
  {singleSelectedMessage && (
  <button onClick={handleReplySingle} className="p-2 rounded-lg hover:bg-gray-100  transition" title="Reply">
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-600 "><polyline points="9 17 4 12 9 7" /><path d="M20 18v-2a4 4 0 0 0-4-4H4" /></svg>
  </button>
  )}

  {singleSelectedMessage && (
  <div className="relative">
  <button onClick={() => setShowReactionPicker(!showReactionPicker)} className="p-2 rounded-lg hover:bg-gray-100  transition text-xl leading-none" title="React">
  😊
  </button>
  {showReactionPicker && (
  <div className="absolute top-full mt-2 right-0 z-50">
  <ReactionPicker onReact={handleReact} onClose={() => setShowReactionPicker(false)} />
  </div>
  )}
  </div>
  )}

  {singleSelectedMessage && (
  <button onClick={handlePinToggle} className="p-2 rounded-lg hover:bg-gray-100  transition" title={singleSelectedMessage.is_pinned ? 'Unpin' : 'Pin'}>
  <svg width="20" height="20" viewBox="0 0 24 24" fill={singleSelectedMessage.is_pinned ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={singleSelectedMessage.is_pinned ? 'text-[var(--safari-green)]' : 'text-gray-600 '}><path d="M12 17v5" /><path d="M5 17h14v-1.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V6h1V4H8v2h1v4.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24Z" /></svg>
  </button>
  )}

  <button onClick={handleBulkCopy} className="p-2 rounded-lg hover:bg-gray-100  transition" title="Copy">
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-600 "><rect x="9" y="9" width="13" height="13" rx="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" /></svg>
  </button>
  <button onClick={handleBulkForward} className="p-2 rounded-lg hover:bg-gray-100  transition" title="Forward">
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-600 "><polyline points="15 17 20 12 15 7" /><path d="M4 18v-2a4 4 0 0 1 4-4h12" /></svg>
  </button>

  {canDeleteAll && (
  <button onClick={handleBulkDelete} className="p-2 rounded-lg hover:bg-red-50  transition" title="Delete">
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-red-500"><path d="M3 6h18" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" /><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></svg>
  </button>
  )}

  {singleSelectedMessage && singleSelectedMessage.text && (
  <div className="relative">
  <button onClick={() => setSelectionDropdownOpen(!selectionDropdownOpen)} className="p-2 rounded-lg hover:bg-gray-100  transition" title="More">
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-600 "><circle cx="12" cy="12" r="1" /><circle cx="12" cy="5" r="1" /><circle cx="12" cy="19" r="1" /></svg>
  </button>
  {selectionDropdownOpen && (
  <div className="absolute right-0 top-full mt-1 w-52 bg-white  rounded-xl border border-gray-100  overflow-hidden z-50 animate-modal-pop">
  {onViewInfo && (
  <button className="w-full px-4 py-2.5 flex items-center gap-3 hover:bg-gray-50  transition text-left" onClick={() => { onViewInfo(singleSelectedMessage); exitSelection(); setSelectionDropdownOpen(false); }}>
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-400 shrink-0"><circle cx="12" cy="12" r="10" /><path d="M12 16v-4" /><path d="M12 8h.01" /></svg>
  <span className="text-sm font-medium text-gray-700 ">Message Info</span>
  </button>
  )}
  <button className="w-full px-4 py-2.5 flex items-center gap-3 hover:bg-gray-50  transition text-left" onClick={() => { playTTS(singleSelectedMessage.text, userVoice); exitSelection(); setSelectionDropdownOpen(false); }}>
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-400 shrink-0"><path d="M3 18v-6a9 9 0 0 1 18 0v6" /><path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3z" /><path d="M3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z" /></svg>
  <span className="text-sm font-medium text-gray-700 ">Read Aloud</span>
  </button>
  {singleSelectedMessage.from === userId && onEdit && (
  <button className="w-full px-4 py-2.5 flex items-center gap-3 hover:bg-gray-50  transition text-left" onClick={() => { onEdit(singleSelectedMessage); exitSelection(); setSelectionDropdownOpen(false); }}>
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-400 shrink-0"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>
  <span className="text-sm font-medium text-blue-600">Edit Message</span>
  </button>
  )}
  </div>
  )}
  </div>
  )}
  </div>
  </div>
  )}
  <div ref={containerRef} style={{ overflow: 'auto' }} onScroll={handleScroll} className="flex-1 min-h-0 p-4 overflow-auto bg-[#FCF9F1]  pattern-bg relative">
  {hasMore && <div className="text-center py-2 text-xs text-gray-500 animate-pulse">Loading history...</div>}

  {/* Empty state */}
  {messages.length === 0 && !hasMore && (
  <div className="flex flex-col items-center justify-center h-full opacity-60 select-none">
  <div className="text-6xl mb-4 opacity-30">💬</div>
  <p className="text-sm font-bold text-gray-500  uppercase tracking-widest">No messages yet</p>
  <p className="text-xs text-gray-400 mt-1">Say hello to start the conversation!</p>
  </div>
  )}

  {messages.map((msg, i) => {
  const isUnreadStart = i === firstUnreadIndex;
  const prevMsg = i > 0 ? messages[i - 1] : null;
  const nextMsg = i < messages.length - 1 ? messages[i + 1] : null;

  // ─── Date Separator Logic ───
  let showDateSeparator = false;
  if (i === 0) {
  showDateSeparator = true;
  } else if (prevMsg) {
  const currDate = new Date(msg.timestamp).toDateString();
  const prevDate = new Date(prevMsg.timestamp).toDateString();
  if (currDate !== prevDate) showDateSeparator = true;
  }

  const formatDateLabel = (ts) => {
  const d = new Date(ts);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  if (d.toDateString() === today.toDateString()) return 'Today';
  if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';
  return d.toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' });
  };

  // ─── Message Grouping Logic ───
  const isSameSenderAsPrev = prevMsg && prevMsg.from === msg.from && !showDateSeparator && !isUnreadStart;
  const isSameSenderAsNext = nextMsg && nextMsg.from === msg.from &&
  new Date(nextMsg.timestamp).toDateString() === new Date(msg.timestamp).toDateString();
  const isFirstInGroup = !isSameSenderAsPrev;
  const isLastInGroup = !isSameSenderAsNext;


  return (
  <React.Fragment key={msg.id || i}>
  {/* Date Separator */}
  {showDateSeparator && (
  <div className="flex items-center justify-center my-4 select-none">
  <span className="bg-white/80  backdrop-blur-sm text-[10px] font-black text-gray-500  uppercase tracking-[0.2em] px-4 py-1.5 rounded-full shadow-sm border border-gray-100 ">
  {formatDateLabel(msg.timestamp)}
  </span>
  </div>
  )}

  {isUnreadStart && (
  <div ref={unreadRef} className="w-full text-center my-4 relative">
  <span className="bg-green-100 text-green-800 text-xs px-3 py-1 rounded-full font-bold shadow-sm">
  {messages.slice(i).filter(m => {
  if (m.from === userId) return false;
  if (isGroup) {
  return !m.read_by || !m.read_by.some(r => (typeof r === 'object' ? r.userId : r) === userId);
  }
  return m.status !== 'read';
  }).length} Unread Messages
  </span>
  </div>
  )}

  <div style={{ marginBottom: isLastInGroup ? '6px' : '1px' }}>
  <MessageBubble
  message={msg}
  isSentByMe={msg.from === userId}
  onContextMenu={(e) => { e.preventDefault(); toggleSelect(msg.id, true); }}
  onViewMedia={onViewMedia}
  lazyLoadEnabled={user?.preferences?.media?.lazy_load_images}
  isGroup={isGroup}
  isAdmin={isAdmin}
  membersMap={membersMap}
  onShowReadBy={() => setReadByMessage(msg)}
  translatedText={translations && translations[msg.id]}
  userVoice={userVoice}
  onViewProfile={onViewProfile}
  isSelected={selectedMessages.has(msg.id)}
  onSelect={toggleSelect}
  selectionMode={selectionMode}
  onReply={onReply}
  bubbleDensity={isSameSenderAsPrev ? 'compact' : (user?.preferences?.ui?.bubbleDensity || 'comfortable')}
  showSenderName={isGroup && isFirstInGroup && msg.from !== userId}
  />
  </div>
  </React.Fragment>
  );
  })}
  {/* Typing indicator for group or chat */}
  {typingUsers && typingUsers.length > 0 && (
  <div id="typingIndicator" className="flex items-center gap-2 p-3 animate-fade-in mb-4">
  <div className="flex gap-1 items-center bg-gray-100  px-3 py-1.5 rounded-2xl rounded-tl-none shadow-sm">
  <div className="flex gap-1 mr-1">
  <span className="w-1 h-1 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
  <span className="w-1 h-1 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
  <span className="w-1 h-1 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
  </div>
  <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">
  {typingUsers.length === 1 ? `${typingUsers[0]} is typing...` : `${typingUsers.length} people are typing...`}
  </span>
  </div>
  </div>
  )}
  <div ref={messagesEndRef} />

  {/* Jump to latest button */}
  <JumpToLatest containerRef={containerRef} messagesEndRef={messagesEndRef} />
  </div>
  <ReadByModal
  readBy={readByMessage?.read_by}
  isOpen={!!readByMessage}
  onClose={() => setReadByMessage(null)}
  members={members}
  />
  {/* No context menu anymore */}
  </>
  );
};
const HOLD_MS = 280;
const TAP_MAX_MS = 180;

const CameraOverlay = ({ onClose, onCapture, photoOnly = false, allowMusic = false }) => {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const recorderRef = useRef(null);
  const chunksRef = useRef([]);
  const holdTimeoutRef = useRef(null);

  const pressStartRef = useRef(0);
  const pressIntentRef = useRef("idle"); // idle | photo | video
  const sessionRef = useRef(0);
  const mountedRef = useRef(true);

  const [capturedPhoto, setCapturedPhoto] = useState(null);
  const [capturedVideo, setCapturedVideo] = useState(null);
  const [isRecording, setIsRecording] = useState(false);
  const [cameraFacing, setCameraFacing] = useState("environment");
  const [isMobile, setIsMobile] = useState(false);
  const [previewReady, setPreviewReady] = useState(false);

  const [musicQuery, setMusicQuery] = useState('');
  const [musicResults, setMusicResults] = useState([]);
  const [selectedMusic, setSelectedMusic] = useState(null);
  const [showMusicSearch, setShowMusicSearch] = useState(false);
  const [playingMusicId, setPlayingMusicId] = useState(null);

  const audioRef = useRef(null);
  const previewAudioRef = useRef(null);

  const isPreview = Boolean(capturedPhoto || capturedVideo);

  useEffect(() => {
  return () => {
  if (previewAudioRef.current) previewAudioRef.current.pause();
  if (audioRef.current) audioRef.current.pause();
  };
  }, []);

  const searchMusic = async () => {
  if (!musicQuery.trim()) return;
  try {
  const res = await fetch(`https://itunes.apple.com/search?term=${encodeURIComponent(musicQuery)}&entity=song&limit=15`);
  const data = await res.json();
  const mapped = data.results.map(r => ({
  id: r.trackId,
  name: r.trackName,
  artist_name: r.artistName,
  audio: r.previewUrl
  }));
  setMusicResults(mapped);
  } catch (e) { console.error('Music search failed', e); }
  };

  const toggleMusicPreview = (e, m) => {
  e.stopPropagation();
  if (playingMusicId === m.id) {
  if (previewAudioRef.current) previewAudioRef.current.pause();
  setPlayingMusicId(null);
  } else {
  if (previewAudioRef.current) previewAudioRef.current.pause();
  const audio = new Audio(m.audio);
  previewAudioRef.current = audio;
  audio.play();
  setPlayingMusicId(m.id);
  audio.onended = () => setPlayingMusicId(null);
  }
  };

  useEffect(() => {
  const mobile =
  typeof window !== "undefined" &&
  (window.matchMedia?.("(pointer: coarse)")?.matches ||
  /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent));
  setIsMobile(Boolean(mobile));
  }, []);

  useEffect(() => {
  mountedRef.current = true;
  return () => {
  mountedRef.current = false;
  cleanupAll();
  };
  }, []);

  const cleanupTimers = () => {
  if (holdTimeoutRef.current) {
  clearTimeout(holdTimeoutRef.current);
  holdTimeoutRef.current = null;
  }
  };

  const stopStream = () => {
  const s = streamRef.current;
  if (s) {
  s.getTracks().forEach((track) => track.stop());
  streamRef.current = null;
  }
  if (videoRef.current) videoRef.current.srcObject = null;
  };

  const cleanupAll = () => {
  cleanupTimers();
  pressIntentRef.current = "idle";

  const recorder = recorderRef.current;
  if (recorder && recorder.state === "recording") {
  try {
  recorder.stop();
  } catch { }
  }

  setIsRecording(false);
  stopStream();
  if (audioRef.current) audioRef.current.pause();
  };

  const openCamera = async (facingMode) => {
  stopStream();

  try {
  const s = await navigator.mediaDevices.getUserMedia({
  video: { facingMode: { ideal: facingMode } },
  audio: true,
  });

  if (!mountedRef.current) {
  s.getTracks().forEach((t) => t.stop());
  return;
  }

  streamRef.current = s;
  if (videoRef.current) videoRef.current.srcObject = s;
  } catch {
  try {
  const s = await navigator.mediaDevices.getUserMedia({
  video: { facingMode: { ideal: facingMode } },
  });

  if (!mountedRef.current) {
  s.getTracks().forEach((t) => t.stop());
  return;
  }

  streamRef.current = s;
  if (videoRef.current) videoRef.current.srcObject = s;
  } catch (err) {
  Lexum.alert({
  title: "Camera Error",
  message: "Could not access camera: " + err.message,
  });
  onClose();
  }
  }
  };

  useEffect(() => {
  openCamera(cameraFacing);
  return () => cleanupAll();
  }, [cameraFacing]);

  useEffect(() => {
  if (!isPreview) return;
  setPreviewReady(false);
  const t = setTimeout(() => setPreviewReady(true), 250);
  return () => clearTimeout(t);
  }, [isPreview]);

  const stopRecording = () => {
  const recorder = recorderRef.current;
  if (recorder && recorder.state === "recording") {
  setIsRecording(false);
  try {
  recorder.stop();
  } catch {
  stopStream();
  }
  } else {
  setIsRecording(false);
  stopStream();
  }
  if (audioRef.current) audioRef.current.pause();
  };

  const getBestMimeType = () => {
  if (!window.MediaRecorder) return "";
  const list = [
  "video/webm;codecs=vp9",
  "video/webm;codecs=vp8",
  "video/webm",
  ];
  return list.find((t) => MediaRecorder.isTypeSupported(t)) || "";
  };

  const startRecording = () => {
  if (photoOnly || !streamRef.current || isRecording) return;

  if (selectedMusic && audioRef.current) {
  audioRef.current.currentTime = 0;
  audioRef.current.play().catch(() => { });
  }

  try {
  const sessionId = ++sessionRef.current;
  chunksRef.current = [];

  const options = {};
  const mimeType = getBestMimeType();
  if (mimeType) options.mimeType = mimeType;

  const recorder = new MediaRecorder(streamRef.current, options);
  recorderRef.current = recorder;

  recorder.ondataavailable = (e) => {
  if (e.data && e.data.size > 0) chunksRef.current.push(e.data);
  };

  recorder.onstop = () => {
  if (sessionRef.current !== sessionId) return;

  const blob = new Blob(chunksRef.current, {
  type: recorder.mimeType || "video/webm",
  });

  const file = new File([blob], `video_${Date.now()}.webm`, {
  type: blob.type || "video/webm",
  });

  const url = URL.createObjectURL(blob);
  setCapturedVideo({ file, url });
  setIsRecording(false);
  stopStream();
  };

  recorder.start(100);
  setIsRecording(true);
  } catch (e) {
  console.error(e);
  Lexum.alert({
  title: "Recording Error",
  message: "Video recording is not supported on this device or browser.",
  });
  }
  };

  const takePhoto = () => {
  if (!videoRef.current || !videoRef.current.videoWidth) return;

  const canvas = document.createElement("canvas");
  canvas.width = videoRef.current.videoWidth;
  canvas.height = videoRef.current.videoHeight;

  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
  setCapturedPhoto(canvas.toDataURL("image/jpeg", 0.92));
  stopStream();
  };

  const beginPress = (e) => {
  if (photoOnly) {
  takePhoto();
  return;
  }

  e.preventDefault();
  e.stopPropagation();

  if (isRecording) {
  stopRecording();
  return;
  }

  pressStartRef.current = Date.now();
  pressIntentRef.current = "photo";

  cleanupTimers();

  holdTimeoutRef.current = setTimeout(() => {
  pressIntentRef.current = "video";
  startRecording();
  }, HOLD_MS);

  try {
  e.currentTarget.setPointerCapture?.(e.pointerId);
  } catch { }
  };

  const endPress = (e) => {
  if (photoOnly) return;

  e.preventDefault();
  e.stopPropagation();

  cleanupTimers();

  if (isRecording || pressIntentRef.current === "video") {
  // Do not stop recording on release! It stops when they tap again.
  return;
  }

  const duration = Date.now() - pressStartRef.current;

  if (duration <= TAP_MAX_MS) {
  pressIntentRef.current = "idle";
  takePhoto();
  return;
  }

  pressIntentRef.current = "idle";
  };

  const closeOverlay = () => {
  cleanupAll();
  onClose();
  };

  const resetPreview = async () => {
  if (capturedVideo?.url) URL.revokeObjectURL(capturedVideo.url);

  setCapturedPhoto(null);
  setCapturedVideo(null);
  setPreviewReady(false);

  if (!photoOnly) {
  await openCamera(cameraFacing);
  }
  };

  const savePhoto = async () => {
  if (!capturedPhoto || !previewReady) return;

  try {
  const res = await fetch(capturedPhoto);
  const blob = await res.blob();
  const file = new File([blob], `photo_${Date.now()}.jpg`, {
  type: "image/jpeg",
  });

  if (capturedVideo?.url) URL.revokeObjectURL(capturedVideo.url);
  cleanupAll();
  onCapture({ file, music: selectedMusic });
  onClose();
  } catch (e) {
  console.error(e);
  Lexum.alert({ title: "Error", message: "Could not save photo" });
  }
  };

  const sendVideo = () => {
  if (!capturedVideo || !previewReady) return;

  cleanupAll();
  onCapture({ file: capturedVideo.file, music: selectedMusic });
  onClose();
  };

  const switchCamera = () => {
  if (!isMobile || photoOnly || isRecording) return;
  setCameraFacing((prev) => (prev === "environment" ? "user" : "environment"));
  };

  return (
  <div className="fixed inset-0 z-[9999] bg-black flex items-center justify-center">
  <div className="relative flex h-full w-full flex-col overflow-hidden bg-black md:h-[min(100vh,920px)] md:w-[min(100vw,560px)] md:rounded-[28px] md:shadow-2xl">
  {isPreview ? (
  <>
  <div className="absolute top-0 left-0 right-0 z-20 flex items-center justify-between p-4 bg-gradient-to-b from-black/70 to-transparent">
  <button
  onClick={resetPreview}
  className="h-11 w-11 rounded-full bg-black/45 text-white flex items-center justify-center hover:bg-black/65 transition active:scale-95"
  aria-label="Close preview"
  >
  {Icons.x}
  </button>
  </div>

  <div className="flex-1 min-h-0 bg-black flex items-center justify-center overflow-hidden">
  {capturedPhoto ? (
  <img
  src={capturedPhoto}
  alt="Captured"
  className="max-h-full max-w-full object-contain select-none"
  />
  ) : (
  <video
  src={capturedVideo.url}
  controls
  autoPlay
  loop
  playsInline
  className="max-h-full max-w-full object-contain"
  />
  )}
  </div>

  <div className="pointer-events-none absolute bottom-0 left-0 right-0 z-20 bg-gradient-to-t from-black/70 via-black/25 to-transparent px-4 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-12">
  <div className="pointer-events-auto flex justify-center">
  <button
  disabled={!previewReady}
  onClick={capturedPhoto ? savePhoto : sendVideo}
  className={`rounded-full px-8 py-3 text-base font-semibold text-white shadow-lg transition active:scale-95 ${previewReady
  ? "bg-green-500 hover:bg-green-600"
  : "bg-green-500/60 cursor-not-allowed"
  }`}
  >
  Done
  </button>
  </div>
  </div>
  </>
  ) : (
  <>
  <div className="absolute top-0 left-0 right-0 z-20 flex items-center justify-between p-4 bg-gradient-to-b from-black/70 to-transparent">
  <button
  onClick={closeOverlay}
  className="h-11 w-11 rounded-full bg-black/45 text-white flex items-center justify-center hover:bg-black/65 transition active:scale-95"
  aria-label="Close camera"
  >
  {Icons.x}
  </button>

  <div className="flex gap-2">
  {allowMusic && (
  selectedMusic ? (
  <div className="flex items-center gap-2 bg-white/20 backdrop-blur-md rounded-full px-3 py-1.5 text-white shadow-lg border border-white/20">
  <button onClick={(e) => toggleMusicPreview(e, selectedMusic)} className="w-6 h-6 bg-white/20 rounded-full flex items-center justify-center shrink-0 hover:bg-white/40 transition">
  {playingMusicId === selectedMusic.id ? (
  <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="currentColor" className="text-white"><rect x="6" y="4" width="4" height="16"></rect><rect x="14" y="4" width="4" height="16"></rect></svg>
  ) : (
  <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="currentColor" className="text-white"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>
  )}
  </button>
  <span className="text-xs font-bold truncate tracking-tight max-w-[100px]">{selectedMusic.name}</span>
  <button onClick={() => { setSelectedMusic(null); if (previewAudioRef.current) previewAudioRef.current.pause(); setPlayingMusicId(null); }} className="ml-1 opacity-70 hover:opacity-100"><svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg></button>
  </div>
  ) : (
  <button
  onClick={() => setShowMusicSearch(true)}
  className="h-11 px-4 rounded-full bg-black/45 text-white text-sm font-medium hover:bg-black/65 transition active:scale-95 flex items-center gap-2"
  >
  🎵 Music
  </button>
  )
  )}

  {isMobile && !photoOnly && (
  <button
  onClick={switchCamera}
  className="h-11 px-4 rounded-full bg-black/45 text-white text-sm font-medium hover:bg-black/65 transition active:scale-95"
  aria-label="Switch camera"
  >
  {cameraFacing === "environment" ? "Front" : "Back"}
  </button>
  )}
  </div>
  </div>

  <div className="relative flex-1 min-h-0 bg-black overflow-hidden">
  <video
  ref={videoRef}
  autoPlay
  playsInline
  muted
  className="absolute inset-0 h-full w-full object-cover md:object-contain"
  />
  {isRecording && (
  <div className="absolute top-16 right-6 z-20 flex items-center gap-2 rounded-full bg-black/40 px-3 py-2 text-white backdrop-blur-sm">
  <span className="h-3 w-3 rounded-full bg-red-500 animate-pulse" />
  <span className="text-xs font-medium">Recording</span>
  </div>
  )}
  </div>

  <div className="absolute bottom-0 left-0 right-0 z-20 bg-gradient-to-t from-black/75 via-black/20 to-transparent px-4 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-12">
  <div className="flex flex-col items-center gap-3">
  <div className="text-white/75 text-xs font-medium">
  Tap for photo, hold for video
  </div>

  <button
  onPointerDown={beginPress}
  onPointerUp={endPress}
  onPointerCancel={endPress}
  onContextMenu={(e) => e.preventDefault()}
  style={{ touchAction: "none" }}
  className={`h-20 w-20 rounded-full border-4 flex items-center justify-center transition-transform active:scale-95 ${isRecording ? "border-red-500" : "border-white/90 bg-transparent"
  }`}
  aria-label="Capture"
  >
  <div
  className={`transition-all ${isRecording
  ? "h-8 w-8 rounded-md bg-red-500"
  : "h-14 w-14 rounded-full bg-white/90"
  }`}
  />
  </button>
  </div>
  </div>
  <AnimatePresence>
  {showMusicSearch && (
  <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} className="absolute inset-0 bg-white  z-50 flex flex-col">
  <div className="p-4 flex items-center gap-3 border-b border-gray-100 ">
  <button onClick={() => setShowMusicSearch(false)} className="text-gray-500 ">{Icons.arrowLeft}</button>
  <input value={musicQuery} onChange={e => setMusicQuery(e.target.value)} onKeyDown={e => e.key === 'Enter' && searchMusic()} placeholder="Search Music..." className="flex-1 bg-transparent outline-none font-medium " autoFocus />
  <button onClick={searchMusic} className="text-[#E64A19] font-bold text-sm uppercase tracking-widest px-2">Search</button>
  </div>
  <div className="flex-1 overflow-y-auto p-2">
  {musicResults.map(m => (
  <div key={m.id} onClick={() => { setSelectedMusic(m); setShowMusicSearch(false); if (previewAudioRef.current) previewAudioRef.current.pause(); setPlayingMusicId(null); }} className="flex items-center gap-3 p-3 hover:bg-gray-50  rounded-xl cursor-pointer transition">
  <div onClick={(e) => toggleMusicPreview(e, m)} className="w-10 h-10 bg-gray-200  rounded-lg flex items-center justify-center shrink-0 hover:bg-gray-300  transition">
  {playingMusicId === m.id ? (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="currentColor" className="text-[var(--safari-green)]"><rect x="6" y="4" width="4" height="16"></rect><rect x="14" y="4" width="4" height="16"></rect></svg>
  ) : (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="currentColor" className="text-gray-500"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>
  )}
  </div>
  <div className="flex-1 overflow-hidden">
  <h4 className="font-bold text-sm text-gray-900  truncate">{m.name}</h4>
  <p className="text-xs text-gray-500  truncate">{m.artist_name}</p>
  </div>
  </div>
  ))}
  {musicResults.length === 0 && musicQuery && (
  <div className="text-center text-gray-400 text-sm mt-10">Press Search to find music</div>
  )}
  </div>
  </motion.div>
  )}
  </AnimatePresence>

  </>
  )}
  </div>
  </div>
  );
};



const GIPHY_API_KEY = "1PsuVrcwCRiOYQEfqgPOd9kVuoRmuhai";
const GIPHY_API_BASE = "https://api.giphy.com/v1/gifs";
const MAX_TEXTAREA_HEIGHT = 180;

const ALL_EMOJIS = [
  // Smileys & Emotion
  { emoji: "😀", name: "grinning face", tags: ["happy", "smile", "grin"] },
  { emoji: "😃", name: "grinning face with big eyes", tags: ["happy", "smile"] },
  { emoji: "😄", name: "grinning face with smiling eyes", tags: ["happy", "smile", "joy"] },
  { emoji: "😁", name: "beaming face with smiling eyes", tags: ["grin", "happy"] },
  { emoji: "😆", name: "grinning squinting face", tags: ["laugh", "funny"] },
  { emoji: "😅", name: "grinning face with sweat", tags: ["nervous", "sweat"] },
  { emoji: "🤣", name: "rolling on the floor laughing", tags: ["rofl", "laugh", "lol"] },
  { emoji: "😂", name: "face with tears of joy", tags: ["lol", "laugh", "cry", "funny"] },
  { emoji: "🙂", name: "slightly smiling face", tags: ["smile", "happy"] },
  { emoji: "🙃", name: "upside-down face", tags: ["silly", "sarcasm"] },
  { emoji: "😉", name: "winking face", tags: ["wink", "flirt"] },
  { emoji: "😊", name: "smiling face with smiling eyes", tags: ["happy", "blush"] },
  { emoji: "😇", name: "smiling face with halo", tags: ["angel", "innocent"] },
  { emoji: "🥰", name: "smiling face with hearts", tags: ["love", "heart", "crush"] },
  { emoji: "😍", name: "smiling face with heart-eyes", tags: ["love", "heart", "adore"] },
  { emoji: "🤩", name: "star-struck", tags: ["wow", "star", "amazing"] },
  { emoji: "😘", name: "face blowing a kiss", tags: ["kiss", "love", "flirt"] },
  { emoji: "😗", name: "kissing face", tags: ["kiss"] },
  { emoji: "😚", name: "kissing face with closed eyes", tags: ["kiss"] },
  { emoji: "😙", name: "kissing face with smiling eyes", tags: ["kiss", "happy"] },
  { emoji: "🥲", name: "smiling face with tear", tags: ["happy", "sad", "bittersweet"] },
  { emoji: "😋", name: "face savoring food", tags: ["yummy", "food", "delicious"] },
  { emoji: "😛", name: "face with tongue", tags: ["tongue", "silly"] },
  { emoji: "😜", name: "winking face with tongue", tags: ["silly", "wink", "tongue"] },
  { emoji: "🤪", name: "zany face", tags: ["crazy", "silly", "wild"] },
  { emoji: "😝", name: "squinting face with tongue", tags: ["tongue", "funny"] },
  { emoji: "🤑", name: "money-mouth face", tags: ["money", "rich", "greedy"] },
  { emoji: "🤗", name: "hugging face", tags: ["hug", "warm", "love"] },
  { emoji: "🤭", name: "face with hand over mouth", tags: ["oops", "secret", "surprise"] },
  { emoji: "🤫", name: "shushing face", tags: ["shh", "quiet", "secret"] },
  { emoji: "🤔", name: "thinking face", tags: ["think", "hmm", "wonder"] },
  { emoji: "🤐", name: "zipper-mouth face", tags: ["silent", "secret", "zip"] },
  { emoji: "🤨", name: "face with raised eyebrow", tags: ["doubt", "skeptical", "suspicious"] },
  { emoji: "😐", name: "neutral face", tags: ["neutral", "meh", "blank"] },
  { emoji: "😑", name: "expressionless face", tags: ["blank", "expressionless", "meh"] },
  { emoji: "😶", name: "face without mouth", tags: ["silent", "speechless"] },
  { emoji: "😏", name: "smirking face", tags: ["smirk", "sly", "flirt"] },
  { emoji: "😒", name: "unamused face", tags: ["unamused", "bored", "whatever"] },
  { emoji: "🙄", name: "face with rolling eyes", tags: ["eyeroll", "whatever", "annoyed"] },
  { emoji: "😬", name: "grimacing face", tags: ["grimace", "awkward", "yikes"] },
  { emoji: "🤥", name: "lying face", tags: ["lie", "pinocchio"] },
  { emoji: "😌", name: "relieved face", tags: ["relieved", "peaceful", "calm"] },
  { emoji: "😔", name: "pensive face", tags: ["sad", "pensive", "thinking"] },
  { emoji: "😪", name: "sleepy face", tags: ["sleepy", "tired"] },
  { emoji: "🤤", name: "drooling face", tags: ["drool", "food", "yummy"] },
  { emoji: "😴", name: "sleeping face", tags: ["sleep", "zzz", "tired"] },
  { emoji: "😷", name: "face with medical mask", tags: ["sick", "mask", "ill"] },
  { emoji: "🤒", name: "face with thermometer", tags: ["sick", "fever", "ill"] },
  { emoji: "🤕", name: "face with head-bandage", tags: ["hurt", "injured", "bandage"] },
  { emoji: "🤢", name: "nauseated face", tags: ["sick", "nausea", "gross"] },
  { emoji: "🤮", name: "face vomiting", tags: ["vomit", "sick", "gross"] },
  { emoji: "🤧", name: "sneezing face", tags: ["sneeze", "sick", "cold"] },
  { emoji: "🥵", name: "hot face", tags: ["hot", "fire", "sweating"] },
  { emoji: "🥶", name: "cold face", tags: ["cold", "freezing", "ice"] },
  { emoji: "🥴", name: "woozy face", tags: ["dizzy", "woozy", "drunk"] },
  { emoji: "😵", name: "dizzy face", tags: ["dizzy", "confused", "shocked"] },
  { emoji: "🤯", name: "exploding head", tags: ["mind blown", "wow", "shock"] },
  { emoji: "🤠", name: "cowboy hat face", tags: ["cowboy", "western", "cool"] },
  { emoji: "🥳", name: "partying face", tags: ["party", "celebrate", "fun"] },
  { emoji: "🥸", name: "disguised face", tags: ["disguise", "glasses", "secret"] },
  { emoji: "😎", name: "smiling face with sunglasses", tags: ["cool", "sunglasses", "chill"] },
  { emoji: "🤓", name: "nerd face", tags: ["nerd", "geek", "smart"] },
  { emoji: "🧐", name: "face with monocle", tags: ["monocle", "fancy", "smart"] },
  { emoji: "😕", name: "confused face", tags: ["confused", "unsure", "hmm"] },
  { emoji: "😟", name: "worried face", tags: ["worried", "anxious", "concerned"] },
  { emoji: "🙁", name: "slightly frowning face", tags: ["sad", "frown"] },
  { emoji: "☹️", name: "frowning face", tags: ["sad", "frown", "unhappy"] },
  { emoji: "😮", name: "face with open mouth", tags: ["surprised", "wow", "shock"] },
  { emoji: "😯", name: "hushed face", tags: ["surprised", "shocked", "quiet"] },
  { emoji: "😲", name: "astonished face", tags: ["wow", "shocked", "astonished"] },
  { emoji: "😳", name: "flushed face", tags: ["flushed", "embarrassed", "shy"] },
  { emoji: "🥺", name: "pleading face", tags: ["plead", "puppy eyes", "cute", "sad"] },
  { emoji: "😦", name: "frowning face with open mouth", tags: ["sad", "shocked"] },
  { emoji: "😧", name: "anguished face", tags: ["anguish", "pain", "distress"] },
  { emoji: "😨", name: "fearful face", tags: ["fear", "scared", "afraid"] },
  { emoji: "😰", name: "anxious face with sweat", tags: ["nervous", "sweat", "anxious"] },
  { emoji: "😥", name: "sad but relieved face", tags: ["sad", "relieved", "whew"] },
  { emoji: "😢", name: "crying face", tags: ["cry", "sad", "tear"] },
  { emoji: "😭", name: "loudly crying face", tags: ["cry", "sob", "sad", "tears"] },
  { emoji: "😱", name: "face screaming in fear", tags: ["scream", "scared", "horror"] },
  { emoji: "😖", name: "confounded face", tags: ["confused", "frustrated", "stressed"] },
  { emoji: "😣", name: "persevering face", tags: ["struggle", "persevere", "hard"] },
  { emoji: "😞", name: "disappointed face", tags: ["disappointed", "sad", "down"] },
  { emoji: "😓", name: "downcast face with sweat", tags: ["disappointed", "hard", "sweat"] },
  { emoji: "😩", name: "weary face", tags: ["tired", "weary", "exhausted"] },
  { emoji: "😫", name: "tired face", tags: ["tired", "exhausted", "weary"] },
  { emoji: "🥱", name: "yawning face", tags: ["yawn", "tired", "bored"] },
  { emoji: "😤", name: "face with steam from nose", tags: ["angry", "frustrated", "steam"] },
  { emoji: "😡", name: "enraged face", tags: ["angry", "rage", "mad"] },
  { emoji: "😠", name: "angry face", tags: ["angry", "mad", "grumpy"] },
  { emoji: "🤬", name: "face with symbols on mouth", tags: ["angry", "swear", "rage"] },
  { emoji: "😈", name: "smiling face with horns", tags: ["devil", "evil", "mischievous"] },
  { emoji: "👿", name: "angry face with horns", tags: ["devil", "angry", "evil"] },
  { emoji: "💀", name: "skull", tags: ["dead", "skull", "death"] },
  { emoji: "☠️", name: "skull and crossbones", tags: ["dead", "danger", "skull"] },
  { emoji: "💩", name: "pile of poo", tags: ["poop", "funny", "crap"] },
  { emoji: "🤡", name: "clown face", tags: ["clown", "silly", "circus"] },
  { emoji: "👹", name: "ogre", tags: ["monster", "ogre", "scary"] },
  { emoji: "👺", name: "goblin", tags: ["goblin", "scary", "red"] },
  { emoji: "👻", name: "ghost", tags: ["ghost", "halloween", "boo"] },
  { emoji: "👽", name: "alien", tags: ["alien", "space", "ufo"] },
  { emoji: "👾", name: "alien monster", tags: ["alien", "game", "monster"] },
  { emoji: "🤖", name: "robot", tags: ["robot", "ai", "machine"] },
  // Hands & Body
  { emoji: "👋", name: "waving hand", tags: ["wave", "hi", "hello", "bye"] },
  { emoji: "🤚", name: "raised back of hand", tags: ["hand", "stop", "hi"] },
  { emoji: "🖐️", name: "hand with fingers splayed", tags: ["hand", "five", "hi"] },
  { emoji: "✋", name: "raised hand", tags: ["stop", "high five", "hand"] },
  { emoji: "🖖", name: "vulcan salute", tags: ["spock", "vulcan", "star trek"] },
  { emoji: "🫱", name: "rightwards hand", tags: ["hand", "right"] },
  { emoji: "🫲", name: "leftwards hand", tags: ["hand", "left"] },
  { emoji: "🫳", name: "palm down hand", tags: ["hand", "down"] },
  { emoji: "🫴", name: "palm up hand", tags: ["hand", "up", "offer"] },
  { emoji: "👌", name: "OK hand", tags: ["ok", "perfect", "fine"] },
  { emoji: "🤏", name: "pinching hand", tags: ["small", "tiny", "pinch"] },
  { emoji: "✌️", name: "victory hand", tags: ["peace", "victory", "v"] },
  { emoji: "🤞", name: "crossed fingers", tags: ["luck", "fingers crossed", "hope"] },
  { emoji: "🫰", name: "hand with index finger and thumb crossed", tags: ["snap", "cute"] },
  { emoji: "🤟", name: "love-you gesture", tags: ["love", "ily", "rock"] },
  { emoji: "🤘", name: "sign of the horns", tags: ["rock", "metal", "cool"] },
  { emoji: "🤙", name: "call me hand", tags: ["call", "shaka", "phone"] },
  { emoji: "👈", name: "backhand index pointing left", tags: ["point", "left", "this"] },
  { emoji: "👉", name: "backhand index pointing right", tags: ["point", "right", "this"] },
  { emoji: "👆", name: "backhand index pointing up", tags: ["point", "up"] },
  { emoji: "🖕", name: "middle finger", tags: ["middle", "rude", "finger"] },
  { emoji: "👇", name: "backhand index pointing down", tags: ["point", "down"] },
  { emoji: "☝️", name: "index pointing up", tags: ["one", "point", "up"] },
  { emoji: "🫵", name: "index pointing at the viewer", tags: ["you", "point"] },
  { emoji: "👍", name: "thumbs up", tags: ["good", "yes", "like", "approve"] },
  { emoji: "👎", name: "thumbs down", tags: ["bad", "no", "dislike"] },
  { emoji: "✊", name: "raised fist", tags: ["fist", "strong", "power"] },
  { emoji: "👊", name: "oncoming fist", tags: ["punch", "fist", "fight"] },
  { emoji: "🤛", name: "left-facing fist", tags: ["fist bump", "left"] },
  { emoji: "🤜", name: "right-facing fist", tags: ["fist bump", "right"] },
  { emoji: "👏", name: "clapping hands", tags: ["clap", "applause", "bravo"] },
  { emoji: "🙌", name: "raising hands", tags: ["celebrate", "yes", "raise"] },
  { emoji: "🫶", name: "heart hands", tags: ["love", "heart", "hands"] },
  { emoji: "👐", name: "open hands", tags: ["open", "hug", "welcome"] },
  { emoji: "🤲", name: "palms up together", tags: ["pray", "hands", "please"] },
  { emoji: "🤝", name: "handshake", tags: ["deal", "handshake", "agree"] },
  { emoji: "🙏", name: "folded hands", tags: ["pray", "please", "thanks", "namaste"] },
  { emoji: "✍️", name: "writing hand", tags: ["write", "pen", "note"] },
  { emoji: "💅", name: "nail polish", tags: ["nails", "fancy", "sassy"] },
  { emoji: "🤳", name: "selfie", tags: ["selfie", "phone", "photo"] },
  { emoji: "💪", name: "flexed biceps", tags: ["strong", "muscle", "gym"] },
  { emoji: "🦾", name: "mechanical arm", tags: ["robot", "arm", "strong"] },
  { emoji: "🦿", name: "mechanical leg", tags: ["robot", "leg"] },
  { emoji: "🦵", name: "leg", tags: ["leg", "kick"] },
  { emoji: "🦶", name: "foot", tags: ["foot", "feet"] },
  { emoji: "👂", name: "ear", tags: ["ear", "listen", "hearing"] },
  { emoji: "🦻", name: "ear with hearing aid", tags: ["ear", "hearing aid"] },
  { emoji: "👃", name: "nose", tags: ["nose", "smell"] },
  { emoji: "🫀", name: "anatomical heart", tags: ["heart", "organ", "medical"] },
  { emoji: "🫁", name: "lungs", tags: ["lungs", "breathe", "medical"] },
  { emoji: "🧠", name: "brain", tags: ["brain", "smart", "think"] },
  { emoji: "🦷", name: "tooth", tags: ["tooth", "teeth", "dental"] },
  { emoji: "🦴", name: "bone", tags: ["bone", "skeleton"] },
  { emoji: "👁️", name: "eye", tags: ["eye", "watch", "see"] },
  { emoji: "👀", name: "eyes", tags: ["eyes", "look", "watch", "stare"] },
  { emoji: "👅", name: "tongue", tags: ["tongue", "taste"] },
  { emoji: "👄", name: "mouth", tags: ["mouth", "lips", "kiss"] },
  { emoji: "🫦", name: "biting lip", tags: ["bite", "lip", "nervous", "flirt"] },
  // Hearts & Love
  { emoji: "❤️", name: "red heart", tags: ["love", "heart", "red"] },
  { emoji: "🧡", name: "orange heart", tags: ["love", "heart", "orange"] },
  { emoji: "💛", name: "yellow heart", tags: ["love", "heart", "yellow", "friend"] },
  { emoji: "💚", name: "green heart", tags: ["love", "heart", "green", "nature"] },
  { emoji: "💙", name: "blue heart", tags: ["love", "heart", "blue"] },
  { emoji: "💜", name: "purple heart", tags: ["love", "heart", "purple"] },
  { emoji: "🖤", name: "black heart", tags: ["love", "heart", "black", "dark"] },
  { emoji: "🤍", name: "white heart", tags: ["love", "heart", "white", "pure"] },
  { emoji: "🤎", name: "brown heart", tags: ["love", "heart", "brown"] },
  { emoji: "💔", name: "broken heart", tags: ["heartbreak", "sad", "broken"] },
  { emoji: "❤️‍🔥", name: "heart on fire", tags: ["passion", "love", "fire"] },
  { emoji: "❤️‍🩹", name: "mending heart", tags: ["healing", "broken", "love"] },
  { emoji: "❣️", name: "heart exclamation", tags: ["love", "heart", "exclamation"] },
  { emoji: "💕", name: "two hearts", tags: ["love", "hearts"] },
  { emoji: "💞", name: "revolving hearts", tags: ["love", "hearts", "romance"] },
  { emoji: "💓", name: "beating heart", tags: ["love", "heart", "beat"] },
  { emoji: "💗", name: "growing heart", tags: ["love", "heart", "grow"] },
  { emoji: "💖", name: "sparkling heart", tags: ["love", "heart", "sparkle"] },
  { emoji: "💘", name: "heart with arrow", tags: ["love", "cupid", "arrow"] },
  { emoji: "💝", name: "heart with ribbon", tags: ["love", "gift", "heart"] },
  { emoji: "💟", name: "heart decoration", tags: ["love", "heart", "purple"] },
  { emoji: "☮️", name: "peace symbol", tags: ["peace", "sign"] },
  { emoji: "✝️", name: "latin cross", tags: ["cross", "christian", "religion"] },
  { emoji: "☯️", name: "yin yang", tags: ["balance", "yin yang", "zen"] },
  { emoji: "🕊️", name: "dove", tags: ["peace", "dove", "bird"] },
  // Activities & Fun
  { emoji: "🎉", name: "party popper", tags: ["party", "celebrate", "confetti", "congrats"] },
  { emoji: "🎊", name: "confetti ball", tags: ["party", "celebrate", "confetti"] },
  { emoji: "🎈", name: "balloon", tags: ["balloon", "party", "celebrate"] },
  { emoji: "🎁", name: "wrapped gift", tags: ["gift", "present", "birthday"] },
  { emoji: "🎀", name: "ribbon", tags: ["ribbon", "gift", "bow"] },
  { emoji: "🎂", name: "birthday cake", tags: ["birthday", "cake", "celebrate"] },
  { emoji: "🎆", name: "fireworks", tags: ["fireworks", "celebrate", "new year"] },
  { emoji: "🎇", name: "sparkler", tags: ["sparkler", "celebrate", "new year"] },
  { emoji: "✨", name: "sparkles", tags: ["sparkle", "magic", "stars", "shine"] },
  { emoji: "🌟", name: "glowing star", tags: ["star", "shine", "wow"] },
  { emoji: "⭐", name: "star", tags: ["star", "favorite", "good"] },
  { emoji: "💫", name: "dizzy", tags: ["dizzy", "star", "sparkle"] },
  { emoji: "🔥", name: "fire", tags: ["fire", "hot", "lit", "flame"] },
  { emoji: "💥", name: "collision", tags: ["explosion", "bang", "boom"] },
  { emoji: "💢", name: "anger symbol", tags: ["angry", "mad"] },
  { emoji: "💦", name: "sweat droplets", tags: ["sweat", "water", "splash"] },
  { emoji: "💧", name: "droplet", tags: ["water", "drop", "rain"] },
  { emoji: "🏆", name: "trophy", tags: ["trophy", "win", "gold", "champion"] },
  { emoji: "🥇", name: "1st place medal", tags: ["gold", "first", "win", "medal"] },
  { emoji: "🥈", name: "2nd place medal", tags: ["silver", "second", "medal"] },
  { emoji: "🥉", name: "3rd place medal", tags: ["bronze", "third", "medal"] },
  { emoji: "🏅", name: "sports medal", tags: ["medal", "win", "sports"] },
  { emoji: "🎯", name: "bullseye", tags: ["target", "bullseye", "aim", "goal"] },
  { emoji: "🎮", name: "video game", tags: ["game", "gaming", "play", "controller"] },
  { emoji: "🕹️", name: "joystick", tags: ["game", "joystick", "arcade"] },
  { emoji: "🎲", name: "game die", tags: ["dice", "game", "random"] },
  { emoji: "🧩", name: "puzzle piece", tags: ["puzzle", "game", "piece"] },
  { emoji: "♟️", name: "chess pawn", tags: ["chess", "game", "strategy"] },
  { emoji: "🎭", name: "performing arts", tags: ["theater", "drama", "art"] },
  { emoji: "🎨", name: "artist palette", tags: ["art", "paint", "creative"] },
  { emoji: "🎬", name: "clapper board", tags: ["movie", "film", "action"] },
  { emoji: "🎤", name: "microphone", tags: ["mic", "sing", "music", "karaoke"] },
  { emoji: "🎧", name: "headphone", tags: ["music", "headphones", "listen"] },
  { emoji: "🎵", name: "musical note", tags: ["music", "note", "song"] },
  { emoji: "🎶", name: "musical notes", tags: ["music", "notes", "song"] },
  { emoji: "🎸", name: "guitar", tags: ["guitar", "music", "rock"] },
  { emoji: "🎹", name: "musical keyboard", tags: ["piano", "keyboard", "music"] },
  { emoji: "🥁", name: "drum", tags: ["drum", "music", "beat"] },
  { emoji: "🎺", name: "trumpet", tags: ["trumpet", "music", "jazz"] },
  { emoji: "🎻", name: "violin", tags: ["violin", "music", "classical"] },
  // Sports
  { emoji: "⚽", name: "soccer ball", tags: ["soccer", "football", "ball", "sport"] },
  { emoji: "🏀", name: "basketball", tags: ["basketball", "ball", "sport", "nba"] },
  { emoji: "🏈", name: "american football", tags: ["football", "nfl", "sport"] },
  { emoji: "⚾", name: "baseball", tags: ["baseball", "sport", "ball"] },
  { emoji: "🥎", name: "softball", tags: ["softball", "sport"] },
  { emoji: "🎾", name: "tennis", tags: ["tennis", "sport", "ball"] },
  { emoji: "🏐", name: "volleyball", tags: ["volleyball", "sport", "ball"] },
  { emoji: "🏉", name: "rugby football", tags: ["rugby", "sport"] },
  { emoji: "🥏", name: "flying disc", tags: ["frisbee", "disc", "sport"] },
  { emoji: "🎱", name: "pool 8 ball", tags: ["pool", "billiards", "ball"] },
  { emoji: "🪃", name: "boomerang", tags: ["boomerang", "throw"] },
  { emoji: "🏓", name: "ping pong", tags: ["pingpong", "tabletennis", "sport"] },
  { emoji: "🏸", name: "badminton", tags: ["badminton", "sport"] },
  { emoji: "🥊", name: "boxing glove", tags: ["boxing", "fight", "sport"] },
  { emoji: "🥋", name: "martial arts uniform", tags: ["karate", "martial arts", "sport"] },
  { emoji: "⛳", name: "flag in hole", tags: ["golf", "sport"] },
  { emoji: "🏊", name: "person swimming", tags: ["swim", "pool", "sport"] },
  { emoji: "🚴", name: "person biking", tags: ["bike", "cycle", "sport"] },
  { emoji: "🏋️", name: "person lifting weights", tags: ["gym", "weights", "lift", "strong"] },
  { emoji: "🤸", name: "person cartwheeling", tags: ["gymnastics", "cartwheel", "sport"] },
  { emoji: "⛷️", name: "skier", tags: ["ski", "snow", "sport"] },
  { emoji: "🏄", name: "person surfing", tags: ["surf", "wave", "sport", "beach"] },
  // Food & Drink
  { emoji: "🍕", name: "pizza", tags: ["pizza", "food", "italian"] },
  { emoji: "🍔", name: "hamburger", tags: ["burger", "food", "fast food"] },
  { emoji: "🍟", name: "french fries", tags: ["fries", "food", "fast food"] },
  { emoji: "🌮", name: "taco", tags: ["taco", "food", "mexican"] },
  { emoji: "🌯", name: "burrito", tags: ["burrito", "food", "mexican"] },
  { emoji: "🥗", name: "green salad", tags: ["salad", "healthy", "food"] },
  { emoji: "🍣", name: "sushi", tags: ["sushi", "food", "japanese"] },
  { emoji: "🍜", name: "steaming bowl", tags: ["noodles", "ramen", "food"] },
  { emoji: "🍝", name: "spaghetti", tags: ["pasta", "spaghetti", "italian", "food"] },
  { emoji: "🍗", name: "poultry leg", tags: ["chicken", "food", "meat"] },
  { emoji: "🥩", name: "cut of meat", tags: ["steak", "meat", "food"] },
  { emoji: "🍿", name: "popcorn", tags: ["popcorn", "movie", "snack"] },
  { emoji: "🍩", name: "doughnut", tags: ["donut", "dessert", "sweet"] },
  { emoji: "🍪", name: "cookie", tags: ["cookie", "dessert", "sweet", "bake"] },
  { emoji: "🎂", name: "birthday cake", tags: ["cake", "birthday", "sweet"] },
  { emoji: "🍫", name: "chocolate bar", tags: ["chocolate", "sweet", "dessert"] },
  { emoji: "🍦", name: "soft ice cream", tags: ["ice cream", "dessert", "sweet"] },
  { emoji: "🧁", name: "cupcake", tags: ["cupcake", "sweet", "dessert", "bake"] },
  { emoji: "🍓", name: "strawberry", tags: ["strawberry", "fruit", "food"] },
  { emoji: "🍇", name: "grapes", tags: ["grapes", "fruit", "food"] },
  { emoji: "🍎", name: "red apple", tags: ["apple", "fruit", "food"] },
  { emoji: "🍊", name: "tangerine", tags: ["orange", "fruit", "food"] },
  { emoji: "🍋", name: "lemon", tags: ["lemon", "fruit", "sour"] },
  { emoji: "🍉", name: "watermelon", tags: ["watermelon", "fruit", "summer"] },
  { emoji: "🍑", name: "peach", tags: ["peach", "fruit", "food"] },
  { emoji: "🥑", name: "avocado", tags: ["avocado", "food", "healthy", "guac"] },
  { emoji: "🧀", name: "cheese wedge", tags: ["cheese", "food"] },
  { emoji: "🍳", name: "cooking", tags: ["egg", "cook", "breakfast", "food"] },
  { emoji: "☕", name: "hot beverage", tags: ["coffee", "tea", "hot", "drink"] },
  { emoji: "🧋", name: "bubble tea", tags: ["boba", "tea", "drink"] },
  { emoji: "🥤", name: "cup with straw", tags: ["drink", "soda", "juice"] },
  { emoji: "🍺", name: "beer mug", tags: ["beer", "drink", "cheers"] },
  { emoji: "🍻", name: "clinking beer mugs", tags: ["beer", "cheers", "drink"] },
  { emoji: "🥂", name: "clinking glasses", tags: ["champagne", "toast", "celebrate"] },
  { emoji: "🍷", name: "wine glass", tags: ["wine", "drink", "fancy"] },
  { emoji: "🧃", name: "beverage box", tags: ["juice", "drink", "box"] },
  { emoji: "🥛", name: "glass of milk", tags: ["milk", "drink", "white"] },
  // Travel & Places
  { emoji: "🚀", name: "rocket", tags: ["rocket", "space", "launch", "fast"] },
  { emoji: "🛸", name: "flying saucer", tags: ["ufo", "alien", "space"] },
  { emoji: "✈️", name: "airplane", tags: ["plane", "fly", "travel", "airport"] },
  { emoji: "🚗", name: "automobile", tags: ["car", "drive", "travel"] },
  { emoji: "🚕", name: "taxi", tags: ["taxi", "cab", "ride"] },
  { emoji: "🚌", name: "bus", tags: ["bus", "transit", "travel"] },
  { emoji: "🚂", name: "locomotive", tags: ["train", "travel", "steam"] },
  { emoji: "🚢", name: "ship", tags: ["ship", "boat", "cruise", "travel"] },
  { emoji: "🛳️", name: "passenger ship", tags: ["ship", "cruise", "ocean"] },
  { emoji: "🚁", name: "helicopter", tags: ["helicopter", "fly", "travel"] },
  { emoji: "🏍️", name: "motorcycle", tags: ["motorcycle", "bike", "ride"] },
  { emoji: "🚲", name: "bicycle", tags: ["bicycle", "bike", "ride", "eco"] },
  { emoji: "🛺", name: "auto rickshaw", tags: ["tuk tuk", "taxi", "india"] },
  { emoji: "🏠", name: "house", tags: ["home", "house", "building"] },
  { emoji: "🏢", name: "office building", tags: ["office", "work", "city"] },
  { emoji: "🏖️", name: "beach with umbrella", tags: ["beach", "summer", "vacation"] },
  { emoji: "🏔️", name: "snow-capped mountain", tags: ["mountain", "snow", "nature"] },
  { emoji: "🌴", name: "palm tree", tags: ["palm", "tropical", "beach"] },
  { emoji: "🗼", name: "Tokyo tower", tags: ["tokyo", "japan", "tower"] },
  { emoji: "🗽", name: "Statue of Liberty", tags: ["liberty", "usa", "statue"] },
  { emoji: "🗺️", name: "world map", tags: ["map", "world", "travel"] },
  { emoji: "🧭", name: "compass", tags: ["compass", "navigate", "direction"] },
  // Nature & Weather
  { emoji: "🌈", name: "rainbow", tags: ["rainbow", "colorful", "lgbtq", "hope"] },
  { emoji: "☀️", name: "sun", tags: ["sun", "sunny", "hot", "bright"] },
  { emoji: "🌤️", name: "sun behind small cloud", tags: ["partly cloudy", "sun", "weather"] },
  { emoji: "⛅", name: "sun behind cloud", tags: ["cloudy", "weather"] },
  { emoji: "🌧️", name: "cloud with rain", tags: ["rain", "weather", "cloud"] },
  { emoji: "⛈️", name: "cloud with lightning and rain", tags: ["storm", "lightning", "rain"] },
  { emoji: "🌩️", name: "cloud with lightning", tags: ["lightning", "storm", "thunder"] },
  { emoji: "❄️", name: "snowflake", tags: ["snow", "cold", "winter", "ice"] },
  { emoji: "🌙", name: "crescent moon", tags: ["moon", "night", "sleep"] },
  { emoji: "🌊", name: "water wave", tags: ["wave", "ocean", "sea", "surf"] },
  { emoji: "🌺", name: "hibiscus", tags: ["flower", "tropical", "nature"] },
  { emoji: "🌸", name: "cherry blossom", tags: ["flower", "pink", "spring", "japan"] },
  { emoji: "🌹", name: "rose", tags: ["rose", "flower", "love", "red"] },
  { emoji: "🌻", name: "sunflower", tags: ["sunflower", "flower", "yellow"] },
  { emoji: "🌿", name: "herb", tags: ["herb", "green", "nature", "leaf"] },
  { emoji: "🍀", name: "four leaf clover", tags: ["clover", "luck", "green"] },
  { emoji: "🌵", name: "cactus", tags: ["cactus", "desert", "plant"] },
  { emoji: "🐶", name: "dog face", tags: ["dog", "pet", "cute", "puppy"] },
  { emoji: "🐱", name: "cat face", tags: ["cat", "pet", "cute", "kitty"] },
  { emoji: "🐭", name: "mouse face", tags: ["mouse", "small", "cute"] },
  { emoji: "🐹", name: "hamster", tags: ["hamster", "cute", "pet"] },
  { emoji: "🐰", name: "rabbit face", tags: ["rabbit", "bunny", "cute"] },
  { emoji: "🦊", name: "fox", tags: ["fox", "sly", "cute"] },
  { emoji: "🐻", name: "bear", tags: ["bear", "animal", "cute"] },
  { emoji: "🐼", name: "panda", tags: ["panda", "cute", "china", "bear"] },
  { emoji: "🐨", name: "koala", tags: ["koala", "australia", "cute"] },
  { emoji: "🐯", name: "tiger face", tags: ["tiger", "wild", "animal"] },
  { emoji: "🦁", name: "lion", tags: ["lion", "king", "roar"] },
  { emoji: "🐮", name: "cow face", tags: ["cow", "animal", "farm"] },
  { emoji: "🐷", name: "pig face", tags: ["pig", "animal", "cute"] },
  { emoji: "🐸", name: "frog", tags: ["frog", "green", "ribbit"] },
  { emoji: "🐵", name: "monkey face", tags: ["monkey", "animal", "silly"] },
  { emoji: "🐧", name: "penguin", tags: ["penguin", "cute", "bird"] },
  { emoji: "🐦", name: "bird", tags: ["bird", "tweet", "animal"] },
  { emoji: "🦆", name: "duck", tags: ["duck", "quack", "bird"] },
  { emoji: "🦅", name: "eagle", tags: ["eagle", "bird", "freedom"] },
  { emoji: "🦋", name: "butterfly", tags: ["butterfly", "beautiful", "nature"] },
  { emoji: "🐝", name: "honeybee", tags: ["bee", "honey", "insect"] },
  { emoji: "🐢", name: "turtle", tags: ["turtle", "slow", "animal"] },
  { emoji: "🐬", name: "dolphin", tags: ["dolphin", "ocean", "smart"] },
  { emoji: "🐳", name: "spouting whale", tags: ["whale", "ocean", "animal"] },
  { emoji: "🦈", name: "shark", tags: ["shark", "ocean", "scary", "fish"] },
  { emoji: "🐙", name: "octopus", tags: ["octopus", "ocean", "tentacles"] },
  { emoji: "🦁", name: "lion", tags: ["lion", "roar", "king"] },
  // Objects & Tech
  { emoji: "📱", name: "mobile phone", tags: ["phone", "mobile", "call", "text"] },
  { emoji: "💻", name: "laptop", tags: ["laptop", "computer", "work", "code"] },
  { emoji: "⌨️", name: "keyboard", tags: ["keyboard", "type", "computer"] },
  { emoji: "🖥️", name: "desktop computer", tags: ["computer", "desktop", "monitor"] },
  { emoji: "🖨️", name: "printer", tags: ["printer", "print", "office"] },
  { emoji: "⌚", name: "watch", tags: ["watch", "time", "clock"] },
  { emoji: "📷", name: "camera", tags: ["camera", "photo", "picture"] },
  { emoji: "📹", name: "video camera", tags: ["video", "camera", "record"] },
  { emoji: "📺", name: "television", tags: ["tv", "television", "watch"] },
  { emoji: "📻", name: "radio", tags: ["radio", "music", "listen"] },
  { emoji: "📡", name: "satellite antenna", tags: ["satellite", "signal", "wifi"] },
  { emoji: "🔋", name: "battery", tags: ["battery", "power", "charge"] },
  { emoji: "🔌", name: "electric plug", tags: ["plug", "power", "charge"] },
  { emoji: "💡", name: "light bulb", tags: ["idea", "light", "bright", "bulb"] },
  { emoji: "🔦", name: "flashlight", tags: ["flashlight", "torch", "light"] },
  { emoji: "🕯️", name: "candle", tags: ["candle", "light", "flame"] },
  { emoji: "📖", name: "open book", tags: ["book", "read", "story"] },
  { emoji: "📚", name: "books", tags: ["books", "read", "study"] },
  { emoji: "📝", name: "memo", tags: ["note", "write", "memo"] },
  { emoji: "📌", name: "pushpin", tags: ["pin", "mark", "location"] },
  { emoji: "📎", name: "paperclip", tags: ["clip", "attach", "paper"] },
  { emoji: "✂️", name: "scissors", tags: ["scissors", "cut"] },
  { emoji: "🔑", name: "key", tags: ["key", "lock", "access"] },
  { emoji: "🔒", name: "locked", tags: ["lock", "secure", "private"] },
  { emoji: "🔓", name: "unlocked", tags: ["unlock", "open", "access"] },
  { emoji: "💰", name: "money bag", tags: ["money", "rich", "cash", "gold"] },
  { emoji: "💳", name: "credit card", tags: ["card", "pay", "money"] },
  { emoji: "💎", name: "gem stone", tags: ["diamond", "gem", "rich", "sparkle"] },
  { emoji: "🛒", name: "shopping cart", tags: ["shop", "cart", "buy"] },
  { emoji: "🎁", name: "gift", tags: ["gift", "present", "birthday"] },
  { emoji: "🎒", name: "backpack", tags: ["backpack", "school", "bag"] },
  { emoji: "👓", name: "glasses", tags: ["glasses", "nerd", "see"] },
  { emoji: "🕶️", name: "sunglasses", tags: ["sunglasses", "cool", "sun"] },
  { emoji: "🧢", name: "billed cap", tags: ["cap", "hat", "fashion"] },
  { emoji: "👑", name: "crown", tags: ["crown", "king", "queen", "royal"] },
  { emoji: "💍", name: "ring", tags: ["ring", "wedding", "diamond", "love"] },
  { emoji: "👙", name: "bikini", tags: ["bikini", "beach", "summer"] },
  { emoji: "🩴", name: "thong sandal", tags: ["sandal", "summer", "beach"] },
  // Symbols & Signs
  { emoji: "✅", name: "check mark button", tags: ["check", "done", "yes", "tick"] },
  { emoji: "❌", name: "cross mark", tags: ["no", "wrong", "cross", "cancel"] },
  { emoji: "⚡", name: "high voltage", tags: ["lightning", "electric", "fast", "power"] },
  { emoji: "🚨", name: "police car light", tags: ["alert", "warning", "alarm", "police"] },
  { emoji: "⚠️", name: "warning", tags: ["warning", "caution", "danger"] },
  { emoji: "🚫", name: "prohibited", tags: ["no", "stop", "forbidden", "banned"] },
  { emoji: "♻️", name: "recycling symbol", tags: ["recycle", "eco", "green"] },
  { emoji: "💯", name: "hundred points", tags: ["100", "perfect", "score", "yes"] },
  { emoji: "🔥", name: "fire", tags: ["fire", "hot", "lit", "trending"] },
  { emoji: "💬", name: "speech bubble", tags: ["chat", "message", "talk", "speech"] },
  { emoji: "💭", name: "thought balloon", tags: ["thought", "think", "dream"] },
  { emoji: "🗨️", name: "left speech bubble", tags: ["chat", "message", "speech"] },
  { emoji: "📣", name: "megaphone", tags: ["announce", "loud", "megaphone"] },
  { emoji: "📢", name: "loudspeaker", tags: ["speaker", "loud", "announce"] },
  { emoji: "🔔", name: "bell", tags: ["bell", "notification", "ring"] },
  { emoji: "🔕", name: "bell with slash", tags: ["silent", "mute", "no sound"] },
  { emoji: "🎵", name: "musical note", tags: ["music", "note", "song"] },
  { emoji: "🎶", name: "musical notes", tags: ["music", "notes", "song"] },
  { emoji: "🆕", name: "NEW button", tags: ["new", "fresh"] },
  { emoji: "🆙", name: "UP button", tags: ["up", "upgrade"] },
  { emoji: "🆒", name: "COOL button", tags: ["cool", "awesome"] },
  { emoji: "🆓", name: "FREE button", tags: ["free", "gratis"] },
  { emoji: "🔝", name: "TOP arrow", tags: ["top", "best", "up"] },
  { emoji: "🏳️", name: "white flag", tags: ["flag", "peace", "surrender"] },
  { emoji: "🏴", name: "black flag", tags: ["flag", "dark"] },
  { emoji: "🏁", name: "chequered flag", tags: ["finish", "race", "done"] },
  { emoji: "🚩", name: "triangular flag", tags: ["flag", "alert", "mark"] },
];

const EMOJI_CATEGORIES = [
  { label: "😀 Smileys", range: [0, 79] },
  { label: "👋 Hands", range: [80, 119] },
  { label: "❤️ Hearts", range: [120, 145] },
  { label: "🎉 Fun", range: [146, 185] },
  { label: "⚽ Sports", range: [186, 205] },
  { label: "🍕 Food", range: [206, 245] },
  { label: "🚀 Travel", range: [246, 268] },
  { label: "🌈 Nature", range: [269, 315] },
  { label: "📱 Objects", range: [316, 360] },
  { label: "✅ Symbols", range: [361, 999] },
];

const STICKERS_DB = [
  { id: "yes", tags: ["yes", "agree", "nod"], url: "https://media.giphy.com/media/3o7TKSjRrfIPjeiVyM/giphy.gif" },
  { id: "no", tags: ["no", "deny", "shake"], url: "https://media.giphy.com/media/15aGGXfSlat2dP6ohs/giphy.gif" },
  { id: "laugh", tags: ["laugh", "lol", "funny"], url: "https://media.giphy.com/media/l0HlO3BJ8LALPW4sE/giphy.gif" },
  { id: "cry", tags: ["cry", "sad", "tears"], url: "https://media.giphy.com/media/d2lcHJTG5Tscg/giphy.gif" },
  { id: "angry", tags: ["angry", "mad", "rage"], url: "https://media.giphy.com/media/11tTNkNy1SdXGg/giphy.gif" },
  { id: "wow", tags: ["wow", "omg", "surprise"], url: "https://media.giphy.com/media/5wWf7GMbT1ZUGTDdTqM/giphy.gif" },
  { id: "love", tags: ["love", "heart", "romance"], url: "https://media.giphy.com/media/26BRv0ThflsHCqDrG/giphy.gif" }
];

const ChatInput = ({
  onSend,
  onTyping,
  userId,
  chatId,
  isGroup,
  replyTo,
  onCancelReply,
  editingMessage,
  onCancelEdit,
  onEdit
}) => {
  const [text, setText] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [showAttachMenu, setShowAttachMenu] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  const [pickerTab, setPickerTab] = useState("emoji");
  const [stickerResults, setStickerResults] = useState([]);
  const [previewMedia, setPreviewMedia] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [lastTypingSent, setLastTypingSent] = useState(0);
  const [stickerQuery, setStickerQuery] = useState("");
  const [emojiSearch, setEmojiSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState(0);
  const [stickerLoading, setStickerLoading] = useState(false);
  const [imagesLoadedCount, setImagesLoadedCount] = useState(0);
  const [isWaitingForImages, setIsWaitingForImages] = useState(false);
  const stickerCache = useRef({});

  const abortControllerRef = useRef(null);


  const fileInputRef = useRef(null);
  const textareaRef = useRef(null);
  const cameraInputRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const recordingTimerRef = useRef(null);
  const attachMenuRef = useRef(null);
  const pickerRef = useRef(null);
  const plusButtonRef = useRef(null);
  const emojiButtonRef = useRef(null);
  const isCancelledRef = useRef(false);
  const emojiListRef = useRef(null);

  // ─── Favourites ────────────────────────────────────────────────────────────
  const loadFavEmojis = () => {
  try { return JSON.parse(localStorage.getItem("louda:favEmojis") || "[]"); }
  catch { return []; }
  };
  const loadSavedStickers = () => {
  try { return JSON.parse(localStorage.getItem("louda:savedStickers") || "[]"); }
  catch { return []; }
  };

  const [favEmojis, setFavEmojis] = useState(loadFavEmojis);
  const [savedStickers, setSavedStickers] = useState(loadSavedStickers);

  const toggleFavEmoji = (emoji) => {
  setFavEmojis(prev => {
  const next = prev.includes(emoji) ? prev.filter(e => e !== emoji) : [emoji, ...prev].slice(0, 30);
  localStorage.setItem("louda:favEmojis", JSON.stringify(next));
  return next;
  });
  };

  const saveSticker = (sticker) => {
  setSavedStickers(prev => {
  if (prev.find(s => s.id === sticker.id)) return prev;
  const next = [sticker, ...prev];
  localStorage.setItem("louda:savedStickers", JSON.stringify(next));
  return next;
  });
  };

  const removeSavedSticker = (id) => {
  setSavedStickers(prev => {
  const next = prev.filter(s => s.id !== id);
  localStorage.setItem("louda:savedStickers", JSON.stringify(next));
  return next;
  });
  };

  // ─── Filtered emojis ───────────────────────────────────────────────────────
  const filteredEmojis = emojiSearch.trim()
  ? ALL_EMOJIS.filter(e =>
  e.name.includes(emojiSearch.toLowerCase()) ||
  e.tags.some(t => t.includes(emojiSearch.toLowerCase()))
  )
  : activeCategory === -1
  ? ALL_EMOJIS.filter(e => favEmojis.includes(e.emoji))
  : ALL_EMOJIS.slice(
  EMOJI_CATEGORIES[activeCategory].range[0],
  EMOJI_CATEGORIES[activeCategory].range[1] + 1
  );

  // ─── Stickers ──────────────────────────────────────────────────────────────
  const searchStickers = async (q = "") => {
  const query = q.trim();
  if (stickerCache.current[query]) {
  setStickerResults(stickerCache.current[query]);
  setImagesLoadedCount(0);
  setIsWaitingForImages(stickerCache.current[query].length > 0);
  return;
  }

  if (abortControllerRef.current) abortControllerRef.current.abort();
  abortControllerRef.current = new AbortController();

  setStickerLoading(true);
  setImagesLoadedCount(0);
  setIsWaitingForImages(false);
  try {
  const endpoint = query
  ? `${GIPHY_API_BASE}/search?api_key=${GIPHY_API_KEY}&q=${encodeURIComponent(query)}&limit=24&rating=g&lang=en`
  : `${GIPHY_API_BASE}/trending?api_key=${GIPHY_API_KEY}&limit=24&rating=g`;
  const res = await fetch(endpoint, { signal: abortControllerRef.current.signal });
  const data = await res.json();
  const formatted = (data?.data || []).map(g => ({
  id: g.id,
  tags: [g.title || query || "gif"],
  url: g.images?.fixed_height?.url || g.images?.downsized?.url || g.images?.original?.url
  }));
  stickerCache.current[query] = formatted;
  setStickerResults(formatted);
  if (formatted.length > 0) setIsWaitingForImages(true);
  } catch (err) {
  if (err.name === "AbortError") return;
  const fallback = stickerQuery
  ? STICKERS_DB.filter(s => s.tags.some(t => t.includes(stickerQuery.toLowerCase())))
  : STICKERS_DB;
  setStickerResults(fallback);
  if (fallback.length > 0) setIsWaitingForImages(true);
  } finally {
  setStickerLoading(false);
  }
  };



  const selectSticker = (sticker) => {
  onSend({ type: "sticker", sticker_url: sticker.url, text: "" });
  setShowEmojiPicker(false);
  };

  // ─── Effects ───────────────────────────────────────────────────────────────
  useEffect(() => {
  const handleClickOutside = (e) => {
  if (showAttachMenu && attachMenuRef.current && !attachMenuRef.current.contains(e.target) && !plusButtonRef.current?.contains(e.target))
  setShowAttachMenu(false);
  if (showEmojiPicker && pickerRef.current && !pickerRef.current.contains(e.target) && !emojiButtonRef.current?.contains(e.target))
  setShowEmojiPicker(false);
  };
  document.addEventListener("mousedown", handleClickOutside);
  return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showAttachMenu, showEmojiPicker]);

  useEffect(() => {
  if (editingMessage) setText(editingMessage.text || "");
  }, [editingMessage]);

  useEffect(() => {
  const el = textareaRef.current;
  if (!el) return;
  el.style.height = "auto";
  const next = Math.min(el.scrollHeight, MAX_TEXTAREA_HEIGHT);
  el.style.height = `${Math.max(next, 38)}px`;
  el.style.overflowY = el.scrollHeight > MAX_TEXTAREA_HEIGHT ? "auto" : "hidden";
  }, [text, editingMessage]);

  useEffect(() => {
  if (pickerTab === "sticker" && showEmojiPicker) {
  const query = stickerQuery.trim();
  // Instant update for cache hits
  if (stickerCache.current[query]) {
  searchStickers(stickerQuery);
  return;
  }
  // Instant loading feedback for new searches
  setStickerLoading(true);
  setImagesLoadedCount(0);
  setIsWaitingForImages(false);
  const t = setTimeout(() => searchStickers(stickerQuery), 150);
  return () => clearTimeout(t);
  }

  }, [pickerTab, stickerQuery, showEmojiPicker]);



  // ─── Recording ─────────────────────────────────────────────────────────────
  const startRecording = async () => {
  try {
  isCancelledRef.current = false;
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  const recorder = new MediaRecorder(stream);
  audioChunksRef.current = [];
  recorder.ondataavailable = e => { if (e.data.size > 0) audioChunksRef.current.push(e.data); };
  recorder.onstop = async () => {
  stream.getTracks().forEach(t => t.stop());
  clearInterval(recordingTimerRef.current);
  setRecordingTime(0);
  if (isCancelledRef.current) return;
  const blob = new Blob(audioChunksRef.current, { type: "audio/webm" });
  if (blob.size < 100) return;
  setUploading(true);
  try {
  const fd = new FormData();
  fd.append("file", blob, "voice-note.webm");
  fd.append("type", "voice");
  const res = await fetch(`${API_BASE_URL}/api/upload`, { method: "POST", body: fd });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Upload failed");
  const payload = { text: "", media: [{ type: "voice", url: data.url, duration: data.duration || 0 }] };
  if (replyTo) {
  payload.reply_to = { id: replyTo.id, text: replyTo.text, from: replyTo.from, fromName: replyTo.fromName };
  }
  onSend(payload);
  onCancelReply?.();
  } catch (err) { Lexum.alert({ title: "Error", message: err.message || "Upload failed" }); }
  finally { setUploading(false); }
  };
  recorder.start();
  mediaRecorderRef.current = recorder;
  setIsRecording(true);
  setRecordingTime(0);
  recordingTimerRef.current = setInterval(() => setRecordingTime(t => t + 1), 1000);
  } catch { Lexum.alert({ title: "Error", message: "Microphone access denied" }); }
  };

  const stopRecording = () => {
  if (mediaRecorderRef.current?.state === "recording") {
  mediaRecorderRef.current.stop();
  setIsRecording(false);
  }
  };

  const cancelRecording = () => {
  isCancelledRef.current = true;
  stopRecording();
  };

  // ─── Input handling ────────────────────────────────────────────────────────
  const handleChange = (e) => {
  const next = e.target.value;
  setText(next);
  if (next.trim() && Date.now() - lastTypingSent > 2000) {
  onTyping();
  setLastTypingSent(Date.now());
  }
  };

  const send = async () => {
  if (!text.trim() && previewMedia.length === 0) return;
  if (editingMessage) {
  if (onEdit) onEdit(editingMessage.id, text);
  setText("");
  onCancelEdit?.();
  return;
  }
  const payload = { text, media: previewMedia };
  if (replyTo) payload.reply_to = { id: replyTo.id, text: replyTo.text, from: replyTo.from, fromName: replyTo.fromName };
  onSend(payload);
  setText("");
  setPreviewMedia([]);
  onCancelReply?.();
  };

  const handleFileChange = async (e) => {
  let files = Array.from(e.target.files);
  if (!files.length) return;
  if (previewMedia.length + files.length > 6) {
  Lexum.alert({ title: "Notice", message: "Maximum 6 media files allowed." });
  files = files.slice(0, 6 - previewMedia.length);
  }
  const validFiles = files.filter(f => {
  const isImg = f.type.startsWith("image/");
  const maxSize = isImg ? 20 * 1024 * 1024 : 90 * 1024 * 1024;
  if (f.size > maxSize) {
  Lexum.alert({ title: "File Too Large", message: `${f.name} exceeds the ${isImg ? '20MB' : '90MB'} limit.` });
  return false;
  }
  return true;
  });
  if (!validFiles.length) return;
  setUploading(true);
  try {
  const media = [];
  for (const f of validFiles) {
  const fd = new FormData();
  fd.append("file", f);
  fd.append("type", f.type.startsWith("image/") ? "image" : f.type.startsWith("video/") ? "video" : "file");
  const res = await fetch(`${API_BASE_URL}/api/upload`, { method: "POST", body: fd });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Upload failed");
  media.push({ type: data.type, url: data.url });
  }
  setPreviewMedia(p => [...p, ...media]);
  setShowAttachMenu(false);
  } catch (err) { Lexum.alert({ title: "Error", message: err.message || "Upload failed" }); }
  finally { setUploading(false); }
  };

  const removePreview = (i) => {
  const item = previewMedia[i];
  if (item?.url) {
  fetch(`${API_BASE_URL}/api/upload/delete`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ url: item.url })
  }).catch(() => { });
  }
  setPreviewMedia(p => p.filter((_, idx) => idx !== i));
  };
  const hasContent = text.trim().length > 0 || previewMedia.length > 0;
  const showSend = hasContent || editingMessage;
  const isTyping = text.trim().length > 0;

  // ─── Emoji Picker ──────────────────────────────────────────────────────────


  // ─── Render ────────────── ──────────────────────────────────────────────────
  return (
  <div className="relative p-1 md:p-2 backdrop-blur-sm bg-white/95  border-t  flex items-end gap-1 md:gap-2 z-20">

  {/* Emoji/Sticker Picker — anchored above, NOT fullscreen */}
  {showEmojiPicker && (
  <div
  ref={pickerRef}
  className="absolute bottom-full left-0 mb-2 w-full sm:w-[380px] max-w-[calc(100vw-16px)] bg-white  rounded-2xl shadow-2xl border border-gray-100  overflow-hidden z-50 flex flex-col"
  style={{ height: "340px" }}
  >
  {/* Tabs */}
  <div className="flex border-b border-gray-100  shrink-0">
  {["emoji", "sticker"].map(tab => (
  <button
  key={tab}
  onClick={() => setPickerTab(tab)}
  className={`flex-1 py-2.5 text-sm font-semibold capitalize transition-colors ${pickerTab === tab
  ? "border-b-2 border-emerald-500 text-emerald-600 "
  : "text-gray-400 hover:text-gray-600 "
  }`}
  >
  {tab === "emoji" ? "😀 Emoji" : "🎭 Stickers"}
  </button>
  ))}
  </div>

  {pickerTab === "emoji" ? (
  <div className="flex flex-col flex-1 overflow-hidden">
  {/* Search */}
  <div className="px-3 pt-2 pb-1 shrink-0">
  <div className="flex items-center gap-2 bg-gray-100  rounded-xl px-3 py-1.5">
  <svg className="w-3.5 h-3.5 text-gray-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
  </svg>
  <input
  type="text"
  placeholder="Search emoji…"
  value={emojiSearch}
  onChange={e => setEmojiSearch(e.target.value)}
  className="flex-1 bg-transparent text-sm text-gray-800  placeholder-gray-400 outline-none"
  />
  {emojiSearch && (
  <button onClick={() => setEmojiSearch("")} className="text-gray-400 hover:text-gray-600 text-xs leading-none">✕</button>
  )}
  </div>
  </div>

  {/* Category tabs (hidden during search) */}
  {!emojiSearch && (
  <div className="flex gap-1 px-2 pb-1 overflow-x-auto scrollbar-hide shrink-0">
  <button
  onClick={() => setActiveCategory(-1)}
  className={`shrink-0 text-sm px-2 py-1 rounded-lg transition-colors ${activeCategory === -1
  ? "bg-emerald-100  text-emerald-700 "
  : "text-gray-500 hover:bg-gray-100 "
  }`}
  >
  ⭐
  </button>
  {EMOJI_CATEGORIES.map((cat, i) => (
  <button
  key={i}
  onClick={() => setActiveCategory(i)}
  className={`shrink-0 text-xs px-2 py-1 rounded-lg whitespace-nowrap transition-colors ${activeCategory === i
  ? "bg-emerald-100  text-emerald-700 "
  : "text-gray-500 hover:bg-gray-100 "
  }`}
  >
  {cat.label.split(" ")[0]}
  </button>
  ))}
  </div>
  )}

  {/* Emoji grid */}
  <div ref={emojiListRef} className="flex-1 overflow-y-auto px-2 pb-2">
  {emojiSearch && (
  <p className="text-xs text-gray-400 px-1 pb-1">
  {filteredEmojis.length} result{filteredEmojis.length !== 1 ? "s" : ""}
  </p>
  )}
  {activeCategory === -1 && !emojiSearch && favEmojis.length === 0 && (
  <p className="text-center text-sm text-gray-400 py-8">
  Long-press an emoji to save it here ⭐
  </p>
  )}
  <div className="grid grid-cols-8 sm:grid-cols-9 gap-0.5">
  {filteredEmojis.map((item, i) => (
  <button
  key={i}
  onClick={() => setText(prev => prev + item.emoji)}
  onContextMenu={e => { e.preventDefault(); toggleFavEmoji(item.emoji); }}
  onTouchStart={() => {
  const t = setTimeout(() => toggleFavEmoji(item.emoji), 600);
  const cancel = () => clearTimeout(t);
  document.addEventListener("touchend", cancel, { once: true });
  document.addEventListener("touchmove", cancel, { once: true });
  }}
  title={item.name}
  className={`relative text-xl p-1.5 rounded-xl hover:bg-gray-100  transition-colors group ${favEmojis.includes(item.emoji) ? "bg-yellow-50 " : ""
  }`}
  >
  {item.emoji}
  {favEmojis.includes(item.emoji) && (
  <span className="absolute top-0 right-0 text-[8px] leading-none">⭐</span>
  )}
  </button>
  ))}
  </div>
  </div>
  </div>
  ) : (
  /* Stickers tab */
  <div className="flex flex-col flex-1 overflow-hidden">
  <div className="px-3 pt-2 pb-1 shrink-0">
  <div className="flex items-center gap-2 bg-gray-100  rounded-xl px-3 py-1.5">
  <svg className="w-3.5 h-3.5 text-gray-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
  </svg>
  <input
  type="text"
  placeholder="Search GIF…"
  value={stickerQuery}
  onChange={e => setStickerQuery(e.target.value)}
  className="flex-1 bg-transparent text-sm text-gray-800  placeholder-gray-400 outline-none"
  />
  {stickerQuery && (
  <button onClick={() => setStickerQuery("")} className="text-gray-400 hover:text-gray-600 text-xs">✕</button>
  )}
  </div>
  </div>

  <div className="flex-1 overflow-y-auto px-2 pb-2 space-y-3">
  {/* Saved stickers */}
  {savedStickers.length > 0 && !stickerQuery && (
  <div>
  <p className="text-xs font-bold text-gray-400 uppercase px-1 py-1">❤️ Saved</p>
  <div className="grid grid-cols-3 sm:grid-cols-4 gap-1.5">
  {savedStickers.map((s, i) => (
  <div key={i} className="relative group">
  <img
  src={s.url}
  onClick={() => selectSticker(s)}
  className="w-full h-16 object-cover rounded-xl cursor-pointer hover:scale-[1.03] transition"
  />
  <button
  onClick={e => { e.stopPropagation(); removeSavedSticker(s.id); }}
  className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-4 h-4 text-[10px] flex items-center justify-center opacity-0 group-hover:opacity-100 transition"
  >
  ✕
  </button>
  </div>
  ))}
  </div>
  </div>
  )}

  {/* Trending / results */}
  <div>
  <div className="flex items-center justify-between px-1 py-1">
  <p className="text-xs font-bold text-gray-400 uppercase">
  {stickerQuery ? "🔍 Results" : "🔥 Trending"}
  </p>
  {(stickerLoading || (isWaitingForImages && imagesLoadedCount < Math.min(stickerResults.length, 6))) && (
  <div className="flex items-center gap-1.5">
  <div className="w-3 h-3 border-2 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin"></div>
  <span className="text-[10px] text-gray-400 font-medium">
  {stickerLoading ? "Searching..." : "Rendering..."}
  </span>
  </div>
  )}

  </div>

  {((stickerLoading || (isWaitingForImages && imagesLoadedCount < Math.min(stickerResults.length, 6))) && stickerResults.length === 0) ? (
  <div className="grid grid-cols-3 sm:grid-cols-4 gap-1.5 animate-pulse">
  {[...Array(8)].map((_, i) => (
  <div key={i} className="w-full h-16 bg-gray-100  rounded-xl" />
  ))}
  </div>
  ) : (
  <div className={`grid grid-cols-3 sm:grid-cols-4 gap-1.5 transition-opacity duration-200 ${(stickerLoading || (isWaitingForImages && imagesLoadedCount < Math.min(stickerResults.length, 6))) ? "opacity-30 pointer-events-none" : "opacity-100"}`}>
  {stickerResults.map((s, i) => (
  <div key={i} className="relative group">
  <img
  src={s.url}
  onLoad={() => setImagesLoadedCount(prev => prev + 1)}
  onError={() => setImagesLoadedCount(prev => prev + 1)}
  onClick={() => selectSticker(s)}
  className="w-full h-16 object-cover rounded-xl cursor-pointer hover:scale-[1.03] transition"
  />
  <button
  onClick={e => { e.stopPropagation(); saveSticker(s); }}
  className={`absolute top-1 right-1 rounded-full w-5 h-5 text-xs flex items-center justify-center transition shadow ${savedStickers.find(sv => sv.id === s.id)
  ? "bg-red-500 text-white opacity-100"
  : "bg-white/80 text-gray-500 opacity-0 group-hover:opacity-100"
  }`}
  title="Save to favourites"
  >
  {savedStickers.find(sv => sv.id === s.id) ? "❤️" : "🤍"}
  </button>
  </div>
  ))}
  </div>
  )}
  {stickerResults.length === 0 && !stickerLoading && !isWaitingForImages && (
  <p className="text-center text-sm text-gray-400 py-6">No results found</p>
  )}


  </div>
  </div>
  </div>
  )}
  </div>
  )}

  {/* Attach menu */}
  {showAttachMenu && (
  <div
  ref={attachMenuRef}
  className="absolute bottom-full left-4 mb-2 bg-white  rounded-2xl shadow-xl border border-gray-100  p-4 grid grid-cols-3 gap-6 animate-slide-up z-50 w-72"
  >
  {[
  { icon: Icons.camera, label: "Camera", color: "bg-red-100 text-red-600", onClick: () => setShowCamera(true) },
  { icon: Icons.image, label: "Photos & Videos", color: "bg-pink-100 text-pink-600", onClick: () => fileInputRef.current.click() },
  { icon: Icons.audio, label: "Audio", color: "bg-orange-100 text-orange-600", onClick: () => fileInputRef.current.click() },
  { icon: Icons.user, label: "Contact", color: "bg-blue-100 text-blue-600", onClick: () => Lexum.alert({ title: "Contact", message: "Coming soon!" }) }
  ].map((item, i) => (
  <div
  key={i}
  onClick={() => { item.onClick(); setShowAttachMenu(false); }}
  className="flex flex-col items-center gap-2 cursor-pointer group"
  >
  <div className={`w-14 h-14 rounded-full flex items-center justify-center transition transform group-hover:scale-110 ${item.color}`}>
  {item.icon}
  </div>
  <span className="text-xs font-medium text-gray-600  text-center">{item.label}</span>
  </div>
  ))}
  </div>
  )}

  {/* Main input bar */}
  <div className="flex-1 bg-white  rounded-3xl flex items-end p-0.5 md:p-1 shadow-sm border border-gray-200  overflow-visible min-w-0">
  <div className="flex items-end">
  <button
  ref={plusButtonRef}
  onClick={() => setShowAttachMenu(!showAttachMenu)}
  className={`p-1.5 md:p-2.5 rounded-full transition duration-300 shrink-0 ${showAttachMenu ? "rotate-45 text-gray-800 " : "text-gray-500 hover:text-gray-700"}`}
  >
  {Icons.plus}
  </button>
  </div>

  <div className="flex-1 flex flex-col min-w-0">
  {replyTo && (
  <div className="mx-1 md:mx-2 mt-1 md:mt-2 p-1.5 md:p-2 rounded-lg bg-gray-100  border-l-4 border-green text-xs flex justify-between">
  <div className="truncate text-gray-600 ">Replying to {replyTo.fromName}</div>
  <button onClick={onCancelReply} className="text-gray-500 hover:text-red-500 ml-1">✕</button>
  </div>
  )}

  {previewMedia.length > 0 && (
  <div className="flex gap-2 p-1.5 md:p-2 overflow-x-auto">
  {previewMedia.map((m, i) => (
  <div key={i} className="relative group shrink-0">
  {m.type === "image"
  ? <img src={m.url} className="w-14 md:w-16 h-14 md:h-16 object-cover rounded-lg" />
  : <div className="w-14 md:w-16 h-14 md:h-16 bg-gray-200 rounded-lg flex items-center justify-center">
  {m.type === "video" ? Icons.video : Icons.mic}
  </div>
  }
  <button
  onClick={() => removePreview(i)}
  className="absolute -top-1 -right-1 bg-gray-800 text-white rounded-full w-5 h-5 text-xs flex items-center justify-center"
  >✕</button>
  </div>
  ))}
  </div>
  )}

  <div className="flex items-end pb-1 md:pb-1">
  <button
  ref={emojiButtonRef}
  onClick={() => setShowEmojiPicker(!showEmojiPicker)}
  className={`p-1.5 md:p-2 transition shrink-0 mb-0.5 ${showEmojiPicker ? "text-emerald-500" : "text-gray-400 hover:text-yellow-500"}`}
  >
  {Icons.smile}
  </button>

  <textarea
  ref={textareaRef}
  value={text}
  onChange={handleChange}
  placeholder="Message"
  rows={1}
  className="flex-1 bg-transparent border-none focus:ring-0 px-1 md:px-2 py-2 md:py-2.5 text-gray-900  placeholder-gray-400 min-w-0 leading-relaxed text-[14px] md:text-[15px] resize-none"
  style={{ minHeight: "36px", maxHeight: `${MAX_TEXTAREA_HEIGHT}px`, outline: "none" }}
  onKeyDown={e => {
  // Enter sends, Shift+Enter adds a new paragraph
  if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing && showSend) {
  e.preventDefault();
  send();
  }
  }}
  />

  <div className="flex items-end pb-0.5 md:pb-1 pr-1 shrink-0 gap-0.5">
  {!isTyping && !editingMessage && (
  <button onClick={() => setShowCamera(true)} className="p-1.5 md:p-2 text-gray-400 hover:text-gray-600 transition">
  {Icons.camera}
  </button>
  )}
  </div>
  </div>
  </div>
  </div>

  {/* Send / Mic button */}
  <button
  onClick={() => showSend ? send() : (isRecording ? stopRecording() : startRecording())}
  disabled={uploading}
  className={`w-11 h-11 rounded-full shadow-[0_4px_12px_rgba(0,0,0,0.15)] flex items-center justify-center transition-all duration-300 transform active:scale-90 ${isRecording ? "bg-red-500 animate-pulse" : ""
  } text-white text-center border-2 border-white/20`}
  style={!isRecording ? { background: `linear-gradient(135deg, var(--safari-green), color-mix(in srgb, var(--safari-green) 80%, black))`, boxShadow: `0 8px 20px color-mix(in srgb, var(--safari-green) 30%, transparent)` } : {}}
  >
  {uploading ? Icons.loading : isRecording ? Icons.mic : showSend ? (editingMessage ? Icons.check : Icons.send) : Icons.mic}
  </button>

  {/* Recording overlay */}
  {isRecording && (
  <div className="absolute left-2 right-16 bottom-2 h-14 bg-white  rounded-full flex items-center px-4 shadow-md z-10 animate-slide-up">
  <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse mr-3" />
  <span className="text-gray-800  font-mono flex-1">
  {Math.floor(recordingTime / 60)}:{String(recordingTime % 60).padStart(2, "0")}
  </span>
  <button onClick={cancelRecording} className="text-red-500 font-bold px-4 hover:bg-red-50 rounded-full py-1">
  Cancel
  </button>
  </div>
  )}

  <input type="file" ref={fileInputRef} multiple accept="*" className="hidden" onChange={handleFileChange} />
  <input type="file" ref={cameraInputRef} accept="image/*" capture="environment" className="hidden" onChange={handleFileChange} />

  {showCamera && createPortal(
  <CameraOverlay
  onClose={() => setShowCamera(false)}
  onCapture={async (result) => {
  setShowCamera(false);
  const fileToUpload = result?.file || (Array.isArray(result) ? result[0] : result);
  if (!fileToUpload) return;
  setUploading(true);
  try {
  const fd = new FormData();
  fd.append("file", fileToUpload);
  fd.append("type", fileToUpload.type.startsWith("video/") ? "video" : "image");
  const res = await fetch(`${API_BASE_URL}/api/upload`, { method: "POST", body: fd });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Upload failed");
  setPreviewMedia(prev => [...prev, { type: data.type, url: data.url }]);
  } catch (err) {
  Lexum.alert({ title: "Error", message: err.message || "Camera upload failed" });
  } finally {
  setUploading(false);
  }
  }}
  />,
  document.body
  )}
  </div>
  );
};

const MessageInfoModal = ({ message, onClose, userVoice, userLang }) => {
  const [playingOriginal, setPlayingOriginal] = useState(false);
  const [playingTranslated, setPlayingTranslated] = useState(false);
  const [copiedOriginal, setCopiedOriginal] = useState(false);
  const [copiedTranslated, setCopiedTranslated] = useState(false);

  if (!message) return null;

  const translation = message.translations?.[userLang];

  const handlePlay = async (text, lang, setPlaying) => {
  if (!text) return;
  setPlaying(true);
  try {
  await playTTS(text, lang);
  } catch (e) {
  console.error(e);
  Lexum.alert({ title: 'Error', message: 'Failed to play audio' });
  } finally {
  setPlaying(false);
  }
  };

  const copyToClipboard = (text, setCopied) => {
  navigator.clipboard.writeText(text);
  setCopied(true);
  setTimeout(() => setCopied(false), 2000);
  };

  return (
  <div className="fixed inset-0 bg-black/50 flex items-end md:items-center justify-center z-[200]" onClick={onClose}>
  <div
  className="bg-white  w-full max-w-md md:rounded-2xl rounded-t-2xl overflow-hidden animate-slide-up flex flex-col"
  style={{ maxHeight: '80vh' }}
  onClick={e => e.stopPropagation()}
  >
  <div className="md:hidden flex justify-center pt-2 pb-1">
  <div className="w-10 h-1 bg-gray-300  rounded-full" />
  </div>

  <div className="px-4 py-3 flex items-center justify-between border-b border-gray-100 ">
  <h3 className="text-base font-bold text-gray-900 ">Message Info</h3>
  <button onClick={onClose} className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100  transition">
  {Icons.x}
  </button>
  </div>

  <div className="flex-1 overflow-y-auto no-scrollbar">
  <div className="px-4 py-3 border-b border-gray-100 ">
  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-2">Original</span>
  <p className="text-[15px] text-gray-800  leading-relaxed mb-3">
  {message.text || <span className="italic text-gray-400 text-xs">Media message</span>}
  </p>
  <div className="flex gap-2">
  <button
  onClick={() => copyToClipboard(message.text || '', setCopiedOriginal)}
  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition ${copiedOriginal ? 'bg-[color-mix(in_srgb,var(--safari-green)_10%,transparent)] text-[var(--safari-green)]' : 'bg-gray-100  text-gray-500 hover:text-[var(--safari-green)]'}`}
  >
  {copiedOriginal ? Icons.check : Icons.file} {copiedOriginal ? 'Copied' : 'Copy'}
  </button>
  <button
  onClick={() => handlePlay(message.text, userVoice, setPlayingOriginal)}
  disabled={playingOriginal}
  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition ${playingOriginal ? 'bg-[color-mix(in_srgb,var(--safari-green)_10%,transparent)] text-[var(--safari-green)]' : 'bg-gray-100  text-gray-500 hover:text-[var(--safari-green)]'}`}
  >
  {playingOriginal ? <div className="w-3 h-3 border-2 border-gray-300 border-t-[var(--safari-green)] rounded-full animate-spin" /> : Icons.audio} {playingOriginal ? 'Playing...' : 'Play'}
  </button>
  </div>
  </div>

  {translation && (
  <div className="px-4 py-3 border-b border-gray-100 ">
  <div className="flex items-center gap-2 mb-2">
  <span className="text-[10px] font-bold text-[var(--safari-green)] uppercase tracking-wider">Translation</span>
  <span className="text-[9px] font-bold text-gray-400 bg-gray-100  px-1.5 py-0.5 rounded uppercase">{userLang}</span>
  </div>
  <p className="text-[15px] italic text-gray-700  leading-relaxed mb-3">{translation}</p>
  <div className="flex gap-2">
  <button
  onClick={() => copyToClipboard(translation, setCopiedTranslated)}
  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition ${copiedTranslated ? 'bg-[color-mix(in_srgb,var(--safari-green)_10%,transparent)] text-[var(--safari-green)]' : 'bg-gray-100  text-gray-500 hover:text-[var(--safari-green)]'}`}
  >
  {copiedTranslated ? Icons.check : Icons.file} {copiedTranslated ? 'Copied' : 'Copy'}
  </button>
  <button
  onClick={() => handlePlay(translation, userLang, setPlayingTranslated)}
  disabled={playingTranslated}
  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition ${playingTranslated ? 'bg-[color-mix(in_srgb,var(--safari-green)_10%,transparent)] text-[var(--safari-green)]' : 'bg-gray-100  text-gray-500 hover:text-[var(--safari-green)]'}`}
  >
  {playingTranslated ? <div className="w-3 h-3 border-2 border-gray-300 border-t-[var(--safari-green)] rounded-full animate-spin" /> : Icons.audio} {playingTranslated ? 'Playing...' : 'Play'}
  </button>
  </div>
  </div>
  )}

  {!translation && message.text && (
  <div className="px-4 py-3 text-center border-b border-gray-100 ">
  <p className="text-xs text-gray-400">No translation yet</p>
  </div>
  )}

  <div className="px-4 py-3 flex items-center justify-between text-xs">
  <div>
  <span className="text-gray-400 font-medium">Sent </span>
  <span className="font-bold text-gray-700 ">
  {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
  </span>
  </div>
  <div className={`flex items-center gap-1 font-bold ${message.status === 'read' ? 'text-blue-500' : 'text-gray-400'}`}>
  <span className="text-sm tracking-[-0.15em]">{message.status === 'sent' ? '✓' : '✓✓'}</span>
  <span className="capitalize">{message.status || 'sent'}</span>
  </div>
  </div>
  </div>
  </div>
  </div>
  );
};




const Sidebar = ({ user, activeTab, onTabChange, onProfileClick, logoSrc, totalUnreadChats, totalUnreadArchived, totalUnreadStatuses, showInstallIcon, onOpenInstallModal }) => {
  const tabs = [
  { id: 'chats', icon: Icons.chat, label: 'Messages', badge: totalUnreadChats },
  { id: 'status', icon: Icons.status, label: 'Status', badge: totalUnreadStatuses },
  { id: 'gallery', icon: Icons.image, label: 'Media Gallery' },
  { id: 'archived', icon: Icons.archive, label: 'Archived', badge: totalUnreadArchived },
  { id: 'settings', icon: Icons.settings, label: 'Settings' },
  ];

  return (
  <aside className="app-sidebar relative">
  <div className="sidebar-logo" style={{ background: '#2563eb' }}>
  <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg>
  </div>

  <div className="flex-1 w-full flex flex-col items-center gap-6 mt-6">
  {tabs.map(tab => (
  <div
  key={tab.id}
  className={`sidebar-icon relative ${activeTab === tab.id ? 'active' : ''}`}
  onClick={() => onTabChange(tab.id)}
  title={tab.label}
  >
  {tab.icon}
  {tab.badge > 0 && (
  <span
  style={{
  position: "absolute",
  top: "-4px",
  right: "-4px",
  backgroundColor: "var(--safari-green)", // solid green
  color: "#ffffff",
  fontSize: "10px",
  fontWeight: "700",
  minWidth: "16px",
  height: "16px",
  padding: "0 4px",
  borderRadius: "9999px",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  pointerEvents: "none",
  boxShadow: "0 1px 2px rgba(0,0,0,0.15)"
  }}
  >
  {tab.badge > 99 ? "99+" : tab.badge}
  </span>
  )}
  </div>
  ))}
  </div>

  <div className="pb-8 flex flex-col items-center gap-4">
  {showInstallIcon && (
  <button
  onClick={onOpenInstallModal}
  className="w-10 h-10 bg-[#E64A19]/20 hover:bg-[#E64A19] text-[#E64A19] hover:text-white rounded-xl flex items-center justify-center transition-all shadow-sm group relative"
  title="Install Textmob App"
  >
  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
  <span className="absolute left-full ml-2 px-2 py-1 bg-black text-white text-[10px] rounded shadow-lg whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
  Install Textmob App
  </span>
  </button>
  )}
  <div className="relative group">
  <img
  src={user?.avatar_url || DEFAULT_AVATAR}
  className="sidebar-avatar"
  onClick={onProfileClick}
  title="My Profile"
  />
  <div className="absolute inset-0 rounded-12 border-2 border-green opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
  </div>
  </div>
  </aside>
  );
};

const BottomBar = ({ activeTab, onTabChange, onProfileClick, totalUnreadChats, totalUnreadStatuses }) => {
  const [collapsed, setCollapsed] = useState(false);
  const [position, setPosition] = useState({ x: 20, y: 500 });

  const dragging = useRef(false);
  const offset = useRef({ x: 0, y: 0 });

  const items = [
  // Textmob port (embedded only): way back to the Textmob app
  ...(LOUDA_EMBEDDED ? [{ id: '__back', icon: Icons.arrowLeft, label: 'Back' }] : []),
  { id: "chats", icon: Icons.chat, label: "Chats" },
  { id: "status", icon: Icons.status, label: "Status" },
  // { id: "calls", icon: Icons.phone, label: "Calls" },
  { id: "settings", icon: Icons.settings, label: "Settings" },
  ];

  // ---- DRAG HANDLERS ----
  const startDrag = (e) => {
  dragging.current = true;

  const clientX = e.touches ? e.touches[0].clientX : e.clientX;
  const clientY = e.touches ? e.touches[0].clientY : e.clientY;

  offset.current = {
  x: clientX - position.x,
  y: clientY - position.y,
  };
  };

  const onDrag = (e) => {
  if (!dragging.current) return;

  const clientX = e.touches ? e.touches[0].clientX : e.clientX;
  const clientY = e.touches ? e.touches[0].clientY : e.clientY;

  setPosition({
  x: clientX - offset.current.x,
  y: clientY - offset.current.y,
  });
  };

  const stopDrag = () => {
  if (!dragging.current) return;
  dragging.current = false;

  // snap to nearest edge
  const screenWidth = window.innerWidth;
  const btnWidth = 50;

  setPosition((prev) => ({
  x: prev.x + btnWidth / 2 > screenWidth / 2
  ? screenWidth - btnWidth - 10
  : 10,
  y: Math.max(10, Math.min(prev.y, window.innerHeight - 60)),
  }));
  };

  useEffect(() => {
  window.addEventListener("mousemove", onDrag);
  window.addEventListener("mouseup", stopDrag);
  window.addEventListener("touchmove", onDrag);
  window.addEventListener("touchend", stopDrag);

  return () => {
  window.removeEventListener("mousemove", onDrag);
  window.removeEventListener("mouseup", stopDrag);
  window.removeEventListener("touchmove", onDrag);
  window.removeEventListener("touchend", stopDrag);
  };
  }, []);

  // ---- COLLAPSED FLOATING BUTTON ----
  if (collapsed) {
  return (
  <div
  style={{
  position: "fixed",
  left: position.x,
  top: position.y,
  zIndex: 9999,
  }}
  >
  <div
  onMouseDown={startDrag}
  onTouchStart={startDrag}
  onClick={() => {
  if (!dragging.current) setCollapsed(false);
  }}
  style={{
  width: "50px",
  height: "50px",
  borderRadius: "50%",
  backgroundColor: "var(--safari-green)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  color: "#fff",
  fontSize: "20px",
  boxShadow: "0 4px 12px rgba(0,0,0,0.25)",
  cursor: "pointer",
  userSelect: "none",
  }}
  >
  ☰

  {/* unread badge on floating button */}
  {totalUnreadChats > 0 && (
  <span
  style={{
  position: "absolute",
  top: "-4px",
  right: "-4px",
  backgroundColor: "var(--safari-green)",
  color: "#fff",
  fontSize: "10px",
  fontWeight: 700,
  padding: "2px 5px",
  borderRadius: "9999px",
  border: "2px solid white",
  }}
  >
  {totalUnreadChats > 99 ? "99+" : totalUnreadChats}
  </span>
  )}
  </div>
  </div>
  );
  }

  // ---- FULL NAV ----
  return (
  <nav className="bottom-nav" data-native-mobile={isNativeMobileDevice() ? "true" : "false"}>
  {/* collapse button */}
  <div
  onClick={() => setCollapsed(true)}
  style={{
  position: "absolute",
  top: "-14px",  // less aggressive offset
  right: "8px",
  width: "24px",  // smaller, matches badge scale
  height: "24px",
  borderRadius: "50%",
  backgroundColor: "var(--safari-green)",
  color: "#ffffff",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  cursor: "pointer",
  fontSize: "12px",  // better visual balance
  fontWeight: "700",
  lineHeight: 1,
  boxShadow: "0 2px 4px rgba(0,0,0,0.15)",
  zIndex: 20
  }}
  >
  ▾
  </div>

  {items.map((item) => (
  <div
  key={item.id}
  className={`bottom-nav-item ${activeTab === item.id ? "active" : ""
  }`}
  onClick={() => {
  if (item.id === "profile") onProfileClick();
  else if (item.id === "__back") {
  if (window.Lexum?.navigate) window.Lexum.navigate('/');
  }
  else if (item.id === "calls")
  Lexum.alert({
  title: "Calls",
  message: "Voice and video calls coming soon!",
  });
  else onTabChange(item.id);
  }}
  >
  <div className="bottom-nav-icon relative">
  {item.icon}

  {item.id === "chats" && totalUnreadChats > 0 && (
  <span
  style={{
  position: "absolute",
  top: "-4px",
  right: "-6px",
  backgroundColor: "var(--safari-green)",
  color: "#fff",
  fontSize: "10px",
  fontWeight: 700,
  padding: "2px 6px",
  borderRadius: "9999px",
  }}
  >
  {totalUnreadChats > 99 ? "99+" : totalUnreadChats}
  </span>
  )}

  {item.id === "status" && totalUnreadStatuses > 0 && (
  <span
  style={{
  position: "absolute",
  top: "-4px",
  right: "-6px",
  backgroundColor: "var(--safari-green)",
  color: "#fff",
  fontSize: "10px",
  fontWeight: 700,
  padding: "2px 6px",
  borderRadius: "9999px",
  }}
  >
  {totalUnreadStatuses > 99 ? "99+" : totalUnreadStatuses}
  </span>
  )}
  </div>

  <span className="bottom-nav-label">{item.label}</span>
  </div>
  ))}
  </nav>
  );
};

const UnifiedProfileView = ({ chat, user, messages, contacts, groups, onClose, onAction, onUpdateField, onUploadAvatar, isBlocked, onToggleBlock, initialViewState = 'main' }) => {

  const isGroup = chat?.isGroup || !!chat?.members || !!chat?.admin_id;
  const isMe = user && chat && String(user.id) === String(chat.id) && !isGroup;
  const isAdmin = isGroup && user && chat && String(chat.admin_id) === String(user.id);
  const isInContacts = !isGroup && chat && contacts?.some(c => String(c.id) === String(chat.id));

  const [viewState, setViewState] = useState(initialViewState); // 'main', 'settings', 'admin'
  const [showAvatarOptions, setShowAvatarOptions] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editValue, setEditValue] = useState('');
  const [editField, setEditField] = useState(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);

  useEffect(() => {
  setViewState(initialViewState);
  }, [initialViewState]);




  const mediaMessages = useMemo(() => {
  if (!messages) return [];
  return messages.filter(m => m.media && m.media.length > 0)
  .flatMap(m => m.media.map(media => ({ ...media, messageId: m.id, timestamp: m.timestamp })))
  .reverse();
  }, [messages]);

  const pinnedMessages = useMemo(() => {
  if (!messages) return [];
  return messages.filter(m => m.is_pinned).reverse();
  }, [messages]);

  // Removed old viewState state here since it's now initialized above with initialViewState


  const handleEdit = (field, current) => {
  setEditField(field);
  setEditValue(current || '');
  setEditing(true);
  };

  const handleSave = () => {
  onUpdateField(chat.id, editField, editValue, isGroup);
  setEditing(false);
  setEditField(null);
  };

  const handleFileSelect = (e) => {
  const file = e.target.files[0];
  if (file) {
  onUploadAvatar(chat.id, file, isGroup);
  setShowAvatarOptions(false);
  }
  };


  // Parallax helper
  const [scrollY, setScrollY] = useState(0);

  return (
  <div className="fixed inset-0 z-[100] bg-black/40 backdrop-blur-sm flex justify-end animate-fade-in" onClick={onClose}>
  <div className="profile-drawer w-full md:w-[450px] bg-white  shadow-2xl overflow-hidden relative flex flex-col" onClick={e => e.stopPropagation()}>
  <div className="flex-1 overflow-y-auto no-scrollbar" onScroll={(e) => setScrollY(e.target.scrollTop)}>
  <div className="relative h-[300px] w-full">
  <div
  className="absolute inset-0 bg-cover bg-center transition-transform duration-100 ease-out origin-top"
  style={{
  backgroundImage: `url(${chat?.avatar_url || DEFAULT_AVATAR})`,
  transform: `translateY(${scrollY * 0.3}px)`
  }}
  />
  <div className="absolute inset-0 bg-gradient-to-t from-gray-900/80 via-transparent to-black/10" />

  <div className="absolute top-4 left-4 right-4 flex justify-between items-center z-10">
  <button onClick={onClose} className="w-11 h-11 rounded-full bg-white/20 text-white backdrop-blur-md hover:bg-white/30 transition flex items-center justify-center">
  {Icons.arrowLeft}
  </button>
  {(isMe || isAdmin) && (
  <button onClick={() => setShowAvatarOptions(true)} className="w-11 h-11 rounded-full bg-white/20 text-white backdrop-blur-md hover:bg-white/30 transition flex items-center justify-center" disabled={uploading}>
  {uploading ? Icons.loading : Icons.camera}
  </button>
  )}
  <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileSelect} />
  </div>

  {showAvatarOptions && createPortal(
  <div className="fixed inset-0 z-[200] bg-black/80 backdrop-blur-md flex items-center justify-center p-6 animate-fade-in" onClick={(e) => { e.stopPropagation(); setShowAvatarOptions(false); }}>
  <div className="w-full max-w-xs bg-white  rounded-[32px] p-6 space-y-3 animate-zoom-in shadow-2xl" onClick={e => e.stopPropagation()}>

  <h3 className="text-center font-black text-gray-800  uppercase tracking-tighter mb-4 italic">Update Photo</h3>
  <button
  onClick={() => { setShowCamera(true); setShowAvatarOptions(false); }}
  className="w-full p-4 flex items-center gap-4 bg-gray-50  hover:bg-green-50  text-gray-700  rounded-2xl transition font-bold"
  >
  <div className="text-green-500">{Icons.camera}</div> Take Photo
  </button>
  <button
  onClick={() => fileInputRef.current.click()}
  className="w-full p-4 flex items-center gap-4 bg-gray-50  hover:bg-blue-50  text-gray-700  rounded-2xl transition font-bold"
  >
  <div className="text-blue-500">{Icons.image}</div> Upload Image
  </button>
  <button onClick={() => setShowAvatarOptions(false)} className="w-full p-4 text-center font-black text-gray-400 uppercase tracking-widest text-xs mt-2">
  Cancel
  </button>
  </div>
  </div>,
  document.body
  )}

  {showCamera && createPortal(
  <div onClick={e => e.stopPropagation()} className="fixed inset-0 z-[200]">
  <CameraOverlay
  onClose={() => setShowCamera(false)}
  photoOnly={true}
  onCapture={(capturedFiles) => {
  const fileToUpload = Array.isArray(capturedFiles) ? capturedFiles[0] : capturedFiles;
  onUploadAvatar(chat.id, fileToUpload, isGroup);
  setShowCamera(false);
  }}
  />
  </div>,
  document.body
  )}




  <div className="absolute bottom-6 left-6 right-6 text-white">
  <div className="flex items-center gap-2 mb-1">
  <h1 className="text-3xl font-black tracking-tight">{chat?.name || chat?.full_name}</h1>
  {(isMe || isAdmin || (!isGroup && !isMe && isInContacts && chat?.is_system !== 'ai' && chat?.id !== '22222222-2222-2222-2222-222222222222' && chat?.number !== 'support')) && (
  <button onClick={() => handleEdit('name', chat?.name || chat?.full_name)} className="opacity-70 hover:opacity-100 transition">
  {Icons.edit}
  </button>
  )}
  </div>
  {/* Own nickname in group */}
  {isGroup && (() => {
  const myMember = chat?.members?.find(m => String(m.user_id) === String(user?.id));
  const myNickname = myMember?.nickname;
  return myNickname ? (
  <div className="flex items-center gap-2 mb-3 opacity-80">
  <span className="text-base font-bold bg-white/20 px-3 py-1 rounded-lg italic">You: @{myNickname}</span>
  <button onClick={() => handleEdit('nickname', myNickname)} className="opacity-70 hover:opacity-100 transition scale-75">
  {Icons.edit}
  </button>
  </div>
  ) : (
  <button onClick={() => handleEdit('nickname', '')} className="text-sm font-bold bg-white/20 px-3 py-1.5 rounded-lg mb-3 opacity-70 hover:opacity-100 transition">
  + Set your nickname
  </button>
  );
  })()}
  {/* Personal profile nickname */}
  {!isGroup && chat?.nickname && chat?.is_system !== 'ai' && (
  <div className="flex items-center gap-2 mb-3 opacity-80">
  <span className="text-base font-bold bg-white/20 px-3 py-1 rounded-lg italic">@{chat.nickname}</span>
  {isMe && (
  <button onClick={() => handleEdit('nickname', chat.nickname)} className="opacity-70 hover:opacity-100 transition scale-75">
  {Icons.edit}
  </button>
  )}
  </div>
  )}
  {!isGroup && chat?.is_system !== 'ai' && <p className="text-base opacity-90 font-bold tracking-wide">{chat?.phone || chat?.number}</p>}
  {isGroup && <p className="text-base opacity-90 font-bold tracking-wide uppercase">{chat?.members?.length} members</p>}
  </div>
  </div>

  <div className="p-6 md:p-8 -mt-6 relative bg-white  rounded-t-[32px] min-h-[calc(100%-270px)]">


  <div className="space-y-10">
  <section>
  <div className="flex items-center justify-between mb-4 px-1">
  <h3 className="text-[11px] font-black text-green-600 tracking-[0.2em] uppercase opacity-70">About</h3>
  {(isMe || isAdmin) && (
  <button onClick={() => handleEdit('description', chat?.description || chat?.status)} className="p-1.5 hover:bg-gray-100  rounded-lg transition text-gray-400">
  {Icons.edit}
  </button>
  )}
  </div>
  <div className="p-5 bg-gray-50  rounded-2xl border border-gray-100 ">
  <p className="text-gray-700  font-medium text-sm leading-relaxed">
  {chat?.description || chat?.preferences?.status || chat?.status || (isGroup ? 'No group description' : 'Hey there! I am using Textmob.')}
  </p>
  </div>
  </section>

  {isGroup && (
  <section>
  <div className="flex items-center justify-between mb-4 px-1">
  <h3 className="text-[11px] font-black text-green-600 tracking-[0.2em] uppercase opacity-70">{chat.members?.length} Members</h3>
  {isAdmin && (
  <button onClick={() => onAction('addMembers', chat)} className="text-[10px] font-black text-green-600 hover:text-green-700 transition uppercase tracking-widest">
  + Add Members
  </button>
  )}
  </div>
  <div className="space-y-3 max-h-[400px] overflow-y-auto no-scrollbar pr-1">
  {chat.members?.map(m => (
  <div key={m.user_id} className="flex items-center gap-4 p-3 hover:bg-gray-50  rounded-2xl transition cursor-pointer border border-transparent hover:border-gray-100" onClick={() => onAction('viewMember', m.user_id)}>
  <img src={m.avatar_url || DEFAULT_AVATAR} className="w-14 h-14 rounded-full object-cover ring-2 ring-[#E64A19]/15" />
  <div className="flex-1 min-w-0">
  <div className="font-bold text-base text-gray-800  truncate flex items-center gap-2">
  {m.nickname || m.real_name}
  {m.role === 'admin' && <span className="text-[10px] bg-green-100  text-green-600 px-1 rounded uppercase font-black">Admin</span>}
  </div>
  <div className="text-sm text-gray-400 truncate font-medium">{m.status || (m.role === 'admin' ? 'Group Admin' : 'Member')}</div>
  </div>
  {isAdmin && m.user_id !== user.id && (
  <div className="flex gap-1 shrink-0">
  {m.role !== 'admin' ? (
  <button
  onClick={(e) => { e.stopPropagation(); onAction('promoteAdmin', m.user_id); }}
  className="p-2 text-green-500 hover:bg-green-50  rounded-lg transition"
  title="Promote to Admin"
  >
  {Icons.shieldPlus}
  </button>
  ) : (
  chat.admin_id === user.id && (
  <button
  onClick={(e) => { e.stopPropagation(); onAction('demoteAdmin', m.user_id); }}
  className="p-2 text-amber-500 hover:bg-amber-50  rounded-lg transition"
  title="Demote from Admin"
  >
  {Icons.shieldMinus}
  </button>
  )
  )}
  <button
  onClick={(e) => { e.stopPropagation(); onAction('removeMember', m.user_id); }}
  className="p-2 text-red-500 hover:bg-red-50  rounded-lg transition"
  title="Remove Member"
  >
  {Icons.trash}
  </button>
  </div>
  )}
  </div>
  ))}
  </div>
  </section>
  )}
  {pinnedMessages.length > 0 && (
  <section>
  <div className="flex items-center justify-between mb-4 px-1">
  <h3 className="text-[11px] font-black text-amber-600 tracking-[0.2em] uppercase opacity-70">Pinned Messages</h3>
  <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{pinnedMessages.length} pinned</span>
  </div>
  <div className="space-y-2">
  {pinnedMessages.map(m => (
  <div
  key={m.id}
  className="p-4 bg-amber-50/50  rounded-2xl border border-amber-100/50  cursor-pointer hover:bg-amber-100/50 transition flex gap-3 items-start"
  onClick={() => {
  onClose();
  setTimeout(() => {
  const el = document.getElementById(`msg-${m.id}`);
  if (el) {
  el.scrollIntoView({ behavior: 'smooth', block: 'center' });
  el.classList.add('flash-highlight');
  setTimeout(() => el.classList.remove('flash-highlight'), 2000);
  }
  }, 100);
  }}
  >
  <div className="text-amber-600 mt-0.5">{Icons.pin || '📌'}</div>
  <div className="flex-1 min-w-0">
  <p className="text-xs font-bold text-gray-800  line-clamp-2 leading-relaxed">
  {m.text || 'Media Message'}
  </p>
  <p className="text-[9px] text-gray-400 mt-1 uppercase font-black">
  {new Date(m.timestamp).toLocaleDateString()}
  </p>
  </div>
  </div>
  ))}
  </div>
  </section>
  )}

  <section>
  <div className="flex items-center justify-between mb-4 px-1">
  <h3 className="text-[11px] font-black text-purple-600 tracking-[0.2em] uppercase opacity-70">Configuration</h3>
  </div>
  <div className="space-y-2">
  <button onClick={() => setViewState('settings')} className="w-full p-4 flex items-center justify-between bg-gray-50  rounded-2xl border border-gray-100  hover:bg-gray-100  transition">
  <div className="flex items-center gap-3">
  <div className="text-purple-500">{Icons.settings}</div>
  <span className="text-sm font-bold text-gray-700 ">Chat Settings</span>
  </div>
  <div className="text-gray-400">{Icons.chevronRight}</div>
  </button>
  {isAdmin && (
  <button onClick={() => setViewState('admin')} className="w-full p-4 flex items-center justify-between bg-red-50  rounded-2xl border border-red-100  hover:bg-red-100  transition">
  <div className="flex items-center gap-3">
  <div className="text-red-500">{Icons.lock}</div>
  <span className="text-sm font-bold text-red-700 ">Admin Controls</span>
  </div>
  <div className="text-red-400">{Icons.chevronRight}</div>
  </button>
  )}
  </div>
  </section>
  <section>
  <div className="flex items-center justify-between mb-4 px-1">
  <h3 className="text-[11px] font-black text-green-600 tracking-[0.2em] uppercase opacity-70">Media & Docs</h3>
  <button className="text-[10px] font-black text-gray-400 hover:text-green-600 transition uppercase">{mediaMessages.length} items</button>
  </div>
  {mediaMessages.length > 0 ? (
  <div className="grid grid-cols-3 gap-3">
  {mediaMessages.slice(0, 6).map((m, i) => (
  <div key={i} className="aspect-square rounded-2xl bg-gray-100  overflow-hidden cursor-pointer hover:opacity-80 transition relative border border-gray-100  group" onClick={() => Lexum.viewMedia(m.url, m.type)}>
  {m.type === 'video' ? (
  <div className="w-full h-full flex items-center justify-center text-white bg-black/40 text-xl">{Icons.play}</div>
  ) : m.type === 'audio' || m.type === 'voice' ? (
  <div className="w-full h-full flex items-center justify-center text-green-600 bg-green-50 text-xl">{Icons.audio}</div>
  ) : m.type === 'file' || m.type === 'document' ? (
  <div className="w-full h-full flex flex-col items-center justify-center text-blue-600 bg-blue-50 p-2 text-center">
  <div className="text-xl mb-1">{Icons.file}</div>
  <span className="text-[8px] font-black uppercase truncate w-full">{m.name || 'Doc'}</span>
  </div>
  ) : (
  <img src={m.url} className="w-full h-full object-cover transition duration-500 group-hover:scale-110" loading="lazy" />
  )}
  </div>
  ))}
  </div>
  ) : (
  <div className="py-12 bg-gray-50  rounded-[32px] border-2 border-dashed border-gray-100  flex flex-col items-center justify-center opacity-40">
  <div className="mb-3 scale-150">{Icons.image}</div>
  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-500">No media shared</p>
  </div>
  )}
  </section>

  {/* Groups in Common */}
  {!isMe && !isGroup && contacts && chat?.id !== '22222222-2222-2222-2222-222222222222' && chat?.number !== 'support' && chat?.is_system !== 'ai' && chat?.id !== '11111111-1111-1111-1111-111111111111' && (() => {
  // Find groups the viewed user is part of that the current user is also part of
  const viewedUserId = chat?.id;
  if (!viewedUserId) return null;
  const sharedGroups = (groups || []).filter(g =>
  g.members_ids && g.members_ids.includes(viewedUserId)
  );
  if (sharedGroups.length === 0) return null;
  return (
  <section>
  <h3 className="text-[11px] font-black text-green-600 tracking-[0.2em] uppercase opacity-70 mb-4 px-1">
  Groups in Common ({sharedGroups.length})
  </h3>
  <div className="space-y-2">
  {sharedGroups.map(g => (
  <div key={g.id} className="flex items-center gap-3 p-3 hover:bg-gray-50  rounded-2xl transition cursor-pointer border border-transparent hover:border-gray-100" onClick={() => onAction('message', { ...g, isGroup: true })}>
  <img src={g.avatar_url || DEFAULT_AVATAR} className="w-10 h-10 rounded-xl object-cover ring-1 ring-[#E64A19]/15" alt="" />
  <div className="flex-1 min-w-0">
  <p className="text-sm font-bold text-gray-800  truncate">{g.name}</p>
  <p className="text-[10px] text-gray-400 truncate">{g.members_ids?.length || 0} members</p>
  </div>
  </div>
  ))}
  </div>
  </section>
  );
  })()}

  <section className="pt-6 border-t border-gray-50  space-y-3">
  {(!isGroup && isInContacts && chat?.id !== '11111111-1111-1111-1111-111111111111' && chat?.id !== '22222222-2222-2222-2222-222222222222' && chat?.number !== 'support' && chat?.is_system !== 'ai') && (
  <button onClick={() => onAction('delete', chat)} className="w-full p-4 flex items-center justify-between bg-red-50  text-red-500 rounded-2xl hover:bg-red-100 transition group" title="Delete Contact">
  <span className="text-xs font-black uppercase tracking-widest italic">Delete Contact</span>
  <div className="group-hover:rotate-12 transition-transform">{Icons.trash}</div>
  </button>
  )}
  {isGroup && (
  <button onClick={() => onAction('leave', chat)} className="w-full p-4 flex items-center justify-between bg-red-50  text-red-500 rounded-2xl hover:bg-red-100 transition group">
  <span className="text-xs font-black uppercase tracking-widest italic">Leave Group</span>
  <div className="group-hover:-rotate-12 transition-transform">{Icons.trash}</div>
  </button>
  )}
  {!isMe && !isGroup && chat?.id !== '11111111-1111-1111-1111-111111111111' && chat?.id !== '22222222-2222-2222-2222-222222222222' && chat?.number !== 'support' && chat?.is_system !== 'ai' && (
  <button onClick={() => onToggleBlock(chat.id)} className={`w-full p-4 flex items-center justify-between ${isBlocked ? 'bg-gray-100  text-gray-700 ' : 'bg-gray-50  text-gray-400'} rounded-2xl hover:opacity-80 transition group`}>
  <span className="text-xs font-black uppercase tracking-widest italic">{isBlocked ? 'Unblock Contact' : 'Block Contact'}</span>
  <div className="group-hover:scale-110 transition-transform">{Icons.block}</div>
  </button>
  )}
  </section>
  </div>
  </div>
  </div>
  {viewState !== 'main' && (
  <div className="absolute inset-0 bg-white  z-50 flex flex-col animate-slide-left">
  <div className="p-4 flex items-center gap-4 border-b ">
  <button onClick={() => setViewState('main')} className="w-10 h-10 rounded-full flex items-center justify-center bg-gray-100  text-gray-600  hover:bg-gray-200  transition">
  {Icons.arrowLeft}
  </button>
  <h2 className="text-lg font-black text-gray-800  uppercase tracking-tight">
  {viewState === 'settings' ? 'Chat Settings' : 'Admin Controls'}
  </h2>
  </div>
  <div className="flex-1 overflow-y-auto p-4 space-y-6">
  {viewState === 'settings' && (
  <section>
  <h3 className="text-[11px] font-black text-purple-600 tracking-[0.2em] uppercase opacity-70 mb-4 px-1">Chat Background</h3>
  <div className="space-y-2">
  <button onClick={() => {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = 'image/*';
  input.onchange = (e) => {
  const file = e.target.files[0];
  if (file) {
  const reader = new FileReader();
  reader.onload = (event) => onAction('setBackground', { id: chat.id, bgUrl: event.target.result });
  reader.readAsDataURL(file);
  }
  };
  input.click();
  }} className="w-full p-4 flex items-center justify-between bg-gray-50  rounded-2xl border border-gray-100  hover:bg-gray-100  transition">
  <div className="flex items-center gap-3">
  <div className="text-purple-500">{Icons.image}</div>
  <span className="text-sm font-bold text-gray-700 ">Upload Image</span>
  </div>
  </button>
  <button onClick={() => {
  const url = window.prompt('Enter an image URL for the background:');
  if (url) onAction('setBackground', { id: chat.id, bgUrl: url });
  }} className="w-full p-4 flex items-center justify-between bg-gray-50  rounded-2xl border border-gray-100  hover:bg-gray-100  transition">
  <div className="flex items-center gap-3">
  <div className="text-purple-500">{Icons.search}</div>
  <span className="text-sm font-bold text-gray-700 ">Use URL</span>
  </div>
  </button>
  <button onClick={() => onAction('setBackground', { id: chat.id, bgUrl: null })} className="w-full p-4 flex items-center justify-between bg-gray-50  rounded-2xl border border-gray-100  hover:bg-gray-100  transition text-red-500">
  <span className="text-sm font-bold">Remove Background</span>
  </button>
  </div>
  </section>
  )}

  {viewState === 'admin' && isAdmin && (
  <section>
  <h3 className="text-[11px] font-black text-red-600 tracking-[0.2em] uppercase opacity-70 mb-4 px-1">Permissions</h3>
  <div className="space-y-2">
  <div className="flex items-center justify-between p-4 bg-gray-50  rounded-2xl border border-gray-100 ">
  <div className="flex items-center gap-3">
  <div className="text-red-500">{Icons.lock}</div>
  <div className="flex flex-col">
  <span className="text-sm font-bold text-gray-700 ">Admin-Only Messaging</span>
  <span className="text-[10px] text-gray-500">Only admins can send messages.</span>
  </div>
  </div>
  <label className="relative inline-flex items-center cursor-pointer">
  <input
  type="checkbox"
  className="sr-only peer"
  checked={chat?.settings?.admin_only || false}
  onChange={(e) => onUpdateField(chat.id, 'settings.admin_only', e.target.checked, isGroup)}
  />
  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer  peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all  peer-checked:bg-red-600"></div>
  </label>
  </div>
  </div>
  </section>
  )}
  </div>
  </div>
  )}
  </div>

  {editing && (
  <div className="fixed inset-0 z-[130] bg-black/60 backdrop-blur-md flex items-end md:items-center justify-center" onClick={() => setEditing(false)}>
  <div className="bg-white  w-full h-[100dvh] md:h-auto max-w-sm rounded-none md:rounded-[32px] p-8 shadow-2xl animate-slide-up flex flex-col" onClick={e => e.stopPropagation()}>
  <div className="shrink-0">
  <h2 className="text-xl font-black mb-6 text-gray-800  uppercase tracking-tight italic">Edit {editField}</h2>
  </div>
  <div className="flex-1">
  <textarea
  autoFocus
  value={editValue}
  onChange={e => setEditValue(e.target.value)}
  className="w-full p-4 bg-gray-50  border-2 border-transparent focus:border-green-600 rounded-2xl mb-8 outline-none text-gray-700  min-h-[120px] font-medium transition-all"
  placeholder={`Enter your ${editField}...`}
  />
  </div>
  <div className="flex gap-4 shrink-0">
  <Button onClick={() => setEditing(false)} variant="secondary" className="flex-1">Cancel</Button>
  <Button onClick={handleSave} variant="primary" className="flex-1">Save</Button>
  </div>
  </div>
  </div>
  )}
  </div>
  );
};

const CreateGroupModal = ({ onClose, onCreate, contacts }) => {
  const [groupName, setGroupName] = useState('');
  const [groupDescription, setGroupDescription] = useState('');
  const [selectedMembers, setSelectedMembers] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');

  const toggleMember = (contactId) => {
  setSelectedMembers(prev =>
  prev.includes(contactId) ? prev.filter(id => id !== contactId) : [...prev, contactId]
  );
  };

  const filteredContacts = contacts.filter(c => {
  if (c.id === '22222222-2222-2222-2222-222222222222' || c.number === 'support') return false;
  if (!searchQuery) return true;
  const q = searchQuery.toLowerCase();
  return (c.name || '').toLowerCase().includes(q) || (c.number || '').toLowerCase().includes(q);
  });

  return (
  <Modal isOpen={true} onClose={onClose} title="Create Group"
  footer={
  <Button
  onClick={() => onCreate(groupName, groupDescription, selectedMembers)}
  variant="primary"
  className="w-full py-4 text-sm font-black uppercase tracking-widest"
  disabled={!groupName.trim()}
  >
  {selectedMembers.length === 0 ? 'Create Solo Group' : `Create Group (${selectedMembers.length + 1} members)`}
  </Button>
  }
  >
  <div className="space-y-6">
  <Input
  label="Group Name"
  value={groupName}
  onChange={e => setGroupName(e.target.value)}
  placeholder="e.g. Family Chat"
  />
  <Input
  label="Description (optional)"
  value={groupDescription}
  onChange={e => setGroupDescription(e.target.value)}
  placeholder="What's this group about?"
  />
  <div>
  <h3 className="text-[11px] font-black text-green-600 tracking-[0.2em] uppercase opacity-70 mb-4 px-1">Select Members</h3>
  <div className="relative mb-3">
  <div className="absolute left-3 top-1/2 -translate-y-1/2 flex items-center text-gray-400">{Icons.search}</div>
  <input
  type="search"
  placeholder="Search contacts..."
  value={searchQuery}
  onChange={(e) => setSearchQuery(e.target.value)}
  className="w-full pl-10 pr-4 py-2 bg-gray-100  border-none rounded-xl text-xs focus:ring-2 ring-green-500/50 outline-none "
  />
  </div>
  <div className="space-y-2 max-h-[300px] overflow-y-auto no-scrollbar pr-1">
  {filteredContacts.map(c => (
  <label key={c.id} className="flex items-center gap-3 p-3 bg-gray-50  rounded-2xl border border-transparent hover:border-green-600/20 transition cursor-pointer">
  <input
  type="checkbox"
  checked={selectedMembers.includes(c.id)}
  onChange={() => toggleMember(c.id)}
  className="w-5 h-5 text-green-600 bg-white border-2 border-gray-200 rounded-lg focus:ring-green-600/20"
  />
  <img src={c.avatar_url || DEFAULT_AVATAR} className="w-8 h-8 rounded-full border border-gray-200" />
  <span className="font-bold text-gray-700 ">{c.name}</span>
  </label>
  ))}
  {filteredContacts.length === 0 && (
  <p className="text-center py-8 text-gray-500 text-sm">No contacts found</p>
  )}
  </div>
  </div>
  </div>
  </Modal>
  );
};

const AddMembersModal = ({ group, onClose, onAdd, contacts }) => {
  const [selectedMembers, setSelectedMembers] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');

  const existingMemberIds = group.members?.map(m => String(m.user_id)) || [];
  const availableContacts = contacts.filter(c => !existingMemberIds.includes(String(c.id)) && c.id !== '22222222-2222-2222-2222-222222222222' && c.number !== 'support');

  const toggleMember = (contactId) => {
  setSelectedMembers(prev =>
  prev.includes(contactId) ? prev.filter(id => id !== contactId) : [...prev, contactId]
  );
  };

  const handleAdd = () => {
  if (selectedMembers.length === 0) return;
  onAdd(group.id, selectedMembers);
  onClose();
  };

  const filteredContacts = availableContacts.filter(c => {
  if (!searchQuery) return true;
  const q = searchQuery.toLowerCase();
  return (c.name || '').toLowerCase().includes(q) || (c.number || '').toLowerCase().includes(q);
  });

  return (
  <Modal isOpen={true} onClose={onClose} title={`Add Members to ${group.name}`}
  footer={
  <Button
  onClick={handleAdd}
  variant="primary"
  className="w-full py-4 text-lg"
  disabled={selectedMembers.length === 0}
  >
  Add Members ({selectedMembers.length})
  </Button>
  }
  >
  <div className="space-y-6">
  <div>
  <h3 className="text-[11px] font-black text-green-600 tracking-[0.2em] uppercase opacity-70 mb-4 px-1">Select Contacts to Add</h3>
  <div className="relative mb-3">
  <div className="absolute left-3 top-1/2 -translate-y-1/2 flex items-center text-gray-400">{Icons.search}</div>
  <input
  type="search"
  placeholder="Search contacts..."
  value={searchQuery}
  onChange={(e) => setSearchQuery(e.target.value)}
  className="w-full pl-10 pr-4 py-2 bg-gray-100  border-none rounded-xl text-xs focus:ring-2 ring-green-500/50 outline-none "
  />
  </div>
  <div className="space-y-2 max-h-[300px] overflow-y-auto no-scrollbar pr-1">
  {filteredContacts.length === 0 ? (
  <p className="text-center py-8 text-gray-500">No available contacts to add</p>
  ) : (
  filteredContacts.map(c => (
  <label key={c.id} className="flex items-center gap-3 p-3 bg-gray-50  rounded-2xl border border-transparent hover:border-green-600/20 transition cursor-pointer">
  <input
  type="checkbox"
  checked={selectedMembers.includes(c.id)}
  onChange={() => toggleMember(c.id)}
  className="w-5 h-5 text-green-600 bg-white border-2 border-gray-200 rounded-lg focus:ring-green-600/20"
  />
  <img src={c.avatar_url || DEFAULT_AVATAR} className="w-8 h-8 rounded-full border border-gray-200" />
  <span className="font-bold text-gray-700 ">{c.name}</span>
  </label>
  ))
  )}
  </div>
  </div>
  </div>
  </Modal>
  );
};

const LoginScreen = () => {
  const [loginMethod, setLoginMethod] = useState('username'); // 'username' or 'phone'
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Textmob Integration State
  const [textmobMode, setTextmobMode] = useState(false);
  const [isInIframe, setIsInIframe] = useState(true);
  const [textmobUser, setTextmobUser] = useState(null);
  const [phoneToVerify, setPhoneToVerify] = useState('');
  const [isNewUser, setIsNewUser] = useState(true);

  useEffect(() => {
  const searchStr = window.location.search || (window.location.hash.includes('?') ? window.location.hash.split('?')[1] : '');
  const params = new URLSearchParams(searchStr);
  const from = params.get('from');
  const userId = params.get('userId');

  // Robust iframe check
  const inIframe = (() => {
  try {
  return window.self !== window.top;
  } catch (e) {
  return true;
  }
  })();
  setIsInIframe(inIframe);

  if (from === 'textmob' && userId) {
  if (!inIframe) {
  setTextmobMode(true);
  setTextmobUser({ username: userId, external: true });
  return;
  }

  setTextmobMode(true);
  setLoading(true);
  fetch(`${API_BASE_URL}/api/textmob/verify?userId=${userId}`)
  .then(res => res.json())
  .then(data => {
  if (data.textmobUser) {
  setTextmobUser(data.textmobUser);
  setIsNewUser(!data.alreadyInLouda);

  // Auto-correct and strictly normalize phone (remove all spaces/symbols)
  let phone = (data.textmobUser.phone || '').replace(/[\s\-\(\)\+]+/g, '');
  if (phone.startsWith('0')) {
  phone = '+234' + phone.slice(1);
  } else if (phone && !phone.startsWith('+')) {
  // If it already starts with 234, just add +
  if (phone.startsWith('234')) {
  phone = '+' + phone;
  } else {
  phone = '+234' + phone;
  }
  }
  setPhoneToVerify(phone);

  // AUTO-LOGIN: If already in Textmob and phone is valid, connect immediately
  if (data.alreadyInLouda && phone) {
  // If a different user is logged in, clear it first
  const currentSessionId = localStorage.getItem('userId');
  if (currentSessionId && currentSessionId !== data.loudaUserId) {
  localStorage.removeItem('userId');
  }

  // Auto-trigger connection
  autoConnectTextmob(data.textmobUser, phone);
  }
  } else {
  setError('Textmob account not found');
  setTextmobMode(false);
  }
  })
  .catch(err => {
  console.error(err);
  setError('Failed to connect to Textmob');
  setTextmobMode(false);
  })
  .finally(() => setLoading(false));
  }
  }, []);

  const autoConnectTextmob = async (tmUser, phone) => {
  try {
  const res = await fetch(`${API_BASE_URL}/api/textmob/connect`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
  userId: tmUser.username,
  phone: phone,
  full_name: tmUser.full_name,
  avatar_url: tmUser.avatar_url,
  email: tmUser.email
  })
  });
  const data = await res.json();
  if (res.ok) {
  localStorage.setItem('userId', data.userId);
  updateLastSeen();
  Lexum.navigate('/home');
  }
  } catch (e) {
  console.error('Auto-connect failed:', e);
  }
  };

  const connectTextmob = async () => {
  if (!phoneToVerify) return setError('Phone number is required');
  if (!phoneToVerify.startsWith('+234') || phoneToVerify.length < 10) {
  return setError('Please enter a valid phone number (+234...)');
  }

  setLoading(true);
  try {
  const res = await fetch(`${API_BASE_URL}/api/textmob/connect`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
  userId: textmobUser.username,
  phone: phoneToVerify,
  full_name: textmobUser.full_name,
  avatar_url: textmobUser.profile_pic,
  email: textmobUser.email,
  currentSessionUserId: localStorage.getItem('userId')
  })
  });
  const data = await res.json();
  if (!res.ok) throw data;

  localStorage.setItem('userId', data.userId);
  updateLastSeen();
  
  // Clear query params to prevent reload loop
  window.history.replaceState({}, document.title, window.location.pathname + window.location.hash);
  
  Lexum.navigate('/home');
  } catch (e) {
  setError(e.message || e.error || 'Connection failed');
  } finally {
  setLoading(false);
  }
  };

  const login = async () => {
  if (!username || !password) {
  console.error('[ERROR] Missing fields in login');
  return setError('Fill in all fields');
  }
  setLoading(true);
  setError('');
  try {
  console.log(`[DEBUG] Attempting login: username/phone=${username}`);
  const res = await fetch(`${API_BASE_URL}/api/login`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ username, password })
  });
  const data = await res.json();
  if (!res.ok) {
  console.error('[ERROR] Login failed:', data.error);
  throw data;
  }
  console.log(`[DEBUG] Login success: userId=${data.userId}`);
  localStorage.setItem('userId', data.userId);
  updateLastSeen();
  Lexum.navigate('/home');
  } catch (e) {
  console.error('[ERROR] Login error:', e);
  setError(e.error || 'Login failed');
  } finally {
  setLoading(false);
  }
  };

  if (textmobMode && textmobUser) {
  if (!isInIframe || textmobUser.external) {
  return (
  <div className="min-h-screen flex items-center justify-center p-4 bg-[#fbf9f6] ">
  <div className="w-full max-w-md bg-white  border border-black/10  rounded-[32px] p-10 flex flex-col items-center text-center animate-fade-in">
  <div className="flex items-center gap-4 mb-10">
  <div className="w-16 h-16 rounded-2xl flex items-center justify-center p-1">
  <div className="w-full h-full rounded-2xl bg-blue-600 text-white flex items-center justify-center"><svg viewBox="0 0 24 24" className="w-1/2 h-1/2" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg></div>
  </div>
  <div className="text-2xl font-black text-gray-400">×</div>
  <div className="w-16 h-16 rounded-2xl flex items-center justify-center overflow-hidden border border-black/5 ">
  <img src={textmobUser.profile_pic || "https://res.cloudinary.com/dtln8gnxh/image/upload/v1789326672/profile-pictures/hjpbzboieesk1jfb6jrh.png"} alt="User" className="w-full h-full object-cover" />
  </div>
  </div>

  <h2 className="text-3xl font-black text-gray-800  uppercase tracking-tighter mb-4 italic">
  Official Partner
  </h2>

  <p className="text-base text-gray-600  font-medium leading-relaxed mb-8">
  {(!isInIframe)
  ? "Textmob has officially partnered with Textmob! To use your Textmob account, please access Textmob directly from the Textmob platform."
  : "To start using Textmob with your Textmob account, you must accept the connection request."
  }
  </p>

  {isInIframe && textmobUser.external && (
  <>
  <div className="w-full h-px bg-gradient-to-r from-transparent via-black/5  to-transparent mb-8" />
  <button
  onClick={() => setTextmobUser(prev => ({ ...prev, external: false }))}
  className="w-full bg-[#E64A19] hover:bg-[#D84315] text-white py-4 rounded-2xl font-black uppercase tracking-widest text-xs active:scale-95 transition-all"
  >
  Back to Connect
  </button>
  </>
  )}
  </div>
  </div>
  );
  }

  return (
  <div className="min-h-screen flex items-center justify-center p-4 bg-[#fbf9f6] ">
  <div className="w-full max-w-md bg-white  border border-black/10  rounded-[32px] p-8 flex flex-col items-center animate-fade-in">
  <div className="flex items-center gap-4 mb-8">
  <div className="w-14 h-14 rounded-2xl flex items-center justify-center p-1">
  <div className="w-full h-full rounded-2xl bg-blue-600 text-white flex items-center justify-center"><svg viewBox="0 0 24 24" className="w-1/2 h-1/2" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg></div>
  </div>
  <div className="text-xl font-black text-gray-300">×</div>
  <div className="w-14 h-14 rounded-2xl flex items-center justify-center overflow-hidden border border-black/5 ">
  <img src={textmobUser.profile_pic || "https://res.cloudinary.com/dtln8gnxh/image/upload/v1789326672/profile-pictures/hjpbzboieesk1jfb6jrh.png"} alt="User" className="w-full h-full object-cover" />
  </div>
  </div>

  <h2 className="text-2xl font-black text-center text-gray-800  uppercase tracking-tight mb-2 italic">
  {isNewUser ? 'Connect Account' : 'Welcome Back'}
  </h2>
  <p className="text-sm text-gray-500  text-center mb-8 font-medium px-4">
  {isNewUser 
  ? `Connect your Textmob account (@${textmobUser.username}) to start chatting on Textmob.`
  : `You already have a Textmob account! Connect to sync your Textmob identity with your messages.`
  }
  </p>

  <div className="w-full space-y-6">
  <div className="bg-gray-50  p-4 rounded-2xl border border-black/5 ">
  <div className="flex items-center gap-3 mb-4">
  <img src={textmobUser.profile_pic || DEFAULT_AVATAR} className="w-10 h-10 rounded-full object-cover ring-2 ring-blue-500/20" />
  <div>
  <div className="text-sm font-black text-gray-800 ">{textmobUser.full_name || textmobUser.username}</div>
  <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">@{textmobUser.username}</div>
  </div>
  </div>

  <div className="opacity-60 pointer-events-none">
  <PhoneInput
  label="Linked Phone Number"
  value={phoneToVerify}
  onChange={() => {}}
  error=""
  />
  </div>
  <p className="text-[9px] text-gray-400 font-bold uppercase tracking-wider mt-1 px-1">
  Phone number is managed by Textmob
  </p>
  </div>

  {error && (
  <div className="w-full p-3 bg-red-50  border border-red-200  rounded-xl text-red-600  text-[10px] font-bold text-center uppercase tracking-widest">
  {error}
  </div>
  )}

  <button
  onClick={connectTextmob}
  disabled={loading}
  className="w-full bg-[#E64A19] hover:bg-[#D84315] text-white py-4 rounded-2xl font-black uppercase tracking-widest text-xs active:scale-95 transition-all disabled:opacity-50"
  >
  {loading ? 'Connecting...' : (isNewUser ? 'Accept & Connect' : 'Log In & Sync')}
  </button>

  <button
  onClick={() => setTextmobUser(prev => ({ ...prev, external: true }))}
  className="w-full py-2 text-[10px] font-black text-gray-400 uppercase tracking-widest hover:text-gray-600 transition"
  >
  Cancel
  </button>
  </div>
  </div>
  </div>
  );
  }

  return (
  <div className="min-h-screen flex items-center justify-center p-4 bg-[#fbf9f6] ">
  <div className="w-full max-w-md bg-white  border border-black/10  rounded-2xl p-8 flex flex-col items-center">
  {/* Textmob Logo Header */}
  <div className="w-20 h-20 md:w-28 md:h-28 mb-6 bg-[#5D4037] rounded-2xl md:rounded-[24px] flex items-center justify-center transition-all">
  <div className="w-12 h-12 md:w-18 md:h-18 rounded-2xl bg-blue-600 text-white flex items-center justify-center"><svg viewBox="0 0 24 24" className="w-1/2 h-1/2" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg></div>
  </div>

  <h1 className="text-3xl font-black text-center text-[#5D4037]  uppercase tracking-tighter mb-1">
  Textmob
  </h1>
  <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-6 text-center">
  Messaging with Pride
  </p>

  {/* Toggle Login Method */}
  <div className="flex border border-black/5  rounded-xl overflow-hidden w-full mb-6 p-0.5 bg-gray-50 ">
  <button
  onClick={() => { setLoginMethod('username'); setUsername(''); }}
  className={`flex-1 py-2 text-[10px] font-black uppercase tracking-wider rounded-lg transition ${loginMethod === 'username'
  ? 'bg-[#E64A19] text-white'
  : 'text-gray-400 hover:text-gray-600 '
  }`}
  >
  Username
  </button>
  <button
  onClick={() => { setLoginMethod('phone'); setUsername(''); }}
  className={`flex-1 py-2 text-[10px] font-black uppercase tracking-wider rounded-lg transition ${loginMethod === 'phone'
  ? 'bg-[#E64A19] text-white'
  : 'text-gray-400 hover:text-gray-600 '
  }`}
  >
  Phone Number
  </button>
  </div>

  {error && (
  <div className="w-full p-4 mb-4 bg-red-50  border border-red-200  rounded-xl text-red-600  text-xs font-bold text-center">
  {error}
  </div>
  )}

  <div className="w-full space-y-4">
  {loginMethod === 'username' ? (
  <div>
  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 block">
  Username
  </label>
  <input
  type="text"
  placeholder="Enter username"
  value={username}
  onChange={e => setUsername(e.target.value)}
  className="w-full bg-gray-50  border border-black/5  rounded-xl p-3 font-bold text-gray-700  focus:ring-2 focus:ring-[#E64A19] outline-none transition"
  />
  </div>
  ) : (
  <PhoneInput
  label="Phone Number"
  value={username}
  onChange={setUsername}
  />
  )}

  <div>
  <div className="flex justify-between items-center mb-1.5">
  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block">
  Password
  </label>
  <span className="text-[10px] font-black text-[#E64A19] uppercase tracking-widest hover:underline cursor-pointer">
  Forgot?
  </span>
  </div>
  <input
  type="password"
  placeholder="••••••••"
  value={password}
  onChange={e => setPassword(e.target.value)}
  className="w-full bg-gray-50  border border-black/5  rounded-xl p-3 font-bold text-gray-700  focus:ring-2 focus:ring-[#E64A19] outline-none transition"
  />
  </div>

  <button
  onClick={login}
  disabled={loading}
  className="w-full bg-[#E64A19] hover:bg-[#D84315] text-white py-3 rounded-xl font-black uppercase tracking-wider text-xs transform active:scale-[0.98] transition-all disabled:opacity-50 mt-2"
  >
  {loading ? 'Entering Textmob...' : 'Log In'}
  </button>
  </div>

  <div className="w-full pt-6 mt-6 border-t border-black/5  flex items-center justify-center gap-2 text-sm text-gray-500">
  <span>New to Textmob?</span>
  <span
  onClick={() => Lexum.navigate('/signup')}
  className="text-[#E64A19] font-black uppercase tracking-wider text-xs hover:underline cursor-pointer"
  >
  Sign Up
  </span>
  </div>
  </div>
  </div>
  );
};

const SignupScreen = () => {
  const [slide, setSlide] = useState(0); // 0: Name, 1: Contact/Password, 2: Language, 3: Push, 4: Avatar, 5: Terms, 6: Success
  const [form, setForm] = useState({
  full_name: '',
  email: '',
  phone: '',
  password: '',
  preferredLanguage: 'en',
  autoTranslate: true,
  pushEnabled: false,
  fcmToken: '',
  avatarFile: null,
  avatarPreset: '',
  agreeTerms: false,
  agreePrivacy: false
  });
  const [usernameSuggestion, setUsernameSuggestion] = useState('');
  const [avatarPreview, setAvatarPreview] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef(null);

  // Auto-normalize full_name to unique username
  useEffect(() => {
  if (!form.full_name) {
  setUsernameSuggestion('');
  return;
  }
  const clean = form.full_name.toLowerCase().replace(/[^a-z0-9]/g, '');
  setUsernameSuggestion(clean ? clean.slice(0, 15) : '');
  }, [form.full_name]);

  const update = field => val => {
  setForm(prev => ({ ...prev, [field]: val }));
  setError('');
  };

  const handleNext = async () => {
  setError('');
  if (slide === 0) {
  if (!form.full_name.trim()) return setError('Full Name is required');
  setSlide(1);
  } else if (slide === 1) {
  if (!form.phone.trim()) return setError('Phone Number is required');
  if (!form.password) return setError('Password is required');
  if (form.password.length < 6) return setError('Password must be at least 6 characters');
  setSlide(2);
  } else if (slide === 2) {
  setSlide(3);
  } else if (slide === 3) {
  setSlide(4);
  } else if (slide === 4) {
  if (!form.avatarFile) {
  return setError('Mandatory: Please upload a profile picture to continue.');
  }
  setSlide(5);
  }
  };

  const handleBack = () => {
  setError('');
  if (slide > 0) setSlide(slide - 1);
  };

  const handleFileChange = (e) => {
  const file = e.target.files[0];
  if (file) {
  update('avatarFile')(file);
  const reader = new FileReader();
  reader.onloadend = () => setAvatarPreview(reader.result);
  reader.readAsDataURL(file);
  }
  };

  const handleEnablePush = async () => {
  try {
  const granted = await requestPushPermission('temp-onboarding');
  if (granted) {
  const token = localStorage.getItem('fcm_token');
  setForm(prev => ({
  ...prev,
  pushEnabled: true,
  fcmToken: token || ''
  }));
  } else {
  setError('Push permission was blocked by the browser. You can enable it later in settings.');
  }
  } catch (e) {
  console.warn('Push error onboarding:', e);
  setError('Push notification setup failed. You can skip this step.');
  }
  };

  const finishSignup = async () => {
  if (!form.agreeTerms || !form.agreePrivacy) {
  return setError('You must agree to the Terms of Service & Privacy Policy to continue.');
  }

  setLoading(true);
  setError('');
  try {
  // 1. Generate final normalized username with unique suffix
  const baseUser = usernameSuggestion || 'user';
  const uniqueUsername = baseUser + Math.floor(100 + Math.random() * 900);

  // 2. Upload Avatar File if present (Mandatory)
  let avatarUrl = '';
  if (form.avatarFile) {
  const formData = new FormData();
  formData.append('file', form.avatarFile);
  formData.append('type', 'image');
  const uploadRes = await fetch(`${API_BASE_URL}/api/upload`, { method: 'POST', body: formData });
  const uploadData = await uploadRes.json();
  if (!uploadRes.ok) throw new Error(uploadData.error || 'Avatar upload failed');
  avatarUrl = uploadData.url;
  }

  const payload = {
  username: uniqueUsername,
  password: form.password,
  full_name: form.full_name,
  email: form.email || null,
  phone: form.phone,
  avatar_url: avatarUrl,
  preferences: {
  preferred_voice: 'Zainab',
  language_preferences: {
  preferred_language: form.preferredLanguage,
  auto_translate: form.autoTranslate
  },
  push_enabled: form.pushEnabled,
  fcm_token: form.fcmToken || null
  }
  };

  const signupRes = await fetch(`${API_BASE_URL}/api/signup`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(payload)
  });
  const signupData = await signupRes.json();
  if (!signupRes.ok) {
  throw new Error(signupData.error || 'Registration failed');
  }

  localStorage.setItem('userId', signupData.userId);
  localStorage.setItem('username', uniqueUsername);

  fetch(`${API_BASE_URL}/api/user/last-seen`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ userId: signupData.userId })
  }).catch(e => console.warn('Lastseen sync failed:', e));

  setSlide(6);
  } catch (e) {
  console.error('[ERROR] Onboarding signup error:', e);
  setError(e.message || 'Signup failed');
  } finally {
  setLoading(false);
  }
  };

  const handleStartChatting = () => {
  updateLastSeen();
  Lexum.navigate('/home');
  };

  const renderDots = () => {
  if (slide >= 6) return null;
  return (
  <div className="flex gap-1.5 mb-6">
  {[0, 1, 2, 3, 4, 5].map(dot => (
  <span
  key={dot}
  className={`w-2 h-2 rounded-full transition-all duration-300 ${dot === slide
  ? 'bg-[#E64A19] w-4'
  : dot < slide
  ? 'bg-[#5D4037] opacity-60'
  : 'bg-gray-200 '
  }`}
  />
  ))}
  </div>
  );
  };

  return (
  <div className="min-h-screen flex items-center justify-center p-4 bg-[#fbf9f6] ">
  <div className="w-full max-w-md bg-white  border border-black/10  rounded-2xl p-8 flex flex-col items-center">

  <div className="w-20 h-20 md:w-28 md:h-28 mb-6 bg-[#5D4037] rounded-2xl md:rounded-[24px] flex items-center justify-center transition-all">
  <div className="w-12 h-12 md:w-18 md:h-18 rounded-2xl bg-blue-600 text-white flex items-center justify-center"><svg viewBox="0 0 24 24" className="w-1/2 h-1/2" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg></div>
  </div>

  <h1 className="text-3xl font-black text-center text-[#5D4037]  uppercase tracking-tighter mb-1">
  Textmob
  </h1>
  <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-6 text-center">
  Onboarding & Setup
  </p>

  {renderDots()}

  {error && (
  <div className="w-full p-4 mb-4 bg-red-50  border border-red-200  rounded-xl text-red-600  text-xs font-bold text-center">
  {error}
  </div>
  )}

  <div className="w-full space-y-4">
  <div className="w-full">
  {slide === 0 && (
  <div className="space-y-4 animate-fade-in w-full">
  <h2 className="text-xl font-black text-[#5D4037]  uppercase tracking-tighter text-center">
  Tell us your name
  </h2>
  <p className="text-xs text-gray-400  font-medium text-center mb-2">
  We use your full name to construct your unique Textmob tag name.
  </p>
  <div>
  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 block">
  Full Name
  </label>
  <input
  type="text"
  placeholder="e.g. Ismail Lawal"
  value={form.full_name}
  onChange={e => update('full_name')(e.target.value)}
  className="w-full bg-gray-50  border border-black/5  rounded-xl p-3 font-bold text-gray-700  focus:ring-2 focus:ring-[#E64A19] outline-none transition"
  />
  {usernameSuggestion && (
  <span className="text-[10px] font-bold text-[#E64A19] mt-2 block uppercase tracking-wider text-center">
  Generated tag: @{usernameSuggestion}[unique-suffix]
  </span>
  )}
  </div>
  </div>
  )}

  {slide === 1 && (
  <div className="space-y-4 animate-fade-in w-full">
  <h2 className="text-xl font-black text-[#5D4037]  uppercase tracking-tighter text-center">
  Secure Credentials
  </h2>
  <p className="text-xs text-gray-400  font-medium text-center mb-2">
  Provide your telephone details and lock your digital account.
  </p>
  <div className="space-y-3">
  <PhoneInput
  label="Phone Number"
  value={form.phone}
  onChange={update('phone')}
  />
  <div>
  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 block">
  Email Address (Optional)
  </label>
  <input
  type="email"
  placeholder="e.g. name@example.com"
  value={form.email}
  onChange={e => update('email')(e.target.value)}
  className="w-full bg-gray-50  border border-black/5  rounded-xl p-3 font-bold text-gray-700  focus:ring-2 focus:ring-[#E64A19] outline-none transition"
  />
  </div>
  <div>
  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 block">
  Choose Passkey
  </label>
  <input
  type="password"
  placeholder="Min 6 characters required"
  value={form.password}
  onChange={e => update('password')(e.target.value)}
  className="w-full bg-gray-50  border border-black/5  rounded-xl p-3 font-bold text-gray-700  focus:ring-2 focus:ring-[#E64A19] outline-none transition"
  />
  </div>
  </div>
  </div>
  )}

  {slide === 2 && (
  <div className="space-y-4 animate-fade-in w-full">
  <h2 className="text-xl font-black text-[#5D4037]  uppercase tracking-tighter text-center">
  Intelligent Translation
  </h2>
  <p className="text-xs text-gray-400  font-medium text-center mb-2">
  Choose your native language. Textmob will automatically translate messages from friends in other countries.
  </p>
  <div className="space-y-3">
  <div>
  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 block">
  Native Language
  </label>
  <select
  value={form.preferredLanguage}
  onChange={e => update('preferredLanguage')(e.target.value)}
  className="w-full bg-gray-50  border border-black/5  rounded-xl p-3 font-bold text-gray-700  focus:ring-2 focus:ring-[#E64A19] outline-none transition"
  >
  <option value="en">English</option>
  <option value="yo">Yorùbá</option>
  <option value="ig">Igbo</option>
  <option value="ha">Hausa</option>
  <option value="fr">French</option>
  <option value="ar">Arabic</option>
  </select>
  </div>
  <div className="pt-2">
  <Toggle
  label="Enable Auto-Translation"
  checked={form.autoTranslate}
  onChange={() => update('autoTranslate')(!form.autoTranslate)}
  />
  <p className="text-[10px] text-gray-400 mt-1">
  Displays sub-translations inside chat threads automatically.
  </p>
  </div>
  </div>
  </div>
  )}

  {slide === 3 && (
  <div className="space-y-4 animate-fade-in w-full">
  <h2 className="text-xl font-black text-[#5D4037]  uppercase tracking-tighter text-center">
  Stay In Touch
  </h2>
  <p className="text-xs text-gray-400  font-medium text-center mb-2">
  Would you like to turn on push notifications? This allows Textmob to notify you instantly when your friends send you messages.
  </p>
  <div className="p-4 bg-gray-50  border border-black/5  rounded-2xl flex flex-col items-center text-center gap-3">
  {form.pushEnabled ? (
  <>
  <div className="w-10 h-10 rounded-full bg-green-500 text-white flex items-center justify-center text-lg font-bold">
  ✓
  </div>
  <div>
  <p className="font-bold text-xs text-gray-700  uppercase tracking-tight">Push Notifications Active</p>
  <p className="text-[9px] text-gray-400 mt-0.5">Textmob will keep you updated in real-time!</p>
  </div>
  </>
  ) : (
  <>
  <div className="w-10 h-10 rounded-full bg-[#E64A19]/10 text-[#E64A19] flex items-center justify-center text-lg">
  🔔
  </div>
  <div>
  <p className="font-bold text-xs text-gray-700 ">Alerts Currently Disabled</p>
  <p className="text-[9px] text-gray-400 mt-0.5">Permit native system browser notifications.</p>
  </div>
  <button
  onClick={handleEnablePush}
  className="px-4 py-2 bg-[#E64A19] hover:bg-[#D84315] text-white rounded-lg font-black uppercase tracking-wider text-[9px] transition"
  >
  Enable Push Alerts
  </button>
  </>
  )}
  </div>
  </div>
  )}

  {/* Slide 4: Mandatory Profile Picture Upload */}
  {slide === 4 && (
  <div className="space-y-4 animate-fade-in w-full flex flex-col items-center">
  <h2 className="text-xl font-black text-[#5D4037]  uppercase tracking-tighter text-center">
  Profile Picture
  </h2>
  <p className="text-xs text-gray-400  font-medium text-center mb-2">
  Upload a photo of yourself. A profile picture is mandatory to activate your secure Textmob account.
  </p>

  <div className="flex flex-col items-center gap-4 py-3">
  <div
  onClick={() => fileInputRef.current?.click()}
  className="relative group cursor-pointer hover:scale-[1.02] transition"
  >
  {avatarPreview ? (
  <img src={avatarPreview} className="w-24 h-24 rounded-full object-cover border-4 border-white  shadow-md" />
  ) : (
  <div className="w-24 h-24 rounded-full bg-gray-50  border-2 border-dashed border-black/10  flex flex-col items-center justify-center text-gray-400 text-xs hover:border-[#E64A19] transition">
  <span className="text-2xl mb-1">👤</span>
  <span className="text-[9px] font-bold uppercase tracking-wider">Tap to upload</span>
  </div>
  )}
  <button
  onClick={(e) => {
  e.stopPropagation();
  fileInputRef.current?.click();
  }}
  className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-[#E64A19] text-white flex items-center justify-center border-2 border-white  shadow-md hover:scale-110 active:scale-[0.95] transition"
  title="Upload Avatar"
  >
  {Icons.camera}
  </button>
  </div>

  <input
  type="file"
  ref={fileInputRef}
  accept="image/*"
  onChange={handleFileChange}
  className="hidden"
  />

  {avatarPreview && (
  <button
  onClick={(e) => {
  e.stopPropagation();
  update('avatarFile')(null);
  setAvatarPreview('');
  }}
  className="text-[9px] font-black text-red-500 uppercase tracking-widest hover:underline"
  >
  Remove Photo
  </button>
  )}
  </div>
  </div>
  )}

  {slide === 5 && (
  <div className="space-y-4 animate-fade-in w-full">
  <h2 className="text-xl font-black text-[#5D4037]  uppercase tracking-tighter text-center">
  Terms & Consent
  </h2>
  <p className="text-xs text-gray-400  font-medium text-center mb-2">
  Review and accept our terms to complete your account setup.
  </p>

  <div className="space-y-3">
  <label className="flex items-start gap-3 p-3 bg-gray-50  border border-black/5  rounded-xl cursor-pointer hover:bg-gray-100  transition">
  <input
  type="checkbox"
  checked={form.agreeTerms}
  onChange={e => update('agreeTerms')(e.target.checked)}
  className="mt-0.5 w-4 h-4 accent-[#E64A19] cursor-pointer"
  />
  <div className="flex flex-col">
  <span className="text-xs font-bold text-gray-700 ">
  Agree to Terms of Service
  </span>
  <span className="text-[9px] text-gray-400 mt-0.5">
  Accept user agreement guidelines and zero spam policies.
  </span>
  </div>
  </label>

  <label className="flex items-start gap-3 p-3 bg-gray-50  border border-black/5  rounded-xl cursor-pointer hover:bg-gray-100  transition">
  <input
  type="checkbox"
  checked={form.agreePrivacy}
  onChange={e => update('agreePrivacy')(e.target.checked)}
  className="mt-0.5 w-4 h-4 accent-[#E64A19] cursor-pointer"
  />
  <div className="flex flex-col">
  <span className="text-xs font-bold text-gray-700 ">
  Agree to Privacy Policy
  </span>
  <span className="text-[9px] text-gray-400 mt-0.5">
  Accept cryptographic E2E encryption and temporary socket privacy.
  </span>
  </div>
  </label>
  </div>
  </div>
  )}

  {slide === 6 && (
  <div className="space-y-4 text-center py-4 animate-fade-in flex flex-col items-center w-full">
  <div className="w-16 h-16 rounded-2xl bg-green-500 text-white flex items-center justify-center text-3xl shadow-sm">
  ✓
  </div>
  <div>
  <h2 className="text-2xl font-black text-[#5D4037]  uppercase tracking-tighter">
  Welcome to Textmob!
  </h2>
  <p className="text-xs text-gray-400  font-bold mt-1">
  Your account has been fully prepared.
  </p>
  </div>

  <div className="p-3 bg-gray-50  border border-black/5  rounded-xl max-w-sm w-full">
  <div className="flex justify-between items-center text-xs font-bold">
  <span className="text-gray-400 uppercase tracking-widest text-[9px]">Your Account Tag</span>
  <span className="text-[#E64A19]">@{localStorage.getItem('username')}</span>
  </div>
  </div>

  <p className="text-xs text-gray-400 max-w-xs leading-relaxed font-bold">
  Start chatting instantly, sync with friends, translate, and synthesize speech directly inside your chat threads!
  </p>
  </div>
  )}
  </div>

  {/* Stepper Wizard Navigation Controls */}
  <div className="flex gap-3 pt-6 border-t border-black/5  mt-6">
  {slide === 6 ? (
  <button
  onClick={handleStartChatting}
  className="w-full bg-[#E64A19] hover:bg-[#D84315] text-white py-4 rounded-xl font-black uppercase tracking-wider text-xs transform active:scale-[0.98] transition-all"
  >
  Start Chatting
  </button>
  ) : (
  <>
  {slide > 0 && (
  <button
  onClick={handleBack}
  disabled={loading}
  className="flex-1 bg-gray-100  hover:bg-gray-200  text-gray-600  py-4 rounded-xl font-black uppercase tracking-wider text-xs transform active:scale-[0.98] transition-all disabled:opacity-50"
  >
  Back
  </button>
  )}
  {slide === 5 ? (
  <button
  onClick={finishSignup}
  disabled={loading}
  className="flex-1 bg-[#E64A19] hover:bg-[#D84315] text-white py-4 rounded-xl font-black uppercase tracking-wider text-xs transform active:scale-[0.98] transition-all disabled:opacity-50"
  >
  {loading ? 'Creating Key...' : 'Register Account'}
  </button>
  ) : (
  <button
  onClick={handleNext}
  className="flex-1 bg-[#E64A19] hover:bg-[#D84315] text-white py-4 rounded-xl font-black uppercase tracking-wider text-xs transform active:scale-[0.98] transition-all"
  >
  Continue
  </button>
  )}
  </>
  )}
  </div>

  {slide < 6 && (
  <p className="text-center mt-4 text-xs text-gray-400">
  Already have an account?{' '}
  <span
  onClick={() => Lexum.navigate('/login')}
  className="text-[#E64A19] font-black uppercase tracking-wider hover:underline cursor-pointer"
  >
  Log In
  </span>
  </p>
  )}
  </div>
  </div>
  </div>
  );
};

// ─────────────────────────────────────
// Settings Screen
// ─────────────────────────────────────
const SettingsScreen = ({ user, onSave, onClose, blockedUsers, onToggleBlock, contacts, onUpdateProfile, onUploadAvatar }) => {
  const [view, setView] = useState('main'); // main, personal, appearance, privacy, blocked, voice, notifications, account, about
  const [tempPrefs, setTempPrefs] = useState(JSON.parse(JSON.stringify(user.preferences || {})));
  const [tempUser, setTempUser] = useState({
  full_name: user.full_name || '',
  username: user.username || '',
  email: user.email || ''
  });
  const [hasChanges, setHasChanges] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [showAvatarOptions, setShowAvatarOptions] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [passwordForm, setPasswordForm] = useState({ current: '', newPass: '', confirm: '' });
  const [passwordError, setPasswordError] = useState('');
  const [passwordLoading, setPasswordLoading] = useState(false);
  const fileInputRef = useRef(null);

  const update = (path, value) => {
  const keys = path.split('.');
  const newPrefs = JSON.parse(JSON.stringify(tempPrefs));
  let cur = newPrefs;
  for (let i = 0; i < keys.length - 1; i++) {
  if (!cur[keys[i]]) cur[keys[i]] = {};
  cur = cur[keys[i]];
  }
  cur[keys[keys.length - 1]] = value;
  setTempPrefs(newPrefs);
  setHasChanges(true);
  };

  const toggle = (path) => {
  const keys = path.split('.');
  const newPrefs = JSON.parse(JSON.stringify(tempPrefs));
  let cur = newPrefs;
  for (let i = 0; i < keys.length - 1; i++) {
  if (!cur[keys[i]]) cur[keys[i]] = {};
  cur = cur[keys[i]];
  }
  cur[keys[keys.length - 1]] = !cur[keys[keys.length - 1]];
  setTempPrefs(newPrefs);
  setHasChanges(true);
  };

  const handleSaveAll = async () => {
  if (view === 'personal') {
  await onUpdateProfile(tempUser);
  }
  await onSave(tempPrefs);
  setHasChanges(false);
  if (view !== 'main') setView('main');
  };

  const handleFileSelect = (e) => {
  const file = e.target.files[0];
  if (file) {
  onUploadAvatar(user.id, file, false);
  setShowAvatarOptions(false);
  }
  };

  const renderMain = () => (
  <div className="space-y-2">
  <div className="flex flex-col items-center py-4 bg-gray-50  rounded-2xl mb-4 border border-gray-100 ">
  <div className="relative group mb-2">
  <img
  src={getOptimizedMediaUrl(user.avatar_url || DEFAULT_AVATAR)}
  className="w-20 h-20 rounded-full object-cover border-4 border-white  shadow-xl"
  />
  <button
  style={{ background: 'black' }}
  onClick={() => setShowAvatarOptions(true)}
  className="absolute bottom-0 right-0 w-7 h-7 rounded-full bg-green-500 text-white flex items-center justify-center shadow-lg hover:scale-110 transition active:scale-95"
  >
  {Icons.camera}
  </button>
  </div>
  <h3 className="text-base font-black text-gray-800  uppercase tracking-tighter">{user.full_name || 'Anonymous'}</h3>
  <p className="text-xs font-bold text-gray-400">@{user.username || 'user'}</p>
  </div>

  {[
  { id: 'personal', label: 'Personal Info', icon: Icons.user, color: 'text-blue-500' },
  { id: 'privacy', label: 'Privacy & Security', icon: Icons.lock, color: 'text-purple-500' },
  { id: 'blocked', label: 'Blocked Users', icon: Icons.block, color: 'text-red-500' },
  { id: 'voice', label: 'Voice & Language', icon: Icons.mic, color: 'text-green-500' },
  { id: 'notifications', label: 'Notifications', icon: Icons.bell, color: 'text-amber-500' },
  { id: 'media', label: 'Media & Data', icon: Icons.image, color: 'text-rose-500' },
  { id: 'account', label: 'Account & Security', icon: Icons.lock, color: 'text-indigo-500' },
  { id: 'about', label: 'About', icon: Icons.chat, color: 'text-teal-500' },
  ].map(item => (
  <button
  key={item.id}
  onClick={() => setView(item.id)}
  className="w-full p-3 flex items-center justify-between bg-white  hover:bg-gray-50  rounded-xl transition-all duration-150 group border border-transparent hover:border-gray-100 "
  >
  <div className="flex items-center gap-3">
  <div className={`${item.color} w-9 h-9 rounded-xl bg-current/10 flex items-center justify-center`}>
  {item.icon}
  </div>
  <span className="font-bold text-sm text-gray-700 ">{item.label}</span>
  </div>
  <div className="text-gray-300 group-hover:text-gray-500 transition-transform duration-150 group-hover:translate-x-1">
  {Icons.chevronRight}
  </div>
  </button>
  ))}
  </div>
  );

  return (
  <>
  <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-50 flex justify-end animate-fade-in" onClick={onClose}>

  <div className="w-full max-w-lg bg-white  h-full shadow-2xl flex flex-col animate-slide-left overflow-hidden" onClick={e => e.stopPropagation()}>
  <div className="p-4 bg-white  flex items-center gap-4 border-b  shadow-sm z-10">
  {view !== 'main' && (
  <button onClick={() => setView('main')} className="w-9 h-9 rounded-full flex items-center justify-center bg-gray-100  text-gray-500 hover:bg-gray-200 transition">
  {Icons.arrowLeft}
  </button>
  )}
  <h2 className="flex-1 text-xl font-black text-[#5D4037]  uppercase tracking-tighter italic">
  {view === 'main' ? 'Settings' : view.charAt(0).toUpperCase() + view.slice(1).replace(/([A-Z])/g, ' $1')}
  </h2>
  <button onClick={onClose} className="w-9 h-9 rounded-full flex items-center justify-center bg-gray-100  text-gray-500 hover:bg-red-50 hover:text-red-500 transition-all duration-300">
  {Icons.x}
  </button>
  </div>

  <div className="flex-1 overflow-y-auto p-4 md:p-5 space-y-4 no-scrollbar">
  {view === 'main' && renderMain()}

  {view === 'personal' && (
  <div className="space-y-6 animate-fade-in">
  <div className="flex flex-col items-center mb-6">
  <div className="relative group">
  <img
  src={getOptimizedMediaUrl(user.avatar_url || DEFAULT_AVATAR)}
  className="w-24 h-24 rounded-full object-cover border-4 border-white  shadow-lg"
  />
  <button
  style={{ background: 'black' }}
  onClick={() => setShowAvatarOptions(true)}
  className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-green-500 text-white flex items-center justify-center shadow-lg hover:scale-110 transition"
  >
  {Icons.camera}
  </button>
  </div>
  <p className="text-xs font-black text-gray-400 uppercase tracking-widest mt-4">Change Profile Picture</p>
  </div>

  <div className="space-y-4">
  <div>
  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 block">Full Name</label>
  <input
  type="text"
  className="w-full bg-gray-50  border-none rounded-xl p-4 font-bold text-gray-700  focus:ring-2 focus:ring-green-500 transition"
  value={tempUser.full_name}
  onChange={e => { setTempUser({ ...tempUser, full_name: e.target.value }); setHasChanges(true); }}
  />
  </div>
  <div>
  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 block">Username</label>
  <input
  type="text"
  className="w-full bg-gray-50  border-none rounded-xl p-4 font-bold text-gray-700  focus:ring-2 focus:ring-green-500 transition"
  value={tempUser.username}
  onChange={e => { setTempUser({ ...tempUser, username: e.target.value }); setHasChanges(true); }}
  />
  </div>
  <div>
  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 block">Email Address</label>
  <input
  type="email"
  className="w-full bg-gray-50  border-none rounded-xl p-4 font-bold text-gray-700  focus:ring-2 focus:ring-green-500 transition"
  value={tempUser.email}
  onChange={e => { setTempUser({ ...tempUser, email: e.target.value }); setHasChanges(true); }}
  />
  </div>
  <div>
  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 block">Phone Number (Permanent)</label>
  <input
  type="text"
  disabled
  className="w-full bg-gray-100  border-none rounded-xl p-4 font-bold text-gray-400 cursor-not-allowed"
  value={user.phone}
  />
  </div>
  </div>
  </div>
  )}

  {/* Textmob port: Appearance settings removed (design comes from Textmob tokens) */}

  {view === 'privacy' && (
  <div className="flex-1 flex flex-col items-center justify-center p-10 text-center animate-fade-in py-20">
  <div className="w-20 h-20 bg-purple-50  rounded-full flex items-center justify-center text-4xl mb-6 shadow-sm border border-purple-100 ">
  🔒
  </div>
  <h3 className="text-xl font-black text-gray-800  uppercase tracking-tighter mb-2">Privacy & Security</h3>
  <p className="text-xs font-bold text-gray-400 uppercase tracking-widest max-w-[200px] leading-relaxed">
  Advanced privacy controls are coming soon to Textmob.
  </p>
  </div>
  )}

  {view === 'blocked' && (
  <div className="space-y-4 animate-fade-in">
  <p className="text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Manage Blocked Contacts</p>
  {blockedUsers && blockedUsers.length > 0 ? (
  <div className="space-y-2">
  {blockedUsers.map(id => {
  const contact = contacts?.find(c => String(c.id) === String(id));
  return (
  <div key={id} className="flex items-center justify-between p-4 bg-gray-50  rounded-2xl border border-gray-100 ">
  <div className="flex items-center gap-3">
  <img src={contact?.avatar_url || DEFAULT_AVATAR} className="w-10 h-10 rounded-full" />
  <div className="flex flex-col">
  <span className="font-bold text-sm text-gray-800 ">{contact?.name || 'Unknown'}</span>
  <span className="text-[10px] text-gray-400 font-bold">{contact?.phone}</span>
  </div>
  </div>
  <button onClick={() => onToggleBlock(id)} className="px-4 py-2 bg-white  text-xs font-black uppercase text-red-500 rounded-xl shadow-sm hover:bg-red-50 transition border border-red-100 ">
  Unblock
  </button>
  </div>
  );
  })}
  </div>
  ) : (
  <div className="text-center py-12 opacity-40">
  <div className="text-5xl mb-4">🛡️</div>
  <p className="font-bold">No blocked users</p>
  </div>
  )}
  </div>
  )}

  {view === 'voice' && (
  <div className="space-y-8 animate-fade-in">
  <Section title="Voice Settings">
  <label className="block text-xs font-black text-gray-400 uppercase mb-3">Preferred TTS Voice</label>
  <select className="w-full bg-gray-50  border-none rounded-xl p-4 font-bold text-gray-700 "
  value={tempPrefs.preferred_voice || 'Zainab'}
  onChange={e => update('preferred_voice', e.target.value)}>
  <optgroup label="English">
  <option value="Zainab">Zainab (Female)</option>
  <option value="Osagie">Osagie (Male)</option>
  </optgroup>
  <optgroup label="Yorùbá">
  <option value="Idera">Idera (Female)</option>
  <option value="Femi">Femi (Male)</option>
  </optgroup>
  <optgroup label="Igbo">
  <option value="Chinenye">Chinenye (Female)</option>
  <option value="Nonso">Nonso (Male)</option>
  </optgroup>
  </select>
  </Section>
  <Section title="Localization">
  <label className="block text-xs font-black text-gray-400 uppercase mb-3">App Language</label>
  <select className="w-full bg-gray-50  border-none rounded-xl p-4 font-bold text-gray-700  mb-4"
  value={tempPrefs.language_preferences?.preferred_language || 'en'}
  onChange={e => update('language_preferences.preferred_language', e.target.value)}>
  <option value="en">English</option>
  <option value="ar">Arabic</option>
  <option value="fr">French</option>
  <option value="yo">Yorùbá</option>
  <option value="ig">Igbo</option>
  <option value="ha">Hausa</option>
  </select>
  <div className="mt-2 pt-2 border-t border-gray-100 ">
  <Toggle
  label="Auto Show Translated Messages"
  checked={tempPrefs.language_preferences?.auto_translate === true}
  onChange={() => update('language_preferences.auto_translate', !(tempPrefs.language_preferences?.auto_translate === true))}
  />
  <p className="text-xs text-gray-400 mt-1">Automatically displays a subtle translated version under received messages.</p>
  </div>
  </Section>
  </div>
  )}

  {view === 'notifications' && (
  <div className="space-y-4 animate-fade-in">
  <Section title="Push Notifications">
  <Toggle
  label="Enable Push Notifications"
  checked={JSON.parse(localStorage.getItem('louda:notifPrefs') || '{}').enabled === true}
  onChange={async () => {
  const p = JSON.parse(localStorage.getItem('louda:notifPrefs') || '{}');
  const currentlyEnabled = p.enabled === true;
  if (!currentlyEnabled) {
  const granted = await requestPushPermission(user?.id || localStorage.getItem('userId'));
  if (granted) {
  p.enabled = true;
  localStorage.setItem('louda:notifPrefs', JSON.stringify(p));
  setHasChanges(true);
  if (typeof Lexum !== 'undefined' && Lexum.alert) {
  Lexum.alert({ title: 'Success', message: 'Push notifications enabled successfully!' });
  }
  } else {
  p.enabled = false;
  localStorage.setItem('louda:notifPrefs', JSON.stringify(p));
  setHasChanges(true);
  if (typeof Lexum !== 'undefined' && Lexum.alert) {
  Lexum.alert({ title: 'Notice', message: 'Push permission denied or blocked by browser.' });
  }
  }
  } else {
  p.enabled = false;
  localStorage.setItem('louda:notifPrefs', JSON.stringify(p));
  setHasChanges(true);
  if (user) {
  const updatedPrefs = { ...(user.preferences || {}), push_enabled: false };
  fetch(`${API_BASE_URL}/api/user/preferences`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ userId: user.id, preferences: updatedPrefs })
  }).catch(e => console.error('[FCM] Disable push error:', e));
  }
  }
  }}
  />
  <p className="text-xs text-gray-400 mt-2">Enables push notifications for all activities: direct messages, group messages, and contact status updates.</p>
  </Section>
  </div>
  )}

  {view === 'media' && (
  <div className="space-y-4 animate-fade-in">
  <Section title="Media & Data Usage">
  {/* Textmob port: fixed auto quality; only lazy-load toggle kept */}
  <Toggle
  label="Lazy Load Media"
  checked={tempPrefs.media?.lazy_load_images !== false}
  onChange={() => update('media.lazy_load_images', !(tempPrefs.media?.lazy_load_images !== false))}
  />
  <p className="text-xs text-gray-400 mt-1">If enabled, images & videos will show a "Show Media" button to save data.</p>
  </Section>
  </div>
  )}

  {view === 'account' && (
  <div className="space-y-4 animate-fade-in">
  <Section title="Profile">
  <div className="space-y-2">
  <div className="flex items-center justify-between p-3 bg-gray-50  rounded-xl">
  <span className="text-sm font-medium text-gray-600 ">Phone</span>
  <span className="text-sm font-bold text-gray-800 ">{user.phone}</span>
  </div>
  <div className="flex items-center justify-between p-3 bg-gray-50  rounded-xl">
  <span className="text-sm font-medium text-gray-600 ">Email</span>
  <span className="text-sm font-bold text-gray-800 ">{user.email || 'Not set'}</span>
  </div>
  <div className="flex items-center justify-between p-3 bg-gray-50  rounded-xl">
  <span className="text-sm font-medium text-gray-600 ">Username</span>
  <span className="text-sm font-bold text-gray-800 ">@{user.username}</span>
  </div>
  </div>
  </Section>
  <Section title="Security">
  {showPasswordForm ? (
  <div className="space-y-3">
  {passwordError && <p className="text-xs text-red-500 font-bold">{passwordError}</p>}
  <input type="password" placeholder="Current Password" className="w-full bg-gray-50  border-none rounded-xl p-3 text-sm font-medium text-gray-700  focus:ring-2 focus:ring-green-500 outline-none transition" value={passwordForm.current} onChange={e => setPasswordForm({ ...passwordForm, current: e.target.value })} />
  <input type="password" placeholder="New Password" className="w-full bg-gray-50  border-none rounded-xl p-3 text-sm font-medium text-gray-700  focus:ring-2 focus:ring-green-500 outline-none transition" value={passwordForm.newPass} onChange={e => setPasswordForm({ ...passwordForm, newPass: e.target.value })} />
  <input type="password" placeholder="Confirm New Password" className="w-full bg-gray-50  border-none rounded-xl p-3 text-sm font-medium text-gray-700  focus:ring-2 focus:ring-green-500 outline-none transition" value={passwordForm.confirm} onChange={e => setPasswordForm({ ...passwordForm, confirm: e.target.value })} />
  <div className="flex gap-2">
  <button onClick={() => { setShowPasswordForm(false); setPasswordError(''); setPasswordForm({ current: '', newPass: '', confirm: '' }); }} className="flex-1 p-3 rounded-xl bg-gray-100  text-sm font-bold text-gray-600  hover:bg-gray-200 transition-all duration-150">Cancel</button>
  <button onClick={async () => {
  if (!passwordForm.current || !passwordForm.newPass) return setPasswordError('All fields required');
  if (passwordForm.newPass.length < 6) return setPasswordError('Min 6 characters');
  if (passwordForm.newPass !== passwordForm.confirm) return setPasswordError('Passwords don\'t match');
  setPasswordLoading(true); setPasswordError('');
  try {
  const res = await fetch(`${API_BASE_URL}/api/user/change-password`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId: user.id, currentPassword: passwordForm.current, newPassword: passwordForm.newPass }) });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed');
  setShowPasswordForm(false); setPasswordForm({ current: '', newPass: '', confirm: '' });
  Lexum.alert({ title: 'Success', message: 'Password changed!' });
  } catch (e) { setPasswordError(e.message); } finally { setPasswordLoading(false); }
  }} disabled={passwordLoading} className="flex-1 p-3 rounded-xl bg-green-600 text-white text-sm font-bold hover:bg-green-700 transition-all duration-150 disabled:opacity-50">{passwordLoading ? 'Saving...' : 'Save'}</button>
  </div>
  </div>
  ) : (
  <button onClick={() => setShowPasswordForm(true)} className="w-full p-3 flex items-center justify-between bg-gray-50  rounded-xl hover:bg-gray-100  transition-all duration-150 group">
  <span className="text-sm font-bold text-gray-700 ">Change Password</span>
  <div className="text-gray-400 group-hover:translate-x-1 transition-transform duration-150">{Icons.chevronRight}</div>
  </button>
  )}
  <button className="w-full p-3 flex items-center justify-between bg-gray-50  rounded-xl hover:bg-gray-100  transition-all duration-150 group">
  <span className="text-sm font-bold text-gray-700 ">Active Sessions</span>
  <div className="text-gray-400 group-hover:translate-x-1 transition-transform duration-150">{Icons.chevronRight}</div>
  </button>
  </Section>
  </div>
  )}

  {view === 'about' && (
  <div className="space-y-4 animate-fade-in">
  <div className="text-center py-6">
  <div className="w-16 h-16 mx-auto mb-3 rounded-2xl bg-[#5D4037] flex items-center justify-center shadow-lg">
  <span className="text-white text-2xl font-black">T</span>
  </div>
  <h3 className="text-lg font-black text-gray-800  tracking-tight">Textmob</h3>
  <p className="text-xs text-gray-400 font-bold mt-1">v1.0.0</p>
  </div>
  <Section title="Mission">
  <p className="text-sm text-gray-600  leading-relaxed">Messaging built for multilingual African communication. Your privacy is sacred, your language matters, your data is respected.</p>
  </Section>
  <Section title="Identity">
  <div className="space-y-2">
  {[
  { label: 'Privacy First', desc: 'End-to-end privacy controls' },
  { label: 'No Language Left Behind', desc: 'Yorùbá, Igbo, Hausa & more' },
  { label: 'Low Data Friendly', desc: 'Built for African networks' },
  { label: 'Accessible', desc: 'Read aloud, font scaling, voice notes' },
  ].map((item, i) => (
  <div key={i} className="p-3 bg-gray-50  rounded-xl">
  <p className="text-sm font-bold text-gray-800 ">{item.label}</p>
  <p className="text-xs text-gray-400">{item.desc}</p>
  </div>
  ))}
  </div>
  </Section>
  <Section title="Supported Languages">
  <div className="flex flex-wrap gap-2">
  {['English', 'Arabic', 'French', 'Yorùbá', 'Igbo', 'Hausa'].map(lang => (
  <span key={lang} className="px-3 py-1.5 bg-green-50  text-green-700  text-xs font-bold rounded-full">{lang}</span>
  ))}
  </div>
  </Section>
  <Section title="Legal">
  <button className="w-full p-3 flex items-center justify-between bg-gray-50  rounded-xl hover:bg-gray-100 transition-all duration-150 group">
  <span className="text-sm font-bold text-gray-700 ">Privacy Policy</span>
  <div className="text-gray-400 group-hover:translate-x-1 transition-transform duration-150">{Icons.chevronRight}</div>
  </button>
  <button className="w-full p-3 flex items-center justify-between bg-gray-50  rounded-xl hover:bg-gray-100 transition-all duration-150 group mt-1">
  <span className="text-sm font-bold text-gray-700 ">Terms of Service</span>
  <div className="text-gray-400 group-hover:translate-x-1 transition-transform duration-150">{Icons.chevronRight}</div>
  </button>
  </Section>
  </div>
  )}

  {view !== 'main' && (
  <div className="flex gap-3 pt-4 border-t ">
  <Button onClick={() => setView('main')} variant="secondary" className="flex-1">Back</Button>
  <Button
  onClick={handleSaveAll}
  disabled={!hasChanges}
  variant="primary"
  className="flex-1"
  >
  Save Changes
  </Button>
  </div>
  )}
  </div>
  </div>
  </div>

  {showAvatarOptions && createPortal(

  <div className="fixed inset-0 z-[200] bg-black/80 backdrop-blur-md flex items-center justify-center p-6 animate-fade-in" onClick={(e) => { e.stopPropagation(); setShowAvatarOptions(false); }}>

  <div className="w-full max-w-xs bg-white  rounded-[32px] p-6 space-y-3 animate-zoom-in shadow-2xl" onClick={e => e.stopPropagation()}>
  <h3 className="text-center font-black text-gray-800  uppercase tracking-tighter mb-4">Profile Photo</h3>
  <button
  onClick={() => { setShowCamera(true); setShowAvatarOptions(false); }}
  className="w-full p-4 flex items-center gap-4 bg-gray-50  hover:bg-green-50  text-gray-700  rounded-2xl transition font-bold"
  >
  <div className="text-green-500">{Icons.camera}</div> Take Photo
  </button>
  <button
  onClick={() => fileInputRef.current.click()}
  className="w-full p-4 flex items-center gap-4 bg-gray-50  hover:bg-blue-50  text-gray-700  rounded-2xl transition font-bold"
  >
  <div className="text-blue-500">{Icons.image}</div> Upload Image
  </button>
  <button onClick={() => setShowAvatarOptions(false)} className="w-full p-4 text-center font-black text-gray-400 uppercase tracking-widest text-xs mt-2">
  Cancel
  </button>
  </div>
  </div>,
  document.body
  )}

  {showCamera && createPortal(
  <div onClick={e => e.stopPropagation()} className="fixed inset-0 z-[200]">
  <CameraOverlay
  onClose={() => setShowCamera(false)}
  photoOnly={true}

  onCapture={(capturedFiles) => {
  const fileToUpload = Array.isArray(capturedFiles) ? capturedFiles[0] : capturedFiles;
  onUploadAvatar(user.id, fileToUpload, false);
  setShowCamera(false);
  }}
  />
  </div>,
  document.body
  )}

  <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileSelect} />
  </>
  );
};



const MediaGalleryTab = ({ userId, onViewMedia, onShare }) => {
  const [mediaItems, setMediaItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCamera, setShowCamera] = useState(false);
  const [filter, setFilter] = useState('all'); // 'all' | 'image' | 'video' | 'audio'
  const [gridSize, setGridSize] = useState('normal'); // 'compact' | 'normal' | 'large'
  const [selectedItems, setSelectedItems] = useState(new Set());
  const [selectionMode, setSelectionMode] = useState(false);
  const fileInputRef = useRef(null);
  const longPressTimer = useRef(null);

  useEffect(() => {
  fetch(`${API_BASE_URL}/api/chats/media/${userId}`)
  .then(res => res.json())
  .then(data => {
  setMediaItems(data);
  setLoading(false);
  })
  .catch(err => {
  console.error(err);
  setLoading(false);
  });
  }, [userId]);

  const filteredItems = useMemo(() => {
  if (filter === 'all') return mediaItems;
  if (filter === 'image') return mediaItems.filter(m => m.type === 'image' || !m.type);
  if (filter === 'video') return mediaItems.filter(m => m.type === 'video');
  if (filter === 'audio') return mediaItems.filter(m => m.type === 'audio' || m.type === 'voice');
  return mediaItems;
  }, [mediaItems, filter]);

  const toggleSelectItem = (index, e) => {
  if (e) e.stopPropagation();
  setSelectedItems(prev => {
  const next = new Set(prev);
  if (next.has(index)) next.delete(index); else next.add(index);
  if (next.size === 0) setSelectionMode(false); else setSelectionMode(true);
  return next;
  });
  };

  const handleTouchStart = (index, e) => {
  if (selectionMode) return; // If already in select mode, tap handles it
  longPressTimer.current = setTimeout(() => {
  navigator.vibrate?.(50);
  toggleSelectItem(index, { stopPropagation: () => { } });
  }, 400);
  };

  const handleTouchCancel = () => {
  if (longPressTimer.current) {
  clearTimeout(longPressTimer.current);
  longPressTimer.current = null;
  }
  };

  const handleSelectAll = () => {
  if (selectedItems.size === filteredItems.length) {
  setSelectedItems(new Set());
  setSelectionMode(false);
  } else {
  setSelectedItems(new Set(filteredItems.map((_, i) => i)));
  setSelectionMode(true);
  }
  };

  const handleBatchShare = () => {
  if (!onShare || selectedItems.size === 0) return;
  alert(`Click the image you want to share individually`);
  setSelectedItems(new Set());
  setSelectionMode(false);
  };

  const handleBatchDownload = () => {
  if (selectedItems.size === 0) return;
  selectedItems.forEach(index => {
  const item = filteredItems[index];
  if (item?.url) {
  window.open(item.url, '_blank');
  }
  });
  setSelectedItems(new Set());
  setSelectionMode(false);
  };

  if (loading) {
  return <div className="flex-1 flex justify-center items-center bg-white "><div className="animate-spin w-8 h-8 border-4 border-green-500 border-t-transparent rounded-full"></div></div>;
  }

  const gridColsClass =
  gridSize === 'compact' ? 'grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10' :
  gridSize === 'large' ? 'grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4' :
  'grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6'; // normal

  return (
  <div className="flex-1 flex flex-col bg-white  h-full overflow-hidden select-none">
  {/* Top Header (Clean, non-scrolling, two-row layout on mobile) */}
  <div className="p-4 border-b border-gray-100  flex flex-col gap-3 shadow-sm z-20 bg-white ">
  <div className="flex items-center justify-between w-full gap-4">
  <h1 className="text-xl font-black text-gray-800  uppercase tracking-tight flex items-center gap-2">
  <span>Gallery</span>
  <span className="text-xs font-bold bg-gray-100  text-gray-600  px-2.5 py-0.5 rounded-full">
  {filteredItems.length}
  </span>
  </h1>

  {/* Action buttons */}
  <div className="flex items-center gap-2">
  <input
  type="file"
  ref={fileInputRef}
  className="hidden"
  multiple
  accept="image/*,video/*"
  onChange={(e) => {
  const files = Array.from(e.target.files);
  if (files.length > 0 && onShare) onShare({ files });
  }}
  />
  <button onClick={() => fileInputRef.current?.click()} className="w-9 h-9 rounded-full bg-blue-50  text-blue-600  flex items-center justify-center hover:bg-blue-100  transition shadow-sm" title="Upload Media">
  {Icons.plus}
  </button>
  <button onClick={() => setShowCamera(true)} className="w-9 h-9 rounded-full bg-green-50  text-green-600  flex items-center justify-center hover:bg-green-100  transition shadow-sm" title="Open Camera">
  {Icons.camera}
  </button>
  </div>
  </div>

  {/* Filters and Grid Size Controls (Stacked on mobile, side-by-side on desktop, NO horizontal scrolling) */}
  <div className="flex flex-col sm:flex-row items-center justify-between w-full gap-3 pt-1">
  {/* Media Type Filters (Full width pill on mobile) */}
  <div className="flex items-center justify-between gap-1 bg-gray-100  p-1 rounded-xl w-full sm:w-auto">
  {[
  { id: 'all', label: 'All' },
  { id: 'image', label: 'Photos' },
  { id: 'video', label: 'Videos' },
  { id: 'audio', label: 'Audio' },
  ].map(f => (
  <button
  key={f.id}
  onClick={() => { setFilter(f.id); setSelectedItems(new Set()); setSelectionMode(false); }}
  className={`flex-1 sm:flex-none px-3 py-1.5 rounded-lg text-xs font-bold transition ${filter === f.id ? 'bg-white  text-gray-900  shadow-sm' : 'text-gray-500  hover:text-gray-700 '}`}
  >
  {f.label}
  </button>
  ))}
  </div>

  {/* Grid Zoom Controls (Full width pill on mobile) */}
  <div className="flex items-center justify-between gap-1 bg-gray-100  p-1 rounded-xl w-full sm:w-auto">
  {[
  { id: 'large', label: 'Large' },
  { id: 'normal', label: 'Normal' },
  { id: 'compact', label: 'Compact' },
  ].map(g => (
  <button
  key={g.id}
  onClick={() => setGridSize(g.id)}
  className={`flex-1 sm:flex-none px-3 py-1.5 rounded-lg text-xs font-bold transition ${gridSize === g.id ? 'bg-white  text-gray-900  shadow-sm' : 'text-gray-500  hover:text-gray-700 '}`}
  title={`Switch to ${g.id} view`}
  >
  {g.label}
  </button>
  ))}
  </div>
  </div>
  </div>

  {/* Batch Selection Action Bar */}
  {selectionMode && (
  <div className="bg-[#E64A19] text-white px-6 py-3 flex items-center justify-between shadow-lg animate-slide-down z-30 flex-wrap gap-2">
  <div className="flex items-center gap-3">
  <button onClick={() => { setSelectedItems(new Set()); setSelectionMode(false); }} className="text-white hover:bg-white/20 p-1 rounded-lg transition" title="Cancel selection">
  {Icons.x}
  </button>
  <span className="font-bold text-sm tracking-wide">{selectedItems.size} selected</span>
  <button onClick={handleSelectAll} className="text-xs font-bold underline ml-2 opacity-80 hover:opacity-100 transition">
  {selectedItems.size === filteredItems.length ? 'Deselect All' : 'Select All'}
  </button>
  </div>
  </div>
  )}

  {/* Media Grid (Google Photos style: edge-to-edge, minimal gap, absolute inset-0 to prevent Safari/Chrome grid blowout) */}
  <div className={`flex-1 overflow-y-auto p-1 grid ${gridColsClass} gap-[2px] md:gap-1 bg-gray-50  auto-rows-max`}>
  {filteredItems.length === 0 ? (
  <div className="col-span-full flex flex-col items-center justify-center p-16 opacity-60">
  <div className="mb-4 text-gray-400  w-16 h-16">{Icons.image}</div>
  <p className="font-bold uppercase tracking-widest text-sm text-gray-500">No {filter !== 'all' ? filter : 'Media'} Found</p>
  </div>
  ) : (
  filteredItems.map((item, i) => {
  const isSelected = selectedItems.has(i);
  return (
  <div
  key={i}
  className={`aspect-square bg-gray-200  overflow-hidden relative cursor-pointer group transition-all duration-200 select-none ${isSelected ? 'ring-4 ring-[#E64A19] ring-inset scale-[0.96] rounded-xl shadow-md z-10' : ''}`}
  onTouchStart={(e) => handleTouchStart(i, e)}
  onTouchMove={handleTouchCancel}
  onTouchEnd={handleTouchCancel}
  onMouseDown={(e) => handleTouchStart(i, e)}
  onMouseMove={handleTouchCancel}
  onMouseUp={handleTouchCancel}
  onClick={() => {
  if (selectionMode) {
  toggleSelectItem(i, { stopPropagation: () => { } });
  } else {
  onViewMedia({ src: item.url, type: item.type, mediaList: filteredItems });
  }
  }}
  >
  {/* Media Content (absolute inset-0 decouples child from grid intrinsic sizing) */}
  {item.type === 'video' ? (
  <video src={item.url} className="absolute inset-0 w-full h-full object-cover" />
  ) : item.type === 'audio' || item.type === 'voice' ? (
  <div className="absolute inset-0 w-full h-full flex flex-col items-center justify-center text-green-500 bg-green-50  p-2 text-center">
  {Icons.audio}
  <span className="text-[10px] font-bold mt-2 truncate w-full text-gray-500">Audio</span>
  </div>
  ) : (
  <img src={item.url} alt="media" className="absolute inset-0 w-full h-full object-cover" loading="lazy" />
  )}

  {/* Google Photos Checkbox (top-left) */}
  <div
  className={`absolute top-2 left-2 z-20 transition-opacity ${isSelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}
  onClick={(e) => toggleSelectItem(i, e)}
  >
  <div className={`w-5 h-5 rounded-full flex items-center justify-center border-2 transition-all ${isSelected ? 'bg-[#E64A19] border-[#E64A19] text-white shadow-md' : 'bg-black/30 border-white/80 hover:bg-black/50 text-transparent'}`}>
  <svg className="w-3 h-3 stroke-[3]" viewBox="0 0 24 24" fill="none" stroke="currentColor"><polyline points="20 6 9 17 4 12"></polyline></svg>
  </div>
  </div>

  {/* Video duration/icon indicator (top-right) */}
  {item.type === 'video' && (
  <div className="absolute top-2 right-2 z-10 bg-black/60 backdrop-blur-sm text-white px-1.5 py-0.5 rounded text-[9px] font-bold flex items-center gap-1 shadow-sm">
  <span>Video</span>
  </div>
  )}

  {/* Sender & Date Overlay (bottom) */}
  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-2 z-10 pointer-events-none">
  <span className="text-white text-[11px] font-bold truncate">{item.senderName || 'Contact'}</span>
  <span className="text-white/70 text-[9px] mt-0.5">{new Date(item.timestamp || Date.now()).toLocaleDateString()}</span>
  </div>
  </div>
  );
  })
  )}
  </div>

  {showCamera && createPortal(
  <CameraOverlay
  onClose={() => setShowCamera(false)}
  onCapture={(files) => {
  setShowCamera(false);
  if (onShare) onShare({ files });
  }}
  />,
  document.body
  )}
  </div>
  );
};

// ─────────────────────────────────────
// Main Chat App
// ─────────────────────────────────────
// ─── Profile Viewer (Fullscreen) ───

const MobileHome = () => {
  const [user, setUser] = useState(null);
  const [contacts, setContacts] = useState([]);
  const [groups, setGroups] = useState([]);
  const [selectedChat, setSelectedChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const [activeTab, setActiveTab] = useState('chats');
  const [showSettings, setShowSettings] = useState(false);
  const [showAddContact, setShowAddContact] = useState(false);
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [showChatInfo, setShowChatInfo] = useState(false);
  const [tempContact, setTempContact] = useState(null);
  const [phoneInput, setPhoneInput] = useState('');
  const [showAddMembers, setShowAddMembers] = useState(null);
  const [statuses, setStatuses] = useState([]);
  const [showStatusCreator, setShowStatusCreator] = useState(false);
  const [viewerTarget, setViewerTarget] = useState(null);
  const [showStatusCamera, setShowStatusCamera] = useState(false);
  const [statusCameraMedia, setStatusCameraMedia] = useState(null);

  const [socket, setSocket] = useState(null);
  const [isTyping, setIsTyping] = useState(false);
  const [typingRegistry, setTypingRegistry] = useState({}); // { chatId: [nicknames] } mapped to groups or userIds
  const [contextMenu, setContextMenu] = useState(null);
  const typingTimeout = useRef(null);
  const typingTimersRef = useRef({});
  const lastSeenWorkerRef = useRef(null);
  const [replyTo, setReplyTo] = useState(null); // Lifted state for reply
  const [hasMoreMessages, setHasMoreMessages] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [translations, setTranslations] = useState({}); // {messageId: translatedText } (Kept for instant lookups if needed)
  const [messageInfo, setMessageInfo] = useState(null); // Message selected for info modal
  const [editingMessage, setEditingMessage] = useState(null); // Message being edited
  const [mediaView, setMediaView] = useState(null); // {src, type} for fullscreen viewer
  const [viewProfile, setViewProfile] = useState(null); // Chat object for profile viewer
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const mobileMenuRef = useRef(null);
  const [forwardPayload, setForwardPayload] = useState(null); // {texts, messageIds}
  const [sharePayload, setSharePayload] = useState(null); // { files: File[] }

  const [selectedChats, setSelectedChats] = useState(new Set());
  const [chatSelectionMode, setChatSelectionMode] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showInstallModal, setShowInstallModal] = useState(false);
  const [dontShowInstall, setDontShowInstall] = useState(() => localStorage.getItem('louda_dont_show_install') === 'true');
  const [connectionState, setConnectionState] = useState('connected'); // 'connected' | 'disconnected' | 'reconnecting'

  // Textmob Integration State
  const [textmobMode, setTextmobMode] = useState(false);
  const [isInIframe, setIsInIframe] = useState(true);
  const [textmobUser, setTextmobUser] = useState(null);
  const [phoneToVerify, setPhoneToVerify] = useState('');
  const [syncLoading, setSyncLoading] = useState(false);
  const [syncError, setSyncError] = useState('');

  const [tmSearchQuery, setTmSearchQuery] = useState('');
  const [tmSearchResults, setTmSearchResults] = useState([]);
  const [isSearchingTm, setIsSearchingTm] = useState(false);
  const [tmSearchMode, setTmSearchMode] = useState(false); // 'local' | 'textmob'

  useEffect(() => {
  const searchStr = window.location.search || (window.location.hash.includes('?') ? window.location.hash.split('?')[1] : '');
  const params = new URLSearchParams(searchStr);
  const from = params.get('from');
  const userIdParam = params.get('userId');

  // Robust iframe check
  const inIframe = (() => {
  try {
  return window.self !== window.top;
  } catch (e) {
  return true;
  }
  })();
  setIsInIframe(inIframe);

  if (from === 'textmob' && userIdParam) {
  // If we are already logged in as this user, ignore textmobMode entirely
  const currentUserId = localStorage.getItem('userId');
  if (currentUserId === userIdParam || (user && user.username === userIdParam)) {
  return;
  }

  if (!inIframe) {
  setTextmobMode(true);
  setTextmobUser({ username: userIdParam, external: true });
  return;
  }

  setTextmobMode(true);
  fetch(`${API_BASE_URL}/api/textmob/verify?userId=${userIdParam}`)
  .then(res => res.json())
  .then(data => {
  if (data.textmobUser) {
  setTextmobUser(data.textmobUser);

  // AUTO-LOGIN/SYNC: If user exists in Textmob, log them in automatically
  if (data.alreadyInLouda) {
  const currentSessionId = localStorage.getItem('userId');
  if (currentSessionId === data.loudaUserId) {
  // Already logged in as this user!
  setTextmobMode(false);
  return;
  }

  // Clear any existing mismatched session (selective: never wipe
  // the shared window — Textmob session lives here too)
  try { localStorage.removeItem('userId'); sessionStorage.removeItem('userId'); } catch {}
  localStorage.setItem('userId', data.loudaUserId);

  // Close mode and reload to init session
  setTextmobMode(false);
  window.location.reload();
  return;
  }

  // AUTO-SYNC: If usernames match exactly, just update the session and close mode
  if (user && user.username === data.textmobUser.username) {
  setTextmobMode(false);
  return;
  }

  let phone = (data.textmobUser.phone || '').replace(/[\s\-\(\)\+]+/g, '');
  if (phone.startsWith('0')) {
  phone = '+234' + phone.slice(1);
  } else if (phone && !phone.startsWith('+')) {
  // If it already starts with 234, just add +
  if (phone.startsWith('234')) {
  phone = '+' + phone;
  } else {
  phone = '+234' + phone;
  }
  }
  setPhoneToVerify(phone);
  } else {
  setSyncError('Textmob account not found');
  }
  })
  .catch(err => {
  console.error(err);
  setSyncError('Failed to verify Textmob account');
  });
  }
  }, [user]); // Add user as dependency to check for matches once user data is loaded

  const connectTextmob = async () => {
  if (!phoneToVerify) return setSyncError('Phone number is required');
  if (!phoneToVerify.startsWith('+234') || phoneToVerify.length < 10) {
  return setSyncError('Please enter a valid phone number (+234...)');
  }

  setSyncLoading(true);
  try {
  const res = await fetch(`${API_BASE_URL}/api/textmob/connect`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
  userId: textmobUser.username,
  phone: phoneToVerify,
  full_name: textmobUser.full_name,
  avatar_url: textmobUser.profile_pic,
  email: textmobUser.email
  })
  });
  const data = await res.json();
  if (!res.ok) throw data;

  // Textmob port: selective clear (see above)
  try { localStorage.removeItem('userId'); sessionStorage.removeItem('userId'); } catch {}
  localStorage.setItem('userId', data.userId);
  window.history.replaceState({}, document.title, window.location.pathname + window.location.hash);

  window.location.href = '/#/home';
  window.location.reload();
  } catch (e) {
  setSyncError(e.error || 'Sync failed');
  } finally {
  setSyncLoading(false);
  }
  };

  const [blockedUsers, setBlockedUsers] = useState(() => {
  try { return JSON.parse(localStorage.getItem('louda:blockedUsers')) || []; }
  catch { return []; }
  });

  const toggleBlockUser = (userId) => {
  setBlockedUsers(prev => {
  const next = prev.includes(String(userId)) ? prev.filter(id => id !== String(userId)) : [...prev, String(userId)];
  localStorage.setItem('louda:blockedUsers', JSON.stringify(next));
  return next;
  });
  };

  const [chatBgs, setChatBgs] = useState(() => {
  try { return JSON.parse(localStorage.getItem('louda:chatBgs')) || {}; }
  catch { return {}; }
  });
  const [showChatSearch, setShowChatSearch] = useState(false); // In-chat search panel
  const [isLoadingChats, setIsLoadingChats] = useState(true); // Chat list skeleton
  const [searchQuery, setSearchQuery] = useState('');

  const handleViewProfile = (c) => setViewProfile(c);

  // ── Textmob bridge intents (in-code, replaces ?from=textmob&userId= params) ──
  // Producers: bridge/connector.js openChatWith / sharePostToLouda / shareSnapToLouda.
  useEffect(() => {
  const digits = (p) => String(p || '').replace(/\D/g, '').replace(/^0/, '234');
  const phonesMatch = (a, b) => {
  const x = digits(a), y = digits(b);
  if (!x || !y || Math.min(x.length, y.length) < 7) return false;
  return x === y || x.endsWith(y) || y.endsWith(x);
  };
  const matchContact = (list, loudaUserId, tmPhone) =>
  (list || []).find((c) =>
  (loudaUserId && String(c.id) === String(loudaUserId)) ||
  (tmPhone && (phonesMatch(c.number, tmPhone) || phonesMatch(c.phone, tmPhone)))
  );

  const openChatWithUsername = async (username) => {
  if (!username) return;
  try {
  const me = localStorage.getItem('userId');
  if (!me) return;
  const v = await fetch(`${API_BASE_URL}/api/textmob/verify?userId=${encodeURIComponent(username)}`).then((r) => r.json());
  if (!v || !v.textmobUser) {
  Lexum.alert({ title: 'Not found', message: `Could not find @${username}` });
  return;
  }
  const tm = v.textmobUser;
  let list = await fetch(`${API_BASE_URL}/api/contacts?userId=${me}`).then((r) => r.json()).catch(() => []);
  if (!Array.isArray(list)) list = [];
  let contact = matchContact(list, v.loudaUserId, tm.phone);
  if (!contact) {
  if (!tm.phone) {
  Lexum.alert({ title: 'No phone number', message: `@${username} has no phone number to chat with.` });
  return;
  }
  const addRes = await fetch(`${API_BASE_URL}/api/contacts/add`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ userId: me, phone: tm.phone, customName: tm.fullname || tm.full_name || username }),
  });
  if (!addRes.ok) {
  const d = await addRes.json().catch(() => ({}));
  throw new Error(d.error || 'Could not add contact');
  }
  list = await fetch(`${API_BASE_URL}/api/contacts?userId=${me}`).then((r) => r.json()).catch(() => []);
  if (!Array.isArray(list)) list = [];
  contact = matchContact(list, v.loudaUserId, tm.phone);
  loadContacts(me);
  }
  if (!contact) throw new Error('Could not open chat');
  setActiveTab('chats');
  setSelectedChat({ ...contact, isGroup: false });
  } catch (e) {
  console.error('[Louda bridge] open-chat failed:', e);
  Lexum.alert({ title: 'Error', message: e?.message || `Could not open chat with @${username}` });
  }
  };

    // Forwarded shares carry the link only (no post text).
    const formatShareText = (detail = {}) => String(detail.url || detail.text || '').trim();

    // Backend bulk-forward reads payload.messages [{text, media:[{type,url}]}].
    const buildShareMessage = (detail = {}) => ({
      text: formatShareText(detail),
      media: [],
    });

  const onOpenChat = (e) => openChatWithUsername(e?.detail?.username);
  const onShare = (e) => {
  if (e?.detail) setForwardPayload({ messages: [buildShareMessage(e.detail)] });
  };
  window.addEventListener('louda:open-chat', onOpenChat);
  window.addEventListener('louda:share', onShare);
  // Intents queued before Textmob mounted (e.g. /chats?with= deep link)
  try {
  drainPendingIntents().forEach(({ type, detail }) => {
  if (type === 'louda:open-chat' && detail?.username) openChatWithUsername(detail.username);
  else if (type === 'louda:share' && detail) setForwardPayload({ messages: [buildShareMessage(detail)] });
  });
  } catch {}
  return () => {
  window.removeEventListener('louda:open-chat', onOpenChat);
  window.removeEventListener('louda:share', onShare);
  };
  }, []);

  // Textmob port: no Textmob logout — the Textmob identity is derived from the
  // Textmob session (auto-provisioned at signup/login, cleared only when the
  // Textmob account logs out or switches, via bridge/connector.js).

  const totalUnreadChats = useMemo(() => {
  let count = 0;
  contacts.filter(c => !c.archived && !blockedUsers.includes(String(c.id))).forEach(c => count += c.unreadCount || 0);
  groups.filter(g => !g.archived).forEach(g => count += g.unreadCount || 0);
  return count;
  }, [contacts, groups, blockedUsers]);

  const totalUnreadArchived = useMemo(() => {
  let count = 0;
  contacts.filter(c => c.archived && !blockedUsers.includes(String(c.id))).forEach(c => count += c.unreadCount || 0);
  groups.filter(g => g.archived).forEach(g => count += g.unreadCount || 0);
  return count;
  }, [contacts, groups, blockedUsers]);

  const totalUnreadStatuses = useMemo(() => {
  if (!user || !statuses) return 0;
  const contactStatuses = statuses.filter(s => s.user_id !== user.id);
  const unviewedUserIds = new Set();
  contactStatuses.forEach(s => {
  if (!(s.views || []).some(v => v.userId === user.id)) {
  unviewedUserIds.add(s.user_id);
  }
  });
  return unviewedUserIds.size;
  }, [statuses, user]);

  // Click-outside to close mobile menu
  useEffect(() => {
  const handler = (e) => {
  if (mobileMenuOpen && mobileMenuRef.current && !mobileMenuRef.current.contains(e.target)) {
  setMobileMenuOpen(false);
  }
  };
  document.addEventListener('mousedown', handler);
  return () => document.removeEventListener('mousedown', handler);
  }, [mobileMenuOpen]);

  // ─── Keyboard Shortcuts ───
  useEffect(() => {
  const handler = (e) => {
  // Ctrl+F or Cmd+F → In-chat search
  if ((e.ctrlKey || e.metaKey) && e.key === 'f' && selectedChat) {
  e.preventDefault();
  setShowChatSearch(prev => !prev);
  }
  // Escape → Close things in priority order
  if (e.key === 'Escape') {
  if (showChatSearch) { setShowChatSearch(false); return; }
  if (showSettings) { setShowSettings(false); return; }
  if (viewProfile) { setViewProfile(null); return; }
  if (showChatInfo) { setShowChatInfo(false); return; }
  if (mediaView) { setMediaView(null); return; }
  if (forwardPayload) { setForwardPayload(null); return; }
  }
  };
  window.addEventListener('keydown', handler);
  return () => window.removeEventListener('keydown', handler);
  }, [selectedChat, showChatSearch, showSettings, viewProfile, showChatInfo, mediaView, forwardPayload]);

  useEffect(() => {
  Lexum.viewMedia = (src, type) => setMediaView({ src, type });

  // Check if already installed
  const isStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
  if (isStandalone) {
  setShowInstallModal(false);
  return;
  }

  const handleBeforeInstallPrompt = (e) => {
  e.preventDefault();
  setDeferredPrompt(e);

  const isMobile = window.innerWidth < 768 || /Mobi|Android/i.test(navigator.userAgent);
  const userDontShow = localStorage.getItem('louda_dont_show_install') === 'true';

  // For mobile users, always disturb them if not installed.
  // For desktop users, only show if they haven't chosen "don't show again".
  if (isMobile) {
  setShowInstallModal(true);
  } else if (!userDontShow) {
  setShowInstallModal(true);
  }
  };
  window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
  return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
  }, []);

  const handleInstallClick = async () => {
  if (!deferredPrompt) return;
  deferredPrompt.prompt();
  const { outcome } = await deferredPrompt.userChoice;
  if (outcome === 'accepted') {
  setDeferredPrompt(null);
  setShowInstallModal(false);
  }
  };

  const handleDontShowAgain = (e) => {
  const checked = e.target.checked;
  setDontShowInstall(checked);
  if (checked) {
  localStorage.setItem('louda_dont_show_install', 'true');
  setShowInstallModal(false);
  } else {
  localStorage.removeItem('louda_dont_show_install');
  }
  };

  const userLang = user?.preferences?.language_preferences?.preferred_language || 'en';
  const userVoice = user?.preferences?.preferred_voice || 'Zainab';
  const autoTranslate = user?.preferences?.language_preferences?.auto_translate ?? false;

  // Handle viewing message info (triggers translation if not present)
  const handleViewInfo = useCallback(async (message) => {
  // If message has translations in schema, use them.
  // If not, and we want to view it, maybe trigger a translation?
  // For now, just show what we have. API handles auto-translate on send/edit.
  // If user wants to force translate, we could add a button in the modal.
  if (!message.translations?.[userLang] && message.text) {
  // Optionally trigger ad-hoc translation here if missing
  const result = await translateMessage(message.text, userLang);
  if (result) {
  // Create a temporary object with translation for the modal
  setMessageInfo({ ...message, translations: { ...message.translations, [userLang]: result } });
  return;
  }
  }
  setMessageInfo(message);
  }, [userLang]);

  const handleTranslate = useCallback(async (messageId, text) => {
  if (translations[messageId]) return; // already translated
  const result = await translateMessage(text, userLang);
  if (result) {
  setTranslations(prev => ({ ...prev, [messageId]: result }));
  }
  }, [translations, userLang]);

  const memoizedChats = useMemo(() => {
    // Textmob port: backend system contacts keep Louda names in data —
    // present them under the Textmob identity.
    const displayName = (c) =>
      c.name === 'Louda AI' ? 'Textmob AI' : c.name === 'Louda Support' ? 'Textmob Support' : c.name;
    const all = [
      ...contacts.filter(c => !blockedUsers.includes(String(c.id))).map(c => ({ ...c, name: displayName(c), isGroup: false })),
      ...groups.map(g => ({ ...g, isGroup: true }))
    ].sort((a, b) => {
      // Unread chats first, then most recent message.
      const ua = a.unreadCount || a.unread_count || 0;
      const ub = b.unreadCount || b.unread_count || 0;
      if ((ub > 0) !== (ua > 0)) return ub - ua;
      if (ub !== ua) return ub - ua;
      const timeA = new Date(a.lastMessageTime || 0).getTime();
      const timeB = new Date(b.lastMessageTime || 0).getTime();
      return timeB - timeA;
    });

  if (activeTab === 'archived') return all.filter(c => c.archived);
  // Both 'chats' and 'groups' now show the same consolidated list if desired, 
  // or we can just merge them into a single 'messages' tab logic.
  return all.filter(c => !c.archived);
  }, [contacts, groups, activeTab, blockedUsers]);

  const selectedChatRef = useRef(selectedChat);

  useEffect(() => {
  selectedChatRef.current = selectedChat;
  }, [selectedChat]);

  useEffect(() => {
  const handleClickOutside = () => setContextMenu(null);
  document.addEventListener('click', handleClickOutside);
  return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  const toggleChatSelect = (chatId, isLongPress) => {
  if (isLongPress && !chatSelectionMode) {
  setChatSelectionMode(true);
  setSelectedChats(new Set([chatId]));
  return;
  }
  if (!chatSelectionMode) return;
  setSelectedChats(prev => {
  const next = new Set(prev);
  if (next.has(chatId)) next.delete(chatId); else next.add(chatId);
  if (next.size === 0) setChatSelectionMode(false);
  return next;
  });
  };

  const exitChatSelection = () => { setChatSelectionMode(false); setSelectedChats(new Set()); };

  const handleBulkChatDelete = async () => {
  const ids = [...selectedChats];
  const groupIds = [];
  const contactIds = [];
  ids.forEach(id => {
  const chat = memoizedChats.find(c => c.id === id);
  if (chat) {
  if (chat.isGroup) groupIds.push(chat.id);
  else contactIds.push(chat.id);
  }
  });

  try {
  if (groupIds.length > 0) {
  await fetch(`${API_BASE_URL}/api/groups/bulk-leave`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ groupIds, userId: localStorage.getItem('userId') })
  });
  }
  if (contactIds.length > 0) {
  await fetch(`${API_BASE_URL}/api/contacts/bulk-delete`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ contactIds, userId: localStorage.getItem('userId'), forBoth: false })
  });
  }
  exitChatSelection();
  if (groupIds.length > 0) loadGroups(localStorage.getItem('userId'));
  if (contactIds.length > 0) loadContacts(localStorage.getItem('userId'));
  if (selectedChat && ids.includes(selectedChat.id)) setSelectedChat(null);
  Lexum.alert({ title: 'Success', message: 'Chat(s) deleted' });
  } catch (e) {
  Lexum.alert({ title: 'Error', message: 'Failed to delete chats' });
  }
  };

  const handleBulkChatArchive = async () => {
  const ids = [...selectedChats];
  const groupIds = [];
  const contactIds = [];
  ids.forEach(id => {
  const chat = memoizedChats.find(c => c.id === id);
  if (chat) {
  if (chat.isGroup) groupIds.push(chat.id);
  else contactIds.push(chat.id);
  }
  });

  try {
  const archiveStatus = activeTab !== 'archived'; // Archive if not already, unarchive if in archived tab
  if (groupIds.length > 0) {
  // Need bulk archive routes for groups if we want madly fast, but loop for now if not implemented. We didn't implement bulkArchiveGroup yet. Let's do parallel singulars for groups as it's lightweight.
  await Promise.all(groupIds.map(groupId => fetch(`${API_BASE_URL}/api/groups/${groupId}/${archiveStatus ? 'archive' : 'unarchive'}`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ userId: localStorage.getItem('userId') })
  })));
  }
  if (contactIds.length > 0) {
  await fetch(`${API_BASE_URL}/api/contacts/bulk-archive`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ contactIds, userId: localStorage.getItem('userId'), archive: archiveStatus })
  });
  }
  exitChatSelection();
  if (groupIds.length > 0) loadGroups(localStorage.getItem('userId'));
  if (contactIds.length > 0) loadContacts(localStorage.getItem('userId'));
  if (selectedChat && ids.includes(selectedChat.id)) setSelectedChat(null);
  Lexum.alert({ title: 'Success', message: `Chat(s) ${archiveStatus ? 'archived' : 'unarchived'}` });
  } catch (e) {
  Lexum.alert({ title: 'Error', message: 'Failed to archive chats' });
  }
  };


  const mapContactStatus = (c, isOnline, lastSeenVal) => {
  if (c.id === '22222222-2222-2222-2222-222222222222' || c.number === 'support') {
  return {
  ...c,
  online: false,
  statusText: 'Support'
  };
  }
  return {
  ...c,
  online: isOnline,
  statusText: isOnline ? 'Online' : (lastSeenVal ? `Last seen ${formatTimeAgo(lastSeenVal)}` : 'Offline')
  };
  };

  const loadContacts = async (userId) => {
  try {
  console.log(`[DEBUG] Loading contacts for userId: ${userId}`);
  const res = await fetch(`${API_BASE_URL}/api/contacts?userId=${userId}`);
  const data = await res.json();
  if (!res.ok) {
  console.error('[ERROR] Failed to load contacts:', data.error);
  throw new Error(data.error || 'Failed to load contacts');
  }
  setContacts(prev => {
  const onlineMap = new Map(prev.map(p => [p.id, p.online]));
  return data.map(c => {
  const isOnline = onlineMap.get(c.id) || (window.onlineFriendsList && window.onlineFriendsList.includes(c.id)) || false;
  return mapContactStatus(c, isOnline, c.lastSeen);
  });
  });
  localStorage.setItem('myContacts', JSON.stringify(data));
  } catch (e) {
  console.error('[ERROR] Error loading contacts:', e);
  Lexum.alert({ title: 'Error', message: e.message });
  }
  };

  const loadGroups = async (userId) => {
  try {
  console.log(`[DEBUG] Loading groups for userId: ${userId}`);
  const res = await fetch(`${API_BASE_URL}/api/groups/${userId}`);
  const data = await res.json();
  if (!res.ok) {
  console.error('[ERROR] Failed to load groups:', data.error);
  throw new Error(data.error || 'Failed to load groups');
  }
  console.log(`[DEBUG] Groups loaded: count=${data.length}`);
  setGroups(data.map(g => ({ ...g, lastMessage: g.last_message_preview || 'No messages yet' })));
  localStorage.setItem('myGroups', JSON.stringify(data));
  } catch (e) {
  console.error('[ERROR] Error loading groups:', e);
  Lexum.alert({ title: 'Error', message: e.message });
  }
  };

  const loadStatuses = async () => {
  try {
  console.log(`[DEBUG] Loading statuses`);
  const token = localStorage.getItem('token');
  const userId = localStorage.getItem('userId');
  const res = await fetch(`${API_BASE_URL}/api/status`, {
  headers: {
  'Authorization': `Bearer ${token}`,
  'x-user-id': userId
  }
  });
  const data = await res.json();
  if (res.ok) setStatuses(data);
  } catch (e) { console.error(e); }
  };


  const loadMessages = async (chatId, isGroup, limit = 20, before = null) => {
  if (!chatId) return {};
  try {
  console.log(`[DEBUG] Loading messages: id=${chatId}, limit=${limit}, before=${before}`);
  let endpoint;
  if (isGroup) {
  endpoint = `${API_BASE_URL}/api/groups/single/${chatId}?limit=${limit}`;
  } else {
  endpoint = `${API_BASE_URL}/api/chats/single/${chatId}?limit=${limit}`;
  }
  if (before) endpoint += `&before=${before}`;

  const res = await fetch(endpoint);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to load chat');

  return data;
  } catch (e) {
  console.error('[ERROR] Error loading messages:', e);
  return {};
  }
  };



  const handleLoadMore = async () => {
  if (!selectedChat || isLoadingMore || !messages.length) return;
  setIsLoadingMore(true);
  const oldest = messages[0].timestamp;
  try {
  // Need actual chatId from state
  const chatId = selectedChat.isGroup ? selectedChat.id : selectedChat.chatId;
  const data = await loadMessages(chatId, selectedChat.isGroup, 20, oldest);
  const newMessages = data.messages || [];
  if (newMessages.length < 20) setHasMoreMessages(false);
  if (newMessages.length > 0) {
  setMessages(prev => [...newMessages, ...prev]);
  }
  } catch (e) { console.error(e); }
  setIsLoadingMore(false);
  };

  useEffect(() => {
  let socketInstance = null; // Local variable for reliable cleanup

  const load = async () => {
  const userId = localStorage.getItem('userId');
  if (!userId) {
  console.error('[ERROR] No userId in localStorage');
  return;
  }
  try {
  console.log(`[DEBUG] Loading user data for userId: ${userId}`);
  const res = await fetch(`${API_BASE_URL}/api/user/${userId}`);
  const data = await res.json();
  if (!res.ok) {
  console.error('[ERROR] Failed to load user:', data.error);
  throw new Error(data.error || 'Failed to load user');
  }

  console.log(`[DEBUG] User loaded: username=${data.username}`);
  setUser(data);
  await loadContacts(userId);
  await loadGroups(userId);
  await loadStatuses();
  setIsLoadingChats(false);

  console.log(`[DEBUG] Connecting socket for userId: ${userId}`);
  const s = io(API_BASE_URL, {
  query: { userId },
  transports: ['websocket'],
  reconnection: true
  });
  socketInstance = s; // Assign to local variable
  setSocket(s);

  s.on('sync-statuses', (data) => setStatuses(data));
  s.on('new-status', (status) => setStatuses(prev => [...prev, status]));
  s.on('status-deleted', (statusId) => setStatuses(prev => prev.filter(st => st.id !== statusId)));
  s.on('status-viewed', ({ statusId, viewData }) => setStatuses(prev => prev.map(st => st.id === statusId ? { ...st, views: [...(st.views || []), viewData] } : st)));
  s.on('status-reacted', ({ statusId, reactionData }) => setStatuses(prev => prev.map(st => st.id === statusId ? { ...st, reactions: [...(st.reactions || []), reactionData] } : st)));

  s.on('contacts-updated', () => {
  console.log(`[DEBUG] Received contacts-updated, reloading contacts`);
  loadContacts(userId);
  });

  s.on('groups-updated', () => {
  console.log(`[DEBUG] Received groups-updated, reloading groups`);
  loadGroups(userId);
  });

  s.on('user-updated', ({ userId: updatedUserId, updates }) => {
  console.log(`[DEBUG] Received user-updated for ${updatedUserId}`, updates);
  setContacts(prev => prev.map(c =>
  String(c.id) === String(updatedUserId) ? { ...c, ...updates } : c
  ));
  setGroups(prev => prev.map(g => {
  if (g.membersMap && g.membersMap[updatedUserId]) {
  const newMembersMap = { ...g.membersMap };
  const old = newMembersMap[updatedUserId];
  if (typeof old === 'object') {
  newMembersMap[updatedUserId] = {
  ...old,
  name: updates.full_name || updates.username || old.name,
  avatar_url: updates.avatar_url || old.avatar_url
  };
  } else {
  newMembersMap[updatedUserId] = updates.full_name || updates.username || updates.name || old;
  }
  return { ...g, membersMap: newMembersMap };
  }
  return g;
  }));
  // Update selectedChat if it's the updated user
  if (selectedChatRef.current && !selectedChatRef.current.isGroup && String(selectedChatRef.current.id) === String(updatedUserId)) {
  setSelectedChat(prev => ({ ...prev, ...updates }));
  }
  });


  s.on('initial-online', (onlineFriends) => {
  console.log(`[DEBUG] Received initial-online: ${onlineFriends.length} friends`);
  // Merge safely to avoid overwriting people who just connected
  if (!window.onlineFriendsList) window.onlineFriendsList = [];
  onlineFriends.forEach(id => {
  if (!window.onlineFriendsList.includes(id)) window.onlineFriendsList.push(id);
  });
  setContacts(prev => prev.map(c =>
  mapContactStatus(c, window.onlineFriendsList.includes(c.id), c.lastSeen)
  ));
  });

  s.on('status-update', ({ friendId, online, lastSeen }) => {
  const currentChat = selectedChatRef.current;
  console.log(`[DEBUG] Received status-update for friendId: ${friendId}, online: ${online}`);

  // Update the global cache
  if (!window.onlineFriendsList) window.onlineFriendsList = [];
  if (online) {
  if (!window.onlineFriendsList.includes(friendId)) window.onlineFriendsList.push(friendId);
  } else {
  window.onlineFriendsList = window.onlineFriendsList.filter(id => id !== friendId);
  }

  setContacts(prev => prev.map(c =>
  c.id === friendId ? mapContactStatus(c, online, lastSeen) : c
  ));

  if (currentChat && !currentChat.isGroup && currentChat.id === friendId) {
  setSelectedChat(prev => {
  const mapped = mapContactStatus({ ...prev, lastSeen }, online, lastSeen);
  return {
  ...prev,
  online: mapped.online,
  lastSeen: mapped.lastSeen,
  statusText: mapped.statusText
  };
  });
  }
  });

  s.on('sync-online-status', (syncedFriends) => {
  window.onlineFriendsList = syncedFriends;
  setContacts(prev => prev.map(c => {
  const isOnline = syncedFriends.includes(c.id);
  const mapped = mapContactStatus(c, isOnline, c.lastSeen);
  if (c.online === mapped.online && c.statusText === mapped.statusText) return c;
  return mapped;
  }));
  });

  // Poll server for online status every 5 seconds
  const pollInterval = setInterval(() => {
  if (s.connected) {
  s.emit('request-status-sync');
  }
  }, 5000);

  // Store interval so we can clear it on unmount if necessary, though this effect runs once
  window.statusPollInterval = pollInterval;

  const playNotificationSound = () => {
  try {
  const audio = new Audio('https://ldepewastfyohswgtgbb.supabase.co/storage/v1/object/public/LOUDA/dragon-studio-new-notification-3-398649.mp3');
  audio.play().catch(e => console.warn('[Sound] Autoplay blocked by browser policy:', e));
  } catch (e) {
  console.error('[Sound] Failed to play notification sound:', e);
  }
  };

  s.on('new-message', ({ chatId, message }) => {
  const currentChat = selectedChatRef.current;
  console.log(`[DEBUG] Received new-message for chatId: ${chatId}`);

  if (message.from !== userId) {
  playNotificationSound();
  }

  if (currentChat && !currentChat.isGroup && currentChat.chatId === chatId) {
  setMessages(prev => [...prev, message]);
  // Auto-translate incoming messages from others
  if (autoTranslate && message.from !== userId && message.text) {
  handleTranslate(message.id, message.text);
  }
  // Auto-mark as read if the message is from someone else
  if (message.from !== userId) {
  s.emit('mark-read', {
  chatId,
  messageIds: [message.id],
  isGroup: false
  });
  }
  } else {
  // Not in chat, update contact list instantly
  if (message.from !== userId) {
  setContacts(prev => prev.map(c => c.id === message.from ? {
  ...c,
  unreadCount: (c.unreadCount || 0) + 1,
  lastMessage: message.text || 'Media',
  lastMessageTime: message.timestamp,
  lastMessageStatus: 'received'
  } : c));
  }
  }
  });

  s.on('new-group-message', ({ groupId, message }) => {
  const currentChat = selectedChatRef.current;
  console.log(`[DEBUG] Received new-group-message for groupId: ${groupId}`);

  if (message.from !== userId) {
  playNotificationSound();
  }

  if (currentChat && currentChat.isGroup && currentChat.id === groupId) {
  setMessages(prev => [...prev, message]);
  // Auto-translate incoming group messages from others
  if (autoTranslate && message.from !== userId && message.text) {
  handleTranslate(message.id, message.text);
  }
  // Auto-mark as read if the message is from someone else
  if (message.from !== userId) {
  s.emit('mark-read', {
  chatId: groupId,
  messageIds: [message.id],
  isGroup: true
  });
  }
  } else {
  // Not in chat, update group list instantly
  if (message.from !== userId) {
  setGroups(prev => prev.map(g => {
  if (g.id !== groupId) return g;
  const senderMember = g.members?.find(m => m.user_id === message.from);
  const senderName = senderMember ? (senderMember.nickname || senderMember.real_name || '').split(' ')[0] : '';
  return {
  ...g,
  unreadCount: (g.unreadCount || 0) + 1,
  lastMessage: senderName ? `${senderName}: ${message.text || 'Media'}` : (message.text || 'Media'),
  lastMessageTime: message.timestamp,
  lastMessageStatus: 'received'
  };
  }));
  }
  }
  });

  loadGroups(userId);



  // Listen for message updates (edits)
  const handleMessageUpdate = ({ chatId, messageId, newText, isGroup }) => {
  setMessages(prev => prev.map(m => m.id === messageId ? { ...m, text: newText, is_edited: true, edited_at: new Date().toISOString(), translations: {} } : m));
  // If the updated message is currently open in modal, update it
  setMessageInfo(prev => (prev && prev.id === messageId) ? { ...prev, text: newText, annotations: {}, translations: {} } : prev);
  };
  s.on('message-edited', handleMessageUpdate);

  // Listen for translations arriving asynchronously
  s.on('message-translated', ({ chatId, messageId, translations: newTranslations }) => {
  setMessages(prev => prev.map(m => m.id === messageId ? { ...m, translations: { ...(m.translations || {}), ...newTranslations } } : m));
  // Update modal if open
  setMessageInfo(prev => (prev && prev.id === messageId) ? { ...prev, translations: { ...(prev.translations || {}), ...newTranslations } } : prev);
  });



  s.on('group-created', () => {
  console.log(`[DEBUG] Received group-created, reloading groups`);
  loadGroups(userId);
  });

  s.on('added-to-group', () => {
  console.log(`[DEBUG] Received added-to-group, reloading groups`);
  loadGroups(userId);
  });

  s.on('group-updated', () => {
  console.log(`[DEBUG] Received group-updated, reloading groups`);
  loadGroups(userId);
  });

  s.on('member-left', () => {
  console.log(`[DEBUG] Received member-left, reloading groups`);
  loadGroups(userId);
  });

  s.on('message-status', ({ chatId, groupId, messageId, status }) => {
  const currentChat = selectedChatRef.current;
  const id = chatId || groupId;
  console.log(`[DEBUG] Received message-status: id=${messageId}, status=${status}, id=${id}`);

  if (!groupId) {
  setContacts(prev => prev.map(c => c.chatId === id ? { ...c, lastMessageStatus: status } : c));
  }

  if (currentChat && ((currentChat.isGroup && currentChat.id === id) || (!currentChat.isGroup && currentChat.chatId === id))) {
  setMessages(prev => prev.map(m => m.id === messageId ? { ...m, status } : m));
  }
  });

  s.on('messages-read', ({ chatId, groupId, messageIds, readBy }) => {
  const currentChat = selectedChatRef.current;
  const id = chatId || groupId;
  console.log(`[DEBUG] Received messages-read: ids=${messageIds?.length}, id=${id}, readBy=`, readBy);

  if (!groupId) {
  setContacts(prev => prev.map(c => c.chatId === id ? { ...c, lastMessageStatus: 'read' } : c));
  }

  if (currentChat && ((currentChat.isGroup && currentChat.id === id) || (!currentChat.isGroup && currentChat.chatId === id))) {
  setMessages(prev => prev.map(m => {
  if (messageIds.includes(m.id)) {
  if (!currentChat.isGroup) {
  // For 1v1, set status to read
  return { ...m, status: 'read' };
  } else {
  // For groups, add to read_by array with detailed info
  const read_by = m.read_by || [];

  // Check if reader already in array
  const alreadyRead = read_by.find(r =>
  (typeof r === 'string' && r === readBy.userId) ||
  (typeof r === 'object' && r.userId === readBy.userId)
  );

  if (!alreadyRead && readBy) {
  return { ...m, read_by: [...read_by, readBy] };
  }
  }
  }
  return m;
  }));
  }
  });

  s.on('message-deleted', ({ chatId, groupId, messageId }) => {
  const currentChat = selectedChatRef.current;
  const id = chatId || groupId;
  if (currentChat && ((currentChat.isGroup && currentChat.id === id) || (!currentChat.isGroup && currentChat.chatId === id))) {
  setMessages(prev => prev.filter(m => m.id !== messageId));
  }
  });

  // ─── Reaction Updates ───
  s.on('message-reacted', ({ chatId, messageId, reactions, isGroup }) => {
  const currentChat = selectedChatRef.current;
  const matchesCurrent = currentChat && (
  (isGroup && currentChat.isGroup && currentChat.id === chatId) ||
  (!isGroup && !currentChat.isGroup && currentChat.chatId === chatId)
  );
  if (matchesCurrent) {
  setMessages(prev => prev.map(m => m.id === messageId ? { ...m, reactions } : m));
  }
  });

  // ─── Pin/Unpin Updates ───
  s.on('message-pinned', ({ chatId, messageId, isGroup }) => {
  const currentChat = selectedChatRef.current;
  const matchesCurrent = currentChat && (
  (isGroup && currentChat.isGroup && currentChat.id === chatId) ||
  (!isGroup && !currentChat.isGroup && currentChat.chatId === chatId)
  );
  if (matchesCurrent) {
  setMessages(prev => prev.map(m => m.id === messageId ? { ...m, is_pinned: true } : m));
  }
  });

  s.on('message-unpinned', ({ chatId, messageId, isGroup }) => {
  const currentChat = selectedChatRef.current;
  const matchesCurrent = currentChat && (
  (isGroup && currentChat.isGroup && currentChat.id === chatId) ||
  (!isGroup && !currentChat.isGroup && currentChat.chatId === chatId)
  );
  if (matchesCurrent) {
  setMessages(prev => prev.map(m => m.id === messageId ? { ...m, is_pinned: false } : m));
  }
  });

  // ─── Connection State ───
  s.on('connect', () => {
  console.log('[SOCKET] Connected');
  setConnectionState('connected');
  });
  s.on('disconnect', () => {
  console.log('[SOCKET] Disconnected');
  setConnectionState('disconnected');
  });
  s.on('reconnecting', () => {
  setConnectionState('reconnecting');
  });
  s.on('reconnect', () => {
  console.log('[SOCKET] Reconnected - resyncing');
  setConnectionState('connected');
  loadContacts(userId);
  loadGroups(userId);
  });

  // Typing indicators (global registry)
  s.on('typing', ({ to, isGroup, nickname, from }) => {
  // 'to' is the target (userId or groupId)
  // 'from' is the sender userId
  const targetId = isGroup ? to : from; // We track by the chatId/groupId

  setTypingRegistry(prev => {
  const current = prev[targetId] || [];
  if (current.includes(nickname)) return prev;
  return { ...prev, [targetId]: [...current, nickname] };
  });

  // Set a timeout to clear typing if stop-typing is missed
  const timerKey = `${targetId}_${nickname}`;
  if (typingTimersRef.current[timerKey]) clearTimeout(typingTimersRef.current[timerKey]);
  typingTimersRef.current[timerKey] = setTimeout(() => {
  setTypingRegistry(prev => {
  const current = prev[targetId] || [];
  const filtered = current.filter(n => n !== nickname);
  if (filtered.length === 0) {
  const next = { ...prev };
  delete next[targetId];
  return next;
  }
  return { ...prev, [targetId]: filtered };
  });
  delete typingTimersRef.current[timerKey];
  }, 3000);
  });

  s.on('stop-typing', ({ to, isGroup, nickname, from }) => {
  const targetId = isGroup ? to : from;
  setTypingRegistry(prev => {
  const current = prev[targetId] || [];
  const filtered = current.filter(n => n !== nickname);
  if (filtered.length === 0) {
  const next = { ...prev };
  delete next[targetId];
  return next;
  }
  return { ...prev, [targetId]: filtered };
  });
  const timerKey = `${targetId}_${nickname}`;
  if (typingTimersRef.current[timerKey]) {
  clearTimeout(typingTimersRef.current[timerKey]);
  delete typingTimersRef.current[timerKey];
  }
  });

  // Setup last seen worker
  lastSeenWorkerRef.current = new Worker('/last-seen-worker.js');
  lastSeenWorkerRef.current.postMessage({ type: 'setUserId', userId });
  console.log(`[DEBUG] Last-seen worker started for userId: ${userId}`);

  } catch (e) {
  console.error('[ERROR] Error loading user data:', e);
  setUser({});
  if (typeof Lexum !== 'undefined') {
  Lexum.alert({ title: 'Error', message: e.message });
  }
  }
  };

  load();

  return () => {
  if (socketInstance) {
  console.log(`[DEBUG] Disconnecting socket`);
  socketInstance.disconnect();
  // The app-level bridge socket keeps presence alive; re-assert it so the
  // user doesn't drop offline when this view unmounts.
  try { refreshLoudaPresence(); } catch {}
  }
  if (lastSeenWorkerRef.current) {
  console.log(`[DEBUG] Terminating last-seen worker`);
  lastSeenWorkerRef.current.postMessage({ type: 'stop' });
  lastSeenWorkerRef.current.terminate();
  }
  };
  }, []);

  useEffect(() => {
  if (!user?.id) return;
  const unsubscribe = listenForForegroundMessages((payload) => {
  if (typeof Lexum !== 'undefined' && Lexum.alert) {
  Lexum.alert({
  title: payload.notification?.title || 'Textmob',
  message: payload.notification?.body || 'New message received'
  });
  }
  });
  return () => unsubscribe();
  }, [user?.id]);
  const fetchChatId = async (contactId) => {
  try {
  console.log(`[DEBUG] Fetching chatId for contact: ${contactId}`);
  const res = await fetch(`${API_BASE_URL}/api/chats/${localStorage.getItem('userId')}/${contactId}`);
  const data = await res.json();
  if (!res.ok) {
  console.error('[ERROR] Failed to fetch chatId:', data.error);
  throw new Error(data.error || 'Failed');
  }
  console.log(`[DEBUG] ChatId fetched: ${data.id}`);
  return data.id;
  } catch (e) {
  console.error('[ERROR] Error fetching chatId:', e);
  return null;
  }
  };

  useEffect(() => {
  if (!selectedChat || !user?.id) return;

  // Clear messages immediately to prevent stale flash from previous chat
  setMessages([]);
  setHasMoreMessages(false);

  const openChat = async () => {
  let chatIdToUse;
  let loadedMessages = [];
  let fullData;

  if (selectedChat.isGroup) {
  chatIdToUse = selectedChat.id;
  fullData = await loadMessages(chatIdToUse, true);
  loadedMessages = fullData.messages || [];
  setSelectedChat({ ...selectedChat, ...fullData, isGroup: true });
  } else {
  chatIdToUse = await fetchChatId(selectedChat.id);
  if (!chatIdToUse) {
  console.error('[ERROR] Could not fetch chatId');
  Lexum.alert({ title: 'Error', message: 'Could not open chat' });
  setSelectedChat(null);
  return;
  }
  fullData = await loadMessages(chatIdToUse, false, 20);
  loadedMessages = fullData.messages || [];
  setSelectedChat({ ...selectedChat, chatId: chatIdToUse });
  }

  console.log(`[DEBUG] Setting messages: count=${loadedMessages.length}`);
  setMessages(loadedMessages);
  setHasMoreMessages(loadedMessages.length >= 20);

  if (autoTranslate) {
  loadedMessages.forEach(m => {
  if (m.from !== user?.id && m.text) {
  handleTranslate(m.id, m.text);
  }
  });
  }

  // Mark unread messages as read
  // Mark unread messages as read
  const currentUserId = localStorage.getItem('userId');
  const unreadIds = loadedMessages.filter(m => {
  if (m.from === currentUserId) return false;
  if (selectedChat.isGroup) {
  // Group logic: check if user is in read_by (handle both object and string format)
  if (!m.read_by) return true;
  return !m.read_by.some(r => (typeof r === 'object' ? r.userId : r) === currentUserId);
  }
  return m.status !== 'read';
  }).map(m => m.id);
  if (unreadIds.length > 0) {
  console.log(`[DEBUG] Marking ${unreadIds.length} messages as read`);
  socket.emit('mark-read', {
  chatId: chatIdToUse,
  messageIds: unreadIds,
  isGroup: selectedChat.isGroup
  });
  }
  };

  console.log(`[DEBUG] Opening chat: ${selectedChat.id}, isGroup: ${selectedChat.isGroup}`);
  openChat();
  }, [selectedChat?.id, user?.id]);

  const findUserByPhone = async () => {
  if (!phoneInput.trim()) {
  console.error('[ERROR] Empty phone input');
  return;
  }
  try {
  console.log(`[DEBUG] Finding user by phone: ${phoneInput}`);
  const res = await fetch(`${API_BASE_URL}/api/user/by-phone?phone=${encodeURIComponent(phoneInput)}`);
  const data = await res.json();
  if (res.ok) {
  console.log(`[DEBUG] User found by phone: id=${data.id}`);
  if (String(data.id) === String(user?.id)) {
  Lexum.alert({ title: 'Cannot Add Self', message: 'You cannot add yourself to your contacts.' });
  return;
  }
  if (contacts?.some(c => String(c.id) === String(data.id) || c.number === data.phone || c.phone === data.phone)) {
  Lexum.alert({ title: 'Already in Contacts', message: `${data.full_name || data.phone} is already in your contacts.` });
  return;
  }
  setTempContact({
  number: data.phone,
  name: data.full_name,
  avatar_url: data.avatar_url
  });
  } else {
  console.error('[ERROR] User not found by phone:', data.error);
  throw new Error(data.error || 'User not found');
  }
  } catch (e) {
  console.error('[ERROR] Error finding user by phone:', e);
  Lexum.alert({ title: 'Error', message: e.message });
  }
  };

  const confirmAddContact = async () => {
  if (!tempContact) {
  console.error('[ERROR] No tempContact to add');
  return;
  }
  const isDuplicate = contacts?.some(c => c.number === tempContact.number || c.phone === tempContact.number || String(c.id) === String(tempContact.id));
  if (isDuplicate) {
  Lexum.alert({ title: 'Already in Contacts', message: 'This contact is already in your contacts.' });
  return;
  }
  try {
  console.log(`[DEBUG] Adding contact: phone=${tempContact.number}`);
  const res = await fetch(`${API_BASE_URL}/api/contacts/add`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
  userId: localStorage.getItem('userId'),
  phone: tempContact.number,
  customName: tempContact.customName || tempContact.name
  })
  });
  const data = await res.json();
  if (res.ok) {
  console.log(`[DEBUG] Contact added successfully`);
  setShowAddContact(false);
  setTempContact(null);
  setPhoneInput('');
  loadContacts(localStorage.getItem('userId'));
  Lexum.alert({ title: 'Success', message: 'Contact added' });
  } else {
  console.error('[ERROR] Failed to add contact:', data.error);
  throw new Error(data.error || 'Failed to add contact');
  }
  } catch (e) {
  console.error('[ERROR] Error adding contact:', e);
  Lexum.alert({ title: 'Error', message: e.message });
  }
  };

  const createGroup = async (name, description, memberIds) => {
  try {
  console.log(`[DEBUG] Creating group: name=${name}, members=${memberIds.length}`);
  const res = await fetch(`${API_BASE_URL}/api/groups/create`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ userId: localStorage.getItem('userId'), name, description, memberIds })
  });
  const data = await res.json();
  if (res.ok) {
  console.log(`[DEBUG] Group created successfully: id=${data.group.id}`);
  setShowCreateGroup(false);
  loadGroups(localStorage.getItem('userId'));
  Lexum.alert({ title: 'Success', message: 'Group created' });
  } else {
  console.error('[ERROR] Failed to create group:', data.error);
  throw new Error(data.error || 'Failed to create group');
  }
  } catch (e) {
  console.error('[ERROR] Error creating group:', e);
  Lexum.alert({ title: 'Error', message: e.message });
  }
  };

  const addGroupMembers = async (groupId, memberIds) => {
  try {
  console.log(`[DEBUG] Adding members to group ${groupId}: count=${memberIds.length}`);
  const res = await fetch(`${API_BASE_URL}/api/groups/${groupId}/add-members`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ userId: localStorage.getItem('userId'), memberIds })
  });
  const data = await res.json();
  if (res.ok) {
  console.log(`[DEBUG] Members added successfully`);
  loadGroups(localStorage.getItem('userId'));
  Lexum.alert({ title: 'Success', message: 'Members added' });
  } else {
  console.error('[ERROR] Failed to add members:', data.error);
  throw new Error(data.error || 'Failed to add members');
  }
  } catch (e) {
  console.error('[ERROR] Error adding members:', e);
  Lexum.alert({ title: 'Error', message: e.message });
  }
  };

  const updateContactName = async (contactId, newName) => {
  if (contactId === '11111111-1111-1111-1111-111111111111' || contactId === '22222222-2222-2222-2222-222222222222') {
  Lexum.alert({ title: 'Not Allowed', message: 'You cannot edit the nickname of Textmob AI or Support Team' });
  return;
  }
  try {
  console.log(`[DEBUG] Updating contact name: contactId=${contactId}, newName=${newName}`);
  const res = await fetch(`${API_BASE_URL}/api/contacts/update-name`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ userId: localStorage.getItem('userId'), contactId, newName })
  });
  if (res.ok) {
  console.log(`[DEBUG] Contact name updated`);
  loadContacts(localStorage.getItem('userId'));
  Lexum.alert({ title: 'Success', message: 'Nickname updated' });
  } else {
  console.error('[ERROR] Failed to update name');
  throw new Error('Failed to update name');
  }
  } catch (e) {
  console.error('[ERROR] Error updating contact name:', e);
  Lexum.alert({ title: 'Error', message: 'Failed to update name' });
  }
  };

  const updateGroupNickname = async (groupId, nickname) => {
  try {
  console.log(`[DEBUG] Updating group nickname: groupId=${groupId}, nickname=${nickname}`);
  const res = await fetch(`${API_BASE_URL}/api/groups/${groupId}/update-nickname`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ userId: localStorage.getItem('userId'), memberId: localStorage.getItem('userId'), nickname })
  });
  if (res.ok) {
  console.log(`[DEBUG] Group nickname updated`);
  loadGroups(localStorage.getItem('userId'));
  Lexum.alert({ title: 'Success', message: 'Nickname updated' });
  } else {
  console.error('[ERROR] Failed to update nickname');
  throw new Error('Failed to update nickname');
  }
  } catch (e) {
  console.error('[ERROR] Error updating group nickname:', e);
  Lexum.alert({ title: 'Error', message: 'Failed to update nickname' });
  }
  };

  const deleteChat = async (chatId, forBoth, isGroup) => {
  try {
  console.log(`[DEBUG] Deleting chat: id=${chatId}, isGroup=${isGroup}, forBoth=${forBoth}`);

  let endpoint;
  let body;

  if (isGroup) {
  const isAdmin = selectedChat && selectedChat.admin_id === localStorage.getItem('userId');
  if (isAdmin) {
  endpoint = `${API_BASE_URL}/api/groups/${chatId}/delete`;
  body = { userId: localStorage.getItem('userId') };
  } else {
  endpoint = `${API_BASE_URL}/api/groups/${chatId}/leave`;
  body = { userId: localStorage.getItem('userId') };
  }
  } else {
  endpoint = `${API_BASE_URL}/api/contacts/delete`;
  body = { userId: localStorage.getItem('userId'), contactId: chatId, forBoth };
  }

  const res = await fetch(endpoint, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(body)
  });
  if (res.ok) {
  console.log(`[DEBUG] Chat deleted successfully`);
  setSelectedChat(null);
  if (isGroup) loadGroups(localStorage.getItem('userId'));
  else loadContacts(localStorage.getItem('userId'));
  Lexum.alert({ title: 'Success', message: isGroup ? 'Left group' : 'Contact deleted' });
  } else {
  console.error('[ERROR] Failed to delete chat');
  throw new Error('Failed to delete');
  }
  } catch (e) {
  console.error('[ERROR] Error deleting chat:', e);
  Lexum.alert({ title: 'Error', message: 'Failed to delete' });
  }
  };

  const archiveChat = async (chat) => {
  try {
  console.log(`[DEBUG] Archiving chat: id=${chat.id}, isGroup=${chat.isGroup}`);
  const endpoint = chat.isGroup ? `${API_BASE_URL}/api/groups/${chat.id}/archive` : `${API_BASE_URL}/api/contacts/archive`;
  const body = chat.isGroup ? { userId: localStorage.getItem('userId'), groupId: chat.id } : { userId: localStorage.getItem('userId'), contactId: chat.id };
  await fetch(endpoint, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(body)
  });
  if (chat.isGroup) loadGroups(localStorage.getItem('userId'));
  else loadContacts(localStorage.getItem('userId'));
  } catch (e) { console.error('Archive failed', e); }
  };

  const unarchiveChat = async (chat) => {
  try {
  console.log(`[DEBUG] Unarchiving chat: id=${chat.id}, isGroup=${chat.isGroup}`);
  const endpoint = chat.isGroup ? `${API_BASE_URL}/api/groups/${chat.id}/unarchive` : `${API_BASE_URL}/api/contacts/unarchive`;
  const body = chat.isGroup ? { userId: localStorage.getItem('userId'), groupId: chat.id } : { userId: localStorage.getItem('userId'), contactId: chat.id };
  await fetch(endpoint, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(body)
  });
  if (chat.isGroup) loadGroups(localStorage.getItem('userId'));
  else loadContacts(localStorage.getItem('userId'));
  } catch (e) { console.error('Unarchive failed', e); }
  };

  const handleForwardInitiate = (payload) => {
  setForwardPayload(payload);
  };

  const handleConfirmForward = async (targets) => {
  if (!forwardPayload || !targets.length) return;
  try {
  // Normalise payload: backend bulk-forward reads payload.messages
  // [{text, media}], not {texts}. Accept both shapes.
  const fp = forwardPayload.messages && forwardPayload.messages.length
  ? forwardPayload
  : {
  ...forwardPayload,
  messages: (forwardPayload.texts || []).map((text) => ({ text, media: [] })),
  };
  if (!fp.messages.length) {
  Lexum.alert({ title: 'Error', message: 'Nothing to forward' });
  return;
  }
  // Resolve DM targets (contact/user ids) to real chat ids — the backend
  // looks chats up by chat id and silently skips unknown ones.
  const resolved = [];
  for (const t of targets) {
  if (t.isGroup) {
  resolved.push(t);
  continue;
  }
  const chatId = await fetchChatId(t.id);
  if (chatId) resolved.push({ id: chatId, isGroup: false });
  }
  if (!resolved.length) {
  Lexum.alert({ title: 'Error', message: 'Could not open the selected chat(s)' });
  return;
  }
  const res = await fetch(`${API_BASE_URL}/api/chats/messages/bulk-forward`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
  userId: user.id,
  targets: resolved, // Array of {id (chatId), isGroup}
  payload: fp
  })
  });
  if (res.ok) {
  Lexum.alert({ title: 'Success', message: `Message(s) forwarded to ${resolved.length} chat(s)` });
  setForwardPayload(null);
  } else {
  const d = await res.json();
  Lexum.alert({ title: 'Error', message: d.error || 'Forwarding failed' });
  }
  } catch (e) {
  Lexum.alert({ title: 'Error', message: 'Forwarding failed' });
  }
  };

  const handleConfirmShareMedia = async (targets) => {
  if (!sharePayload || !sharePayload.files || !targets.length) return;

  let files = sharePayload.files;
  if (files.length > 6) {
  Lexum.alert({ title: 'Notice', message: 'Only the first 6 files will be sent.' });
  files = files.slice(0, 6);
  }

  const validFiles = files.filter(f => f.size <= 10 * 1024 * 1024);
  if (validFiles.length < files.length) {
  Lexum.alert({ title: 'Notice', message: 'Some files were skipped because they exceed the 10MB limit.' });
  }
  if (validFiles.length === 0) {
  Lexum.alert({ title: 'Error', message: 'No valid files to send.' });
  setSharePayload(null);
  return;
  }

  Lexum.alert({ title: 'Sending...', message: 'Uploading media...' });
  try {
  const media = [];
  for (const f of validFiles) {
  const fd = new FormData();
  fd.append('file', f);
  fd.append('type', f.type.startsWith('image/') ? 'image' : f.type.startsWith('video/') ? 'video' : 'file');
  const res = await fetch(`${API_BASE_URL}/api/upload`, { method: 'POST', body: fd });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error);
  media.push({ type: data.type, url: data.url });
  }

  for (const target of targets) {
    if (target.isGroup) {
      socket.emit('send-group-message', { groupId: target.id, message: { text: '', media } });
    } else {
      socket.emit('send-message', { chatId: target.chatId, toUserId: target.id, message: { text: '', media } });
    }
    fireLoudaPushNotify(target, { text: '', media }, user);
  }
  setSharePayload(null);
  Lexum.alert({ title: 'Success', message: `Media sent to ${targets.length} chat(s)!` });
  } catch (e) {
  console.error(e);
  Lexum.alert({ title: 'Error', message: 'Failed to share media.' });
  }
  };


  const handleSave = async (newPrefs) => {
  try {
  console.log(`[DEBUG] Saving preferences`);
  const userId = localStorage.getItem('userId') || user?.id;
  const res = await fetch(`${API_BASE_URL}/api/user/preferences`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ userId, preferences: newPrefs })
  });
  if (res.ok) {
  console.log(`[DEBUG] Preferences saved`);
  setUser({ ...user, preferences: newPrefs });
  setShowSettings(false);
  setActiveTab(prev => prev === 'settings' ? 'chats' : prev);
  Lexum.alert({ title: 'Success', message: 'Settings saved!' });
  } else {
  console.error('[ERROR] Failed to save preferences');
  throw new Error('Failed to save');
  }
  } catch (e) {
  console.error('[ERROR] Error saving preferences:', e);
  Lexum.alert({ title: 'Error', message: 'Failed to save settings' });
  }
  };

  const handleUpdateProfile = async (updates) => {
  try {
  console.log(`[DEBUG] Updating profile:`, updates);
  const userId = localStorage.getItem('userId');
  const res = await fetch(`${API_BASE_URL}/api/user/update`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ userId, ...updates })
  });
  if (res.ok) {
  setUser(prev => ({ ...prev, ...updates }));
  Lexum.alert({ title: 'Success', message: 'Profile updated' });
  } else {
  const data = await res.json();
  throw new Error(data.error || 'Failed to update profile');
  }
  } catch (e) {
  console.error('[ERROR] Error updating profile:', e);
  Lexum.alert({ title: 'Error', message: e.message });
  }
  };

  const handleUpdateField = async (id, field, value, isGroup) => {

  console.log(`[DEBUG] handleUpdateField: id=${id}, field=${field}, isGroup=${isGroup}`);
  const userId = localStorage.getItem('userId') || user?.id;
  if (isGroup) {
  if (field === 'name') {
  await onSaveGroupName(id, value);
  if (selectedChat?.isGroup && selectedChat.id === id) {
  setSelectedChat(prev => ({ ...prev, name: value }));
  }
  if (viewProfile?.isGroup && viewProfile.id === id) {
  setViewProfile(prev => ({ ...prev, name: value }));
  }
  }
  else if (field === 'nickname') {
  await updateGroupNickname(id, value);
  if (selectedChat?.isGroup && selectedChat.id === id) {
  setSelectedChat(prev => ({
  ...prev,
  members: prev.members?.map(m => m.user_id === userId ? { ...m, nickname: value } : m)
  }));
  }
  if (viewProfile?.isGroup && viewProfile.id === id) {
  setViewProfile(prev => ({
  ...prev,
  members: prev.members?.map(m => m.user_id === userId ? { ...m, nickname: value } : m)
  }));
  }
  }
  else if (field.startsWith('settings.')) {
  const settingKey = field.split('.')[1];
  await onSaveSettings(id, { [settingKey]: value });
  }
  else if (field === 'description') {
  await onSaveSettings(id, { description: value });
  if (selectedChat?.isGroup && selectedChat.id === id) {
  setSelectedChat(prev => ({ ...prev, description: value }));
  }
  if (viewProfile?.isGroup && viewProfile.id === id) {
  setViewProfile(prev => ({ ...prev, description: value }));
  }
  }
  } else {
  if (field === 'nickname' || field === 'name') {
  await updateContactName(id, value);
  setContacts(prev => prev.map(c => c.id === id ? { ...c, name: value } : c));
  if (selectedChat && !selectedChat.isGroup && (selectedChat.id === id || selectedChat.chatId === id)) {
  setSelectedChat(prev => ({ ...prev, name: value }));
  }
  if (viewProfile && !viewProfile.isGroup && viewProfile.id === id) {
  setViewProfile(prev => ({ ...prev, name: value }));
  }
  }
  else if (field.startsWith('settings.')) {
  const settingKey = field.split('.')[1];
  await onSaveChatSettings(selectedChat?.chatId || id, { [settingKey]: value });
  }
  else if (field === 'description') {
  if (id === userId) {
  handleSave({ ...user.preferences, status: value });
  } else {
  await onSaveChatSettings(selectedChat?.chatId || id, { description: value });
  }
  }
  }
  };

  const handleSend = (msg) => {
    console.log(`[DEBUG] Handling send message: isGroup=${selectedChat.isGroup}`);
    if (selectedChat.isGroup) {
      socket.emit('send-group-message', { groupId: selectedChat.id, message: msg });
    } else {
      socket.emit('send-message', { chatId: selectedChat.chatId, toUserId: selectedChat.id, message: msg });
    }
    fireLoudaPushNotify(selectedChat, msg, user);
  };

  const handleEditMessage = (messageId, newText) => {
  if (!selectedChat || !socket) return;
  console.log(`[DEBUG] Emitting edit-message for ${messageId}`);
  // Emit event
  socket.emit('edit-message', { chatId: selectedChat.isGroup ? selectedChat.id : selectedChat.chatId, messageId, newText, isGroup: selectedChat.isGroup });
  // Optimistic update
  setMessages(prev => prev.map(m => m.id === messageId ? { ...m, text: newText, is_edited: true, translations: {} } : m));
  setEditingMessage(null);
  };

  // Typing with nickname and stop event after idle
  // Use refs to avoid stale closure issues with selectedChat and socket
  const socketRef = useRef(socket);
  useEffect(() => { socketRef.current = socket; }, [socket]);

  const typingTimerRef = useRef(null);
  const handleTyping = useCallback(() => {
  try {
  const s = socketRef.current;
  const chat = selectedChatRef.current;
  if (!s || !chat) return;
  const nickname = (user && (user.full_name || user.username)) || localStorage.getItem('username') || 'Someone';
  const targetId = chat.isGroup ? chat.id : chat.id; // For 1v1, chat.id IS the partner userId
  s.emit('typing', { to: targetId, isGroup: chat.isGroup, nickname });
  if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
  typingTimerRef.current = setTimeout(() => {
  s.emit('stop-typing', { to: targetId, isGroup: chat.isGroup, nickname });
  typingTimerRef.current = null;
  }, 1500);
  } catch (e) {
  console.error('[ERROR] handleTyping failed', e);
  }
  }, [user]);

  const onDeleteMessage = async (messageId) => {
  try {
  const res = await fetch(`${API_BASE_URL}/api/chats/messages/delete`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
  chatId: selectedChat.isGroup ? selectedChat.id : selectedChat.chatId,
  messageId,
  isGroup: selectedChat.isGroup,
  userId: localStorage.getItem('userId')
  })
  });
  if (res.ok) {
  setMessages(prev => prev.filter(m => m.id !== messageId));
  } else {
  const data = await res.json();
  Lexum.alert({ title: 'Error', message: data.error || 'Failed to delete message' });
  }
  } catch (e) {
  Lexum.alert({ title: 'Error', message: 'Failed to delete message' });
  }
  };

  const onUploadAvatar = async (id, fileOrUrl, isGroup) => {
  let url = fileOrUrl;
  const userId = localStorage.getItem('userId');

  // If it's a File or Blob, upload it first
  if (fileOrUrl instanceof File || fileOrUrl instanceof Blob) {
  try {
  const formData = new FormData();
  formData.append('file', fileOrUrl);
  formData.append('type', 'image');
  const uploadRes = await fetch(`${API_BASE_URL}/api/upload`, { method: 'POST', body: formData });
  const uploadData = await uploadRes.json();
  if (!uploadRes.ok) throw new Error(uploadData.error || 'Upload failed');
  url = uploadData.url;
  } catch (err) {
  Lexum.alert({ title: 'Error', message: 'Image upload failed' });
  return;
  }
  }

  const endpoint = isGroup ? `${API_BASE_URL}/api/groups/${id}/avatar` : `${API_BASE_URL}/api/user/avatar`;
  try {
  const res = await fetch(endpoint, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ avatar_url: url, userId })
  });
  if (res.ok) {
  if (isGroup) {
  loadGroups(userId);
  if (selectedChat?.isGroup && selectedChat.id === id) setSelectedChat(prev => ({ ...prev, avatar_url: url }));
  if (viewProfile?.isGroup && viewProfile.id === id) setViewProfile(prev => ({ ...prev, avatar_url: url }));
  } else {
  setUser(prev => ({ ...prev, avatar_url: url }));
  loadContacts(userId);
  if (viewProfile && !viewProfile.isGroup && String(viewProfile.id) === String(id)) {
  setViewProfile(prev => ({ ...prev, avatar_url: url }));
  }
  }
  Lexum.alert({ title: 'Success', message: 'Avatar updated' });
  } else {
  throw new Error('Failed to update avatar');
  }
  } catch (e) {
  Lexum.alert({ title: 'Error', message: 'Failed to update avatar' });
  }
  };


  const onSaveGroupName = async (id, name) => {
  try {
  const res = await fetch(`${API_BASE_URL}/api/groups/${id}/name`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ name, userId: localStorage.getItem('userId') })
  });
  if (res.ok) {
  loadGroups(localStorage.getItem('userId'));
  Lexum.alert({ title: 'Success', message: 'Group name updated' });
  } else {
  throw new Error('Failed to update group name');
  }
  } catch (e) {
  Lexum.alert({ title: 'Error', message: 'Failed to update group name' });
  }
  };

  const onSaveSettings = async (id, settings) => {
  const userId = localStorage.getItem('userId');
  try {
  const res = await fetch(`${API_BASE_URL}/api/groups/${id}/settings`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ settings, userId })
  });
  if (res.ok) {
  // Update local state
  setGroups(prev => prev.map(g => g.id === id ? { ...g, settings: { ...g.settings, ...settings } } : g));
  if (selectedChat?.isGroup && selectedChat.id === id) {
  setSelectedChat(prev => ({ ...prev, settings: { ...prev.settings, ...settings } }));
  }
  if (viewProfile?.isGroup && viewProfile.id === id) {
  setViewProfile(prev => ({ ...prev, settings: { ...prev.settings, ...settings } }));
  }
  Lexum.alert({ title: 'Success', message: 'Settings updated' });
  } else {
  const data = await res.json();
  Lexum.alert({ title: 'Error', message: data.error || 'Failed to save settings' });
  }
  } catch (error) {
  Lexum.alert({ title: 'Error', message: 'Network error. Please try again.' });
  }
  };

  const onSaveChatSettings = async (id, settings) => {
  const userId = localStorage.getItem('userId');
  try {
  const res = await fetch(`${API_BASE_URL}/api/chats/${id}/settings`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ settings, userId })
  });
  if (res.ok) {
  // Update local state
  setContacts(prev => prev.map(c => c.chatId === id ? { ...c, settings: { ...c.settings, ...settings } } : c));
  if (!selectedChat?.isGroup && selectedChat?.chatId === id) {
  setSelectedChat(prev => ({ ...prev, settings: { ...prev.settings, ...settings } }));
  }
  Lexum.alert({ title: 'Success', message: 'Chat settings updated' });
  } else {
  const data = await res.json();
  Lexum.alert({ title: 'Error', message: data.error || 'Failed to update settings' });
  }
  } catch (e) {
  Lexum.alert({ title: 'Error', message: 'Failed to update settings' });
  }
  };

  const handleContextMenu = (e, chat) => {
  e.preventDefault();
  setContextMenu({
  position: { x: e.pageX, y: e.pageY },
  options: [
  { label: chat.archived ? 'Unarchive' : 'Archive', icon: Icons.archive, onClick: () => chat.archived ? unarchiveChat(chat) : archiveChat(chat) },
  { label: 'Delete', icon: Icons.trash, danger: true, onClick: () => deleteChat(chat.id, false, chat.isGroup) },
  ]
  });
  };

  const statusText = selectedChat?.isGroup ? '' : (selectedChat?.statusText || (selectedChat?.online ? 'Active' : 'Offline'));

  const handleTabChange = (tabId) => {
  setActiveTab(tabId);
  if (tabId === 'settings') setShowSettings(true);
  if (tabId === 'chats' && isMobile()) setSelectedChat(null);
  };

  useEffect(() => {
  const handleOpenStatus = (e) => {
  const statusId = e.detail;
  const status = statuses.find(s => s.id === statusId);
  if (status) {
  setViewerTarget(status.user_id);
  } else {
  Lexum.alert({ title: 'Status Expired', message: 'This status is no longer available.' });
  }
  };
  const handleOpenAddContact = (e) => {
  const phone = e.detail;
  setPhoneInput(phone);
  setShowAddContact(true);
  };
  window.addEventListener('open-status', handleOpenStatus);
  window.addEventListener('open-add-contact', handleOpenAddContact);
  return () => {
  window.removeEventListener('open-status', handleOpenStatus);
  window.removeEventListener('open-add-contact', handleOpenAddContact);
  };
  }, [statuses]);

  const handleRemoveMember = async (groupId, targetMemberId) => {
  if (!confirm('Are you sure you want to remove this member?')) return;
  try {
  const res = await fetch(`${API_BASE_URL}/api/groups/${groupId}/remove-member`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ userId: user.id, targetMemberId })
  });
  if (res.ok) {
  loadGroups(user.id);
  if (viewProfile?.id === groupId) {
  setGroups(prev => prev.map(g => {
  if (g.id === groupId) {
  const updatedMembers = g.members.filter(m => m.user_id !== targetMemberId);
  return { ...g, members: updatedMembers, members_ids: updatedMembers.map(m => m.user_id) };
  }
  return g;
  }));
  setViewProfile(prev => {
  const updatedMembers = prev.members.filter(m => m.user_id !== targetMemberId);
  return { ...prev, members: updatedMembers, members_ids: updatedMembers.map(m => m.user_id) };
  });
  }
  Lexum.alert({ title: 'Success', message: 'Member removed' });
  } else {
  const data = await res.json();
  throw new Error(data.error || 'Failed to remove member');
  }
  } catch (e) {
  Lexum.alert({ title: 'Error', message: e.message });
  }
  };

  const handlePromoteAdmin = async (groupId, targetMemberId) => {
  try {
  const res = await fetch(`${API_BASE_URL}/api/groups/${groupId}/promote-admin`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ userId: user.id, targetMemberId })
  });
  if (res.ok) {
  loadGroups(user.id);
  Lexum.alert({ title: 'Success', message: 'Member promoted to Admin' });
  } else {
  const data = await res.json();
  throw new Error(data.error || 'Failed to promote admin');
  }
  } catch (e) {
  Lexum.alert({ title: 'Error', message: e.message });
  }
  };

  const handleDemoteAdmin = async (groupId, targetMemberId) => {
  try {
  const res = await fetch(`${API_BASE_URL}/api/groups/${groupId}/demote-admin`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ userId: user.id, targetMemberId })
  });
  if (res.ok) {
  loadGroups(user.id);
  Lexum.alert({ title: 'Success', message: 'Member demoted from Admin' });
  } else {
  const data = await res.json();
  throw new Error(data.error || 'Failed to demote admin');
  }
  } catch (e) {
  Lexum.alert({ title: 'Error', message: e.message });
  }
  };

  if (!user) return <div className="flex h-screen items-center justify-center bg-[#f0f2f5] "><div className="w-16 h-16 border-4 border-green-500 border-t-transparent rounded-full animate-spin"></div></div>;

  const handleProfileAction = (action, data) => {
  if (action === 'message') {
  setSelectedChat(data);
  setViewProfile(null);
  } else if (action === 'delete') {
  deleteChat(data.id, false, data.isGroup);
  setViewProfile(null);
  } else if (action === 'leave') {
  // Admin leaves = delete group for all; non-admin = just leave
  deleteChat(data.id, false, true);
  setViewProfile(null);
  setShowChatInfo(false);
  } else if (action === 'viewMember') {
  const member = selectedChat.members?.find(m => m.user_id === data);
  if (member) setViewProfile({ ...member, id: member.user_id, name: member.nickname || member.real_name });
  } else if (action === 'removeMember') {
  handleRemoveMember(selectedChat.isGroup ? selectedChat.id : selectedChat.id, data);
  } else if (action === 'promoteAdmin') {
  handlePromoteAdmin(selectedChat.id, data);
  } else if (action === 'demoteAdmin') {
  handleDemoteAdmin(selectedChat.id, data);
  } else if (action === 'addMembers') {
  setShowAddMembers(data);
  } else if (action === 'setBackground') {
  const bgs = { ...chatBgs };
  if (data.bgUrl) bgs[data.id] = data.bgUrl;
  else delete bgs[data.id];
  setChatBgs(bgs);
  localStorage.setItem('louda:chatBgs', JSON.stringify(bgs));
  }
  };

  const closeSettings = () => {
  setShowSettings(false);
  setActiveTab(prev => prev === 'settings' ? 'chats' : prev);
  };


  return (
  <div className="h-screen bg-[#f0f2f5]  flex flex-col overflow-hidden">
  {textmobMode && textmobUser && (
  <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-[#fbf9f6] ">
  {(!isInIframe || textmobUser.external) ? (
  <div className="w-full max-w-md bg-white  border border-black/10  rounded-[32px] p-10 flex flex-col items-center text-center animate-fade-in">
  <div className="flex items-center gap-4 mb-10">
  <div className="w-16 h-16 rounded-2xl flex items-center justify-center p-1">
  <div className="w-full h-full rounded-2xl bg-blue-600 text-white flex items-center justify-center"><svg viewBox="0 0 24 24" className="w-1/2 h-1/2" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg></div>
  </div>
  <div className="text-2xl font-black text-gray-400">×</div>
  <div className="w-16 h-16 rounded-2xl flex items-center justify-center p-1">
  <img src="https://res.cloudinary.com/dtln8gnxh/image/upload/v1789326672/profile-pictures/hjpbzboieesk1jfb6jrh.png" alt="Textmob" className="w-full h-full object-contain" />
  </div>
  </div>

  <h2 className="text-3xl font-black text-gray-800  uppercase tracking-tighter mb-4 italic">
  Official Partner
  </h2>

  <p className="text-base text-gray-600  font-medium leading-relaxed mb-8">
  {(!isInIframe)
  ? "Textmob has officially partnered with Textmob! To use your Textmob account, please access Textmob directly from the Textmob platform."
  : "To sync your Textmob identity with your current session, you must accept the synchronization request."
  }
  </p>

  <div className="w-full h-px bg-gradient-to-r from-transparent via-black/5  to-transparent mb-8" />

  <div className="flex flex-col gap-3 w-full">
  {isInIframe && textmobUser.external && (
  <button
  onClick={() => setTextmobUser(prev => ({ ...prev, external: false }))}
  className="w-full bg-[#E64A19] hover:bg-[#D84315] text-white py-4 rounded-2xl font-black uppercase tracking-widest text-xs active:scale-95 transition-all"
  >
  Back to Sync
  </button>
  )}
  </div>
  </div>
  ) : (
  <div className="w-full max-w-md bg-white  border border-black/10  rounded-[32px] p-8 flex flex-col items-center animate-fade-in">
  <div className="flex items-center gap-4 mb-8">
  <div className="w-14 h-14 rounded-2xl flex items-center justify-center p-1">
  <div className="w-full h-full rounded-2xl bg-blue-600 text-white flex items-center justify-center"><svg viewBox="0 0 24 24" className="w-1/2 h-1/2" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg></div>
  </div>
  <div className="text-xl font-black text-gray-300">×</div>
  <div className="w-14 h-14 rounded-2xl flex items-center justify-center p-1">
  <img src="https://res.cloudinary.com/dtln8gnxh/image/upload/v1789326672/profile-pictures/hjpbzboieesk1jfb6jrh.png" alt="Textmob" className="w-full h-full object-contain" />
  </div>
  </div>

  <h2 className="text-2xl font-black text-center text-gray-800  uppercase tracking-tight mb-2 italic">
  Sync Account
  </h2>
  <p className="text-sm text-gray-500  text-center mb-8 font-medium">
  Sync your <b>Textmob</b> session with your <b>Textmob</b> identity (@{textmobUser.username})?
  </p>

  <div className="w-full space-y-6">
  <div className="bg-gray-50  p-4 rounded-2xl border border-black/5 ">
  <div className="flex items-center gap-3 mb-4">
  <img src={textmobUser.profile_pic || DEFAULT_AVATAR} className="w-10 h-10 rounded-full object-cover ring-2 ring-blue-500/20" />
  <div>
  <div className="text-sm font-black text-gray-800 ">{textmobUser.full_name || textmobUser.username}</div>
  <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">@{textmobUser.username}</div>
  </div>
  </div>

  <PhoneInput
  label="Review Phone Number"
  value={phoneToVerify}
  onChange={setPhoneToVerify}
  error={phoneToVerify && !phoneToVerify.startsWith('+234') ? 'Must be +234 format' : ''}
  />
  <p className="text-[9px] text-gray-400 font-bold uppercase tracking-wider mt-1 px-1">
  Your Textmob identity will be updated to match Textmob.
  </p>
  </div>

  {syncError && (
  <div className="w-full p-3 bg-red-50  border border-red-200  rounded-xl text-red-600  text-[10px] font-bold text-center uppercase tracking-widest">
  {syncError}
  </div>
  )}

  <button
  onClick={connectTextmob}
  disabled={syncLoading || !phoneToVerify}
  className="w-full bg-[#E64A19] hover:bg-[#D84315] text-white py-4 rounded-2xl font-black uppercase tracking-widest text-xs active:scale-95 transition-all disabled:opacity-50"
  >
  {syncLoading ? 'Syncing...' : 'Accept & Sync Session'}
  </button>

  <button
  onClick={() => setTextmobUser(prev => ({ ...prev, external: true }))}
  className="w-full py-2 text-[10px] font-black text-gray-400 uppercase tracking-widest hover:text-gray-600 transition"
  >
  Cancel
  </button>
  </div>
  </div>
  )}
  </div>
  )}
  {showInstallModal && (
  <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[200] flex items-center justify-center p-4 animate-fade-in">
  <motion.div
  initial={{ scale: 0.9, opacity: 0 }}
  animate={{ scale: 1, opacity: 1 }}
  className="bg-white  rounded-2xl max-w-md w-full p-6 shadow-2xl border border-black/10  flex flex-col items-center text-center relative"
  >
  <button
  onClick={() => setShowInstallModal(false)}
  className="absolute top-4 right-4 text-gray-400 hover:text-gray-600  transition"
  title="Close"
  >
  {Icons.x}
  </button>

  <div className="w-16 h-16 rounded-2xl flex items-center justify-center p-2.5 mb-4">
  <div className="w-full h-full rounded-2xl bg-blue-600 text-white flex items-center justify-center"><svg viewBox="0 0 24 24" className="w-1/2 h-1/2" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg></div>
  </div>

  <h3 className="text-xl font-black text-gray-800  mb-2 uppercase tracking-tight">
  Install Textmob App
  </h3>

  <p className="text-sm text-gray-600  mb-6 leading-relaxed px-2">
  Install Textmob for a faster, better experience. Easily and comfortably chat more with friends and family anytime, anywhere.
  </p>

  <div className="w-full flex flex-col gap-3 mb-4">
  <button
  onClick={handleInstallClick}
  className="w-full bg-[#E64A19] hover:bg-[#D84315] text-white py-3 rounded-xl font-black uppercase tracking-wider text-xs transform active:scale-95 transition-all"
  >
  Install Now
  </button>
  <button
  onClick={() => setShowInstallModal(false)}
  className="w-full py-2 text-xs font-bold uppercase tracking-wider text-gray-500  hover:text-gray-700  transition"
  >
  Maybe Later
  </button>
  </div>

  <div className="w-full pt-4 border-t border-black/5  flex items-center justify-center">
  <label className="flex items-center gap-2 text-xs text-gray-500  cursor-pointer hover:text-gray-700  transition select-none">
  <input
  type="checkbox"
  checked={dontShowInstall}
  onChange={handleDontShowAgain}
  className="rounded border-gray-300 text-[#E64A19] focus:ring-[#E64A19] w-4 h-4 cursor-pointer"
  />
  <span>Don't show this popup again</span>
  </label>
  </div>
  </motion.div>
  </div>
  )}
  <div className="flex-1 flex overflow-hidden">
  <Sidebar
  user={user}
  activeTab={activeTab}
  onTabChange={handleTabChange}
  onProfileClick={() => setViewProfile(user)}
  totalUnreadChats={totalUnreadChats}
  totalUnreadArchived={totalUnreadArchived}
  totalUnreadStatuses={totalUnreadStatuses}
  showInstallIcon={!!deferredPrompt && (!showInstallModal || dontShowInstall)}
  onOpenInstallModal={() => setShowInstallModal(true)}
  />

  <div className="flex-1 flex overflow-hidden">
  {activeTab === 'gallery' && <MediaGalleryTab userId={user.id} onViewMedia={setMediaView} onShare={setSharePayload} />}

  {/* Chat List Strip */}
  {activeTab === 'status' && (
  <div className="flex-1 w-full h-full bg-white  z-20">
  <StatusTab
  user={user}
  contacts={contacts}
  statuses={statuses}
  Icons={Icons}
  onOpenCreator={() => setShowStatusCreator(true)}
  onOpenViewer={(id) => setViewerTarget(id)}
  onOpenCamera={() => setShowStatusCamera(true)}
  />
  </div>
  )}

  <div className={`w-full md:w-[400px] bg-white  border-r  flex flex-col ${(activeTab === 'gallery' || activeTab === 'status') ? 'hidden' : (selectedChat ? 'hidden md:flex' : 'flex')}`}>

  {chatSelectionMode ? (
  <div className="bg-[#5D4037] text-white p-4 pb-4 flex items-center gap-3 animate-slide-down shadow-sm z-30">
  <button onClick={exitChatSelection} className="p-2 rounded-full hover:bg-white/20 transition">{Icons.x}</button>
  <span className="font-bold flex-1 text-lg">{selectedChats.size} selected</span>
  <button onClick={handleBulkChatArchive} className="p-2 rounded-full hover:bg-white/20 transition" title={activeTab === 'archived' ? 'Unarchive' : 'Archive'}>
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
  <polyline points="21 8 21 21 3 21 3 8" /><rect x="1" y="3" width="22" height="5" /><line x1="10" y1="12" x2="14" y2="12" />
  </svg>
  </button>
  <button onClick={handleBulkChatDelete} className="p-2 rounded-full hover:bg-red-500/30 text-red-300 transition" title="Delete">
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
  <path d="M3 6h18" /><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6" /><path d="M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2" />
  </svg>
  </button>
  </div>
  ) : (
  <div className="p-4 flex flex-col gap-4">
  <div className="flex items-center justify-between">
  <h1 className="text-2xl font-black text-[#5D4037]  uppercase tracking-tighter flex items-center gap-2">
  {activeTab === 'chats' ? 'Messages' : activeTab === 'archived' ? 'Archived' : 'Settings'}
  {activeTab === 'chats' && totalUnreadChats > 0 && (
  <span className="bg-green-500 text-white text-sm font-bold px-2.5 py-0.5 rounded-full shadow-sm">{totalUnreadChats > 99 ? '99+' : totalUnreadChats}</span>
  )}
  {activeTab === 'archived' && totalUnreadArchived > 0 && (
  <span className="bg-green-500 text-white text-sm font-bold px-2.5 py-0.5 rounded-full shadow-sm">{totalUnreadArchived > 99 ? '99+' : totalUnreadArchived}</span>
  )}
  </h1>
  <div className="flex gap-1 items-center">
  <div className="md:hidden flex items-center gap-1">
  <div className="relative" ref={mobileMenuRef}>
  <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className={`p-2 rounded-full transition-all duration-200 ${mobileMenuOpen ? 'bg-gray-100  text-[#5D4037]' : 'text-gray-500 hover:bg-gray-100 '}`}>
  {Icons.more}
  </button>

  {/* Mobile Dropdown Menu */}
  {mobileMenuOpen && (
  <div className="fixed inset-0 bg-white  z-50 flex flex-col animate-slide-up">
  <div className="flex justify-between items-center p-4 border-b border-gray-100 ">
  <span className="text-sm font-black uppercase tracking-[0.2em] text-gray-500">Menu</span>
  <button onClick={() => setMobileMenuOpen(false)} className="w-10 h-10 rounded-full flex items-center justify-center bg-gray-100  text-gray-500 hover:text-red-500 transition-colors">
  {Icons.x}
  </button>
  </div>
  <div className="flex-1 overflow-y-auto p-4 space-y-2">
  <button onClick={() => { setViewProfile(user); setMobileMenuOpen(false); }} className="w-full p-4 flex items-center gap-4 text-base font-bold text-gray-700  bg-gray-50  rounded-2xl active:scale-[0.98] transition">
  <span className="text-[#E64A19] scale-125">{Icons.user}</span> My Profile
  </button>
  <button onClick={() => { setShowSettings(true); setMobileMenuOpen(false); }} className="w-full p-4 flex items-center gap-4 text-base font-bold text-gray-700  bg-gray-50  rounded-2xl active:scale-[0.98] transition">
  <span className="text-[#5D4037] scale-125">{Icons.settings}</span> Settings
  </button>
  <button onClick={() => { handleTabChange('archived'); setMobileMenuOpen(false); }} className="w-full p-4 flex items-center gap-4 text-base font-bold text-gray-700  bg-gray-50  rounded-2xl active:scale-[0.98] transition">
  <span className="text-[#FFB300] scale-125">{Icons.archive}</span> Archived
  </button>
  <button onClick={() => { handleTabChange('gallery'); setMobileMenuOpen(false); }} className="w-full p-4 flex items-center gap-4 text-base font-bold text-gray-700  bg-purple-50  rounded-2xl active:scale-[0.98] transition">
  <span className="text-purple-600 scale-125">{Icons.image}</span> Media Gallery
  </button>
  <button onClick={() => { Lexum.alert({ title: 'Calls', message: 'Voice and video calls coming soon!' }); setMobileMenuOpen(false); }} className="w-full p-4 flex items-center gap-4 text-base font-bold text-gray-700  bg-blue-50  rounded-2xl active:scale-[0.98] transition">
  <span className="text-blue-500 scale-125">{Icons.phone}</span> Calls
  </button>
  <div className="pt-4 pb-2">
  <span className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">Actions</span>
  </div>
  <button onClick={() => { setShowAddContact(true); setMobileMenuOpen(false); }} className="w-full p-4 flex items-center gap-4 text-base font-bold text-gray-700  bg-green-50  rounded-2xl active:scale-[0.98] transition">
  <span className="text-green-600 scale-125">{Icons.plus}</span> Add Contact
  </button>
  <button onClick={() => { setShowCreateGroup(true); setMobileMenuOpen(false); }} className="w-full p-4 flex items-center gap-4 text-base font-bold text-gray-700  bg-blue-50  rounded-2xl active:scale-[0.98] transition">
  <span className="text-blue-600 scale-125">{Icons.users}</span> Create Group
  </button>
  </div>
  </div>
  )}
  </div>
  </div>
  </div>

  {/* Desktop View Action Buttons */}
  <button onClick={() => setShowAddContact(true)} className="hidden md:block p-2 rounded-full hover:bg-gray-100  text-gray-500 transition" title="Add Contact">{Icons.plus}</button>
  <button onClick={() => setShowCreateGroup(true)} className="hidden md:block p-2 rounded-full hover:bg-gray-100  text-gray-500 transition" title="New Group">{Icons.users}</button>
  </div>

  <div className="relative">
  <div className="absolute left-3 top-1/2 -translate-y-1/2 flex items-center text-gray-400">{Icons.search}</div>
  <input
  type="search"
  placeholder="Search or start new chat"
  value={searchQuery}
  onChange={(e) => setSearchQuery(e.target.value)}
  className="w-full pl-10 pr-4 py-2.5 bg-gray-100  border-none rounded-xl text-sm focus:ring-2 ring-green-500/50 outline-none "
  />
  </div>
  </div>
  )}

  <div className="flex-1 overflow-y-auto no-scrollbar">
  {isLoadingChats ? (
  <ChatListSkeleton />
  ) : memoizedChats.filter(c => {
  if (!searchQuery) return true;
  const q = searchQuery.toLowerCase();
  return (c.name || '').toLowerCase().includes(q) || (c.lastMessageText || '').toLowerCase().includes(q);
  }).length === 0 ? (
  <div className="flex flex-col items-center justify-center h-full p-10 text-center gap-3 select-none">
  <div className="w-16 h-16 bg-gray-100  rounded-full flex items-center justify-center text-3xl opacity-40">💬</div>
  <p className="text-xs font-black uppercase tracking-widest text-gray-400">No conversations found</p>
  <p className="text-[10px] text-gray-300 ">Try a different search term</p>
  </div>
  ) : (
  memoizedChats.filter(c => {
  if (!searchQuery) return true;
  const q = searchQuery.toLowerCase();
  return (c.name || '').toLowerCase().includes(q) || (c.lastMessageText || '').toLowerCase().includes(q);
  }).map(c => (
  <ChatItem
  key={c.id}
  chat={c}
  userStatuses={!c.isGroup ? statuses.filter(s => s.user_id === c.id && new Date(s.expires_at) > new Date()) : []}
  currentUserId={user?.id}
  onAvatarClick={(id) => setViewerTarget(id)}
  isActive={selectedChat?.id === c.id}
  onClick={() => setSelectedChat(c)}
  onContextMenu={(e) => handleContextMenu(e, c)}
  isGroup={c.isGroup}
  selectionMode={chatSelectionMode}
  isSelected={selectedChats.has(c.id)}
  onSelect={toggleChatSelect}
  isTyping={!!typingRegistry[c.id]}
  typingText={typingRegistry[c.id]?.length === 1 ? (c.isGroup ? `${typingRegistry[c.id][0]} is typing...` : 'Typing...') : (typingRegistry[c.id]?.length > 1 ? `${typingRegistry[c.id]?.length} people typing...` : '')}
  />
  ))
  )}
  </div>
  </div>

  {/* Chat Window */}
  <div
  className={`flex-1 flex flex-col bg-[#efeae2]  relative bg-cover bg-center ${activeTab === 'gallery' ? 'hidden' : (selectedChat ? 'flex' : 'hidden md:flex')}`}
  style={selectedChat && chatBgs[selectedChat.id] ? { backgroundImage: `url("${chatBgs[selectedChat.id]}")` } : {}}
  >
  {selectedChat ? (
  <>
  <ChatHeader
  chat={selectedChat}
  hasUnviewedStatus={!selectedChat.isGroup && statuses.some(s => s.user_id === (selectedChat.chatId ? selectedChat.id : selectedChat.id) && new Date(s.expires_at) > new Date() && (!s.views || !s.views.some(v => v.user_id === user.id)))}
  isTyping={!!typingRegistry[selectedChat.id]}
  statusText={(() => {
  if (selectedChat.isGroup) return '';
  if (selectedChat.is_system === 'ai') return 'Online';
  const c = contacts.find(contact => contact.id === (selectedChat.chatId ? selectedChat.id : selectedChat.id));
  if (c) return c.statusText;
  return selectedChat.statusText || (selectedChat.online ? 'Online' : (selectedChat.last_seen ? 'Last seen ' + formatTimeAgo(selectedChat.last_seen) : 'Offline'));
  })()}
  isOnline={(() => {
  if (selectedChat.isGroup) return false;
  if (selectedChat.is_system === 'ai') return true;
  const c = contacts.find(contact => contact.id === (selectedChat.chatId ? selectedChat.id : selectedChat.id));
  return c ? c.online : selectedChat.online;
  })()}
  onBack={isMobile() ? () => setSelectedChat(null) : null}
  onOpenSettings={() => setShowSettings(true)}
  onOpenArchived={() => { setActiveTab('archived'); if (isMobile()) setSelectedChat(null); }}
  onShowChatInfo={() => setShowChatInfo(true)}
  isGroup={selectedChat.isGroup}
  onViewProfile={handleViewProfile}
  onSearchClick={() => setShowChatSearch(!showChatSearch)}
  />

  {/* Connection State Banner */}
  {connectionState !== 'connected' && (
  <div className={`px-4 py-2 text-xs font-bold text-center flex items-center justify-center gap-2 ${connectionState === 'disconnected' ? 'bg-red-500/10 text-red-600' : 'bg-amber-500/10 text-amber-600'}`}>
  {connectionState === 'disconnected' ? (
  <><span className="w-2 h-2 bg-red-500 rounded-full"></span> Connection lost. Waiting to reconnect...</>
  ) : (
  <><span className="w-3 h-3 border-2 border-amber-500 border-t-transparent rounded-full animate-spin"></span> Reconnecting...</>
  )}
  </div>
  )}

  {/* Pinned message banner */}
  {messages.some(m => m.is_pinned) && (
  <div className="bg-amber-50  border-b border-amber-100  px-4 py-2 flex items-center gap-2 cursor-pointer hover:bg-amber-100/50 transition text-amber-700 "
  onClick={() => {
  const pinned = messages.find(m => m.is_pinned);
  if (pinned) {
  const el = document.getElementById(`msg-${pinned.id}`);
  if (el) { el.scrollIntoView({ behavior: 'smooth', block: 'center' }); el.classList.add('flash-highlight'); setTimeout(() => el.classList.remove('flash-highlight'), 2000); }
  }
  }}>
  <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="currentColor" stroke="none"><path d="M16 12V4h1V2H7v2h1v8l-2 2v2h5.2v6h1.6v-6H18v-2z" /></svg>
  <span className="text-[11px] font-bold truncate flex-1">
  {messages.find(m => m.is_pinned)?.text?.slice(0, 60) || 'Pinned message'}
  </span>
  <span className="text-[9px] opacity-60 uppercase tracking-wider font-black">Pinned</span>
  </div>
  )}

  {/* In-Chat Search */}
  {showChatSearch && (selectedChat.isGroup ? selectedChat.id : selectedChat.chatId) && (
  <InChatSearch
  chatId={selectedChat.isGroup ? selectedChat.id : selectedChat.chatId}
  isGroup={selectedChat.isGroup}
  onClose={() => setShowChatSearch(false)}
  onJumpToMessage={(msgId) => {
  const el = document.getElementById(`msg-${msgId}`);
  if (el) {
  el.scrollIntoView({ behavior: 'smooth', block: 'center' });
  el.classList.add('flash-highlight');
  setTimeout(() => el.classList.remove('flash-highlight'), 2000);
  }
  }}
  />
  )}

  <ChatMessages
  messages={messages.filter(m => !blockedUsers.includes(String(m.from)))}
  members={selectedChat.members}
  membersMap={selectedChat.membersMap}
  userId={user.id}
  isGroup={selectedChat.isGroup}
  isAdmin={selectedChat.admin_id === user.id}
  chatId={selectedChat.isGroup ? selectedChat.id : selectedChat.chatId}
  onDeleteMessage={onDeleteMessage}
  typingUsers={typingRegistry[selectedChat.id]}
  onReply={setReplyTo}
  lazyLoadEnabled={user.preferences?.media?.lazy_load_images}
  onLoadMore={handleLoadMore}
  hasMore={hasMoreMessages}
  translations={translations}
  onTranslate={handleTranslate}
  userVoice={userVoice}
  onViewInfo={handleViewInfo}
  onViewProfile={(uid, viewState = 'main') => {
  const c = contacts.find(contact => contact.id === uid);
  if (c) setViewProfile({ ...c, initialViewState: viewState });
  else {
  setViewProfile({ id: uid, name: 'User ' + uid, initialViewState: viewState });
  }
  }}

  onViewMedia={setMediaView}
  onForward={handleForwardInitiate}
  chatName={selectedChat.name}
  userName={user.full_name || user.username}
  user={user}
  socket={socket}
  onEdit={setEditingMessage}
  />
  {selectedChat.isGroup && selectedChat.settings?.admin_only && String(selectedChat.admin_id) !== String(user.id) ? (
  <div className="p-4 bg-gray-100  text-center text-sm font-bold text-gray-500 border-t ">
  Only admins can send messages in this group.
  </div>
  ) : (
  <ChatInput
  onSend={handleSend}
  onTyping={handleTyping}
  userId={localStorage.getItem('userId')}
  chatId={selectedChat.isGroup ? selectedChat.id : selectedChat.chatId}
  isGroup={selectedChat.isGroup}
  replyTo={replyTo}
  onCancelReply={() => setReplyTo(null)}
  editingMessage={editingMessage}
  onCancelEdit={() => setEditingMessage(null)}
  onEdit={handleEditMessage}
  />
  )}
  </>
  ) : (
  <div className="flex-1 flex flex-col items-center justify-center text-center p-10 bg-warm-bg  border-l ">
  <div style={{ borderRadius: '20px' }} className="w-64 h-64 mb-8 opacity-40">
  <div className="w-full h-full flex items-center justify-center" style={{ borderRadius: '20px', background: '#2563eb' }}>
  <svg viewBox="0 0 24 24" style={{ width: '30%', height: '30%' }} fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg>
  </div>
  </div>
                <h2 className="text-3xl font-black text-[#5D4037]  uppercase tracking-tighter mb-2">Messaging</h2>
  <div className="absolute bottom-10 flex items-center gap-2 text-[#E64A19] text-xs uppercase tracking-widest font-black">
  END-TO-END ENCRYPTION
  </div>
  </div>
  )}
  </div>
  </div>

  {
  messageInfo && (
  <MessageInfoModal
  message={messageInfo}
  onClose={() => setMessageInfo(null)}
  userVoice={userVoice}
  userLang={userLang}
  />
  )
  }

  {
  showAddContact && (
  <Modal isOpen={showAddContact} onClose={() => { setShowAddContact(false); setTempContact(null); setTmSearchMode(false); }} title={!tempContact ? (tmSearchMode ? 'Search Textmob' : 'Add Contact') : 'Confirm Contact'}>
  {!tempContact ? (
  <div className="flex flex-col gap-4">
  {/* Toggle Mode */}
  <div className="flex border border-black/5  rounded-xl overflow-hidden w-full p-0.5 bg-gray-50 ">
  <button
  onClick={() => setTmSearchMode(false)}
  className={`flex-1 py-2 text-[10px] font-black uppercase tracking-wider rounded-lg transition ${!tmSearchMode
  ? 'bg-[var(--safari-green)] text-white'
  : 'text-gray-400 hover:text-gray-600 '
  }`}
  >
  Search by Phone
  </button>
  <button
  onClick={() => setTmSearchMode(true)}
  className={`flex-1 py-2 text-[10px] font-black uppercase tracking-wider rounded-lg transition ${tmSearchMode
  ? 'bg-[var(--safari-green)] text-white'
  : 'text-gray-400 hover:text-gray-600 '
  }`}
  >
  Search Textmob
  </button>
  </div>

  {!tmSearchMode ? (
  <>
  <PhoneInput
  label="Phone Number"
  value={phoneInput}
  onChange={(val) => setPhoneInput(val)}
  />
  <div className="flex gap-2">
  <Button onClick={() => setShowAddContact(false)} variant="secondary" className="flex-1">Cancel</Button>
  <Button onClick={findUserByPhone} variant="primary" className="flex-1">Next</Button>
  </div>
  </>
  ) : (
  <>
  <div className="relative">
  <div className="absolute left-3 top-1/2 -translate-y-1/2 flex items-center text-gray-400">{Icons.search}</div>
  <input
  type="text"
  placeholder="Search username or name..."
  value={tmSearchQuery}
  onChange={(e) => {
  setTmSearchQuery(e.target.value);
  if (e.target.value.length >= 2) {
  setIsSearchingTm(true);
  fetch(`${API_BASE_URL}/api/textmob/search?query=${encodeURIComponent(e.target.value)}`)
  .then(res => res.json())
  .then(data => {
  setTmSearchResults(data.users || []);
  setIsSearchingTm(false);
  })
  .catch(() => setIsSearchingTm(false));
  } else {
  setTmSearchResults([]);
  }
  }}
  className="w-full pl-10 pr-4 py-3 bg-gray-50  border border-gray-100  rounded-xl text-sm focus:ring-2 ring-[var(--safari-green)]/30 outline-none "
  />
  </div>

  <div className="space-y-2 max-h-[350px] overflow-y-auto no-scrollbar py-2">
  {isSearchingTm ? (
  <div className="flex justify-center py-10">
  <div className="w-8 h-8 border-2 border-[var(--safari-green)] border-t-transparent rounded-full animate-spin"></div>
  </div>
  ) : tmSearchResults.length > 0 ? (
  tmSearchResults.map(u => (
  <div 
  key={u.username} 
  onClick={() => setTempContact({ 
  id: u.username, 
  name: u.fullname || u.username, 
  number: u.phone, 
  avatar_url: u.avatar_url,
  isTextmob: true 
  })}
  className="flex items-center gap-3 p-3 bg-gray-50  rounded-2xl border border-transparent hover:border-[var(--safari-green)]/20 transition cursor-pointer"
  >
  <img src={u.avatar_url || DEFAULT_AVATAR} className="w-10 h-10 rounded-full object-cover shadow-sm" />
  <div className="flex-1 min-w-0">
  <div className="font-bold text-sm text-gray-800  truncate">{u.fullname || u.username}</div>
  <div className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">@{u.username}</div>
  </div>
  <div className="px-2 py-1 bg-blue-50  text-blue-600  text-[8px] font-black uppercase rounded-lg">Textmob</div>
  </div>
  ))
  ) : tmSearchQuery.length >= 2 ? (
  <div className="text-center py-10 text-gray-400 text-xs font-bold uppercase tracking-widest">No users found</div>
  ) : (
  <div className="text-center py-10 text-gray-400 text-[10px] font-bold uppercase tracking-widest leading-relaxed">
  Search for Textmob users<br />to add them to Messaging
  </div>
  )}
  </div>

  <Button onClick={() => { setShowAddContact(false); setTmSearchMode(false); }} variant="secondary" className="w-full">Cancel</Button>
  </>
  )}
  </div>
  ) : (
  <>
  <div className="text-center mb-6">
  <div className="relative inline-block">
  <img src={tempContact.avatar_url || DEFAULT_AVATAR} className="w-20 h-20 rounded-full mx-auto mb-4 object-cover border-4 border-white  shadow-lg" alt="" />
  {tempContact.isTextmob && (
  <div className="absolute -bottom-1 -right-1 w-7 h-7 bg-blue-600 rounded-full flex items-center justify-center border-2 border-white  shadow-sm" title="Textmob Account">
  <img src="https://res.cloudinary.com/dtln8gnxh/image/upload/v1789326672/profile-pictures/hjpbzboieesk1jfb6jrh.png" className="w-4 h-4 object-contain invert brightness-0" />
  </div>
  )}
  </div>
  <p className="font-black text-xl text-gray-800  tracking-tight">{tempContact.name}</p>
  <p className="text-gray-400 text-xs font-bold uppercase tracking-widest mt-1">{tempContact.number}</p>
  </div>
  
  <div className="mb-6">
  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 block px-1">Nickname (Optional)</label>
  <input
  type="text"
  placeholder="e.g. Best Friend"
  value={tempContact.customName || tempContact.name}
  onChange={e => setTempContact({ ...tempContact, customName: e.target.value })}
  className="w-full bg-gray-50  border border-black/5  rounded-xl p-4 font-bold text-gray-700  focus:ring-2 focus:ring-[var(--safari-green)] outline-none transition"
  />
  </div>

  <div className="flex gap-3">
  <Button onClick={() => setTempContact(null)} variant="secondary" className="flex-1 py-4">Back</Button>
  <Button onClick={confirmAddContact} variant="primary" className="flex-1 py-4">Add Contact</Button>
  </div>
  </>
  )}
  </Modal>
  )
  }

  {
  showCreateGroup && (
  <CreateGroupModal onClose={() => setShowCreateGroup(false)} onCreate={createGroup} contacts={contacts} />
  )
  }

  {
  showAddMembers && (
  <AddMembersModal group={showAddMembers} onClose={() => setShowAddMembers(null)} onAdd={addGroupMembers} contacts={contacts} />
  )
  }

  {
  showChatInfo && selectedChat && (
  <UnifiedProfileView
  key={selectedChat.id}
  chat={selectedChat}

  user={user}
  messages={messages}
  onClose={() => setShowChatInfo(false)}
  onAction={handleProfileAction}
  onUpdateField={handleUpdateField}
  onUploadAvatar={onUploadAvatar}
  contacts={contacts}
  groups={groups}
  isBlocked={blockedUsers.includes(String(selectedChat?.id))}
  onToggleBlock={toggleBlockUser}
  />
  )
  }

  {
  viewProfile && (
  <UnifiedProfileView
  key={viewProfile.id}
  chat={viewProfile}

  user={user}
  messages={viewProfile.id === selectedChat?.id ? messages : []}
  onClose={() => setViewProfile(null)}
  onAction={handleProfileAction}
  onUpdateField={handleUpdateField}
  onUploadAvatar={onUploadAvatar}
  contacts={contacts}
  groups={groups}
  isBlocked={blockedUsers.includes(String(viewProfile.id))}
  onToggleBlock={toggleBlockUser}
  initialViewState={viewProfile.initialViewState}
  />

  )
  }

  {showSettings && (
  <SettingsScreen
  user={user}
  onSave={handleSave}
  onClose={closeSettings}
  blockedUsers={blockedUsers}
  onToggleBlock={toggleBlockUser}
  contacts={contacts}
  onUpdateProfile={handleUpdateProfile}
  onUploadAvatar={onUploadAvatar}
  />
  )}


  {forwardPayload && (
  <ForwardModal
  isOpen={!!forwardPayload}
  onClose={() => setForwardPayload(null)}
  chats={memoizedChats}
  onForward={handleConfirmForward}
  />
  )}
  {sharePayload && (
  <ForwardModal
  isOpen={!!sharePayload}
  onClose={() => setSharePayload(null)}
  chats={memoizedChats}
  onForward={handleConfirmShareMedia}
  />
  )}
  {
  mediaView && (
  <MediaViewer
  src={mediaView.src}
  type={mediaView.type}
  messages={messages}
  explicitMediaList={mediaView.mediaList}
  onClose={() => setMediaView(null)}
  onForwardMedia={(payload) => {
  setForwardPayload(payload);
  setShowForwardModal(true);
  }}
  />
  )
  }

  {
  contextMenu && (
  <ContextMenu
  position={contextMenu.position}
  options={contextMenu.options}
  onClose={() => setContextMenu(null)}
  />
  )
  }

  {/* Mobile Bottom Navigation */}
  {isMobile() && (!selectedChat || showSettings) && (
  <BottomBar
  activeTab={activeTab}
  onTabChange={handleTabChange}
  onProfileClick={() => setViewProfile(user)}
  totalUnreadChats={totalUnreadChats}
  totalUnreadStatuses={totalUnreadStatuses}
  />
  )}


  {showStatusCamera && createPortal(
  <CameraOverlay
  allowMusic={true}
  onClose={() => setShowStatusCamera(false)}
  onCapture={(result) => {
  const fileObj = result.file || result; // Backward compatible if no object
  const file = Array.isArray(fileObj) ? fileObj[0] : fileObj;
  const type = file.type.startsWith('video/') ? 'video' : 'image';
  setStatusCameraMedia({ file, type, music: result.music });
  setShowStatusCamera(false);
  setShowStatusCreator(true);
  }}
  />,
  document.body
  )}

  <AnimatePresence>
  {showStatusCreator && (
  <StatusCreator
  user={user}
  socket={socket}
  API_BASE_URL={API_BASE_URL}
  Icons={Icons}
  onClose={() => { setShowStatusCreator(false); setStatusCameraMedia(null); }}
  getOptimizedMediaUrl={getOptimizedMediaUrl}
  initialMedia={statusCameraMedia}
  onStatusPosted={loadStatuses}
  />
  )}
  {viewerTarget && (
  <StatusViewer
  user={user}
  statuses={statuses}
  targetUserId={viewerTarget}
  contacts={contacts}
  API_BASE_URL={API_BASE_URL}
  onClose={() => setViewerTarget(null)}
  Icons={Icons}
  socket={socket}
  onReply={(targetId, text, status) => {
  const contact = contacts.find(c => c.id === targetId);
  if (contact) {
  setSelectedChat(contact);
  setReplyTo({ id: status.id, text: `Status Reply: ${text}`, from: status.user_id, fromName: contact.name, quotedStatusId: status.id, quotedStatusPreview: status.type === 'text' ? status.content : 'Media' });
  }
  }}
  />
  )}
  </AnimatePresence>

  </div>
  </div>
  );
};

const DesktopHome = MobileHome;

// ─────────────────────────────────────
// Routes
// ─────────────────────────────────────
const routes = [
  { path: '/login', component: LoginScreen },
  { path: '/signup', component: SignupScreen },
  { path: '/home', responsive: { mobile: MobileHome, desktop: DesktopHome } },
  { path: '/', component: LoginScreen }
];

export { routes, MobileHome, DesktopHome, LoginScreen, SignupScreen };
