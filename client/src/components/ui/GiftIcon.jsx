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
    @keyframes tmSpin      { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
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

/**
 * CameraSensorIcon
 * Shows which camera is currently active so users can understand the state.
 *
 * facing = 'user'        → front camera (selfie) — shows a person silhouette inside lens
 * facing = 'environment' → rear camera           — shows a landscape/mountain inside lens
 *
 * Usage in CreateLiveContent:
 *   import { CameraSensorIcon } from './GiftIcon';
 *   <CameraSensorIcon facing={facing} size={20} />
 *
 * Replace the existing flip-camera button SVG with this component and pass the
 * current `facing` state value. The icon updates automatically when facing changes.
 */
export function CameraSensorIcon({ facing = 'user', size = 22 }) {
  const s = { width: size, height: size, flexShrink: 0 };

  if (facing === 'user') {
    // Front / selfie camera — person silhouette inside the lens
    return (
      <svg style={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
        {/* Camera body */}
        <rect x="2" y="7" width="20" height="14" rx="2.5" />
        {/* Shutter bump */}
        <path d="M8 7V5.5a1 1 0 011-1h6a1 1 0 011 1V7" />
        {/* Lens ring */}
        <circle cx="12" cy="14" r="3.8" />
        {/* Person head inside lens */}
        <circle cx="12" cy="12.8" r="1.1" fill="currentColor" stroke="none" />
        {/* Person shoulders arc inside lens */}
        <path d="M9.5 16c0-1.38 1.12-2.2 2.5-2.2s2.5.82 2.5 2.2" strokeWidth="1.3" fill="none" />
        {/* "FRONT" indicator: small dot top-right corner of body */}
        <circle cx="19.5" cy="9.5" r="1" fill="currentColor" stroke="none" />
      </svg>
    );
  }

  // Rear / environment camera — landscape scene inside the lens
  return (
    <svg style={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      {/* Camera body */}
      <rect x="2" y="7" width="20" height="14" rx="2.5" />
      {/* Shutter bump */}
      <path d="M8 7V5.5a1 1 0 011-1h6a1 1 0 011 1V7" />
      {/* Lens ring */}
      <circle cx="12" cy="14" r="3.8" />
      {/* Mountain peaks inside lens (landscape = rear) */}
      <path d="M8.8 16.5 L11 13 L13 15.5 L14.5 13.8 L15.5 16.5" strokeWidth="1.2" fill="none" />
      {/* Sun dot inside lens */}
      <circle cx="14.8" cy="12.5" r="0.7" fill="currentColor" stroke="none" />
      {/* "REAR" indicator: flash rect top-left of body */}
      <rect x="3.5" y="9" width="3" height="2" rx="0.6" fill="currentColor" stroke="none" />
    </svg>
  );
}

/**
 * GiftIcon — every icon redrawn to visually represent the actual gift item.
 * The `default` case (gift box with ribbon) is also used as the "send gift" button icon.
 */
export default function GiftIcon({ id, size = 28 }) {
  const style = { width: size, height: size, flexShrink: 0 };

  switch (id) {

    // ── Tier 1 ──────────────────────────────────────────────────────────────

    case 'rose':
      return (
        <svg style={style} viewBox="0 0 24 24" fill="currentColor">
          {/* Outer petals */}
          <ellipse cx="12" cy="9" rx="3.2" ry="2.6" opacity="0.85" />
          <ellipse cx="9.2" cy="10.8" rx="2.3" ry="1.7" opacity="0.72" />
          <ellipse cx="14.8" cy="10.8" rx="2.3" ry="1.7" opacity="0.72" />
          {/* Mid petals */}
          <ellipse cx="10" cy="12.8" rx="2.1" ry="1.5" opacity="0.62" />
          <ellipse cx="14" cy="12.8" rx="2.1" ry="1.5" opacity="0.62" />
          <ellipse cx="12" cy="13.5" rx="2.7" ry="1.4" opacity="0.82" />
          {/* Centre */}
          <circle cx="12" cy="9.5" r="1.2" opacity="0.55" />
          {/* Stem */}
          <line x1="12" y1="14.5" x2="12" y2="21" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" fill="none" />
          {/* Leaves */}
          <path d="M12 18.5 Q8.5 17.2 8.5 14.8 Q10.2 16.5 12 18.5z" />
          <path d="M12 17 Q15.5 15.8 15.5 13.5 Q13.8 15 12 17z" />
        </svg>
      );

    case 'heart':
      return (
        <svg style={style} viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
          {/* Gloss highlight */}
          <ellipse cx="9" cy="7.5" rx="2.4" ry="1.4" fill="white" opacity="0.22" transform="rotate(-20 9 7.5)" />
        </svg>
      );

    case 'star':
      return (
        <svg style={style} viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.3L12 17l-6.2 4.2 2.4-7.3L2 9.4h7.6z" />
          {/* Inner lighter facet */}
          <path d="M12 5.5l1.5 4.6H17.8l-3.9 2.8 1.5 4.5L12 14.8l-3.4 2.6 1.5-4.5-3.9-2.8h4.3z" fill="white" opacity="0.15" />
        </svg>
      );

    case 'fire':
      return (
        <svg style={style} viewBox="0 0 24 24" fill="currentColor">
          {/* Main outer flame */}
          <path d="M12 2C11.2 5.5 8 7 8 11c0 2.8 1.5 4.8 3 5.8-.3-1.5.2-3.2.8-4.2C12 15.5 12.5 17.5 14.5 19c.4-1.8.1-3.5-.3-4.8 1.7 1.7 2.3 3.5 2.3 5.8 1.8-1.8 2.5-4.5 2.5-7 0-4.5-4-7.5-4-10 0 2.5-1.2 4.2-3 4C13 5.5 13 3.5 12 2z" />
          {/* Inner bright core */}
          <path d="M12 9.5c-.6 2-.5 3.8.8 5.5C13.8 13.2 13.7 11.3 14.2 10c.2 2-.3 4-1 5.5 1.3-.8 2-2.5 2-4.5C15.2 8.8 13.2 7.5 12 9.5z" fill="white" opacity="0.28" />
        </svg>
      );

    // ── Tier 2 ──────────────────────────────────────────────────────────────

    case 'crown':
      return (
        <svg style={style} viewBox="0 0 24 24" fill="currentColor">
          {/* Base band */}
          <rect x="3" y="17.5" width="18" height="2.5" rx="1" />
          {/* Crown body — 3 peaks */}
          <path d="M3 17.5 L3 9 L7.5 14.5 L12 5 L16.5 14.5 L21 9 L21 17.5 Z" />
          {/* Centre jewel */}
          <circle cx="12" cy="8.5" r="1.5" fill="white" opacity="0.55" />
          {/* Side jewels */}
          <circle cx="5.5" cy="15" r="1.1" fill="white" opacity="0.42" />
          <circle cx="18.5" cy="15" r="1.1" fill="white" opacity="0.42" />
          {/* Band gems */}
          <rect x="10.5" y="18" width="3" height="1.2" rx="0.6" fill="white" opacity="0.3" />
        </svg>
      );

    case 'trophy':
      return (
        <svg style={style} viewBox="0 0 24 24" fill="currentColor">
          {/* Bowl */}
          <path d="M7 3h10v7.5a5 5 0 01-10 0V3z" />
          {/* Left handle */}
          <path d="M7 5.5H4.5a2.5 2.5 0 002.5 2.8V5.5z" />
          {/* Right handle */}
          <path d="M17 5.5h2.5a2.5 2.5 0 01-2.5 2.8V5.5z" />
          {/* Stem */}
          <rect x="10.5" y="13" width="3" height="4" rx="0.5" />
          {/* Base */}
          <rect x="7" y="17" width="10" height="2.5" rx="1.2" />
          {/* Star on bowl */}
          <path d="M12 5.5l.8 2.4h2.5l-2 1.5.8 2.4-2.1-1.5-2.1 1.5.8-2.4-2-1.5h2.5z" fill="white" opacity="0.32" />
        </svg>
      );

    case 'rocket':
      return (
        <svg style={style} viewBox="0 0 24 24" fill="currentColor">
          {/* Body */}
          <path d="M12 2C9.5 5.5 8.5 9.5 8.5 13.5h7C15.5 9.5 14.5 5.5 12 2z" />
          {/* Nose cap */}
          <path d="M10 5.5 Q12 2 14 5.5" fill="white" opacity="0.2" />
          {/* Left fin */}
          <path d="M8.5 13.5 L5.5 17.5 L8.5 16.5 Z" />
          {/* Right fin */}
          <path d="M15.5 13.5 L18.5 17.5 L15.5 16.5 Z" />
          {/* Nozzle */}
          <rect x="10" y="13.5" width="4" height="2" rx="0.6" opacity="0.75" />
          {/* Exhaust flame */}
          <path d="M10.5 15.5 Q12 20 13.5 15.5" fill="none" stroke="white" strokeWidth="1.2" opacity="0.5" strokeLinecap="round" />
          {/* Porthole window */}
          <circle cx="12" cy="9.5" r="1.8" fill="white" opacity="0.35" />
          <circle cx="12" cy="9.5" r="1" fill="white" opacity="0.2" />
        </svg>
      );

    // ── Tier 3 ──────────────────────────────────────────────────────────────

    case 'diamond':
      return (
        <svg style={style} viewBox="0 0 24 24" fill="currentColor">
          {/* Top girdle */}
          <path d="M7.5 3.5h9l3.5 5.5H4z" opacity="0.82" />
          {/* Pavilion (bottom) */}
          <path d="M4 9l8 12 8-12z" />
          {/* Table facet highlight */}
          <path d="M9.5 3.5l2.5 3.8 2.5-3.8z" fill="white" opacity="0.22" />
          {/* Star facets */}
          <path d="M4 9h5.5L7 5.5z" fill="white" opacity="0.1" />
          <path d="M20 9h-5.5L17 5.5z" fill="white" opacity="0.1" />
          <path d="M12 21l4-12H8z" fill="white" opacity="0.08" />
        </svg>
      );

    case 'golden_boot':
      return (
        <svg style={style} viewBox="0 0 24 24" fill="currentColor">
          {/* Boot upper / shaft */}
          <path d="M6 19 C6 19 6 11 8 9 C10 7 12 7.5 13 9 L18 9 C20 9 21 10 21 12 C21 14 19 15 17 15 L13 15 L13 19 Z" />
          {/* Sole */}
          <rect x="5" y="19" width="9" height="2" rx="1" />
          {/* Heel block */}
          <rect x="5" y="17" width="3.5" height="4" rx="0.8" />
          {/* Studs */}
          <circle cx="7" cy="21.2" r="0.8" fill="white" opacity="0.55" />
          <circle cx="10" cy="21.2" r="0.8" fill="white" opacity="0.55" />
          <circle cx="13" cy="21.2" r="0.8" fill="white" opacity="0.55" />
          {/* Laces */}
          <line x1="11" y1="9.8" x2="17.5" y2="9.8" stroke="white" strokeWidth="0.9" opacity="0.45" fill="none" />
          <line x1="11" y1="11.2" x2="17.5" y2="11.2" stroke="white" strokeWidth="0.9" opacity="0.45" fill="none" />
          <line x1="11" y1="12.6" x2="16.5" y2="12.6" stroke="white" strokeWidth="0.9" opacity="0.45" fill="none" />
          {/* Ankle padding */}
          <path d="M6 13 Q6 9 8 9" fill="none" stroke="white" strokeWidth="1" opacity="0.2" strokeLinecap="round" />
        </svg>
      );

    case 'shark':
      return (
        <svg style={style} viewBox="0 0 24 24" fill="currentColor">
          {/* Body ellipse */}
          <ellipse cx="10.5" cy="13" rx="8.5" ry="4" />
          {/* Pointed snout */}
          <path d="M19 11.5 L23 12.8 L19 14.5 Z" />
          {/* Dorsal fin */}
          <path d="M9.5 9 L12.5 3.5 L15.5 9 Z" />
          {/* Tail fin */}
          <path d="M2 13 L0.5 8.5 L0.5 17.5 Z" />
          {/* Pectoral fin */}
          <path d="M13 15 L16.5 19 L10.5 16 Z" opacity="0.65" />
          {/* White belly */}
          <ellipse cx="11" cy="14" rx="6.5" ry="2" fill="white" opacity="0.22" />
          {/* Eye */}
          <circle cx="18.5" cy="12.5" r="0.9" fill="white" />
          <circle cx="18.6" cy="12.4" r="0.45" fill="#0a0a0a" opacity="0.8" />
          {/* Gill lines */}
          <path d="M16 11 Q16.5 13 16 15" fill="none" stroke="white" strokeWidth="0.8" opacity="0.35" strokeLinecap="round" />
          <path d="M14.5 10.5 Q15 13 14.5 15.5" fill="none" stroke="white" strokeWidth="0.8" opacity="0.25" strokeLinecap="round" />
          {/* Teeth */}
          <path d="M21 12.2 L21.8 11.8 M21.2 13.2 L22 13.6" stroke="white" strokeWidth="0.9" strokeLinecap="round" opacity="0.7" fill="none" />
        </svg>
      );

    // ── Tier 4 ──────────────────────────────────────────────────────────────

    case 'lion':
      return (
        <svg style={style} viewBox="0 0 24 24" fill="currentColor">
          {/* Mane (outer large circle) */}
          <circle cx="12" cy="13" r="9.5" opacity="0.55" />
          {/* Mane texture spikes */}
          <circle cx="12" cy="13" r="7.5" opacity="0.35" />
          {/* Face */}
          <circle cx="12" cy="13" r="6" opacity="0.92" />
          {/* Ears */}
          <path d="M7.5 8.5 L5.5 5 L9.5 7.5 Z" />
          <path d="M16.5 8.5 L18.5 5 L14.5 7.5 Z" />
          {/* Inner ear */}
          <path d="M7.5 8 L6.5 6 L9 7.5 Z" fill="white" opacity="0.2" />
          <path d="M16.5 8 L17.5 6 L15 7.5 Z" fill="white" opacity="0.2" />
          {/* Eyes */}
          <ellipse cx="9.8" cy="12" rx="1.3" ry="1.1" fill="white" />
          <ellipse cx="14.2" cy="12" rx="1.3" ry="1.1" fill="white" />
          <ellipse cx="9.9" cy="12" rx="0.7" ry="1" fill="#1a0a00" opacity="0.85" />
          <ellipse cx="14.3" cy="12" rx="0.7" ry="1" fill="#1a0a00" opacity="0.85" />
          <circle cx="9.6" cy="11.6" r="0.28" fill="white" opacity="0.9" />
          <circle cx="14" cy="11.6" r="0.28" fill="white" opacity="0.9" />
          {/* Nose */}
          <path d="M10.8 14.8 L12 14 L13.2 14.8 L12 15.6 Z" fill="white" opacity="0.55" />
          {/* Muzzle pads */}
          <ellipse cx="9.8" cy="16" rx="1.8" ry="1.1" fill="white" opacity="0.18" />
          <ellipse cx="14.2" cy="16" rx="1.8" ry="1.1" fill="white" opacity="0.18" />
          {/* Mouth lines */}
          <path d="M12 15.6 Q10.5 17 9.5 16.5" fill="none" stroke="white" strokeWidth="0.7" opacity="0.4" strokeLinecap="round" />
          <path d="M12 15.6 Q13.5 17 14.5 16.5" fill="none" stroke="white" strokeWidth="0.7" opacity="0.4" strokeLinecap="round" />
          {/* Whiskers */}
          <line x1="5" y1="15.5" x2="9" y2="15.8" stroke="white" strokeWidth="0.65" opacity="0.45" fill="none" />
          <line x1="5" y1="17" x2="9" y2="16.5" stroke="white" strokeWidth="0.65" opacity="0.45" fill="none" />
          <line x1="19" y1="15.5" x2="15" y2="15.8" stroke="white" strokeWidth="0.65" opacity="0.45" fill="none" />
          <line x1="19" y1="17" x2="15" y2="16.5" stroke="white" strokeWidth="0.65" opacity="0.45" fill="none" />
        </svg>
      );

    case 'unicorn':
      return (
        <svg style={style} viewBox="0 0 24 24" fill="currentColor">
          {/* Neck / head */}
          <ellipse cx="12.5" cy="14.5" rx="5.5" ry="5.5" />
          {/* Snout */}
          <ellipse cx="15.5" cy="17.5" rx="3" ry="2.2" opacity="0.88" />
          {/* Horn */}
          <path d="M9.5 9.5 L11.5 2.5 L13.5 9.5 Z" />
          {/* Horn spiral */}
          <line x1="10.5" y1="8.5" x2="12" y2="3.5" stroke="white" strokeWidth="0.75" opacity="0.45" fill="none" />
          <line x1="11.5" y1="9" x2="13" y2="5" stroke="white" strokeWidth="0.75" opacity="0.3" fill="none" />
          {/* Ear */}
          <path d="M8 10.5 L6.5 7 L10 9.5 Z" />
          {/* Flowing mane strands */}
          <path d="M7.5 11 Q4.5 12.5 5 17.5 Q6.5 13.5 9 12.5" fill="none" stroke="white" strokeWidth="1.8" opacity="0.38" strokeLinecap="round" />
          <path d="M7 12.5 Q4 14.5 4.5 18.5 Q6 15 8.5 14" fill="none" stroke="white" strokeWidth="1.2" opacity="0.25" strokeLinecap="round" />
          {/* Eye */}
          <ellipse cx="13.5" cy="13.8" rx="1.4" ry="1.3" fill="white" />
          <circle cx="13.6" cy="13.8" r="0.72" fill="#3b0764" />
          <circle cx="13.9" cy="13.4" r="0.28" fill="white" opacity="0.9" />
          {/* Nostril */}
          <ellipse cx="16.2" cy="18.2" rx="0.65" ry="0.45" fill="white" opacity="0.32" />
        </svg>
      );

    case 'dragon':
      return (
        <svg style={style} viewBox="0 0 24 24" fill="currentColor">
          {/* Main body/neck */}
          <path d="M7.5 19.5 Q6 15 7.5 10.5 Q9.5 6 13.5 7 Q17 8 17 12.5 Q17 17 13.5 19.5 Z" />
          {/* Snout extension */}
          <path d="M17 12 L21.5 11 L21.5 13.5 L17 13.5 Z" />
          {/* Top horns */}
          <path d="M10.5 7.5 L9.5 3 L13 7 Z" />
          <path d="M14 6.5 L15 2.5 L17 6.5 Z" />
          {/* Wing */}
          <path d="M8 12 Q3.5 8 2.5 5 Q4.5 7.5 6 9.5 Q7 7 5 4.5 Q8.5 7 9.5 11 Z" opacity="0.72" />
          {/* Wing membrane detail */}
          <path d="M8 12 L6 9.5 M8 12 L5 6.5" fill="none" stroke="white" strokeWidth="0.6" opacity="0.2" />
          {/* Eye */}
          <circle cx="18.5" cy="11.5" r="1.1" fill="white" />
          <circle cx="18.6" cy="11.5" r="0.6" fill="#7f1d1d" />
          <circle cx="18.8" cy="11.2" r="0.2" fill="white" opacity="0.9" />
          {/* Nostril */}
          <circle cx="21" cy="12.5" r="0.55" fill="white" opacity="0.32" />
          {/* Fire breath */}
          <path d="M21.5 11.2 Q23.5 9.5 24 8.5 Q23 10.5 24 12 Q23 12.5 21.5 12 Q23.5 13.2 23.5 14.5 Q22.5 13 21.5 12.5" fill="white" opacity="0.42" />
          {/* Scale details */}
          <path d="M10.5 14.5 Q11.5 13.5 12.5 14.5 Q11.5 15.5 10.5 14.5z" fill="white" opacity="0.14" />
          <path d="M11 11.5 Q12 10.5 13 11.5 Q12 12.5 11 11.5z" fill="white" opacity="0.14" />
          <path d="M10 17.5 Q11 16.5 12 17.5 Q11 18.5 10 17.5z" fill="white" opacity="0.1" />
        </svg>
      );

    // ── Tier 5 ──────────────────────────────────────────────────────────────

    case 'jet':
      return (
        <svg style={style} viewBox="0 0 24 24" fill="currentColor">
          {/* Fuselage */}
          <path d="M2 12.2 Q7 10.8 20.5 11.2 L23 12.2 L20.5 13.2 Q7 13.6 2 12.2 Z" />
          {/* Nose */}
          <path d="M20.5 11.2 L24 12.2 L20.5 13.2 Z" />
          {/* Main delta wing top */}
          <path d="M9.5 12 L7 4.5 L14 11.5 Z" />
          {/* Main delta wing bottom */}
          <path d="M9.5 12.4 L7 19.5 L14 12.9 Z" />
          {/* Stabiliser top */}
          <path d="M4.5 11.8 L3.5 8.5 L7 11.3 Z" />
          {/* Stabiliser bottom */}
          <path d="M4.5 12.6 L3.5 15.5 L7 12.9 Z" />
          {/* Vertical stabiliser */}
          <path d="M4.5 11.8 L5.5 8 L7.5 11.5 Z" />
          {/* Engine nacelle under wing */}
          <rect x="8" y="14.5" width="4.5" height="1.8" rx="0.9" opacity="0.72" />
          {/* Cockpit windows */}
          <ellipse cx="14.5" cy="11.8" rx="0.75" ry="0.55" fill="white" opacity="0.5" />
          <ellipse cx="17" cy="11.9" rx="0.75" ry="0.55" fill="white" opacity="0.5" />
          <ellipse cx="19" cy="12" rx="0.75" ry="0.55" fill="white" opacity="0.5" />
        </svg>
      );

    case 'yacht':
      return (
        <svg style={style} viewBox="0 0 24 24" fill="currentColor">
          {/* Hull */}
          <path d="M1.5 16.5 Q12 20.5 22.5 16.5 L21.5 19 Q12 23 2.5 19 Z" />
          {/* Deck house */}
          <rect x="8.5" y="13" width="10" height="3.5" rx="1.2" opacity="0.85" />
          {/* Porthole windows */}
          <circle cx="10.5" cy="14.8" r="1" fill="white" opacity="0.4" />
          <circle cx="13.5" cy="14.8" r="1" fill="white" opacity="0.4" />
          <circle cx="16.5" cy="14.8" r="1" fill="white" opacity="0.4" />
          {/* Mast */}
          <line x1="13" y1="3" x2="13" y2="13" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" fill="none" />
          {/* Main sail */}
          <path d="M13 4.5 L21.5 12.5 L13 12.5 Z" opacity="0.9" />
          {/* Jib / foresail */}
          <path d="M13 7 L6.5 13 L13 13 Z" opacity="0.62" />
          {/* Boom */}
          <line x1="13" y1="12.5" x2="21.5" y2="13.5" stroke="currentColor" strokeWidth="1" opacity="0.5" fill="none" />
          {/* Waterline waves */}
          <path d="M0.5 20 Q4 18.8 8 20 Q12 21.2 16 20 Q20 18.8 23.5 20" fill="none" stroke="white" strokeWidth="0.9" opacity="0.28" strokeLinecap="round" />
          <path d="M1 21.5 Q5 20.5 9 21.5 Q13 22.5 17 21.5 Q20 20.5 23 21.5" fill="none" stroke="white" strokeWidth="0.7" opacity="0.18" strokeLinecap="round" />
        </svg>
      );

    case 'galaxy':
      return (
        <svg style={style} viewBox="0 0 24 24" fill="currentColor">
          {/* Outer diffuse glow disc */}
          <ellipse cx="12" cy="12" rx="10.5" ry="4.5" opacity="0.2" transform="rotate(-35 12 12)" />
          {/* Spiral arm A */}
          <path d="M12 12 Q17 7.5 21 5.5 Q19 9.5 15 12 Q19.5 13.5 21 18 Q17 15 12 12" opacity="0.75" />
          {/* Spiral arm B */}
          <path d="M12 12 Q7 16.5 3 18.5 Q5 14.5 9 12 Q4.5 10.5 3 6 Q7 9 12 12" opacity="0.75" />
          {/* Bar / core elongation */}
          <ellipse cx="12" cy="12" rx="4" ry="1.8" opacity="0.65" transform="rotate(-35 12 12)" />
          {/* Bright nucleus */}
          <circle cx="12" cy="12" r="2.8" opacity="0.95" />
          <circle cx="12" cy="12" r="1.4" fill="white" opacity="0.6" />
          <circle cx="12" cy="12" r="0.6" fill="white" opacity="0.9" />
          {/* Foreground stars */}
          <circle cx="20" cy="5.5" r="0.8" />
          <circle cx="4" cy="18.5" r="0.8" />
          <circle cx="21" cy="18" r="0.6" opacity="0.65" />
          <circle cx="3.5" cy="6" r="0.6" opacity="0.65" />
          <circle cx="16" cy="3.5" r="0.5" opacity="0.75" />
          <circle cx="8" cy="20.5" r="0.5" opacity="0.75" />
          <circle cx="22" cy="11" r="0.45" opacity="0.55" />
          <circle cx="2.5" cy="13" r="0.45" opacity="0.55" />
          <circle cx="19" cy="3" r="0.35" opacity="0.5" />
          <circle cx="5" cy="21" r="0.35" opacity="0.5" />
        </svg>
      );

    // ── Default: gift box with ribbon (used as the send-gift button icon) ──
    default:
      return (
        <svg style={style} viewBox="0 0 24 24" fill="currentColor">
          {/* Box body */}
          <rect x="3" y="10" width="18" height="11" rx="1.5" opacity="0.78" />
          {/* Lid */}
          <rect x="2" y="7.5" width="20" height="3" rx="1.2" />
          {/* Vertical ribbon on body */}
          <rect x="11" y="10" width="2" height="11" />
          {/* Horizontal ribbon on lid */}
          <rect x="2" y="8.8" width="20" height="1.4" />
          {/* Left bow loop */}
          <path d="M11 8 Q7.5 4.5 8.5 2.5 Q10.2 3.5 11 8" opacity="0.92" />
          {/* Right bow loop */}
          <path d="M13 8 Q16.5 4.5 15.5 2.5 Q13.8 3.5 13 8" opacity="0.92" />
          {/* Bow knot centre */}
          <circle cx="12" cy="8" r="1.1" />
          {/* Gloss on box */}
          <rect x="4" y="11" width="5" height="2" rx="0.6" fill="white" opacity="0.1" />
        </svg>
      );
  }
}