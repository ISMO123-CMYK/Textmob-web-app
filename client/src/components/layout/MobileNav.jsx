import { useState, useEffect } from 'react';
import { apiFetch } from '../../config/api';
import { cn } from '../../utils/classNames';
import NavIcons from '../../utils/navIcons';

export default function MobileNav() {
  const [showCreate, setShowCreate] = useState(false);
  const [loudaUnread, setLoudaUnread] = useState(0);
  const currentPath = window.location.pathname;
  const currentUser = localStorage.getItem('currentUser');
  const isLoggedIn = !!currentUser && currentUser !== 'undefined';

  useEffect(() => {
    const user = localStorage.getItem('currentUser');
    if (!user) return;

    const fetchLoudaUnread = () => {
      apiFetch(`/api/louda-unread?username=${user}`)
        .then(r => r.ok ? r.json() : { unreadCount: 0 })
        .then(data => setLoudaUnread(data.unreadCount || 0))
        .catch(() => {});
    };

    fetchLoudaUnread();
    const interval = setInterval(fetchLoudaUnread, 5000); // Update every 5s
    return () => clearInterval(interval);
  }, []);

  const navItems = [
    { name: 'Home', icon: NavIcons.Home, to: '/' },
    { name: 'Fame', icon: NavIcons.Leaderboard, to: '/halloffame' },
    { name: 'Snaps', icon: NavIcons.Snaps, to: '/snaps' },
    { name: 'Louda', icon: NavIcons.Messages, to: '/chats', badge: loudaUnread },
  ];

  const createItems = [
    { label: 'Post', sub: "Share what's on your mind", icon: NavIcons.Edit, to: '/make-post', live: false },
    { label: 'Snap', sub: 'Capture a moment', icon: NavIcons.Snaps, to: '/snaps', live: false },
    { label: 'Go Live', sub: 'Broadcast to your people', icon: NavIcons.Live, to: '/create-live', live: true },
  ];

  useEffect(() => {
    if (!showCreate) return;
    const handler = (e) => { if (e.key === 'Escape') setShowCreate(false); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [showCreate]);

  if (!isLoggedIn) {
    return (
      <>
        <div className="h-16 md:hidden" />
        <footer className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-gray-200">
          <div className="flex items-center h-16 px-4">
            <div className="flex-1 flex items-center">
              <span className="text-sm font-bold text-gray-900">Textmob</span>
            </div>
            <button
              onClick={() => { window.showAuthPrompt?.('Create an account to get started'); window.Lexum?.navigate('/auth'); }}
              className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all active:scale-[0.97]"
            >
              Sign up
            </button>
          </div>
        </footer>
      </>
    );
  }

  return (
    <>
      {/* Spacer */}
      <div className="h-20 md:hidden" />

      {/* Bottom nav bar */}
      <footer className="md:hidden fixed bottom-0 left-0 right-0 z-40 milky-glass border-t border-gray-200/50">
        <div className="flex items-center h-16 px-1">
          {navItems.slice(0, 2).map((item) => {
            const active = item.to === '/' ? currentPath === '/' : currentPath.startsWith(item.to);
            return (
              <button key={item.name} onClick={() => window.Lexum?.navigate(item.to)} aria-label={item.name} className="flex-1 flex flex-col items-center justify-center gap-0.5 h-full relative">
                {active && <span className="absolute top-3 left-1/2 -translate-x-1/2 w-10 h-7 bg-blue-50 rounded-full" />}
                <item.icon className={cn('w-[22px] h-[22px] relative z-10 transition-colors', active ? 'text-blue-600' : 'text-gray-400')} />
                <span className={cn('text-[10px] font-semibold relative z-10 transition-colors', active ? 'text-blue-600' : 'text-gray-400')}>{item.name}</span>
              </button>
            );
          })}

          {/* Create button */}
          <div className="flex-1 flex items-center justify-center">
            <button onClick={() => setShowCreate(true)} aria-label="Create" className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center active:scale-95 active:bg-blue-700 transition-all">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4" />
              </svg>
            </button>
          </div>

          {navItems.slice(2, 4).map((item) => {
            const active = currentPath.startsWith(item.to) && item.to !== '/';
            return (
              <button key={item.name} onClick={() => window.Lexum?.navigate(item.to)} aria-label={item.name} className="flex-1 flex flex-col items-center justify-center gap-0.5 h-full relative">
                {active && <span className="absolute top-3 left-1/2 -translate-x-1/2 w-10 h-7 bg-blue-50 rounded-full" />}
                <item.icon className={cn('w-[22px] h-[22px] relative z-10 transition-colors', active ? 'text-blue-600' : 'text-gray-400')} />
                <span className={cn('text-[10px] font-semibold relative z-10 transition-colors', active ? 'text-blue-600' : 'text-gray-400')}>{item.name}</span>
                {item.badge > 0 && (
                  <span className="absolute top-2 right-4 flex items-center justify-center min-w-[14px] h-[14px] px-1 bg-red-600 text-white text-[8px] font-black rounded-full ring-2 ring-white z-20">
                    {item.badge > 99 ? '99+' : item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
        <div className="h-safe-bottom" />
      </footer>

      {/* Create sheet */}
      {showCreate && (
        <>
          <div
            className="fixed inset-0 bg-black/40 z-[100]"
            onClick={() => setShowCreate(false)}
            style={{
              backdropFilter: 'blur(8px) saturate(150%)',
              WebkitBackdropFilter: 'blur(8px) saturate(150%)'
            }}
          />
          <div
            className="fixed bottom-0 left-0 right-0 z-[110] bg-white/95 backdrop-blur-2xl rounded-t-[2rem] border-t border-gray-200/50 shadow-2xl"
          >
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-9 h-1 rounded-full bg-gray-200" />
            </div>
            <div className="px-4 pt-2 pb-8">
              <p className="text-[11px] font-bold uppercase tracking-widest text-gray-400 text-center mb-4">Create</p>
              <div className="space-y-2">
                {createItems.map((item) => (
                  <button key={item.label} onClick={() => { setShowCreate(false); window.Lexum?.navigate(item.to); }} className="w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl bg-gray-50 hover:bg-gray-100 active:scale-[0.98] transition-colors text-left">
                    <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0', item.live ? 'bg-red-50' : 'bg-blue-50')}>
                      <item.icon className={cn('w-5 h-5', item.live ? 'text-red-600' : 'text-blue-600')} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-gray-900">{item.label}</span>
                        {item.live && <span className="text-[9px] font-black tracking-widest text-red-600 border border-red-200 px-1.5 py-0.5 rounded-full leading-none">LIVE</span>}
                      </div>
                      <p className="text-xs text-gray-400 mt-0.5 truncate">{item.sub}</p>
                    </div>
                    <svg className="w-4 h-4 text-gray-300 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                ))}
              </div>
              <button onClick={() => setShowCreate(false)} className="w-full mt-3 py-3 text-sm font-semibold text-gray-400 hover:text-gray-600 active:scale-95 transition-colors">Cancel</button>
            </div>
          </div>
        </>
      )}
    </>
  );
}
