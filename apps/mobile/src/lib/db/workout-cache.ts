import type { WorkoutSummary } from '@gsc/shared';
import { desc, eq, sql } from 'drizzle-orm';

import { getDb } from './client';
import { cachedWorkouts } from './schema';

function rows(userId: string, items: WorkoutSummary[]) {
  const cachedAt = new Date();
  return items.map((summary) => ({
    id: summary.id,
    userId,
    startedAt: summary.startedAt,
    summary,
    cachedAt,
  }));
}

/** Newest workouts first, as the feed shows them. */
export function listCachedWorkouts(userId: string): WorkoutSummary[] {
  return getDb()
    .select({ summary: cachedWorkouts.summary })
    .from(cachedWorkouts)
    .where(eq(cachedWorkouts.userId, userId))
    .orderBy(desc(cachedWorkouts.startedAt), desc(cachedWorkouts.id))
    .all()
    .map((row) => row.summary);
}

/**
 * Saves a fetched feed page. The first page replaces the cache, so workouts deleted
 * on the server (or on another device) disappear from it.
 */
export function cacheWorkoutPage(userId: string, items: WorkoutSummary[], firstPage: boolean) {
  const db = getDb();
  db.transaction((tx) => {
    if (firstPage) tx.delete(cachedWorkouts).where(eq(cachedWorkouts.userId, userId)).run();
    if (items.length === 0) return;
    tx.insert(cachedWorkouts)
      .values(rows(userId, items))
      .onConflictDoUpdate({
        target: cachedWorkouts.id,
        set: {
          startedAt: sql`excluded.started_at`,
          summary: sql`excluded.summary`,
          cachedAt: sql`excluded.cached_at`,
        },
      })
      .run();
  });
}

export function clearLocalCache() {
  getDb().delete(cachedWorkouts).run();
}
