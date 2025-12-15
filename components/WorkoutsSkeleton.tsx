import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, View } from 'react-native';

const SkeletonItem = () => {
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
            ])
        );
        loop.start();
        return () => loop.stop();
    }, [opacity]);

    return (
        <View style={styles.card}>
            <View style={{ flex: 1, gap: 10 }}>
                <View style={styles.cardHeaderRow}>
                    {/* Title Stub */}
                    <Animated.View style={[styles.skeletonBlock, { width: '40%', height: 20, opacity }]} />
                    {/* Badge Stub */}
                    <Animated.View style={[styles.skeletonBlock, { width: 70, height: 22, borderRadius: 11, opacity }]} />
                </View>
                {/* Meta Stub */}
                <Animated.View style={[styles.skeletonBlock, { width: '60%', height: 16, opacity }]} />
            </View>
        </View>
    );
};

export const WorkoutsSkeleton = () => {
    return (
        <View style={styles.container}>
            {Array.from({ length: 5 }).map((_, i) => (
                <SkeletonItem key={i} />
            ))}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        gap: 12,
    },
    card: {
        borderWidth: 1,
        borderColor: 'rgba(236, 235, 228, 0.12)',
        backgroundColor: 'rgba(236, 235, 228, 0.04)',
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
    skeletonBlock: {
        backgroundColor: 'rgba(236, 235, 228, 0.15)',
        borderRadius: 4,
    },
});
