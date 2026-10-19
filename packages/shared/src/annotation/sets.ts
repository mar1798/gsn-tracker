import type { WorkoutSet } from '../api/workouts.js';

// Bulk annotation helpers: "отметить подходы 1–4" and "применить к следующим N".

/** Ids of the sets between two sets (inclusive, either order), in list order. */
export function setIdsBetween(sets: readonly { id: string }[], a: string, b: string): string[] {
  const i = sets.findIndex((s) => s.id === a);
  const j = sets.findIndex((s) => s.id === b);
  if (i === -1 || j === -1) return [];
  return sets.slice(Math.min(i, j), Math.max(i, j) + 1).map((s) => s.id);
}

/** A set worth carrying an exercise over to: not excluded and not a double button press. */
const isWorkingSet = (s: Pick<WorkoutSet, 'suspicious' | 'effective'>) =>
  s.suspicious === null && !s.effective.isExcluded;

/** The next `count` working sets after the given one. */
export function nextSetIds(
  sets: readonly Pick<WorkoutSet, 'id' | 'suspicious' | 'effective'>[],
  fromId: string,
  count: number,
): string[] {
  const start = sets.findIndex((s) => s.id === fromId);
  if (start === -1 || count <= 0) return [];
  return sets
    .slice(start + 1)
    .filter(isWorkingSet)
    .slice(0, count)
    .map((s) => s.id);
}

/** How many working sets follow the given one (the upper bound for "следующие N"). */
export const workingSetsAfter = (
  sets: readonly Pick<WorkoutSet, 'id' | 'suspicious' | 'effective'>[],
  fromId: string,
) => nextSetIds(sets, fromId, sets.length).length;

export type ShortcutSource = 'garmin' | 'workout' | 'recent';

export interface ExerciseShortcut {
  exerciseId: string;
  source: ShortcutSource;
}

export const MAX_SHORTCUTS = 8;

/**
 * Quick picks in the annotation sheet: Garmin suggestions first (they are about this very set),
 * then exercises of the previous sets of this workout (closest first: the next set is usually
 * the same exercise), then the user's recent ones. Each exercise appears once.
 */
export function exerciseShortcuts(
  {
    garmin,
    workout,
    recent,
  }: { garmin: readonly string[]; workout: readonly string[]; recent: readonly string[] },
  limit = MAX_SHORTCUTS,
): ExerciseShortcut[] {
  const seen = new Set<string>();
  const result: ExerciseShortcut[] = [];
  const add = (ids: readonly string[], source: ShortcutSource) => {
    for (const exerciseId of ids) {
      if (result.length >= limit) return;
      if (seen.has(exerciseId)) continue;
      seen.add(exerciseId);
      result.push({ exerciseId, source });
    }
  };
  add(garmin, 'garmin');
  add(workout, 'workout');
  add(recent, 'recent');
  return result;
}

/** Exercises of the sets before the given one, closest first (`null` = from the end). */
export function previousExerciseIds(
  sets: readonly Pick<WorkoutSet, 'id' | 'effective'>[],
  beforeId: string | null,
): string[] {
  const end = beforeId === null ? sets.length : sets.findIndex((s) => s.id === beforeId);
  return sets
    .slice(0, end === -1 ? sets.length : end)
    .map((s) => s.effective.exerciseId)
    .filter((id): id is string => id !== null)
    .reverse();
}
