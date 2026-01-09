import NetInfo from '@react-native-community/netinfo';
import { AppState } from 'react-native';

import { supabase } from '@/lib/supabase';
import {
  applyRemoteMethodInstanceLocal,
  applyRemoteSessionLocal,
  applyRemoteTemplateLocal,
  getSyncState,
  listOutbox,
  markOutboxDone,
  markOutboxFailed,
  setSyncState,
} from '@/lib/workouts/local-repo';

type SyncSummary = {
  pushed: number;
  pulled: { method_instances: number; workout_templates: number; workout_sessions: number };
};

function isoNow() {
  return new Date().toISOString();
}

async function getUserIdFromCachedSession(): Promise<string | null> {
  const { data, error } = await supabase.auth.getSession();
  if (error) return null;
  return data.session?.user?.id ?? null;
}

async function isOnline(): Promise<boolean> {
  const state = await NetInfo.fetch();
  // isConnected is the conservative indicator for “no internet”.
  return state.isConnected === true;
}

export async function runSyncOnce(): Promise<SyncSummary> {
  const userId = await getUserIdFromCachedSession();
  if (!userId) return { pushed: 0, pulled: { method_instances: 0, workout_templates: 0, workout_sessions: 0 } };
  if (!(await isOnline())) return { pushed: 0, pulled: { method_instances: 0, workout_templates: 0, workout_sessions: 0 } };

  let pushed = 0;

  // Push outbox first
  const outbox = await listOutbox({ userId, limit: 200 });
  const pendingKeys = new Set(outbox.map((x) => `${x.entity}:${x.entity_id}`));

  for (const item of outbox) {
    try {
      if (item.op === 'upsert') {
        const payload = item.payload_json ? JSON.parse(item.payload_json) : null;
        if (!payload) throw new Error('Missing outbox payload.');
        const { error } = await supabase.from(item.entity).upsert(payload, { onConflict: 'id' });
        if (error) throw error;
      } else if (item.op === 'delete') {
        const { error } = await supabase.from(item.entity).delete().eq('id', item.entity_id);
        if (error) throw error;
      }
      await markOutboxDone({ id: item.id });
      pushed += 1;
      pendingKeys.delete(`${item.entity}:${item.entity_id}`);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Sync push failed.';
      await markOutboxFailed({ id: item.id, error: msg });
      // Stop early: next items may depend on this one.
      break;
    }
  }

  // Pull deltas
  const pulled = { method_instances: 0, workout_templates: 0, workout_sessions: 0 };
  const lastSyncedAt = isoNow();

  // NOTE: Deletes are not currently detectable from server-side schema (hard deletes).
  // We only apply remote upserts.
  async function pullTable(args: {
    entity: 'method_instances' | 'workout_templates' | 'workout_sessions';
    select: string;
    apply: (row: any) => Promise<void>;
  }) {
    const since = await getSyncState({ userId, entity: args.entity });
    let maxUpdatedAt: string | null = since;

    for (let from = 0; from < 5000; from += 500) {
      const to = from + 499;
      let q = supabase.from(args.entity).select(args.select).order('updated_at', { ascending: true }).range(from, to);
      if (since) q = q.gt('updated_at', since);
      const { data, error } = await q;
      if (error) throw error;

      const rows = data ?? [];
      for (const row of rows) {
        const id = row.id as string | undefined;
        if (id && pendingKeys.has(`${args.entity}:${id}`)) continue;
        await args.apply(row);
        const u = row.updated_at as string | undefined;
        if (u && (!maxUpdatedAt || new Date(u).getTime() > new Date(maxUpdatedAt).getTime())) {
          maxUpdatedAt = u;
        }
      }

      if (rows.length < to - from + 1) break;
    }

    if (maxUpdatedAt && maxUpdatedAt !== since) {
      await setSyncState({ userId, entity: args.entity, lastPulledAt: maxUpdatedAt });
    }

    return maxUpdatedAt;
  }

  await pullTable({
    entity: 'method_instances',
    select: 'id, method_key, scope, name, config, state, archived, created_at, updated_at',
    apply: async (row) => {
      await applyRemoteMethodInstanceLocal({ userId, row, lastSyncedAt });
      pulled.method_instances += 1;
    },
  });

  await pullTable({
    entity: 'workout_templates',
    select: 'id, name, items, tags, created_at, updated_at',
    apply: async (row) => {
      await applyRemoteTemplateLocal({ userId, row, lastSyncedAt });
      pulled.workout_templates += 1;
    },
  });

  await pullTable({
    entity: 'workout_sessions',
    select: 'id, title, template_id, started_at, ended_at, tags, snapshot, created_at, updated_at',
    apply: async (row) => {
      await applyRemoteSessionLocal({ userId, row, lastSyncedAt });
      pulled.workout_sessions += 1;
    },
  });

  return { pushed, pulled };
}

let started = false;
let netinfoUnsub: (() => void) | null = null;
let appStateSub: { remove: () => void } | null = null;
let timer: ReturnType<typeof setInterval> | null = null;

/**
 * Best-effort background sync triggers.
 *
 * - Runs once immediately
 * - Runs on connectivity regained
 * - Runs when app returns to foreground
 * - Runs periodically (every 60s) while app is active
 */
export function startAutoSync() {
  if (started) return;
  started = true;

  void runSyncOnce();

  netinfoUnsub = NetInfo.addEventListener((state) => {
    if (state.isConnected) void runSyncOnce();
  });

  appStateSub = AppState.addEventListener('change', (next) => {
    if (next === 'active') void runSyncOnce();
  });

  timer = setInterval(() => {
    if (AppState.currentState === 'active') void runSyncOnce();
  }, 60_000);
}

export function stopAutoSync() {
  started = false;
  netinfoUnsub?.();
  netinfoUnsub = null;
  appStateSub?.remove();
  appStateSub = null;
  if (timer) clearInterval(timer);
  timer = null;
}

