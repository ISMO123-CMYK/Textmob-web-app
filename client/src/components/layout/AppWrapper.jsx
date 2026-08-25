import React, { useEffect, useState } from 'react';
import NotificationBanner from './NotificationBanner';
import SaveCredentialsBanner from '../ui/SaveCredentialsBanner';
import { SnapUploadProvider } from '../../utils/SnapUploadContext';
import { apiFetch } from '../../config/api';
import { fetchProfile } from '../../utils/useProfileCache';
import AuthPromptModal from '../ui/AuthPromptModal';
import { showCelebration } from '../ui/CelebrationOverlay';

const STYLES = {
  overlay: {
    position: 'fixed', inset: 0, zIndex: 99999,
    background: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontFamily: "'Outfit', 'Inter', system-ui, sans-serif", padding: 24
  },
  card: {
    background: '#fff', borderRadius: 16, maxWidth: 480, width: '100%',
    boxShadow: '0 20px 60px rgba(0,0,0,0.12), 0 4px 16px rgba(0,0,0,0.06)',
    overflow: 'hidden'
  },
  header: {
    background: 'linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)',
    padding: '32px 32px 28px', textAlign: 'center'
  },
  icon: {
    width: 56, height: 56, background: 'rgba(255,255,255,0.15)',
    borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
    margin: '0 auto 16px', fontSize: 28
  },
  headerTitle: {
    color: '#fff', fontSize: 22, fontWeight: 700, letterSpacing: '-0.3px', marginBottom: 6
  },
  headerSub: {
    color: 'rgba(255,255,255,0.85)', fontSize: 14, fontWeight: 400, lineHeight: 1.5
  },
  body: { padding: '28px 32px 32px' },
  section: { marginBottom: 24 },
  sectionTitle: {
    fontSize: 13, fontWeight: 600, color: '#64748b', textTransform: 'uppercase',
    letterSpacing: '0.5px', marginBottom: 10
  },
  paragraph: {
    fontSize: 14, lineHeight: 1.7, color: '#334155', marginBottom: 8
  },
  link: {
    color: '#2563eb', fontWeight: 600, textDecoration: 'none', borderBottom: '1px solid rgba(37,99,235,0.2)'
  },
  divider: {
    height: 1, background: '#e5e7eb', margin: '20px 0'
  },
  appealBox: {
    background: '#f8fafc', borderRadius: 12, padding: 20, marginTop: 4
  },
  appealTitle: {
    fontSize: 14, fontWeight: 600, color: '#0f172a', marginBottom: 12
  },
  whatsappBtn: {
    display: 'flex', alignItems: 'center', gap: 10,
    padding: '12px 20px', borderRadius: 10, border: '1px solid #e5e7eb',
    background: '#fff', cursor: 'pointer', fontSize: 14, fontWeight: 500,
    color: '#0f172a', textDecoration: 'none', marginBottom: 8,
    transition: 'all 0.15s ease'
  },
  footer: {
    textAlign: 'center', padding: '16px 32px',
    borderTop: '1px solid #e5e7eb', fontSize: 12, color: '#94a3b8'
  }
};

