import { Fonts, TrenaColors } from '@/constants/theme';
import { learnData } from '@/data/learn';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import React from 'react';
import { Alert, FlatList, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Gesture, GestureDetector, GestureType } from 'react-native-gesture-handler';
import Animated, { runOnJS, useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AddExerciseModal, type AddExerciseSelection } from '@/components/AddExerciseModal';
import { DurationWheelModal } from '@/components/DurationWheelModal';
import { ExercisePicker } from '@/components/ExercisePicker';
import {
  AppleIcon,
  BackpackIcon,
  BallIcon,
  BatteryIcon,
  BicycleIcon,
  BrainIcon,
  BugIcon,
  CalendarIcon,
  CarIcon,
  CheckIcon,
  ChessIcon,
  DragHandleIcon,
  DropIcon,
  DumbbellIcon,
  DuplicateIcon,
  EditIcon,
  FireIcon,
  FloppyIcon,
  HappyIcon,
  HourglassIcon,
  LeafIcon,
  LegIcon,
  MoreHorizIcon,
  MountainIcon,
  MuscleIcon,
  NeutralIcon,
  NotebookIcon,
  PinIcon,
  PizzaIcon,
  RainIcon,
  RollerskateIcon,
  SadIcon,
  ShoeIcon,
  SkippingRopeIcon,
  SkipStatusIcon,
  SnowIcon,
  StarIcon,
  StickyNoteIcon,
  TagIcon,
  TrashIcon,
  VideoIcon,
  XIcon,
  YogaIcon,
} from '@/components/icons';
import { defaultTrackingForExerciseRef } from '@/lib/workouts/exercise-tracking';
import { getAddExerciseDraft } from '@/lib/workouts/methods/ui-draft';
import {
  buildSessionExerciseFromMethodSelection,
  deleteSession,
  finishSessionAndAdvanceMethods,
  getSession,
  updateSessionSnapshot,
  updateSessionTags,
  updateSessionTimes,
  updateSessionTitle,
} from '@/lib/workouts/repo';
import { MAX_WORKOUT_TAGS, sortWorkoutTags, WORKOUT_TAGS, type WorkoutTag } from '@/lib/workouts/tags';
import type {
  ExerciseRef,
  PerformedSet,
  PlannedSet,
  SessionExercise,
  WorkoutSessionRow,
  WorkoutSessionSnapshotV1,
} from '@/lib/workouts/types';
import DateTimePicker from '@react-native-community/datetimepicker';

const learnExercises = learnData.filter((x) => x.type === 'exercise');
const learnExerciseNameById = new Map(learnExercises.map((x) => [x.id, x.name]));

