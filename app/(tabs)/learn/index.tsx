import { ExercisesIcon, MethodsIcon } from '@/components/icons';
import { Fonts, TrenaColors } from '@/constants/theme';
import { learnData } from '@/data/learn';
import type { LearnItem } from '@/data/learn/types';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const placeholderImage = require('@/assets/images/mock.webp');
const localLearnImages: Record<string, number> = {
  'assets/images/learn/methods/bilbo.webp': require('@/assets/images/learn/methods/bilbo.webp'),
};

type PrimaryFilter = 'all' | 'method' | 'exercise';
type CanonicalLevel = 'Beginner' | 'Intermediate' | 'Advanced';

function getImageSource(image: string | undefined) {
  if (!image) return placeholderImage;
  if (image.includes('mock.webp')) return placeholderImage;
  if (localLearnImages[image]) return localLearnImages[image];
  if (image.startsWith('http://') || image.startsWith('https://')) return { uri: image };
  return placeholderImage;
}

function normalizeLevels(level: string | undefined): CanonicalLevel[] {
  if (!level) return [];
  const tokens = level
    .toLowerCase()
    .replace(/[^a-z]+/g, ' ')
    .trim()
    .split(/\s+/g)
    .filter(Boolean);

  const out: CanonicalLevel[] = [];
  const add = (x: CanonicalLevel) => {
    if (!out.includes(x)) out.push(x);
  };

  for (const t of tokens) {
    if (t === 'basic' || t === 'beginner') add('Beginner');
    if (t === 'intermediate') add('Intermediate');
    if (t === 'advanced') add('Advanced');
  }

  return out;
}

function formatLevels(level: string | undefined) {
  const normalized = normalizeLevels(level);
  return normalized.length ? normalized.join('/') : level ?? '—';
}

function getDaysPerWeekMeta(item: LearnItem): string | null {
  // Exercises shouldn't show a schedule; also ignore placeholder values like "N/A".
  if (item.type !== 'method') return null;
  const raw = item.days_per_week?.trim();
  if (!raw) return null;
  const lower = raw.toLowerCase();
  if (lower === 'n/a' || lower === 'na' || lower === 'none' || lower === '-' || lower === '—') return null;
  return `${raw} days/week`;
}

function extractDayNumbers(daysPerWeek: string | undefined) {
  if (!daysPerWeek) return [];
  const matches = daysPerWeek.match(/\d+/g);
  if (!matches) return [];
  const nums = matches
    .map((x) => Number(x))
    .filter((n) => Number.isFinite(n))
    .filter((n) => n >= 1 && n <= 7);
  return Array.from(new Set(nums)).sort((a, b) => a - b);
}

function Pill({
  label,
  selected,
  onPress,
  left,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
  left?: React.ReactNode;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.pill,
        selected ? styles.pillSelected : styles.pillUnselected,
        pressed && { opacity: 0.85 },
      ]}
      hitSlop={8}
    >
      {left ? <View style={styles.pillLeft}>{left}</View> : null}
      <Text style={[styles.pillText, selected ? styles.pillTextSelected : styles.pillTextUnselected]}>
        {label}
      </Text>
    </Pressable>
  );
}

