import { isCountedSet, weightedSet, type AnalyticsExercise, type AnalyticsSet } from './sets.js';

export interface MuscleLoad {
  /** Working sets: primary muscle 1, secondary its coefficient. */
  sets: number;
  /** Σ(reps × load × coefficient), kg. */
  volumeKg: number;
}

/**
 * Sets and volume per muscle group. Every counted set adds to the set count; only weighted
 * sets (confirmed reps and a known load) add volume.
 */
export function muscleLoads(
  sets: readonly AnalyticsSet[],
  exercises: ReadonlyMap<string, AnalyticsExercise>,
  bodyWeightKg: number | null,
  into: Map<string, MuscleLoad> = new Map(),
): Map<string, MuscleLoad> {
  for (const set of sets) {
    if (!isCountedSet(set)) continue;
    const exercise = exercises.get(set.exerciseId!);
    if (!exercise) continue;
    const weighted = weightedSet(set, exercise, bodyWeightKg);
    const volume = weighted ? weighted.loadKg * weighted.reps : 0;
    for (const { muscle, coefficient } of exercise.muscles) {
      const load = into.get(muscle) ?? { sets: 0, volumeKg: 0 };
      load.sets += coefficient;
      load.volumeKg += volume * coefficient;
      into.set(muscle, load);
    }
  }
  return into;
}

/** Weekly working sets that light a muscle up fully on the heat map (a common hypertrophy target). */
export const WEEKLY_SETS_TARGET = 10;

/** Heat map intensity 0..1: sets per week relative to the target. */
export function muscleIntensity(sets: number, periodDays: number): number {
  if (sets <= 0 || periodDays <= 0) return 0;
  return Math.min(1, (sets * 7) / periodDays / WEEKLY_SETS_TARGET);
}

/** Working sets for a muscle in one workout that light it up fully on the summary map. */
export const SESSION_SETS_TARGET = 6;

/** Heat map intensity 0..1 of a single workout. */
export const sessionMuscleIntensity = (sets: number) =>
  sets <= 0 ? 0 : Math.min(1, sets / SESSION_SETS_TARGET);
