import {
  EMPTY_RECORDS,
  exerciseRecords,
  exerciseSessions,
  hrRecovery,
  inPeriod,
  isHrSet,
  localDate,
  muscleLoads,
  previousPeriod,
  userSettingsSchema,
  weekStart,
  weekStarts,
  workoutTotals,
  type AnalyticsExercise,
  type AnalyticsMuscles,
  type AnalyticsOverview,
  type AnalyticsSet,
  type AnalyticsWorkout,
  type ExerciseProgress,
  type ExerciseSession,
  type IsoDate,
  type MuscleLoad,
  type Period,
  type RecordsResponse,
} from '@gsc/shared';
import { and, asc, eq, inArray, lt, sql, type SQL } from 'drizzle-orm';
import type { Db } from '../db/client.js';
import { effectiveSets, garminSets, workoutHr, workouts } from '../db/schema.js';
import { listExercises } from './exercises.js';
import { getUser } from './users.js';

// Analytics are computed on request from `effective_sets` with the pure functions of
// `@gsc/shared` (the client uses the same ones for a workout's summary).

/** Local date of a workout on the watch, as in `localDate()`. */
const workoutLocalDate = sql`((${workouts.startedAt} AT TIME ZONE 'UTC') + make_interval(secs => coalesce(${workouts.utcOffsetSec}, 0)))::date`;

interface LoadOptions {
  period?: Period;
  /** Workouts started before this moment. */
  before?: Date;
  /** Only sets of this exercise (exercise progress). */
  exerciseId?: string;
  /** Load HR samples for recovery (overview only: the heaviest part). */
  withHr?: boolean;
}

/** The user's workouts in chronological order, as analytics input. */
export async function loadAnalyticsWorkouts(
  db: Db,
  userId: string,
  { period, before, exerciseId, withHr = false }: LoadOptions,
): Promise<AnalyticsWorkout[]> {
  const settings = userSettingsSchema.parse((await getUser(db, userId)).settings);
  const conditions: (SQL | undefined)[] = [eq(workouts.userId, userId)];
  if (period) {
    conditions.push(sql`${workoutLocalDate} BETWEEN ${period.from}::date AND ${period.to}::date`);
  }
  if (before) conditions.push(lt(workouts.startedAt, before));

  const rows = await db
    .select()
    .from(workouts)
    .where(and(...conditions))
    .orderBy(asc(workouts.startedAt), asc(workouts.id));
  if (rows.length === 0) return [];
  const ids = rows.map((w) => w.id);

  const setRows = await db
    .select({
      workoutId: effectiveSets.workoutId,
      startedAt: effectiveSets.startedAt,
      durationSec: effectiveSets.durationSec,
      restAfterSec: garminSets.restAfterSec,
      exerciseId: effectiveSets.exerciseId,
      weightKg: effectiveSets.weightKg,
      reps: effectiveSets.reps,
      repsSource: effectiveSets.repsSource,
      isWarmup: effectiveSets.isWarmup,
      isExcluded: effectiveSets.isExcluded,
      avgHr: effectiveSets.avgHr,
      hrPeak: effectiveSets.hrPeak,
    })
    .from(effectiveSets)
    .leftJoin(garminSets, eq(garminSets.id, effectiveSets.setId))
    .where(
      and(
        inArray(effectiveSets.workoutId, ids),
        exerciseId ? eq(effectiveSets.exerciseId, exerciseId) : undefined,
      ),
    )
    .orderBy(asc(effectiveSets.workoutId), asc(effectiveSets.orderIndex));
  const setsByWorkout = new Map<string, typeof setRows>();
  for (const s of setRows)
    setsByWorkout.set(s.workoutId, [...(setsByWorkout.get(s.workoutId) ?? []), s]);

  const hrRows = withHr
    ? await db.select().from(workoutHr).where(inArray(workoutHr.workoutId, ids))
    : [];
  const hrByWorkout = new Map(hrRows.map((h) => [h.workoutId, h]));

  return rows.map((w) => {
    const sets = setsByWorkout.get(w.id) ?? [];
    const hr = hrByWorkout.get(w.id);
    const recoveries: number[] = [];
    if (hr) {
      for (const s of sets) {
        if (!s.startedAt || s.durationSec === null || !isHrSet(s)) continue;
        const recovery = hrRecovery(hr, {
          startSec: (s.startedAt.getTime() - w.startedAt.getTime()) / 1000,
          durationSec: s.durationSec,
          restAfterSec: s.restAfterSec,
        });
        if (recovery !== null) recoveries.push(recovery);
      }
    }
    return {
      id: w.id,
      startedAt: w.startedAt.toISOString(),
      utcOffsetSec: w.utcOffsetSec,
      activeSec: w.activeSec,
      timerSec: w.timerSec,
      bodyWeightKg: settings.bodyWeightKg ?? w.bodyWeightKg,
      hrZonesSec: w.hrZones?.secondsInZone ?? null,
      sets: sets.map((s): AnalyticsSet => ({
        exerciseId: s.exerciseId,
        weightKg: s.weightKg,
        reps: s.reps,
        repsSource: s.repsSource,
        isWarmup: s.isWarmup,
        isExcluded: s.isExcluded,
        avgHr: s.avgHr,
        hrPeak: s.hrPeak,
      })),
      hrRecoveriesBpm: recoveries,
    };
  });
}

