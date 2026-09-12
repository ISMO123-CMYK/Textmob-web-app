import React, { useMemo } from 'react';
import { View } from 'react-native';
import { useAuth } from '../../context/AuthContext';

export default function ChatsScreen() {
  const { username } = useAuth();
  const url = `https://louda.web.app/?from=textmob&userId=${encodeURIComponent(username || '')}`;

  // Same framing trick as native: Louda only runs its full Textmob flow when
  // framed (window.self !== window.top). A nested srcDoc wrapper makes it
  // framed here too, mirroring textmob.web.app/chats on desktop.
  const srcDoc = useMemo(() => (
    `<!DOCTYPE html><html><head><meta name="viewport" content="width=device-width, initial-scale=1.0" />` +
    `<style>html,body{margin:0;padding:0;height:100%;background:#000;overflow:hidden}` +
    `iframe{position:fixed;inset:0;width:100%;height:100%;border:none;display:block}</style></head>` +
    `<body><iframe src="${url}" title="Louda" allow="camera; microphone; clipboard-read; clipboard-write; fullscreen"></iframe></body></html>`
  ), [url]);

  return (
    <View style={{ flex: 1 }}>
      <iframe
        srcDoc={srcDoc}
        style={{ width: '100%', height: '100%', border: 'none' }}
        title="Chats"
        allow="camera; microphone; clipboard-read; clipboard-write; fullscreen"
      />
    </View>
  );
}
