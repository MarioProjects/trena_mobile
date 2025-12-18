import type { ExerciseRef, MethodKey, WendlerLiftKey } from '@/lib/workouts/types';

export type AddExerciseDraft = {
  shouldReopen: boolean;
  selectedExercise: ExerciseRef | null;
  methodChoice: MethodKey | null;
  selectedMethodInstanceId: string | null;
  wendlerLift: WendlerLiftKey;
  awaitingCreatedMethodKey: MethodKey | null;
};

let draft: AddExerciseDraft | null = null;

export function setAddExerciseDraft(next: AddExerciseDraft) {
  draft = next;
}

export function getAddExerciseDraft() {
  return draft;
}

export function clearAddExerciseDraft() {
  draft = null;
}

