'use client';

import { useEffect, useState } from 'react';
import NavIcons from '../../utils/navIcons';
import { openFeatureOnboarding } from '../../components/ui/FeatureOnboarding';

function MenuRow({ item, active, onClick }) {
  const base =
    'group flex items-center gap-3 rounded-xl border px-3 py-3 transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/30';
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
      <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg transition-colors ${iconWrap}`}>
        <item.Icon className="h-4.5 w-4.5" />
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
    <a
      href={item.href}
      aria-current={active ? 'page' : undefined}
      className={`${base} ${state}`}
    >
      {sharedContent}
    </a>
  );
}

export default function MenuContent() {
  const [username, setUsername] = useState('');
  const [path, setPath] = useState('');

  useEffect(() => {
    setUsername(localStorage.getItem('currentUser') || '');
    setPath(window.location.pathname);
  }, []);

  const sections = [
    {
      title: 'Main',
      items: [
        { label: 'Profile', Icon: NavIcons.User, href: username ? `/@${username}` : '/profile' },
        { label: 'Activity', Icon: NavIcons.Bell, href: '/activity' },
        { label: 'Connections', Icon: NavIcons.UserGroup, href: '/connections' },
        { label: 'Snaps', Icon: NavIcons.Camera, href: '/snaps' },
        { label: 'Search', Icon: NavIcons.Search, href: '/topsearch' },
      ],
    },
    {
      title: 'Account',
      items: [
        { label: 'Wallet', Icon: NavIcons.Wallet, href: '/wallet' },
        { label: 'Accounts Center', Icon: NavIcons.Cog, href: '/accountscenter' },
      ],
    },
    {
      title: 'About',
      items: [
        { label: "What’s New", Icon: NavIcons.Info, onClick: openFeatureOnboarding },
        { label: 'Hall of Fame', Icon: NavIcons.Leaderboard, href: '/halloffame' },
        { label: 'About Textmob', Icon: NavIcons.Info, href: '/about' },
      ],
    },
  ];

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
            <NavIcons.User className="h-4.5 w-4.5" />
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-xl space-y-5 px-4 py-4 sm:px-6">
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
                Quick access to your sections
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
                  active={item.href ? path === item.href || path.startsWith(item.href + '/') : false}
                  onClick={item.onClick}
                />
              ))}
            </div>
          </section>
        ))}

        <div className="pt-1">
          <a
            href="/logout"
            className="group flex items-center gap-3 rounded-xl border border-red-200/80 bg-red-50/60 px-3 py-3 transition-all duration-200 hover:border-red-300 hover:bg-red-100/70 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500/20"
          >
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-red-100 text-red-600 group-hover:bg-red-200">
              <NavIcons.ArrowRightOnRect className="h-4.5 w-4.5" />
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