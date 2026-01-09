import { ensureOfflineDbReady, getDb, type SyncEntity, type SyncOp } from '@/lib/offline/db';
import { safeJsonParse, safeJsonStringify } from '@/lib/offline/json';
import type { MethodInstanceRow, WorkoutSessionRow, WorkoutSessionSnapshotV1, WorkoutTemplate } from '@/lib/workouts/types';

type OutboxItem = {
  id: string;
  user_id: string;
  entity: SyncEntity;
  op: SyncOp;
  entity_id: string;
  payload_json: string | null;
  created_at: string;
  attempts: number;
  last_error: string | null;
};

function coerceBoolInt(v: unknown, fallback = 0): 0 | 1 {
  if (v === 1 || v === '1' || v === true) return 1;
  if (v === 0 || v === '0' || v === false) return 0;
  return fallback ? 1 : 0;
}

function isoNow() {
  return new Date().toISOString();
}

export async function enqueueOutbox(args: {
  id: string;
  userId: string;
  entity: SyncEntity;
  op: SyncOp;
  entityId: string;
  payload: unknown | null;
}): Promise<void> {
  await ensureOfflineDbReady();
  const db = await getDb();
  await db.runAsync(
    `INSERT INTO sync_queue(id, user_id, entity, op, entity_id, payload_json, created_at, attempts, last_error)
     VALUES(?, ?, ?, ?, ?, ?, ?, 0, NULL)`,
    [
      args.id,
      args.userId,
      args.entity,
      args.op,
      args.entityId,
      args.payload == null ? null : safeJsonStringify(args.payload),
      isoNow(),
    ]
  );
}

export async function listOutbox(args: { userId: string; limit?: number }): Promise<OutboxItem[]> {
  await ensureOfflineDbReady();
  const db = await getDb();
  const limit = Math.max(1, Math.min(500, args.limit ?? 100));
  const rows = await db.getAllAsync<OutboxItem>(
    `SELECT id, user_id, entity, op, entity_id, payload_json, created_at, attempts, last_error
     FROM sync_queue
     WHERE user_id = ?
     ORDER BY created_at ASC
     LIMIT ?`,
    [args.userId, limit]
  );
  return rows ?? [];
}

export async function markOutboxDone(args: { id: string }): Promise<void> {
  await ensureOfflineDbReady();
  const db = await getDb();
  await db.runAsync('DELETE FROM sync_queue WHERE id = ?', [args.id]);
}

export async function markOutboxFailed(args: { id: string; error: string }): Promise<void> {
  await ensureOfflineDbReady();
  const db = await getDb();
  await db.runAsync(
    'UPDATE sync_queue SET attempts = attempts + 1, last_error = ? WHERE id = ?',
    [args.error.slice(0, 2000), args.id]
  );
}

export async function getSyncState(args: { userId: string; entity: SyncEntity }): Promise<string | null> {
  await ensureOfflineDbReady();
  const db = await getDb();
  const row = await db.getFirstAsync<{ last_pulled_at: string | null }>(
    'SELECT last_pulled_at FROM sync_state WHERE user_id = ? AND entity = ?',
    [args.userId, args.entity]
  );
  return row?.last_pulled_at ?? null;
}

export async function setSyncState(args: { userId: string; entity: SyncEntity; lastPulledAt: string }): Promise<void> {
  await ensureOfflineDbReady();
  const db = await getDb();
  await db.runAsync(
    'INSERT OR REPLACE INTO sync_state(user_id, entity, last_pulled_at) VALUES(?, ?, ?)',
    [args.userId, args.entity, args.lastPulledAt]
  );
}

