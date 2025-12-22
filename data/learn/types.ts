export type LearnItemType = 'method' | 'exercise';

export type LearnExerciseTracking =
  | {
      /**
       * Standard gym logging: reps + weight (and optionally RIR).
       */
      type: 'strength';
    }
  | {
      /**
       * Interval-style cardio: multiple timed efforts (e.g. jump rope rounds).
       */
      type: 'interval_time';
      /**
       * Optional UI hint for quick entry.
       */
      defaultDurationSec?: number;
    }
  | {
      /**
       * Distance + time (pace can be derived), e.g. running or swimming.
       */
      type: 'distance_time';
      distanceUnit?: 'km' | 'm';
      /**
       * If true, the UI can show derived pace (min/km).
       */
      showPace?: boolean;
      /**
       * Optional UI hint for quick entry.
       */
      defaultLapDistance?: number;
    };

export type LearnItem = {
  id: string;
  name: string;
  type: LearnItemType;
  description: string;
  long_description: string;
  level: string;
  days_per_week: string;
  goal: string;
  equipment: string[];
  dos: string[];
  donts: string[];
  tags: string[];
  image: string;
  /**
   * Determines what the app should log for this exercise inside a workout session.
   * If omitted, the app should assume strength-style logging.
   */
  tracking?: LearnExerciseTracking;
  videoUrl?: string;
  isFavorite?: boolean;
};

export type LearnData = LearnItem[];
