import { useEffect, useState, useRef, useCallback } from 'react';
import { API_BASE_URL } from '../config/api';

/* ---------------------------------------------------------
   Textmob — Install onboarding (design-system rebuild)
   Tokens: utilities/design-system/*.json
   Colors #2563eb primary · #f8fafc bg · #ffffff card ·
   Outfit type · 4px spacing scale · 8px button radius.
   Interactive: animated download, live progress rail,
   per-step completion, keyboard nav, prominent guidelines.
--------------------------------------------------------- */

function isAndroid() {
  if (typeof navigator === 'undefined') return false;
  return /android/i.test(navigator.userAgent || '');
}

// ---- Line icon set (design-system neutral strokes) ----
const Icon = {
  download: (p) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <path d="M12 3v12" /><path d="m7 10 5 5 5-5" /><path d="M5 21h14" />
    </svg>
  ),
  shield: (p) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <path d="M12 21c5-2 8-6 8-11V6l-8-3-8 3v4c0 5 3 9 8 11Z" />
    </svg>
  ),
  shieldAlert: (p) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <path d="M12 21c5-2 8-6 8-11V6l-8-3-8 3v4c0 5 3 9 8 11Z" />
      <path d="M12 8v4" /><path d="M12 15.5v.5" />
    </svg>
  ),
  file: (p) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <path d="M7 3h7l5 5v13H7z" /><path d="M14 3v5h5" />
    </svg>
  ),
  spark: (p) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5 18 18M18 6l-2.5 2.5M8.5 15.5 6 18" />
    </svg>
  ),
  check: (p) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <path d="m4 12 5 5L20 6" />
    </svg>
  ),
  checkCircle: (p) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <circle cx="12" cy="12" r="9" /><path d="m8.5 12 2.5 2.5 5-5" />
    </svg>
  ),
  arrowRight: (p) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <path d="M5 12h14" /><path d="m13 6 6 6-6 6" />
    </svg>
  ),
  arrowLeft: (p) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <path d="M19 12H5" /><path d="m11 18-6-6 6-6" />
    </svg>
  ),
  eye: (p) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <path d="M2 12s3.5-6.5 10-6.5S22 12 22 12s-3.5 6.5-10 6.5S2 12 2 12Z" /><circle cx="12" cy="12" r="2.8" />
    </svg>
  ),
  bell: (p) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <path d="M6 8a6 6 0 0 1 12 0c0 5 2 6 2 6H4s2-1 2-6Z" /><path d="M10 21a2 2 0 0 0 4 0" />
    </svg>
  ),
  folder: (p) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <path d="M3 7a1 1 0 0 1 1-1h5l2 2h9a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1Z" />
    </svg>
  ),
  refresh: (p) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <path d="M20 11a8 8 0 1 0-2.34 6" /><path d="M20 5v6h-6" />
    </svg>
  ),
  toggle: (p) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <rect x="2" y="7" width="20" height="10" rx="5" /><circle cx="16" cy="12" r="3" fill="currentColor" stroke="none" />
    </svg>
  ),
};

// ---- Phone-frame mockups, one per step. Drawn, not photographed. ----

function MockDownloadBar() {
  return (
    <div className="mock-screen">
      <div className="mock-statusbar" />
      <div className="mock-notif">
        <div className="mock-notif-icon mock-notif-icon--ok"><Icon.check className="w-4 h-4" /></div>
        <div className="mock-notif-text">
          <div className="mock-notif-title">Download complete</div>
          <div className="mock-notif-sub">41 MB · Ready to install</div>
        </div>
      </div>
      <div className="mock-tray" />
    </div>
  );
}

function MockPermission() {
  return (
    <div className="mock-screen mock-screen--sheet">
      <div className="mock-sheet">
        <div className="mock-sheet-icon mock-sheet-icon--primary"><Icon.shield className="w-5 h-5" /></div>
        <div className="mock-sheet-title">Install unknown apps</div>
        <div className="mock-sheet-body">Allow Chrome to install this app</div>
        <div className="mock-sheet-row">
          <span>Allow from this source</span>
          <span className="mock-toggle mock-toggle--on"><span /></span>
        </div>
      </div>
    </div>
  );
}

