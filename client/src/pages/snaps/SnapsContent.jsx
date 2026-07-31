import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { apiFetch, API_BASE_URL } from '../../config/api';
import { cn } from '../../utils/classNames';
import Lexum from '../../router/LexumRouter';
import { VerifiedBadge } from '../../components/ui/VerifiedBadge';
import GiftCoinsModal from '../../components/ui/GiftCoinsModal';
import { useSnapUpload } from '../../utils/SnapUploadContext';
import { CATEGORIES } from '../../data/categories';

// Time formatter function fi
function fi(e) {
  if (!e) return '';
  let t = Math.floor((Date.now() - e) / 1000);
  if (t < 60) {
    return `${t}s`;
  } else if (t < 3600) {
    return `${Math.floor(t / 60)}m`;
  } else if (t < 86400) {
    return `${Math.floor(t / 3600)}h`;
  } else {
    return `${Math.floor(t / 86400)}d`;
  }
}

/* SnapText – truncated snap text with "See more" */
function SnapText({ text }) {
  var [expanded, setExpanded] = useState(false);
  var LIMIT = 150;
  var isLong = text && text.length > LIMIT;
  var display = !expanded && isLong ? text.slice(0, LIMIT) + '…' : text;
  return (
    <>
      <p
        style={{
          color: 'rgba(255,255,255,.9)',
          fontSize: 13,
          lineHeight: 1.5,
          textShadow: '0 1px 3px rgba(0,0,0,.5)'
        }}
      >
        {display}
      </p>
      {isLong && (
        <button onClick={function (e) { e.stopPropagation(); setExpanded(!expanded); }} style={{
          background: 'none',
          border: 'none',
          color: 'rgba(255,255,255,.7)',
          fontSize: 12,
          fontWeight: 600,
          cursor: 'pointer',
          padding: 0,
          marginTop: 2,
          textShadow: '0 1px 3px rgba(0,0,0,.5)'
        }}>
          {expanded ? 'Show less' : 'See more'}
        </button>
      )}
    </>
  );
}

// Color encoder function mi
const pi = ['#2563eb', '#7c3aed', '#db2777', '#d97706', '#059669', '#0891b2', '#dc2626'];
function mi(e) {
  let t = 0;
  for (let n = 0; n < (e || '').length; n++) {
    t = t * 31 + e.charCodeAt(n) >>> 0;
  }
  return pi[t % pi.length];
}

// Global user profile cache to avoid repeated queries
const On = new Map();
const kn = new Map();
function An(e) {
  if (!e || e === 'undefined') {
    return {
      fullname: 'Guest',
      profile_pic: 'https://res.cloudinary.com/dzvm9xe1i/image/upload/v1746095979/profile-pictures/e2st5nispbicnhnir9cf.jpg',
      notifications: []
    };
  } else {
    return On.get(e);
  }
}
function jn(e, t) {
  if (kn.has(e)) {
    kn.get(e).forEach(cb => cb(t));
  }
}
async function Mn(e) {
  if (!!e && e !== 'undefined') {
    if (On.has(e)) {
      return On.get(e);
    }
    try {
      let t = await apiFetch(`/profile/${e}`);
      if (t.status === 404 && e === localStorage.currentUser) {
        console.error('Current user not found in database. Redirecting to auth.');
        localStorage.removeItem('currentUser');
        localStorage.removeItem('currentUserProfilePic');
        if (window.Lexum) window.Lexum.navigate('/auth');
        else window.location.href = '/auth';
        return;
      }
      if (!t.ok) {
        throw Error('Fetch failed');
      }
      let n = await t.json();
      On.set(e, n);
      jn(e, n);
      return n;
    } catch (t) {
      console.warn('Async profile fetch failed for', e, t);
      let n = {
        fullname: e,
        profile_pic: 'https://res.cloudinary.com/dzvm9xe1i/image/upload/v1746095979/profile-pictures/e2st5nispbicnhnir9cf.jpg',
        notifications: []
      };
      On.set(e, n);
      jn(e, n);
      return n;
    }
  }
}

// Hook to retrieve profile info
function Nn(e) {
  let [t, n] = useState(An(e));
  useEffect(() => {
    if (!e || e === 'undefined') {
      return;
    }
    let cached = On.get(e);
    if (cached) {
      n(cached);
      return;
    }
    let r = val => n(val);
    if (!kn.has(e)) {
      kn.set(e, new Set());
    }
    kn.get(e).add(r);
    Mn(e);
    return () => {
      let set = kn.get(e);
      if (set) {
        set.delete(r);
        if (set.size === 0) {
          kn.delete(e);
        }
      }
    };
  }, [e]);
  return t || {
    fullname: e || 'Loading...',
    profile_pic: 'https://res.cloudinary.com/dzvm9xe1i/image/upload/v1746095979/profile-pictures/e2st5nispbicnhnir9cf.jpg',
    notifications: []
  };
}

