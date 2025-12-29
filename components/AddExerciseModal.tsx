import { EditIcon, SearchIcon } from '@/components/icons';
import { Fonts, rgba } from '@/constants/theme';
import { learnData } from '@/data/learn';
import { useTrenaTheme } from '@/hooks/use-theme-context';
import { clearAddExerciseDraft, getAddExerciseDraft, setAddExerciseDraft } from '@/lib/workouts/methods/ui-draft';
import { consumeMethodInstanceCreatedQueue, subscribeMethodInstanceCreated } from '@/lib/workouts/methods/ui-events';
import { listDistinctFreeExercises, listMethodInstances } from '@/lib/workouts/repo';
import type { ExerciseRef, MethodBinding, MethodInstanceRow, MethodKey, WendlerLiftKey } from '@/lib/workouts/types';
import { router } from 'expo-router';
import React from 'react';
import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const learnExercises = learnData.filter((x) => x.type === 'exercise');

// kept for backward readability; actual state uses `MethodKey | null`
type MethodChoice = MethodKey | null;

export type AddExerciseSelection =
  | { exercise: ExerciseRef; method: null }
  | { exercise: ExerciseRef; method: { methodInstanceId: string; binding: MethodBinding; methodInstance: MethodInstanceRow } };

function normalize(s: string) {
  return s.toLowerCase().trim();
}

function labelForExercise(ref: ExerciseRef) {
  if (ref.kind === 'free') return ref.name;
  const hit = learnExercises.find((x) => x.id === ref.learnExerciseId);
  return hit?.name ?? 'Unknown exercise';
}

function inferExerciseFromMethod(args: {
  methodKey: MethodKey;
  methodInstance: MethodInstanceRow;
  binding: MethodBinding;
  fallbackExercise: ExerciseRef | null;
}): ExerciseRef | null {
  if (args.methodKey === 'bilbo') {
    const cfg = (args.methodInstance.config ?? {}) as any;
    const ex = cfg.exercise as ExerciseRef | undefined;
    return ex ?? null;
  }

  // 5/3/1: treat lift as the "exercise" if user didn't pick one.
  if (args.binding.methodKey === 'wendler_531' && args.fallbackExercise) {
    return args.fallbackExercise;
  }

  const lift = args.binding.methodKey === 'wendler_531' ? args.binding.lift : 'bench';
  if (lift === 'squat') return { kind: 'learn', learnExerciseId: 'exercise-squat' };
  if (lift === 'bench') return { kind: 'learn', learnExerciseId: 'exercise-bench' };
  if (lift === 'deadlift') return { kind: 'learn', learnExerciseId: 'exercise-deadlift' };
  return { kind: 'free', name: 'Overhead Press' };
}

function matchesBilboExercise(mi: MethodInstanceRow, ex: ExerciseRef) {
  if (mi.method_key !== 'bilbo') return false;
  const cfg = (mi.config ?? {}) as any;
  const cfgEx = cfg.exercise as ExerciseRef | undefined;
  if (!cfgEx) return false;
  if (cfgEx.kind !== ex.kind) return false;
  if (cfgEx.kind === 'free') return cfgEx.name === (ex as any).name;
  return cfgEx.learnExerciseId === (ex as any).learnExerciseId;
}

