import { learnData } from '@/data/learn';
import type { LearnItem } from '@/data/learn/types';
import type { ExerciseRef } from './types';

export type ExerciseTracking =
  | {
      type: 'strength';
    }
  | {
      type: 'interval_time';
      defaultDurationSec?: number;
    }
  | {
      type: 'distance_time';
      distanceUnit?: 'km' | 'm';
      showPace?: boolean;
      defaultLapDistance?: number;
    };

function getLearnExercise(ref: ExerciseRef): LearnItem | undefined {
  if (ref.kind !== 'learn') return undefined;
  return learnData.find((x) => x.id === ref.learnExerciseId);
}

export function defaultTrackingForExerciseRef(ref: ExerciseRef): ExerciseTracking {
  const learn = getLearnExercise(ref);
  const tracking = (learn as any)?.tracking as ExerciseTracking | undefined;
  if (tracking && typeof tracking === 'object' && typeof (tracking as any).type === 'string') {
    return tracking;
  }
  return { type: 'strength' };
}

