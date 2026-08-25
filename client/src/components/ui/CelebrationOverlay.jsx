/**
 * CelebrationOverlay — 300 Users Milestone
 * Renders a full-screen confetti/balloon celebration before the app loads.
 * Active between 25 Aug 2026 and 10 Sep 2026.
 * Self-destructs from memory once the animation finishes.
 */

const START_DATE = new Date('2026-08-25T00:00:00');
const END_DATE = new Date('2026-09-10T23:59:59');
const STORAGE_KEY = 'textmob_300_celebration_seen';
const ANIMATION_DURATION = 20000; // ms before overlay fades out

function isWithinDateRange() {
  const now = new Date();
  return now >= START_DATE && now <= END_DATE;
}

function hasAlreadySeen() {
  try {
    return localStorage.getItem(STORAGE_KEY) === '1';
  } catch {
    return false;
  }
}

function markSeen() {
  try {
    localStorage.setItem(STORAGE_KEY, '1');
  } catch {}
}

function injectStyles() {
  if (document.getElementById('tm-celebration-styles')) return;
  const style = document.createElement('style');
  style.id = 'tm-celebration-styles';
  style.textContent = `
    @keyframes confettiFall {
      0% { transform: translateY(-10vh) rotate(0deg); opacity: 1; }
      100% { transform: translateY(110vh) rotate(720deg); opacity: 0; }
    }
    @keyframes balloonFloat {
      0% { transform: translateY(100vh) scale(0.3); opacity: 0; }
      10% { opacity: 1; }
      50% { transform: translateY(30vh) scale(1); opacity: 1; }
      80% { opacity: 0.8; }
      100% { transform: translateY(-20vh) scale(1.1); opacity: 0; }
    }
    @keyframes shimmer {
      0% { background-position: -200% center; }
      100% { background-position: 200% center; }
    }
    @keyframes pulseGlow {
      0%, 100% { text-shadow: 0 0 20px rgba(59,130,246,0.5), 0 0 40px rgba(59,130,246,0.3); }
      50% { text-shadow: 0 0 40px rgba(59,130,246,0.8), 0 0 80px rgba(59,130,246,0.5), 0 0 120px rgba(59,130,246,0.3); }
    }
    @keyframes slideUp {
      0% { transform: translateY(40px); opacity: 0; }
      100% { transform: translateY(0); opacity: 1; }
    }
    @keyframes scaleIn {
      0% { transform: scale(0); opacity: 0; }
      70% { transform: scale(1.1); }
      100% { transform: scale(1); opacity: 1; }
    }
    @keyframes countPulse {
      0% { transform: scale(1); }
      50% { transform: scale(1.05); }
      100% { transform: scale(1); }
    }
    @keyframes sparkle {
      0%, 100% { opacity: 0; transform: scale(0) rotate(0deg); }
      50% { opacity: 1; transform: scale(1) rotate(180deg); }
    }
    @keyframes wave {
      0%, 100% { transform: rotate(0deg); }
      25% { transform: rotate(20deg); }
      75% { transform: rotate(-15deg); }
    }
    @keyframes overlayFadeIn {
      0% { opacity: 0; }
      100% { opacity: 1; }
    }
    @keyframes overlayFadeOut {
      0% { opacity: 1; }
      100% { opacity: 0; pointer-events: none; }
    }
    @keyframes starBurst {
      0% { transform: scale(0) rotate(0deg); opacity: 1; }
      50% { transform: scale(1.5) rotate(180deg); opacity: 0.8; }
      100% { transform: scale(0) rotate(360deg); opacity: 0; }
    }
    @keyframes drift {
      0% { transform: translateX(0) translateY(0); }
      25% { transform: translateX(15px) translateY(-10px); }
      50% { transform: translateX(-10px) translateY(-20px); }
      75% { transform: translateX(20px) translateY(-5px); }
      100% { transform: translateX(0) translateY(0); }
    }
  `;
  document.head.appendChild(style);
}

