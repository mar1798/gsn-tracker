import { workoutEditSchema, type WorkoutEdit } from '@gsc/shared';
import { asc, desc, eq, sql } from 'drizzle-orm';

import { getDb } from './client';
import { pendingEdits, recentExercises } from './schema';

export type QueuedEdit = { id: number; edit: WorkoutEdit };

/** Pending edits in the order they were made. Rows that no longer parse are dropped. */
export function listQueuedEdits(userId: string): QueuedEdit[] {
  const rows = getDb()
    .select({ id: pendingEdits.id, edit: pendingEdits.edit })
    .from(pendingEdits)
    .where(eq(pendingEdits.userId, userId))
    .orderBy(asc(pendingEdits.id))
    .all();
  const result: QueuedEdit[] = [];
  for (const row of rows) {
    const parsed = workoutEditSchema.safeParse(row.edit);
    if (parsed.success) result.push({ id: row.id, edit: parsed.data });
    else removeQueuedEdit(row.id);
  }
  return result;
}

export function insertQueuedEdit(userId: string, edit: WorkoutEdit): QueuedEdit {
  const row = getDb()
    .insert(pendingEdits)
    .values({ userId, edit, createdAt: new Date() })
    .returning({ id: pendingEdits.id })
    .get();
  return { id: row.id, edit };
}

export function removeQueuedEdit(id: number) {
  getDb().delete(pendingEdits).where(eq(pendingEdits.id, id)).run();
}

const RECENT_LIMIT = 20;

export function touchRecentExercise(userId: string, exerciseId: string) {
  getDb()
    .insert(recentExercises)
    .values({ userId, exerciseId, usedAt: new Date() })
    .onConflictDoUpdate({
      target: [recentExercises.userId, recentExercises.exerciseId],
      set: { usedAt: sql`excluded.used_at` },
    })
    .run();
}

/** Most recently picked first. */
export function listRecentExerciseIds(userId: string, limit = RECENT_LIMIT): string[] {
  return getDb()
    .select({ exerciseId: recentExercises.exerciseId })
    .from(recentExercises)
    .where(eq(recentExercises.userId, userId))
    .orderBy(desc(recentExercises.usedAt))
    .limit(limit)
    .all()
    .map((r) => r.exerciseId);
}
