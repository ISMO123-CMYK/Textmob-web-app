import { DEFAULT_AVATAR } from '../utils/defaultAvatar.js';
import React, { useState, useEffect, useRef, memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// --- Link Preview Component ---
export const LinkPreview = memo(({ url, API_BASE_URL }) => {
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
  if (!url) return;
  setLoading(true);
  fetch(`${API_BASE_URL}/api/misc/link-preview?url=${encodeURIComponent(url)}`)
  .then(res => res.json())
  .then(data => { setPreview(data); setLoading(false); })
  .catch(() => setLoading(false));
  }, [url, API_BASE_URL]);

  if (loading) return <div className="text-[11px] text-gray-500 mt-1">Loading preview...</div>;
  if (!preview || !preview.title) return <a href={url} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">{url}</a>;

  return (
  <a href={url} target="_blank" rel="noopener noreferrer" className="mt-2 block border border-black/10  rounded-xl overflow-hidden bg-black/5  transition-all hover:opacity-80 active:scale-95">
  {preview.image && <img src={preview.image} alt="Preview" className="w-full h-32 object-cover" />}
  <div className="p-3">
  <h4 className="font-bold text-sm text-gray-900  truncate">{preview.title}</h4>
  {preview.description && <p className="text-[11px] text-gray-500  mt-1 line-clamp-2 leading-tight">{preview.description}</p>}
  <span className="text-[9px] text-gray-400 uppercase tracking-widest mt-1.5 block font-bold">{new URL(url).hostname}</span>
  </div>
  </a>
  );
});

export const StatusRing = ({ statuses, currentUserId, size = 56 }) => {
  if (!statuses || statuses.length === 0) return null;
  const center = size / 2;
  const radius = center - 1; // 1px padding
  const circumference = 2 * Math.PI * radius;
  const gap = statuses.length > 1 ? 4 : 0;
  const dashLength = (circumference / statuses.length) - gap;
  const anglePerSegment = 360 / statuses.length;
  
  return (
  <svg className="absolute inset-0 w-full h-full pointer-events-none z-10" viewBox={`0 0 ${size} ${size}`}>
  {statuses.map((s, i) => {
  const isViewed = s.views && s.views.some(v => v.userId === currentUserId);
  return (
  <circle 
  key={s.id}
  cx={center} cy={center} r={radius}
  fill="none"
  stroke={isViewed ? "#9ca3af" : "var(--safari-green)"}
  strokeWidth="2.5"
  strokeDasharray={`${dashLength} ${circumference - dashLength}`}
  strokeDashoffset={-gap/2}
  strokeLinecap="round"
  transform={`rotate(${i * anglePerSegment - 90} ${center} ${center})`}
  className="transition-colors duration-300"
  />
  );
  })}
  </svg>
  );
};

