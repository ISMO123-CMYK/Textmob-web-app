import React from 'react';
import NotificationBanner from './NotificationBanner';
import { SnapUploadProvider } from '../../utils/SnapUploadContext';

export default function AppWrapper({ children }) {
  const username = (() => {
    try { return localStorage.getItem('currentUser'); }
    catch { return null; }
  })();

  return (
    <SnapUploadProvider>
      <NotificationBanner username={username} />
      {children}
    </SnapUploadProvider>
  );
}
