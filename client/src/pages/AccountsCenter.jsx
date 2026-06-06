import { useState, useEffect, useRef } from 'react';
import { apiFetch, getCurrentUser } from '../config/api';
import { cn } from '../utils/classNames';
import BottomSheet from '../components/ui/BottomSheet';
import SkeletonRow from '../components/ui/SkeletonRow';

// SVG Icons mapping from object K in bundle
const K = {
  Home: (
    <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
      <polyline points="9 22 9 12 15 12 15 22" />
    </svg>
  ),
  Profile: (
    <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="8" r="4" />
      <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
    </svg>
  ),
  Posts: (
    <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
    </svg>
  ),
  Chart: (
    <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2">
      <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
    </svg>
  ),
  Grow: (
    <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2">
      <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
      <polyline points="17 6 23 6 23 12" />
    </svg>
  ),
  Prefs: (
    <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010-4h-.09a1.65 1.65 0 00-1.51 1z" />
    </svg>
  ),
  Danger: (
    <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
      <line x1="12" y1="9" x2="12" y2="13" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  ),
  Coin: (
    <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v1m0 8v1m-3-5h6" />
    </svg>
  ),
  Crown: (
    <svg viewBox="0 0 24 24" className="w-4 h-4" fill="currentColor">
      <path d="M2 20h20v2H2v-2zM4 18l3-10 5 6 5-6 3 10H4z" />
    </svg>
  ),
  Edit: (
    <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
      <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
    </svg>
  ),
  Trash: (
    <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2">
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6l-1 14H6L5 6" />
      <path d="M10 11v6M14 11v6" />
      <path d="M9 6V4h6v2" />
    </svg>
  ),
  Link: (
    <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6" />
      <polyline points="15 3 21 3 21 9" />
      <line x1="10" y1="14" x2="21" y2="3" />
    </svg>
  ),
  Star: (
    <svg viewBox="0 0 24 24" className="w-4 h-4" fill="currentColor">
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
    </svg>
  ),
  Check: (
    <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  ),
  Bolt: (
    <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2">
      <polyline points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
    </svg>
  ),
  Eye: (
    <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  ),
  EyeOff: (
    <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24" />
      <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
  ),
  Lock: (
    <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0110 0v4" />
    </svg>
  ),
  Phone: (
    <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 8.81 19.79 19.79 0 01.92 4.18 2 2 0 012.92 2h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L7.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z" />
    </svg>
  ),
  Mail: (
    <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
      <polyline points="22,6 12,13 2,6" />
    </svg>
  ),
};

const Xt = [
  { key: 'home', label: 'Overview', icon: K.Home },
  { key: 'profile', label: 'Profile', icon: K.Profile },
  { key: 'posts', label: 'Posts', icon: K.Posts },
  { key: 'analytics', label: 'Analytics', icon: K.Chart },
  { key: 'grow', label: 'Grow', icon: K.Grow },
  { key: 'prefs', label: 'Preferences', icon: K.Prefs },
  { key: 'danger', label: 'Danger Zone', icon: K.Danger },
];

function Jt({ label, value, icon, accent = 'text-blue-600', sub, onClick }) {
  return (
    <div
      onClick={onClick}
      className={cn(
        'bg-white border border-gray-100 rounded-2xl p-4 flex flex-col gap-1',
        onClick ? 'cursor-pointer active:bg-gray-50 active:scale-[0.98] transition-colors' : ''
      )}
    >
      <div className="flex items-center justify-between">
        <span className="text-xs text-gray-400 font-medium">{label}</span>
        <span className={accent}>{icon}</span>
      </div>
      <p className="text-xl font-bold text-gray-900">{value ?? '—'}</p>
      {sub && <p className="text-[11px] text-gray-400">{sub}</p>}
    </div>
  );
}

function Yt({ msg }) {
  if (!msg) return null;
  return (
    <div
      className={cn(
        'flex items-center gap-2 text-xs px-3 py-2 rounded-xl',
        msg.ok ? 'bg-green-50 border border-green-100 text-green-600' : 'bg-red-50 border border-red-100 text-red-600'
      )}
    >
      {msg.ok ? (
        <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth="2.5">
          <polyline points="20 6 9 17 4 12" />
        </svg>
      ) : (
        <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="8" x2="12" y2="12" />
          <line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
      )}
      {msg.text}
    </div>
  );
}

function Wt({ onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Close"
      className="w-8 h-8 rounded-full flex items-center justify-center text-gray-400 hover:text-gray-700 hover:bg-gray-100 active:scale-95 transition-colors"
    >
      <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5">
        <line x1="18" y1="6" x2="6" y2="18" />
        <line x1="6" y1="6" x2="18" y2="18" />
      </svg>
    </button>
  );
}

function Gt({ onClose }) {
  return <div className="fixed inset-0 bg-black/40 z-40" onClick={onClose} aria-hidden="true" />;
}

function SkeletonBlock() {
  return (
    <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-100">
      <div className="w-10 h-10 rounded-full bg-gray-100 flex-shrink-0" />
      <div className="flex-1 space-y-2">
        <div className="h-3 bg-gray-100 rounded-full w-3/5" />
        <div className="h-2 bg-gray-100 rounded-full w-2/5" />
      </div>
    </div>
  );
}