export async function listMethodInstancesLocal(args: { userId: string; includeArchived?: boolean }): Promise<MethodInstanceRow[]> {
  await ensureOfflineDbReady();
  const db = await getDb();
  const includeArchived = !!args.includeArchived;
  const rows = await db.getAllAsync<any>(
    `SELECT id, method_key, scope, name, config_json, state_json, archived, created_at, updated_at
     FROM method_instances
     WHERE user_id = ?
       AND deleted_at IS NULL
       AND (? = 1 OR archived = 0)
     ORDER BY created_at DESC`,
    [args.userId, includeArchived ? 1 : 0]
  );

  return (rows ?? []).map((r) => ({
    id: r.id,
    method_key: r.method_key,
    scope: r.scope,
    name: r.name,
    config: safeJsonParse(r.config_json, {}),
    state: safeJsonParse(r.state_json, {}),
    archived: Boolean(coerceBoolInt(r.archived)),
    created_at: r.created_at ?? undefined,
    updated_at: r.updated_at ?? undefined,
  })) as MethodInstanceRow[];
}

export async function getMethodInstancesByIdsLocal(args: { userId: string; ids: string[] }): Promise<Map<string, MethodInstanceRow>> {
  await ensureOfflineDbReady();
  const db = await getDb();
  const unique = Array.from(new Set(args.ids)).filter(Boolean);
  if (unique.length === 0) return new Map();

  const placeholders = unique.map(() => '?').join(', ');
  const rows = await db.getAllAsync<any>(
    `SELECT id, method_key, scope, name, config_json, state_json, archived, created_at, updated_at
     FROM method_instances
     WHERE user_id = ?
       AND deleted_at IS NULL
       AND id IN (${placeholders})`,
    [args.userId, ...unique]
  );

  const out = new Map<string, MethodInstanceRow>();
  for (const r of rows ?? []) {
    out.set(r.id, {
      id: r.id,
      method_key: r.method_key,
      scope: r.scope,
      name: r.name,
      config: safeJsonParse(r.config_json, {}),
      state: safeJsonParse(r.state_json, {}),
      archived: Boolean(coerceBoolInt(r.archived)),
      created_at: r.created_at ?? undefined,
      updated_at: r.updated_at ?? undefined,
    } as MethodInstanceRow);
  }
  return out;
}

export async function upsertMethodInstanceLocal(args: { userId: string; row: MethodInstanceRow }): Promise<void> {
  await ensureOfflineDbReady();
  const db = await getDb();
  const now = isoNow();
  await db.runAsync(
    `INSERT OR REPLACE INTO method_instances(
        id, user_id, method_key, scope, name, config_json, state_json, archived, created_at, updated_at, deleted_at, last_synced_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, COALESCE(?, ?), ?, NULL, NULL)`,
    [
      args.row.id,
      args.userId,
      args.row.method_key,
      args.row.scope,
      args.row.name,
      safeJsonStringify(args.row.config ?? {}),
      safeJsonStringify(args.row.state ?? {}),
      args.row.archived ? 1 : 0,
      args.row.created_at ?? null,
      now,
      now,
    ]
  );
}

export async function markMethodInstanceDeletedLocal(args: { userId: string; id: string }): Promise<void> {
  await ensureOfflineDbReady();
  const db = await getDb();
  await db.runAsync(
    'UPDATE method_instances SET deleted_at = ?, updated_at = ? WHERE user_id = ? AND id = ?',
    [isoNow(), isoNow(), args.userId, args.id]
  );
}

export async function listTemplatesLocal(args: { userId: string }): Promise<WorkoutTemplate[]> {
  await ensureOfflineDbReady();
  const db = await getDb();
  const rows = await db.getAllAsync<any>(
    `SELECT id, name, items_json, tags_json, created_at, updated_at
     FROM workout_templates
     WHERE user_id = ?
       AND deleted_at IS NULL
     ORDER BY created_at DESC`,
    [args.userId]
  );

  return (rows ?? []).map((r) => ({
    id: r.id,
    name: r.name,
    items: safeJsonParse(r.items_json, []),
    tags: safeJsonParse(r.tags_json, undefined as any),
    created_at: r.created_at ?? undefined,
    updated_at: r.updated_at ?? undefined,
  })) as WorkoutTemplate[];
}

