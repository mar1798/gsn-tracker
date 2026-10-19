import { describe, expect, it } from 'vitest';
import { exerciseRecords, newRecords } from './records.js';
import { BARBELL, EXERCISES, set, workout } from './test-data.js';
import { exerciseSessions } from './workouts.js';

const session = (id: string, date: string, sets: Parameters<typeof set>[0][]) =>
  exerciseSessions(workout(id, `${date}T08:00:00Z`, sets.map(set)), EXERCISES).get(BARBELL.id)!;

const first = session('w1', '2026-10-01', [
  { weightKg: 80, reps: 5 },
  { weightKg: 60, reps: 12 },
]);
const second = session('w2', '2026-10-08', [{ weightKg: 80, reps: 8 }]);
const third = session('w3', '2026-10-15', [{ weightKg: 85, reps: 2 }]);

describe('exerciseRecords', () => {
  it('keeps the best value per kind, earlier record on a tie', () => {
    const records = exerciseRecords([
      [BARBELL.id, first],
      [BARBELL.id, second],
      [BARBELL.id, third],
    ]).get(BARBELL.id)!;
    expect(records.maxWeight).toEqual({
      valueKg: 85,
      reps: 2,
      workoutId: 'w3',
      date: '2026-10-15',
    });
    // 80 × (1 + 8/30) = 101.33 beats 80 × (1 + 5/30) = 93.33 and 85 × (1 + 2/30) = 90.67.
    expect(records.maxE1rm).toMatchObject({ workoutId: 'w2' });
    expect(records.maxE1rm!.valueKg).toBeCloseTo(101.33, 2);
    expect(records.maxSetVolume).toMatchObject({ valueKg: 720, workoutId: 'w1' });
    expect(records.maxWorkoutVolume).toMatchObject({ valueKg: 1120, workoutId: 'w1' });
  });
});

describe('newRecords', () => {
  it('lists what a workout beat compared with the bests before it', () => {
    const before = exerciseRecords([[BARBELL.id, first]]);
    expect(newRecords(new Map([[BARBELL.id, second]]), before)).toEqual([
      {
        exerciseId: BARBELL.id,
        kind: 'maxE1rm',
        valueKg: second.bestE1rmKg,
        previousKg: first.bestE1rmKg,
      },
    ]);
  });

  it('does not call the first time an exercise is done a record', () => {
    expect(newRecords(new Map([[BARBELL.id, first]]), new Map())).toEqual([]);
  });

  it('does not count an equal value', () => {
    const before = exerciseRecords([[BARBELL.id, first]]);
    expect(newRecords(new Map([[BARBELL.id, first]]), before)).toEqual([]);
  });
});
