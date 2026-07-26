import { useState, useEffect, useRef } from 'react';
import { apiFetch, getCurrentUser } from '../config/api';
import { cn } from '../utils/classNames';
import BottomSheet from '../components/ui/BottomSheet';
import SkeletonRow from '../components/ui/SkeletonRow';
import RichText from '../components/ui/RichText';
import AutocompleteDropdown from '../components/layout/AutocompleteDropdown';
import NavIcons from '../utils/navIcons';
import MakePostContent from './posts/MakePostContent';

// ─── Icons ───────────────────────────────────────────────────────────────────
const K = {
  Home: <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" /><polyline points="9 22 9 12 15 12 15 22" /></svg>,
  Profile: <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="8" r="4" /><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" /></svg>,
  Posts: <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /></svg>,
  Chart: <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12" /></svg>,
  Grow: <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18" /><polyline points="17 6 23 6 23 12" /></svg>,
  Prefs: <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" /></svg>,
  Logout: <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" /></svg>,
  Coin: <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="9" /><path d="M12 7v1m0 8v1m-3-5h6" /></svg>,
  Crown: <svg viewBox="0 0 24 24" className="w-4 h-4" fill="currentColor"><path d="M2 20h20v2H2v-2zM4 18l3-10 5 6 5-6 3 10H4z" /></svg>,
  Edit: <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>,
  Trash: <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14H6L5 6" /><path d="M10 11v6M14 11v6" /><path d="M9 6V4h6v2" /></svg>,
  Link: <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6" /><polyline points="15 3 21 3 21 9" /><line x1="10" y1="14" x2="21" y2="3" /></svg>,
  Star: <svg viewBox="0 0 24 24" className="w-4 h-4" fill="currentColor"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" /></svg>,
  Check: <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12" /></svg>,
  Bolt: <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" /></svg>,
  Plus: <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>,
  Snaps: <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="20" height="20" rx="5" ry="5" /><polygon points="10 8 16 12 10 16 10 8" /></svg>,
  Eye: <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></svg>,
  EyeOff: <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24" /><line x1="1" y1="1" x2="23" y2="23" /></svg>,
  Heart: <svg viewBox="0 0 24 24" className="w-4 h-4" fill="currentColor"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" /></svg>,
  Chat: <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 11.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.38 8.38 0 01-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.38 8.38 0 013.8-.9h.5a8.48 8.48 0 018 8v.5z" /></svg>,
  Fire: <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2"><path d="M8.08 2.26a1 1 0 011.08 1.45L8.5 5c-.18.4-.33.82-.44 1.25-.66 2.6.48 5.44 2.8 6.94a.5.5 0 00.67-.1l.5-.7c.33-.46.73-.85 1.18-1.16 1.1-.75 2.5-.83 3.68-.2.72.39 1.28 1.02 1.6 1.77.33.75.4 1.57.2 2.37a7 7 0 11-10.61-9.06 1 1 0 011.01-.85z" /></svg>,
  Users: <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 00-3-3.87" /><path d="M16 3.13a4 4 0 010 7.75" /></svg>,
  Camera: <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2"><path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z" /><circle cx="12" cy="13" r="4" /></svg>,
  Lock: <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0110 0v4" /></svg>,
  Phone: <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 8.63 19.79 19.79 0 01.022 2 2 2 0 012 .018h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L6.09 7.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45 12.84 12.84 0 002.81.7A2 2 0 0122 14.92z" /></svg>,
  Mail: <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" /><polyline points="22,6 12,13 2,6" /></svg>,
  Trophy: <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 9H4a2 2 0 01-2-2V5h4" /><path d="M18 9h2a2 2 0 002-2V5h-4" /><path d="M12 17v4" /><path d="M8 21h8" /><path d="M6 5h12v7a6 6 0 01-12 0V5z" /></svg>,
  Target: <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><circle cx="12" cy="12" r="6" /><circle cx="12" cy="12" r="2" /></svg>,
  TrendUp: <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18" /><polyline points="17 6 23 6 23 12" /></svg>,
  Danger: <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" /></svg>,
  Video: <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="23 7 16 12 23 17 23 7" /><rect x="1" y="5" width="15" height="14" rx="2" ry="2" /></svg>,
};

// ─── Nav items ────────────────────────────────────────────────────────────────
const NAV = [
  {
    section: 'Dashboard', items: [
      { key: 'home', label: 'Overview', icon: K.Home },
      { key: 'monetize', label: 'Earnings', icon: K.Coin },
      { key: 'analytics', label: 'Analytics', icon: K.Chart },
    ]
  },
  {
    section: 'Content', items: [
      { key: 'composer', label: 'New Post', icon: K.Plus },
      { key: 'posts', label: 'My Posts', icon: K.Posts },
      { key: 'snaps', label: 'Snaps Studio', icon: K.Snaps },
    ]
  },
  {
    section: 'Growth', items: [
      { key: 'grow', label: 'Milestones', icon: K.Grow },
      { key: 'leaderboard', label: 'Leaderboard', icon: K.Crown },
    ]
  },
  {
    section: 'Settings', items: [
      { key: 'profile', label: 'Edit Profile', icon: K.Profile },
      { key: 'prefs', label: 'Preferences', icon: K.Prefs },
      { key: 'danger', label: 'Log Out', icon: K.Logout },
    ]
  },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────
function Accordion({ title, children, icon, description, isOrg }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden mb-2">
      <button onClick={() => setOpen(!open)} className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-gray-50 transition-colors">
        <div className="flex items-center gap-3">
          <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center", isOrg ? "bg-purple-50 text-purple-600" : "bg-blue-50 text-blue-600")}>{icon}</div>
          <div>
            <p className="text-sm font-semibold text-gray-900">{title}</p>
            {description && <p className="text-xs text-gray-400">{description}</p>}
          </div>
        </div>
        <svg viewBox="0 0 24 24" className={cn("w-4 h-4 text-gray-400 transition-transform flex-shrink-0", open ? "rotate-180" : "")} fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M19 9l-7 7-7-7" /></svg>
      </button>
      <div className={cn("border-t border-gray-100", open ? "block" : "hidden")}>
        <div className="px-4 pb-4">{children}</div>
      </div>
    </div>
  );
}

function StatusMsg({ msg }) {
  if (!msg) return null;
  return (
    <div className={cn('flex items-center gap-2 text-xs px-3 py-2 rounded-lg', msg.ok ? 'bg-green-50 border border-green-200 text-green-700' : 'bg-red-50 border border-red-200 text-red-700')}>
      {msg.ok
        ? <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12" /></svg>
        : <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>}
      {msg.text}
    </div>
  );
}

function CloseBtn({ onClick }) {
  return (
    <button type="button" onClick={onClick} aria-label="Close" className="w-8 h-8 rounded-full flex items-center justify-center text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors">
      <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
    </button>
  );
}

function Overlay({ onClose }) {
  return <div className="fixed inset-0 bg-black/40 z-40" onClick={onClose} aria-hidden="true" />;
}

