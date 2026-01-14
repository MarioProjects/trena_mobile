import { rgba } from '@/constants/theme';
import { useTrenaTheme } from '@/hooks/use-theme-context';
import React from 'react';
import { StyleSheet, View } from 'react-native';
import { SkeletonBlock, usePulseOpacity } from '../ui/Skeleton';

export function StatsSkeleton() {
  const { colors } = useTrenaTheme();
  const opacity = usePulseOpacity();
  const themedStyles = styles(colors);

  return (
    <View style={themedStyles.container}>
      {/* Top summary cards */}
      <View style={themedStyles.cardsRow}>
        <View style={themedStyles.card}>
          <SkeletonBlock opacity={opacity} width="44%" height={12} radius={6} />
          <SkeletonBlock opacity={opacity} width="32%" height={28} radius={10} />
          <SkeletonBlock opacity={opacity} width="55%" height={12} radius={6} />
        </View>

        <View style={themedStyles.card}>
          <SkeletonBlock opacity={opacity} width="36%" height={12} radius={6} />
          <SkeletonBlock opacity={opacity} width="42%" height={28} radius={10} />
          <SkeletonBlock opacity={opacity} width="62%" height={12} radius={6} />
        </View>
      </View>

      {/* Workouts by weekday */}
      <View style={themedStyles.sectionCard}>
        <SkeletonBlock opacity={opacity} width="55%" height={16} radius={8} />
        <SkeletonBlock opacity={opacity} width="70%" height={12} radius={6} style={{ marginTop: 2 }} />
        <SkeletonBlock opacity={opacity} width="100%" height={170} radius={14} style={{ marginTop: 8 }} />
      </View>

      {/* AMRAP */}
      <View style={themedStyles.sectionCard}>
        <SkeletonBlock opacity={opacity} width="28%" height={16} radius={8} />
        <SkeletonBlock opacity={opacity} width="78%" height={12} radius={6} style={{ marginTop: 2 }} />

        <View style={themedStyles.pillsRow}>
          {Array.from({ length: 4 }).map((_, i) => (
            <SkeletonBlock key={i} opacity={opacity} width={110} height={36} radius={999} />
          ))}
        </View>

        <SkeletonBlock opacity={opacity} width="100%" height={240} radius={14} style={{ marginTop: 8 }} />
      </View>
    </View>
  );
}

const styles = (colors: any) => StyleSheet.create({
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
    borderColor: rgba(colors.text, 0.12),
    backgroundColor: rgba(colors.text, 0.06),
    gap: 10,
  },
  sectionCard: {
    backgroundColor: rgba(colors.text, 0.08),
    borderRadius: 18,
    padding: 16,
    gap: 10,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: rgba(colors.text, 0.12),
  },
  pillsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 2,
  },
});


