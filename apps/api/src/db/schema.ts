import type { GarminHint, UserSettings, WorkoutSource } from '@gsc/shared';
import { sql } from 'drizzle-orm';
import {
  boolean,
  doublePrecision,
  index,
  integer,
  jsonb,
  pgTable,
  pgView,
  primaryKey,
  real,
  smallint,
  text,
  timestamp,
  unique,
  uuid,
} from 'drizzle-orm/pg-core';

const id = () => uuid('id').primaryKey().defaultRandom();
const createdAt = () => timestamp('created_at', { withTimezone: true }).notNull().defaultNow();
const updatedAt = () =>
  timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date());

export const users = pgTable('users', {
  id: id(),
  /** Lowercased. Null for Sign in with Apple users who hid their email. */
  email: text('email').unique(),
  passwordHash: text('password_hash'),
  /** Sign in with Apple `sub`. */
  appleSub: text('apple_sub').unique(),
  name: text('name'),
  settings: jsonb('settings').$type<Partial<UserSettings>>().notNull().default({}),
  createdAt: createdAt(),
});

/** Opaque refresh tokens, stored as SHA-256. Rotated on every use. */
export const refreshTokens = pgTable(
  'refresh_tokens',
  {
    id: id(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    tokenHash: text('token_hash').notNull().unique(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    createdAt: createdAt(),
  },
  (t) => [index('refresh_tokens_user_idx').on(t.userId)],
);

/** Phase 8 (Garmin API / Terra). */
export const garminConnections = pgTable('garmin_connections', {
  id: id(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  source: text('source').$type<WorkoutSource>().notNull(),
  externalUserId: text('external_user_id'),
  tokensEncrypted: text('tokens_encrypted'),
  status: text('status').notNull(),
  createdAt: createdAt(),
});

export const workouts = pgTable(
  'workouts',
  {
    id: id(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    source: text('source').$type<WorkoutSource>().notNull(),
    garminActivityId: text('garmin_activity_id'),
    /** SHA-256 of the FIT file (hex). */
    fileHash: text('file_hash'),
    fitObjectKey: text('fit_object_key'),
    startedAt: timestamp('started_at', { withTimezone: true }).notNull(),
    utcOffsetSec: integer('utc_offset_sec'),
    /** `session.total_elapsed_time`. */
    durationSec: doublePrecision('duration_sec'),
    timerSec: doublePrecision('timer_sec'),
    activeSec: doublePrecision('active_sec'),
    calories: integer('calories'),
    avgHr: smallint('avg_hr'),
    maxHr: smallint('max_hr'),
    totalRepsGarmin: integer('total_reps_garmin'),
    deviceModel: text('device_model'),
    deviceSerial: text('device_serial'),
    bodyWeightKg: real('body_weight_kg'),
    hrZones: jsonb('hr_zones').$type<{
      calcType: string | null;
      highBoundaries: number[];
      secondsInZone: number[];
    }>(),
    title: text('title'),
    notes: text('notes'),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    unique('workouts_user_activity_uq').on(t.userId, t.garminActivityId),
    unique('workouts_user_file_hash_uq').on(t.userId, t.fileHash),
    index('workouts_user_started_idx').on(t.userId, t.startedAt.desc(), t.id.desc()),
  ],
);

/** Heart rate of a workout as parallel arrays; offsets are seconds from `workouts.started_at`. */
export const workoutHr = pgTable('workout_hr', {
  workoutId: uuid('workout_id')
    .primaryKey()
    .references(() => workouts.id, { onDelete: 'cascade' }),
  offsetsSec: integer('offsets_sec').array().notNull(),
  bpm: smallint('bpm').array().notNull(),
});

/** Immutable Garmin layer: rewritten only by re-parsing the FIT file. */
export const garminSets = pgTable(
  'garmin_sets',
  {
    id: id(),
    workoutId: uuid('workout_id')
      .notNull()
      .references(() => workouts.id, { onDelete: 'cascade' }),
    /** 1-based position among active sets. */
    setIndex: integer('set_index').notNull(),
    messageIndex: integer('message_index'),
    startedAt: timestamp('started_at', { withTimezone: true }).notNull(),
    durationSec: doublePrecision('duration_sec'),
    restAfterSec: doublePrecision('rest_after_sec'),
    repsGarmin: integer('reps_garmin'),
    weightGarminKg: real('weight_garmin_kg'),
    /** Watch guesses in priority order; suggestions only. */
    garminHints: jsonb('garmin_hints').$type<GarminHint[]>().notNull().default([]),
    avgHr: smallint('avg_hr'),
    maxHr: smallint('max_hr'),
    minHr: smallint('min_hr'),
    hrPeak: smallint('hr_peak'),
    caloriesEst: real('calories_est'),
    suspicious: text('suspicious').$type<'too_short'>(),
  },
  (t) => [unique('garmin_sets_workout_index_uq').on(t.workoutId, t.setIndex)],
);

export const exercises = pgTable(
  'exercises',
  {
    id: id(),
    /** Built-in exercises only; seeds upsert by it. */
    slug: text('slug').unique(),
    nameRu: text('name_ru').notNull(),
    nameEn: text('name_en'),
    equipment: text('equipment').notNull(),
    mechanics: text('mechanics').notNull(),
    isBodyweight: boolean('is_bodyweight').notNull().default(false),
    isCustom: boolean('is_custom').notNull().default(false),
    userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }),
    garminCategory: text('garmin_category'),
    /** FIT `<category>ExerciseName` value, e.g. `barbellBenchPress`. */
    garminSubcategory: text('garmin_subcategory'),
    /** Soft delete of a custom exercise: annotated sets keep pointing at it. */
    archivedAt: timestamp('archived_at', { withTimezone: true }),
    createdAt: createdAt(),
  },
  (t) => [index('exercises_user_idx').on(t.userId)],
);

export const muscleGroups = pgTable('muscle_groups', {
  id: integer('id').primaryKey().generatedAlwaysAsIdentity(),
  slug: text('slug').notNull().unique(),
  nameRu: text('name_ru').notNull(),
  region: text('region').$type<'front' | 'back'>().notNull(),
  svgPathId: text('svg_path_id').notNull(),
});

export const exerciseMuscles = pgTable(
  'exercise_muscles',
  {
    exerciseId: uuid('exercise_id')
      .notNull()
      .references(() => exercises.id, { onDelete: 'cascade' }),
    muscleGroupId: integer('muscle_group_id')
      .notNull()
      .references(() => muscleGroups.id, { onDelete: 'cascade' }),
    role: text('role').$type<'primary' | 'secondary'>().notNull(),
    coefficient: real('coefficient').notNull(),
  },
  (t) => [primaryKey({ columns: [t.exerciseId, t.muscleGroupId] })],
);

/** User layer over `garmin_sets`. */
export const setAnnotations = pgTable('set_annotations', {
  id: id(),
  garminSetId: uuid('garmin_set_id')
    .notNull()
    .unique()
    .references(() => garminSets.id, { onDelete: 'cascade' }),
  exerciseId: uuid('exercise_id').references(() => exercises.id, { onDelete: 'set null' }),
  weightKg: real('weight_kg'),
  reps: integer('reps'),
  rpe: real('rpe'),
  isWarmup: boolean('is_warmup').notNull().default(false),
  isFailure: boolean('is_failure').notNull().default(false),
  isExcluded: boolean('is_excluded').notNull().default(false),
  note: text('note'),
  updatedAt: updatedAt(),
});

/** Sets the watch missed, added by the user. */
export const manualSets = pgTable(
  'manual_sets',
  {
    id: id(),
    workoutId: uuid('workout_id')
      .notNull()
      .references(() => workouts.id, { onDelete: 'cascade' }),
    orderIndex: integer('order_index').notNull(),
    exerciseId: uuid('exercise_id').references(() => exercises.id, { onDelete: 'set null' }),
    weightKg: real('weight_kg'),
    reps: integer('reps'),
    rpe: real('rpe'),
    isWarmup: boolean('is_warmup').notNull().default(false),
    isFailure: boolean('is_failure').notNull().default(false),
    note: text('note'),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index('manual_sets_workout_idx').on(t.workoutId)],
);

/**
 * The only place where `annotation ?? garmin` is resolved. Garmin sets with their annotation,
 * plus manual sets. The exercise is never taken from Garmin hints.
 */
export const effectiveSets = pgView('effective_sets', {
  setId: uuid('set_id').notNull(),
  kind: text('kind').$type<'garmin' | 'manual'>().notNull(),
  workoutId: uuid('workout_id').notNull(),
  orderIndex: integer('order_index').notNull(),
  startedAt: timestamp('started_at', { withTimezone: true }),
  durationSec: doublePrecision('duration_sec'),
  exerciseId: uuid('exercise_id'),
  weightKg: real('weight_kg'),
  reps: integer('reps'),
  repsSource: text('reps_source').$type<'user' | 'garmin'>(),
  rpe: real('rpe'),
  isWarmup: boolean('is_warmup').notNull(),
  isFailure: boolean('is_failure').notNull(),
  isExcluded: boolean('is_excluded').notNull(),
  note: text('note'),
  avgHr: smallint('avg_hr'),
  hrPeak: smallint('hr_peak'),
}).as(sql`
  SELECT
    gs.id AS set_id,
    'garmin' AS kind,
    gs.workout_id,
    gs.set_index AS order_index,
    gs.started_at,
    gs.duration_sec,
    a.exercise_id,
    COALESCE(a.weight_kg, gs.weight_garmin_kg) AS weight_kg,
    COALESCE(a.reps, gs.reps_garmin) AS reps,
    CASE
      WHEN a.reps IS NOT NULL THEN 'user'
      WHEN gs.reps_garmin IS NOT NULL THEN 'garmin'
    END AS reps_source,
    a.rpe,
    COALESCE(a.is_warmup, false) AS is_warmup,
    COALESCE(a.is_failure, false) AS is_failure,
    COALESCE(a.is_excluded, false) AS is_excluded,
    a.note,
    gs.avg_hr,
    gs.hr_peak
  FROM garmin_sets gs
  LEFT JOIN set_annotations a ON a.garmin_set_id = gs.id
  UNION ALL
  SELECT
    ms.id,
    'manual',
    ms.workout_id,
    ms.order_index,
    NULL,
    NULL,
    ms.exercise_id,
    ms.weight_kg,
    ms.reps,
    CASE WHEN ms.reps IS NOT NULL THEN 'user' END,
    ms.rpe,
    ms.is_warmup,
    ms.is_failure,
    false,
    ms.note,
    NULL,
    NULL
  FROM manual_sets ms
`);
