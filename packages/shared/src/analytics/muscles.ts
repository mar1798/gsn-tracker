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
