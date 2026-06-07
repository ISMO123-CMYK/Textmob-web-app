'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';

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
  const buildLoudaUrl = useCallback(() => {
    let currentUser = '';
    if (typeof window !== 'undefined') {
      currentUser =
        window.localStorage.getItem('currentUser') ||
        window.localStorage.currentUser ||
        '';
    }
    const userId = encodeURIComponent(currentUser);
    const base = (typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'))
      ? 'http://localhost:9000'
      : 'https://louda.web.app';
    return `${base}/?from=textmob&userId=${userId}`;
  }, []);

  const [showIframe, setShowIframe] = useState(true);
  const [iframeSrc, setIframeSrc] = useState(() => buildLoudaUrl());
  const [isLoading, setIsLoading] = useState(true);

  const openLouda = useCallback(() => {
    const src = buildLoudaUrl();
    setIframeSrc(src);
    setIsLoading(true);
    setShowIframe(true);
  }, [buildLoudaUrl]);
  const isDesktop =
    typeof window !== 'undefined' && window.innerWidth >= 768;

  const closeLouda = useCallback(() => {
    setShowIframe(false);
    setIframeSrc('');
    setIsLoading(false);
  }, []);

  useEffect(() => {
    const handleMessage = (event) => {
      const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
      const allowedOrigin = isLocal ? 'http://localhost:9000' : 'https://louda.web.app';
      
      if (event.origin !== allowedOrigin && event.origin !== 'https://louda.web.app') return;
      const data = event.data;
      const shouldClose =
        data === 'LOUDA_CLOSE' ||
        data === 'CLOSE_IFRAME' ||
        data?.type === 'LOUDA_CLOSE' ||
        data?.type === 'CLOSE_IFRAME' ||
        data?.type === 'LOUDA_DONE' ||
        data?.action === 'close' ||
        data?.action === 'done';
      if (shouldClose) {
        closeLouda();
        if (typeof window !== 'undefined' && window.Lexum?.navigate) {
          window.Lexum.navigate('/');
        }
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [closeLouda]);

  if (showIframe) {
    return (
      <div style={{ position: 'fixed', inset: 0, width: '100%', height: '100%', zIndex: 9999, background: '#000' }}>
        <button
          type="button"
          onClick={() => {
            closeLouda();
            if (typeof window !== 'undefined' && window.Lexum?.navigate) {
              window.Lexum.navigate('/');
            }
          }}
          style={{
            position: 'fixed',
            top: 12,
            left: 12,
            zIndex: 10000,
            width: 34,
            height: 34,
            borderRadius: '50%',
            background: 'rgba(0,0,0,0.45)',
            backdropFilter: 'blur(6px)',
            border: '1px solid rgba(255,255,255,0.12)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 0,
          }}
          aria-label="Go back"
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="rgba(255,255,255,0.85)"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </button>

        {isLoading && (
          <div style={{
            position: 'absolute',
            inset: 0,
            zIndex: 9998,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: '#06080d',
          }}>
            <div style={{
              width: 40,
              height: 40,
              borderRadius: '50%',
              border: '2px solid rgba(255,255,255,0.15)',
              borderTopColor: 'rgba(255,255,255,0.9)',
              animation: 'spin 0.75s linear infinite',
            }} />
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          </div>
        )}
        <iframe
          src={iframeSrc}
          title="Louda"
          style={{
            position: 'absolute',
            inset: 0,
            width: isDesktop ? '100%' : '394px',
            height: '100%',
            border: 'none',
            display: 'block',
            margin: isDesktop ? 0 : '0 auto',
          }}
          allow="camera; microphone; clipboard-read; clipboard-write; fullscreen"
          onLoad={() => setIsLoading(false)}
        />
      </div>
    );
  }

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
            <button
              type="button"
              onClick={openLouda}
              className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-[linear-gradient(90deg,#ff9c00_0%,#ff2d55_55%,#1fb6ff_100%)] px-6 py-3 text-sm font-semibold text-white"
            >
              <PhoneIcon className="h-4 w-4" />
              Try Louda today
            </button>
          </div>

          <div
            onClick={() => {
              if (window.Lexum?.navigate) {
                window.Lexum.navigate('/');
              }
            }}
            className="mt-6 cursor-pointer text-xs uppercase tracking-[0.45em] text-white/55"
          >
            Go Back Home
          </div>
        </div>
      </div>
    </div>
  );
}