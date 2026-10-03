import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  Keyboard,
  BackHandler,
} from 'react-native';
import { Ripple } from '../../components/Ripple';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Icons } from '../icons';

// Reusable in-app camera (extracted from StatusCamera) replacing the system
// camera launcher (expo-image-picker) everywhere — the system camera could
// not record video on Android and flashed black inside this stack.
// Modes: 'both' = tap photo / hold video (WhatsApp), 'photo' = tap photo,
// 'video' = tap start / tap stop.
// Mounted as an absolute-fill overlay (NOT a Modal — CameraView-in-Modal can
// render black on Android) at a screen root, with zIndex above all siblings.

export type InAppCapture = {
  uri: string;
  fileName: string;
  mimeType: string;
  type: 'image' | 'video';
  fileSize?: number;
};

const HOLD_TO_RECORD_MS = 300;

export function InAppCamera({
  mode = 'both',
  maxVideoSeconds,
  hint,
  filePrefix = 'camera',
  onCapture,
  onCancel,
}: {
  mode?: 'photo' | 'video' | 'both';
  maxVideoSeconds?: number;
  hint?: string;
  filePrefix?: string;
  onCapture: (file: InAppCapture) => void;
  onCancel: () => void;
}) {
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<CameraView>(null);
  const [facing, setFacing] = useState<'back' | 'front'>('back');
  const [recording, setRecording] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [busy, setBusy] = useState(false);
  const holdTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const recordingRef = useRef(false);
  const finishedRef = useRef(false);
  const onCancelRef = useRef(onCancel);
  onCancelRef.current = onCancel;

  // Keyboard would sit on top of the shutter — dismiss + block Android back
  // (back should close the camera, not pop the screen underneath).
  useEffect(() => {
    Keyboard.dismiss();
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (!finishedRef.current) onCancelRef.current();
      return true;
    });
    return () => sub.remove();
  }, []);

  const onCaptureRef = useRef(onCapture);
  onCaptureRef.current = onCapture;

  const finish = useCallback((file: InAppCapture) => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    onCaptureRef.current(file);
  }, []);

  // Recording timer badge (1s ticks).
  useEffect(() => {
    if (!recording) return;
    const t = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, [recording]);

  const startRecording = useCallback(async () => {
    const cam = cameraRef.current;
    if (!cam || recordingRef.current || finishedRef.current) return;
    recordingRef.current = true;
    setRecording(true);
    setSeconds(0);
    try {
      const opts: any = {};
      if (maxVideoSeconds) opts.maxDuration = maxVideoSeconds;
      const video = await cam.recordAsync(opts);
      recordingRef.current = false;
      setRecording(false);
      if (video?.uri) {
        finish({
          uri: video.uri,
          fileName: `${filePrefix}_${Date.now()}.mp4`,
          mimeType: 'video/mp4',
          type: 'video',
        });
      }
    } catch (e) {
      console.warn('InAppCamera video record failed', e);
      recordingRef.current = false;
      setRecording(false);
    }
  }, [finish, filePrefix, maxVideoSeconds]);

  const stopRecording = useCallback(() => {
    // recordAsync's promise resolves in startRecording, which finishes the flow.
    cameraRef.current?.stopRecording();
  }, []);

  const takePhoto = useCallback(async () => {
    const cam = cameraRef.current;
    if (!cam || busy || finishedRef.current) return;
    setBusy(true);
    try {
      const photo = await cam.takePictureAsync({ quality: 0.8 });
      if (photo?.uri) {
        finish({
          uri: photo.uri,
          fileName: `${filePrefix}_${Date.now()}.jpg`,
          mimeType: 'image/jpeg',
          type: 'image',
        });
      }
    } catch (e) {
      console.warn('InAppCamera photo failed', e);
    } finally {
      setBusy(false);
    }
  }, [busy, finish, filePrefix]);

  // 'both': hold threshold separates photo (early release) from video.
  const onPressIn = useCallback(() => {
    if (mode !== 'both' || finishedRef.current || busy) return;
    if (holdTimer.current) clearTimeout(holdTimer.current);
    holdTimer.current = setTimeout(() => {
      holdTimer.current = null;
      startRecording();
    }, HOLD_TO_RECORD_MS);
  }, [mode, busy, startRecording]);

  const onPressOut = useCallback(() => {
    if (holdTimer.current) {
      clearTimeout(holdTimer.current);
      holdTimer.current = null;
      takePhoto(); // released before the hold threshold → still photo
      return;
    }
    if (recordingRef.current) stopRecording();
  }, [stopRecording, takePhoto]);

  // 'video': tap toggles record on/off (no hold needed).
  const onVideoPress = useCallback(() => {
    if (finishedRef.current || busy) return;
    if (recordingRef.current) stopRecording();
    else startRecording();
  }, [busy, startRecording, stopRecording]);

  useEffect(
    () => () => {
      if (holdTimer.current) clearTimeout(holdTimer.current);
      if (recordingRef.current) cameraRef.current?.stopRecording();
    },
    [],
  );

  // ─── Permission states ───
  if (!permission) {
    return (
      <View style={[s.fill, s.center, { backgroundColor: '#000' }]}>
        <ActivityIndicator color="#fff" />
      </View>
    );
  }
  if (!permission.granted) {
    return (
      <View style={[s.fill, s.center, { backgroundColor: '#000' }]}>
        <Icons.camera size={44} color="#9ca3af" />
        <Text style={s.permTitle}>Camera access needed</Text>
        <Text style={s.permSub}>Allow camera access to capture media</Text>
        <Ripple
          onPress={() => requestPermission()}
          activeOpacity={0.85}
          style={s.permBtn}
        >
          <Text style={s.permBtnText}>Grant access</Text>
        </Ripple>
        <Ripple
          onPress={() => onCancelRef.current()}
          activeOpacity={0.8}
          style={s.permCancel}
        >
          <Text style={s.permCancelText}>Not now</Text>
        </Ripple>
      </View>
    );
  }

  const mm = String(Math.floor(seconds / 60));
  const ss = String(seconds % 60).padStart(2, '0');
  const shutterHandler =
    mode === 'video'
      ? { onPress: onVideoPress }
      : mode === 'photo'
        ? { onPress: takePhoto }
        : { onPressIn, onPressOut };
  const hintText = hint
    ? hint
    : recording
      ? mode === 'video'
        ? 'Tap to stop'
        : 'Release to send'
      : mode === 'photo'
        ? 'Tap to take photo'
        : mode === 'video'
          ? 'Tap to start recording'
          : 'Tap to take photo · Hold for video';

  return (
    <View style={s.fill}>
      <CameraView ref={cameraRef} style={s.fill} facing={facing} animateShutter />

      {/* Top bar */}
      <View style={s.topBar} pointerEvents="box-none">
        <Ripple
          onPress={() => {
            if (!finishedRef.current) onCancelRef.current();
          }}
          style={s.topBtn}
          hitSlop={10}
          activeOpacity={0.7}
        >
          <Icons.x size={24} color="#fff" />
        </Ripple>
        <View style={{ flex: 1 }} />
        <Ripple
          onPress={() => setFacing((f) => (f === 'back' ? 'front' : 'back'))}
          style={s.topBtn}
          hitSlop={10}
          activeOpacity={0.7}
        >
          <Icons.refresh size={22} color="#fff" />
        </Ripple>
      </View>

      {/* Recording badge */}
      {recording && (
        <View style={s.recBadge}>
          <View style={s.recDot} />
          <Text style={s.recTime}>
            {mm}:{ss}
          </Text>
          {!!maxVideoSeconds && <Text style={s.recMax}>/ {maxVideoSeconds}s</Text>}
        </View>
      )}

      {/* Bottom controls */}
      <View style={s.bottomBar} pointerEvents="box-none">
        <Text style={s.hint}>{hintText}</Text>
        <View style={s.shutterRow}>
          <View style={s.sideSlot} />
          <Ripple
            activeOpacity={0.9}
            {...shutterHandler}
            style={[s.shutter, recording && s.shutterRec]}
            disabled={busy}
          >
            <View style={[s.shutterInner, recording && s.shutterInnerRec]} />
          </Ripple>
          <View style={s.sideSlot}>
            {busy && <ActivityIndicator color="#fff" />}
          </View>
        </View>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  fill: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: '#000', zIndex: 999 },
  center: { alignItems: 'center', justifyContent: 'center', padding: 32 },
  topBar: {
    position: 'absolute',
    top: 54,
    left: 16,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
  },
  topBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  recBadge: {
    position: 'absolute',
    top: 112,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
  },
  recDot: { width: 9, height: 9, borderRadius: 5, backgroundColor: '#ef4444' },
  recTime: { color: '#fff', fontSize: 14, fontWeight: '700' },
  recMax: { color: '#9ca3af', fontSize: 12 },
  bottomBar: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingBottom: 48 },
  hint: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 13,
    textAlign: 'center',
    marginBottom: 22,
  },
  shutterRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  sideSlot: { width: 72, alignItems: 'center' },
  shutter: {
    width: 76,
    height: 76,
    borderRadius: 38,
    borderWidth: 5,
    borderColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  shutterRec: { borderColor: '#ef4444' },
  shutterInner: { width: 58, height: 58, borderRadius: 29, backgroundColor: '#fff' },
  shutterInnerRec: {
    width: 30,
    height: 30,
    borderRadius: 6,
    backgroundColor: '#ef4444',
  },
  permTitle: { color: '#fff', fontSize: 18, fontWeight: '700', marginTop: 16 },
  permSub: { color: '#9ca3af', fontSize: 14, marginTop: 6, textAlign: 'center' },
  permBtn: {
    marginTop: 24,
    backgroundColor: '#E64A19',
    paddingHorizontal: 28,
    paddingVertical: 12,
    borderRadius: 999,
  },
  permBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  permCancel: { marginTop: 14, padding: 8 },
  permCancelText: { color: '#9ca3af', fontSize: 14 },
});
