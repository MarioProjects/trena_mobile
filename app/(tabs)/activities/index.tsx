import { ActivitiesFilterSheet, countActiveActivitiesFilters, isActivitiesFilterActive, type ActivitiesFilters } from '@/components/ActivitiesFilterSheet';
import { ActionSheet, ActionSheetOption } from '@/components/ui/ActionSheet';
import { Toast } from '@/components/ui/Toast';
import { Fonts, rgba, Shadows, TrenaColorPalette } from '@/constants/theme';
import { learnData } from '@/data/learn';
import { useTrenaTheme } from '@/hooks/use-theme-context';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import React from 'react';
import { ActivityIndicator, Image, Modal, Pressable, RefreshControl, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
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
  CharacterIcon,
  ChessIcon,
  DropIcon,
  DumbbellIcon,
  DuplicateIcon,
  FilterIcon,
  FireIcon,
  HappyIcon,
  HourglassIcon,
  LeafIcon,
  LegIcon,
  MoreHorizIcon,
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
  StatusIcon,
  TrashIcon,
  VideoIcon,
  XIcon,
  YogaIcon
} from '@/components/icons';
import { PlayIcon } from '@/components/icons/PlayIcon';
import { WorkoutsSkeleton } from '@/components/WorkoutsSkeleton';
import { deleteSession, duplicateSession, listSessions, updateSessionStatus, updateSessionTitle } from '@/lib/workouts/repo';
import { getEffectiveWorkoutSessionStatus } from '@/lib/workouts/status';
import type { WorkoutTag } from '@/lib/workouts/tags';
import type { ExerciseRef, WorkoutSessionRow, WorkoutSessionStatus } from '@/lib/workouts/types';

const DrinkWaterIllustration = require('../../../assets/images/illustrations/activities/drink_water_yellow.webp');

const learnExercises = learnData.filter((x) => x.type === 'exercise');
const learnExerciseNameById = new Map<string, string>(learnExercises.map((x) => [x.id, x.name]));

const DEFAULT_FILTERS: ActivitiesFilters = {
  workoutQuery: '',
  selectedWorkouts: [],
  selectedExercises: [],
  notesQuery: '',
  selectedNotes: [],
  selectedTags: [],
  datePreset: 'any',
  startDate: null,
  endDate: null,
};

