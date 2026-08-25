import { useEffect } from 'react';

export default function AuthPromptModal({ show, message, onCancel, onLogin }) {
 useEffect(() => {
 const handler = (e) => { if (e.key === 'Escape') onCancel?.(); };
 if (show) {
 window.addEventListener('keydown', handler);
 return () => window.removeEventListener('keydown', handler);
 }
 }, [show, onCancel]);

 if (!show) return null;

 return (
 <div className="fixed inset-0 bg-black/40 z-[9999] flex items-end justify-center md:items-center p-4" onClick={onCancel}>
 <div className="bg-white rounded-2xl w-full max-w-sm p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
 <div className="flex items-center justify-center w-12 h-12 rounded-2xl bg-blue-50 mb-4 mx-auto">
 <svg viewBox="0 0 24 24" className="w-6 h-6 text-blue-600 fill-none stroke-current" strokeWidth="1.5">
 <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
 </svg>
 </div>
 <p className="text-center text-sm font-bold text-gray-900 mb-1">Log in to continue</p>
 <p className="text-center text-xs text-gray-500 mb-6">{message || 'You need to be logged in to do that.'}</p>
 <div className="flex flex-col gap-2">
 <button
 onClick={onLogin}
 className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 active:scale-[0.97] text-white text-sm font-bold transition-all"
 >
 Log in
 </button>
 <button
 onClick={onCancel}
 className="w-full py-2.5 rounded-xl bg-gray-100 hover:bg-gray-200 active:scale-[0.97] text-gray-700 text-sm font-semibold transition-all"
 >
 Cancel
 </button>
 </div>
 </div>
 </div>
 );
}