function DisabledScreen() {
  return (
    <div style={STYLES.overlay}>
      <div style={STYLES.card}>
        <div style={STYLES.header}>
          <div style={STYLES.icon}>&#128274;</div>
          <div style={STYLES.headerTitle}>Account Disabled</div>
          <div style={STYLES.headerSub}>
            Your account has been disabled for violating our Terms of Service.
          </div>
        </div>

        <div style={STYLES.body}>
          <div style={STYLES.section}>
            <div style={STYLES.sectionTitle}>Why this happened</div>
            <p style={STYLES.paragraph}>
              After a recent review, we determined that your account activity did not comply with our{' '}
              <a href="https://textmob.web.app/terms.html" target="_blank" rel="noreferrer" style={STYLES.link}>
                Terms and Conditions
              </a>.
              As a result, your access has been restricted.
            </p>
            <p style={STYLES.paragraph}>
              You are no longer able to post, like, comment, or interact with content on Textmob.
            </p>
          </div>

          <div style={STYLES.section}>
            <div style={STYLES.sectionTitle}>How to appeal</div>
            <p style={STYLES.paragraph}>
              If you believe this was a mistake or would like to request reactivation, please reach out to our support team via WhatsApp:
            </p>
            <div style={STYLES.appealBox}>
              <div style={STYLES.appealTitle}>&#128172; Contact Support</div>
              <a href="https://wa.me/2347087421125?text=I%20want%20to%20appeal%20my%20suspended%20Textmob%20account" target="_blank" rel="noreferrer" style={STYLES.whatsappBtn}>
                <span style={{fontSize:20}}>&#128242;</span>
                07087421125
              </a>
              <a href="https://wa.me/2347050578132?text=I%20want%20to%20appeal%20my%20suspended%20Textmob%20account" target="_blank" rel="noreferrer" style={{...STYLES.whatsappBtn, marginBottom: 0}}>
                <span style={{fontSize:20}}>&#128242;</span>
                070505781322
              </a>
            </div>
          </div>
        </div>

        <div style={STYLES.footer}>
          &copy; 2026 Textmob. All rights reserved.
        </div>
      </div>
    </div>
  );
}

export default function AppWrapper({ children }) {
  const [authPrompt, setAuthPrompt] = useState({ show: false, message: '' });
  const [isDisabled, setIsDisabled] = useState(false);

  const username = (() => {
    try { return localStorage.getItem('currentUser'); }
    catch { return null; }
  })();

  useEffect(() => {
    if (username) {
      fetchProfile(username);
    }
  }, [username]);

  useEffect(() => {
    if (!username || username === 'undefined') return;

    const verifyUser = async () => {
      try {
        const [existsRes, disabledRes] = await Promise.all([
          apiFetch(`/api/verify-user?username=${encodeURIComponent(username)}`),
          apiFetch(`/api/check-disabled?username=${encodeURIComponent(username)}`)
        ]);

        if (existsRes.ok) {
          const existsData = await existsRes.json();
          if (existsData.exists === false) {
            // User no longer exists on the server — drop the session cleanly.
            localStorage.clear();
            try {
              if (!localStorage.getItem('pendingRedirect')) {
                localStorage.setItem('pendingRedirect', window.location.pathname + window.location.search);
              }
            } catch {}
            window.location.href = '/auth';
            return;
          }
        }

        if (disabledRes.ok) {
          const disabledData = await disabledRes.json();
          setIsDisabled(disabledData.disabled);
        }
      } catch (err) {
        console.error('Error verifying user:', err);
      }
    };

    verifyUser();
    const interval = setInterval(verifyUser, 10000);
    return () => clearInterval(interval);
  }, [username]);

  useEffect(() => {
    window.showNotification = () => {};
    window.showAuthPrompt = (message) => {
      setAuthPrompt({ show: true, message: message || '' });
    };
  }, []);

  // 300 users celebration — only on home page
  useEffect(() => {
    if (window.location.pathname === '/') {
      showCelebration();
    }
  }, []);

  if (isDisabled) return <DisabledScreen />;

  return (
    <SnapUploadProvider>
      <NotificationBanner username={username} />
      {children}
      {username && <SaveCredentialsBanner />}
      <AuthPromptModal
        show={authPrompt.show}
        message={authPrompt.message}
        onCancel={() => setAuthPrompt({ show: false, message: '' })}
        onLogin={() => { setAuthPrompt({ show: false, message: '' }); try { if (!localStorage.getItem('pendingRedirect')) localStorage.setItem('pendingRedirect', window.location.pathname + window.location.search); } catch {} window.Lexum?.navigate('/auth'); }}
      />
    </SnapUploadProvider>
  );
}