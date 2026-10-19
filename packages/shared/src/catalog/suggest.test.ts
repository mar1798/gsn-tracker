import { describe, expect, it } from 'vitest';
import { EXERCISES } from './exercises.js';
import { suggestExercises } from './suggest.js';

const slugs = (hints: Parameters<typeof suggestExercises>[0], limit?: number) =>
  suggestExercises(hints, EXERCISES, limit).map((e) => e.slug);

describe('suggestExercises', () => {
  it('puts the exact exercise first, then the rest of its category', () => {
    const result = slugs([{ category: 'lateralRaise', exerciseName: 'seatedRearLateralRaise' }]);
    expect(result[0]).toBe('seated_rear_delt_raise');
    expect(result).toContain('dumbbell_lateral_raise');
  });

  it('ranks exact matches of every hint before category-only matches', () => {
    const result = slugs([
      { category: 'curl', exerciseName: null },
      { category: 'benchPress', exerciseName: 'barbellBenchPress' },
    ]);
    expect(result[0]).toBe('barbell_bench_press');
    expect(result[1]).toBe('barbell_curl');
  });

  it('keeps hint order for category-only matches and respects the limit', () => {
    const result = slugs(
      [
        { category: 'row', exerciseName: null },
        { category: 'curl', exerciseName: null },
      ],
      3,
    );
    expect(result).toEqual(['barbell_row', 'dumbbell_row', 'seated_cable_row']);
  });

  it('returns nothing for unknown categories or no hints', () => {
    expect(slugs([])).toEqual([]);
    expect(slugs([{ category: 'tire', exerciseName: null }])).toEqual([]);
  });

  it('does not duplicate an exercise matched by several hints', () => {
    const result = slugs([
      { category: 'legCurl', exerciseName: 'legCurl' },
      { category: 'legCurl', exerciseName: null },
    ]);
    expect(result.filter((s) => s === 'lying_leg_curl')).toHaveLength(1);
  });
});
