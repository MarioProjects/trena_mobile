import { Fonts, TrenaColors } from '@/constants/theme';
import { GroupedHorizontalBars } from '@/components/stats/GroupedHorizontalBars';
import { WeekdayHistogram } from '@/components/stats/WeekdayHistogram';
import { StatsSkeleton } from '@/components/stats/StatsSkeleton';
import { getMethodInstancesByIds, listCompletedSessionsForStats } from '@/lib/workouts/repo';
import { bilboCyclesSeries, countCompletedSessions, countCompletedSessionsThisWeek, weekdayHistogram } from '@/lib/workouts/stats';
import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function StatsScreen() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sessions, setSessions] = useState<any[]>([]);
  const [containerWidth, setContainerWidth] = useState<number>(0);

  const [methodNameById, setMethodNameById] = useState<Record<string, string>>({});
  const bilboSeries = useMemo(() => bilboCyclesSeries({ sessions: sessions as any }), [sessions]);
  const [selectedBilboMethodId, setSelectedBilboMethodId] = useState<string | null>(null);

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

  const bilboChartModel = useMemo(() => {
    if (!selectedBilbo) return null;
    const maxN = Math.max(1, selectedBilbo.maxSessionIndexInCycle);
    const yLabels = Array.from({ length: maxN }, (_, i) => String(i + 1));

    // Keep it readable: show last 4 cycles by default.
    const cyclesToShow = selectedBilbo.cycles.slice(-4);
    const palette = [TrenaColors.secondary, TrenaColors.primary, TrenaColors.tertiary, TrenaColors.accentRed];

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
  }, [selectedBilbo]);

  const chartW = Math.max(0, containerWidth - 32);
  const histH = 170;
  const bilboH = bilboChartModel ? Math.min(520, 60 + bilboChartModel.yLabels.length * 40) : 240;
  const todayIdx = (new Date().getDay() + 6) % 7; // monday-first 0..6

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
              <View style={[styles.card, { backgroundColor: TrenaColors.tertiary }]}>
                <Text style={[styles.cardLabel, styles.cardTextOnTertiary]}>Workouts</Text>
                <Text style={[styles.cardValue, styles.cardTextOnTertiary]}>{workoutsThisWeek}</Text>
                <Text style={[styles.cardHint, styles.cardTextOnTertiary]}>this week</Text>
              </View>
              <View style={[styles.card, { backgroundColor: TrenaColors.secondary }]}>
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

              <View style={styles.weekdayCountsRow}>
                {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((d, i) => (
                  <Text key={d} style={styles.weekdayCount}>
                    {d} {weekday.counts[i] ?? 0}
                  </Text>
                ))}
              </View>
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

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: TrenaColors.background,
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
    color: TrenaColors.text,
    letterSpacing: -0.3,
  },
  body: {
    color: 'rgba(236, 235, 228, 0.8)',
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
    backgroundColor: 'rgba(236, 235, 228, 0.08)',
    borderRadius: 18,
    padding: 16,
    gap: 6,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(236, 235, 228, 0.12)',
  },
  noticeTitle: {
    color: TrenaColors.text,
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
    borderColor: 'rgba(20, 20, 17, 0.2)',
    gap: 6,
  },
  cardLabel: {
    color: TrenaColors.text,
    fontSize: 12,
    fontFamily: Fonts.extraBold,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  cardValue: {
    color: TrenaColors.text,
    fontSize: 28,
    fontFamily: Fonts.black,
    letterSpacing: -0.2,
  },
  cardHint: {
    color: 'rgba(236, 235, 228, 0.75)',
    fontSize: 12,
    fontFamily: Fonts.semiBold,
  },
  cardTextOnTertiary: {
    color: TrenaColors.background,
  },
  sectionCard: {
    backgroundColor: 'rgba(236, 235, 228, 0.08)',
    borderRadius: 18,
    padding: 16,
    gap: 10,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(236, 235, 228, 0.12)',
  },
  sectionTitle: {
    color: TrenaColors.text,
    fontSize: 18,
    fontFamily: Fonts.extraBold,
  },
  sectionBody: {
    color: 'rgba(236, 235, 228, 0.7)',
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
    backgroundColor: 'rgba(236, 235, 228, 0.06)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(236, 235, 228, 0.12)',
    maxWidth: 220,
  },
  pillSelected: {
    backgroundColor: TrenaColors.primary,
    borderColor: TrenaColors.primary,
  },
  pillText: {
    color: 'rgba(236, 235, 228, 0.85)',
    fontFamily: Fonts.semiBold,
    fontSize: 13,
  },
  pillTextSelected: {
    color: TrenaColors.background,
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
  legendText: {
    color: 'rgba(236, 235, 228, 0.75)',
    fontFamily: Fonts.semiBold,
    fontSize: 12,
  },
  legendHint: {
    marginLeft: 'auto',
    color: 'rgba(236, 235, 228, 0.45)',
    fontFamily: Fonts.medium,
    fontSize: 12,
  },
  weekdayCountsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 2,
  },
  weekdayCount: {
    color: 'rgba(236, 235, 228, 0.6)',
    fontFamily: Fonts.medium,
    fontSize: 12,
  },
});
