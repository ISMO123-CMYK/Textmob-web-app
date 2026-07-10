import { useState, useEffect } from 'react';
import { apiFetch } from '../../config/api';
import NavIcons from '../../utils/navIcons';

export default function DesktopHeader({ activeTab, setActiveTab }) {
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const currentUser = localStorage.getItem('currentUser');
  const isLoggedIn = !!currentUser && currentUser !== 'undefined';

  useEffect(() => {
    if (!currentUser) return;
    
    async function pollNotifications() {
      if (currentUser && currentUser !== 'undefined') {
        try {
          const res = await apiFetch(`/get-notifications?username=${encodeURIComponent(currentUser)}`);
          if (!res.ok) return;
          const list = await res.json();
          const unreadCount = list.filter(n => !n.read).length;
          setUnreadNotifications(unreadCount);
          document.title = unreadCount > 0 ? `(${unreadCount}) Textmob` : 'Textmob';
        } catch (err) {
          console.error('Notification poll error:', err);
        }
      }
    }

    pollNotifications();
    const interval = setInterval(pollNotifications, 6000);
    return () => clearInterval(interval);
  }, [currentUser]);

  return (
    <header className="p-3 sticky top-0 z-40 milky-glass border-b border-gray-200/50">
      <div className="max-w-5xl mx-auto flex items-center justify-between">
        {/* Logo */}
        <a href="/" data-lexum className="text-3xl font-black text-blue-600 hover:text-blue-700 transition-colors tracking-tighter">
          textmob
        </a>

        {/* Middle Toggle Tabs */}
        {activeTab && setActiveTab && (
          <div className="hidden md:flex flex-1 justify-center px-4">
            <div className="bg-gray-100 rounded-2xl p-1 flex items-center shadow-inner space-x-1 border border-gray-200/50">
              {[
                { key: 'posts', label: 'Feed' },
                { key: 'live', label: 'Live' }
              ].map(tab => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`px-8 py-1.5 rounded-xl text-sm font-semibold transition-all duration-200 select-none
                    ${activeTab === tab.key 
                      ? 'bg-white text-gray-900 shadow-sm ring-1 ring-black/5' 
                      : 'text-gray-500 hover:text-gray-700'
                    }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Right Side Icons */}
        <div className="flex items-center gap-1.5">
          {/* Search Page */}
          <a href="/topsearch" data-lexum className="group" title="Search">
            <button className="p-3 rounded-full hover:bg-gray-100 active:scale-90 transition-all">
              <NavIcons.Search className="w-5 h-5 text-gray-700 group-hover:text-blue-600 transition-colors" />
            </button>
          </a>

          {isLoggedIn ? (
            <>
              {/* Activity / Bell Notification Page */}
              <a href="/activity" data-lexum className="relative group" title="Notifications">
                <button className="p-3 rounded-full hover:bg-gray-100 active:scale-90 transition-all">
                  <NavIcons.Bell className="w-5 h-5 text-gray-700 group-hover:text-blue-600 transition-colors" />
                  {unreadNotifications > 0 && (
                    <span className="absolute top-1 right-1 min-w-[16px] h-4 bg-red-500 text-white text-[10px] font-black rounded-full flex items-center justify-center px-1">
                      {unreadNotifications > 99 ? '99+' : unreadNotifications}
                    </span>
                  )}
                </button>
              </a>

              {/* Refresh Page */}
              <button 
                onClick={() => window.location.reload()} 
                className="p-3 rounded-full hover:bg-gray-100 active:scale-90 transition-all group"
                title="Refresh"
              >
                <svg className="w-5 h-5 text-gray-700 group-hover:text-blue-600 transition-colors" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </button>

              {/* Compose Post */}
              <a href="/make-post" data-lexum className="group" title="Compose">
                <button className="p-3 rounded-full hover:bg-gray-100 active:scale-90 transition-all">
                  <NavIcons.Edit className="w-5 h-5 text-gray-700 group-hover:text-blue-600 transition-colors" />
                </button>
              </a>
            </>
          ) : (
            <button
              onClick={() => window.Lexum?.navigate('/auth')}
              className="px-4 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all active:scale-[0.97] ml-2"
            >
              Log in
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
