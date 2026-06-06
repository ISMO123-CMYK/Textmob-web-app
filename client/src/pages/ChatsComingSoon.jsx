'use client';

import React from 'react';

function MessageIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" {...props}>
      <path
        d="M7.5 17.25 4.5 20v-3.375A8.25 8.25 0 0 1 12.75 8.25h1.5A6.75 6.75 0 0 1 21 15v.75A6.75 6.75 0 0 1 14.25 22.5H9.75"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function TranslateIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" {...props}>
      <path
        d="M4.5 6.75h7.5M8.25 4.5v2.25m-2.25 9h4.5m-2.25-9c-.6 3.9-2.55 7.05-5.25 9m5.25-9c.9 2.4 2.55 4.95 5.25 6.75"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M13.5 17.25 16.5 12l3 5.25M14.55 15h4.9"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function PhoneIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" {...props}>
      <path
        d="M7.5 3.75h9A2.25 2.25 0 0 1 18.75 6v12A2.25 2.25 0 0 1 16.5 20.25h-9A2.25 2.25 0 0 1 5.25 18V6A2.25 2.25 0 0 1 7.5 3.75Z"
        stroke="currentColor"
        strokeWidth="1.8"
      />
      <path
        d="M10.5 18h3"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

export default function LoudaComingSoon() {
  return (
    <div className="relative min-h-screen overflow-hidden bg-[#06080d] text-white">
      <div
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(circle at 18% 24%, rgba(255, 71, 87, 0.28), transparent 24%), radial-gradient(circle at 82% 24%, rgba(0, 212, 255, 0.22), transparent 24%), radial-gradient(circle at 50% 80%, rgba(255, 123, 0, 0.14), transparent 26%), linear-gradient(90deg, #7a0f18 0%, #0a0d13 42%, #07151e 100%)',
        }}
      />

      <div
        className="absolute inset-0 opacity-25"
        style={{
          backgroundImage:
            'linear-gradient(rgba(255,255,255,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.04) 1px, transparent 1px)',
          backgroundSize: '80px 80px',
          maskImage: 'linear-gradient(to bottom, rgba(0,0,0,0.75), transparent 92%)',
          WebkitMaskImage: 'linear-gradient(to bottom, rgba(0,0,0,0.75), transparent 92%)',
        }}
      />

      <div className="relative flex min-h-screen items-center justify-center px-4 py-6">
        <div className="w-full max-w-md text-center">
          <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center">
            <img
              src="https://louda.web.app/icon-no-bg.png"
              alt="Louda logo"
              className="h-16 w-16 object-contain"
            />
          </div>

          <div className="mb-3 text-[11px] font-semibold tracking-[0.5em] text-white/80">
            TRY LOUDA TODAY
          </div>

          <h1 className="text-5xl font-black tracking-tight sm:text-6xl">
            <span className="text-white">LOUDA</span>
          </h1>

          <p className="mt-4 text-lg font-medium text-white/85 sm:text-xl">
            Messaging without limits
          </p>
          <p className="mt-1 text-base text-white/70 sm:text-lg">
            Translation included
          </p>

          <div className="mt-6 flex items-center justify-center gap-3">
            <div className="flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 py-2">
              <MessageIcon className="h-4 w-4 text-[#ff9c00]" />
              <span className="text-sm font-medium text-white/85">Chat</span>
            </div>

            <div className="flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 py-2">
              <TranslateIcon className="h-4 w-4 text-[#1fb6ff]" />
              <span className="text-sm font-medium text-white/85">Translate</span>
            </div>
          </div>

          <div className="mt-8">
            <a
              href="https://louda.web.app"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-[linear-gradient(90deg,#ff9c00_0%,#ff2d55_55%,#1fb6ff_100%)] px-6 py-3 text-sm font-semibold text-white"
            >
              <PhoneIcon className="h-4 w-4" />
              Try Louda today
            </a>
          </div>

          <div onClick={() => {
            window.Lexum.navigate('/')
          }} className="mt-6 text-xs uppercase tracking-[0.45em] text-white/55">
            Go Back Home
          </div>
        </div>
      </div>
    </div>
  );
}