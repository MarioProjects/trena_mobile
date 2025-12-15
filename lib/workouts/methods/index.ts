import type {
    BilboConfig,
    BilboState,
    MethodBinding,
    MethodKey,
    PerformedSet,
    PlannedSet,
    Wendler531Config,
    Wendler531State,
    WendlerLiftKey,
} from '../types';
import {
    bilboApplyResult,
    bilboPlannedSets,
    coerceBilboConfig,
    coerceBilboState,
} from './bilbo';
import {
    coerceWendler531Config,
    coerceWendler531State,
    wendler531AdvanceIfCompleted,
    wendler531PlannedSets,
} from './wendler531';

export function generatePlannedSets(args: {
  methodKey: MethodKey;
  binding: MethodBinding;
  methodConfig: unknown;
  methodState: unknown;
}): { plannedSets: PlannedSet[]; coercedConfig: unknown; coercedState: unknown } {
  if (args.methodKey === 'bilbo') {
    const config = coerceBilboConfig(args.methodConfig);
    const state = coerceBilboState(args.methodState, config);
    return {
      plannedSets: bilboPlannedSets(state),
      coercedConfig: config,
      coercedState: state,
    };
  }

  const config = coerceWendler531Config(args.methodConfig);
  const state = coerceWendler531State(args.methodState, config);

  const binding = args.binding;
  const lift = (binding.methodKey === 'wendler_531' ? binding.lift : 'bench') as WendlerLiftKey;

  return {
    plannedSets: wendler531PlannedSets({ config, state, lift }),
    coercedConfig: config,
    coercedState: state,
  };
}

export function applyMethodResult(args: {
  methodKey: MethodKey;
  methodConfig: unknown;
  methodState: unknown;
  binding: MethodBinding;
  performedSets: PerformedSet[];
}): { nextState: unknown; completed: boolean } {
  if (args.methodKey === 'bilbo') {
    const config = coerceBilboConfig(args.methodConfig) as BilboConfig;
    const state = coerceBilboState(args.methodState, config) as BilboState;

    const next = bilboApplyResult({ config, state, performedSets: args.performedSets });
    const completed = (args.performedSets?.[0]?.reps ?? 0) > 0;
    return { nextState: next, completed };
  }

  const config = coerceWendler531Config(args.methodConfig) as Wendler531Config;
  const state = coerceWendler531State(args.methodState, config) as Wendler531State;

  // For 5/3/1, we treat the method as "completed" for the session if at least one set is logged.
  const completed = (args.performedSets?.length ?? 0) > 0;
  const next = wendler531AdvanceIfCompleted({ config, state, completed });
  return { nextState: next, completed };
}
