import React, { useState, useMemo } from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { View, StyleSheet, Text, TouchableOpacity, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../context/ThemeContext';

import HomeScreen from '../screens/home/HomeScreen';
import HallOfFameScreen from '../screens/halloffame/HallOfFameScreen';
import SnapsScreen from '../screens/snaps/SnapsScreen';
import MenuScreen from '../screens/menu/MenuScreen';

const Tab = createBottomTabNavigator();

const TAB_ITEMS = [
  { key: 'Home', label: 'Home', icon: 'home' as const },
  { key: 'Fame', label: 'Fame', icon: 'trophy' as const },
  { key: 'Snaps', label: 'Snaps', icon: 'videocam' as const },
  { key: 'Menu', label: 'Menu', icon: 'menu' as const },
];

function FloatingTabBar({ state, navigation, colors, isDark, insets, onCreate }: any) {
  const activeColor = colors.primary || '#2563eb';
  const inactiveColor = isDark ? 'rgba(255,255,255,0.55)' : 'rgba(0,0,0,0.45)';
  const currentRoute = state.routes[state.index]?.name;
  if (currentRoute === 'Snaps') return null;

  return (
    <View style={[floatingStyles.container, { bottom: insets.bottom + 12 }]}>
      <View style={[floatingStyles.pill, { backgroundColor: isDark ? '#1c1c1e' : '#ffffff' }]}>
        {TAB_ITEMS.map((item) => {
          const isActive = currentRoute === item.key;
          return (
            <TouchableOpacity
              key={item.key}
              style={[floatingStyles.tabItem, isActive && floatingStyles.tabItemActive]}
              onPress={() => navigation.navigate(item.key)}
              activeOpacity={0.7}
            >
              <Ionicons
                name={item.icon}
                size={22}
                color={isActive ? activeColor : inactiveColor}
              />
              <Text style={[
                floatingStyles.tabLabel,
                { color: isActive ? activeColor : inactiveColor },
              ]}>
                {item.label}
              </Text>
            </TouchableOpacity>
          );
        })}

        <TouchableOpacity
          style={[floatingStyles.createBtn, { backgroundColor: isDark ? '#fff' : '#111' }]}
          onPress={onCreate}
          activeOpacity={0.8}
        >
          <Ionicons name="add" size={22} color={isDark ? '#111' : '#fff'} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

export default function MainTabs({ navigation }: { navigation: any }) {
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const [showCreate, setShowCreate] = useState(false);

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
            onCreate={() => setShowCreate(true)}
          />
        )}
      >
        <Tab.Screen
          name="Home"
          component={HomeScreen}
          options={{ tabBarIcon: () => null }}
        />
        <Tab.Screen
          name="Fame"
          component={HallOfFameScreen}
          options={{ tabBarIcon: () => null }}
        />
        <Tab.Screen
          name="Snaps"
          component={SnapsScreen}
          options={{ tabBarIcon: () => null }}
        />
        <Tab.Screen
          name="Menu"
          component={MenuScreen}
          options={{ tabBarIcon: () => null }}
        />
      </Tab.Navigator>

      <Modal
        visible={showCreate}
        transparent
        animationType="slide"
        onRequestClose={() => setShowCreate(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowCreate(false)}
        >
          <View style={[styles.sheetContent, { backgroundColor: colors.card }]}>
            <View style={styles.sheetHandle} />
            <Text style={[styles.sheetTitle, { color: colors.textSecondary }]}>CREATE</Text>

            <View style={styles.optionsWrap}>
              <TouchableOpacity
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
              </TouchableOpacity>

              <TouchableOpacity
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
              </TouchableOpacity>

              <TouchableOpacity
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
              </TouchableOpacity>
            </View>

            <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowCreate(false)}>
              <Text style={{ color: colors.textSecondary, fontSize: 14, fontWeight: '600' }}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
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
    paddingHorizontal: 14,
    paddingVertical: 6,
    gap: 3,
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
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 6,
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
