import { router, useFocusEffect } from 'expo-router';
import React, { useCallback, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

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
  VideoIcon,
  YogaIcon,
} from '@/components/icons';
import { PlayIcon } from '@/components/icons/PlayIcon';
import { TodaySkeleton } from '@/components/TodaySkeleton';
import { Fonts, rgba, Shadows, TrenaColorPalette } from '@/constants/theme';
import { useHaptics } from '@/hooks/use-haptics';
import { useTrenaTheme } from '@/hooks/use-theme-context';
import { listSessions } from '@/lib/workouts/repo';
import { countCompletedSessionsThisWeek } from '@/lib/workouts/stats';
import type { WorkoutTag } from '@/lib/workouts/tags';
import type { WorkoutSessionRow } from '@/lib/workouts/types';

const PROGRAM_THRESHOLD_MS = 15 * 60 * 1000; // keep consistent with Activities / session screen

function safeTime(iso: string): number | null {
  const t = new Date(iso).getTime();
  return Number.isNaN(t) ? null : t;
}

function startOfLocalDayMs(d: Date): number {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}

function formatWhen(iso: string): string {
  const t = safeTime(iso);
  if (t == null) return iso;
  const d = new Date(t);
  const now = new Date();
  const dayDiff = Math.floor((startOfLocalDayMs(now) - startOfLocalDayMs(d)) / (24 * 60 * 60 * 1000));
  if (dayDiff === 0) return d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
  if (dayDiff === 1) return `Yesterday • ${d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}`;
  if (dayDiff < 7 && dayDiff > 1) return `${dayDiff}d ago`;
  return d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
}

