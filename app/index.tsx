import { useEvent } from 'expo';
import { Redirect, router } from 'expo-router';
import { useVideoPlayer, VideoView } from 'expo-video';
import React, { useEffect } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { TrenaLogo } from '@/components/TrenaLogo';
import { Fonts, TrenaColors } from '@/constants/theme';
import { useAuthContext } from '@/hooks/use-auth-context';

function HeroContent() {
  const player = useVideoPlayer(require('@/assets/videos/hero.mp4'), (p) => {
    p.loop = true;
    p.muted = true;
  });

  const { status } = useEvent(player, 'statusChange', { status: player.status });

  useEffect(() => {
    // On some platforms, calling play() too early can be ignored. Kick off playback once ready.
    if (status === 'readyToPlay') {
      player.play();
    }
  }, [player, status]);

  return (
    <View style={styles.root}>
      <VideoView
        player={player}
        style={styles.video}
        contentFit="cover"
        nativeControls={false}
        surfaceType="textureView"
      />

      {/* Dark overlay + desaturation effect */}
      <View style={styles.overlay} pointerEvents="none" />
      <View style={styles.desaturateOverlay} pointerEvents="none" />

      <SafeAreaView style={styles.safe}>
        <View style={styles.content}>
          <View style={styles.centerBlock}>
            <TrenaLogo width={200} height={55} color={TrenaColors.primary} />
            <Text style={styles.tagline}>Start training right now</Text>
          </View>

          <Pressable
            accessibilityRole="button"
            onPress={() => router.push('/get-started')}
            style={({ pressed }) => [
              styles.cta,
              { backgroundColor: TrenaColors.primary },
              pressed && styles.pressed
            ]}
          >
            <Text style={styles.ctaText}>Get started</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    </View>
  );
}

export default function HeroScreen() {
  const { isLoading, isLoggedIn } = useAuthContext();

  // If already authenticated, skip the hero CTA and go straight home.
  if (!isLoading && isLoggedIn) {
    return <Redirect href="/today" />;
  }

  return <HeroContent />;
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: TrenaColors.background,
  },
  video: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 0,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1,
    // Dark overlay (increase value for darker)
    backgroundColor: 'rgba(0, 0, 0, 0.86)',
  },
  desaturateOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1,
    // Semi-transparent gray to wash out colors and reduce saturation
    backgroundColor: 'rgba(20, 20, 20, 0.65)',
  },
  safe: {
    flex: 1,
    zIndex: 2,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingVertical: 24,
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  centerBlock: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10,
  },
  title: {
    color: 'rgba(236, 235, 228, 0.95)',
    fontSize: 56,
    lineHeight: 60,
    fontFamily: Fonts.black,
    letterSpacing: -0.8,
  },
  tagline: {
    color: 'rgba(236, 235, 228, 0.85)',
    fontSize: 16,
    lineHeight: 22,
    fontFamily: Fonts.semiBold,
    letterSpacing: 0.2,
    textTransform: 'uppercase',
  },
  cta: {
    width: '100%',
    borderRadius: 18,
    paddingVertical: 16,
    alignItems: 'center',
    backgroundColor: TrenaColors.primary,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: TrenaColors.background,
  },
  ctaText: {
    color: TrenaColors.background,
    fontSize: 16,
    fontFamily: Fonts.black,
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  pressed: {
    transform: [{ scale: 0.99 }],
    opacity: 0.96,
  },
});


