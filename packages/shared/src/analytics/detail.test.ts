import { describe, expect, it } from 'vitest';
import type { WorkoutDetail } from '../api/workouts.js';
import { analyticsWorkoutFromDetail } from './detail.js';

const set = (n: number, effective: Partial<WorkoutDetail['sets'][number]['effective']> = {}) => ({
  id: `00000000-0000-4000-8000-00000000010${n}`,
  setIndex: n,
  startedAt: new Date(Date.parse('2026-10-17T02:00:00Z') + (n - 1) * 150_000).toISOString(),
  durationSec: 40,
  restAfterSec: 110,
  suspicious: null,
  garmin: { reps: 10, weightKg: null, hints: [], suggestedExerciseIds: [] },
  hr: { avg: 120, max: 140, min: 100, peak: 150 },
  caloriesEst: 5,
  annotation: null,
  effective: {
    exerciseId: 'bench',
    weightKg: 60,
    reps: 10,
    repsSource: 'user' as const,
    rpe: null,
    isWarmup: false,
    isFailure: false,
    isExcluded: false,
    note: null,
    ...effective,
  },
});

const detail = {
  id: 'w',
  startedAt: '2026-10-17T02:00:00.000Z',
  utcOffsetSec: 21600,
  activeSec: 1135,
  timerSec: 4296,
  bodyWeightKg: 78,
  hrZones: { calcType: null, highBoundaries: [], secondsInZone: [0, 60] },
  sets: [set(1), set(2, { isWarmup: true })],
  manualSets: [
    {
      id: 'm',
      orderIndex: 3,
      exerciseId: 'bench',
      weightKg: 70,
      reps: 8,
      rpe: null,
      isWarmup: false,
      isFailure: false,
      note: null,
    },
  ],
} as unknown as WorkoutDetail;

// Set 1 (0–40 s): peak 160 at 50 s, 120 at 110 s.
const hr = {
  startedAt: detail.startedAt,
  offsetsSec: [0, 40, 50, 100, 110, 140, 150],
  bpm: [100, 150, 160, 125, 120, 150, 165],
};

describe('analyticsWorkoutFromDetail', () => {
  it('takes effective values, manual sets and HR recovery of working sets', () => {
    const w = analyticsWorkoutFromDetail(detail, hr, null);
    expect(w.sets).toHaveLength(3);
    expect(w.sets[2]).toMatchObject({ weightKg: 70, reps: 8, repsSource: 'user', avgHr: null });
    expect(w.bodyWeightKg).toBe(78);
    expect(w.hrZonesSec).toEqual([0, 60]);
    // The warm-up set 2 is skipped.
    expect(w.hrRecoveriesBpm).toEqual([40]);
  });

  it('prefers the body weight from settings and works without HR', () => {
    const w = analyticsWorkoutFromDetail(detail, null, 82);
    expect(w.bodyWeightKg).toBe(82);
    expect(w.hrRecoveriesBpm).toEqual([]);
  });
});