function formatDate(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString(undefined, { weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function startOfLocalDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}

function formatExerciseName(ref: ExerciseRef) {
  if (ref.kind === 'learn') return learnExerciseNameById.get(ref.learnExerciseId) ?? ref.learnExerciseId;
  if (ref.kind === 'method') return 'Method';
  if (ref.kind === 'free') return ref.name;
  return 'Unknown';
}

function normalize(s: string) {
  return s.toLowerCase().trim();
}

function levenshtein(a: string, b: string): number {
  if (a.length < b.length) return levenshtein(b, a);
  if (b.length === 0) return a.length;

  let prevRow = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 0; i < a.length; i++) {
    const currRow = [i + 1];
    for (let j = 0; j < b.length; j++) {
      const insertions = prevRow[j + 1] + 1;
      const deletions = currRow[j] + 1;
      const substitutions = prevRow[j] + (a[i] === b[j] ? 0 : 1);
      currRow.push(Math.min(insertions, deletions, substitutions));
    }
    prevRow = currRow;
  }
  return prevRow[b.length];
}

function exerciseKey(ref: ExerciseRef): string {
  if (ref.kind === 'learn') return `learn:${ref.learnExerciseId}`;
  if (ref.kind === 'method') return `method:${ref.methodInstanceId}`;
  if (ref.kind === 'free') return `free:${normalize(ref.name)}`;
  return 'unknown';
}

function fuzzyMatch(target: string, query: string): { matched: boolean; score: number } {
  const t = target.toLowerCase();
  const q = query.toLowerCase();

  // 1. Exact substring match is perfect
  if (t.includes(q)) return { matched: true, score: 0 };

  const words = t.split(/\s+/);
  let bestScore = 100;

  for (const word of words) {
    if (word.length === 0) continue;

    // 2. Exact prefix match (e.g., "bi" matches "bilbo")
    if (word.startsWith(q)) {
      bestScore = Math.min(bestScore, 1);
      continue;
    }

    // 3. Fuzzy prefix match (e.g., "bu" matches "bilbo" prefix "bi")
    if (q.length >= 2) {
      const prefix = word.slice(0, q.length);
      const pd = levenshtein(prefix, q);
      if (pd <= 1) {
        bestScore = Math.min(bestScore, pd + 1);
      }
    }

    // 4. General word fuzzy match
    const d = levenshtein(word, q);
    // Use a very generous threshold as per user request
    const wordThreshold = Math.max(3, Math.floor(q.length * 0.8) + 1);
    if (d <= wordThreshold) {
      bestScore = Math.min(bestScore, d + 2);
    }
  }

  // 5. Whole string fuzzy match
  const wholeDist = levenshtein(t, q);
  const wholeThreshold = Math.max(4, q.length);
  if (wholeDist <= wholeThreshold) {
    bestScore = Math.min(bestScore, wholeDist + 5);
  }

  if (bestScore < 100) {
    return { matched: true, score: bestScore };
  }

  return { matched: false, score: 0 };
}

function bucketSessionsByDay(sessions: WorkoutSessionRow[], skipSort = false) {
  const now = new Date();
  const todayStart = startOfLocalDay(now);
  const tomorrowStart = startOfLocalDay(new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1));

  const today: WorkoutSessionRow[] = [];
  const future: WorkoutSessionRow[] = [];
  const recent: WorkoutSessionRow[] = [];

  for (const s of sessions) {
    const t = new Date(s.started_at).getTime();
    if (Number.isNaN(t)) {
      recent.push(s);
      continue;
    }
    if (t >= todayStart && t < tomorrowStart) today.push(s);
    else if (t >= tomorrowStart) future.push(s);
    else recent.push(s);
  }

  // Keep UX sensible: today/recent are usually newest-first, future earliest-first.
  if (!skipSort) {
    today.sort((a, b) => new Date(b.started_at).getTime() - new Date(a.started_at).getTime());
    recent.sort((a, b) => new Date(b.started_at).getTime() - new Date(a.started_at).getTime());
    future.sort((a, b) => new Date(a.started_at).getTime() - new Date(b.started_at).getTime());
  }

  return { today, future, recent };
}

