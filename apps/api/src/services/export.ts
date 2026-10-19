import { setsCsv, type ExportSetRow } from '@gsc/shared';
import { eq } from 'drizzle-orm';
import type { Db } from '../db/client.js';
import { effectiveSets, exercises, garminSets, workouts } from '../db/schema.js';

/** Every set of the user as CSV: effective values from `effective_sets` plus raw watch data. */
export async function exportSetsCsv(db: Db, userId: string): Promise<string> {
  const rows = await db
    .select({
      workoutId: workouts.id,
      workoutStartedAt: workouts.startedAt,
      utcOffsetSec: workouts.utcOffsetSec,
      workoutTitle: workouts.title,
      kind: effectiveSets.kind,
      orderIndex: effectiveSets.orderIndex,
      setStartedAt: effectiveSets.startedAt,
      exercise: exercises.nameRu,
      weightKg: effectiveSets.weightKg,
      reps: effectiveSets.reps,
      repsSource: effectiveSets.repsSource,
      repsGarmin: garminSets.repsGarmin,
      rpe: effectiveSets.rpe,
      isWarmup: effectiveSets.isWarmup,
      isFailure: effectiveSets.isFailure,
      isExcluded: effectiveSets.isExcluded,
      durationSec: effectiveSets.durationSec,
      restAfterSec: garminSets.restAfterSec,
      avgHr: effectiveSets.avgHr,
      maxHr: garminSets.maxHr,
      hrPeak: effectiveSets.hrPeak,
      caloriesEst: garminSets.caloriesEst,
      note: effectiveSets.note,
    })
    .from(effectiveSets)
    .innerJoin(workouts, eq(workouts.id, effectiveSets.workoutId))
    .leftJoin(garminSets, eq(garminSets.id, effectiveSets.setId))
    .leftJoin(exercises, eq(exercises.id, effectiveSets.exerciseId))
    .where(eq(workouts.userId, userId));

  return setsCsv(
    rows.map((r): ExportSetRow => ({
      ...r,
      workoutStartedAt: r.workoutStartedAt.toISOString(),
      setStartedAt: r.setStartedAt?.toISOString() ?? null,
    })),
  );
}
