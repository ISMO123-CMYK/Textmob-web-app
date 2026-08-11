import { useEffect, useState } from 'react';

const KEYS = {
  saved: 'textmobSavedAccounts',
  pending: 'pendingCredentials',
  dismissed: 'credentialsBannerDismissed',
};

export default function SaveCredentialsBanner() {
  const [pending, setPending] = useState(null);

  useEffect(() => {
    try {
      if (localStorage.getItem(KEYS.dismissed) === 'true') return;
      const raw = localStorage.getItem(KEYS.pending);
      if (raw) setPending(JSON.parse(raw));
    } catch {}
  }, []);

  function dismiss() {
    try {
      localStorage.setItem(KEYS.dismissed, 'true');
      localStorage.removeItem(KEYS.pending);
    } catch {}
    setPending(null);
  }

  function save() {
    if (!pending) return;
    try {
      let saved = [];
      try {
        const raw = JSON.parse(localStorage.getItem(KEYS.saved) || '[]');
        if (Array.isArray(raw)) saved = raw;
      } catch {}
      const u = String(pending.username || '').toLowerCase();
      const entry = { username: pending.username, password: pending.password || '', profile_pic: pending.profile_pic || '' };
      if (!saved.some(a => a && String(a.username || '').toLowerCase() === u)) {
        saved.push(entry);
      } else {
        saved = saved.map(a => a && String(a.username || '').toLowerCase() === u ? { ...a, ...entry } : a);
      }
      localStorage.setItem(KEYS.saved, JSON.stringify(saved));
    } catch {}
    dismiss();
  }

  if (!pending) return null;

  return (
    <div
      style={{
        position: 'fixed', bottom: 20, right: 20, zIndex: 99999,
        background: '#fff', border: '1px solid #e5e7eb', borderRadius: 14,
        padding: 14, boxShadow: '0 10px 40px rgba(0,0,0,0.15)', maxWidth: 320,
        fontFamily: "'Outfit', 'Inter', system-ui, sans-serif",
      }}
    >
      <div style={{ fontWeight: 700, fontSize: 14, color: '#0f172a', marginBottom: 2 }}>
        Save your login details?
      </div>
      <div style={{ fontSize: 12, color: '#64748b', marginBottom: 10 }}>
        Get one-tap access next time you sign in.
      </div>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <button
          onClick={save}
          style={{ background: '#2563eb', color: '#fff', border: 'none', borderRadius: 20, padding: '7px 18px', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}
        >
          Save
        </button>
        <button
          onClick={dismiss}
          style={{ background: 'transparent', color: '#64748b', border: 'none', padding: '7px 12px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
        >
          No thanks
        </button>
      </div>
    </div>
  );
}