// --- Status Tab Component ---
export const StatusTab = memo(({ user, contacts, statuses, Icons, onOpenCreator, onOpenViewer, onOpenCamera }) => {
  const [showMyList, setShowMyList] = useState(false);
  const myStatuses = statuses.filter(s => s.user_id === user.id);
  const contactStatuses = statuses.filter(s => s.user_id !== user.id);
  const API_BASE_URL = import.meta.env.VITE_API_URL || (
  window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
  ? 'http://localhost:3000'
  : 'https://louda-back-end.onrender.com'
  );
  
  // Group by user
  const groupedContacts = contacts.map(c => {
  const userStatuses = contactStatuses.filter(s => s.user_id === c.id);
  const unviewed = userStatuses.some(s => !(s.views || []).some(v => v.userId === user.id));
  return { 
  ...c, 
  statuses: userStatuses, 
  unviewed, 
  latestTimestamp: userStatuses.length ? Math.max(...userStatuses.map(s => new Date(s.timestamp).getTime())) : 0 
  };
  }).filter(c => c.statuses.length > 0).sort((a, b) => b.latestTimestamp - a.latestTimestamp);

  const formatTime = (ts) => {
  const d = new Date(ts);
  const today = new Date();
  if (d.getDate() === today.getDate() && d.getMonth() === today.getMonth()) return `Today, ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
  return `Yesterday, ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
  };

  const handleDeleteStatus = async (statusId, e) => {
  e.stopPropagation();
  if (!confirm('Delete this status update?')) return;
  try {
  const token = localStorage.getItem('token');
  const userId = localStorage.getItem('userId');
  const res = await fetch(`${API_BASE_URL}/api/status/${statusId}`, {
  method: 'DELETE',
  headers: { 'Authorization': `Bearer ${token}`, 'x-user-id': userId }
  });
  if (!res.ok) throw new Error('Failed to delete status');
  if (myStatuses.length === 1) setShowMyList(false);
  } catch (err) {
  alert('Failed to delete status');
  }
  };

  return (
  <div className="h-full overflow-y-auto bg-white  flex flex-col relative">
  <div className="flex justify-between items-center px-4 py-4 sticky top-0 bg-white/90  backdrop-blur-md z-10 border-b border-gray-100 ">
  <h2 className="text-[22px] font-black text-gray-900  tracking-tight">Status</h2>
  <div className="flex gap-2.5">
  <button onClick={onOpenCamera} className="w-9 h-9 rounded-full bg-gray-100  text-gray-600  flex items-center justify-center hover:bg-gray-200  transition-colors shadow-sm">{Icons.camera}</button>
  <button onClick={onOpenCreator} className="w-9 h-9 rounded-full bg-gray-100  text-gray-600  flex items-center justify-center hover:bg-gray-200  transition-colors shadow-sm">{Icons.edit}</button>
  </div>
  </div>

  <div className="px-4 py-3">
  <div className="flex items-center gap-4 p-2 rounded-2xl hover:bg-gray-50  cursor-pointer transition-colors active:scale-95" onClick={() => myStatuses.length > 0 ? setShowMyList(true) : onOpenCreator()}>
  <div className="relative w-[56px] h-[56px] flex-shrink-0">
  <StatusRing statuses={myStatuses} currentUserId={user.id} />
  <img src={user.avatar_url || DEFAULT_AVATAR} alt="Me" className="w-[52px] h-[52px] rounded-full absolute top-0.5 left-0.5 object-cover" />
  {myStatuses.length === 0 && (
  <div className="absolute bottom-0 right-0 rounded-full w-[22px] h-[22px] flex items-center justify-center border-[2.5px] border-white  shadow-sm text-white z-20" style={{ background: 'var(--safari-green)' }}>
  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
  </div>
  )}
  </div>
  <div className="flex-1">
  <h3 className="text-[16px] font-bold text-gray-900  leading-none mb-1">My Status</h3>
  <p className="text-[13px] text-gray-500  leading-none">{myStatuses.length > 0 ? `${myStatuses.length} update${myStatuses.length > 1 ? 's' : ''}` : 'Tap to add status update'}</p>
  </div>
  </div>
  </div>

  <div className="h-[6px] w-full bg-gray-50 "></div>

  <div className="px-4 py-3 flex-1">
  <h4 className="text-[12px] font-black text-gray-500  uppercase tracking-widest mb-3 px-2">Recent updates</h4>
  {groupedContacts.length === 0 && <p className="text-sm text-gray-400 text-center py-10 font-medium">No recent updates.</p>}
  
  <div className="flex flex-col gap-1">
  {groupedContacts.map(c => (
  <div key={c.id} onClick={() => onOpenViewer(c.id)} className="flex items-center gap-4 p-2 rounded-2xl hover:bg-gray-50  cursor-pointer transition-colors">
  <div className="relative w-[56px] h-[56px] flex-shrink-0">
  <StatusRing statuses={c.statuses} currentUserId={user.id} />
  <img src={c.avatar_url || DEFAULT_AVATAR} alt={c.name} className="w-[52px] h-[52px] rounded-full absolute top-0.5 left-0.5 object-cover" />
  </div>
  <div className="flex-1 border-b border-transparent  pb-3 pt-3">
  <h3 className="text-[16px] font-bold text-gray-900  leading-none mb-1.5">{c.name || c.number}</h3>
  <p className="text-[13px] text-gray-500  leading-none">{formatTime(c.latestTimestamp)}</p>
  </div>
  </div>
  ))}
  </div>
  </div>

  {/* My Statuses List Modal */}
  <AnimatePresence>
  {showMyList && (
  <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} className="absolute inset-0 bg-white  z-50 flex flex-col shadow-2xl">
  <div className="p-4 flex items-center justify-between border-b border-gray-100  bg-white ">
  <div className="flex items-center gap-3">
  <button onClick={() => setShowMyList(false)} className="text-gray-500  p-1 hover:bg-gray-100  rounded-full transition">{Icons.arrowLeft}</button>
  <h3 className="font-black text-lg text-gray-900 ">My Status Updates</h3>
  </div>
  <button onClick={() => { setShowMyList(false); onOpenCreator(); }} className="text-sm font-bold text-[#E64A19] flex items-center gap-1 px-3 py-1.5 rounded-full hover:bg-orange-50  transition">
  {Icons.plus} Add New
  </button>
  </div>
  <div className="flex-1 overflow-y-auto p-4 space-y-3">
  {myStatuses.map(s => (
  <div key={s.id} onClick={() => { setShowMyList(false); onOpenViewer(user.id); }} className="flex items-center gap-4 p-3 bg-gray-50  rounded-2xl hover:shadow-md cursor-pointer transition group border border-gray-100 ">
  <div className="w-14 h-14 rounded-xl overflow-hidden bg-black flex items-center justify-center shrink-0 relative shadow-inner">
  {s.type === 'text' ? (
  <div className="w-full h-full flex items-center justify-center text-[10px] text-white p-1 text-center font-bold select-none line-clamp-3" style={{ background: s.settings?.bg || '#000', fontFamily: s.settings?.font }}>
  {s.content}
  </div>
  ) : s.type === 'image' ? (
  <img src={s.media_url} className="w-full h-full object-cover" alt="" />
  ) : (
  <video src={s.media_url} className="w-full h-full object-cover" />
  )}
  </div>
  <div className="flex-1 min-w-0">
  <div className="flex items-center justify-between mb-1">
  <span className="font-bold text-sm text-gray-900  truncate">{s.type === 'text' ? s.content : `${s.type.charAt(0).toUpperCase() + s.type.slice(1)} update`}</span>
  <span className="text-[11px] text-gray-400 font-medium">{formatTime(s.timestamp)}</span>
  </div>
  <div className="flex items-center gap-3 text-xs text-gray-500  font-bold">
  <span className="flex items-center gap-1.5 bg-gray-200  px-2.5 py-1 rounded-full text-gray-700 ">
  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>
  {s.views?.length || 0} views
  </span>
  {s.music?.name && <span className="truncate max-w-[120px]">🎵 {s.music.name}</span>}
  </div>
  </div>
  <button onClick={(e) => handleDeleteStatus(s.id, e)} className="p-2.5 text-gray-400 hover:text-red-500 hover:bg-red-50  rounded-full transition opacity-80 group-hover:opacity-100" title="Delete">
  {Icons.trash}
  </button>
  </div>
  ))}
  {myStatuses.length === 0 && (
  <div className="text-center py-16 text-gray-400 font-medium">No active status updates.</div>
  )}
  </div>
  </motion.div>
  )}
  </AnimatePresence>
  </div>
  );
});

