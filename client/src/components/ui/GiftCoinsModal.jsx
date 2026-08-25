import { useState, useEffect } from 'react';
import { apiFetch } from '../../config/api';
import { cn } from '../../utils/classNames';

const COIN_PACKS = [
 { label: '5', value: 5 },
 { label: '10', value: 10 },
 { label: '25', value: 25 },
 { label: '50', value: 50 },
 { label: '100', value: 100 },
 { label: '200', value: 200 },
 { label: '500', value: 500 },
 { label: '1000', value: 1000 }
];

function getAvatarInitials(fullname, username) {
 const fallback = username || '?';
 if (!fullname) return fallback[0].toUpperCase();
 const parts = fullname.trim().split(' ');
 return (parts.length > 1 ? parts[0][0] + parts[parts.length - 1][0] : parts[0][0]).toUpperCase();
}

export default function GiftCoinsModal({ open, onClose, recipientUsername, recipientAvatar, recipientFullname, postId }) {
 const [amount, setAmount] = useState('');
 const [sending, setSending] = useState(false);
 const [status, setStatus] = useState(null);
 const [balance, setBalance] = useState(null);

 useEffect(() => {
 if (open) {
 setAmount('');
 setStatus(null);
 setSending(false);
 fetchBalance();
 }
 }, [open]);

 async function fetchBalance() {
 const userId = localStorage.currentUser;
 if (!userId) return;
 try {
 const res = await apiFetch(`/t/wallet?userId=${encodeURIComponent(userId)}`);
 if (res.ok) {
 const data = await res.json();
 setBalance(data.mobcoins ?? 0);
 }
 } catch {}
 }

 function handlePackClick(value) {
 setAmount(String(value));
 setStatus(null);
 }

 async function handleSend() {
 setStatus(null);
 const numAmount = parseInt(amount, 10);
 const currentUsername = localStorage.currentUser || localStorage.getItem('currentUser');

 if (!recipientUsername) return setStatus({ error: 'Invalid recipient.' });
 if (!numAmount || numAmount <= 0) return setStatus({ error: 'Enter a valid amount.' });
 if (!currentUsername) return setStatus({ error: 'Sign in to send.' });
 if (currentUsername === recipientUsername) return setStatus({ error: 'Cannot send to yourself.' });
 if (balance !== null && numAmount > balance) return setStatus({ error: 'Insufficient Mobcoins.' });

 setSending(true);
 try {
 const res = await apiFetch('/t/send-mobcoins', {
 method: 'POST',
 headers: { 'Content-Type': 'application/json' },
 body: JSON.stringify({
 fromId: currentUsername,
 toIds: [recipientUsername],
 amount: numAmount,
 postId: postId || null
 })
 });
 const data = await res.json().catch(() => null);
 if (!res.ok || !data?.success) {
 return setStatus({ error: data?.error || 'Failed to send.' });
 }
 setStatus({ success: data.message || 'Sent successfully!' });
 setBalance(prev => (prev !== null ? prev - numAmount : null));
 setTimeout(() => onClose(), 1500);
 } catch {
 setStatus({ error: 'Network error.' });
 } finally {
 setSending(false);
 }
 }

 if (!open) return null;

 return (
 <>
 <div className="fixed inset-0 bg-black/40 z-40" onClick={onClose} style={{ backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)' }} />
 <div
 className={cn(
 'fixed bottom-0 left-0 right-0 bg-white rounded-t-3xl z-50 flex flex-col',
 'md:inset-0 md:m-auto md:rounded-2xl md:max-w-sm md:h-fit md:border md:border-gray-100 md:shadow-2xl'
 )}
 >
 <div className="md:hidden flex justify-center pt-2.5 pb-1">
 <div className="w-8 h-1 rounded-full bg-gray-200 " />
 </div>

 {/* Header */}
 <div className="flex items-center justify-between px-5 pt-3 pb-3 border-b border-gray-100 ">
 <h3 className="text-sm font-black text-gray-900 ">Gift Mobcoins</h3>
 <button
 onClick={onClose}
 className="w-8 h-8 rounded-full flex items-center justify-center text-gray-400 hover:bg-gray-100 transition-colors"
 >
 <svg viewBox="0 0 24 24" className="w-4 h-4 fill-none stroke-current" strokeWidth="2.5">
 <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
 </svg>
 </button>
 </div>

 {/* Recipient info */}
 <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-50 bg-gray-50/50 ">
 <div className="w-10 h-10 rounded-full overflow-hidden bg-blue-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
 {recipientAvatar ? (
 <img src={recipientAvatar} alt="" className="w-full h-full object-cover" />
 ) : (
 getAvatarInitials(recipientFullname, recipientUsername)
 )}
 </div>
 <div className="flex-1">
 <p className="text-xs font-bold text-gray-900 ">{recipientFullname || recipientUsername}</p>
 <p className="text-[11px] font-mono text-gray-400 mt-0.5">@{recipientUsername}</p>
 </div>
 {balance !== null && (
 <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full bg-amber-50 border border-amber-100 ">
 <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 text-amber-500 fill-current">
 <path d="M9.375 3a1.875 1.875 0 0 0 0 3.75h1.875v4.5H3.375A1.875 1.875 0 0 1 1.5 9.375v-.75c0-1.036.84-1.875 1.875-1.875h3.193A3.375 3.375 0 0 1 12 2.753a3.375 3.375 0 0 1 5.432 3.997h3.943c1.035 0 1.875.84 1.875 1.875v.75c0 1.036-.84 1.875-1.875 1.875H12.75v-4.5h1.875a1.875 1.875 0 1 0-1.875-1.875V6.75h-1.5V4.875C11.25 3.839 10.41 3 9.375 3ZM11.25 12.75H3v6.75a2.25 2.25 0 0 0 2.25 2.25h6v-9ZM12.75 12.75v9h6.75a2.25 2.25 0 0 0 2.25-2.25v-6.75h-9Z" />
 </svg>
 <span className="text-[11px] font-bold text-amber-600 ">{balance}</span>
 </div>
 )}
 </div>

 {/* Coin packs */}
 <div className="px-5 pt-4 pb-2">
 <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">Quick Send</p>
 <div className="grid grid-cols-4 gap-2">
 {COIN_PACKS.map(pack => (
 <button
 key={pack.value}
 onClick={() => handlePackClick(pack.value)}
 className={cn(
 'py-2.5 rounded-xl text-xs font-bold transition-all border',
 amount === String(pack.value)
 ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
 : 'bg-gray-50 text-gray-700 border-gray-100 hover:bg-gray-100 '
 )}
 >
 {pack.label}
 </button>
 ))}
 </div>
 </div>

 {/* Custom amount */}
 <div className="px-5 pt-3 pb-2">
 <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Custom Amount</p>
 <div className="flex items-center gap-2.5 border border-gray-200 rounded-xl px-4 py-3 focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500 transition-all bg-transparent">
 <svg viewBox="0 0 24 24" className="w-4 h-4 text-amber-500 flex-shrink-0 fill-current">
 <path d="M9.375 3a1.875 1.875 0 0 0 0 3.75h1.875v4.5H3.375A1.875 1.875 0 0 1 1.5 9.375v-.75c0-1.036.84-1.875 1.875-1.875h3.193A3.375 3.375 0 0 1 12 2.753a3.375 3.375 0 0 1 5.432 3.997h3.943c1.035 0 1.875.84 1.875 1.875v.75c0 1.036-.84 1.875-1.875 1.875H12.75v-4.5h1.875a1.875 1.875 0 1 0-1.875-1.875V6.75h-1.5V4.875C11.25 3.839 10.41 3 9.375 3ZM11.25 12.75H3v6.75a2.25 2.25 0 0 0 2.25 2.25h6v-9ZM12.75 12.75v9h6.75a2.25 2.25 0 0 0 2.25-2.25v-6.75h-9Z" />
 </svg>
 <input
 type="number"
 inputMode="numeric"
 min="1"
 value={amount}
 onChange={e => { setAmount(e.target.value); setStatus(null); }}
 placeholder="Enter amount"
 className="flex-1 text-sm bg-transparent outline-none text-gray-900 placeholder-gray-300 font-bold"
 autoFocus
 />
 <span className="text-xs font-bold text-gray-400 ">Mobcoins</span>
 </div>
 </div>

 {/* Status messages */}
 {status?.error && (
 <div className="mx-5 mt-2 mb-1 text-xs font-semibold text-red-600 bg-red-50 border border-red-100 rounded-xl px-3.5 py-2.5">
 {status.error}
 </div>
 )}
 {status?.success && (
 <div className="mx-5 mt-2 mb-1 text-xs font-semibold text-green-700 bg-green-50 border border-green-100 rounded-xl px-3.5 py-2.5">
 {status.success}
 </div>
 )}

 {/* Actions */}
 <div className="px-5 pb-8 md:pb-4 pt-4 flex gap-2 border-t border-gray-50 mt-3">
 <button
 onClick={onClose}
 className="flex-1 h-11 rounded-xl border border-gray-200 text-xs font-bold text-gray-600 hover:bg-gray-50 transition-all"
 >
 Cancel
 </button>
 <button
 onClick={handleSend}
 disabled={sending || !!status?.success}
 className="flex-1 h-11 rounded-xl bg-blue-600 text-white text-xs font-bold hover:bg-blue-700 active:scale-[0.98] transition-all disabled:opacity-40 shadow-sm flex items-center justify-center gap-1.5"
 >
 {sending ? (
 <>
 <svg className="animate-spin w-3.5 h-3.5" viewBox="0 0 24 24" fill="none">
 <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
 <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
 </svg>
 Processing…
 </>
 ) : status?.success ? (
 'Sent! ✓'
 ) : (
 'Send Gift'
 )}
 </button>
 </div>
 </div>
 </>
 );
}
