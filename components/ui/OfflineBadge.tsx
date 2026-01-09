import { useNetInfo } from '@react-native-community/netinfo';
import React, { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Fonts, rgba } from '@/constants/theme';
import { useTrenaTheme } from '@/hooks/use-theme-context';

export function OfflineBadge() {
  const netinfo = useNetInfo();
  const { colors } = useTrenaTheme();
  const insets = useSafeAreaInsets();
  const styles = useMemo(() => createStyles(colors), [colors]);

  if (netinfo.isConnected !== false) return null;

  return (
    <View pointerEvents="none" style={[styles.wrap, { top: insets.top + 10 }]}>
      <View style={styles.badge}>
        <Text style={styles.text}>OFFLINE</Text>
      </View>
    </View>
  );
}

const createStyles = (colors: { text: string; background: string }) =>
  StyleSheet.create({
    wrap: {
      position: 'absolute',
      left: 0,
      right: 0,
      zIndex: 999,
      alignItems: 'center',
    },
    badge: {
      backgroundColor: rgba(colors.text, 0.12),
      borderColor: rgba(colors.text, 0.16),
      borderWidth: StyleSheet.hairlineWidth,
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 999,
    },
    text: {
      color: rgba(colors.text, 0.85),
      fontFamily: Fonts.black,
      fontSize: 11,
      letterSpacing: 0.8,
    },
  });

