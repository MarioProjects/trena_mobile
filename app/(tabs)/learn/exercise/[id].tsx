import { useEvent } from 'expo';
import { useVideoPlayer, VideoView } from 'expo-video';
import * as WebBrowser from 'expo-web-browser';
import React, { useEffect } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ChevronLeftIcon } from '@/components/icons';
import { Fonts, TrenaColors } from '@/constants/theme';
import { learnData } from '@/data/learn';
import type { LearnItem } from '@/data/learn/types';
import { Image } from 'expo-image';
import { Redirect, router, useLocalSearchParams } from 'expo-router';

const placeholderImage = require('@/assets/images/mock.webp');

function getImageSource(image: string | undefined) {
  if (!image) return placeholderImage;
  if (image.includes('mock.webp')) return placeholderImage;
  if (image.startsWith('http://') || image.startsWith('https://')) return { uri: image };
  return placeholderImage;
}

function getPlayableVideoSource(videoUrl: string | undefined) {
  if (!videoUrl) return undefined;
  const url = videoUrl.trim();
  const lower = url.toLowerCase();
  const looksLikeYoutube =
    lower.includes('youtube.com/watch') || lower.includes('youtu.be/') || lower.includes('youtube.com/shorts');
  if (looksLikeYoutube) return undefined;
  if (lower.startsWith('http://') || lower.startsWith('https://')) return { uri: url };
  return undefined;
}

function Pill({ label }: { label: string }) {
  return (
    <View style={styles.pill}>
      <Text style={styles.pillText}>{label}</Text>
    </View>
  );
}

function SectionTitle({ children }: { children: string }) {
  return <Text style={styles.sectionTitle}>{children}</Text>;
}

function Bullets({ items }: { items: string[] }) {
  if (!items?.length) return <Text style={styles.muted}>—</Text>;
  return (
    <View style={{ gap: 8 }}>
      {items.map((x, idx) => (
        <View key={`${idx}-${x}`} style={styles.bulletRow}>
          <View style={styles.bulletDot} />
          <Text style={styles.bulletText}>{x}</Text>
        </View>
      ))}
    </View>
  );
}

function EmbeddableVideo({ uri }: { uri: string }) {
  const { height: screenHeight } = useWindowDimensions();
  const videoHeight = Math.round(Math.min(Math.max(screenHeight * 0.35, 220), 460));

  const player = useVideoPlayer({ uri }, (p) => {
    p.loop = false;
    p.muted = false;
  });
  const { status } = useEvent(player, 'statusChange', { status: player.status });

  useEffect(() => {
    if (status === 'readyToPlay') player.play();
  }, [player, status]);

  return (
    <VideoView
      player={player}
      style={[styles.video, { height: videoHeight }]}
      contentFit="cover"
      nativeControls
      surfaceType="textureView"
      allowsFullscreen
      allowsPictureInPicture
    />
  );
}

function VideoBlock({ item }: { item: LearnItem }) {
  const { height: screenHeight } = useWindowDimensions();
  const videoHeight = Math.round(Math.min(Math.max(screenHeight * 0.35, 220), 460));
  const source = getPlayableVideoSource(item.videoUrl);

  if (source?.uri) {
    return (
      <View style={styles.videoWrap}>
        <EmbeddableVideo uri={source.uri} />
      </View>
    );
  }

  const canOpen = !!item.videoUrl;
  return (
    <Pressable
      accessibilityRole={canOpen ? 'button' : undefined}
      disabled={!canOpen}
      onPress={() => (item.videoUrl ? WebBrowser.openBrowserAsync(item.videoUrl) : undefined)}
      style={({ pressed }) => [styles.videoWrap, canOpen && pressed && { opacity: 0.95 }]}
    >
      <Image
        source={getImageSource(item.image)}
        style={[styles.videoFallbackImage, { height: videoHeight }]}
        contentFit="cover"
      />
      <View style={styles.videoOverlay} pointerEvents="none" />
      <View style={styles.videoOverlayInner} pointerEvents="none">
        <Text style={styles.videoOverlayTitle}>Video</Text>
        <Text style={styles.videoOverlayBody}>
          {canOpen ? 'Tap to open the video link' : 'No video available for this item'}
        </Text>
      </View>
    </Pressable>
  );
}

