import { useNetInfo } from '@react-native-community/netinfo';
import { useEvent } from 'expo';
import { Redirect, router } from 'expo-router';
import { useVideoPlayer, VideoView } from 'expo-video';
import React, { useEffect } from 'react';
import { Image, Platform, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { SvgUri } from 'react-native-svg';

import { TrenaLogo } from '@/components/TrenaLogo';
import { Fonts, rgba } from '@/constants/theme';
import { useAuthContext } from '@/hooks/use-auth-context';
import { useTrenaTheme } from '@/hooks/use-theme-context';

const splashSvgUri = Image.resolveAssetSource(require('@/assets/images/splash-letter.svg')).uri;

function HeroContent() {
  const { width } = useWindowDimensions();
  void width; // keep hook for future responsive tweaks without lint warnings
  const { colors } = useTrenaTheme();
  const styles = React.useMemo(() => createStyles(colors), [colors]);

  const player = useVideoPlayer(require('@/assets/videos/hero.mp4'), (p) => {
    p.loop = true;
    p.muted = true;
  });

  const { status } = useEvent(player, 'statusChange', { status: player.status });
  const showLoadingSplash = status === 'idle' || status === 'loading';

  useEffect(() => {
    // On some platforms, calling play() too early can be ignored. Kick off playback once ready.
    if (status !== 'idle' && status !== 'loading' && status !== 'error') {
      player.play();
    }
  }, [player, status]);

  return (
    <View style={styles.root}>
      <VideoView
        key="hero-video"
        player={player}
        style={styles.video}
        contentFit="cover"
        nativeControls={false}
        // TextureVideoView can crash on some Android devices/fast-refresh with:
        // "Cannot use shared object that was already released".
        // SurfaceView is safer; our UI also works without relying on texture overlays.
        surfaceType={Platform.OS === 'android' ? 'surfaceView' : undefined}
      />

      {/* Dark overlay + desaturation effect */}
      <View style={styles.overlay} pointerEvents="none" />
      <View style={styles.desaturateOverlay} pointerEvents="none" />

      {showLoadingSplash ? (
        <View style={styles.loadingSplash} pointerEvents="none">
          <SvgUri
            uri={splashSvgUri}
            width={180}
            height={50}
            color={colors.primary}
          />
        </View>
      ) : (
        <SafeAreaView style={styles.safe}>
          <View style={styles.content}>
            <View style={styles.centerBlock}>
              <TrenaLogo width={200} height={55} color={colors.primary} />
              <Text style={styles.tagline}>Start training right now</Text>
            </View>

            <Pressable
              accessibilityRole="button"
              onPress={() => router.push('/get-started')}
              style={({ pressed }) => [
                styles.cta,
                { backgroundColor: colors.primary },
                pressed && styles.pressed,
              ]}
            >
              <Text style={styles.ctaText}>Get started</Text>
            </Pressable>
          </View>
        </SafeAreaView>
      )}
    </View>
  );
}

export default function HeroScreen() {
  const { isLoading, isLoggedIn } = useAuthContext();
  const netinfo = useNetInfo();

  // If already authenticated, skip the hero CTA and go straight home.
  if (!isLoading && isLoggedIn) {
    return <Redirect href="/today" />;
  }

  // Model A gating: if not signed in and offline, show only a connect screen.
  if (!isLoading && !isLoggedIn && netinfo.isConnected === false) {
    return <Redirect href="/connect" />;
  }

  return <HeroContent />;
}

const createStyles = (colors: { background: string; text: string; onPrimary: string }) =>
  StyleSheet.create({
    root: {
      flex: 1,
      backgroundColor: colors.background,
    },
    video: {
      ...StyleSheet.absoluteFillObject,
      zIndex: 0,
    },
    overlay: {
      ...StyleSheet.absoluteFillObject,
      zIndex: 1,
      // Dark overlay (increase alpha for darker). Keep subtle so the video stays visible.
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
    },
    desaturateOverlay: {
      ...StyleSheet.absoluteFillObject,
      zIndex: 1,
      // Semi-transparent gray to slightly wash out colors (lower alpha = more vivid)
      backgroundColor: 'rgba(20, 20, 20, 0.3)',
    },
    loadingSplash: {
      ...StyleSheet.absoluteFillObject,
      zIndex: 3,
      backgroundColor: colors.background,
      alignItems: 'center',
      justifyContent: 'center',
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
      color: rgba(colors.text, 0.95),
      fontSize: 56,
      lineHeight: 60,
      fontFamily: Fonts.black,
      letterSpacing: -0.8,
    },
    tagline: {
      color: colors.text,
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
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: rgba(colors.text, 0.12),
    },
    ctaText: {
      color: colors.onPrimary,
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


