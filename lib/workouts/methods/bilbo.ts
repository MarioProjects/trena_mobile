import type { BilboConfig, BilboState, PerformedSet, PlannedSet } from '../types';

function isFiniteNumber(x: unknown): x is number {
  return typeof x === 'number' && Number.isFinite(x);
}

export function coerceBilboConfig(config: unknown): BilboConfig {
  const c = (config ?? {}) as Partial<BilboConfig>;

  const startWeightKg = isFiniteNumber(c.startWeightKg) ? c.startWeightKg : 20;
  const incrementKg = isFiniteNumber(c.incrementKg) ? c.incrementKg : 2.5;
  const resetAtReps = isFiniteNumber(c.resetAtReps) ? c.resetAtReps : 15;
  const capReps = isFiniteNumber(c.capReps) ? c.capReps : undefined;

  // exercise is required for UX filtering, but the engine can operate without it.
  const exercise = (c.exercise ?? { kind: 'free', name: 'Unknown exercise' }) as BilboConfig['exercise'];

  return {
    exercise,
    startWeightKg,
    incrementKg,
    resetAtReps,
    capReps,
  };
}

export function coerceBilboState(state: unknown, config: BilboConfig): BilboState {
  const s = (state ?? {}) as Partial<BilboState>;
  const currentWeightKg = isFiniteNumber(s.currentWeightKg) ? s.currentWeightKg : config.startWeightKg;
  return { currentWeightKg };
}

export function bilboPlannedSets(state: BilboState): PlannedSet[] {
  // Bilbo: exactly one top set, weight prescribed by the system.
  return [
    {
      id: 'bilbo-top-set',
      kind: 'top',
      weightKg: state.currentWeightKg,
      targetReps: null,
      isAmrap: true,
      label: '1 set (AMRAP)',
    },
  ];
}

export function bilboApplyResult(args: {
  config: BilboConfig;
  state: BilboState;
  performedSets: PerformedSet[];
}): BilboState {
  const { config, state, performedSets } = args;

  const reps = performedSets?.[0]?.reps;
  if (!isFiniteNumber(reps) || reps <= 0) {
    // If nothing was logged, do not advance.
    return state;
  }

  // Cycle rule: when reps fall to or below the reset threshold, restart cycle.
  // Otherwise, add the increment.
  if (reps <= config.resetAtReps) {
    return { currentWeightKg: config.startWeightKg };
  }

  return { currentWeightKg: state.currentWeightKg + config.incrementKg };
}