// Suggestions portal component
function SuggestionsDropdown({ items: e, onSelect: t, activeIndex: n }) {
  if (!e || e.length === 0) {
    return null;
  }
  return createPortal(
    <div className="fixed inset-0 z-[2147483647] pointer-events-none flex flex-col justify-end md:justify-start md:items-center">
      <div className="pointer-events-auto w-full md:w-[450px] md:mt-20 bg-white dark:bg-gray-900 md:bg-white/95 md:dark:bg-gray-900/95 md:backdrop-blur-xl rounded-t-[32px] md:rounded-2xl border-t md:border border-gray-100 dark:border-gray-800 shadow-[0_-10px_40px_rgba(0,0,0,0.1)] md:shadow-2xl overflow-hidden max-h-[60vh] md:max-h-[400px] flex flex-col transform transition-transform animate-in slide-in-from-bottom duration-300">
        <div className="p-4 md:p-3 space-y-0.5">
          <div className="flex justify-center mb-4 md:hidden">
            <div className="w-12 h-1.5 rounded-full bg-gray-200 dark:bg-gray-800/50" />
          </div>
          <div className="flex items-center justify-between px-3 pb-2 border-b border-gray-50 dark:border-gray-800 mb-2">
            <p className="text-[10px] font-black uppercase tracking-[0.25em] text-blue-600 dark:text-blue-400">Suggestions</p>
            <span className="text-[9px] text-gray-400 uppercase font-black tracking-widest hidden md:block">{e.length} MATCHES</span>
          </div>
          <div className="space-y-1 overflow-y-auto pr-1">
            {e.map((item, index) => {
              let isSelected = index === n;
              let isUser = item.type === 'user';
              let symbol = isUser ? '@' : item.type === 'phrase' ? '»' : '#';
              return (
                <div
                  onMouseDown={evt => {
                    evt.preventDefault();
                    t(item);
                  }}
                  className={cn(
                    "flex items-center gap-3 px-4 py-3 md:py-2.5 rounded-xl cursor-pointer transition-all duration-200 group",
                    isSelected
                      ? "bg-blue-600 text-white shadow-lg shadow-blue-600/20"
                      : "hover:bg-gray-50 dark:hover:bg-gray-800/60 text-gray-800 dark:text-gray-200"
                  )}
                  key={isUser ? `user-${item.username}-${index}` : `term-${item.query || index}-${index}`}
                >
                  <div
                    className={cn(
                      "w-10 h-10 md:w-8 md:h-8 rounded-full flex items-center justify-center font-bold flex-shrink-0 text-sm overflow-hidden",
                      isSelected ? "bg-white/20 text-white" : "bg-gray-100 dark:bg-gray-800/80 text-gray-400 dark:text-gray-500"
                    )}
                  >
                    {isUser && item.profile_pic ? (
                      <img src={item.profile_pic} className="w-full h-full object-cover" alt="" />
                    ) : (
                      symbol
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold truncate">{isUser ? `@${item.username}` : (item.query || '').replace(/^[#@]/, '')}</p>
                    {isUser && item.fullname && (
                      <p className={cn("text-[10px] truncate opacity-80", isSelected ? "text-blue-100" : "text-gray-400 dark:text-gray-500")}>
                        {item.fullname}
                      </p>
                    )}
                    {!isUser && item.count > 0 && item.type === 'hashtag' && (
                      <p className={cn("text-[10px] truncate opacity-80 uppercase font-black tracking-widest", isSelected ? "text-blue-100" : "text-gray-400")}>
                        Trending topic
                      </p>
                    )}
                  </div>
                  {isSelected && (
                    <div className="px-2 py-0.5 rounded-lg bg-white/20 text-[9px] font-black uppercase tracking-widest hidden md:block">
                      Keep Typing
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}

// Hook to handle mentions and hash suggestions
function useMentions(value, inputRef) {
  let [suggestions, setSuggestions] = useState([]);
  let [activeIndex, setActiveIndex] = useState(0);
  let [queryInfo, setQueryInfo] = useState(null);

  useEffect(() => {
    if (!value || !inputRef.current) {
      setSuggestions([]);
      setQueryInfo(null);
      return;
    }
    let selStart = inputRef.current.selectionStart || 0;
    let before = value.slice(0, selStart);
    let mentionMatch = before.match(/@([\w.]*)$/);
    let hashMatch = before.match(/#([\w-]*)$/);

    if (mentionMatch && mentionMatch[1].length >= 1) {
      let q = mentionMatch[0];
      let start = selStart - q.length;
      setQueryInfo({ symbol: '@', start, end: selStart, query: q });
      let timer = setTimeout(async () => {
        try {
          let res = await apiFetch(`/search-users?q=${encodeURIComponent(mentionMatch[1])}&limit=6`);
          if (res.ok) {
            let data = await res.json();
            setSuggestions((Array.isArray(data) ? data : []).map(u => ({ type: 'user', ...u })));
            setActiveIndex(0);
          }
        } catch {}
      }, 100);
      return () => clearTimeout(timer);
    } else if (hashMatch && hashMatch[1].length >= 1) {
      let q = hashMatch[0];
      let start = selStart - q.length;
      setQueryInfo({ symbol: '#', start, end: selStart, query: q });
      let timer = setTimeout(async () => {
        try {
          let res = await apiFetch(`/search-suggest?query=${encodeURIComponent(q)}&currentUsername=${localStorage.currentUser || ''}`);
          if (res.ok) {
            setSuggestions((await res.json()) || []);
            setActiveIndex(0);
          }
        } catch {}
      }, 100);
      return () => clearTimeout(timer);
    } else {
      setSuggestions([]);
      setQueryInfo(null);
    }
  }, [value]);

  return {
    suggestions,
    setSuggestions,
    activeIndex,
    setActiveIndex,
    queryInfo,
    setQueryInfo
  };
}

// Follow Button Component
function FollowButton({ targetUsername, currentUsername, onUpdate }) {
  let [status, setStatus] = useState('loading');
  let [profileType, setProfileType] = useState('individual');
  let [loadingAction, setLoadingAction] = useState(false);

  useEffect(() => {
    if (!targetUsername || !currentUsername) {
      return;
    }
    let active = true;
    setStatus('loading');
    apiFetch(`/follow-status?from=${encodeURIComponent(currentUsername)}&to=${encodeURIComponent(targetUsername)}`)
      .then(res => res.json())
      .then(data => {
        if (active) {
          setStatus(data.status || 'not_friended');
          setProfileType((data.profileType || 'individual').toLowerCase());
        }
      })
      .catch(() => active && setStatus('not_friended'));
    return () => {
      active = false;
    };
  }, [targetUsername, currentUsername]);

  async function handleToggle() {
    if (!loadingAction && status !== 'loading') {
      setLoadingAction(true);
      try {
        let isOrg = profileType !== 'individual';
        let endpoint = isOrg ? '/follow' : '/friend';
        let action = isOrg
          ? status === 'following' ? 'unfollow' : 'follow'
          : status === 'friended' ? 'unfriend' : 'friend';
        let res = await apiFetch(endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            username: targetUsername,
            currentUsername: currentUsername,
            action: action
          })
        });
        let data = await res.json();
        if (!res.ok) {
          throw Error(data.error || 'Failed');
        }
        setStatus(data.status);
        onUpdate?.(data.status);
      } catch (err) {
        console.error('FollowButton:', err);
      } finally {
        setLoadingAction(false);
      }
    }
  }

  let label = status === 'loading'
    ? '…'
    : status === 'friended'
      ? 'Friends'
      : status === 'following'
        ? 'Following'
        : status === 'not_following'
          ? 'Follow'
          : 'Add Friend';

  return (
    <button
      onClick={handleToggle}
      disabled={loadingAction || status === 'loading'}
      className={cn(
        "text-xs font-bold px-3 py-1.5 rounded-full transition-colors active:scale-95",
        loadingAction || status === 'loading'
          ? "bg-gray-100 dark:bg-gray-800 text-gray-400 cursor-wait"
          : status === 'friended' || status === 'following'
            ? "bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-200"
            : "bg-blue-600 text-white hover:bg-blue-700"
      )}
    >
      {loadingAction ? 'Wait...' : label}
    </button>
  );
}

// Upload Snap Modal Component
function NewSnapModal({ isOpen, onClose, username, onPosted }) {
  const { startUpload, uploads } = useSnapUpload();
  let [caption, setCaption] = useState('');
  let [videoFile, setVideoFile] = useState(null);
  let [videoUrl, setVideoUrl] = useState(null);
  let [errorMsg, setErrorMsg] = useState(null);
  let [uploading, setUploading] = useState(false);
  let [progress, setProgress] = useState(0);
  let [dragActive, setDragActive] = useState(false);
  let [selectedCategory, setSelectedCategory] = useState('');
  let [step, setStep] = useState(1);
  let fileInputRef = useRef(null);
  let captionRef = useRef(null);

  // Check if there's an ongoing upload
  const currentUpload = useMemo(() => {
     return Object.values(uploads).find(u => u.status === 'uploading');
  }, [uploads]);

  useEffect(() => {
    if (currentUpload) {
      setUploading(true);
      setProgress(currentUpload.progress);
    } else {
      setUploading(false);
    }
  }, [currentUpload]);

  let {
    suggestions,
    setSuggestions,
    activeIndex,
    setActiveIndex,
    queryInfo,
    setQueryInfo
  } = useMentions(caption, captionRef);

  let handleSelectSuggestion = suggestion => {
    let inserted = suggestion.type === 'user' ? `@${suggestion.username}` : suggestion.query;
    let before = caption.slice(0, queryInfo.start);
    let after = caption.slice(queryInfo.end);
    setCaption(`${before}${inserted} ${after}`);
    setSuggestions([]);
    setQueryInfo(null);
    setTimeout(() => captionRef.current?.focus(), 10);
  };

  let handleKeyDown = e => {
    if (suggestions.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setActiveIndex(idx => (idx + 1) % suggestions.length);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setActiveIndex(idx => (idx - 1 + suggestions.length) % suggestions.length);
      } else if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault();
        handleSelectSuggestion(suggestions[activeIndex]);
      } else if (e.key === 'Escape') {
        setSuggestions([]);
        setQueryInfo(null);
      }
    }
  };

  useEffect(() => {
    if (!isOpen && !currentUpload) {
      setCaption('');
      setVideoFile(null);
      setErrorMsg(null);
      setUploading(false);
      setProgress(0);
      setStep(1);
      if (videoUrl) {
        URL.revokeObjectURL(videoUrl);
        setVideoUrl(null);
      }
    }
  }, [isOpen, currentUpload]);

  useEffect(() => {
    if (!isOpen) return;
    let escHandler = e => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', escHandler);
    return () => window.removeEventListener('keydown', escHandler);
  }, [isOpen]);

  function handleVideoFile(file) {
    if (file) {
      if (file.size > 104857600) {
        setErrorMsg('Video must be under 100 MB');
        return;
      }
      if (!file.type.startsWith('video/')) {
        setErrorMsg('Please upload a video file');
        return;
      }
      setErrorMsg(null);
      setVideoFile(file);
      setVideoUrl(URL.createObjectURL(file));
    }
  }

  async function handlePost(e) {
    e?.preventDefault();
    if (!videoFile) {
      setErrorMsg('Please attach a video first.');
      return;
    }
    setErrorMsg(null);
    
    let formData = new FormData();
    formData.append('username', username);
    formData.append('text', caption || '');
    formData.append('visibility', 'public');
    formData.append('categories', JSON.stringify(selectedCategory ? [selectedCategory] : []));
    formData.append('media', videoFile);

    try {
      setUploading(true);
      startUpload(formData, (result) => {
        onPosted?.(result);
        setVideoFile(null);
        setVideoUrl(null);
        setCaption('');
      }, (err) => {
        setErrorMsg(err.message || 'Upload failed. Try again.');
      });
      onClose();
    } catch (err) {
      setUploading(false);
      setErrorMsg(err.message || 'Upload failed. Try again.');
    }
  }

  if (!isOpen) return null;

  let radius = 17;
  let strokeDasharray = Math.PI * 2 * radius;
  let strokeDashoffset = strokeDasharray - (progress / 100) * strokeDasharray;

  return (
    <div className="fixed inset-0 z-[200] flex items-end md:items-center justify-center snap-fade">
      <div className="absolute inset-0 bg-black/70" onClick={onClose} />
      <div className="relative z-10 w-full md:max-w-lg bg-white dark:bg-gray-900 rounded-t-3xl md:rounded-3xl snap-slide md:animate-none flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex-shrink-0 flex items-center justify-between px-4 pt-4 pb-3 border-b border-gray-100 dark:border-gray-800">
          <div className="w-10">
            {step > 1 && !uploading && (
              <button
                onClick={() => setStep(s => s - 1)}
                className="w-8 h-8 rounded-full flex items-center justify-center text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              >
                <svg viewBox="0 0 24 24" className="w-4 h-4 fill-none stroke-current" strokeWidth="2.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                </svg>
              </button>
            )}
          </div>
          <div className="text-center">
            <div className="text-sm font-bold text-gray-900 dark:text-gray-100">New Snap</div>
            <div className="flex items-center justify-center gap-1 mt-1">
              {[1,2,3].map(s => (
                <div key={s} className={`h-1 rounded-full transition-all duration-300 ${s <= step ? 'bg-blue-600 w-6' : 'bg-gray-200 dark:bg-gray-700 w-4'}`} />
              ))}
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            <svg viewBox="0 0 24 24" className="w-4 h-4 fill-none stroke-current" strokeWidth="2.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="overflow-y-auto px-5 py-5 space-y-4" style={{ overscrollBehavior: 'contain' }}>
          {uploading && (
            <div className="flex items-center gap-3 px-3 py-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl">
              <svg viewBox="0 0 44 44" className="w-10 h-10 flex-shrink-0">
                <circle cx="22" cy="22" r={radius} fill="none" stroke="#e2e8f0" strokeWidth="3.5" />
                <circle
                  cx="22"
                  cy="22"
                  r={radius}
                  fill="none"
                  stroke="#2563eb"
                  strokeWidth="3.5"
                  strokeLinecap="round"
                  strokeDasharray={strokeDasharray}
                  strokeDashoffset={strokeDashoffset}
                  className="snap-progress-ring"
                />
                <text x="22" y="27" textAnchor="middle" fontSize="9" fontWeight="700" fill="#2563eb">{progress}%</text>
              </svg>
              <div>
                <p className="text-xs font-bold text-blue-700 dark:text-blue-300">Uploading your snap…</p>
                <p className="text-[11px] text-blue-500">You can close this window and browse around!</p>
              </div>
            </div>
          )}

          {errorMsg && !uploading && (
            <div className="flex items-center gap-2 px-3 py-2 bg-red-50 dark:bg-red-900/20 rounded-xl">
              <svg viewBox="0 0 24 24" className="w-4 h-4 text-red-500 flex-shrink-0 fill-none stroke-current" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
              </svg>
              <p className="text-xs text-red-600 font-semibold">{errorMsg}</p>
            </div>
          )}

          {/* Step 1: Upload Video */}
          {step === 1 && !uploading && (
            <div className="space-y-3">
              <p className="text-sm font-bold text-gray-700 dark:text-gray-300">Choose a video</p>
              {videoUrl ? (
                <div>
                  <div className="relative rounded-2xl overflow-hidden bg-black" style={{ aspectRatio: '9/16', maxHeight: 300 }}>
                    <video src={videoUrl} className="w-full h-full object-contain" playsInline muted />
                    <button
                      onClick={() => { setVideoFile(null); setVideoUrl(null); }}
                      className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/60 flex items-center justify-center text-white"
                    >
                      <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 fill-none stroke-current" strokeWidth="2.5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent px-3 py-2">
                      <p className="text-white text-xs font-semibold truncate">{videoFile?.name}</p>
                      <p className="text-white/50 text-[10px]">{videoFile ? `${(videoFile.size / 1048576).toFixed(1)} MB` : ''}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setStep(2)}
                    className="w-full mt-3 py-3 rounded-xl text-sm font-black text-white bg-blue-600 hover:bg-blue-700 active:scale-[0.98] transition-all"
                  >
                    Next
                  </button>
                </div>
              ) : (
                <div
                  onClick={() => !uploading && fileInputRef.current?.click()}
                  onDragOver={e => { e.preventDefault(); if (!uploading) setDragActive(true); }}
                  onDragLeave={() => setDragActive(false)}
                  onDrop={e => { e.preventDefault(); setDragActive(false); if (!uploading) handleVideoFile(e.dataTransfer?.files?.[0]); }}
                  className={cn(
                    "h-56 md:h-72 flex flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed cursor-pointer transition-colors",
                    dragActive
                      ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
                      : "border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 hover:border-blue-400 hover:bg-gray-100 dark:hover:bg-gray-700"
                  )}
                >
                  <input ref={fileInputRef} type="file" accept="video/*" className="hidden" onChange={e => handleVideoFile(e.target.files?.[0])} />
                  <div className="w-16 h-16 rounded-2xl bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center">
                    <svg viewBox="0 0 24 24" className="w-8 h-8 text-blue-600 fill-none stroke-current" strokeWidth="1.5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5l4.72-4.72a.75.75 0 011.28.53v11.38a.75.75 0 01-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 002.25-2.25v-9a2.25 2.25 0 00-2.25-2.25h-9A2.25 2.25 0 002.25 7.5v9a2.25 2.25 0 002.25 2.25z" />
                    </svg>
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-bold text-gray-700 dark:text-gray-300">{dragActive ? 'Drop it here' : 'Upload your video'}</p>
                    <p className="text-xs text-gray-400 mt-1">MP4 · MOV · WebM, max 100 MB</p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Step 2: Caption */}
          {step === 2 && !uploading && (
            <div className="space-y-3">
              <p className="text-sm font-bold text-gray-700 dark:text-gray-300">Add a caption</p>
              <div className="relative">
                <textarea
                  ref={captionRef}
                  value={caption}
                  onChange={e => setCaption(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Write something…"
                  rows={4}
                  maxLength={280}
                  className="w-full bg-gray-50 dark:bg-gray-800 rounded-xl px-4 py-3 text-sm text-gray-800 dark:text-gray-200 placeholder-gray-400 outline-none focus:ring-2 focus:ring-blue-200 dark:focus:ring-blue-800 transition-all resize-none"
                />
                <SuggestionsDropdown items={suggestions} onSelect={handleSelectSuggestion} activeIndex={activeIndex} />
                <p className="text-right text-[11px] text-gray-400 mt-1">{caption.length}/280</p>
              </div>
              <button
                onClick={() => setStep(3)}
                className="w-full py-3 rounded-xl text-sm font-black text-white bg-blue-600 hover:bg-blue-700 active:scale-[0.98] transition-all"
              >
                Next
              </button>
            </div>
          )}

          {/* Step 3: Category */}
          {step === 3 && !uploading && (
            <div className="space-y-3">
              <p className="text-sm font-bold text-gray-700 dark:text-gray-300">Pick a category</p>
              <p className="text-xs text-gray-400">Helps us show your snap to the right audience</p>
              <div className="flex flex-wrap gap-2">
                {CATEGORIES.map(cat => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setSelectedCategory(selectedCategory === cat.id ? '' : cat.id)}
                    className={cn(
                      "px-4 py-2 rounded-full text-xs font-bold transition-all border",
                      selectedCategory === cat.id
                        ? "bg-blue-600 text-white border-blue-600 shadow-sm"
                        : "bg-gray-50 dark:bg-gray-800 text-gray-500 dark:text-gray-400 border-gray-200 dark:border-gray-700 hover:border-blue-300"
                    )}
                  >
                    {cat.emoji} {cat.name}
                  </button>
                ))}
              </div>
              <div className="flex gap-2 pt-2">
                <button
                  onClick={() => setStep(2)}
                  className="flex-1 py-3 rounded-xl text-sm font-semibold text-gray-500 bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 active:scale-[0.98] transition-all"
                >
                  Back
                </button>
                <button
                  onClick={handlePost}
                  disabled={!videoFile}
                  className="flex-1 py-3 rounded-xl text-sm font-black text-white bg-blue-600 hover:bg-blue-700 active:scale-[0.98] transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Post Snap
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Comments Sheet Panel Component
// Comment row component for TikTok-style comments
function CommentRow({ comment, snapUsername }) {
  let profile = Nn(comment.username);
  return (
    <div
      style={{
        display: 'flex',
        gap: 10,
        marginBottom: 16,
        alignItems: 'flex-start',
        cursor: 'pointer'
      }}
      onClick={() => Lexum.navigate(`/@${comment.username}`)}
    >
      {profile?.profile_pic ? (
        <img
          src={profile.profile_pic}
          alt={comment.username}
          style={{
            width: 32,
            height: 32,
            borderRadius: '50%',
            objectFit: 'cover',
            flexShrink: 0
          }}
        />
      ) : (
        <div
          style={{
            width: 32,
            height: 32,
            borderRadius: '50%',
            background: mi(comment.username),
            flexShrink: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 11,
            fontWeight: 800,
            color: '#fff',
            letterSpacing: '.5px'
          }}
        >
          {(profile?.fullname || comment.username || '?').slice(0, 2).toUpperCase()}
        </div>
      )}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
          <span
            style={{
              color: '#fff',
              fontSize: 12,
              fontWeight: 700
            }}
          >
            {profile?.fullname || comment.username}
          </span>
          {comment.username === snapUsername && (
            <span
              style={{
                fontSize: 9,
                fontWeight: 800,
                color: '#2563eb',
                background: 'rgba(37,99,235,.2)',
                padding: '1px 5px',
                borderRadius: 4,
                letterSpacing: '.5px'
              }}
            >
              CREATOR
            </span>
          )}
          <span
            style={{
              color: 'rgba(255,255,255,.35)',
              fontSize: 11,
              marginLeft: 'auto'
            }}
          >
            {fi(comment.createdAt)}
          </span>
        </div>
        <p
          style={{
            color: 'rgba(255,255,255,.85)',
            fontSize: 13,
            marginTop: 3,
            lineHeight: 1.45
          }}
        >
          {comment.text}
        </p>
      </div>
    </div>
  );
}

function CommentsPanel({ snap, username, onClose, onAddComment }) {
  let [commentText, setCommentText] = useState('');
  let commentInputRef = useRef(null);
  let commentListRef = useRef(null);

  let {
    suggestions,
    setSuggestions,
    activeIndex,
    setActiveIndex,
    queryInfo,
    setQueryInfo
  } = useMentions(commentText, commentInputRef);

  let handleSelectSuggestion = suggestion => {
    let inserted = suggestion.type === 'user' ? `@${suggestion.username}` : suggestion.query;
    let before = commentText.slice(0, queryInfo.start);
    let after = commentText.slice(queryInfo.end);
    setCommentText(`${before}${inserted} ${after}`);
    setSuggestions([]);
    setQueryInfo(null);
    setTimeout(() => commentInputRef.current?.focus(), 10);
  };

  let handleKeyDown = e => {
    if (suggestions.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setActiveIndex(idx => (idx + 1) % suggestions.length);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setActiveIndex(idx => (idx - 1 + suggestions.length) % suggestions.length);
      } else if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault();
        handleSelectSuggestion(suggestions[activeIndex]);
      } else if (e.key === 'Escape') {
        setSuggestions([]);
        setQueryInfo(null);
      }
    } else if (e.key === 'Enter') {
      handleSubmitComment();
    }
  };

  let comments = snap?.comments || [];

  useEffect(() => {
    let t = setTimeout(() => commentInputRef.current?.focus(), 300);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    let keyHandler = e => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', keyHandler);
    return () => window.removeEventListener('keydown', keyHandler);
  }, []);

  async function handleSubmitComment() {
    let text = commentText.trim();
    if (text) {
      setCommentText('');
      onAddComment(text);
      setTimeout(() => {
        if (commentListRef.current) {
          commentListRef.current.scrollTop = commentListRef.current.scrollHeight;
        }
      }, 50);
    }
  }

  return (
    <div
      className="fixed inset-0 z-[300] flex flex-col justify-end snap-fade md:items-center md:justify-center"
      style={{ WebkitTapHighlightColor: 'transparent' }}
    >
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div
        className="relative z-10 flex flex-col snap-slide md:rounded-2xl md:max-w-lg md:max-h-[70vh] md:w-full"
        style={{
          background: '#111',
          borderRadius: '20px 20px 0 0',
          maxHeight: '75vh',
          minHeight: 320
        }}
        onClick={e => e.stopPropagation()}
      >
        <div className="flex justify-center pt-3 pb-1">
          <div
            style={{
              width: 36,
              height: 4,
              borderRadius: 9,
              background: 'rgba(255,255,255,0.2)'
            }}
          />
        </div>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '8px 16px 12px'
          }}
        >
          <p
            style={{
              color: '#fff',
              fontSize: 14,
              fontWeight: 800
            }}
          >
            {comments.length} {comments.length === 1 ? 'Comment' : 'Comments'}
          </p>
          <button
            onClick={onClose}
            style={{
              width: 28,
              height: 28,
              borderRadius: '50%',
              background: 'rgba(255,255,255,0.1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: 'none',
              cursor: 'pointer'
            }}
          >
            <svg
              viewBox="0 0 24 24"
              style={{
                width: 14,
                height: 14,
                fill: 'none',
                stroke: '#fff',
                strokeWidth: 2.5
              }}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div
          ref={commentListRef}
          className="snap-noscroll"
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '0 16px',
            paddingBottom: 8
          }}
        >
          {comments.length === 0 ? (
            <div
              style={{
                textAlign: 'center',
                padding: '40px 0',
                color: 'rgba(255,255,255,0.3)',
                fontSize: 13
              }}
            >
              No comments yet, be the first!
            </div>
          ) : (
            comments.map((comment, index) => (
              <CommentRow
                key={comment.id || index}
                comment={comment}
                snapUsername={snap?.username}
              />
            ))
          )}
        </div>
        <div
          style={{
            padding: '10px 12px',
            borderTop: '1px solid rgba(255,255,255,0.07)',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            background: '#111'
          }}
        >
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: '50%',
              background: mi(username),
              flexShrink: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 11,
              fontWeight: 800,
              color: '#fff'
            }}
          >
            {(username || '?').slice(0, 2).toUpperCase()}
          </div>
          <div
            style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              background: 'rgba(255,255,255,0.08)',
              borderRadius: 24,
              padding: '0 14px',
              border: '1px solid rgba(255,255,255,0.1)',
              position: 'relative'
            }}
          >
            <input
              ref={commentInputRef}
              value={commentText}
              onChange={e => setCommentText(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Add a comment…"
              style={{
                flex: 1,
                background: 'transparent',
                border: 'none',
                outline: 'none',
                color: '#fff',
                fontSize: 13,
                padding: '10px 0',
                WebkitAppearance: 'none'
              }}
            />
            <SuggestionsDropdown items={suggestions} onSelect={handleSelectSuggestion} activeIndex={activeIndex} />
          </div>
          <button
            onClick={handleSubmitComment}
            disabled={!commentText.trim()}
            style={{
              width: 36,
              height: 36,
              borderRadius: '50%',
              background: commentText.trim() ? '#2563eb' : 'rgba(255,255,255,0.08)',
              border: 'none',
              cursor: commentText.trim() ? 'pointer' : 'default',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              transition: 'background .15s'
            }}
            aria-label="Post comment"
          >
            <svg
              viewBox="0 0 24 24"
              style={{
                width: 16,
                height: 16,
                fill: 'none',
                stroke: '#fff',
                strokeWidth: 2.5
              }}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}

// Export SnapPlayer wrapper for PostCard
export function SnapPlayer({ snap, username, isActive, onLike, onProfileClick }) {
  return (
    <SnapItem
      snap={snap}
      username={username}
      isActive={isActive}
      onLike={onLike}
      onProfileClick={onProfileClick}
      onOpenComments={() => {
        if (window.Lexum) window.Lexum.navigate('/snaps');
        else window.location.href = '/snaps';
      }}
      isFeed={true}
    />
  );
}

// Individual Snap Item Player
function SnapItem({ snap, username, isActive, onLike, onProfileClick, onOpenComments, onGift, isFeed }) {
  let videoRef = useRef(null);
  let containerRef = useRef(null);
  let [currentSnap, setCurrentSnap] = useState(snap);
  let [isPlaying, setIsPlaying] = useState(false);
  let [isMuted, setIsMuted] = useState(false);
  let [progressPercent, setProgressPercent] = useState(0);
  let [hearts, setHearts] = useState([]);
  let [likePop, setLikePop] = useState(false);
  let [cntPop, setCntPop] = useState(false);
  let [showPauseIc, setShowPauseIc] = useState(false);

  let tapTimer = useRef(null);
  let tapCount = useRef(0);
  let pauseTimer = useRef(null);

  let isLiked = (currentSnap?.likes || []).includes(username);
  let profileInfo = Nn(currentSnap?.username);

  useEffect(() => {
    setCurrentSnap(snap);
  }, [snap]);

  useEffect(() => {
    let videoEl = videoRef.current;
    if (videoEl) {
      videoEl.muted = isMuted;
      if (isActive) {
        if (!videoEl.src && currentSnap?.media?.[0]) {
          videoEl.src = currentSnap.media[0];
        }
        videoEl.play()
          .then(() => setIsPlaying(true))
          .catch(() => setIsPlaying(false));
      } else {
        videoEl.pause();
        setIsPlaying(false);
      }
    }
    return () => {
      if (videoEl) {
        try { videoEl.pause(); } catch {}
        videoEl.removeAttribute('src'); // clear source
        try { videoEl.load(); } catch {}
      }
    };
  }, [isActive]);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.muted = isMuted;
    }
  }, [isMuted]);

  useEffect(() => {
    let videoEl = videoRef.current;
    if (!videoEl) return;
    let timeUpdateHandler = () => {
      if (videoEl.duration) {
        setProgressPercent((videoEl.currentTime / videoEl.duration) * 100);
      }
    };
    videoEl.addEventListener('timeupdate', timeUpdateHandler);
    return () => videoEl.removeEventListener('timeupdate', timeUpdateHandler);
  }, []);

  function togglePlayPause() {
    let videoEl = videoRef.current;
    if (videoEl) {
      if (videoEl.paused) {
        videoEl.play()
          .then(() => setIsPlaying(true))
          .catch(() => {});
      } else {
        videoEl.pause();
        setIsPlaying(false);
        clearTimeout(pauseTimer.current);
        setShowPauseIc(true);
        pauseTimer.current = setTimeout(() => setShowPauseIc(false), 750);
      }
    }
  }

  function handleVideoClick(e) {
    tapCount.current++;
    if (tapCount.current === 1) {
      tapTimer.current = setTimeout(() => {
        if (tapCount.current === 1) {
          togglePlayPause();
        }
        tapCount.current = 0;
      }, 230);
    } else if (tapCount.current >= 2) {
      clearTimeout(tapTimer.current);
      tapCount.current = 0;
      handleDoubleTap(e);
    }
  }

  function handleDoubleTap(e) {
    let rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    let heartId = Date.now() + Math.random();
    setHearts(prev => [...prev, {
      id: heartId,
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    }]);
    setTimeout(() => setHearts(prev => prev.filter(h => h.id !== heartId)), 950);

    if (!isLiked) {
      setCurrentSnap(prev => ({
        ...prev,
        likes: [...(prev.likes || []), username]
      }));
      setLikePop(true);
      setCntPop(true);
      setTimeout(() => setLikePop(false), 400);
      setTimeout(() => setCntPop(false), 300);
      onLike(currentSnap.id);
    }
  }

  function handleSingleLikeClick() {
    let liked = isLiked;
    setCurrentSnap(prev => ({
      ...prev,
      likes: liked
        ? (prev.likes || []).filter(u => u !== username)
        : [...(prev.likes || []), username]
    }));
    if (!liked) {
      setLikePop(true);
      setCntPop(true);
      setTimeout(() => setLikePop(false), 400);
      setTimeout(() => setCntPop(false), 300);
    }
    onLike(currentSnap.id);
  }

  async function handleShareClick() {
    let url = window.location.origin + '/snap/' + (currentSnap?.id || '');
    try {
      if (navigator?.share) {
        await navigator.share({
          title: 'Check this snap',
          url: url
        });
      } else {
        await navigator.clipboard?.writeText(url);
      }
    } catch {}
  }

  return (
    <div ref={containerRef} className="relative w-full h-full bg-black select-none">
      <video
        ref={videoRef}
        poster={currentSnap?.poster || currentSnap?.thumbnail || ''}
        preload="metadata"
        playsInline
        loop
        muted={isMuted}
        className={cn("absolute inset-0 w-full h-full", isFeed ? "object-contain" : "object-cover")}
        onClick={handleVideoClick}
        aria-label={`Snap by ${currentSnap?.username}`}
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent pointer-events-none" />
      {hearts.map(h => (
        <div
          className="absolute pointer-events-none snap-heart"
          style={{ left: h.x, top: h.y }}
          key={h.id}
        >
          <svg
            viewBox="0 0 24 24"
            style={{
              width: 88,
              height: 88,
              filter: 'drop-shadow(0 2px 8px rgba(0,0,0,.4))'
            }}
            fill="#ef4444"
          >
            <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
          </svg>
        </div>
      ))}
      {showPauseIc && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none snap-pause-ic">
          <div
            style={{
              width: 64,
              height: 64,
              borderRadius: '50%',
              background: 'rgba(0,0,0,.5)',
              backdropFilter: 'blur(4px)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <svg viewBox="0 0 24 24" style={{ width: 28, height: 28, fill: '#fff' }}>
              <rect x="6" y="4" width="4" height="16" rx="1" />
              <rect x="14" y="4" width="4" height="16" rx="1" />
            </svg>
          </div>
        </div>
      )}
      {!isPlaying && !showPauseIc && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div
            style={{
              width: 64,
              height: 64,
              borderRadius: '50%',
              background: 'rgba(0,0,0,.5)',
              backdropFilter: 'blur(4px)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <svg
              viewBox="0 0 24 24"
              style={{
                width: 28,
                height: 28,
                fill: '#fff',
                marginLeft: 3
              }}
            >
              <path d="M8 5v14l11-7z" />
            </svg>
          </div>
        </div>
      )}
      <button
        onClick={e => {
          e.stopPropagation();
          setIsMuted(m => !m);
        }}
        className="absolute top-4 right-4 z-20"
        style={{
          width: 38,
          height: 38,
          borderRadius: '50%',
          background: 'rgba(0,0,0,.35)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          border: 'none',
          cursor: 'pointer'
        }}
        aria-label={isMuted ? 'Unmute' : 'Mute'}
      >
        {isMuted ? (
          <svg
            viewBox="0 0 24 24"
            style={{
              width: 18,
              height: 18,
              fill: 'none',
              stroke: '#fff',
              strokeWidth: 2
            }}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M17.25 9.75L19.5 12m0 0l2.25 2.25M19.5 12l2.25-2.25M19.5 12l-2.25 2.25m-10.5-6l4.72-4.72a.75.75 0 011.28.53v15.88a.75.75 0 01-1.28.53l-4.72-4.72H4.51c-.88 0-1.704-.507-1.938-1.354A9.01 9.01 0 012.25 12c0-.83.112-1.633.322-2.396C2.806 8.756 3.63 8.25 4.51 8.25H6.75z" />
          </svg>
        ) : (
          <svg
            viewBox="0 0 24 24"
            style={{
              width: 18,
              height: 18,
              fill: 'none',
              stroke: '#fff',
              strokeWidth: 2
            }}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M19.114 5.636a9 9 0 010 12.728M16.463 8.288a5.25 5.25 0 010 7.424M6.75 8.25l4.72-4.72a.75.75 0 011.28.53v15.88a.75.75 0 01-1.28.53l-4.72-4.72H4.51c-.88 0-1.704-.507-1.938-1.354A9.01 9.01 0 012.25 12c0-.83.112-1.633.322-2.396C2.806 8.756 3.63 8.25 4.51 8.25H6.75z" />
          </svg>
        )}
      </button>
      <div
        className="absolute z-20 pointer-events-none"
        style={{
          bottom: 80,
          left: 16,
          right: 72
        }}
      >
        <div className="flex items-center gap-3 mb-3 pointer-events-auto cursor-pointer">
          {profileInfo?.profile_pic ? (
            <img
              src={profileInfo.profile_pic}
              alt={currentSnap?.username}
              style={{
                width: 40,
                height: 40,
                borderRadius: '50%',
                objectFit: 'cover',
                border: '2px solid rgba(255,255,255,.9)',
                flexShrink: 0
              }}
            />
          ) : (
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: '50%',
                background: mi(currentSnap?.username),
                flexShrink: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 14,
                fontWeight: 800,
                color: '#fff',
                border: '2px solid rgba(255,255,255,.7)'
              }}
            >
              {(currentSnap?.username || '?').slice(0, 2).toUpperCase()}
            </div>
          )}
          <div className="flex-1 min-w-0" onClick={e => { e.stopPropagation(); onProfileClick?.(currentSnap?.username); }}>
            <p
              style={{
                color: '#fff',
                fontSize: 15,
                fontWeight: 700,
                lineHeight: 1.3,
                textShadow: '0 1px 2px rgba(0,0,0,.5)',
                display: 'flex',
                alignItems: 'center',
                gap: 4
              }}
            >
              {profileInfo?.fullname || currentSnap?.username}
              {currentSnap?.verified === true && (
                <div className="flex-shrink-0 flex items-center justify-center p-0.5 rounded-full bg-blue-500/20 ml-1">
                  <VerifiedBadge className="w-3.5 h-3.5 text-blue-400" />
                </div>
              )}
              {(currentSnap?.boost_score || 0) > 0 && (
                <span style={{ fontSize: 9, fontWeight: 800, color: '#f59e0b', background: 'rgba(245,158,11,.15)', padding: '1px 6px', borderRadius: 10, marginLeft: 4, letterSpacing: '0.5px' }}>BOOSTED</span>
              )}
            </p>
            <p
              style={{
                color: 'rgba(255,255,255,.55)',
                fontSize: 12,
                lineHeight: 1.3,
                fontWeight: 500
              }}
            >
              @{currentSnap?.username}
            </p>
          </div>
          <FollowButton
            targetUsername={currentSnap?.username}
            currentUsername={localStorage.currentUser}
            onUpdate={() => {}}
          />
        </div>
        {currentSnap?.text && <SnapText text={currentSnap.text} />}
      </div>
      <div
        className="absolute z-20 flex flex-col items-center gap-4"
        style={{
          right: 12,
          bottom: 80
        }}
      >
        <button
          onClick={e => {
            e.stopPropagation();
            handleSingleLikeClick();
          }}
          className="flex flex-col items-center gap-0.5"
          aria-label={isLiked ? 'Unlike' : 'Like'}
        >
          <div className={likePop ? 'snap-like-pop' : ''}>
            <svg
              viewBox="0 0 24 24"
              style={{
                width: 30,
                height: 30,
                filter: 'drop-shadow(0 2px 6px rgba(0,0,0,.5))'
              }}
              fill={isLiked ? '#ef4444' : '#fff'}
              stroke={isLiked ? '#ef4444' : 'none'}
            >
              <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
            </svg>
          </div>
          <span
            className={cn("text-white text-[11px] font-bold leading-none", cntPop ? 'snap-cnt-pop' : '')}
            style={{
              textShadow: '0 1px 3px rgba(0,0,0,.6)'
            }}
          >
            {(currentSnap?.likes || []).length}
          </span>
        </button>
        <button
          onClick={e => {
            e.stopPropagation();
            onOpenComments?.(currentSnap);
          }}
          className="flex flex-col items-center gap-0.5"
          aria-label="Comments"
        >
          <svg
            viewBox="0 0 24 24"
            style={{
              width: 28,
              height: 28,
              fill: '#fff',
              filter: 'drop-shadow(0 2px 6px rgba(0,0,0,.5))'
            }}
          >
            <path d="M20.25 8.511c.884.284 1.5 1.128 1.5 2.097v4.286c0 1.136-.847 2.1-1.98 2.193-.34.027-.68.052-1.02.072v3.091l-3-3c-1.354 0-2.694-.055-4.02-.163a2.115 2.115 0 01-.825-.242m9.345-8.334a2.126 2.126 0 00-.476-.095 48.64 48.64 0 00-8.048 0c-1.131.094-1.976 1.057-1.976 2.192v4.286c0 .837.46 1.58 1.155 1.951m9.345-8.334V6.637c0-1.621-1.152-3.026-2.76-3.235A48.455 48.455 0 0011.25 3c-2.115 0-4.198.137-6.24.402-1.608.209-2.76 1.614-2.76 3.235v6.226c0 1.621 1.152 3.026 2.76 3.235.577.075 1.157.14 1.74.194V21l4.155-4.155" />
          </svg>
          <span
            className="text-white text-[11px] font-bold leading-none"
            style={{
              textShadow: '0 1px 3px rgba(0,0,0,.6)'
            }}
          >
            {(currentSnap?.comments || []).length}
          </span>
        </button>
        <button
          onClick={e => {
            e.stopPropagation();
            if (!username) { window.showAuthPrompt?.('Log in to send gifts'); return; }
            onGift?.(currentSnap);
          }}
          className="flex flex-col items-center gap-0.5"
          aria-label="Gift Mobcoins"
        >
          <svg
            viewBox="0 0 24 24"
            style={{
              width: 28,
              height: 28,
              fill: '#fff',
              filter: 'drop-shadow(0 2px 6px rgba(0,0,0,.5))'
            }}
          >
            <path d="M9.375 3a1.875 1.875 0 0 0 0 3.75h1.875v4.5H3.375A1.875 1.875 0 0 1 1.5 9.375v-.75c0-1.036.84-1.875 1.875-1.875h3.193A3.375 3.375 0 0 1 12 2.753a3.375 3.375 0 0 1 5.432 3.997h3.943c1.035 0 1.875.84 1.875 1.875v.75c0 1.036-.84 1.875-1.875 1.875H12.75v-4.5h1.875a1.875 1.875 0 1 0-1.875-1.875V6.75h-1.5V4.875C11.25 3.839 10.41 3 9.375 3ZM11.25 12.75H3v6.75a2.25 2.25 0 0 0 2.25 2.25h6v-9ZM12.75 12.75v9h6.75a2.25 2.25 0 0 0 2.25-2.25v-6.75h-9Z" />
          </svg>
        </button>
        <button
          onClick={e => {
            e.stopPropagation();
            handleShareClick();
          }}
          className="flex flex-col items-center gap-0.5"
          aria-label="Share"
        >
          <svg
            viewBox="0 0 24 24"
            style={{
              width: 28,
              height: 28,
              fill: 'none',
              stroke: '#fff',
              strokeWidth: 1.8,
              filter: 'drop-shadow(0 2px 6px rgba(0,0,0,.5))'
            }}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M7.217 10.907a2.25 2.25 0 100 2.186m0-2.186c.18.324.283.696.283 1.093s-.103.77-.283 1.093m0-2.186l9.566-5.314m-9.566 7.5l9.566 5.314m0 0a2.25 2.25 0 103.935 2.186 2.25 2.25 0 00-3.935-2.186zm0-12.814a2.25 2.25 0 103.933-2.185 2.25 2.25 0 00-3.933 2.185z" />
          </svg>
        </button>
      </div>
      <div
        className="absolute pointer-events-none z-20"
        style={{
          bottom: 8,
          left: 16,
          right: 16
        }}
      >
        <div
          style={{
            height: 2,
            background: 'rgba(255,255,255,.2)',
            borderRadius: 4,
            overflow: 'hidden'
          }}
        >
          <div
            style={{
              height: '100%',
              background: '#fff',
              borderRadius: 4,
              width: `${progressPercent}%`,
              transition: 'width .1s linear'
            }}
          />
        </div>
      </div>
    </div>
  );
}

// Snaps vertical carousel component
function SnapsCarousel({ snaps: initialSnaps, startIndex = 0, onClose, username, onLike, onCreateSnap, onLoadMore, onSnapViewed }) {
  let [s, c] = useState(startIndex);
  let [l, u] = useState(null);
  let [giftTarget, setGiftTarget] = useState(null);
  let [d, f] = useState(initialSnaps);
  let [searchOpen, setSearchOpen] = useState(false);
  let [searchQuery, setSearchQuery] = useState('');
  let [searchResults, setSearchResults] = useState([]);
  let [searchLoading, setSearchLoading] = useState(false);
  let searchInputRef = useRef(null);
  let p = useRef(null);
  let m = useRef({ y: 0, t: 0 });

  function handleIndexChange(newIndex) {
    c(newIndex);
    if (d[newIndex]) {
      onSnapViewed?.([d[newIndex].id]);
      // Update URL to /snap/:id for shareable links (Facebook-style)
      var snapId = d[newIndex].id;
      if (window.history && window.location.pathname !== '/snap/' + snapId) {
        window.history.replaceState(null, '', '/snap/' + snapId);
      }
    }
  }

  function handleOpenGift(snapObj) {
    if (!snapObj) return;
    setGiftTarget(d.find(item => item.id === snapObj.id) || snapObj);
  }

  useEffect(() => {
    f(initialSnaps);
  }, [initialSnaps]);

  useEffect(() => {
    if (s >= d.length - 2 && d.length > 0) {
      onLoadMore?.();
    }
  }, [s, d.length]);

  useEffect(() => {
    let keyHandler = e => {
      if (!l) {
        if (e.key === 'ArrowDown' && s < d.length - 1) {
          handleIndexChange(s + 1);
        } else if (e.key === 'ArrowUp' && s > 0) {
          handleIndexChange(s - 1);
        } else if (e.key === 'Escape') {
          onClose?.();
        }
      }
    };
    window.addEventListener('keydown', keyHandler);
    return () => window.removeEventListener('keydown', keyHandler);
  }, [s, d.length, l]);

  useEffect(() => {
    let container = p.current;
    if (!container) return;
    let lastWheelTime = 0;
    let wheelHandler = e => {
      if (l) return;
      e.preventDefault();
      let now = Date.now();
      if (!(now - lastWheelTime < 550)) {
        lastWheelTime = now;
        if (e.deltaY > 0 && s < d.length - 1) {
          handleIndexChange(s + 1);
        } else if (e.deltaY < 0 && s > 0) {
          handleIndexChange(s - 1);
        }
      }
    };
    container.addEventListener('wheel', wheelHandler, { passive: false });
    return () => container.removeEventListener('wheel', wheelHandler);
  }, [s, d.length, l]);

  function handleTouchStart(e) {
    if (!l) {
      m.current = {
        y: e.touches[0].clientY,
        t: Date.now()
      };
    }
  }

  function handleTouchEnd(e) {
    if (l) return;
    let deltaY = m.current.y - e.changedTouches[0].clientY;
    let velocity = Math.abs(deltaY) / Math.max(1, Date.now() - m.current.t);
    if (Math.abs(deltaY) > 55 || velocity > 0.4) {
      if (deltaY > 0 && s < d.length - 1) {
        handleIndexChange(s + 1);
      } else if (deltaY < 0 && s > 0) {
        handleIndexChange(s - 1);
      }
    }
  }

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, []);

  // Search with debounce
  useEffect(() => {
    if (!searchQuery.trim()) { setSearchResults([]); return; }
    let active = true;
    setSearchLoading(true);
    let timer = setTimeout(async () => {
      try {
        let res = await apiFetch(`/snaps-search?query=${encodeURIComponent(searchQuery.trim())}&limit=12`);
        if (active && res.ok) {
          let data = await res.json();
          setSearchResults(data.snaps || []);
        }
      } catch {} finally {
        if (active) setSearchLoading(false);
      }
    }, 300);
    return () => { active = false; clearTimeout(timer); };
  }, [searchQuery]);

  function handleOpenComments(snapObj) {
    u(d.find(item => item.id === snapObj.id) || snapObj);
  }

  function handleAddComment(text) {
    if (!l) return;
    let commentObj = {
      username: username,
      text: text,
      createdAt: Date.now()
    };
    f(list => list.map(snap => snap.id === l.id ? {
      ...snap,
      comments: [...(snap.comments || []), commentObj]
    } : snap));
    u(snap => ({
      ...snap,
      comments: [...(snap.comments || []), commentObj]
    }));
    apiFetch('/add-comment', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        postId: l.id,
        username: username,
        comment: text
      })
    }).catch(() => {});
  }

  let b = Math.max(0, s - 2);
  let x = Math.min(d.length - 1, s + 2);

  return (
    <div className="fixed inset-0 z-50 bg-black">
      <div className="h-full flex items-stretch justify-center">
        <div
          ref={p}
          className="relative w-full md:w-[390px] h-full overflow-hidden"
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
        >
          <div
            className="absolute inset-0 transition-transform duration-[200ms] cubic-bezier(.22,.68,0,1)"
            style={{ transform: `translateY(-${s * 100}vh)` }}
          >
            {d.map((snap, index) => (
              <div
                className="absolute w-full"
                style={{ top: `${index * 100}vh`, height: '100vh' }}
                key={snap.id}
              >
                {index >= b && index <= x ? (
                  <SnapItem
                    snap={snap}
                    username={username}
                    isActive={index === s && !l}
                    onLike={onLike}
                    onProfileClick={target => Lexum.navigate(`/@${target}`)}
                    onOpenComments={handleOpenComments}
                    onGift={handleOpenGift}
                  />
                ) : (
                  <div className="w-full h-full bg-black" />
                )}
              </div>
            ))}
          </div>
          <div className="absolute top-0 left-0 right-0 z-30 pointer-events-none">
            <div className="flex items-center justify-between px-3 pt-14 pb-1">
              <button
                onClick={onClose}
                className="pointer-events-auto"
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: '50%',
                  background: 'rgba(0,0,0,.35)',
                  backdropFilter: 'blur(8px)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  border: 'none',
                  cursor: 'pointer'
                }}
                aria-label="Close"
              >
                <svg
                  viewBox="0 0 24 24"
                  style={{
                    width: 18,
                    height: 18,
                    fill: 'none',
                    stroke: '#fff',
                    strokeWidth: 2.5
                  }}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <div className="flex items-center gap-2.5">
                <button
                  onClick={() => { setSearchOpen(!searchOpen); if (!searchOpen) setTimeout(() => searchInputRef.current?.focus(), 100); }}
                  className="pointer-events-auto"
                  style={{
                    width: 38,
                    height: 38,
                    borderRadius: '50%',
                    background: 'rgba(0,0,0,.35)',
                    backdropFilter: 'blur(8px)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    border: 'none',
                    cursor: 'pointer'
                  }}
                  aria-label="Search snaps"
                >
                  <svg viewBox="0 0 24 24" style={{ width: 18, height: 18, fill: 'none', stroke: '#fff', strokeWidth: 2.5 }}>
                    <circle cx="11" cy="11" r="7" /><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35" />
                  </svg>
                </button>
                <button
                  onClick={() => onCreateSnap?.()}
                  className="pointer-events-auto flex items-center gap-1.5"
                  style={{
                    background: 'rgba(0,0,0,.35)',
                    backdropFilter: 'blur(8px)',
                    border: '1px solid rgba(255,255,255,.15)',
                    borderRadius: 22,
                    padding: '7px 16px',
                    cursor: 'pointer'
                  }}
                  aria-label="Create Snap"
                >
                  <svg
                    viewBox="0 0 24 24"
                    style={{
                      width: 16,
                      height: 16,
                      fill: 'none',
                      stroke: '#fff',
                      strokeWidth: 2.5
                    }}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                  </svg>
                  <span
                    style={{
                      color: '#fff',
                      fontSize: 13,
                      fontWeight: 700
                    }}
                  >
                    Create
                  </span>
                </button>
              </div>
            </div>
          </div>
          <div
            className="absolute z-20 pointer-events-none"
            style={{
              bottom: 20,
              left: '50%',
              transform: 'translateX(-50%)'
            }}
          >
            <p
              style={{
                color: 'rgba(255,255,255,.4)',
                fontSize: 11,
                fontWeight: 600
              }}
            >
              {s + 1} / {d.length}
            </p>
          </div>
        </div>
        <div className="hidden md:flex flex-col justify-center pl-6 w-64 py-8 pointer-events-none">
          <p
            style={{
              color: 'rgba(255,255,255,.3)',
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: '2px',
              textTransform: 'uppercase',
              marginBottom: 12
            }}
          >
            Up next
          </p>
          {d.slice(s + 1, s + 4).map((snap, index) => (
            <div
              className="pointer-events-auto cursor-pointer flex items-center gap-3 mb-3"
              style={{
                opacity: 0.55,
                transition: 'opacity .15s'
              }}
              onMouseEnter={e => (e.currentTarget.style.opacity = '1')}
              onMouseLeave={e => (e.currentTarget.style.opacity = '.55')}
              onClick={() => handleIndexChange(s + 1 + index)}
              key={snap.id}
            >
              <div
                style={{
                  width: 40,
                  height: 56,
                  borderRadius: 8,
                  background: '#222',
                  overflow: 'hidden',
                  flexShrink: 0
                }}
              >
                {snap.thumbnail || snap.poster ? (
                  <img
                    src={snap.thumbnail || snap.poster}
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover'
                    }}
                    alt=""
                  />
                ) : (
                  <div
                    style={{
                      width: '100%',
                      height: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                  >
                    <svg
                      viewBox="0 0 24 24"
                      style={{
                        width: 18,
                        height: 18,
                        fill: '#555'
                      }}
                    >
                      <path d="M8 5v14l11-7z" />
                    </svg>
                  </div>
                )}
              </div>
              <div style={{ minWidth: 0 }}>
                <p
                  style={{
                    color: '#fff',
                    fontSize: 12,
                    fontWeight: 700,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4
                  }}
                >
                  @{snap.username}
                  {(() => {
                    console.log(`[Snap Badge Debug] Username: ${snap.username}, snap.verified: ${snap.verified}`);
                    return snap.verified === true && <VerifiedBadge className="w-3 h-3 text-blue-400" />;
                  })()}
                </p>
                <p
                  style={{
                    color: 'rgba(255,255,255,.4)',
                    fontSize: 11,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    marginTop: 2
                  }}
                >
                  {snap.text || ''}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
      {searchOpen && (
        <div className="fixed inset-0 z-[100] bg-black flex flex-col">
          <div className="flex items-center gap-3 px-3 pt-12 pb-2">
            <button onClick={() => { setSearchOpen(false); setSearchQuery(''); setSearchResults([]); }} style={{ width: 32, height: 32, borderRadius: '50%', background: 'rgba(255,255,255,.1)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <svg viewBox="0 0 24 24" style={{ width: 18, height: 18, fill: 'none', stroke: '#fff', strokeWidth: 2.5 }}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
            </button>
            <div className="flex-1 flex items-center gap-2 bg-white/10 rounded-2xl px-4 py-3 border border-white/15">
              <svg viewBox="0 0 24 24" style={{ width: 18, height: 18, fill: 'none', stroke: 'rgba(255,255,255,.4)', strokeWidth: 2.5, flexShrink: 0 }}>
                <circle cx="11" cy="11" r="7" /><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35" />
              </svg>
              <input
                ref={searchInputRef}
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search snaps…"
                style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', color: '#fff', fontSize: 15 }}
                autoComplete="off"
              />
              {searchQuery && (
                <button onClick={() => { setSearchQuery(''); setSearchResults([]); }} style={{ width: 22, height: 22, borderRadius: '50%', background: 'rgba(255,255,255,.15)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <svg viewBox="0 0 24 24" style={{ width: 12, height: 12, fill: 'none', stroke: '#fff', strokeWidth: 3 }}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              )}
            </div>
          </div>
          <div className="flex-1 overflow-y-auto px-1 pt-2">
            {!searchQuery.trim() && (
              <div className="flex flex-col items-center justify-center pt-24 text-center px-6">
                <div style={{ width: 64, height: 64, borderRadius: 20, background: 'rgba(37,99,235,.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
                  <svg viewBox="0 0 24 24" style={{ width: 28, height: 28, fill: 'none', stroke: '#60a5fa', strokeWidth: 1.5 }}>
                    <circle cx="11" cy="11" r="7" /><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35" />
                  </svg>
                </div>
                <p style={{ color: 'rgba(255,255,255,.6)', fontSize: 15, fontWeight: 600 }}>Discover snaps</p>
                <p style={{ color: 'rgba(255,255,255,.3)', fontSize: 13, marginTop: 6 }}>Search by caption or hashtag</p>
              </div>
            )}
            {searchLoading && (
              <div className="grid grid-cols-3 gap-1.5 px-1">
                {[1,2,3,4,5,6].map(i => <div key={i} style={{ aspectRatio: '3/4', background: 'rgba(255,255,255,.04)', borderRadius: 12 }} className="animate-pulse" />)}
              </div>
            )}
            {!searchLoading && searchResults.length > 0 && (
              <div className="grid grid-cols-3 gap-1.5 px-1 pb-4">
                {searchResults.map(snap => (
                  <div
                    key={snap.id}
                    onClick={() => {
                      setSearchOpen(false);
                      setSearchQuery('');
                      setSearchResults([]);
                      let idx = d.findIndex(item => String(item.id) === String(snap.id));
                      if (idx >= 0) handleIndexChange(idx);
                      else { f(prev => [snap, ...prev]); handleIndexChange(0); }
                    }}
                    style={{ borderRadius: 12, overflow: 'hidden', cursor: 'pointer', position: 'relative' }}
                  >
                    {snap.media?.[0] ? (
                      <div style={{ position: 'relative' }}>
                        <video src={snap.media[0]} style={{ width: '100%', aspectRatio: '3/4', objectFit: 'cover', display: 'block', background: '#111' }} muted preload="metadata" />
                        <div style={{ position: 'absolute', top: 6, left: 6, background: 'rgba(0,0,0,.7)', borderRadius: 6, padding: '2px 6px', display: 'flex', alignItems: 'center', gap: 3 }}>
                          <svg viewBox="0 0 24 24" style={{ width: 11, height: 11, fill: 'none', stroke: '#fff', strokeWidth: 2 }}><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5l4.72-4.72a.75.75 0 011.28.53v11.38a.75.75 0 01-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 002.25-2.25v-9a2.25 2.25 0 00-2.25-2.25h-9A2.25 2.25 0 002.25 7.5v9a2.25 2.25 0 002.25 2.25z" /></svg>
                          <span style={{ color: '#fff', fontSize: 9, fontWeight: 700 }}>HD</span>
                        </div>
                        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: 'linear-gradient(transparent, rgba(0,0,0,.85))', padding: '32px 8px 8px' }}>
                          <p style={{ color: '#fff', fontSize: 10, fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>@{snap.username}</p>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 3 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                              <svg viewBox="0 0 24 24" style={{ width: 11, height: 11, fill: '#fff' }}><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" /></svg>
                              <span style={{ color: '#fff', fontSize: 10, fontWeight: 700 }}>{(snap.likes || []).length}</span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                              <svg viewBox="0 0 24 24" style={{ width: 11, height: 11, fill: '#fff' }}><path d="M20.25 8.511c.884.284 1.5 1.128 1.5 2.097v4.286c0 1.136-.847 2.1-1.98 2.193-.34.027-.68.052-1.02.072v3.091l-3-3c-1.354 0-2.694-.055-4.02-.163a2.115 2.115 0 01-.825-.242m9.345-8.334a2.126 2.126 0 00-.476-.095 48.64 48.64 0 00-8.048 0c-1.131.094-1.976 1.057-1.976 2.192v4.286c0 .837.46 1.58 1.155 1.951m9.345-8.334V6.637c0-1.621-1.152-3.026-2.76-3.235A48.455 48.455 0 0011.25 3c-2.115 0-4.198.137-6.24.402-1.608.209-2.76 1.614-2.76 3.235v6.226c0 1.621 1.152 3.026 2.76 3.235.577.075 1.157.14 1.74.194V21l4.155-4.155" /></svg>
                              <span style={{ color: '#fff', fontSize: 10, fontWeight: 700 }}>{(snap.comments || []).length}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div style={{ width: '100%', aspectRatio: '3/4', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#111' }}>
                        <svg viewBox="0 0 24 24" style={{ width: 20, height: 20, fill: 'rgba(255,255,255,.15)' }}><path d="M8 5v14l11-7z" /></svg>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
            {!searchLoading && searchQuery.trim() && searchResults.length === 0 && (
              <div className="flex flex-col items-center justify-center pt-24 text-center px-6">
                <div style={{ width: 56, height: 56, borderRadius: 20, background: 'rgba(255,255,255,.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}>
                  <svg viewBox="0 0 24 24" style={{ width: 24, height: 24, fill: 'none', stroke: 'rgba(255,255,255,.2)', strokeWidth: 1.5 }}><circle cx="11" cy="11" r="7" /><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35" /></svg>
                </div>
                <p style={{ color: 'rgba(255,255,255,.4)', fontSize: 14, fontWeight: 600 }}>No results for "{searchQuery}"</p>
                <p style={{ color: 'rgba(255,255,255,.2)', fontSize: 13, marginTop: 4 }}>Try a different search term</p>
              </div>
            )}
          </div>
        </div>
      )}
      {l && (
        <CommentsPanel
          snap={l}
          username={username}
          onClose={() => u(null)}
          onAddComment={handleAddComment}
        />
      )}
      {giftTarget && (
        <GiftCoinsModal
          open={!!giftTarget}
          onClose={() => setGiftTarget(null)}
          recipientUsername={giftTarget.username}
          postId={giftTarget.id}
        />
      )}
    </div>
  );
}

// Main exported SnapsContent Component
export default function SnapsContent({ startSnapId }) {
  let [snaps, setSnaps] = useState([]);
  let [snapPage, setSnapPage] = useState(1);
  let [hasMoreSnaps, setHasMoreSnaps] = useState(true);
  let [loading, setLoading] = useState(true);
  let [errorMsg, setErrorMsg] = useState('');
  let [isCreatorOpen, setIsCreatorOpen] = useState(false);
  let [startIndex, setStartIndex] = useState(0);
  let currentUser = localStorage.getItem('currentUser') || '';

  // Seen-posts tracking (localStorage)
  const SEEN_KEY = '__tmob_viewed_ids';
  function getSeenIds() {
    try { let e = localStorage.getItem(SEEN_KEY); return new Set(e ? JSON.parse(e) : []); } catch { return new Set(); }
  }
  function markSeen(ids) {
    try { let s = getSeenIds(); ids.forEach(id => s.add(String(id))); let arr = Array.from(s); localStorage.setItem(SEEN_KEY, JSON.stringify(arr.slice(-1000))); } catch {}
  }
  function getSeenParam() {
    try { return Array.from(getSeenIds()).join(','); } catch { return ''; }
  }

  useEffect(() => {
    if (!startSnapId) {
      loadSnaps(1);
    } else {
      loadFeedAroundSnap(startSnapId);
    }
  }, [currentUser, startSnapId]);

  async function loadFeedAroundSnap(snapId) {
    try {
      // Fetch the target snap directly
      let res = await apiFetch(`/get-snap/${encodeURIComponent(snapId)}`);
      if (!res.ok) {
        setErrorMsg('Snap not found');
        setLoading(false);
        return;
      }
      let targetSnap = await res.json();
      targetSnap.likes = Array.isArray(targetSnap.likes) ? targetSnap.likes : [];
      targetSnap.comments = Array.isArray(targetSnap.comments) ? targetSnap.comments : [];

      // Load feed
      let seen = getSeenParam();
      let feedRes = await apiFetch('/snaps-feed', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: currentUser || undefined,
          page: 1,
          limit: 10,
          seenIds: seen || undefined,
        }),
      });
      let feedData = await feedRes.json();
      let feedList = (feedData.snaps || []).map(snap => ({
        ...snap,
        likes: Array.isArray(snap.likes) ? snap.likes : [],
        comments: Array.isArray(snap.comments) ? snap.comments : []
      }));

      // Check if target snap is already in the feed
      let idx = feedList.findIndex(s => String(s.id) === String(snapId));
      if (idx === -1) {
        feedList = [targetSnap, ...feedList];
        idx = 0;
      }

      setSnaps(feedList);
      setStartIndex(idx);
      setHasMoreSnaps(feedData.hasMore !== false);
      setSnapPage(1);
      markSeen([snapId]);
      setLoading(false);
    } catch (err) {
      setErrorMsg(String(err));
      setLoading(false);
    }
  }

  // Inject CSS styles for animations
  useEffect(() => {
    if (document.getElementById('snap-styles')) return;
    let style = document.createElement('style');
    style.id = 'snap-styles';
    style.textContent = `
      @keyframes snapHeartBurst {
        0%   { opacity:1; transform:translate(-50%,-50%) scale(.3) rotate(-15deg); }
        25%  { opacity:1; transform:translate(-50%,-60%) scale(1.4) rotate(8deg); }
        50%  { opacity:.9; transform:translate(-50%,-80%) scale(1.15) rotate(-3deg); }
        100% { opacity:0; transform:translate(-50%,-120%) scale(.8) rotate(2deg); }
      }
      @keyframes snapHeartFloat {
        0%   { opacity:0; transform:translateY(0) scale(0) rotate(0deg); }
        15%  { opacity:1; transform:translateY(-10px) scale(1.1) rotate(-8deg); }
        50%  { opacity:1; transform:translateY(-30px) scale(1) rotate(5deg); }
        100% { opacity:0; transform:translateY(-60px) scale(.6) rotate(15deg); }
      }
      @keyframes snapLikePop {
        0%   { transform:scale(1); }
        30%  { transform:scale(1.6); }
        60%  { transform:scale(.85); }
        100% { transform:scale(1); }
      }
      @keyframes snapCountPop {
        0%   { transform:translateY(0) scale(1); }
        40%  { transform:translateY(-6px) scale(1.3); }
        100% { transform:translateY(0) scale(1); }
      }
      @keyframes snapSlideUp {
        from { transform:translateY(100%); }
        to   { transform:translateY(0); }
      }
      @keyframes snapFadeIn {
        from { opacity:0; }
        to   { opacity:1; }
      }
      @keyframes snapPauseFade {
        0%   { opacity:1; transform:scale(1); }
        60%  { opacity:.8; transform:scale(1.1); }
        100% { opacity:0; transform:scale(1.2); }
      }
      @keyframes snapSlideIn {
        from { opacity:0.3; transform:translateY(15px) scale(0.97); }
        to   { opacity:1; transform:translateY(0) scale(1); }
      }
      .snap-heart    { animation: snapHeartBurst .75s cubic-bezier(.22,.68,0,1) forwards; }
      .snap-heart-fl { animation: snapHeartFloat .6s cubic-bezier(.25,.46,.45,.94) forwards; }
      .snap-like-pop { animation: snapLikePop .3s cubic-bezier(.34,1.56,.64,1) forwards; }
      .snap-cnt-pop  { animation: snapCountPop .22s ease forwards; }
      .snap-slide    { animation: snapSlideUp .28s cubic-bezier(.32,.72,0,1) forwards; }
      .snap-fade     { animation: snapFadeIn .15s ease forwards; }
      .snap-pause-ic { animation: snapPauseFade .6s ease forwards; }
      .snap-slide-in { animation: snapSlideIn .2s cubic-bezier(.22,.68,0,1) forwards; }
      .snap-noscroll::-webkit-scrollbar { display:none; }
      .snap-noscroll { -ms-overflow-style:none; scrollbar-width:none; }
      .snap-progress-ring {
        transform-origin:center;
        transform:rotate(-90deg);
        transition:stroke-dashoffset .08s linear;
      }
    `;
    document.head.appendChild(style);
  }, []);

  async function loadSnaps(pg) {
    try {
      let seen = getSeenParam();
      let res = await apiFetch('/snaps-feed', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: currentUser || undefined,
          page: pg,
          limit: 5,
          seenIds: seen || undefined,
        }),
      });
      let data = await res.json();
      if (data.snaps) {
        let snapList = data.snaps.map(snap => ({
          ...snap,
          likes: Array.isArray(snap.likes) ? snap.likes : [],
          comments: Array.isArray(snap.comments) ? snap.comments : []
        }));
        setSnaps(prev => {
          let prevIds = new Set(prev.map(s => s.id));
          let newSnaps = snapList.filter(s => !prevIds.has(s.id));
          return pg === 1 ? newSnaps : [...prev, ...newSnaps];
        });
        setHasMoreSnaps(data.hasMore !== false);
        setSnapPage(pg);
      }
    } catch (err) {
      setErrorMsg(String(err));
    } finally {
      setLoading(false);
    }
  }

  let handleLoadMore = async () => {
    if (!hasMoreSnaps || loading) return;
    await loadSnaps(snapPage + 1);
  };

  async function handleLike(snapId) {
    if (!currentUser) { window.showAuthPrompt?.('Log in to like snaps'); return; }
    let snapBefore = currentSnap?.likes ? [...currentSnap.likes] : [];
    try {
      await apiFetch('/like-post', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          postId: snapId,
          username: currentUser
        })
      });
    } catch {
      setCurrentSnap(prev => prev?.id === snapId ? { ...prev, likes: snapBefore } : prev);
    }
  }

  function handlePosted(newSnap) {
    if (newSnap?.snap) {
      setSnaps(prev => [
        {
          ...newSnap.snap,
          likes: newSnap.snap.likes || [],
          comments: newSnap.snap.comments || []
        },
        ...prev
      ]);
    }
  }

  function handleSnapViewed(ids) {
    markSeen(ids);
  }

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black flex flex-col items-center justify-center gap-4">
        <div
          style={{
            width: 44,
            height: 44,
            borderRadius: '50%',
            border: '2px solid rgba(255,255,255,.08)',
            borderTopColor: 'rgba(255,255,255,.7)',
            animation: 'spin 0.8s linear infinite'
          }}
        />
        <p
          style={{
            color: 'rgba(255,255,255,.5)',
            fontSize: 13,
            fontWeight: 600
          }}
        >
          Loading Snaps…
        </p>
        <style>{`@keyframes spin { to { transform:rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (errorMsg) {
    return (
      <div className="fixed inset-0 bg-black flex flex-col items-center justify-center gap-4 px-6">
        <p
          style={{
            color: 'rgba(255,255,255,.5)',
            fontSize: 13,
            textAlign: 'center'
          }}
        >
          {errorMsg}
        </p>
        <button
          onClick={() => window.location.reload()}
          style={{
            padding: '10px 24px',
            borderRadius: 24,
            background: '#2563eb',
            color: '#fff',
            fontSize: 13,
            fontWeight: 700,
            border: 'none',
            cursor: 'pointer'
          }}
        >
          Retry
        </button>
      </div>
    );
  }

  if (snaps.length === 0) {
    return (
      <div className="fixed inset-0 bg-black flex flex-col items-center justify-center gap-4 px-6">
        <div
          style={{
            width: 64,
            height: 64,
            borderRadius: 20,
            background: 'rgba(37,99,235,.2)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: 8
          }}
        >
          <svg
            viewBox="0 0 24 24"
            style={{
              width: 32,
              height: 32,
              fill: 'none',
              stroke: '#60a5fa',
              strokeWidth: 1.5
            }}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5l4.72-4.72a.75.75 0 011.28.53v11.38a.75.75 0 01-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 002.25-2.25v-9a2.25 2.25 0 00-2.25-2.25h-9A2.25 2.25 0 002.25 7.5v9a2.25 2.25 0 002.25 2.25z" />
          </svg>
        </div>
        <p
          style={{
            color: '#fff',
            fontSize: 15,
            fontWeight: 800
          }}
        >
          No Snaps Yet
        </p>
        <p
          style={{
            color: 'rgba(255,255,255,.4)',
            fontSize: 13,
            textAlign: 'center'
          }}
        >
          {currentUser ? 'Be the first to share a moment' : 'Log in to see snaps from people you know'}
        </p>
        {currentUser ? (
          <button
            onClick={() => setIsCreatorOpen(true)}
            style={{
              marginTop: 8,
              padding: '12px 28px',
              borderRadius: 28,
              background: '#2563eb',
              color: '#fff',
              fontSize: 13,
              fontWeight: 800,
              border: 'none',
              cursor: 'pointer'
            }}
          >
            ✦ Create First Snap
          </button>
        ) : (
          <button
            onClick={() => { window.Lexum?.navigate('/auth'); }}
            style={{
              marginTop: 8,
              padding: '12px 28px',
              borderRadius: 28,
              background: '#2563eb',
              color: '#fff',
              fontSize: 13,
              fontWeight: 800,
              border: 'none',
              cursor: 'pointer'
            }}
          >
            Log in
          </button>
        )}
        <button
          onClick={() => window.history.back()}
          style={{
            color: 'rgba(255,255,255,.3)',
            fontSize: 12,
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            marginTop: 4
          }}
        >
          Go back
        </button>
        <NewSnapModal
          isOpen={isCreatorOpen}
          onClose={() => setIsCreatorOpen(false)}
          username={currentUser}
          onPosted={handlePosted}
        />
      </div>
    );
  }

  return (
    <>
      <SnapsCarousel
        snaps={snaps}
        startIndex={0}
        onClose={() => window.history.back()}
        username={currentUser}
        onLike={handleLike}
        onCreateSnap={() => { if (!currentUser) { window.showAuthPrompt?.('Log in to create snaps'); return; } setIsCreatorOpen(true); }}
        onLoadMore={handleLoadMore}
        onSnapViewed={handleSnapViewed}
      />
      <NewSnapModal
        isOpen={isCreatorOpen}
        onClose={() => setIsCreatorOpen(false)}
        username={currentUser}
        onPosted={newSnap => {
          handlePosted(newSnap);
          setIsCreatorOpen(false);
        }}
      />
    </>
  );
}
