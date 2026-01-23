import {
    cancelAllReminders,
    cancelWorkoutReminder,
    scheduleWorkoutReminder,
} from "@/lib/notifications";
import { makeUuid } from "@/lib/offline/uuid";
import { supabase } from "@/lib/supabase";

import { defaultTrackingForExerciseRef } from "./exercise-tracking";
import {
    enqueueOutbox,
    getMethodInstancesByIdsLocal,
    getSessionLocal,
    getTemplateLocal,
    listCompletedSessionsForStatsLocal,
    listMethodInstancesLocal,
    listRecentCompletedSessionsLocal,
    listSessionsLocal,
    listTemplatesLocal,
    markMethodInstanceDeletedLocal,
    markSessionDeletedLocal,
    markTemplateDeletedLocal,
    updateSessionFieldsLocal,
    upsertMethodInstanceLocal,
    upsertSessionLocal,
    upsertTemplateLocal,
} from "./local-repo";
import { applyMethodResult, generatePlannedSets } from "./methods";
import { coerceWorkoutSessionStatus } from "./status";
import { coerceWorkoutTags } from "./tags";
import type {
    ExerciseRef,
    MethodBinding,
    MethodInstanceRow,
    MethodKey,
    PerformedSet,
    SessionExercise,
    WorkoutSessionRow,
    WorkoutSessionSnapshotV1,
    WorkoutSessionStatus,
    WorkoutTemplate,
    WorkoutTemplateItem,
} from "./types";

/**
 * Best-effort sync trigger.
 *
 * `sync-engine` imports React Native modules; keeping this as a dynamic import
 * avoids eagerly loading (or failing to load) those dependencies in contexts
 * where they may not be available. Callers should treat this as optional.
 */
async function tryRunSyncOnce(): Promise<void> {
  try {
    const { runSyncOnce } = await import("@/lib/sync/sync-engine");
    await runSyncOnce();
  } catch (e) {
    // Best-effort: callers typically have local data to fall back to.
    // If we ever want to surface this, we can plumb a toast/logger here.
    const msg = e instanceof Error ? e.message : String(e);
    console.warn("[sync] runSyncOnce unavailable/failed:", msg);
  }
}

// Private override for demo mode
let overrideUserId: string | null = null;
export function setOverrideUserId(id: string | null) {
  overrideUserId = id;
}

async function requireUserIdFromCachedSession() {
  if (overrideUserId) return overrideUserId;
  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;
  const userId = data.session?.user?.id;
  if (!userId) throw new Error("Not signed in.");
  return userId;
}

function asObject(x: unknown): Record<string, unknown> {
  if (x && typeof x === "object" && !Array.isArray(x))
    return x as Record<string, unknown>;
  return {};
}

function asArray(x: unknown): unknown[] {
  return Array.isArray(x) ? x : [];
}

function coerceExerciseRef(x: unknown): ExerciseRef {
  const obj = asObject(x);
  if (obj.kind === "learn" && typeof obj.learnExerciseId === "string") {
    return { kind: "learn", learnExerciseId: obj.learnExerciseId };
  }
  if (obj.kind === "free" && typeof obj.name === "string") {
    return { kind: "free", name: obj.name };
  }
  if (obj.kind === "method" && typeof obj.methodInstanceId === "string") {
    return { kind: "method", methodInstanceId: obj.methodInstanceId };
  }
  return { kind: "free", name: "Unknown exercise" };
}

function coerceTemplateItem(x: unknown): WorkoutTemplateItem | null {
  const obj = asObject(x);
  const id = typeof obj.id === "string" ? obj.id : makeUuid();
  const type = obj.type;
  const exercise = coerceExerciseRef(obj.exercise);
  const note = typeof obj.note === "string" ? obj.note : undefined;
  const supersetId =
    typeof obj.supersetId === "string" ? obj.supersetId : undefined;

  if (type === "free") {
    return { id, type: "free", exercise, note, supersetId };
  }

  if (type === "method") {
    const methodInstanceId =
      typeof obj.methodInstanceId === "string" ? obj.methodInstanceId : "";
    const binding = obj.binding as MethodBinding | undefined;
    if (!methodInstanceId || !binding || !binding.methodKey) return null;
    return {
      id,
      type: "method",
      exercise,
      methodInstanceId,
      binding,
      note,
      supersetId,
    };
  }

  return null;
}

