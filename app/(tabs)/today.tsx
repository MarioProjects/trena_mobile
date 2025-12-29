import { router } from 'expo-router';
import React, { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Fonts, rgba } from '@/constants/theme';
import { useTrenaTheme } from '@/hooks/use-theme-context';

export default function TodayScreen() {
  const { colors } = useTrenaTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <Text style={styles.title}>Today</Text>

        <View style={styles.cardsRow}>
          <View style={[styles.card, { backgroundColor: colors.tertiary }]}>
            <Text style={[styles.cardLabel, styles.cardTextOnTertiary]}>Workouts</Text>
            <Text style={[styles.cardValue, styles.cardTextOnTertiary]}>0</Text>
            <Text style={[styles.cardHint, styles.cardTextOnTertiary]}>this week</Text>
          </View>
          <View style={[styles.card, { backgroundColor: colors.secondary }]}>
            <Text style={[styles.cardLabel, styles.cardTextOnSecondary]}>Volume</Text>
            <Text style={[styles.cardValue, styles.cardTextOnSecondary]}>—</Text>
            <Text style={[styles.cardHint, styles.cardTextOnSecondary]}>coming soon</Text>
          </View>
        </View>

        <View style={styles.mainCard}>
          <Text style={styles.mainCardTitle}>Start a workout</Text>
          <Text style={styles.mainCardBody}>
            We’ll build your workout logger here: exercises, sets, reps, and progressive overload.
          </Text>

          <Pressable
            accessibilityRole="button"
            onPress={() => router.push('/activities/start' as any)}
            style={({ pressed }) => [styles.primaryButton, pressed && styles.pressed]}
          >
            <Text style={styles.primaryButtonText}>New workout</Text>
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
}

const createStyles = (colors: {
  background: string;
  primary: string;
  secondary: string;
  tertiary: string;
  text: string;
  onPrimary: string;
  onSecondary: string;
  onTertiary: string;
  onSurface: string;
}) =>
  StyleSheet.create({
    safe: {
      flex: 1,
      backgroundColor: colors.background,
    },
    container: {
      flex: 1,
      paddingHorizontal: 20,
      paddingVertical: 24,
      gap: 16,
    },
    title: {
      fontSize: 34,
      lineHeight: 40,
      fontFamily: Fonts.extraBold,
      color: colors.text,
      letterSpacing: -0.3,
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
      borderColor: rgba(colors.onSurface, 0.2),
      gap: 6,
    },
    cardLabel: {
      color: colors.text,
      fontSize: 12,
      fontFamily: Fonts.extraBold,
      textTransform: 'uppercase',
      letterSpacing: 0.6,
    },
    cardValue: {
      color: colors.text,
      fontSize: 28,
      fontFamily: Fonts.black,
      letterSpacing: -0.2,
    },
    cardHint: {
      color: rgba(colors.text, 0.75),
      fontSize: 12,
      fontFamily: Fonts.semiBold,
    },
    cardTextOnTertiary: {
      color: colors.onTertiary,
    },
    cardTextOnSecondary: {
      color: colors.onSecondary,
    },
    mainCard: {
      backgroundColor: rgba(colors.text, 0.08),
      borderRadius: 18,
      padding: 16,
      gap: 10,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: rgba(colors.text, 0.12),
    },
    mainCardTitle: {
      color: colors.text,
      fontSize: 18,
      fontFamily: Fonts.extraBold,
    },
    mainCardBody: {
      color: rgba(colors.text, 0.8),
      fontSize: 14,
      lineHeight: 20,
      fontFamily: Fonts.regular,
    },
    primaryButton: {
      marginTop: 4,
      borderRadius: 14,
      paddingVertical: 14,
      alignItems: 'center',
      backgroundColor: colors.primary,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: 'rgba(0, 0, 0, 0.25)',
    },
    primaryButtonText: {
      color: colors.onPrimary,
      fontSize: 16,
      fontFamily: Fonts.extraBold,
    },
    pressed: {
      transform: [{ scale: 0.99 }],
      opacity: 0.95,
    },
  });

