'use client';

import { useEffect, useMemo, useState } from 'react';
import NavIcons from '../../utils/navIcons';
import { openFeatureOnboarding } from '../../components/ui/FeatureOnboarding';
import { apiFetch } from '../../config/api';

function MenuRow({ item, active, onClick }) {
  const base =
    'group flex items-center gap-3 rounded-xl border px-3 py-3 transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/30 active:scale-[0.98]';
  const state = active
    ? 'border-blue-200 bg-blue-50/60 text-blue-700'
    : 'border-gray-200/80 bg-white text-gray-900 hover:border-gray-300 hover:bg-gray-50';

  const iconWrap = active
    ? 'bg-blue-100 text-blue-700'
    : 'bg-gray-100 text-gray-600 group-hover:bg-gray-200';

  const chevron = active
    ? 'text-blue-400'
    : 'text-gray-300 group-hover:text-gray-400';

  const sharedContent = (
    <>
      <div
        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg transition-colors ${iconWrap}`}
      >
        <item.Icon className="h-4 w-4" />
      </div>

      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-semibold">{item.label}</div>
        {item.description ? (
          <div className="truncate text-xs text-gray-500">{item.description}</div>
        ) : null}
      </div>

      <svg
        viewBox="0 0 24 24"
        className={`h-4 w-4 shrink-0 fill-none stroke-current transition-transform group-hover:translate-x-0.5 ${chevron}`}
        strokeWidth="2"
      >
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
      </svg>
    </>
  );

  if (onClick) {
    return (
      <button type="button" onClick={onClick} className={`${base} ${state} w-full text-left`}>
        {sharedContent}
      </button>
    );
  }

  return (
    <a href={item.href} aria-current={active ? 'page' : undefined} className={`${base} ${state}`}>
      {sharedContent}
    </a>
  );
}

function FeaturedCard({ username }) {
  return (
    <div className="rounded-2xl border border-blue-100 bg-gradient-to-br from-blue-50 via-white to-blue-50 p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-blue-500">
            Your next move
          </p>
          <h2 className="mt-1 text-base font-bold text-gray-900">Grow faster from here</h2>
          <p className="mt-1 text-xs leading-relaxed text-gray-500">
            {username
              ? `@${username}, manage your profile, earnings, and account tools in one place.`
              : 'Manage your profile, earnings, and account tools in one place.'}
          </p>
        </div>

        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-600 text-white shadow-sm">
          <NavIcons.Cog className="h-5 w-5" />
        </div>
      </div>

      <div className="mt-4 flex gap-2">
        <a
          href="/accountscenter"
          className="inline-flex flex-1 items-center justify-center rounded-xl bg-blue-600 px-3 py-2.5 text-sm font-bold text-white transition-all hover:bg-blue-700 active:scale-[0.98]"
        >
          Open Accounts Center
        </a>
        <a
          href="/wallet"
          className="inline-flex flex-1 items-center justify-center rounded-xl border border-blue-200 bg-white px-3 py-2.5 text-sm font-bold text-blue-700 transition-all hover:bg-blue-50 active:scale-[0.98]"
        >
          View Wallet
        </a>
      </div>
    </div>
  );
}

export default function MenuContent() {
  const [username, setUsername] = useState('');
  const [path, setPath] = useState('');
  const [savedAccounts, setSavedAccounts] = useState([]);

  useEffect(() => {
    setUsername(localStorage.getItem('currentUser') || '');
    setPath(window.location.pathname);
    setSavedAccounts(JSON.parse(localStorage.getItem('textmobSavedAccounts') || '[]').map(a => ({ ...a, username: a.username?.toLowerCase() })));

    const onPopState = () => setPath(window.location.pathname);
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  async function switchAccount(username, password) {
    try {
      const res = await apiFetch('/login', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier: username, password }),
      });
      const data = await res.json();
      if (!res.ok) { window.showNotification?.({ title:'Login Failed', message: data.error, type:'error' }); return; }
      localStorage.setItem('currentUser', data.user.username);
      window.__feedState = { activeTab:'foryou', foryou:{posts:[],page:1,hasMore:true,scrollY:0}, following:{posts:[],page:1,hasMore:true,scrollY:0} };
      window.location.href = '/';
    } catch(e) { window.showNotification?.({ title:'Error', message:e.message, type:'error' }); }
  }

  const handleClearCache = () => {
    const currentUser = localStorage.getItem('currentUser');
    const savedAccounts = localStorage.getItem('textmobSavedAccounts');
    const viewedIds = localStorage.getItem('__tmob_viewed_ids');
    
    localStorage.clear();
    
    if (currentUser) localStorage.setItem('currentUser', currentUser);
    if (savedAccounts) localStorage.setItem('textmobSavedAccounts', savedAccounts);
    if (viewedIds) localStorage.setItem('__tmob_viewed_ids', viewedIds);
    
    window.__feedState = {
      activeTab: 'foryou',
      foryou: { posts: [], page: 1, hasMore: true, scrollY: 0 },
      following: { posts: [], page: 1, hasMore: true, scrollY: 0 }
    };
    
    window.showNotification?.({
      title: 'Cache Cleared',
      message: 'App cache has been refreshed successfully.',
      type: 'success'
    });

    // Optional: reload after a short delay to ensure everything is fresh
    setTimeout(() => {
        window.location.reload();
    }, 1500);
  };

  const sections = useMemo(
    () => [
      {
        title: 'Explore',
        items: [
          {
            label: 'Your Profile',
            description: 'See how people view you',
            Icon: NavIcons.User,
            href: username ? `/@${username}` : '/profile',
          },
          {
            label: 'Activity',
            description: 'Who noticed you today',
            Icon: NavIcons.Bell,
            href: '/activity',
          },
          {
            label: 'Connections',
            description: 'Your people, your reach',
            Icon: NavIcons.UserGroup,
            href: '/connections',
          },
          {
            label: 'Snaps',
            description: 'Short content. Fast attention',
            Icon: NavIcons.Camera,
            href: '/snaps',
          },
          {
            label: 'Discover',
            description: 'Find what is trending now',
            Icon: NavIcons.Search,
            href: '/topsearch',
          },
        ],
      },
      {
        title: 'Money & Control',
        items: [
          {
            label: 'Wallet',
            description: 'Your Mobcoins, your power',
            Icon: NavIcons.Wallet,
            href: '/wallet',
          },
          {
            label: 'Accounts Center',
            description: 'Switch modes, manage identity',
            Icon: NavIcons.Cog,
            href: '/accountscenter',
          },
        ],
      },
      {
        title: 'Boost & Status',
        items: [
          {
            label: 'Hall of Fame',
            description: 'Top users this week',
            Icon: NavIcons.Leaderboard,
            href: '/halloffame',
          },
          {
            label: 'Install the App',
            description: 'Get Textmob on your Android phone',
            Icon: NavIcons.Download,
            href: '/install',
          },
          {
            label: 'What’s New',
            description: 'New features you should try',
            Icon: NavIcons.Info,
            onClick: openFeatureOnboarding,
          },
          {
            label: 'About Textmob',
            description: 'How the system works',
            Icon: NavIcons.Info,
            href: '/about',
          },
        ],
      },
      {
        title: 'System',
        items: [
          {
            label: 'Clear App Cache',
            description: 'Refresh data and fix glitches',
            Icon: NavIcons.Bolt,
            onClick: handleClearCache,
          },
        ],
      },
    ],
    [username]
  );

  return (
    <div className="min-h-full bg-white text-gray-900">
      <div className="sticky top-0 z-30 border-b border-gray-200/80 bg-white/90 backdrop-blur-xl">
        <div className="flex h-14 items-center justify-between px-4 sm:px-6">
          <div>
            <h1 className="text-base font-semibold tracking-tight">Menu</h1>
            {username ? (
              <p className="text-xs text-gray-500">@{username}</p>
            ) : (
              <p className="text-xs text-gray-400">Loading account</p>
            )}
          </div>

          <div className="flex h-9 w-9 items-center justify-center rounded-full border border-gray-200 bg-gray-50 text-gray-500">
            <NavIcons.User className="h-4 w-4" />
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-xl space-y-5 px-4 py-4 sm:px-6">
        <FeaturedCard username={username} />

        <div className="rounded-2xl border border-gray-200/80 bg-gray-50/70 p-3">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-gray-200 bg-white text-gray-700">
              <NavIcons.User className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-semibold">
                {username ? `@${username}` : 'Your account'}
              </div>
              <div className="truncate text-xs text-gray-500">
                Everything that moves your account forward
              </div>
            </div>
          </div>
        </div>

        {sections.map((section) => (
          <section key={section.title} className="space-y-2">
            <div className="px-1 text-[11px] font-medium uppercase tracking-[0.18em] text-gray-400">
              {section.title}
            </div>

            <div className="space-y-2">
              {section.items.map((item) => (
                <MenuRow
                  key={item.label}
                  item={item}
                  active={
                    item.href
                      ? path === item.href || path.startsWith(item.href + '/')
                      : false
                  }
                  onClick={item.onClick}
                />
              ))}
            </div>
          </section>
        ))}

        {savedAccounts.length > 0 && (
          <section className="space-y-2">
            <div className="px-1 text-[11px] font-medium uppercase tracking-[0.18em] text-gray-400">
              Accounts
            </div>
            <div className="space-y-1">
              {savedAccounts.map(acc => (
                <button key={acc.username} onClick={() => switchAccount(acc.username, acc.password)}
                  className="w-full flex items-center gap-3 rounded-xl border border-gray-200/80 bg-white px-3 py-3 transition-all duration-200 hover:bg-gray-50 active:scale-[0.98] text-left"
                >
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-100 text-blue-600 font-bold text-xs">
                    {acc.username.slice(0, 2).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-semibold text-gray-900">@{acc.username}</div>
                    <div className="text-xs text-blue-500 font-semibold">Tap to switch</div>
                  </div>
                  <NavIcons.ArrowRightOnRect className="h-4 w-4 text-gray-300" />
                </button>
              ))}
            </div>
          </section>
        )}

        <div className="pt-1">
          <a
            href="/logout"
            className="group flex items-center gap-3 rounded-xl border border-red-200/80 bg-red-50/60 px-3 py-3 transition-all duration-200 hover:border-red-300 hover:bg-red-100/70 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500/20 active:scale-[0.98]"
          >
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-red-100 text-red-600 group-hover:bg-red-200">
              <NavIcons.ArrowRightOnRect className="h-4 w-4" />
            </div>

            <div className="min-w-0 flex-1">
              <div className="text-sm font-semibold text-red-700">Log Out</div>
              <div className="text-xs text-red-500">End this session</div>
            </div>

            <svg
              viewBox="0 0 24 24"
              className="h-4 w-4 shrink-0 fill-none stroke-current text-red-300 transition-transform group-hover:translate-x-0.5 group-hover:text-red-400"
              strokeWidth="2"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </a>
        </div>
      </div>
    </div>
  );
}