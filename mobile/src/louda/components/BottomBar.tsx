import React, { useRef, useState } from 'react';
import { View, Text, StyleSheet, PanResponder, useWindowDimensions } from 'react-native';
import { Ripple } from '../../components/Ripple';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLoudaTheme } from './primitives';
import { Icons } from '../icons';

type TabId = '__back' | 'chats' | 'status' | 'settings';

// Port of BottomBar (LoudaApp.jsx:4078-4299) — the mobile floating nav.
export function BottomBar({
  activeTab,
  onTabChange,
  onProfileClick,
  onBack,
  totalUnreadChats,
  totalUnreadStatuses,
}: {
  activeTab: string;
  onTabChange: (tab: any) => void;
  onProfileClick?: () => void;
  onBack?: () => void;
  totalUnreadChats: number;
  totalUnreadStatuses: number;
}) {
  const { p, isDark } = useLoudaTheme();
  const [collapsed, setCollapsed] = useState(false);
  const { width: winW, height: winH } = useWindowDimensions();
  const insets = useSafeAreaInsets();

  // Collapsed FAB can be dragged around and snaps to the nearest edge on
  // release (LoudaApp.jsx:4094-4133)
  const [fabPos, setFabPos] = useState({ x: 20, y: winH - 90 - insets.bottom });
  const fabPosRef = useRef(fabPos);
  fabPosRef.current = fabPos;
  const winRef = useRef({ w: winW, h: winH, ib: insets.bottom });
  winRef.current = { w: winW, h: winH, ib: insets.bottom };
  const dragRef = useRef({ base: { x: 0, y: 0 }, moved: false });

  const fabPan = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, g) =>
        Math.abs(g.dx) > 4 || Math.abs(g.dy) > 4,
      onPanResponderGrant: () => {
        dragRef.current.base = { ...fabPosRef.current };
        dragRef.current.moved = false;
      },
      onPanResponderMove: (_, g) => {
        dragRef.current.moved = true;
        const { w, h, ib } = winRef.current;
        const base = dragRef.current.base;
        setFabPos({
          x: Math.max(10, Math.min(base.x + g.dx, w - 60)),
          y: Math.max(10, Math.min(base.y + g.dy, h - 60 - ib)),
        });
      },
      onPanResponderRelease: () => {
        const { w, h, ib } = winRef.current;
        setFabPos((prev) => ({
          // snap to the nearest horizontal edge (web:4127-4132)
          x: prev.x + 25 > w / 2 ? w - 60 : 10,
          y: Math.max(10, Math.min(prev.y, h - 60 - ib)),
        }));
      },
    }),
  ).current;

  // Textmob port (embedded only): way back to the Textmob app
  const items: { id: TabId; icon: any; label: string }[] = [
    { id: '__back', icon: Icons.arrowLeft, label: 'Back' },
    { id: 'chats', icon: Icons.chat, label: 'Chats' },
    { id: 'status', icon: Icons.status, label: 'Status' },
    { id: 'settings', icon: Icons.settings, label: 'Settings' },
  ];

  const handlePress = (id: TabId) => {
    if (id === '__back') onBack?.();
    else onTabChange(id);
  };

  if (collapsed) {
    return (
      <View style={s.floatingLayer} pointerEvents="box-none">
        <Ripple
          activeOpacity={0.85}
          onPress={() => {
            if (!dragRef.current.moved) setCollapsed(false);
          }}
          {...fabPan.panHandlers}
          style={[
            s.floatingBtn,
            { backgroundColor: p.accent, left: fabPos.x, top: fabPos.y },
          ]}
        >
          <Text style={s.floatingBtnText}>☰</Text>
          {totalUnreadChats > 0 && (
            <View style={[s.floatBadge, { backgroundColor: p.accent }]}>
              <Text style={s.floatBadgeText}>
                {totalUnreadChats > 99 ? '99+' : totalUnreadChats}
              </Text>
            </View>
          )}
        </Ripple>
      </View>
    );
  }

  return (
    <View style={[s.navWrap, { bottom: 16 + insets.bottom }]} pointerEvents="box-none">
      <View style={[s.nav, { backgroundColor: isDark ? 'rgba(31,41,55,0.92)' : 'rgba(255,255,255,0.92)', borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.3)' }]}>
        <Ripple
          activeOpacity={0.8}
          onPress={() => setCollapsed(true)}
          style={[s.collapseBtn, { backgroundColor: p.accent }]}
        >
          <Text style={s.collapseBtnText}>▾</Text>
        </Ripple>

        {items.map((item) => {
          const Icon = item.icon;
          const active = activeTab === item.id;
          return (
            <Ripple
              key={item.id}
              activeOpacity={0.7}
              onPress={() => handlePress(item.id)}
              style={[s.item, active && s.itemActive]}
            >
              <View>
                <Icon size={24} color={active ? p.accent : p.textSecondary} style={s.itemIcon} />
                {item.id === 'chats' && totalUnreadChats > 0 && (
                  <View style={[s.navBadge, { backgroundColor: p.accent }]}>
                    <Text style={s.navBadgeText}>
                      {totalUnreadChats > 99 ? '99+' : totalUnreadChats}
                    </Text>
                  </View>
                )}
                {item.id === 'status' && totalUnreadStatuses > 0 && (
                  <View style={[s.navBadge, { backgroundColor: p.accent }]}>
                    <Text style={s.navBadgeText}>
                      {totalUnreadStatuses > 99 ? '99+' : totalUnreadStatuses}
                    </Text>
                  </View>
                )}
              </View>
              <Text
                style={[
                  s.itemLabel,
                  { color: active ? p.accent : p.textSecondary },
                ]}
              >
                {item.label}
              </Text>
              {active && <View style={[s.activeDot, { backgroundColor: p.accent }]} />}
            </Ripple>
          );
        })}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  navWrap: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 16,
    alignItems: 'center',
    zIndex: 99999,
  },
  nav: {
    width: '100%',
    maxWidth: 500,
    height: 72,
    borderRadius: 20,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingHorizontal: 12,
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 10 },
    elevation: 12,
  },
  collapseBtn: {
    position: 'absolute',
    top: -14,
    right: 8,
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 20,
  },
  collapseBtnText: { color: '#fff', fontSize: 12, fontWeight: '700', lineHeight: 14 },
  item: {
    flex: 1,
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    opacity: 0.5,
    position: 'relative',
  },
  itemActive: { opacity: 1, transform: [{ translateY: -4 }] },
  itemIcon: { width: 24, height: 24 },
  itemLabel: { fontSize: 10, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.5 },
  activeDot: {
    position: 'absolute',
    bottom: 8,
    width: 4,
    height: 4,
    borderRadius: 2,
  },
  navBadge: {
    position: 'absolute',
    top: -4,
    right: -6,
    minWidth: 16,
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navBadgeText: { color: '#fff', fontSize: 10, fontWeight: '700' },
  floatingLayer: {
    ...StyleSheet.absoluteFill,
    zIndex: 99999,
  },
  floatingBtn: {
    position: 'absolute',
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
  },
  floatingBtnText: { color: '#fff', fontSize: 20, lineHeight: 24 },
  floatBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 999,
    borderWidth: 2,
    borderColor: '#fff',
  },
  floatBadgeText: { color: '#fff', fontSize: 10, fontWeight: '700' },
});
