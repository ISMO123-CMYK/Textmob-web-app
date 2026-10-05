import React, { useMemo } from 'react';
import {
  View, Text, Image, StyleSheet,
} from 'react-native';
import { Ripple } from './Ripple';
import Ionicons from '@expo/vector-icons/build/Ionicons';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import useProfileCache from '../hooks/useProfileCache';

interface MobileHeaderProps {
  navigation: any;
  title?: string;
  onSearchPress?: () => void;
  onMenuPress?: () => void;
}

export default function MobileHeader({
  navigation,
  title = 'textmob',
  onSearchPress,
  onMenuPress,
}: MobileHeaderProps) {
  const { colors, isDark } = useTheme();
  const { username } = useAuth();
  const profile = useProfileCache(username || '');

  const s = useMemo(() => makeStyles(colors, isDark), [colors, isDark]);

  return (
    <View style={[s.header, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
      {/* Left: Profile avatar button */}
      <Ripple
        onPress={() => navigation.navigate('Profile', { username })}
        style={s.profileBtn}
      >
        <Image source={{ uri: profile.profile_pic }} style={s.avatar} />
      </Ripple>

      {/* Center: Branding Logo */}
      <Ripple onPress={() => navigation.navigate('HomeLauncher')} activeOpacity={0.7}>
        <Text style={s.logo}>{title}</Text>
      </Ripple>

      {/* Right: Actions */}
      <View style={s.actions}>
        <Ripple
          onPress={onSearchPress || (() => navigation.navigate('Search'))}
          style={s.iconBtn}
        >
          <Ionicons name="search-outline" size={20} color={colors.textPrimary} />
        </Ripple>

        <Ripple
          onPress={() => navigation.navigate('HallOfFame')}
          style={s.iconBtn}
        >
          <Ionicons name="trophy-outline" size={20} color={colors.textPrimary} />
        </Ripple>

        <Ripple
          onPress={onMenuPress || (() => navigation.navigate('Menu'))}
          style={s.iconBtn}
        >
          <Ionicons name="menu-outline" size={22} color={colors.textPrimary} />
        </Ripple>
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
});
