// client/src/firebase.js
import { initializeApp } from 'firebase/app';
import { getMessaging, getToken, onMessage } from 'firebase/messaging';

const firebaseConfig = {
  apiKey: "AIzaSyCoFnh4agwRkoPLUsUlpTFK-U6Tsf6aRrA",
  authDomain: "genace-pro.firebaseapp.com",
  projectId: "genace-pro",
  storageBucket: "genace-pro.firebasestorage.app",
  messagingSenderId: "1092149307036",
  appId: "1:1092149307036:web:975c8645da85aee3c46f59",
  measurementId: "G-CN50XLFB7R"
};

const app = initializeApp(firebaseConfig);
export const messaging = getMessaging(app);

const API_BASE_URL = import.meta.env.VITE_API_URL || (
  window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? 'http://localhost:3000'
    : 'https://louda-uyxg.onrender.com'
);

export const requestPushPermission = async (userId) => {
  console.log('[FCM] Starting requestPushPermission for userId:', userId);
  try {
    const permission = await Notification.requestPermission();
    console.log('[FCM] Notification permission status:', permission);
    if (permission === 'granted') {
      console.log('[FCM] Registering service worker /sw.js...');
      const registration = await navigator.serviceWorker.register('/sw.js');
      console.log('[FCM] Service worker registered. Fetching FCM token...');
      
      const token = await getToken(messaging, { 
        vapidKey: 'BLruGxGswmmxVjoeAl-LiFrJhtNYK6kitDzJDaHZ7GGcahaWxaSXo8IVfRJkihlBMuPv2IsVpR1p_mLcyLQWWuA',
        serviceWorkerRegistration: registration 
      });
      console.log('[FCM] Obtained FCM device token:', token);
      
      // Cache token locally so onboarding forms can submit it during signup
      localStorage.setItem('fcm_token', token);

      if (!userId || userId === 'temp-onboarding' || userId.includes('temp')) {
        console.log('[FCM] Skipping backend registration for temporary/non-existent user ID:', userId);
        return true;
      }

      console.log('[FCM] Sending token to backend POST /api/user/fcm-token...');
      const response = await fetch(`${API_BASE_URL}/api/user/fcm-token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, fcmToken: token })
      });
      const data = await response.json();
      console.log('[FCM] Backend save token response:', data);
      return data.success === true;
    } else {
      console.warn('[FCM] Notification permission not granted:', permission);
    }
  } catch (error) {
    console.error('[FCM] Push permission error in requestPushPermission:', error);
  }
  return false;
};

export const listenForForegroundMessages = (callback) => {
  return onMessage(messaging, (payload) => { callback(payload); });
};
