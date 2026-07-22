import React, { useRef, useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, Animated, Dimensions,
  FlatList, TouchableOpacity, StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../context/ThemeContext';
import { storage, KEYS } from '../../utils/storage';

const { width } = Dimensions.get('window');

const slides = [
  {
    id: '1',
    icon: 'share-outline',
    title: 'Share Your World',
    subtitle: 'Post texts, photos, and moments that vanish after 24 hours. Your story, your way.',
    color: '#2563eb',
  },
  {
    id: '2',
    icon: 'people-outline',
    title: 'Connect Deeply',
    subtitle: 'Find your people. Chat, meet, and build real connections with those who get you.',
    color: '#7c3aed',
  },
  {
    id: '3',
    icon: 'sparkles-outline',
    title: 'Everything You Need',
    subtitle: 'Live streams, stories, chats, and discover \u2014 all in one beautifully crafted app.',
    color: '#db2777',
  },
];

export default function OnboardingScreen({ navigation }: { navigation: any }) {
  const { colors } = useTheme();
  const flatListRef = useRef<FlatList>(null);
  const [currentIndex, setCurrentIndex] = useState(0);

  const iconAnim = useRef(new Animated.Value(0)).current;
  const titleAnim = useRef(new Animated.Value(0)).current;
  const descAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    (async () => {
      const seen = await storage.getStore(KEYS.ONBOARDING_SEEN);
      if (seen === 'true') {
        navigation.replace('Login');
      }
    })();
  }, []);

  useEffect(() => {
    iconAnim.setValue(0);
    titleAnim.setValue(0);
    descAnim.setValue(0);

    Animated.stagger(100, [
      Animated.spring(iconAnim, { toValue: 1, friction: 5, tension: 60, useNativeDriver: true }),
      Animated.timing(titleAnim, { toValue: 1, duration: 350, useNativeDriver: true }),
      Animated.timing(descAnim, { toValue: 1, duration: 350, useNativeDriver: true }),
    ]).start();
  }, [currentIndex]);

  const markSeenAndContinue = useCallback(async () => {
    await storage.setStore(KEYS.ONBOARDING_SEEN, 'true');
    navigation.replace('Login');
  }, []);

  const handleNext = useCallback(() => {
    if (currentIndex < slides.length - 1) {
      flatListRef.current?.scrollToIndex({ index: currentIndex + 1, animated: true });
    } else {
      markSeenAndContinue();
    }
  }, [currentIndex]);

  const handleSkip = useCallback(() => {
    markSeenAndContinue();
  }, []);

  const onMomentumEnd = (e: any) => {
    const index = Math.round(e.nativeEvent.contentOffset.x / width);
    setCurrentIndex(index);
  };

  const s = makeStyles(colors);
  const slide = slides[currentIndex];

  return (
    <SafeAreaView style={[s.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle="dark-content" />

      {currentIndex < slides.length - 1 && (
        <TouchableOpacity style={styles.skipBtn} onPress={handleSkip} activeOpacity={0.7}>
          <Text style={[styles.skipText, { color: colors.textSecondary }]}>Skip</Text>
        </TouchableOpacity>
      )}

      <FlatList
        ref={flatListRef}
        data={slides}
        style={{ flex: 1 }}
        renderItem={({ item, index }) => (
          <View style={[styles.slide, { width }]}>
            <Animated.View
              style={[
                styles.iconWrap,
                {
                  backgroundColor: item.color,
                  opacity: currentIndex === index ? iconAnim : 0,
                  transform: currentIndex === index
                    ? [{ scale: iconAnim.interpolate({ inputRange: [0, 1], outputRange: [0.4, 1] }) }]
                    : [{ scale: 0.4 }],
                },
              ]}
            >
              <Ionicons name={item.icon as any} size={44} color="#fff" />
            </Animated.View>

            <Animated.Text
              style={[
                styles.title,
                { color: colors.textPrimary },
                currentIndex === index && {
                  opacity: titleAnim,
                  transform: [{ translateY: titleAnim.interpolate({ inputRange: [0, 1], outputRange: [24, 0] }) }],
                },
              ]}
            >
              {item.title}
            </Animated.Text>

            <Animated.Text
              style={[
                styles.subtitle,
                { color: colors.textSecondary },
                currentIndex === index && {
                  opacity: descAnim,
                  transform: [{ translateY: descAnim.interpolate({ inputRange: [0, 1], outputRange: [20, 0] }) }],
                },
              ]}
            >
              {item.subtitle}
            </Animated.Text>
          </View>
        )}
        keyExtractor={(item) => item.id}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        bounces={false}
        onMomentumScrollEnd={onMomentumEnd}
        scrollEnabled={true}
      />

      <View style={styles.bottom}>
        <View style={styles.dots}>
          {slides.map((_, i) => (
            <View
              key={i}
              style={[
                styles.dot,
                { backgroundColor: i === currentIndex ? slide.color : colors.border },
                i === currentIndex && { width: 28 },
              ]}
            />
          ))}
        </View>

        <TouchableOpacity
          style={[styles.actionBtn, { backgroundColor: slide.color }]}
          onPress={handleNext}
          activeOpacity={0.85}
        >
          <Text style={styles.actionBtnText}>
            {currentIndex === slides.length - 1 ? 'Get Started' : 'Next'}
          </Text>
          <Ionicons
            name={currentIndex === slides.length - 1 ? 'checkmark-circle' : 'arrow-forward'}
            size={20}
            color="#fff"
          />
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  skipBtn: {
    position: 'absolute',
    top: 12,
    right: 20,
    zIndex: 10,
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  skipText: { fontSize: 15, fontWeight: '600' },
  slide: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
  },
  iconWrap: {
    width: 104,
    height: 104,
    borderRadius: 52,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 44,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 18,
    elevation: 10,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 14,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 24,
    paddingHorizontal: 16,
  },
  bottom: {
    paddingHorizontal: 24,
    paddingBottom: 36,
    paddingTop: 8,
    gap: 28,
  },
  dots: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  actionBtn: {
    flexDirection: 'row',
    height: 54,
    borderRadius: 27,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 6,
  },
  actionBtnText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '700',
  },
});

function makeStyles(colors: any) {
  return StyleSheet.create({
    container: { flex: 1 },
  });
}
