import { Profile } from '@garmin/fitsdk';
import type { GarminExerciseHint } from './types.js';

const UNKNOWN_CATEGORY = 'unknown';

/**
 * Turns the parallel `category` / `category_subtype` arrays of a set message into hints.
 * Drops `unknown` and exact duplicates; keeps the watch's order (= priority).
 */
export function toExerciseHints(
  categories: readonly (string | number | null | undefined)[] | null | undefined,
  subtypes: readonly (number | null | undefined)[] | null | undefined,
): GarminExerciseHint[] {
  const hints: GarminExerciseHint[] = [];
  const seen = new Set<string>();

  (categories ?? []).forEach((raw, i) => {
    const category = categoryName(raw);
    if (category === null || category === UNKNOWN_CATEGORY) return;

    const subtype = subtypes?.[i] ?? null;
    const key = `${category}/${subtype}`;
    if (seen.has(key)) return;
    seen.add(key);

    const exerciseName = subtype === null ? null : exerciseNameOf(category, subtype);
    hints.push({ category, subtype, exerciseName, label: humanize(exerciseName ?? category) });
  });

  return hints;
}

/** The SDK returns the profile name as a string, or the raw number when it is not in the profile. */
function categoryName(raw: string | number | null | undefined): string | null {
  if (raw === null || raw === undefined) return null;
  if (typeof raw === 'string') return raw;
  return Profile.types.exerciseCategory?.[raw] ?? String(raw);
}

function exerciseNameOf(category: string, subtype: number): string | null {
  return Profile.types[`${category}ExerciseName`]?.[subtype] ?? null;
}

/** `seatedRearLateralRaise` → `Seated rear lateral raise`. */
export function humanize(name: string): string {
  const words = name
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/([a-zA-Z])(\d)/g, '$1 $2')
    .toLowerCase();
  return words.charAt(0).toUpperCase() + words.slice(1);
}
