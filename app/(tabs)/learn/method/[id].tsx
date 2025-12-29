import { useEvent } from 'expo';
import { useVideoPlayer, VideoView } from 'expo-video';
import * as WebBrowser from 'expo-web-browser';
import React, { useEffect } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ChevronLeftIcon, MethodsIcon } from '@/components/icons';
import { Fonts, rgba } from '@/constants/theme';
import { learnData } from '@/data/learn';
import type { LearnItem } from '@/data/learn/types';
import { useTrenaTheme } from '@/hooks/use-theme-context';
import { Image } from 'expo-image';
import { Redirect, router, useLocalSearchParams } from 'expo-router';

const placeholderImage = require('@/assets/images/mock.webp');
const localLearnImages: Record<string, number> = {
  'assets/images/learn/methods/bilbo.webp': require('@/assets/images/learn/methods/bilbo.webp'),
};

function getImageSource(image: string | undefined) {
  if (!image) return placeholderImage;
  if (image.includes('mock.webp')) return placeholderImage;
  if (localLearnImages[image]) return localLearnImages[image];
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
  // expo-video expects a direct media URL (mp4 / m3u8 / etc)
  if (lower.startsWith('http://') || lower.startsWith('https://')) return { uri: url };
  return undefined;
}

function formatDaysPerWeekMeta(daysPerWeek: string | undefined): string | null {
  const raw = daysPerWeek?.trim();
  if (!raw) return null;
  const lower = raw.toLowerCase();
  if (lower === 'n/a' || lower === 'na' || lower === 'none' || lower === '-' || lower === '—') return null;
  return `${raw} days/week`;
}

function useDetailStyles() {
  const { colors } = useTrenaTheme();
  return React.useMemo(() => createStyles(colors), [colors]);
}

function Pill({ label }: { label: string }) {
  const styles = useDetailStyles();
  return (
    <View style={styles.pill}>
      <Text style={styles.pillText}>{label}</Text>
    </View>
  );
}

function SectionTitle({ children }: { children: string }) {
  const styles = useDetailStyles();
  return <Text style={styles.sectionTitle}>{children}</Text>;
}

function Bullets({ items }: { items: string[] }) {
  const styles = useDetailStyles();
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
  const styles = useDetailStyles();
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
      surfaceType={Platform.OS === 'android' ? 'surfaceView' : undefined}
      allowsFullscreen
      allowsPictureInPicture
    />
  );
}

function VideoBlock({ item }: { item: LearnItem }) {
  const styles = useDetailStyles();
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

export default function MethodDetailScreen() {
  const { colors } = useTrenaTheme();
  const styles = useDetailStyles();
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

  if (item.type !== 'method') {
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
              <ChevronLeftIcon size={34} color={colors.primary} strokeWidth={2} />
            </View>
          </Pressable>
        </View>

        <View style={styles.sheet}>
          <View style={styles.titleRow}>
            <Text style={styles.title} numberOfLines={1}>
              {item.name}
            </Text>
            <MethodsIcon size={22} color={colors.primary} />
          </View>
          <Text style={styles.meta}>
            {[item.level || '—', formatDaysPerWeekMeta(item.days_per_week), item.goal || '—']
              .filter((x): x is string => Boolean(x))
              .join(' • ')}
          </Text>
          <Text style={styles.lede}>{item.description}</Text>

          <View style={styles.pillsRow}>
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
            <SectionTitle>Do</SectionTitle>
            <Bullets items={item.dos || []} />
          </View>

          <View style={styles.section}>
            <SectionTitle>Don&apos;t</SectionTitle>
            <Bullets items={item.donts || []} />
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const createStyles = (colors: { background: string; primary: string; text: string }) =>
  StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background,
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
    // Pull the content up over the video, with rounded corners like a "sheet".
    marginTop: -22,
    paddingTop: 18,
    paddingHorizontal: 20,
    paddingBottom: 24,
    gap: 12,
    backgroundColor: colors.background,
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  meta: {
    fontFamily: Fonts.medium,
    fontSize: 13,
    lineHeight: 18,
    color: rgba(colors.text, 0.75),
  },
  title: {
    fontFamily: Fonts.extraBold,
    fontSize: 28,
    lineHeight: 34,
    color: colors.text,
    letterSpacing: -0.3,
    flexShrink: 1,
    minWidth: 0,
  },
  lede: {
    fontFamily: Fonts.regular,
    fontSize: 15,
    lineHeight: 22,
    color: rgba(colors.text, 0.88),
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
    // Keep overlay text visible above the curved "sheet" overlap.
    paddingBottom: 44,
    justifyContent: 'flex-end',
    gap: 2,
  },
  videoOverlayTitle: {
    fontFamily: Fonts.black,
    fontSize: 14,
    color: rgba(colors.text, 0.95),
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  videoOverlayBody: {
    fontFamily: Fonts.regular,
    fontSize: 13,
    color: rgba(colors.text, 0.8),
  },
  pillsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    paddingTop: 2,
  },
  pill: {
    borderWidth: 1,
    borderColor: rgba(colors.text, 0.14),
    backgroundColor: rgba(colors.text, 0.04),
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  pillText: {
    fontFamily: Fonts.medium,
    fontSize: 12,
    lineHeight: 14,
    color: rgba(colors.text, 0.8),
  },
  section: {
    gap: 10,
    paddingTop: 8,
  },
  sectionTitle: {
    fontFamily: Fonts.bold,
    fontSize: 15,
    lineHeight: 20,
    color: colors.text,
    letterSpacing: -0.15,
  },
  body: {
    fontFamily: Fonts.regular,
    fontSize: 14,
    lineHeight: 21,
    color: rgba(colors.text, 0.85),
  },
  muted: {
    fontFamily: Fonts.regular,
    fontSize: 14,
    lineHeight: 20,
    color: rgba(colors.text, 0.6),
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
    backgroundColor: colors.primary,
  },
  bulletText: {
    flex: 1,
    fontFamily: Fonts.regular,
    fontSize: 14,
    lineHeight: 21,
    color: rgba(colors.text, 0.85),
  },
  });
