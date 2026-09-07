let audioCtx = null;
let warmed = false;

function ensureContext() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  } else if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
}

export function warmClickSound() {
  if (warmed) return;
  warmed = true;
  const handler = () => {
    ensureContext();
    document.removeEventListener('pointerdown', handler, true);
  };
  document.addEventListener('pointerdown', handler, true);
}

export default function playMilkyClick() {
  const ctx = ensureContext();
  const now = ctx.currentTime;

  // Samsung-style: very short, high-pitched tick with tiny resonance
  const pitch = 1 + (Math.random() * 0.03 - 0.015);

  // Layer 1: Crisp tick (high frequency, very short)
  const tick = ctx.createOscillator();
  const tickGain = ctx.createGain();
  tick.type = 'sine';
  tick.frequency.setValueAtTime(3200 * pitch, now);
  tick.frequency.exponentialRampToValueAtTime(1800 * pitch, now + 0.01);
  tickGain.gain.setValueAtTime(0.18, now);
  tickGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.012);
  tick.connect(tickGain);
  tickGain.connect(ctx.destination);

  // Layer 2: Soft tap body (mid frequency, even shorter)
  const tap = ctx.createOscillator();
  const tapGain = ctx.createGain();
  tap.type = 'sine';
  tap.frequency.setValueAtTime(1100 * pitch, now);
  tap.frequency.exponentialRampToValueAtTime(600 * pitch, now + 0.008);
  tapGain.gain.setValueAtTime(0.08, now);
  tapGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.01);
  tap.connect(tapGain);
  tapGain.connect(ctx.destination);

  tick.start(now);
  tap.start(now);
  tick.stop(now + 0.015);
  tap.stop(now + 0.012);
}

let clickListenerAttached = false;
export function initGlobalClickListener() {
  if (clickListenerAttached) return;
  clickListenerAttached = true;

  document.addEventListener('click', (e) => {
    const el = e.target.closest('button, a, [role="button"], input[type="submit"], input[type="button"], [data-click-sound]');
    if (!el) return;
    if (el.hasAttribute('data-no-sound')) return;
    playMilkyClick();
  }, true);
}