function WorkoutTagIcon({ tag, size = 16, color }: { tag: WorkoutTag; size?: number; color?: string }) {
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

export default function ActivitiesIndexScreen() {
  const { colors } = useTrenaTheme();
  const styles = React.useMemo(() => createStyles(colors), [colors]);
  const params = useLocalSearchParams<{ toast?: string }>();

  const [sessions, setSessions] = React.useState<WorkoutSessionRow[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [refreshing, setRefreshing] = React.useState(false);
  const [deletingId, setDeletingId] = React.useState<string | null>(null);
  const [duplicatingId, setDuplicatingId] = React.useState<string | null>(null);
  const [menuTargetId, setMenuTargetId] = React.useState<string | null>(null);
  const [renamingId, setRenamingId] = React.useState<string | null>(null);
  const [renameValue, setRenameValue] = React.useState('');
  const [isSavingRename, setIsSavingRename] = React.useState(false);
  const [toast, setToast] = React.useState<string | null>(null);

  const [filters, setFilters] = React.useState<ActivitiesFilters>(DEFAULT_FILTERS);
  const [filtersOpen, setFiltersOpen] = React.useState(false);

  const menuTarget = React.useMemo(() => (menuTargetId ? sessions.find((s) => s.id === menuTargetId) : null), [menuTargetId, sessions]);

  const hasLoaded = React.useRef(false);

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

  const showToast = React.useCallback((message: string) => {
    setToast(message);
    setTimeout(() => setToast(null), 2200);
  }, []);

  const load = React.useCallback(async (opts?: { silent?: boolean }) => {
    const shouldLoad = !opts?.silent && !hasLoaded.current;
    if (shouldLoad) setIsLoading(true);
    try {
      // Fetch a bigger window so today/future/recent sections have enough data.
      const rows = await listSessions(200);
      setSessions(rows);
      hasLoaded.current = true;
    } finally {
      if (shouldLoad) setIsLoading(false);
    }
  }, []);

  const onRefresh = React.useCallback(async () => {
    setRefreshing(true);
    try {
      // Run sync (pushes outbox, pulls remote changes)
      try {
        const { runSyncOnce } = await import('@/lib/sync/sync-engine');
        await runSyncOnce();
      } catch (e) {
        // Sync failed (likely offline) - non-fatal, log warning
        console.warn('[activities] sync failed:', e);
      }
      // Always reload from local DB (source of truth)
      await load({ silent: true });
    } catch (e: any) {
      showToast(e?.message ?? 'Refresh failed');
    } finally {
      setRefreshing(false);
    }
  }, [load, showToast]);

  useFocusEffect(
    React.useCallback(() => {
      load();
    }, [load])
  );

  React.useEffect(() => {
    if (params.toast) {
      showToast(params.toast);
      // Clean up the URL so the toast doesn't reappear on reload/re-focus
      router.setParams({ toast: undefined } as any);
    }
  }, [params.toast]);

  const onDelete = (id: string) => {
    setMenuTargetId(null);
    showActionSheet({
      title: 'Delete workout?',
      message: 'This cannot be undone.',
      options: [
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              setDeletingId(id);
              await deleteSession(id);
              setSessions((cur) => cur.filter((x) => x.id !== id));
              await load({ silent: true });
            } catch (e: any) {
              showToast(e?.message ?? 'Delete failed');
            } finally {
              setDeletingId(null);
            }
          },
        },
        { text: 'Cancel', style: 'cancel', onPress: () => {} },
      ],
    });
  };

  const onDuplicate = async (id: string) => {
    setMenuTargetId(null);
    try {
      setDuplicatingId(id);
      await duplicateSession(id);
      await load({ silent: true }); // Reload to show new session
      showToast('Workout duplicated');
    } catch (e: any) {
      showToast(e?.message ?? 'Duplicate failed');
    } finally {
      setDuplicatingId(null);
    }
  };

  const openRename = (id: string) => {
    const s = sessions.find((x) => x.id === id);
    setMenuTargetId(null);
    setRenamingId(id);
    setRenameValue(s?.title ?? '');
  };

  const closeRename = () => {
    setRenamingId(null);
    setRenameValue('');
    setIsSavingRename(false);
  };

  const onSaveRename = async () => {
    if (!renamingId) return;
    const nextTitle = renameValue.trim();
    if (!nextTitle) {
      showToast('Workout name cannot be empty');
      return;
    }
    try {
      setIsSavingRename(true);
      const updated = await updateSessionTitle({ id: renamingId, title: nextTitle });
      setSessions((cur) => cur.map((x) => (x.id === updated.id ? { ...x, title: updated.title } : x)));
      showToast('Workout renamed');
      closeRename();
    } catch (e: any) {
      showToast(e?.message ?? 'Rename failed');
      setIsSavingRename(false);
    }
  };

  const filterActive = React.useMemo(() => isActivitiesFilterActive(filters), [filters]);
  const activeFilterCount = React.useMemo(() => countActiveActivitiesFilters(filters), [filters]);

  const filteredSessions = React.useMemo(() => {
    if (!filterActive) return sessions;

    const qWorkout = filters.workoutQuery.trim().toLowerCase();
    const selectedWorkoutIds = filters.selectedWorkouts.length > 0 ? new Set(filters.selectedWorkouts.map((w) => w.id)) : null;
    const qNotes = filters.notesQuery.trim().toLowerCase();
    const selectedNotes = filters.selectedNotes;
    const requiredTags = filters.selectedTags;
    const selectedExercises = filters.selectedExercises;
    const selectedExerciseKeys = selectedExercises.length > 0 ? new Set(selectedExercises.map(exerciseKey)) : null;

    const now = new Date();
    const todayStart = startOfLocalDay(now);
    const tomorrowStart = startOfLocalDay(new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1));

    let startMs: number | null = null;
    let endExclusiveMs: number | null = null;

    if (filters.datePreset === 'today') {
      startMs = todayStart;
      endExclusiveMs = tomorrowStart;
    } else if (filters.datePreset === 'last7' || filters.datePreset === 'last30') {
      const days = filters.datePreset === 'last7' ? 7 : 30;
      const startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - (days - 1));
      startMs = startOfLocalDay(startDate);
      endExclusiveMs = tomorrowStart;
    } else if (filters.datePreset === 'custom') {
      if (filters.startDate) startMs = startOfLocalDay(filters.startDate);
      if (filters.endDate) {
        const d = filters.endDate;
        endExclusiveMs = startOfLocalDay(new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1));
      }
    }

    const scored = sessions.map((s) => {
      let score = 0;
      let matched = true;

      // Workout name filter: match by selected workouts OR by text query
      if (selectedWorkoutIds) {
        if (!selectedWorkoutIds.has(s.id)) matched = false;
      } else if (qWorkout) {
        const fuzzy = fuzzyMatch(s.title ?? '', qWorkout);
        if (fuzzy.matched) {
          score += fuzzy.score;
        } else {
          matched = false;
        }
      }

      if (!matched) return { s, matched: false, score: 0 };

      const tags = s.tags ?? [];
      if (requiredTags.length > 0) {
        if (!requiredTags.every((t) => tags.includes(t))) matched = false;
      }

      if (!matched) return { s, matched: false, score: 0 };

      const startedMs = new Date(s.started_at).getTime();
      if ((startMs != null || endExclusiveMs != null) && Number.isNaN(startedMs)) matched = false;
      if (startMs != null && startedMs < startMs) matched = false;
      if (endExclusiveMs != null && startedMs >= endExclusiveMs) matched = false;

      if (!matched) return { s, matched: false, score: 0 };

      if (selectedExerciseKeys) {
        let hit = false;
        for (const ex of s.snapshot?.exercises ?? []) {
          if (selectedExerciseKeys.has(exerciseKey(ex.exercise))) {
            hit = true;
            break;
          }
          if (ex.source.type === 'method' && selectedExerciseKeys.has(`method:${ex.source.methodInstanceId}`)) {
            hit = true;
            break;
          }
        }
        if (!hit) matched = false;
      }

      if (!matched) return { s, matched: false, score: 0 };

      // Notes filter: match by selected notes OR by text query
      if (selectedNotes.length > 0) {
        // Check if any of the selected notes belong to this session
        const hasMatchingNote = selectedNotes.some((n) => n.sessionId === s.id);
        if (!hasMatchingNote) matched = false;
      } else if (qNotes) {
        const notesJoined = [
          s.snapshot?.notes ?? '',
          ...(s.snapshot?.exercises ?? []).map((ex) => ex.notes ?? ''),
        ].join(' ');

        const fuzzy = fuzzyMatch(notesJoined, qNotes);
        if (fuzzy.matched) {
          score += fuzzy.score;
        } else {
          matched = false;
        }
      }

      return { s, matched, score };
    });

    const filtered = scored.filter((x) => x.matched);

    if (qWorkout || qNotes) {
      filtered.sort((a, b) => {
        if (a.score !== b.score) return a.score - b.score;
        // Fallback to recency
        return new Date(b.s.started_at).getTime() - new Date(a.s.started_at).getTime();
      });
    }

    return filtered.map((x) => x.s);
  }, [sessions, filters, filterActive]);

  const queryActive = !!(filters.workoutQuery.trim() || filters.notesQuery.trim());
  const { today, future, recent } = React.useMemo(() => bucketSessionsByDay(filteredSessions, queryActive), [filteredSessions, queryActive]);
  const sourceCount = sessions.length;
  const filteredCount = filteredSessions.length;
  const showNoMatches = filterActive && filteredCount === 0;
  const todaySectionTitle = !isLoading && sourceCount === 0 ? 'Your workouts' : 'Today workouts';

  const renderSessionCard = (s: WorkoutSessionRow) => {
    const status = getEffectiveWorkoutSessionStatus(s);
    const exCount = s.snapshot?.exercises?.length ?? 0;
    const isBusy = deletingId === s.id || duplicatingId === s.id;
    return (
      <View key={s.id} style={styles.card}>
        <Pressable
          accessibilityRole="button"
          disabled={isBusy}
          onPress={() => router.push(`/activities/session/${s.id}` as any)}
          style={({ pressed }) => [styles.cardPressable, pressed && styles.cardPressed]}
        >
          <View style={{ flex: 1, gap: 6 }}>
            <View style={styles.cardHeaderRow}>
              <Text style={styles.cardTitle} numberOfLines={1}>
                {s.title}
              </Text>
              <View
                style={[
                  styles.badge,
                  status === 'pending'
                    ? styles.badgeScheduled
                    : status === 'in_progress'
                      ? styles.badgeInProgress
                      : status === 'cancelled'
                        ? styles.badgeCancelled
                        : styles.badgeDone,
                ]}
              >
                <Text style={styles.badgeText}>
                  {status === 'pending'
                    ? 'PENDING'
                    : status === 'in_progress'
                      ? 'IN PROGRESS'
                      : status === 'cancelled'
                        ? 'CANCELLED'
                        : 'DONE'}
                </Text>
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Options"
                disabled={isBusy}
                onPress={() => setMenuTargetId(s.id)}
                hitSlop={10}
                style={({ pressed }) => [styles.iconButton, pressed && !isBusy && { opacity: 0.85 }]}
              >
                <MoreHorizIcon size={24} color={colors.text} />
              </Pressable>
            </View>
            <Text style={styles.cardMeta}>{`${formatDate(s.started_at)} • ${exCount} exercise${exCount === 1 ? '' : 's'}`}</Text>
          </View>
        </Pressable>

        {s.tags && s.tags.length > 0 ? (
          <View style={styles.cardTags} pointerEvents="none">
            {s.tags.slice(0, 3).map((tag) => (
              <WorkoutTagIcon key={tag} tag={tag} size={16} color={rgba(colors.text, 0.7)} />
            ))}
          </View>
        ) : null}

        {isBusy ? (
          <View style={styles.cardOverlay} pointerEvents="none">
            <ActivityIndicator color={colors.primary} />
          </View>
        ) : null}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.content}>
        <ScrollView
          contentContainerStyle={styles.container}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.primary}
              colors={[colors.onPrimary]}
              progressBackgroundColor={colors.primary}
            />
          }
        >
          <View style={styles.titleRow}>
            <Text style={styles.title}>Activities</Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Filter workouts"
              onPress={() => setFiltersOpen(true)}
              hitSlop={10}
              style={({ pressed }) => [styles.filterButton, pressed && { opacity: 0.85 }]}
            >
              <View style={styles.filterButtonInner}>
                <FilterIcon size={22} color={colors.text} strokeWidth={1.7} />
                {activeFilterCount > 0 ? (
                  <View style={styles.filterBadge}>
                    <Text style={styles.filterBadgeText}>{activeFilterCount}</Text>
                  </View>
                ) : null}
              </View>
            </Pressable>
          </View>

          <View style={[styles.section, ((!isLoading && sourceCount === 0) || showNoMatches) && styles.sectionFill]}>
            {!showNoMatches && <Text style={styles.sectionTitle}>{queryActive ? 'Search results' : todaySectionTitle}</Text>}
            {isLoading ? (
              <WorkoutsSkeleton />
            ) : sourceCount === 0 ? (
              <View style={styles.emptyStateContent}>
                <Text style={styles.body}>No workouts yet. Start your first session to see it here.</Text>
                <View style={styles.emptyIllustrationWrapper}>
                  <Image source={DrinkWaterIllustration} style={styles.emptyImage} resizeMode="contain" />
                </View>
              </View>
            ) : showNoMatches ? (
              <View style={styles.noMatchesContent}>
                <Text style={styles.noMatchesTitle}>No workouts found</Text>
                <Text style={styles.noMatchesBody}>
                  No workouts match your current filters. Try adjusting or clearing your filters to see more results.
                </Text>
                <View style={styles.noMatchesIllustrationWrapper}>
                  <Image source={DrinkWaterIllustration} style={styles.noMatchesImage} resizeMode="contain" />
                </View>
              </View>
            ) : queryActive ? (
              <View style={styles.list}>{filteredSessions.map(renderSessionCard)}</View>
            ) : today.length === 0 ? (
              <Text style={styles.body}>No workouts logged today.</Text>
            ) : (
              <View style={styles.list}>{today.map(renderSessionCard)}</View>
            )}
          </View>

          {!isLoading && sourceCount > 0 && !showNoMatches && !queryActive ? (
            <>
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Future workouts</Text>
                {future.length === 0 ? (
                  <Text style={styles.body}>No future workouts.</Text>
                ) : (
                  <View style={styles.list}>{future.map(renderSessionCard)}</View>
                )}
              </View>

              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Recent workouts</Text>
                {recent.length === 0 ? (
                  <Text style={styles.body}>No recent workouts.</Text>
                ) : (
                  <View style={styles.list}>{recent.map(renderSessionCard)}</View>
                )}
              </View>
            </>
          ) : null}
        </ScrollView>

        <View style={styles.footer}>
          <Pressable
            accessibilityRole="button"
            onPress={() => router.push('/activities/start' as any)}
            style={({ pressed }) => [styles.primaryButton, pressed && styles.pressed]}
          >
            <PlayIcon size={20} color={colors.onPrimary} strokeWidth={1.5} />
            <Text style={styles.primaryButtonText}>Start workout</Text>
          </Pressable>
        </View>
      </View>

      <Modal visible={!!menuTargetId} transparent animationType="fade" onRequestClose={() => setMenuTargetId(null)}>
        <Pressable style={styles.modalBackdrop} onPress={() => setMenuTargetId(null)}>
          <View style={styles.menuSheet} onStartShouldSetResponder={() => true}>
            <Text style={styles.menuTitle} numberOfLines={1}>
              {menuTarget?.title ?? 'Workout'}
            </Text>

            <Pressable
              accessibilityRole="button"
              style={({ pressed }) => [styles.menuItem, pressed && styles.menuItemPressed]}
              onPress={() => menuTargetId && openRename(menuTargetId)}
            >
              <CharacterIcon size={20} color={colors.text} />
              <Text style={styles.menuItemText}>Rename Workout</Text>
            </Pressable>

            <View style={styles.menuSeparator} />

            <Pressable
              accessibilityRole="button"
              style={({ pressed }) => [styles.menuItem, pressed && styles.menuItemPressed]}
              onPress={() => {
                if (!menuTargetId) return;
                const id = menuTargetId;
                setMenuTargetId(null);

                const setStatus = async (nextStatus: WorkoutSessionStatus) => {
                  try {
                    const updated = await updateSessionStatus({ id, status: nextStatus });
                    setSessions((cur) => cur.map((x) => (x.id === updated.id ? updated : x)));
                    showToast('Status updated');
                  } catch (e: any) {
                    showToast(e?.message ?? 'Status update failed');
                  }
                };

                showActionSheet({
                  title: 'Modify status',
                  options: [
                    {
                      text: 'Pending',
                      onPress: () => setStatus('pending'),
                      tint: { backgroundColor: 'rgba(59, 130, 246, 0.16)', borderColor: 'rgba(59, 130, 246, 0.45)', textColor: colors.text },
                    },
                    {
                      text: 'In progress',
                      onPress: () => setStatus('in_progress'),
                      tint: { backgroundColor: 'rgba(255, 214, 0, 0.10)', borderColor: 'rgba(255, 214, 0, 0.35)', textColor: colors.text },
                    },
                    {
                      text: 'Done',
                      onPress: () => setStatus('done'),
                      tint: { backgroundColor: 'rgba(70, 255, 150, 0.08)', borderColor: 'rgba(70, 255, 150, 0.25)', textColor: colors.text },
                    },
                    {
                      text: 'Cancelled',
                      onPress: () => setStatus('cancelled'),
                      tint: { backgroundColor: rgba(colors.accentRed, 0.12), borderColor: rgba(colors.accentRed, 0.35), textColor: colors.text },
                    },
                    { text: 'Cancel', style: 'cancel', onPress: () => {} },
                  ],
                });
              }}
            >
              <StatusIcon size={20} color={colors.text} />
              <Text style={styles.menuItemText}>Modify status</Text>
            </Pressable>

            <View style={styles.menuSeparator} />

            <Pressable
              accessibilityRole="button"
              style={({ pressed }) => [styles.menuItem, pressed && styles.menuItemPressed]}
              onPress={() => menuTargetId && onDuplicate(menuTargetId)}
            >
              <DuplicateIcon size={20} color={colors.text} />
              <Text style={styles.menuItemText}>Duplicate Workout</Text>
            </Pressable>

            <View style={styles.menuSeparator} />

            <Pressable
              accessibilityRole="button"
              style={({ pressed }) => [styles.menuItem, pressed && styles.menuItemPressed]}
              onPress={() => menuTargetId && onDelete(menuTargetId)}
            >
              <TrashIcon size={20} color={colors.accentRed} />
              <Text style={[styles.menuItemText, { color: colors.accentRed }]}>Remove Workout</Text>
            </Pressable>
          </View>
        </Pressable>
      </Modal>

      <Modal visible={!!renamingId} transparent animationType="fade" onRequestClose={closeRename}>
        <Pressable style={styles.modalBackdrop} onPress={closeRename}>
          <View style={styles.renameCard} onStartShouldSetResponder={() => true}>
            <View style={styles.renameHeader}>
              <Text style={styles.renameTitle}>Rename workout</Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Close"
                onPress={closeRename}
                hitSlop={10}
                style={({ pressed }) => [styles.renameClose, pressed && { opacity: 0.8 }]}
              >
                <XIcon size={18} color={colors.text} />
              </Pressable>
            </View>

            <TextInput
              value={renameValue}
              onChangeText={setRenameValue}
              placeholder="Workout name"
              placeholderTextColor={rgba(colors.text, 0.5)}
              autoFocus
              returnKeyType="done"
              onSubmitEditing={onSaveRename}
              editable={!isSavingRename}
              style={styles.renameInput}
            />

            <View style={styles.renameActionsRow}>
              <Pressable
                accessibilityRole="button"
                onPress={closeRename}
                disabled={isSavingRename}
                style={({ pressed }) => [styles.secondaryButton, pressed && !isSavingRename && styles.pressed, { flex: 1 }]}
              >
                <Text style={styles.secondaryButtonText}>Cancel</Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                onPress={onSaveRename}
                disabled={isSavingRename}
                style={({ pressed }) => [styles.primaryButton, (pressed || isSavingRename) && styles.pressed, { flex: 1 }]}
              >
                <Text style={styles.primaryButtonText}>{isSavingRename ? 'Saving…' : 'Save'}</Text>
              </Pressable>
            </View>
          </View>
        </Pressable>
      </Modal>

      <ActionSheet
        visible={actionSheetVisible}
        title={actionSheetConfig.title}
        message={actionSheetConfig.message}
        options={actionSheetConfig.options}
        onClose={() => setActionSheetVisible(false)}
      />

      <ActivitiesFilterSheet
        visible={filtersOpen}
        filters={filters}
        matchCount={filteredCount}
        sessions={sessions}
        onChange={(patch) => setFilters((cur) => ({ ...cur, ...patch }))}
        onClear={() => setFilters(DEFAULT_FILTERS)}
        onClose={() => setFiltersOpen(false)}
      />

      <Toast 
        message={toast || ''} 
        visible={!!toast} 
        onHide={() => setToast(null)} 
      />
    </SafeAreaView>
  );
}

