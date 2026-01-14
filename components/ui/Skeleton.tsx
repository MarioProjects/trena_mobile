import { rgba } from '@/constants/theme';
import { useTrenaTheme } from '@/hooks/use-theme-context';
import React, { useEffect, useRef } from 'react';
import { Animated, DimensionValue, StyleSheet, ViewStyle } from 'react-native';

export function usePulseOpacity() {
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

interface SkeletonBlockProps {
  opacity: Animated.Value;
  width: DimensionValue;
  height: number;
  radius?: number;
  style?: ViewStyle;
}

export function SkeletonBlock({
  opacity,
  width,
  height,
  radius = 8,
  style,
}: SkeletonBlockProps) {
  const { colors } = useTrenaTheme();
  return (
    <Animated.View
      style={[
        styles.skeletonBlock,
        { 
          width, 
          height, 
          borderRadius: radius, 
          opacity, 
          backgroundColor: rgba(colors.text, 0.12) 
        } as any,
        style,
      ]}
    />
  );
}

const styles = StyleSheet.create({
  skeletonBlock: {
    // Background color is dynamic
  },
});
