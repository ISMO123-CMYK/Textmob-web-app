import React, { useEffect } from 'react';

export const giftsList = [
  { id: 'rose', name: 'Rose', cost: 5, tier: 1, color: '#f43f5e' },
  { id: 'heart', name: 'Heart', cost: 10, tier: 1, color: '#ef4444' },
  { id: 'star', name: 'Star', cost: 15, tier: 1, color: '#f59e0b' },
  { id: 'fire', name: 'Fire', cost: 20, tier: 1, color: '#f97316' },
  { id: 'crown', name: 'Crown', cost: 30, tier: 2, color: '#eab308' },
  { id: 'trophy', name: 'Trophy', cost: 50, tier: 2, color: '#d97706' },
  { id: 'rocket', name: 'Rocket', cost: 75, tier: 2, color: '#6366f1' },
  { id: 'diamond', name: 'Diamond', cost: 100, tier: 3, color: '#06b6d4' },
  { id: 'golden_boot', name: 'Golden Boot', cost: 150, tier: 3, color: '#ca8a04' },
  { id: 'shark', name: 'Shark', cost: 200, tier: 3, color: '#0ea5e9' },
  { id: 'lion', name: 'Lion', cost: 300, tier: 4, color: '#d97706' },
  { id: 'unicorn', name: 'Unicorn', cost: 400, tier: 4, color: '#a855f7' },
  { id: 'dragon', name: 'Dragon', cost: 500, tier: 4, color: '#ef4444' },
  { id: 'jet', name: 'Private Jet', cost: 750, tier: 5, color: '#64748b' },
  { id: 'yacht', name: 'Yacht', cost: 1000, tier: 5, color: '#0284c7' },
  { id: 'galaxy', name: 'Galaxy', cost: 2000, tier: 5, color: '#7c3aed' }
];

export function injectLiveStyles() {
  if (typeof document === 'undefined' || document.getElementById('tm-live-styles')) {
    return;
  }
  const styleEl = document.createElement('style');
  styleEl.id = 'tm-live-styles';
  styleEl.textContent = `
    @keyframes tmLiveDot   { 0%,100%{opacity:1}   50%{opacity:.3} }
    @keyframes tmMsgIn     { from{opacity:0;transform:translateY(6px)} to{opacity:1;transform:translateY(0)} }
    @keyframes tmConfetti  { 0%{opacity:1;transform:translateY(0) rotate(0deg) scale(1)}
                             60%{opacity:1;} 100%{opacity:0;transform:translateY(-520px) rotate(1080deg) scale(.2)} }
    @keyframes tmGiftFloat { 0%{opacity:1;transform:translateY(0) scale(.4) rotate(-10deg)}
                             25%{opacity:1;transform:translateY(-80px) scale(1.5) rotate(5deg)}
                             70%{opacity:.9;transform:translateY(-300px) scale(1.2) rotate(-3deg)}
                             100%{opacity:0;transform:translateY(-480px) scale(.7) rotate(8deg)} }
    @keyframes tmPulseRing { 0%{transform:scale(1);opacity:.9} 100%{transform:scale(5);opacity:0} }
    @keyframes tmScreenFlash { 0%{opacity:0} 8%{opacity:.35} 18%{opacity:0} 30%{opacity:.2} 45%{opacity:0} 100%{opacity:0} }
    @keyframes tmTierText  { 0%{opacity:0;transform:translate(-50%,-50%) scale(.3)}
                             30%{opacity:1;transform:translate(-50%,-50%) scale(1.15)}
                             70%{opacity:1;transform:translate(-50%,-50%) scale(1)}
                             100%{opacity:0;transform:translate(-50%,-50%) scale(.8)} }
    @keyframes tmShake     { 0%,100%{transform:translateX(0)} 20%{transform:translateX(-8px)}
                             40%{transform:translateX(8px)} 60%{transform:translateX(-5px)} 80%{transform:translateX(5px)} }
    @keyframes tmBannerIn  { from{opacity:0;transform:translateY(-24px) scale(.9)}
                             to{opacity:1;transform:translateY(0) scale(1)} }
    @keyframes tmBannerOut { from{opacity:1;transform:scale(1)}
                             to{opacity:0;transform:scale(.85)} }
    @keyframes tmCountUp   { from{transform:scale(.5);opacity:0} to{transform:scale(1);opacity:1} }
    .tm-live-dot     { animation: tmLiveDot 1.2s ease infinite; }
    .tm-msg-in       { animation: tmMsgIn .18s ease forwards; }
    .tm-confetti     { animation: tmConfetti var(--dur,2.4s) cubic-bezier(.2,.8,.4,1) forwards; pointer-events:none; }
    .tm-gift-float   { animation: tmGiftFloat var(--dur,2.8s) cubic-bezier(.1,.9,.3,1) forwards; pointer-events:none; }
    .tm-pulse-ring   { animation: tmPulseRing .8s ease-out infinite; }
    .tm-screen-flash { animation: tmScreenFlash var(--dur,1.5s) ease-out forwards; pointer-events:none; }
    .tm-tier-text    { animation: tmTierText var(--dur,3s) cubic-bezier(.34,1.56,.64,1) forwards; pointer-events:none; }
    .tm-shake        { animation: tmShake .5s ease; }
    .tm-banner-in    { animation: tmBannerIn .3s cubic-bezier(.34,1.56,.64,1) forwards; }
    .tm-banner-out   { animation: tmBannerOut .3s ease forwards; }
    .tm-count-up     { animation: tmCountUp .25s cubic-bezier(.34,1.56,.64,1) forwards; }
    .tm-noscroll     { scrollbar-width:none; -ms-overflow-style:none; }
    .tm-noscroll::-webkit-scrollbar { display:none; }
    .tm-glass        { background:rgba(0,0,0,.55); backdrop-filter:blur(10px); -webkit-backdrop-filter:blur(10px); }
  `;
  document.head.appendChild(styleEl);
}

