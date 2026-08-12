import React, { createContext, useContext, useEffect, useRef, useState, ReactNode } from 'react';
import {
  Modal, View, Text, TouchableOpacity, ActivityIndicator, StyleSheet, Platform, Linking,
} from 'react-native';
import Constants from 'expo-constants';
import * as FileSystem from 'expo-file-system/legacy';
import * as IntentLauncher from 'expo-intent-launcher';
import { Ionicons } from '@expo/vector-icons';
import { apiGet } from '../api/client';
import { storage } from '../utils/storage';
import { useTheme } from './ThemeContext';

const SNOOZE_KEY = 'UPDATE_SNOOZE_UNTIL';
const SNOOZE_MS = 24 * 60 * 60 * 1000;
const APK_FILENAME = 'textmob-update.apk';
const GRANT_READ_URI_PERMISSION = 1;
const GRANT_WRITE_URI_PERMISSION = 2;

interface UpdateInfo {
  version: string;
  apk_url: string;
  notes: string;
  published_at: string | null;
  grace_days: number;
}

interface UpdateContextValue {
  updateInfo: UpdateInfo | null;
  forced: boolean;
}

const UpdateContext = createContext<UpdateContextValue>({ updateInfo: null, forced: false });

export function useUpdate() {
  return useContext(UpdateContext);
}

function compareVersions(a: string, b: string): number {
  const pa = (a || '').replace(/^v/i, '').split(/[.\-_]/).map((n) => parseInt(n, 10) || 0);
  const pb = (b || '').replace(/^v/i, '').split(/[.\-_]/).map((n) => parseInt(n, 10) || 0);
  const len = Math.max(pa.length, pb.length);
  for (let i = 0; i < len; i++) {
    const va = pa[i] || 0;
    const vb = pb[i] || 0;
    if (va !== vb) return va > vb ? 1 : -1;
  }
  return 0;
}

async function deleteStaleApk() {
  try {
    if (!FileSystem.cacheDirectory) return;
    const entries = await FileSystem.readDirectoryAsync(FileSystem.cacheDirectory);
    for (const name of entries) {
      if (name.endsWith('.apk')) {
        await FileSystem.deleteAsync(FileSystem.cacheDirectory + name, { idempotent: true }).catch(() => {});
      }
    }
  } catch {}
}