export async function getTemplateLocal(args: { userId: string; id: string }): Promise<WorkoutTemplate | null> {
  await ensureOfflineDbReady();
  const db = await getDb();
  const row = await db.getFirstAsync<any>(
    `SELECT id, name, items_json, tags_json, created_at, updated_at
     FROM workout_templates
     WHERE user_id = ?
       AND deleted_at IS NULL
       AND id = ?
     LIMIT 1`,
    [args.userId, args.id]
  );
  if (!row) return null;
  return {
    id: row.id,
    name: row.name,
    items: safeJsonParse(row.items_json, []),
    tags: safeJsonParse(row.tags_json, undefined as any),
    created_at: row.created_at ?? undefined,
    updated_at: row.updated_at ?? undefined,
  } as WorkoutTemplate;
}

export async function upsertTemplateLocal(args: { userId: string; row: WorkoutTemplate }): Promise<void> {
  await ensureOfflineDbReady();
  const db = await getDb();
  const now = isoNow();
  await db.runAsync(
    `INSERT OR REPLACE INTO workout_templates(
        id, user_id, name, items_json, tags_json, created_at, updated_at, deleted_at, last_synced_at
      ) VALUES (?, ?, ?, ?, ?, COALESCE(?, ?), ?, NULL, NULL)`,
    [
      args.row.id,
      args.userId,
      args.row.name,
      safeJsonStringify(args.row.items ?? []),
      args.row.tags ? safeJsonStringify(args.row.tags) : null,
      args.row.created_at ?? null,
      now,
      now,
    ]
  );
}

export async function markTemplateDeletedLocal(args: { userId: string; id: string }): Promise<void> {
  await ensureOfflineDbReady();
  const db = await getDb();
  await db.runAsync(
    'UPDATE workout_templates SET deleted_at = ?, updated_at = ? WHERE user_id = ? AND id = ?',
    [isoNow(), isoNow(), args.userId, args.id]
  );
}

export async function listSessionsLocal(args: { userId: string; limit?: number }): Promise<WorkoutSessionRow[]> {
  await ensureOfflineDbReady();
  const db = await getDb();
  const limit = Math.max(1, Math.min(200, args.limit ?? 20));
  const rows = await db.getAllAsync<any>(
    `SELECT id, title, template_id, started_at, ended_at, tags_json, snapshot_json, created_at, updated_at
     FROM workout_sessions
     WHERE user_id = ?
       AND deleted_at IS NULL
     ORDER BY started_at DESC
     LIMIT ?`,
    [args.userId, limit]
  );

  return (rows ?? []).map((r) => ({
    id: r.id,
    title: r.title,
    template_id: r.template_id ?? null,
    started_at: r.started_at,
    ended_at: r.ended_at ?? null,
    tags: safeJsonParse(r.tags_json, undefined as any),
    snapshot: safeJsonParse(r.snapshot_json, { version: 1, exercises: [] } satisfies WorkoutSessionSnapshotV1),
    created_at: r.created_at ?? undefined,
    updated_at: r.updated_at ?? undefined,
  })) as WorkoutSessionRow[];
}

export async function listCompletedSessionsForStatsLocal(args: {
  userId: string;
  max?: number;
  pageSize?: number;
}): Promise<WorkoutSessionRow[]> {
  await ensureOfflineDbReady();
  const db = await getDb();
  const max = Math.max(1, args.max ?? 5000);
  const pageSize = Math.max(1, Math.min(500, args.pageSize ?? 500));

  const out: WorkoutSessionRow[] = [];
  for (let offset = 0; offset < max; offset += pageSize) {
    const rows = await db.getAllAsync<any>(
      `SELECT id, title, template_id, started_at, ended_at, tags_json, snapshot_json, created_at, updated_at
       FROM workout_sessions
       WHERE user_id = ?
         AND deleted_at IS NULL
         AND ended_at IS NOT NULL
       ORDER BY started_at DESC
       LIMIT ? OFFSET ?`,
      [args.userId, pageSize, offset]
    );

    const mapped = (rows ?? []).map(
      (r) =>
        ({
          id: r.id,
          title: r.title,
          template_id: r.template_id ?? null,
          started_at: r.started_at,
          ended_at: r.ended_at ?? null,
          tags: safeJsonParse(r.tags_json, undefined as any),
          snapshot: safeJsonParse(r.snapshot_json, { version: 1, exercises: [] } satisfies WorkoutSessionSnapshotV1),
          created_at: r.created_at ?? undefined,
          updated_at: r.updated_at ?? undefined,
        }) as WorkoutSessionRow
    );

    out.push(...mapped);
    if (mapped.length < pageSize) break;
  }

  return out;
}

