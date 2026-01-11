import DateTimePicker from '@react-native-community/datetimepicker';
import React from 'react';
import { FlatList, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  AppleIcon,
  BackpackIcon,
  BallIcon,
  BatteryIcon,
  BicycleIcon,
  BrainIcon,
  BugIcon,
  CarIcon,
  ChessIcon,
  DropIcon,
  DumbbellIcon,
  FireIcon,
  HappyIcon,
  HourglassIcon,
  LeafIcon,
  LegIcon,
  MountainIcon,
  MuscleIcon,
  NeutralIcon,
  PinIcon,
  PizzaIcon,
  RainIcon,
  RollerskateIcon,
  SadIcon,
  ShoeIcon,
  SkippingRopeIcon,
  SnowIcon,
  StarIcon,
  StickyNoteIcon,
  VideoIcon,
  XIcon,
  YogaIcon,
} from '@/components/icons';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { Fonts, rgba } from '@/constants/theme';
import { learnData } from '@/data/learn';
import { useTrenaTheme } from '@/hooks/use-theme-context';
import { listDistinctFreeExercises } from '@/lib/workouts/repo';
import { WORKOUT_TAGS, type WorkoutTag } from '@/lib/workouts/tags';
import type { ExerciseRef, WorkoutSessionRow } from '@/lib/workouts/types';

export type ActivitiesDatePreset = 'any' | 'today' | 'last7' | 'last30' | 'custom';

export type SelectedWorkout = {
  id: string;
  title: string;
};

export type SelectedNote = {
  sessionId: string;
  noteContent: string;
  noteContext: string;
};

export type ActivitiesFilters = {
  workoutQuery: string;
  selectedWorkouts: SelectedWorkout[];
  selectedExercises: ExerciseRef[];
  notesQuery: string;
  selectedNotes: SelectedNote[];
  selectedTags: WorkoutTag[];
  datePreset: ActivitiesDatePreset;
  startDate: Date | null;
  endDate: Date | null;
};

export function isActivitiesFilterActive(filters: ActivitiesFilters): boolean {
  return (
    filters.workoutQuery.trim().length > 0 ||
    filters.selectedWorkouts.length > 0 ||
    filters.selectedExercises.length > 0 ||
    filters.notesQuery.trim().length > 0 ||
    filters.selectedNotes.length > 0 ||
    filters.selectedTags.length > 0 ||
    filters.datePreset !== 'any' ||
    filters.startDate != null ||
    filters.endDate != null
  );
}

export function countActiveActivitiesFilters(filters: ActivitiesFilters): number {
  let c = 0;
  if (filters.workoutQuery.trim() || filters.selectedWorkouts.length) c += 1;
  if (filters.selectedExercises.length) c += 1;
  if (filters.notesQuery.trim() || filters.selectedNotes.length) c += 1;
  if (filters.selectedTags.length) c += 1;
  if (filters.datePreset !== 'any' || filters.startDate != null || filters.endDate != null) c += 1;
  return c;
}

const learnExercises = learnData.filter((x) => x.type === 'exercise');
const learnExerciseNameById = new Map<string, string>(learnExercises.map((x) => [x.id, x.name]));

function formatDateLabel(d: Date | null) {
  if (!d) return 'Any';
  return d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
}

function formatSessionDate(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
}

function normalize(s: string) {
  return s.toLowerCase().trim();
}

function formatExerciseName(ref: ExerciseRef): string {
  if (ref.kind === 'learn') return learnExerciseNameById.get(ref.learnExerciseId) ?? ref.learnExerciseId;
  return ref.name;
}

type NoteSearchResult = {
  sessionId: string;
  sessionTitle: string;
  sessionDate: string;
  exerciseCount: number;
  noteContent: string;
  noteContext: string; // e.g. "Workout note" or exercise name
};

function exerciseKey(ref: ExerciseRef): string {
  if (ref.kind === 'learn') return `learn:${ref.learnExerciseId}`;
  return `free:${normalize(ref.name)}`;
}

function labelForExercise(ref: ExerciseRef): string {
  if (ref.kind === 'free') return ref.name;
  const hit = learnExercises.find((x) => x.id === ref.learnExerciseId);
  return hit?.name ?? 'Unknown exercise';
}

function WorkoutTagIcon({ tag, size = 18, color }: { tag: WorkoutTag; size?: number; color?: string }) {
  switch (tag) {
    case 'skippingrope':
      return <SkippingRopeIcon size={size} color={color} />;
    case 'leg':
      return <LegIcon size={size} color={color} />;
    case 'yoga':
      return <YogaIcon size={size} color={color} />;
    case 'chess':
      return <ChessIcon size={size} color={color} />;
    case 'bicycle':
      return <BicycleIcon size={size} color={color} />;
    case 'snow':
      return <SnowIcon size={size} color={color} />;
    case 'hourglass':
      return <HourglassIcon size={size} color={color} />;
    case 'pin':
      return <PinIcon size={size} color={color} />;
    case 'pizza':
      return <PizzaIcon size={size} color={color} />;
    case 'rollerskate':
      return <RollerskateIcon size={size} color={color} />;
    case 'apple':
      return <AppleIcon size={size} color={color} />;
    case 'backpack':
      return <BackpackIcon size={size} color={color} />;
    case 'mountain':
      return <MountainIcon size={size} color={color} />;
    case 'bug':
      return <BugIcon size={size} color={color} />;
    case 'rain':
      return <RainIcon size={size} color={color} />;
    case 'car':
      return <CarIcon size={size} color={color} />;
    case 'video':
      return <VideoIcon size={size} color={color} />;
    case 'battery':
      return <BatteryIcon size={size} color={color} />;
    case 'muscle':
      return <MuscleIcon size={size} color={color} />;
    case 'leaf':
      return <LeafIcon size={size} color={color} />;
    case 'ball':
      return <BallIcon size={size} color={color} />;
    case 'drop':
      return <DropIcon size={size} color={color} />;
    case 'fire':
      return <FireIcon size={size} color={color} />;
    case 'shoe':
      return <ShoeIcon size={size} color={color} />;
    case 'happy':
      return <HappyIcon size={size} color={color} />;
    case 'neutral':
      return <NeutralIcon size={size} color={color} />;
    case 'sad':
      return <SadIcon size={size} color={color} />;
    case 'dumbbell':
      return <DumbbellIcon size={size} color={color} />;
    case 'star':
      return <StarIcon size={size} color={color} />;
    case 'brain':
      return <BrainIcon size={size} color={color} />;
  }
}

