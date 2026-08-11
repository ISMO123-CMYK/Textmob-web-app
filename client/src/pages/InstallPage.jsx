import { useEffect, useState, useRef } from 'react';

/* ---------------------------------------------------------
   Textmob — Install onboarding
   Monochrome milky-glass, progressive one-step-at-a-time flow.
   Each step explains what's about to happen and shows a drawn
   mockup of the exact screen the person is about to see.
--------------------------------------------------------- */

function isAndroid() {
  if (typeof navigator === 'undefined') return false;
  return /android/i.test(navigator.userAgent || '');
}

// ---- Small icon set (line icons, no shadows, no gradients) ----
const Icon = {
  download: (p) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <path d="M12 3v12" /><path d="m7 10 5 5 5-5" /><path d="M5 21h14" />
    </svg>
  ),
  shield: (p) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <path d="M12 21c5-2 8-6 8-11V6l-8-3-8 3v4c0 5 3 9 8 11Z" />
    </svg>
  ),
  file: (p) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <path d="M7 3h7l5 5v13H7z" /><path d="M14 3v5h5" />
    </svg>
  ),
  spark: (p) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5 18 18M18 6l-2.5 2.5M8.5 15.5 6 18" />
    </svg>
  ),
  check: (p) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <path d="m4 12 5 5L20 6" />
    </svg>
  ),
  arrowRight: (p) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <path d="M5 12h14" /><path d="m13 6 6 6-6 6" />
    </svg>
  ),
  bell: (p) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <path d="M6 8a6 6 0 0 1 12 0c0 5 2 6 2 6H4s2-1 2-6Z" /><path d="M10 21a2 2 0 0 0 4 0" />
    </svg>
  ),
  folder: (p) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <path d="M3 7a1 1 0 0 1 1-1h5l2 2h9a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1Z" />
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
        <div className="mock-notif-icon"><Icon.download className="w-4 h-4" /></div>
        <div className="mock-notif-text">
          <div className="mock-notif-title">textmob.apk</div>
          <div className="mock-notif-sub">Download complete · 41 MB</div>
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
        <div className="mock-sheet-icon"><Icon.shield className="w-6 h-6" /></div>
        <div className="mock-sheet-title">Install unknown apps</div>
        <div className="mock-sheet-body">Allow Chrome to install this app</div>
        <div className="mock-sheet-row">
          <span>Allow from this source</span>
          <Icon.toggle className="w-9 h-9 mock-accent" />
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
        <div className="mock-app-badge mock-app-badge--lg">T</div>
        <div className="mock-open-title">Textmob installed</div>
        <div className="mock-btn mock-btn--solid mock-btn--wide">Open</div>
      </div>
    </div>
  );
}

const STEPS = [
  {
    key: 'download',
    eyebrow: 'Step 1',
    title: 'Download the app file',
    lead: "Tap the download button below. Textmob isn't on the Play Store yet, so you're getting the app file directly from us, the same file, just skipping the store.",
    whatYouSee: "Your download starts right away. Watch the notification shade at the top of your screen, it'll show \"textmob.apk\" downloading, then \"Download complete\" once it's ready.",
    mock: MockDownloadBar,
    mockCaption: 'Your notification shade',
    icon: Icon.download,
  },
  {
    key: 'permission',
    eyebrow: 'Step 2',
    title: 'Let your phone know this is okay',
    lead: "Android blocks app files that don't come from the Play Store by default. That's a safety setting, not a problem with Textmob, you just need to allow it once for your browser.",
    whatYouSee: "A screen appears asking to install unknown apps. Tap into the settings it offers, find the toggle next to your browser's name, and switch it on. Then go back.",
    whatYouSeeDetail: 'If Google Play Protect shows a warning after this, tap "Install anyway" or "More details → Install anyway." That warning shows up for any app outside the Play Store, it isn\'t specific to Textmob.',
    mock: MockPermission,
    mockCaption: 'The permission screen',
    icon: Icon.shield,
  },
  {
    key: 'install',
    eyebrow: 'Step 3',
    title: 'Open the file and install',
    lead: "Now open the file you downloaded. If you already switched apps, pull down your notification shade and tap the download again, or open it from your Downloads folder.",
    whatYouSee: 'A small card appears showing the Textmob icon and asking "Do you want to install this app?" Tap Install, and give it a few seconds to finish.',
    whatYouSeeDetail: "Already had an older Textmob installed? This card will say \"Update\" instead of \"Install\", same thing, same tap.",
    mock: MockInstallConfirm,
    mockCaption: 'The install prompt',
    icon: Icon.file,
  },
  {
    key: 'open',
    eyebrow: 'Step 4',
    title: "You're in",
    lead: "That's it, Textmob is on your phone now. Tap Open to jump straight in, or find the Textmob icon in your app drawer any time.",
    whatYouSee: 'The same account, posts, snaps, and chats you already know from the browser are right there. Nothing to set up again.',
    whatYouSeeDetail: 'When a new version of the app is ready, Textmob will let you know inside the app and walk you through updating. No need to come back here.',
    mock: MockOpenApp,
    mockCaption: 'Your home screen',
    icon: Icon.spark,
  },
];

