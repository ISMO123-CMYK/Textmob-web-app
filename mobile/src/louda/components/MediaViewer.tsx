import React, { memo, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Image,
  StyleSheet,
  useWindowDimensions,
  Modal,
  Alert,
  Share,
  LayoutChangeEvent,
  Animated,
  PanResponder,
} from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import * as MediaLibrary from 'expo-media-library';
import { useLoudaTheme } from './primitives';
import { Icons } from '../icons';
import { AudioPlayer } from './AudioPlayer';
import { VideoPlayer } from './VideoPlayer';
import { getOptimizedMediaUrl } from '../utils';

// Port of MediaViewer (LoudaApp.jsx:308-498)
export const MediaViewer = memo(function MediaViewer({
  src,
  type,
  onClose,
  messages,
  explicitMediaList,
  onForwardMedia,
}: {
  src: string;
  type: string;
  onClose: () => void;
  messages?: any[];
  explicitMediaList?: any[];
  onForwardMedia?: (payload: any) => void;
}) {
  const { p } = useLoudaTheme();
  const { width, height } = useWindowDimensions();
  const [showUI, setShowUI] = useState(true);
  const [showMenu, setShowMenu] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [index, setIndex] = useState(0);
  const scrollRef = useRef<ScrollView>(null);
  const lastTapRef = useRef(0);
  const zoomRef = useRef(1);
  zoomRef.current = zoom;

  // Drag-to-pan while zoomed (LoudaApp.jsx:310/448-459, ±300 constraints)
  const pan = useRef(new Animated.ValueXY({ x: 0, y: 0 })).current;
  const panBase = useRef({ x: 0, y: 0 });
  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, g) =>
        zoomRef.current > 1 && (Math.abs(g.dx) > 4 || Math.abs(g.dy) > 4),
      onPanResponderGrant: () => {
        panBase.current = {
          x: (pan.x as any)._value || 0,
          y: (pan.y as any)._value || 0,
        };
      },
      onPanResponderMove: (_, g) => {
        const clamp = (v: number) => Math.max(-300, Math.min(300, v));
        pan.x.setValue(clamp(panBase.current.x + g.dx));
        pan.y.setValue(clamp(panBase.current.y + g.dy));
      },
    }),
  ).current;

  const resetZoom = () => {
    setZoom(1);
    pan.setValue({ x: 0, y: 0 });
  };

  const mediaList = useMemo(() => {
    let allMedia: { url: string; type: string }[] = [];
    if (explicitMediaList && explicitMediaList.length > 0) {
      allMedia = explicitMediaList.map((m) => ({ url: m.url || m.src, type: m.type }));
    } else if (messages) {
      allMedia = messages
        .filter((m) => m.media && m.media.length > 0)
        .flatMap((m) => m.media.map((media: any) => ({ url: media.url, type: media.type })));
    }
    if (!allMedia.find((m) => m.url === src)) allMedia.unshift({ url: src, type });
    return allMedia;
  }, [messages, src, type, explicitMediaList]);

  useEffect(() => {
    const i = Math.max(0, mediaList.findIndex((m) => m.url === src));
    setIndex(i);
    requestAnimationFrame(() =>
      scrollRef.current?.scrollTo({ x: i * width, animated: false }),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const current = mediaList[index] || { url: src, type };

  const handleDoubleTap = () => {
    const now = Date.now();
    if (now - lastTapRef.current < 300) {
      setZoom((z) => {
        const next = z === 1 ? 2 : 1;
        if (next === 1) pan.setValue({ x: 0, y: 0 });
        return next;
      });
    }
    lastTapRef.current = now;
  };

  const handleShare = async () => {
    try {
      await Share.share({
        title: 'Shared from Textmob',
        message: 'Check out this media from Textmob!\n' + current.url,
        url: current.url,
      });
    } catch {
      /* user dismissed */
    }
  };

  const handleSave = async () => {
    try {
      if (current.type === 'audio' || current.type === 'voice' || current.type === 'file' || current.type === 'document') {
        const dl = await FileSystem.downloadAsync(
          current.url,
          FileSystem.documentDirectory + `textmob_media_${Date.now()}`,
        );
        Alert.alert('Saved', `Saved to ${dl.uri}`);
        return;
      }
      const perm = await MediaLibrary.requestPermissionsAsync();
      if (!perm.granted) {
        Alert.alert('Error', 'Permission to save media was denied.');
        return;
      }
      await MediaLibrary.saveToLibraryAsync(current.url);
      Alert.alert('Saved', 'Media saved to your gallery.');
    } catch (e) {
      Alert.alert('Error', 'Failed to save media.');
    }
  };

  const handleForward = () => {
    setShowMenu(false);
    onForwardMedia?.({
      messages: [{ text: '', media: [{ type: current.type, url: current.url }] }],
    });
  };

  const isAudio = current.type === 'audio' || current.type === 'voice';

  return (
    <Modal visible animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <View style={s.root}>
        <TouchableOpacity
          activeOpacity={1}
          style={StyleSheet.absoluteFill}
          onPress={() => setShowUI((v) => !v)}
        />

        {showUI && (
          <View style={s.header} pointerEvents="box-none">
            <TouchableOpacity onPress={onClose} style={s.iconBtn}>
              <Icons.arrowLeft size={22} color="#fff" />
            </TouchableOpacity>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
              <Text style={s.counter}>
                {index + 1} / {mediaList.length}
              </Text>
              {!isAudio && (
                <TouchableOpacity
                  onPress={() =>
                    setZoom((z) => {
                      const next = z === 1 ? 2 : 1;
                      if (next === 1) pan.setValue({ x: 0, y: 0 });
                      return next;
                    })
                  }
                  style={s.iconBtn}
                >
                  <Icons.search size={20} color="#fff" />
                </TouchableOpacity>
              )}
              <TouchableOpacity onPress={() => setShowMenu((v) => !v)} style={s.iconBtn}>
                <Icons.more size={20} color="#fff" />
              </TouchableOpacity>
            </View>

            {showMenu && (
              <View style={[s.menu, { backgroundColor: p.card }]}>
                <TouchableOpacity
                  style={s.menuItem}
                  onPress={() => {
                    setShowMenu(false);
                    handleShare();
                  }}
                >
                  <Icons.share size={16} color={p.textMuted} />
                  <Text style={[s.menuText, { color: p.textSecondary }]}>Share</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={s.menuItem}
                  onPress={() => {
                    setShowMenu(false);
                    handleSave();
                  }}
                >
                  <Icons.download size={16} color={p.textMuted} />
                  <Text style={[s.menuText, { color: p.textSecondary }]}>Save</Text>
                </TouchableOpacity>
                <TouchableOpacity style={s.menuItem} onPress={handleForward}>
                  <Icons.check size={16} color={p.textMuted} />
                  <Text style={[s.menuText, { color: p.textSecondary }]}>Forward</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}

        <View style={s.stage}>
          <ScrollView
            ref={scrollRef}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onMomentumScrollEnd={(e) => {
              const i = Math.round(e.nativeEvent.contentOffset.x / width);
              setIndex(Math.max(0, Math.min(mediaList.length - 1, i)));
              resetZoom();
            }}
            style={{ width, flex: 1 }}
          >
            {mediaList.map((m, i) => (
              <View key={m.url + i} style={{ width, height }}>
                <Animated.View
                  style={{
                    width,
                    height,
                    transform: [{ translateX: pan.x }, { translateY: pan.y }],
                  }}
                  {...(m.type !== 'audio' && m.type !== 'voice'
                    ? panResponder.panHandlers
                    : {})}
                >
                  {m.type === 'video' ? (
                    <View
                      style={{
                        width,
                        height,
                        transform: [{ scale: zoom }],
                      }}
                    >
                      <VideoPlayer src={m.url} autoPlay={i === index} style={{ width, height }} />
                    </View>
                  ) : m.type === 'audio' || m.type === 'voice' ? (
                    <View style={s.audioCard}>
                      <View style={[s.audioCircle, { backgroundColor: p.accent }]}>
                        {m.type === 'voice' ? (
                          <Icons.mic size={34} color="#fff" />
                        ) : (
                          <Icons.audio size={34} color="#fff" />
                        )}
                      </View>
                      <AudioPlayer src={m.url} />
                      <Text style={s.audioLabel}>
                        {m.type === 'voice' ? 'Voice Message' : 'Audio Track'}
                      </Text>
                    </View>
                  ) : (
                    <TouchableOpacity
                      activeOpacity={1}
                      onPress={handleDoubleTap}
                      style={{ width, height, alignItems: 'center', justifyContent: 'center' }}
                    >
                      <Image
                        source={{ uri: getOptimizedMediaUrl(m.url, 'image') }}
                        style={{
                          width,
                          height,
                          transform: [{ scale: zoom }],
                        }}
                        resizeMode="contain"
                      />
                    </TouchableOpacity>
                  )}
                </Animated.View>
              </View>
            ))}
          </ScrollView>

          {showUI && index > 0 && (
            <TouchableOpacity
              style={[s.arrow, { left: 16 }]}
              onPress={() => {
                resetZoom();
                scrollRef.current?.scrollTo({ x: (index - 1) * width, animated: true });
              }}
            >
              <Icons.arrowLeft size={24} color="#fff" />
            </TouchableOpacity>
          )}
          {showUI && index < mediaList.length - 1 && (
            <TouchableOpacity
              style={[s.arrow, { right: 16 }]}
              onPress={() => {
                resetZoom();
                scrollRef.current?.scrollTo({ x: (index + 1) * width, animated: true });
              }}
            >
              <Icons.chevronRight size={24} color="#fff" />
            </TouchableOpacity>
          )}
        </View>
      </View>
    </Modal>
  );
});

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#000' },
  header: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    paddingTop: 56,
    paddingHorizontal: 16,
    paddingBottom: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    zIndex: 10,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  counter: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
    backgroundColor: 'rgba(255,255,255,0.1)',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 999,
    overflow: 'hidden',
  },
  menu: {
    position: 'absolute',
    top: 100,
    right: 16,
    borderRadius: 16,
    paddingVertical: 8,
    minWidth: 160,
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  menuText: { fontSize: 14, fontWeight: '700' },
  stage: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  arrow: {
    position: 'absolute',
    top: '50%',
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 5,
  },
  audioCard: {
    width: 300,
    alignSelf: 'center',
    marginTop: '40%',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 32,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.1)',
    padding: 24,
    alignItems: 'center',
    gap: 24,
  },
  audioCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.4,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
  audioLabel: {
    color: '#fff',
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 4,
    textTransform: 'uppercase',
    opacity: 0.4,
  },
});
