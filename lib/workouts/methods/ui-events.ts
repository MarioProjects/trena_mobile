import type { MethodInstanceRow } from '@/lib/workouts/types';

/**
 * Tiny in-memory event bus to pass newly-created method instances back to the UI
 * that initiated creation (e.g., unified Add Exercise modal).
 *
 * Why not navigation params?
 * - We want to preserve in-progress state in the originating screen/modal.
 * - Expo Router param round-trips tend to require replacing/pushing routes, which
 *   can reset local state and complicate flows.
 *
 * This is intentionally minimal and synchronous.
 */

type Listener = (row: MethodInstanceRow) => void;

const listeners = new Set<Listener>();
const createdQueue: MethodInstanceRow[] = [];

export function emitMethodInstanceCreated(row: MethodInstanceRow) {
  createdQueue.push(row);
  for (const l of listeners) l(row);
}

export function subscribeMethodInstanceCreated(listener: Listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/**
 * Consume (and clear) any created rows that happened while no listener was active.
 * Useful when a create wizard returns and the initiating UI is re-mounted.
 */
export function consumeMethodInstanceCreatedQueue() {
  const items = [...createdQueue];
  createdQueue.length = 0;
  return items;
}

