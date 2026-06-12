import { useState, useEffect } from 'react';
import LoginForm from './LoginForm';
import SignupForm from './SignupForm';
import ForgotPasswordForm from './ForgotPasswordForm';
import AuthSideBranding from './AuthSideBranding';
import SavedAccountsSidebar from './SavedAccountsSidebar';
import ManageAccountsModal from './ManageAccountsModal';
import NotificationToast from '../../components/ui/NotificationToast';
import { apiFetch } from '../../config/api';

export default function AuthPage() {
  const [view, setView] = useState('login');
  const [savedAccounts, setSavedAccounts] = useState([]);
  const [showManage, setShowManage] = useState(false);

  useEffect(() => {
    const loadAccounts = () => {
      setSavedAccounts(
        JSON.parse(localStorage.getItem('textmobSavedAccounts') || '[]').map((a) => ({
          ...a,
          username: a.username.toLowerCase(),
        }))
      );
    };
    loadAccounts();
    window.addEventListener('storage', loadAccounts);
    window.addEventListener('show-manage-accounts', () => setShowManage(true));

    return () => {
      window.removeEventListener('storage', loadAccounts);
    };
  }, []);

  const removeAccount = (username) => {
    const filtered = savedAccounts.filter((a) => a.username !== username);
    localStorage.setItem('textmobSavedAccounts', JSON.stringify(filtered));
    setSavedAccounts(filtered);
  };

  const autoLogin = async (username, password) => {
    try {
      const res = await apiFetch('/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier: username, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      localStorage.setItem('currentUser', data.user.username);
      
      // Reset feed state to prevent "failed to fetch" or stale posts from previous user
      window.__feedState = {
        activeTab: 'foryou',
        foryou: { posts: [], page: 1, hasMore: true, scrollY: 0 },
        following: { posts: [], page: 1, hasMore: true, scrollY: 0 }
      };

      window.location.href = '/';
    } catch (e) {
      window.showNotification({ title: 'Login Failed', message: e.message, type: 'error' });
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4 lg:p-8">
      <div className="w-full max-w-5xl flex items-center gap-12">
        <AuthSideBranding />
        {view === 'login' && <SavedAccountsSidebar accounts={savedAccounts} onLogin={autoLogin} onRemove={removeAccount} />}

        <div className="w-full max-w-sm flex-shrink-0">
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-2 mb-6">
            <span className="text-2xl font-black tracking-tighter text-blue-600 leading-none">
              t<span className="text-blue-400">..</span>
            </span>
            <span className="text-sm font-bold text-gray-400">Textmob</span>
          </div>

          <div className="bg-white border border-gray-100 rounded-2xl p-6">
            <div className="h-1 w-8 bg-blue-600 rounded-full mb-5" />
            {view === 'login' && (
              <LoginForm
                switchToSignup={() => setView('signup')}
                switchToForgotPassword={() => setView('forgot')}
                savedAccounts={savedAccounts}
                onAutoLogin={autoLogin}
                onRemoveAccount={removeAccount}
              />
            )}
            {view === 'signup' && <SignupForm switchToLogin={() => setView('login')} />}
            {view === 'forgot' && <ForgotPasswordForm switchToLogin={() => setView('login')} />}
          </div>

          <p className="text-center text-[11px] text-gray-400 mt-4">
            By continuing, you agree to our{' '}
            <a href="/about" className="text-blue-500 font-medium">Terms</a> and{' '}
            <a href="/about" className="text-blue-500 font-medium">Privacy Policy</a>
          </p>
        </div>
      </div>

      <ManageAccountsModal show={showManage} accounts={savedAccounts} onLogin={autoLogin} onRemove={removeAccount} onClose={() => setShowManage(false)} />

      {savedAccounts.length > 0 && view === 'login' && (
        <button
          onClick={() => setShowManage(true)}
          className="fixed bottom-6 right-6 lg:hidden w-12 h-12 bg-blue-600 text-white rounded-full flex items-center justify-center active:scale-95 transition-colors"
          style={{ zIndex: 100 }}
          aria-label="Manage saved accounts"
        >
          <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
            <circle cx="9" cy="7" r="4" />
            <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" />
          </svg>
        </button>
      )}
    </div>
  );
}
