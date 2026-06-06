import React from 'react';
import NotificationBanner from './NotificationBanner';

export default function AppWrapper({ children }) {
  const username = (() => {
    try { return localStorage.getItem('currentUser'); }
    catch { return null; }
  })();

  return (
    <>
      <NotificationBanner username={username} />
      {children}
    </>
  );
}
