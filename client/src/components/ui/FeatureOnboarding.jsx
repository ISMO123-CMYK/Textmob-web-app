import { useEffect, useMemo, useState } from 'react';
import featuresData from '../../config/featureAnnouncements.json';

const features = Array.isArray(featuresData) ? featuresData : featuresData.default || [];

const VIEWED_KEY = 'textmob:viewed-feature-announcements';
const OPEN_EVENT = 'textmob:open-feature-onboarding';

function getViewedKeys() {
  try {
    return JSON.parse(localStorage.getItem(VIEWED_KEY) || '[]');
  } catch {
    return [];
  }
}

function storeViewedKeys(keys) {
  localStorage.setItem(VIEWED_KEY, JSON.stringify([...new Set(keys)]));
}

function accentClasses(accent) {
  const styles = {
    blue: 'bg-blue-600 text-white',
    red: 'bg-red-600 text-white',
    violet: 'bg-violet-600 text-white',
  };
  return styles[accent] || styles.blue;
}

function IconBadge({ feature }) {
  const className = `w-16 h-16 rounded-2xl mx-auto mb-5 flex items-center justify-center ${accentClasses(feature.accent)}`;

  if (feature.type === 'install') {
    return (
      <div className={className}>
        <img
          src="https://res.cloudinary.com/dzvm9xe1i/image/upload/v1754309761/profile-pictures/gyyonhn4akhjp4awey0t.png"
          className="w-12 h-12 rounded-xl object-cover"
          alt="Textmob"
        />
      </div>
    );
  }

  if (feature.key === 'live-video-streaming') {
    return (
      <div className={className}>
        <svg viewBox="0 0 24 24" className="w-8 h-8 fill-current">
          <path d="M4 6.5A2.5 2.5 0 0 1 6.5 4h7A2.5 2.5 0 0 1 16 6.5v11a2.5 2.5 0 0 1-2.5 2.5h-7A2.5 2.5 0 0 1 4 17.5v-11Zm13 3.25 3.3-2.2A1.1 1.1 0 0 1 22 8.46v7.08a1.1 1.1 0 0 1-1.7.91L17 14.25v-4.5Z" />
        </svg>
      </div>
    );
  }

  return (
    <div className={className}>
      <svg viewBox="0 0 24 24" className="w-8 h-8 fill-current">
        <path d="M4.85 3A3.85 3.85 0 0 0 1 6.85v5.9a3.85 3.85 0 0 0 3.85 3.85h2.38l3.39 3.05a1 1 0 0 0 1.34 0l3.39-3.05h3.8A3.85 3.85 0 0 0 23 12.75v-5.9A3.85 3.85 0 0 0 19.15 3H4.85Zm2.4 5.5h9.5a.75.75 0 0 1 0 1.5h-9.5a.75.75 0 0 1 0-1.5Zm0 3.25h6a.75.75 0 0 1 0 1.5h-6a.75.75 0 0 1 0-1.5Z" />
      </svg>
    </div>
  );
}

