// Per-set formulas. Only values the user entered or confirmed go into weight analytics:
// Garmin reps are a template pre-fill (`repsSource: 'garmin'`), the watch knows no weight.

/** Effective set values (the `effective_sets` view / `WorkoutSet.effective`). */
export interface AnalyticsSet {
  exerciseId: string | null;
  /** Bodyweight exercises: added weight (belt, vest); null = none. */
  weightKg: number | null;
  reps: number | null;
  repsSource: 'user' | 'garmin' | null;
  isWarmup: boolean;
  isExcluded: boolean;
  avgHr: number | null;
  hrPeak: number | null;
}

export interface AnalyticsExercise {
  id: string;
  isBodyweight: boolean;
  muscles: readonly { muscle: string; role: 'primary' | 'secondary'; coefficient: number }[];
}

/** Share of body weight lifted in bodyweight exercises (one value for all of them for now). */
export const BODYWEIGHT_LOAD_SHARE = 1;

/** Epley is unreliable for higher reps, so e1RM is computed up to this many. */
export const E1RM_MAX_REPS = 12;

/** A set of the training: has an exercise, not a warm-up, not excluded. Counts as a set. */
export const isCountedSet = (s: AnalyticsSet) =>
  s.exerciseId !== null && !s.isWarmup && !s.isExcluded;

/** A set for HR metrics: any set the user did not drop (a set without an exercise counts too). */
export const isHrSet = (s: AnalyticsSet) => !s.isWarmup && !s.isExcluded;

/**
 * Weight lifted in a set, kg. Bodyweight exercises: body weight × share + added weight
 * (null without a known body weight). Other exercises: the entered weight; 0 = not entered.
 */
export function setLoadKg(
  set: Pick<AnalyticsSet, 'weightKg'>,
  exercise: Pick<AnalyticsExercise, 'isBodyweight'>,
  bodyWeightKg: number | null,
): number | null {
  if (exercise.isBodyweight) {
    return bodyWeightKg === null
      ? null
      : bodyWeightKg * BODYWEIGHT_LOAD_SHARE + (set.weightKg ?? 0);
  }
  return set.weightKg !== null && set.weightKg > 0 ? set.weightKg : null;
}

/** Load and reps of a set that may enter volume, e1RM and records; null otherwise. */
export function weightedSet(
  set: AnalyticsSet,
  exercise: AnalyticsExercise | undefined,
  bodyWeightKg: number | null,
): { loadKg: number; reps: number } | null {
  if (!exercise || !isCountedSet(set)) return null;
  if (set.repsSource !== 'user' || set.reps === null || set.reps <= 0) return null;
  const loadKg = setLoadKg(set, exercise, bodyWeightKg);
  return loadKg === null ? null : { loadKg, reps: set.reps };
}

/** Epley: `w × (1 + reps / 30)`, only for 1..12 reps. */
export function epley1rm(weightKg: number, reps: number): number | null {
  if (reps < 1 || reps > E1RM_MAX_REPS || weightKg <= 0) return null;
  return weightKg * (1 + reps / 30);
}
