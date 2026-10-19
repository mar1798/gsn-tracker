import type { GarminMapping } from './exercises.js';

/** The part of a parsed Garmin hint that suggestions need. */
export interface HintLike {
  category: string;
  exerciseName: string | null;
}

export const MAX_SUGGESTIONS = 5;

/**
 * Exercises matching the watch's guesses, best first: exact `category + exerciseName`
 * matches in hint order, then whole-category matches. Suggestions only, never auto-applied.
 */
export function suggestExercises<T extends { garmin: GarminMapping | null }>(
  hints: readonly HintLike[],
  exercises: readonly T[],
  limit = MAX_SUGGESTIONS,
): T[] {
  const result = new Set<T>();

  for (const hint of hints) {
    if (hint.exerciseName === null) continue;
    for (const exercise of exercises) {
      if (
        exercise.garmin?.category === hint.category &&
        exercise.garmin.exerciseName === hint.exerciseName
      ) {
        result.add(exercise);
      }
    }
  }
  for (const hint of hints) {
    for (const exercise of exercises) {
      if (exercise.garmin?.category === hint.category) result.add(exercise);
    }
  }

  return [...result].slice(0, limit);
}
