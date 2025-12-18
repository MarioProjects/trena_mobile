import { supabase } from '@/lib/supabase';

import { applyMethodResult, generatePlannedSets } from './methods';
import type {
    ExerciseRef,
    MethodBinding,
    MethodInstanceRow,
    MethodKey,
    PerformedSet,
    SessionExercise,
    WorkoutSessionRow,
    WorkoutSessionSnapshotV1,
    WorkoutTemplate,
    WorkoutTemplateItem,
} from './types';

function makeLocalId(prefix: string) {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

async function requireUserId() {
  const { data, error } = await supabase.auth.getUser();
  if (error) throw error;
  const userId = data.user?.id;
  if (!userId) throw new Error('Not signed in.');
  return userId;
}

function asObject(x: unknown): Record<string, unknown> {
  if (x && typeof x === 'object' && !Array.isArray(x)) return x as Record<string, unknown>;
  return {};
}

function asArray(x: unknown): unknown[] {
  return Array.isArray(x) ? x : [];
}

function coerceExerciseRef(x: unknown): ExerciseRef {
  const obj = asObject(x);
  if (obj.kind === 'learn' && typeof obj.learnExerciseId === 'string') {
    return { kind: 'learn', learnExerciseId: obj.learnExerciseId };
  }
  if (obj.kind === 'free' && typeof obj.name === 'string') {
    return { kind: 'free', name: obj.name };
  }
  return { kind: 'free', name: 'Unknown exercise' };
}

function coerceTemplateItem(x: unknown): WorkoutTemplateItem | null {
  const obj = asObject(x);
  const id = typeof obj.id === 'string' ? obj.id : makeLocalId('tpl_item');
  const type = obj.type;
  const exercise = coerceExerciseRef(obj.exercise);
  const note = typeof obj.note === 'string' ? obj.note : undefined;

  if (type === 'free') {
    return { id, type: 'free', exercise, note };
  }

  if (type === 'method') {
    const methodInstanceId = typeof obj.methodInstanceId === 'string' ? obj.methodInstanceId : '';
    const binding = obj.binding as MethodBinding | undefined;
    if (!methodInstanceId || !binding || !binding.methodKey) return null;
    return { id, type: 'method', exercise, methodInstanceId, binding, note };
  }

  return null;
}

function coerceTemplateRow(row: any): WorkoutTemplate {
  const itemsRaw = asArray(row.items);
  const items: WorkoutTemplateItem[] = itemsRaw.map(coerceTemplateItem).filter(Boolean) as WorkoutTemplateItem[];
  return {
    id: row.id,
    name: row.name,
    items,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

function emptySnapshot(): WorkoutSessionSnapshotV1 {
  return { version: 1, exercises: [] };
}

export async function listMethodInstances() {
  const { data, error } = await supabase
    .from('method_instances')
    .select('id, method_key, scope, name, config, state, archived, created_at, updated_at')
    .eq('archived', false)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as MethodInstanceRow[];
}

export async function createMethodInstance(args: {
  method_key: MethodKey;
  scope: 'exercise' | 'group';
  name: string;
  config: unknown;
  state: unknown;
}) {
  const user_id = await requireUserId();
  const { data, error } = await supabase
    .from('method_instances')
    .insert({
      user_id,
      method_key: args.method_key,
      scope: args.scope,
      name: args.name,
      config: args.config,
      state: args.state,
      archived: false,
    })
    .select('id, method_key, scope, name, config, state, archived, created_at, updated_at')
    .single();
  if (error) throw error;
  return data as MethodInstanceRow;
}

export async function updateMethodInstance(args: {
  id: string;
  patch: Partial<Pick<MethodInstanceRow, 'name' | 'config' | 'state' | 'archived'>>;
}) {
  const { data, error } = await supabase
    .from('method_instances')
    .update(args.patch)
    .eq('id', args.id)
    .select('id, method_key, scope, name, config, state, archived, created_at, updated_at')
    .single();
  if (error) throw error;
  return data as MethodInstanceRow;
}

export async function deleteMethodInstance(id: string) {
  const { error } = await supabase.from('method_instances').delete().eq('id', id);
  if (error) throw error;
}

export async function listTemplates() {
  const { data, error } = await supabase
    .from('workout_templates')
    .select('id, name, items, created_at, updated_at')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []).map(coerceTemplateRow);
}

export async function createTemplate(args: { name: string; items: WorkoutTemplateItem[] }) {
  const user_id = await requireUserId();
  const { data, error } = await supabase
    .from('workout_templates')
    .insert({ user_id, name: args.name, items: args.items })
    .select('id, name, items, created_at, updated_at')
    .single();
  if (error) throw error;
  return coerceTemplateRow(data);
}

export async function updateTemplate(args: { id: string; patch: Partial<Pick<WorkoutTemplate, 'name' | 'items'>> }) {
  const { data, error } = await supabase
    .from('workout_templates')
    .update(args.patch)
    .eq('id', args.id)
    .select('id, name, items, created_at, updated_at')
    .single();
  if (error) throw error;
  return coerceTemplateRow(data);
}

export async function deleteTemplate(id: string) {
  const { error } = await supabase.from('workout_templates').delete().eq('id', id);
  if (error) throw error;
}

export async function duplicateTemplate(id: string) {
  const user_id = await requireUserId();

  // 1) Fetch original
  const { data: original, error: getErr } = await supabase
    .from('workout_templates')
    .select('name, items')
    .eq('id', id)
    .single();
  if (getErr) throw getErr;

  // 2) Insert copy
  const nextName = `${original.name} (copy)`;
  const { data, error } = await supabase
    .from('workout_templates')
    .insert({ user_id, name: nextName, items: original.items })
    .select('id, name, items, created_at, updated_at')
    .single();
  if (error) throw error;
  return coerceTemplateRow(data);
}

export async function listSessions(limit = 20) {
  const { data, error } = await supabase
    .from('workout_sessions')
    .select('id, title, template_id, started_at, ended_at, snapshot, created_at, updated_at')
    .order('started_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []) as WorkoutSessionRow[];
}

export async function getSession(id: string) {
  const { data, error } = await supabase
    .from('workout_sessions')
    .select('id, title, template_id, started_at, ended_at, snapshot, created_at, updated_at')
    .eq('id', id)
    .single();
  if (error) throw error;
  return data as WorkoutSessionRow;
}

export async function deleteSession(id: string) {
  const { error } = await supabase.from('workout_sessions').delete().eq('id', id);
  if (error) throw error;
}

export async function duplicateSession(id: string) {
  const user_id = await requireUserId();

  // 1. Get original session
  const { data: original, error: getErr } = await supabase
    .from('workout_sessions')
    .select('template_id, title, snapshot')
    .eq('id', id)
    .single();

  if (getErr) throw getErr;

  const originalSnapshot = original.snapshot as WorkoutSessionSnapshotV1;
  const newSnapshot: WorkoutSessionSnapshotV1 = {
    ...originalSnapshot,
    exercises: (originalSnapshot.exercises || []).map((ex) => ({
      ...ex,
      performedSets: [],
    })),
  };

  // 2. Insert new session
  const { data, error } = await supabase
    .from('workout_sessions')
    .insert({
      user_id,
      template_id: original.template_id,
      title: original.title,
      started_at: new Date().toISOString(),
      snapshot: newSnapshot,
    })
    .select('id, title, template_id, started_at, ended_at, snapshot, created_at, updated_at')
    .single();

  if (error) throw error;
  return data as WorkoutSessionRow;
}

export async function updateSessionTimes(args: { id: string; started_at?: string; ended_at?: string | null }) {
  const patch: Record<string, unknown> = {};
  if (args.started_at) patch.started_at = args.started_at;
  if (args.ended_at !== undefined) patch.ended_at = args.ended_at;
  const { data, error } = await supabase
    .from('workout_sessions')
    .update(patch)
    .eq('id', args.id)
    .select('id, title, template_id, started_at, ended_at, snapshot, created_at, updated_at')
    .single();
  if (error) throw error;
  return data as WorkoutSessionRow;
}

async function fetchMethodInstancesByIds(ids: string[]) {
  if (!ids.length) return new Map<string, MethodInstanceRow>();
  const unique = Array.from(new Set(ids));
  const { data, error } = await supabase
    .from('method_instances')
    .select('id, method_key, scope, name, config, state, archived, created_at, updated_at')
    .in('id', unique);
  if (error) throw error;
  const map = new Map<string, MethodInstanceRow>();
  for (const row of data ?? []) map.set(row.id, row as MethodInstanceRow);
  return map;
}

export async function getMethodInstancesByIds(ids: string[]) {
  return await fetchMethodInstancesByIds(ids);
}

export function buildSessionExerciseFromMethodSelection(args: {
  exercise: ExerciseRef;
  methodInstanceId: string;
  methodInstance: MethodInstanceRow;
  binding: MethodBinding;
}): SessionExercise {
  const { plannedSets, coercedConfig, coercedState } = generatePlannedSets({
    methodKey: args.methodInstance.method_key,
    binding: args.binding,
    methodConfig: args.methodInstance.config ?? {},
    methodState: args.methodInstance.state ?? {},
  });

  return {
    id: makeLocalId('sx'),
    exercise: args.exercise,
    source: {
      type: 'method',
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

function buildSessionExerciseFromTemplateItem(args: {
  item: WorkoutTemplateItem;
  methodInstance?: MethodInstanceRow;
}): SessionExercise {
  const { item, methodInstance } = args;

  if (item.type === 'free') {
    return {
      id: makeLocalId('sx'),
      exercise: item.exercise,
      source: { type: 'free' },
      plannedSets: [],
      performedSets: [],
    };
  }

  const mi = methodInstance;
  const methodKey = mi?.method_key ?? item.binding.methodKey;
  const methodConfig = mi?.config ?? {};
  const methodState = mi?.state ?? {};

  const { plannedSets, coercedConfig, coercedState } = generatePlannedSets({
    methodKey,
    binding: item.binding,
    methodConfig,
    methodState,
  });

  return {
    id: makeLocalId('sx'),
    exercise: item.exercise,
    source: {
      type: 'method',
      methodInstanceId: item.methodInstanceId,
      methodKey,
      binding: item.binding,
      methodConfig: coercedConfig,
      methodStateAtStart: coercedState,
    },
    plannedSets,
    performedSets: [],
  };
}

export async function startSessionFromTemplate(args: { templateId: string }) {
  const user_id = await requireUserId();
  const { data: tplRow, error: tplErr } = await supabase
    .from('workout_templates')
    .select('id, name, items')
    .eq('id', args.templateId)
    .single();
  if (tplErr) throw tplErr;

  const itemsRaw = asArray(tplRow.items);
  const items = itemsRaw.map(coerceTemplateItem).filter(Boolean) as WorkoutTemplateItem[];

  const methodIds = items.filter((x) => x.type === 'method').map((x) => (x as any).methodInstanceId as string);
  const miMap = await fetchMethodInstancesByIds(methodIds);

  const exercises = items.map((item) =>
    buildSessionExerciseFromTemplateItem({
      item,
      methodInstance: item.type === 'method' ? miMap.get(item.methodInstanceId) : undefined,
    }),
  );

  const snapshot: WorkoutSessionSnapshotV1 = { version: 1, exercises };

  const { data, error } = await supabase
    .from('workout_sessions')
    .insert({
      user_id,
      template_id: tplRow.id,
      title: tplRow.name,
      started_at: new Date().toISOString(),
      snapshot,
    })
    .select('id, title, template_id, started_at, ended_at, snapshot, created_at, updated_at')
    .single();
  if (error) throw error;
  return data as WorkoutSessionRow;
}

export async function startQuickSession(args?: { title?: string }) {
  const user_id = await requireUserId();
  const snapshot = emptySnapshot();
  const { data, error } = await supabase
    .from('workout_sessions')
    .insert({
      user_id,
      template_id: null,
      title: args?.title?.trim() || 'Quick workout',
      started_at: new Date().toISOString(),
      snapshot,
    })
    .select('id, title, template_id, started_at, ended_at, snapshot, created_at, updated_at')
    .single();
  if (error) throw error;
  return data as WorkoutSessionRow;
}

export async function updateSessionSnapshot(args: { id: string; snapshot: WorkoutSessionSnapshotV1 }) {
  const { data, error } = await supabase
    .from('workout_sessions')
    .update({ snapshot: args.snapshot })
    .eq('id', args.id)
    .select('id, title, template_id, started_at, ended_at, snapshot, created_at, updated_at')
    .single();
  if (error) throw error;
  return data as WorkoutSessionRow;
}

/**
 * Check if a workout snapshot is empty (no exercises and no meaningful notes).
 */
function isSnapshotEmpty(snapshot: WorkoutSessionSnapshotV1): boolean {
  const hasExercises = snapshot.exercises && snapshot.exercises.length > 0;
  const hasNotes = snapshot.notes && snapshot.notes.trim().length > 0;
  return !hasExercises && !hasNotes;
}

export async function finishSessionAndAdvanceMethods(args: { id: string; snapshot: WorkoutSessionSnapshotV1 }): Promise<WorkoutSessionRow | null> {
  // Check if the workout is empty - if so, delete it instead of saving
  if (isSnapshotEmpty(args.snapshot)) {
    await deleteSession(args.id);
    return null;
  }

  // 1) Save the finished session.
  const { data: session, error: sessErr } = await supabase
    .from('workout_sessions')
    .update({ ended_at: new Date().toISOString(), snapshot: args.snapshot })
    .eq('id', args.id)
    .select('id, title, template_id, started_at, ended_at, snapshot, created_at, updated_at')
    .single();
  if (sessErr) throw sessErr;

  // 2) Aggregate per-method updates (avoid advancing 5/3/1 multiple times in one session).
  const methodExercises = args.snapshot.exercises.filter((x) => x.source.type === 'method') as Array<
    SessionExercise & { source: Extract<SessionExercise['source'], { type: 'method' }> }
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
      // Merge sets so wendler sees "completed" if any lift got logged.
      cur.performedSets = [...(cur.performedSets ?? []), ...(ex.performedSets ?? [])];
    }
  }

  for (const [methodInstanceId, payload] of byMethod.entries()) {
    const { nextState, completed } = applyMethodResult({
      methodKey: payload.methodKey,
      methodConfig: payload.config,
      methodState: payload.stateAtStart,
      binding: payload.binding,
      performedSets: payload.performedSets,
    });

    if (!completed) continue;

    const { error } = await supabase.from('method_instances').update({ state: nextState }).eq('id', methodInstanceId);
    if (error) throw error;
  }

  return session as WorkoutSessionRow;
}

export async function listDistinctFreeExercises() {
  const user_id = await requireUserId();

  // 1. Get from templates
  const { data: templates } = await supabase.from('workout_templates').select('items');

  // 2. Get from sessions (snapshot) - limit to recent ones to avoid huge query if possible,
  // or just get all since we need unique names.
  // For now, let's grab last 50 sessions.
  const { data: sessions } = await supabase
    .from('workout_sessions')
    .select('snapshot')
    .order('started_at', { ascending: false })
    .limit(50);

  const names = new Set<string>();

  (templates ?? []).forEach((row) => {
    const items = asArray(row.items);
    items.forEach((item) => {
      const obj = asObject(item);
      const ex = coerceExerciseRef(obj.exercise);
      if (ex.kind === 'free') names.add(ex.name);
    });
  });

  (sessions ?? []).forEach((row) => {
    const snap = row.snapshot as WorkoutSessionSnapshotV1 | undefined;
    if (snap?.exercises) {
      snap.exercises.forEach((ex) => {
        if (ex.exercise.kind === 'free') names.add(ex.exercise.name);
      });
    }
  });

  return Array.from(names).sort();
}
