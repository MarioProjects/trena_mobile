import { Fonts, TrenaColors } from '@/constants/theme';
import React from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function TodayScreen() {
  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <Text style={styles.title}>Today</Text>

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
            style={({ pressed }) => [styles.primaryButton, pressed && styles.pressed]}
          >
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
  title: {
    fontSize: 34,
    lineHeight: 40,
    fontFamily: Fonts.extraBold,
    color: TrenaColors.text,
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
    color: 'rgba(236, 235, 228, 0.75)',
    fontSize: 12,
    fontFamily: Fonts.semiBold,
  },
  mainCard: {
    backgroundColor: 'rgba(236, 235, 228, 0.08)',
    borderRadius: 18,
    padding: 16,
    gap: 10,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(236, 235, 228, 0.12)',
  },
  mainCardTitle: {
    color: TrenaColors.text,
    fontSize: 18,
    fontFamily: Fonts.extraBold,
  },
  mainCardBody: {
    color: 'rgba(236, 235, 228, 0.8)',
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
    borderColor: 'rgba(0, 0, 0, 0.25)',
  },
  primaryButtonText: {
    color: '#000',
    fontSize: 16,
    fontFamily: Fonts.extraBold,
  },
  pressed: {
    transform: [{ scale: 0.99 }],
    opacity: 0.95,
  },
});

