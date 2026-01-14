import { rgba } from '@/constants/theme';
import { useTrenaTheme } from '@/hooks/use-theme-context';
import React from 'react';
import { StyleSheet, View } from 'react-native';
import { SkeletonBlock, usePulseOpacity } from './ui/Skeleton';

const SkeletonItem = ({ opacity, colors }: { opacity: any; colors: any }) => {
    const themedStyles = styles(colors);
    return (
        <View style={themedStyles.card}>
            <View style={{ flex: 1, gap: 10 }}>
                <View style={themedStyles.cardHeaderRow}>
                    {/* Title Stub */}
                    <SkeletonBlock opacity={opacity} width="40%" height={20} radius={4} />
                    {/* Badge Stub */}
                    <SkeletonBlock opacity={opacity} width={70} height={22} radius={11} />
                </View>
                {/* Meta Stub */}
                <SkeletonBlock opacity={opacity} width="60%" height={16} radius={4} />
            </View>
        </View>
    );
};

export const WorkoutsSkeleton = () => {
    const opacity = usePulseOpacity();
    const { colors } = useTrenaTheme();
    const themedStyles = styles(colors);

    return (
        <View style={themedStyles.container}>
            {Array.from({ length: 5 }).map((_, i) => (
                <SkeletonItem key={i} opacity={opacity} colors={colors} />
            ))}
        </View>
    );
};

const styles = (colors: any) => StyleSheet.create({
    container: {
        gap: 12,
    },
    card: {
        borderWidth: 1,
        borderColor: rgba(colors.text, 0.12),
        backgroundColor: rgba(colors.text, 0.04),
        padding: 12,
        borderRadius: 14,
        flexDirection: 'row',
        gap: 12,
    },
    cardHeaderRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 10,
    },
});
