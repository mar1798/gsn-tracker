import {
  suggestExercises,
  type ManualSet,
  type WorkoutDetail,
  type WorkoutSet,
  type WorkoutSummary,
} from '@gsc/shared';
import { and, asc, desc, eq, sql, type SQL } from 'drizzle-orm';
import type { Db } from '../db/client.js';
import { effectiveSets, garminSets, manualSets, setAnnotations, workouts } from '../db/schema.js';
import { HttpError, notFound } from '../http.js';
import { suggestionCatalog } from './exercises.js';

type WorkoutRow = typeof workouts.$inferSelect;
type ManualSetRow = typeof manualSets.$inferSelect;

export async function getOwnedWorkout(db: Db, userId: string, id: string): Promise<WorkoutRow> {
  const [row] = await db
    .select()
    .from(workouts)
    .where(and(eq(workouts.id, id), eq(workouts.userId, userId)));
  if (!row) throw notFound('Тренировка не найдена');
  return row;
}

// Correlated subqueries are written with explicit table names: Drizzle renders a selected
// column unqualified, and an unqualified `id` would bind to the subquery's own table.
const setCount = sql<number>`(
  SELECT count(*)::int FROM garmin_sets gs WHERE gs.workout_id = "workouts"."id"
)`;

/** A set counts as done once it has an exercise or is excluded. */
const annotatedSetCount = sql<number>`(
  SELECT count(*)::int FROM effective_sets es
  WHERE es.workout_id = "workouts"."id" AND es.kind = 'garmin'
    AND (es.exercise_id IS NOT NULL OR es.is_excluded)
)`;

function toSummary(row: WorkoutRow, setCount: number, annotatedSetCount: number): WorkoutSummary {
  return {
    id: row.id,
    source: row.source,
    startedAt: row.startedAt.toISOString(),
    utcOffsetSec: row.utcOffsetSec,
    durationSec: row.durationSec,
    activeSec: row.activeSec,
    calories: row.calories,
    avgHr: row.avgHr,
    maxHr: row.maxHr,
    deviceModel: row.deviceModel,
    title: row.title,
    setCount,
    annotatedSetCount,
  };
}

interface Cursor {
  startedAt: string;
  id: string;
}

const encodeCursor = (c: Cursor) => Buffer.from(JSON.stringify(c)).toString('base64url');

function decodeCursor(raw: string): Cursor {
  try {
    const c = JSON.parse(Buffer.from(raw, 'base64url').toString()) as Cursor;
    if (typeof c.startedAt === 'string' && typeof c.id === 'string') return c;
  } catch {
    // fall through
  }
  throw new HttpError(400, 'invalid_cursor', 'Некорректный курсор');
}

/** Newest first, keyset pagination on `(started_at, id)`. */
export async function listWorkouts(
  db: Db,
  userId: string,
  { cursor, limit }: { cursor?: string | undefined; limit: number },
): Promise<{ items: WorkoutSummary[]; nextCursor: string | null }> {
  const conditions: SQL[] = [eq(workouts.userId, userId)];
  if (cursor) {
    const c = decodeCursor(cursor);
    conditions.push(
      sql`(${workouts.startedAt}, ${workouts.id}) < (${c.startedAt}::timestamptz, ${c.id}::uuid)`,
    );
  }

  const rows = await db
    .select({ workout: workouts, setCount, annotatedSetCount })
    .from(workouts)
    .where(and(...conditions))
    .orderBy(desc(workouts.startedAt), desc(workouts.id))
    .limit(limit + 1);

  const page = rows.slice(0, limit);
  const last = page.at(-1);
  return {
    items: page.map((r) => toSummary(r.workout, r.setCount, r.annotatedSetCount)),
    nextCursor:
      rows.length > limit && last
        ? encodeCursor({ startedAt: last.workout.startedAt.toISOString(), id: last.workout.id })
        : null,
  };
}

/** Garmin sets of the user's workouts with annotation and effective values. */
export async function loadSets(db: Db, userId: string, where: SQL): Promise<WorkoutSet[]> {
  const rows = await db
    .select({
      set: garminSets,
      annotation: setAnnotations,
      effective: {
        exerciseId: effectiveSets.exerciseId,
        weightKg: effectiveSets.weightKg,
        reps: effectiveSets.reps,
        repsSource: effectiveSets.repsSource,
        rpe: effectiveSets.rpe,
        isWarmup: effectiveSets.isWarmup,
        isFailure: effectiveSets.isFailure,
        isExcluded: effectiveSets.isExcluded,
        note: effectiveSets.note,
      },
    })
    .from(garminSets)
    .innerJoin(workouts, eq(workouts.id, garminSets.workoutId))
    .innerJoin(effectiveSets, eq(effectiveSets.setId, garminSets.id))
    .leftJoin(setAnnotations, eq(setAnnotations.garminSetId, garminSets.id))
    .where(and(eq(workouts.userId, userId), where))
    .orderBy(asc(garminSets.workoutId), asc(garminSets.setIndex));
  if (rows.length === 0) return [];

  const catalog = await suggestionCatalog(db, userId);

  return rows.map(({ set, annotation: a, effective: e }) => ({
    id: set.id,
    setIndex: set.setIndex,
    startedAt: set.startedAt.toISOString(),
    durationSec: set.durationSec,
    restAfterSec: set.restAfterSec,
    suspicious: set.suspicious,
    garmin: {
      reps: set.repsGarmin,
      weightKg: set.weightGarminKg,
      hints: set.garminHints,
      suggestedExerciseIds: suggestExercises(set.garminHints, catalog).map((x) => x.id),
    },
    hr: { avg: set.avgHr, max: set.maxHr, min: set.minHr, peak: set.hrPeak },
    caloriesEst: set.caloriesEst,
    annotation: a && {
      exerciseId: a.exerciseId,
      weightKg: a.weightKg,
      reps: a.reps,
      rpe: a.rpe,
      isWarmup: a.isWarmup,
      isFailure: a.isFailure,
      isExcluded: a.isExcluded,
      note: a.note,
      updatedAt: a.updatedAt.toISOString(),
    },
    effective: e,
  }));
}

export function toManualSet(row: ManualSetRow): ManualSet {
  return {
    id: row.id,
    orderIndex: row.orderIndex,
    exerciseId: row.exerciseId,
    weightKg: row.weightKg,
    reps: row.reps,
    rpe: row.rpe,
    isWarmup: row.isWarmup,
    isFailure: row.isFailure,
    note: row.note,
  };
}

export async function loadWorkoutDetail(
  db: Db,
  userId: string,
  id: string,
): Promise<WorkoutDetail> {
  const [row] = await db
    .select({ workout: workouts, setCount, annotatedSetCount })
    .from(workouts)
    .where(and(eq(workouts.id, id), eq(workouts.userId, userId)));
  if (!row) throw notFound('Тренировка не найдена');
  const w = row.workout;

  const [sets, manual] = await Promise.all([
    loadSets(db, userId, eq(garminSets.workoutId, id)),
    db
      .select()
      .from(manualSets)
      .where(eq(manualSets.workoutId, id))
      .orderBy(asc(manualSets.orderIndex), asc(manualSets.createdAt)),
  ]);

  return {
    ...toSummary(w, row.setCount, row.annotatedSetCount),
    notes: w.notes,
    timerSec: w.timerSec,
    totalRepsGarmin: w.totalRepsGarmin,
    bodyWeightKg: w.bodyWeightKg,
    hrZones: w.hrZones,
    sets,
    manualSets: manual.map(toManualSet),
  };
}
