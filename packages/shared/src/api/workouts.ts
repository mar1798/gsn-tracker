import { z } from 'zod';
import { isoDateTime } from './common.js';

export const WORKOUT_SOURCES = ['manual_fit', 'garmin_activity_api', 'terra'] as const;
export type WorkoutSource = (typeof WORKOUT_SOURCES)[number];

const nullableNumber = z.number().nullable();
const nullableInt = z.number().int().nullable();

export const workoutSummarySchema = z.object({
  id: z.uuid(),
  source: z.enum(WORKOUT_SOURCES),
  /** UTC. */
  startedAt: isoDateTime,
  /** Local time of the watch = UTC + this offset. */
  utcOffsetSec: nullableInt,
  durationSec: nullableNumber,
  activeSec: nullableNumber,
  calories: nullableInt,
  avgHr: nullableInt,
  maxHr: nullableInt,
  deviceModel: z.string().nullable(),
  title: z.string().nullable(),
  /** Garmin (non-manual) sets. */
  setCount: z.number().int(),
  /** Garmin sets with an exercise chosen by the user ("размечено 8/12"). */
  annotatedSetCount: z.number().int(),
});
export type WorkoutSummary = z.infer<typeof workoutSummarySchema>;

export const workoutListQuerySchema = z.object({
  cursor: z.string().max(200).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export const workoutListResponseSchema = z.object({
  items: z.array(workoutSummarySchema),
  nextCursor: z.string().nullable(),
});
export type WorkoutListResponse = z.infer<typeof workoutListResponseSchema>;

export const garminHintSchema = z.object({
  category: z.string(),
  subtype: nullableInt,
  exerciseName: z.string().nullable(),
  label: z.string(),
});
export type GarminHint = z.infer<typeof garminHintSchema>;

const weightKg = z.number().min(0).max(1000);
const reps = z.number().int().min(0).max(1000);
const rpe = z.number().min(1).max(10).multipleOf(0.5);
const note = z.string().trim().max(1000);

/** PUT replaces the whole annotation; omitted fields become empty. */
export const annotationInputSchema = z
  .object({
    exerciseId: z.uuid().nullable().default(null),
    weightKg: weightKg.nullable().default(null),
    reps: reps.nullable().default(null),
    rpe: rpe.nullable().default(null),
    isWarmup: z.boolean().default(false),
    isFailure: z.boolean().default(false),
    isExcluded: z.boolean().default(false),
    note: note.nullable().default(null),
  })
  .strict();
export type AnnotationInput = z.input<typeof annotationInputSchema>;

export const annotationPatchSchema = z
  .object({
    exerciseId: z.uuid().nullable(),
    weightKg: weightKg.nullable(),
    reps: reps.nullable(),
    rpe: rpe.nullable(),
    isWarmup: z.boolean(),
    isFailure: z.boolean(),
    isExcluded: z.boolean(),
    note: note.nullable(),
  })
  .partial()
  .strict();
export type AnnotationPatch = z.infer<typeof annotationPatchSchema>;

/** "Отметить подходы 1–4 как Жим лёжа": the patch is merged into each set's annotation. */
export const bulkAnnotationRequestSchema = z.object({
  setIds: z.array(z.uuid()).min(1).max(200),
  patch: annotationPatchSchema.refine((p) => Object.keys(p).length > 0, 'Empty patch'),
});
export type BulkAnnotationRequest = z.infer<typeof bulkAnnotationRequestSchema>;

export const annotationSchema = z.object({
  exerciseId: z.uuid().nullable(),
  weightKg: nullableNumber,
  reps: nullableInt,
  rpe: nullableNumber,
  isWarmup: z.boolean(),
  isFailure: z.boolean(),
  isExcluded: z.boolean(),
  note: z.string().nullable(),
  updatedAt: isoDateTime,
});
export type Annotation = z.infer<typeof annotationSchema>;

/** Values after `annotation ?? garmin` (the `effective_sets` view). */
export const effectiveSetValuesSchema = z.object({
  exerciseId: z.uuid().nullable(),
  weightKg: nullableNumber,
  reps: nullableInt,
  /** `user` = entered or confirmed by the user; `garmin` = watch pre-fill, not for volume/e1RM. */
  repsSource: z.enum(['user', 'garmin']).nullable(),
  rpe: nullableNumber,
  isWarmup: z.boolean(),
  isFailure: z.boolean(),
  isExcluded: z.boolean(),
  note: z.string().nullable(),
});
export type EffectiveSetValues = z.infer<typeof effectiveSetValuesSchema>;

export const workoutSetSchema = z.object({
  id: z.uuid(),
  setIndex: z.number().int(),
  startedAt: isoDateTime,
  durationSec: nullableNumber,
  restAfterSec: nullableNumber,
  suspicious: z.enum(['too_short']).nullable(),
  garmin: z.object({
    reps: nullableInt,
    weightKg: nullableNumber,
    hints: z.array(garminHintSchema),
    /** Catalog exercises matching the hints, best first. Never applied automatically. */
    suggestedExerciseIds: z.array(z.uuid()),
  }),
  hr: z.object({
    avg: nullableInt,
    max: nullableInt,
    min: nullableInt,
    /** Max HR up to 30 s after the set: the main HR metric of a set. */
    peak: nullableInt,
  }),
  caloriesEst: nullableNumber,
  annotation: annotationSchema.nullable(),
  effective: effectiveSetValuesSchema,
});
export type WorkoutSet = z.infer<typeof workoutSetSchema>;

export const manualSetInputSchema = z
  .object({
    exerciseId: z.uuid().nullable().default(null),
    weightKg: weightKg.nullable().default(null),
    reps: reps.nullable().default(null),
    rpe: rpe.nullable().default(null),
    isWarmup: z.boolean().default(false),
    isFailure: z.boolean().default(false),
    note: note.nullable().default(null),
    /** Position among all sets of the workout; appended to the end when omitted. */
    orderIndex: z.number().int().min(0).max(10_000).optional(),
  })
  .strict();
export type ManualSetInput = z.input<typeof manualSetInputSchema>;

// Spelled out: `.partial()` of the input schema would keep its defaults and null omitted fields.
export const manualSetPatchSchema = z
  .object({
    exerciseId: z.uuid().nullable(),
    weightKg: weightKg.nullable(),
    reps: reps.nullable(),
    rpe: rpe.nullable(),
    isWarmup: z.boolean(),
    isFailure: z.boolean(),
    note: note.nullable(),
    orderIndex: z.number().int().min(0).max(10_000),
  })
  .partial()
  .strict();
export type ManualSetPatch = z.input<typeof manualSetPatchSchema>;

export const manualSetSchema = z.object({
  id: z.uuid(),
  orderIndex: z.number().int(),
  exerciseId: z.uuid().nullable(),
  weightKg: nullableNumber,
  reps: nullableInt,
  rpe: nullableNumber,
  isWarmup: z.boolean(),
  isFailure: z.boolean(),
  note: z.string().nullable(),
});
export type ManualSet = z.infer<typeof manualSetSchema>;

export const hrZonesSchema = z.object({
  calcType: z.string().nullable(),
  highBoundaries: z.array(z.number()),
  secondsInZone: z.array(z.number()),
});

export const workoutDetailSchema = workoutSummarySchema.extend({
  notes: z.string().nullable(),
  timerSec: nullableNumber,
  totalRepsGarmin: nullableInt,
  /** `user_profile.weight` from the FIT file. */
  bodyWeightKg: nullableNumber,
  hrZones: hrZonesSchema.nullable(),
  sets: z.array(workoutSetSchema),
  manualSets: z.array(manualSetSchema),
});
export type WorkoutDetail = z.infer<typeof workoutDetailSchema>;

export const workoutPatchSchema = z
  .object({
    title: z.string().trim().max(200).nullable(),
    notes: z.string().trim().max(5000).nullable(),
  })
  .partial()
  .strict();
export type WorkoutPatch = z.infer<typeof workoutPatchSchema>;

/** Heart rate of the whole workout as parallel arrays (smart recording, ~every 2 s). */
export const workoutHrResponseSchema = z.object({
  startedAt: isoDateTime,
  offsetsSec: z.array(z.number().int()),
  bpm: z.array(z.number().int()),
});
export type WorkoutHrResponse = z.infer<typeof workoutHrResponseSchema>;

export const importFitResponseSchema = z.object({ workoutId: z.uuid() });
export type ImportFitResponse = z.infer<typeof importFitResponseSchema>;

/** 409 body when the same file (or Garmin activity) is already imported. */
export const duplicateImportErrorSchema = z.object({
  error: z.literal('duplicate'),
  message: z.string(),
  workoutId: z.uuid(),
});
