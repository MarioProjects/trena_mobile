import { CheckIcon } from '@/components/icons';
import { Fonts, rgba } from '@/constants/theme';
import { useTrenaTheme } from '@/hooks/use-theme-context';
import React, { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
    FadeInUp,
    FadeOutDown
} from 'react-native-reanimated';

interface ToastProps {
  message: string;
  visible: boolean;
  onHide?: () => void;
  duration?: number;
}

export function Toast({ message, visible, onHide, duration = 3000 }: ToastProps) {
  const { colors } = useTrenaTheme();

  useEffect(() => {
    if (visible && onHide) {
      const timer = setTimeout(() => {
        onHide();
      }, duration);
      return () => clearTimeout(timer);
    }
  }, [visible, duration, onHide]);

  if (!visible) return null;

  return (
    <View style={styles.container} pointerEvents="none">
      <Animated.View 
        entering={FadeInUp.duration(300)}
        exiting={FadeOutDown.duration(200)}
        style={[
          styles.toast, 
          { 
            backgroundColor: colors.primary,
            shadowColor: colors.primary,
          }
        ]}
      >
        <View style={styles.content}>
          <View style={[styles.iconContainer, { backgroundColor: rgba(colors.onPrimary, 0.2) }]}>
            <CheckIcon size={18} color={colors.onPrimary} />
          </View>
          <Text style={[styles.text, { color: colors.onPrimary }]}>{message}</Text>
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 100, // Above tab bar
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 9999,
  },
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 20,
    maxWidth: '90%',
    elevation: 8,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  iconContainer: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    fontFamily: Fonts.bold,
    fontSize: 15,
  },
});

