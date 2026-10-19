import type { Exercise, WorkoutDetail, WorkoutHrResponse } from '@gsc/shared';
import { and, eq, sql } from 'drizzle-orm';

import { getDb } from './client';
import { cachedExercises, cachedWorkoutDetails, cachedWorkouts } from './schema';

// Workout details (with HR) and the exercise catalog, so annotation works offline.

const byUser = (userId: string, id: string) =>
  and(eq(cachedWorkoutDetails.id, id), eq(cachedWorkoutDetails.userId, userId));

export function getCachedWorkout(userId: string, id: string) {
  return (
    getDb()
      .select({ detail: cachedWorkoutDetails.detail, hr: cachedWorkoutDetails.hr })
      .from(cachedWorkoutDetails)
      .where(byUser(userId, id))
      .get() ?? null
  );
}

export function cacheWorkoutDetail(userId: string, detail: WorkoutDetail) {
  getDb()
    .insert(cachedWorkoutDetails)
    .values({ id: detail.id, userId, detail, cachedAt: new Date() })
    .onConflictDoUpdate({
      target: cachedWorkoutDetails.id,
      set: { detail: sql`excluded.detail`, cachedAt: sql`excluded.cached_at` },
    })
    .run();
}

/** HR is stored next to a cached detail; without one there is nothing to annotate offline. */
export function cacheWorkoutHr(userId: string, id: string, hr: WorkoutHrResponse) {
  getDb().update(cachedWorkoutDetails).set({ hr }).where(byUser(userId, id)).run();
}

/** A workout gone from the server: its detail and its feed entry. */
export function removeCachedWorkout(userId: string, id: string) {
  const db = getDb();
  db.delete(cachedWorkoutDetails).where(byUser(userId, id)).run();
  db.delete(cachedWorkouts)
    .where(and(eq(cachedWorkouts.userId, userId), eq(cachedWorkouts.id, id)))
    .run();
}

export function getCachedExercises(userId: string): Exercise[] | null {
  return (
    getDb()
      .select({ items: cachedExercises.items })
      .from(cachedExercises)
      .where(eq(cachedExercises.userId, userId))
      .get()?.items ?? null
  );
}

export function cacheExercises(userId: string, items: Exercise[]) {
  getDb()
    .insert(cachedExercises)
    .values({ userId, items, cachedAt: new Date() })
    .onConflictDoUpdate({
      target: cachedExercises.userId,
      set: { items: sql`excluded.items`, cachedAt: sql`excluded.cached_at` },
    })
    .run();
}
