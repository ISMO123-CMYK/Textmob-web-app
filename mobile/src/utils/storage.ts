import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const KEYS = {
  AUTH_TOKEN: 'auth_token',
  CURRENT_USER: 'currentUser',
  DARK_MODE: 'darkMode',
  ONBOARDING_SEEN: 'onboarding_seen',
  CACHED_PROFILE_PIC: 'cached_profile_pic',
  SAVED_ACCOUNTS: 'textmobSavedAccounts',
  BLOCKED_USERS: 'textmobBlockedUsers',
  CREDENTIALS_BANNER_DISMISSED: 'credentialsBannerDismissed',
  PENDING_CREDENTIALS: 'pendingCredentials',
  PENDING_REDIRECT: 'pendingRedirect',
  SEEN_FEATURES: 'seenFeatures',
  FEED_STATE: '__feedState',
  VIEWED_IDS: '__tmob_viewed_ids',
};

function withTimeout<T>(p: Promise<T>, ms: number, fallback: T): Promise<T> {
  let t: any;
  const timeout = new Promise<T>((resolve) => { t = setTimeout(() => resolve(fallback), ms); });
  return Promise.race([p.finally(() => clearTimeout(t)), timeout]);
}

export async function setSecure(key: string, value: string) {
  try {
    await withTimeout(SecureStore.setItemAsync(key, value), 1500, undefined as any);
  } catch {
    try { await AsyncStorage.setItem(key, value); } catch (e) { /* ignore */ }
  }
}

export async function getSecure(key: string): Promise<string | null> {
  try {
    const v = await withTimeout(SecureStore.getItemAsync(key), 1200, null as any);
    if (v !== null) return v;
    // timeout or null -> try AsyncStorage fallback quickly
    try { return await withTimeout(AsyncStorage.getItem(key), 500, null); } catch { return null; }
  } catch {
    try { return await withTimeout(AsyncStorage.getItem(key), 500, null); } catch { return null; }
  }
}

export async function removeSecure(key: string) {
  try {
    await SecureStore.deleteItemAsync(key);
  } catch {
    try { await AsyncStorage.removeItem(key); } catch (e) { /* ignore */ }
  }
}

export async function setStore(key: string, value: string) {
  try { await AsyncStorage.setItem(key, value); } catch (e) { /* ignore */ }
}

export async function getStore(key: string): Promise<string | null> {
  try { return await withTimeout(AsyncStorage.getItem(key), 1000, null); } catch { return null; }
}

export async function removeStore(key: string) {
  try { await AsyncStorage.removeItem(key); } catch (e) { /* ignore */ }
}

export async function clearStore() {
  try { await AsyncStorage.clear(); } catch (e) { /* ignore */ }
}

export async function getAllKeys(): Promise<string[]> {
  try { return await AsyncStorage.getAllKeys(); } catch { return []; }
}

export const storage = {
  KEYS,
  setSecure, getSecure, removeSecure,
  setStore, getStore, removeStore,
  clearStore,
  getAllKeys,
};