// --- Status Creator Component ---
export const StatusCreator = memo(({ user, API_BASE_URL, Icons, onClose, initialMedia, onStatusPosted }) => {
  const [text, setText] = useState('');
  const [bgColors] = useState(['#FF5722', '#673AB7', '#009688', '#1976D2', '#795548', '#455A64', '#000000', '#E91E63', '#9C27B0', '#2E7D32', '#E64A19', '#374151']);
  const [bgIndex, setBgIndex] = useState(0);
  const [fonts] = useState([
  'Inter, sans-serif', 
  '"Comic Sans MS", cursive', 
  'Impact, sans-serif', 
  '"Courier New", monospace',
  '"Playfair Display", serif',
  '"Outfit", sans-serif',
  '"Cinzel", serif',
  '"Bebas Neue", sans-serif'
  ]);
  const [fontIndex, setFontIndex] = useState(0);
  const [mediaFile, setMediaFile] = useState(null);
  const [mediaPreview, setMediaPreview] = useState(null);
  const [uploading, setUploading] = useState(false);
  
  const [musicQuery, setMusicQuery] = useState('');
  const [musicResults, setMusicResults] = useState([]);
  const [selectedMusic, setSelectedMusic] = useState(null);
  const [showMusicSearch, setShowMusicSearch] = useState(false);
  const [playingMusicId, setPlayingMusicId] = useState(null);
  
  const textareaRef = useRef(null);
  const fileInputRef = useRef(null);
  const previewAudioRef = useRef(null);

  useEffect(() => {
  return () => {
  if (previewAudioRef.current) previewAudioRef.current.pause();
  };
  }, []);

  useEffect(() => {
  if (initialMedia && initialMedia.file) {
  const file = initialMedia.file;
  if (file instanceof Blob) {
  setMediaFile(file);
  setMediaPreview(URL.createObjectURL(file));
  } else if (typeof file === 'string') {
  setMediaPreview(file);
  fetch(file).then(r => r.blob()).then(blob => {
  const f = new File([blob], `camera-${Date.now()}.${initialMedia.type === 'video' ? 'mp4' : 'jpg'}`, { type: blob.type });
  setMediaFile(f);
  }).catch(() => {});
  }
  setBgIndex(bgColors.findIndex(c => c === '#000000') || bgColors.length - 1);
  if (initialMedia.music) {
  setSelectedMusic(initialMedia.music);
  }
  }
  }, [initialMedia, bgColors]);

  const handleTextChange = (e) => {
  setText(e.target.value);
  if (textareaRef.current) {
  textareaRef.current.style.height = 'auto';
  textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 240)}px`;
  }
  };

  const getFontSizeClass = (txt) => {
  const len = txt.length;
  if (len < 30) return 'text-4xl md:text-5xl';
  if (len < 65) return 'text-3xl md:text-4xl';
  if (len < 110) return 'text-2xl md:text-3xl';
  if (len < 160) return 'text-xl md:text-2xl';
  return 'text-lg md:text-xl';
  };

  const handleFileChange = (e) => {
  const file = e.target.files[0];
  if (!file) return;
  setMediaFile(file);
  setMediaPreview(URL.createObjectURL(file));
  setBgIndex(bgColors.findIndex(c => c === '#000000') || bgColors.length - 1);
  };

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

  const postStatus = async () => {
  if (!text.trim() && !mediaFile) return;
  setUploading(true);

  try {
  let media_url = null;
  let type = 'text';

  if (mediaFile) {
  const fd = new FormData();
  fd.append("file", mediaFile);
  fd.append("type", mediaFile.type.startsWith("video/") ? "video" : "image");
  const res = await fetch(`${API_BASE_URL}/api/upload`, { method: "POST", body: fd });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error);
  media_url = data.url;
  type = data.type;
  }

  const payload = {
  type,
  content: text,
  media_url,
  music: selectedMusic ? {
  id: selectedMusic.id,
  name: selectedMusic.name,
  artist: selectedMusic.artist_name,
  url: selectedMusic.audio
  } : {},
  settings: { bg: bgColors[bgIndex], font: fonts[fontIndex] }
  };

  const token = localStorage.getItem('token');
  const userId = localStorage.getItem('userId');
  await fetch(`${API_BASE_URL}/api/status`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}`, 'x-user-id': userId },
  body: JSON.stringify(payload)
  });

  if (onStatusPosted) onStatusPosted();
  onClose();
  } catch (err) {
  console.error('Failed to post status', err);
  alert('Failed to post status. Please try again.');
  } finally {
  setUploading(false);
  }
  };

  return (
  <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/95 backdrop-blur-md">
  <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} className="w-full h-full md:max-w-md md:h-[90%] md:rounded-[32px] overflow-hidden relative flex flex-col shadow-2xl border border-white/10" style={{ background: bgColors[bgIndex] }}>
  <div className="p-4 flex justify-between items-center text-white bg-black/20 backdrop-blur-md absolute top-0 left-0 right-0 z-30">
  <button onClick={onClose} className="p-2.5 rounded-full hover:bg-white/20 transition backdrop-blur-sm shadow-sm">{Icons.x}</button>
  <div className="flex gap-1.5 items-center">
  <button onClick={() => setShowMusicSearch(true)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full hover:bg-white/20 transition backdrop-blur-sm shadow-sm text-sm font-bold">
  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>
  Music
  </button>
  <button onClick={() => fileInputRef.current?.click()} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full hover:bg-white/20 transition backdrop-blur-sm shadow-sm text-sm font-bold">
  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
  Media
  </button>
  <input type="file" ref={fileInputRef} accept="image/*,video/*" className="hidden" onChange={handleFileChange} />
  </div>
  </div>

  <div className="flex-1 flex flex-col items-center justify-center relative overflow-hidden z-10 pt-16 pb-32">
  {mediaPreview && (
  <div className="absolute inset-0 flex items-center justify-center bg-black">
  {mediaFile?.type.startsWith('video/') ? (
  <video src={mediaPreview} className="w-full h-full object-contain" autoPlay loop muted playsInline />
  ) : (
  <img src={mediaPreview} className="w-full h-full object-contain" alt="Preview" />
  )}
  </div>
  )}
  
  <textarea 
  ref={textareaRef}
  value={text}
  onChange={handleTextChange}
  placeholder={mediaFile ? "Add a caption..." : "Type a status"}
  className={`w-full bg-transparent border-none outline-none text-white text-center resize-none z-10 transition-all duration-200 placeholder-white/50 ${mediaFile ? 'absolute bottom-24 bg-black/60 p-4 rounded-2xl text-lg backdrop-blur-lg mx-4 w-[calc(100%-2rem)] shadow-xl' : `${getFontSizeClass(text)} px-6`}`}
  style={{ fontFamily: fonts[fontIndex], textShadow: mediaFile ? 'none' : '0 2px 10px rgba(0,0,0,0.3)' }}
  autoFocus={!initialMedia}
  />
  
  {selectedMusic && (
  <div className="absolute top-20 right-4 bg-white/20 backdrop-blur-md rounded-full px-4 py-2 flex items-center gap-2 text-white shadow-lg border border-white/20 animate-fade-in z-20 max-w-[200px]">
  <button onClick={(e) => toggleMusicPreview(e, selectedMusic)} className="w-6 h-6 bg-white/20 rounded-full flex items-center justify-center shrink-0 hover:bg-white/40 transition">
  {playingMusicId === selectedMusic.id ? (
  <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="currentColor" className="text-white"><rect x="6" y="4" width="4" height="16"></rect><rect x="14" y="4" width="4" height="16"></rect></svg>
  ) : (
  <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="currentColor" className="text-white"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>
  )}
  </button>
  <span className="text-xs font-bold truncate tracking-tight">{selectedMusic.name}</span>
  <button onClick={() => { setSelectedMusic(null); if(previewAudioRef.current) previewAudioRef.current.pause(); setPlayingMusicId(null); }} className="ml-1 opacity-70 hover:opacity-100"><svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg></button>
  </div>
  )}
  </div>

  {!mediaFile && (
  <div className="absolute bottom-20 left-0 right-0 px-6 py-4 flex flex-col gap-4 z-20">
  <div className="flex items-center gap-3 overflow-x-auto pb-2 no-scrollbar">
  <span className="text-white/70 text-xs font-bold uppercase tracking-widest shrink-0">Color</span>
  {bgColors.map((color, i) => (
  <button key={color} onClick={() => setBgIndex(i)} className={`w-8 h-8 rounded-full shrink-0 border-2 transition-all ${bgIndex === i ? 'border-white scale-110 shadow-lg' : 'border-transparent opacity-80 hover:opacity-100'}`} style={{ backgroundColor: color }} />
  ))}
  </div>
  <div className="flex items-center gap-3">
  <span className="text-white/70 text-xs font-bold uppercase tracking-widest shrink-0">Font</span>
  <select value={fontIndex} onChange={e => setFontIndex(Number(e.target.value))} className="bg-white/10 text-white border border-white/20 rounded-xl px-4 py-2 outline-none backdrop-blur-md appearance-none font-medium flex-1 cursor-pointer">
  {fonts.map((f, i) => (
  <option key={f} value={i} className="text-black">{f.split(',')[0].replace(/"/g, '')}</option>
  ))}
  </select>
  </div>
  </div>
  )}

  <div className="p-4 flex justify-end bg-gradient-to-t from-black/60 to-transparent absolute bottom-0 left-0 right-0 z-30">
  <button onClick={postStatus} disabled={(!text.trim() && !mediaFile) || uploading} className="w-14 h-14 rounded-full flex items-center justify-center text-white shadow-[0_4px_15px_rgba(0,0,0,0.3)] transition-all active:scale-90 disabled:opacity-50 disabled:active:scale-100" style={{ background: 'var(--safari-green)' }}>
  {uploading ? (
  <svg className="animate-spin h-6 w-6 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
  ) : (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="translate-x-0.5"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
  )}
  </button>
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
  <div key={m.id} onClick={() => { setSelectedMusic(m); setShowMusicSearch(false); if(previewAudioRef.current) previewAudioRef.current.pause(); setPlayingMusicId(null); }} className="flex items-center gap-3 p-3 hover:bg-gray-50  rounded-xl cursor-pointer transition">
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
  </motion.div>
  </div>
  );
});

