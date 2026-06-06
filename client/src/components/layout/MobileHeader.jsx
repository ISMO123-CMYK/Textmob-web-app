import { useState, useEffect } from 'react';
import { apiFetch } from '../../config/api';
import NavIcons from '../../utils/navIcons';
import TrendingTopics from './TrendingTopics';

export default function MobileHeader() {
  const [profileOpen, setProfileOpen] = useState(false);
  const [exploreOpen, setExploreOpen] = useState(false);
  const [profile, setProfile] = useState(null);
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const currentUser = localStorage.getItem('currentUser');

  useEffect(() => {
    if (!currentUser) return;
    apiFetch(`/profile/${currentUser}`)
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        if (data) {
          setProfile(data);
          if (data.profile_pic) {
            localStorage.setItem('cached_profile_pic', data.profile_pic);
          }
        }
      })
      .catch(() => { });
  }, [currentUser]);

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

  const profilePic = profile?.profile_pic || localStorage.getItem('cached_profile_pic') || 'https://res.cloudinary.com/dzvm9xe1i/image/upload/v1754309761/profile-pictures/gyyonhn4akhjp4awey0t.png';
  const name = profile?.fullname || 'User';
  const username = profile?.username || currentUser || 'user';

  const exploreItems = [
    { label: 'Hall of Fame', icon: NavIcons.Leaderboard, to: '/halloffame', isNew: false },
    { label: 'Wallet', icon: NavIcons.Wallet, to: '/wallet', isNew: true },
    { label: 'Discover', icon: NavIcons.Search, to: '/topsearch', isNew: false },
  ];

  return (
    <>
      <header className="fixed top-0 left-0 right-0 z-40 bg-white backdrop-blur-md border-b border-gray-200 h-14 flex items-center justify-between px-4">
        {/* Left: Profile avatar button */}
        <button
          onClick={() => setProfileOpen(true)}
          className="w-9 h-9 rounded-full overflow-hidden border border-gray-200 active:scale-95 transition-all"
        >
          <img src={profilePic} alt="Profile" className="w-full h-full object-cover" />
        </button>

        {/* Center: Branding Logo */}
        <span className="text-xl font-black text-blue-600 tracking-tighter select-none">
          textmob
        </span>

        {/* Right: Actions */}
        <div className="flex items-center gap-1">
          {/* Search Button */}
          <button
            onClick={() => window.Lexum.navigate('/topsearch')}
            className="p-2 rounded-full hover:bg-gray-100 text-gray-700 active:scale-95 transition-all"
          >
            <NavIcons.Search className="w-5 h-5" />
          </button>

          {/* Menu button */}
          <button
            onClick={() => window.Lexum.navigate('/menu')}
            className="relative p-2 rounded-full hover:bg-gray-100 text-gray-700 active:scale-95 transition-all"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h7" />
            </svg>
            {unreadNotifications > 0 && (
              <span className="absolute top-1 right-1 min-w-[16px] h-4 bg-red-500 text-white text-[10px] font-black rounded-full flex items-center justify-center px-1">
                {unreadNotifications > 99 ? '99+' : unreadNotifications}
              </span>
            )}
          </button>
        </div>
      </header>

    </>
  );
}