export async function getSessionLocal(args: { userId: string; id: string }): Promise<WorkoutSessionRow | null> {
  await ensureOfflineDbReady();
  const db = await getDb();
  const row = await db.getFirstAsync<any>(
    `SELECT id, title, template_id, started_at, ended_at, tags_json, snapshot_json, created_at, updated_at
     FROM workout_sessions
     WHERE user_id = ?
       AND deleted_at IS NULL
       AND id = ?
     LIMIT 1`,
    [args.userId, args.id]
  );
  if (!row) return null;
  return {
    id: row.id,
    title: row.title,
    template_id: row.template_id ?? null,
    started_at: row.started_at,
    ended_at: row.ended_at ?? null,
    tags: safeJsonParse(row.tags_json, undefined as any),
    snapshot: safeJsonParse(row.snapshot_json, { version: 1, exercises: [] } satisfies WorkoutSessionSnapshotV1),
    created_at: row.created_at ?? undefined,
    updated_at: row.updated_at ?? undefined,
  } as WorkoutSessionRow;
}

export async function upsertSessionLocal(args: { userId: string; row: WorkoutSessionRow }): Promise<void> {
  await ensureOfflineDbReady();
  const db = await getDb();
  const now = isoNow();
  await db.runAsync(
    `INSERT OR REPLACE INTO workout_sessions(
        id, user_id, title, template_id, started_at, ended_at, tags_json, snapshot_json, created_at, updated_at, deleted_at, last_synced_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, COALESCE(?, ?), ?, NULL, NULL)`,
    [
      args.row.id,
      args.userId,
      args.row.title,
      args.row.template_id,
      args.row.started_at,
      args.row.ended_at,
      args.row.tags ? safeJsonStringify(args.row.tags) : null,
      safeJsonStringify(args.row.snapshot ?? ({ version: 1, exercises: [] } satisfies WorkoutSessionSnapshotV1)),
      args.row.created_at ?? null,
      now,
      now,
    ]
  );
}

export async function updateSessionFieldsLocal(args: {
  userId: string;
  id: string;
  patch: Partial<Pick<WorkoutSessionRow, 'title' | 'started_at' | 'ended_at' | 'tags' | 'snapshot'>>;
}): Promise<void> {
  await ensureOfflineDbReady();
  const now = isoNow();
  const cur = await getSessionLocal({ userId: args.userId, id: args.id });
  if (!cur) return;

  const next: WorkoutSessionRow = {
    ...cur,
    ...args.patch,
    tags: args.patch.tags ?? cur.tags,
    snapshot: args.patch.snapshot ?? cur.snapshot,
  };

  await upsertSessionLocal({ userId: args.userId, row: { ...next, updated_at: now } });
}

export async function markSessionDeletedLocal(args: { userId: string; id: string }): Promise<void> {
  await ensureOfflineDbReady();
  const db = await getDb();
  await db.runAsync(
    'UPDATE workout_sessions SET deleted_at = ?, updated_at = ? WHERE user_id = ? AND id = ?',
    [isoNow(), isoNow(), args.userId, args.id]
  );
}

