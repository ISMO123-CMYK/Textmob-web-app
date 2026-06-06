import { useState, useEffect } from 'react';
import MobileHeader from '../../components/layout/MobileHeader';
import MobileNav from '../../components/layout/MobileNav';
import HomeFeed from './HomeFeed';
import LiveFeed from '../live/LiveFeed';
import NotificationBanner from '../../components/layout/NotificationBanner';
import NavIcons from '../../utils/navIcons';
import useScrollDirection from '../../utils/useScrollDirection';

export default function HomeMobile() {
  const [activeTab, setActiveTab] = useState('posts');
  const { scrollDirection, isAtTop } = useScrollDirection();

  useEffect(() => {
    const parseTwemoji = () => {
      if (window.twemoji) {
        Array.from(document.body.querySelectorAll('*:not([data-twemoji-ignore] *)')).forEach(el => {
          if (!el.closest('[data-twemoji-ignore]')) {
            window.twemoji.parse(el, {
              folder: 'svg',
              ext: '.svg',
              base: 'https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/'
            });
          }
        });
      }
    };
    parseTwemoji();
    const interval = setInterval(parseTwemoji, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="relative min-h-screen pb-20 pt-[56px] bg-gray-100">
      {/* Toast Announcement Overlay Modal */}
      <NotificationBanner />

      {/* Slide out Header Wrapper */}
      <div 
        className="fixed top-0 left-0 right-0 z-40 transition-transform duration-300 ease-in-out"
        style={{
          transform: scrollDirection === 'down' && !isAtTop ? 'translateY(-100%)' : 'translateY(0)'
        }}
      >
        <MobileHeader />
      </div>

      {/* Main feed vs Live stream feed views */}
      {activeTab === 'posts' ? (
        <HomeFeed />
      ) : (
        <LiveFeed />
      )}

      {/* Floating Action Button to swap Feed/Live Feed quickly */}
      <div className="fixed bottom-24 right-4 z-40 md:hidden">
        <button
          onClick={() => setActiveTab(activeTab === 'posts' ? 'live' : 'posts')}
          className="bg-blue-600 text-white rounded-full p-4 shadow-2xl hover:bg-blue-700 active:scale-95 transition-all flex items-center justify-center border-2 border-white"
        >
          {activeTab === 'posts' ? (
            <NavIcons.Live className="w-6 h-6 animate-pulse" />
          ) : (
            <NavIcons.Home className="w-6 h-6" />
          )}
        </button>
      </div>

      {/* Navigation footer */}
      <MobileNav />
    </div>
  );
}

