import { describe, expect, it } from 'vitest';
import { BARBELL, EXERCISES, PULL_UP, set, workout } from './test-data.js';
import { exerciseSessions, workoutTotals } from './workouts.js';

describe('workoutTotals', () => {
  it('sums sets and volume and averages density and HR over workouts', () => {
    const a = workout(
      'a',
      '2026-10-17T12:00:00Z',
      [
        set(),
        set({ weightKg: 70, reps: 5, avgHr: 130, hrPeak: 160 }),
        set({ exerciseId: null, avgHr: 110, hrPeak: 140 }),
        set({ isWarmup: true, avgHr: 90, hrPeak: 100 }),
      ],
      { hrRecoveriesBpm: [30, 40], hrZonesSec: [0, 60, 120] },
    );
    const b = workout('b', '2026-10-19T12:00:00Z', [set({ repsSource: 'garmin' })], {
      activeSec: 2000,
      hrRecoveriesBpm: [20],
      hrZonesSec: [10, 10],
    });

    expect(workoutTotals([a, b], EXERCISES)).toEqual({
      workouts: 2,
      workingSets: 3,
      volumeKg: 600 + 350,
      density: (0.25 + 0.5) / 2,
      avgWorkingHr: (120 + 130 + 110 + 120) / 4,
      avgPeakHr: (150 + 160 + 140 + 150) / 4,
      avgRecoveryBpm: 30,
      hrZonesSec: [10, 70, 120],
    });
  });

  it('has empty averages without data', () => {
    expect(workoutTotals([], EXERCISES)).toMatchObject({
      workouts: 0,
      volumeKg: 0,
      density: null,
      avgWorkingHr: null,
      avgRecoveryBpm: null,
      hrZonesSec: [],
    });
  });
});

describe('exerciseSessions', () => {
  it('collects best values per exercise', () => {
    const w = workout('w', '2026-10-17T20:00:00Z', [
      set({ weightKg: 60, reps: 10 }),
      set({ weightKg: 80, reps: 3 }),
      set({ weightKg: 70, reps: 15 }),
      set({ repsSource: 'garmin', weightKg: 100 }),
      set({ exerciseId: PULL_UP.id, weightKg: 10, reps: 5 }),
    ]);
    const sessions = exerciseSessions(w, EXERCISES);
    const bench = sessions.get(BARBELL.id)!;
    expect(bench).toMatchObject({
      workoutId: 'w',
      // 20:00 UTC at UTC+6 is the next day on the watch.
      date: '2026-10-18',
      workingSets: 4,
      maxWeightKg: 80,
      maxWeightReps: 3,
      maxSetVolumeKg: 1050,
      volumeKg: 600 + 240 + 1050,
    });
    // 80 × (1 + 3/30) = 88 beats 60 × (1 + 10/30) = 80; 15 reps are beyond the Epley range.
    expect(bench.bestE1rmKg).toBeCloseTo(88, 6);
    expect(sessions.get(PULL_UP.id)).toMatchObject({ maxWeightKg: 88, volumeKg: 440 });
  });

  it('keeps sessions without weighted sets with null weights', () => {
    const sessions = exerciseSessions(
      workout('w', '2026-10-17T12:00:00Z', [set({ weightKg: null })]),
      EXERCISES,
    );
    expect(sessions.get(BARBELL.id)).toMatchObject({
      workingSets: 1,
      maxWeightKg: null,
      bestE1rmKg: null,
      volumeKg: 0,
    });
  });
});
