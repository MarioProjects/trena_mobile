import { learnData } from '@/data/learn';
import { coerceBilboConfig, coerceBilboState } from '@/lib/workouts/methods/bilbo';
import type { BilboConfig, BilboState, ExerciseRef, SessionExercise, WorkoutSessionRow } from '@/lib/workouts/types';

function isFiniteNumber(x: unknown): x is number {
  return typeof x === 'number' && Number.isFinite(x);
}

export function isCompletedSession(s: Pick<WorkoutSessionRow, 'ended_at'>): boolean {
  return Boolean(s.ended_at);
}

export function countCompletedSessions(sessions: Array<Pick<WorkoutSessionRow, 'ended_at'>>): number {
  return sessions.reduce((acc, s) => acc + (isCompletedSession(s) ? 1 : 0), 0);
}

export type WeekStart = 'monday' | 'sunday';

export function startOfWeekLocal(args: { now: Date; weekStart: WeekStart }): Date {
  const { now, weekStart } = args;
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const day = startOfToday.getDay(); // 0=Sun..6=Sat
  const offset = weekStart === 'monday' ? (day + 6) % 7 : day;
  return new Date(startOfToday.getFullYear(), startOfToday.getMonth(), startOfToday.getDate() - offset);
}

export function countCompletedSessionsThisWeek(args: {
  sessions: Array<Pick<WorkoutSessionRow, 'ended_at'>>;
  now?: Date;
  weekStart?: WeekStart;
}): number {
  const now = args.now ?? new Date();
  const weekStart = args.weekStart ?? 'monday';
  const start = startOfWeekLocal({ now, weekStart });

  return args.sessions.reduce((acc, s) => {
    if (!s.ended_at) return acc;
    const ended = new Date(s.ended_at);
    if (ended >= start && ended <= now) return acc + 1;
    return acc;
  }, 0);
}

export type WeekdayOrder = 'monday_first' | 'sunday_first';

export function weekdayHistogram(args: {
  sessions: Array<Pick<WorkoutSessionRow, 'ended_at' | 'started_at'>>;
  order?: WeekdayOrder;
  field?: 'started_at' | 'ended_at';
}): { counts: number[]; density: number[]; total: number } {
  const order = args.order ?? 'monday_first';
  const field = args.field ?? 'ended_at';
  const counts = Array.from({ length: 7 }, () => 0);

  for (const s of args.sessions) {
    const iso = field === 'started_at' ? s.started_at : s.ended_at;
    if (!iso) continue;
    const d = new Date(iso).getDay(); // 0=Sun..6=Sat (local time)
    const idx = order === 'monday_first' ? (d + 6) % 7 : d;
    counts[idx] += 1;
  }

  const total = counts.reduce((a, b) => a + b, 0);
  const density = total > 0 ? counts.map((c) => c / total) : counts.map(() => 0);
  return { counts, density, total };
}

export function formatExerciseName(ref: ExerciseRef): string {
  if (ref.kind === 'learn') {
    return learnData.find((x) => x.id === ref.learnExerciseId)?.name ?? 'Unknown exercise';
  }
  return ref.name;
}

export function getExerciseKey(ref: ExerciseRef): string {
  if (ref.kind === 'learn') return `learn:${ref.learnExerciseId}`;
  return `free:${ref.name}`;
}

export function keyToRef(key: string): ExerciseRef {
  if (key.startsWith('learn:')) {
    return { kind: 'learn', learnExerciseId: key.replace('learn:', '') };
  }
  return { kind: 'free', name: key.replace('free:', '') };
}

/**
 * Epley formula for 1RM: w * (1 + r / 30)
 */
export function estimate1RM(weightKg: number, reps: number): number {
  if (reps <= 0) return 0;
  if (reps === 1) return weightKg;
  return weightKg * (1 + reps / 30);
}

export type ExerciseSessionStat = {
  sessionId: string;
  date: string;
  bestEstimated1RM: number;
  maxWeight: number;
  maxReps: number;
};

export type ExerciseStats = {
  exerciseKey: string;
  exerciseName: string;
  lastDone: string;
  bestEstimated1RM: number;
  history: ExerciseSessionStat[];
};