function WorkoutTagIcon({ tag, size = 18, color = '#141B34' }: { tag: WorkoutTag; size?: number; color?: string }) {
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

function makeLocalId(prefix: string) {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

function formatExerciseName(ref: ExerciseRef) {
  if (ref.kind === 'learn') return learnExerciseNameById.get(ref.learnExerciseId) ?? 'Unknown exercise';
  return ref.name;
}

function isBilboExercise(ex: SessionExercise) {
  return ex.source.type === 'method' && ex.source.methodKey === 'bilbo';
}

function removeSetByIndex(performed: PerformedSet[], index: number) {
  const next = [...performed];
  next.splice(index, 1);
  return next;
}

function getRirText(x: PerformedSet | undefined) {
  return x && typeof x.rir === 'number' ? String(x.rir) : '';
}

function getDone(x: PerformedSet | undefined) {
  return x?.done ?? false;
}

/**
 * Returns true if the set should be auto-completed based on the transition.
 * "One time" means we only trigger it if the set was previously incomplete
 * and the user just provided a value that makes it complete.
 */
function shouldAutoComplete(
  oldSet: PerformedSet | undefined,
  newSet: PerformedSet,
  trackingType: string,
  isBilbo: boolean
): boolean {
  if (newSet.done) return false;

  const oldReps = oldSet?.reps ?? 0;
  const newReps = newSet.reps ?? 0;
  const oldWeight = oldSet?.weightKg ?? 0;
  const newWeight = newSet.weightKg ?? 0;
  const oldDur = oldSet?.durationSec ?? 0;
  const newDur = newSet.durationSec ?? 0;
  const oldDist = oldSet?.distanceKm ?? 0;
  const newDist = newSet.distanceKm ?? 0;
  const oldRir = oldSet?.rir;
  const newRir = newSet.rir;

  const rirJustFilled = newRir !== undefined && oldRir === undefined;

  if (isBilbo) {
    // Bilbo: weight is session-fixed, only reps matter.
    return (newReps > 0 && oldReps === 0) || rirJustFilled;
  }

  if (trackingType === 'strength') {
    // Strength: both reps and weight must be > 0.
    // Trigger if both are now > 0 and at least one just changed from 0 or RIR was just added.
    const isComplete = newReps > 0 && newWeight > 0;
    const justFilled = (newReps > 0 && oldReps === 0) || (newWeight > 0 && oldWeight === 0) || rirJustFilled;
    return isComplete && justFilled;
  }

  if (trackingType === 'interval_time') {
    // Interval: only duration matters.
    return (newDur > 0 && oldDur === 0) || rirJustFilled;
  }

  if (trackingType === 'distance_time') {
    // Distance: both distance and duration must be > 0.
    const isComplete = newDist > 0 && newDur > 0;
    const justFilled = (newDist > 0 && oldDist === 0) || (newDur > 0 && oldDur === 0) || rirJustFilled;
    return isComplete && justFilled;
  }

  return false;
}

function ensureSnapshot(x: any): WorkoutSessionSnapshotV1 {
  if (!x || typeof x !== 'object') return { version: 1, exercises: [] };
  if (!Array.isArray(x.exercises)) return { ...x, exercises: [] };
  return x as WorkoutSessionSnapshotV1;
}

function numOrEmpty(x: string) {
  // Allow decimals and tolerate comma as decimal separator.
  const normalized = x.trim().replace(',', '.');
  let cleaned = normalized.replace(/[^0-9.]/g, '');
  // Keep only the first dot if user typed multiple.
  const firstDot = cleaned.indexOf('.');
  if (firstDot !== -1) {
    cleaned = cleaned.slice(0, firstDot + 1) + cleaned.slice(firstDot + 1).replace(/\./g, '');
  }
  if (!cleaned) return undefined;
  const n = parseFloat(cleaned);
  return Number.isNaN(n) ? undefined : n;
}

function parsePositiveNumberDraft(raw: string) {
  const t = raw.trim();
  if (!t) return undefined;
  // Allow comma decimals while typing.
  let normalized = t.replace(',', '.');
  // Allow starting with "." by treating it as "0."
  if (normalized.startsWith('.')) normalized = `0${normalized}`;
  const n = numOrEmpty(normalized);
  if (n === undefined) return undefined;
  return n > 0 ? n : undefined;
}

function durationToText(sec: number | undefined) {
  if (!sec || !Number.isFinite(sec) || sec <= 0) return '';
  const total = Math.round(sec);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  if (h > 0) return `${h}:${pad2(m)}:${pad2(s)}`;
  return `${m}:${pad2(s)}`;
}

function parseDurationToSec(raw: string) {
  const t = raw.trim();
  if (!t) return undefined;
  // Accept hh:mm:ss, mm:ss, or ss
  if (t.includes(':')) {
    const parts = t.split(':').map((x) => x.trim());
    if (parts.length === 2) {
      const [mm, ss] = parts;
      const m = numOrEmpty(mm ?? '');
      const s = numOrEmpty(ss ?? '');
      if (m === undefined || s === undefined) return undefined;
      return Math.max(0, Math.round(m * 60 + s));
    }
    if (parts.length === 3) {
      const [hh, mm, ss] = parts;
      const h = numOrEmpty(hh ?? '');
      const m = numOrEmpty(mm ?? '');
      const s = numOrEmpty(ss ?? '');
      if (h === undefined || m === undefined || s === undefined) return undefined;
      return Math.max(0, Math.round(h * 3600 + m * 60 + s));
    }
    return undefined;
  }
  const s = numOrEmpty(t);
  if (s === undefined) return undefined;
  return Math.max(0, Math.round(s));
}

function paceText(durationSec: number | undefined, distanceKm: number | undefined) {
  if (!durationSec || !distanceKm || distanceKm <= 0) return '';
  const pace = durationSec / distanceKm; // sec/km
  const m = Math.floor(pace / 60);
  const s = Math.round(pace % 60);
  return `${m}:${pad2(s)}/km`;
}

const PROGRAM_THRESHOLD_MS = 15 * 60 * 1000; // treat as "scheduled" if > now + 15m

function pad2(n: number) {
  return n.toString().padStart(2, '0');
}

// toDateParts removed

export default function SessionScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const sessionId = typeof id === 'string' ? id : undefined;

  const [row, setRow] = React.useState<WorkoutSessionRow | null>(null);
  const [snapshot, setSnapshot] = React.useState<WorkoutSessionSnapshotV1>({ version: 1, exercises: [] });
  const [tags, setTags] = React.useState<WorkoutTag[]>([]);
  const [isSavingTags, setIsSavingTags] = React.useState(false);
  const [isTagsOpen, setIsTagsOpen] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isAutoSaving, setIsAutoSaving] = React.useState(false);
  const [isFinishing, setIsFinishing] = React.useState(false);
  const [toast, setToast] = React.useState<string | null>(null);
  const [isEditingTitle, setIsEditingTitle] = React.useState(false);
  const [titleDraft, setTitleDraft] = React.useState('');
  const [isSavingTitle, setIsSavingTitle] = React.useState(false);
  const [distanceDraftBySetId, setDistanceDraftBySetId] = React.useState<Record<string, string>>({});
  const [durationPicker, setDurationPicker] = React.useState<null | { exerciseId: string; setIdx: number; seconds: number }>(null);
  // Removed explicit reorderMode state
  const heightsRef = React.useRef<Record<string, number>>({});
  const positionsRef = React.useRef<string[]>([]);

  // Update positions ref whenever snapshot changes to ensure we have valid indices
  React.useEffect(() => {
    positionsRef.current = snapshot.exercises.map((e) => e.id);
  }, [snapshot.exercises]);

  const avgHeight = React.useMemo(() => {
    const vals = Object.values(heightsRef.current);
    if (!vals.length) return 140;
    return Math.max(80, vals.reduce((a, b) => a + b, 0) / vals.length);
  }, [snapshot.exercises.length]);

  // const [editingDate, setEditingDate] = React.useState(false); // Removed, using pickers directly
  const [showIosPicker, setShowIosPicker] = React.useState(false);
  const [tempDate, setTempDate] = React.useState<Date>(new Date());
  const [showPicker, setShowPicker] = React.useState(false);
  const [pickerMode, setPickerMode] = React.useState<'date' | 'time'>('date');
  const [isUpdatingTime, setIsUpdatingTime] = React.useState(false);


  // Add exercise
  const [addOpen, setAddOpen] = React.useState(false);
  const [editingExerciseId, setEditingExerciseId] = React.useState<string | null>(null);

  // Exercise options menu state
  const [menuExerciseId, setMenuExerciseId] = React.useState<string | null>(null);
  const menuExercise = snapshot.exercises.find((e) => e.id === menuExerciseId);

  const didHydrateRef = React.useRef(false);
  const lastSavedJsonRef = React.useRef<string>('');
  const lastSavedTagsJsonRef = React.useRef<string>('');
  const savingRef = React.useRef(false);
  const pendingRef = React.useRef<WorkoutSessionSnapshotV1 | null>(null);
  const timerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const tagsTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const didFinishRef = React.useRef(false); // Track if workout was properly finished
  const snapshotRef = React.useRef<WorkoutSessionSnapshotV1>(snapshot); // For cleanup access
  const isProgrammedRef = React.useRef(false);

  const showToast = React.useCallback((message: string) => {
    setToast(message);
    setTimeout(() => setToast(null), 2200);
  }, []);

  const isProgrammed = React.useMemo(() => {
    const iso = row?.started_at;
    if (!iso) return false;
    const t = new Date(iso).getTime();
    if (Number.isNaN(t)) return false;
    return t > Date.now() + PROGRAM_THRESHOLD_MS;
  }, [row?.started_at]);

  React.useEffect(() => {
    isProgrammedRef.current = isProgrammed;
  }, [isProgrammed]);

  const flushAutosave = React.useCallback(async () => {
    if (!sessionId) return;
    if (savingRef.current) return;
    const pending = pendingRef.current;
    if (!pending) return;

    const json = JSON.stringify(pending);
    if (json === lastSavedJsonRef.current) {
      pendingRef.current = null;
      setIsAutoSaving(false);
      return;
    }

    savingRef.current = true;
    setIsAutoSaving(true);
    try {
      const updated = await updateSessionSnapshot({ id: sessionId, snapshot: pending });
      setRow(updated);
      lastSavedJsonRef.current = json;
      pendingRef.current = null;
    } catch (e: any) {
      showToast(e?.message ?? 'Auto-save failed');
    } finally {
      savingRef.current = false;
      setIsAutoSaving(false);
      // If more changes arrived mid-save, run again quickly.
      if (pendingRef.current && JSON.stringify(pendingRef.current) !== lastSavedJsonRef.current) {
        flushAutosave();
      }
    }
  }, [sessionId, showToast]);

  const scheduleAutosave = React.useCallback(
    (next: WorkoutSessionSnapshotV1) => {
      if (!sessionId) return;
      if (!didHydrateRef.current) return;
      if (isFinishing) return;

      pendingRef.current = next;
      setIsAutoSaving(true);
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        flushAutosave();
      }, 650);
    },
    [flushAutosave, isFinishing, sessionId],
  );

  const load = React.useCallback(async () => {
    if (!sessionId) return;
    setIsLoading(true);
    try {
      const s = await getSession(sessionId);
      setRow(s);
      setTitleDraft(s.title ?? '');
      const hydratedTags = (s.tags ?? []) as WorkoutTag[];
      setTags(sortWorkoutTags(hydratedTags));
      lastSavedTagsJsonRef.current = JSON.stringify(hydratedTags);
      const hydrated = ensureSnapshot(s.snapshot);
      setSnapshot(hydrated);
      didHydrateRef.current = true;
      lastSavedJsonRef.current = JSON.stringify(hydrated);
      lastSavedJsonRef.current = JSON.stringify(hydrated);
      if (s.started_at) {
        setTempDate(new Date(s.started_at));
      }
    } catch (e: any) {
      Alert.alert('Could not load workout', e?.message ?? 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  }, [sessionId]);

  const cancelTitleEdit = () => {
    setIsEditingTitle(false);
    setTitleDraft(row?.title ?? '');
    setIsSavingTitle(false);
  };

  const saveTitle = async () => {
    if (!sessionId) return;
    const nextTitle = titleDraft.trim();
    if (!nextTitle) {
      showToast('Workout name cannot be empty');
      return;
    }
    if (row?.title === nextTitle) {
      setIsEditingTitle(false);
      return;
    }
    try {
      setIsSavingTitle(true);
      const updated = await updateSessionTitle({ id: sessionId, title: nextTitle });
      setRow(updated);
      setIsEditingTitle(false);
      showToast('Workout renamed');
    } catch (e: any) {
      showToast(e?.message ?? 'Rename failed');
    } finally {
      setIsSavingTitle(false);
    }
  };

  React.useEffect(() => {
    load();
  }, [load]);

  React.useEffect(() => {
    scheduleAutosave(snapshot);
  }, [scheduleAutosave, snapshot]);

  React.useEffect(() => {
    if (!sessionId) return;
    if (!didHydrateRef.current) return;
    const json = JSON.stringify(tags);
    if (json === lastSavedTagsJsonRef.current) return;

    if (tagsTimerRef.current) clearTimeout(tagsTimerRef.current);
    setIsSavingTags(true);
    tagsTimerRef.current = setTimeout(async () => {
      try {
        const updated = await updateSessionTags({ id: sessionId, tags });
        setRow(updated);
        lastSavedTagsJsonRef.current = JSON.stringify(updated.tags ?? []);
      } catch (e: any) {
        showToast(e?.message ?? 'Saving tags failed');
      } finally {
        setIsSavingTags(false);
      }
    }, 450);

    return () => {
      if (tagsTimerRef.current) clearTimeout(tagsTimerRef.current);
    };
  }, [sessionId, showToast, tags]);

  const toggleTag = React.useCallback(
    (tag: WorkoutTag) => {
      setTags((cur) => {
        if (cur.includes(tag)) return sortWorkoutTags(cur.filter((t) => t !== tag));
        if (cur.length >= MAX_WORKOUT_TAGS) {
          showToast(`You can select up to ${MAX_WORKOUT_TAGS} tags`);
          return cur;
        }
        return sortWorkoutTags([...cur, tag]);
      });
    },
    [showToast],
  );

  // Keep snapshotRef in sync for cleanup access
  React.useEffect(() => {
    snapshotRef.current = snapshot;
  }, [snapshot]);

  // Cleanup: delete empty sessions when user navigates away without finishing
  React.useEffect(() => {
    return () => {
      // Only cleanup if user didn't finish properly
      if (didFinishRef.current) return;
      if (!sessionId) return;
      // If it's a scheduled/programmed workout, don't auto-delete empties.
      if (isProgrammedRef.current) return;

      const currentSnapshot = snapshotRef.current;
      const hasExercises = currentSnapshot.exercises && currentSnapshot.exercises.length > 0;
      const hasNotes = currentSnapshot.notes && currentSnapshot.notes.trim().length > 0;
      const isEmpty = !hasExercises && !hasNotes;

      if (isEmpty) {
        // Fire and forget - delete the empty session
        deleteSession(sessionId).catch(() => {
          // Silently ignore errors during cleanup
        });
      }
    };
  }, [sessionId]);

  const updateWorkoutNotes = (text: string) => {
    setSnapshot((cur) => ({ ...cur, notes: text }));
  };

  const reorderExercisesByIds = React.useCallback((orderedIds: string[]) => {
    setSnapshot((cur) => {
      const map = new Map(cur.exercises.map((x) => [x.id, x]));
      const next = orderedIds.map((id) => map.get(id)).filter(Boolean) as SessionExercise[];
      // Keep any exercises not present in the ordered list (shouldn't happen).
      const remaining = cur.exercises.filter((x) => !orderedIds.includes(x.id));
      return { ...cur, exercises: [...next, ...remaining] };
    });
  }, []);

  const updateExercise = (exerciseId: string, updater: (x: SessionExercise) => SessionExercise) => {
    setSnapshot((cur) => {
      const exists = cur.exercises.find((x) => x.id === exerciseId);
      if (!exists) return cur;
      return {
        ...cur,
        exercises: cur.exercises.map((ex) => (ex.id === exerciseId ? updater(ex) : ex)),
      };
    });
  };

  const removeExercise = (exerciseId: string) => {
    setMenuExerciseId(null);
    Alert.alert('Delete exercise?', 'This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          setSnapshot((cur) => ({
            ...cur,
            exercises: cur.exercises.filter((x) => x.id !== exerciseId),
          }));
        },
      },
    ]);
  };

  const duplicateExercise = (exerciseId: string) => {
    setMenuExerciseId(null);
    setSnapshot((cur) => {
      const original = cur.exercises.find((x) => x.id === exerciseId);
      if (!original) return cur;
      const idx = cur.exercises.findIndex((x) => x.id === exerciseId);
      const copy: SessionExercise = {
        ...original,
        id: makeLocalId('sx'),
        performedSets: (original.performedSets ?? []).map((s) => ({ ...s, id: makeLocalId('set'), done: false })),
      };
      const next = [...cur.exercises];
      next.splice(idx + 1, 0, copy);
      return { ...cur, exercises: next };
    });
    showToast('Exercise duplicated');
  };

  const startEditingExercise = (exerciseId: string) => {
    setMenuExerciseId(null);
    setEditingExerciseId(exerciseId);
  };

  const handleEditExerciseSelect = (ref: ExerciseRef) => {
    if (!editingExerciseId) return;
    updateExercise(editingExerciseId, (ex) => ({
      ...ex,
      exercise: ref,
      tracking: ex.plannedSets?.length ? ex.tracking : defaultTrackingForExerciseRef(ref),
    }));
    setEditingExerciseId(null);
    showToast('Exercise updated');
  };

  const handleEditExerciseClose = () => {
    setEditingExerciseId(null);
  };

  const setPlannedReps = (exerciseId: string, plannedSet: PlannedSet, text: string) => {
    const reps = numOrEmpty(text);
    if (reps === undefined && text.trim() === '') {
      if (isProgrammedRef.current) {
        // For programmed workouts, allow blank values without removing the set.
        updateExercise(exerciseId, (ex) => ({
          ...ex,
          performedSets: (ex.performedSets ?? []).filter((s) => s.id !== plannedSet.id),
        }));
        return;
      }
      // remove set?
      Alert.alert('Remove set?', 'This cannot be undone.', [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => {
            updateExercise(exerciseId, (ex) => ({
              ...ex,
              plannedSets: ex.plannedSets.filter((ps) => ps.id !== plannedSet.id),
              performedSets: (ex.performedSets ?? []).filter((s) => s.id !== plannedSet.id),
            }));
          },
        },
      ]);
      return;
    }
    const safeReps = reps ?? 0;
    updateExercise(exerciseId, (ex) => {
      const existing = (ex.performedSets ?? []).find((s) => s.id === plannedSet.id);
      const tracking = ex.tracking ?? defaultTrackingForExerciseRef(ex.exercise);
      const isBilbo = isBilboExercise(ex);

      if (existing) {
        const nextSet = { ...existing, reps: safeReps };
        if (shouldAutoComplete(existing, nextSet, tracking.type, isBilbo)) {
          nextSet.done = true;
        }
        return {
          ...ex,
          performedSets: (ex.performedSets ?? []).map((s) => (s.id === plannedSet.id ? nextSet : s)),
        };
      }

      const nextSet: PerformedSet = { id: plannedSet.id, reps: safeReps, weightKg: plannedSet.weightKg, done: false };
      if (shouldAutoComplete(undefined, nextSet, tracking.type, isBilbo)) {
        nextSet.done = true;
      }

      return {
        ...ex,
        performedSets: [...(ex.performedSets ?? []), nextSet],
      };
    });
  };

  const setPlannedMeta = (
    exerciseId: string,
    plannedSet: PlannedSet,
    patch: Partial<Pick<PerformedSet, 'rir' | 'done'>>
  ) => {
    updateExercise(exerciseId, (ex) => {
      const existing = (ex.performedSets ?? []).find((s) => s.id === plannedSet.id);
      const tracking = ex.tracking ?? defaultTrackingForExerciseRef(ex.exercise);
      const isBilbo = isBilboExercise(ex);

      if (existing) {
        const nextSet = { ...existing, ...patch };
        if (!('done' in patch) && shouldAutoComplete(existing, nextSet, tracking.type, isBilbo)) {
          nextSet.done = true;
        }
        return {
          ...ex,
          performedSets: (ex.performedSets ?? []).map((s) => (s.id === plannedSet.id ? nextSet : s)),
        };
      }

      const nextSet: PerformedSet = {
        id: plannedSet.id,
        reps: 0,
        weightKg: plannedSet.weightKg,
        done: false,
        ...patch,
      };
      if (!('done' in patch) && shouldAutoComplete(undefined, nextSet, tracking.type, isBilbo)) {
        nextSet.done = true;
      }

      return {
        ...ex,
        performedSets: [...(ex.performedSets ?? []), nextSet],
      };
    });
  };

  const setFreeSetValue = (exerciseId: string, setIndex: number, patch: Partial<PerformedSet>) => {
    updateExercise(exerciseId, (ex) => {
      const sets = [...(ex.performedSets ?? [])];
      if (setIndex < 0 || setIndex >= sets.length) return ex;

      const oldSet = sets[setIndex];
      const nextSet = { ...oldSet, ...patch };

      // Auto-complete if not a manual 'done' toggle
      if (!('done' in patch)) {
        const tracking = ex.tracking ?? defaultTrackingForExerciseRef(ex.exercise);
        const isBilbo = isBilboExercise(ex);
        if (shouldAutoComplete(oldSet, nextSet, tracking.type, isBilbo)) {
          nextSet.done = true;
        }
      }

      sets[setIndex] = nextSet;
      return { ...ex, performedSets: sets };
    });
  };

  const removeFreeSet = (exerciseId: string, setIndex: number) => {
    updateExercise(exerciseId, (ex) => ({
      ...ex,
      performedSets: removeSetByIndex(ex.performedSets ?? [], setIndex),
    }));
  };

  const addFreeSet = (exerciseId: string) => {
    updateExercise(exerciseId, (ex) => {
      const tracking = ex.tracking ?? defaultTrackingForExerciseRef(ex.exercise);
      const prev = ex.performedSets?.[ex.performedSets.length - 1];
      let nextSet: PerformedSet;
      if (tracking.type === 'interval_time') {
        const prevDur = prev?.durationSec;
        nextSet = {
          id: makeLocalId('set'),
          // Don't auto-fill defaults; leave blank unless copying previous.
          durationSec: typeof prevDur === 'number' ? prevDur : 0,
          done: false,
        };
      } else if (tracking.type === 'distance_time') {
        const prevDist = prev?.distanceKm;
        const prevDur = prev?.durationSec;
        nextSet = {
          id: makeLocalId('set'),
          // Don't auto-fill defaults; leave blank unless copying previous.
          distanceKm: typeof prevDist === 'number' ? prevDist : 0,
          durationSec: typeof prevDur === 'number' ? prevDur : 0,
          done: false,
        };
      } else {
        nextSet = prev
          ? { id: makeLocalId('set'), weightKg: prev.weightKg ?? 0, reps: prev.reps ?? 0, rir: prev.rir, done: false }
          : { id: makeLocalId('set'), weightKg: 0, reps: 0 };
      }
      return {
        ...ex,
        tracking,
        performedSets: [...(ex.performedSets ?? []), nextSet],
      };
    });
  };

  const onConfirmAdd = async (selection: AddExerciseSelection) => {
    const exercise = selection.exercise;

    let sx: SessionExercise;
    if (!selection.method) {
      sx = {
        id: makeLocalId('sx'),
        exercise,
        source: { type: 'free' },
        tracking: defaultTrackingForExerciseRef(exercise),
        plannedSets: [],
        performedSets: [],
      };
    } else {
      sx = await buildSessionExerciseFromMethodSelection({
        exercise,
        methodInstanceId: selection.method.methodInstanceId,
        methodInstance: selection.method.methodInstance,
        binding: selection.method.binding,
      });
    }

    setSnapshot((cur) => ({ ...cur, exercises: [...cur.exercises, sx] }));
    setAddOpen(false);
  };

  const onRequestCreateMethod = (key: 'bilbo' | 'wendler_531') => {
    if (key === 'bilbo') router.push('/activities/methods/bilbo/create' as any);
    else router.push('/activities/methods/wendler_531/create' as any);
  };

  useFocusEffect(
    React.useCallback(() => {
      const d = getAddExerciseDraft();
      if (d?.shouldReopen) setAddOpen(true);
    }, [])
  );

  const onFinish = async () => {
    if (!sessionId) return;
    if (isFinishing) return;
    didFinishRef.current = true; // Mark as properly finished - skip cleanup on unmount
    setIsFinishing(true);
    try {
      const finished = await finishSessionAndAdvanceMethods({ id: sessionId, snapshot });
      if (finished === null) {
        // Empty workout was discarded
        Alert.alert('Workout discarded', 'Empty workouts are not saved.');
        router.replace('/activities' as any);
        return;
      }
      setRow(finished);
      Alert.alert('Workout saved', 'Nice work.');
      router.replace('/activities' as any);
    } catch (e: any) {
      didFinishRef.current = false; // Reset if finish failed
      Alert.alert('Finish failed', e?.message ?? 'Unknown error');
    } finally {
      setIsFinishing(false);
    }
  };

  const onProgram = async () => {
    if (!sessionId) return;
    if (isFinishing) return;
    didFinishRef.current = true; // Mark as intentionally saved - skip cleanup on unmount
    setIsFinishing(true);
    try {
      // Ensure latest edits are persisted before leaving.
      await flushAutosave();
      const updated = await updateSessionSnapshot({ id: sessionId, snapshot });
      setRow(updated);
      Alert.alert('Workout programmed', 'Saved for later.');
      router.replace('/activities' as any);
    } catch (e: any) {
      didFinishRef.current = false;
      Alert.alert('Program failed', e?.message ?? 'Unknown error');
    } finally {
      setIsFinishing(false);
    }
  };



  const onUpdateDateTime = async (candidate: Date) => {
    if (!sessionId) return;
    if (isUpdatingTime) return;

    if (Number.isNaN(candidate.getTime())) {
      Alert.alert('Invalid date/time', 'Please check the values.');
      return;
    }

    // Zero out seconds/milliseconds
    candidate.setSeconds(0);
    candidate.setMilliseconds(0);

    const nextStarted = candidate.toISOString();
    const endedAt = row?.ended_at ? new Date(row.ended_at) : null;
    const nextEnded = endedAt && endedAt.getTime() < candidate.getTime() ? candidate.toISOString() : undefined;

    setIsUpdatingTime(true);
    try {
      const updated = await updateSessionTimes({ id: sessionId, started_at: nextStarted, ended_at: nextEnded });
      setRow(updated);
      setShowIosPicker(false);
    } catch (e: any) {
      Alert.alert('Update failed', e?.message ?? 'Unknown error');
    } finally {
      setIsUpdatingTime(false);
    }
  };

  const onCalendarPress = () => {
    if (Platform.OS === 'android') {
      setPickerMode('date');
      setShowPicker(true);
    } else {
      setShowIosPicker(true);
      if (row?.started_at) {
        setTempDate(new Date(row.started_at));
      } else {
        setTempDate(new Date());
      }
    }
  };

  const handleAndroidChange = (event: any, selectedDate?: Date) => {
    // Dismiss picker first (required for Android to allow next one or close)
    setShowPicker(false);

    if (event.type === 'set' && selectedDate) {
      if (pickerMode === 'date') {
        // Date picked, now pick time
        // We must use the selected date's YMD but keep current time? 
        // Actually the selectedDate has the time reset or current? 
        // DateTimePicker mode='date' returns a date with some time.
        // Let's merge properly.
        setTempDate((prev) => {
          const next = new Date(prev);
          next.setFullYear(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate());
          // Launch time picker after valid update
          // We need to wait a tick for the first picker to fully dismiss
          setTimeout(() => {
            setPickerMode('time');
            setShowPicker(true);
          }, 50);
          return next;
        });
      } else {
        // Time picked, now save
        setTempDate((prev) => {
          const next = new Date(prev);
          next.setHours(selectedDate.getHours(), selectedDate.getMinutes());
          // Auto save
          onUpdateDateTime(next);
          return next;
        });
      }
    }
  };

  if (!sessionId) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.container}>
          <Text style={styles.body}>Missing workout id.</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['bottom', 'left', 'right']}>
      <ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
      >
        <View style={styles.headerRow}>
          <View style={{ flex: 1, gap: 4 }}>
            {isEditingTitle ? (
              <View style={styles.titleEditRow}>
                <TextInput
                  value={titleDraft}
                  onChangeText={setTitleDraft}
                  autoFocus
                  returnKeyType="done"
                  onSubmitEditing={saveTitle}
                  editable={!isSavingTitle}
                  style={[styles.title, styles.titleInput, { flex: 1 }]}
                />
                <View style={styles.titleEditActions}>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Cancel rename"
                    onPress={cancelTitleEdit}
                    disabled={isSavingTitle}
                    style={({ pressed }) => [styles.iconButton, (pressed || isSavingTitle) && styles.pressed]}
                  >
                    <XIcon size={20} color={TrenaColors.text} />
                  </Pressable>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Save workout name"
                    onPress={saveTitle}
                    disabled={isSavingTitle}
                    style={({ pressed }) => [styles.iconButton, (pressed || isSavingTitle) && styles.pressed]}
                  >
                    <CheckIcon size={20} color={TrenaColors.text} />
                  </Pressable>
                </View>
              </View>
            ) : (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Rename workout"
                onPress={() => {
                  setTitleDraft(row?.title ?? '');
                  setIsEditingTitle(true);
                }}
                hitSlop={6}
              >
                <Text style={styles.title} numberOfLines={1}>
                  {row?.title ?? 'Workout'}
                </Text>
              </Pressable>
            )}
            <View style={styles.metaRow}>
              <Text style={styles.meta} numberOfLines={1}>
                {row?.started_at
                  ? new Date(row.started_at).toLocaleString(undefined, {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })
                  : isLoading
                    ? 'Loading…'
                    : ''}
              </Text>
              {isAutoSaving ? <FloppyIcon size={14} color="rgba(236, 235, 228, 0.75)" /> : null}
            </View>
          </View>

          {!isEditingTitle ? (
            <View style={styles.headerActions}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Edit workout tags"
                onPress={() => setIsTagsOpen(true)}
                style={({ pressed }) => [styles.iconButton, pressed && styles.pressed]}
              >
                <TagIcon size={22} color={TrenaColors.text} />
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Edit workout date"
                onPress={onCalendarPress}
                style={({ pressed }) => [styles.iconButton, pressed && styles.pressed]}
              >
                <CalendarIcon size={22} color={TrenaColors.text} />
              </Pressable>
            </View>
          ) : null}


        </View>

        <Modal visible={isTagsOpen} transparent animationType="fade" onRequestClose={() => setIsTagsOpen(false)}>
          <Pressable style={styles.modalBackdrop} onPress={() => setIsTagsOpen(false)}>
            <View style={styles.tagsSheet} onStartShouldSetResponder={() => true}>
              <View style={styles.tagsSheetHeader}>
                <Text style={styles.tagsSheetTitle}>Tags</Text>
                <View style={styles.tagsSheetHeaderRight}>
                  {isSavingTags ? <FloppyIcon size={14} color="rgba(236, 235, 228, 0.75)" /> : null}
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Close tags"
                    onPress={() => setIsTagsOpen(false)}
                    hitSlop={10}
                    style={({ pressed }) => [styles.tagsCloseButton, pressed && { opacity: 0.85 }]}
                  >
                    <XIcon size={18} color={TrenaColors.text} />
                  </Pressable>
                </View>
              </View>

              <FlatList
                data={WORKOUT_TAGS as unknown as WorkoutTag[]}
                keyExtractor={(tag) => tag}
                numColumns={6}
                scrollEnabled={false}
                contentContainerStyle={styles.tagsGridContent}
                columnWrapperStyle={styles.tagsGridRow}
                renderItem={({ item: tag }) => {
                  const selected = tags.includes(tag);
                  return (
                    <View style={styles.tagsGridCell}>
                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel={selected ? `Remove ${tag} tag` : `Add ${tag} tag`}
                        onPress={() => toggleTag(tag)}
                        style={({ pressed }) => [
                          styles.tagButton,
                          selected ? styles.tagButtonSelected : styles.tagButtonUnselected,
                          pressed && styles.pressed,
                        ]}
                      >
                        <WorkoutTagIcon tag={tag} size={18} color={selected ? '#141B34' : 'rgba(236, 235, 228, 0.85)'} />
                      </Pressable>
                    </View>
                  );
                }}
              />
            </View>
          </Pressable>
        </Modal>

        <View style={styles.notesCard}>
          <View style={styles.notesHeader}>
            <NotebookIcon size={18} color="rgba(236, 235, 228, 0.65)" />
            <Text style={styles.notesLabel}>Workout Notes</Text>
          </View>
          <TextInput
            value={snapshot.notes ?? ''}
            onChangeText={updateWorkoutNotes}
            placeholder="Add notes about this workout…"
            placeholderTextColor="rgba(236, 235, 228, 0.4)"
            multiline
            style={styles.notesInput}
          />
        </View>

        {showPicker && Platform.OS === 'android' && (
          <DateTimePicker
            value={tempDate}
            mode={pickerMode}
            display="default"
            is24Hour={true}
            onChange={handleAndroidChange}
          />
        )}

        <Modal
          visible={showIosPicker}
          transparent
          animationType="fade"
          onRequestClose={() => setShowIosPicker(false)}
        >
          <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' }}>
            <View style={{ backgroundColor: '#fff', borderRadius: 16, padding: 20, width: '90%', maxWidth: 360, gap: 16 }}>
              <Text style={[styles.sectionTitle, { textAlign: 'center' }]}>Update Date</Text>
              <View style={{ alignItems: 'center' }}>
                <DateTimePicker
                  value={tempDate}
                  mode="date"
                  display="inline"
                  onChange={(e, d) => {
                    if (d) {
                      setTempDate((prev) => {
                        const next = new Date(prev);
                        next.setFullYear(d.getFullYear(), d.getMonth(), d.getDate());
                        return next;
                      });
                    }
                  }}
                  style={{ width: 300 }}
                />
                <DateTimePicker
                  value={tempDate}
                  mode="time"
                  display="compact"

                  onChange={(e, d) => {
                    if (d) {
                      setTempDate((prev) => {
                        const next = new Date(prev);
                        next.setHours(d.getHours(), d.getMinutes());
                        return next;
                      });
                    }
                  }}
                />
              </View>
              <View style={{ flexDirection: 'row', gap: 12 }}>
                <Pressable
                  onPress={() => setShowIosPicker(false)}
                  style={[styles.secondaryButton, { flex: 1 }]}
                >
                  <Text style={styles.secondaryButtonText}>Cancel</Text>
                </Pressable>
                <Pressable
                  onPress={() => onUpdateDateTime(tempDate)}
                  style={[styles.primaryButton, { flex: 1, height: 44 }]}
                >
                  <Text style={styles.primaryButtonText}>Save</Text>
                </Pressable>
              </View>
            </View>
          </View>
        </Modal>

        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>Exercises</Text>
          </View>

          {snapshot.exercises.length === 0 ? <Text style={styles.body}>No exercises yet.</Text> : null}

          <View style={styles.list}>
            {snapshot.exercises.map((ex) => {
              const bilbo = isBilboExercise(ex);
              const baseName = formatExerciseName(ex.exercise);
              const name = bilbo ? `Bilbo - ${baseName}` : baseName;

              const onLayout = (h: number) => {
                heightsRef.current[ex.id] = h;
              };

              const fromIndex = positionsRef.current.findIndex(id => id === ex.id);

              return (
                <DraggableExercise
                  key={ex.id}
                  id={ex.id}
                  index={fromIndex === -1 ? 0 : fromIndex}
                  count={snapshot.exercises.length}
                  avgHeight={avgHeight}
                  onReorder={(from, to) => {
                    const arr = [...positionsRef.current];
                    if (from < 0 || from >= arr.length) return;
                    const [moved] = arr.splice(from, 1);
                    arr.splice(to, 0, moved);
                    positionsRef.current = arr;
                    reorderExercisesByIds(arr);
                  }}
                >
                  {(gesture) => (
                    <View
                      key={ex.id}
                      style={styles.exerciseCard}
                      onLayout={(e) => onLayout(e.nativeEvent.layout.height)}
                    >
                      <View style={styles.exerciseHeader}>
                        <GestureDetector gesture={gesture}>
                          <View
                            hitSlop={10}
                            style={styles.dragHandle}
                          >
                            <DragHandleIcon size={18} color="rgba(236, 235, 228, 0.65)" strokeWidth={2.5} />
                          </View>
                        </GestureDetector>
                        <Text style={styles.exerciseTitle} numberOfLines={1}>
                          {name}
                        </Text>
                        <Pressable
                          accessibilityRole="button"
                          accessibilityLabel="Exercise options"
                          onPress={() => setMenuExerciseId(ex.id)}
                          hitSlop={10}
                          style={({ pressed }) => [styles.exerciseMoreButton, pressed && { opacity: 0.7 }]}
                        >
                          <MoreHorizIcon size={22} color={TrenaColors.text} />
                        </Pressable>
                      </View>

                      {ex.plannedSets.length > 0 ? (
                        <View style={{ gap: 8 }}>
                          {ex.plannedSets.map((ps, idx) => {
                            const cur = (ex.performedSets ?? []).find((s) => s.id === ps.id);
                            const repsText = cur && typeof cur.reps === 'number' && cur.reps > 0 ? String(cur.reps) : '';
                            const bilbo = isBilboExercise(ex);
                            if (bilbo) {
                              return (
                                <View key={ps.id} style={{ gap: 6 }}>
                                  <Pressable
                                    accessibilityRole="button"
                                    onLongPress={() =>
                                      Alert.alert('Set options', ps.label ?? 'Set', [
                                        { text: 'Cancel', style: 'cancel' },
                                        {
                                          text: getDone(cur) ? 'Mark not done' : 'Mark done',
                                          onPress: () => setPlannedMeta(ex.id, ps, { done: !getDone(cur) }),
                                        },
                                        {
                                          text: 'Remove set',
                                          style: 'destructive',
                                          onPress: () => setPlannedReps(ex.id, ps, ''),
                                        },
                                      ])
                                    }
                                    style={[styles.setLabelWrap, { alignSelf: 'flex-start' }]}
                                  >
                                    <Text style={styles.setLabel}>{ps.label ?? 'Set'}</Text>
                                  </Pressable>

                                  <View style={styles.setRow}>
                                    <TextInput
                                      value={repsText}
                                      onChangeText={(t) => setPlannedReps(ex.id, ps, t)}
                                      placeholder="reps"
                                      placeholderTextColor="rgba(236, 235, 228, 0.5)"
                                      keyboardType="numeric"
                                      style={styles.repsInput}
                                    />
                                    <Text style={styles.times}>x</Text>
                                    <Text style={styles.setWeight}>{`${ps.weightKg} kg`}</Text>
                                    <Pressable
                                      accessibilityRole="button"
                                      onPress={() => setPlannedMeta(ex.id, ps, { done: !getDone(cur) })}
                                      style={({ pressed }) => [
                                        styles.donePill,
                                        getDone(cur) ? styles.donePillOn : styles.donePillOff,
                                        pressed && { opacity: 0.85 },
                                      ]}
                                    >
                                      {getDone(cur) ? <CheckIcon size={18} color="#000" /> : <SkipStatusIcon size={18} color="rgba(236, 235, 228, 0.85)" />}
                                    </Pressable>
                                  </View>
                                </View>
                              );
                            }
                            return (
                              <View key={ps.id} style={styles.setRow}>
                                <Pressable
                                  accessibilityRole="button"
                                  onLongPress={() =>
                                    Alert.alert('Set options', ps.label ?? 'Set', [
                                      { text: 'Cancel', style: 'cancel' },
                                      {
                                        text: getDone(cur) ? 'Mark not done' : 'Mark done',
                                        onPress: () => setPlannedMeta(ex.id, ps, { done: !getDone(cur) }),
                                      },
                                      {
                                        text: 'Remove set',
                                        style: 'destructive',
                                        onPress: () => setPlannedReps(ex.id, ps, ''),
                                      },
                                    ])
                                  }
                                  style={styles.setLabelWrap}
                                >
                                  <Text style={styles.setLabel}>{ps.label ?? 'Set'}</Text>
                                </Pressable>
                                <>
                                  <TextInput
                                    value={repsText}
                                    onChangeText={(t) => setPlannedReps(ex.id, ps, t)}
                                    placeholder="reps"
                                    placeholderTextColor="rgba(236, 235, 228, 0.5)"
                                    keyboardType="numeric"
                                    style={styles.repsInput}
                                  />
                                  <Text style={styles.times}>x</Text>
                                  <Text style={styles.setWeight}>{`${ps.weightKg} kg`}</Text>
                                </>
                                <TextInput
                                  value={getRirText(cur)}
                                  onChangeText={(t) => {
                                    const n = numOrEmpty(t);
                                    setPlannedMeta(ex.id, ps, { rir: n });
                                  }}
                                  placeholder="RIR"
                                  placeholderTextColor="rgba(236, 235, 228, 0.5)"
                                  keyboardType="numeric"
                                  style={styles.rirInput}
                                />
                                <Pressable
                                  accessibilityRole="button"
                                  onPress={() => setPlannedMeta(ex.id, ps, { done: !getDone(cur) })}
                                  style={({ pressed }) => [
                                    styles.donePill,
                                    getDone(cur) ? styles.donePillOn : styles.donePillOff,
                                    pressed && { opacity: 0.85 },
                                  ]}
                                >
                                  {getDone(cur) ? <CheckIcon size={18} color="#000" /> : <SkipStatusIcon size={18} color="rgba(236, 235, 228, 0.85)" />}
                                </Pressable>
                              </View>
                            );
                          })}
                        </View>
                      ) : (
                        <View style={{ gap: 10 }}>
                          {(() => {
                            const tracking = ex.tracking ?? defaultTrackingForExerciseRef(ex.exercise);
                            if (tracking.type === 'interval_time') {
                              return (ex.performedSets ?? []).map((s, idx) => (
                                <View key={s.id} style={styles.freeSetRow}>
                                  <Pressable
                                    accessibilityRole="button"
                                    onLongPress={() =>
                                      Alert.alert('Set options', `Interval ${idx + 1}`, [
                                        { text: 'Cancel', style: 'cancel' },
                                        {
                                          text: s.done ? 'Mark not done' : 'Mark done',
                                          onPress: () => setFreeSetValue(ex.id, idx, { done: !s.done }),
                                        },
                                        {
                                          text: 'Remove interval',
                                          style: 'destructive',
                                          onPress: () => removeFreeSet(ex.id, idx),
                                        },
                                      ])
                                    }
                                    style={styles.freeSetIndex}
                                  >
                                    <Text style={styles.freeSetIndexText}>{idx + 1}</Text>
                                  </Pressable>
                                  <Pressable
                                    accessibilityRole="button"
                                    onPress={() => setDurationPicker({ exerciseId: ex.id, setIdx: idx, seconds: s.durationSec ?? 0 })}
                                    style={({ pressed }) => [
                                      styles.freeInput,
                                      { flex: 2.4, justifyContent: 'center' },
                                      pressed && { opacity: 0.85 },
                                    ]}
                                  >
                                    <Text
                                      style={{
                                        fontFamily: Fonts.medium,
                                        textAlign: 'center',
                                        color: durationToText(s.durationSec) ? TrenaColors.text : 'rgba(236, 235, 228, 0.5)',
                                      }}
                                    >
                                      {durationToText(s.durationSec) || '00:00'}
                                    </Text>
                                  </Pressable>
                                  <Text style={[styles.meta, { flex: 1 }]} numberOfLines={1}>
                                    time
                                  </Text>
                                  <Pressable
                                    accessibilityRole="button"
                                    onPress={() => setFreeSetValue(ex.id, idx, { done: !s.done })}
                                    style={({ pressed }) => [
                                      styles.donePill,
                                      s.done ? styles.donePillOn : styles.donePillOff,
                                      pressed && { opacity: 0.85 },
                                    ]}
                                  >
                                    {s.done ? (
                                      <CheckIcon size={18} color="#000" />
                                    ) : (
                                      <SkipStatusIcon size={18} color="rgba(236, 235, 228, 0.85)" />
                                    )}
                                  </Pressable>
                                </View>
                              ));
                            }

                            if (tracking.type === 'distance_time') {
                              return (ex.performedSets ?? []).map((s, idx) => (
                                <View key={s.id} style={styles.freeSetRow}>
                                  <Pressable
                                    accessibilityRole="button"
                                    onLongPress={() =>
                                      Alert.alert('Set options', `Lap ${idx + 1}`, [
                                        { text: 'Cancel', style: 'cancel' },
                                        {
                                          text: s.done ? 'Mark not done' : 'Mark done',
                                          onPress: () => setFreeSetValue(ex.id, idx, { done: !s.done }),
                                        },
                                        {
                                          text: 'Remove lap',
                                          style: 'destructive',
                                          onPress: () => removeFreeSet(ex.id, idx),
                                        },
                                      ])
                                    }
                                    style={styles.freeSetIndex}
                                  >
                                    <Text style={styles.freeSetIndexText}>{idx + 1}</Text>
                                  </Pressable>

                                  <TextInput
                                    value={
                                      distanceDraftBySetId[s.id] ??
                                      (typeof s.distanceKm === 'number' && s.distanceKm > 0 ? String(s.distanceKm) : '')
                                    }
                                    onChangeText={(t) => {
                                      setDistanceDraftBySetId((cur) => ({ ...cur, [s.id]: t }));
                                      setFreeSetValue(ex.id, idx, { distanceKm: parsePositiveNumberDraft(t) });
                                    }}
                                    onBlur={() => {
                                      setDistanceDraftBySetId((cur) => {
                                        if (!(s.id in cur)) return cur;
                                        const next = { ...cur };
                                        delete next[s.id];
                                        return next;
                                      });
                                    }}
                                    placeholder="km"
                                    placeholderTextColor="rgba(236, 235, 228, 0.5)"
                                    keyboardType="decimal-pad"
                                    style={[styles.freeInput, { flex: 1.5 }]}
                                  />
                                  <Text style={[styles.meta, { width: 20 }]} numberOfLines={1}>
                                    km
                                  </Text>

                                  <Pressable
                                    accessibilityRole="button"
                                    onPress={() => setDurationPicker({ exerciseId: ex.id, setIdx: idx, seconds: s.durationSec ?? 0 })}
                                    style={({ pressed }) => [
                                      styles.freeInput,
                                      { flex: 3.5, justifyContent: 'center' },
                                      pressed && { opacity: 0.85 },
                                    ]}
                                  >
                                    <Text
                                      style={{
                                        fontFamily: Fonts.medium,
                                        textAlign: 'center',
                                        color: durationToText(s.durationSec) ? TrenaColors.text : 'rgba(236, 235, 228, 0.5)',
                                      }}
                                    >
                                      {durationToText(s.durationSec) || '00:00'}
                                    </Text>
                                  </Pressable>

                                  <Text style={[styles.meta, { width: 44, textAlign: 'left' }]} numberOfLines={1}>
                                    {paceText(s.durationSec, s.distanceKm) || 'pace'}
                                  </Text>

                                  <Pressable
                                    accessibilityRole="button"
                                    onPress={() => setFreeSetValue(ex.id, idx, { done: !s.done })}
                                    style={({ pressed }) => [
                                      styles.donePill,
                                      s.done ? styles.donePillOn : styles.donePillOff,
                                      pressed && { opacity: 0.85 },
                                    ]}
                                  >
                                    {s.done ? (
                                      <CheckIcon size={18} color="#000" />
                                    ) : (
                                      <SkipStatusIcon size={18} color="rgba(236, 235, 228, 0.85)" />
                                    )}
                                  </Pressable>
                                </View>
                              ));
                            }

                            // strength default
                            return (ex.performedSets ?? []).map((s, idx) => (
                              <View key={s.id} style={styles.freeSetRow}>
                                <Pressable
                                  accessibilityRole="button"
                                  onLongPress={() =>
                                    Alert.alert('Set options', `Set ${idx + 1}`, [
                                      { text: 'Cancel', style: 'cancel' },
                                      {
                                        text: s.done ? 'Mark not done' : 'Mark done',
                                        onPress: () => setFreeSetValue(ex.id, idx, { done: !s.done }),
                                      },
                                      {
                                        text: 'Remove set',
                                        style: 'destructive',
                                        onPress: () => removeFreeSet(ex.id, idx),
                                      },
                                    ])
                                  }
                                  style={styles.freeSetIndex}
                                >
                                  <Text style={styles.freeSetIndexText}>{idx + 1}</Text>
                                </Pressable>
                                <TextInput
                                  value={s.reps ? String(s.reps) : ''}
                                  onChangeText={(t) => {
                                    const n = numOrEmpty(t);
                                    setFreeSetValue(ex.id, idx, { reps: n ?? 0 });
                                  }}
                                  placeholder="reps"
                                  placeholderTextColor="rgba(236, 235, 228, 0.5)"
                                  keyboardType="numeric"
                                  style={styles.freeInput}
                                />
                                <Text style={styles.times}>x</Text>
                                <TextInput
                                  value={s.weightKg ? String(s.weightKg) : ''}
                                  onChangeText={(t) => {
                                    const n = numOrEmpty(t);
                                    setFreeSetValue(ex.id, idx, { weightKg: n ?? 0 });
                                  }}
                                  placeholder="kg"
                                  placeholderTextColor="rgba(236, 235, 228, 0.5)"
                                  keyboardType="numeric"
                                  style={styles.freeInput}
                                />
                                <TextInput
                                  value={getRirText(s)}
                                  onChangeText={(t) => {
                                    const n = numOrEmpty(t);
                                    setFreeSetValue(ex.id, idx, { rir: n });
                                  }}
                                  placeholder="RIR"
                                  placeholderTextColor="rgba(236, 235, 228, 0.5)"
                                  keyboardType="numeric"
                                  style={styles.rirInput}
                                />
                                <Pressable
                                  accessibilityRole="button"
                                  onPress={() => setFreeSetValue(ex.id, idx, { done: !s.done })}
                                  style={({ pressed }) => [
                                    styles.donePill,
                                    s.done ? styles.donePillOn : styles.donePillOff,
                                    pressed && { opacity: 0.85 },
                                  ]}
                                >
                                  {s.done ? (
                                    <CheckIcon size={18} color="#000" />
                                  ) : (
                                    <SkipStatusIcon size={18} color="rgba(236, 235, 228, 0.85)" />
                                  )}
                                </Pressable>
                              </View>
                            ));
                          })()}

                          <Pressable
                            accessibilityRole="button"
                            onPress={() => addFreeSet(ex.id)}
                            style={({ pressed }) => [styles.secondaryButton, pressed && styles.pressed]}
                          >
                            <Text style={styles.secondaryButtonText}>
                              {(ex.tracking ?? defaultTrackingForExerciseRef(ex.exercise)).type === 'interval_time'
                                ? 'Add interval'
                                : (ex.tracking ?? defaultTrackingForExerciseRef(ex.exercise)).type === 'distance_time'
                                  ? 'Add lap'
                                  : 'Add set'}
                            </Text>
                          </Pressable>
                        </View>
                      )}

                      <View style={styles.exerciseNotesContainer}>
                        <View style={styles.exerciseNotesHeader}>
                          <StickyNoteIcon size={14} color="rgba(236, 235, 228, 0.5)" />
                          <Text style={styles.exerciseNotesLabel}>Notes</Text>
                        </View>
                        <TextInput
                          value={ex.notes ?? ''}
                          onChangeText={(t) => updateExercise(ex.id, (old) => ({ ...old, notes: t }))}
                          placeholder="Add exercise notes…"
                          placeholderTextColor="rgba(236, 235, 228, 0.35)"
                          multiline
                          style={styles.exerciseNotesInput}
                        />
                      </View>
                    </View>
                  )}
                </DraggableExercise>
              );
            })}
          </View>

          {!addOpen ? (
            <Pressable
              accessibilityRole="button"
              onPress={() => setAddOpen(true)}
              style={({ pressed }) => [styles.secondaryButton, pressed && styles.pressed]}
            >
              <Text style={styles.secondaryButtonText}>Add exercise</Text>
            </Pressable>
          ) : null}

          {editingExerciseId ? (
            <ExercisePicker
              value={null}
              onChange={handleEditExerciseSelect}
              initialOpen={true}
              onClose={handleEditExerciseClose}
            />
          ) : null}
        </View>

        <View style={styles.actionsRow}>
          <Pressable
            accessibilityRole="button"
            onPress={isProgrammed ? onProgram : onFinish}
            disabled={isFinishing}
            style={({ pressed }) => [
              styles.primaryButton,
              isProgrammed && styles.programButton,
              (pressed || isFinishing) && styles.pressed,
              isFinishing && { opacity: 0.7 },
            ]}
          >
            <Text style={[styles.primaryButtonText, isProgrammed && styles.programButtonText]}>
              {isFinishing ? 'Finishing…' : isProgrammed ? 'Program workout' : 'Finish workout'}
            </Text>
          </Pressable>
        </View>
      </ScrollView>

      <Modal
        visible={!!menuExerciseId}
        transparent
        animationType="fade"
        onRequestClose={() => setMenuExerciseId(null)}
      >
        <Pressable style={styles.modalBackdrop} onPress={() => setMenuExerciseId(null)}>
          {/* Swallow presses so backdrop doesn't close when tapping sheet */}
          <Pressable style={styles.menuSheet} onPress={() => {}}>
            <Text style={styles.menuTitle} numberOfLines={1}>
              {menuExercise ? formatExerciseName(menuExercise.exercise) : 'Exercise'}
            </Text>

            <Pressable
              accessibilityRole="button"
              style={({ pressed }) => [styles.menuItem, pressed && styles.menuItemPressed]}
              onPress={() => menuExerciseId && startEditingExercise(menuExerciseId)}
            >
              <EditIcon size={20} color={TrenaColors.text} />
              <Text style={styles.menuItemText}>Edit Exercise</Text>
            </Pressable>

            <View style={styles.menuSeparator} />

            <Pressable
              accessibilityRole="button"
              style={({ pressed }) => [styles.menuItem, pressed && styles.menuItemPressed]}
              onPress={() => menuExerciseId && duplicateExercise(menuExerciseId)}
            >
              <DuplicateIcon size={20} color={TrenaColors.text} />
              <Text style={styles.menuItemText}>Duplicate Exercise</Text>
            </Pressable>

            <View style={styles.menuSeparator} />

            <Pressable
              accessibilityRole="button"
              style={({ pressed }) => [styles.menuItem, pressed && styles.menuItemPressed]}
              onPress={() => menuExerciseId && removeExercise(menuExerciseId)}
            >
              <TrashIcon size={20} color={TrenaColors.accentRed} />
              <Text style={[styles.menuItemText, { color: TrenaColors.accentRed }]}>Delete Exercise</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>

      {toast ? (
        <View pointerEvents="none" style={styles.toast}>
          <Text style={styles.toastText}>{toast}</Text>
        </View>
      ) : null}

      <AddExerciseModal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        onConfirm={onConfirmAdd}
        title="Add exercise"
        confirmLabel="Add"
        onRequestCreateMethod={onRequestCreateMethod}
      />

      <DurationWheelModal
        visible={!!durationPicker}
        title="Duration"
        initialSeconds={durationPicker?.seconds ?? 0}
        onCancel={() => setDurationPicker(null)}
        onConfirm={(seconds) => {
          if (!durationPicker) return;
          setFreeSetValue(durationPicker.exerciseId, durationPicker.setIdx, { durationSec: seconds });
          setDurationPicker(null);
        }}
      />
    </SafeAreaView>
  );
}