function createParticle(container, type) {
  const el = document.createElement('div');
  const colors = ['#3b82f6', '#60a5fa', '#93c5fd', '#ffffff', '#fbbf24', '#f472b6', '#a78bfa', '#34d399'];
  const color = colors[Math.floor(Math.random() * colors.length)];

  if (type === 'confetti') {
    const shapes = ['square', 'circle', 'strip'];
    const shape = shapes[Math.floor(Math.random() * shapes.length)];
    const size = shape === 'strip' ? `${Math.random() * 4 + 3}px ${Math.random() * 12 + 8}px` : `${Math.random() * 8 + 5}px`;
    Object.assign(el.style, {
      position: 'absolute',
      width: size.split(' ')[0],
      height: size.split(' ')[1] || size.split(' ')[0],
      background: color,
      borderRadius: shape === 'circle' ? '50%' : shape === 'strip' ? '2px' : '1px',
      left: `${Math.random() * 100}%`,
      top: '-20px',
      animation: `confettiFall ${Math.random() * 3 + 4}s linear ${Math.random() * 3}s forwards`,
      opacity: '0',
      zIndex: '10001',
      pointerEvents: 'none',
    });
  } else if (type === 'balloon') {
    const balloonColors = ['#3b82f6', '#60a5fa', '#2563eb', '#ffffff', '#93c5fd', '#1d4ed8'];
    const bColor = balloonColors[Math.floor(Math.random() * balloonColors.length)];
    el.innerHTML = `<svg viewBox="0 0 40 60" width="40" height="60"><ellipse cx="20" cy="22" rx="16" ry="20" fill="${bColor}" opacity="0.9"/><path d="M20 42 L18 58 L22 58 Z" fill="${bColor}" opacity="0.7"/><line x1="20" y1="42" x2="20" y2="58" stroke="${bColor}" stroke-width="0.5" opacity="0.5"/></svg>`;
    Object.assign(el.style, {
      position: 'absolute',
      left: `${Math.random() * 90 + 5}%`,
      bottom: '-80px',
      animation: `balloonFloat ${Math.random() * 4 + 5}s ease-in ${Math.random() * 4}s forwards`,
      opacity: '0',
      zIndex: '10000',
      pointerEvents: 'none',
      filter: `blur(${Math.random() > 0.7 ? 1 : 0}px)`,
    });
  } else if (type === 'sparkle') {
    Object.assign(el.style, {
      position: 'absolute',
      width: '6px',
      height: '6px',
      background: `radial-gradient(circle, ${color}, transparent)`,
      borderRadius: '50%',
      left: `${Math.random() * 100}%`,
      top: `${Math.random() * 100}%`,
      animation: `sparkle ${Math.random() * 2 + 1.5}s ease-in-out ${Math.random() * 3}s infinite`,
      zIndex: '10001',
      pointerEvents: 'none',
    });
  }

  container.appendChild(el);
  return el;
}