function Pill({
  label,
  selected,
  onPress,
  onEdit,
  styles,
  colors,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
  onEdit?: () => void;
  styles: ReturnType<typeof createStyles>;
  colors: { text: string; onPrimary: string };
}) {
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
      <View style={styles.pillInner}>
        {selected && onEdit ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Edit ${label}`}
            onPress={onEdit}
            hitSlop={10}
            style={({ pressed }) => [styles.pillEditButton, pressed && { opacity: 0.85 }]}
          >
            <EditIcon
              size={16}
              color={selected ? colors.onPrimary : rgba(colors.text, 0.9)}
              strokeWidth={2}
            />
          </Pressable>
        ) : null}
        <Text style={[styles.pillText, selected ? styles.pillTextSelected : styles.pillTextUnselected]}>{label}</Text>
      </View>
    </Pressable>
  );
}

export function AddExerciseModal({
  open,
  onClose,
  onConfirm,
  title = 'Add exercise',
  confirmLabel = 'Add',
  onRequestCreateMethod,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: (selection: AddExerciseSelection) => void;
  title?: string;
  confirmLabel?: string;
  onRequestCreateMethod?: (key: MethodKey) => void;
}) {
  const { colors } = useTrenaTheme();
  const styles = React.useMemo(() => createStyles(colors), [colors]);

  const [term, setTerm] = React.useState('');
  const [customs, setCustoms] = React.useState<string[]>([]);
  const [methods, setMethods] = React.useState<MethodInstanceRow[]>([]);
  const [isLoadingMethods, setIsLoadingMethods] = React.useState(false);

  const [selectedExercise, setSelectedExercise] = React.useState<ExerciseRef | null>(null);

  const [methodChoice, setMethodChoice] = React.useState<MethodKey | null>(null);
  const [selectedMethodInstanceId, setSelectedMethodInstanceId] = React.useState<string | null>(null);
  const [wendlerLift, setWendlerLift] = React.useState<WendlerLiftKey>('bench');

  const [awaitingCreatedMethodKey, setAwaitingCreatedMethodKey] = React.useState<MethodKey | null>(null);

  React.useEffect(() => {
    if (!open) return;
    const d = getAddExerciseDraft();
    setTerm('');
    setSelectedExercise(d?.selectedExercise ?? null);
    setMethodChoice(d?.methodChoice ?? null);
    setSelectedMethodInstanceId(d?.selectedMethodInstanceId ?? null);
    setWendlerLift(d?.wendlerLift ?? 'bench');
    setAwaitingCreatedMethodKey(d?.awaitingCreatedMethodKey ?? null);
    if (d?.shouldReopen) {
      // Once we've restored, clear the reopen flag so it doesn't keep popping open.
      setAddExerciseDraft({ ...d, shouldReopen: false });
    }
  }, [open]);

  React.useEffect(() => {
    if (!open) return;
    listDistinctFreeExercises().then((list) => setCustoms(list));
  }, [open]);

  const loadMethods = React.useCallback(async () => {
    setIsLoadingMethods(true);
    try {
      const rows = await listMethodInstances();
      setMethods(rows);
    } finally {
      setIsLoadingMethods(false);
    }
  }, []);

  React.useEffect(() => {
    if (!open) return;
    loadMethods();
  }, [loadMethods, open]);

  React.useEffect(() => {
    if (!open) return;
    const unsub = subscribeMethodInstanceCreated((row) => {
      // Only auto-select if we initiated creation OR if it matches current choice.
      if (awaitingCreatedMethodKey && row.method_key !== awaitingCreatedMethodKey) return;
      setMethods((cur) => [row, ...cur.filter((x) => x.id !== row.id)]);
      setMethodChoice(row.method_key);
      setSelectedMethodInstanceId(row.id);
      setAwaitingCreatedMethodKey(null);
    });
    return () => {
      // `subscribeMethodInstanceCreated` currently returns a function that may return a boolean;
      // React effect cleanups must return void.
      unsub();
    };
  }, [awaitingCreatedMethodKey, open]);

  React.useEffect(() => {
    if (!open) return;
    const queued = consumeMethodInstanceCreatedQueue();
    if (!queued.length) return;
    const row = queued[0];
    if (awaitingCreatedMethodKey && row.method_key !== awaitingCreatedMethodKey) return;
    setMethods((cur) => [row, ...cur.filter((x) => x.id !== row.id)]);
    setMethodChoice(row.method_key);
    setSelectedMethodInstanceId(row.id);
    setAwaitingCreatedMethodKey(null);
  }, [awaitingCreatedMethodKey, open]);

  const filteredLearn = React.useMemo(() => {
    const t = normalize(term);
    return learnExercises.filter((x) => normalize(x.name).includes(t));
  }, [term]);

  const filteredCustom = React.useMemo(() => {
    const t = normalize(term);
    return customs.filter((x) => normalize(x).includes(t));
  }, [customs, term]);

  const exactMatch = React.useMemo(() => {
    const t = normalize(term);
    return (
      filteredLearn.some((x) => normalize(x.name) === t) || filteredCustom.some((x) => normalize(x) === t)
    );
  }, [filteredCustom, filteredLearn, term]);

  const bilbos = React.useMemo(() => methods.filter((m) => m.method_key === 'bilbo'), [methods]);
  const wendlers = React.useMemo(() => methods.filter((m) => m.method_key === 'wendler_531'), [methods]);

  const suggestedBilbos = React.useMemo(() => {
    if (!selectedExercise) return bilbos;
    const matching = bilbos.filter((m) => matchesBilboExercise(m, selectedExercise));
    const rest = bilbos.filter((m) => !matchesBilboExercise(m, selectedExercise));
    return [...matching, ...rest];
  }, [bilbos, selectedExercise]);

  const selectedMethodInstance = React.useMemo(
    () => (selectedMethodInstanceId ? methods.find((m) => m.id === selectedMethodInstanceId) ?? null : null),
    [methods, selectedMethodInstanceId],
  );

  const effectiveExercise = React.useMemo(() => {
    if (!methodChoice) return selectedExercise;
    if (!selectedMethodInstance) return null;
    const binding: MethodBinding =
      methodChoice === 'bilbo' ? { methodKey: 'bilbo' } : { methodKey: 'wendler_531', lift: wendlerLift };
    return inferExerciseFromMethod({
      methodKey: methodChoice,
      methodInstance: selectedMethodInstance,
      binding,
      fallbackExercise: selectedExercise,
    });
  }, [methodChoice, selectedExercise, selectedMethodInstance, wendlerLift]);

  const canConfirm =
    !methodChoice
      ? !!selectedExercise
      : !!selectedMethodInstanceId && !!selectedMethodInstance && !!effectiveExercise;

  const handleClose = () => {
    clearAddExerciseDraft();
    onClose();
  };

  const onSelectExercise = (ref: ExerciseRef) => {
    setSelectedExercise(ref);
    // Mutual exclusivity: selecting an exercise clears progression selection.
    setMethodChoice(null);
    setSelectedMethodInstanceId(null);
  };

  const onCreateMethod = (key: MethodKey) => {
    setAwaitingCreatedMethodKey(key);
    setAddExerciseDraft({
      shouldReopen: true,
      selectedExercise,
      methodChoice: key,
      selectedMethodInstanceId,
      wendlerLift,
      awaitingCreatedMethodKey: key,
    });
    onClose();
    onRequestCreateMethod?.(key);
  };

  const onEditMethod = (methodInstanceId: string) => {
    const mi = methods.find((m) => m.id === methodInstanceId);
    if (!mi) return;
    setAddExerciseDraft({
      shouldReopen: true,
      selectedExercise,
      methodChoice: mi.method_key,
      selectedMethodInstanceId: methodInstanceId,
      wendlerLift,
      awaitingCreatedMethodKey: null,
    });
    onClose();
    router.push(`/activities/programs?editId=${encodeURIComponent(methodInstanceId)}&returnTo=selector` as any);
  };

  const confirm = () => {
    if (!methodChoice) {
      if (!selectedExercise) return;
      onConfirm({ exercise: selectedExercise, method: null });
      clearAddExerciseDraft();
      return;
    }
    if (!selectedMethodInstanceId) return;
    const binding: MethodBinding =
      methodChoice === 'bilbo' ? { methodKey: 'bilbo' } : { methodKey: 'wendler_531', lift: wendlerLift };

    const methodInstance = selectedMethodInstance;
    if (!methodInstance) return;
    const ex = effectiveExercise;
    if (!ex) return;
    onConfirm({ exercise: ex, method: { methodInstanceId: selectedMethodInstanceId, binding, methodInstance } });
    clearAddExerciseDraft();
  };

  return (
    <Modal visible={open} animationType="slide" presentationStyle="pageSheet" onRequestClose={handleClose}>
      <SafeAreaView style={styles.safe}>
        <View style={styles.header}>
          <Text style={styles.title}>{title}</Text>
          <Pressable onPress={handleClose} style={styles.closeBtn}>
            <Text style={styles.closeText}>Close</Text>
          </Pressable>
        </View>

        <View style={styles.searchRow}>
          <SearchIcon color={rgba(colors.text, 0.5)} size={18} />
          <TextInput
            placeholder="Search exercise..."
            placeholderTextColor={rgba(colors.text, 0.5)}
            style={styles.input}
            value={term}
            onChangeText={setTerm}
          />
        </View>

        <ScrollView contentContainerStyle={styles.list} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <View style={styles.section}>
            <Text style={[styles.sectionHeader, styles.sectionHeaderTop]}>Progression</Text>

            <>
                <View style={styles.pillsRow}>
                  <Pill
                    label="Bilbo"
                    selected={methodChoice === 'bilbo'}
                    styles={styles}
                    colors={colors}
                    onPress={() => {
                      setSelectedExercise(null);
                      setMethodChoice('bilbo');
                      setSelectedMethodInstanceId(null);
                    }}
                  />
                  <Pill
                    label="5/3/1"
                    selected={methodChoice === 'wendler_531'}
                    styles={styles}
                    colors={colors}
                    onPress={() => {
                      setSelectedExercise(null);
                      setMethodChoice('wendler_531');
                      setSelectedMethodInstanceId(null);
                    }}
                  />
                </View>

                {isLoadingMethods ? (
                  <View style={{ paddingTop: 8 }}>
                    <ActivityIndicator color={colors.primary} />
                  </View>
                ) : null}

                {methodChoice === 'bilbo' ? (
                  <View style={{ gap: 10 }}>
                    <View style={styles.rowBetween}>
                      <Text style={styles.muted}>Select a Bilbo progression</Text>
                      <Pressable accessibilityRole="button" onPress={() => onCreateMethod('bilbo')} style={styles.linkButton}>
                        <Text style={styles.linkText}>Create new</Text>
                      </Pressable>
                    </View>

                    {suggestedBilbos.length === 0 ? (
                      <Text style={styles.muted}>No Bilbo progressions yet.</Text>
                    ) : (
                      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.pillsRow}>
                        {suggestedBilbos.map((m) => (
                          <Pill
                            key={m.id}
                            label={m.name}
                            selected={selectedMethodInstanceId === m.id}
                            onEdit={selectedMethodInstanceId === m.id ? () => onEditMethod(m.id) : undefined}
                            styles={styles}
                            colors={colors}
                            onPress={() => {
                              setSelectedExercise(null);
                              setSelectedMethodInstanceId(m.id);
                            }}
                          />
                        ))}
                      </ScrollView>
                    )}
                  </View>
                ) : null}

                {methodChoice === 'wendler_531' ? (
                  <View style={{ gap: 10 }}>
                    <View style={styles.rowBetween}>
                      <Text style={styles.muted}>Select a 5/3/1 progression</Text>
                      <Pressable accessibilityRole="button" onPress={() => onCreateMethod('wendler_531')} style={styles.linkButton}>
                        <Text style={styles.linkText}>Create new</Text>
                      </Pressable>
                    </View>

                    {wendlers.length === 0 ? (
                      <Text style={styles.muted}>No 5/3/1 progressions yet.</Text>
                    ) : (
                      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.pillsRow}>
                        {wendlers.map((m) => (
                          <Pill
                            key={m.id}
                            label={m.name}
                            selected={selectedMethodInstanceId === m.id}
                            onEdit={selectedMethodInstanceId === m.id ? () => onEditMethod(m.id) : undefined}
                            styles={styles}
                            colors={colors}
                            onPress={() => {
                              setSelectedExercise(null);
                              setSelectedMethodInstanceId(m.id);
                            }}
                          />
                        ))}
                      </ScrollView>
                    )}

                    {selectedMethodInstanceId ? (
                      <View style={{ gap: 8 }}>
                        <Text style={styles.muted}>Main lift</Text>
                        <View style={styles.pillsRow}>
                          {(['squat', 'bench', 'deadlift', 'press'] as WendlerLiftKey[]).map((k) => (
                            <Pill
                              key={k}
                              label={k}
                              selected={wendlerLift === k}
                              styles={styles}
                              colors={colors}
                              onPress={() => setWendlerLift(k)}
                            />
                          ))}
                        </View>
                      </View>
                    ) : (
                      <Text style={styles.muted}>Pick a progression first, then choose which lift to log.</Text>
                    )}
                  </View>
                ) : null}
            </>
          </View>

          <View style={styles.divider} />

          <View style={styles.section}>
            <Text style={styles.sectionHeader}>Exercise</Text>

            {term && !exactMatch ? (
              <Pressable
                style={styles.row}
                onPress={() => onSelectExercise({ kind: 'free', name: term.trim() })}
              >
                <View style={[styles.iconBox, { backgroundColor: colors.primary }]}>
                  <Text style={{ fontSize: 16, fontWeight: 'bold', color: colors.onPrimary }}>+</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.rowTitle}>Create "{term.trim()}"</Text>
                  <Text style={styles.rowMeta}>Custom exercise</Text>
                </View>
              </Pressable>
            ) : null}

            {filteredCustom.length > 0 ? (
              <View style={{ gap: 10 }}>
                <Text style={styles.subHeader}>Custom</Text>
                {filteredCustom.map((name) => {
                  const selected = selectedExercise?.kind === 'free' && selectedExercise.name === name;
                  return (
                    <Pressable
                      key={name}
                      style={[styles.row, selected && styles.rowSelected]}
                      onPress={() => onSelectExercise({ kind: 'free', name })}
                    >
                      <View style={[styles.iconBox, selected && styles.iconBoxSelected]} />
                      <Text
                        style={[styles.rowTitle, { flex: 1 }, selected && styles.rowTitleSelected]}
                        numberOfLines={1}
                      >
                        {name}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            ) : null}

            {filteredLearn.length > 0 ? (
              <View style={{ gap: 10 }}>
                <Text style={styles.subHeader}>Library</Text>
                {filteredLearn.map((ex) => {
                  const selected = selectedExercise?.kind === 'learn' && selectedExercise.learnExerciseId === ex.id;
                  return (
                    <Pressable
                      key={ex.id}
                      style={[styles.row, selected && styles.rowSelected]}
                      onPress={() => onSelectExercise({ kind: 'learn', learnExerciseId: ex.id })}
                    >
                      <View style={[styles.iconBox, selected && styles.iconBoxSelected]}>
                        <Text style={[styles.iconText, selected && styles.iconTextSelected]}>{ex.name.slice(0, 1)}</Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.rowTitle, selected && styles.rowTitleSelected]}>{ex.name}</Text>
                        <Text style={[styles.rowMeta, selected && styles.rowMetaSelected]}>{ex.equipment.join(', ')}</Text>
                      </View>
                    </Pressable>
                  );
                })}
              </View>
            ) : null}

            {!term && filteredCustom.length === 0 && filteredLearn.length === 0 ? (
              <Text style={styles.empty}>Start typing to search…</Text>
            ) : null}
          </View>
        </ScrollView>

        <View style={styles.footer}>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={styles.footerTitle} numberOfLines={1}>
              {effectiveExercise ? labelForExercise(effectiveExercise) : 'Select an exercise or progression'}
            </Text>
            <Text style={styles.footerMeta} numberOfLines={1}>
              {!methodChoice
                ? 'Free logging'
                : methodChoice === 'bilbo'
                  ? selectedMethodInstanceId
                    ? 'Bilbo attached'
                    : 'Pick a Bilbo progression'
                  : selectedMethodInstanceId
                    ? `5/3/1 • ${wendlerLift}`
                    : 'Pick a 5/3/1 progression'}
            </Text>
          </View>

          <Pressable
            accessibilityRole="button"
            onPress={confirm}
            disabled={!canConfirm}
            style={({ pressed }) => [
              styles.primaryButton,
              (!canConfirm || pressed) && { opacity: canConfirm ? 0.95 : 0.5, transform: pressed ? [{ scale: 0.99 }] : undefined },
            ]}
          >
            <Text style={styles.primaryButtonText}>{confirmLabel}</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const createStyles = (colors: {
  background: string;
  surface: string;
  primary: string;
  text: string;
  onPrimary: string;
}) =>
  StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: rgba(colors.text, 0.1),
  },
  title: { fontFamily: Fonts.bold, fontSize: 18, color: colors.text },
  closeBtn: { padding: 8 },
  closeText: { fontFamily: Fonts.bold, color: colors.primary, fontSize: 16 },

  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    margin: 16,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: rgba(colors.text, 0.06),
    borderRadius: 10,
    gap: 8,
  },
  input: { flex: 1, fontFamily: Fonts.medium, fontSize: 16, color: colors.text },

  list: { paddingHorizontal: 16, paddingBottom: 20, gap: 16 },
  section: { gap: 10 },
  sectionHeader: {
    fontFamily: Fonts.bold,
    fontSize: 14,
    color: rgba(colors.text, 0.4),
    textTransform: 'uppercase',
  },
  sectionHeaderTop: {
    marginTop: 8,
  },
  subHeader: { fontFamily: Fonts.bold, fontSize: 12, color: rgba(colors.text, 0.35), textTransform: 'uppercase' },
  divider: { height: 1, backgroundColor: rgba(colors.text, 0.10) },
  empty: { textAlign: 'center', color: rgba(colors.text, 0.4), marginTop: 10, fontFamily: Fonts.medium, fontSize: 15 },

  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 6 },
  rowSelected: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 10,
  },
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: rgba(colors.text, 0.1),
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconBoxSelected: {
    backgroundColor: 'rgba(0, 0, 0, 0.12)',
  },
  iconText: { fontFamily: Fonts.bold, color: rgba(colors.text, 0.5), fontSize: 16 },
  iconTextSelected: { color: '#000' },
  rowTitle: { fontFamily: Fonts.semiBold, fontSize: 16, color: colors.text },
  rowTitleSelected: { color: '#000' },
  rowMeta: { fontFamily: Fonts.regular, fontSize: 12, color: rgba(colors.text, 0.6) },
  rowMetaSelected: { color: 'rgba(0, 0, 0, 0.7)' },

  muted: { color: rgba(colors.text, 0.7), fontFamily: Fonts.regular, fontSize: 13, lineHeight: 18 },
  pillsRow: { flexDirection: 'row', gap: 10, flexWrap: 'wrap' },
  pill: { borderRadius: 999, paddingVertical: 10, paddingHorizontal: 14, borderWidth: 1 },
  pillSelected: { backgroundColor: colors.primary, borderColor: colors.primary },
  pillUnselected: { backgroundColor: rgba(colors.text, 0.04), borderColor: rgba(colors.text, 0.12) },
  pillInner: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  pillEditButton: { padding: 1 },
  pillText: { fontFamily: Fonts.semiBold, fontSize: 13, lineHeight: 16 },
  pillTextSelected: { color: colors.onPrimary },
  pillTextUnselected: { color: rgba(colors.text, 0.9) },

  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  linkButton: { paddingVertical: 6, paddingHorizontal: 8, borderRadius: 8, backgroundColor: rgba(colors.text, 0.06) },
  linkText: { fontFamily: Fonts.bold, fontSize: 12, color: colors.primary },

  footer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: rgba(colors.text, 0.10),
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  footerTitle: { fontFamily: Fonts.bold, fontSize: 14, color: colors.text },
  footerMeta: { fontFamily: Fonts.medium, fontSize: 12, color: rgba(colors.text, 0.65) },

  primaryButton: {
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
    backgroundColor: colors.primary,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(0, 0, 0, 0.25)',
  },
  primaryButtonText: { color: colors.onPrimary, fontSize: 15, fontFamily: Fonts.extraBold },
});