export function ActivitiesFilterSheet(props: {
  visible: boolean;
  filters: ActivitiesFilters;
  matchCount?: number;
  sessions?: WorkoutSessionRow[];
  onChange: (patch: Partial<ActivitiesFilters>) => void;
  onClear: () => void;
  onClose: () => void;
}) {
  const { colors } = useTrenaTheme();
  const styles = React.useMemo(() => createStyles(colors), [colors]);

  const { filters, sessions = [] } = props;

  const [exPickerOpen, setExPickerOpen] = React.useState(false);
  const [exTerm, setExTerm] = React.useState('');
  const [customExercises, setCustomExercises] = React.useState<string[]>([]);

  const [tagsPickerOpen, setTagsPickerOpen] = React.useState(false);

  // Name picker modal state
  const [namePickerOpen, setNamePickerOpen] = React.useState(false);
  const [nameTerm, setNameTerm] = React.useState(filters.workoutQuery);

  // Notes picker modal state
  const [notesPickerOpen, setNotesPickerOpen] = React.useState(false);
  const [notesTerm, setNotesTerm] = React.useState(filters.notesQuery);

  // Sync local term with filters when modal opens
  React.useEffect(() => {
    if (namePickerOpen) setNameTerm(filters.workoutQuery);
  }, [namePickerOpen]);

  React.useEffect(() => {
    if (notesPickerOpen) setNotesTerm(filters.notesQuery);
  }, [notesPickerOpen]);

  // Search results for workout name filter - show all by default, filter as user types
  const filteredWorkoutsByName = React.useMemo(() => {
    if (sessions.length === 0) return [];
    const q = normalize(nameTerm);
    if (!q) return sessions; // Show all when no search term
    return sessions.filter((s) => normalize(s.title ?? '').includes(q));
  }, [nameTerm, sessions]);

  // All notes from sessions - built once
  const allNotes = React.useMemo((): NoteSearchResult[] => {
    if (sessions.length === 0) return [];

    const results: NoteSearchResult[] = [];

    for (const s of sessions) {
      const exerciseCount = s.snapshot?.exercises?.length ?? 0;
      const sessionDate = formatSessionDate(s.started_at);

      // Check workout-level notes
      const workoutNotes = s.snapshot?.notes ?? '';
      if (workoutNotes.trim()) {
        results.push({
          sessionId: s.id,
          sessionTitle: s.title,
          sessionDate,
          exerciseCount,
          noteContent: workoutNotes,
          noteContext: 'Workout note',
        });
      }

      // Check exercise-level notes
      for (const ex of s.snapshot?.exercises ?? []) {
        const exNotes = ex.notes ?? '';
        if (exNotes.trim()) {
          results.push({
            sessionId: s.id,
            sessionTitle: s.title,
            sessionDate,
            exerciseCount,
            noteContent: exNotes,
            noteContext: formatExerciseName(ex.exercise),
          });
        }
      }
    }

    return results;
  }, [sessions]);

  // Search results for notes filter - show all by default, filter as user types
  const filteredByNotes = React.useMemo((): NoteSearchResult[] => {
    const q = normalize(notesTerm);
    if (!q) return allNotes; // Show all when no search term
    return allNotes.filter(
      (r) => normalize(r.noteContent).includes(q) || normalize(r.noteContext).includes(q) || normalize(r.sessionTitle).includes(q)
    );
  }, [notesTerm, allNotes]);

  React.useEffect(() => {
    if (!exPickerOpen) return;
    listDistinctFreeExercises()
      .then((list) => setCustomExercises(list))
      .catch(() => setCustomExercises([]));
  }, [exPickerOpen]);

  const [androidPickerVisible, setAndroidPickerVisible] = React.useState(false);
  const [iosPickerVisible, setIosPickerVisible] = React.useState(false);
  const [pickerTarget, setPickerTarget] = React.useState<'start' | 'end'>('start');
  const [tempDate, setTempDate] = React.useState<Date>(new Date());

  const openPicker = (target: 'start' | 'end') => {
    setPickerTarget(target);
    const current = target === 'start' ? filters.startDate : filters.endDate;
    setTempDate(current ?? new Date());
    if (Platform.OS === 'android') setAndroidPickerVisible(true);
    else setIosPickerVisible(true);
  };

  const commitDate = (next: Date | null) => {
    if (!next) {
      props.onChange(pickerTarget === 'start' ? { startDate: null } : { endDate: null });
      return;
    }
    const start = pickerTarget === 'start' ? next : filters.startDate;
    const end = pickerTarget === 'end' ? next : filters.endDate;
    if (start && end && start.getTime() > end.getTime()) {
      // Keep range sane by snapping the other edge.
      if (pickerTarget === 'start') props.onChange({ startDate: start, endDate: start });
      else props.onChange({ startDate: end, endDate: end });
      return;
    }
    props.onChange(pickerTarget === 'start' ? { startDate: start ?? null } : { endDate: end ?? null });
  };

  const setPreset = (preset: ActivitiesDatePreset) => {
    if (preset === 'custom') {
      props.onChange({ datePreset: 'custom' });
      return;
    }
    props.onChange({ datePreset: preset, startDate: null, endDate: null });
  };

  const selectedExerciseKeys = React.useMemo(
    () => new Set(filters.selectedExercises.map(exerciseKey)),
    [filters.selectedExercises]
  );

  const filteredLearn = React.useMemo(() => {
    const t = normalize(exTerm);
    if (!t) return learnExercises;
    return learnExercises.filter((x) => normalize(x.name).includes(t));
  }, [exTerm]);

  const filteredCustom = React.useMemo(() => {
    const t = normalize(exTerm);
    if (!t) return customExercises;
    return customExercises.filter((x) => normalize(x).includes(t));
  }, [exTerm, customExercises]);

  const exactMatch =
    filteredLearn.some((x) => normalize(x.name) === normalize(exTerm)) ||
    filteredCustom.some((x) => normalize(x) === normalize(exTerm));

  return (
    <>
      <BottomSheet
        visible={props.visible}
        onClose={props.onClose}
        initialHeightPct={0.65}
        maxHeightPct={0.9}
        sheetBackgroundColor={colors.surface}
        handleColor={rgba(colors.text, 0.25)}
      >
        <View style={styles.sheet}>
          <View style={styles.headerRow}>
            <View style={{ flex: 1, gap: 2 }}>
              <Text style={styles.title}>Filters</Text>
              {typeof props.matchCount === 'number' ? (
                <Text style={styles.subtitle}>{props.matchCount} workout{props.matchCount === 1 ? '' : 's'}</Text>
              ) : null}
            </View>
            <View style={styles.headerActions}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Clear filters"
                onPress={props.onClear}
                hitSlop={10}
                style={({ pressed }) => [styles.headerAction, pressed && styles.pressed]}
              >
                <Text style={styles.headerActionText}>Clear</Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Apply filters"
                onPress={props.onClose}
                hitSlop={10}
                style={({ pressed }) => [styles.headerPrimaryAction, pressed && styles.pressed]}
              >
                <Text style={styles.headerPrimaryActionText}>Apply</Text>
              </Pressable>
            </View>
          </View>

          <ScrollView
            style={styles.sheetScroll}
            contentContainerStyle={styles.sheetScrollContent}
            showsVerticalScrollIndicator={true}
            keyboardShouldPersistTaps="handled"
            bounces={true}
            nestedScrollEnabled={true}
          >
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Workout</Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Search workout name"
                onPress={() => setNamePickerOpen(true)}
                style={({ pressed }) => [styles.inputLike, pressed && styles.pressed]}
              >
                {filters.selectedWorkouts.length > 0 ? (
                  <View style={styles.chipsRow}>
                    {filters.selectedWorkouts.map((w) => (
                      <View key={w.id} style={styles.chip}>
                        <Text style={styles.chipText} numberOfLines={1}>
                          {w.title}
                        </Text>
                        <Pressable
                          accessibilityRole="button"
                          accessibilityLabel={`Remove ${w.title}`}
                          onPress={() => props.onChange({ selectedWorkouts: filters.selectedWorkouts.filter((x) => x.id !== w.id) })}
                          hitSlop={10}
                          style={({ pressed }) => [styles.chipX, pressed && { opacity: 0.75 }]}
                        >
                          <XIcon size={14} color={rgba(colors.text, 0.75)} />
                        </Pressable>
                      </View>
                    ))}
                  </View>
                ) : (
                  <Text style={styles.placeholderText}>Pick workouts…</Text>
                )}
              </Pressable>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Exercises</Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Pick exercises"
                onPress={() => setExPickerOpen(true)}
                style={({ pressed }) => [styles.inputLike, pressed && styles.pressed]}
              >
                {filters.selectedExercises.length === 0 ? (
                  <Text style={styles.placeholderText}>Pick exercises…</Text>
                ) : (
                  <View style={styles.chipsRow}>
                    {filters.selectedExercises.map((ref) => {
                      const key = exerciseKey(ref);
                      return (
                        <View key={key} style={styles.chip}>
                          <Text style={styles.chipText} numberOfLines={1}>
                            {labelForExercise(ref)}
                          </Text>
                          <Pressable
                            accessibilityRole="button"
                            accessibilityLabel={`Remove ${labelForExercise(ref)}`}
                            onPress={() =>
                              props.onChange({
                                selectedExercises: filters.selectedExercises.filter((x) => exerciseKey(x) !== key),
                              })
                            }
                            hitSlop={10}
                            style={({ pressed }) => [styles.chipX, pressed && { opacity: 0.75 }]}
                          >
                            <XIcon size={14} color={rgba(colors.text, 0.75)} />
                          </Pressable>
                        </View>
                      );
                    })}
                  </View>
                )}
              </Pressable>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Tags</Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Pick tags"
                onPress={() => setTagsPickerOpen(true)}
                style={({ pressed }) => [styles.inputLike, pressed && styles.pressed]}
              >
                {filters.selectedTags.length === 0 ? (
                  <Text style={styles.placeholderText}>Pick tags…</Text>
                ) : (
                  <View style={styles.chipsRow}>
                    {filters.selectedTags.map((tag) => (
                      <View key={tag} style={styles.chip}>
                        <WorkoutTagIcon tag={tag} size={16} color={rgba(colors.text, 0.85)} />
                        <Text style={styles.chipText} numberOfLines={1}>
                          {tag}
                        </Text>
                        <Pressable
                          accessibilityRole="button"
                          accessibilityLabel={`Remove ${tag}`}
                          onPress={() => props.onChange({ selectedTags: filters.selectedTags.filter((x) => x !== tag) })}
                          hitSlop={10}
                          style={({ pressed }) => [styles.chipX, pressed && { opacity: 0.75 }]}
                        >
                          <XIcon size={14} color={rgba(colors.text, 0.75)} />
                        </Pressable>
                      </View>
                    ))}
                  </View>
                )}
              </Pressable>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Notes</Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Search workout notes"
                onPress={() => setNotesPickerOpen(true)}
                style={({ pressed }) => [styles.inputLike, pressed && styles.pressed]}
              >
                {filters.selectedNotes.length > 0 ? (
                  <View style={styles.chipsRow}>
                    {filters.selectedNotes.map((n, idx) => (
                      <View key={`${n.sessionId}-${idx}`} style={styles.chip}>
                        <Text style={styles.chipText} numberOfLines={1}>
                          {n.noteContent.slice(0, 30)}{n.noteContent.length > 30 ? '…' : ''}
                        </Text>
                        <Pressable
                          accessibilityRole="button"
                          accessibilityLabel="Remove note filter"
                          onPress={() => props.onChange({ selectedNotes: filters.selectedNotes.filter((_, i) => i !== idx) })}
                          hitSlop={10}
                          style={({ pressed }) => [styles.chipX, pressed && { opacity: 0.75 }]}
                        >
                          <XIcon size={14} color={rgba(colors.text, 0.75)} />
                        </Pressable>
                      </View>
                    ))}
                  </View>
                ) : (
                  <Text style={styles.placeholderText}>Pick notes…</Text>
                )}
              </Pressable>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Date</Text>
              <View style={styles.presetRow}>
                {(
                  [
                    ['any', 'Any'],
                    ['today', 'Today'],
                    ['last7', 'Last 7'],
                    ['last30', 'Last 30'],
                    ['custom', 'Custom'],
                  ] as const
                ).map(([key, label]) => {
                  const selected = filters.datePreset === key;
                  return (
                    <Pressable
                      key={key}
                      accessibilityRole="button"
                      accessibilityLabel={`Date filter: ${label}`}
                      onPress={() => setPreset(key)}
                      style={({ pressed }) => [
                        styles.presetPill,
                        selected ? styles.presetPillSelected : styles.presetPillUnselected,
                        pressed && styles.pressed,
                      ]}
                    >
                      <Text style={[styles.presetText, selected ? styles.presetTextSelected : styles.presetTextUnselected]}>
                        {label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>

              {filters.datePreset === 'custom' ? (
                <View style={styles.customDateWrap}>
                  <View style={styles.customDateRow}>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel="Set start date"
                      onPress={() => openPicker('start')}
                      style={({ pressed }) => [styles.dateButton, pressed && styles.pressed]}
                    >
                      <Text style={styles.dateButtonLabel}>Start</Text>
                      <Text style={styles.dateButtonValue}>{formatDateLabel(filters.startDate)}</Text>
                    </Pressable>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel="Clear start date"
                      onPress={() => props.onChange({ startDate: null })}
                      style={({ pressed }) => [styles.miniButton, pressed && styles.pressed]}
                    >
                      <Text style={styles.miniButtonText}>Clear</Text>
                    </Pressable>
                  </View>

                  <View style={styles.customDateRow}>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel="Set end date"
                      onPress={() => openPicker('end')}
                      style={({ pressed }) => [styles.dateButton, pressed && styles.pressed]}
                    >
                      <Text style={styles.dateButtonLabel}>End</Text>
                      <Text style={styles.dateButtonValue}>{formatDateLabel(filters.endDate)}</Text>
                    </Pressable>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel="Clear end date"
                      onPress={() => props.onChange({ endDate: null })}
                      style={({ pressed }) => [styles.miniButton, pressed && styles.pressed]}
                    >
                      <Text style={styles.miniButtonText}>Clear</Text>
                    </Pressable>
                  </View>
                </View>
              ) : null}
            </View>
          </ScrollView>
        </View>
      </BottomSheet>

      {androidPickerVisible && Platform.OS === 'android' ? (
        <DateTimePicker
          value={tempDate}
          mode="date"
          display="default"
          onChange={(e, d) => {
            setAndroidPickerVisible(false);
            if (e.type === 'dismissed') return;
            if (d) {
              setTempDate(d);
              commitDate(d);
            }
          }}
        />
      ) : null}

      <Modal
        visible={iosPickerVisible && Platform.OS === 'ios'}
        transparent
        animationType="fade"
        onRequestClose={() => setIosPickerVisible(false)}
      >
        <Pressable style={styles.iosPickerBackdrop} onPress={() => setIosPickerVisible(false)}>
          <View style={styles.iosPickerCard} onStartShouldSetResponder={() => true}>
            <Text style={styles.iosPickerTitle}>{pickerTarget === 'start' ? 'Start date' : 'End date'}</Text>
            <DateTimePicker
              value={tempDate}
              mode="date"
              display="inline"
              onChange={(e, d) => {
                if (d) setTempDate(d);
              }}
            />
            <View style={styles.iosPickerActions}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Cancel date"
                onPress={() => setIosPickerVisible(false)}
                style={({ pressed }) => [styles.secondaryButton, pressed && styles.pressed, { flex: 1 }]}
              >
                <Text style={styles.secondaryButtonText}>Cancel</Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Set date"
                onPress={() => {
                  setIosPickerVisible(false);
                  commitDate(tempDate);
                }}
                style={({ pressed }) => [styles.primaryButton, pressed && styles.pressed, { flex: 1 }]}
              >
                <Text style={styles.primaryButtonText}>Set</Text>
              </Pressable>
            </View>
          </View>
        </Pressable>
      </Modal>

      <Modal visible={exPickerOpen} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setExPickerOpen(false)}>
        <SafeAreaView style={styles.exSafe}>
          <View style={styles.exHeader}>
            <Text style={styles.exTitle}>Pick exercises</Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Done picking exercises"
              onPress={() => {
                setExPickerOpen(false);
                setExTerm('');
              }}
              style={styles.exDoneBtn}
            >
              <Text style={styles.exDoneText}>Done</Text>
            </Pressable>
          </View>

          <View style={styles.exSearchRow}>
            <TextInput
              placeholder="Search exercise…"
              placeholderTextColor={rgba(colors.text, 0.5)}
              style={styles.exSearchInput}
              value={exTerm}
              onChangeText={setExTerm}
              autoFocus
            />
          </View>

          <ScrollView
            style={styles.exList}
            contentContainerStyle={styles.exListContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {exTerm && !exactMatch ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Add custom exercise ${exTerm.trim()}`}
                style={({ pressed }) => [styles.exRow, pressed && styles.rowPressed]}
                onPress={() => {
                  const nextName = exTerm.trim();
                  if (!nextName) return;
                  const ref: ExerciseRef = { kind: 'free', name: nextName };
                  const key = exerciseKey(ref);
                  if (selectedExerciseKeys.has(key)) return;
                  props.onChange({ selectedExercises: [...filters.selectedExercises, ref] });
                  setExTerm('');
                }}
              >
                <View style={[styles.exIconBox, { backgroundColor: colors.primary }]}>
                  <Text style={{ fontFamily: Fonts.black, color: colors.onPrimary, fontSize: 16 }}>+</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.exRowTitle}>Create “{exTerm.trim()}”</Text>
                  <Text style={styles.exRowMeta}>Custom exercise</Text>
                </View>
              </Pressable>
            ) : null}

            {filteredCustom.length > 0 ? (
              <View style={{ gap: 8 }}>
                <Text style={styles.exSectionHeader}>Custom</Text>
                {filteredCustom.slice(0, 30).map((name) => {
                  const ref: ExerciseRef = { kind: 'free', name };
                  const key = exerciseKey(ref);
                  const selected = selectedExerciseKeys.has(key);
                  return (
                    <Pressable
                      key={key}
                      accessibilityRole="button"
                      accessibilityLabel={`${selected ? 'Remove' : 'Add'} ${name}`}
                      style={({ pressed }) => [styles.exRow, selected && styles.exRowSelected, pressed && styles.rowPressed]}
                      onPress={() => {
                        if (selected) {
                          props.onChange({ selectedExercises: filters.selectedExercises.filter((x) => exerciseKey(x) !== key) });
                        } else {
                          props.onChange({ selectedExercises: [...filters.selectedExercises, ref] });
                        }
                      }}
                    >
                      <View style={styles.exIconBox} />
                      <Text style={styles.exRowTitle}>{name}</Text>
                    </Pressable>
                  );
                })}
              </View>
            ) : null}

            {filteredLearn.length > 0 ? (
              <View style={{ gap: 8, marginTop: filteredCustom.length > 0 ? 14 : 0 }}>
                <Text style={styles.exSectionHeader}>Library</Text>
                {filteredLearn.slice(0, 60).map((ex) => {
                  const ref: ExerciseRef = { kind: 'learn', learnExerciseId: ex.id };
                  const key = exerciseKey(ref);
                  const selected = selectedExerciseKeys.has(key);
                  return (
                    <Pressable
                      key={key}
                      accessibilityRole="button"
                      accessibilityLabel={`${selected ? 'Remove' : 'Add'} ${ex.name}`}
                      style={({ pressed }) => [styles.exRow, selected && styles.exRowSelected, pressed && styles.rowPressed]}
                      onPress={() => {
                        if (selected) {
                          props.onChange({ selectedExercises: filters.selectedExercises.filter((x) => exerciseKey(x) !== key) });
                        } else {
                          props.onChange({ selectedExercises: [...filters.selectedExercises, ref] });
                        }
                      }}
                    >
                      <View style={styles.exIconBox}>
                        <Text style={styles.exIconText}>{ex.name.slice(0, 1)}</Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.exRowTitle}>{ex.name}</Text>
                        <Text style={styles.exRowMeta}>{(ex.equipment ?? []).join(', ')}</Text>
                      </View>
                    </Pressable>
                  );
                })}
              </View>
            ) : null}

            {filteredLearn.length === 0 && filteredCustom.length === 0 && !!exTerm ? (
              <Text style={styles.exEmpty}>No matching exercises found.</Text>
            ) : null}
          </ScrollView>
        </SafeAreaView>
      </Modal>

      <Modal visible={tagsPickerOpen} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setTagsPickerOpen(false)}>
        <SafeAreaView style={styles.tagsSafe}>
          <View style={styles.tagsHeader}>
            <Text style={styles.tagsTitle}>Pick tags</Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Done picking tags"
              onPress={() => setTagsPickerOpen(false)}
              style={styles.tagsDoneBtn}
            >
              <Text style={styles.tagsDoneText}>Done</Text>
            </Pressable>
          </View>

          <View style={styles.tagsBody}>
            <FlatList
              data={WORKOUT_TAGS as unknown as WorkoutTag[]}
              keyExtractor={(t) => t}
              numColumns={6}
              scrollEnabled={true}
              contentContainerStyle={styles.tagsGridContent}
              columnWrapperStyle={styles.tagsGridRow}
              renderItem={({ item: tag }) => {
                const selected = filters.selectedTags.includes(tag);
                return (
                  <View style={styles.tagsGridCell}>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={selected ? `Remove ${tag}` : `Add ${tag}`}
                      onPress={() => {
                        if (selected) props.onChange({ selectedTags: filters.selectedTags.filter((x) => x !== tag) });
                        else props.onChange({ selectedTags: [...filters.selectedTags, tag] });
                      }}
                      style={({ pressed }) => [
                        styles.tagButton,
                        selected ? styles.tagButtonSelected : styles.tagButtonUnselected,
                        pressed && styles.pressed,
                      ]}
                    >
                      <WorkoutTagIcon tag={tag} size={18} color={selected ? colors.onPrimary : rgba(colors.text, 0.85)} />
                    </Pressable>
                  </View>
                );
              }}
            />
          </View>
        </SafeAreaView>
      </Modal>

      {/* Name Picker Modal */}
      <Modal visible={namePickerOpen} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setNamePickerOpen(false)}>
        <SafeAreaView style={styles.exSafe}>
          <View style={styles.exHeader}>
            <Text style={styles.exTitle}>Pick workouts</Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Done picking workouts"
              onPress={() => {
                setNamePickerOpen(false);
                setNameTerm('');
              }}
              style={styles.exDoneBtn}
            >
              <Text style={styles.exDoneText}>Done</Text>
            </Pressable>
          </View>

          <View style={styles.exSearchRow}>
            <TextInput
              placeholder="Search workouts…"
              placeholderTextColor={rgba(colors.text, 0.5)}
              style={styles.exSearchInput}
              value={nameTerm}
              onChangeText={setNameTerm}
              autoFocus
            />
          </View>

          <ScrollView
            style={styles.exList}
            contentContainerStyle={styles.exListContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {filteredWorkoutsByName.length > 0 ? (
              <View style={{ gap: 8 }}>
                <Text style={styles.exSectionHeader}>
                  {nameTerm.trim() ? `${filteredWorkoutsByName.length} result${filteredWorkoutsByName.length === 1 ? '' : 's'}` : 'All workouts'}
                </Text>
                {filteredWorkoutsByName.slice(0, 50).map((s) => {
                  const isSelected = filters.selectedWorkouts.some((w) => w.id === s.id);
                  return (
                    <Pressable
                      key={s.id}
                      accessibilityRole="button"
                      accessibilityLabel={`${isSelected ? 'Remove' : 'Add'} ${s.title}`}
                      onPress={() => {
                        if (isSelected) {
                          props.onChange({ selectedWorkouts: filters.selectedWorkouts.filter((w) => w.id !== s.id) });
                        } else {
                          props.onChange({ selectedWorkouts: [...filters.selectedWorkouts, { id: s.id, title: s.title }] });
                        }
                      }}
                      style={({ pressed }) => [styles.searchResultCard, isSelected && styles.searchResultCardSelected, pressed && styles.rowPressed]}
                    >
                      <View style={styles.searchResultIconBox}>
                        <DumbbellIcon size={18} color={rgba(colors.text, 0.7)} />
                      </View>
                      <View style={styles.searchResultContent}>
                        <Text style={styles.searchResultTitle} numberOfLines={1}>
                          {s.title}
                        </Text>
                        <Text style={styles.searchResultMeta}>
                          {formatSessionDate(s.started_at)} • {s.snapshot?.exercises?.length ?? 0} exercise
                          {(s.snapshot?.exercises?.length ?? 0) === 1 ? '' : 's'}
                        </Text>
                      </View>
                    </Pressable>
                  );
                })}
                {filteredWorkoutsByName.length > 50 && (
                  <Text style={styles.searchResultsMore}>+{filteredWorkoutsByName.length - 50} more results</Text>
                )}
              </View>
            ) : nameTerm.trim() ? (
              <Text style={styles.exEmpty}>No matching workouts found.</Text>
            ) : (
              <Text style={styles.exEmpty}>No workouts yet.</Text>
            )}
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* Notes Picker Modal */}
      <Modal visible={notesPickerOpen} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setNotesPickerOpen(false)}>
        <SafeAreaView style={styles.exSafe}>
          <View style={styles.exHeader}>
            <Text style={styles.exTitle}>Pick notes</Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Done picking notes"
              onPress={() => {
                setNotesPickerOpen(false);
                setNotesTerm('');
              }}
              style={styles.exDoneBtn}
            >
              <Text style={styles.exDoneText}>Done</Text>
            </Pressable>
          </View>

          <View style={styles.exSearchRow}>
            <TextInput
              placeholder="Search notes…"
              placeholderTextColor={rgba(colors.text, 0.5)}
              style={styles.exSearchInput}
              value={notesTerm}
              onChangeText={setNotesTerm}
              autoFocus
            />
          </View>

          <ScrollView
            style={styles.exList}
            contentContainerStyle={styles.exListContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {filteredByNotes.length > 0 ? (
              <View style={{ gap: 8 }}>
                <Text style={styles.exSectionHeader}>
                  {notesTerm.trim() ? `${filteredByNotes.length} result${filteredByNotes.length === 1 ? '' : 's'}` : 'All notes'}
                </Text>
                {filteredByNotes.slice(0, 50).map((result, idx) => {
                  const noteKey = `${result.sessionId}-${result.noteContext}-${result.noteContent.slice(0, 20)}`;
                  const isSelected = filters.selectedNotes.some(
                    (n) => n.sessionId === result.sessionId && n.noteContent === result.noteContent && n.noteContext === result.noteContext
                  );
                  return (
                    <Pressable
                      key={`${result.sessionId}-${idx}`}
                      accessibilityRole="button"
                      accessibilityLabel={`${isSelected ? 'Remove' : 'Add'} note`}
                      onPress={() => {
                        if (isSelected) {
                          props.onChange({
                            selectedNotes: filters.selectedNotes.filter(
                              (n) => !(n.sessionId === result.sessionId && n.noteContent === result.noteContent && n.noteContext === result.noteContext)
                            ),
                          });
                        } else {
                          props.onChange({
                            selectedNotes: [
                              ...filters.selectedNotes,
                              { sessionId: result.sessionId, noteContent: result.noteContent, noteContext: result.noteContext },
                            ],
                          });
                        }
                      }}
                      style={({ pressed }) => [styles.searchResultCard, isSelected && styles.searchResultCardSelected, pressed && styles.rowPressed]}
                    >
                      <View style={styles.searchResultIconBox}>
                        <StickyNoteIcon size={18} color={rgba(colors.text, 0.7)} />
                      </View>
                      <View style={styles.searchResultContent}>
                        <Text style={styles.searchResultNoteText} numberOfLines={2}>
                          {result.noteContent}
                        </Text>
                        <View style={styles.searchResultNoteContext}>
                          <Text style={styles.searchResultContextLabel}>{result.noteContext}</Text>
                          <Text style={styles.searchResultContextDot}>•</Text>
                          <Text style={styles.searchResultContextLabel}>{result.sessionTitle}</Text>
                        </View>
                        <Text style={styles.searchResultMeta}>
                          {result.sessionDate} • {result.exerciseCount} exercise
                          {result.exerciseCount === 1 ? '' : 's'}
                        </Text>
                      </View>
                    </Pressable>
                  );
                })}
                {filteredByNotes.length > 50 && (
                  <Text style={styles.searchResultsMore}>+{filteredByNotes.length - 50} more results</Text>
                )}
              </View>
            ) : notesTerm.trim() ? (
              <Text style={styles.exEmpty}>No matching notes found.</Text>
            ) : (
              <Text style={styles.exEmpty}>No notes yet.</Text>
            )}
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </>
  );
}

const createStyles = (colors: {
  background: string;
  surface: string;
  primary: string;
  text: string;
  accentRed: string;
  onPrimary: string;
}) =>
  StyleSheet.create({
    sheet: {
      paddingHorizontal: 16,
      paddingTop: 6,
      gap: 12,
      flex: 1,
    },
    sheetScroll: {
      flex: 1,
    },
    sheetScrollContent: {
      paddingBottom: 24,
      gap: 12,
    },
    headerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },
    headerActions: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },
    headerAction: {
      paddingHorizontal: 6,
      paddingVertical: 6,
      borderRadius: 10,
    },
    headerActionText: {
      fontFamily: Fonts.bold,
      fontSize: 14,
      color: rgba(colors.text, 0.8),
    },
    headerPrimaryAction: {
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 12,
      backgroundColor: colors.primary,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: 'rgba(0, 0, 0, 0.25)',
    },
    headerPrimaryActionText: {
      fontFamily: Fonts.extraBold,
      fontSize: 14,
      color: colors.onPrimary,
    },
    title: {
      fontFamily: Fonts.extraBold,
      fontSize: 18,
      color: colors.text,
    },
    subtitle: {
      fontFamily: Fonts.medium,
      fontSize: 13,
      color: rgba(colors.text, 0.65),
    },
    section: {
      gap: 8,
    },
    sectionTitle: {
      fontFamily: Fonts.bold,
      fontSize: 14,
      color: rgba(colors.text, 0.9),
    },
    input: {
      borderWidth: 1,
      borderColor: rgba(colors.text, 0.12),
      backgroundColor: rgba(colors.text, 0.04),
      borderRadius: 12,
      paddingHorizontal: 12,
      paddingVertical: 11,
      color: colors.text,
      fontFamily: Fonts.medium,
      fontSize: 14,
    },
    inputMultiline: {
      minHeight: 44,
    },
    inputLike: {
      borderWidth: 1,
      borderColor: rgba(colors.text, 0.12),
      backgroundColor: rgba(colors.text, 0.04),
      borderRadius: 12,
      paddingHorizontal: 12,
      paddingVertical: 11,
      minHeight: 46,
      justifyContent: 'center',
    },
    placeholderText: {
      fontFamily: Fonts.medium,
      fontSize: 14,
      color: rgba(colors.text, 0.45),
    },
    chipsRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
    },
    chip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      maxWidth: '100%',
      borderRadius: 999,
      paddingVertical: 6,
      paddingLeft: 10,
      paddingRight: 6,
      borderWidth: 1,
      borderColor: rgba(colors.text, 0.14),
      backgroundColor: rgba(colors.text, 0.06),
    },
    chipText: {
      fontFamily: Fonts.bold,
      fontSize: 12,
      color: rgba(colors.text, 0.9),
      maxWidth: 220,
    },
    chipX: {
      padding: 2,
    },
    presetRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
    },
    presetPill: {
      paddingHorizontal: 10,
      paddingVertical: 7,
      borderRadius: 999,
      borderWidth: 1,
    },
    presetPillSelected: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
    },
    presetPillUnselected: {
      backgroundColor: rgba(colors.text, 0.06),
      borderColor: rgba(colors.text, 0.12),
    },
    presetText: {
      fontFamily: Fonts.bold,
      fontSize: 12,
    },
    presetTextSelected: {
      color: colors.onPrimary,
    },
    presetTextUnselected: {
      color: rgba(colors.text, 0.85),
    },
    customDateWrap: {
      gap: 10,
      marginTop: 6,
    },
    customDateRow: {
      flexDirection: 'row',
      gap: 10,
      alignItems: 'center',
    },
    dateButton: {
      flex: 1,
      borderWidth: 1,
      borderColor: rgba(colors.text, 0.12),
      backgroundColor: rgba(colors.text, 0.04),
      borderRadius: 12,
      paddingHorizontal: 12,
      paddingVertical: 10,
      gap: 2,
    },
    dateButtonLabel: {
      fontFamily: Fonts.medium,
      fontSize: 12,
      color: rgba(colors.text, 0.65),
    },
    dateButtonValue: {
      fontFamily: Fonts.bold,
      fontSize: 13,
      color: colors.text,
    },
    miniButton: {
      paddingHorizontal: 10,
      paddingVertical: 10,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: rgba(colors.text, 0.12),
      backgroundColor: rgba(colors.text, 0.06),
    },
    miniButtonText: {
      fontFamily: Fonts.bold,
      fontSize: 12,
      color: rgba(colors.text, 0.85),
    },
    tagsGridContent: {
      paddingVertical: 4,
      gap: 10,
    },
    tagsGridRow: {
      justifyContent: 'space-between',
    },
    tagsGridCell: {
      width: '16.66%',
      alignItems: 'center',
    },
    tagButton: {
      width: 44,
      height: 44,
      borderRadius: 14,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
    },
    tagButtonSelected: {
      backgroundColor: colors.primary,
      borderColor: 'rgba(0, 0, 0, 0.25)',
    },
    tagButtonUnselected: {
      backgroundColor: rgba(colors.text, 0.04),
      borderColor: rgba(colors.text, 0.12),
    },
    primaryButton: {
      borderRadius: 14,
      paddingVertical: 14,
      paddingHorizontal: 14,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.primary,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: 'rgba(0, 0, 0, 0.25)',
    },
    primaryButtonText: {
      color: colors.onPrimary,
      fontSize: 15,
      fontFamily: Fonts.extraBold,
    },
    secondaryButton: {
      borderRadius: 14,
      paddingVertical: 14,
      paddingHorizontal: 14,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: rgba(colors.text, 0.08),
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: rgba(colors.text, 0.12),
    },
    secondaryButtonText: {
      color: colors.text,
      fontSize: 15,
      fontFamily: Fonts.bold,
    },
    pressed: {
      transform: [{ scale: 0.99 }],
      opacity: 0.95,
    },

    iosPickerBackdrop: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.6)',
      justifyContent: 'center',
      alignItems: 'center',
      padding: 20,
    },
    iosPickerCard: {
      width: '100%',
      maxWidth: 380,
      backgroundColor: colors.surface,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: rgba(colors.text, 0.12),
      padding: 16,
      gap: 12,
    },
    iosPickerTitle: {
      fontFamily: Fonts.extraBold,
      fontSize: 16,
      color: colors.text,
      textAlign: 'center',
    },
    iosPickerActions: {
      flexDirection: 'row',
      gap: 12,
    },

    exSafe: {
      flex: 1,
      backgroundColor: colors.background,
    },
    exHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingVertical: 14,
      borderBottomWidth: 1,
      borderBottomColor: rgba(colors.text, 0.1),
    },
    exTitle: {
      fontFamily: Fonts.bold,
      fontSize: 18,
      color: colors.text,
    },
    exDoneBtn: {
      paddingHorizontal: 10,
      paddingVertical: 8,
      borderRadius: 10,
      backgroundColor: rgba(colors.text, 0.06),
      borderWidth: 1,
      borderColor: rgba(colors.text, 0.12),
    },
    exDoneText: {
      fontFamily: Fonts.bold,
      fontSize: 14,
      color: colors.text,
    },
    exSearchRow: {
      paddingHorizontal: 16,
      paddingTop: 12,
      paddingBottom: 10,
    },
    exSearchInput: {
      borderWidth: 1,
      borderColor: rgba(colors.text, 0.12),
      backgroundColor: rgba(colors.text, 0.04),
      borderRadius: 12,
      paddingHorizontal: 12,
      paddingVertical: 12,
      color: colors.text,
      fontFamily: Fonts.medium,
      fontSize: 14,
    },
    exList: {
      flex: 1,
      paddingHorizontal: 16,
      paddingTop: 6,
    },
    exListContent: {
      gap: 12,
      paddingBottom: 16,
    },
    exSectionHeader: {
      fontFamily: Fonts.bold,
      fontSize: 13,
      color: rgba(colors.text, 0.7),
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    exRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      paddingVertical: 12,
      paddingHorizontal: 10,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: rgba(colors.text, 0.1),
      backgroundColor: rgba(colors.text, 0.04),
    },
    exRowSelected: {
      borderColor: rgba(colors.primary, 0.55),
      backgroundColor: rgba(colors.primary, 0.14),
    },
    rowPressed: {
      opacity: 0.85,
      transform: [{ scale: 0.99 }],
    },
    exIconBox: {
      width: 36,
      height: 36,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: rgba(colors.text, 0.08),
    },
    exIconText: {
      fontFamily: Fonts.black,
      fontSize: 14,
      color: rgba(colors.text, 0.85),
    },
    exRowTitle: {
      fontFamily: Fonts.bold,
      fontSize: 14,
      color: colors.text,
      flexShrink: 1,
    },
    exRowMeta: {
      fontFamily: Fonts.medium,
      fontSize: 12,
      color: rgba(colors.text, 0.65),
      marginTop: 2,
    },
    exEmpty: {
      fontFamily: Fonts.medium,
      fontSize: 13,
      color: rgba(colors.text, 0.6),
      paddingVertical: 10,
      textAlign: 'center',
    },

    tagsSafe: {
      flex: 1,
      backgroundColor: colors.background,
    },
    tagsHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingVertical: 14,
      borderBottomWidth: 1,
      borderBottomColor: rgba(colors.text, 0.1),
    },
    tagsTitle: {
      fontFamily: Fonts.bold,
      fontSize: 18,
      color: colors.text,
    },
    tagsDoneBtn: {
      paddingHorizontal: 10,
      paddingVertical: 8,
      borderRadius: 10,
      backgroundColor: rgba(colors.text, 0.06),
      borderWidth: 1,
      borderColor: rgba(colors.text, 0.12),
    },
    tagsDoneText: {
      fontFamily: Fonts.bold,
      fontSize: 14,
      color: colors.text,
    },
    tagsBody: {
      paddingHorizontal: 16,
      paddingVertical: 16,
    },

    // Search results styles
    searchResultsList: {
      gap: 8,
      marginTop: 4,
    },
    searchResultCard: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 10,
      paddingVertical: 10,
      paddingHorizontal: 10,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: rgba(colors.text, 0.08),
      backgroundColor: rgba(colors.text, 0.02),
    },
    searchResultCardSelected: {
      borderColor: rgba(colors.primary, 0.55),
      backgroundColor: rgba(colors.primary, 0.14),
    },
    searchResultIconBox: {
      width: 32,
      height: 32,
      borderRadius: 10,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: rgba(colors.text, 0.06),
      marginTop: 2,
    },
    searchResultContent: {
      flex: 1,
      gap: 3,
    },
    searchResultTitle: {
      fontFamily: Fonts.bold,
      fontSize: 14,
      color: colors.text,
    },
    searchResultMeta: {
      fontFamily: Fonts.medium,
      fontSize: 12,
      color: rgba(colors.text, 0.6),
    },
    searchResultNoteText: {
      fontFamily: Fonts.medium,
      fontSize: 13,
      color: colors.text,
      lineHeight: 18,
    },
    searchResultNoteContext: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      flexWrap: 'wrap',
    },
    searchResultContextLabel: {
      fontFamily: Fonts.semiBold,
      fontSize: 11,
      color: rgba(colors.primary, 0.9),
    },
    searchResultContextDot: {
      fontFamily: Fonts.medium,
      fontSize: 11,
      color: rgba(colors.text, 0.4),
    },
    searchResultsMore: {
      fontFamily: Fonts.medium,
      fontSize: 12,
      color: rgba(colors.text, 0.5),
      textAlign: 'center',
      paddingTop: 4,
    },
  });

