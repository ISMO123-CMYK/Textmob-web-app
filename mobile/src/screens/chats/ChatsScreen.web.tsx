import React from 'react';
import { View } from 'react-native';
import { useAuth } from '../../context/AuthContext';

export default function ChatsScreen() {
  const { username } = useAuth();
  const url = `https://louda.web.app/?from=textmob&userId=${encodeURIComponent(username || '')}`;

  return (
    <View style={{ flex: 1 }}>
      <iframe
        src={url}
        style={{ width: '100%', height: '100%', border: 'none' }}
        title="Chats"
      />
    </View>
  );
}