/*
 * NOTE:
 * The block below is a duplicate/partial copy of the screen + an older `styles` object that
 * was accidentally pasted into this file. It breaks Metro/Babel parsing (and also redeclares
 * `styles`). We keep it commented out to preserve any reference while ensuring the module
 * remains syntactically valid.
 *
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  header: { padding: 16, paddingBottom: 10, gap: 10 },
  titleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { fontFamily: Fonts.extraBold, fontSize: 22, lineHeight: 28, color: TrenaColors.text, flex: 1 },
  titleInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: 'rgba(236, 235, 228, 0.12)',
    backgroundColor: 'rgba(236, 235, 228, 0.04)',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: TrenaColors.text,
    fontFamily: Fonts.extraBold,
    fontSize: 18,
  },
  titleActions: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  iconButton: {
    width: 36,
    height: 36,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(236, 235, 228, 0.12)',
    backgroundColor: 'rgba(236, 235, 228, 0.04)',
  },
  iconButtonDanger: {
    borderColor: 'rgba(255, 90, 90, 0.25)',
    backgroundColor: 'rgba(255, 90, 90, 0.10)',
  },
  metaRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  meta: { fontFamily: Fonts.medium, fontSize: 13, color: 'rgba(236, 235, 228, 0.75)' },
  pill: {
    paddingVertical: 7,
    paddingHorizontal: 10,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(236, 235, 228, 0.12)',
    backgroundColor: 'rgba(236, 235, 228, 0.04)',
  },
  pillText: { fontFamily: Fonts.bold, fontSize: 12, color: 'rgba(236, 235, 228, 0.9)' },
  autoSaveText: {
    fontFamily: Fonts.medium,
    fontSize: 12,
    color: 'rgba(236, 235, 228, 0.6)',
    textAlign: 'center',
    paddingVertical: 8,
    marginBottom: 4,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 16,
  },
  menuItemPressed: {
    opacity: 0.7,
  },
  menuItemText: {
    fontFamily: Fonts.bold,
    fontSize: 16,
    color: TrenaColors.text,
  },
  menuSeparator: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: 'rgba(236, 235, 228, 0.1)',
  },
  setLabelWrap: { width: 110 },
  setLabelWrapBilbo: { alignSelf: 'flex-start' },
  setRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  setLabel: { width: 110, fontFamily: Fonts.medium, fontSize: 12, color: 'rgba(236, 235, 228, 0.75)' },
  setLabelBilbo: { fontFamily: Fonts.medium, fontSize: 12, color: 'rgba(236, 235, 228, 0.75)' },
  setWeight: { width: 80, fontFamily: Fonts.bold, fontSize: 13, color: TrenaColors.text },
  times: { fontFamily: Fonts.bold, fontSize: 14, color: 'rgba(236, 235, 228, 0.75)' },
  repsInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: 'rgba(236, 235, 228, 0.12)',
    backgroundColor: 'rgba(236, 235, 228, 0.04)',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: TrenaColors.text,
    fontFamily: Fonts.medium,
    textAlign: 'center',
  },
  repsInputCompact: {
    width: 72,
    borderWidth: 1,
    borderColor: 'rgba(236, 235, 228, 0.12)',
    backgroundColor: 'rgba(236, 235, 228, 0.04)',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: TrenaColors.text,
    fontFamily: Fonts.medium,
    textAlign: 'center',
  },
  freeSetRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  freeSetIndex: {
    width: 26,
    height: 26,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(236, 235, 228, 0.12)',
    backgroundColor: 'rgba(236, 235, 228, 0.04)',
  },
  freeSetIndexText: { fontFamily: Fonts.bold, fontSize: 12, color: 'rgba(236, 235, 228, 0.85)' },
  freeInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: 'rgba(236, 235, 228, 0.12)',
    backgroundColor: 'rgba(236, 235, 228, 0.04)',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: TrenaColors.text,
    fontFamily: Fonts.medium,
    textAlign: 'center',
  },
  rirInput: {
    width: 54,
    borderWidth: 1,
    borderColor: 'rgba(236, 235, 228, 0.12)',
    backgroundColor: 'rgba(236, 235, 228, 0.04)',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 10,
    color: TrenaColors.text,
    fontFamily: Fonts.medium,
    textAlign: 'center',
  },
  donePill: {
    borderRadius: 999,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderWidth: 1,
    minWidth: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  donePillOn: {
    backgroundColor: TrenaColors.primary,
    borderColor: TrenaColors.primary,
  },
  donePillOff: {
    backgroundColor: 'rgba(236, 235, 228, 0.04)',
    borderColor: 'rgba(236, 235, 228, 0.12)',
  },
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
  actionsRow: { flexDirection: 'row', gap: 10, paddingTop: 4 },
  primaryButton: {
    flex: 1,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    backgroundColor: TrenaColors.primary,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(0, 0, 0, 0.25)',
  },
  primaryButtonText: { color: '#000', fontSize: 15, fontFamily: Fonts.extraBold },
  programButton: {
    flex: 1,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    backgroundColor: TrenaColors.secondary,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(236, 235, 228, 0.12)',
  },
  programButtonText: { color: TrenaColors.text, fontSize: 15, fontFamily: Fonts.extraBold },
  secondaryButton: {
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(236, 235, 228, 0.08)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(236, 235, 228, 0.12)',
  },
  secondaryButtonText: { color: TrenaColors.text, fontSize: 14, fontFamily: Fonts.bold },
  pressed: { transform: [{ scale: 0.99 }], opacity: 0.95 },
  toast: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: Platform.select({ ios: 24, android: 16, default: 16 }),
    padding: 12,
    borderRadius: 12,
    backgroundColor: 'rgba(236, 235, 228, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(236, 235, 228, 0.18)',
    alignItems: 'center',
  },
  toastText: { fontFamily: Fonts.bold, fontSize: 13, color: TrenaColors.text },
  exerciseNotesContainer: { gap: 8, paddingTop: 6 },
  exerciseNotesHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  exerciseNotesLabel: { fontFamily: Fonts.bold, fontSize: 12, color: 'rgba(236, 235, 228, 0.6)' },
  exerciseNotesInput: {
    borderWidth: 1,
    borderColor: 'rgba(236, 235, 228, 0.12)',
    backgroundColor: 'rgba(236, 235, 228, 0.04)',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    minHeight: 44,
    color: TrenaColors.text,
    fontFamily: Fonts.medium,
  },
});
                                  <TextInput
                                    value={getRirText(cur)}
                                    onChangeText={(t) => {
                                      const n = numOrEmpty(t);
                                      setPlannedMeta(ex.id, ps, { rir: n });
                                    }}
                                    placeholder="RIR"
                                    placeholderTextColor="rgba(236, 235, 228, 0.5)"
                                    keyboardType="numeric"
                                    style={styles.rirInput}
                                  />
                                ) : null}
                                <Pressable
                                  accessibilityRole="button"
                                  onPress={() => setPlannedMeta(ex.id, ps, { done: !getDone(cur) })}
                                  style={({ pressed }) => [
                                    styles.donePill,
                                    getDone(cur) ? styles.donePillOn : styles.donePillOff,
                                    pressed && { opacity: 0.85 },
                                  ]}
                                >
                                  {getDone(cur) ? (
                                    <CheckIcon size={18} color="#000" />
                                  ) : (
                                    <SkipStatusIcon size={18} color="rgba(236, 235, 228, 0.85)" />
                                  )}
                                </Pressable>
                              </View>
                            );
                          })}
                        </View>
                      ) : (
                        <View style={{ gap: 10 }}>
                          {(ex.performedSets ?? []).map((s, idx) => (
                            <View key={s.id} style={styles.freeSetRow}>
                              <Pressable
                                accessibilityRole="button"
                                onLongPress={() =>
                                  Alert.alert('Set options', `Set ${idx + 1}`, [
                                    { text: 'Cancel', style: 'cancel' },
                                    {
                                      text: s.done ? 'Mark not done' : 'Mark done',
                                      onPress: () => setFreeSetValue(ex.id, idx, { done: !s.done }),
                                    },
                                    {
                                      text: 'Remove set',
                                      style: 'destructive',
                                      onPress: () => removeFreeSet(ex.id, idx),
                                    },
                                  ])
                                }
                                style={styles.freeSetIndex}
                              >
                                <Text style={styles.freeSetIndexText}>{idx + 1}</Text>
                              </Pressable>
                              <TextInput
                                value={s.reps ? String(s.reps) : ''}
                                onChangeText={(t) => {
                                  const n = numOrEmpty(t);
                                  setFreeSetValue(ex.id, idx, { reps: n ?? 0 });
                                }}
                                placeholder="reps"
                                placeholderTextColor="rgba(236, 235, 228, 0.5)"
                                keyboardType="numeric"
                                style={styles.freeInput}
                              />
                              <Text style={styles.times}>x</Text>
                              <TextInput
                                value={s.weightKg ? String(s.weightKg) : ''}
                                onChangeText={(t) => {
                                  const n = numOrEmpty(t);
                                  setFreeSetValue(ex.id, idx, { weightKg: n ?? 0 });
                                }}
                                placeholder="kg"
                                placeholderTextColor="rgba(236, 235, 228, 0.5)"
                                keyboardType="numeric"
                                style={styles.freeInput}
                              />
                              <TextInput
                                value={getRirText(s)}
                                onChangeText={(t) => {
                                  const n = numOrEmpty(t);
                                  setFreeSetValue(ex.id, idx, { rir: n });
                                }}
                                placeholder="RIR"
                                placeholderTextColor="rgba(236, 235, 228, 0.5)"
                                keyboardType="numeric"
                                style={styles.rirInput}
                              />
                              <Pressable
                                accessibilityRole="button"
                                onPress={() => setFreeSetValue(ex.id, idx, { done: !s.done })}
                                style={({ pressed }) => [
                                  styles.donePill,
                                  s.done ? styles.donePillOn : styles.donePillOff,
                                  pressed && { opacity: 0.85 },
                                ]}
                              >
                                {s.done ? <CheckIcon size={18} color="#000" /> : <SkipStatusIcon size={18} color="rgba(236, 235, 228, 0.85)" />}
                              </Pressable>
                            </View>
                          ))}

                          <Pressable
                            accessibilityRole="button"
                            onPress={() => addFreeSet(ex.id)}
                            style={({ pressed }) => [styles.secondaryButton, pressed && styles.pressed]}
                          >
                            <Text style={styles.secondaryButtonText}>Add set</Text>
                          </Pressable>
                        </View>
                      )}

                      <View style={styles.exerciseNotesContainer}>
                        <View style={styles.exerciseNotesHeader}>
                          <StickyNoteIcon size={14} color="rgba(236, 235, 228, 0.5)" />
                          <Text style={styles.exerciseNotesLabel}>Notes</Text>
                        </View>
                        <TextInput
                          value={ex.notes ?? ''}
                          onChangeText={(t) => updateExercise(ex.id, (old) => ({ ...old, notes: t }))}
                          placeholder="Add exercise notes…"
                          placeholderTextColor="rgba(236, 235, 228, 0.35)"
                          multiline
                          style={styles.exerciseNotesInput}
                        />
                      </View>
                    </View>
                  )}
                </DraggableExercise>
              );
            })}
          </View>

          {!addOpen ? (
            <Pressable
              accessibilityRole="button"
              onPress={() => setAddOpen(true)}
              style={({ pressed }) => [styles.secondaryButton, pressed && styles.pressed]}
            >
              <Text style={styles.secondaryButtonText}>Add exercise</Text>
            </Pressable>
          ) : null}

          {editingExerciseId ? (
            <ExercisePicker
              value={null}
              onChange={handleEditExerciseSelect}
              initialOpen={true}
              onClose={handleEditExerciseClose}
            />
          ) : null}
        </View>

        <View style={styles.actionsRow}>
          <Pressable
            accessibilityRole="button"
            onPress={isProgrammed ? onProgram : onFinish}
            disabled={isFinishing}
            style={({ pressed }) => [
              isProgrammed ? styles.programButton : styles.primaryButton,
              (pressed || isFinishing) && styles.pressed,
            ]}
          >
            <Text style={isProgrammed ? styles.programButtonText : styles.primaryButtonText}>
              {isFinishing ? (isProgrammed ? 'Programming…' : 'Finishing…') : isProgrammed ? 'Program workout' : 'Finish workout'}
            </Text>
          </Pressable>
        </View>

        {toast ? (
          <View style={styles.toast} pointerEvents="none">
            <Text style={styles.toastText}>{toast}</Text>
          </View>
        ) : null}

        <Modal visible={!!menuExerciseId} transparent animationType="fade" onRequestClose={() => setMenuExerciseId(null)}>
          <Pressable style={styles.modalBackdrop} onPress={() => setMenuExerciseId(null)}>
            <View style={styles.menuSheet} onStartShouldSetResponder={() => true}>
              <Text style={styles.menuTitle} numberOfLines={1}>
                {menuExercise ? formatExerciseName(menuExercise.exercise) : 'Exercise'}
              </Text>

              <Pressable
                accessibilityRole="button"
                style={({ pressed }) => [styles.menuItem, pressed && styles.menuItemPressed]}
                onPress={() => menuExerciseId && startEditingExercise(menuExerciseId)}
              >
                <EditIcon size={20} color={TrenaColors.text} />
                <Text style={styles.menuItemText}>Edit Exercise</Text>
              </Pressable>

              <View style={styles.menuSeparator} />

              <Pressable
                accessibilityRole="button"
                style={({ pressed }) => [styles.menuItem, pressed && styles.menuItemPressed]}
                onPress={() => menuExerciseId && duplicateExercise(menuExerciseId)}
              >
                <DuplicateIcon size={20} color={TrenaColors.text} />
                <Text style={styles.menuItemText}>Duplicate Exercise</Text>
              </Pressable>

              <View style={styles.menuSeparator} />

              <Pressable
                accessibilityRole="button"
                style={({ pressed }) => [styles.menuItem, pressed && styles.menuItemPressed]}
                onPress={() => menuExerciseId && removeExercise(menuExerciseId)}
              >
                <TrashIcon size={20} color={TrenaColors.accentRed} />
                <Text style={[styles.menuItemText, { color: TrenaColors.accentRed }]}>Delete Exercise</Text>
              </Pressable>
            </View>
          </Pressable>
        </Modal>
      </ScrollView>

      <AddExerciseModal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        onConfirm={onConfirmAdd}
        title="Add exercise"
        confirmLabel="Add"
        onRequestCreateMethod={onRequestCreateMethod}
      />
    </SafeAreaView >
  );
}

*/

