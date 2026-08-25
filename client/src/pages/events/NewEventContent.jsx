import { useState } from 'react';
import { apiFetch } from '../../config/api';
import { cn } from '../../utils/classNames';

export default function NewEventContent() {
 const [title, setTitle] = useState('');
 const [text, setText] = useState('');
 const [date, setDate] = useState('');
 const [time, setTime] = useState('');
 const [location, setLocation] = useState('');
 const [registrationUrl, setRegistrationUrl] = useState('');
 const [posting, setPosting] = useState(false);
 const [error, setError] = useState('');

 const isValid = title.trim() && date && time && text.trim();
 const today = new Date().toISOString().split('T')[0];

 const handleSubmit = async (e) => {
 e.preventDefault();
 if (!isValid || posting) return;

 setError('');
 setPosting(true);

 try {
 const res = await apiFetch('/events', {
 method: 'POST',
 headers: {
 'Content-Type': 'application/json'
 },
 body: JSON.stringify({
 username: localStorage.getItem('currentUser') || '',
 title: title.trim(),
 text: text.trim(),
 scheduled_for: `${date}T${time}`,
 location: location.trim() || null,
 registration_url: registrationUrl.trim() || null,
 visib: 'public'
 })
 });

 if (res.ok) {
 window.Lexum?.navigate('/events');
 } else {
 const errData = await res.json().catch(() => ({}));
 throw new Error(errData?.error || 'Something went wrong.');
 }
 } catch (err) {
 setError(err?.message || 'Something went wrong.');
 setPosting(false);
 }
 };

 const inputClass = 'w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-100 transition-all';

 return (
 <div className="min-h-screen bg-white pb-24 md:pb-8">
 {/* Header */}
 <div className="sticky top-0 z-10 bg-white/95 backdrop-blur-md border-b border-gray-100 px-4 py-4 flex items-center gap-3">
 <button
 type="button"
 onClick={() => window.history.back()}
 className="w-8 h-8 rounded-full flex items-center justify-center text-gray-400 hover:bg-gray-100 transition-colors flex-shrink-0"
 aria-label="Go back"
 >
 <svg viewBox="0 0 24 24" className="w-4 h-4 fill-none stroke-current" strokeWidth="2.5">
 <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
 </svg>
 </button>
 <div>
 <p className="text-sm font-bold text-gray-900 leading-none">Create event</p>
 <p className="text-xs text-gray-400 mt-0.5">Events are public · visible to everyone</p>
 </div>
 </div>

 {/* Form */}
 <form onSubmit={handleSubmit} className="max-w-2xl mx-auto px-4 pt-5 space-y-5">
 {/* Title */}
 <div className="space-y-1.5">
 <label className="text-xs font-bold uppercase tracking-widest text-gray-400 ">
 Event title <span className="text-red-400 normal-case tracking-normal">*</span>
 </label>
 <input
 type="text"
 value={title}
 onChange={(e) => setTitle(e.target.value)}
 placeholder="e.g. Textmob Lagos Meetup"
 maxLength={120}
 required
 className={inputClass}
 />
 {title.length > 80 && (
 <p className="text-[11px] text-gray-400 text-right">{title.length}/120</p>
 )}
 </div>

 {/* Description */}
 <div className="space-y-1.5">
 <label className="text-xs font-bold uppercase tracking-widest text-gray-400 ">
 Description <span className="text-red-400 normal-case tracking-normal">*</span>
 </label>
 <textarea
 value={text}
 onChange={(e) => setText(e.target.value)}
 rows={4}
 placeholder="Tell people what to expect…"
 required
 className={cn(inputClass, 'resize-none rounded-2xl')}
 />
 </div>

 {/* Date & Time */}
 <div className="grid grid-cols-2 gap-3">
 <div className="space-y-1.5">
 <label className="text-xs font-bold uppercase tracking-widest text-gray-400 ">
 Date <span className="text-red-400 normal-case tracking-normal">*</span>
 </label>
 <input
 type="date"
 value={date}
 min={today}
 onChange={(e) => setDate(e.target.value)}
 required
 className={inputClass}
 />
 </div>
 <div className="space-y-1.5">
 <label className="text-xs font-bold uppercase tracking-widest text-gray-400 ">
 Time <span className="text-red-400 normal-case tracking-normal">*</span>
 </label>
 <input
 type="time"
 value={time}
 onChange={(e) => setTime(e.target.value)}
 required
 className={inputClass}
 />
 </div>
 </div>

 {/* Location */}
 <div className="space-y-1.5">
 <label className="text-xs font-bold uppercase tracking-widest text-gray-400 ">
 Location<span className="ml-1.5 normal-case tracking-normal text-[11px] font-normal text-gray-400 ">optional</span>
 </label>
 <div className="relative">
 <svg viewBox="0 0 24 24" className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 fill-none stroke-current pointer-events-none" strokeWidth="2">
 <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0zM19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
 </svg>
 <input
 type="text"
 value={location}
 onChange={(e) => setLocation(e.target.value)}
 placeholder="Lagos Tech Hub, Online…"
 className={cn(inputClass, 'pl-10')}
 />
 </div>
 </div>

 {/* Website / Registration Link */}
 <div className="space-y-1.5">
 <label className="text-xs font-bold uppercase tracking-widest text-gray-400 ">
 Website / Registration link<span className="ml-1.5 normal-case tracking-normal text-[11px] font-normal text-gray-400 ">optional</span>
 </label>
 <div className="relative">
 <svg viewBox="0 0 24 24" className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 fill-none stroke-current pointer-events-none" strokeWidth="2">
 <path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
 </svg>
 <input
 type="url"
 value={registrationUrl}
 onChange={(e) => setRegistrationUrl(e.target.value)}
 placeholder="https://"
 className={cn(inputClass, 'pl-10')}
 />
 </div>
 </div>

 {/* Preview */}
 {(title.trim() || date) && (
 <div className="rounded-2xl border border-gray-100 overflow-hidden">
 <div className="h-[3px] bg-gradient-to-r from-blue-500 via-indigo-500 to-violet-500" />
 <div className="p-4">
 <p className="text-[11px] font-bold uppercase tracking-widest text-gray-400 mb-2">Preview</p>
 {date && time && (
 <div className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-600 bg-blue-50 px-2.5 py-1 rounded-full mb-2">
 <svg viewBox="0 0 24 24" className="w-3 h-3 fill-none stroke-current" strokeWidth="2">
 <rect x="3" y="4" width="18" height="18" rx="2" />
 <line x1="3" y1="10" x2="21" y2="10" />
 <line x1="8" y1="2" x2="8" y2="6" />
 <line x1="16" y1="2" x2="16" y2="6" />
 </svg>
 {new Date(`${date}T${time}`).toLocaleString(undefined, {
 weekday: 'short',
 month: 'short',
 day: 'numeric',
 hour: '2-digit',
 minute: '2-digit'
 })}
 </div>
 )}
 {title.trim() && (
 <p className="text-sm font-bold text-gray-900 leading-snug">{title.trim()}</p>
 )}
 {location.trim() && (
 <p className="text-xs text-gray-400 mt-1 flex items-center gap-1">
 <svg viewBox="0 0 24 24" className="w-3 h-3 fill-none stroke-current flex-shrink-0" strokeWidth="2">
 <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0zM19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
 </svg>
 {location.trim()}
 </p>
 )}
 </div>
 </div>
 )}

 {/* Error */}
 {error && (
 <p className="text-xs text-red-500 text-center">{error}</p>
 )}

 {/* Submit */}
 <div className="pt-2 pb-4">
 <button
 type="submit"
 disabled={!isValid || posting}
 className={cn(
 'w-full py-3.5 rounded-full text-sm font-bold transition-colors',
 isValid && !posting
 ? 'bg-blue-600 text-white hover:bg-blue-700 active:scale-[0.98]'
 : 'bg-gray-100 text-gray-300 cursor-not-allowed'
 )}
 >
 {posting ? 'Creating…' : 'Create event'}
 </button>
 </div>
 </form>
 </div>
 );
}
