import React, { useMemo, useRef } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { WebView } from 'react-native-webview';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../../context/AuthContext';

export default function ChatsScreen() {
  const { username } = useAuth();
  const navigation = useNavigation<any>();
  const webviewRef = useRef<any>(null);

  const loudaUrl = `https://louda.web.app/?from=textmob&userId=${encodeURIComponent(username || '')}`;

  // Louda only runs its full Textmob flow when it is FRAMED (it checks
  // `window.self !== window.top`). Loaded top-level it falls back to a degraded
  // "external" mode. Desktop works because textmob.web.app/chats iframes it, so
  // mirror that exactly: frame Louda inside a textmob.web.app-origin wrapper.
  const wrapperHtml = useMemo(() => `
<!DOCTYPE html>
<html>
<head>
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
<style>
html, body { margin: 0; padding: 0; height: 100%; background: #000; overflow: hidden; }
iframe { position: fixed; inset: 0; width: 100%; height: 100%; border: none; display: block; }
</style>
</head>
<body>
<iframe src="${loudaUrl}" title="Louda" allow="camera; microphone; clipboard-read; clipboard-write; fullscreen"></iframe>
<script>
window.addEventListener('message', function (e) {
  var d = e.data;
  var shouldClose = d === 'LOUDA_CLOSE' || d === 'CLOSE_IFRAME' ||
    (d && (d.type === 'LOUDA_CLOSE' || d.type === 'CLOSE_IFRAME' || d.type === 'LOUDA_DONE' ||
           d.action === 'close' || d.action === 'done'));
  if (shouldClose && window.ReactNativeWebView) {
    window.ReactNativeWebView.postMessage('LOUDA_CLOSE');
  }
});
</script>
</body>
</html>`, [loudaUrl]);

  const handleMessage = (event: any) => {
    if (event?.nativeEvent?.data === 'LOUDA_CLOSE') {
      if (navigation?.canGoBack?.()) navigation.goBack();
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#000' }}>
      <WebView
        ref={webviewRef}
        source={{ html: wrapperHtml, baseUrl: 'https://textmob.web.app/' }}
        originWhitelist={['*']}
        style={{ flex: 1, backgroundColor: '#000' }}
        javaScriptEnabled
        domStorageEnabled
        allowsInlineMediaPlayback
        mediaPlaybackRequiresUserAction={false}
        thirdPartyCookiesEnabled
        sharedCookiesEnabled
        startInLoadingState
        renderLoading={() => (
          <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center', backgroundColor: '#000' }}>
            <ActivityIndicator size="large" color="#2563eb" />
          </View>
        )}
        onMessage={handleMessage}
      />
    </View>
  );
}