export default function InstallPage() {
  const [info, setInfo] = useState(null);
  const [current, setCurrent] = useState(0);
  const [visited, setVisited] = useState([0]);
  const android = isAndroid();
  const railRef = useRef(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await fetch('/api/app-version');
        const data = await res.json();
        if (alive && data && data.version) setInfo(data);
      } catch { /* defaults are fine */ }
    })();
    return () => { alive = false; };
  }, []);

  const version = info?.version || null;
  const apkUrl = info?.apk_url || (typeof window !== 'undefined' ? `${window.location.origin}/apk/thetextmobapp.apk` : '#');
  const graceDays = info?.grace_days || 7;

  const goTo = (i) => {
    const clamped = Math.max(0, Math.min(STEPS.length - 1, i));
    setCurrent(clamped);
    setVisited((v) => (v.includes(clamped) ? v : [...v, clamped]));
  };

  const step = STEPS[current];
  const StepMock = step.mock;
  const isFirst = current === 0;
  const isLast = current === STEPS.length - 1;

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
        {/* Intro, shown only conceptually via progress rail */}
        <section className="tm-hero">
          <span className="tm-eyebrow">Install on Android</span>
          <h1>Let's get Textmob on your phone</h1>
          <p className="tm-hero-sub">
            Four short steps. We'll tell you exactly what to expect on each one, so nothing on your screen catches you off guard.
          </p>
          <div className="tm-pillrow">
            {version && <span className="tm-pill">Version {version}</span>}
            <span className="tm-pill">Android 8.0 and up</span>
            <span className="tm-pill">Free</span>
          </div>
        </section>

        {/* Progress rail */}
        <nav className="tm-rail" ref={railRef} aria-label="Install steps">
          {STEPS.map((s, i) => {
            const state = i === current ? 'active' : visited.includes(i) ? 'done' : 'upcoming';
            return (
              <button
                key={s.key}
                className={`tm-rail-step tm-rail-step--${state}`}
                onClick={() => goTo(i)}
                aria-current={i === current ? 'step' : undefined}
              >
                <span className="tm-rail-dot">
                  {visited.includes(i) && i !== current ? <Icon.check className="w-3.5 h-3.5" /> : i + 1}
                </span>
                <span className="tm-rail-label">{s.title}</span>
              </button>
            );
          })}
        </nav>

        {/* Active step card */}
        <section className="tm-stepcard" key={step.key}>
          <div className="tm-stepcard-grid">
            <div className="tm-stepcard-text">
              <span className="tm-eyebrow tm-eyebrow--muted">{step.eyebrow} of {STEPS.length}</span>
              <h2>{step.title}</h2>
              <p className="tm-lead">{step.lead}</p>

              <div className="tm-whatyousee">
                <div className="tm-whatyousee-head">
                  <span className="tm-whatyousee-icon"><step.icon className="w-4 h-4" /></span>
                  What you'll see
                </div>
                <p>{step.whatYouSee}</p>
                {step.whatYouSeeDetail && <p className="tm-whatyousee-detail">{step.whatYouSeeDetail}</p>}
              </div>

              {isFirst && (
                <a
                  href={apkUrl}
                  download
                  target="_blank"
                  rel="noopener noreferrer"
                  className="tm-btn tm-btn--primary"
                  onClick={() => { if (current === 0) setTimeout(() => goTo(1), 400); }}
                >
                  <Icon.download className="w-4 h-4" />
                  Download for Android
                </a>
              )}

              <div className="tm-stepnav">
                {!isFirst && (
                  <button className="tm-btn tm-btn--ghost" onClick={() => goTo(current - 1)}>
                    Back
                  </button>
                )}
                {!isLast ? (
                  <button className="tm-btn tm-btn--dark" onClick={() => goTo(current + 1)}>
                    {isFirst ? "I've downloaded it" : 'Next step'}
                    <Icon.arrowRight className="w-4 h-4" />
                  </button>
                ) : (
                  <a href={apkUrl} download className="tm-btn tm-btn--dark">
                    Open Textmob
                    <Icon.arrowRight className="w-4 h-4" />
                  </a>
                )}
              </div>

              {android && isFirst && (
                <p className="tm-hint">You're already on Android, so this will work right on this device.</p>
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
            <div className="tm-note-title">Updates work the same way, automatically</div>
            <p>
              Textmob checks for a new version every time you open it. When one's ready, you'll get
              {' '}{graceDays} days to update from inside the app, no need to come back to this page.
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
@import url('https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700;800&family=Sora:wght@600;700;800&display=swap');

.tm-root {
  --ink: #0f0f10;
  --paper: #f7f6f4;
  --paper-2: #efeee9;
  --line: rgba(15,15,16,0.10);
  --line-soft: rgba(15,15,16,0.06);
  --glass: rgba(255,255,255,0.55);
  --glass-dark: rgba(17,17,17,0.88);
  --muted: rgba(15,15,16,0.55);
  --muted-2: rgba(15,15,16,0.38);
  position: relative;
  min-height: 100vh;
  background: var(--paper);
  color: var(--ink);
  font-family: 'Manrope', -apple-system, sans-serif;
  overflow-x: hidden;
}
.tm-root * { box-sizing: border-box; }
.tm-root h1, .tm-root h2 { font-family: 'Sora', 'Manrope', sans-serif; letter-spacing: -0.02em; margin: 0; }

.tm-blobs { position: fixed; inset: 0; z-index: 0; pointer-events: none; overflow: hidden; }
.tm-blob { position: absolute; border-radius: 50%; filter: blur(70px); opacity: 0.35; background: #d8d6cf; animation: drift 22s ease-in-out infinite; }
.tm-blob--a { width: 480px; height: 480px; top: -160px; left: -140px; animation-delay: 0s; }
.tm-blob--b { width: 380px; height: 380px; top: 30%; right: -160px; background: #cfcdc4; animation-delay: -7s; }
.tm-blob--c { width: 420px; height: 420px; bottom: -180px; left: 20%; background: #e3e1d9; animation-delay: -14s; }
@keyframes drift {
  0%, 100% { transform: translate(0,0); }
  50% { transform: translate(30px, -20px); }
}
@media (prefers-reduced-motion: reduce) { .tm-blob { animation: none; } }

.tm-nav { position: sticky; top: 0; z-index: 30; display: flex; justify-content: center; padding: 16px 20px 0; }
.tm-nav-inner {
  width: 100%; max-width: 760px; display: flex; align-items: center; justify-content: space-between;
  padding: 10px 18px; border-radius: 999px;
  background: var(--glass); backdrop-filter: blur(22px) saturate(140%); -webkit-backdrop-filter: blur(22px) saturate(140%);
  border: 1px solid var(--line);
}
.tm-brand { display: flex; align-items: center; gap: 10px; font-weight: 800; font-family: 'Sora', sans-serif; font-size: 15px; }
.tm-brand-mark {
  width: 30px; height: 30px; border-radius: 10px; background: var(--ink); color: var(--paper);
  display: flex; align-items: center; justify-content: center; font-weight: 800; font-size: 14px; font-family: 'Sora', sans-serif;
}
.tm-nav-back { font-size: 13px; font-weight: 600; color: var(--muted); text-decoration: none; }
.tm-nav-back:hover { color: var(--ink); }

.tm-main { position: relative; z-index: 1; max-width: 760px; margin: 0 auto; padding: 56px 20px 40px; }

.tm-eyebrow {
  display: inline-block; font-size: 11px; letter-spacing: 0.18em; text-transform: uppercase;
  font-weight: 700; color: rgba(15,15,16,0.45); margin-bottom: 14px;
}
.tm-eyebrow--muted { margin-bottom: 10px; color: rgba(15,15,16,0.4); }

.tm-hero { text-align: center; padding: 0 6px 8px; }
.tm-hero h1 { font-size: clamp(28px, 5vw, 40px); font-weight: 800; line-height: 1.08; }
.tm-hero-sub { margin: 14px auto 0; max-width: 460px; color: var(--muted); font-size: 15.5px; line-height: 1.55; }
.tm-pillrow { display: flex; justify-content: center; gap: 8px; flex-wrap: wrap; margin-top: 20px; }
.tm-pill {
  font-size: 12px; font-weight: 700; padding: 7px 14px; border-radius: 999px;
  background: var(--glass); border: 1px solid var(--line); backdrop-filter: blur(14px);
}

.tm-rail {
  display: flex; gap: 6px; margin: 34px 0 20px; padding: 6px;
  background: var(--glass); border: 1px solid var(--line); border-radius: 20px;
  backdrop-filter: blur(20px) saturate(140%); overflow-x: auto;
}
.tm-rail-step {
  flex: 1 1 0; min-width: 84px; display: flex; flex-direction: column; align-items: center; gap: 8px;
  padding: 12px 8px; border-radius: 14px; border: none; background: transparent; cursor: pointer;
  transition: background 0.2s ease, transform 0.15s ease;
}
.tm-rail-step:hover { background: rgba(15,15,16,0.04); }
.tm-rail-step--active { background: var(--ink); }
.tm-rail-dot {
  width: 26px; height: 26px; border-radius: 50%; display: flex; align-items: center; justify-content: center;
  font-size: 12px; font-weight: 800; border: 1.5px solid var(--line);
  color: var(--muted); background: rgba(255,255,255,0.6);
}
.tm-rail-step--active .tm-rail-dot { background: var(--paper); color: var(--ink); border-color: var(--paper); }
.tm-rail-step--done .tm-rail-dot { background: var(--ink); color: var(--paper); border-color: var(--ink); }
.tm-rail-label {
  font-size: 11px; font-weight: 700; text-align: center; line-height: 1.25; color: var(--muted-2);
}
.tm-rail-step--active .tm-rail-label { color: var(--paper); }
.tm-rail-step--done .tm-rail-label { color: var(--ink); }

.tm-stepcard {
  background: var(--glass); border: 1px solid var(--line); border-radius: 28px;
  backdrop-filter: blur(26px) saturate(140%); -webkit-backdrop-filter: blur(26px) saturate(140%);
  padding: 8px; animation: rise 0.4s ease both;
}
@keyframes rise { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
.tm-stepcard-grid { display: grid; grid-template-columns: 1.15fr 0.85fr; gap: 8px; align-items: stretch; }
@media (max-width: 720px) { .tm-stepcard-grid { grid-template-columns: 1fr; } }

.tm-stepcard-text { padding: 30px 30px 26px; }
.tm-stepcard-text h2 { font-size: 24px; font-weight: 800; margin-bottom: 12px; }
.tm-lead { color: rgba(15,15,16,0.68); font-size: 15px; line-height: 1.6; margin: 0 0 20px; }

.tm-whatyousee {
  background: rgba(255,255,255,0.55); border: 1px solid var(--line-soft); border-radius: 18px;
  padding: 16px 18px; margin-bottom: 22px;
}
.tm-whatyousee-head {
  display: flex; align-items: center; gap: 8px; font-size: 12.5px; font-weight: 800;
  text-transform: uppercase; letter-spacing: 0.06em; color: var(--ink); margin-bottom: 8px;
}
.tm-whatyousee-icon {
  width: 22px; height: 22px; border-radius: 7px; background: var(--ink); color: var(--paper);
  display: flex; align-items: center; justify-content: center; flex-shrink: 0;
}
.tm-whatyousee p { margin: 0; font-size: 13.5px; line-height: 1.6; color: rgba(15,15,16,0.62); }
.tm-whatyousee-detail { margin-top: 8px !important; padding-top: 8px; border-top: 1px solid var(--line-soft); color: rgba(15,15,16,0.5) !important; }

.tm-stepnav { display: flex; gap: 10px; margin-top: 6px; flex-wrap: wrap; }
.tm-hint { margin: 12px 0 0; font-size: 12.5px; color: var(--muted-2); }

.tm-btn {
  display: inline-flex; align-items: center; justify-content: center; gap: 8px;
  font-size: 14px; font-weight: 700; padding: 13px 22px; border-radius: 999px;
  border: 1px solid transparent; cursor: pointer; text-decoration: none;
  transition: transform 0.15s ease, background 0.2s ease;
}
.tm-btn:active { transform: scale(0.97); }
.tm-btn--primary { background: var(--ink); color: var(--paper); margin-bottom: 16px; width: 100%; }
.tm-btn--primary:hover { background: #232323; }
.tm-btn--dark { background: var(--ink); color: var(--paper); }
.tm-btn--dark:hover { background: #232323; }
.tm-btn--ghost { background: rgba(255,255,255,0.5); color: var(--ink); border-color: var(--line); }
.tm-btn--ghost:hover { background: rgba(255,255,255,0.8); }
.tm-btn--wide { width: 100%; }

.tm-stepcard-visual {
  display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 14px;
  padding: 26px 22px; background: rgba(15,15,16,0.03); border-radius: 22px; margin: 8px;
}
.tm-mock-caption { font-size: 11.5px; font-weight: 700; color: var(--muted-2); letter-spacing: 0.02em; }

.mock-phone {
  width: 210px; height: 400px; border-radius: 34px; background: var(--glass-dark);
  border: 6px solid var(--ink); position: relative; overflow: hidden;
  box-shadow: none;
}
.mock-phone-notch { position: absolute; top: 0; left: 50%; transform: translateX(-50%); width: 70px; height: 18px; background: var(--ink); border-radius: 0 0 12px 12px; z-index: 5; }

.mock-screen { position: absolute; inset: 0; background: #fbfaf8; display: flex; flex-direction: column; }
.mock-statusbar { height: 26px; background: #fbfaf8; }
.mock-notif {
  margin: 30px 10px 0; padding: 12px; border-radius: 14px; background: #fff;
  border: 1px solid var(--line-soft); display: flex; align-items: center; gap: 10px;
  animation: slideDown 0.5s ease both;
}
@keyframes slideDown { from { opacity: 0; transform: translateY(-8px); } to { opacity: 1; transform: translateY(0); } }
.mock-notif-icon { width: 26px; height: 26px; border-radius: 8px; background: var(--ink); color: #fff; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.mock-notif-title { font-size: 11px; font-weight: 800; color: var(--ink); }
.mock-notif-sub { font-size: 9.5px; color: var(--muted); margin-top: 1px; }
.mock-tray { margin-top: auto; height: 90px; background: repeating-linear-gradient(0deg, transparent, transparent 100%); border-top: 1px solid var(--line-soft); }

.mock-screen--sheet { justify-content: flex-end; background: rgba(15,15,16,0.35); }
.mock-sheet {
  background: #fff; border-radius: 22px 22px 0 0; padding: 22px 18px 26px;
  display: flex; flex-direction: column; align-items: center; text-align: center;
  animation: slideUp 0.4s ease both;
}
.mock-sheet--tight { padding-top: 26px; }
@keyframes slideUp { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: translateY(0); } }
.mock-sheet-icon { width: 40px; height: 40px; border-radius: 12px; background: var(--paper-2); display: flex; align-items: center; justify-content: center; margin-bottom: 10px; }
.mock-sheet-title { font-size: 13px; font-weight: 800; color: var(--ink); margin-bottom: 4px; }
.mock-sheet-body { font-size: 10.5px; color: var(--muted); margin-bottom: 14px; line-height: 1.4; }
.mock-sheet-row {
  width: 100%; display: flex; align-items: center; justify-content: space-between;
  padding: 10px 4px; border-top: 1px solid var(--line-soft); font-size: 10.5px; font-weight: 700; color: var(--ink);
}
.mock-accent { color: var(--ink); }

.mock-app-badge {
  width: 44px; height: 44px; border-radius: 13px; background: var(--ink); color: #fff;
  display: flex; align-items: center; justify-content: center; font-weight: 800; font-size: 18px;
  font-family: 'Sora', sans-serif; margin-bottom: 10px;
}
.mock-app-badge--lg { width: 60px; height: 60px; border-radius: 18px; font-size: 24px; margin-bottom: 16px; }

.mock-btn-row { display: flex; gap: 8px; width: 100%; margin-top: 4px; }
.mock-btn {
  flex: 1; padding: 9px 0; border-radius: 999px; font-size: 10.5px; font-weight: 800; text-align: center;
}
.mock-btn--ghost { color: var(--muted); background: var(--paper-2); }
.mock-btn--solid { color: #fff; background: var(--ink); }

.mock-open-wrap { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 0 20px; animation: fadeIn 0.5s ease both; }
@keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
.mock-open-title { font-size: 13px; font-weight: 800; color: var(--ink); margin-bottom: 18px; }

.tm-note {
  display: flex; gap: 14px; align-items: flex-start; margin-top: 22px; padding: 20px 22px;
  border-radius: 22px; background: var(--glass-dark); color: var(--paper);
  backdrop-filter: blur(20px);
}
.tm-note-icon { width: 30px; height: 30px; border-radius: 10px; background: rgba(255,255,255,0.12); display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.tm-note-title { font-weight: 800; font-size: 13.5px; margin-bottom: 4px; }
.tm-note p { margin: 0; font-size: 13px; line-height: 1.6; color: rgba(247,246,244,0.7); }

.tm-footer { text-align: center; margin-top: 40px; font-size: 12px; color: var(--muted-2); }
.tm-footer a { color: var(--ink); font-weight: 700; text-decoration: none; }
.tm-footer a:hover { text-decoration: underline; }
`;