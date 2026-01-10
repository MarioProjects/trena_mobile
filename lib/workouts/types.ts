import type { WorkoutTag } from './tags';

export type MethodKey = 'amrap' | 'wendler_531' | 'bilbo'; // 'bilbo' is legacy name for 'amrap'
export type MethodScope = 'exercise' | 'group';

export type ExerciseTracking =
  | { type: 'strength' }
  | { type: 'interval_time'; defaultDurationSec?: number }
  | { type: 'distance_time'; distanceUnit?: 'km' | 'm'; showPace?: boolean; defaultLapDistance?: number };

export type LearnExerciseRef = {
  kind: 'learn';
  learnExerciseId: string;
};

export type FreeExerciseRef = {
  kind: 'free';
  name: string;
};

export type ExerciseRef = LearnExerciseRef | FreeExerciseRef;

export type WendlerLiftKey = 'squat' | 'bench' | 'deadlift' | 'press';

export type MethodBinding =
  | {
    methodKey: 'amrap';
  }
  | {
    methodKey: 'wendler_531';
    lift: WendlerLiftKey;
  };

export type WorkoutTemplateItem =
  | {
    id: string;
    type: 'free';
    exercise: ExerciseRef;
    supersetId?: string;
    note?: string;
  }
  | {
    id: string;
    type: 'method';
    exercise: ExerciseRef;
    methodInstanceId: string;
    binding: MethodBinding;
    supersetId?: string;
    note?: string;
  };

export type WorkoutTemplate = {
  id: string;
  name: string;
  items: WorkoutTemplateItem[];
  tags?: WorkoutTag[];
  created_at?: string;
  updated_at?: string;
};

export type PlannedSet = {
  id: string;
  kind: 'work' | 'top' | 'deload';
  weightKg: number;
  targetReps: number | null;
  isAmrap?: boolean;
  label?: string;
};

export type PerformedSet = {
  id: string;
  // Strength-style
  weightKg?: number;
  reps?: number;
  rir?: number;

  // Timed / cardio-style
  durationSec?: number;
  distanceKm?: number;

  isAmrap?: boolean;
  done?: boolean;
};

export type SessionExerciseSource =
  | {
    type: 'free';
  }
  | {
    type: 'method';
    methodInstanceId: string;
    methodKey: MethodKey;
    binding: MethodBinding;
    methodConfig: unknown;
    methodStateAtStart: unknown;
  };

export type SessionExercise = {
  id: string;
  exercise: ExerciseRef;
  source: SessionExerciseSource;
  supersetId?: string;
  /**
   * Determines how to log this exercise in a session UI.
   * If omitted, assume strength-style logging.
   */
  tracking?: ExerciseTracking;
  loggingMode?: 'expanded' | 'compact';
  plannedSets: PlannedSet[];
  performedSets: PerformedSet[];
  notes?: string;
};

export type WorkoutSessionSnapshotV1 = {
  version: 1;
  exercises: SessionExercise[];
  notes?: string;
};

export type WorkoutSessionStatus = 'pending' | 'in_progress' | 'done' | 'cancelled';

export type WorkoutSessionRow = {
  id: string;
  title: string;
  template_id: string | null;
  started_at: string;
  ended_at: string | null;
  /**
   * Optional explicit status (backwards-compatible).
   * If omitted, UI may derive status from started_at / ended_at.
   */
  status?: WorkoutSessionStatus | null;
  tags?: WorkoutTag[];
  snapshot: WorkoutSessionSnapshotV1;
  created_at?: string;
  updated_at?: string;
};

export type AmrapConfig = {
  exercise: ExerciseRef;
  startWeightKg: number;
  incrementKg: number;
  resetAtReps: number;
  capReps?: number;
};

export type AmrapState = {
  currentWeightKg: number;
};

export type Wendler531Config = {
  roundingKg: number;
  upperIncrementKg: number;
  lowerIncrementKg: number;
  trainingMaxKg: Record<WendlerLiftKey, number>;
};

export type Wendler531State = {
  weekIndex: 1 | 2 | 3 | 4;
  cycleIndex: number;
  trainingMaxKg: Record<WendlerLiftKey, number>;
};

export type MethodInstanceRow = {
  id: string;
  method_key: MethodKey;
  scope: MethodScope;
  name: string;
  config: unknown;
  state: unknown;
  archived: boolean;
  created_at?: string;
  updated_at?: string;
};
