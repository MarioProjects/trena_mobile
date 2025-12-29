import { TrashIcon } from '@/components/icons';
import { Fonts, rgba, TrenaColors } from '@/constants/theme';
import { useTrenaTheme } from '@/hooks/use-theme-context';
import { router, useLocalSearchParams } from 'expo-router';
import React from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { createMethodInstance, deleteMethodInstance, listMethodInstances, updateMethodInstance } from '@/lib/workouts/repo';
import type { ExerciseRef, MethodInstanceRow, WendlerLiftKey } from '@/lib/workouts/types';

import { ExercisePicker } from '@/components/ExercisePicker';


function numOr(x: string, fallback: number) {
  const n = Number(x);
  return Number.isFinite(n) ? n : fallback;
}

function Pill({ label, selected, onPress, styles }: { label: string; selected: boolean; onPress: () => void; styles: any }) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.pill,
        selected ? styles.pillSelected : styles.pillUnselected,
        pressed && { opacity: 0.85 },
      ]}
    >
      <Text style={[styles.pillText, selected ? styles.pillTextSelected : styles.pillTextUnselected]}>{label}</Text>
    </Pressable>
  );
}

export default function ProgramsScreen() {
  const { colors } = useTrenaTheme();
  const styles = React.useMemo(() => createStyles(colors), [colors]);
  const { editId, returnTo } = useLocalSearchParams<{ editId?: string; returnTo?: string }>();
  const editIdParam = typeof editId === 'string' ? editId : null;
  const shouldReturnToSelector = returnTo === 'selector' && !!editIdParam;
  const didAutoOpenEditRef = React.useRef(false);

  const [rows, setRows] = React.useState<MethodInstanceRow[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [deletingId, setDeletingId] = React.useState<string | null>(null);
  const [toast, setToast] = React.useState<string | null>(null);

  const [creating, setCreating] = React.useState(false);
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [isSaving, setIsSaving] = React.useState(false);
  const [kind, setKind] = React.useState<'bilbo' | 'wendler_531'>('bilbo');

  // Bilbo form
  const [bilboName, setBilboName] = React.useState('Bilbo');
  const [bilboExercise, setBilboExercise] = React.useState<ExerciseRef>({
    kind: 'learn',
    learnExerciseId: 'exercise-bench', // fallback default
  });
  const [bilboStart, setBilboStart] = React.useState('20');
  const [bilboInc, setBilboInc] = React.useState('2.5');
  const [bilboResetAt, setBilboResetAt] = React.useState('15');

  // 5/3/1 form
  const [wName, setWName] = React.useState('5/3/1');
  const [tmSquat, setTmSquat] = React.useState('100');
  const [tmBench, setTmBench] = React.useState('80');
  const [tmDead, setTmDead] = React.useState('120');
  const [tmPress, setTmPress] = React.useState('50');

  const load = React.useCallback(async (opts?: { silent?: boolean }) => {
    if (!opts?.silent) setIsLoading(true);
    try {
      const data = await listMethodInstances();
      setRows(data);
    } finally {
      if (!opts?.silent) setIsLoading(false);
    }
  }, []);

  React.useEffect(() => {
    load();
  }, [load]);

  React.useEffect(() => {
    if (!editIdParam) return;
    if (didAutoOpenEditRef.current) return;
    if (isLoading) return;
    const hit = rows.find((m) => m.id === editIdParam);
    if (!hit) return;
    beginEdit(hit);
    didAutoOpenEditRef.current = true;
  }, [editIdParam, isLoading, rows]);

  const onHeaderAction = () => {
    // If we arrived here from the exercise selector edit flow, "Close" should return there.
    if (creating || editingId) {
      if (shouldReturnToSelector) {
        router.back();
        return;
      }
      setCreating(false);
      setEditingId(null);
      return;
    }
    setEditingId(null);
    setCreating(true);
  };

  const beginEdit = (m: MethodInstanceRow) => {
    setCreating(false);
    setEditingId(m.id);
    setKind(m.method_key);

    if (m.method_key === 'bilbo') {
      const cfg = (m.config ?? {}) as any;
      const st = (m.state ?? {}) as any;
      setBilboName(m.name ?? 'Bilbo');
      setBilboExercise((cfg.exercise ?? bilboExercise) as ExerciseRef);
      setBilboStart(String(cfg.startWeightKg ?? 20));
      setBilboInc(String(cfg.incrementKg ?? 2.5));
      setBilboResetAt(String(cfg.resetAtReps ?? 15));
      // Keep current weight in state; we don't expose editing it yet.
      if (typeof st.currentWeightKg === 'number') {
        // no-op: state preserved on save
      }
      return;
    }

    const cfg = (m.config ?? {}) as any;
    const st = (m.state ?? {}) as any;
    const tm = (st.trainingMaxKg ?? cfg.trainingMaxKg ?? {}) as any;
    setWName(m.name ?? '5/3/1');
    setTmSquat(String(tm.squat ?? 100));
    setTmBench(String(tm.bench ?? 80));
    setTmDead(String(tm.deadlift ?? 120));
    setTmPress(String(tm.press ?? 50));
  };

  const onCreate = async () => {
    if (isSaving) return;
    setIsSaving(true);
    try {
      if (kind === 'bilbo') {
        const startWeightKg = numOr(bilboStart, 20);
        const incrementKg = numOr(bilboInc, 2.5);
        const resetAtReps = Math.max(1, Math.floor(numOr(bilboResetAt, 15)));

        await createMethodInstance({
          method_key: 'bilbo',
          scope: 'exercise',
          name: bilboName.trim() || 'Bilbo',
          config: {
            exercise: bilboExercise,
            startWeightKg,
            incrementKg,
            resetAtReps,
          },
          state: {
            currentWeightKg: startWeightKg,
          },
        });
      } else {
        const trainingMaxKg = {
          squat: numOr(tmSquat, 100),
          bench: numOr(tmBench, 80),
          deadlift: numOr(tmDead, 120),
          press: numOr(tmPress, 50),
        } as Record<WendlerLiftKey, number>;

        await createMethodInstance({
          method_key: 'wendler_531',
          scope: 'group',
          name: wName.trim() || '5/3/1',
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
      }

      setCreating(false);
      await load({ silent: true });
    } catch (e: any) {
      showToast(e?.message ?? 'Could not create progression');
    } finally {
      setIsSaving(false);
    }
  };

  const showToast = (message: string) => {
    setToast(message);
    setTimeout(() => setToast(null), 2200);
  };

  const onSaveEdit = async () => {
    if (!editingId) return;
    if (isSaving) return;
    setIsSaving(true);
    try {
      if (kind === 'bilbo') {
        const startWeightKg = numOr(bilboStart, 20);
        const incrementKg = numOr(bilboInc, 2.5);
        const resetAtReps = Math.max(1, Math.floor(numOr(bilboResetAt, 15)));

        // Preserve currentWeightKg to avoid surprising jumps.
        const prev = rows.find((x) => x.id === editingId);
        const prevState = (prev?.state ?? {}) as any;
        const currentWeightKg =
          typeof prevState.currentWeightKg === 'number' ? prevState.currentWeightKg : startWeightKg;

        await updateMethodInstance({
          id: editingId,
          patch: {
            name: bilboName.trim() || 'Bilbo',
            config: { exercise: bilboExercise, startWeightKg, incrementKg, resetAtReps },
            state: { currentWeightKg },
          },
        });
      } else {
        const prev = rows.find((x) => x.id === editingId);
        const prevState = (prev?.state ?? {}) as any;
        const weekIndex = prevState.weekIndex ?? 1;
        const cycleIndex = prevState.cycleIndex ?? 0;

        const trainingMaxKg = {
          squat: numOr(tmSquat, 100),
          bench: numOr(tmBench, 80),
          deadlift: numOr(tmDead, 120),
          press: numOr(tmPress, 50),
        } as Record<WendlerLiftKey, number>;

        await updateMethodInstance({
          id: editingId,
          patch: {
            name: wName.trim() || '5/3/1',
            config: {
              roundingKg: 2.5,
              upperIncrementKg: 2.5,
              lowerIncrementKg: 5,
              trainingMaxKg,
            },
            state: { weekIndex, cycleIndex, trainingMaxKg },
          },
        });
      }

      await load({ silent: true });
      setEditingId(null);
      if (shouldReturnToSelector) router.back();
    } catch (e: any) {
      showToast(e?.message ?? 'Could not save changes');
    } finally {
      setIsSaving(false);
    }
  };

  const onDelete = async (id: string, opts?: { afterDelete?: () => void }) => {
    Alert.alert('Delete progression?', 'This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            setDeletingId(id);
            await deleteMethodInstance(id);
            setRows((cur) => cur.filter((x) => x.id !== id));
            await load({ silent: true });
            opts?.afterDelete?.();
          } catch (e: any) {
            showToast(e?.message ?? 'Could not delete');
          } finally {
            setDeletingId(null);
          }
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.safe} edges={['left', 'right', 'bottom']}>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <View style={styles.headerRow}>
          <Text style={styles.title}>Progressions</Text>
          <Pressable
            accessibilityRole="button"
            onPress={onHeaderAction}
            style={({ pressed }) => [styles.headerButton, pressed && styles.pressed]}
          >
            <Text style={styles.headerButtonText}>{creating || editingId ? 'Close' : 'New'}</Text>
          </Pressable>
        </View>

        {creating || editingId ? (
          <View style={styles.formCard}>
            <Text style={styles.sectionTitle}>{editingId ? 'Edit' : 'Create'}</Text>

            {!editingId ? (
              <View style={styles.pillsRow}>
                <Pill label="Bilbo" selected={kind === 'bilbo'} onPress={() => setKind('bilbo')} styles={styles} />
                <Pill label="5/3/1" selected={kind === 'wendler_531'} onPress={() => setKind('wendler_531')} styles={styles} />
              </View>
            ) : null}

            {kind === 'bilbo' ? (
              <View style={{ gap: 12 }}>
                <View style={{ gap: 8 }}>
                  <Text style={styles.label}>Name</Text>
                  <TextInput value={bilboName} onChangeText={setBilboName} style={styles.input} />
                </View>

                <View style={{ gap: 8 }}>
                  <Text style={styles.label}>Exercise</Text>
                  <ExercisePicker value={bilboExercise} onChange={setBilboExercise} />
                </View>

                <View style={styles.grid2}>
                  <View style={{ gap: 8, flex: 1 }}>
                    <Text style={styles.label}>Start (kg)</Text>
                    <TextInput value={bilboStart} onChangeText={setBilboStart} keyboardType="decimal-pad" style={styles.input} />
                  </View>
                  <View style={{ gap: 8, flex: 1 }}>
                    <Text style={styles.label}>Increment (kg)</Text>
                    <TextInput value={bilboInc} onChangeText={setBilboInc} keyboardType="decimal-pad" style={styles.input} />
                  </View>
                </View>

                <View style={{ gap: 8 }}>
                  <Text style={styles.label}>Reset at reps (≤)</Text>
                  <TextInput value={bilboResetAt} onChangeText={setBilboResetAt} keyboardType="numeric" style={styles.input} />
                </View>

                <Text style={styles.muted}>
                  Bilbo logs 1 set only: the app prescribes the weight, you record reps.
                </Text>
              </View>
            ) : (
              <View style={{ gap: 12 }}>
                <View style={{ gap: 8 }}>
                  <Text style={styles.label}>Name</Text>
                  <TextInput value={wName} onChangeText={setWName} style={styles.input} />
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

                <Text style={styles.muted}>Defaults: rounding 2.5kg, +2.5kg upper, +5kg lower, 3 weeks + deload.</Text>
              </View>
            )}

            <Pressable
              accessibilityRole="button"
              disabled={isSaving}
              onPress={editingId ? onSaveEdit : onCreate}
              style={({ pressed }) => [styles.primaryButton, (pressed || isSaving) && styles.pressed]}
            >
              <Text style={styles.primaryButtonText}>{editingId ? (isSaving ? 'Saving…' : 'Save changes') : isSaving ? 'Creating…' : 'Create'}</Text>
            </Pressable>

            {editingId ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Remove progression"
                disabled={isSaving || deletingId === editingId}
                onPress={() =>
                  onDelete(editingId, {
                    afterDelete: () => {
                      setEditingId(null);
                      if (shouldReturnToSelector) router.back();
                    },
                  })
                }
                style={({ pressed }) => [
                  styles.destructiveButton,
                  (pressed || isSaving || deletingId === editingId) && styles.pressed,
                  (isSaving || deletingId === editingId) && { opacity: 0.7 },
                ]}
              >
                <Text style={styles.destructiveButtonText}>{deletingId === editingId ? 'Removing…' : 'Remove progression'}</Text>
              </Pressable>
            ) : null}
          </View>
        ) : null}

        {!editingId ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Your progressions</Text>
            {!isLoading && rows.length === 0 ? <Text style={styles.body}>No programs yet.</Text> : null}

            <View style={styles.list}>
              {rows.map((m) => {
                const isDeletingThis = deletingId === m.id;
                return (
                  <View key={m.id} style={styles.card}>
                    <View style={{ flex: 1, gap: 6 }}>
                      <View style={styles.cardHeaderRow}>
                        <Pressable
                          accessibilityRole="button"
                          disabled={isDeletingThis}
                          onPress={() => beginEdit(m)}
                          style={({ pressed }) => [styles.cardTitleButton, pressed && !isDeletingThis && { opacity: 0.85 }]}
                        >
                          <Text style={styles.cardTitle} numberOfLines={1}>
                            {m.name}
                          </Text>
                        </Pressable>
                        <Pressable
                          accessibilityRole="button"
                          accessibilityLabel="Delete program"
                          disabled={isDeletingThis}
                          onPress={() => onDelete(m.id)}
                          hitSlop={10}
                          style={({ pressed }) => [styles.trashButton, pressed && !isDeletingThis && { opacity: 0.85 }]}
                        >
                          <TrashIcon size={20} color={TrenaColors.accentRed} />
                        </Pressable>
                      </View>
                      <Text style={styles.cardMeta}>{m.method_key === 'bilbo' ? 'Bilbo' : '5/3/1'} • {m.scope}</Text>
                    </View>

                    {isDeletingThis ? (
                      <View style={styles.cardOverlay} pointerEvents="none">
                        <ActivityIndicator color={TrenaColors.accentRed} />
                      </View>
                    ) : null}
                  </View>
                );
              })}
            </View>
          </View>
        ) : null}

        {toast ? (
          <View style={styles.toast} pointerEvents="none">
            <Text style={styles.toastText}>{toast}</Text>
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const createStyles = (colors: any) =>
  StyleSheet.create({
    safe: { flex: 1, backgroundColor: colors.background },
    container: { paddingHorizontal: 20, paddingVertical: 24, gap: 14 },
    headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
    title: { fontSize: 34, lineHeight: 40, fontFamily: Fonts.extraBold, color: colors.text, letterSpacing: -0.3 },
    headerButton: {
      borderRadius: 999,
      paddingVertical: 10,
      paddingHorizontal: 14,
      borderWidth: 1,
      borderColor: rgba(colors.text, 0.12),
      backgroundColor: rgba(colors.text, 0.04),
    },
    headerButtonText: { fontFamily: Fonts.bold, fontSize: 13, color: rgba(colors.text, 0.9) },
    section: { gap: 10, paddingTop: 4 },
    sectionTitle: { fontFamily: Fonts.bold, fontSize: 16, lineHeight: 20, color: colors.text },
    body: { color: rgba(colors.text, 0.8), fontFamily: Fonts.regular, fontSize: 14, lineHeight: 20 },
    muted: { color: rgba(colors.text, 0.7), fontFamily: Fonts.regular, fontSize: 13, lineHeight: 18 },
    label: { fontFamily: Fonts.bold, fontSize: 13, color: rgba(colors.text, 0.9) },
    mutedLabel: { fontFamily: Fonts.medium, fontSize: 12, color: rgba(colors.text, 0.7) },
    input: {
      borderWidth: 1,
      borderColor: rgba(colors.text, 0.12),
      backgroundColor: rgba(colors.text, 0.04),
      borderRadius: 12,
      paddingHorizontal: 12,
      paddingVertical: 12,
      color: colors.text,
      fontFamily: Fonts.medium,
    },
    pillsRow: { flexDirection: 'row', gap: 10, flexWrap: 'wrap' },
    pill: { borderRadius: 999, paddingVertical: 10, paddingHorizontal: 14, borderWidth: 1 },
    pillSelected: { backgroundColor: colors.primary, borderColor: colors.primary },
    pillUnselected: { backgroundColor: rgba(colors.text, 0.04), borderColor: rgba(colors.text, 0.12) },
    pillText: { fontFamily: Fonts.semiBold, fontSize: 13, lineHeight: 16 },
    pillTextSelected: { color: colors.onPrimary },
    pillTextUnselected: { color: rgba(colors.text, 0.9) },
    formCard: {
      borderWidth: 1,
      borderColor: rgba(colors.text, 0.12),
      backgroundColor: rgba(colors.text, 0.04),
      padding: 14,
      borderRadius: 14,
      gap: 12,
    },
    grid2: { flexDirection: 'row', gap: 10 },
    primaryButton: {
      borderRadius: 14,
      paddingVertical: 14,
      alignItems: 'center',
      backgroundColor: colors.primary,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: 'rgba(0, 0, 0, 0.25)',
    },
    primaryButtonText: { color: colors.onPrimary, fontSize: 16, fontFamily: Fonts.extraBold },
    destructiveButton: {
      borderRadius: 14,
      paddingVertical: 14,
      alignItems: 'center',
      backgroundColor: colors.accentRed,
      borderWidth: 1,
      borderColor: colors.accentRed,
    },
    destructiveButtonText: { color: colors.onPrimary, fontSize: 15, fontFamily: Fonts.extraBold },
    pressed: { transform: [{ scale: 0.99 }], opacity: 0.95 },
    list: { gap: 12 },
    card: {
      position: 'relative',
      borderWidth: 1,
      borderColor: rgba(colors.text, 0.12),
      backgroundColor: rgba(colors.text, 0.04),
      padding: 12,
      borderRadius: 14,
      flexDirection: 'row',
      gap: 12,
      alignItems: 'center',
    },
    cardHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
    cardTitleButton: { flex: 1, minWidth: 0 },
    cardTitle: { fontFamily: Fonts.bold, fontSize: 16, lineHeight: 20, color: colors.text },
    cardMeta: { fontFamily: Fonts.medium, fontSize: 12, lineHeight: 16, color: rgba(colors.text, 0.75) },
    trashButton: { paddingLeft: 2, paddingVertical: 2 },
    cardOverlay: {
      ...StyleSheet.absoluteFillObject,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: rgba(colors.background, 0.55),
      borderRadius: 14,
    },
    toast: {
      position: 'absolute',
      left: 16,
      right: 16,
      bottom: 16,
      borderRadius: 14,
      paddingVertical: 12,
      paddingHorizontal: 14,
      borderWidth: 1,
      borderColor: rgba(colors.text, 0.12),
      backgroundColor: rgba(colors.text, 0.08),
    },
    toastText: { fontFamily: Fonts.medium, fontSize: 13, lineHeight: 18, color: colors.text },
  });
