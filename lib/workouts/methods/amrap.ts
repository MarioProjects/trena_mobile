import type { AmrapConfig, AmrapState, PerformedSet, PlannedSet } from '../types';

function isFiniteNumber(x: unknown): x is number {
  return typeof x === 'number' && Number.isFinite(x);
}

export function coerceAmrapConfig(config: unknown): AmrapConfig {
  const c = (config ?? {}) as Partial<AmrapConfig>;

  const startWeightKg = isFiniteNumber(c.startWeightKg) ? c.startWeightKg : 20;
  const incrementKg = isFiniteNumber(c.incrementKg) ? c.incrementKg : 2.5;
  const resetAtReps = isFiniteNumber(c.resetAtReps) ? c.resetAtReps : 15;
  const capReps = isFiniteNumber(c.capReps) ? c.capReps : undefined;

  // exercise is required for UX filtering, but the engine can operate without it.
  const exercise = (c.exercise ?? { kind: 'free', name: 'Unknown exercise' }) as AmrapConfig['exercise'];

  return {
    exercise,
    startWeightKg,
    incrementKg,
    resetAtReps,
    capReps,
  };
}

export function coerceAmrapState(state: unknown, config: AmrapConfig): AmrapState {
  const s = (state ?? {}) as Partial<AmrapState>;
  const currentWeightKg = isFiniteNumber(s.currentWeightKg) ? s.currentWeightKg : config.startWeightKg;
  return { currentWeightKg };
}

export function amrapPlannedSets(state: AmrapState): PlannedSet[] {
  // AMRAP Method: exactly one top set, weight prescribed by the system.
  return [
    {
      id: 'amrap-top-set',
      kind: 'top',
      weightKg: state.currentWeightKg,
      targetReps: null,
      isAmrap: true,
      label: '1 set (AMRAP)',
    },
  ];
}

export function amrapApplyResult(args: {
  config: AmrapConfig;
  state: AmrapState;
  performedSets: PerformedSet[];
}): AmrapState {
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

