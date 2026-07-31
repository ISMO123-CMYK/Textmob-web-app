import React, { useRef, useEffect } from 'react';
import { Animated, View, StyleSheet } from 'react-native';
import * as Haptics from 'expo-haptics';

/** Spring-based scale animation — returns an Animated.Value and a trigger fn */
export function useSpringScale(initial = 1) {
  const scale = useRef(new Animated.Value(initial)).current;
  const springTo = useCallback((to: number, config?: Partial<Animated.SpringAnimationConfig>) => {
    Animated.spring(scale, {
      toValue: to,
      useNativeDriver: true,
      friction: 3,
      tension: 200,
      ...config,
    }).start();
  }, [scale]);
  return { scale, springTo };
}

import { useCallback } from 'react';

/** Tap feedback: scale down then spring back + optional haptic */
export function useTapFeedback(haptic: 'light' | 'medium' | 'heavy' | 'none' = 'light') {
  const { scale, springTo } = useSpringScale(1);
  const tap = useCallback(() => {
    springTo(0.85, { friction: 4, tension: 300 });
    setTimeout(() => springTo(1), 80);
    if (haptic !== 'none') {
      const map = { light: Haptics.ImpactFeedbackStyle.Light, medium: Haptics.ImpactFeedbackStyle.Medium, heavy: Haptics.ImpactFeedbackStyle.Heavy };
      Haptics.impactAsync(map[haptic]);
    }
  }, [springTo, haptic]);
  return { scale, tap };
}

function SingleParticle({ angle, distance, color, size, delay }: { angle: number; distance: number; color: string; size: number; delay: number }) {
  const opacity = useRef(new Animated.Value(0)).current;
  const x = useRef(new Animated.Value(0)).current;
  const y = useRef(new Animated.Value(0)).current;
  const s = useRef(new Animated.Value(0.5)).current;

  useEffect(() => {
    const timer = setTimeout(() => {
      Animated.parallel([
        Animated.timing(opacity, { toValue: 1, duration: 100, useNativeDriver: true }),
        Animated.timing(x, { toValue: Math.cos(angle) * distance, duration: 500, useNativeDriver: true }),
        Animated.timing(y, { toValue: Math.sin(angle) * distance, duration: 500, useNativeDriver: true }),
        Animated.timing(s, { toValue: 0, duration: 500, useNativeDriver: true }),
      ]).start();
    }, delay);
    return () => clearTimeout(timer);
  }, []);

  return (
    <Animated.View
      style={{
        position: 'absolute', top: '50%', left: '50%', width: size, height: size, borderRadius: size / 2,
        backgroundColor: color,
        opacity,
        transform: [
          { translateX: x },
          { translateY: y },
          { scale: s },
        ],
      }}
    />
  );
}

/** Particle burst overlay — renders floating particles that fade out */
export function ParticleBurst({ color = '#ef4444', size = 6, count = 8 }: { color?: string; size?: number; count?: number }) {
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {Array.from({ length: count }, (_, i) => {
        const angle = (i / count) * Math.PI * 2;
        const dist = 25 + Math.random() * 20;
        return <SingleParticle key={i} angle={angle} distance={dist} color={color} size={size} delay={i * 15} />;
      })}
    </View>
  );
}
