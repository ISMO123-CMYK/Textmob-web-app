import React, { memo, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  LayoutChangeEvent,
} from 'react-native';
import { Ripple } from '../../components/Ripple';
import { createAudioPlayer, type AudioPlayer as AudioPlayerInstance } from 'expo-audio';
import { useLoudaTheme } from './primitives';
import { Icons } from '../icons';
import { getOptimizedMediaUrl } from '../utils';

const fmtTime = (s?: number) => {
  if (!s || isNaN(s)) return '0:00';
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec < 10 ? '0' : ''}${sec}`;
};

// Port of AudioPlayer (LoudaApp.jsx:80-197)
export const AudioPlayer = memo(function AudioPlayer({ src }: { src: string }) {
  const { p } = useLoudaTheme();
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [barWidth, setBarWidth] = useState(1);
  const playerRef = useRef<AudioPlayerInstance | null>(null);

  useEffect(() => {
    // Web zeroes state when src changes (LoudaApp.jsx:123-128)
    setPlaying(false);
    setProgress(0);
    setDuration(0);
    setCurrentTime(0);
    let player: AudioPlayerInstance | null = null;
    let sub: { remove: () => void } | null = null;
    try {
      player = createAudioPlayer({ uri: getOptimizedMediaUrl(src, 'audio') });
    } catch {
      setPlaying(false);
      return;
    }
    playerRef.current = player;
    sub = player.addListener('playbackStatusUpdate', (status) => {
      if (status.isLoaded) {
        setDuration(status.duration || 0);
        setCurrentTime(status.currentTime || 0);
        if (status.duration) {
          setProgress(((status.currentTime || 0) / status.duration) * 100);
        }
        setPlaying(status.playing);
        if ('didJustFinish' in status && (status as any).didJustFinish) {
          setPlaying(false);
          setProgress(0);
          setCurrentTime(0);
        }
      }
    });
    return () => {
      sub?.remove();
      try {
        player?.pause();
        player?.remove();
      } catch {}
      playerRef.current = null;
    };
  }, [src]);

  // Plain progress line — no waveform animation (per design decision).

  const toggle = () => {
    const player = playerRef.current;
    if (!player) return;
    if (playing) {
      try {
        player.pause();
      } catch {
        setPlaying(false);
      }
    } else {
      try {
        if (progress >= 100) player.seekTo(0);
        player.play();
        setPlaying(true);
      } catch {
        setPlaying(false);
      }
    }
  };

  const seek = (e: { nativeEvent: { locationX: number } }) => {
    const player = playerRef.current;
    if (!player || !duration) return;
    const { locationX } = e.nativeEvent;
    const pct = Math.max(0, Math.min(1, locationX / Math.max(1, barWidth)));
    player.seekTo(pct * duration);
    setProgress(pct * 100);
    setCurrentTime(pct * duration);
  };

  const activeColor = p.accent;

  return (
    <Ripple
      activeOpacity={1}
      onPress={() => {}}
      style={[s.wrap, { backgroundColor: 'rgba(255,255,255,0.4)' }]}
    >
      <Ripple
        activeOpacity={0.85}
        onPress={toggle}
        style={[s.playBtn, { backgroundColor: p.accent }]}
      >
        {playing ? (
          <Icons.pause size={16} color="#fff" />
        ) : (
          <Icons.play size={16} color="#fff" />
        )}
      </Ripple>

      <View style={{ flex: 1, minWidth: 0, maxWidth: '100%' }}>
        <Pressable
          onPress={seek}
          onLayout={(e) => setBarWidth(e.nativeEvent.layout.width)}
          style={s.trackHit}
          accessibilityLabel="Seek"
        >
          <View style={[s.track, { backgroundColor: 'rgba(0,0,0,0.14)' }]}>
            <View
              style={[
                s.trackFill,
                { width: `${Math.max(0, Math.min(100, progress))}%`, backgroundColor: activeColor },
              ]}
            />
            <View
              style={[
                s.trackKnob,
                { left: `${Math.max(0, Math.min(100, progress))}%`, backgroundColor: activeColor },
              ]}
            />
          </View>
        </Pressable>
        <View style={s.times}>
          <Text style={[s.timeText, { color: p.accent }]}>
            {fmtTime(currentTime)}
          </Text>
          <Text style={[s.timeText, { color: p.textMuted, fontWeight: '700' }]}>
            {fmtTime(duration)}
          </Text>
        </View>
      </View>
    </Ripple>
  );
});

const s = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 8,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(0,0,0,0.05)',
    width: '100%',
    maxWidth: '100%',
    minWidth: 0,
    flexGrow: 1,
    flexShrink: 1,
    overflow: 'hidden',
  },
  playBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
    flexShrink: 0,
  },
  trackHit: { height: 26, justifyContent: 'center' },
  track: {
    height: 4,
    borderRadius: 2,
    width: '100%',
    overflow: 'visible',
    justifyContent: 'center',
  },
  trackFill: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    borderRadius: 2,
  },
  trackKnob: {
    position: 'absolute',
    width: 10,
    height: 10,
    borderRadius: 5,
    marginLeft: -5,
    top: -3,
  },
  times: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
    marginTop: 2,
  },
  timeText: { fontSize: 10, fontWeight: '900', letterSpacing: 1 },
});
