import React, { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { ActivityIndicator, View, StyleSheet, BackHandler, Alert } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider, useAuth } from './src/context/AuthContext';
import { ThemeProvider, useTheme } from './src/context/ThemeContext';
import { SocketProvider } from './src/context/SocketContext';
import AuthStack from './src/navigation/AuthStack';
import RootNavigator from './src/navigation/RootNavigator';

function AppNavigator() {
  const { user, isChecking } = useAuth();
  const { colors, isDark } = useTheme();

  useEffect(() => {
    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
      // Let React Navigation handle the back button natively.
      // This prevents the app from closing unexpectedly when there's
      // a screen to go back to. Return false to let default handling proceed.
      return false;
    });
    return () => backHandler.remove();
  }, []);

  if (isChecking) {
    return (
      <View style={[styles.loading, { backgroundColor: colors.background }]}>
        <StatusBar style={isDark ? 'light' : 'dark'} />
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      {user ? <RootNavigator /> : <AuthStack />}
    </NavigationContainer>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <AuthProvider>
          <SocketProvider>
            <AppNavigator />
          </SocketProvider>
        </AuthProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
