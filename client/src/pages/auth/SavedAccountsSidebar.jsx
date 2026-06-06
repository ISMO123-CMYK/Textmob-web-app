const DEFAULT_PIC = 'https://res.cloudinary.com/dzvm9xe1i/image/upload/v1746095979/profile-pictures/e2st5nispbicnhnir9cf.jpg';

export default function SavedAccountsSidebar({ accounts, onLogin, onRemove }) {
  if (accounts.length === 0) return null;
  return (
    <div className="hidden lg:flex flex-col gap-2 w-[220px] flex-shrink-0">
      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest px-1 mb-1">Saved accounts</p>
      {accounts.map((a) => (
        <div key={a.username} onClick={() => onLogin(a.username, a.password)}
          className="group flex items-center gap-3 px-3 py-2.5 rounded-2xl border border-gray-100 bg-white hover:border-blue-200 hover:bg-blue-50 active:scale-[0.98] transition-colors cursor-pointer">
          <img src={a.profile_pic || DEFAULT_PIC} alt="" className="w-8 h-8 rounded-full object-cover border border-gray-100 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold text-gray-800 truncate">@{a.username}</p>
            <p className="text-[10px] text-gray-400">Tap to sign in</p>
          </div>
          <button onClick={(e) => { e.stopPropagation(); onRemove(a.username); }}
            className="opacity-0 group-hover:opacity-100 w-5 h-5 rounded-full flex items-center justify-center text-gray-300 hover:text-red-400 transition-colors">
            <svg viewBox="0 0 24 24" className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
      ))}
    </div>
  );
}
