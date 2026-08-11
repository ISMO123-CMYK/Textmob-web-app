import React, { useState, useMemo, useCallback } from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { View, StyleSheet, Text, TouchableOpacity, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../context/ThemeContext';
import ErrorBoundary from '../components/ErrorBoundary';

import HomeScreen from '../screens/home/HomeScreen';
import HallOfFameScreen from '../screens/halloffame/HallOfFameScreen';
import SnapsScreen from '../screens/snaps/SnapsScreen';
import MenuScreen from '../screens/menu/MenuScreen';

const SafeHome = (props: any) => <ErrorBoundary><HomeScreen {...props} /></ErrorBoundary>;
const SafeFame = (props: any) => <ErrorBoundary><HallOfFameScreen {...props} /></ErrorBoundary>;
const SafeSnaps = (props: any) => <ErrorBoundary><SnapsScreen {...props} /></ErrorBoundary>;
const SafeMenu = (props: any) => <ErrorBoundary><MenuScreen {...props} /></ErrorBoundary>;

const Tab = createBottomTabNavigator();

export default function MainTabs({ navigation }: { navigation: any }) {
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const [showCreate, setShowCreate] = useState(false);

  const screenOptions = useMemo(() => ({
    headerShown: false,
    tabBarActiveTintColor: '#2563eb',
    tabBarInactiveTintColor: colors.textSecondary,
    tabBarStyle: {
      backgroundColor: colors.card,
      borderTopColor: colors.border,
      borderTopWidth: StyleSheet.hairlineWidth,
      height: 56 + insets.bottom,
      paddingBottom: insets.bottom + 4,
      paddingTop: 0,
    },
    tabBarItemStyle: {
      paddingTop: 0,
      paddingBottom: 0,
    },
  }), [colors, insets.bottom]);

  return (
    <>
      <Tab.Navigator screenOptions={screenOptions}
      >
        <Tab.Screen
          name="Home"
          component={SafeHome}
          options={{
            tabBarLabel: 'Home',
            tabBarIcon: ({ color, focused }) => (
              <View style={[styles.tabIconWrap, focused && styles.tabIconActive]}>
                <Ionicons name="home" size={20} color={color} />
              </View>
            ),
          }}
        />
        <Tab.Screen
          name="Fame"
          component={SafeFame}
          options={{
            tabBarLabel: 'Fame',
            tabBarIcon: ({ color, focused }) => (
              <View style={[styles.tabIconWrap, focused && styles.tabIconActive]}>
                <Ionicons name="trophy" size={20} color={color} />
              </View>
            ),
          }}
        />
        <Tab.Screen
          name="Create"
          component={HomeScreen} // dummy, overridden by button click
          listeners={{
            tabPress: (e) => {
              e.preventDefault();
              setShowCreate(true);
            },
          }}
          options={{
            tabBarLabel: '',
            tabBarIcon: () => (
              <View style={styles.createBtn}>
                <Ionicons name="add" size={24} color="#fff" />
              </View>
            ),
          }}
        />
        <Tab.Screen
          name="Snaps"
          component={SafeSnaps}
          options={{
            tabBarLabel: 'Snaps',
            tabBarStyle: { display: 'none' },
            tabBarIcon: ({ color, focused }) => (
              <View style={[styles.tabIconWrap, focused && styles.tabIconActive]}>
                <Ionicons name="videocam" size={20} color={color} />
              </View>
            ),
          }}
        />
        <Tab.Screen
          name="Menu"
          component={MenuScreen}
          options={{
            tabBarLabel: 'Menu',
            tabBarIcon: ({ color, focused }) => (
              <View style={[styles.tabIconWrap, focused && styles.tabIconActive]}>
                <Ionicons name="menu" size={20} color={color} />
              </View>
            ),
          }}
        />
      </Tab.Navigator>

      {/* Create sheet modal matching the frontend style exactly */}
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

const styles = StyleSheet.create({
  tabIconWrap: {
    width: 32,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
  },
  tabIconActive: {
    backgroundColor: '#eff6ff',
  },
  createBtn: {
    width: 44,
    height: 44,
    borderRadius: 15,
    backgroundColor: '#2563eb',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -8,
    shadowColor: '#2563eb',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },
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
