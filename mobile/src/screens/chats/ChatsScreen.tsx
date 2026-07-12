import React from 'react';
import { View, ActivityIndicator } from 'react-native';
import { WebView } from 'react-native-webview';
import { useAuth } from '../../context/AuthContext';

export default function ChatsScreen() {
  const { username } = useAuth();
  const url = `https://louda.web.app/?from=textmob&userId=${encodeURIComponent(username || '')}`;

  return (
    <View style={{ flex: 1 }}>
      <WebView
        source={{ uri: url }}
        style={{ flex: 1 }}
        startInLoadingState
        renderLoading={() => (
          <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' }}>
            <ActivityIndicator size="large" color="#2563eb" />
          </View>
        )}
      />
    </View>
  );
}