export default function FeatureOnboarding() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [show, setShow] = useState(false);
  const [manualOpen, setManualOpen] = useState(false);
  const [index, setIndex] = useState(0);
  const [viewedKeys, setViewedKeys] = useState(() => getViewedKeys());
  const [sessionViewedKeys, setSessionViewedKeys] = useState([]);

  const unseenFeatures = useMemo(
    () => features.filter(feature => !viewedKeys.includes(feature.key)),
    [viewedKeys]
  );
  const visibleFeatures = manualOpen ? features : unseenFeatures;
  const current = visibleFeatures[index] || visibleFeatures[0];

  useEffect(() => {
    if (window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true) {
      setIsInstalled(true);
    }

    const promptHandler = (event) => {
      event.preventDefault();
      setDeferredPrompt(event);
    };
    const installedHandler = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
    };
    const openHandler = () => {
      setManualOpen(true);
      setIndex(0);
      setSessionViewedKeys([]);
      setShow(true);
    };

    window.addEventListener('beforeinstallprompt', promptHandler);
    window.addEventListener('appinstalled', installedHandler);
    window.addEventListener(OPEN_EVENT, openHandler);

    return () => {
      window.removeEventListener('beforeinstallprompt', promptHandler);
      window.removeEventListener('appinstalled', installedHandler);
      window.removeEventListener(OPEN_EVENT, openHandler);
    };
  }, []);

  useEffect(() => {
    if (unseenFeatures.length === 0 || show || manualOpen) return;
    const timer = setTimeout(() => {
      setIndex(0);
      setSessionViewedKeys([]);
      setShow(true);
    }, 900);
    return () => clearTimeout(timer);
  }, [unseenFeatures.length, show, manualOpen]);

  useEffect(() => {
    if (!show || !current?.key) return;
    setSessionViewedKeys(keys => keys.includes(current.key) ? keys : [...keys, current.key]);
  }, [show, current?.key]);

  function close(markViewed = true) {
    if (markViewed && sessionViewedKeys.length) {
      const nextViewed = [...viewedKeys, ...sessionViewedKeys];
      storeViewedKeys(nextViewed);
      setViewedKeys([...new Set(nextViewed)]);
    }
    setShow(false);
    setManualOpen(false);
    setIndex(0);
    setSessionViewedKeys([]);
  }

  async function runPrimaryAction() {
    if (!current) return;

    if (current.type === 'install') {
      if (isInstalled) {
        close(true);
        return;
      }
      if (!deferredPrompt) {
        alert("To install on iOS: tap the Share icon and then Add to Home Screen.");
        close(true);
        return;
      }
      deferredPrompt.prompt();
      await deferredPrompt.userChoice;
      setDeferredPrompt(null);
      close(true);
      return;
    }

    if (current.href) {
      close(true);
      window.Lexum?.navigate?.(current.href);
    }
  }

  if (!show || !current || visibleFeatures.length === 0) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-950/30 backdrop-blur-sm">
      <div className="w-full max-w-[360px] rounded-2xl bg-white dark:bg-slate-950 border border-gray-200 dark:border-gray-800 overflow-hidden shadow-2xl">
        <div className="p-6 text-center">
          <IconBadge feature={current} />
          <p className="text-[10px] font-black uppercase tracking-[0.22em] text-blue-600 dark:text-blue-400 mb-2">
            {current.eyebrow}
          </p>
          <h2 className="text-xl font-black text-slate-950 dark:text-white leading-tight mb-2">
            {current.title}
          </h2>
          <p className="text-sm leading-relaxed text-slate-500 dark:text-slate-400 min-h-[84px]">
            {current.body}
          </p>

          <div className="flex items-center justify-center gap-1.5 mt-5">
            {visibleFeatures.map((feature, i) => (
              <button
                key={feature.key}
                onClick={() => setIndex(i)}
                className={`h-1.5 rounded-full transition-all ${i === index ? 'w-6 bg-blue-600' : 'w-1.5 bg-slate-200 dark:bg-slate-700'}`}
                aria-label={`Show ${feature.title}`}
              />
            ))}
          </div>
        </div>

        <div className="px-5 pb-5 space-y-2">
          <button
            onClick={runPrimaryAction}
            className="w-full h-11 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-black active:scale-[0.98] transition-all"
          >
            {current.type === 'install' && isInstalled ? 'Installed' : current.primaryAction}
          </button>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => setIndex(i => Math.max(0, i - 1))}
              disabled={index === 0}
              className="h-10 rounded-xl bg-slate-100 dark:bg-slate-900 text-xs font-bold text-slate-500 disabled:opacity-40"
            >
              Back
            </button>
            {index < visibleFeatures.length - 1 ? (
              <button
                onClick={() => setIndex(i => Math.min(visibleFeatures.length - 1, i + 1))}
                className="h-10 rounded-xl bg-slate-100 dark:bg-slate-900 text-xs font-bold text-slate-700 dark:text-slate-200"
              >
                Next
              </button>
            ) : (
              <button
                onClick={() => close(true)}
                className="h-10 rounded-xl bg-slate-100 dark:bg-slate-900 text-xs font-bold text-slate-700 dark:text-slate-200"
              >
                Done
              </button>
            )}
          </div>
          <button
            onClick={() => close(true)}
            className="w-full py-2 text-xs font-semibold text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
          >
            {current.secondaryAction || 'Close'}
          </button>
        </div>
      </div>
    </div>
  );
}

export function openFeatureOnboarding() {
  window.dispatchEvent(new Event(OPEN_EVENT));
}
