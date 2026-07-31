import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const KEYS = {
  AUTH_TOKEN: 'auth_token',
  CURRENT_USER: 'currentUser',
  DARK_MODE: 'darkMode',
  ONBOARDING_SEEN: 'onboarding_seen',
  CACHED_PROFILE_PIC: 'cached_profile_pic',
  SAVED_ACCOUNTS: 'textmobSavedAccounts',
  SEEN_FEATURES: 'seenFeatures',
  FEED_STATE: '__feedState',
  VIEWED_IDS: '__tmob_viewed_ids',
};

export async function setSecure(key: string, value: string) {
  try {
    await SecureStore.setItemAsync(key, value);
  } catch {
    try { await AsyncStorage.setItem(key, value); } catch { }
  }
}

export async function getSecure(key: string): Promise<string | null> {
  try {
    return await SecureStore.getItemAsync(key);
  } catch {
    try { return await AsyncStorage.getItem(key); } catch { return null; }
  }
}

export async function removeSecure(key: string) {
  try {
    await SecureStore.deleteItemAsync(key);
  } catch {
    try { await AsyncStorage.removeItem(key); } catch { }
  }
}

export async function setStore(key: string, value: string) {
  try { await AsyncStorage.setItem(key, value); } catch { }
}

export async function getStore(key: string): Promise<string | null> {
  try { return await AsyncStorage.getItem(key); } catch { return null; }
}

export async function removeStore(key: string) {
  try { await AsyncStorage.removeItem(key); } catch { }
}

export async function clearStore() {
  try { await AsyncStorage.clear(); } catch { }
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
