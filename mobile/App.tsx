import 'react-native-gesture-handler';
import React, { useEffect, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { BackHandler, Alert } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import * as SplashScreen from 'expo-splash-screen';
import { useShareIntent } from 'expo-share-intent';
import { AuthProvider, useAuth } from './src/context/AuthContext';
import { ThemeProvider, useTheme } from './src/context/ThemeContext';
import { SocketProvider } from './src/context/SocketContext';
import { UploadProgressProvider } from './src/context/UploadProgressContext';
import { UpdateProvider } from './src/context/UpdateContext';
import { initTracking } from './src/utils/analytics';
import { initPushNotifications, registerForPushNotificationsAsync } from './src/louda/push';
import AuthStack from './src/navigation/AuthStack';
import RootNavigator from './src/navigation/RootNavigator';
import ShareToTextmobScreen from './src/screens/share/ShareToTextmobScreen';
import { navigationRef, linking } from './src/navigation/navigationRef';
import { ErrorBoundary } from './src/components/ErrorBoundary';
import DisabledScreen from './src/components/DisabledScreen';
import { setLoudaAlertImpl } from './src/louda/utils';

// Louda's default alert shim only logs to the console, so every upload failure,
// denied permission and size-limit notice was invisible to the user. Route them
// to the native Alert once, at startup.
setLoudaAlertImpl(({ title, message } = {}) => {
  Alert.alert(title || '', message || '');
});

// Last line of defense: a stray fatal JS error must never white-screen the
// app. Render errors are already caught by ErrorBoundary above; this catches
// everything else (unhandled async, timers, socket callbacks). In dev we keep
// RN's default handler so the red box still appears while debugging.
const errorUtils: any = (globalThis as any).ErrorUtils;
if (errorUtils && typeof errorUtils.setGlobalHandler === 'function') {
  const previous = typeof errorUtils.getGlobalHandler === 'function' ? errorUtils.getGlobalHandler() : null;
  errorUtils.setGlobalHandler((error: any, isFatal?: boolean) => {
    console.error('[Textmob] Uncaught error', isFatal ? '(fatal)' : '', error);
    if (__DEV__ && previous) previous(error, isFatal);
  });
}

SplashScreen.preventAutoHideAsync().catch(() => {});

function AppNavigator() {
  const { user, isChecking, isDisabled } = useAuth();
  const { isDark } = useTheme();
  const [appReady, setAppReady] = useState(false);
  const { hasShareIntent, shareIntent, resetShareIntent } = useShareIntent();

  useEffect(() => {
    if (!isChecking) {
      setAppReady(true);
    }
  }, [isChecking]);

  useEffect(() => {
    if (appReady) {
      SplashScreen.hideAsync().catch(() => {});
      initTracking();
      initPushNotifications();
    }
  }, [appReady]);

  // The token is keyed by Textmob username — on a fresh install the start
  // prompt can fire before login, so register once auth resolves too.
  // Disabled accounts must never hold a device token (server also skips push
  // for them, this just stops the token being attached in the first place).
  useEffect(() => {
    if (user && !isDisabled) registerForPushNotificationsAsync().catch(() => {});
  }, [user, isDisabled]);

  // Failsafe: never block splash longer than 3.5s on any device (Knox/StrongBox slow)
  useEffect(() => {
    const t = setTimeout(() => setAppReady(true), 3500);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
      return false;
    });
    return () => backHandler.remove();
  }, []);

  if (isChecking || !appReady) {
    return null;
  }

  return (
    <ErrorBoundary>
      <NavigationContainer ref={navigationRef} linking={linking}>
        <StatusBar style={isDark ? 'light' : 'dark'} />
        {isDisabled ? <DisabledScreen /> : user ? <RootNavigator /> : <AuthStack />}
        {!isDisabled && hasShareIntent && (
          <ShareToTextmobScreen intent={shareIntent} onDone={resetShareIntent} />
        )}
      </NavigationContainer>
    </ErrorBoundary>
  );
}

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ThemeProvider>
          <AuthProvider>
            <SocketProvider>
              <UploadProgressProvider>
                <UpdateProvider>
                  <AppNavigator />
                </UpdateProvider>
              </UploadProgressProvider>
            </SocketProvider>
          </AuthProvider>
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}


