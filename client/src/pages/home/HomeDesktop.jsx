import { useState, useEffect } from 'react';
import Sidebar from '../../components/layout/Sidebar';
import RightSidebar from '../../components/layout/RightSidebar';
import DesktopHeader from '../../components/layout/DesktopHeader';
import HomeFeed from './HomeFeed';
import LiveFeed from '../live/LiveFeed';
import NotificationBanner from '../../components/layout/NotificationBanner';

export default function HomeDesktop() {
  const [activeTab, setActiveTab] = useState('posts');

  useEffect(() => {
    const parseTwemoji = () => {
      if (window.twemoji) {
        Array.from(document.body.querySelectorAll('*:not([data-twemoji-ignore] *)')).forEach(el => {
          if (!el.closest('[data-twemoji-ignore]')) {
            try {
              window.twemoji.parse(el, {
                folder: 'svg',
                ext: '.svg',
                base: 'https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/'
              });
            } catch (err) {
              // ignore twemoji failures on detached DOM elements
            }
          }
        });
      }
    };
    parseTwemoji();
    const interval = setInterval(parseTwemoji, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Toast Announcement Overlay Modal */}
      <NotificationBanner />

      {/* Sidebar Left Column */}
      <Sidebar />

      {/* Center Feed Column */}
      <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-rounded border-r border-gray-200 flex flex-col h-full">
        {/* Navigation & Header Search Actions bar */}
        <DesktopHeader activeTab={activeTab} setActiveTab={setActiveTab} />
        
        {activeTab === 'posts' ? (
          <HomeFeed />
        ) : (
          <LiveFeed />
        )}
      </div>

      {/* Right Column: Trending, Suggestions */}
      <aside className="w-80 bg-white overflow-y-auto scrollbar-thin scrollbar-thumb-rounded border-l border-gray-200">
        <RightSidebar />
      </aside>
    </div>
  );
}


