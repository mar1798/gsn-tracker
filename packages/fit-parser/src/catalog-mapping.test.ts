import { Profile } from '@garmin/fitsdk';
import { EXERCISES } from '@gsc/shared';
import { describe, expect, it } from 'vitest';

// The catalog lives in @gsc/shared (no FIT SDK there); this checks its Garmin names are real.
describe('catalog Garmin mapping', () => {
  const categories = new Set<string>(Object.values(Profile.types.exerciseCategory ?? {}));

  it.each(EXERCISES.filter((e) => e.garmin).map((e) => [e.slug, e.garmin!] as const))(
    '%s maps to a FIT profile exercise',
    (_slug, garmin) => {
      expect(categories.has(garmin.category)).toBe(true);
      if (garmin.exerciseName !== null) {
        const names = Object.values(Profile.types[`${garmin.category}ExerciseName`] ?? {});
        expect(names).toContain(garmin.exerciseName);
      }
    },
  );
});
