import { z } from 'zod';
import { periodDays, RECORD_KINDS } from '../analytics/index.js';
import { isoDateTime } from './common.js';

export const isoDate = z.iso.date();

/** Local dates on the watch, both ends included; up to ~3 years. */
export const periodQuerySchema = z
  .object({ from: isoDate, to: isoDate })
  .refine((p) => p.from <= p.to, 'from > to')
  .refine((p) => periodDays(p) <= 1100, 'Period too long');
export type PeriodQuery = z.infer<typeof periodQuerySchema>;

const periodSchema = z.object({ from: isoDate, to: isoDate });
const nullableNumber = z.number().nullable();

export const workoutTotalsSchema = z.object({
  workouts: z.number().int(),
  workingSets: z.number().int(),
  volumeKg: z.number(),
  density: nullableNumber,
  avgWorkingHr: nullableNumber,
  avgPeakHr: nullableNumber,
  avgRecoveryBpm: nullableNumber,
  hrZonesSec: z.array(z.number()),
});
export type WorkoutTotalsDto = z.infer<typeof workoutTotalsSchema>;

/** `GET /analytics/overview`: period totals, the previous period and weekly trends. */
export const analyticsOverviewSchema = z.object({
  period: periodSchema,
  previousPeriod: periodSchema,
  current: workoutTotalsSchema,
  previous: workoutTotalsSchema,
  /** Every week touching the period; `weekStart` is a Monday. */
  weeks: z.array(workoutTotalsSchema.extend({ weekStart: isoDate })),
});
export type AnalyticsOverview = z.infer<typeof analyticsOverviewSchema>;

const muscleLoadSchema = z.object({ muscle: z.string(), sets: z.number(), volumeKg: z.number() });

/** `GET /analytics/muscles`: sets and volume per muscle group (heat map, weekly charts). */
export const analyticsMusclesSchema = z.object({
  period: periodSchema,
  previousPeriod: periodSchema,
  /** Only muscles with sets in either period. */
  muscles: z.array(
    muscleLoadSchema.extend({ previousSets: z.number(), previousVolumeKg: z.number() }),
  ),
  weeks: z.array(z.object({ weekStart: isoDate, muscles: z.array(muscleLoadSchema) })),
});
export type AnalyticsMuscles = z.infer<typeof analyticsMusclesSchema>;

export const recordValueSchema = z.object({
  valueKg: z.number(),
  reps: z.number().int().nullable(),
  workoutId: z.uuid(),
  date: isoDate,
});
export const exerciseRecordsSchema = z.object(
  Object.fromEntries(RECORD_KINDS.map((k) => [k, recordValueSchema.nullable()])) as Record<
    (typeof RECORD_KINDS)[number],
    z.ZodNullable<typeof recordValueSchema>
  >,
);
export type ExerciseRecordsDto = z.infer<typeof exerciseRecordsSchema>;

export const exerciseSessionSchema = z.object({
  workoutId: z.uuid(),
  date: isoDate,
  workingSets: z.number().int(),
  maxWeightKg: nullableNumber,
  maxWeightReps: z.number().int().nullable(),
  bestE1rmKg: nullableNumber,
  maxSetVolumeKg: nullableNumber,
  volumeKg: z.number(),
});
export type ExerciseSessionDto = z.infer<typeof exerciseSessionSchema>;

/** `GET /analytics/exercises/:id`: one point per workout in the period, all-time records. */
export const exerciseProgressSchema = z.object({
  exerciseId: z.uuid(),
  period: periodSchema,
  sessions: z.array(exerciseSessionSchema),
  records: exerciseRecordsSchema,
});
export type ExerciseProgress = z.infer<typeof exerciseProgressSchema>;

/** `before`: only workouts started earlier (the bests a workout is compared with). */
export const recordsQuerySchema = z.object({ before: isoDateTime.optional() });

export const recordsResponseSchema = z.object({
  items: z.array(exerciseRecordsSchema.extend({ exerciseId: z.uuid() })),
});
export type RecordsResponse = z.infer<typeof recordsResponseSchema>;
