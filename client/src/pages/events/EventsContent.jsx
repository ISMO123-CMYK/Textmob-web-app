import { useState, useEffect } from 'react';
import { apiFetch } from '../../config/api';
import { cn } from '../../utils/classNames';

export default function EventsContent() {
 const [events, setEvents] = useState([]);
 const [activeId, setActiveId] = useState(null);
 const [loading, setLoading] = useState(true);
 const username = localStorage.getItem('currentUser') || '';

 useEffect(() => {
 apiFetch(`/events-feed?username=${encodeURIComponent(username)}`)
 .then(r => r.ok ? r.json() : {})
 .then(d => {
 setEvents(d.events || []);
 setLoading(false);
 })
 .catch(() => setLoading(false));
 }, [username]);

 const toggleAccordion = (id) => {
 setActiveId(prev => prev === id ? null : id);
 };

 async function handleLike(eventId) {
 const currentUser = localStorage.getItem('currentUser') || '';
 setEvents(prev => prev.map(ev => {
 if (ev.id !== eventId || new Date(ev.scheduled_for) <= new Date()) {
 return ev;
 }
 const hasLiked = (ev.likes || []).includes(currentUser);
 return {
 ...ev,
 likes: hasLiked
 ? ev.likes.filter(u => u !== currentUser)
 : [...(ev.likes || []), currentUser]
 };
 }));

  const url = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') ? 'http://localhost:5000/like-post' : 'https://asilfcismail.onrender.com/like-post';
  fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ postId: eventId, username: currentUser }), keepalive: true }).catch(() => {});
 }

 if (loading) {
 return (
 <div className="p-6 space-y-3">
 {[1, 2, 3].map(i => (
 <div key={i} className="h-20 bg-gray-50 rounded-lg animate-pulse" />
 ))}
 </div>
 );
 }

 return (
 <div className="min-h-screen bg-white md:bg-[#F7F8FC] pb-24 md:pb-8">
 {/* Header */}
 <div className="sticky top-0 md:static z-10 max-w-5xl mx-auto md:mt-8 bg-white md:rounded-2xl md:border md:border-[#E7EAF2] md:shadow-sm border-b border-gray-100 md:border-b-0 px-4 md:px-8 py-4 md:py-6 flex items-center justify-between">
 <div>
 <h1 className="text-sm md:text-2xl font-extrabold text-gray-900 leading-none tracking-tight">Events</h1>
 <p className="text-xs md:text-sm text-gray-500 mt-1">Explore community meetups and events</p>
 </div>
 <a
 href="/events/new"
 data-lexum
 className="px-4 md:px-5 py-2.5 bg-brand-600 hover:bg-brand-700 text-white text-xs md:text-sm font-bold rounded-xl transition-all duration-150 active:scale-95 shadow-sm shadow-brand-500/20"
 >
 + Create
 </a>
 </div>

 {/* Events list */}
 {events.length > 0 ? (
 <div className="max-w-5xl mx-auto px-4 md:px-0 mt-4 md:mt-6 grid grid-cols-1 lg:grid-cols-2 gap-4">
 <div className="lg:col-span-2 px-4 py-3 rounded-xl border border-[#E7EAF2] bg-white text-gray-500">
 <p className="text-[11px] font-bold uppercase tracking-widest text-gray-400 ">
 Events · {events.length}
 </p>
 </div>
 {events.map(ev => {
 const ended = new Date(ev.scheduled_for) <= new Date();
 const liked = (ev.likes || []).includes(username);
 const open = activeId === ev.id;
 const dateStr = new Date(ev.scheduled_for).toLocaleString(undefined, {
 weekday: 'short',
 month: 'short',
 day: 'numeric',
 hour: '2-digit',
 minute: '2-digit'
 });

 return (
 <div className="rounded-2xl border border-[#E7EAF2] bg-white shadow-sm hover:shadow-md overflow-hidden transition-shadow" key={ev.id}>
 <button
 onClick={() => toggleAccordion(ev.id)}
 className="w-full flex items-start justify-between px-5 py-5 md:px-6 md:py-6 text-left hover:bg-[#FAFBFE] transition-colors"
 >
 <div className="flex-1 min-w-0 pr-3">
 <div className="inline-flex items-center gap-1 text-[11px] font-semibold text-brand-600 bg-brand-50 px-2 py-0.5 rounded-full mb-1.5">
 <svg viewBox="0 0 24 24" className="w-3 h-3 fill-none stroke-current" strokeWidth="2">
 <rect x="3" y="4" width="18" height="18" rx="2" />
 <line x1="3" y1="10" x2="21" y2="10" />
 <line x1="8" y1="2" x2="8" y2="6" />
 <line x1="16" y1="2" x2="16" y2="6" />
 </svg>
 {dateStr}
 {ended && <span className="font-normal text-gray-400 ml-1">· Ended</span>}
 </div>
 <p className="text-sm font-bold text-gray-900 truncate">{ev.title || ev.text}</p>
 <p className="text-xs text-gray-400 mt-0.5">
 by{' '}
 <span
 onClick={(t) => {
 t.stopPropagation();
 window.Lexum?.navigate(`/@${ev.username}`);
 }}
 className="text-brand-600 hover:underline cursor-pointer font-semibold"
 >
 @{ev.username}
 </span>
 </p>
 </div>
 <svg
 viewBox="0 0 24 24"
 className={cn(
 "w-4 h-4 text-gray-400 flex-shrink-0 mt-1 fill-none stroke-current transition-transform duration-200",
 open ? "rotate-180" : ""
 )}
 strokeWidth="2"
 >
 <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
 </svg>
 </button>

 {open && (
 <div className="px-5 md:px-6 pb-5 md:pb-6 space-y-3 border-t border-[#EEF0F5] pt-4">
 {ev.text && (
 <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-wrap">{ev.text}</p>
 )}
 {ev.location && (
 <div className="flex items-center gap-1.5 text-xs text-gray-500 ">
 <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 fill-none stroke-current flex-shrink-0" strokeWidth="2">
 <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0zM19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
 </svg>
 {ev.location}
 </div>
 )}
 {ev.registration_url && (
 <a
 href={ev.registration_url}
 target="_blank"
 rel="noreferrer"
 className="inline-flex items-center gap-1.5 text-xs font-semibold text-brand-600 hover:underline"
 >
 <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 fill-none stroke-current" strokeWidth="2">
 <path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
 </svg>
 Register / Learn more
 </a>
 )}
 <div>
 <button
 onClick={() => handleLike(ev.id)}
 disabled={ended}
 className={cn(
 "inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold transition-colors",
 liked
 ? "bg-brand-600 text-white"
 : ended
 ? "bg-gray-100 text-gray-400 cursor-default"
 : "bg-brand-50 text-brand-600 hover:bg-brand-100"
 )}
 >
 <svg viewBox="0 0 24 24" className={cn("w-4 h-4", liked ? "fill-white" : "fill-none stroke-current")} strokeWidth="2">
 <path strokeLinecap="round" strokeLinejoin="round" d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
 </svg>
 {ended ? `${(ev.likes || []).length} attended` : liked ? `${(ev.likes || []).length} interested · remove` : `${(ev.likes || []).length} interested`}
 </button>
 </div>
 </div>
 )}
 </div>
 );
 })}
 </div>
 ) : (
 <div className="max-w-5xl mx-auto mt-6 px-4 py-20 rounded-2xl border border-dashed border-[#D9DEEA] bg-white text-center text-sm text-gray-400 ">
 No upcoming events.
 </div>
 )}
 </div>
 );
}
