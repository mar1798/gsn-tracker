import { describe, expect, it } from 'vitest';
import { humanize, toExerciseHints } from './hints.js';

describe('toExerciseHints', () => {
  it('drops unknown and keeps the watch order', () => {
    expect(toExerciseHints(['unknown', 'curl', 'benchPress'], null).map((h) => h.category)).toEqual(
      ['curl', 'benchPress'],
    );
  });

  it('resolves subtypes through the FIT profile', () => {
    expect(toExerciseHints(['deadlift', 'unknown', 'curl'], [0, null, null])).toEqual([
      {
        category: 'deadlift',
        subtype: 0,
        exerciseName: 'barbellDeadlift',
        label: 'Barbell deadlift',
      },
      { category: 'curl', subtype: null, exerciseName: null, label: 'Curl' },
    ]);
  });

  it('keeps the same category with different subtypes, drops exact duplicates', () => {
    const hints = toExerciseHints(['lateralRaise', 'lateralRaise', 'lateralRaise'], [null, 25, 25]);
    expect(hints.map((h) => h.subtype)).toEqual([null, 25]);
  });

  it('handles a subtype array shorter than the category array', () => {
    expect(toExerciseHints(['row', 'curl'], [null])).toHaveLength(2);
  });

  it('maps numeric categories via the profile, keeps unknown numbers as strings', () => {
    expect(toExerciseHints([28, 65534, 999], null).map((h) => h.category)).toEqual([
      'squat',
      '999',
    ]);
  });

  it('leaves the name null for a subtype missing from the profile', () => {
    expect(toExerciseHints(['row'], [60000])[0]).toMatchObject({
      exerciseName: null,
      label: 'Row',
    });
  });

  it('returns no hints for missing or empty input', () => {
    expect(toExerciseHints(undefined, undefined)).toEqual([]);
    expect(toExerciseHints([null, undefined, 'unknown'], [])).toEqual([]);
  });
});

describe('humanize', () => {
  it('splits camelCase and numbers', () => {
    expect(humanize('seatedRearLateralRaise')).toBe('Seated rear lateral raise');
    expect(humanize('benchPress')).toBe('Bench press');
    expect(humanize('pushUp90Degree')).toBe('Push up 90 degree');
  });
});
