import { ActionSheet, ActionSheetOption } from '@/components/ui/ActionSheet';
import { ExercisePicker } from '@/components/ExercisePicker';
import { Fonts, TrenaColors } from '@/constants/theme';
import { getAddExerciseDraft, setAddExerciseDraft } from '@/lib/workouts/methods/ui-draft';
import { emitMethodInstanceCreated } from '@/lib/workouts/methods/ui-events';
import { createMethodInstance } from '@/lib/workouts/repo';
import type { ExerciseRef } from '@/lib/workouts/types';
import { router } from 'expo-router';
import React from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

function numOr(x: string, fallback: number) {
  const n = Number(x);
  return Number.isFinite(n) ? n : fallback;
}

export default function CreateBilboMethodScreen() {
  const draft = getAddExerciseDraft();
  const defaultExercise: ExerciseRef = draft?.selectedExercise ?? {
    kind: 'learn',
    learnExerciseId: 'exercise-bench',
  };

  const [name, setName] = React.useState('Bilbo');
  const [exercise, setExercise] = React.useState<ExerciseRef>(defaultExercise);
  const [start, setStart] = React.useState('20');
  const [inc, setInc] = React.useState('2.5');
  const [resetAt, setResetAt] = React.useState('15');
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
      const startWeightKg = numOr(start, 20);
      const incrementKg = numOr(inc, 2.5);
      const resetAtReps = Math.max(1, Math.floor(numOr(resetAt, 15)));

      const row = await createMethodInstance({
        method_key: 'bilbo',
        scope: 'exercise',
        name: name.trim() || 'Bilbo',
        config: { exercise, startWeightKg, incrementKg, resetAtReps },
        state: { currentWeightKg: startWeightKg },
      });

      emitMethodInstanceCreated(row);
      // Keep reopen intent; the modal will consume and clear it when opened.
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
        <Text style={styles.title}>Create Bilbo</Text>
        <Text style={styles.subtitle}>One top set. The app prescribes the weight; you log reps.</Text>

        <View style={{ gap: 12 }}>
          <View style={{ gap: 8 }}>
            <Text style={styles.label}>Name</Text>
            <TextInput value={name} onChangeText={setName} style={styles.input} />
          </View>

          <View style={{ gap: 8 }}>
            <Text style={styles.label}>Exercise</Text>
            <ExercisePicker value={exercise} onChange={setExercise} />
          </View>

          <View style={styles.grid2}>
            <View style={{ gap: 8, flex: 1 }}>
              <Text style={styles.label}>Start (kg)</Text>
              <TextInput value={start} onChangeText={setStart} keyboardType="decimal-pad" style={styles.input} />
            </View>
            <View style={{ gap: 8, flex: 1 }}>
              <Text style={styles.label}>Increment (kg)</Text>
              <TextInput value={inc} onChangeText={setInc} keyboardType="decimal-pad" style={styles.input} />
            </View>
          </View>

          <View style={{ gap: 8 }}>
            <Text style={styles.label}>Reset at reps (≤)</Text>
            <TextInput value={resetAt} onChangeText={setResetAt} keyboardType="numeric" style={styles.input} />
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