function normalizeTemplate(row: WorkoutTemplate): WorkoutTemplate {
  const itemsRaw = asArray((row as any).items);
  const items: WorkoutTemplateItem[] = itemsRaw
    .map(coerceTemplateItem)
    .filter(Boolean) as WorkoutTemplateItem[];
  return {
    id: row.id,
    name: row.name,
    items,
    tags: coerceWorkoutTags((row as any).tags),
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

function emptySnapshot(): WorkoutSessionSnapshotV1 {
  return { version: 1, exercises: [] };
}

function normalizeSession(row: WorkoutSessionRow): WorkoutSessionRow {
  return {
    ...row,
    tags: coerceWorkoutTags((row as any).tags),
    snapshot: row.snapshot ?? emptySnapshot(),
    status: coerceWorkoutSessionStatus((row as any).status),
  };
}

function isSnapshotEmpty(snapshot: WorkoutSessionSnapshotV1): boolean {
  const hasExercises = snapshot.exercises && snapshot.exercises.length > 0;
  const hasNotes = snapshot.notes && snapshot.notes.trim().length > 0;
  return !hasExercises && !hasNotes;
}

function isoNow() {
  return new Date().toISOString();
}

async function getLatestStateForMethodInstanceLocal(args: {
  userId: string;
  methodInstanceId: string;
  methodKey: MethodKey;
  config: unknown;
  currentState: unknown;
}) {
  // Scan most recent completed sessions from local cache.
  const sessions = await listRecentCompletedSessionsLocal({
    userId: args.userId,
    limit: 200,
  });

  for (const s of sessions) {
    const snap = s.snapshot;
    if (!snap || !Array.isArray(snap.exercises)) continue;

    const matchingExercises = snap.exercises.filter(
      (ex) =>
        ex.source.type === "method" &&
        ex.source.methodInstanceId === args.methodInstanceId,
    ) as Array<
      SessionExercise & {
        source: Extract<SessionExercise["source"], { type: "method" }>;
      }
    >;

    if (matchingExercises.length === 0) continue;

    // Use the state-at-start from the first matching exercise,
    // but use CURRENT config to determine the next state (so latest rules apply).
    const first = matchingExercises[0];
    const mergedPerformedSets = matchingExercises.flatMap(
      (ex) => ex.performedSets ?? [],
    );

    const { nextState, completed } = applyMethodResult({
      methodKey: args.methodKey,
      methodConfig: args.config, // Use current config
      methodState: first.source.methodStateAtStart,
      binding: first.source.binding,
      performedSets: mergedPerformedSets,
    });

    return completed ? nextState : first.source.methodStateAtStart;
  }

  return args.currentState;
}

export async function listMethodInstances() {
  const userId = await requireUserIdFromCachedSession();
  let rows = await listMethodInstancesLocal({ userId, includeArchived: false });
  if (rows.length === 0) {
    await tryRunSyncOnce();
    rows = await listMethodInstancesLocal({ userId, includeArchived: false });
  }
  return rows;
}

export async function getMethodInstancesByIds(ids: string[]) {
  const userId = await requireUserIdFromCachedSession();
  return await getMethodInstancesByIdsLocal({ userId, ids });
}

export async function buildSessionExerciseFromMethodSelection(args: {
  exercise: ExerciseRef;
  methodInstanceId: string;
  methodInstance: MethodInstanceRow;
  binding: MethodBinding;
}): Promise<SessionExercise> {
  const userId = await requireUserIdFromCachedSession();
  const latestState = await getLatestStateForMethodInstanceLocal({
    userId,
    methodInstanceId: args.methodInstanceId,
    methodKey: args.methodInstance.method_key,
    config: args.methodInstance.config,
    currentState: args.methodInstance.state,
  });

  const { plannedSets, coercedConfig, coercedState } = generatePlannedSets({
    methodKey: args.methodInstance.method_key,
    binding: args.binding,
    methodConfig: args.methodInstance.config ?? {},
    methodState: latestState ?? {},
  });

  return {
    id: makeUuid(),
    exercise: args.exercise,
    source: {
      type: "method",
      methodInstanceId: args.methodInstanceId,
      methodKey: args.methodInstance.method_key,
      binding: args.binding,
      methodConfig: coercedConfig,
      methodStateAtStart: coercedState,
    },
    plannedSets,
    performedSets: [],
  };
}

export async function createMethodInstance(args: {
  method_key: MethodKey;
  scope: "exercise" | "group";
  name: string;
  config: unknown;
  state: unknown;
}) {
  const userId = await requireUserIdFromCachedSession();
  const now = isoNow();
  const row: MethodInstanceRow = {
    id: makeUuid(),
    method_key: args.method_key,
    scope: args.scope,
    name: args.name,
    config: args.config,
    state: args.state,
    archived: false,
    created_at: now,
    updated_at: now,
  };

  await upsertMethodInstanceLocal({ userId, row });
  await enqueueOutbox({
    id: makeUuid(),
    userId,
    entity: "method_instances",
    op: "upsert",
    entityId: row.id,
    payload: {
      id: row.id,
      user_id: userId,
      method_key: row.method_key,
      scope: row.scope,
      name: row.name,
      config: row.config ?? {},
      state: row.state ?? {},
      archived: row.archived,
    },
  });

  return row;
}

export async function updateMethodInstance(args: {
  id: string;
  patch: Partial<
    Pick<MethodInstanceRow, "name" | "config" | "state" | "archived">
  >;
}) {
  const userId = await requireUserIdFromCachedSession();
  const existing = (
    await getMethodInstancesByIdsLocal({ userId, ids: [args.id] })
  ).get(args.id);
  if (!existing) throw new Error("Method instance not found.");

  const now = isoNow();
  const next: MethodInstanceRow = {
    ...existing,
    ...args.patch,
    updated_at: now,
  };

  await upsertMethodInstanceLocal({ userId, row: next });
  await enqueueOutbox({
    id: makeUuid(),
    userId,
    entity: "method_instances",
    op: "upsert",
    entityId: next.id,
    payload: {
      id: next.id,
      user_id: userId,
      method_key: next.method_key,
      scope: next.scope,
      name: next.name,
      config: next.config ?? {},
      state: next.state ?? {},
      archived: next.archived,
    },
  });

  return next;
}

export async function deleteMethodInstance(id: string) {
  const userId = await requireUserIdFromCachedSession();
  await markMethodInstanceDeletedLocal({ userId, id });
  await enqueueOutbox({
    id: makeUuid(),
    userId,
    entity: "method_instances",
    op: "delete",
    entityId: id,
    payload: null,
  });
}

export async function listTemplates() {
  const userId = await requireUserIdFromCachedSession();
  let rows = await listTemplatesLocal({ userId });
  if (rows.length === 0) {
    await tryRunSyncOnce();
    rows = await listTemplatesLocal({ userId });
  }
  return rows.map(normalizeTemplate);
}

export async function createTemplate(args: {
  name: string;
  items: WorkoutTemplateItem[];
  tags?: WorkoutTemplate["tags"];
}) {
  const userId = await requireUserIdFromCachedSession();
  const now = isoNow();
  const row: WorkoutTemplate = normalizeTemplate({
    id: makeUuid(),
    name: args.name,
    items: args.items,
    tags: coerceWorkoutTags(args.tags),
    created_at: now,
    updated_at: now,
  });

  await upsertTemplateLocal({ userId, row });
  await enqueueOutbox({
    id: makeUuid(),
    userId,
    entity: "workout_templates",
    op: "upsert",
    entityId: row.id,
    payload: {
      id: row.id,
      user_id: userId,
      name: row.name,
      items: row.items,
      tags: row.tags ?? [],
    },
  });

  return row;
}

export async function updateTemplate(args: {
  id: string;
  patch: Partial<Pick<WorkoutTemplate, "name" | "items" | "tags">>;
}) {
  const userId = await requireUserIdFromCachedSession();
  const existing = await getTemplateLocal({ userId, id: args.id });
  if (!existing) throw new Error("Template not found.");

  const now = isoNow();
  const next = normalizeTemplate({
    ...existing,
    ...args.patch,
    tags:
      "tags" in args.patch
        ? coerceWorkoutTags((args.patch as any).tags)
        : (existing as any).tags,
    updated_at: now,
  } as WorkoutTemplate);

  await upsertTemplateLocal({ userId, row: next });
  await enqueueOutbox({
    id: makeUuid(),
    userId,
    entity: "workout_templates",
    op: "upsert",
    entityId: next.id,
    payload: {
      id: next.id,
      user_id: userId,
      name: next.name,
      items: next.items,
      tags: next.tags ?? [],
    },
  });

  return next;
}

export async function deleteTemplate(id: string) {
  const userId = await requireUserIdFromCachedSession();
  await markTemplateDeletedLocal({ userId, id });
  await enqueueOutbox({
    id: makeUuid(),
    userId,
    entity: "workout_templates",
    op: "delete",
    entityId: id,
    payload: null,
  });
}

export async function duplicateTemplate(id: string) {
  const userId = await requireUserIdFromCachedSession();
  const original = await getTemplateLocal({ userId, id });
  if (!original) throw new Error("Template not found.");

  const now = isoNow();
  const next: WorkoutTemplate = normalizeTemplate({
    ...original,
    id: makeUuid(),
    name: `${original.name} (copy)`,
    created_at: now,
    updated_at: now,
  });

  await upsertTemplateLocal({ userId, row: next });
  await enqueueOutbox({
    id: makeUuid(),
    userId,
    entity: "workout_templates",
    op: "upsert",
    entityId: next.id,
    payload: {
      id: next.id,
      user_id: userId,
      name: next.name,
      items: next.items,
      tags: next.tags ?? [],
    },
  });

  return next;
}

export async function listSessions(limit = 20) {
  const userId = await requireUserIdFromCachedSession();
  let rows = await listSessionsLocal({ userId, limit });
  if (rows.length === 0) {
    await tryRunSyncOnce();
    rows = await listSessionsLocal({ userId, limit });
  }
  return rows.map(normalizeSession);
}

export async function listCompletedSessionsForStats(args?: {
  max?: number;
  pageSize?: number;
}) {
  const userId = await requireUserIdFromCachedSession();
  let rows = await listCompletedSessionsForStatsLocal({
    userId,
    max: args?.max,
    pageSize: args?.pageSize,
  });
  if (rows.length === 0) {
    await tryRunSyncOnce();
    rows = await listCompletedSessionsForStatsLocal({
      userId,
      max: args?.max,
      pageSize: args?.pageSize,
    });
  }
  return rows.map(normalizeSession);
}

export async function getSession(id: string) {
  const userId = await requireUserIdFromCachedSession();
  const row = await getSessionLocal({ userId, id });
  if (!row) throw new Error("Session not found.");
  return normalizeSession(row);
}

export async function deleteSession(id: string) {
  const userId = await requireUserIdFromCachedSession();

  // Handle reminder
  await cancelWorkoutReminder(id);

  await markSessionDeletedLocal({ userId, id });
  await enqueueOutbox({
    id: makeUuid(),
    userId,
    entity: "workout_sessions",
    op: "delete",
    entityId: id,
    payload: null,
  });
}

export async function duplicateSession(id: string) {
  const userId = await requireUserIdFromCachedSession();
  const original = await getSessionLocal({ userId, id });
  if (!original) throw new Error("Session not found.");

  const originalSnapshot = original.snapshot as WorkoutSessionSnapshotV1;

  const exercises = await Promise.all(
    (originalSnapshot.exercises || []).map(async (ex) => {
      if (ex.source.type === "method") {
        const methodKey = ex.source.methodKey;
        const methodInstanceId = ex.source.methodInstanceId;
        const binding = ex.source.binding;
        const methodConfig = ex.source.methodConfig;

        // Refresh state from most recent completions to respect progression
        const latestState = await getLatestStateForMethodInstanceLocal({
          userId,
          methodInstanceId,
          methodKey,
          config: methodConfig,
          currentState: ex.source.methodStateAtStart,
        });

        const { plannedSets, coercedConfig, coercedState } =
          generatePlannedSets({
            methodKey,
            binding,
            methodConfig,
            methodState: latestState,
          });

        return {
          ...ex,
          source: {
            ...ex.source,
            methodConfig: coercedConfig,
            methodStateAtStart: coercedState,
          },
          plannedSets,
          performedSets: [],
        };
      }
      return {
        ...ex,
        performedSets: (ex.performedSets || []).map((s) => ({
          ...s,
          id: makeUuid(),
          done: false,
        })),
      };
    }),
  );

  const newSnapshot: WorkoutSessionSnapshotV1 = {
    ...originalSnapshot,
    exercises,
  };

  const now = isoNow();
  const next: WorkoutSessionRow = {
    ...original,
    id: makeUuid(),
    started_at: now,
    ended_at: null,
    status: "in_progress",
    snapshot: newSnapshot,
    created_at: now,
    updated_at: now,
  };

  await upsertSessionLocal({ userId, row: next });
  await enqueueOutbox({
    id: makeUuid(),
    userId,
    entity: "workout_sessions",
    op: "upsert",
    entityId: next.id,
    payload: {
      id: next.id,
      user_id: userId,
      template_id: next.template_id,
      title: next.title,
      started_at: next.started_at,
      ended_at: next.ended_at,
      status: normalizeSession(next).status,
      tags: next.tags ?? [],
      snapshot: next.snapshot,
    },
  });

  return normalizeSession(next);
}

export async function updateSessionTimes(args: {
  id: string;
  started_at?: string;
  ended_at?: string | null;
}) {
  const userId = await requireUserIdFromCachedSession();
  await updateSessionFieldsLocal({
    userId,
    id: args.id,
    patch: {
      ...(args.started_at ? { started_at: args.started_at } : {}),
      ...(args.ended_at !== undefined ? { ended_at: args.ended_at } : {}),
    },
  });
  const row = await getSessionLocal({ userId, id: args.id });
  if (!row) throw new Error("Session not found.");
  const normalized = normalizeSession(row);

  // Handle reminder
  if (
    normalized.started_at &&
    (normalized.status === "pending" || !normalized.status)
  ) {
    const startTime = new Date(normalized.started_at);
    if (startTime > new Date()) {
      await scheduleWorkoutReminder(normalized.id, normalized.title, startTime);
    } else {
      await cancelWorkoutReminder(normalized.id);
    }
  } else {
    await cancelWorkoutReminder(normalized.id);
  }

  await enqueueOutbox({
    id: makeUuid(),
    userId,
    entity: "workout_sessions",
    op: "upsert",
    entityId: normalized.id,
    payload: {
      id: normalized.id,
      user_id: userId,
      template_id: normalized.template_id,
      title: normalized.title,
      started_at: normalized.started_at,
      ended_at: normalized.ended_at,
      status: normalized.status ?? null,
      tags: normalized.tags ?? [],
      snapshot: normalized.snapshot,
    },
  });
  return normalized;
}

export async function updateSessionStatus(args: {
  id: string;
  status: WorkoutSessionStatus;
}) {
  const userId = await requireUserIdFromCachedSession();
  const row = await getSessionLocal({ userId, id: args.id });
  if (!row) throw new Error("Session not found.");
  const normalized = normalizeSession(row);

  const patch: Partial<Pick<WorkoutSessionRow, "status" | "ended_at">> = {
    status: args.status,
  };
  if (args.status === "done") {
    patch.ended_at = normalized.ended_at ?? normalized.started_at;
  } else {
    patch.ended_at = null;
  }

  await updateSessionFieldsLocal({ userId, id: args.id, patch });
  const updated = await getSessionLocal({ userId, id: args.id });
  if (!updated) throw new Error("Session not found.");
  const next = normalizeSession(updated);

  // Handle reminder
  if (next.started_at && next.status === "pending") {
    const startTime = new Date(next.started_at);
    if (startTime > new Date()) {
      await scheduleWorkoutReminder(next.id, next.title, startTime);
    } else {
      await cancelWorkoutReminder(next.id);
    }
  } else {
    await cancelWorkoutReminder(next.id);
  }

  await enqueueOutbox({
    id: makeUuid(),
    userId,
    entity: "workout_sessions",
    op: "upsert",
    entityId: next.id,
    payload: {
      id: next.id,
      user_id: userId,
      template_id: next.template_id,
      title: next.title,
      started_at: next.started_at,
      ended_at: next.ended_at,
      status: next.status ?? null,
      tags: next.tags ?? [],
      snapshot: next.snapshot,
    },
  });

  return next;
}

export async function updateSessionTitle(args: { id: string; title: string }) {
  const userId = await requireUserIdFromCachedSession();
  await updateSessionFieldsLocal({
    userId,
    id: args.id,
    patch: { title: args.title },
  });
  const row = await getSessionLocal({ userId, id: args.id });
  if (!row) throw new Error("Session not found.");
  const normalized = normalizeSession(row);

  // Handle reminder
  if (normalized.started_at && normalized.status === "pending") {
    const startTime = new Date(normalized.started_at);
    if (startTime > new Date()) {
      await scheduleWorkoutReminder(normalized.id, normalized.title, startTime);
    }
  }

  await enqueueOutbox({
    id: makeUuid(),
    userId,
    entity: "workout_sessions",
    op: "upsert",
    entityId: normalized.id,
    payload: {
      id: normalized.id,
      user_id: userId,
      template_id: normalized.template_id,
      title: normalized.title,
      started_at: normalized.started_at,
      ended_at: normalized.ended_at,
      status: normalized.status ?? null,
      tags: normalized.tags ?? [],
      snapshot: normalized.snapshot,
    },
  });
  return normalized;
}

export async function updateSessionTags(args: { id: string; tags: string[] }) {
  const userId = await requireUserIdFromCachedSession();
  await updateSessionFieldsLocal({
    userId,
    id: args.id,
    patch: { tags: coerceWorkoutTags(args.tags) },
  });
  const row = await getSessionLocal({ userId, id: args.id });
  if (!row) throw new Error("Session not found.");
  const normalized = normalizeSession(row);
  await enqueueOutbox({
    id: makeUuid(),
    userId,
    entity: "workout_sessions",
    op: "upsert",
    entityId: normalized.id,
    payload: {
      id: normalized.id,
      user_id: userId,
      template_id: normalized.template_id,
      title: normalized.title,
      started_at: normalized.started_at,
      ended_at: normalized.ended_at,
      status: normalized.status ?? null,
      tags: normalized.tags ?? [],
      snapshot: normalized.snapshot,
    },
  });
  return normalized;
}

async function buildSessionExerciseFromTemplateItem(args: {
  userId: string;
  item: WorkoutTemplateItem;
  methodInstance?: MethodInstanceRow;
}): Promise<SessionExercise> {
  const { item, methodInstance, userId } = args;

  if (item.type === "free") {
    return {
      id: makeUuid(),
      exercise: item.exercise,
      source: { type: "free" },
      tracking: defaultTrackingForExerciseRef(item.exercise),
      plannedSets: [],
      performedSets: [],
      supersetId: item.supersetId,
    };
  }

  const mi = methodInstance;
  const methodKey = mi?.method_key ?? item.binding.methodKey;
  const methodConfig = mi?.config ?? {};
  const methodState = mi?.state ?? {};

  const latestState = await getLatestStateForMethodInstanceLocal({
    userId,
    methodInstanceId: item.methodInstanceId,
    methodKey,
    config: methodConfig,
    currentState: methodState,
  });

  const { plannedSets, coercedConfig, coercedState } = generatePlannedSets({
    methodKey,
    binding: item.binding,
    methodConfig,
    methodState: latestState,
  });

  return {
    id: makeUuid(),
    exercise: item.exercise,
    source: {
      type: "method",
      methodInstanceId: item.methodInstanceId,
      methodKey,
      binding: item.binding,
      methodConfig: coercedConfig,
      methodStateAtStart: coercedState,
    },
    plannedSets,
    performedSets: [],
    supersetId: item.supersetId,
  };
}

export async function startSessionFromTemplate(args: { templateId: string }) {
  const userId = await requireUserIdFromCachedSession();
  const tpl = await getTemplateLocal({ userId, id: args.templateId });
  if (!tpl) throw new Error("Template not found.");

  const tplNorm = normalizeTemplate(tpl);
  const items = tplNorm.items;
  const methodIds = items
    .filter((x) => x.type === "method")
    .map((x) => (x as any).methodInstanceId as string);
  const miMap = await getMethodInstancesByIdsLocal({ userId, ids: methodIds });

  const exercises = await Promise.all(
    items.map((item) =>
      buildSessionExerciseFromTemplateItem({
        userId,
        item,
        methodInstance:
          item.type === "method" ? miMap.get(item.methodInstanceId) : undefined,
      }),
    ),
  );

  const now = isoNow();
  const row: WorkoutSessionRow = {
    id: makeUuid(),
    title: tplNorm.name,
    template_id: tplNorm.id,
    started_at: now,
    ended_at: null,
    tags: tplNorm.tags,
    snapshot: { version: 1, exercises },
    created_at: now,
    updated_at: now,
  };

  await upsertSessionLocal({ userId, row });
  await enqueueOutbox({
    id: makeUuid(),
    userId,
    entity: "workout_sessions",
    op: "upsert",
    entityId: row.id,
    payload: {
      id: row.id,
      user_id: userId,
      template_id: row.template_id,
      title: row.title,
      started_at: row.started_at,
      ended_at: row.ended_at,
      status: normalizeSession(row).status,
      tags: row.tags ?? [],
      snapshot: row.snapshot,
    },
  });

  return normalizeSession(row);
}

export async function startQuickSession(args?: { title?: string }) {
  const userId = await requireUserIdFromCachedSession();
  const now = isoNow();
  const row: WorkoutSessionRow = {
    id: makeUuid(),
    template_id: null,
    title: args?.title?.trim() || "Quick workout",
    started_at: now,
    ended_at: null,
    snapshot: emptySnapshot(),
    tags: [],
    created_at: now,
    updated_at: now,
  };

  await upsertSessionLocal({ userId, row });
  await enqueueOutbox({
    id: makeUuid(),
    userId,
    entity: "workout_sessions",
    op: "upsert",
    entityId: row.id,
    payload: {
      id: row.id,
      user_id: userId,
      template_id: row.template_id,
      title: row.title,
      started_at: row.started_at,
      ended_at: row.ended_at,
      status: normalizeSession(row).status,
      tags: row.tags ?? [],
      snapshot: row.snapshot,
    },
  });

  return normalizeSession(row);
}

export async function updateSessionSnapshot(args: {
  id: string;
  snapshot: WorkoutSessionSnapshotV1;
}) {
  const userId = await requireUserIdFromCachedSession();
  await updateSessionFieldsLocal({
    userId,
    id: args.id,
    patch: { snapshot: args.snapshot },
  });
  const row = await getSessionLocal({ userId, id: args.id });
  if (!row) throw new Error("Session not found.");
  const normalized = normalizeSession(row);
  await enqueueOutbox({
    id: makeUuid(),
    userId,
    entity: "workout_sessions",
    op: "upsert",
    entityId: normalized.id,
    payload: {
      id: normalized.id,
      user_id: userId,
      template_id: normalized.template_id,
      title: normalized.title,
      started_at: normalized.started_at,
      ended_at: normalized.ended_at,
      status: normalized.status ?? null,
      tags: normalized.tags ?? [],
      snapshot: normalized.snapshot,
    },
  });
  return normalized;
}

export async function finishSessionAndAdvanceMethods(args: {
  id: string;
  snapshot: WorkoutSessionSnapshotV1;
}): Promise<WorkoutSessionRow | null> {
  const userId = await requireUserIdFromCachedSession();

  // Check if the workout is empty - if so, delete it instead of saving
  if (isSnapshotEmpty(args.snapshot)) {
    await deleteSession(args.id);
    return null;
  }

  // 1) Save the finished session locally.
  const endedAt = isoNow();
  await updateSessionFieldsLocal({
    userId,
    id: args.id,
    patch: { ended_at: endedAt, snapshot: args.snapshot, status: "done" },
  });
  const saved = await getSessionLocal({ userId, id: args.id });
  if (!saved) throw new Error("Session not found.");

  // 2) Aggregate per-method updates (avoid advancing 5/3/1 multiple times in one session).
  const methodExercises = args.snapshot.exercises.filter(
    (x) => x.source.type === "method",
  ) as Array<
    SessionExercise & {
      source: Extract<SessionExercise["source"], { type: "method" }>;
    }
  >;

  const byMethod = new Map<
    string,
    {
      methodKey: MethodKey;
      binding: MethodBinding;
      config: unknown;
      stateAtStart: unknown;
      performedSets: PerformedSet[];
    }
  >();

  for (const ex of methodExercises) {
    const src = ex.source;
    const cur = byMethod.get(src.methodInstanceId);
    if (!cur) {
      byMethod.set(src.methodInstanceId, {
        methodKey: src.methodKey,
        binding: src.binding,
        config: src.methodConfig,
        stateAtStart: src.methodStateAtStart,
        performedSets: ex.performedSets ?? [],
      });
    } else {
      cur.performedSets = [
        ...(cur.performedSets ?? []),
        ...(ex.performedSets ?? []),
      ];
    }
  }

  // Apply method advancements locally and enqueue for sync.
  for (const [methodInstanceId, payload] of byMethod.entries()) {
    const { nextState, completed } = applyMethodResult({
      methodKey: payload.methodKey,
      methodConfig: payload.config,
      methodState: payload.stateAtStart,
      binding: payload.binding,
      performedSets: payload.performedSets,
    });

    if (!completed) continue;

    const existing = (
      await getMethodInstancesByIdsLocal({ userId, ids: [methodInstanceId] })
    ).get(methodInstanceId);
    if (!existing) continue;

    const next: MethodInstanceRow = {
      ...existing,
      state: nextState,
      updated_at: isoNow(),
    };
    await upsertMethodInstanceLocal({ userId, row: next });

    await enqueueOutbox({
      id: makeUuid(),
      userId,
      entity: "method_instances",
      op: "upsert",
      entityId: next.id,
      payload: {
        id: next.id,
        user_id: userId,
        method_key: next.method_key,
        scope: next.scope,
        name: next.name,
        config: next.config ?? {},
        state: next.state ?? {},
        archived: next.archived,
      },
    });
  }

  // Enqueue the completed session update (ended_at + snapshot).
  const normalized = normalizeSession({
    ...saved,
    ended_at: endedAt,
    snapshot: args.snapshot,
  });
  await enqueueOutbox({
    id: makeUuid(),
    userId,
    entity: "workout_sessions",
    op: "upsert",
    entityId: normalized.id,
    payload: {
      id: normalized.id,
      user_id: userId,
      template_id: normalized.template_id,
      title: normalized.title,
      started_at: normalized.started_at,
      ended_at: normalized.ended_at,
      status: normalized.status ?? null,
      tags: normalized.tags ?? [],
      snapshot: normalized.snapshot,
    },
  });

  return normalized;
}

export async function listDistinctFreeExercises() {
  const userId = await requireUserIdFromCachedSession();
  const templates = await listTemplatesLocal({ userId });
  const sessions = await listSessionsLocal({ userId, limit: 200 });

  const names = new Set<string>();

  (templates ?? []).forEach((row) => {
    const tpl = normalizeTemplate(row);
    tpl.items.forEach((item) => {
      const ex = coerceExerciseRef((item as any).exercise);
      if (ex.kind === "free") names.add(ex.name);
    });
  });

  (sessions ?? []).forEach((row) => {
    const snap = row.snapshot as WorkoutSessionSnapshotV1 | undefined;
    if (snap?.exercises) {
      snap.exercises.forEach((ex) => {
        if (ex.exercise.kind === "free") names.add(ex.exercise.name);
      });
    }
  });

  return Array.from(names).sort();
}

export async function rescheduleAllReminders() {
  const userId = await requireUserIdFromCachedSession();
  const sessions = await listSessionsLocal({ userId });
  const now = new Date();

  // Cancel all first
  await cancelAllReminders();

  for (const row of sessions) {
    const norm = normalizeSession(row);
    if (norm.started_at && norm.status === "pending") {
      const startTime = new Date(norm.started_at);
      if (startTime > now) {
        await scheduleWorkoutReminder(norm.id, norm.title, startTime, true);
      }
    }
  }
}