export function showCelebration() {
  if (!isWithinDateRange() || hasAlreadySeen()) return false;

  markSeen();
  injectStyles();

  // Lock scroll
  document.body.style.overflow = 'hidden';

  // Create overlay
  const overlay = document.createElement('div');
  overlay.id = 'tm-celebration-overlay';
  overlay.style.cssText = `
    position: fixed; inset: 0; z-index: 999999;
    background: linear-gradient(135deg, #0f172a 0%, #1e3a5f 30%, #0c1929 60%, #162447 100%);
    display: flex; align-items: center; justify-content: center; flex-direction: column;
    font-family: 'Outfit', 'Inter', system-ui, sans-serif;
    animation: overlayFadeIn 0.5s ease forwards;
    overflow: hidden;
  `;

  // Particle layer
  const particleLayer = document.createElement('div');
  particleLayer.style.cssText = 'position:absolute;inset:0;pointer-events:none;overflow:hidden;';
  overlay.appendChild(particleLayer);

  // Spawn particles
  const particles = [];
  for (let i = 0; i < 80; i++) particles.push(createParticle(particleLayer, 'confetti'));
  for (let i = 0; i < 25; i++) particles.push(createParticle(particleLayer, 'balloon'));
  for (let i = 0; i < 40; i++) particles.push(createParticle(particleLayer, 'sparkle'));

  // Staggered particle waves
  const waveInterval = setInterval(() => {
    for (let i = 0; i < 15; i++) createParticle(particleLayer, 'confetti');
    for (let i = 0; i < 4; i++) createParticle(particleLayer, 'balloon');
  }, 1500);

  // Content container
  const content = document.createElement('div');
  content.style.cssText = `
    position: relative; z-index: 10002; text-align: center; padding: 24px;
    display: flex; flex-direction: column; align-items: center; justify-content: center;
  `;

  // Header text
  const header = document.createElement('div');
  header.textContent = "WE'VE HIT";
  header.style.cssText = `
    color: #93c5fd; font-size: clamp(16px, 4vw, 24px); font-weight: 600;
    letter-spacing: 6px; text-transform: uppercase; margin-bottom: 8px;
    animation: slideUp 0.8s cubic-bezier(0.34,1.56,0.64,1) 0.3s both;
  `;
  content.appendChild(header);

  // Big number
  const number = document.createElement('div');
  number.textContent = '300';
  number.style.cssText = `
    font-size: clamp(80px, 20vw, 160px); font-weight: 900; line-height: 1;
    background: linear-gradient(135deg, #ffffff 0%, #93c5fd 40%, #60a5fa 70%, #3b82f6 100%);
    background-size: 200% auto;
    -webkit-background-clip: text; -webkit-text-fill-color: transparent;
    background-clip: text;
    animation: scaleIn 0.7s cubic-bezier(0.34,1.56,0.64,1) 0.6s both, shimmer 3s linear 1.5s infinite, pulseGlow 2s ease-in-out 2s infinite;
    filter: drop-shadow(0 0 30px rgba(59,130,246,0.4));
    margin-bottom: 4px;
  `;
  content.appendChild(number);

  // USERS badge
  const badge = document.createElement('div');
  badge.style.cssText = `
    display: inline-flex; align-items: center; gap: 10px;
    background: linear-gradient(135deg, #2563eb, #3b82f6);
    padding: 10px 32px; border-radius: 50px; margin-bottom: 24px;
    animation: slideUp 0.8s cubic-bezier(0.34,1.56,0.64,1) 1s both;
    box-shadow: 0 8px 32px rgba(37,99,235,0.4), 0 0 0 1px rgba(255,255,255,0.1) inset;
  `;
  const badgeText = document.createElement('span');
  badgeText.textContent = 'USERS!';
  badgeText.style.cssText = `
    color: #fff; font-size: clamp(22px, 5vw, 36px); font-weight: 800; letter-spacing: 3px;
  `;
  badge.appendChild(badgeText);
  const wave = document.createElement('span');
  wave.textContent = '\uD83D\uDC4F';
  wave.style.cssText = `font-size: 24px; animation: wave 1s ease-in-out 0.5s 3;`;
  badge.appendChild(wave);
  content.appendChild(badge);

  // Subtitle
  const sub = document.createElement('div');
  sub.innerHTML = 'Thank you to every amazing<br>person who\'s part of the <span style="color:#60a5fa;font-weight:700">Textmob</span> family.';
  sub.style.cssText = `
    color: rgba(255,255,255,0.85); font-size: clamp(13px, 3.5vw, 17px); line-height: 1.7;
    margin-bottom: 28px; max-width: 360px;
    animation: slideUp 0.8s cubic-bezier(0.34,1.56,0.64,1) 1.3s both;
  `;
  content.appendChild(sub);

  // Stats row
  const stats = document.createElement('div');
  stats.style.cssText = `
    display: flex; gap: 24px; margin-bottom: 28px; flex-wrap: wrap; justify-content: center;
    animation: slideUp 0.8s cubic-bezier(0.34,1.56,0.64,1) 1.6s both;
  `;
  const statData = [
    { icon: '\uD83D\uDC65', num: '300+', label: 'Real People' },
    { icon: '\uD83D\uDCAC', num: 'Countless', label: 'Connections' },
    { icon: '\u2764\uFE0F', num: 'One', label: 'Community' },
  ];
  statData.forEach((s, i) => {
    const stat = document.createElement('div');
    stat.style.cssText = 'text-align:center;min-width:90px;';
    stat.innerHTML = `
      <div style="font-size:22px;margin-bottom:4px;">${s.icon}</div>
      <div style="color:#fff;font-weight:700;font-size:15px;">${s.num}</div>
      <div style="color:rgba(255,255,255,0.6);font-size:12px;">${s.label}</div>
    `;
    stat.style.animationDelay = `${1.8 + i * 0.15}s`;
    stats.appendChild(stat);
  });
  content.appendChild(stats);

  // CTA box
  const cta = document.createElement('div');
  cta.innerHTML = "We're just getting started.<br>Here's to more connections, more moments,<br>and more milestones together! \uD83D\uDC99";
  cta.style.cssText = `
    color: rgba(255,255,255,0.9); font-size: clamp(12px, 3vw, 14px); line-height: 1.8;
    border: 1px solid rgba(59,130,246,0.3); border-radius: 14px;
    padding: 16px 24px; max-width: 380px; margin-bottom: 20px;
    background: rgba(30,58,95,0.4); backdrop-filter: blur(8px);
    animation: slideUp 0.8s cubic-bezier(0.34,1.56,0.64,1) 2s both;
  `;
  content.appendChild(cta);

  // Footer
  const footer = document.createElement('div');
  footer.textContent = 'Built for Africa. Built for Us.';
  footer.style.cssText = `
    color: #3b82f6; font-size: 13px; font-weight: 600; letter-spacing: 1px;
    animation: slideUp 0.8s cubic-bezier(0.34,1.56,0.64,1) 2.2s both;
  `;
  content.appendChild(footer);

  overlay.appendChild(content);

  // Decorative corner balloons
  const cornerSVGs = [
    { pos: 'top:20px;left:20px;', rot: '-15deg', delay: '0.5s' },
    { pos: 'top:40px;right:30px;', rot: '10deg', delay: '0.8s' },
    { pos: 'bottom:60px;left:30px;', rot: '-8deg', delay: '1.1s' },
    { pos: 'bottom:30px;right:20px;', rot: '12deg', delay: '1.4s' },
  ];
  cornerSVGs.forEach(c => {
    const deco = document.createElement('div');
    deco.innerHTML = `<svg viewBox="0 0 40 60" width="32" height="48"><ellipse cx="20" cy="22" rx="16" ry="20" fill="#3b82f6" opacity="0.7"/><path d="M20 42 L18 58 L22 58 Z" fill="#3b82f6" opacity="0.5"/><line x1="20" y1="42" x2="20" y2="58" stroke="#3b82f6" stroke-width="0.5" opacity="0.4"/></svg>`;
    deco.style.cssText = `position:absolute;${c.pos}transform:rotate(${c.rot});animation:drift 4s ease-in-out ${c.delay} infinite;opacity:0.6;z-index:10000;pointer-events:none;`;
    overlay.appendChild(deco);
  });

  // Click to dismiss early
  overlay.addEventListener('click', () => finish(overlay, particleLayer, waveInterval));

  document.body.appendChild(overlay);

  // Auto-dismiss
  function finish() {
    clearInterval(waveInterval);
    overlay.style.animation = 'overlayFadeOut 0.8s ease forwards';
    setTimeout(() => {
      overlay.remove();
      // Clean up particles from memory
      particles.length = 0;
      document.body.style.overflow = '';
      // Remove injected styles
      const s = document.getElementById('tm-celebration-styles');
      if (s) s.remove();
    }, 900);
  }

  setTimeout(finish, ANIMATION_DURATION);
  return true;
}
