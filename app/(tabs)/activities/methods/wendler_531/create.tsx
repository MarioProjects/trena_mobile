import { ActionSheet, ActionSheetOption } from '@/components/ui/ActionSheet';
import { Fonts, TrenaColors } from '@/constants/theme';
import { getAddExerciseDraft, setAddExerciseDraft } from '@/lib/workouts/methods/ui-draft';
import { emitMethodInstanceCreated } from '@/lib/workouts/methods/ui-events';
import { createMethodInstance } from '@/lib/workouts/repo';
import type { WendlerLiftKey } from '@/lib/workouts/types';
import { router } from 'expo-router';
import React from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

function numOr(x: string, fallback: number) {
  const n = Number(x);
  return Number.isFinite(n) ? n : fallback;
}

export default function CreateWendler531MethodScreen() {
  const draft = getAddExerciseDraft();

  const [name, setName] = React.useState('5/3/1');
  const [tmSquat, setTmSquat] = React.useState('100');
  const [tmBench, setTmBench] = React.useState('80');
  const [tmDead, setTmDead] = React.useState('120');
  const [tmPress, setTmPress] = React.useState('50');
  const [isSaving, setIsSaving] = React.useState(false);

  const [actionSheetVisible, setActionSheetVisible] = React.useState(false);
  const [actionSheetConfig, setActionSheetConfig] = React.useState<{
    title?: string;
    message?: string;
    options: ActionSheetOption[];
  }>({ options: [] });

  const showActionSheet = (config: { title?: string; message?: string; options: ActionSheetOption[] }) => {
    setActionSheetConfig(config);
    setActionSheetVisible(true);
  };

  const onCreate = async () => {
    if (isSaving) return;
    setIsSaving(true);
    try {
      const trainingMaxKg: Record<WendlerLiftKey, number> = {
        squat: numOr(tmSquat, 100),
        bench: numOr(tmBench, 80),
        deadlift: numOr(tmDead, 120),
        press: numOr(tmPress, 50),
      };

      const row = await createMethodInstance({
        method_key: 'wendler_531',
        scope: 'group',
        name: name.trim() || '5/3/1',
        config: {
          roundingKg: 2.5,
          upperIncrementKg: 2.5,
          lowerIncrementKg: 5,
          trainingMaxKg,
        },
        state: {
          weekIndex: 1,
          cycleIndex: 0,
          trainingMaxKg,
        },
      });

      emitMethodInstanceCreated(row);
      if (draft) setAddExerciseDraft({ ...draft, shouldReopen: true, awaitingCreatedMethodKey: null });
      router.back();
    } catch (e: any) {
      showActionSheet({
        title: 'Could not create progression',
        message: e?.message ?? 'Unknown error',
        options: [{ text: 'OK', onPress: () => {} }],
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['left', 'right', 'bottom']}>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>Create 5/3/1</Text>
        <Text style={styles.subtitle}>Defaults: rounding 2.5kg, +2.5kg upper, +5kg lower, 3 weeks + deload.</Text>

        <View style={{ gap: 12 }}>
          <View style={{ gap: 8 }}>
            <Text style={styles.label}>Name</Text>
            <TextInput value={name} onChangeText={setName} style={styles.input} />
          </View>

          <Text style={styles.label}>Training maxes (kg)</Text>
          <View style={styles.grid2}>
            <View style={{ gap: 8, flex: 1 }}>
              <Text style={styles.mutedLabel}>Squat</Text>
              <TextInput value={tmSquat} onChangeText={setTmSquat} keyboardType="decimal-pad" style={styles.input} />
            </View>
            <View style={{ gap: 8, flex: 1 }}>
              <Text style={styles.mutedLabel}>Bench</Text>
              <TextInput value={tmBench} onChangeText={setTmBench} keyboardType="decimal-pad" style={styles.input} />
            </View>
          </View>
          <View style={styles.grid2}>
            <View style={{ gap: 8, flex: 1 }}>
              <Text style={styles.mutedLabel}>Deadlift</Text>
              <TextInput value={tmDead} onChangeText={setTmDead} keyboardType="decimal-pad" style={styles.input} />
            </View>
            <View style={{ gap: 8, flex: 1 }}>
              <Text style={styles.mutedLabel}>Press</Text>
              <TextInput value={tmPress} onChangeText={setTmPress} keyboardType="decimal-pad" style={styles.input} />
            </View>
          </View>

          <Pressable
            accessibilityRole="button"
            disabled={isSaving}
            onPress={onCreate}
            style={({ pressed }) => [styles.primaryButton, (pressed || isSaving) && styles.pressed]}
          >
            <Text style={styles.primaryButtonText}>{isSaving ? 'Creating…' : 'Create'}</Text>
          </Pressable>
        </View>
      </ScrollView>

      <ActionSheet
        visible={actionSheetVisible}
        title={actionSheetConfig.title}
        message={actionSheetConfig.message}
        options={actionSheetConfig.options}
        onClose={() => setActionSheetVisible(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: TrenaColors.background },
  container: { paddingHorizontal: 20, paddingVertical: 24, gap: 14 },
  title: { fontSize: 28, lineHeight: 34, fontFamily: Fonts.extraBold, color: TrenaColors.text, letterSpacing: -0.25 },
  subtitle: { color: 'rgba(236, 235, 228, 0.75)', fontFamily: Fonts.regular, fontSize: 14, lineHeight: 20 },
  label: { fontFamily: Fonts.bold, fontSize: 13, color: 'rgba(236, 235, 228, 0.9)' },
  mutedLabel: { fontFamily: Fonts.medium, fontSize: 12, color: 'rgba(236, 235, 228, 0.7)' },
  input: {
    borderWidth: 1,
    borderColor: 'rgba(236, 235, 228, 0.12)',
    backgroundColor: 'rgba(236, 235, 228, 0.04)',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
    color: TrenaColors.text,
    fontFamily: Fonts.medium,
  },
  grid2: { flexDirection: 'row', gap: 10 },
  primaryButton: {
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    backgroundColor: TrenaColors.primary,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(0, 0, 0, 0.25)',
  },
  primaryButtonText: { color: '#000', fontSize: 16, fontFamily: Fonts.extraBold },
  pressed: { transform: [{ scale: 0.99 }], opacity: 0.95 },
});

