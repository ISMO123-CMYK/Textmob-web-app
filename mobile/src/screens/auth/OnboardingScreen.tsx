import React, { useRef, useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, Dimensions,
  ScrollView, TouchableOpacity, StatusBar, NativeSyntheticEvent, NativeScrollEvent,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFonts, SpaceGrotesk_700Bold, SpaceGrotesk_600SemiBold } from '@expo-google-fonts/space-grotesk';
import { Inter_400Regular, Inter_600SemiBold, Inter_700Bold } from '@expo-google-fonts/inter';
import { storage, KEYS } from '../../utils/storage';

const { width } = Dimensions.get('window');

const slides = [
  {
    id: '1',
    icon: 'share-outline',
    title: 'Share Your World',
    subtitle: 'Post updates, photos, and stories that disappear after 24 hours.',
  },
  {
    id: '2',
    icon: 'people-outline',
    title: 'Connect with People',
    subtitle: 'Follow creators, chat with friends, and join conversations that matter.',
  },
  {
    id: '3',
    icon: 'sparkles-outline',
    title: 'Everything in One Place',
    subtitle: 'Posts, stories, live streams, messaging, and discovery in a single app.',
  },
  {
    id: '4',
    icon: 'videocam-outline',
    title: 'Go Live Instantly',
    subtitle: 'Start a live stream, interact with your audience, and grow your community in real time.',
  },
  {
    id: '5',
    icon: 'trophy-outline',
    title: 'Climb the Hall of Fame',
    subtitle: 'Create quality content, earn recognition, and see your name among the top creators.',
  },
  {
    id: '6',
    icon: 'star-outline',
    title: 'Get Recognized',
    subtitle: 'Stand out through quality content, earn Mobcoins, and build your reputation.',
  },
];

export default function OnboardingScreen({ navigation }: { navigation: any }) {
  const scrollViewRef = useRef<ScrollView>(null);
  const [currentIndex, setCurrentIndex] = useState(0);

  const [fontsLoaded] = useFonts({
    SpaceGrotesk_700Bold,
    SpaceGrotesk_600SemiBold,
    Inter_400Regular,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  useEffect(() => {
    (async () => {
      const seen = await storage.getStore(KEYS.ONBOARDING_SEEN);
      if (seen === 'true') {
        navigation.replace('Login');
      }
    })();
  }, [navigation]);

  const markSeenAndContinue = useCallback(async () => {
    await storage.setStore(KEYS.ONBOARDING_SEEN, 'true');
    navigation.replace('Login');
  }, [navigation]);

  const handleNext = useCallback(() => {
    if (currentIndex < slides.length - 1) {
      const nextIndex = currentIndex + 1;
      setCurrentIndex(nextIndex);
      scrollViewRef.current?.scrollTo({ x: nextIndex * width, animated: true });
    } else {
      markSeenAndContinue();
    }
  }, [currentIndex, markSeenAndContinue]);

  const handleDotPress = useCallback((index: number) => {
    setCurrentIndex(index);
    scrollViewRef.current?.scrollTo({ x: index * width, animated: true });
  }, []);

  const handleSkip = useCallback(() => {
    markSeenAndContinue();
  }, [markSeenAndContinue]);

  // Fires on every scroll frame, drag-end, and momentum-end so the dots
  // never fall out of sync with whichever gesture the user actually made.
  const updateIndexFromOffset = useCallback((e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const contentOffsetX = e.nativeEvent.contentOffset.x;
    const index = Math.round(contentOffsetX / width);
    if (index >= 0 && index < slides.length) {
      setCurrentIndex((prev) => (prev !== index ? index : prev));
    }
  }, []);

  if (!fontsLoaded) {
    return null;
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#2563eb" />

      <View style={styles.mainWrapper}>
        <ScrollView
          ref={scrollViewRef}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          bounces={false}
          onScroll={updateIndexFromOffset}
          onScrollEndDrag={updateIndexFromOffset}
          onMomentumScrollEnd={updateIndexFromOffset}
          scrollEventThrottle={16}
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
        >
          {slides.map((item) => (
            <View key={item.id} style={[styles.slide, { width }]}>
              <View style={styles.contentBox}>
                <View style={styles.iconWrap}>
                  <Ionicons name={item.icon as any} size={40} color="#ffffff" />
                </View>

                <Text style={styles.title}>{item.title}</Text>

                <Text style={styles.subtitle}>{item.subtitle}</Text>
              </View>
            </View>
          ))}
        </ScrollView>

        {/* Middle controls halfway down the page */}
        <View style={styles.middleControls}>
          <View style={styles.dots}>
            {slides.map((_, i) => (
              <TouchableOpacity
                key={i}
                onPress={() => handleDotPress(i)}
                activeOpacity={0.7}
                style={[
                  styles.dot,
                  i === currentIndex ? styles.dotActive : styles.dotInactive,
                ]}
              />
            ))}
          </View>

          <TouchableOpacity
            style={styles.actionBtn}
            onPress={handleNext}
            activeOpacity={0.8}
          >
            <Text style={styles.actionBtnText}>
              {currentIndex === slides.length - 1 ? 'Get Started' : 'Next'}
            </Text>
            <Ionicons
              name={currentIndex === slides.length - 1 ? 'checkmark-circle' : 'arrow-forward'}
              size={20}
              color="#2563eb"
            />
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#2563eb',
  },
  skipBtn: {
    position: 'absolute',
    top: 12,
    right: 20,
    zIndex: 30,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  skipText: {
    fontSize: 15,
    fontFamily: 'Inter_600SemiBold',
    color: '#ffffff',
  },
  mainWrapper: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollView: {
    flexGrow: 0,
    height: 320,
    width: width,
  },
  scrollContent: {
    alignItems: 'center',
  },
  slide: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 26,
    paddingVertical: 2,
  },
  contentBox: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 2,
    width: '100%',
  },
  iconWrap: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: 'rgba(255, 255, 255, 0.18)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  title: {
    fontSize: 26,
    fontFamily: 'SpaceGrotesk_700Bold',
    color: '#ffffff',
    textAlign: 'center',
    marginBottom: 8,
    paddingHorizontal: 2,
  },
  subtitle: {
    fontSize: 15,
    fontFamily: 'Inter_400Regular',
    color: 'rgba(255, 255, 255, 0.85)',
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: 14,
    paddingVertical: 2,
  },
  middleControls: {
    width: width - 52,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
    gap: 18,
    zIndex: 20,
  },
  dots: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
  },
  dot: {
    height: 8,
    borderRadius: 4,
  },
  dotActive: {
    width: 24,
    backgroundColor: '#ffffff',
  },
  dotInactive: {
    width: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.35)',
  },
  actionBtn: {
    width: '100%',
    flexDirection: 'row',
    height: 52,
    borderRadius: 26,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  actionBtnText: {
    color: '#2563eb',
    fontSize: 16,
    fontFamily: 'Inter_700Bold',
  },
});