export default function ExerciseDetailScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const targetId = typeof id === 'string' ? id : undefined;
  const { height: screenHeight } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const heroHeight = Math.round(Math.min(Math.max(screenHeight * 0.35, 220), 460));

  const item = React.useMemo(() => {
    if (!targetId) return undefined;
    return learnData.find((x) => x.id === targetId);
  }, [targetId]);

  if (!item || !targetId) {
    return <Redirect href="/learn" />;
  }

  if (item.type !== 'exercise') {
    return <Redirect href={`/learn/${item.type}/${item.id}`} />;
  }

  return (
    <View style={styles.safe}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={[styles.hero, { height: heroHeight }]}>
          <VideoBlock item={item} />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Back"
            onPress={() => router.back()}
            hitSlop={16}
            style={({ pressed }) => [
              styles.heroBack,
              { top: insets.top + 8, left: insets.left + 8 },
              pressed && styles.heroBackPressed,
            ]}
          >
            <View style={styles.heroBackBg}>
              <ChevronLeftIcon size={34} color={TrenaColors.primary} strokeWidth={2} />
            </View>
          </Pressable>
        </View>

        <View style={styles.sheet}>
          <Text style={styles.title}>{item.name}</Text>
          <Text style={styles.meta}>
            {item.level || '—'} • {item.goal || '—'}
          </Text>
          <Text style={styles.lede}>{item.description}</Text>

          <View style={styles.pillsRow}>
            <Pill label="EXERCISE" />
            {(item.tags || []).slice(0, 8).map((t) => (
              <Pill key={t} label={t} />
            ))}
          </View>

          <View style={styles.section}>
            <SectionTitle>How it works</SectionTitle>
            <Text style={styles.body}>{item.long_description || item.description}</Text>
          </View>

          <View style={styles.section}>
            <SectionTitle>Equipment</SectionTitle>
            <Bullets items={item.equipment || []} />
          </View>

          <View style={styles.section}>
            <SectionTitle>Cues (Do)</SectionTitle>
            <Bullets items={item.dos || []} />
          </View>

          <View style={styles.section}>
            <SectionTitle>Common mistakes (Don&apos;t)</SectionTitle>
            <Bullets items={item.donts || []} />
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: TrenaColors.background,
  },
  scrollContent: {
    paddingBottom: 22,
    gap: 0,
  },
  hero: {
    position: 'relative',
    width: '100%',
  },
  heroBack: {
    position: 'absolute',
    zIndex: 10,
  },
  heroBackPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.98 }],
  },
  heroBackBg: {
    width: 44,
    height: 44,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  sheet: {
    marginTop: -22,
    paddingTop: 18,
    paddingHorizontal: 20,
    paddingBottom: 24,
    gap: 12,
    backgroundColor: TrenaColors.background,
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
  },
  title: {
    fontFamily: Fonts.extraBold,
    fontSize: 28,
    lineHeight: 34,
    color: TrenaColors.text,
    letterSpacing: -0.3,
  },
  meta: {
    fontFamily: Fonts.medium,
    fontSize: 13,
    lineHeight: 18,
    color: 'rgba(236, 235, 228, 0.75)',
  },
  lede: {
    fontFamily: Fonts.regular,
    fontSize: 15,
    lineHeight: 22,
    color: 'rgba(236, 235, 228, 0.88)',
  },
  videoWrap: {
    borderRadius: 0,
    overflow: 'hidden',
    backgroundColor: 'rgba(0,0,0,0.25)',
  },
  video: {
    width: '100%',
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  videoFallbackImage: {
    width: '100%',
  },
  videoOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  videoOverlayInner: {
    ...StyleSheet.absoluteFillObject,
    paddingHorizontal: 14,
    paddingTop: 14,
    paddingBottom: 44,
    justifyContent: 'flex-end',
    gap: 2,
  },
  videoOverlayTitle: {
    fontFamily: Fonts.black,
    fontSize: 14,
    color: 'rgba(236, 235, 228, 0.95)',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  videoOverlayBody: {
    fontFamily: Fonts.regular,
    fontSize: 13,
    color: 'rgba(236, 235, 228, 0.8)',
  },
  pillsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    paddingTop: 2,
  },
  pill: {
    borderWidth: 1,
    borderColor: 'rgba(236, 235, 228, 0.14)',
    backgroundColor: 'rgba(236, 235, 228, 0.04)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  pillText: {
    fontFamily: Fonts.medium,
    fontSize: 12,
    lineHeight: 14,
    color: 'rgba(236, 235, 228, 0.8)',
  },
  section: {
    gap: 10,
    paddingTop: 8,
  },
  sectionTitle: {
    fontFamily: Fonts.bold,
    fontSize: 15,
    lineHeight: 20,
    color: TrenaColors.text,
    letterSpacing: -0.15,
  },
  body: {
    fontFamily: Fonts.regular,
    fontSize: 14,
    lineHeight: 21,
    color: 'rgba(236, 235, 228, 0.85)',
  },
  muted: {
    fontFamily: Fonts.regular,
    fontSize: 14,
    lineHeight: 20,
    color: 'rgba(236, 235, 228, 0.6)',
  },
  bulletRow: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'flex-start',
  },
  bulletDot: {
    width: 6,
    height: 6,
    borderRadius: 999,
    marginTop: 7,
    backgroundColor: TrenaColors.primary,
  },
  bulletText: {
    flex: 1,
    fontFamily: Fonts.regular,
    fontSize: 14,
    lineHeight: 21,
    color: 'rgba(236, 235, 228, 0.85)',
  },
});

