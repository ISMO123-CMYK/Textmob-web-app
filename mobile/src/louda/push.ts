// Push notifications (expo-notifications) — registration, foreground banner,
// tap/cold-start routing. Phase 2 of the push pipeline; server side lives in
// server.js (/register-token, /api/louda/message-notify, /api/push-opened).
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { API_BASE_URL } from '../api/client';
import { storage } from '../utils/storage';
import { navigationRef } from '../navigation/navigationRef';
import {
  getTextmobUser,
  getTextmobUserSync,
  openChatWith,
  openGroupChatWith,
} from './session';

const PROJECT_ID = 'cd3ed21d-7bd6-4b73-b893-1fbc3a9b67de';

let permissionGranted = false;
let initialized = false;

// Foreground: show banner + sound (replaces the in-chat socket beep).
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

// Socket beep mutes itself while push banners are active.
export function pushSoundEnabled(): boolean {
  return permissionGranted;
}

async function registerToken(): Promise<void> {
  try {
    const resp = await Notifications.getExpoPushTokenAsync({ projectId: PROJECT_ID });
    const token = resp && resp.data;
    const username = getTextmobUserSync() || (await getTextmobUser());
    if (!token || !username) return;
    fetch(`${API_BASE_URL}/register-token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, token, platform: Platform.OS }),
    }).catch(() => {});
  } catch (e) {
    console.warn('[Push] token registration failed', e);
  }
}

// Turns off push on the server (drops this device's token). Needed because
// neither OS lets an app revoke notification permission itself.
async function unregisterToken(): Promise<void> {
  try {
    const resp = await Notifications.getExpoPushTokenAsync({ projectId: PROJECT_ID });
    const token = resp && resp.data;
    const username = getTextmobUserSync() || (await getTextmobUser());
    if (!token || !username) return;
    fetch(`${API_BASE_URL}/register-token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, token, platform: Platform.OS, enabled: false }),
    }).catch(() => {});
  } catch (e) {
    console.warn('[Push] token unregistration failed', e);
  }
}

export async function getPushPermission(): Promise<boolean> {
  try {
    const res: any = await Notifications.getPermissionsAsync();
    return res?.granted === true || res?.status === 'granted';
  } catch {
    return false;
  }
}

// Single on/off switch used by Textmob AND Louda.
export async function setPushEnabled(enabled: boolean): Promise<boolean> {
  permissionGranted = enabled;
  if (enabled) {
    return registerForPushNotificationsAsync();
  }
  await unregisterToken();
  return false;
}

// Prompts for permission when needed, then registers the Expo push token.
export async function registerForPushNotificationsAsync(): Promise<boolean> {
  try {
    if (Platform.OS === 'android') {
      // Do NOT pass sound:'default' — SDK 57 treats any string as a custom
      // raw resource and logs "Custom sound 'default' not found in native app".
      // Docs example omits `sound` entirely → channel uses the default sound.
      // Channels persist forever on Android, so delete/recreate once to drop
      // the sound we created earlier with the bad option.
      const migrated = await storage.getStore('messagesChannelSoundV2');
      if (!migrated) {
        try {
          await Notifications.deleteNotificationChannelAsync('messages');
        } catch {
          // channel may not exist yet
        }
        await storage.setStore('messagesChannelSoundV2', '1');
      }
      await Notifications.setNotificationChannelAsync('messages', {
        name: 'Messages',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#2563eb',
      });
    }
    const current: any = await Notifications.getPermissionsAsync();
    let granted = current?.granted === true || current?.status === 'granted';
    if (!granted) {
      const req: any = await Notifications.requestPermissionsAsync();
      granted = req?.granted === true || req?.status === 'granted';
    }
    permissionGranted = granted;
    if (granted) await registerToken();
    return granted;
  } catch (e) {
    console.warn('[Push] permission request failed', e);
    return false;
  }
}

async function markPushOpened(pushId: string) {
  try {
    await fetch(`${API_BASE_URL}/api/push-opened`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: pushId }),
    });
  } catch (e) {
    // opening a chat must never fail because of receipt reporting
  }
}

function whenNavigationReady(cb: () => void) {
  let attempts = 0;
  const go = () => {
    if (!navigationRef.isReady()) {
      if (++attempts < 25) setTimeout(go, 400); // cold start: container not mounted yet
      return;
    }
    cb();
  };
  go();
}

// Mirrors ActivityScreen.handleNavigate — link paths land on the same screens.
function routeTextmobNotification(data: any) {
  const path = String(data.link || '');
  if (path.startsWith('/post/')) navigationRef.navigate('PostDetail', { postId: path.replace('/post/', '') });
  else if (path.startsWith('/@')) navigationRef.navigate('Profile', { username: path.replace('/@', '') });
  else if (path.startsWith('/snaps')) navigationRef.navigate('Snaps');
  else if (path.startsWith('/chats')) navigationRef.navigate('Chats');
  else if (path.startsWith('/halloffame')) navigationRef.navigate('HallOfFame');
  else if (path.startsWith('/wallet')) navigationRef.navigate('Wallet');
  else if (path.startsWith('/accountscenter')) navigationRef.navigate('AccountsCenter');
  else if (path.startsWith('/search')) navigationRef.navigate('Search');
  else if (path.startsWith('/make-post')) {
    const quoteId = path.split('=')[1];
    navigationRef.navigate('CreatePost', quoteId ? { quotePostId: quoteId } : undefined);
  } else {
    navigationRef.navigate('Activity'); // default: the notifications list
  }
}

function handlePushOpen(raw: any) {
  const data = (raw || {}) as any;
  try {
    if (data.pushId) markPushOpened(String(data.pushId));

    if (data.type === 'louda') {
      whenNavigationReady(() => {
        navigationRef.navigate('Chats');
        if (data.isGroup && data.peerId) openGroupChatWith(String(data.peerId));
        else if (data.peerUsername) openChatWith(String(data.peerUsername));
      });
      return;
    }

    whenNavigationReady(() => routeTextmobNotification(data));
  } catch (e) {
    console.warn('[Push] open routing failed', e);
  }
}

// Call once from App.tsx after the app is ready.
export function initPushNotifications() {
  if (initialized) return;
  initialized = true;

  Notifications.addNotificationResponseReceivedListener((resp) => {
    handlePushOpen(resp.notification.request.content.data);
  });
  Notifications.getLastNotificationResponseAsync()
    .then((resp) => {
      if (resp) handlePushOpen(resp.notification.request.content.data);
    })
    .catch(() => {});

  // Ask on app start: the OS dialog shows the first time (never again after
  // grant/deny); if already granted it just re-registers the token silently.
  // One token feeds BOTH Louda messages and Textmob activity pushes — the
  // server keeps them in users.userType keyed by Textmob username.
  registerForPushNotificationsAsync().catch(() => {});
}
