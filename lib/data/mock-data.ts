import { clearUserLocalData } from '@/lib/offline/db';
import { makeUuid } from '@/lib/offline/uuid';
import { upsertSessionLocal, upsertTemplateLocal } from '@/lib/workouts/local-repo';
import {
    SessionExercise,
    WorkoutSessionRow,
    WorkoutSessionSnapshotV1,
    WorkoutTemplate
} from '@/lib/workouts/types';

const EX_BENCH = { kind: 'free', name: 'Bench Press' } as const;
const EX_SQUAT = { kind: 'free', name: 'Barbell Squat' } as const;

function createSession(userId: string, date: Date, durationMinutes: number = 45): WorkoutSessionRow {
  const completedAt = new Date(date.getTime() + durationMinutes * 60000);
  const now = new Date();
  
  const exercises: SessionExercise[] = [
    {
      id: makeUuid(),
      source: { type: 'free' },
      exercise: EX_BENCH,
      plannedSets: [],
      performedSets: [
        { id: makeUuid(), weightKg: 60, reps: 10, done: true },
        { id: makeUuid(), weightKg: 60, reps: 10, done: true },
        { id: makeUuid(), weightKg: 60, reps: 10, done: true },
      ]
    },
    {
      id: makeUuid(),
      source: { type: 'free' },
      exercise: EX_SQUAT,
      plannedSets: [],
      performedSets: [
         { id: makeUuid(), weightKg: 80, reps: 5, done: true },
         { id: makeUuid(), weightKg: 80, reps: 5, done: true },
      ]
    }
  ];

  const snapshot: WorkoutSessionSnapshotV1 = {
    v: 1,
    exercises: exercises
  };

  return {
    id: makeUuid(),
    title: 'Demo Workout',
    template_id: null,
    snapshot,
    status: 'completed',
    started_at: date.toISOString(),
    ended_at: completedAt.toISOString(),
    created_at: date.toISOString(),
    updated_at: completedAt.toISOString(),
  };
}

export async function seedMockData(userId: string) {
    // Clear existing data for a clean slate
    await clearUserLocalData(userId);

    const now = new Date();

    // 1. Create a template
    const template: WorkoutTemplate = {
        id: makeUuid(),
        name: 'Demo Upper Body',
        items: [
            { id: makeUuid(), type: 'free', exercise: EX_BENCH },
            { id: makeUuid(), type: 'free', exercise: EX_SQUAT }
        ],
        tags: ['strength'],
        created_at: now.toISOString(),
        updated_at: now.toISOString()
    };
    
    // upsertTemplateLocal expects { userId, row } but row is Omit<WorkoutTemplateRow, 'user_id'> ?
    // Let's check signature. upsertTemplateLocal({ userId, row: WorkoutTemplateRow })
    // WorkoutTemplateRow has user_id.
    
    // Actually upsertTemplateLocal takes { userId, row: WorkoutTemplateRow } where Row extends Template
    // Let's rely on inferred types or just pass what's needed.
    // Looking at local-repo.ts, it calls `insert into workout_templates ...`
    
    // We'll call upsertTemplateLocal with proper structure matching the DB schema implied by types
    await upsertTemplateLocal({
        userId,
        row: {
            ...template,
            user_id: userId,
            items_json: JSON.stringify(template.items),
            tags_json: JSON.stringify(template.tags)
        } as any // avoiding deep type matching for payload usage
    });

    // 2. Session: 7 days ago
    const d1 = new Date(now);
    d1.setDate(d1.getDate() - 7);
    await upsertSessionLocal({ userId, row: createSession(userId, d1) });

    // 3. Session: 3 days ago
    const d2 = new Date(now);
    d2.setDate(d2.getDate() - 3);
    await upsertSessionLocal({ userId, row: createSession(userId, d2) });

    // 4. Session: Today earlier
    const d3 = new Date(now);
    d3.setHours(d3.getHours() - 4);
    await upsertSessionLocal({ userId, row: createSession(userId, d3) });
}
