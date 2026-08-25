import { useState } from 'react';
import { apiFetch } from '../../config/api';

export default function CoverPhotoEditor({ username, currentCover, onSaved, onRemove }) {
 const [saving, setSaving] = useState(false);

 async function handleFileChange(e) {
 const file = e.target.files?.[0];
 if (!file) return;
 setSaving(true);
 const formData = new FormData();
 formData.append('coverPhoto', file, file.name);
 try {
 const res = await apiFetch(`/profile/${encodeURIComponent(username)}/cover-photo`, {
 method: 'POST',
 body: formData,
 });
 const data = await res.json();
 if (data?.cover_photo) {
 onSaved?.(data.cover_photo);
 }
 } catch (e) {
 console.error('Cover upload failed', e);
 }
 setSaving(false);
 e.target.value = '';
 }

 async function handleRemove() {
 try {
 await apiFetch(`/profile/${encodeURIComponent(username)}/cover-photo/remove`, { method: 'POST' });
 onRemove?.();
 } catch (e) {
 console.error('Cover remove failed', e);
 }
 }

 return (
 <div className="flex items-center gap-2">
 <label className="cursor-pointer">
 <input type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
 <span className="inline-flex items-center gap-1.5 h-8 px-3 rounded-xl bg-gray-100 text-[11px] font-bold text-gray-700 hover:bg-gray-200 transition-colors 
 <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 fill-none stroke-current" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
 <path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z" />
 <circle cx="12" cy="13" r="4" />
 </svg>
 {saving ? 'Uploading...' : 'Cover photo'}
 </span>
 </label>
 {currentCover && (
 <button onClick={handleRemove} className="h-8 px-3 rounded-xl border border-red-200 text-[11px] font-bold text-red-500 hover:bg-red-50 transition-colors 
 Remove
 </button>
 )}
 </div>
 );
}
