import { useState, useEffect, useCallback, useRef } from 'react';
import { AppState } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { getNotificationsAPI } from '../api/notifications';
import { startLoudaUnreadBridge, subscribeLoudaUnread } from '../louda/unread';

export default function useNavBadges() {
  const { username } = useAuth();
  const { on, off } = useSocket();
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const [loudaUnread, setLoudaUnread] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const appStateRef = useRef(AppState.currentState);

  const fetchUnreadCount = useCallback(async () => {
    if (!username) return;
    try {
      const res = await getNotificationsAPI(username);
      if (res.ok && res.data) {
        setUnreadNotifications(res.data.filter(n => !n.read).length);
      }
    } catch (e) { /* ignore */ }
  }, [username]);

  useEffect(() => {
    if (!username) return;
    fetchUnreadCount();
    intervalRef.current = setInterval(fetchUnreadCount, 30000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [username, fetchUnreadCount]);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (appStateRef.current.match(/inactive|background/) && state === 'active') {
        fetchUnreadCount();
      }
      appStateRef.current = state;
    });
    return () => sub.remove();
  }, [fetchUnreadCount]);

  useEffect(() => {
    if (!username) return;
    const refresh = () => fetchUnreadCount();
    on('new-notification', refresh);
    on('notification', refresh);
    return () => {
      off('new-notification', refresh);
      off('notification', refresh);
    };
  }, [username, on, off, fetchUnreadCount]);

  // Louda message badge — app-lifetime bridge, never stopped here.
  useEffect(() => {
    startLoudaUnreadBridge();
    return subscribeLoudaUnread((snap) => setLoudaUnread(snap.messages));
  }, []);

  return { unreadNotifications, loudaUnread };
}