export function computeExerciseStats(args: { sessions: WorkoutSessionRow[] }): ExerciseStats[] {
  const completed = args.sessions
    .filter((s) => Boolean(s.ended_at))
    .slice()
    .sort((a, b) => {
      const aIso = a.started_at ?? a.ended_at ?? 0;
      const bIso = b.started_at ?? b.ended_at ?? 0;
      return new Date(aIso).getTime() - new Date(bIso).getTime();
    });

  const statsMap = new Map<string, ExerciseStats>();

  for (const s of completed) {
    const sessionDate = s.started_at ?? s.ended_at!;
    const exercises = s.snapshot?.exercises ?? [];

    for (const ex of exercises) {
      const key = getExerciseKey(ex.exercise);
      const name = formatExerciseName(ex.exercise);

      let sessionBest1RM = 0;
      let sessionMaxWeight = 0;
      let sessionMaxReps = 0;

      const performed = ex.performedSets ?? [];
      for (const set of performed) {
        if (set.weightKg != null && set.reps != null && set.reps > 0) {
          const rm = estimate1RM(set.weightKg, set.reps);
          if (rm > sessionBest1RM) sessionBest1RM = rm;
          if (set.weightKg > sessionMaxWeight) sessionMaxWeight = set.weightKg;
          if (set.reps > sessionMaxReps) sessionMaxReps = set.reps;
        }
      }

      if (sessionBest1RM === 0) continue;

      let stat = statsMap.get(key);
      if (!stat) {
        stat = {
          exerciseKey: key,
          exerciseName: name,
          lastDone: sessionDate,
          bestEstimated1RM: sessionBest1RM,
          history: [],
        };
        statsMap.set(key, stat);
      }

      stat.lastDone = sessionDate;
      if (sessionBest1RM > stat.bestEstimated1RM) {
        stat.bestEstimated1RM = sessionBest1RM;
      }

      stat.history.push({
        sessionId: s.id,
        date: sessionDate,
        bestEstimated1RM: sessionBest1RM,
        maxWeight: sessionMaxWeight,
        maxReps: sessionMaxReps,
      });
    }
  }

  return Array.from(statsMap.values()).sort((a, b) => 
    new Date(b.lastDone).getTime() - new Date(a.lastDone).getTime()
  );
}

function isBilboExercise(ex: SessionExercise): ex is SessionExercise & {
  source: Extract<SessionExercise['source'], { type: 'method'; methodKey: 'bilbo' }>;
} {
  return ex.source.type === 'method' && ex.source.methodKey === 'bilbo';
}

function getBilboReps(ex: SessionExercise): number | null {
  const performed = ex.performedSets ?? [];
  const top = performed.find((s) => s.id === 'bilbo-top-set') ?? performed[0];
  const reps = top?.reps;
  if (!isFiniteNumber(reps) || reps <= 0) return null;
  return reps;
}

export type BilboCycleSession = {
  sessionId: string;
  startedAt?: string;
  endedAt: string;
  reps: number;
  weightKg?: number;
  sessionIndexInCycle: number;
};

export type BilboCycle = {
  cycleIndex: number;
  sessions: BilboCycleSession[];
};

export type BilboInstanceSeries = {
  methodInstanceId: string;
  exerciseName?: string;
  cycles: BilboCycle[];
  maxSessionIndexInCycle: number;
  maxReps: number;
  resetAtReps?: number;
};

type BilboInstanceAcc = {
  cycles: BilboCycle[];
  curCycle: BilboCycle | null;
  curCycleIndex: number;
  curSessionIndex: number;
  maxSessionIndexInCycle: number;
  maxReps: number;
  exerciseName?: string;
  resetAtReps?: number;
  lastWeightKg?: number;
  lastReps?: number;
};

function getBilboWeightKg(ex: SessionExercise): number | null {
  // Prefer planned weight (what the system prescribed for that Bilbo session).
  const plannedTop = ex.plannedSets?.find((s) => s.id === 'bilbo-top-set') ?? ex.plannedSets?.[0];
  if (plannedTop && isFiniteNumber((plannedTop as any).weightKg)) return (plannedTop as any).weightKg as number;

  // Fallback to performed weight (what ended up being logged).
  const performedTop = (ex.performedSets ?? []).find((s) => s.id === 'bilbo-top-set') ?? (ex.performedSets ?? [])[0];
  if (performedTop && isFiniteNumber((performedTop as any).weightKg)) return (performedTop as any).weightKg as number;

  return null;
}

