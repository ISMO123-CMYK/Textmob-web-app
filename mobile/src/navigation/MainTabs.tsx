import React, { useState, useMemo, lazy, Suspense } from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { View, StyleSheet, Text, Modal, ActivityIndicator } from 'react-native';
import { Ripple } from '../components/Ripple';
import Ionicons from '@expo/vector-icons/build/Ionicons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../context/ThemeContext';
import { LIVE_STREAMING_ENABLED } from '../config/live';
import useNavBadges from '../hooks/useNavBadges';

// Eager imports here silently undid every `lazy()` in RootNavigator and put the
// whole app (Hall of Fame, Snaps, Menu + their data layer) in the entry bundle.
// Only Home is on the critical path at launch.
const HomeScreen = lazy(() => import('../screens/home/HomeScreen'));
const HallOfFameScreen = lazy(() => import('../screens/halloffame/HallOfFameScreen'));
const SnapsScreen = lazy(() => import('../screens/snaps/SnapsScreen'));
const MenuScreen = lazy(() => import('../screens/menu/MenuScreen'));

function TabFallback() {
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
      <ActivityIndicator size="small" color="#2563eb" />
    </View>
  );
}

function LazyTab({ Component, ...rest }: { Component: React.LazyExoticComponent<any>; [key: string]: any }) {
  return (
    <Suspense fallback={<TabFallback />}>
      <Component {...rest} />
    </Suspense>
  );
}

const LazyHome = (props: any) => <LazyTab Component={HomeScreen} {...props} />;
const LazyHallOfFame = (props: any) => <LazyTab Component={HallOfFameScreen} {...props} />;
const LazySnaps = (props: any) => <LazyTab Component={SnapsScreen} {...props} />;
const LazyMenu = (props: any) => <LazyTab Component={MenuScreen} {...props} />;

const Tab = createBottomTabNavigator();

const TAB_ITEMS = [
  { label: 'Home', icon: 'home' as const, route: 'Home' },
  { label: 'Messages', icon: 'chatbubbles-outline' as const, route: 'Chats', badge: 'messages' as const },
  { label: 'Snaps', icon: 'videocam' as const, route: 'Snaps' },
  { label: 'Alerts', icon: 'notifications-outline' as const, route: 'Activity', badge: 'notifications' as const },
];
const LEFT_TABS = TAB_ITEMS.slice(0, 2);
const RIGHT_TABS = TAB_ITEMS.slice(2);

function FloatingTabBar({ state, navigation, colors, isDark, insets, onCreate, badges }: any) {
  const activeColor = colors.primary || '#2563eb';
  const inactiveColor = isDark ? 'rgba(255,255,255,0.55)' : 'rgba(0,0,0,0.45)';
  const currentRoute = state.routes[state.index]?.name;
  if (currentRoute === 'Snaps') return null;

  const renderTab = (item: typeof TAB_ITEMS[number]) => {
    const isActive = currentRoute === item.route;
    const count = item.badge === 'messages'
      ? badges?.loudaUnread || 0
      : item.badge === 'notifications'
        ? badges?.unreadNotifications || 0
        : 0;
    return (
      <Ripple
        key={item.label}
        style={[floatingStyles.tabItem, isActive && floatingStyles.tabItemActive]}
        onPress={() => navigation.navigate(item.route)}
        activeOpacity={0.7}
      >
        <View style={floatingStyles.tabIcon}>
          <Ionicons
            name={item.icon}
            size={22}
            color={isActive ? activeColor : inactiveColor}
          />
          {count > 0 && (
            <View style={floatingStyles.badge}>
              <Text style={floatingStyles.badgeText}>{count > 99 ? '99+' : count}</Text>
            </View>
          )}
        </View>
        <Text style={[
          floatingStyles.tabLabel,
          { color: isActive ? activeColor : inactiveColor },
        ]}>
          {item.label}
        </Text>
      </Ripple>
    );
  };

  return (
    <View style={[floatingStyles.container, { bottom: insets.bottom + 12 }]}>
      <View style={[floatingStyles.pill, { backgroundColor: isDark ? '#1c1c1e' : '#ffffff' }]}>
        {LEFT_TABS.map(renderTab)}

        <Ripple
          style={[floatingStyles.createBtn, { backgroundColor: isDark ? '#fff' : '#111' }]}
          onPress={onCreate}
          activeOpacity={0.8}
        >
          <Ionicons name="add" size={24} color={isDark ? '#111' : '#fff'} />
        </Ripple>

        {RIGHT_TABS.map(renderTab)}
      </View>
    </View>
  );
}

