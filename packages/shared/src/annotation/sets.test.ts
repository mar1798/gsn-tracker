import { describe, expect, it } from 'vitest';
import {
  exerciseShortcuts,
  nextSetIds,
  previousExerciseIds,
  setIdsBetween,
  workingSetsAfter,
} from './sets.js';
import { garminSet, uuid } from './test-data.js';

const excluded = (n: number) =>
  garminSet(n, { effective: { ...garminSet(n).effective, isExcluded: true } });
const withExercise = (n: number, exerciseId: string | null) =>
  garminSet(n, { effective: { ...garminSet(n).effective, exerciseId } });

describe('setIdsBetween', () => {
  const sets = [1, 2, 3, 4, 5].map((n) => garminSet(n));

  it('returns the inclusive range in list order, whatever the tap order', () => {
    expect(setIdsBetween(sets, uuid(2), uuid(4))).toEqual([uuid(2), uuid(3), uuid(4)]);
    expect(setIdsBetween(sets, uuid(4), uuid(2))).toEqual([uuid(2), uuid(3), uuid(4)]);
    expect(setIdsBetween(sets, uuid(3), uuid(3))).toEqual([uuid(3)]);
  });

  it('returns nothing for unknown ids', () => {
    expect(setIdsBetween(sets, uuid(2), uuid(99))).toEqual([]);
  });
});

describe('nextSetIds', () => {
  const sets = [
    garminSet(1),
    garminSet(2, { suspicious: 'too_short' }),
    excluded(3),
    garminSet(4),
    garminSet(5),
  ];

  it('skips double presses and excluded sets', () => {
    expect(nextSetIds(sets, uuid(1), 2)).toEqual([uuid(4), uuid(5)]);
    expect(workingSetsAfter(sets, uuid(1))).toBe(2);
  });

  it('stops at the end of the workout', () => {
    expect(nextSetIds(sets, uuid(4), 10)).toEqual([uuid(5)]);
    expect(nextSetIds(sets, uuid(5), 3)).toEqual([]);
  });

  it('returns nothing for a zero count or an unknown set', () => {
    expect(nextSetIds(sets, uuid(1), 0)).toEqual([]);
    expect(nextSetIds(sets, uuid(99), 2)).toEqual([]);
  });
});

describe('previousExerciseIds', () => {
  const sets = [
    withExercise(1, 'a'),
    withExercise(2, null),
    withExercise(3, 'b'),
    withExercise(4, 'c'),
  ];

  it('lists exercises before the set, closest first', () => {
    expect(previousExerciseIds(sets, uuid(4))).toEqual(['b', 'a']);
  });

  it('uses the whole workout when there is no current set', () => {
    expect(previousExerciseIds(sets, null)).toEqual(['c', 'b', 'a']);
  });
});

describe('exerciseShortcuts', () => {
  it('orders Garmin, workout, recent and drops duplicates', () => {
    expect(
      exerciseShortcuts({ garmin: ['g1', 'w1'], workout: ['w1', 'w2'], recent: ['g1', 'r1'] }),
    ).toEqual([
      { exerciseId: 'g1', source: 'garmin' },
      { exerciseId: 'w1', source: 'garmin' },
      { exerciseId: 'w2', source: 'workout' },
      { exerciseId: 'r1', source: 'recent' },
    ]);
  });

  it('respects the limit', () => {
    const result = exerciseShortcuts({ garmin: ['a', 'b'], workout: ['c'], recent: ['d'] }, 3);
    expect(result.map((s) => s.exerciseId)).toEqual(['a', 'b', 'c']);
  });
});