const createStyles = (colors: TrenaColorPalette) =>
  StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    flex: 1,
  },
  container: {
    paddingHorizontal: 20,
    paddingVertical: 24,
    gap: 14,
    flexGrow: 1,
  },
  title: {
    fontSize: 34,
    lineHeight: 40,
    fontFamily: Fonts.extraBold,
    color: colors.text,
    letterSpacing: -0.3,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  filterButton: {
    padding: 6,
  },
  filterButtonInner: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: rgba(colors.text, 0.12),
    backgroundColor: rgba(colors.text, 0.04),
  },
  filterBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    minWidth: 18,
    height: 18,
    borderRadius: 999,
    paddingHorizontal: 5,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.25)',
  },
  filterBadgeText: {
    fontFamily: Fonts.black,
    fontSize: 11,
    color: colors.onPrimary,
    lineHeight: 12,
  },
  section: {
    gap: 10,
    paddingTop: 6,
  },
  sectionFill: {
    flex: 1,
  },
  sectionTitle: {
    fontFamily: Fonts.bold,
    fontSize: 18,
    lineHeight: 22,
    color: colors.text,
    letterSpacing: -0.2,
  },
  body: {
    color: rgba(colors.text, 0.8),
    fontFamily: Fonts.regular,
    fontSize: 14,
    lineHeight: 20,
  },
  emptyState: {
    // kept for compatibility if reused elsewhere
  },
  emptyStateContent: {
    flex: 1,
    justifyContent: 'center',
    gap: 12,
  },
  emptyImage: {
    width: '100%',
    maxWidth: 380,
    height: 320,
  },
  emptyIllustrationWrapper: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
    paddingHorizontal: 8,
  },
  noMatchesContent: {
    flex: 1,
    justifyContent: 'center',
    gap: 8,
  },
  noMatchesTitle: {
    fontFamily: Fonts.bold,
    fontSize: 16,
    color: colors.text,
  },
  noMatchesBody: {
    color: rgba(colors.text, 0.7),
    fontFamily: Fonts.regular,
    fontSize: 14,
    lineHeight: 20,
  },
  noMatchesIllustrationWrapper: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
    paddingHorizontal: 8,
    marginTop: 8,
  },
  noMatchesImage: {
    width: '100%',
    maxWidth: 320,
    height: 260,
  },
  ctaRow: {
    flexDirection: 'row',
    gap: 10,
    flexWrap: 'wrap',
  },
  primaryButton: {
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    columnGap: 8,
    backgroundColor: colors.primary,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(0, 0, 0, 0.25)',
    width: '100%',
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
    minWidth: 110,
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
  list: {
    gap: 12,
  },
  card: {
    position: 'relative',
    borderWidth: 1,
    borderColor: rgba(colors.text, 0.12),
    backgroundColor: colors.surface,
    padding: 12,
    borderRadius: 14,
    flexDirection: 'row',
    gap: 12,
    ...Shadows.small,
  },
  cardPressable: {
    flex: 1,
  },
  cardPressed: {
    opacity: 0.92,
  },
  cardOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(20, 20, 17, 0.55)',
    borderRadius: 14,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  cardTitle: {
    fontFamily: Fonts.bold,
    fontSize: 16,
    lineHeight: 20,
    color: colors.text,
    flex: 1,
  },
  cardMeta: {
    fontFamily: Fonts.medium,
    fontSize: 12,
    lineHeight: 16,
    color: rgba(colors.text, 0.75),
  },
  cardTags: {
    position: 'absolute',
    right: 12,
    bottom: 10,
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
    opacity: 0.95,
  },
  badge: {
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
  },
  badgeInProgress: {
    borderColor: 'rgba(255, 214, 0, 0.35)',
    backgroundColor: 'rgba(255, 214, 0, 0.10)',
  },
  badgeDone: {
    borderColor: 'rgba(70, 255, 150, 0.25)',
    backgroundColor: 'rgba(70, 255, 150, 0.08)',
  },
  badgeScheduled: {
    borderColor: 'rgba(59, 130, 246, 0.45)',
    backgroundColor: 'rgba(59, 130, 246, 0.16)',
  },
  badgeCancelled: {
    borderColor: rgba(colors.accentRed, 0.35),
    backgroundColor: rgba(colors.accentRed, 0.12),
  },
  badgeText: {
    fontFamily: Fonts.medium,
    fontSize: 10,
    lineHeight: 12,
    letterSpacing: 0.5,
    color: rgba(colors.text, 0.85),
  },

  iconButton: {
    padding: 4,
  },
  footer: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 16,
    backgroundColor: colors.background,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'flex-end',
  },
  menuSheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingVertical: 10,
    paddingHorizontal: 16,
    paddingBottom: 16, // Safe area hint
  },
  menuTitle: {
    fontFamily: Fonts.semiBold,
    fontSize: 14,
    color: rgba(colors.text, 0.6),
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
    color: colors.text,
  },
  menuSeparator: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: rgba(colors.text, 0.1),
  },

  renameCard: {
    marginHorizontal: 16,
    marginBottom: 24,
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: rgba(colors.text, 0.12),
    padding: 16,
    gap: 12,
  },
  renameHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  renameTitle: {
    fontFamily: Fonts.extraBold,
    fontSize: 16,
    color: colors.text,
  },
  renameClose: {
    padding: 6,
  },
  renameInput: {
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
  renameActionsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  });
