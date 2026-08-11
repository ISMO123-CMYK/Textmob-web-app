import { useState } from 'react';
import FormInput from '../../components/ui/FormInput';
import PasswordStrengthIndicator from '../../components/ui/PasswordStrengthIndicator';
import { apiFetch } from '../../config/api';

export default function LoginForm({
  switchToSignup,
  switchToForgotPassword,
  savedAccounts,
  onAutoLogin,
  onRemoveAccount,
  redirect,
}) {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const [attempts, setAttempts] = useState(0);

  async function handleLogin(id, pw) {
    setLoading(true);
    try {
      const res = await apiFetch('/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier: id, password: pw }),
      });
      const data = await res.json();
      if (!res.ok) {
        const newAttempts = attempts + 1;
        setAttempts(newAttempts);
        window.showNotification({
          title: newAttempts >= 5 ? 'Account Locked' : 'Login Failed',
          message: newAttempts >= 5 ? 'Too many attempts. Please reset your password.' : data.error,
          type: 'error',
        });
        return;
      }
      if (rememberMe) {
        let saved = [];
        try {
          const raw = JSON.parse(localStorage.getItem('textmobSavedAccounts') || '[]');
          if (Array.isArray(raw)) saved = raw;
        } catch {}
        const u = String(data.user?.username || '').toLowerCase();
        const entry = {
          username: u,
          password: pw,
          profile_pic: data.user?.profile_pic || '',
        };
        if (!saved.some((a) => String(a?.username || '').toLowerCase() === u)) {
          saved.push(entry);
        } else {
          saved = saved.map((a) => String(a?.username || '').toLowerCase() === u ? { ...a, ...entry } : a);
        }
        localStorage.setItem('textmobSavedAccounts', JSON.stringify(saved));
        try { localStorage.removeItem('credentialsBannerDismissed'); localStorage.removeItem('pendingCredentials'); } catch {}
      } else {
        let saved = [];
        try {
          const raw = JSON.parse(localStorage.getItem('textmobSavedAccounts') || '[]');
          if (Array.isArray(raw)) saved = raw;
        } catch {}
        const u = String(data.user.username || '').toLowerCase();
        if (!saved.some((a) => String(a.username || '').toLowerCase() === u)) {
          try {
            localStorage.setItem('credentialsBannerDismissed', 'false');
            localStorage.setItem('pendingCredentials', JSON.stringify({
              username: data.user.username.toLowerCase(),
              password: pw,
              profile_pic: data.user.profile_pic || '',
            }));
          } catch {}
        }
      }
      localStorage.setItem('currentUser', data.user.username);
      
      // Reset feed state to prevent "failed to fetch" or stale posts from previous user
      window.__feedState = {
        activeTab: 'foryou',
        foryou: { posts: [], page: 1, hasMore: true, scrollY: 0 },
        following: { posts: [], page: 1, hasMore: true, scrollY: 0 }
      };

      // Wipe API response cache so cached posts/suggestions from the previous user never render
      try {
        Object.keys(localStorage).filter(k => k.startsWith('tmob_cache_')).forEach(k => localStorage.removeItem(k));
      } catch {}

      try { localStorage.removeItem('pendingRedirect'); } catch {}
      window.location.href = redirect || '/';
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }

  function onSubmit() {
    if (!identifier || !password) {
      window.showNotification({ title: 'Incomplete', message: 'Please fill in all fields', type: 'error' });
      return;
    }
    handleLogin(identifier, password);
  }

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h2 className="text-xl font-bold text-gray-900">Welcome back</h2>
        <p className="text-xs text-gray-400 mt-0.5">Sign in to continue to Textmob</p>
      </div>

      <div className="flex flex-col gap-3">
        <FormInput placeholder="Email, username, or phone" value={identifier} onChange={(e) => setIdentifier(e.target.value)} required />
        <FormInput type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} required />
      </div>

      <div className="flex items-center justify-between">
        <label className="flex items-center gap-2 cursor-pointer select-none">
          <div
            onClick={() => setRememberMe((v) => !v)}
            className={`w-4 h-4 rounded border flex items-center justify-center transition-colors cursor-pointer ${rememberMe ? 'bg-blue-600 border-blue-600' : 'bg-white border-gray-300'}`}
          >
            {rememberMe && (
              <svg viewBox="0 0 24 24" className="w-3 h-3 text-white" fill="none" stroke="currentColor" strokeWidth="3">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            )}
          </div>
          <span className="text-xs text-gray-600 font-medium">Remember me</span>
        </label>
        <button onClick={switchToForgotPassword} className="text-xs font-bold text-blue-600 active:opacity-70 transition-opacity">
          Forgot password?
        </button>
      </div>

      <button onClick={onSubmit} disabled={loading} className="w-full h-11 rounded-full bg-blue-600 text-white text-sm font-bold active:scale-[0.98] disabled:opacity-50 transition-colors">
        {loading ? 'Signing in…' : 'Sign in'}
      </button>

      <div className="flex items-center gap-3">
        <div className="flex-1 h-px bg-gray-100" />
        <span className="text-[11px] text-gray-400 font-medium">or</span>
        <div className="flex-1 h-px bg-gray-100" />
      </div>

      <button onClick={switchToSignup} className="w-full h-11 rounded-full border border-gray-200 text-sm font-bold text-gray-700 hover:bg-gray-50 active:scale-[0.98] active:bg-gray-100 transition-colors">
        Create account
      </button>

      {savedAccounts.length > 0 && (
        <button
          onClick={() => window.dispatchEvent(new CustomEvent('show-manage-accounts'))}
          className="lg:hidden text-xs text-gray-400 text-center active:opacity-70 transition-opacity"
        >
          Switch account ({savedAccounts.length} saved)
        </button>
      )}
    </div>
  );
}
