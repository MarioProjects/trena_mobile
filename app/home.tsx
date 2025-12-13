import { router } from 'expo-router';
import React from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Fonts, TrenaColors } from '@/constants/theme';

export default function HomeScreen() {
  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <View style={styles.headerRow}>
          <View style={styles.headerText}>
            <Text style={styles.title}>Today</Text>
            <Text style={styles.subtitle}>Ready to train?</Text>
          </View>

          <Pressable
            accessibilityRole="button"
            onPress={() => router.replace('/')}
            style={({ pressed }) => [styles.ghostButton, pressed && styles.pressed]}>
            <Text style={styles.ghostButtonText}>Sign out</Text>
          </Pressable>
        </View>

        <View style={styles.cardsRow}>
          <View style={[styles.card, { backgroundColor: TrenaColors.accentPurple }]}>
            <Text style={styles.cardLabel}>Workouts</Text>
            <Text style={styles.cardValue}>0</Text>
            <Text style={styles.cardHint}>this week</Text>
          </View>
          <View style={[styles.card, { backgroundColor: TrenaColors.secondary }]}>
            <Text style={styles.cardLabel}>Volume</Text>
            <Text style={styles.cardValue}>—</Text>
            <Text style={styles.cardHint}>coming soon</Text>
          </View>
        </View>

        <View style={styles.mainCard}>
          <Text style={styles.mainCardTitle}>Start a workout</Text>
          <Text style={styles.mainCardBody}>
            We’ll build your workout logger here: exercises, sets, reps, and progressive overload.
          </Text>

          <Pressable
            accessibilityRole="button"
            onPress={() => Alert.alert('Coming soon', 'Workout logging is next!')}
            style={({ pressed }) => [styles.primaryButton, pressed && styles.pressed]}>
            <Text style={styles.primaryButtonText}>New workout</Text>
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: TrenaColors.background,
  },
  container: {
    flex: 1,
    paddingHorizontal: 20,
    paddingVertical: 24,
    gap: 16,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  headerText: {
    gap: 6,
  },
  title: {
    fontSize: 34,
    lineHeight: 40,
    fontFamily: Fonts.extraBold,
    color: TrenaColors.text,
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: 16,
    lineHeight: 22,
    fontFamily: Fonts.regular,
    color: 'rgba(20, 20, 17, 0.7)',
  },
  ghostButton: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: TrenaColors.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(20, 20, 17, 0.18)',
  },
  ghostButtonText: {
    color: TrenaColors.text,
    fontFamily: Fonts.bold,
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
    borderColor: 'rgba(20, 20, 17, 0.2)',
    gap: 6,
  },
  cardLabel: {
    color: TrenaColors.text,
    fontSize: 12,
    fontFamily: Fonts.extraBold,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  cardValue: {
    color: TrenaColors.text,
    fontSize: 28,
    fontFamily: Fonts.black,
    letterSpacing: -0.2,
  },
  cardHint: {
    color: 'rgba(20, 20, 17, 0.65)',
    fontSize: 12,
    fontFamily: Fonts.semiBold,
  },
  mainCard: {
    backgroundColor: TrenaColors.surface,
    borderRadius: 18,
    padding: 16,
    gap: 10,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(20, 20, 17, 0.18)',
  },
  mainCardTitle: {
    color: TrenaColors.text,
    fontSize: 18,
    fontFamily: Fonts.extraBold,
  },
  mainCardBody: {
    color: 'rgba(20, 20, 17, 0.75)',
    fontSize: 14,
    lineHeight: 20,
    fontFamily: Fonts.regular,
  },
  primaryButton: {
    marginTop: 4,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    backgroundColor: TrenaColors.primary,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(20, 20, 17, 0.2)',
  },
  primaryButtonText: {
    color: TrenaColors.text,
    fontSize: 16,
    fontFamily: Fonts.extraBold,
  },
  pressed: {
    transform: [{ scale: 0.99 }],
    opacity: 0.95,
  },
});


