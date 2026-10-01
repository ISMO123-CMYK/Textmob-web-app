import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Image,
  TouchableOpacity,
  Animated,
  Easing,
  StyleSheet,
} from 'react-native';
import { getOptimizedMediaUrl } from '../utils';
import { Icons } from '../icons';

// Port of LazyImage (LoudaApp.jsx:1187-1220) — IntersectionObserver replaced
// by immediate load with an animated pulse placeholder (native list rendering).
export function LazyImage({
  src,
  onPress,
  style,
  contentFit = 'cover',
}: {
  src: string;
  onPress?: () => void;
  style?: any;
  contentFit?: 'cover' | 'contain';
}) {
  const [isLoaded, setIsLoaded] = useState(false);
  const pulse = useRef(new Animated.Value(0.5)).current;

  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 700, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0.5, duration: 700, useNativeDriver: true }),
      ]),
    );
    anim.start();
    return () => anim.stop();
  }, [pulse]);

  return (
    <TouchableOpacity
      activeOpacity={0.85}
      disabled={!onPress}
      onPress={onPress}
      style={[s.wrap, style]}
    >
      {!isLoaded && (
        <Animated.View
          style={[StyleSheet.absoluteFill, s.placeholder, { opacity: pulse }]}
        />
      )}
      <Image
        source={{ uri: getOptimizedMediaUrl(src, 'image') }}
        style={StyleSheet.absoluteFill}
        resizeMode={contentFit}
        onLoad={() => setIsLoaded(true)}
      />
    </TouchableOpacity>
  );
}

// Port of JumpToLatest (LoudaApp.jsx:1223-1250)
export function JumpToLatest({
  visible,
  onPress,
}: {
  visible: boolean;
  onPress: () => void;
}) {
  if (!visible) return null;
  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={onPress}
      style={s.jump}
      hitSlop={8}
    >
      <Icons.chevronRight size={18} color="#4b5563" style={{ transform: [{ rotate: '90deg' }] }} />
    </TouchableOpacity>
  );
}

const s = StyleSheet.create({
  wrap: { overflow: 'hidden', backgroundColor: '#e5e7eb' },
  placeholder: { backgroundColor: '#d1d5db' },
  jump: {
    position: 'absolute',
    bottom: 96,
    alignSelf: 'center',
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
    zIndex: 20,
  },
});
