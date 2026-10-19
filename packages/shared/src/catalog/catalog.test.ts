import { describe, expect, it } from 'vitest';
import { EXERCISES } from './exercises.js';
import { MUSCLE_GROUPS } from './muscles.js';

describe('exercise catalog', () => {
  it('has about a hundred exercises with unique slugs and names', () => {
    expect(EXERCISES.length).toBeGreaterThanOrEqual(95);
    expect(new Set(EXERCISES.map((e) => e.slug)).size).toBe(EXERCISES.length);
    expect(new Set(EXERCISES.map((e) => e.nameRu)).size).toBe(EXERCISES.length);
  });

  it('gives every exercise a primary muscle and valid coefficients', () => {
    const muscles = new Set<string>(MUSCLE_GROUPS.map((m) => m.slug));
    for (const exercise of EXERCISES) {
      expect(
        exercise.muscles.some((m) => m.role === 'primary'),
        exercise.slug,
      ).toBe(true);
      expect(new Set(exercise.muscles.map((m) => m.muscle)).size, exercise.slug).toBe(
        exercise.muscles.length,
      );
      for (const m of exercise.muscles) {
        expect(muscles.has(m.muscle), `${exercise.slug}: ${m.muscle}`).toBe(true);
        if (m.role === 'primary') expect(m.coefficient).toBe(1);
        else {
          expect(m.coefficient).toBeGreaterThanOrEqual(0.3);
          expect(m.coefficient).toBeLessThanOrEqual(0.5);
        }
      }
    }
  });

  it('uses every muscle group at least once as primary', () => {
    const primary = new Set(
      EXERCISES.flatMap((e) => e.muscles.filter((m) => m.role === 'primary').map((m) => m.muscle)),
    );
    for (const m of MUSCLE_GROUPS) expect(primary.has(m.slug), m.slug).toBe(true);
  });

  it('marks bodyweight exercises', () => {
    expect(EXERCISES.find((e) => e.slug === 'pull_up')?.isBodyweight).toBe(true);
    expect(EXERCISES.find((e) => e.slug === 'barbell_bench_press')?.isBodyweight).toBe(false);
  });
});
