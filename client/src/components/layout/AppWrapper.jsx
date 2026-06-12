import React, { useEffect } from 'react';
import NotificationBanner from './NotificationBanner';
import { SnapUploadProvider } from '../../utils/SnapUploadContext';
import { fetchProfile } from '../../utils/useProfileCache';

export default function AppWrapper({ children }) {
  const username = (() => {
    try { return localStorage.getItem('currentUser'); }
    catch { return null; }
  })();

  useEffect(() => {
    if (username) {
        fetchProfile(username);
    }
  }, [username]);

  return (
    <SnapUploadProvider>
      <NotificationBanner username={username} />
      {children}
    </SnapUploadProvider>
  );
}
