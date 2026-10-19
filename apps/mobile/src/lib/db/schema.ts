import type { Exercise, WorkoutDetail, WorkoutHrResponse, WorkoutSummary } from '@gsc/shared';
import { index, integer, primaryKey, sqliteTable, text } from 'drizzle-orm/sqlite-core';

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

export const cachedWorkoutDetails = sqliteTable('cached_workout_details', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull(),
  /** Last server state, without pending edits. */
  detail: text('detail', { mode: 'json' }).$type<WorkoutDetail>().notNull(),
  hr: text('hr', { mode: 'json' }).$type<WorkoutHrResponse>(),
  cachedAt: integer('cached_at', { mode: 'timestamp_ms' }).notNull(),
});

export const cachedExercises = sqliteTable('cached_exercises', {
  userId: text('user_id').primaryKey(),
  items: text('items', { mode: 'json' }).$type<Exercise[]>().notNull(),
  cachedAt: integer('cached_at', { mode: 'timestamp_ms' }).notNull(),
});

/** Annotation edits waiting to be sent, in order (offline queue). */
export const pendingEdits = sqliteTable(
  'pending_edits',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    userId: text('user_id').notNull(),
    /** Validated with `workoutEditSchema` on read. */
    edit: text('edit', { mode: 'json' }).$type<unknown>().notNull(),
    createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
  },
  (t) => [index('pending_edits_user_idx').on(t.userId, t.id)],
);

/** Exercises the user picked lately, for the quick picks in the annotation sheet. */
export const recentExercises = sqliteTable(
  'recent_exercises',
  {
    userId: text('user_id').notNull(),
    exerciseId: text('exercise_id').notNull(),
    usedAt: integer('used_at', { mode: 'timestamp_ms' }).notNull(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.exerciseId] })],
);
