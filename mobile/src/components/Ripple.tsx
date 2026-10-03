import React from 'react';
import { Platform, Pressable } from 'react-native';
import type { StyleProp, ViewStyle } from 'react-native';

// WhatsApp-style touch feedback: Android gets the native ripple (black on
// light surfaces, soft white on dark), iOS gets a pressed-opacity dim.
// Drop-in for TouchableOpacity — keeps `activeOpacity` as an accepted prop
// so call sites can be swapped mechanically.

type StyleFn = (state: { pressed: boolean }) => StyleProp<ViewStyle>;

type RippleProps = Omit<React.ComponentProps<typeof Pressable>, 'style'> & {
  style?: StyleProp<ViewStyle> | StyleFn;
  activeOpacity?: number;
  dark?: boolean;
  android_ripple?: React.ComponentProps<typeof Pressable>['android_ripple'];
};

export function Ripple({ style, activeOpacity = 0.7, dark = false, android_ripple, ...rest }: RippleProps) {
  const resolve: StyleFn = (state) => [
    typeof style === 'function' ? style(state) : style,
    state.pressed && Platform.OS !== 'android' && !rest.disabled
      ? { opacity: activeOpacity }
      : null,
  ];
  return (
    <Pressable
      accessibilityRole="button"
      {...rest}
      style={resolve}
      android_ripple={{
        color: dark ? 'rgba(255,255,255,0.16)' : 'rgba(0,0,0,0.18)',
        borderless: false,
        ...android_ripple,
      }}
    />
  );
}
