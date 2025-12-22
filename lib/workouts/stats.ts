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
  endedAt: string;
  reps: number;
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
};

type BilboInstanceAcc = {
  cycles: BilboCycle[];
  curCycle: BilboCycle | null;
  curCycleIndex: number;
  curSessionIndex: number;
  maxSessionIndexInCycle: number;
  maxReps: number;
  exerciseName?: string;
};

function shouldStartNewBilboCycle(args: { config: BilboConfig; stateAtStart: BilboState; acc: BilboInstanceAcc }): boolean {
  // Heuristic: Bilbo resets by setting currentWeight back to startWeight for the *next* session.
  // If we see the state at the start equals startWeight, that's the first session of a cycle.
  if (args.stateAtStart.currentWeightKg !== args.config.startWeightKg) return false;
  // If there is no current cycle, this is definitely a new one.
  if (!args.acc.curCycle) return true;
  // Otherwise, treat it as a new cycle boundary.
  return true;
}

/**
 * Build Bilbo cycle series for charts.\n+ *\n+ * Sorting: sessions are processed by `ended_at` ascending (completed workouts only).\n+ * Cycle boundaries: determined via `methodStateAtStart.currentWeightKg === config.startWeightKg`.\n+ */
export function bilboCyclesSeries(args: { sessions: WorkoutSessionRow[] }): BilboInstanceSeries[] {
  const completed = args.sessions
    .filter((s) => Boolean(s.ended_at))
    .slice()
    .sort((a, b) => new Date(a.ended_at ?? 0).getTime() - new Date(b.ended_at ?? 0).getTime());

  const byInstance = new Map<string, BilboInstanceAcc>();

  for (const s of completed) {
    const endedAt = s.ended_at!;
    const exercises = s.snapshot?.exercises ?? [];

    for (const ex of exercises) {
      if (!isBilboExercise(ex)) continue;

      const reps = getBilboReps(ex);
      if (reps == null) continue;

      const methodInstanceId = ex.source.methodInstanceId;
      const config = coerceBilboConfig(ex.source.methodConfig) as BilboConfig;
      const stateAtStart = coerceBilboState(ex.source.methodStateAtStart, config) as BilboState;

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
        } satisfies BilboInstanceAcc);

      if (!byInstance.has(methodInstanceId)) byInstance.set(methodInstanceId, acc);
      if (!acc.exerciseName && config.exercise) acc.exerciseName = formatExerciseName(config.exercise);

      const startNew = shouldStartNewBilboCycle({ config, stateAtStart, acc });
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
        endedAt,
        reps,
        sessionIndexInCycle: acc.curSessionIndex,
      });

      acc.maxSessionIndexInCycle = Math.max(acc.maxSessionIndexInCycle, acc.curSessionIndex);
      acc.maxReps = Math.max(acc.maxReps, reps);
    }
  }

  return Array.from(byInstance.entries()).map(([methodInstanceId, acc]) => ({
    methodInstanceId,
    exerciseName: acc.exerciseName,
    cycles: acc.cycles,
    maxSessionIndexInCycle: acc.maxSessionIndexInCycle,
    maxReps: acc.maxReps,
  }));
}


