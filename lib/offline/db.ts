import * as SQLite from 'expo-sqlite';

export type SyncEntity = 'workout_sessions' | 'workout_templates' | 'method_instances';
export type SyncOp = 'upsert' | 'delete';

let dbPromise: Promise<SQLite.SQLiteDatabase> | null = null;
let migrationsPromise: Promise<void> | null = null;

async function openDb(): Promise<SQLite.SQLiteDatabase> {
  const db = await SQLite.openDatabaseAsync('trena.db');
  // WAL improves concurrency and is safe for our workload.
  await db.execAsync('PRAGMA journal_mode = WAL;');
  await db.execAsync('PRAGMA foreign_keys = ON;');
  return db;
}

export async function getDb(): Promise<SQLite.SQLiteDatabase> {
  if (!dbPromise) dbPromise = openDb();
  return dbPromise;
}

async function getSchemaVersion(db: SQLite.SQLiteDatabase): Promise<number> {
  await db.execAsync(
    'CREATE TABLE IF NOT EXISTS __meta (key TEXT PRIMARY KEY NOT NULL, value TEXT NOT NULL);'
  );
  const row = await db.getFirstAsync<{ value: string }>('SELECT value FROM __meta WHERE key = ?', ['schema_version']);
  const v = row?.value ? Number.parseInt(row.value, 10) : 0;
  return Number.isFinite(v) ? v : 0;
}

async function setSchemaVersion(db: SQLite.SQLiteDatabase, version: number): Promise<void> {
  await db.runAsync('INSERT OR REPLACE INTO __meta(key, value) VALUES(?, ?)', ['schema_version', String(version)]);
}

async function migrateToV1(db: SQLite.SQLiteDatabase): Promise<void> {
  // Local mirror tables for offline-first.
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS workout_sessions (
      id TEXT PRIMARY KEY NOT NULL,
      user_id TEXT NOT NULL,
      title TEXT NOT NULL,
      template_id TEXT NULL,
      started_at TEXT NOT NULL,
      ended_at TEXT NULL,
      tags_json TEXT NULL,
      snapshot_json TEXT NOT NULL,
      created_at TEXT NULL,
      updated_at TEXT NULL,
      deleted_at TEXT NULL,
      last_synced_at TEXT NULL
    );

    CREATE INDEX IF NOT EXISTS workout_sessions_user_started_idx
      ON workout_sessions(user_id, started_at);
    CREATE INDEX IF NOT EXISTS workout_sessions_user_ended_idx
      ON workout_sessions(user_id, ended_at);

    CREATE TABLE IF NOT EXISTS workout_templates (
      id TEXT PRIMARY KEY NOT NULL,
      user_id TEXT NOT NULL,
      name TEXT NOT NULL,
      items_json TEXT NOT NULL,
      tags_json TEXT NULL,
      created_at TEXT NULL,
      updated_at TEXT NULL,
      deleted_at TEXT NULL,
      last_synced_at TEXT NULL
    );

    CREATE INDEX IF NOT EXISTS workout_templates_user_updated_idx
      ON workout_templates(user_id, updated_at);

    CREATE TABLE IF NOT EXISTS method_instances (
      id TEXT PRIMARY KEY NOT NULL,
      user_id TEXT NOT NULL,
      method_key TEXT NOT NULL,
      scope TEXT NOT NULL,
      name TEXT NOT NULL,
      config_json TEXT NOT NULL,
      state_json TEXT NOT NULL,
      archived INTEGER NOT NULL,
      created_at TEXT NULL,
      updated_at TEXT NULL,
      deleted_at TEXT NULL,
      last_synced_at TEXT NULL
    );

    CREATE INDEX IF NOT EXISTS method_instances_user_updated_idx
      ON method_instances(user_id, updated_at);

    CREATE TABLE IF NOT EXISTS sync_queue (
      id TEXT PRIMARY KEY NOT NULL,
      user_id TEXT NOT NULL,
      entity TEXT NOT NULL,
      op TEXT NOT NULL,
      entity_id TEXT NOT NULL,
      payload_json TEXT NULL,
      created_at TEXT NOT NULL,
      attempts INTEGER NOT NULL DEFAULT 0,
      last_error TEXT NULL
    );

    CREATE INDEX IF NOT EXISTS sync_queue_user_created_idx
      ON sync_queue(user_id, created_at);

    CREATE TABLE IF NOT EXISTS sync_state (
      user_id TEXT NOT NULL,
      entity TEXT NOT NULL,
      last_pulled_at TEXT NULL,
      PRIMARY KEY (user_id, entity)
    );
  `);
}

async function migrateToV2(db: SQLite.SQLiteDatabase): Promise<void> {
  // Add explicit workout status for sessions (nullable for backwards compatibility).
  await db.execAsync(`
    ALTER TABLE workout_sessions ADD COLUMN status TEXT NULL;
  `);
}

export async function ensureOfflineDbReady(): Promise<void> {
  if (!migrationsPromise) {
    migrationsPromise = (async () => {
      const db = await getDb();
      const v = await getSchemaVersion(db);
      if (v < 1) {
        await migrateToV1(db);
        await setSchemaVersion(db, 1);
      }
      const v2 = await getSchemaVersion(db);
      if (v2 < 2) {
        await migrateToV2(db);
        await setSchemaVersion(db, 2);
      }
    })();
  }
  return migrationsPromise;
}

export async function clearUserLocalData(userId: string): Promise<void> {
  await ensureOfflineDbReady();
  const db = await getDb();

  // Keep this small and deterministic (no cascading).
  await db.runAsync('DELETE FROM sync_queue WHERE user_id = ?', [userId]);
  await db.runAsync('DELETE FROM sync_state WHERE user_id = ?', [userId]);
  await db.runAsync('DELETE FROM workout_sessions WHERE user_id = ?', [userId]);
  await db.runAsync('DELETE FROM workout_templates WHERE user_id = ?', [userId]);
  await db.runAsync('DELETE FROM method_instances WHERE user_id = ?', [userId]);
}

