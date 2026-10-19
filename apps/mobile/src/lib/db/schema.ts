import type { WorkoutSummary } from '@gsc/shared';
import { index, integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';

// Local cache (offline-first). Disposable: the server is the source of truth.
// Every change here needs a new entry in `migrations.ts`.

export const cachedWorkouts = sqliteTable(
  'cached_workouts',
  {
    id: text('id').primaryKey(),
    userId: text('user_id').notNull(),
    /** ISO UTC, sorts lexicographically. */
    startedAt: text('started_at').notNull(),
    summary: text('summary', { mode: 'json' }).$type<WorkoutSummary>().notNull(),
    cachedAt: integer('cached_at', { mode: 'timestamp_ms' }).notNull(),
  },
  (t) => [index('cached_workouts_user_started_idx').on(t.userId, t.startedAt)],
);