function clamp(n: number, min: number, max: number) {
  'worklet';
  return Math.max(min, Math.min(n, max));
}

function DraggableExercise({
  id,
  index,
  count,
  avgHeight,
  onReorder,
  children,
}: {
  id: string;
  index: number;
  count: number;
  avgHeight: number;
  onReorder: (from: number, to: number) => void;
  children: (gesture: GestureType) => React.ReactNode;
}) {
  const translateY = useSharedValue(0);
  const isActive = useSharedValue(false);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
    zIndex: isActive.value ? 1 : 0,
  }));

  const gesture = Gesture.Pan()
    .onBegin(() => {
      isActive.value = true;
    })
    .onChange((e) => {
      translateY.value = e.translationY;
    })
    .onFinalize(() => {
      const from = index;
      const target = clamp(Math.round((index * avgHeight + translateY.value) / avgHeight), 0, count - 1);
      translateY.value = withSpring(0);
      isActive.value = false;
      if (target !== from) {
        runOnJS(onReorder)(from, target);
      }
    });

  return (
    <Animated.View style={animatedStyle}>{children(gesture)}</Animated.View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: TrenaColors.background },
  container: { paddingHorizontal: 20, paddingVertical: 24, gap: 14 },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  title: { fontSize: 26, lineHeight: 32, fontFamily: Fonts.extraBold, color: TrenaColors.text, letterSpacing: -0.25 },
  titleInput: {
    borderWidth: 1,
    borderColor: 'rgba(236, 235, 228, 0.12)',
    backgroundColor: 'rgba(236, 235, 228, 0.04)',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  titleEditRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  titleEditActions: {
    flexDirection: 'row',
    gap: 10,
  },
  meta: { fontFamily: Fonts.medium, fontSize: 12, lineHeight: 16, color: 'rgba(236, 235, 228, 0.75)' },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(236, 235, 228, 0.12)',
    backgroundColor: 'rgba(236, 235, 228, 0.04)',
  },
  dateCard: {
    borderWidth: 1,
    borderColor: 'rgba(236, 235, 228, 0.12)',
    backgroundColor: 'rgba(236, 235, 228, 0.04)',
    padding: 12,
    borderRadius: 14,
    gap: 10,
  },
  dateRow: { flexDirection: 'row', gap: 10, alignItems: 'center' },
  section: { gap: 12 },
  sectionHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sectionTitle: { fontFamily: Fonts.bold, fontSize: 16, lineHeight: 20, color: TrenaColors.text },
  body: { color: 'rgba(236, 235, 228, 0.8)', fontFamily: Fonts.regular, fontSize: 14, lineHeight: 20 },
  list: { gap: 12 },
  reorderButton: {
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(236, 235, 228, 0.12)',
    backgroundColor: 'rgba(236, 235, 228, 0.04)',
  },
  reorderButtonText: { fontFamily: Fonts.bold, fontSize: 12, color: 'rgba(236, 235, 228, 0.9)' },
  exerciseCard: {
    borderWidth: 1,
    borderColor: 'rgba(236, 235, 228, 0.12)',
    backgroundColor: 'rgba(236, 235, 228, 0.04)',
    padding: 12,
    borderRadius: 14,
    gap: 10,
  },
  exerciseHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  dragHandle: { paddingVertical: 2, paddingHorizontal: 4 },
  exerciseTitle: { fontFamily: Fonts.bold, fontSize: 16, lineHeight: 20, color: TrenaColors.text, flex: 1 },
  exerciseMoreButton: {
    padding: 4,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'flex-end',
  },
  menuSheet: {
    backgroundColor: '#1C1C1E',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingVertical: 10,
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  menuTitle: {
    fontFamily: Fonts.semiBold,
    fontSize: 14,
    color: 'rgba(236, 235, 228, 0.6)',
    textAlign: 'center',
    paddingVertical: 8,
    marginBottom: 4,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 16,
  },
  menuItemPressed: {
    opacity: 0.7,
  },
  menuItemText: {
    fontFamily: Fonts.bold,
    fontSize: 16,
    color: TrenaColors.text,
  },
  menuSeparator: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: 'rgba(236, 235, 228, 0.1)',
  },
  setLabelWrap: { width: 110 },
  setRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  setLabel: { width: 110, fontFamily: Fonts.medium, fontSize: 12, color: 'rgba(236, 235, 228, 0.75)' },
  setWeight: { width: 80, fontFamily: Fonts.bold, fontSize: 13, color: TrenaColors.text },
  times: { fontFamily: Fonts.bold, fontSize: 14, color: 'rgba(236, 235, 228, 0.75)' },
  repsInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: 'rgba(236, 235, 228, 0.12)',
    backgroundColor: 'rgba(236, 235, 228, 0.04)',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: TrenaColors.text,
    fontFamily: Fonts.medium,
    textAlign: 'center',
  },
  repsInputCompact: {
    width: 72,
    borderWidth: 1,
    borderColor: 'rgba(236, 235, 228, 0.12)',
    backgroundColor: 'rgba(236, 235, 228, 0.04)',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: TrenaColors.text,
    fontFamily: Fonts.medium,
    textAlign: 'center',
  },
  freeSetRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  freeSetIndex: {
    width: 26,
    height: 26,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(236, 235, 228, 0.12)',
    backgroundColor: 'rgba(236, 235, 228, 0.04)',
  },
  freeSetIndexText: { fontFamily: Fonts.bold, fontSize: 12, color: 'rgba(236, 235, 228, 0.85)' },
  freeInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: 'rgba(236, 235, 228, 0.12)',
    backgroundColor: 'rgba(236, 235, 228, 0.04)',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: TrenaColors.text,
    fontFamily: Fonts.medium,
    textAlign: 'center',
  },
  rirInput: {
    width: 54,
    borderWidth: 1,
    borderColor: 'rgba(236, 235, 228, 0.12)',
    backgroundColor: 'rgba(236, 235, 228, 0.04)',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 10,
    color: TrenaColors.text,
    fontFamily: Fonts.medium,
    textAlign: 'center',
  },
  donePill: {
    borderRadius: 999,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderWidth: 1,
    minWidth: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  donePillOn: {
    backgroundColor: TrenaColors.primary,
    borderColor: TrenaColors.primary,
  },
  donePillOff: {
    backgroundColor: 'rgba(236, 235, 228, 0.04)',
    borderColor: 'rgba(236, 235, 228, 0.12)',
  },
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
  actionsRow: { flexDirection: 'row', gap: 10, paddingTop: 4 },
  primaryButton: {
    flex: 1,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    backgroundColor: TrenaColors.primary,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(0, 0, 0, 0.25)',
  },
  primaryButtonText: { color: '#000', fontSize: 15, fontFamily: Fonts.extraBold },
  programButton: {
    flex: 1,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    backgroundColor: TrenaColors.secondary,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(236, 235, 228, 0.12)',
  },
  programButtonText: { color: TrenaColors.text, fontSize: 15, fontFamily: Fonts.extraBold },
  secondaryButton: {
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(236, 235, 228, 0.08)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(236, 235, 228, 0.12)',
  },
  secondaryButtonText: { color: TrenaColors.text, fontSize: 14, fontFamily: Fonts.bold },
  pressed: { transform: [{ scale: 0.99 }], opacity: 0.95 },
  toast: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 16,
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: 'rgba(236, 235, 228, 0.12)',
    backgroundColor: 'rgba(236, 235, 228, 0.08)',
  },
  toastText: { fontFamily: Fonts.medium, fontSize: 13, lineHeight: 18, color: TrenaColors.text },
  addCard: {
    borderWidth: 1,
    borderColor: 'rgba(236, 235, 228, 0.12)',
    backgroundColor: 'rgba(236, 235, 228, 0.04)',
    padding: 12,
    borderRadius: 14,
    gap: 10,
  },
  pillsRow: { flexDirection: 'row', gap: 10, flexWrap: 'wrap' },
  pill: { borderRadius: 999, paddingVertical: 10, paddingHorizontal: 14, borderWidth: 1 },
  pillSelected: { backgroundColor: TrenaColors.primary, borderColor: TrenaColors.primary },
  pillUnselected: { backgroundColor: 'rgba(236, 235, 228, 0.04)', borderColor: 'rgba(236, 235, 228, 0.12)' },
  pillText: { fontFamily: Fonts.semiBold, fontSize: 13, lineHeight: 16 },
  pillTextSelected: { color: TrenaColors.background },
  pillTextUnselected: { color: 'rgba(236, 235, 228, 0.9)' },
  tagsGridContent: { paddingTop: 2, paddingBottom: 2, rowGap: 10 },
  tagsGridRow: { columnGap: 10, justifyContent: 'flex-start' },
  tagsGridCell: { flex: 1, alignItems: 'center' },
  tagButton: {
    width: 40,
    height: 40,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  tagButtonSelected: { backgroundColor: TrenaColors.primary, borderColor: TrenaColors.primary },
  tagButtonUnselected: { backgroundColor: 'rgba(236, 235, 228, 0.04)', borderColor: 'rgba(236, 235, 228, 0.12)' },
  tagsSheet: {
    backgroundColor: '#1C1C1E',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 16,
    paddingBottom: 18,
    borderWidth: 1,
    borderColor: 'rgba(236, 235, 228, 0.12)',
  },
  tagsSheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  tagsSheetTitle: { fontFamily: Fonts.extraBold, fontSize: 16, color: TrenaColors.text },
  tagsSheetHeaderRight: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  tagsCloseButton: { padding: 6 },
  // Workout notes styles
  notesCard: {
    borderWidth: 1,
    borderColor: 'rgba(236, 235, 228, 0.12)',
    backgroundColor: 'rgba(236, 235, 228, 0.04)',
    borderRadius: 14,
    padding: 12,
    gap: 8,
  },
  notesHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  notesLabel: {
    fontFamily: Fonts.semiBold,
    fontSize: 13,
    color: 'rgba(236, 235, 228, 0.65)',
  },
  notesInput: {
    color: TrenaColors.text,
    fontSize: 14,
    fontFamily: Fonts.regular,
    minHeight: 40,
    textAlignVertical: 'top',
  },
  // Exercise notes styles
  exerciseNotesContainer: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(236, 235, 228, 0.06)',
    marginTop: 4,
    paddingTop: 10,
    gap: 4,
  },
  exerciseNotesHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  exerciseNotesLabel: {
    fontFamily: Fonts.medium,
    fontSize: 11,
    color: 'rgba(236, 235, 228, 0.5)',
  },
  exerciseNotesInput: {
    fontSize: 13,
    color: TrenaColors.text,
    fontFamily: Fonts.regular,
    minHeight: 28,
    textAlignVertical: 'top',
  },
});