function MockInstallConfirm() {
  return (
    <div className="mock-screen mock-screen--sheet">
      <div className="mock-sheet mock-sheet--tight">
        <div className="mock-app-badge">T</div>
        <div className="mock-sheet-title">Textmob</div>
        <div className="mock-sheet-body">Do you want to install this app?</div>
        <div className="mock-btn-row">
          <div className="mock-btn mock-btn--ghost">Cancel</div>
          <div className="mock-btn mock-btn--solid">Install</div>
        </div>
      </div>
    </div>
  );
}

function MockOpenApp() {
  return (
    <div className="mock-screen">
      <div className="mock-statusbar" />
      <div className="mock-open-wrap">
        <div className="mock-check-badge"><Icon.check className="w-7 h-7" /></div>
        <div className="mock-open-title">Textmob installed</div>
        <div className="mock-open-sub">Enjoy the app, it's all yours</div>
        <div className="mock-btn mock-btn--solid mock-btn--wide">Open</div>
      </div>
    </div>
  );
}

const STEPS = [
  {
    key: 'download',
    eyebrow: 'Step 1 of 4',
    title: 'Download the app file',
    lead: "Textmob isn't on the Play Store yet, so you get the app file directly from us — the same file, just skipping the store.",
    notes: [
      {
        kind: 'blue',
        icon: Icon.eye,
        title: 'Watch your notification shade',
        body: 'Tap the button below and the download starts right away. You\u2019ll see "textmob.apk" downloading, then "Download complete" when it\u2019s ready.',
      },
      {
        kind: 'gray',
        icon: Icon.folder,
        title: 'Where the file goes',
        body: 'The file saves to your Downloads folder. If the download is interrupted, just tap the button again — it resumes where it left off.',
      },
    ],
    mock: MockDownloadBar,
    mockCaption: 'Your notification shade',
    icon: Icon.download,
    short: 'Download',
  },
  {
    key: 'permission',
    eyebrow: 'Step 2 of 4',
    title: 'Let your phone know this is okay',
    lead: "Android blocks app files that don't come from the Play Store by default. That's a safety setting — not a problem with Textmob — you just allow it once for your browser.",
    notes: [
      {
        kind: 'blue',
        icon: Icon.eye,
        title: 'What you\u2019ll see',
        body: 'A screen asks to install unknown apps. Tap into the settings it offers, flip the toggle next to your browser\u2019s name, then go back.',
      },
      {
        kind: 'amber',
        icon: Icon.shieldAlert,
        title: 'Play Protect warning? That\u2019s normal',
        body: 'If Google Play Protect shows a warning, tap "Install anyway" or "More details \u2192 Install anyway." Every app outside the Play Store triggers this, it isn\u2019t specific to Textmob.',
      },
    ],
    mock: MockPermission,
    mockCaption: 'The permission screen',
    icon: Icon.shield,
    short: 'Allow install',
  },
  {
    key: 'install',
    eyebrow: 'Step 3 of 4',
    title: 'Open the file and install',
    lead: "Pull down your notification shade and tap the finished download — or open it from your Downloads folder.",
    notes: [
      {
        kind: 'blue',
        icon: Icon.eye,
        title: 'What you\u2019ll see',
        body: 'A small card appears with the Textmob icon, asking "Do you want to install this app?" Tap Install and give it a few seconds.',
      },
      {
        kind: 'green',
        icon: Icon.refresh,
        title: 'Updating an older version?',
        body: 'If you already had Textmob installed, the card says "Update" instead of "Install" — same thing, same tap.',
      },
    ],
    mock: MockInstallConfirm,
    mockCaption: 'The install prompt',
    icon: Icon.file,
    short: 'Install file',
  },
  {
    key: 'open',
    eyebrow: 'Step 4 of 4',
    title: "You're in",
    lead: "That's it — Textmob is on your phone. Tap Open to jump straight in, or find the Textmob icon in your app drawer any time.",
    notes: [
      {
        kind: 'blue',
        icon: Icon.spark,
        title: 'Everything is already there',
        body: 'Your account, posts, snaps, and chats are right there. Nothing to set up again.',
      },
      {
        kind: 'green',
        icon: Icon.bell,
        title: 'Updates handle themselves',
        body: 'When a new version is ready, Textmob tells you inside the app and walks you through it. You never need to come back to this page.',
      },
    ],
    mock: MockOpenApp,
    mockCaption: 'Your home screen',
    icon: Icon.spark,
    short: "You're in",
  },
];

