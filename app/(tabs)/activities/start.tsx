import { Fonts, TrenaColors } from '@/constants/theme';
import { router } from 'expo-router';
import React from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { listTemplates, startQuickSession, startSessionFromTemplate } from '@/lib/workouts/repo';
import type { WorkoutTemplate } from '@/lib/workouts/types';

export default function StartWorkoutScreen() {
  const [templates, setTemplates] = React.useState<WorkoutTemplate[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isStarting, setIsStarting] = React.useState(false);

  const load = React.useCallback(async () => {
    setIsLoading(true);
    try {
      const t = await listTemplates();
      setTemplates(t);
    } finally {
      setIsLoading(false);
    }
  }, []);

  React.useEffect(() => {
    load();
  }, [load]);

  const onQuickWorkout = async () => {
    if (isStarting) return;
    setIsStarting(true);
    try {
      const session = await startQuickSession();
      router.replace(`/activities/session/${session.id}` as any);
    } catch (e: any) {
      Alert.alert('Could not start workout', e?.message ?? 'Unknown error');
    } finally {
      setIsStarting(false);
    }
  };

  const onStartTemplate = async (templateId: string) => {
    if (isStarting) return;
    setIsStarting(true);
    try {
      const session = await startSessionFromTemplate({ templateId });
      router.replace(`/activities/session/${session.id}` as any);
    } catch (e: any) {
      Alert.alert('Could not start workout', e?.message ?? 'Unknown error');
    } finally {
      setIsStarting(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <View style={styles.heroCard}>
          <Text style={styles.heroTitle}>Start a workout</Text>
          <Text style={styles.heroBody}>Quick workout for free logging, or pick a routine.</Text>
          <Pressable
            accessibilityRole="button"
            onPress={onQuickWorkout}
            disabled={isStarting}
            style={({ pressed }) => [styles.primaryButton, (pressed || isStarting) && styles.pressed]}
          >
            <Text style={styles.primaryButtonText}>{isStarting ? 'Starting…' : 'Quick workout'}</Text>
          </Pressable>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>Your Routines</Text>
            <Pressable
              accessibilityRole="button"
              onPress={() => router.push('/activities/templates' as any)}
              style={({ pressed }) => [styles.linkButton, pressed && styles.pressed]}
            >
              <Text style={styles.linkButtonText}>Manage</Text>
            </Pressable>
          </View>

          {isLoading ? <Text style={styles.body}>Loading…</Text> : null}
          {!isLoading && templates.length === 0 ? (
            <Text style={styles.body}>No routines yet. Create one in Manage.</Text>
          ) : null}

          <View style={styles.list}>
            {templates.map((t) => (
              <Pressable
                key={t.id}
                accessibilityRole="button"
                onPress={() => onStartTemplate(t.id)}
                disabled={isStarting}
                style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
              >
                <View style={{ flex: 1, gap: 6 }}>
                  <Text style={styles.cardTitle} numberOfLines={1}>
                    {t.name}
                  </Text>
                  <Text style={styles.cardMeta}>{`${t.items.length} item${t.items.length === 1 ? '' : 's'}`}</Text>
                </View>
              </Pressable>
            ))}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: TrenaColors.background },
  container: { paddingHorizontal: 20, paddingVertical: 24, gap: 14 },
  heroCard: {
    backgroundColor: 'rgba(236, 235, 228, 0.08)',
    borderRadius: 18,
    padding: 16,
    gap: 10,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(236, 235, 228, 0.12)',
  },
  heroTitle: { color: TrenaColors.text, fontSize: 22, fontFamily: Fonts.extraBold, letterSpacing: -0.2 },
  heroBody: { color: 'rgba(236, 235, 228, 0.8)', fontSize: 14, lineHeight: 20, fontFamily: Fonts.regular },
  primaryButton: {
    marginTop: 4,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    backgroundColor: TrenaColors.primary,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(0, 0, 0, 0.25)',
  },
  primaryButtonText: { color: '#000', fontSize: 16, fontFamily: Fonts.extraBold },
  pressed: { transform: [{ scale: 0.99 }], opacity: 0.95 },
  section: { gap: 10, paddingTop: 4 },
  sectionHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sectionTitle: { fontFamily: Fonts.bold, fontSize: 16, lineHeight: 20, color: TrenaColors.text },
  linkButton: {
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(236, 235, 228, 0.12)',
    backgroundColor: 'rgba(236, 235, 228, 0.04)',
  },
  linkButtonText: { fontFamily: Fonts.bold, fontSize: 12, color: 'rgba(236, 235, 228, 0.9)' },
  body: { color: 'rgba(236, 235, 228, 0.8)', fontFamily: Fonts.regular, fontSize: 14, lineHeight: 20 },
  list: { gap: 12 },
  card: {
    borderWidth: 1,
    borderColor: 'rgba(236, 235, 228, 0.12)',
    backgroundColor: 'rgba(236, 235, 228, 0.04)',
    padding: 12,
    borderRadius: 14,
    flexDirection: 'row',
    gap: 12,
  },
  cardPressed: { opacity: 0.92 },
  cardTitle: { fontFamily: Fonts.bold, fontSize: 16, lineHeight: 20, color: TrenaColors.text },
  cardMeta: { fontFamily: Fonts.medium, fontSize: 12, lineHeight: 16, color: 'rgba(236, 235, 228, 0.75)' },
});
