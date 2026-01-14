import { rgba } from '@/constants/theme';
import { useTrenaTheme } from '@/hooks/use-theme-context';
import React from 'react';
import { StyleSheet, View } from 'react-native';
import { SkeletonBlock, usePulseOpacity } from './ui/Skeleton';

export function TodaySkeleton() {
  const { colors } = useTrenaTheme();
  const opacity = usePulseOpacity();
  const themedStyles = styles(colors);

  return (
    <View style={themedStyles.container}>
      {/* Summary Cards Row */}
      <View style={themedStyles.cardsRow}>
        <View style={[themedStyles.card, { backgroundColor: rgba(colors.text, 0.05) }]}>
          <SkeletonBlock opacity={opacity} width="50%" height={12} radius={6} />
          <SkeletonBlock opacity={opacity} width="35%" height={24} radius={10} style={{ marginTop: 8 }} />
          <SkeletonBlock opacity={opacity} width="45%" height={12} radius={6} style={{ marginTop: 4 }} />
        </View>
        <View style={[themedStyles.card, { backgroundColor: rgba(colors.text, 0.05) }]}>
          <SkeletonBlock opacity={opacity} width="50%" height={12} radius={6} />
          <SkeletonBlock opacity={opacity} width="35%" height={24} radius={10} style={{ marginTop: 8 }} />
          <SkeletonBlock opacity={opacity} width="45%" height={12} radius={6} style={{ marginTop: 4 }} />
        </View>
      </View>

      {/* Main Next Up Card */}
      <View style={[themedStyles.nextUpCard, { backgroundColor: colors.surface }]}>
        <View style={themedStyles.nextUpHeaderRow}>
          <SkeletonBlock opacity={opacity} width="20%" height={12} radius={6} />
          <SkeletonBlock opacity={opacity} width="25%" height={20} radius={10} />
        </View>
        <SkeletonBlock opacity={opacity} width="65%" height={28} radius={10} style={{ marginTop: 12 }} />
        <SkeletonBlock opacity={opacity} width="40%" height={16} radius={8} style={{ marginTop: 8 }} />
        <SkeletonBlock opacity={opacity} width="100%" height={48} radius={16} style={{ marginTop: 20 }} />
      </View>

      {/* Recent activity list */}
      <View style={themedStyles.section}>
        <SkeletonBlock opacity={opacity} width="45%" height={20} radius={8} style={{ marginBottom: 16 }} />
        <View style={themedStyles.list}>
          {[1, 2].map((i) => (
            <View key={i} style={[themedStyles.sessionCard, { backgroundColor: rgba(colors.text, 0.03) }]}>
              <View style={{ flex: 1, gap: 10 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <SkeletonBlock opacity={opacity} width="55%" height={20} radius={6} />
                  <SkeletonBlock opacity={opacity} width={50} height={18} radius={9} />
                </View>
                <SkeletonBlock opacity={opacity} width="70%" height={14} radius={6} />
              </View>
            </View>
          ))}
        </View>
      </View>
    </View>
  );
}

const styles = (colors: any) => StyleSheet.create({
  container: {
    gap: 16,
  },
  skeletonBlock: {
    // backgroundColor is set dynamically based on theme
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
    borderColor: rgba(colors.text, 0.08),
  },
  nextUpCard: {
    borderRadius: 24,
    padding: 20,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: rgba(colors.text, 0.1),
  },
  nextUpHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  section: {
    marginTop: 8,
  },
  list: {
    gap: 12,
  },
  sessionCard: {
    borderRadius: 14,
    padding: 16,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: rgba(colors.text, 0.08),
  },
});

