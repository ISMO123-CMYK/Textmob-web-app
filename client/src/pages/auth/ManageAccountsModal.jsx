import { useEffect } from 'react';

const DEFAULT_PIC = 'https://res.cloudinary.com/dzvm9xe1i/image/upload/v1746095979/profile-pictures/e2st5nispbicnhnir9cf.jpg';

export default function ManageAccountsModal({ show, accounts, onLogin, onRemove, onClose }) {
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  if (!show) return null;

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-end justify-center md:items-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-sm p-5" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm font-bold text-gray-900">Saved Accounts</p>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700">
            <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
        <div className="flex flex-col gap-2">
          {accounts.map((a) => (
            <div key={a.username} onClick={() => { onLogin(a.username, a.password); onClose(); }}
              className="flex items-center gap-3 px-3 py-2.5 rounded-2xl border border-gray-100 hover:bg-blue-50 cursor-pointer">
              <img src={a.profile_pic || DEFAULT_PIC} alt="" className="w-8 h-8 rounded-full object-cover" />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-gray-800">@{a.username}</p>
                <p className="text-[10px] text-gray-400">Tap to sign in</p>
              </div>
              <button onClick={(e) => { e.stopPropagation(); onRemove(a.username); }}
                className="w-5 h-5 text-gray-300 hover:text-red-400">
                <svg viewBox="0 0 24 24" className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
