import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, View } from 'react-native';

function usePulseOpacity() {
  const opacity = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 0.6,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.3,
          duration: 800,
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [opacity]);

  return opacity;
}

function SkeletonBlock({
  opacity,
  width,
  height,
  radius = 8,
  style,
}: {
  opacity: Animated.Value;
  width: number | string;
  height: number;
  radius?: number;
  style?: any;
}) {
  return (
    <Animated.View
      style={[
        styles.skeletonBlock,
        { width, height, borderRadius: radius, opacity },
        style,
      ]}
    />
  );
}

export function StatsSkeleton() {
  const opacity = usePulseOpacity();

  return (
    <View style={styles.container}>
      {/* Top summary cards */}
      <View style={styles.cardsRow}>
        <View style={styles.card}>
          <SkeletonBlock opacity={opacity} width="44%" height={12} radius={6} />
          <SkeletonBlock opacity={opacity} width="32%" height={28} radius={10} />
          <SkeletonBlock opacity={opacity} width="55%" height={12} radius={6} />
        </View>

        <View style={styles.card}>
          <SkeletonBlock opacity={opacity} width="36%" height={12} radius={6} />
          <SkeletonBlock opacity={opacity} width="42%" height={28} radius={10} />
          <SkeletonBlock opacity={opacity} width="62%" height={12} radius={6} />
        </View>
      </View>

      {/* Workouts by weekday */}
      <View style={styles.sectionCard}>
        <SkeletonBlock opacity={opacity} width="55%" height={16} radius={8} />
        <SkeletonBlock opacity={opacity} width="70%" height={12} radius={6} style={{ marginTop: 2 }} />
        <SkeletonBlock opacity={opacity} width="100%" height={170} radius={14} style={{ marginTop: 8 }} />
      </View>

      {/* AMRAP */}
      <View style={styles.sectionCard}>
        <SkeletonBlock opacity={opacity} width="28%" height={16} radius={8} />
        <SkeletonBlock opacity={opacity} width="78%" height={12} radius={6} style={{ marginTop: 2 }} />

        <View style={styles.pillsRow}>
          {Array.from({ length: 4 }).map((_, i) => (
            <SkeletonBlock key={i} opacity={opacity} width={110} height={36} radius={999} />
          ))}
        </View>

        <SkeletonBlock opacity={opacity} width="100%" height={240} radius={14} style={{ marginTop: 8 }} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 16,
  },
  cardsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  card: {
    flex: 1,
    borderRadius: 18,
    padding: 14,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(236, 235, 228, 0.12)',
    backgroundColor: 'rgba(236, 235, 228, 0.06)',
    gap: 10,
  },
  sectionCard: {
    backgroundColor: 'rgba(236, 235, 228, 0.08)',
    borderRadius: 18,
    padding: 16,
    gap: 10,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(236, 235, 228, 0.12)',
  },
  pillsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 2,
  },
  skeletonBlock: {
    backgroundColor: 'rgba(236, 235, 228, 0.15)',
  },
});