// --- Status Viewer Component ---
export const StatusViewer = memo(({ user, statuses, targetUserId, contacts, onClose, API_BASE_URL, Icons, onReply, socket }) => {
  const myStatuses = statuses.filter(s => s.user_id === user.id);
  const contactStatuses = statuses.filter(s => s.user_id !== user.id);
  const groupedContacts = contacts.map(c => {
  const userStatuses = contactStatuses.filter(s => s.user_id === c.id);
  const unviewed = userStatuses.some(s => !(s.views || []).some(v => v.userId === user.id));
  return { id: c.id, name: c.name || c.number, avatar_url: c.avatar_url, statuses: userStatuses, unviewed, latestTimestamp: userStatuses.length ? Math.max(...userStatuses.map(s => new Date(s.timestamp).getTime())) : 0 };
  }).filter(c => c.statuses.length > 0).sort((a, b) => b.latestTimestamp - a.latestTimestamp);
  
  const sequence = targetUserId === user.id ? [{ id: user.id, name: 'My Status', avatar_url: user.avatar_url, statuses: myStatuses }, ...groupedContacts] : groupedContacts;
  const initialUserIndex = Math.max(0, sequence.findIndex(g => g.id === targetUserId));
  
  const [currentUserIndex, setCurrentUserIndex] = useState(initialUserIndex);
  const [currentStatusIndex, setCurrentStatusIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [showReceipts, setShowReceipts] = useState(false);
  const [replyText, setReplyText] = useState('');
  const videoRef = useRef(null);
  const audioRef = useRef(null);
  const holdTimeRef = useRef(0);
  const [expandedCaption, setExpandedCaption] = useState(false);

  const activeGroup = sequence[currentUserIndex];
  const userStatusesList = activeGroup?.statuses || [];
  const currentStatus = userStatusesList[currentStatusIndex];
  const isOwn = currentStatus?.user_id === user.id;

  // Calculate initial status index when user changes (resume where left off)
  useEffect(() => {
  const activeG = sequence[currentUserIndex];
  const list = activeG?.statuses || [];
  const firstUnviewed = list.findIndex(s => !(s.views || []).some(v => v.userId === user.id));
  setCurrentStatusIndex(firstUnviewed !== -1 ? firstUnviewed : 0);
  }, [currentUserIndex]);

  useEffect(() => {
  if (!currentStatus) return;
  if (!isOwn) {
  const token = localStorage.getItem('token');
  const userId = localStorage.getItem('userId');
  fetch(`${API_BASE_URL}/api/status/${currentStatus.id}/view`, {
  method: 'POST',
  headers: { 'Authorization': `Bearer ${token}`, 'x-user-id': userId }
  }).catch(e => console.error(e));
  }
  setProgress(0);
  setExpandedCaption(false);
  if (currentStatus.type === 'video' && videoRef.current) {
  videoRef.current.currentTime = 0;
  videoRef.current.play().catch(()=>{});
  }
  if (currentStatus.music?.url && audioRef.current) {
  audioRef.current.src = currentStatus.music.url;
  audioRef.current.load();
  audioRef.current.play().catch(()=>{});
  } else if (audioRef.current) {
  audioRef.current.pause();
  audioRef.current.src = '';
  }
  }, [currentStatusIndex, currentUserIndex, currentStatus, isOwn, API_BASE_URL]);

  useEffect(() => {
  if (isPaused || showReceipts || expandedCaption || !currentStatus) return;
  
  const isVideo = currentStatus.type === 'video';
  const duration = 30000;
  
  const interval = setInterval(() => {
  if (isVideo && videoRef.current) {
  if (videoRef.current.duration) {
  setProgress((videoRef.current.currentTime / videoRef.current.duration) * 100);
  }
  } else {
  setProgress(p => {
  if (p >= 100) {
  goToNextStatus();
  return 0;
  }
  return p + (100 / (duration / 50)); 
  });
  }
  }, 50);

  return () => clearInterval(interval);
  }, [currentStatusIndex, currentUserIndex, isPaused, showReceipts, currentStatus]);

  const goToNextStatus = () => {
  if (currentStatusIndex < userStatusesList.length - 1) {
  setCurrentStatusIndex(c => c + 1);
  } else {
  goToNextUser();
  }
  };

  const goToPrevStatus = () => {
  if (currentStatusIndex > 0) {
  setCurrentStatusIndex(c => c - 1);
  } else {
  goToPrevUser();
  }
  };

  const goToNextUser = () => {
  if (currentUserIndex < sequence.length - 1) {
  setCurrentUserIndex(c => c + 1);
  } else {
  onClose();
  }
  };

  const goToPrevUser = () => {
  if (currentUserIndex > 0) {
  setCurrentUserIndex(c => c - 1);
  }
  };

  const handleTap = (e) => {
  if (showReceipts) return;
  if (Date.now() - holdTimeRef.current > 200) return;
  const x = e.clientX;
  if (x < window.innerWidth * 0.3) goToPrevStatus();
  else goToNextStatus();
  };

  const [touchStart, setTouchStart] = useState(null);
  const handleTouchStart = (e) => {
  holdTimeRef.current = Date.now();
  setIsPaused(true);
  setTouchStart(e.touches[0].clientX);
  };
  const handleTouchEnd = (e) => {
  setIsPaused(false);
  if (!touchStart) return;
  const touchEnd = e.changedTouches[0].clientX;
  const delta = touchStart - touchEnd;
  if (Math.abs(delta) > 50) {
  if (delta > 0) goToNextUser();
  else goToPrevUser();
  setTouchStart(null);
  } else {
  setTouchStart(null);
  }
  };

  const sendReply = () => {
  if (!replyText.trim()) return;
  if (socket && currentStatus) {
  socket.emit('send-message', {
  toUserId: currentStatus.user_id,
  message: {
  text: replyText,
  quotedStatus: {
  id: currentStatus.id,
  type: currentStatus.type,
  content: currentStatus.content,
  media_url: currentStatus.media_url,
  timestamp: currentStatus.timestamp
  }
  }
  });
  alert('Reply sent');
  }
  setReplyText('');
  };

  if (!currentStatus) return null;

  return (
  <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/95 backdrop-blur-md">
  <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} className="w-full h-full md:max-w-md md:h-[95%] md:rounded-[32px] overflow-hidden relative flex flex-col bg-black shadow-2xl border border-white/10">
  <div className="absolute top-3 left-3 right-3 flex gap-1.5 z-40 drop-shadow-md">
  {userStatusesList.map((s, i) => (
  <div key={s.id} className="flex-1 h-1 bg-white/30 rounded-full overflow-hidden">
  <div className="h-full bg-white transition-all duration-75 ease-linear" style={{ width: i < currentStatusIndex ? '100%' : i === currentStatusIndex ? `${progress}%` : '0%' }} />
  </div>
  ))}
  </div>

  <div className="absolute top-7 left-3 right-3 flex items-center justify-between z-40 drop-shadow-md">
  <div className="flex items-center gap-3">
  <button onClick={onClose} className="text-white p-1 hover:bg-white/20 rounded-full transition-colors backdrop-blur-sm">{Icons.arrowLeft}</button>
  <img src={activeGroup.avatar_url || DEFAULT_AVATAR} alt="avatar" className="w-[44px] h-[44px] rounded-full object-cover border border-white/20 shadow-sm" />
  <div className="flex flex-col">
  <span className="text-white font-bold text-[16px] leading-tight drop-shadow-md tracking-tight">{activeGroup.name}</span>
  <span className="text-white/80 text-[12px] font-medium drop-shadow-md">{new Date(currentStatus.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
  </div>
  </div>
  </div>

  <div 
  className="flex-1 flex flex-col items-center justify-center relative overflow-hidden"
  style={{ background: currentStatus.settings?.bg || '#000' }}
  onPointerDown={(e) => { 
  if (e.pointerType === 'mouse') { holdTimeRef.current = Date.now(); setIsPaused(true); } 
  }}
  onPointerUp={(e) => { if (e.pointerType === 'mouse') setIsPaused(false); }}
  onPointerLeave={() => setIsPaused(false)}
  onTouchStart={handleTouchStart}
  onTouchEnd={handleTouchEnd}
  onClick={handleTap}
  >
  {currentStatus.type === 'text' && (
  <div className="text-white text-center whitespace-pre-wrap px-8 select-none z-10 w-full" style={{ fontSize: '2.5rem', fontFamily: currentStatus.settings?.font, lineHeight: '1.2' }}>
  {currentStatus.content}
  </div>
  )}
  {currentStatus.type === 'image' && (
  <img src={currentStatus.media_url} className="w-full h-full object-contain select-none z-10" alt="Status" draggable={false} />
  )}
  {currentStatus.type === 'video' && (
  <video 
  ref={videoRef}
  src={currentStatus.media_url} 
  className="w-full h-full object-contain z-10" 
  autoPlay 
  playsInline
  onEnded={goToNextStatus}
  onPause={() => setIsPaused(true)}
  onPlay={() => setIsPaused(false)}
  />
  )}
  
  {currentStatus.music?.url && (
  <div className="absolute top-24 right-4 bg-black/50 backdrop-blur-xl rounded-2xl px-4 py-2.5 flex items-center gap-3 text-white shadow-xl border border-white/10 z-20 max-w-[220px]">
  <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center shrink-0 animate-[spin_3s_linear_infinite]">
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="3"/></svg>
  </div>
  <div className="overflow-hidden flex-1">
  <div className="text-xs font-bold truncate">{currentStatus.music.name}</div>
  {currentStatus.music.artist && <div className="text-[10px] text-white/60 truncate">{currentStatus.music.artist}</div>}
  </div>
  <audio ref={audioRef} preload="auto" />
  </div>
  )}

  {(currentStatus.type === 'image' || currentStatus.type === 'video') && currentStatus.content && (
  <div className="absolute bottom-[90px] left-0 right-0 p-4 flex justify-center z-20">
  <span 
  onClick={(e) => { 
  e.stopPropagation(); 
  const nextState = !expandedCaption;
  setExpandedCaption(nextState); 
  if (nextState) {
  setIsPaused(true);
  if (videoRef.current) videoRef.current.pause();
  } else {
  setIsPaused(false);
  if (videoRef.current) videoRef.current.play().catch(()=>{});
  }
  }}
  className={`bg-black/60 text-white px-5 py-2.5 rounded-2xl text-[16px] font-medium backdrop-blur-md shadow-xl max-w-[90%] border border-white/10 cursor-pointer ${expandedCaption ? 'whitespace-pre-wrap max-h-[50vh] overflow-y-auto' : 'truncate'}`}
  >
  {currentStatus.content}
  </span>
  </div>
  )}

  {/* Desktop Navigation Buttons */}
  <button onClick={(e) => { e.stopPropagation(); goToPrevStatus(); }} className="hidden md:flex absolute left-4 top-1/2 -translate-y-1/2 w-12 h-12 bg-black/30 hover:bg-black/50 backdrop-blur-md rounded-full items-center justify-center text-white transition-colors z-50">
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6"/></svg>
  </button>
  <button onClick={(e) => { e.stopPropagation(); goToNextStatus(); }} className="hidden md:flex absolute right-4 top-1/2 -translate-y-1/2 w-12 h-12 bg-black/30 hover:bg-black/50 backdrop-blur-md rounded-full items-center justify-center text-white transition-colors z-50">
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18l6-6-6-6"/></svg>
  </button>
  </div>

  {!isOwn && (
  <div className="absolute bottom-0 left-0 right-0 z-40 pb-5 px-4 pt-16 bg-gradient-to-t from-black/80 via-black/40 to-transparent" onClick={e => e.stopPropagation()} onPointerDown={e => e.stopPropagation()} onPointerUp={e => e.stopPropagation()} onTouchStart={e => e.stopPropagation()} onTouchEnd={e => e.stopPropagation()}>
  <div className="flex gap-2.5">
  <input value={replyText} onChange={e => setReplyText(e.target.value)} onKeyDown={e => e.key === 'Enter' && sendReply()} onFocus={() => setIsPaused(true)} onBlur={() => setIsPaused(false)} placeholder="Reply..." className="flex-1 bg-black/50 text-white border border-white/20 rounded-full px-5 py-3 outline-none backdrop-blur-md placeholder-white/60 focus:border-white/80 transition-colors shadow-2xl text-[15px] font-medium" />
  <button onClick={sendReply} className="w-[48px] h-[48px] rounded-full flex items-center justify-center text-white shrink-0 shadow-2xl transition-transform active:scale-95 border border-white/10" style={{ background: 'var(--safari-green)' }}>
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="translate-x-0.5"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
  </button>
  </div>
  </div>
  )}

  {isOwn && (
  <div className="absolute bottom-8 left-0 right-0 flex justify-center z-40 pointer-events-none">
  <button onClick={() => setShowReceipts(true)} className="pointer-events-auto bg-black/70 text-white rounded-full px-6 py-3 flex items-center gap-2 backdrop-blur-xl shadow-2xl font-bold border border-white/20 transition-transform active:scale-95 tracking-wide">
  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>
  {currentStatus.views?.length || 0}
  </button>
  </div>
  )}

  <AnimatePresence>
  {showReceipts && (
  <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ type: 'spring', damping: 25, stiffness: 200 }} className="absolute bottom-0 left-0 right-0 h-[65%] bg-white  rounded-t-[32px] z-50 shadow-[0_-20px_50px_rgba(0,0,0,0.5)] flex flex-col">
  <div className="flex justify-center py-4">
  <div className="w-12 h-1.5 bg-gray-300  rounded-full" />
  </div>
  <div className="px-6 py-2 flex justify-between items-center">
  <h3 className="font-black text-gray-900  text-[20px] tracking-tight">Viewed by {currentStatus.views?.length || 0}</h3>
  <button onClick={() => setShowReceipts(false)} className="text-gray-500 hover:bg-gray-100  p-2.5 rounded-full transition-colors bg-gray-50 ">{Icons.x}</button>
  </div>
  <div className="flex-1 overflow-y-auto px-4 py-2 pb-6">
  {(currentStatus.views || []).map((v, i) => (
  <div key={v.userId + i} className="flex items-center gap-4 py-3 border-b border-gray-100  last:border-0">
  <img src={v.avatar || DEFAULT_AVATAR} className="w-12 h-12 rounded-full object-cover border border-gray-200 " />
  <div className="flex-1">
  <div className="font-bold text-[16px] text-gray-900  leading-tight">{v.name}</div>
  <div className="text-[13px] text-gray-500  font-medium mt-1">{new Date(v.viewedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
  </div>
  </div>
  ))}
  {(currentStatus.views || []).length === 0 && (
  <p className="text-center text-gray-400 font-medium py-12">No views yet.</p>
  )}
  </div>
  </motion.div>
  )}
  </AnimatePresence>
  </motion.div>
  </div>
  );
});
