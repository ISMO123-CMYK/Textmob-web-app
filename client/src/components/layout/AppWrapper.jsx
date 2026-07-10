import React, { useEffect, useState } from 'react';
import NotificationBanner from './NotificationBanner';
import { SnapUploadProvider } from '../../utils/SnapUploadContext';
import { fetchProfile } from '../../utils/useProfileCache';
import AuthPromptModal from '../ui/AuthPromptModal';

export default function AppWrapper({ children }) {
  const [authPrompt, setAuthPrompt] = useState({ show: false, message: '' });
  
  const username = (() => {
    try { return localStorage.getItem('currentUser'); }
    catch { return null; }
  })();

  useEffect(() => {
    if (username) {
        fetchProfile(username);
    }
  }, [username]);

  // Background verification to ensure currentUser still exists in database
  useEffect(() => {
    if (!username || username === 'undefined') return;

    const verifyUser = async () => {
      try {
        const res = await apiFetch(`/api/verify-user?username=${encodeURIComponent(username)}`);
        if (res.ok) {
          const data = await res.json();
          if (data.exists === false) {
            console.warn(`User ${username} not found in database. Clearing local storage.`);
            localStorage.clear();
            window.location.href = '/auth';
          }
        }
      } catch (err) {
        // Silently handle error, maybe network issue
        console.error('Error verifying user:', err);
      }
    };

    verifyUser();
  }, [username]);

  useEffect(() => {
    window.showNotification = () => {};
    window.showAuthPrompt = (message) => {
      setAuthPrompt({ show: true, message: message || '' });
    };
  }, []);

  return (
    <SnapUploadProvider>
      <NotificationBanner username={username} />
      {children}
      
      {/* Global Auth Prompt Modal */}
      <AuthPromptModal
        show={authPrompt.show}
        message={authPrompt.message}
        onCancel={() => setAuthPrompt({ show: false, message: '' })}
        onLogin={() => { setAuthPrompt({ show: false, message: '' }); window.Lexum?.navigate('/auth'); }}
      />
    </SnapUploadProvider>
  );
}
