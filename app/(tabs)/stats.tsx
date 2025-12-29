import { ExerciseProgressChart } from '@/components/stats/ExerciseProgressChart';
import { GroupedHorizontalBars } from '@/components/stats/GroupedHorizontalBars';
import { StatsSkeleton } from '@/components/stats/StatsSkeleton';
import { WeekdayHistogram } from '@/components/stats/WeekdayHistogram';
import { Fonts, rgba } from '@/constants/theme';
import { useTrenaTheme } from '@/hooks/use-theme-context';
import { getMethodInstancesByIds, listCompletedSessionsForStats } from '@/lib/workouts/repo';
import { bilboCyclesSeries, computeExerciseStats, countCompletedSessions, countCompletedSessionsThisWeek, weekdayHistogram } from '@/lib/workouts/stats';
import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function StatsScreen() {
  const { colors } = useTrenaTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sessions, setSessions] = useState<any[]>([]);
  const [containerWidth, setContainerWidth] = useState<number>(0);

  const [methodNameById, setMethodNameById] = useState<Record<string, string>>({});
  const bilboSeries = useMemo(() => bilboCyclesSeries({ sessions: sessions as any }), [sessions]);
  const [selectedBilboMethodId, setSelectedBilboMethodId] = useState<string | null>(null);

  const exerciseStats = useMemo(() => computeExerciseStats({ sessions: sessions as any }), [sessions]);
  const [selectedExerciseKey, setSelectedExerciseKey] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        setError(null);
        const rows = await listCompletedSessionsForStats({ max: 5000, pageSize: 500 });
        if (cancelled) return;
        setSessions(rows as any);
      } catch (e: any) {
        if (cancelled) return;
        setError(e?.message ?? 'Failed to load stats.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    // Default selection + resolve method instance names
    if (!bilboSeries.length) return;
    if (!selectedBilboMethodId) setSelectedBilboMethodId(bilboSeries[0]!.methodInstanceId);

    const ids = bilboSeries.map((x) => x.methodInstanceId);
    (async () => {
      try {
        const map = await getMethodInstancesByIds(ids);
        const names: Record<string, string> = {};
        for (const id of ids) {
          const mi = map.get(id);
          if (mi?.name) names[id] = mi.name;
        }
        setMethodNameById((prev) => ({ ...prev, ...names }));
      } catch {
        // non-fatal
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bilboSeries.length]);

  const totalWorkouts = useMemo(() => countCompletedSessions(sessions as any), [sessions]);
  const workoutsThisWeek = useMemo(
    () => countCompletedSessionsThisWeek({ sessions: sessions as any, weekStart: 'monday' }),
    [sessions],
  );
  const weekday = useMemo(
    () => weekdayHistogram({ sessions: sessions as any, order: 'monday_first', field: 'started_at' }),
    [sessions],
  );

  const selectedBilbo = useMemo(
    () => bilboSeries.find((x) => x.methodInstanceId === selectedBilboMethodId) ?? null,
    [bilboSeries, selectedBilboMethodId],
  );

  const selectedExercise = useMemo(
    () => exerciseStats.find((s) => s.exerciseKey === selectedExerciseKey) ?? null,
    [exerciseStats, selectedExerciseKey],
  );

  const bilboChartModel = useMemo(() => {
    if (!selectedBilbo) return null;
    const maxN = Math.max(1, selectedBilbo.maxSessionIndexInCycle);
    const yLabels = Array.from({ length: maxN }, (_, i) => String(i + 1));

    // Keep it readable: show last 4 cycles by default.
    const cyclesToShow = selectedBilbo.cycles.slice(-4);
    const palette = [colors.secondary, colors.primary, colors.tertiary, colors.accentRed];

    const series = cyclesToShow.map((c, idx) => {
      const values = Array.from({ length: maxN }, () => null as number | null);
      for (const s of c.sessions) {
        const i = s.sessionIndexInCycle - 1;
        if (i >= 0 && i < values.length) values[i] = s.reps;
      }
      return {
        key: `cycle_${c.cycleIndex}`,
        label: `C${c.cycleIndex}`,
        color: palette[idx % palette.length],
        values,
      };
    });

    const maxValue = Math.max(1, selectedBilbo.maxReps);
    return { yLabels, series, maxValue };
  }, [colors.accentRed, colors.primary, colors.secondary, colors.tertiary, selectedBilbo]);

  const chartW = Math.max(0, containerWidth - 32);
  const histH = 170;
  const bilboH = bilboChartModel ? Math.min(520, 60 + bilboChartModel.yLabels.length * 40) : 240;
  const todayIdx = (new Date().getDay() + 6) % 7; // monday-first 0..6

  function formatDateRelative(iso: string) {
    const d = new Date(iso);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays}d ago`;
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>Workout Stats</Text>

        {loading ? (
          <StatsSkeleton />
        ) : error ? (
          <View style={styles.notice}>
            <Text style={styles.noticeTitle}>Couldn’t load stats</Text>
            <Text style={styles.body}>{error}</Text>
          </View>
        ) : (
          <>
            <View style={styles.cardsRow}>
              <View style={[styles.card, { backgroundColor: colors.tertiary }]}>
                <Text style={[styles.cardLabel, styles.cardTextOnTertiary]}>Workouts</Text>
                <Text style={[styles.cardValue, styles.cardTextOnTertiary]}>{workoutsThisWeek}</Text>
                <Text style={[styles.cardHint, styles.cardTextOnTertiary]}>this week</Text>
              </View>
              <View style={[styles.card, { backgroundColor: colors.secondary }]}>
                <Text style={styles.cardLabel}>Total</Text>
                <Text style={styles.cardValue}>{totalWorkouts}</Text>
                <Text style={styles.cardHint}>workouts done</Text>
              </View>
            </View>

            <View
              style={styles.sectionCard}
              onLayout={(e) => setContainerWidth(e.nativeEvent.layout.width)}
            >
              <Text style={styles.sectionTitle}>Workouts by weekday</Text>
              <Text style={styles.sectionBody}>Histogram (bars) + density (line)</Text>
              {chartW > 0 ? (
                <WeekdayHistogram
                  width={chartW}
                  height={histH}
                  counts={weekday.counts}
                  density={weekday.density}
                  labels={['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']}
                  highlightIndex={todayIdx}
                />
              ) : null}
            </View>

            <View style={styles.sectionCard}>
              <Text style={styles.sectionTitle}>Exercise Progress</Text>
              <Text style={styles.sectionBody}>Estimated 1RM (Epley formula) and history. Click on an exercise to view details.</Text>

              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.pillsRow}>
                {exerciseStats.map((s) => {
                  const selected = s.exerciseKey === selectedExerciseKey;
                  return (
                    <Pressable
                      key={s.exerciseKey}
                      onPress={() => setSelectedExerciseKey(selected ? null : s.exerciseKey)}
                      style={({ pressed }) => [
                        styles.pill,
                        selected && styles.pillSelected,
                        pressed && { opacity: 0.9 },
                      ]}
                    >
                      <Text style={[styles.pillText, selected && styles.pillTextSelected]} numberOfLines={1}>
                        {s.exerciseName}
                      </Text>
                    </Pressable>
                  );
                })}
              </ScrollView>

              {selectedExercise ? (
                <View style={styles.exerciseDetail}>
                  <View style={styles.detailRow}>
                    <View style={styles.detailItem}>
                      <Text style={styles.detailLabel}>Best 1RM</Text>
                      <Text style={styles.detailValue}>
                        {selectedExercise.bestEstimated1RM.toFixed(1)} <Text style={styles.unit}>kg</Text>
                      </Text>
                    </View>
                    <View style={styles.detailItem}>
                      <Text style={styles.detailLabel}>Last Done</Text>
                      <Text style={styles.detailValue}>{formatDateRelative(selectedExercise.lastDone)}</Text>
                    </View>
                  </View>

                  {chartW > 0 && selectedExercise.history.length >= 2 ? (
                    <View style={styles.chartContainer}>
                      <Text style={styles.chartTitle}>Estimated 1RM Progress (kg)</Text>
                      <ExerciseProgressChart
                        width={chartW}
                        height={180}
                        data={selectedExercise.history.map((h) => ({
                          date: h.date,
                          value: h.bestEstimated1RM,
                        }))}
                      />
                    </View>
                  ) : selectedExercise.history.length < 2 ? (
                    <View style={styles.chartPlaceholder}>
                      <Text style={styles.chartPlaceholderText}>
                        Perform this exercise in more sessions to see progress
                      </Text>
                    </View>
                  ) : null}
                </View>
              ) : exerciseStats.length > 0 ? (
                <View style={styles.exerciseList}>
                  {exerciseStats.slice(0, 6).map((s) => (
                    <Pressable
                      key={s.exerciseKey}
                      style={styles.exerciseRow}
                      onPress={() => setSelectedExerciseKey(s.exerciseKey)}
                    >
                      <Text style={styles.exerciseRowName} numberOfLines={1}>
                        {s.exerciseName}
                      </Text>
                      <View style={styles.exerciseRowRight}>
                        <Text style={styles.exerciseRowValue}>{s.bestEstimated1RM.toFixed(1)}kg</Text>
                        <Text style={styles.exerciseRowDate}>{formatDateRelative(s.lastDone)}</Text>
                      </View>
                    </Pressable>
                  ))}
                </View>
              ) : (
                <Text style={styles.body}>No exercise data found.</Text>
              )}
            </View>

            <View style={styles.sectionCard}>
              <Text style={styles.sectionTitle}>Bilbo</Text>
              <Text style={styles.sectionBody}>Reps (x) by session index within cycle (y)</Text>

              {bilboSeries.length === 0 ? (
                <Text style={styles.body}>No Bilbo sessions logged yet.</Text>
              ) : (
                <>
                  {/* Method instance selector */}
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.pillsRow}>
                    {bilboSeries.map((s) => {
                      const selected = s.methodInstanceId === selectedBilboMethodId;
                      const title = methodNameById[s.methodInstanceId] ?? s.exerciseName ?? 'Bilbo';
                      return (
                        <Pressable
                          key={s.methodInstanceId}
                          onPress={() => setSelectedBilboMethodId(s.methodInstanceId)}
                          style={({ pressed }) => [
                            styles.pill,
                            selected && styles.pillSelected,
                            pressed && { opacity: 0.9 },
                          ]}
                        >
                          <Text style={[styles.pillText, selected && styles.pillTextSelected]} numberOfLines={1}>
                            {title}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </ScrollView>

                  {bilboChartModel && chartW > 0 ? (
                    <>
                      <View style={styles.legendRow}>
                        {bilboChartModel.series.map((s) => (
                          <View key={`leg-${s.key}`} style={styles.legendItem}>
                            <View style={[styles.legendDot, { backgroundColor: s.color }]} />
                            <Text style={styles.legendText}>{s.label ?? s.key}</Text>
                          </View>
                        ))}
                        {selectedBilbo?.resetAtReps && (
                          <View style={styles.legendItem}>
                            <View style={styles.legendDashContainer}>
                              <View style={styles.legendDash} />
                              <View style={styles.legendDash} />
                            </View>
                            <Text style={[styles.legendText, { color: colors.accentRed }]}>RESET</Text>
                          </View>
                        )}
                        <Text style={styles.legendHint}>last 4 cycles</Text>
                      </View>

                      <View style={{ maxHeight: 420 }}>
                        <ScrollView nestedScrollEnabled>
                          <GroupedHorizontalBars
                            width={chartW}
                            height={bilboH}
                            yLabels={bilboChartModel.yLabels}
                            series={bilboChartModel.series}
                            maxValue={bilboChartModel.maxValue}
                            xTickCount={4}
                            referenceValue={selectedBilbo?.resetAtReps}
                          />
                        </ScrollView>
                      </View>
                    </>
                  ) : null}
                </>
              )}
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const createStyles = (colors: {
  background: string;
  primary: string;
  secondary: string;
  tertiary: string;
  text: string;
  accentRed: string;
  onPrimary: string;
}) =>
  StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background,
  },
  container: {
    paddingHorizontal: 20,
    paddingVertical: 24,
    gap: 16,
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
    gap: 6,
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
    borderColor: rgba(colors.text, 0.2),
    gap: 6,
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
    color: colors.onPrimary,
  },
  sectionCard: {
    backgroundColor: rgba(colors.text, 0.08),
    borderRadius: 18,
    padding: 16,
    gap: 10,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: rgba(colors.text, 0.12),
  },
  sectionTitle: {
    color: colors.text,
    fontSize: 18,
    fontFamily: Fonts.extraBold,
  },
  sectionBody: {
    color: rgba(colors.text, 0.7),
    fontSize: 13,
    lineHeight: 18,
    fontFamily: Fonts.regular,
  },
  pillsRow: {
    gap: 10,
    paddingVertical: 2,
  },
  pill: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 999,
    backgroundColor: rgba(colors.text, 0.06),
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: rgba(colors.text, 0.12),
    maxWidth: 220,
  },
  pillSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  pillText: {
    color: rgba(colors.text, 0.85),
    fontFamily: Fonts.semiBold,
    fontSize: 13,
  },
  pillTextSelected: {
    color: colors.onPrimary,
  },
  legendRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 10,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 999,
  },
  legendDashContainer: {
    flexDirection: 'row',
    gap: 2,
    alignItems: 'center',
  },
  legendDash: {
    width: 5,
    height: 2,
    backgroundColor: colors.accentRed,
    borderRadius: 1,
  },
  legendText: {
    color: rgba(colors.text, 0.75),
    fontFamily: Fonts.semiBold,
    fontSize: 12,
  },
  legendHint: {
    marginLeft: 'auto',
    color: rgba(colors.text, 0.45),
    fontFamily: Fonts.medium,
    fontSize: 12,
  },
  exerciseList: {
    gap: 8,
    marginTop: 4,
  },
  exerciseRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: rgba(colors.text, 0.04),
    borderRadius: 12,
  },
  exerciseRowName: {
    color: colors.text,
    fontFamily: Fonts.semiBold,
    fontSize: 15,
    flex: 1,
    marginRight: 12,
  },
  exerciseRowRight: {
    alignItems: 'flex-end',
  },
  exerciseRowValue: {
    color: colors.primary,
    fontFamily: Fonts.black,
    fontSize: 16,
  },
  exerciseRowDate: {
    color: rgba(colors.text, 0.4),
    fontFamily: Fonts.medium,
    fontSize: 11,
  },
  exerciseDetail: {
    marginTop: 4,
    gap: 16,
  },
  detailRow: {
    flexDirection: 'row',
    gap: 12,
  },
  detailItem: {
    flex: 1,
    padding: 12,
    backgroundColor: rgba(colors.text, 0.05),
    borderRadius: 14,
    gap: 4,
  },
  detailLabel: {
    color: rgba(colors.text, 0.5),
    fontFamily: Fonts.bold,
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  detailValue: {
    color: colors.text,
    fontFamily: Fonts.black,
    fontSize: 20,
  },
  unit: {
    fontSize: 14,
    color: rgba(colors.text, 0.6),
  },
  chartContainer: {
    marginTop: 8,
    gap: 12,
  },
  chartTitle: {
    color: rgba(colors.text, 0.6),
    fontFamily: Fonts.bold,
    fontSize: 12,
    textAlign: 'center',
  },
  chartPlaceholder: {
    height: 100,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: rgba(colors.text, 0.03),
    borderRadius: 14,
    borderStyle: 'dashed',
    borderWidth: 1,
    borderColor: rgba(colors.text, 0.1),
  },
  chartPlaceholderText: {
    color: rgba(colors.text, 0.4),
    fontFamily: Fonts.medium,
    fontSize: 13,
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  });