function shouldStartNewBilboCycle(args: {
  config: BilboConfig;
  stateAtStart: BilboState;
  reps: number;
  weightKg: number | null;
  acc: BilboInstanceAcc;
}): boolean {
  // First seen session always starts a cycle.
  if (!args.acc.curCycle) return true;

  // Primary signal: weight drops (Bilbo reset) => new cycle.
  // This avoids false "new cycles" when `methodStateAtStart` is missing/invalid (it coerces to `startWeightKg`).
  const lastW = args.acc.lastWeightKg;
  const w = args.weightKg ?? args.stateAtStart.currentWeightKg;
  if (isFiniteNumber(lastW) && isFiniteNumber(w)) {
    // Tolerate tiny float/serialization noise.
    const EPS = 1e-9;
    if (w < lastW - EPS) return true;
  }

  // Secondary signal: if the previous session hit the reset threshold, the next one starts a new cycle.
  // (Matches `bilboApplyResult`: reps <= resetAtReps => next weight = startWeightKg)
  const resetAt = args.acc.resetAtReps ?? args.config.resetAtReps;
  const lastReps = args.acc.lastReps;
  if (isFiniteNumber(resetAt) && isFiniteNumber(lastReps) && lastReps <= resetAt) return true;

  return false;
}

/**
 * Build Bilbo cycle series for charts.
 *
 * Sorting: sessions are processed by `ended_at` ascending (completed workouts only).
 * Cycle boundaries: primarily when the session weight drops (reset), with a fallback to the reset-reps rule.
 */
export function bilboCyclesSeries(args: { sessions: WorkoutSessionRow[] }): BilboInstanceSeries[] {
  const completed = args.sessions
    .filter((s) => Boolean(s.ended_at))
    .slice()
    .sort((a, b) => {
      const aIso = a.started_at ?? a.ended_at ?? 0;
      const bIso = b.started_at ?? b.ended_at ?? 0;
      return new Date(aIso).getTime() - new Date(bIso).getTime();
    });

  const byInstance = new Map<string, BilboInstanceAcc>();

  for (const s of completed) {
    const startedAt = s.started_at ?? undefined;
    const endedAt = s.ended_at!;
    const exercises = s.snapshot?.exercises ?? [];

    for (const ex of exercises) {
      if (!isBilboExercise(ex)) continue;

      const reps = getBilboReps(ex);
      if (reps == null) continue;

      const methodInstanceId = ex.source.methodInstanceId;
      const config = coerceBilboConfig(ex.source.methodConfig) as BilboConfig;
      const stateAtStart = coerceBilboState(ex.source.methodStateAtStart, config) as BilboState;
      const weightKg = getBilboWeightKg(ex);

      const acc: BilboInstanceAcc =
        byInstance.get(methodInstanceId) ??
        ({
          cycles: [],
          curCycle: null,
          curCycleIndex: 0,
          curSessionIndex: 0,
          maxSessionIndexInCycle: 0,
          maxReps: 0,
          exerciseName: config.exercise ? formatExerciseName(config.exercise) : undefined,
          resetAtReps: config.resetAtReps,
          lastWeightKg: undefined,
          lastReps: undefined,
        } satisfies BilboInstanceAcc);

      if (!byInstance.has(methodInstanceId)) byInstance.set(methodInstanceId, acc);
      if (!acc.exerciseName && config.exercise) acc.exerciseName = formatExerciseName(config.exercise);
      if (!acc.resetAtReps) acc.resetAtReps = config.resetAtReps;

      const startNew = shouldStartNewBilboCycle({ config, stateAtStart, reps, weightKg, acc });
      if (startNew) {
        acc.curCycleIndex += 1;
        acc.curSessionIndex = 0;
        const cycle: BilboCycle = { cycleIndex: acc.curCycleIndex, sessions: [] };
        acc.cycles.push(cycle);
        acc.curCycle = cycle;
      }

      // Safety: if for some reason we still have no current cycle, create one.
      if (!acc.curCycle) {
        acc.curCycleIndex += 1;
        const cycle: BilboCycle = { cycleIndex: acc.curCycleIndex, sessions: [] };
        acc.cycles.push(cycle);
        acc.curCycle = cycle;
        acc.curSessionIndex = 0;
      }

      acc.curSessionIndex += 1;
      acc.curCycle.sessions.push({
        sessionId: s.id,
        startedAt,
        endedAt,
        reps,
        weightKg: weightKg ?? undefined,
        sessionIndexInCycle: acc.curSessionIndex,
      });

      acc.maxSessionIndexInCycle = Math.max(acc.maxSessionIndexInCycle, acc.curSessionIndex);
      acc.maxReps = Math.max(acc.maxReps, reps);

      // Track last observed data for boundary detection.
      if (weightKg != null) acc.lastWeightKg = weightKg;
      acc.lastReps = reps;
    }
  }

  return Array.from(byInstance.entries()).map(([methodInstanceId, acc]) => ({
    methodInstanceId,
    exerciseName: acc.exerciseName,
    cycles: acc.cycles,
    maxSessionIndexInCycle: acc.maxSessionIndexInCycle,
    maxReps: acc.maxReps,
    resetAtReps: acc.resetAtReps,
  }));
}


