import React, { useEffect, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { BackHandler } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
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

SplashScreen.preventAutoHideAsync();

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
      SplashScreen.hideAsync();
      initTracking();
    }
  }, [appReady]);

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
    <NavigationContainer ref={navigationRef} linking={linking}>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      {user ? <RootNavigator /> : <AuthStack />}
      {hasShareIntent && (
        <ShareToTextmobScreen intent={shareIntent} onDone={resetShareIntent} />
      )}
    </NavigationContainer>
  );
}

export default function App() {
  return (
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
  );
}