function Section({ title, items }: { title: string; items: LearnItem[] }) {
  if (items.length === 0) return null;

  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.list}>
        {items.map((item) => {
          return (
            <Pressable
              key={item.id}
              accessibilityRole="button"
              // Navigate directly to the final screen to avoid an extra redirect hop
              // (which can cause a brief "white flash" during transitions).
              onPress={() => router.push(`/learn/${item.type}/${item.id}`)}
              style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
            >
              <View style={styles.cardImageWrap}>
                <Image
                  source={getImageSource(item.image)}
                  style={StyleSheet.absoluteFillObject}
                  contentFit="cover"
                />
              </View>

              <View style={styles.cardBody}>
                <View style={styles.cardHeader}>
                  <Text style={styles.cardTitle} numberOfLines={1}>
                    {item.name}
                  </Text>
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>{item.type.toUpperCase()}</Text>
                  </View>
                </View>

                <Text style={styles.cardMeta} numberOfLines={1}>
                  {[formatLevels(item.level), getDaysPerWeekMeta(item), item.goal ?? '—']
                    .filter((x): x is string => Boolean(x))
                    .join(' • ')}
                </Text>

                <Text style={styles.cardDesc} numberOfLines={2}>
                  {item.description}
                </Text>
              </View>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

export default function LearnScreen() {
  const [primary, setPrimary] = React.useState<PrimaryFilter>('all');
  const [methodLevel, setMethodLevel] = React.useState<CanonicalLevel | null>(null);
  const [methodDays, setMethodDays] = React.useState<number | null>(null);
  const [exerciseTag, setExerciseTag] = React.useState<string | null>(null);

  const methods = React.useMemo(() => learnData.filter((x) => x.type === 'method'), []);
  const exercises = React.useMemo(() => learnData.filter((x) => x.type === 'exercise'), []);

  // Secondary filter options are conditional: only show values that produce results
  // given the other selected method filter (prevents impossible combinations).
  const methodLevelOptions = React.useMemo(() => {
    const base = methodDays
      ? methods.filter((m) => extractDayNumbers(m.days_per_week).includes(methodDays))
      : methods;

    const present = new Set<CanonicalLevel>();
    for (const m of base) {
      for (const lvl of normalizeLevels(m.level)) present.add(lvl);
    }
    const order: CanonicalLevel[] = ['Beginner', 'Intermediate', 'Advanced'];
    return order.filter((x) => present.has(x));
  }, [methods, methodDays]);

  const methodDayOptions = React.useMemo(() => {
    const base = methodLevel
      ? methods.filter((m) => normalizeLevels(m.level).includes(methodLevel))
      : methods;

    const nums = new Set<number>();
    for (const m of base) {
      for (const n of extractDayNumbers(m.days_per_week)) nums.add(n);
    }
    return Array.from(nums).sort((a, b) => a - b);
  }, [methods, methodLevel]);

  const exerciseTags = React.useMemo(() => {
    const counts = new Map<string, number>();
    for (const ex of exercises) {
      for (const tag of ex.tags || []) {
        counts.set(tag, (counts.get(tag) ?? 0) + 1);
      }
    }
    return Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .map(([tag]) => tag);
  }, [exercises]);

  React.useEffect(() => {
    // When switching the primary filter, reset the irrelevant secondary filters.
    if (primary === 'all') {
      setMethodLevel(null);
      setMethodDays(null);
      setExerciseTag(null);
    } else if (primary === 'method') {
      setExerciseTag(null);
    } else if (primary === 'exercise') {
      setMethodLevel(null);
      setMethodDays(null);
    }
  }, [primary]);

  React.useEffect(() => {
    // If the other filter changes and makes the current selection impossible, clear it.
    if (methodLevel && !methodLevelOptions.includes(methodLevel)) {
      setMethodLevel(null);
    }
    if (methodDays && !methodDayOptions.includes(methodDays)) {
      setMethodDays(null);
    }
  }, [methodLevel, methodDays, methodLevelOptions, methodDayOptions]);

  const filteredMethods = React.useMemo(() => {
    let items = methods;
    if (methodLevel) {
      items = items.filter((m) => normalizeLevels(m.level).includes(methodLevel));
    }
    if (methodDays) {
      items = items.filter((m) => extractDayNumbers(m.days_per_week).includes(methodDays));
    }
    return items;
  }, [methods, methodLevel, methodDays]);

  const filteredExercises = React.useMemo(() => {
    let items = exercises;
    if (exerciseTag) {
      const target = exerciseTag.toLowerCase();
      items = items.filter((ex) => (ex.tags || []).some((t) => t.toLowerCase() === target));
    }
    return items;
  }, [exercises, exerciseTag]);

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>Learn</Text>
        <Text style={styles.body}>
          {learnData.length} items • {methods.length} methods • {exercises.length} exercises
        </Text>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.pillsRow}>
          <Pill label="All" selected={primary === 'all'} onPress={() => setPrimary('all')} />
          <Pill
            label="Methods"
            selected={primary === 'method'}
            onPress={() => setPrimary('method')}
            left={
              <MethodsIcon
                size={18}
                color={primary === 'method' ? TrenaColors.background : TrenaColors.primary}
              />
            }
          />
          <Pill
            label="Exercises"
            selected={primary === 'exercise'}
            onPress={() => setPrimary('exercise')}
            left={
              <ExercisesIcon
                size={18}
                color={primary === 'exercise' ? TrenaColors.background : TrenaColors.primary}
              />
            }
          />
        </ScrollView>

        {primary === 'method' ? (
          <View style={styles.filtersBlock}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.pillsRow}>
              <Pill label="All levels" selected={!methodLevel} onPress={() => setMethodLevel(null)} />
              {methodLevelOptions.map((lvl) => (
                <Pill
                  key={lvl}
                  label={lvl}
                  selected={methodLevel === lvl}
                  onPress={() => setMethodLevel((cur) => (cur === lvl ? null : lvl))}
                />
              ))}
            </ScrollView>

            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.pillsRow}>
              <Pill label="Any schedule" selected={!methodDays} onPress={() => setMethodDays(null)} />
              {methodDayOptions.map((n) => (
                <Pill
                  key={n}
                  label={`${n} day${n === 1 ? '' : 's'}/week`}
                  selected={methodDays === n}
                  onPress={() => setMethodDays((cur) => (cur === n ? null : n))}
                />
              ))}
            </ScrollView>
          </View>
        ) : null}

        {primary === 'exercise' ? (
          <View style={styles.filtersBlock}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.pillsRow}>
              <Pill label="All tags" selected={!exerciseTag} onPress={() => setExerciseTag(null)} />
              {exerciseTags.slice(0, 18).map((tag) => (
                <Pill
                  key={tag}
                  label={tag}
                  selected={exerciseTag === tag}
                  onPress={() => setExerciseTag((cur) => (cur === tag ? null : tag))}
                />
              ))}
            </ScrollView>
          </View>
        ) : null}

        {primary === 'all' ? (
          <>
            <Section title="Methods" items={methods} />
            <Section title="Exercises" items={exercises} />
          </>
        ) : null}

        {primary === 'method' ? <Section title="Methods" items={filteredMethods} /> : null}
        {primary === 'exercise' ? <Section title="Exercises" items={filteredExercises} /> : null}
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
    gap: 12,
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
  pillsRow: {
    paddingTop: 6,
    paddingBottom: 2,
    gap: 10,
    paddingHorizontal: 2,
  },
  filtersBlock: {
    gap: 6,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 999,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderWidth: 1,
  },
  pillSelected: {
    backgroundColor: TrenaColors.primary,
    borderColor: TrenaColors.primary,
  },
  pillUnselected: {
    backgroundColor: 'rgba(236, 235, 228, 0.04)',
    borderColor: 'rgba(236, 235, 228, 0.12)',
  },
  pillLeft: {
    marginRight: 8,
  },
  pillText: {
    fontFamily: Fonts.semiBold,
    fontSize: 13,
    lineHeight: 16,
    letterSpacing: -0.1,
  },
  pillTextSelected: {
    color: TrenaColors.background,
  },
  pillTextUnselected: {
    color: 'rgba(236, 235, 228, 0.9)',
  },
  section: {
    gap: 10,
    paddingTop: 12,
  },
  sectionTitle: {
    fontFamily: Fonts.bold,
    fontSize: 16,
    lineHeight: 20,
    color: TrenaColors.text,
    letterSpacing: -0.2,
  },
  list: {
    gap: 12,
  },
  card: {
    borderWidth: 1,
    borderColor: 'rgba(236, 235, 228, 0.12)',
    backgroundColor: 'rgba(236, 235, 228, 0.04)',
    padding: 12,
    borderRadius: 14,
    flexDirection: 'row',
    gap: 12,
    alignItems: 'stretch',
  },
  cardPressed: {
    opacity: 0.92,
    transform: [{ scale: 0.997 }],
  },
  cardImageWrap: {
    width: 74,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: 'rgba(236, 235, 228, 0.06)',
  },
  cardBody: {
    flex: 1,
    gap: 6,
    minHeight: 74,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  cardTitle: {
    fontFamily: Fonts.bold,
    fontSize: 16,
    lineHeight: 20,
    color: TrenaColors.text,
    flex: 1,
  },
  badge: {
    borderWidth: 1,
    borderColor: 'rgba(236, 235, 228, 0.16)',
    backgroundColor: 'rgba(236, 235, 228, 0.06)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
  },
  badgeText: {
    fontFamily: Fonts.medium,
    fontSize: 10,
    lineHeight: 12,
    letterSpacing: 0.5,
    color: 'rgba(236, 235, 228, 0.85)',
  },
  cardMeta: {
    fontFamily: Fonts.medium,
    fontSize: 12,
    lineHeight: 16,
    color: 'rgba(236, 235, 228, 0.75)',
  },
  cardDesc: {
    fontFamily: Fonts.regular,
    fontSize: 13,
    lineHeight: 18,
    color: 'rgba(236, 235, 228, 0.85)',
  },
});

