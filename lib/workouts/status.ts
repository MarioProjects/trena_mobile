import type { WorkoutSessionRow, WorkoutSessionStatus } from './types';

export const WORKOUT_PENDING_THRESHOLD_MS = 15 * 60 * 1000;

export function coerceWorkoutSessionStatus(x: unknown): WorkoutSessionStatus | null {
  if (x === 'pending' || x === 'in_progress' || x === 'done' || x === 'cancelled') return x;
  return null;
}

export function deriveWorkoutSessionStatusFromTimes(args: {
  started_at: string;
  ended_at: string | null;
  nowMs?: number;
  pendingThresholdMs?: number;
}): WorkoutSessionStatus {
  const nowMs = args.nowMs ?? Date.now();
  const pendingThresholdMs = args.pendingThresholdMs ?? WORKOUT_PENDING_THRESHOLD_MS;

  if (args.ended_at) return 'done';
  const startedMs = new Date(args.started_at).getTime();
  const isPending = !Number.isNaN(startedMs) && startedMs > nowMs + pendingThresholdMs;
  return isPending ? 'pending' : 'in_progress';
}

export function getEffectiveWorkoutSessionStatus(
  row: Pick<WorkoutSessionRow, 'status' | 'started_at' | 'ended_at'>
): WorkoutSessionStatus {
  const explicit = coerceWorkoutSessionStatus(row.status);
  if (explicit) return explicit;
  return deriveWorkoutSessionStatusFromTimes({ started_at: row.started_at, ended_at: row.ended_at });
}