export default function MainTabs({ navigation }: { navigation: any }) {
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const [showCreate, setShowCreate] = useState(false);
  const badges = useNavBadges();

  return (
    <>
      <Tab.Navigator
        screenOptions={{
          headerShown: false,
          tabBarShowLabel: false,
          tabBarStyle: { display: 'none' },
        }}
        tabBar={(props) => (
          <FloatingTabBar
            {...props}
            colors={colors}
            isDark={isDark}
            insets={insets}
            badges={badges}
            onCreate={() => setShowCreate(true)}
          />
        )}
      >
        <Tab.Screen
          name="Home"
          component={LazyHome}
          options={{ tabBarIcon: () => null }}
        />
        <Tab.Screen
          name="Fame"
          component={LazyHallOfFame}
          options={{ tabBarIcon: () => null }}
        />
        <Tab.Screen
          name="Snaps"
          component={LazySnaps}
          options={{ tabBarIcon: () => null }}
        />
        <Tab.Screen
          name="Menu"
          component={LazyMenu}
          options={{ tabBarIcon: () => null }}
        />
      </Tab.Navigator>

      <Modal
        visible={showCreate}
        transparent
        animationType="slide"
        onRequestClose={() => setShowCreate(false)}
      >
        <Ripple
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowCreate(false)}
        >
          <View style={[styles.sheetContent, { backgroundColor: colors.card }]}>
            <View style={styles.sheetHandle} />
            <Text style={[styles.sheetTitle, { color: colors.textSecondary }]}>CREATE</Text>

            <View style={styles.optionsWrap}>
              <Ripple
                style={[styles.optionBtn, { backgroundColor: isDark ? '#1e293b' : '#f8fafc' }]}
                onPress={() => {
                  setShowCreate(false);
                  navigation.navigate('CreatePost');
                }}
              >
                <View style={[styles.optionIconWrap, { backgroundColor: '#eff6ff' }]}>
                  <Ionicons name="create-outline" size={20} color="#2563eb" />
                </View>
                <View style={styles.optionTextWrap}>
                  <Text style={[styles.optionLabel, { color: colors.textPrimary }]}>Post</Text>
                  <Text style={[styles.optionSub, { color: colors.textSecondary }]}>Share what's on your mind</Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color={colors.textSecondary} />
              </Ripple>

              <Ripple
                style={[styles.optionBtn, { backgroundColor: isDark ? '#1e293b' : '#f8fafc' }]}
                onPress={() => {
                  setShowCreate(false);
                  navigation.navigate('Snaps');
                }}
              >
                <View style={[styles.optionIconWrap, { backgroundColor: '#eff6ff' }]}>
                  <Ionicons name="videocam-outline" size={20} color="#2563eb" />
                </View>
                <View style={styles.optionTextWrap}>
                  <Text style={[styles.optionLabel, { color: colors.textPrimary }]}>Snap</Text>
                  <Text style={[styles.optionSub, { color: colors.textSecondary }]}>Capture a moment</Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color={colors.textSecondary} />
              </Ripple>

              {LIVE_STREAMING_ENABLED && (
                <Ripple
                  style={[styles.optionBtn, { backgroundColor: isDark ? '#1e293b' : '#f8fafc' }]}
                  onPress={() => {
                    setShowCreate(false);
                    navigation.navigate('CreateLive');
                  }}
                >
                  <View style={[styles.optionIconWrap, { backgroundColor: '#fef2f2' }]}>
                    <Ionicons name="radio-outline" size={20} color="#dc2626" />
                  </View>
                  <View style={styles.optionTextWrap}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Text style={[styles.optionLabel, { color: colors.textPrimary }]}>Go Live</Text>
                      <Text style={styles.liveBadge}>LIVE</Text>
                    </View>
                    <Text style={[styles.optionSub, { color: colors.textSecondary }]}>Broadcast to your people</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={16} color={colors.textSecondary} />
                </Ripple>
              )}
            </View>

            <Ripple style={styles.cancelBtn} onPress={() => setShowCreate(false)}>
              <Text style={{ color: colors.textSecondary, fontSize: 14, fontWeight: '600' }}>Cancel</Text>
            </Ripple>
          </View>
        </Ripple>
      </Modal>
    </>
  );
}

const floatingStyles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 20,
    right: 20,
    zIndex: 100,
    alignItems: 'center',
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 10,
    borderRadius: 28,
  },
  tabItem: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    gap: 3,
  },
  tabIcon: {
    position: 'relative',
  },
  badge: {
    position: 'absolute',
    top: -5,
    right: -9,
    minWidth: 15,
    height: 15,
    borderRadius: 8,
    paddingHorizontal: 3,
    backgroundColor: '#ef4444',
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    color: '#fff',
    fontSize: 8,
    fontWeight: '900',
  },
  tabItemActive: {
    backgroundColor: 'rgba(37, 99, 235, 0.08)',
    borderRadius: 16,
  },
  tabLabel: {
    fontSize: 10,
    fontWeight: '700',
  },
  createBtn: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.18,
    shadowRadius: 6,
    elevation: 5,
  },
});

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  sheetContent: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 34,
  },
  sheetHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#e2e8f0',
    alignSelf: 'center',
    marginBottom: 16,
  },
  sheetTitle: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.5,
    textAlign: 'center',
    marginBottom: 16,
  },
  optionsWrap: {
    gap: 8,
  },
  optionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 16,
  },
  optionIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  optionTextWrap: {
    flex: 1,
  },
  optionLabel: {
    fontSize: 14,
    fontWeight: '700',
  },
  optionSub: {
    fontSize: 12,
    marginTop: 2,
  },
  liveBadge: {
    fontSize: 9,
    fontWeight: '900',
    color: '#dc2626',
    borderWidth: 1,
    borderColor: '#fca5a5',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 8,
  },
  cancelBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    marginTop: 8,
  },
});