function formatDateTimeCompact(iso: string): string {
  const t = safeTime(iso);
  if (t == null) return iso;
  const d = new Date(t);
  return d.toLocaleString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatDate(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
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

function isScheduledSession(s: WorkoutSessionRow): boolean {
  const startedMs = safeTime(s.started_at);
  if (startedMs == null) return false;
  return !s.ended_at && startedMs > Date.now() + PROGRAM_THRESHOLD_MS;
}

function isInProgressSession(s: WorkoutSessionRow): boolean {
  return !s.ended_at && !isScheduledSession(s);
}

function startOfWeekMondayMs(d: Date): number {
  // Local time, Monday-first.
  const startOfToday = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const day = startOfToday.getDay(); // 0=Sun..6=Sat
  const offset = (day + 6) % 7; // monday -> 0, sunday -> 6
  return new Date(startOfToday.getFullYear(), startOfToday.getMonth(), startOfToday.getDate() - offset).getTime();
}

function computeWorkoutStreakWeeks(completed: Array<Pick<WorkoutSessionRow, 'ended_at'>>): number {
  // "Current streak" anchored to current week if any workout this week, otherwise last week.
  const weekSet = new Set<number>();
  for (const s of completed) {
    if (!s.ended_at) continue;
    const t = safeTime(s.ended_at);
    if (t == null) continue;
    weekSet.add(startOfWeekMondayMs(new Date(t)));
  }

  const now = new Date();
  const thisWeek = startOfWeekMondayMs(now);
  const lastWeek = thisWeek - 7 * 24 * 60 * 60 * 1000;
  let cursor = weekSet.has(thisWeek) ? thisWeek : weekSet.has(lastWeek) ? lastWeek : null;
  if (cursor == null) return 0;

  let streak = 0;
  while (weekSet.has(cursor)) {
    streak += 1;
    cursor -= 7 * 24 * 60 * 60 * 1000;
  }
  return streak;
}

export default function TodayScreen() {
  const { colors } = useTrenaTheme();
  const haptics = useHaptics();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [sessions, setSessions] = useState<WorkoutSessionRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const openSessionFromToday = useCallback((id: string) => {
    // Back handling is done by the Activities stack header for the session screen.
    haptics.light();
    router.push(`/activities/session/${id}` as any);
  }, [haptics]);

  const load = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const rows = await listSessions(200);
      setSessions(rows);
    } catch (e: any) {
      setError(e?.message ?? 'Failed to load.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const derived = useMemo(() => {
    const inProgress = sessions.find(isInProgressSession) ?? null;
    const nextScheduled = sessions
      .filter(isScheduledSession)
      .slice()
      .sort((a, b) => (safeTime(a.started_at) ?? 0) - (safeTime(b.started_at) ?? 0))[0] ?? null;

    const completed = sessions.filter((s) => Boolean(s.ended_at));
    const lastCompleted =
      completed
        .slice()
        .sort((a, b) => (safeTime(b.ended_at || b.started_at) ?? 0) - (safeTime(a.ended_at || a.started_at) ?? 0))[0] ??
      null;

    const sevenDaysAgoMs = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const recent7d = completed
      .filter((s) => {
        const t = safeTime(s.ended_at ?? s.started_at);
        return t != null && t >= sevenDaysAgoMs;
      })
      .slice()
      .sort((a, b) => (safeTime(b.ended_at || b.started_at) ?? 0) - (safeTime(a.ended_at || a.started_at) ?? 0));

    const workoutsThisWeek = countCompletedSessionsThisWeek({ sessions, weekStart: 'monday' });
    const streakWeeks = computeWorkoutStreakWeeks(completed);

    return { inProgress, nextScheduled, lastCompleted, recent7d, workoutsThisWeek, streakWeeks, total: sessions.length };
  }, [sessions]);

  const nextUp = useMemo(() => {
    if (derived.inProgress) {
      return {
        kind: 'in_progress' as const,
        session: derived.inProgress,
        title: derived.inProgress.title,
        subtitle: 'In progress',
        cta: 'Continue workout',
        onPress: () => openSessionFromToday(derived.inProgress!.id),
      };
    }
    if (derived.nextScheduled) {
      return {
        kind: 'scheduled' as const,
        session: derived.nextScheduled,
        title: derived.nextScheduled.title,
        subtitle: `Scheduled • ${formatWhen(derived.nextScheduled.started_at)}`,
        cta: 'Open workout',
        onPress: () => openSessionFromToday(derived.nextScheduled!.id),
      };
    }
    return {
      kind: 'none' as const,
      session: null,
      title: 'Start a workout',
      subtitle: derived.total === 0 ? 'Your first one can be simple.' : 'Ready when you are.',
      cta: 'Start workout',
      onPress: () => {
        haptics.light();
        router.push('/activities/start' as any);
      },
    };
  }, [derived.inProgress, derived.nextScheduled, derived.total, openSessionFromToday, haptics]);

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>Today</Text>

        {isLoading ? (
          <TodaySkeleton />
        ) : error ? (
          <View style={styles.notice}>
            <Text style={styles.noticeTitle}>Couldn’t load Today</Text>
            <Text style={styles.body}>{error}</Text>
            <Pressable
              accessibilityRole="button"
              onPress={load}
              style={({ pressed }) => [styles.secondaryButton, pressed && styles.pressed]}
            >
              <Text style={styles.secondaryButtonText}>Try again</Text>
            </Pressable>
          </View>
        ) : (
          <>
            <View style={styles.cardsRow}>
              <View style={[styles.card, { backgroundColor: colors.tertiary }]}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  <CalendarIcon size={14} color={colors.onTertiary} />
                  <Text style={[styles.cardLabel, styles.cardTextOnTertiary]}>Workouts</Text>
                </View>
                <Text style={[styles.cardValue, styles.cardTextOnTertiary]}>{derived.workoutsThisWeek}</Text>
                <Text style={[styles.cardHint, styles.cardTextOnTertiary]}>this week</Text>
              </View>
              <View style={[styles.card, { backgroundColor: colors.secondary }]}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  <FireIcon size={14} color={colors.onSecondary} />
                  <Text style={[styles.cardLabel, styles.cardTextOnSecondary]}>Streak</Text>
                </View>
                <Text style={[styles.cardValue, styles.cardTextOnSecondary]}>{derived.streakWeeks}</Text>
                <Text style={[styles.cardHint, styles.cardTextOnSecondary]}>
                  week{derived.streakWeeks === 1 ? '' : 's'}
                </Text>
              </View>
            </View>

            <View style={styles.nextUpCard}>
              <View style={styles.nextUpHeaderRow}>
                <Text style={styles.nextUpEyebrow}>Next up</Text>
                <View
                  style={[
                    styles.nextUpBadge,
                    nextUp.kind === 'in_progress'
                      ? styles.badgeInProgress
                      : nextUp.kind === 'scheduled'
                        ? styles.badgeScheduled
                        : styles.badgeReady,
                  ]}
                >
                  <Text style={styles.nextUpBadgeText}>
                    {nextUp.kind === 'in_progress' ? 'IN PROGRESS' : nextUp.kind === 'scheduled' ? 'SCHEDULED' : 'READY'}
                  </Text>
                </View>
              </View>

              <Text style={styles.nextUpTitle} numberOfLines={1}>
                {nextUp.title}
              </Text>
              <Text style={styles.nextUpBody}>{nextUp.subtitle}</Text>

              <Pressable
                accessibilityRole="button"
                accessibilityLabel={nextUp.cta}
                onPress={nextUp.onPress}
                style={({ pressed }) => [styles.primaryButton, pressed && styles.pressed]}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <PlayIcon size={16} color={colors.onPrimary} />
                  <Text style={styles.primaryButtonText}>{nextUp.cta}</Text>
                </View>
              </Pressable>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Recent (last 7 days)</Text>
              {derived.recent7d.length === 0 ? (
                <Text style={styles.body}>No workouts in the last 7 days.</Text>
              ) : (
                <View style={styles.list}>
                  {derived.recent7d.map((s) => {
                    const exCount = s.snapshot?.exercises?.length ?? 0;
                    const dateIso = s.ended_at ?? s.started_at;
                    return (
                      <View key={s.id} style={styles.sessionCard}>
                        <Pressable
                          accessibilityRole="button"
                          accessibilityLabel={`Open workout ${s.title}`}
                          onPress={() => openSessionFromToday(s.id)}
                          style={({ pressed }) => [styles.sessionCardPressable, pressed && styles.sessionCardPressed]}
                        >
                          <View style={{ flex: 1, gap: 6 }}>
                            <View style={styles.sessionCardHeaderRow}>
                              <Text style={styles.sessionCardTitle} numberOfLines={1}>
                                {s.title?.trim() ? s.title : 'Workout'}
                              </Text>
                              <View style={[styles.sessionBadge, styles.sessionBadgeDone]}>
                                <Text style={styles.sessionBadgeText}>DONE</Text>
                              </View>
                            </View>
                            <Text style={styles.sessionCardMeta}>
                              {`${formatDate(dateIso)} • ${exCount} exercise${exCount === 1 ? '' : 's'}`}
                            </Text>
                          </View>
                        </Pressable>

                        {s.tags && s.tags.length > 0 ? (
                          <View style={styles.sessionCardTags} pointerEvents="none">
                            {s.tags.slice(0, 3).map((tag) => (
                              <WorkoutTagIcon key={tag} tag={tag} size={16} color={rgba(colors.text, 0.7)} />
                            ))}
                          </View>
                        ) : null}
                      </View>
                    );
                  })}
                </View>
              )}
            </View>

            {derived.total === 0 ? (
              <View style={styles.notice}>
                <Text style={styles.noticeTitle}>No workouts yet</Text>
                <Text style={styles.body}>Once you log workouts, you’ll see your recent activity and insights here.</Text>
              </View>
            ) : null}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const createStyles = (colors: TrenaColorPalette) =>
  StyleSheet.create({
    safe: {
      flex: 1,
      backgroundColor: colors.background,
    },
    container: {
      paddingHorizontal: 20,
      paddingVertical: 24,
      gap: 16,
      paddingBottom: 32,
    },
    title: {
      fontSize: 34,
      lineHeight: 40,
      fontFamily: Fonts.extraBold,
      color: colors.text,
      letterSpacing: -0.3,
    },
    body: {
      color: rgba(colors.text, 0.8),
      fontFamily: Fonts.regular,
      fontSize: 14,
      lineHeight: 20,
    },
    loadingRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      paddingVertical: 6,
    },
    notice: {
      backgroundColor: rgba(colors.text, 0.08),
      borderRadius: 18,
      padding: 16,
      gap: 10,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: rgba(colors.text, 0.12),
    },
    noticeTitle: {
      color: colors.text,
      fontSize: 16,
      fontFamily: Fonts.extraBold,
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
      borderColor: rgba(colors.onSurface, 0.2),
      gap: 6,
      ...Shadows.small,
    },
    cardLabel: {
      color: colors.text,
      fontSize: 12,
      fontFamily: Fonts.extraBold,
      textTransform: 'uppercase',
      letterSpacing: 0.6,
    },
    cardValue: {
      color: colors.text,
      fontSize: 28,
      fontFamily: Fonts.black,
      letterSpacing: -0.2,
    },
    cardHint: {
      color: rgba(colors.text, 0.75),
      fontSize: 12,
      fontFamily: Fonts.semiBold,
    },
    cardTextOnTertiary: {
      color: colors.onTertiary,
    },
    cardTextOnSecondary: {
      color: colors.onSecondary,
    },
    // removed: quick actions block
    section: {
      gap: 10,
      paddingTop: 6,
    },
    sectionTitle: {
      fontFamily: Fonts.bold,
      fontSize: 18,
      lineHeight: 22,
      color: colors.text,
      letterSpacing: -0.2,
    },
    list: {
      gap: 12,
    },
    sessionCard: {
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
    sessionCardPressable: {
      flex: 1,
    },
    sessionCardPressed: {
      opacity: 0.92,
    },
    sessionCardHeaderRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 10,
    },
    sessionCardTitle: {
      fontFamily: Fonts.bold,
      fontSize: 16,
      lineHeight: 20,
      color: colors.text,
      flex: 1,
    },
    sessionCardMeta: {
      fontFamily: Fonts.medium,
      fontSize: 12,
      lineHeight: 16,
      color: rgba(colors.text, 0.75),
    },
    sessionCardTags: {
      position: 'absolute',
      right: 12,
      bottom: 10,
      flexDirection: 'row',
      gap: 8,
      alignItems: 'center',
      opacity: 0.95,
    },
    sessionBadge: {
      borderWidth: 1,
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 999,
    },
    sessionBadgeDone: {
      borderColor: 'rgba(70, 255, 150, 0.25)',
      backgroundColor: 'rgba(70, 255, 150, 0.08)',
    },
    sessionBadgeText: {
      fontFamily: Fonts.medium,
      fontSize: 10,
      lineHeight: 12,
      letterSpacing: 0.5,
      color: rgba(colors.text, 0.85),
    },
    nextUpCard: {
      backgroundColor: colors.surface,
      borderRadius: 18,
      padding: 16,
      gap: 10,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: rgba(colors.text, 0.12),
      ...Shadows.small,
    },
    nextUpHeaderRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 12,
    },
    nextUpEyebrow: {
      fontFamily: Fonts.extraBold,
      fontSize: 12,
      color: rgba(colors.text, 0.6),
      textTransform: 'uppercase',
      letterSpacing: 0.6,
    },
    nextUpBadge: {
      borderWidth: 1,
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 999,
    },
    badgeInProgress: {
      borderColor: 'rgba(255, 214, 0, 0.35)',
      backgroundColor: 'rgba(255, 214, 0, 0.10)',
    },
    badgeScheduled: {
      borderColor: 'rgba(59, 130, 246, 0.45)',
      backgroundColor: 'rgba(59, 130, 246, 0.16)',
    },
    badgeReady: {
      borderColor: rgba(colors.text, 0.16),
      backgroundColor: rgba(colors.text, 0.06),
    },
    nextUpBadgeText: {
      fontFamily: Fonts.medium,
      fontSize: 10,
      lineHeight: 12,
      letterSpacing: 0.5,
      color: rgba(colors.text, 0.85),
    },
    nextUpTitle: {
      color: colors.text,
      fontSize: 20,
      lineHeight: 24,
      fontFamily: Fonts.black,
      letterSpacing: -0.2,
    },
    nextUpBody: {
      color: rgba(colors.text, 0.8),
      fontSize: 14,
      lineHeight: 20,
      fontFamily: Fonts.regular,
    },
    primaryButton: {
      marginTop: 4,
      borderRadius: 14,
      paddingVertical: 14,
      alignItems: 'center',
      backgroundColor: colors.primary,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: 'rgba(0, 0, 0, 0.25)',
    },
    primaryButtonText: {
      color: colors.onPrimary,
      fontSize: 16,
      fontFamily: Fonts.extraBold,
    },
    secondaryButton: {
      marginTop: 4,
      borderRadius: 14,
      paddingVertical: 14,
      alignItems: 'center',
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
  });