export function UpdateProvider({ children }: { children: ReactNode }) {
  const { colors, isDark } = useTheme();
  const accent = colors.primary;
  const [updateInfo, setUpdateInfo] = useState<UpdateInfo | null>(null);
  const [forced, setForced] = useState(false);
  const [visible, setVisible] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [installing, setInstalling] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const startedRef = useRef(false);

  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;

    if (Platform.OS === 'android') {
      deleteStaleApk();
    }

    (async () => {
      try {
        const localVersion = (Constants.expoConfig && Constants.expoConfig.version) || '';
        const res = await apiGet<UpdateInfo>('/api/app-version');
        if (!res.ok || !res.data || !res.data.version || !localVersion) return;
        if (compareVersions(res.data.version, localVersion) <= 0) return;

        const info = res.data;
        const graceDays = info.grace_days || 7;
        let isForced = false;
        if (info.published_at) {
          const deadline = new Date(info.published_at).getTime() + graceDays * 24 * 60 * 60 * 1000;
          isForced = Date.now() >= deadline;
        }

        if (!isForced) {
          try {
            const snooze = Number(await storage.getStore(SNOOZE_KEY)) || 0;
            if (Date.now() < snooze) return;
          } catch {}
        }

        setUpdateInfo(info);
        setForced(isForced);
        setVisible(true);
      } catch {}
    })();
  }, []);

  const dismiss = async () => {
    if (forced) return;
    setVisible(false);
    try {
      await storage.setStore(SNOOZE_KEY, String(Date.now() + SNOOZE_MS));
    } catch {}
  };

  const startUpdate = async () => {
    if (!updateInfo || downloading) return;
    const url = updateInfo.apk_url || '';
    if (!url) {
      setError('No download link available. Try again later.');
      return;
    }
    setDownloading(true);
    setError(null);
    setProgress(0);
    setInstalling(false);
    try {
      if (!FileSystem.cacheDirectory) throw new Error('No cache directory');
      const localUri = FileSystem.cacheDirectory + APK_FILENAME;
      await FileSystem.deleteAsync(localUri, { idempotent: true }).catch(() => {});

      const download = FileSystem.createDownloadResumable(
        url,
        localUri,
        {},
        (snapshot) => {
          if (snapshot.totalBytesExpectedToWrite > 0) {
            setProgress(snapshot.totalBytesWritten / snapshot.totalBytesExpectedToWrite);
          }
        }
      );
      const result = await download.downloadAsync();
      if (!result || (!result.uri && !(result as any).status)) throw new Error('Download failed');

      const info = await FileSystem.getInfoAsync(localUri);
      if (!info.exists || !info.size || info.size < 1024 * 1024) {
        throw new Error('Downloaded file is incomplete or invalid.');
      }

      setInstalling(true);
      const contentUri = await FileSystem.getContentUriAsync(localUri);
      const res = await IntentLauncher.startActivityAsync('android.intent.action.VIEW', {
        data: contentUri,
        flags: GRANT_READ_URI_PERMISSION | GRANT_WRITE_URI_PERMISSION,
        type: 'application/vnd.android.package-archive',
      });
      setDownloading(false);
      setInstalling(false);
      if (res?.resultCode === 0) {
        setError('The install did not complete. Try "Update now" again, or use "Download manually" below.');
      } else {
        setVisible(false);
      }
    } catch (err: any) {
      setDownloading(false);
      setInstalling(false);
      setVisible(true);
      const msg = err?.message || 'Update failed. Check your connection and try again.';
      setError(msg.startsWith('Error:') ? msg : `Update failed: ${msg}`);
    }
  };

  const downloadManually = async () => {
    if (!updateInfo?.apk_url) return;
    try {
      await Linking.openURL(updateInfo.apk_url);
    } catch {
      setError('Could not open the download link.');
    }
  };

  const deadlineDaysLeft = (() => {
    if (!updateInfo || !updateInfo.published_at) return null;
    const graceDays = updateInfo.grace_days || 7;
    const deadline = new Date(updateInfo.published_at).getTime() + graceDays * 24 * 60 * 60 * 1000;
    return Math.max(0, Math.ceil((deadline - Date.now()) / (24 * 60 * 60 * 1000)));
  })();

  return (
    <UpdateContext.Provider value={{ updateInfo, forced }}>
      {children}
      <Modal visible={visible} transparent animationType="fade" onRequestClose={dismiss}>
        <View style={styles.overlay}>
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.iconWrap}>
              <Ionicons name={forced ? 'alert-circle-outline' : 'download-outline'} size={26} color={accent} />
            </View>
            <Text style={[styles.title, { color: colors.textPrimary }]}>
              {forced ? 'Update required' : `New version ${updateInfo?.version} available`}
            </Text>
            {deadlineDaysLeft !== null && (
              <Text style={[styles.deadline, { color: forced && deadlineDaysLeft <= 0 ? '#ef4444' : colors.textSecondary }]}>
                {forced
                  ? deadlineDaysLeft <= 0
                    ? 'The update window has expired — you must update to continue.'
                    : `You have ${deadlineDaysLeft} day${deadlineDaysLeft === 1 ? '' : 's'} left to update.`
                  : `You have ${deadlineDaysLeft} day${deadlineDaysLeft === 1 ? '' : 's'} left before this update becomes required.`}
              </Text>
            )}
            {!!updateInfo?.notes && (
              <Text style={[styles.notes, { color: colors.textSecondary }]} numberOfLines={4}>
                {updateInfo.notes}
              </Text>
            )}

            {downloading ? (
              <View style={styles.progressWrap}>
                <View style={[styles.progressTrack, { backgroundColor: colors.border }]}>
                  <View style={[styles.progressFill, { width: `${Math.round(progress * 100)}%`, backgroundColor: accent }]} />
                </View>
                <Text style={[styles.progressText, { color: colors.textSecondary }]}>
                  {installing
                    ? 'Download complete — opening installer...'
                    : `Downloading ${Math.round(progress * 100)}%`}
                </Text>
              </View>
            ) : (
              <>
                {error && <Text style={styles.errorText}>{error}</Text>}
                <View style={styles.actions}>
                  {!forced && (
                    <TouchableOpacity onPress={dismiss} style={[styles.btn, styles.btnGhost, { borderColor: colors.border }]}>
                      <Text style={[styles.btnText, { color: colors.textSecondary }]}>Later</Text>
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity
                    onPress={startUpdate}
                    activeOpacity={0.85}
                    style={[styles.btn, { backgroundColor: accent }]}
                  >
                    <Text style={styles.btnPrimaryText}>Update now</Text>
                  </TouchableOpacity>
                </View>
                <TouchableOpacity onPress={downloadManually} style={styles.manualWrap}>
                  <Text style={[styles.manualText, { color: colors.textSecondary }]}>
                    Install not working? Download the APK manually
                  </Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </Modal>
    </UpdateContext.Provider>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    width: '100%',
    maxWidth: 380,
    borderRadius: 20,
    borderWidth: 1,
    padding: 22,
    alignItems: 'center',
  },
  iconWrap: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
    backgroundColor: 'rgba(37,99,235,0.12)',
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    textAlign: 'center',
  },
  deadline: {
    fontSize: 12,
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 17,
  },
  notes: {
    fontSize: 12.5,
    textAlign: 'center',
    marginTop: 12,
    lineHeight: 18,
  },
  progressWrap: {
    width: '100%',
    marginTop: 18,
  },
  progressTrack: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: 8,
    borderRadius: 4,
  },
  progressText: {
    fontSize: 11.5,
    textAlign: 'center',
    marginTop: 8,
    fontWeight: '600',
  },
  errorText: {
    color: '#ef4444',
    fontSize: 12.5,
    textAlign: 'center',
    marginTop: 12,
    lineHeight: 17,
  },
  actions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 20,
    width: '100%',
  },
  manualWrap: {
    marginTop: 14,
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  manualText: {
    fontSize: 11.5,
    textAlign: 'center',
    textDecorationLine: 'underline',
    fontWeight: '600',
  },
  btn: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnGhost: {
    borderWidth: 1,
  },
  btnText: {
    fontWeight: '700',
    fontSize: 14,
  },
  btnPrimaryText: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 14,
  },
});