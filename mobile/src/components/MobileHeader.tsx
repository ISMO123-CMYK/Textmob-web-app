import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  View, Text, Image, TouchableOpacity, StyleSheet, AppState,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { getNotificationsAPI } from '../api/notifications';
import useProfileCache from '../hooks/useProfileCache';

interface MobileHeaderProps {
  navigation: any;
  title?: string;
  onSearchPress?: () => void;
  onActivityPress?: () => void;
  onMenuPress?: () => void;
}

export default function MobileHeader({
  navigation,
  title = 'textmob',
  onSearchPress,
  onActivityPress,
  onMenuPress,
}: MobileHeaderProps) {
  const { colors, isDark } = useTheme();
  const { username } = useAuth();
  const profile = useProfileCache(username || '');

  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const { on, off } = useSocket();
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

  // Initial fetch + poll every 30s (was 6s)
  useEffect(() => {
    if (!username) return;
    fetchUnreadCount();
    intervalRef.current = setInterval(fetchUnreadCount, 30000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [username, fetchUnreadCount]);

  // Pause polling when app is backgrounded
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (appStateRef.current.match(/inactive|background/) && state === 'active') {
        fetchUnreadCount();
      }
      appStateRef.current = state;
    });
    return () => sub.remove();
  }, [fetchUnreadCount]);

  // Live socket updates
  useEffect(() => {
    if (!username) return;
    const handleNewNotification = () => {
      fetchUnreadCount();
    };
    on('new-notification', handleNewNotification);
    on('notification', handleNewNotification);
    return () => {
      off('new-notification', handleNewNotification);
      off('notification', handleNewNotification);
    };
  }, [username, on, off, fetchUnreadCount]);

  const s = useMemo(() => makeStyles(colors, isDark), [colors, isDark]);

  return (
    <View style={[s.header, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
      {/* Left: Profile avatar button */}
      <TouchableOpacity
        onPress={() => navigation.navigate('Profile', { username })}
        style={s.profileBtn}
      >
        <Image source={{ uri: profile.profile_pic }} style={s.avatar} />
      </TouchableOpacity>

      {/* Center: Branding Logo */}
      <Text style={s.logo}>{title}</Text>

      {/* Right: Actions */}
      <View style={s.actions}>
        <TouchableOpacity
          onPress={onSearchPress || (() => navigation.navigate('Search'))}
          style={s.iconBtn}
        >
          <Ionicons name="search-outline" size={20} color={colors.textPrimary} />
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => navigation.navigate('Chats')}
          style={s.iconBtn}
        >
          <Ionicons name="chatbubbles-outline" size={20} color={colors.textPrimary} />
        </TouchableOpacity>

        <TouchableOpacity
          onPress={onActivityPress || (() => navigation.navigate('Activity'))}
          style={s.iconBtn}
        >
          <Ionicons name="notifications-outline" size={20} color={colors.textPrimary} />
          {unreadNotifications > 0 && (
            <View style={s.badge}>
              <Text style={s.badgeText}>{unreadNotifications}</Text>
            </View>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          onPress={onMenuPress || (() => navigation.navigate('Menu'))}
          style={s.iconBtn}
        >
          <Ionicons name="menu-outline" size={22} color={colors.textPrimary} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const makeStyles = (colors: any, isDark: boolean) => StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 56,
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  profileBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
  },
  avatar: {
    width: '100%',
    height: '100%',
  },
  logo: {
    fontSize: 20,
    fontWeight: '900',
    color: '#2563eb',
    letterSpacing: -0.8,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  iconBtn: {
    padding: 6,
    borderRadius: 20,
    position: 'relative',
  },
  badge: {
    position: 'absolute',
    top: 2,
    right: 2,
    minWidth: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#ef4444',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 2,
  },
  badgeText: {
    color: '#fff',
    fontSize: 8,
    fontWeight: '900',
  },
});
