export const WORKOUT_TAGS = [
  'skippingrope',
  'leg',
  'yoga',
  'chess',
  'bicycle',
  'snow',
  'hourglass',
  'pin',
  'pizza',
  'rollerskate',
  'apple',
  'backpack',
  'mountain',
  'bug',
  'rain',
  'car',
  'video',
  'battery',
  'muscle',
  'leaf',
  'ball',
  'drop',
  'fire',
  'shoe',
  'happy',
  'neutral',
  'sad',
  'dumbbell',
  'star',
  'brain',
] as const;

export type WorkoutTag = (typeof WORKOUT_TAGS)[number];

export const MAX_WORKOUT_TAGS = 3;

const TAG_INDEX = Object.fromEntries(WORKOUT_TAGS.map((t, i) => [t, i])) as Record<WorkoutTag, number>;

export function sortWorkoutTags(tags: WorkoutTag[]): WorkoutTag[] {
  return [...tags].sort((a, b) => TAG_INDEX[a] - TAG_INDEX[b]);
}

export function isWorkoutTag(x: unknown): x is WorkoutTag {
  return typeof x === 'string' && (WORKOUT_TAGS as readonly string[]).includes(x);
}

export function coerceWorkoutTags(x: unknown): WorkoutTag[] {
  if (!Array.isArray(x)) return [];
  const filtered = x.filter(isWorkoutTag) as WorkoutTag[];
  return sortWorkoutTags(filtered).slice(0, MAX_WORKOUT_TAGS);
}

