import type { PlannedSet, Wendler531Config, Wendler531State, WendlerLiftKey } from '../types';

function isFiniteNumber(x: unknown): x is number {
  return typeof x === 'number' && Number.isFinite(x);
}

function roundToIncrementKg(valueKg: number, incrementKg: number) {
  if (!Number.isFinite(valueKg)) return 0;
  const inc = incrementKg > 0 ? incrementKg : 2.5;
  return Math.round(valueKg / inc) * inc;
}

export function coerceWendler531Config(config: unknown): Wendler531Config {
  const c = (config ?? {}) as Partial<Wendler531Config>;

  const roundingKg = isFiniteNumber(c.roundingKg) ? c.roundingKg : 2.5;
  const upperIncrementKg = isFiniteNumber(c.upperIncrementKg) ? c.upperIncrementKg : 2.5;
  const lowerIncrementKg = isFiniteNumber(c.lowerIncrementKg) ? c.lowerIncrementKg : 5;

  const tm = (c.trainingMaxKg ?? {}) as Partial<Record<WendlerLiftKey, number>>;
  const trainingMaxKg: Record<WendlerLiftKey, number> = {
    squat: isFiniteNumber(tm.squat) ? tm.squat : 100,
    bench: isFiniteNumber(tm.bench) ? tm.bench : 80,
    deadlift: isFiniteNumber(tm.deadlift) ? tm.deadlift : 120,
    press: isFiniteNumber(tm.press) ? tm.press : 50,
  };

  return {
    roundingKg,
    upperIncrementKg,
    lowerIncrementKg,
    trainingMaxKg,
  };
}

export function coerceWendler531State(state: unknown, config: Wendler531Config): Wendler531State {
  const s = (state ?? {}) as Partial<Wendler531State>;
  const weekIndexRaw = s.weekIndex;
  const weekIndex = (weekIndexRaw === 1 || weekIndexRaw === 2 || weekIndexRaw === 3 || weekIndexRaw === 4
    ? weekIndexRaw
    : 1) as 1 | 2 | 3 | 4;

  const cycleIndex = isFiniteNumber(s.cycleIndex) ? Math.max(0, Math.floor(s.cycleIndex)) : 0;

  const tm = (s.trainingMaxKg ?? config.trainingMaxKg) as Partial<Record<WendlerLiftKey, number>>;
  const trainingMaxKg: Record<WendlerLiftKey, number> = {
    squat: isFiniteNumber(tm.squat) ? tm.squat : config.trainingMaxKg.squat,
    bench: isFiniteNumber(tm.bench) ? tm.bench : config.trainingMaxKg.bench,
    deadlift: isFiniteNumber(tm.deadlift) ? tm.deadlift : config.trainingMaxKg.deadlift,
    press: isFiniteNumber(tm.press) ? tm.press : config.trainingMaxKg.press,
  };

  return { weekIndex, cycleIndex, trainingMaxKg };
}

const weekPercents: Record<1 | 2 | 3 | 4, [number, number, number]> = {
  1: [0.65, 0.75, 0.85],
  2: [0.7, 0.8, 0.9],
  3: [0.75, 0.85, 0.95],
  4: [0.4, 0.5, 0.6],
};

const weekTargets: Record<1 | 2 | 3 | 4, [number, number, number]> = {
  1: [5, 5, 5],
  2: [3, 3, 3],
  3: [5, 3, 1],
  4: [5, 5, 5],
};

export function wendler531PlannedSets(args: {
  config: Wendler531Config;
  state: Wendler531State;
  lift: WendlerLiftKey;
}): PlannedSet[] {
  const { config, state, lift } = args;
  const week = state.weekIndex;
  const tm = state.trainingMaxKg[lift];
  const [p1, p2, p3] = weekPercents[week];
  const [r1, r2, r3] = weekTargets[week];

  const w1 = roundToIncrementKg(tm * p1, config.roundingKg);
  const w2 = roundToIncrementKg(tm * p2, config.roundingKg);
  const w3 = roundToIncrementKg(tm * p3, config.roundingKg);

  const isDeload = week === 4;
  const amrap = !isDeload;

  return [
    {
      id: `531-${lift}-1`,
      kind: isDeload ? 'deload' : 'work',
      weightKg: w1,
      targetReps: r1,
      label: `${Math.round(p1 * 100)}% x ${r1}`,
    },
    {
      id: `531-${lift}-2`,
      kind: isDeload ? 'deload' : 'work',
      weightKg: w2,
      targetReps: r2,
      label: `${Math.round(p2 * 100)}% x ${r2}`,
    },
    {
      id: `531-${lift}-3`,
      kind: isDeload ? 'deload' : 'top',
      weightKg: w3,
      targetReps: r3,
      isAmrap: amrap,
      label: amrap ? `${Math.round(p3 * 100)}% x ${r3}+` : `${Math.round(p3 * 100)}% x ${r3}`,
    },
  ];
}

export function wendler531AdvanceIfCompleted(args: {
  config: Wendler531Config;
  state: Wendler531State;
  completed: boolean;
}): Wendler531State {
  const { config, state, completed } = args;
  if (!completed) return state;

  if (state.weekIndex !== 4) {
    return {
      ...state,
      weekIndex: (state.weekIndex + 1) as 1 | 2 | 3 | 4,
    };
  }

  // Week 4 completed: advance cycle and increase training maxes.
  const nextTm: Record<WendlerLiftKey, number> = {
    squat: state.trainingMaxKg.squat + config.lowerIncrementKg,
    deadlift: state.trainingMaxKg.deadlift + config.lowerIncrementKg,
    bench: state.trainingMaxKg.bench + config.upperIncrementKg,
    press: state.trainingMaxKg.press + config.upperIncrementKg,
  };

  return {
    weekIndex: 1,
    cycleIndex: state.cycleIndex + 1,
    trainingMaxKg: nextTm,
  };
}