// Z Component
export default function GiftIcon({ id, size = 28 }) {
  const style = {
    width: size,
    height: size,
    flexShrink: 0
  };
  switch (id) {
    case 'rose':
      return (
        <svg style={style} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 3c0 0-4 2.5-4 6.5a4 4 0 008 0C16 5.5 12 3 12 3z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9.5V21M9 21h6" />
        </svg>
      );
    case 'heart':
      return (
        <svg style={style} viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
        </svg>
      );
    case 'star':
      return (
        <svg style={style} viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
        </svg>
      );
    case 'fire':
      return (
        <svg style={style} viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 2C12 2 7 7 7 13a5 5 0 0010 0c0-2.5-1.5-4.5-3-5.5C15 10 16 12 14 14c0 0-1-1-1-3 0-2.5-1-9-1-9z" />
        </svg>
      );
    case 'crown':
      return (
        <svg style={style} viewBox="0 0 24 24" fill="currentColor">
          <path d="M2 19h20v2H2v-2zM4 17l3-10 5 6 5-6 3 10H4z" />
        </svg>
      );
    case 'trophy':
      return (
        <svg style={style} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 2h12v8a6 6 0 01-12 0V2zM6 6H2v2a4 4 0 004 4M18 6h4v2a4 4 0 01-4 4M12 16v4M8 20h8" />
        </svg>
      );
    case 'rocket':
      return (
        <svg style={style} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2l8-8-3-3-8 8zM12 5l3 3 3-9-9 3 3 3z" />
        </svg>
      );
    case 'diamond':
      return (
        <svg style={style} viewBox="0 0 24 24" fill="currentColor">
          <path d="M6 3h12l4 6-10 12L2 9l4-6z" />
        </svg>
      );
    case 'golden_boot':
      return (
        <svg style={style} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 20h12l2-6-4-2-1-4 3-3-5-3-4 3v15zM15 14l4 2 2 4" />
        </svg>
      );
    case 'shark':
      return (
        <svg style={style} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path strokeLinecap="round" strokeLinejoin="round" d="M2 12s4-8 10-8c4 0 7 3 7 7s-2 5-5 5H2M19 11l3-4M14 17l1 4M10 17l-1 4" />
        </svg>
      );
    case 'lion':
      return (
        <svg style={style} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <circle cx="12" cy="10" r="4" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M8 6c-2-2-4 0-3 3M16 6c2-2 4 0 3 3M9 14l-2 6M15 14l2 6M9 14h6" />
        </svg>
      );
    case 'unicorn':
      return (
        <svg style={style} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 3l2 5h-4l2-5zM6 8c0 0 2 2 6 2s6-2 6-2v6a6 6 0 01-12 0V8zM9 14l-2 6M15 14l2 6" />
        </svg>
      );
    case 'dragon':
      return (
        <svg style={style} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 3c-3 0-6 3-6 7 0 3 2 5 5 6l1 5M12 3c3 0 6 3 6 7 0 3-2 5-5 6M8 8c-2-1-4 1-3 4M16 8c2-1 4 1 3 4" />
        </svg>
      );
    case 'jet':
      return (
        <svg style={style} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l5-5 9 2 4 3-18 0zM8 7l1-4M12 9l1 8M5 12l-2 4 4-1" />
        </svg>
      );
    case 'yacht':
      return (
        <svg style={style} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 17l4-8 5-2v10H3zM12 7v10h7l2-4-9-6zM2 20h20" />
        </svg>
      );
    case 'galaxy':
      return (
        <svg style={style} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <circle cx="12" cy="12" r="3" />
          <path strokeLinecap="round" d="M12 2a15 15 0 010 20M2 12a15 15 0 0120 0" />
          <path strokeLinecap="round" d="M5 5a14 14 0 0114 14M19 5A14 14 0 015 19" />
        </svg>
      );
    default:
      return (
        <svg style={style} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <rect x="3" y="8" width="18" height="13" rx="2" />
          <path strokeLinecap="round" d="M12 8V21M8 8V6a4 4 0 018 0v2" />
        </svg>
      );
  }
}