export default function InstallPage() {
  const [info, setInfo] = useState(null);
  const [current, setCurrent] = useState(0);
  const [done, setDone] = useState(() => new Set());
  const cardRef = useRef(null);
  const android = isAndroid();

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/api/app-version`);
        const data = await res.json();
        if (alive && data && data.version) setInfo(data);
      } catch { /* defaults are fine */ }
    })();
    return () => { alive = false; };
  }, []);

  const version = info?.version || null;
  const apkUrl = info?.apk_url || (typeof window !== 'undefined' ? `${window.location.origin}/apk/thetextmobapp.apk` : '#');
  const graceDays = info?.grace_days || 7;

  const goTo = useCallback((i) => {
    setCurrent((prev) => Math.max(0, Math.min(STEPS.length - 1, i)));
  }, []);

  const complete = useCallback((i) => {
    setDone((d) => new Set(d).add(i));
  }, []);

  // Keyboard navigation
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'ArrowRight') goTo((current) => current + 1);
      if (e.key === 'ArrowLeft') goTo((current) => current - 1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [goTo]);

  // On mobile, keep the active card in view
  useEffect(() => {
    if (typeof window !== 'undefined' && window.innerWidth <= 720) {
      cardRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [current]);

  const markDone = (i) => {
    complete(i);
    if (i < STEPS.length - 1) goTo(i + 1);
  };

  const step = STEPS[current];
  const StepMock = step.mock;
  const isFirst = current === 0;
  const isLast = current === STEPS.length - 1;
  const pct = Math.round((done.size / STEPS.length) * 100);

  return (
    <div className="tm-root">
      <Blobs />

      <header className="tm-nav">
        <div className="tm-nav-inner">
          <div className="tm-brand">
            <div className="tm-brand-mark">T</div>
            <span>Textmob</span>
          </div>
          <a href="/" className="tm-nav-back">Back to app</a>
        </div>
      </header>

      <main className="tm-main">
        <section className="tm-hero">
          <span className="tm-eyebrow">Install on Android</span>
          <h1>Get Textmob on your phone</h1>
          <p className="tm-hero-sub">
            Four short steps — about three minutes. We show you exactly what each screen looks like before you reach it.
          </p>
          <div className="tm-pillrow">
            {version && <span className="tm-pill">Version {version}</span>}
            <span className="tm-pill">Android 8.0 and up</span>
            <span className="tm-pill">41 MB</span>
            <span className="tm-pill">Free</span>
          </div>
        </section>

        {/* Progress bar */}
        <div className="tm-progress-wrap" aria-label={`${pct}% complete`}>
          <div className="tm-progress">
            <div className="tm-progress-fill" style={{ width: `${pct}%` }} />
          </div>
          <span className="tm-progress-label">{done.size} of {STEPS.length} steps done</span>
        </div>

        {/* Progress rail — jump to any step */}
        <nav className="tm-rail" aria-label="Install steps">
          {STEPS.map((s, i) => {
            const state = i === current ? 'active' : done.has(i) ? 'done' : 'upcoming';
            return (
              <button
                key={s.key}
                className={`tm-rail-step tm-rail-step--${state}`}
                onClick={() => goTo(i)}
                aria-current={i === current ? 'step' : undefined}
              >
                <span className="tm-rail-dot">
                  {done.has(i) ? <Icon.check className="w-3 h-3" /> : i + 1}
                </span>
                <span className="tm-rail-label">{s.short}</span>
              </button>
            );
          })}
        </nav>

        {done.size === STEPS.length && (
          <div className="tm-banner">
            <Icon.checkCircle className="w-5 h-5" />
            All steps complete — Textmob is ready to use.
          </div>
        )}

        {/* Active step card */}
        <section className="tm-stepcard" ref={cardRef} key={step.key}>
          <div className="tm-stepcard-grid">
            <div className="tm-stepcard-text">
              <span className="tm-eyebrow">{step.eyebrow}</span>
              <h2>{step.title}</h2>
              <p className="tm-lead">{step.lead}</p>

              {/* Prominent guideline callouts */}
              <div className="tm-notes">
                {step.notes.map((n, i) => (
                  <div key={i} className={`tm-note-card tm-note-card--${n.kind}`}>
                    <div className="tm-note-icon"><n.icon className="w-4 h-4" /></div>
                    <div>
                      <div className="tm-note-card-title">{n.title}</div>
                      <p>{n.body}</p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="tm-stepnav">
                {!isFirst && (
                  <button className="tm-btn tm-btn--ghost" onClick={() => goTo(current - 1)}>
                    <Icon.arrowLeft className="w-4 h-4" />
                    Back
                  </button>
                )}

                {isFirst ? (
                  <a
                    href={apkUrl}
                    download
                    className="tm-btn tm-btn--primary tm-btn--pulse"
                    onClick={() => { complete(0); setTimeout(() => goTo(1), 900); }}
                  >
                    <Icon.download className="w-4 h-4" />
                    Download for Android
                  </a>
                ) : isLast ? (
                  <a href="/" className="tm-btn tm-btn--primary">
                    Open Textmob
                    <Icon.arrowRight className="w-4 h-4" />
                  </a>
                ) : (
                  <button className="tm-btn tm-btn--primary" onClick={() => markDone(current)}>
                    Done — next step
                    <Icon.arrowRight className="w-4 h-4" />
                  </button>
                )}
              </div>

              {isLast && (
                <a href={apkUrl} download target="_blank" rel="noopener noreferrer" className="tm-redownload">
                  <Icon.refresh className="w-4 h-4" />
                  Re-download the APK
                </a>
              )}

              {android && isFirst && (
                <p className="tm-hint">You're on Android already, so this works right on this device.</p>
              )}
            </div>

            <div className="tm-stepcard-visual">
              <div className="mock-phone">
                <div className="mock-phone-notch" />
                <StepMock />
              </div>
              <span className="tm-mock-caption">{step.mockCaption}</span>
            </div>
          </div>
        </section>

        {/* Reassurance panel */}
        <section className="tm-note">
          <div className="tm-note-icon"><Icon.bell className="w-4 h-4" /></div>
          <div>
            <div className="tm-note-title">Updates work the same way — automatically</div>
            <p>
              Textmob checks for a new version every time you open it. When one's ready, you get{' '}
              {graceDays} days to update from inside the app — no need to come back here.
              Old install files clear themselves out, so nothing piles up in your storage.
            </p>
          </div>
        </section>

        <footer className="tm-footer">
          Textmob · Africa's microblogging social network · <a href="/">Back to web app</a>
        </footer>
      </main>

      <style>{CSS}</style>
    </div>
  );
}

function Blobs() {
  return (
    <div className="tm-blobs" aria-hidden="true">
      <span className="tm-blob tm-blob--a" />
      <span className="tm-blob tm-blob--b" />
      <span className="tm-blob tm-blob--c" />
    </div>
  );
}

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;800&display=swap');

.tm-root {
  /* ── design-system tokens (utilities/design-system) ── */
  --primary: #2563eb;
  --primary-hover: #1d4ed8;
  --primary-soft: rgba(37, 99, 235, 0.08);
  --primary-soft-2: rgba(37, 99, 235, 0.14);
  --bg: #f8fafc;
  --card: #ffffff;
  --border: #e5e7eb;
  --text-1: #0f172a;
  --text-2: #64748b;
  --text-3: #94a3b8;
  --success: #10b981;
  --success-soft: rgba(16, 185, 129, 0.1);
  --warning: #b45309;
  --warning-soft: rgba(245, 158, 11, 0.13);
  --danger: #ef4444;
  --shadow-sm: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
  --shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
  --shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
  position: relative;
  min-height: 100vh;
  background: var(--bg);
  color: var(--text-1);
  font-family: 'Outfit', 'Inter', sans-serif;
  overflow-x: hidden;
}
.tm-root * { box-sizing: border-box; }
.tm-root h1, .tm-root h2 { letter-spacing: -0.02em; margin: 0; }

.tm-blobs { position: fixed; inset: 0; z-index: 0; pointer-events: none; overflow: hidden; }
.tm-blob { position: absolute; border-radius: 50%; filter: blur(80px); opacity: 0.5; background: var(--primary-soft); animation: drift 24s ease-in-out infinite; }
.tm-blob--a { width: 460px; height: 460px; top: -180px; left: -160px; }
.tm-blob--b { width: 380px; height: 380px; top: 25%; right: -180px; background: rgba(16, 185, 129, 0.1); animation-delay: -8s; }
.tm-blob--c { width: 420px; height: 420px; bottom: -200px; left: 15%; background: rgba(99, 102, 241, 0.09); animation-delay: -16s; }
@keyframes drift {
  0%, 100% { transform: translate(0, 0); }
  50% { transform: translate(30px, -24px); }
}
@media (prefers-reduced-motion: reduce) { .tm-blob, .tm-btn--pulse { animation: none; } }

.tm-nav { position: sticky; top: 12px; z-index: 30; display: flex; justify-content: center; padding: 0 16px; }
.tm-nav-inner {
  width: 100%; max-width: 640px; display: flex; align-items: center; justify-content: space-between;
  padding: 8px 16px; border-radius: 999px;
  background: var(--card); border: 1px solid var(--border);
  box-shadow: var(--shadow-sm);
}
.tm-brand { display: flex; align-items: center; gap: 10px; font-weight: 800; font-size: 15px; }
.tm-brand-mark {
  width: 30px; height: 30px; border-radius: 8px; background: var(--primary); color: #fff;
  display: flex; align-items: center; justify-content: center; font-weight: 800; font-size: 14px;
}
.tm-nav-back { font-size: 13px; font-weight: 600; color: var(--primary); text-decoration: none; }
.tm-nav-back:hover { color: var(--primary-hover); }

.tm-main { position: relative; z-index: 1; max-width: 640px; margin: 0 auto; padding: 48px 16px 40px; }

.tm-eyebrow {
  display: inline-block; font-size: 11px; letter-spacing: 0.16em; text-transform: uppercase;
  font-weight: 700; color: var(--primary); margin-bottom: 12px;
}

.tm-hero { text-align: center; padding: 0 4px 4px; }
.tm-hero h1 { font-size: clamp(28px, 5vw, 38px); font-weight: 800; line-height: 1.1; }
.tm-hero-sub { margin: 12px auto 0; max-width: 440px; color: var(--text-2); font-size: 15px; line-height: 1.6; }
.tm-pillrow { display: flex; justify-content: center; gap: 8px; flex-wrap: wrap; margin-top: 20px; }
.tm-pill {
  font-size: 12px; font-weight: 600; padding: 6px 14px; border-radius: 999px;
  background: var(--card); border: 1px solid var(--border); color: var(--text-2);
}

.tm-progress-wrap { display: flex; align-items: center; gap: 12px; margin: 28px 0 12px; }
.tm-progress { flex: 1; height: 6px; border-radius: 999px; background: rgba(15, 23, 42, 0.06); overflow: hidden; }
.tm-progress-fill {
  height: 100%; border-radius: 999px; background: linear-gradient(90deg, var(--primary), #4f83ec);
  transition: width 0.5s cubic-bezier(0.16, 1, 0.3, 1);
}
.tm-progress-label { font-size: 12px; font-weight: 700; color: var(--text-2); white-space: nowrap; }

.tm-rail { display: grid; grid-template-columns: repeat(4, 1fr); gap: 6px; margin: 0 0 20px; padding: 6px; background: var(--card); border: 1px solid var(--border); border-radius: 12px; box-shadow: var(--shadow-sm); }
.tm-rail-step {
  display: flex; flex-direction: column; align-items: center; gap: 8px;
  padding: 12px 4px; border-radius: 8px; border: none; background: transparent; cursor: pointer;
  transition: background 0.2s ease, transform 0.15s ease;
}
.tm-rail-step:hover { background: var(--primary-soft); }
.tm-rail-dot {
  width: 26px; height: 26px; border-radius: 50%; display: flex; align-items: center; justify-content: center;
  font-size: 12px; font-weight: 700; border: 1.5px solid var(--border);
  color: var(--text-2); background: var(--card); transition: all 0.25s ease;
}
.tm-rail-step--active .tm-rail-dot { background: var(--primary); color: #fff; border-color: var(--primary); box-shadow: 0 0 0 4px var(--primary-soft); }
.tm-rail-step--done .tm-rail-dot { background: var(--success); color: #fff; border-color: var(--success); }
.tm-rail-label { font-size: 11px; font-weight: 700; text-align: center; line-height: 1.25; color: var(--text-2); }
.tm-rail-step--active .tm-rail-label { color: var(--primary); font-weight: 800; }
.tm-rail-step--done .tm-rail-label { color: var(--text-1); }

.tm-banner {
  display: flex; align-items: center; gap: 10px; margin-bottom: 16px; padding: 12px 16px;
  background: var(--success-soft); border: 1px solid rgba(16, 185, 129, 0.35);
  border-radius: 12px; color: #047857; font-size: 13.5px; font-weight: 700;
  animation: rise 0.4s ease both;
}

.tm-stepcard {
  background: var(--card); border: 1px solid var(--border); border-radius: 16px;
  box-shadow: var(--shadow-md); padding: 8px; scroll-margin-top: 88px;
  animation: rise 0.4s ease both;
}
@keyframes rise { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
.tm-stepcard-grid { display: grid; grid-template-columns: 1.2fr 0.8fr; gap: 8px; align-items: stretch; }
@media (max-width: 720px) { .tm-stepcard-grid { grid-template-columns: 1fr; } }

.tm-stepcard-text { padding: 28px 28px 24px; }
.tm-stepcard-text h2 { font-size: 23px; font-weight: 800; margin-bottom: 10px; }
.tm-lead { color: var(--text-2); font-size: 14.5px; line-height: 1.6; margin: 0 0 20px; }

/* ── Prominent guideline callouts ── */
.tm-notes { display: flex; flex-direction: column; gap: 10px; margin-bottom: 22px; }
.tm-note-card {
  display: flex; gap: 12px; align-items: flex-start; padding: 14px 16px;
  border-radius: 12px; border: 1px solid transparent;
}
.tm-note-card--blue { background: var(--primary-soft); border-color: var(--primary-soft-2); }
.tm-note-card--amber { background: var(--warning-soft); border-color: rgba(245, 158, 11, 0.35); }
.tm-note-card--green { background: var(--success-soft); border-color: rgba(16, 185, 129, 0.35); }
.tm-note-card--gray { background: rgba(15, 23, 42, 0.04); border-color: var(--border); }
.tm-note-card--blue .tm-note-icon { background: var(--primary); }
.tm-note-card--amber .tm-note-icon { background: #f59e0b; }
.tm-note-card--green .tm-note-icon { background: var(--success); }
.tm-note-card--gray .tm-note-icon { background: var(--text-2); }
.tm-note-icon {
  width: 28px; height: 28px; border-radius: 8px; color: #fff;
  display: flex; align-items: center; justify-content: center; flex-shrink: 0;
}
.tm-note-card-title { font-size: 13.5px; font-weight: 800; color: var(--text-1); margin-bottom: 3px; }
.tm-note-card p { margin: 0; font-size: 13px; line-height: 1.55; color: var(--text-2); }

.tm-stepnav { display: flex; gap: 10px; margin-top: 6px; flex-wrap: wrap; }
.tm-hint { margin: 12px 0 0; font-size: 12.5px; color: var(--text-3); }
.tm-redownload {
  display: inline-flex; align-items: center; gap: 7px; margin-top: 12px;
  font-size: 13px; font-weight: 700; color: var(--primary); text-decoration: none;
}
.tm-redownload:hover { color: var(--primary-hover); }

/* ── design-system button (height 40, radius 8, weight 600) ── */
.tm-btn {
  display: inline-flex; align-items: center; justify-content: center; gap: 8px;
  height: 40px; padding: 0 20px; border-radius: 8px;
  font-size: 14px; font-weight: 600; border: 1px solid transparent; cursor: pointer;
  text-decoration: none; transition: background 0.2s ease, transform 0.1s ease;
}
.tm-btn:active { transform: scale(0.97); }
.tm-btn:disabled { opacity: 0.85; cursor: default; }
.tm-btn--primary { background: var(--primary); color: #fff; }
.tm-btn--primary:hover:not(:disabled) { background: var(--primary-hover); }
.tm-btn--ghost { background: transparent; color: var(--text-2); border-color: var(--border); }
.tm-btn--ghost:hover { background: var(--bg); }
.tm-btn--pulse { animation: pulse 2.2s ease-in-out infinite; }
@keyframes pulse {
  0%, 100% { box-shadow: 0 0 0 0 rgba(37, 99, 235, 0.45); }
  55% { box-shadow: 0 0 0 10px rgba(37, 99, 235, 0); }
}

.tm-stepcard-visual {
  display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 14px;
  padding: 24px 20px; background: rgba(15, 23, 42, 0.03); border-radius: 12px; margin: 8px;
}
.tm-mock-caption { font-size: 11.5px; font-weight: 700; color: var(--text-3); letter-spacing: 0.02em; }

.mock-phone {
  width: 205px; height: 395px; border-radius: 24px; background: #0f172a;
  border: 5px solid #0f172a; position: relative; overflow: hidden;
  box-shadow: var(--shadow-lg);
}
.mock-phone-notch { position: absolute; top: 0; left: 50%; transform: translateX(-50%); width: 70px; height: 17px; background: #0f172a; border-radius: 0 0 12px 12px; z-index: 5; }

.mock-screen { position: absolute; inset: 0; background: #f8fafc; display: flex; flex-direction: column; }
.mock-statusbar { height: 26px; background: #f8fafc; }
.mock-notif {
  margin: 28px 10px 0; padding: 12px; border-radius: 12px; background: #fff;
  border: 1px solid var(--border); box-shadow: var(--shadow-sm);
  display: flex; align-items: center; gap: 10px; animation: slideDown 0.5s ease both;
}
@keyframes slideDown { from { opacity: 0; transform: translateY(-8px); } to { opacity: 1; transform: translateY(0); } }
.mock-notif-icon {
  width: 28px; height: 28px; border-radius: 8px; background: var(--primary); color: #fff;
  display: flex; align-items: center; justify-content: center; flex-shrink: 0;
}
.mock-notif-icon--ok { background: var(--success); }
.mock-notif-text { flex: 1; min-width: 0; }
.mock-notif-title { font-size: 11px; font-weight: 800; color: var(--text-1); }
.mock-notif-sub { font-size: 9.5px; color: var(--text-2); margin-top: 1px; }
.mock-tray { margin-top: auto; height: 80px; border-top: 1px solid var(--border); }

.mock-screen--sheet { justify-content: flex-end; background: rgba(15, 23, 42, 0.4); }
.mock-sheet {
  background: #fff; border-radius: 20px 20px 0 0; padding: 22px 18px 26px;
  display: flex; flex-direction: column; align-items: center; text-align: center;
  animation: slideUp 0.4s ease both;
}
.mock-sheet--tight { padding-top: 24px; }
@keyframes slideUp { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: translateY(0); } }
.mock-sheet-icon { width: 42px; height: 42px; border-radius: 12px; display: flex; align-items: center; justify-content: center; margin-bottom: 10px; }
.mock-sheet-icon--primary { background: var(--primary-soft); color: var(--primary); }
.mock-sheet-title { font-size: 13px; font-weight: 800; color: var(--text-1); margin-bottom: 4px; }
.mock-sheet-body { font-size: 10.5px; color: var(--text-2); margin-bottom: 14px; line-height: 1.4; }
.mock-sheet-row {
  width: 100%; display: flex; align-items: center; justify-content: space-between;
  padding: 10px 4px; border-top: 1px solid var(--border); font-size: 10.5px; font-weight: 700; color: var(--text-1);
}
.mock-toggle { width: 34px; height: 20px; border-radius: 999px; background: rgba(15, 23, 42, 0.12); position: relative; transition: background 0.25s ease; }
.mock-toggle--on { background: var(--primary); }
.mock-toggle span { position: absolute; top: 2px; left: 2px; width: 16px; height: 16px; border-radius: 50%; background: #fff; box-shadow: var(--shadow-sm); transition: left 0.25s ease; }
.mock-toggle--on span { left: 16px; }

.mock-app-badge {
  width: 46px; height: 46px; border-radius: 13px; background: linear-gradient(135deg, var(--primary), #1e40af);
  color: #fff; display: flex; align-items: center; justify-content: center;
  font-weight: 800; font-size: 19px; margin-bottom: 10px;
}

.mock-btn-row { display: flex; gap: 8px; width: 100%; margin-top: 4px; }
.mock-btn {
  flex: 1; padding: 9px 0; border-radius: 8px; font-size: 10.5px; font-weight: 700; text-align: center;
}
.mock-btn--ghost { color: var(--text-2); background: #f1f5f9; }
.mock-btn--solid { color: #fff; background: var(--primary); }
.mock-btn--wide { flex: none; width: 100%; }

.mock-open-wrap { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 0 20px; animation: fadeIn 0.5s ease both; }
@keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
.mock-check-badge {
  width: 58px; height: 58px; border-radius: 50%; background: var(--success-soft); color: var(--success);
  display: flex; align-items: center; justify-content: center; margin-bottom: 14px;
}
.mock-open-title { font-size: 14px; font-weight: 800; color: var(--text-1); margin-bottom: 3px; }
.mock-open-sub { font-size: 10.5px; color: var(--text-2); margin-bottom: 16px; }

.tm-note {
  display: flex; gap: 14px; align-items: flex-start; margin-top: 20px; padding: 18px 20px;
  border-radius: 12px; background: var(--card); border: 1px solid var(--border);
  box-shadow: var(--shadow-sm);
}
.tm-note > .tm-note-icon { background: var(--primary-soft); color: var(--primary); }
.tm-note-title { font-weight: 800; font-size: 13.5px; margin-bottom: 4px; }
.tm-note p { margin: 0; font-size: 13px; line-height: 1.6; color: var(--text-2); }

.tm-footer { text-align: center; margin-top: 36px; font-size: 12px; color: var(--text-3); }
.tm-footer a { color: var(--primary); font-weight: 700; text-decoration: none; }
.tm-footer a:hover { text-decoration: underline; }
`;
