import React, { memo, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  LayoutChangeEvent,
} from 'react-native';
import { Ripple } from '../../components/Ripple';
import {
  createVideoPlayer,
  VideoView,
  type VideoPlayer as VideoPlayerInstance,
} from 'expo-video';
import { useLoudaTheme } from './primitives';
import { Icons } from '../icons';
import { getOptimizedMediaUrl } from '../utils';

const fmt = (s: number) => {
  if (!s || isNaN(s)) return '0:00';
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${String(sec).padStart(2, '0')}`;
};

// Port of VideoPlayer (LoudaApp.jsx:199-305)
export const VideoPlayer = memo(function VideoPlayer({
  src,
  autoPlay = false,
  previewMode = false,
  onPress,
  style,
}: {
  src: string;
  autoPlay?: boolean;
  previewMode?: boolean;
  onPress?: () => void;
  style?: any;
}) {
  const { p } = useLoudaTheme();
  const [playing, setPlaying] = useState(autoPlay && !previewMode);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [muted, setMuted] = useState(false);
  const [barWidth, setBarWidth] = useState(1);
  const [player, setPlayer] = useState<VideoPlayerInstance | null>(null);
  const [showControls, setShowControls] = useState(true);
  const playerRef = useRef<VideoPlayerInstance | null>(null);
  const hideTimerRef = useRef<any>(null);

  // Controls auto-hide after 2.5s while playing (LoudaApp.jsx:226-233)
  const bumpControls = () => {
    setShowControls(true);
    if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    if (playerRef.current?.playing) {
      hideTimerRef.current = setTimeout(() => setShowControls(false), 2500);
    }
  };

  useEffect(() => {
    if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    if (playing && !previewMode) {
      hideTimerRef.current = setTimeout(() => setShowControls(false), 2500);
    } else {
      setShowControls(true);
    }
    return () => {
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    };
  }, [playing, previewMode]);

  useEffect(() => {
    const pl = createVideoPlayer(getOptimizedMediaUrl(src, 'video'));
    playerRef.current = pl;
    pl.muted = muted;
    try {
      pl.timeUpdateEventInterval = 0.5;
    } catch {}
    const subs = [
      pl.addListener('timeUpdate', () => {
        setProgress(pl.duration ? (pl.currentTime / pl.duration) * 100 : 0);
      }),
      pl.addListener('statusChange', () => {
        setDuration(pl.duration || 0);
        setPlaying(pl.playing);
      }),
      pl.addListener('playToEnd', () => {
        setPlaying(false);
        setProgress(0);
        pl.currentTime = 0;
      }),
    ];
    setPlayer(pl);
    if (autoPlay && !previewMode) {
      try {
        pl.play();
      } catch {
        setPlaying(false);
      }
    }
    return () => {
      subs.forEach((sub) => sub.remove());
      pl.pause();
      setPlayer(null);
      playerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [src]);

  // React to autoPlay prop changes (LoudaApp.jsx:209-224 deps) — plays the
  // page the user swiped to and pauses the one they left
  useEffect(() => {
    const pl = playerRef.current;
    if (!pl || previewMode) return;
    if (autoPlay) {
      try {
        pl.play();
        setPlaying(true);
      } catch {
        setPlaying(false);
      }
    } else {
      try {
        pl.pause();
      } catch {}
      setPlaying(false);
    }
  }, [autoPlay, previewMode, player]);

  const togglePlay = () => {
    if (previewMode) {
      onPress?.();
      return;
    }
    const pl = playerRef.current;
    if (!pl) return;
    if (playing) {
      try {
        pl.pause();
      } catch {
        /* noop */
      }
      setPlaying(false);
    } else {
      try {
        pl.play();
        setPlaying(true);
      } catch {
        setPlaying(false);
      }
    }
    bumpControls();
  };

  const seek = (e: { nativeEvent: { locationX: number } }) => {
    if (previewMode) return;
    const player = playerRef.current;
    if (!player || !duration) return;
    const { locationX } = e.nativeEvent;
    const pct = Math.max(0, Math.min(1, locationX / Math.max(1, barWidth)));
    player.currentTime = pct * duration;
    setProgress(pct * 100);
    bumpControls();
  };

  const toggleMute = () => {
    const player = playerRef.current;
    if (!player) return;
    player.muted = !player.muted;
    setMuted(player.muted);
    bumpControls();
  };

  return (
    <Pressable
      onPress={previewMode ? onPress : togglePlay}
      style={[s.wrap, style]}
    >
      {player ? (
        <VideoView
          player={player}
          style={StyleSheet.absoluteFill}
          contentFit="contain"
          nativeControls={false}
          fullscreenOptions={{ enable: false }}
        />
      ) : null}

      <View style={s.watermark} pointerEvents="none">
        <Text style={s.watermarkText}>TEXTMOB</Text>
      </View>

      {previewMode ? (
        <View style={s.previewOverlay} pointerEvents="none">
          <View style={[s.playCircle, { backgroundColor: p.accent }]}>
            <Icons.play size={26} color="#fff" />
          </View>
        </View>
      ) : (
        <View
          style={[
            s.controls,
            !showControls && { opacity: 0 },
          ]}
          pointerEvents={showControls ? 'box-none' : 'none'}
        >
          {!playing && (
            <View style={s.centerPlay} pointerEvents="none">
              <View style={[s.playCircle, { backgroundColor: p.accent }]}>
                <Icons.play size={26} color="#fff" />
              </View>
            </View>
          )}
          {/* Absorbs taps on the control bar padding so they don't toggle
              playback (web stopPropagation on the control container) */}
          <Pressable style={s.bottomControls} onPress={bumpControls}>
            <Pressable
              onPress={seek}
              onLayout={(e) => setBarWidth(e.nativeEvent.layout.width)}
              style={s.progressHit}
            >
              <View style={[s.progressTrack, { backgroundColor: 'rgba(255,255,255,0.3)' }]}>
                <View
                  style={[
                    s.progressFill,
                    { width: `${progress}%`, backgroundColor: p.accent },
                  ]}
                />
              </View>
            </Pressable>
            <View style={s.controlRow}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <Ripple onPress={togglePlay} hitSlop={8}>
                  {playing ? (
                    <Icons.pause size={18} color="#fff" />
                  ) : (
                    <Icons.play size={18} color="#fff" />
                  )}
                </Ripple>
                <Text style={s.timeText}>
                  {fmt((progress / 100) * duration)} / {fmt(duration)}
                </Text>
              </View>
              <Ripple onPress={toggleMute} hitSlop={8}>
                <Text style={[s.volText, muted && { color: '#f87171', textDecorationLine: 'line-through' }]}>
                  Vol
                </Text>
              </Ripple>
            </View>
          </Pressable>
        </View>
      )}
    </Pressable>
  );
});

const s = StyleSheet.create({
  wrap: {
    width: '100%',
    height: '100%',
    backgroundColor: '#000',
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  watermark: {
    position: 'absolute',
    top: 16,
    left: 16,
    opacity: 0.5,
  },
  watermarkText: {
    color: '#fff',
    fontWeight: '900',
    letterSpacing: -0.5,
    fontSize: 14,
  },
  previewOverlay: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.2)',
  },
  playCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.35,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  controls: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0,0,0,0.15)',
    justifyContent: 'flex-end',
  },
  centerPlay: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bottomControls: {
    padding: 16,
    gap: 12,
  },
  progressHit: { width: '100%', paddingVertical: 6 },
  progressTrack: {
    width: '100%',
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: { height: '100%', borderRadius: 4 },
  controlRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  timeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
    fontFamily: 'monospace',
    textShadowColor: 'rgba(0,0,0,0.6)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  volText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
});
