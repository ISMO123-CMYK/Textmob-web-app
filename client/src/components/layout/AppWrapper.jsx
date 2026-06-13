import React, { useEffect, useState, useRef } from 'react';
import NotificationBanner from './NotificationBanner';
import { SnapUploadProvider } from '../../utils/SnapUploadContext';
import { fetchProfile } from '../../utils/useProfileCache';
import NotificationToast from '../ui/NotificationToast';
import { apiFetch } from '../../config/api';

export default function AppWrapper({ children }) {
  const [notifications, setNotifications] = useState([]);
  const lastNotifiedIds = useRef(new Set());
  
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
    window.showNotification = ({ title, message, type = 'info', duration = 5000, afterClose }) => {
      const id = Date.now() + Math.random();
      setNotifications((prev) => [...prev, { id, title, message, type }]);
      setTimeout(() => {
        setNotifications((prev) => prev.filter((n) => n.id !== id));
        if (afterClose) afterClose();
      }, duration);
    };
  }, []);

  // Polling for real-time notification toasts
  useEffect(() => {
    if (!username || username === 'undefined') return;

    async function poll() {
      try {
        const res = await apiFetch(`/get-notifications?username=${encodeURIComponent(username)}`);
        if (!res.ok) return;
        const list = await res.json();
        
        // Find new unread notifications
        const unread = list.filter(n => !n.read);
        unread.forEach(n => {
          const nid = String(n.id);
          if (!lastNotifiedIds.current.has(nid)) {
            // First time we see this unread notification ID, show toast
            window.showNotification?.({
              title: n.title || 'New Notification',
              message: n.message,
              type: 'info'
            });
            lastNotifiedIds.current.add(nid);
          }
        });

        // Cleanup: remove old IDs from set to keep it lean (optional, e.g. keep last 100)
        if (lastNotifiedIds.current.size > 200) {
            const arr = Array.from(lastNotifiedIds.current).slice(-100);
            lastNotifiedIds.current = new Set(arr);
        }
      } catch (err) {
        // Silently fail polling
      }
    }

    // Initial check and then every 7 seconds
    poll();
    const interval = setInterval(poll, 7000);
    return () => clearInterval(interval);
  }, [username]);

  return (
    <SnapUploadProvider>
      <NotificationBanner username={username} />
      {children}
      
      {/* Global Notification toasts */}
      <div className="fixed top-4 right-4 flex flex-col gap-2" style={{ zIndex: 9999 }}>
        {notifications.map((n) => (
          <NotificationToast 
            key={n.id} 
            {...n} 
            onClose={() => setNotifications((prev) => prev.filter((x) => x.id !== n.id))} 
          />
        ))}
      </div>
    </SnapUploadProvider>
  );
}
