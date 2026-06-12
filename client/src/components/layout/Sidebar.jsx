import { useState, useEffect, useRef } from 'react';
import { cn } from '../../utils/classNames';
import { apiFetch } from '../../config/api';
import NavIcons from '../../utils/navIcons';

export default function Sidebar() {
  const [collapsed, setCollapsed] = useState(() => {
    try { return JSON.parse(localStorage.getItem('sidebar-collapsed') || 'false'); } catch { return false; }
  });
  const [profile, setProfile] = useState(null);
  const [unread, setUnread] = useState(null);
  const [loudaUnread, setLoudaUnread] = useState(0);
  const [menuOpen, setMenuOpen] = useState(false);
  const [createMenuOpen, setCreateMenuOpen] = useState(false);
  const menuRef = useRef(null);
  const createMenuRef = useRef(null);

  useEffect(() => {
    const user = localStorage.getItem('currentUser');
    if (!user) return;

    const fetchUnread = () => {
      apiFetch(`/ms-unread?username=${user}`, { cache: 'no-store' })
        .then(r => r.ok ? r.json() : { unreadCount: 0 })
        .then(setUnread)
        .catch(() => setUnread({ unreadCount: 0 }));

      apiFetch(`/api/louda-unread?username=${user}`)
        .then(r => r.ok ? r.json() : { unreadCount: 0 })
        .then(data => setLoudaUnread(data.unreadCount || 0))
        .catch(() => { });
    };

    fetchUnread();
    const interval = setInterval(fetchUnread, 5000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const user = localStorage.getItem('currentUser');
    if (!user) return;
    apiFetch(`/profile/${user}`, { cache: 'no-store' }).then(r => r.ok ? r.json() : {}).then(setProfile).catch(() => setProfile({}));
  }, []);

  const currentPath = window.location.pathname;

  const navItems = [
    { Icon: NavIcons.Home, label: 'Home', badge: null, to: '/' },
    { Icon: NavIcons.Snaps, label: 'Snaps', badge: null, to: '/snaps' },
    { Icon: NavIcons.Search, label: 'Discover', badge: null, to: '/topsearch' },
    { Icon: NavIcons.Live, label: 'Go Live', badge: null, to: '/live' },

    { Icon: NavIcons.Messages, label: 'Louda', badge: loudaUnread || null, to: '/chats' },
    { Icon: NavIcons.Leaderboard, label: 'Hall of Fame', badge: null, to: '/halloffame' },
    { Icon: NavIcons.Wallet, label: 'Wallet', badge: null, to: '/wallet' },
    { Icon: NavIcons.Dots, label: 'More', badge: null, to: '/menu' },
  ];

  if (!profile || unread === null) {
    return (
      <aside className={cn('hidden md:flex flex-col h-screen bg-white border-r border-gray-200 overflow-y-auto', collapsed ? 'w-20' : 'w-64')}>
        <div className="p-4 space-y-3">
          <div className="w-10 h-10 rounded-full bg-gray-100 animate-pulse" />
          {!collapsed && <>
            <div className="h-3 bg-gray-100 rounded-full w-2/3 animate-pulse" />
            <div className="h-2.5 bg-gray-100 rounded-full w-1/2 animate-pulse" />
          </>}
        </div>
      </aside>
    );
  }

  const { profile_pic: pic = '', fullname: name = 'User', username = 'user' } = profile;

  const profileMenuItems = [
    { label: 'View profile', to: `/@${username}`, icon: 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z' },
    { label: 'Edit profile', to: '/accountscenter', icon: 'M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z' },
    { label: 'Settings', to: '/accountscenter', icon: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z' },
  ];

  return (
    <>
      <aside className={cn('hidden md:flex flex-col h-screen bg-white border-r border-gray-200 overflow-y-auto sticky top-0 transition-[width] duration-300', collapsed ? 'w-20' : 'w-64')}>
        {/* Header */}
        <div className={cn('flex items-center px-4 pt-4 pb-2', collapsed ? 'justify-center' : 'justify-between')}>
          {!collapsed && <span className="text-sm font-bold text-gray-900 tracking-tight">Textmob</span>}
          <button onClick={() => setCollapsed(v => !v)} className="w-8 h-8 rounded-xl flex items-center justify-center text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors" aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}>
            <svg viewBox="0 0 24 24" className="w-4 h-4 fill-none stroke-current" strokeWidth="2.5">
              <path strokeLinecap="round" strokeLinejoin="round" d={collapsed ? 'M9 5l7 7-7 7' : 'M15 19l-7-7 7-7'} />
            </svg>
          </button>
        </div>

        {/* Profile dropdown */}
        <div className={cn('relative px-3 pb-4', collapsed ? 'flex justify-center' : '')}>
          <button onClick={() => setMenuOpen(v => !v)} className={cn('flex items-center gap-2 w-full rounded-2xl px-2 py-2 hover:bg-gray-50 transition-colors', collapsed ? 'justify-center p-0 hover:bg-transparent' : '')}>
            <img src={pic} alt={name} className="w-10 h-10 rounded-full object-cover flex-shrink-0 border border-gray-200" loading="lazy" />
            {!collapsed && <>
              <div className="flex-1 min-w-0 text-left">
                <p className="text-sm font-bold text-gray-900 truncate leading-snug">{name}</p>
                <p className="text-xs text-gray-400 truncate">@{username}</p>
              </div>
              <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 text-gray-300 flex-shrink-0 fill-none stroke-current" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </>}
          </button>

          {menuOpen && (
            <div ref={menuRef} className="absolute left-2 right-2 top-[calc(100%-4px)] z-50 bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-lg" role="menu">
              <div className="px-4 py-3 border-b border-gray-200 flex items-center gap-2">
                <img src={pic} alt={name} className="w-8 h-8 rounded-full object-cover" />
                <div className="min-w-0">
                  <p className="text-xs font-bold text-gray-900 truncate">{name}</p>
                  <p className="text-[11px] text-gray-400 truncate">@{username}</p>
                </div>
              </div>
              {profileMenuItems.map(({ label, to, icon }) => (
                <a href={to} data-lexum={true} role="menuitem" className="flex items-center gap-3 px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 transition-colors" onClick={() => setMenuOpen(false)} key={label}>
                  <svg viewBox="0 0 24 24" className="w-4 h-4 fill-none stroke-current text-gray-400" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d={icon} /></svg>
                  {label}
                </a>
              ))}
              <div className="border-t border-gray-200">
                <button role="menuitem" onClick={() => { localStorage.removeItem('currentUser'); window.Lexum?.navigate('/auth'); }} className="flex items-center gap-3 w-full px-4 py-3 text-sm text-red-500 hover:bg-red-50 transition-colors">
                  <svg viewBox="0 0 24 24" className="w-4 h-4 fill-none stroke-current" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
                  Log out
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="mx-4 border-t border-gray-200 mb-2" />

        {/* Nav items */}
        <nav className="flex-1 px-3 space-y-0.5 overflow-y-auto">
          {navItems.map(({ Icon, label, badge, to }) => {
            const active = to === '/' ? currentPath === '/' : currentPath.startsWith(to);
            return (
              <a href={to} data-lexum={true} className={cn('flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors', active ? 'bg-blue-50 text-blue-600 font-semibold' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900')} title={collapsed ? label : undefined} key={label}>
                <Icon className={cn('w-5 h-5 flex-shrink-0', active ? 'text-blue-600' : 'text-gray-400')} />
                {!collapsed && <span className="flex-1 truncate">{label}</span>}
                {!collapsed && badge != null && badge > 0 && <span className="ml-auto text-[10px] font-bold bg-red-500 text-white rounded-full px-1.5 py-0.5 leading-none">{badge > 99 ? '99+' : badge}</span>}
                {collapsed && badge != null && badge > 0 && <span className="absolute right-2.5 top-1.5 w-2 h-2 bg-red-500 rounded-full" />}
              </a>
            );
          })}
        </nav>

        {/* Create Dropdown Menu */}
        <div className="relative px-3 py-2" ref={createMenuRef}>
          <button
            onClick={() => setCreateMenuOpen(prev => !prev)}
            className={cn(
              "w-full flex items-center justify-center gap-2 py-3 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold rounded-2xl active:scale-[0.98] transition-all shadow-md shadow-blue-500/10",
              collapsed ? "w-12 h-12 p-0 mx-auto rounded-full" : ""
            )}
            title={collapsed ? "Create" : undefined}
          >
            <svg viewBox="0 0 24 24" className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            {!collapsed && <span>Create</span>}
          </button>

          {createMenuOpen && (
            <div className={cn("absolute z-50 bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-xl w-48 bottom-full mb-2", collapsed ? "left-2" : "left-3 right-3")}>
              <button
                onClick={() => { setCreateMenuOpen(false); window.Lexum?.navigate('/make-post'); }}
                className="w-full flex items-center gap-3 px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 transition-colors text-left font-semibold border-b border-gray-100"
              >
                <NavIcons.Edit className="w-4 h-4 text-blue-500 flex-shrink-0" />
                <span>Create Post</span>
              </button>
              <button
                onClick={() => { setCreateMenuOpen(false); window.Lexum?.navigate('/create-live'); }}
                className="w-full flex items-center gap-3 px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 transition-colors text-left font-semibold border-b border-gray-100"
              >
                <NavIcons.Live className="w-4 h-4 text-red-500 flex-shrink-0" />
                <span>Go Live</span>
              </button>
              <button
                onClick={() => { setCreateMenuOpen(false); window.Lexum?.navigate('/snaps'); }}
                className="w-full flex items-center gap-3 px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 transition-colors text-left font-semibold"
              >
                <NavIcons.Snaps className="w-4 h-4 text-purple-500 flex-shrink-0" />
                <span>Create Snap</span>
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-4 border-t border-gray-200 mt-auto">
          {collapsed ? (
            <div className="flex justify-center"><span className="text-[10px] text-gray-300 font-bold">TM</span></div>
          ) : (
            <div className="text-center space-y-1">
              <p className="text-[11px] font-semibold text-gray-400">Textmob © {new Date().getFullYear()}</p>
              <div className="flex justify-center gap-3">
                {['About', 'Privacy', 'Terms'].map(t => <a href="/about" className="text-[11px] text-gray-400 hover:text-gray-600 transition-colors" key={t}>{t}</a>)}
              </div>
            </div>
          )}
        </div>
      </aside>
    </>
  );
}