export async function listRecentCompletedSessionsLocal(args: { userId: string; limit?: number }): Promise<WorkoutSessionRow[]> {
  await ensureOfflineDbReady();
  const db = await getDb();
  const limit = Math.max(1, Math.min(500, args.limit ?? 200));
  const rows = await db.getAllAsync<any>(
    `SELECT id, title, template_id, started_at, ended_at, tags_json, snapshot_json, created_at, updated_at
     FROM workout_sessions
     WHERE user_id = ?
       AND deleted_at IS NULL
       AND ended_at IS NOT NULL
     ORDER BY ended_at DESC
     LIMIT ?`,
    [args.userId, limit]
  );

  return (rows ?? []).map((r) => ({
    id: r.id,
    title: r.title,
    template_id: r.template_id ?? null,
    started_at: r.started_at,
    ended_at: r.ended_at ?? null,
    tags: safeJsonParse(r.tags_json, undefined as any),
    snapshot: safeJsonParse(r.snapshot_json, { version: 1, exercises: [] } satisfies WorkoutSessionSnapshotV1),
    created_at: r.created_at ?? undefined,
    updated_at: r.updated_at ?? undefined,
  })) as WorkoutSessionRow[];
}

export async function applyRemoteMethodInstanceLocal(args: {
  userId: string;
  row: {
    id: string;
    method_key: string;
    scope: string;
    name: string;
    config: unknown;
    state: unknown;
    archived: boolean;
    created_at?: string;
    updated_at?: string;
  };
  lastSyncedAt: string;
}): Promise<void> {
  await ensureOfflineDbReady();
  const db = await getDb();
  await db.runAsync(
    `INSERT OR REPLACE INTO method_instances(
        id, user_id, method_key, scope, name, config_json, state_json, archived, created_at, updated_at, deleted_at, last_synced_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, ?)`,
    [
      args.row.id,
      args.userId,
      args.row.method_key,
      args.row.scope,
      args.row.name,
      safeJsonStringify(args.row.config ?? {}),
      safeJsonStringify(args.row.state ?? {}),
      args.row.archived ? 1 : 0,
      args.row.created_at ?? null,
      args.row.updated_at ?? null,
      args.lastSyncedAt,
    ]
  );
}

export async function applyRemoteTemplateLocal(args: {
  userId: string;
  row: {
    id: string;
    name: string;
    items: unknown;
    tags?: unknown;
    created_at?: string;
    updated_at?: string;
  };
  lastSyncedAt: string;
}): Promise<void> {
  await ensureOfflineDbReady();
  const db = await getDb();
  await db.runAsync(
    `INSERT OR REPLACE INTO workout_templates(
        id, user_id, name, items_json, tags_json, created_at, updated_at, deleted_at, last_synced_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, NULL, ?)`,
    [
      args.row.id,
      args.userId,
      args.row.name,
      safeJsonStringify(args.row.items ?? []),
      args.row.tags != null ? safeJsonStringify(args.row.tags) : null,
      args.row.created_at ?? null,
      args.row.updated_at ?? null,
      args.lastSyncedAt,
    ]
  );
}

export async function applyRemoteSessionLocal(args: {
  userId: string;
  row: {
    id: string;
    title: string;
    template_id: string | null;
    started_at: string;
    ended_at: string | null;
    tags?: unknown;
    snapshot: unknown;
    created_at?: string;
    updated_at?: string;
  };
  lastSyncedAt: string;
}): Promise<void> {
  await ensureOfflineDbReady();
  const db = await getDb();
  await db.runAsync(
    `INSERT OR REPLACE INTO workout_sessions(
        id, user_id, title, template_id, started_at, ended_at, tags_json, snapshot_json, created_at, updated_at, deleted_at, last_synced_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, ?)`,
    [
      args.row.id,
      args.userId,
      args.row.title,
      args.row.template_id,
      args.row.started_at,
      args.row.ended_at,
      args.row.tags != null ? safeJsonStringify(args.row.tags) : null,
      safeJsonStringify(args.row.snapshot ?? { version: 1, exercises: [] }),
      args.row.created_at ?? null,
      args.row.updated_at ?? null,
      args.lastSyncedAt,
    ]
  );
}