/** Every exercise the user can see, deleted ones included (old sets still use them). */
export async function analyticsExercises(db: Db, userId: string) {
  const items = await listExercises(db, userId, {});
  return new Map<string, AnalyticsExercise>(items.map((e) => [e.id, e]));
}

const dateOf = (w: AnalyticsWorkout) => localDate(w.startedAt, w.utcOffsetSec);
const within = (list: AnalyticsWorkout[], period: Period) =>
  list.filter((w) => inPeriod(dateOf(w), period));
const inWeek = (list: AnalyticsWorkout[], week: IsoDate) =>
  list.filter((w) => weekStart(dateOf(w)) === week);

/** Both periods in one query: the previous one ends right before the current one. */
async function loadWithPrevious(db: Db, userId: string, period: Period, withHr: boolean) {
  const previous = previousPeriod(period);
  const all = await loadAnalyticsWorkouts(db, userId, {
    period: { from: previous.from, to: period.to },
    withHr,
  });
  return { previous, all, current: within(all, period), before: within(all, previous) };
}

export async function overview(db: Db, userId: string, period: Period): Promise<AnalyticsOverview> {
  const exercises = await analyticsExercises(db, userId);
  const { previous, all, current, before } = await loadWithPrevious(db, userId, period, true);
  return {
    period,
    previousPeriod: previous,
    current: workoutTotals(current, exercises),
    previous: workoutTotals(before, exercises),
    // A week at the start of the period may reach into the previous one: weeks are whole.
    weeks: weekStarts(period).map((week) => ({
      weekStart: week,
      ...workoutTotals(inWeek(all, week), exercises),
    })),
  };
}

const loadsOf = (
  list: AnalyticsWorkout[],
  exercises: ReadonlyMap<string, AnalyticsExercise>,
): Map<string, MuscleLoad> => {
  const into = new Map<string, MuscleLoad>();
  for (const w of list) muscleLoads(w.sets, exercises, w.bodyWeightKg, into);
  return into;
};

export async function muscles(db: Db, userId: string, period: Period): Promise<AnalyticsMuscles> {
  const exercises = await analyticsExercises(db, userId);
  const { previous, all, current, before } = await loadWithPrevious(db, userId, period, false);
  const now = loadsOf(current, exercises);
  const then = loadsOf(before, exercises);
  const slugs = [...new Set([...now.keys(), ...then.keys()])];
  return {
    period,
    previousPeriod: previous,
    muscles: slugs.map((muscle) => ({
      muscle,
      sets: now.get(muscle)?.sets ?? 0,
      volumeKg: now.get(muscle)?.volumeKg ?? 0,
      previousSets: then.get(muscle)?.sets ?? 0,
      previousVolumeKg: then.get(muscle)?.volumeKg ?? 0,
    })),
    weeks: weekStarts(period).map((week) => ({
      weekStart: week,
      muscles: [...loadsOf(inWeek(all, week), exercises)].map(([muscle, load]) => ({
        muscle,
        ...load,
      })),
    })),
  };
}

/** All sessions of the exercise, chronologically (records need the whole history). */
async function sessionsOf(
  db: Db,
  userId: string,
  exerciseId: string,
  exercises: ReadonlyMap<string, AnalyticsExercise>,
) {
  const history = await loadAnalyticsWorkouts(db, userId, { exerciseId });
  return history.flatMap((w) => {
    const s = exerciseSessions(w, exercises).get(exerciseId);
    return s ? [s] : [];
  });
}

export async function exerciseProgress(
  db: Db,
  userId: string,
  exerciseId: string,
  period: Period,
): Promise<ExerciseProgress> {
  const exercises = await analyticsExercises(db, userId);
  const sessions = await sessionsOf(db, userId, exerciseId, exercises);
  const records = exerciseRecords(sessions.map((s): [string, ExerciseSession] => [exerciseId, s]));
  return {
    exerciseId,
    period,
    sessions: sessions.filter((s) => inPeriod(s.date, period)),
    records: records.get(exerciseId) ?? EMPTY_RECORDS,
  };
}

/** Bests per exercise with weighted sets, the most recently set record first. */
export async function records(db: Db, userId: string, before?: Date): Promise<RecordsResponse> {
  const exercises = await analyticsExercises(db, userId);
  const history = await loadAnalyticsWorkouts(db, userId, { before });
  const all = exerciseRecords(history.flatMap((w) => [...exerciseSessions(w, exercises)]));
  const latest = (r: RecordsResponse['items'][number]) =>
    Object.values(r)
      .map((v) => (v && typeof v === 'object' ? v.date : ''))
      .sort()
      .at(-1) ?? '';
  return {
    items: [...all]
      .filter(([, r]) => Object.values(r).some((v) => v !== null))
      .map(([exerciseId, r]) => ({ exerciseId, ...r }))
      .sort((a, b) => latest(b).localeCompare(latest(a))),
  };
}