export default function AccountsCenter() {
  const [activeTab, setActiveTab] = useState('home');
  const [profile, setProfile] = useState(null);
  const [posts, setPosts] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const username = getCurrentUser();

  useEffect(() => {
    async function load() {
      const [p, t, s] = await Promise.allSettled([
        apiFetch(`/profile/${username}`),
        apiFetch(`/get-user-posts?username=${encodeURIComponent(username)}`),
        apiFetch(`/account-stats?username=${encodeURIComponent(username)}`),
      ]);
      if (p.status === 'fulfilled' && p.value.ok) {
        setProfile(await p.value.json());
      }
      if (t.status === 'fulfilled' && t.value.ok) {
        setPosts(await t.value.json());
      }
      if (s.status === 'fulfilled' && s.value.ok) {
        setStats(await s.value.json());
      }
      setLoading(false);
    }
    load();
  }, [username]);

  useEffect(() => {
    const handler = (e) => {
      if (e.key === 'Escape') {
        setSidebarOpen(false);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  useEffect(() => {
    document.body.style.overflow = sidebarOpen ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [sidebarOpen]);

  const isOrg = (profile?.profile_type || '').toLowerCase() !== 'individual';

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <SkeletonBlock />
        <SkeletonBlock />
        <SkeletonBlock />
        <SkeletonBlock />
        <SkeletonBlock />
      </div>
    );
  }

  const defaultPic = 'https://res.cloudinary.com/dzvm9xe1i/image/upload/v1746095979/profile-pictures/e2st5nispbicnhnir9cf.jpg';

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex flex-col w-60 flex-shrink-0 bg-white border-r border-gray-100 sticky top-0 h-screen overflow-y-auto">
        <div className={cn('flex items-center gap-3 px-4 py-4 border-b border-gray-100', isOrg ? 'bg-gradient-to-r from-blue-50 to-purple-50' : '')}>
          <img src={profile?.profile_pic || defaultPic} alt="" className="w-10 h-10 rounded-full object-cover border-2 border-white flex-shrink-0" />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <p className="text-sm font-bold text-gray-900 truncate">{profile?.fullname || username}</p>
              {isOrg && <span className="text-[9px] font-black text-white bg-purple-600 rounded-full px-1.5 py-px tracking-wider flex-shrink-0">PRO</span>}
            </div>
            <p className="text-xs text-gray-400 truncate">@{username}</p>
          </div>
        </div>
        <nav className="flex-1 px-2 py-3 space-y-0.5">
          {Xt.map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={cn(
                'w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors active:scale-[0.98]',
                activeTab === tab.key
                  ? (isOrg ? 'bg-purple-50 text-purple-700' : 'bg-blue-50 text-blue-600')
                  : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'
              )}
            >
              <span className={activeTab === tab.key ? (isOrg ? 'text-purple-600' : 'text-blue-600') : 'text-gray-400'}>{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </nav>
        {isOrg && (
          <div className="px-4 py-3 border-t border-gray-100">
            <div className="flex items-center gap-2 text-xs text-purple-600 font-semibold">
              {K.Bolt}Professional Mode
            </div>
          </div>
        )}
      </aside>

      {/* Mobile sidebar */}
      {sidebarOpen && (
        <>
          <Gt onClose={() => setSidebarOpen(false)} />
          <div className="fixed inset-y-0 left-0 w-72 bg-white z-50 flex flex-col lg:hidden">
            <div className={cn('flex items-center justify-between px-4 py-3 border-b border-gray-100', isOrg ? 'bg-gradient-to-r from-blue-50 to-purple-50' : '')}>
              <div className="flex items-center gap-3">
                <img src={profile?.profile_pic || defaultPic} alt="" className="w-9 h-9 rounded-full object-cover border-2 border-white" />
                <div>
                  <div className="flex items-center gap-1.5">
                    <p className="text-sm font-bold text-gray-900">{profile?.fullname || username}</p>
                    {isOrg && <span className="text-[9px] font-black text-white bg-purple-600 rounded-full px-1.5 py-px">PRO</span>}
                  </div>
                  <p className="text-xs text-gray-400">@{username}</p>
                </div>
              </div>
              <Wt onClick={() => setSidebarOpen(false)} />
            </div>
            <nav className="flex-1 overflow-y-auto px-2 py-3 space-y-0.5">
              {Xt.map(tab => (
                <button
                  key={tab.key}
                  onClick={() => {
                    setActiveTab(tab.key);
                    setSidebarOpen(false);
                  }}
                  className={cn(
                    'w-full flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium transition-colors active:scale-[0.98]',
                    activeTab === tab.key
                      ? (isOrg ? 'bg-purple-50 text-purple-700' : 'bg-blue-50 text-blue-600')
                      : 'text-gray-600 hover:bg-gray-50'
                  )}
                >
                  <span className={activeTab === tab.key ? (isOrg ? 'text-purple-600' : 'text-blue-600') : 'text-gray-400'}>{tab.icon}</span>
                  {tab.label}
                </button>
              ))}
            </nav>
          </div>
        </>
      )}

      {/* Main Container */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className={cn('lg:hidden sticky top-0 z-30 flex items-center justify-between px-4 py-3 border-b border-gray-100', isOrg ? 'bg-gradient-to-r from-white via-blue-50 to-purple-50' : 'bg-white')}>
          <button
            onClick={() => setSidebarOpen(true)}
            className="w-9 h-9 rounded-full flex items-center justify-center text-gray-500 hover:bg-gray-100 active:scale-95 transition-colors"
          >
            <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="3" y1="6" x2="21" y2="6" />
              <line x1="3" y1="12" x2="21" y2="12" />
              <line x1="3" y1="18" x2="21" y2="18" />
            </svg>
          </button>
          <div className="flex items-center gap-1.5">
            <p className="text-sm font-bold text-gray-900">{Xt.find(t => t.key === activeTab)?.label}</p>
            {isOrg && <span className="text-[9px] font-black text-white bg-purple-600 rounded-full px-1.5 py-px">PRO</span>}
          </div>
          <img src={profile?.profile_pic || defaultPic} alt="" className="w-8 h-8 rounded-full object-cover border border-gray-100" />
        </header>

        <main className="flex-1 overflow-y-auto p-4 lg:p-6 max-w-3xl w-full mx-auto">
          {activeTab === 'home' && <OverviewTab profile={profile} stats={stats} posts={posts} setTab={setActiveTab} isOrg={isOrg} />}
          {activeTab === 'profile' && <EditProfileTab profile={profile} setProfile={setProfile} username={username} isOrg={isOrg} />}
          {activeTab === 'posts' && <PostsTab posts={posts} setPosts={setPosts} username={username} />}
          {activeTab === 'analytics' && <AnalyticsTab posts={posts} stats={stats} profile={profile} isOrg={isOrg} />}
          {activeTab === 'grow' && <GrowTab stats={stats} profile={profile} username={username} isOrg={isOrg} />}
          {activeTab === 'prefs' && <PrefsTab user={profile} setProfile={setProfile} />}
          {activeTab === 'danger' && <DangerTab username={username} />}
        </main>
      </div>
    </div>
  );
}

// Subcomponents:
// 1. OverviewTab (Qt)
function OverviewTab({ profile, stats, posts, setTab, isOrg }) {
  const followers = (Array.isArray(profile?.followers) ? profile.followers : []).length;
  const likesCount = posts.reduce((acc, p) => acc + (p.likes?.length || 0), 0);
  const commentsCount = posts.reduce((acc, p) => acc + (p.comments?.length || 0), 0);
  const votesCount = posts.reduce((acc, p) => acc + (p.options || []).reduce((sum, o) => sum + (o.votes?.length || 0), 0), 0);
  const totalInteractions = likesCount + commentsCount + votesCount;
  const avgInteractions = posts.length ? parseFloat((totalInteractions / posts.length).toFixed(1)) : 0;
  const engagementRate = followers > 0 ? parseFloat((totalInteractions / followers * 100).toFixed(1)) : null;

  const mobcoins = stats?.mobcoins ?? 0;
  const rank = stats?.rank ?? null;

  const quickActions = [
    { label: 'Edit Profile', icon: K.Profile, tab: 'profile' },
    { label: 'My Posts', icon: K.Posts, tab: 'posts' },
    { label: 'Analytics', icon: K.Chart, tab: 'analytics' },
    { label: 'Grow Account', icon: K.Grow, tab: 'grow' },
  ];

  return (
    <div className="space-y-4">
      <button
        onClick={() => window.Lexum?.navigate('/')}
        className="flex items-center gap-2 text-sm font-semibold text-gray-500 hover:text-gray-800 active:scale-[0.97] transition-colors"
      >
        <svg viewBox="0 0 24 24" className="w-4 h-4 fill-none stroke-current" strokeWidth="2.5">
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
        </svg>
        Back to Home
      </button>

      <div className={cn('rounded-2xl p-5 text-white', isOrg ? 'bg-gradient-to-br from-blue-600 via-blue-700 to-purple-700' : 'bg-blue-600')}>
        <div className="flex items-center gap-3 mb-3">
          <img
            src={profile?.profile_pic || 'https://res.cloudinary.com/dzvm9xe1i/image/upload/v1746095979/profile-pictures/e2st5nispbicnhnir9cf.jpg'}
            alt=""
            className="w-12 h-12 rounded-full object-cover border-2 border-white/30 flex-shrink-0"
          />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="font-bold text-base leading-tight truncate">{profile?.fullname || '—'}</p>
              {isOrg && <span className="text-[9px] font-black tracking-widest bg-white/20 rounded-full px-2 py-0.5 flex-shrink-0">PRO</span>}
            </div>
            <p className="text-blue-200 text-xs">@{profile?.username || localStorage.currentUser}</p>
          </div>
          <div className="text-right flex-shrink-0">
            <p className="text-2xl font-black">{avgInteractions}</p>
            <p className="text-[10px] text-blue-200">avg / post</p>
          </div>
        </div>
        <p className="text-xs text-blue-200 leading-relaxed line-clamp-2">{profile?.biography || 'Add a biography in the Profile tab.'}</p>
        {engagementRate !== null && (
          <div className="mt-3 pt-3 border-t border-white/15">
            <div className="flex items-center justify-between mb-1">
              <p className="text-[10px] text-blue-200 font-semibold uppercase tracking-wider">Follower engagement</p>
              <p className="text-sm font-black">{engagementRate}%</p>
            </div>
            <div className="h-1 bg-white/20 rounded-full overflow-hidden">
              <div className="h-full bg-white rounded-full" style={{ width: `${Math.min(100, engagementRate)}%` }} />
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Jt label="Posts" value={posts.length} icon={K.Posts} />
        <Jt label="Followers" value={followers} icon={K.Profile} />
        <Jt label="Mobcoins" value={mobcoins} icon={K.Coin} accent="text-yellow-500" />
        <Jt label="Total Likes" value={likesCount} icon={K.Star} accent="text-red-500" />
      </div>

      <div className={cn('rounded-2xl p-4 border', isOrg ? 'bg-purple-50 border-purple-100' : 'bg-white border-gray-100')}>
        <div className="flex items-center justify-between mb-2">
          <div>
            <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">Avg interactions per post</p>
            {followers === 0 && <p className="text-[10px] text-gray-400 mt-0.5">Follower rate shows once you gain followers</p>}
          </div>
          <span className={cn('text-xl font-black', isOrg ? 'text-purple-700' : 'text-blue-600')}>{avgInteractions}</span>
        </div>
        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
          <div
            className={cn('h-full rounded-full transition-all', isOrg ? 'bg-purple-600' : 'bg-blue-600')}
            style={{ width: `${Math.min(100, (avgInteractions / 5) * 100)}%` }}
          />
        </div>
        <p className="text-[11px] text-gray-400 mt-1.5">{totalInteractions} total interactions across {posts.length} posts</p>
      </div>

      {rank && (
        <div className="flex items-center gap-3 bg-white border border-gray-100 rounded-2xl px-4 py-3">
          <div className="w-9 h-9 rounded-xl bg-yellow-50 flex items-center justify-center text-yellow-500 flex-shrink-0">{K.Crown}</div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-gray-900">Hall of Fame #{rank}</p>
            <p className="text-xs text-gray-400">Keep posting to climb the leaderboard</p>
          </div>
          <button
            onClick={() => window.Lexum?.navigate('/halloffame')}
            className="text-xs font-semibold text-blue-600 active:opacity-70 transition-colors flex-shrink-0"
          >
            View
          </button>
        </div>
      )}

      <div>
        <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-2">Quick actions</p>
        <div className="grid grid-cols-2 gap-2">
          {quickActions.map(action => (
            <button
              key={action.tab}
              onClick={() => setTab(action.tab)}
              className="flex items-center gap-3 bg-white border border-gray-100 rounded-2xl px-4 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50 active:bg-gray-100 active:scale-[0.98] transition-colors text-left"
            >
              <span className={isOrg ? 'text-purple-600' : 'text-blue-600'}>{action.icon}</span>
              {action.label}
            </button>
          ))}
        </div>
      </div>

      <button
        onClick={() => window.Lexum?.navigate('/')}
        className="w-full h-11 rounded-2xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 active:scale-[0.98] transition-colors flex items-center justify-center gap-2"
      >
        <svg viewBox="0 0 24 24" className="w-4 h-4 fill-none stroke-current" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
          <polyline points="9 22 9 12 15 12 15 22" />
        </svg>
        Go back Home
      </button>
    </div>
  );
}

// 2. EditProfileTab ($t)
function EditProfileTab({ profile, setProfile, username, isOrg }) {
  const [fields, setFields] = useState({
    fullName: profile?.fullname || '',
    phone: profile?.phone || '',
    email: profile?.email || '',
    biography: profile?.biography || '',
  });
  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(profile?.profile_pic || 'https://res.cloudinary.com/dzvm9xe1i/image/upload/v1746095979/profile-pictures/e2st5nispbicnhnir9cf.jpg');
  const [saving, setSaving] = useState(false);
  const [statusMsg, setStatusMsg] = useState(null);
  const [passwordModalOpen, setPasswordModalOpen] = useState(false);
  const [passwordFields, setPasswordFields] = useState({ current: '', newPw: '', confirm: '' });
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordStatusMsg, setPasswordStatusMsg] = useState(null);
  const [showCurrentPw, setShowCurrentPw] = useState(false);
  const [showNewPw, setShowNewPw] = useState(false);
  const [modeModalOpen, setModeModalOpen] = useState(false);
  const [modeSaving, setModeSaving] = useState(false);

  function handlePhotoChange(e) {
    const file = e.target.files[0];
    if (file) {
      setPhotoFile(file);
      setPhotoPreview(URL.createObjectURL(file));
    }
  }

  async function handleProfileUpdate(e) {
    e.preventDefault();
    setSaving(true);
    setStatusMsg(null);
    try {
      const formData = new FormData();
      if (fields.fullName) formData.append('fullName', fields.fullName);
      formData.append('phone', fields.phone || '');
      if (fields.email) formData.append('email', fields.email);
      if (fields.biography !== undefined) formData.append('biography', fields.biography);
      if (photoFile) formData.append('profilePicture', photoFile);

      const res = await apiFetch(`/profile/${username}/update`, {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Update failed');
      }
      setProfile(prev => ({ ...prev, ...data.updatedFields }));
      if (data.updatedFields?.profile_pic) {
        setPhotoPreview(data.updatedFields.profile_pic);
        localStorage.setItem('cached_profile_pic', data.updatedFields.profile_pic);
      }
      setStatusMsg({ text: 'Profile updated!', ok: true });
    } catch (err) {
      setStatusMsg({ text: err.message, ok: false });
    } finally {
      setSaving(false);
    }
  }

  async function handlePasswordChange(e) {
    e.preventDefault();
    if (!passwordFields.current) {
      return setPasswordStatusMsg({ text: 'Enter your current password', ok: false });
    }
    if (passwordFields.newPw.length < 8) {
      return setPasswordStatusMsg({ text: 'New password must be at least 8 characters', ok: false });
    }
    if (!/[A-Z]/.test(passwordFields.newPw)) {
      return setPasswordStatusMsg({ text: 'Need at least one uppercase letter', ok: false });
    }
    if (!/\d/.test(passwordFields.newPw)) {
      return setPasswordStatusMsg({ text: 'Need at least one number', ok: false });
    }
    if (passwordFields.newPw !== passwordFields.confirm) {
      return setPasswordStatusMsg({ text: "Passwords don't match", ok: false });
    }
    setPasswordSaving(true);
    setPasswordStatusMsg(null);
    try {
      const res = await apiFetch(`/profile/${username}/change-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword: passwordFields.current, newPassword: passwordFields.newPw }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to change password');
      }
      setPasswordStatusMsg({ text: 'Password changed!', ok: true });
      setPasswordFields({ current: '', newPw: '', confirm: '' });
      setTimeout(() => setPasswordModalOpen(false), 1200);
    } catch (err) {
      setPasswordStatusMsg({ text: err.message, ok: false });
    } finally {
      setPasswordSaving(false);
    }
  }

  async function handleModeSwitch(newType) {
    setModeSaving(true);
    try {
      const res = await apiFetch(`/profile/${username}/update-type`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ profile_type: newType }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to switch mode');
      }
      setProfile(prev => ({ ...prev, profile_type: newType }));
      setStatusMsg({ text: `Switched to ${newType} mode!`, ok: true });
    } catch (err) {
      setStatusMsg({ text: err.message, ok: false });
    } finally {
      setModeSaving(false);
      setModeModalOpen(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="bg-white border border-gray-100 rounded-2xl p-4">
        <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-3">Profile Photo</p>
        <div className="flex items-center gap-4">
          <img src={photoPreview} alt="" className="w-16 h-16 rounded-full object-cover border-2 border-gray-100 flex-shrink-0" />
          <label className="h-9 px-4 rounded-full border border-gray-200 text-xs font-semibold text-gray-700 flex items-center cursor-pointer hover:bg-gray-50 active:scale-95 transition-colors">
            Change photo
            <input type="file" accept="image/*" className="hidden" onChange={handlePhotoChange} />
          </label>
        </div>
      </div>

      <div className={cn('border rounded-2xl p-4', isOrg ? 'bg-gradient-to-r from-blue-50 to-purple-50 border-purple-100' : 'bg-white border-gray-100')}>
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <p className="text-sm font-bold text-gray-900">Account Mode</p>
              {isOrg && <span className="text-[9px] font-black text-white bg-purple-600 rounded-full px-1.5 py-px">PRO</span>}
            </div>
            <p className="text-xs text-gray-400 mt-0.5">{isOrg ? 'Professional · Organisation' : 'Personal · Individual'}</p>
          </div>
          <button
            onClick={() => setModeModalOpen(true)}
            className="h-8 px-3 rounded-full border border-gray-200 text-xs font-semibold text-gray-700 active:scale-95 transition-colors bg-white"
          >
            Switch
          </button>
        </div>
      </div>

      <form onSubmit={handleProfileUpdate} className="bg-white border border-gray-100 rounded-2xl p-4 space-y-3">
        <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">Personal Details</p>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Full name</label>
          <input
            type="text"
            placeholder="Full name"
            value={fields.fullName}
            onChange={e => setFields(prev => ({ ...prev, fullName: e.target.value }))}
            className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl text-sm focus:outline-none focus:border-blue-400 focus:bg-white transition-colors"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Phone number</label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">{K.Phone}</span>
            <input
              type="tel"
              placeholder="+234 800 000 0000"
              value={fields.phone}
              onChange={e => setFields(prev => ({ ...prev, phone: e.target.value }))}
              className="w-full pl-9 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl text-sm focus:outline-none focus:border-blue-400 focus:bg-white transition-colors"
            />
          </div>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Email address</label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">{K.Mail}</span>
            <input
              type="email"
              placeholder="email@example.com"
              value={fields.email}
              onChange={e => setFields(prev => ({ ...prev, email: e.target.value }))}
              className="w-full pl-9 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl text-sm focus:outline-none focus:border-blue-400 focus:bg-white transition-colors"
            />
          </div>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Biography</label>
          <textarea
            placeholder="Tell people about yourself…"
            rows={3}
            value={fields.biography}
            onChange={e => setFields(prev => ({ ...prev, biography: e.target.value }))}
            className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl text-sm focus:outline-none focus:border-blue-400 focus:bg-white transition-colors resize-none"
          />
        </div>
        <Yt msg={statusMsg} />
        <button
          type="submit"
          disabled={saving}
          className={cn(
            'w-full h-11 rounded-full text-white text-sm font-bold active:scale-[0.98] disabled:opacity-50 transition-colors',
            isOrg ? 'bg-purple-600' : 'bg-blue-600'
          )}
        >
          {saving ? 'Saving…' : 'Save changes'}
        </button>
      </form>

      <div className="bg-white border border-gray-100 rounded-2xl p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-bold text-gray-900">Password</p>
            <p className="text-xs text-gray-400 mt-0.5 font-mono tracking-widest">••••••••••••</p>
          </div>
          <button
            onClick={() => {
              setPasswordModalOpen(true);
              setPasswordStatusMsg(null);
              setPasswordFields({ current: '', newPw: '', confirm: '' });
            }}
            className="h-8 px-3 rounded-full border border-gray-200 text-xs font-semibold text-gray-700 active:scale-95 transition-colors flex items-center gap-1.5"
          >
            {K.Lock} Change
          </button>
        </div>
      </div>

      {/* Password Modal */}
      <BottomSheet open={passwordModalOpen} onClose={() => setPasswordModalOpen(false)} title="Change Password" wide={true}>
        <form onSubmit={handlePasswordChange} className="px-4 py-4 space-y-3 pb-8 md:pb-4">
          <p className="text-xs text-gray-500 leading-relaxed">Enter your current password, then choose a new one.</p>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Current password</label>
            <div className="relative">
              <input
                type={showCurrentPw ? 'text' : 'password'}
                placeholder="Your current password"
                value={passwordFields.current}
                onChange={e => setPasswordFields(prev => ({ ...prev, current: e.target.value }))}
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl text-sm focus:outline-none focus:border-blue-400 focus:bg-white transition-colors pr-10"
              />
              <button
                type="button"
                onClick={() => setShowCurrentPw(prev => !prev)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700 transition-colors"
              >
                {showCurrentPw ? K.EyeOff : K.Eye}
              </button>
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">New password</label>
            <div className="relative">
              <input
                type={showNewPw ? 'text' : 'password'}
                placeholder="Min 8 chars, 1 uppercase, 1 number"
                value={passwordFields.newPw}
                onChange={e => setPasswordFields(prev => ({ ...prev, newPw: e.target.value }))}
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl text-sm focus:outline-none focus:border-blue-400 focus:bg-white transition-colors pr-10"
              />
              <button
                type="button"
                onClick={() => setShowNewPw(prev => !prev)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700 transition-colors"
              >
                {showNewPw ? K.EyeOff : K.Eye}
              </button>
            </div>
            {passwordFields.newPw.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {[
                  { label: '8+ chars', ok: passwordFields.newPw.length >= 8 },
                  { label: 'Uppercase', ok: /[A-Z]/.test(passwordFields.newPw) },
                  { label: 'Number', ok: /\d/.test(passwordFields.newPw) },
                ].map(item => (
                  <span
                    key={item.label}
                    className={cn(
                      'text-[11px] font-semibold px-2 py-0.5 rounded-full border transition-colors',
                      item.ok ? 'bg-green-50 border-green-200 text-green-600' : 'bg-gray-50 border-gray-200 text-gray-400'
                    )}
                  >
                    {item.ok ? '✓ ' : '○ '}{item.label}
                  </span>
                ))}
              </div>
            )}
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Confirm new password</label>
            <input
              type="password"
              placeholder="Repeat new password"
              value={passwordFields.confirm}
              onChange={e => setPasswordFields(prev => ({ ...prev, confirm: e.target.value }))}
              className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl text-sm focus:outline-none focus:border-blue-400 focus:bg-white transition-colors"
            />
          </div>
          <Yt msg={passwordStatusMsg} />
          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={() => setPasswordModalOpen(false)}
              className="flex-1 h-11 rounded-full border border-gray-200 text-sm font-semibold text-gray-600 active:scale-[0.98] transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={passwordSaving}
              className={cn(
                'flex-1 h-11 rounded-full text-white text-sm font-bold active:scale-[0.98] disabled:opacity-50 transition-colors',
                isOrg ? 'bg-purple-600' : 'bg-blue-600'
              )}
            >
              {passwordSaving ? 'Changing…' : 'Change Password'}
            </button>
          </div>
        </form>
      </BottomSheet>

      {/* Switch Mode Modal */}
      <BottomSheet open={modeModalOpen} onClose={() => setModeModalOpen(false)} title="Switch Account Mode">
        <div className="px-4 py-4 space-y-3 pb-8 md:pb-4">
          <div className={cn('border rounded-2xl p-4', isOrg ? 'bg-white border-gray-100' : 'bg-blue-50 border-blue-200')}>
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center flex-shrink-0 text-blue-600">{K.Profile}</div>
              <div className="flex-1">
                <p className="text-sm font-bold text-gray-900">Personal</p>
                <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">Standard account. Great for sharing life moments and connecting with friends.</p>
              </div>
              {!isOrg && <span className="text-blue-600 flex-shrink-0">{K.Check}</span>}
            </div>
            {isOrg && (
              <button
                onClick={() => handleModeSwitch('Individual')}
                disabled={modeSaving}
                className="w-full mt-3 h-9 rounded-full border border-gray-200 text-xs font-semibold text-gray-700 active:scale-[0.98] disabled:opacity-50 transition-colors"
              >
                Switch to Personal
              </button>
            )}
          </div>

          <div className={cn('border rounded-2xl p-4', isOrg ? 'bg-purple-50 border-purple-200' : 'bg-white border-gray-100')}>
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center flex-shrink-0 text-purple-600">{K.Bolt}</div>
              <div className="flex-1">
                <div className="flex items-center gap-1.5">
                  <p className="text-sm font-bold text-gray-900">Professional</p>
                  <span className="text-[9px] font-black text-white bg-purple-600 rounded-full px-1.5 py-px">PRO</span>
                </div>
                <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">
                  Unlocks advanced Analytics, detailed creator insights, engagement charts, and marks your profile as a verified organisation on Textmob.
                </p>
              </div>
              {isOrg && <span className="text-purple-600 flex-shrink-0">{K.Check}</span>}
            </div>
            {!isOrg && (
              <button
                onClick={() => handleModeSwitch('Organisation')}
                disabled={modeSaving}
                className="w-full mt-3 h-9 rounded-full bg-purple-600 text-white text-xs font-semibold active:scale-[0.98] disabled:opacity-50 transition-colors"
              >
                {modeSaving ? 'Switching…' : 'Enable Professional Mode'}
              </button>
            )}
          </div>
          <p className="text-[11px] text-gray-400 text-center">You can switch back at any time. No data is lost.</p>
        </div>
      </BottomSheet>
    </div>
  );
}

// 3. PostsTab (_Component4)
function PostsTab({ posts, setPosts, username }) {
  const [editingPost, setEditingPost] = useState(null);
  const [editText, setEditText] = useState('');
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  async function saveEdit() {
    if (editingPost) {
      setSaving(true);
      try {
        const res = await apiFetch(`/edit-post`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ postId: editingPost.id, content: editText }),
        });
        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || 'Failed');
        }
        setPosts(prev => prev.map(p => (p.id === editingPost.id ? { ...p, text: editText } : p)));
        setEditingPost(null);
      } catch (err) {
        alert(err.message);
      } finally {
        setSaving(false);
      }
    }
  }

  async function deletePost(postId) {
    if (confirm('Delete this post?')) {
      setDeletingId(postId);
      try {
        const res = await apiFetch(`/delete-post?postId=${encodeURIComponent(postId)}`, {
          method: 'DELETE',
        });
        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || 'Failed');
        }
        setPosts(prev => prev.filter(p => p.id !== postId));
      } catch (err) {
        alert(err.message);
      } finally {
        setDeletingId(null);
      }
    }
  }

  function formatTime(createdAt) {
    const diff = Date.now() - new Date(createdAt).getTime();
    const minutes = Math.floor(diff / 60000);
    if (minutes < 1) return 'just now';
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
  }

  if (posts.length) {
    return (
      <div className="space-y-3">
        <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">
          {posts.length} post{posts.length === 1 ? '' : 's'}
        </p>
        {posts.map(post => (
          <div className="bg-white border border-gray-100 rounded-2xl p-4" key={post.id}>
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs text-gray-400">{formatTime(post.created_at)}</p>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => window.Lexum ? window.Lexum.navigate(`/post/${post.id}`) : (window.location.href = `/post/${post.id}`)}
                  className="w-8 h-8 rounded-full flex items-center justify-center text-gray-400 hover:text-blue-600 hover:bg-blue-50 active:scale-95 transition-colors"
                  title="View"
                >
                  {K.Link}
                </button>
                <button
                  onClick={() => {
                    setEditingPost(post);
                    setEditText(post.text?.replace(/<[^>]*>/g, '') || '');
                  }}
                  className="w-8 h-8 rounded-full flex items-center justify-center text-gray-400 hover:text-gray-700 hover:bg-gray-100 active:scale-95 transition-colors"
                  title="Edit"
                >
                  {K.Edit}
                </button>
                <button
                  onClick={() => deletePost(post.id)}
                  disabled={deletingId === post.id}
                  className="w-8 h-8 rounded-full flex items-center justify-center text-gray-400 hover:text-red-500 hover:bg-red-50 active:scale-95 transition-colors disabled:opacity-40"
                  title="Delete"
                >
                  {K.Trash}
                </button>
              </div>
            </div>
            {post.text && <p className="text-sm text-gray-800 leading-snug line-clamp-2 mb-2">{post.text.replace(/<[^>]*>/g, '')}</p>}
            {post.media?.[0] && (
              <div className="rounded-xl overflow-hidden h-28 bg-gray-100 mb-2">
                {/\.(mp4|webm|ogg)/i.test(post.media[0]) ? (
                  <video src={post.media[0]} className="w-full h-full object-cover" muted={true} />
                ) : (
                  <img src={post.media[0]} alt="" className="w-full h-full object-cover" />
                )}
              </div>
            )}
            <div className="flex items-center gap-4 text-xs text-gray-400">
              <span>❤️ {post.likes?.length || 0}</span>
              <span>💬 {post.comments?.length || 0}</span>
              {post.type === 'poll' && <span className="text-blue-500 font-semibold">Poll</span>}
              {post.type === 'event' && <span className="text-green-500 font-semibold">Event</span>}
            </div>
          </div>
        ))}

        {/* Edit Post Modal */}
        <BottomSheet open={!!editingPost} onClose={() => setEditingPost(null)} title="Edit Post" wide={true}>
          <div className="px-4 py-4 pb-8 md:pb-4 space-y-3">
            <textarea
              value={editText}
              onChange={e => setEditText(e.target.value)}
              rows={6}
              className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl text-sm focus:outline-none focus:border-blue-400 focus:bg-white transition-colors resize-none"
            />
            <div className="flex gap-2">
              <button
                onClick={() => setEditingPost(null)}
                className="flex-1 h-11 rounded-full border border-gray-200 text-sm font-semibold text-gray-600 active:scale-[0.98] transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={saveEdit}
                disabled={saving}
                className="flex-1 h-11 rounded-full bg-blue-600 text-white text-sm font-bold active:scale-[0.98] disabled:opacity-50 transition-colors"
              >
                {saving ? 'Saving…' : 'Save'}
              </button>
            </div>
          </div>
        </BottomSheet>
      </div>
    );
  } else {
    return (
      <div className="flex flex-col items-center py-16 gap-3 text-center">
        <div className="w-14 h-14 rounded-full bg-gray-100 flex items-center justify-center text-gray-300">{K.Posts}</div>
        <p className="text-sm font-semibold text-gray-500">No posts yet</p>
        <p className="text-xs text-gray-400 max-w-[200px]">Head to the home feed and create your first post.</p>
        <button
          onClick={() => window.Lexum ? window.Lexum.navigate('/') : (window.location.href = '/')}
          className="h-9 px-5 rounded-full bg-blue-600 text-white text-xs font-bold active:scale-95 transition-colors mt-1"
        >
          Go to Feed
        </button>
      </div>
    );
  }
}

// 4. AnalyticsTab (_Component5)
function AnalyticsTab({ posts, stats, profile, isOrg }) {
  const chartRef1 = useRef(null);
  const chartRef2 = useRef(null);
  const chartRef3 = useRef(null);
  const chartRef4 = useRef(null);
  const chartRef5 = useRef(null);
  const chartRef6 = useRef(null);

  const likesCount = posts.reduce((acc, p) => acc + (p.likes?.length || 0), 0);
  const commentsCount = posts.reduce((acc, p) => acc + (p.comments?.length || 0), 0);
  const votesCount = posts.reduce((acc, p) => acc + (p.options || []).reduce((sum, o) => sum + (o.votes?.length || 0), 0), 0);
  const totalInteractions = likesCount + commentsCount + votesCount;

  const followersList = Array.isArray(profile?.followers) ? profile.followers : [];
  const followersCount = followersList.length;

  const avgInteractions = posts.length ? parseFloat((totalInteractions / posts.length).toFixed(2)) : 0;
  const engagementRate = followersCount > 0 ? parseFloat((totalInteractions / followersCount * 100).toFixed(1)) : null;

  const followerUsernames = new Set(followersList.map(u => String(u).toLowerCase().trim()));
  const allLikers = new Set();
  const followerLikers = new Set();
  const nonFollowerLikers = new Set();

  posts.forEach(post => {
    (post.likes || []).forEach(liker => {
      const u = String(liker).toLowerCase().trim();
      allLikers.add(u);
      if (followerUsernames.has(u)) {
        followerLikers.add(u);
      } else {
        nonFollowerLikers.add(u);
      }
    });
  });

  const totalUniqueLikers = allLikers.size;
  const followerUniqueLikers = followerLikers.size;
  const nonFollowerUniqueLikers = nonFollowerLikers.size;

  const avgLikesPerPost = posts.length ? (likesCount / posts.length).toFixed(1) : 0;
  const avgCommentsPerPost = posts.length ? (commentsCount / posts.length).toFixed(1) : 0;

  const topPost = [...posts].sort(
    (a, b) => (b.likes?.length || 0) + (b.comments?.length || 0) - ((a.likes?.length || 0) + (a.comments?.length || 0))
  )[0];

  const monthlyData = {};
  posts.forEach(post => {
    const d = new Date(post.created_at);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    monthlyData[key] ||= { posts: 0, likes: 0, comments: 0 };
    monthlyData[key].posts++;
    monthlyData[key].likes += post.likes?.length || 0;
    monthlyData[key].comments += post.comments?.length || 0;
  });

  const sortedMonths = Object.keys(monthlyData).sort().slice(-6);
  const monthLabels = sortedMonths.map(key => {
    const [year, month] = key.split('-');
    return new Date(year, month - 1).toLocaleString('default', { month: 'short' });
  });

  const postsTrend = sortedMonths.map(key => monthlyData[key].posts);
  const likesTrend = sortedMonths.map(key => monthlyData[key].likes);
  const commentsTrend = sortedMonths.map(key => monthlyData[key].comments);

  const contentMix = posts.reduce((acc, p) => {
    const type = p.type || 'post';
    acc[type] = (acc[type] || 0) + 1;
    return acc;
  }, {});

  useEffect(() => {
    if (typeof window === 'undefined' || !window.Chart || !isOrg) return;
    const ChartClass = window.Chart;

    function destroyChart(ref) {
      if (ref.current?._chart) {
        try {
          ref.current._chart.destroy();
        } catch { }
        ref.current._chart = null;
      }
    }

    [chartRef1, chartRef2, chartRef3, chartRef4, chartRef5, chartRef6].forEach(destroyChart);

    const gridColor = '#f3f4f6';
    const blueColor = '#3B82F6';
    const purpleColor = '#8B5CF6';
    const greenColor = '#10B981';
    const orangeColor = '#F59E0B';
    const redColor = '#EF4444';

    const baseOptions = {
      responsive: true,
      maintainAspectRatio: true,
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: '#111827',
          titleColor: '#f9fafb',
          bodyColor: '#d1d5db',
          padding: 10,
          cornerRadius: 10,
          displayColors: true,
        },
      },
    };

    if (chartRef1.current) {
      chartRef1.current._chart = new ChartClass(chartRef1.current, {
        type: 'bar',
        data: {
          labels: ['Likes', 'Comments', 'Poll Votes'],
          datasets: [{ data: [likesCount, commentsCount, votesCount], backgroundColor: [redColor, blueColor, orangeColor], borderRadius: 10, borderSkipped: false }],
        },
        options: {
          ...baseOptions,
          scales: {
            y: { beginAtZero: true, grid: { color: gridColor }, border: { display: false }, ticks: { color: '#9ca3af' } },
            x: { grid: { display: false }, ticks: { color: '#6b7280' } },
          },
        },
      });
    }

    if (chartRef2.current) {
      const currentAvg = Math.min(avgInteractions, 5);
      const remainingBench = Math.max(0, 5 - currentAvg);
      chartRef2.current._chart = new ChartClass(chartRef2.current, {
        type: 'doughnut',
        data: {
          labels: [`Your avg (${avgInteractions})`, 'Benchmark (5)'],
          datasets: [{ data: [currentAvg, remainingBench], backgroundColor: [purpleColor, '#e5e7eb'], borderWidth: 0, cutout: '78%' }],
        },
        options: {
          ...baseOptions,
          plugins: {
            ...baseOptions.plugins,
            legend: {
              display: true,
              position: 'bottom',
              labels: { color: '#6b7280', font: { size: 12 }, padding: 16, boxWidth: 12 },
            },
          },
        },
      });
    }

    if (chartRef6.current && totalUniqueLikers > 0) {
      chartRef6.current._chart = new ChartClass(chartRef6.current, {
        type: 'doughnut',
        data: {
          labels: [`Followers (${followerUniqueLikers})`, `Non-followers (${nonFollowerUniqueLikers})`],
          datasets: [{ data: [followerUniqueLikers, nonFollowerUniqueLikers], backgroundColor: [blueColor, greenColor], borderWidth: 0, cutout: '72%' }],
        },
        options: {
          ...baseOptions,
          plugins: {
            ...baseOptions.plugins,
            legend: {
              display: true,
              position: 'bottom',
              labels: { color: '#6b7280', font: { size: 12 }, padding: 16, boxWidth: 12 },
            },
          },
        },
      });
    }

    if (chartRef3.current && sortedMonths.length) {
      chartRef3.current._chart = new ChartClass(chartRef3.current, {
        type: 'line',
        data: {
          labels: monthLabels,
          datasets: [
            {
              label: 'Posts',
              data: postsTrend,
              borderColor: blueColor,
              backgroundColor: 'rgba(59,130,246,.08)',
              borderWidth: 2,
              tension: 0.4,
              fill: true,
              pointRadius: 4,
              pointBackgroundColor: blueColor,
            },
            {
              label: 'Likes',
              data: likesTrend,
              borderColor: redColor,
              backgroundColor: 'rgba(239,68,68,.06)',
              borderWidth: 2,
              tension: 0.4,
              fill: true,
              pointRadius: 4,
              pointBackgroundColor: redColor,
            },
          ],
        },
        options: {
          ...baseOptions,
          plugins: {
            ...baseOptions.plugins,
            legend: {
              display: true,
              position: 'top',
              labels: { color: '#6b7280', font: { size: 12 }, padding: 16, boxWidth: 12 },
            },
          },
          scales: {
            y: { beginAtZero: true, grid: { color: gridColor }, border: { display: false }, ticks: { color: '#9ca3af' } },
            x: { grid: { display: false }, ticks: { color: '#6b7280' } },
          },
        },
      });
    }

    if (chartRef4.current && sortedMonths.length) {
      chartRef4.current._chart = new ChartClass(chartRef4.current, {
        type: 'bar',
        data: {
          labels: monthLabels,
          datasets: [
            { label: 'Posts', data: postsTrend, backgroundColor: blueColor, borderRadius: 6, borderSkipped: false },
            { label: 'Comments', data: commentsTrend, backgroundColor: greenColor, borderRadius: 6, borderSkipped: false },
          ],
        },
        options: {
          ...baseOptions,
          plugins: {
            ...baseOptions.plugins,
            legend: {
              display: true,
              position: 'top',
              labels: { color: '#6b7280', font: { size: 12 }, padding: 16, boxWidth: 12 },
            },
          },
          scales: {
            y: { beginAtZero: true, grid: { color: gridColor }, border: { display: false }, ticks: { color: '#9ca3af' } },
            x: { grid: { display: false }, ticks: { color: '#6b7280' } },
          },
        },
      });
    }

    if (chartRef5.current && Object.keys(contentMix).length > 1) {
      const labels = Object.keys(contentMix);
      const data = labels.map(l => contentMix[l]);
      const colors = [blueColor, greenColor, orangeColor, purpleColor, redColor];
      chartRef5.current._chart = new ChartClass(chartRef5.current, {
        type: 'doughnut',
        data: {
          labels: labels.map(l => l.charAt(0).toUpperCase() + l.slice(1)),
          datasets: [{ data: data, backgroundColor: colors.slice(0, labels.length), borderWidth: 0, cutout: '70%' }],
        },
        options: {
          ...baseOptions,
          plugins: {
            ...baseOptions.plugins,
            legend: {
              display: true,
              position: 'bottom',
              labels: { color: '#6b7280', font: { size: 12 }, padding: 12, boxWidth: 12 },
            },
          },
        },
      });
    }

    return () => {
      [chartRef1, chartRef2, chartRef3, chartRef4, chartRef5, chartRef6].forEach(destroyChart);
    };
  }, [posts, stats, profile, isOrg]);

  if (!isOrg) {
    return (
      <div className="flex flex-col items-center py-16 gap-4 text-center">
        <div className="w-16 h-16 rounded-2xl bg-purple-50 flex items-center justify-center text-purple-500 text-2xl">📊</div>
        <p className="text-sm font-bold text-gray-900">Analytics needs Professional Mode</p>
        <p className="text-xs text-gray-400 max-w-[240px] leading-relaxed">
          Switch to Professional in your Profile tab to unlock detailed engagement analytics, monthly trends, and creator insights.
        </p>
      </div>
    );
  }

  function getRatingMsg(rate) {
    if (rate === 0) return 'Post more content to see your stats';
    if (rate < 2) return 'Growing — keep posting consistently';
    if (rate < 5) return 'Good — your content is resonating';
    if (rate < 10) return 'Great engagement — keep it up!';
    return 'Excellent — your content is thriving!';
  }

  return (
    <div className="space-y-4">
      <div className="bg-gradient-to-br from-blue-600 to-purple-700 rounded-2xl p-5 text-white">
        <p className="text-xs font-bold text-blue-200 uppercase tracking-widest mb-1">Avg interactions per post</p>
        <div className="flex items-end gap-3 mb-3">
          <p className="text-5xl font-black leading-none">{avgInteractions}</p>
          <div className="pb-1">
            <p className="text-sm text-blue-200">{totalInteractions} total interactions</p>
            <p className="text-xs text-blue-300">{posts.length} posts</p>
          </div>
        </div>
        <div className="h-1.5 bg-white/20 rounded-full overflow-hidden mb-1">
          <div className="h-full bg-white rounded-full transition-all" style={{ width: `${Math.min(100, (avgInteractions / 5) * 100)}%` }} />
        </div>
        <p className="text-[11px] text-blue-300">{getRatingMsg(avgInteractions)}</p>
      </div>

      {followersCount > 0 ? (
        <div className="bg-white border border-gray-100 rounded-2xl p-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">Follower engagement rate</p>
            <p className="text-xl font-black text-purple-600">{engagementRate}%</p>
          </div>
          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
            <div className="h-full bg-purple-600 rounded-full transition-all" style={{ width: `${Math.min(100, engagementRate)}%` }} />
          </div>
          <p className="text-[11px] text-gray-400 mt-1.5">{totalInteractions} interactions · {followersCount} followers</p>
        </div>
      ) : (
        <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4 flex items-start gap-3">
          <svg viewBox="0 0 24 24" className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5 fill-none stroke-current" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          <div>
            <p className="text-xs font-bold text-blue-700">No followers yet</p>
            <p className="text-xs text-blue-500 mt-0.5 leading-relaxed">
              Follower engagement rate will appear once you have followers. Your avg interactions per post above still shows how your content performs.
            </p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        {[{ label: 'Total Likes', value: likesCount, accent: 'text-red-500', icon: K.Star },
        { label: 'Total Comments', value: commentsCount, accent: 'text-blue-500', icon: K.Posts },
        { label: 'Avg Likes/Post', value: avgLikesPerPost, accent: 'text-amber-500', icon: K.Star },
        { label: 'Avg Comments', value: avgCommentsPerPost, accent: 'text-green-500', icon: K.Posts },
        { label: 'Followers', value: followersCount, accent: 'text-purple-500', icon: K.Profile },
        { label: 'Unique Likers', value: totalUniqueLikers || '—', accent: 'text-blue-500', icon: K.Eye }
        ].map(item => (
          <Jt key={item.label} label={item.label} value={item.value} icon={item.icon} accent={item.accent} />
        ))}
      </div>

      {topPost && (
        <div className="bg-white border border-gray-100 rounded-2xl p-4">
          <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-2">Top performing post</p>
          <p className="text-sm text-gray-800 line-clamp-2 leading-snug mb-2">{(topPost.text || '').replace(/<[^>]*>/g, '') || '(media post)'}</p>
          <div className="flex items-center gap-4 text-xs text-gray-400">
            <span>{topPost.likes?.length || 0} likes</span>
            <span>{topPost.comments?.length || 0} comments</span>
            <button
              onClick={() => window.Lexum ? window.Lexum.navigate(`/post/${topPost.id}`) : (window.location.href = `/post/${topPost.id}`)}
              className="ml-auto text-blue-600 font-semibold active:opacity-70 transition-opacity"
            >
              View →
            </button>
          </div>
        </div>
      )}

      <div className="bg-white border border-gray-100 rounded-2xl p-4">
        <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-3">Interactions breakdown</p>
        <canvas ref={chartRef1} height={180} />
      </div>

      <div className="bg-white border border-gray-100 rounded-2xl p-4">
        <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-1">Per-post engagement vs benchmark</p>
        <p className="text-xs text-gray-400 mb-3">Your average of <span className="font-bold text-gray-700">{avgInteractions}</span> interactions/post vs industry benchmark of 5</p>
        <div className="flex justify-center">
          <div className="w-48">
            <canvas ref={chartRef2} />
          </div>
        </div>
      </div>

      {totalUniqueLikers > 0 && (
        <div className="bg-white border border-gray-100 rounded-2xl p-4">
          <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-1">Who liked your posts</p>
          <p className="text-xs text-gray-400 mb-3">
            {totalUniqueLikers} unique people liked your posts —
            {followerUniqueLikers > 0 ? ` ${followerUniqueLikers} are followers, ${nonFollowerUniqueLikers} found you organically` : ' none are your followers yet (organic reach!)'}
          </p>
          <div className="flex justify-center">
            <div className="w-48">
              <canvas ref={chartRef6} />
            </div>
          </div>
          <div className="flex gap-2 mt-3">
            <div className="flex-1 bg-blue-50 border border-blue-100 rounded-xl px-3 py-2 text-center">
              <p className="text-lg font-black text-blue-600">{followerUniqueLikers}</p>
              <p className="text-[10px] text-blue-500 font-semibold">Followers</p>
            </div>
            <div className="flex-1 bg-green-50 border border-green-100 rounded-xl px-3 py-2 text-center">
              <p className="text-lg font-black text-green-600">{nonFollowerUniqueLikers}</p>
              <p className="text-[10px] text-green-500 font-semibold">Non-followers</p>
            </div>
          </div>
        </div>
      )}

      {sortedMonths.length > 0 && (
        <>
          <div className="bg-white border border-gray-100 rounded-2xl p-4">
            <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-3">Monthly trend</p>
            <canvas ref={chartRef3} height={180} />
          </div>
          <div className="bg-white border border-gray-100 rounded-2xl p-4">
            <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-3">Monthly posts & comments</p>
            <canvas ref={chartRef4} height={180} />
          </div>
        </>
      )}

      {Object.keys(contentMix).length > 1 && (
        <div className="bg-white border border-gray-100 rounded-2xl p-4">
          <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-3">Content mix</p>
          <div className="flex justify-center">
            <div className="w-48">
              <canvas ref={chartRef5} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// 5. GrowTab (_Component6)
function GrowTab({ stats, profile, username, isOrg }) {
  const mobcoins = stats?.mobcoins ?? 0;
  const rank = stats?.rank ?? null;
  const streak = stats?.streak ?? 0;
  const followers = stats?.followers ?? profile?.followers?.length ?? 0;
  const postCount = stats?.post_count ?? 0;

  const tips = [
    { icon: '🔥', title: 'Post daily', body: 'Accounts posting daily grow 3× faster. Even a short thought counts.' },
    { icon: '💬', title: 'Reply to comments', body: 'Every reply counts as engagement and pushes your post higher in feeds.' },
    { icon: '📊', title: 'Use polls', body: 'Poll posts get 2× more engagement on average.' },
    { icon: '🎥', title: 'Go live', body: 'Live streams push you to the top of feeds instantly. Even 10 minutes helps.' },
    { icon: '🤝', title: 'Connect with people', body: 'A bigger network means more eyes on your posts.' },
    { icon: '⚡', title: 'Share snaps', body: 'Snaps get huge reach in the feed. Post more snaps to boost your account.' },
  ];

  const achievements = [
    { id: 'p5', label: '5 Posts', done: postCount >= 5, icon: '✍️' },
    { id: 'p25', label: '25 Posts', done: postCount >= 25, icon: '📝' },
    { id: 'f10', label: '10 Followers', done: followers >= 10, icon: '👥' },
    { id: 'f100', label: '100 Followers', done: followers >= 100, icon: '🚀' },
    { id: 'c50', label: '50 Mobcoins', done: mobcoins >= 50, icon: '🪙' },
    { id: 's3', label: '3-day Streak', done: streak >= 3, icon: '🔥' },
  ];

  const primaryBtnColor = isOrg ? 'bg-purple-600' : 'bg-blue-600';

  return (
    <div className="space-y-4">
      <div className="bg-white border border-gray-100 rounded-2xl p-4 flex items-center gap-4">
        <div className="w-12 h-12 rounded-2xl bg-yellow-50 flex items-center justify-center flex-shrink-0 text-2xl">🪙</div>
        <div className="flex-1">
          <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">Mobcoins</p>
          <p className="text-2xl font-black text-gray-900">{mobcoins}</p>
          <p className="text-xs text-gray-400">In-app currency · not real money</p>
        </div>
        <button
          onClick={() => window.Lexum ? window.Lexum.navigate('/wallet') : (window.location.href = '/wallet')}
          className="h-8 px-3 rounded-full bg-yellow-400 text-yellow-900 text-xs font-bold active:scale-95 transition-colors"
        >
          Wallet
        </button>
      </div>

      <div className="bg-white border border-gray-100 rounded-2xl p-4 flex items-center gap-4">
        <div className="w-12 h-12 rounded-2xl bg-blue-50 flex items-center justify-center flex-shrink-0 text-yellow-500">{K.Crown}</div>
        <div className="flex-1">
          <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">Hall of Fame</p>
          <p className="text-2xl font-black text-gray-900">{rank ? `#${rank}` : 'Unranked'}</p>
          <p className="text-xs text-gray-400">{rank ? 'Great job! Keep posting.' : 'Post more to earn a rank'}</p>
        </div>
        <button
          onClick={() => window.Lexum ? window.Lexum.navigate('/halloffame') : (window.location.href = '/halloffame')}
          className="h-8 px-3 rounded-full border border-gray-200 text-xs font-semibold text-gray-600 active:scale-95 transition-colors"
        >
          View
        </button>
      </div>

      <div className="bg-white border border-gray-100 rounded-2xl p-4 flex items-center gap-4">
        <div className="w-12 h-12 rounded-2xl bg-orange-50 flex items-center justify-center flex-shrink-0 text-2xl">🔥</div>
        <div className="flex-1">
          <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">Posting Streak</p>
          <p className="text-2xl font-black text-gray-900">{streak} day{streak === 1 ? '' : 's'}</p>
          <p className="text-xs text-gray-400">Post every day to keep it alive</p>
        </div>
      </div>

      <div>
        <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-2">Achievements</p>
        <div className="grid grid-cols-3 gap-2">
          {achievements.map(ach => (
            <div
              key={ach.id}
              className={cn(
                'flex flex-col items-center gap-1 p-3 rounded-2xl border text-center',
                ach.done ? (isOrg ? 'bg-purple-50 border-purple-200' : 'bg-blue-50 border-blue-200') : 'bg-gray-50 border-gray-100 opacity-50'
              )}
            >
              <span className="text-xl">{ach.icon}</span>
              <p className="text-[11px] font-semibold text-gray-700 leading-tight">{ach.label}</p>
              {ach.done && <span className={isOrg ? 'text-purple-600' : 'text-blue-600'}>{K.Check}</span>}
            </div>
          ))}
        </div>
      </div>

      <div>
        <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-2">Tips to grow faster</p>
        <div className="space-y-2">
          {tips.map((tip, idx) => (
            <div className="flex items-start gap-3 bg-white border border-gray-100 rounded-2xl px-4 py-3" key={idx}>
              <span className="text-lg flex-shrink-0">{tip.icon}</span>
              <div>
                <p className="text-sm font-semibold text-gray-900 leading-tight">{tip.title}</p>
                <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{tip.body}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <button
          onClick={() => window.Lexum ? window.Lexum.navigate('/') : (window.location.href = '/')}
          className={cn('h-11 rounded-full text-white text-xs font-bold active:scale-95 transition-colors', primaryBtnColor)}
        >
          Create Post
        </button>
        <button
          onClick={() => window.Lexum ? window.Lexum.navigate('/create-live') : (window.location.href = '/create-live')}
          className="h-11 rounded-full border border-gray-200 text-xs font-semibold text-gray-700 active:scale-95 transition-colors"
        >
          Go Live 🎙️
        </button>
      </div>
    </div>
  );
}

// 6. PrefsTab (_Component7)
function PrefsTab({ user, setProfile }) {
  const [darkMode, setDarkMode] = useState(localStorage.getItem('darkMode') || 'system');
  const [notifs, setNotifs] = useState(
    user?.notification_prefs || {
      likes: { inApp: true, email: true },
      comments: { inApp: true, email: true },
      mentions: { inApp: true, email: true },
      followers: { inApp: true, email: true },
      newPost: { inApp: true, email: false },
      messages: { inApp: true, email: true },
      mobcoins: { inApp: true, email: true },
      events: { inApp: true, email: true },
    }
  );
  const [autoSaving, setAutoSaving] = useState(false);

  useEffect(() => {
    if (user?.notification_prefs) {
      setNotifs(user.notification_prefs);
    }
  }, [user?.notification_prefs]);

  useEffect(() => {
    localStorage.setItem('darkMode', darkMode);
    window.dispatchEvent(new CustomEvent('app:preferences:update', { detail: { darkMode } }));
  }, [darkMode]);

  async function handleNotifPrefChange(key, channel) {
    if (!user) return;
    const prefVal = notifs[key] || { inApp: true, email: true };
    const updated = {
      ...notifs,
      [key]: { ...prefVal, [channel]: !prefVal[channel] },
    };
    setNotifs(updated);
    setAutoSaving(true);
    try {
      const res = await apiFetch(`/profile/${user.username}/notification-prefs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notification_prefs: updated }),
      });
      if (res.ok) {
        if (setProfile) {
          setProfile(prev => ({ ...prev, notification_prefs: updated }));
        }
      } else {
        throw new Error('Failed to save');
      }
    } catch (err) {
      console.error(err);
      alert('Failed to save preferences. Please check your connection.');
      setNotifs(user?.notification_prefs || notifs);
    }
    setTimeout(() => setAutoSaving(false), 600);
  }

  const themes = [
    { value: 'system', label: 'Follow system', sub: 'Matches your device theme' },
    { value: 'light', label: 'Always light', sub: 'Always use the light theme' },
    { value: 'dark', label: 'Always dark', sub: 'Always use the dark theme' },
  ];

  const notifSections = [
    {
      title: 'Interactions',
      items: [
        { id: 'likes', label: 'Likes', sub: 'Post likes', icon: '❤️' },
        { id: 'comments', label: 'Comments', sub: 'Post replies', icon: '💬' },
        { id: 'mentions', label: 'Mentions', sub: `Tagging @${user?.username || ''}`, icon: '🏷️' },
      ],
    },
    {
      title: 'Social Activity',
      items: [
        { id: 'followers', label: 'Follows & Friends', sub: 'New connections', icon: '👤' },
        { id: 'newPost', label: 'Post Alerts', sub: 'When friends post', icon: '✨' },
        { id: 'messages', label: 'Messages', sub: 'Direct inbox', icon: '📩' },
      ],
    },
    {
      title: 'Finance & Utility',
      items: [
        { id: 'mobcoins', label: 'Mobcoins', sub: 'Currency updates', icon: '💰' },
        { id: 'events', label: 'Events', sub: 'Event interest', icon: '📅' },
      ],
    },
  ];

  return (
    <div className="space-y-6 pb-24">
      <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden shadow-sm">
        <div className="px-4 py-3 border-b border-gray-100 bg-gray-50/30 font-bold text-[10px] text-gray-400 uppercase tracking-widest">Theme</div>
        {themes.map((theme, idx) => (
          <button
            key={theme.value}
            onClick={() => setDarkMode(theme.value)}
            className={cn(
              'w-full flex items-center gap-3 px-4 py-4 transition-colors active:bg-gray-50 text-left',
              idx < themes.length - 1 ? 'border-b border-gray-100' : ''
            )}
          >
            <div className="flex-1">
              <p className="text-sm font-semibold text-gray-900">{theme.label}</p>
              <p className="text-xs text-gray-400 mt-0.5">{theme.sub}</p>
            </div>
            {darkMode === theme.value && <span className="text-blue-600 font-black">✓</span>}
          </button>
        ))}
      </div>

      <div className="flex items-center justify-between px-1">
        <p className="text-lg font-black text-gray-900">Notifications</p>
        {autoSaving && <span className="text-[10px] font-bold text-blue-500 animate-pulse">Auto-saving…</span>}
      </div>

      {notifSections.map((section, sIdx) => (
        <div className="bg-white border border-gray-100 rounded-3xl overflow-hidden shadow-sm" key={sIdx}>
          <div className="px-5 py-3 border-b border-gray-100 bg-gray-50/55 text-[10px] font-black text-gray-400 uppercase tracking-widest">{section.title}</div>
          <div className="divide-y divide-gray-50">
            {section.items.map(item => {
              const prefVal = notifs[item.id] || { inApp: true, email: true };
              return (
                <div className="p-4 flex flex-col gap-4" key={item.id}>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-gray-50 flex items-center justify-center text-lg">{item.icon}</div>
                    <div>
                      <p className="text-sm font-bold text-gray-900 leading-none">{item.label}</p>
                      <p className="text-[11px] text-gray-400 mt-1">{item.sub}</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <ToggleButton active={prefVal.inApp} label="In-app" onClick={() => handleNotifPrefChange(item.id, 'inApp')} />
                    <ToggleButton active={prefVal.email} label="Email" onClick={() => handleNotifPrefChange(item.id, 'email')} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

function ToggleButton({ active, label, onClick }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex-1 flex items-center justify-between px-3 py-2.5 rounded-xl border transition-all text-[11px] font-bold',
        active ? 'bg-blue-50 border-blue-200 text-blue-700 shadow-sm' : 'bg-gray-50 border-gray-100 text-gray-400'
      )}
    >
      <span>{label}</span>
      <div className={cn('w-7 h-4 rounded-full relative transition-colors p-0.5', active ? 'bg-blue-500' : 'bg-gray-200')}>
        <div className={cn('w-3 h-3 bg-white rounded-full shadow-sm transition-transform', active ? 'translate-x-3' : 'translate-x-0')} />
      </div>
    </button>
  );
}

// 7. DangerTab (_Component8)
function DangerTab({ username }) {
  const [confirmVal, setConfirmVal] = useState('');
  const [deactivating, setDeactivating] = useState(false);

  async function deactive() {
    if (confirmVal === username) {
      setDeactivating(true);
      try {
        const res = await apiFetch(`/deactivate-account`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username }),
        });
        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || 'Failed');
        }
        localStorage.removeItem('currentUser');
        localStorage.removeItem('cached_profile_pic');
        if (window.Lexum) window.Lexum.navigate('/auth');
        else window.location.href = '/auth';
      } catch (err) {
        alert(err.message);
        setDeactivating(false);
      }
    }
  }

  return (
    <div className="space-y-4">
      <div className="bg-red-50 border border-red-100 rounded-2xl p-4 flex items-start gap-3">
        <span className="text-red-500 flex-shrink-0 mt-0.5">{K.Danger}</span>
        <div>
          <p className="text-sm font-bold text-red-700">This is permanent</p>
          <p className="text-xs text-red-600 mt-0.5 leading-relaxed">
            Deactivating permanently deletes your profile, posts, followers, and all data. Cannot be undone.
          </p>
        </div>
      </div>
      <div className="bg-white border border-gray-100 rounded-2xl p-4 space-y-3">
        <p className="text-sm font-semibold text-gray-900">
          Type <span className="font-black text-red-600">@{username}</span> to confirm
        </p>
        <input
          type="text"
          placeholder={`@${username}`}
          value={confirmVal}
          onChange={e => setConfirmVal(e.target.value)}
          className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl text-sm focus:outline-none focus:border-red-400 transition-colors"
        />
        <button
          onClick={deactive}
          disabled={confirmVal !== username || deactivating}
          className="w-full h-11 rounded-full bg-red-500 text-white text-sm font-bold active:scale-[0.98] disabled:opacity-40 transition-colors"
        >
          {deactivating ? 'Deactivating…' : 'Permanently Deactivate Account'}
        </button>
      </div>
    </div>
  );
}
