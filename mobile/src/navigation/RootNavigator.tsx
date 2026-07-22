import React, { lazy, Suspense } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useTheme } from '../context/ThemeContext';

import MainTabs from './MainTabs';

const PostDetailScreen = lazy(() => import('../screens/post/PostDetailScreen'));
const CreatePostScreen = lazy(() => import('../screens/post/CreatePostScreen'));
const SnapsScreen = lazy(() => import('../screens/snaps/SnapsScreen'));
const StoriesScreen = lazy(() => import('../screens/stories/StoriesScreen'));
const LiveViewScreen = lazy(() => import('../screens/live/LiveViewScreen'));
const CreateLiveScreen = lazy(() => import('../screens/live/CreateLiveScreen'));
const WalletScreen = lazy(() => import('../screens/wallet/WalletScreen'));
const ConnectionsScreen = lazy(() => import('../screens/connections/ConnectionsScreen'));
const HallOfFameScreen = lazy(() => import('../screens/halloffame/HallOfFameScreen'));
const EventsScreen = lazy(() => import('../screens/events/EventsScreen'));
const AboutScreen = lazy(() => import('../screens/about/AboutScreen'));
const AccountsCenterScreen = lazy(() => import('../screens/account/AccountsCenterScreen'));
const ProfileScreen = lazy(() => import('../screens/profile/ProfileScreen'));
const ChatsScreen = lazy(() => import('../screens/chats/ChatsScreen'));
const SearchScreen = lazy(() => import('../screens/search/SearchScreen'));
const ActivityScreen = lazy(() => import('../screens/activity/ActivityScreen'));

const Stack = createNativeStackNavigator();

function ScreenFallback() {
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
      <ActivityIndicator size="large" color="#2563eb" />
    </View>
  );
}

function LazyScreen({ Component, ...rest }: { Component: React.LazyExoticComponent<any>; [key: string]: any }) {
  return (
    <Suspense fallback={<ScreenFallback />}>
      <Component {...rest} />
    </Suspense>
  );
}

const LazyPostDetail = (props: any) => <LazyScreen Component={PostDetailScreen} {...props} />;
const LazyCreatePost = (props: any) => <LazyScreen Component={CreatePostScreen} {...props} />;
const LazySnaps = (props: any) => <LazyScreen Component={SnapsScreen} {...props} />;
const LazyStories = (props: any) => <LazyScreen Component={StoriesScreen} {...props} />;
const LazyLiveView = (props: any) => <LazyScreen Component={LiveViewScreen} {...props} />;
const LazyCreateLive = (props: any) => <LazyScreen Component={CreateLiveScreen} {...props} />;
const LazyWallet = (props: any) => <LazyScreen Component={WalletScreen} {...props} />;
const LazyConnections = (props: any) => <LazyScreen Component={ConnectionsScreen} {...props} />;
const LazyHallOfFame = (props: any) => <LazyScreen Component={HallOfFameScreen} {...props} />;
const LazyEvents = (props: any) => <LazyScreen Component={EventsScreen} {...props} />;
const LazyAbout = (props: any) => <LazyScreen Component={AboutScreen} {...props} />;
const LazyAccountsCenter = (props: any) => <LazyScreen Component={AccountsCenterScreen} {...props} />;
const LazyProfile = (props: any) => <LazyScreen Component={ProfileScreen} {...props} />;
const LazyChats = (props: any) => <LazyScreen Component={ChatsScreen} {...props} />;
const LazySearch = (props: any) => <LazyScreen Component={SearchScreen} {...props} />;
const LazyActivity = (props: any) => <LazyScreen Component={ActivityScreen} {...props} />;

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
      <Stack.Screen name="PostDetail" component={LazyPostDetail} />
      <Stack.Screen name="CreatePost" component={LazyCreatePost} />
      <Stack.Screen name="Snaps" component={LazySnaps} />
      <Stack.Screen name="Stories" component={LazyStories} />
      <Stack.Screen name="LiveView" component={LazyLiveView} />
      <Stack.Screen name="CreateLive" component={LazyCreateLive} />
      <Stack.Screen name="Wallet" component={LazyWallet} />
      <Stack.Screen name="Connections" component={LazyConnections} />
      <Stack.Screen name="HallOfFame" component={LazyHallOfFame} />
      <Stack.Screen name="Events" component={LazyEvents} />
      <Stack.Screen name="About" component={LazyAbout} />
      <Stack.Screen name="AccountsCenter" component={LazyAccountsCenter} />
      <Stack.Screen name="Profile" component={LazyProfile} />
      <Stack.Screen name="Chats" component={LazyChats} />
      <Stack.Screen name="Search" component={LazySearch} />
      <Stack.Screen name="Activity" component={LazyActivity} />
    </Stack.Navigator>
  );
}
