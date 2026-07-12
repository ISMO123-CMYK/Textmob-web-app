import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useTheme } from '../context/ThemeContext';

import MainTabs from './MainTabs';

import PostDetailScreen from '../screens/post/PostDetailScreen';
import CreatePostScreen from '../screens/post/CreatePostScreen';
import SnapsScreen from '../screens/snaps/SnapsScreen';
import StoriesScreen from '../screens/stories/StoriesScreen';
import LiveViewScreen from '../screens/live/LiveViewScreen';
import CreateLiveScreen from '../screens/live/CreateLiveScreen';
import WalletScreen from '../screens/wallet/WalletScreen';
import ConnectionsScreen from '../screens/connections/ConnectionsScreen';
import HallOfFameScreen from '../screens/halloffame/HallOfFameScreen';
import EventsScreen from '../screens/events/EventsScreen';
import AboutScreen from '../screens/about/AboutScreen';
import AccountsCenterScreen from '../screens/account/AccountsCenterScreen';
import ProfileScreen from '../screens/profile/ProfileScreen';
import ChatsScreen from '../screens/chats/ChatsScreen';
import SearchScreen from '../screens/search/SearchScreen';
import ActivityScreen from '../screens/activity/ActivityScreen';

const Stack = createNativeStackNavigator();

export default function RootNavigator() {
  const { colors, isDark } = useTheme();

  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.background },
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen name="MainTabs" component={MainTabs} />
      <Stack.Screen name="PostDetail" component={PostDetailScreen} />
      <Stack.Screen name="CreatePost" component={CreatePostScreen} />
      <Stack.Screen name="Snaps" component={SnapsScreen} />
      <Stack.Screen name="Stories" component={StoriesScreen} />
      <Stack.Screen name="LiveView" component={LiveViewScreen} />
      <Stack.Screen name="CreateLive" component={CreateLiveScreen} />
      <Stack.Screen name="Wallet" component={WalletScreen} />
      <Stack.Screen name="Connections" component={ConnectionsScreen} />
      <Stack.Screen name="HallOfFame" component={HallOfFameScreen} />
      <Stack.Screen name="Events" component={EventsScreen} />
      <Stack.Screen name="About" component={AboutScreen} />
      <Stack.Screen name="AccountsCenter" component={AccountsCenterScreen} />
      <Stack.Screen name="Profile" component={ProfileScreen} />
      <Stack.Screen name="Chats" component={ChatsScreen} />
      <Stack.Screen name="Search" component={SearchScreen} />
      <Stack.Screen name="Activity" component={ActivityScreen} />
    </Stack.Navigator>
  );
}