function SkeletonBlock() {
  return (
    <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-100">
      <div className="w-9 h-9 rounded-full bg-gray-100 flex-shrink-0" />
      <div className="flex-1 space-y-2">
        <div className="h-3 bg-gray-100 rounded-full w-3/5" />
        <div className="h-2 bg-gray-100 rounded-full w-2/5" />
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function AccountsCenter() {
  useEffect(() => { if (!localStorage.currentUser) { window.Lexum ? window.Lexum.navigate('/auth') : window.location.href = '/auth'; } }, []);
  const [activeTab, setActiveTab] = useState('home');
  const [profile, setProfile] = useState(null);
  const [posts, setPosts] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [alertModal, setAlertModal] = useState({ open: false, title: '', message: '' });
  const username = getCurrentUser();

  const showAlert = (title, message) => setAlertModal({ open: true, title, message });

  useEffect(() => {
    async function load() {
      const [p, t, s] = await Promise.allSettled([
        apiFetch(`/profile/${username}`),
        apiFetch(`/get-user-posts?username=${encodeURIComponent(username)}`),
        apiFetch(`/account-stats?username=${encodeURIComponent(username)}`),
      ]);
      if (p.status === 'fulfilled' && p.value.ok) setProfile(await p.value.json());
      if (t.status === 'fulfilled' && t.value.ok) setPosts(await t.value.json());
      if (s.status === 'fulfilled' && s.value.ok) setStats(await s.value.json());
      setLoading(false);
    }
    load();
  }, [username]);

  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') setSidebarOpen(false); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  useEffect(() => {
    document.body.style.overflow = sidebarOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [sidebarOpen]);

  const isOrg = (profile?.profile_type || '').toLowerCase() === 'organisation';
  const accent = isOrg ? 'bg-purple-600' : 'bg-blue-600';
  const accentText = isOrg ? 'text-purple-600' : 'text-blue-600';
  const accentLight = isOrg ? 'bg-purple-50 text-purple-600' : 'bg-blue-50 text-blue-600';
  const defaultPic = 'https://res.cloudinary.com/dzvm9xe1i/image/upload/v1746095979/profile-pictures/e2st5nispbicnhnir9cf.jpg';

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        {[...Array(6)].map((_, i) => <SkeletonBlock key={i} />)}
      </div>
    );
  }

  const renderNav = (onItemClick) => NAV.map((section, si) => (
    <div key={si} className="mb-3">
      <p className="px-3 mb-1 text-[10px] font-semibold text-gray-400 uppercase tracking-widest">{section.section}</p>
      <div className="space-y-0.5">
        {section.items.map(tab => (
          <button
            key={tab.key}
            onClick={() => { setActiveTab(tab.key); onItemClick?.(); }}
            className={cn(
              'w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
              activeTab === tab.key ? cn(accentLight) : 'text-gray-500 hover:bg-gray-50 hover:text-gray-800'
            )}
          >
            <span className={activeTab === tab.key ? accentText : 'text-gray-400'}>{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </div>
    </div>
  ));

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {alertModal.open && (
        <div className="fixed inset-0 bg-black/40 z-[200] flex items-center justify-center p-4" onClick={() => setAlertModal({ ...alertModal, open: false })}>
          <div className="bg-white p-6 rounded-2xl w-full max-w-sm shadow-2xl" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-bold mb-2">{alertModal.title}</h3>
            <p className="text-sm text-gray-600 mb-6">{alertModal.message}</p>
            <button onClick={() => setAlertModal({ ...alertModal, open: false })} className="w-full h-11 bg-blue-600 text-white rounded-xl font-bold">OK</button>
          </div>
        </div>
      )}
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex flex-col w-56 flex-shrink-0 bg-white border-r border-gray-200 sticky top-0 h-screen overflow-y-auto">
        <div className="flex items-center gap-2.5 px-3 py-3 border-b border-gray-200">
          <img src={profile?.profile_pic || defaultPic} alt="" className="w-9 h-9 rounded-full object-cover border border-gray-200 flex-shrink-0" />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <p className="text-sm font-semibold text-gray-900 truncate">{profile?.fullname || username}</p>
              {isOrg && <span className="text-[9px] font-bold text-white bg-purple-600 rounded px-1 py-px flex-shrink-0">ORG</span>}
            </div>
            <p className="text-xs text-gray-400 truncate">@{username}</p>
          </div>
        </div>
        <nav className="flex-1 py-3 px-2">{renderNav()}</nav>
      </aside>

      {/* Mobile sidebar */}
      {sidebarOpen && (
        <>
          <Overlay onClose={() => setSidebarOpen(false)} />
          <div className="fixed inset-y-0 left-0 w-64 bg-white z-50 flex flex-col lg:hidden">
            <div className="flex items-center justify-between px-3 py-3 border-b border-gray-200">
              <div className="flex items-center gap-2.5">
                <img src={profile?.profile_pic || defaultPic} alt="" className="w-9 h-9 rounded-full object-cover border border-gray-200" />
                <div>
                  <div className="flex items-center gap-1.5">
                    <p className="text-sm font-semibold text-gray-900">{profile?.fullname || username}</p>
                    {isOrg && <span className="text-[9px] font-bold text-white bg-purple-600 rounded px-1 py-px">ORG</span>}
                  </div>
                  <p className="text-xs text-gray-400">@{username}</p>
                </div>
              </div>
              <CloseBtn onClick={() => setSidebarOpen(false)} />
            </div>
            <nav className="flex-1 overflow-y-auto py-3 px-2">{renderNav(() => setSidebarOpen(false))}</nav>
          </div>
        </>
      )}

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="lg:hidden sticky top-0 z-30 flex items-center justify-between px-3 py-2.5 border-b border-gray-200 bg-white">
          <button onClick={() => setSidebarOpen(true)} className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-500 hover:bg-gray-100 transition-colors">
            <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2"><line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="18" x2="21" y2="18" /></svg>
          </button>
          <p className="text-sm font-semibold text-gray-900">
            {NAV.flatMap(s => s.items).find(t => t.key === activeTab)?.label}
          </p>
          <img src={profile?.profile_pic || defaultPic} alt="" className="w-8 h-8 rounded-full object-cover border border-gray-200" />
        </header>

        <main className="flex-1 overflow-y-auto p-4 max-w-2xl w-full mx-auto">
          {activeTab === 'home' && <OverviewTab profile={profile} stats={stats} posts={posts} setTab={setActiveTab} isOrg={isOrg} accent={accent} accentText={accentText} />}
          {activeTab === 'monetize' && <MonetizationTab username={username} stats={stats} isOrg={isOrg} accent={accent} showAlert={showAlert} />}
          {activeTab === 'analytics' && <AnalyticsTab posts={posts} stats={stats} profile={profile} isOrg={isOrg} accentText={accentText} />}
          {activeTab === 'composer' && <ComposerTab username={username} setTab={setActiveTab} isOrg={isOrg} accent={accent} />}
          {activeTab === 'profile' && <EditProfileTab profile={profile} setProfile={setProfile} username={username} isOrg={isOrg} accent={accent} accentText={accentText} />}
          {activeTab === 'verification' && <VerificationTab />}
          {activeTab === 'posts' && <PostsTab posts={posts} setPosts={setPosts} username={username} setTab={setActiveTab} />}
          {activeTab === 'snaps' && <SnapsTab posts={posts} setPosts={setPosts} username={username} setTab={setActiveTab} isOrg={isOrg} accent={accent} accentText={accentText} />}
          {activeTab === 'grow' && <GrowTab stats={stats} profile={profile} username={username} isOrg={isOrg} setTab={setActiveTab} accent={accent} />}
          {activeTab === 'prefs' && <PrefsTab user={profile} setProfile={setProfile} accent={accent} accentText={accentText} />}
          {activeTab === 'danger' && <DangerTab username={username} />}
          {activeTab === 'leaderboard' && (
            <div className="py-16 text-center">
              <div className="w-12 h-12 rounded-xl bg-gray-100 flex items-center justify-center text-gray-300 mx-auto mb-3">{K.Crown}</div>
              <p className="text-sm font-semibold text-gray-400">Leaderboard coming soon</p>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

// New VerificationTab
function VerificationTab() {
  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold text-gray-900">Get Verified</h2>
      <div className="bg-white border border-gray-200 rounded-2xl p-6 text-center">
        <div className="w-16 h-16 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center mx-auto mb-4">
          <svg viewBox="0 0 24 24" className="w-8 h-8" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 11.08V12a10 10 0 11-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" /></svg>
        </div>
        <p className="text-sm text-gray-600 mb-4">Contact us on WhatsApp to get verified.</p>
        <a href="https://wa.me/2347087421125" target="_blank" rel="noopener noreferrer"
           className="inline-flex items-center gap-2 h-12 px-6 bg-green-500 text-white rounded-xl font-bold hover:bg-green-600 transition-all">
          <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/><path d="M12 0C5.373 0 0 5.373 0 12c0 2.716.875 5.233 2.356 7.301L.758 23.625a.75.75 0 00.866.964l5.084-1.09A11.934 11.934 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22.5a10.456 10.456 0 01-5.36-1.476.75.75 0 00-.587-.084l-3.595.771 1.226-3.17a.75.75 0 00-.084-.769A10.422 10.422 0 011.5 12c0-5.79 4.71-10.5 10.5-10.5S22.5 6.21 22.5 12 17.79 22.5 12 22.5z"/></svg>
          Chat on WhatsApp
        </a>
      </div>
    </div>
  );
}

// ─── 1. Overview ──────────────────────────────────────────────────────────────
function OverviewTab({ profile, stats, posts, setTab, isOrg, accent, accentText }) {
  const followers = (Array.isArray(profile?.followers) ? profile.followers : []).length;
  const likesCount = posts.reduce((acc, p) => acc + (p.likes?.length || 0), 0);
  const commentsCount = posts.reduce((acc, p) => acc + (p.comments?.length || 0), 0);
  const votesCount = posts.reduce((acc, p) => acc + (p.options || []).reduce((sum, o) => sum + (o.votes?.length || 0), 0), 0);
  const totalInteractions = likesCount + commentsCount + votesCount;
  const avgInteractions = posts.length ? parseFloat((totalInteractions / posts.length).toFixed(1)) : 0;
  const mobcoins = stats?.mobcoins ?? 0;
  const ngnValue = (mobcoins * 0.1).toLocaleString();
  const rank = stats?.rank ?? null;

  return (
    <div className="space-y-4">
      {!profile?.verified && (
        <a href="https://wa.me/2347087421125" target="_blank" rel="noopener noreferrer"
           className="bg-white border border-blue-100 rounded-2xl p-5 flex items-center gap-4 hover:shadow-md transition-all">
          <div className="w-12 h-12 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center text-xl">{K.Check}</div>
          <div className="flex-1">
            <p className="text-sm font-bold text-gray-900">Unlock your potential</p>
            <p className="text-xs text-gray-500">Get a blue tick to increase trust and visibility.</p>
          </div>
          <span className="h-9 px-4 bg-blue-600 text-white rounded-lg text-xs font-bold inline-flex items-center">Contact Us</span>
        </a>
      )}
      {!isOrg && (
        <div className="bg-white border border-purple-100 rounded-2xl p-5 flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-purple-50 text-purple-600 flex items-center justify-center text-xl">{K.Bolt}</div>
          <div className="flex-1">
            <p className="text-sm font-bold text-gray-900">Switch to Professional</p>
            <p className="text-xs text-gray-500">Unlock monetization, analytics, and more.</p>
          </div>
          <button onClick={() => setTab('profile')} className="h-12 px-8 bg-blue-600 text-white rounded-full text-sm font-bold hover:bg-blue-700 transition-all">Switch Now</button>
        </div>
      )}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Dashboard</h2>
          <p className="text-xs text-gray-400 mt-0.5">Your performance at a glance</p>
        </div>
        <button
          onClick={() => window.Lexum?.navigate('/')}
          className="px-4 py-2 rounded-lg bg-white border border-gray-200 text-xs font-medium text-gray-600 hover:text-gray-900 transition-colors"
        >
          Home Feed
        </button>
      </div>

      {/* Hero card */}
      <div style={{ background: isOrg ? 'linear-gradient(135deg, #2563eb, #6d28d9)' : 'linear-gradient(135deg, #2563eb, #1e40af)' }} className='rounded-2xl p-5 text-white'>
        <div className="flex items-center gap-3 mb-5">
          <img
            src={profile?.profile_pic || 'https://res.cloudinary.com/dzvm9xe1i/image/upload/v1746095979/profile-pictures/e2st5nispbicnhnir9cf.jpg'}
            alt=""
            className="w-12 h-12 rounded-xl object-cover border-2 border-white/20 flex-shrink-0"
          />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <p className="font-bold text-base leading-tight truncate">{profile?.fullname || '—'}</p>
              {isOrg && <span className="text-[9px] font-bold bg-white/20 rounded px-1.5 py-px border border-white/10 flex-shrink-0">PRO</span>}
            </div>
            <p className="text-blue-100 text-xs opacity-80">@{profile?.username || 'user'}</p>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'Followers', value: followers.toLocaleString() },
            { label: 'Balance', value: `₦${ngnValue}` },
            { label: 'Interactions', value: totalInteractions.toLocaleString() },
          ].map(stat => (
            <div key={stat.label} className="bg-white/10 rounded-xl p-3 border border-white/10">
              <p className="text-[10px] text-blue-100 mb-1">{stat.label}</p>
              <p className="text-lg font-bold">{stat.value}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-4 gap-2">
        {[
          { label: 'New Post', icon: K.Plus, tab: 'composer', color: 'bg-blue-50 text-blue-600' },
          { label: 'Earnings', icon: K.Coin, tab: 'monetize', color: 'bg-emerald-50 text-emerald-600' },
          { label: 'Analytics', icon: K.Chart, tab: 'analytics', color: 'bg-purple-50 text-purple-600' },
          { label: 'Profile', icon: K.Profile, tab: 'profile', color: 'bg-orange-50 text-orange-600' },
        ].map(a => (
          <button key={a.tab} onClick={() => setTab(a.tab)} className="flex flex-col items-center gap-2 p-3 rounded-xl bg-white border border-gray-200 hover:border-blue-200 transition-colors">
            <div className={cn("w-9 h-9 rounded-lg flex items-center justify-center", a.color)}>{a.icon}</div>
            <p className="text-[10px] font-medium text-gray-700">{a.label}</p>
          </button>
        ))}
      </div>

      {/* Engagement bar */}
      <div className="bg-white border border-gray-200 rounded-xl p-4">
        <div className="flex items-center justify-between mb-2">
          <p className="text-sm font-medium text-gray-700">Avg. interactions per post</p>
          <span className={cn('text-base font-bold', accentText)}>{avgInteractions}</span>
        </div>
        <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
          <div className={cn('h-full rounded-full transition-all', accent)} style={{ width: `${Math.min(100, (avgInteractions / 5) * 100)}%` }} />
        </div>
        <p className="text-xs text-gray-400 mt-1.5">{totalInteractions} total across {posts.length} posts</p>
      </div>

      {/* Rank */}
      {rank && (
        <div className="flex items-center gap-3 bg-white border border-gray-200 rounded-xl px-4 py-3">
          <div className="w-9 h-9 rounded-lg bg-yellow-50 flex items-center justify-center text-yellow-500 flex-shrink-0">{K.Crown}</div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-gray-900">#{rank} on the leaderboard</p>
            <p className="text-xs text-gray-400">Keep posting to climb higher</p>
          </div>
          <button onClick={() => window.Lexum?.navigate('/halloffame')} className={cn('text-xs font-semibold', accentText)}>View</button>
        </div>
      )}
    </div>
  );
}

// ─── 2. Monetization ─────────────────────────────────────────────────────────
function MonetizationTab({ username, stats, isOrg, accent }) {
  const [balance, setBalance] = useState(stats?.mobcoins || 0);
  const [payouts, setPayouts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showRedeem, setShowRedeem] = useState(false);
  const [redeemType, setRedeemType] = useState('CASH');
  const [redeemAmount, setRedeemAmount] = useState('');
  const [details, setDetails] = useState({ bank: '', account_no: '', name: '', network: 'MTN', phone: '' });
  const [status, setStatus] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    async function load() {
      const res = await apiFetch(`/api/user/payouts?userId=${encodeURIComponent(username)}`);
      if (res.ok) setPayouts(await res.json());
      setLoading(false);
    }
    load();
  }, [username]);

  const handleRedeem = async () => {
    const amount = Number(redeemAmount);
    if (amount < 2000) return setStatus({ ok: false, text: 'Minimum 2,000 coins required' });
    if (amount > balance) return setStatus({ ok: false, text: 'Not enough coins' });
    setSubmitting(true);
    try {
      const res = await apiFetch('/api/redeem', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: localStorage.currentUser, amount, type: redeemType, details: redeemType === 'CASH' ? { bank: details.bank, account_no: details.account_no, name: details.name } : { network: details.network, phone: details.phone } })
      });
      const data = await res.json();
      if (res.ok) {
        setStatus({ ok: true, text: 'Request sent!' });
        setBalance(prev => prev - amount);
        setTimeout(() => setShowRedeem(false), 2000);
      } else throw new Error(data.error || 'Request failed');
    } catch (err) { setStatus({ ok: false, text: err.message }); }
    finally { setSubmitting(false); }
  };

  return (
    <div className="space-y-4">
      {/* Hero */}
      <div style={{ background: 'linear-gradient(135deg, #059669, #065f46)' }} className="rounded-2xl p-5 text-white">
        <p className="text-xs text-emerald-100 mb-1">Total balance</p>
        <p className="text-3xl font-bold mb-1">₦{(balance * 0.1).toLocaleString()}</p>
        <p className="text-xs text-emerald-100 opacity-80">= {balance.toLocaleString()} coins</p>
        <div className="mt-4 flex gap-3">
          <button
            disabled={!isOrg || balance < 2000}
            onClick={() => isOrg ? setShowRedeem(true) : showAlert('Access Restricted', 'Switch to Professional account in Edit Profile to redeem earnings.')}
            className="flex-1 h-11 bg-white text-emerald-700 rounded-xl text-sm font-semibold transition-all disabled:opacity-40"
          >
            {isOrg ? 'Cash out' : 'Upgrade to cash out'}
          </button>
          <div className="flex-1 px-3 flex flex-col justify-center border-l border-white/10">
            <p className="text-[10px] text-emerald-100 mb-0.5">Minimum payout</p>
            <p className="text-sm font-semibold">2,000 coins</p>
          </div>
        </div>
      </div>
      {!isOrg && (
        <div className="bg-amber-50 border border-amber-200 text-amber-800 p-4 rounded-xl text-xs">
          Personal accounts cannot redeem earnings. Please go to <strong>Edit Profile → Switch Mode</strong> to upgrade to a Professional account.
        </div>
      )}

      <Accordion title="How to earn more" icon={K.Coin} description="Tips to grow your balance" isOrg={isOrg}>
        <div className="space-y-3 pt-3">
          {[
            { t: 'Get more interactions', b: 'Posts with lots of likes and comments earn coins 50% faster.' },
            { t: 'Reach 2,000 coins', b: 'You need at least 2,000 coins before you can request a payout.' },
            { t: 'Professional advantage', b: 'Professional accounts get early access to ad revenue sharing.' }
          ].map(i => (
            <div key={i.t} className="flex gap-3">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1.5 shrink-0" />
              <div>
                <p className="text-sm font-semibold text-gray-900">{i.t}</p>
                <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{i.b}</p>
              </div>
            </div>
          ))}
        </div>
      </Accordion>

      <Accordion title="Payout history" icon={K.Link} description="Your previous withdrawals" isOrg={isOrg}>
        {loading ? <SkeletonRow /> : payouts.length === 0 ? (
          <div className="py-8 text-center text-xs text-gray-400">No payouts yet</div>
        ) : (
          <div className="space-y-2 pt-3">
            {payouts.map(p => (
              <div key={p.id} className="flex items-center justify-between p-3 rounded-xl bg-gray-50 border border-gray-100">
                <div>
                  <p className="text-sm font-medium text-gray-900">{p.type === 'CASH' ? 'Bank transfer' : 'Airtime'}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{new Date(p.created_at).toLocaleString()}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-gray-900">₦{Number(p.naira_value).toLocaleString()}</p>
                  <span className={cn("text-[10px] font-medium px-2 py-0.5 rounded-full", p.status === 'COMPLETED' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700')}>{p.status}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </Accordion>

      <BottomSheet open={showRedeem} onClose={() => setShowRedeem(false)} title="Request payout" wide>
        <div className="p-5 space-y-4 pb-10">
          <div className="flex gap-2 p-1 bg-gray-100 rounded-xl">
            <button onClick={() => setRedeemType('CASH')} className={cn("flex-1 h-10 rounded-lg text-sm font-medium transition-all", redeemType === 'CASH' ? "bg-white text-gray-900 shadow-sm" : "text-gray-500")}>Bank transfer</button>
            <button onClick={() => setRedeemType('AIRTIME')} className={cn("flex-1 h-10 rounded-lg text-sm font-medium transition-all", redeemType === 'AIRTIME' ? "bg-white text-gray-900 shadow-sm" : "text-gray-500")}>Airtime</button>
          </div>
          <div>
            <label className="text-xs font-medium text-gray-600 block mb-1">Amount (coins)</label>
            <input type="number" value={redeemAmount} onChange={e => setRedeemAmount(e.target.value)} placeholder="Minimum 2000" className="w-full h-12 px-4 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium outline-none focus:ring-2 focus:ring-emerald-100 focus:border-emerald-400 focus:bg-white transition-all" />
            {redeemAmount && <p className="text-xs text-emerald-600 mt-1.5">= ₦{Number(redeemAmount * 0.1).toLocaleString()}</p>}
          </div>
          {redeemType === 'CASH' ? (
            <div className="space-y-3">
              <input type="text" placeholder="Bank name" value={details.bank} onChange={e => setDetails({ ...details, bank: e.target.value })} className="w-full h-12 px-4 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium outline-none focus:bg-white transition-all" />
              <input type="text" placeholder="Account number" value={details.account_no} onChange={e => setDetails({ ...details, account_no: e.target.value })} className="w-full h-12 px-4 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium outline-none focus:bg-white transition-all" />
              <input type="text" placeholder="Account name" value={details.name} onChange={e => setDetails({ ...details, name: e.target.value })} className="w-full h-12 px-4 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium outline-none focus:bg-white transition-all" />
            </div>
          ) : (
            <div className="space-y-3">
              <select value={details.network} onChange={e => setDetails({ ...details, network: e.target.value })} className="w-full h-12 px-4 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium outline-none focus:bg-white transition-all">
                <option>MTN</option><option>Airtel</option><option>Glo</option><option>9Mobile</option>
              </select>
              <input type="tel" placeholder="Phone number" value={details.phone} onChange={e => setDetails({ ...details, phone: e.target.value })} className="w-full h-12 px-4 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium outline-none focus:bg-white transition-all" />
            </div>
          )}
          <StatusMsg msg={status} />
          <button onClick={handleRedeem} disabled={submitting || !redeemAmount} className="w-full h-12 bg-emerald-600 text-white rounded-xl text-sm font-semibold transition-all disabled:opacity-40">
            {submitting ? 'Sending...' : 'Submit request'}
          </button>
        </div>
      </BottomSheet>
    </div>
  );
}

// ─── 3. Composer ─────────────────────────────────────────────────────────────
function ComposerTab({ username, setTab, isOrg, accent }) {
  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-4">
      <MakePostContent username={username} onToggle={() => { }} />
    </div>
  );
}

// ─── 4. Edit Profile ─────────────────────────────────────────────────────────
function EditProfileTab({ profile, setProfile, username, isOrg, accent, accentText }) {
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
  const [migrationModalOpen, setMigrationModalOpen] = useState(false);
  const [modeSaving, setModeSaving] = useState(false);

  function handlePhotoChange(e) {
    const file = e.target.files[0];
    if (file) { setPhotoFile(file); setPhotoPreview(URL.createObjectURL(file)); }
  }

  async function handleProfileUpdate(e) {
    e.preventDefault();
    setSaving(true); setStatusMsg(null);
    try {
      const formData = new FormData();
      if (fields.fullName) formData.append('fullName', fields.fullName);
      formData.append('phone', fields.phone || '');
      if (fields.email) formData.append('email', fields.email);
      if (fields.biography !== undefined) formData.append('biography', fields.biography);
      if (photoFile) formData.append('profilePicture', photoFile);
      const res = await apiFetch(`/profile/${username}/update`, { method: 'POST', body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Update failed');
      setProfile(prev => ({ ...prev, ...data.updatedFields }));
      if (data.updatedFields?.profile_pic) {
        setPhotoPreview(data.updatedFields.profile_pic);
        localStorage.setItem('cached_profile_pic', data.updatedFields.profile_pic);
      }
      setStatusMsg({ text: 'Profile updated!', ok: true });
    } catch (err) { setStatusMsg({ text: err.message, ok: false }); }
    finally { setSaving(false); }
  }

  async function handlePasswordChange(e) {
    e.preventDefault();
    if (!passwordFields.current) return setPasswordStatusMsg({ text: 'Enter your current password', ok: false });
    if (passwordFields.newPw.length < 8) return setPasswordStatusMsg({ text: 'New password needs at least 8 characters', ok: false });
    if (!/[A-Z]/.test(passwordFields.newPw)) return setPasswordStatusMsg({ text: 'Add at least one uppercase letter', ok: false });
    if (!/\d/.test(passwordFields.newPw)) return setPasswordStatusMsg({ text: 'Add at least one number', ok: false });
    if (passwordFields.newPw !== passwordFields.confirm) return setPasswordStatusMsg({ text: "Passwords don't match", ok: false });
    setPasswordSaving(true); setPasswordStatusMsg(null);
    try {
      const res = await apiFetch(`/profile/${username}/change-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword: passwordFields.current, newPassword: passwordFields.newPw }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to change password');
      setPasswordStatusMsg({ text: 'Password updated!', ok: true });
      setPasswordFields({ current: '', newPw: '', confirm: '' });
      setTimeout(() => setPasswordModalOpen(false), 1200);
    } catch (err) { setPasswordStatusMsg({ text: err.message, ok: false }); }
    finally { setPasswordSaving(false); }
  }
  async function handleModeSwitch(newType, migrate = false) {
    setModeSaving(true);
    try {
      // Migrate friends if requested
      if (migrate) {
        await apiFetch('/api/migrate-friends', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username })
        });
      }

      // 2. Send the correct backend value ('Organisation' or 'Individual')
      const res = await apiFetch(`/profile/${username}/update-type`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ profile_type: newType }), 
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to switch mode');

      // 3. Update local state with the exact value returned by the server
      const updatedType = data.profile_type;
      setProfile(prev => ({ ...prev, profile_type: updatedType }));

      // 4. Show the clean display text to the user
      const uiDisplayText = updatedType === 'Organisation' ? 'Professional' : 'Personal';
      setStatusMsg({ text: `Switched to ${uiDisplayText}!`, ok: true });

    } catch (err) {
      setStatusMsg({ text: err.message, ok: false });
    } finally {
      setModeSaving(false);
      setModeModalOpen(false);
    }
  }


  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold text-gray-900">Edit Profile</h2>

      {/* Photo */}
      <div className="bg-white border border-gray-200 rounded-xl p-4 flex items-center gap-4">
        <img src={photoPreview} alt="" className="w-16 h-16 rounded-xl object-cover border border-gray-200 flex-shrink-0" />
        <div>
          <p className="text-sm font-medium text-gray-900 mb-2">Profile photo</p>
          <label className={cn("h-9 px-4 rounded-lg border text-xs font-medium flex items-center justify-center cursor-pointer transition-colors", isOrg ? "border-purple-600 text-purple-600 hover:bg-purple-50" : "border-blue-600 text-blue-600 hover:bg-blue-50")}>
            Change photo
            <input type="file" accept="image/*" className="hidden" onChange={handlePhotoChange} />
          </label>
        </div>
      </div>

      {/* Account type */}
      <div className="bg-white border border-gray-200 rounded-xl p-4 flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 mb-0.5">
            <p className="text-sm font-medium text-gray-900">Account type</p>
            {isOrg && <span className="text-[9px] font-bold text-white bg-purple-600 rounded px-1 py-px">PRO</span>}
          </div>
          <p className="text-xs text-gray-400">{isOrg ? 'Professional account' : 'Personal account'}</p>
        </div>
        <button onClick={() => setModeModalOpen(true)} className="h-9 px-4 rounded-lg bg-gray-100 text-xs font-medium text-gray-700 hover:bg-gray-200 transition-colors">Switch</button>
      </div>

      {/* Profile form */}
      <form onSubmit={handleProfileUpdate} className="bg-white border border-gray-200 rounded-xl p-4 space-y-4">
        <p className="text-xs font-semibold text-gray-500">Personal details</p>
        <div>
          <label className="text-xs font-medium text-gray-600 block mb-1">Full name</label>
          <input type="text" placeholder="Your full name" value={fields.fullName} onChange={e => setFields(prev => ({ ...prev, fullName: e.target.value }))} className="w-full h-11 px-4 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium focus:outline-none focus:border-blue-400 focus:bg-white transition-colors" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-medium text-gray-600 block mb-1">Phone</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">{K.Phone}</span>
              <input type="tel" placeholder="+234..." value={fields.phone} onChange={e => setFields(prev => ({ ...prev, phone: e.target.value }))} className="w-full pl-9 pr-3 h-11 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium focus:outline-none focus:border-blue-400 focus:bg-white transition-colors" />
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-gray-600 block mb-1">Email</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">{K.Mail}</span>
              <input type="email" placeholder="email@example.com" value={fields.email} onChange={e => setFields(prev => ({ ...prev, email: e.target.value }))} className="w-full pl-9 pr-3 h-11 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium focus:outline-none focus:border-blue-400 focus:bg-white transition-colors" />
            </div>
          </div>
        </div>
        <div>
          <label className="text-xs font-medium text-gray-600 block mb-1">Bio</label>
          <textarea placeholder="Tell people about yourself…" rows={3} value={fields.biography} onChange={e => setFields(prev => ({ ...prev, biography: e.target.value }))} className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium focus:outline-none focus:border-blue-400 focus:bg-white transition-colors resize-none leading-relaxed" />
        </div>
        <StatusMsg msg={statusMsg} />
        <button type="submit" disabled={saving} className={cn('w-full h-11 rounded-xl text-white text-sm font-semibold disabled:opacity-50 transition-all', accent)}>
          {saving ? 'Saving...' : 'Save changes'}
        </button>
      </form>

      {/* Password */}
      <div className="bg-white border border-gray-200 rounded-xl p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-gray-100 flex items-center justify-center text-gray-400">{K.Lock}</div>
          <div>
            <p className="text-sm font-medium text-gray-900">Password</p>
            <p className="text-xs text-gray-400">Change your login password</p>
          </div>
        </div>
        <button onClick={() => { setPasswordModalOpen(true); setPasswordStatusMsg(null); setPasswordFields({ current: '', newPw: '', confirm: '' }); }} className="h-9 px-4 rounded-lg border border-gray-200 text-xs font-medium text-gray-600 hover:bg-gray-50 transition-colors">Change</button>
      </div>

      {/* Password modal */}
      <BottomSheet open={passwordModalOpen} onClose={() => setPasswordModalOpen(false)} title="Change password" wide>
        <form onSubmit={handlePasswordChange} className="px-5 py-4 space-y-4 pb-10">
          <div>
            <label className="text-xs font-medium text-gray-600 block mb-1">Current password</label>
            <div className="relative">
              <input type={showCurrentPw ? 'text' : 'password'} placeholder="Your current password" value={passwordFields.current} onChange={e => setPasswordFields(prev => ({ ...prev, current: e.target.value }))} className="w-full px-4 h-11 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium focus:outline-none focus:border-blue-400 focus:bg-white transition-all pr-11" />
              <button type="button" onClick={() => setShowCurrentPw(p => !p)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">{showCurrentPw ? K.EyeOff : K.Eye}</button>
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-gray-600 block mb-1">New password</label>
            <div className="relative">
              <input type={showNewPw ? 'text' : 'password'} placeholder="At least 8 characters" value={passwordFields.newPw} onChange={e => setPasswordFields(prev => ({ ...prev, newPw: e.target.value }))} className="w-full px-4 h-11 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium focus:outline-none focus:border-blue-400 focus:bg-white transition-all pr-11" />
              <button type="button" onClick={() => setShowNewPw(p => !p)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">{showNewPw ? K.EyeOff : K.Eye}</button>
            </div>
            {passwordFields.newPw.length > 0 && (
              <div className="flex gap-1.5 mt-2 flex-wrap">
                {[{ label: '8+ chars', ok: passwordFields.newPw.length >= 8 }, { label: 'Uppercase', ok: /[A-Z]/.test(passwordFields.newPw) }, { label: 'Number', ok: /\d/.test(passwordFields.newPw) }].map(item => (
                  <span key={item.label} className={cn('text-[10px] font-medium px-2 py-0.5 rounded-full border', item.ok ? 'bg-green-50 border-green-200 text-green-600' : 'bg-gray-50 border-gray-200 text-gray-400')}>
                    {item.ok ? '✓ ' : '○ '}{item.label}
                  </span>
                ))}
              </div>
            )}
          </div>
          <div>
            <label className="text-xs font-medium text-gray-600 block mb-1">Confirm new password</label>
            <input type="password" placeholder="Repeat new password" value={passwordFields.confirm} onChange={e => setPasswordFields(prev => ({ ...prev, confirm: e.target.value }))} className="w-full px-4 h-11 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium focus:outline-none focus:border-blue-400 focus:bg-white transition-all" />
          </div>
          <StatusMsg msg={passwordStatusMsg} />
          <div className="flex gap-3">
            <button type="button" onClick={() => setPasswordModalOpen(false)} className="flex-1 h-11 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-all">Cancel</button>
            <button type="submit" disabled={passwordSaving} className={cn('flex-1 h-11 rounded-xl text-white text-sm font-semibold disabled:opacity-50 transition-all', accent)}>{passwordSaving ? 'Saving...' : 'Update password'}</button>
          </div>
        </form>
      </BottomSheet>

      {/* Switch mode modal */}
      <BottomSheet open={modeModalOpen} onClose={() => setModeModalOpen(false)} title="Switch account type">
        <div className="px-5 py-4 space-y-3 pb-10">
          {/* Personal */}
          <div className={cn('border-2 rounded-xl p-4 transition-all', !isOrg ? 'bg-blue-50 border-blue-200' : 'bg-white border-gray-200')}>
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-lg bg-blue-100 flex items-center justify-center text-blue-600 flex-shrink-0">{K.Profile}</div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-gray-900">Personal</p>
                <p className="text-xs text-gray-500 mt-0.5">Standard access for social discovery and connection.</p>
              </div>
              {!isOrg && <span className="text-blue-600 flex-shrink-0">{K.Check}</span>}
            </div>
            {isOrg && <button onClick={() => handleModeSwitch('Individual')} disabled={modeSaving} className="w-full mt-3 h-9 rounded-lg border border-gray-200 text-xs font-medium text-gray-700 disabled:opacity-50 bg-white hover:bg-gray-50 transition-all">{modeSaving ? 'Switching...' : 'Switch to Personal'}</button>}
          </div>
          {/* Professional */}
          <div className={cn('border-2 rounded-xl p-4 transition-all', isOrg ? 'bg-purple-50 border-purple-200' : 'bg-white border-gray-200')}>
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-lg bg-purple-100 flex items-center justify-center text-purple-600 flex-shrink-0">{K.Bolt}</div>
              <div className="flex-1">
                <div className="flex items-center gap-1.5 mb-0.5">
                  <p className="text-sm font-semibold text-gray-900">Professional</p>
                  <span className="text-[9px] font-bold text-white bg-purple-600 rounded px-1 py-px">PRO</span>
                </div>
                <p className="text-xs text-gray-500">Unlocks earnings, detailed analytics, and a Pro badge.</p>
              </div>
              {isOrg && <span className="text-purple-600 flex-shrink-0">{K.Check}</span>}
            </div>
            {!isOrg && <button onClick={() => { setMigrationModalOpen(true); }} disabled={modeSaving} className="w-full mt-3 h-9 rounded-lg bg-purple-600 text-white text-xs font-medium disabled:opacity-50 transition-all">Switch to Professional</button>}
          </div>

          {/* Migration Confirmation Modal */}
          {migrationModalOpen && (
            <div className="fixed inset-0 bg-black/40 z-[200] flex items-center justify-center p-4" onClick={() => setMigrationModalOpen(false)}>
              <div className="bg-white p-6 rounded-2xl w-full max-w-sm shadow-2xl" onClick={e => e.stopPropagation()}>
                <h3 className="text-lg font-bold mb-2">Migrate Friends?</h3>
                <p className="text-sm text-gray-600 mb-6">Do you want to migrate your friends to followers for your new Organisation account?</p>
                <div className="flex gap-3">
                  <button onClick={() => { setMigrationModalOpen(false); handleModeSwitch('Organisation', true); }} className="flex-1 h-11 bg-purple-600 text-white rounded-xl font-bold">Yes, migrate</button>
                  <button onClick={() => { setMigrationModalOpen(false); handleModeSwitch('Organisation', false); }} className="flex-1 h-11 bg-gray-100 text-gray-700 rounded-xl font-bold">No, skip</button>
                </div>
              </div>
            </div>
          )}
          <p className="text-xs text-gray-400 text-center">You can switch back at any time.</p>
        </div>
      </BottomSheet>
    </div>
  );
}

// ─── 5. Posts ─────────────────────────────────────────────────────────────────
function PostsTab({ posts, setPosts, username, setTab }) {
  const [editingPost, setEditingPost] = useState(null);
  const [editText, setEditText] = useState('');
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [boostingPost, setBoostingPost] = useState(null);
  const [boostAmount, setBoostAmount] = useState(1);
  const [boosting, setBoosting] = useState(false);
  const [balance, setBalance] = useState(0);
  const filtered = posts.filter(p => p.type !== 'snap');

  useEffect(() => {
    apiFetch(`/api/user/stats?username=${encodeURIComponent(username)}`).then(r => r.ok ? r.json() : { mobcoins: 0 }).then(d => setBalance(d.mobcoins || 0)).catch(() => {});
  }, [username]);

  async function saveEdit() {
    setSaving(true);
    try {
      const res = await apiFetch('/edit-post', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ postId: editingPost.id, content: editText }),
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error || 'Failed'); }
      setPosts(prev => prev.map(p => p.id === editingPost.id ? { ...p, text: editText } : p));
      setEditingPost(null);
    } catch (err) { alert(err.message); }
    finally { setSaving(false); }
  }

  async function deletePost(postId) {
    if (!confirm('Delete this post permanently?')) return;
    setDeletingId(postId);
    try {
      const res = await apiFetch(`/delete-post?postId=${encodeURIComponent(postId)}`, { method: 'DELETE' });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error || 'Failed'); }
      setPosts(prev => prev.filter(p => p.id !== postId));
    } catch (err) { alert(err.message); }
    finally { setDeletingId(null); }
  }

  async function handleBoost() {
    if (!boostingPost || boostAmount < 1) return;
    const cost = boostAmount * 500;
    if (balance < cost) { alert(`Insufficient balance. You need ${cost.toLocaleString()} mobcoins but have ${balance.toLocaleString()}.`); return; }
    setBoosting(true);
    try {
      const res = await apiFetch('/api/boost-post', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ postId: boostingPost.id, username, boostAmount }),
      });
      const d = await res.json();
      if (d.error) throw new Error(d.error);
      setBalance(prev => prev - cost);
      const fresh = await apiFetch(`/get-user-posts?username=${encodeURIComponent(username)}`);
      if (fresh.ok) setPosts(await fresh.json());
      setBoostingPost(null);
      setBoostAmount(1);
      alert(`Boosted! +${boostAmount} pts (cost: ${cost.toLocaleString()} mobcoins).`);
    } catch (err) { alert(err.message); }
    finally { setBoosting(false); }
  }

  if (!filtered.length) {
    return (
      <div className="flex flex-col items-center py-16 gap-3 text-center">
        <div className="w-12 h-12 rounded-xl bg-gray-100 flex items-center justify-center text-gray-300">{K.Posts}</div>
        <p className="text-sm font-semibold text-gray-500">No posts yet</p>
        <p className="text-xs text-gray-400 max-w-[180px] leading-relaxed">Create your first post to get started.</p>
        <button onClick={() => setTab('composer')} className="mt-1 h-10 px-6 bg-blue-600 text-white rounded-xl text-sm font-medium transition-all">New post</button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900">My Posts</h2>
          <p className="text-xs text-gray-400 mt-0.5">{filtered.length} posts</p>
        </div>
        <button onClick={() => setTab('composer')} className="h-9 px-4 rounded-lg bg-blue-600 text-white text-xs font-medium">New post</button>
      </div>

      {filtered.map(post => (
        <div key={post.id} className="bg-white border border-gray-200 rounded-xl p-4 space-y-3">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm font-medium text-gray-900 capitalize">{post.type || 'Post'}</p>
              <p className="text-xs text-gray-400 mt-0.5">{new Date(post.created_at).toLocaleDateString()} · {new Date(post.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
            </div>
            <div className="flex items-center gap-1.5">
              <button onClick={() => window.Lexum ? window.Lexum.navigate(`/post/${post.id}`) : (window.location.href = `/post/${post.id}`)} className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 bg-gray-100 hover:bg-blue-600 hover:text-white transition-all">{K.Link}</button>
              <button onClick={() => { setEditingPost(post); setEditText(post.text?.replace(/<[^>]*>/g, '') || ''); }} className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 bg-gray-100 hover:bg-gray-700 hover:text-white transition-all">{K.Edit}</button>
              <button onClick={() => deletePost(post.id)} disabled={deletingId === post.id} className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 bg-gray-100 hover:bg-red-600 hover:text-white transition-all disabled:opacity-40">{K.Trash}</button>
            </div>
          </div>

          <div className="text-sm text-gray-700 leading-relaxed bg-gray-50 p-3 rounded-lg border border-gray-100">
            <RichText html={post.text} />
          </div>

          {post.media?.[0] && (
            <div className="rounded-xl overflow-hidden aspect-video bg-gray-100">
              {/\.(mp4|webm|ogg)/i.test(post.media[0])
                ? <video src={post.media[0]} className="w-full h-full object-cover" muted />
                : <img src={post.media[0]} alt="" className="w-full h-full object-cover" />}
            </div>
          )}

          <div className="flex items-center gap-4 text-xs text-gray-400">
            <span className="flex items-center gap-1"><span className="text-red-500">{K.Heart}</span>{post.likes?.length || 0} likes</span>
            <span className="flex items-center gap-1"><span className="text-blue-500">{K.Chat}</span>{post.comments?.length || 0} comments</span>
            {post.type === 'poll' && <span className="bg-blue-100 text-blue-700 text-[10px] font-medium px-2 py-0.5 rounded-full">Poll</span>}
          </div>

          {username && (
            <div className="flex items-center gap-3 pt-1">
              {post.boost_score > 0 && (
                <span className="text-xs font-bold text-orange-500 bg-orange-50 px-2 py-0.5 rounded-full flex items-center gap-1">{K.Bolt}Score: {post.boost_score}</span>
              )}
              <button onClick={() => { setBoostingPost(post); setBoostAmount(1); }} className="flex-1 h-10 rounded-xl border border-orange-200 bg-orange-50 text-orange-600 text-sm font-semibold hover:bg-orange-100 transition-all flex items-center justify-center gap-2">
                {K.Bolt}Boost Post
              </button>
            </div>
          )}
        </div>
      ))}

      <BottomSheet open={!!boostingPost} onClose={() => setBoostingPost(null)} title="Boost Post">
        <div className="px-5 py-4 pb-10 space-y-5">
          {boostingPost && (
            <>
              <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 space-y-1">
                <p className="text-xs text-gray-500">Current boost score</p>
                <p className="text-xl font-bold text-orange-600">{boostingPost.boost_score || 0} pts</p>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Boost amount</label>
                <div className="flex items-center gap-3">
                  <button onClick={() => setBoostAmount(Math.max(1, boostAmount - 1))} className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center text-gray-600 font-bold text-lg hover:bg-gray-200 transition-all">−</button>
                  <input type="number" min="1" max="100" value={boostAmount} onChange={e => setBoostAmount(Math.min(100, Math.max(1, parseInt(e.target.value) || 1)))} className="flex-1 h-10 text-center bg-gray-50 border border-gray-200 rounded-lg text-sm font-bold outline-none focus:ring-2 focus:ring-orange-200" />
                  <button onClick={() => setBoostAmount(Math.min(100, boostAmount + 1))} className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center text-gray-600 font-bold text-lg hover:bg-gray-200 transition-all">+</button>
                </div>
              </div>

              <div className="bg-gray-50 rounded-xl p-4 space-y-1.5">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Cost</span>
                  <span className="font-bold text-gray-900">{(boostAmount * 500).toLocaleString()} mobcoins</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Your balance</span>
                  <span className={`font-bold ${balance >= boostAmount * 500 ? 'text-green-600' : 'text-red-500'}`}>{balance.toLocaleString()} mobcoins</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">New boost score</span>
                  <span className="font-bold text-orange-600">{(boostingPost.boost_score || 0) + boostAmount} pts</span>
                </div>
              </div>

              <div className="flex gap-3">
                <button onClick={() => setBoostingPost(null)} className="flex-1 h-11 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-all">Cancel</button>
                <button onClick={handleBoost} disabled={boosting || balance < boostAmount * 500} className="flex-1 h-11 bg-orange-500 text-white rounded-xl text-sm font-semibold disabled:opacity-40 hover:bg-orange-600 transition-all flex items-center justify-center gap-2">
                  {boosting ? 'Processing...' : <>{K.Bolt}Boost {boostAmount} pt{boostAmount > 1 ? 's' : ''}</>}
                </button>
              </div>
            </>
          )}
        </div>
      </BottomSheet>

      <BottomSheet open={!!editingPost} onClose={() => setEditingPost(null)} title="Edit post" wide>
        <div className="px-5 py-4 pb-10 space-y-4">
          <textarea value={editText} onChange={e => setEditText(e.target.value)} rows={7} className="w-full p-4 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium focus:bg-white focus:ring-2 focus:ring-blue-100 outline-none transition-all resize-none leading-relaxed" />
          <div className="flex gap-3">
            <button onClick={() => setEditingPost(null)} className="flex-1 h-11 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-all">Cancel</button>
            <button onClick={saveEdit} disabled={saving} className="flex-1 h-11 bg-blue-600 text-white rounded-xl text-sm font-semibold disabled:opacity-50 transition-all">{saving ? 'Saving...' : 'Save'}</button>
          </div>
        </div>
      </BottomSheet>
    </div>
  );
}

// ─── 6. Snaps Studio ─────────────────────────────────────────────────────────
function SnapsTab({ posts, setPosts, username, setTab, isOrg, accent, accentText }) {
  const [preview, setPreview] = useState(null);
  const snaps = posts.filter(p => p.type === 'snap');

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Snaps Studio</h2>
          <p className="text-xs text-gray-400 mt-0.5">{snaps.length} clips</p>
        </div>
        <button
          onClick={() => window.Lexum ? window.Lexum.navigate('/snaps') : (window.location.href = '/snaps')}
          className={cn("h-9 px-4 rounded-lg text-white text-xs font-medium", accent)}
        >
          New snap
        </button>
      </div>

      {snaps.length > 0 ? (
        <div className="grid grid-cols-3 gap-0.5">
          {snaps.map(snap => (
            <div
              key={snap.id}
              className="aspect-[9/16] bg-gray-900 overflow-hidden relative cursor-pointer group"
              onClick={() => setPreview(snap)}
            >
              <video src={snap.media?.[0]} className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" muted />
              <div className="absolute bottom-2 left-2 flex items-center gap-1.5">
                <span className="bg-black/40 text-white text-[10px] px-1.5 py-0.5 rounded flex items-center gap-1">{K.Heart}{snap.likes?.length || 0}</span>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center py-16 gap-3 text-center">
          <div className="w-12 h-12 rounded-xl bg-gray-100 flex items-center justify-center text-gray-300">{K.Camera}</div>
          <p className="text-sm font-semibold text-gray-500">No snaps yet</p>
          <p className="text-xs text-gray-400 max-w-[180px] leading-relaxed">Share short video clips with your audience.</p>
        </div>
      )}

      <BottomSheet open={!!preview} onClose={() => setPreview(null)} title="Preview">
        <div className="p-5 flex flex-col items-center gap-4 pb-10">
          <div className="w-full max-w-[260px] aspect-[9/16] bg-black rounded-2xl overflow-hidden">
            <video src={preview?.media?.[0]} className="w-full h-full object-cover" controls autoPlay loop />
          </div>
          <button
            onClick={() => {
              if (confirm('Delete this snap?')) {
                apiFetch(`/delete-post?postId=${preview.id}`, { method: 'DELETE' }).then(() => {
                  setPosts(prev => prev.filter(p => p.id !== preview.id));
                  setPreview(null);
                });
              }
            }}
            className="w-full max-w-[260px] h-11 bg-red-50 text-red-600 rounded-xl text-sm font-medium border border-red-200 hover:bg-red-100 transition-all"
          >
            Delete snap
          </button>
        </div>
      </BottomSheet>
    </div>
  );
}

// ─── 7. Analytics ────────────────────────────────────────────────────────────
function AnalyticsTab({ posts, stats, profile, isOrg, accentText }) {
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

  const followerUsernames = new Set(followersList.map(u => String(u).toLowerCase().trim()));
  const allLikers = new Set();
  const followerLikers = new Set();
  const nonFollowerLikers = new Set();
  posts.forEach(post => {
    (post.likes || []).forEach(liker => {
      const u = String(liker).toLowerCase().trim();
      allLikers.add(u);
      if (followerUsernames.has(u)) followerLikers.add(u);
      else nonFollowerLikers.add(u);
    });
  });
  const totalUniqueLikers = allLikers.size;
  const followerUniqueLikers = followerLikers.size;
  const nonFollowerUniqueLikers = nonFollowerLikers.size;

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

  const contentMix = posts.reduce((acc, p) => { const type = p.type || 'post'; acc[type] = (acc[type] || 0) + 1; return acc; }, {});

  useEffect(() => {
    if (!isOrg) return;

    // Load Chart.js dynamically if not already present
    function buildCharts() {
      const ChartClass = window.Chart;
      if (!ChartClass) return;

      function destroyChart(ref) {
        if (ref.current?._chartInst) {
          try { ref.current._chartInst.destroy(); } catch { }
          ref.current._chartInst = null;
        }
      }
      [chartRef1, chartRef2, chartRef3, chartRef4, chartRef5, chartRef6].forEach(destroyChart);

      const gridColor = '#f3f4f6';
      const blue = '#3B82F6', purple = '#8B5CF6', green = '#10B981', orange = '#F59E0B', red = '#EF4444';
      const baseOpts = {
        responsive: true, maintainAspectRatio: false,
        interaction: { mode: 'index', intersect: false },
        plugins: {
          legend: { display: false },
          tooltip: { backgroundColor: '#111827', titleColor: '#f9fafb', bodyColor: '#d1d5db', padding: 10, cornerRadius: 8, displayColors: true },
        },
      };
      function makeScaleOpts(dataValues) {
        const mx = Math.max(50, Math.ceil(Math.max(...dataValues, 0) / 50) * 50);
        return {
          y: {
            beginAtZero: true,
            suggestedMax: mx,
            grid: { color: gridColor },
            border: { display: false },
            ticks: { color: '#9ca3af', callback: (value) => value >= 1000 ? (value / 1000) + 'k' : value }
          },
          x: { grid: { display: false }, ticks: { color: '#6b7280' } },
        };
      }

      if (chartRef1.current) {
        chartRef1.current._chartInst = new ChartClass(chartRef1.current, {
          type: 'bar',
          data: { labels: ['Likes', 'Comments', 'Poll Votes'], datasets: [{ data: [likesCount, commentsCount, votesCount], backgroundColor: [red, blue, orange], borderRadius: 6, borderSkipped: false }] },
          options: { ...baseOpts, scales: makeScaleOpts([likesCount, commentsCount, votesCount]) },
        });
      }
      if (chartRef2.current) {
        const cur = Math.min(avgInteractions, 5);
        chartRef2.current._chartInst = new ChartClass(chartRef2.current, {
          type: 'doughnut',
          data: { labels: [`Your avg (${avgInteractions})`, 'Target (5)'], datasets: [{ data: [cur, Math.max(0, 5 - cur)], backgroundColor: [purple, '#e5e7eb'], borderWidth: 0, cutout: '78%' }] },
          options: { ...baseOpts, plugins: { ...baseOpts.plugins, legend: { display: true, position: 'bottom', labels: { color: '#6b7280', font: { size: 11 }, padding: 12, boxWidth: 10 } } } },
        });
      }
      if (chartRef6.current && totalUniqueLikers > 0) {
        chartRef6.current._chartInst = new ChartClass(chartRef6.current, {
          type: 'doughnut',
          data: { labels: [`Followers (${followerUniqueLikers})`, `Others (${nonFollowerUniqueLikers})`], datasets: [{ data: [followerUniqueLikers, nonFollowerUniqueLikers], backgroundColor: [blue, green], borderWidth: 0, cutout: '72%' }] },
          options: { ...baseOpts, plugins: { ...baseOpts.plugins, legend: { display: true, position: 'bottom', labels: { color: '#6b7280', font: { size: 11 }, padding: 12, boxWidth: 10 } } } },
        });
      }
      if (chartRef3.current && sortedMonths.length) {
        chartRef3.current._chartInst = new ChartClass(chartRef3.current, {
          type: 'line',
          data: { labels: monthLabels, datasets: [{ label: 'Posts', data: postsTrend, borderColor: blue, backgroundColor: 'rgba(59,130,246,.05)', borderWidth: 2, tension: 0.4, fill: true, pointRadius: 3 }, { label: 'Likes', data: likesTrend, borderColor: red, backgroundColor: 'rgba(239,68,68,.05)', borderWidth: 2, tension: 0.4, fill: true, pointRadius: 3 }] },
          options: { ...baseOpts, plugins: { ...baseOpts.plugins, legend: { display: true, position: 'top', labels: { color: '#6b7280', font: { size: 11 }, padding: 12, boxWidth: 10 } } }, scales: makeScaleOpts([...postsTrend, ...likesTrend]) },
        });
      }
      if (chartRef4.current && sortedMonths.length) {
        chartRef4.current._chartInst = new ChartClass(chartRef4.current, {
          type: 'bar',
          data: { labels: monthLabels, datasets: [{ label: 'Posts', data: postsTrend, backgroundColor: blue, borderRadius: 4, borderSkipped: false }, { label: 'Comments', data: commentsTrend, backgroundColor: green, borderRadius: 4, borderSkipped: false }] },
          options: { ...baseOpts, plugins: { ...baseOpts.plugins, legend: { display: true, position: 'top', labels: { color: '#6b7280', font: { size: 11 }, padding: 12, boxWidth: 10 } } }, scales: makeScaleOpts([...postsTrend, ...commentsTrend]) },
        });
      }
      if (chartRef5.current && Object.keys(contentMix).length > 1) {
        const labels = Object.keys(contentMix);
        chartRef5.current._chartInst = new ChartClass(chartRef5.current, {
          type: 'doughnut',
          data: { labels: labels.map(l => l.charAt(0).toUpperCase() + l.slice(1)), datasets: [{ data: labels.map(l => contentMix[l]), backgroundColor: [blue, green, orange, purple, red].slice(0, labels.length), borderWidth: 0, cutout: '70%' }] },
          options: { ...baseOpts, plugins: { ...baseOpts.plugins, legend: { display: true, position: 'bottom', labels: { color: '#6b7280', font: { size: 11 }, padding: 10, boxWidth: 10 } } } },
        });
      }
    }

    if (window.Chart) {
      buildCharts();
    } else {
      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/chart.js';
      script.onload = buildCharts;
      document.head.appendChild(script);
    }
    console.log(
      chartRef1.current &&
      chartRef1.current.parentElement.offsetWidth
    );
    return () => {
      [chartRef1, chartRef2, chartRef3, chartRef4, chartRef5, chartRef6].forEach(ref => {
        if (ref.current?._chartInst) { try { ref.current._chartInst.destroy(); } catch { } ref.current._chartInst = null; }
      });
    };
  }, [posts, stats, profile, isOrg]);

  if (!isOrg) {
    return (
      <div className="flex flex-col items-center py-16 gap-3 text-center px-6">
        <div className="w-12 h-12 rounded-xl bg-purple-50 flex items-center justify-center text-purple-500">{K.Chart}</div>
        <p className="text-sm font-semibold text-gray-900">Analytics is for Professional accounts</p>
        <p className="text-xs text-gray-400 max-w-xs leading-relaxed">Switch to a Professional account in Profile settings to unlock detailed analytics and charts.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div>
        <h2 className="text-xl font-bold text-gray-900">Analytics</h2>
        <p className="text-xs text-gray-400 mt-0.5">Your performance data</p>
      </div>

      <Accordion title="Interactions" icon={K.Chat} isOrg={isOrg}>
        <div className="space-y-3 pt-3">
          <p className="text-xs text-gray-500">Likes, comments, and poll votes on your posts.</p>
          <div className="relative w-full" style={{ height: 250 }}><canvas ref={chartRef1} /></div>
          <div className="grid grid-cols-2 gap-2">
            <div className="p-3 rounded-xl bg-blue-50 text-center"><p className="text-lg font-bold text-blue-700">{likesCount}</p><p className="text-[10px] text-blue-400">Likes</p></div>
            <div className="p-3 rounded-xl bg-emerald-50 text-center"><p className="text-lg font-bold text-emerald-700">{commentsCount}</p><p className="text-[10px] text-emerald-400">Comments</p></div>
          </div>
        </div>
      </Accordion>

      <Accordion title="Growth over time" icon={K.Bolt} isOrg={isOrg}>
        <div className="pt-3 relative w-full" style={{ height: 250 }}>
          <p className="text-xs text-gray-500 mb-2">Trend of your posts and likes over the last 6 months.</p>
          <canvas ref={chartRef3} />
        </div>
      </Accordion>

      <Accordion title="Monthly breakdown" icon={K.Chart} isOrg={isOrg}>
        <div className="pt-3 relative w-full" style={{ height: 250 }}>
          <p className="text-xs text-gray-500 mb-2">Comparison of post frequency versus engagement (comments) monthly.</p>
          <canvas ref={chartRef4} />
        </div>
      </Accordion>

      {totalUniqueLikers > 0 && (
        <Accordion title="Who's engaging" icon={K.Users} isOrg={isOrg}>
          <div className="pt-3 text-center">
            <p className="text-xs text-gray-500 mb-3">Breakdown of unique likers: followers vs. non-followers.</p>
            <p className="text-xs text-gray-400 mb-3">{totalUniqueLikers} unique people liked your posts.</p>
            <div className="relative w-full" style={{ height: 250 }}><canvas ref={chartRef6} /></div>
          </div>
        </Accordion>
      )}
    </div>
  );
}

// ─── 8. Milestones ───────────────────────────────────────────────────────────
function GrowTab({ stats, profile, username, isOrg, setTab, accent }) {
  const mobcoins = stats?.mobcoins ?? 0;
  const rank = stats?.rank ?? null;
  const streak = stats?.streak ?? 0;
  const followers = (profile?.followers || []).length;
  const postCount = stats?.post_count ?? 0;

  const milestones = [
    { label: '5 posts', desc: 'Publish 5 posts', done: postCount >= 5, icon: K.Posts },
    { label: '10 followers', desc: 'Reach 10 followers', done: followers >= 10, icon: K.Users },
    { label: '2,000 coins', desc: 'Earn 2,000 coins', done: mobcoins >= 2000, icon: K.Coin, tab: 'monetize' },
    { label: '20 posts', desc: 'Publish 20 posts', done: postCount >= 20, icon: K.Posts },
    { label: '50 followers', desc: 'Reach 50 followers', done: followers >= 50, icon: K.Users },
    { label: '50 posts', desc: 'Reach 50 posts', done: postCount >= 50, icon: K.Check },
    { label: '5,000 coins', desc: 'Earn 5,000 coins', done: mobcoins >= 5000, icon: K.Coin },
    { label: '100 followers', desc: 'Reach 100 followers', done: followers >= 100, icon: K.Users },
    { label: '10,000 coins', desc: 'Earn 10,000 coins', done: mobcoins >= 10000, icon: K.Coin },
    { label: '100 posts', desc: 'Publish 100 posts', done: postCount >= 100, icon: K.Posts },
    { label: '250 followers', desc: 'Reach 250 followers', done: followers >= 250, icon: K.Users },
    { label: '25,000 coins', desc: 'Earn 25,000 coins', done: mobcoins >= 25000, icon: K.Coin },
    { label: '200 posts', desc: 'Publish 200 posts', done: postCount >= 200, icon: K.Posts },
    { label: '500 followers', desc: 'Reach 500 followers', done: followers >= 500, icon: K.Users },
    { label: '50,000 coins', desc: 'Earn 50,000 coins', done: mobcoins >= 50000, icon: K.Coin },
    { label: '500 posts', desc: 'Publish 500 posts', done: postCount >= 500, icon: K.Posts },
    { label: '1,000 followers', desc: 'Reach 1,000 followers', done: followers >= 1000, icon: K.Users },
    { label: '100,000 coins', desc: 'Earn 100,000 coins', done: mobcoins >= 100000, icon: K.Coin },
    { label: '1,000 posts', desc: 'Publish 1,000 posts', done: postCount >= 1000, icon: K.Posts },
    { label: '5,000 followers', desc: 'Reach 5,000 followers', done: followers >= 5000, icon: K.Users },
  ];

  const tips = [
    { icon: <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18" /><polyline points="17 6 23 6 23 12" /></svg>, title: 'Post every day', body: 'Accounts that post daily grow 3× faster. Even a short thought counts.' },
    { icon: <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 11.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.38 8.38 0 01-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.38 8.38 0 013.8-.9h.5a8.48 8.48 0 018 8v.5z" /></svg>, title: 'Reply to comments', body: 'Every reply pushes your post higher in other people\'s feeds.' },
    { icon: <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12" /></svg>, title: 'Create polls', body: 'Poll posts get 2× more engagement on average.' },
    { icon: K.Video, title: 'Go live', body: 'Live streams push you to the top of feeds. Even 10 minutes helps.' },
  ];

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-bold text-gray-900">Milestones</h2>
        <p className="text-xs text-gray-400 mt-0.5">Track your progress</p>
      </div>

      <div className="space-y-2">
        {milestones.map(m => (
          <button
            key={m.label}
            onClick={() => m.done && m.tab ? setTab(m.tab) : null}
            className={cn("w-full flex items-center justify-between p-4 rounded-xl border-2 transition-all text-left", m.done ? "bg-emerald-50 border-emerald-200" : "bg-white border-gray-200 opacity-60")}
          >
            <div className="flex items-center gap-3">
              <div className={cn("w-11 h-11 rounded-xl flex items-center justify-center", m.done ? "bg-emerald-100 text-emerald-600" : "bg-gray-100 text-gray-300")}>{m.icon}</div>
              <div>
                <p className="text-sm font-semibold text-gray-900">{m.label}</p>
                <p className="text-xs text-gray-400 mt-0.5">{m.desc}</p>
              </div>
            </div>
            {m.done && (
              <svg viewBox="0 0 24 24" className="w-6 h-6 text-emerald-500 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12" /></svg>
            )}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="bg-white border border-gray-200 rounded-xl p-3 flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-orange-50 flex items-center justify-center text-orange-500">
            <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2"><path d="M8.08 2.26a1 1 0 011.08 1.45L8.5 5c-.18.4-.33.82-.44 1.25-.66 2.6.48 5.44 2.8 6.94a.5.5 0 00.67-.1l.5-.7c.33-.46.73-.85 1.18-1.16 1.1-.75 2.5-.83 3.68-.2.72.39 1.28 1.02 1.6 1.77.33.75.4 1.57.2 2.37a7 7 0 11-10.61-9.06 1 1 0 011.01-.85z" /></svg>
          </div>
          <div>
            <p className="text-xs text-gray-400">Posting streak</p>
            <p className="text-base font-bold text-gray-900">{streak} day{streak === 1 ? '' : 's'}</p>
          </div>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-3 flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-yellow-50 flex items-center justify-center text-yellow-500">{K.Crown}</div>
          <div>
            <p className="text-xs text-gray-400">Global rank</p>
            <p className="text-base font-bold text-gray-900">{rank ? `#${rank}` : 'Unranked'}</p>
          </div>
        </div>
      </div>

      <div>
        <p className="text-xs font-semibold text-gray-500 mb-2">Tips to grow faster</p>
        <div className="grid md:grid-cols-2 gap-2">
          {tips.map((tip, idx) => (
            <div key={idx} className="flex items-start gap-3 bg-white border border-gray-200 rounded-xl px-3 py-3">
              <span className="text-gray-400 flex-shrink-0 mt-0.5">{tip.icon}</span>
              <div>
                <p className="text-sm font-medium text-gray-900">{tip.title}</p>
                <p className="text-xs text-gray-400 mt-0.5 leading-relaxed">{tip.body}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <button onClick={() => setTab('composer')} className={cn('h-11 rounded-xl text-white text-sm font-medium transition-all', accent)}>New post</button>
        <button onClick={() => window.Lexum ? window.Lexum.navigate('/create-live') : (window.location.href = '/create-live')} className="h-11 rounded-xl border border-gray-200 text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition-all">Go live</button>
      </div>
    </div>
  );
}

// ─── 9. Preferences ──────────────────────────────────────────────────────────
function PrefsTab({ user, setProfile, accent, accentText }) {
  const [darkMode, setDarkMode] = useState(localStorage.getItem('darkMode') || 'system');
  const [notifs, setNotifs] = useState(user?.notification_prefs || {
    likes: { inApp: true, email: true },
    comments: { inApp: true, email: true },
    mentions: { inApp: true, email: true },
    followers: { inApp: true, email: true },
    newPost: { inApp: true, email: false },
    messages: { inApp: true, email: true },
    mobcoins: { inApp: true, email: true },
    events: { inApp: true, email: true },
  });
  const [autoSaving, setAutoSaving] = useState(false);

  useEffect(() => { if (user?.notification_prefs) setNotifs(user.notification_prefs); }, [user?.notification_prefs]);

  useEffect(() => {
    localStorage.setItem('darkMode', darkMode);
    window.dispatchEvent(new CustomEvent('app:preferences:update', { detail: { darkMode } }));
  }, [darkMode]);

  async function handleNotifPrefChange(key, channel) {
    if (!user) return;
    const prefVal = notifs[key] || { inApp: true, email: true };
    const updated = { ...notifs, [key]: { ...prefVal, [channel]: !prefVal[channel] } };
    setNotifs(updated);
    setAutoSaving(true);
    try {
      const res = await apiFetch(`/profile/${user.username}/notification-prefs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notification_prefs: updated }),
      });
      if (res.ok && setProfile) setProfile(prev => ({ ...prev, notification_prefs: updated }));
    } catch { setNotifs(user?.notification_prefs || notifs); }
    setTimeout(() => setAutoSaving(false), 600);
  }

  const themes = [
    { value: 'system', label: 'Follow system', sub: 'Matches your device setting' },
    { value: 'light', label: 'Light mode', sub: 'Always use light theme' },
    { value: 'dark', label: 'Dark mode', sub: 'Always use dark theme' },
  ];

  const notifSections = [
    {
      title: 'Activity',
      items: [
        { id: 'likes', label: 'Likes', sub: 'When someone likes your post', icon: K.Heart },
        { id: 'comments', label: 'Comments', sub: 'When someone comments on your post', icon: K.Chat },
        { id: 'mentions', label: 'Mentions', sub: `When someone tags @${user?.username}`, icon: K.Tag },
      ],
    },
    {
      title: 'Network',
      items: [
        { id: 'followers', label: 'New followers', sub: 'When someone follows you', icon: K.Users },
        { id: 'newPost', label: 'New posts', sub: 'Updates from people you follow', icon: K.Posts },
        { id: 'messages', label: 'Messages', sub: 'Direct messages', icon: K.Chat },
      ],
    },
  ];

  return (
    <div className="space-y-4 pb-16">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-gray-900">Preferences</h2>
        {autoSaving && <span className="text-xs text-blue-600 animate-pulse">Saving...</span>}
      </div>

      {/* Theme */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100">
          <p className="text-sm font-medium text-gray-900">Theme</p>
        </div>
        {themes.map((theme, idx) => (
          <button key={theme.value} onClick={() => setDarkMode(theme.value)} className={cn('w-full flex items-center gap-3 px-4 py-3 transition-colors text-left hover:bg-gray-50', idx < themes.length - 1 ? 'border-b border-gray-100' : '')}>
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-900">{theme.label}</p>
              <p className="text-xs text-gray-400">{theme.sub}</p>
            </div>
            {darkMode === theme.value && (
              <div className={cn("w-5 h-5 rounded-full flex items-center justify-center text-white", accent)}>
                <svg viewBox="0 0 24 24" className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="20 6 9 17 4 12" /></svg>
              </div>
            )}
          </button>
        ))}
      </div>

      {/* Notifications */}
      <p className="text-sm font-semibold text-gray-700">Notifications</p>
      {notifSections.map((section, sIdx) => (
        <div key={sIdx} className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100">
            <p className="text-xs font-semibold text-gray-500">{section.title}</p>
          </div>
          <div className="divide-y divide-gray-100">
            {section.items.map(item => {
              const prefVal = notifs[item.id] || { inApp: true, email: true };
              return (
                <div key={item.id} className="p-4">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center text-gray-400">{item.icon}</div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">{item.label}</p>
                      <p className="text-xs text-gray-400">{item.sub}</p>
                    </div>
                  </div>
                  <div className="flex gap-2 ml-11">
                    <ToggleBtn active={prefVal.inApp} label="In-app" onClick={() => handleNotifPrefChange(item.id, 'inApp')} accent={accent} />
                    <ToggleBtn active={prefVal.email} label="Email" onClick={() => handleNotifPrefChange(item.id, 'email')} accent={accent} />
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

function ToggleBtn({ active, label, onClick, accent }) {
  return (
    <button onClick={onClick} className={cn('flex items-center gap-2 px-3 py-2 rounded-lg border text-xs font-medium transition-all', active ? cn('bg-blue-50 border-blue-200 text-blue-700') : 'bg-gray-50 border-gray-200 text-gray-400')}>
      <div className={cn('w-7 h-4 rounded-full relative p-0.5 transition-colors', active ? 'bg-blue-600' : 'bg-gray-300')}>
        <div className={cn('w-3 h-3 bg-white rounded-full shadow-sm transition-transform', active ? 'translate-x-3' : 'translate-x-0')} />
      </div>
      {label}
    </button>
  );
}

// ─── 10. Log Out / Danger ─────────────────────────────────────────────────────
function DangerTab({ username }) {
  const [confirmVal, setConfirmVal] = useState('');
  const [deactivating, setDeactivating] = useState(false);

  // Log out
  function handleLogout() {
    if (!confirm('Are you sure you want to log out?')) return;
    localStorage.clear();
    window.Lexum ? window.Lexum.navigate('/auth') : (window.location.href = '/auth');
  }

  // Deactivate
  async function handleDeactivate() {
    if (confirmVal !== username) return;
    setDeactivating(true);
    try {
      const res = await apiFetch('/deactivate-account', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username }),
      });
      if (!res.ok) throw new Error('Deactivation failed');
      localStorage.clear();
      window.Lexum ? window.Lexum.navigate('/auth') : (window.location.href = '/auth');
    } catch (err) { alert(err.message); setDeactivating(false); }
  }

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold text-gray-900">Account</h2>

      {/* Log out */}
      <div className="bg-white border border-gray-200 rounded-xl p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-gray-100 flex items-center justify-center text-gray-500">{K.Logout}</div>
          <div>
            <p className="text-sm font-medium text-gray-900">Log out</p>
            <p className="text-xs text-gray-400">Sign out of your account</p>
          </div>
        </div>
        <button onClick={handleLogout} className="h-9 px-4 rounded-lg bg-gray-100 text-sm font-medium text-gray-700 hover:bg-gray-200 transition-colors">Log out</button>
      </div>

      {/* Danger zone */}
      <div className="bg-white border-2 border-red-100 rounded-xl p-4 space-y-4">
        <div className="flex items-start gap-3 p-3 bg-red-50 rounded-xl">
          <span className="text-red-500 mt-0.5">{K.Danger}</span>
          <div>
            <p className="text-sm font-semibold text-red-900">Delete account</p>
            <p className="text-xs text-red-700 mt-1 leading-relaxed">This will permanently delete your account, all your posts, and your followers list. This cannot be undone.</p>
          </div>
        </div>
        <div>
          <label className="text-xs font-medium text-gray-600 block mb-1">Type <strong>@{username}</strong> to confirm</label>
          <input type="text" placeholder={`@${username}`} value={confirmVal} onChange={e => setConfirmVal(e.target.value)} className="w-full h-11 px-4 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium outline-none focus:border-red-400 focus:bg-white transition-all" />
        </div>
        <button onClick={handleDeactivate} disabled={confirmVal !== username || deactivating} className="w-full h-11 bg-red-600 text-white rounded-xl text-sm font-semibold disabled:opacity-30 transition-all">
          {deactivating ? 'Deleting...' : 'Delete my account permanently'}
        </button>
      </div>
    </div>
  );
}