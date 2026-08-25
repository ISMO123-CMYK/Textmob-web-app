import 'react-native-gesture-handler';
import 'react-native-reanimated';
import React, { useEffect, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { BackHandler } from 'react-native';
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
import AuthStack from './src/navigation/AuthStack';
import RootNavigator from './src/navigation/RootNavigator';
import ShareToTextmobScreen from './src/screens/share/ShareToTextmobScreen';
import { navigationRef, linking } from './src/navigation/navigationRef';
import { ErrorBoundary } from './src/components/ErrorBoundary';

SplashScreen.preventAutoHideAsync().catch(() => {});

function AppNavigator() {
  const { user, isChecking } = useAuth();
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
    }
  }, [appReady]);

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
        {user ? <RootNavigator /> : <AuthStack />}
        {hasShareIntent && (
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


