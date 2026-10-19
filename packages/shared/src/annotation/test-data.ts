// Test-only factories (not exported from the package).
import type { WorkoutDetail, WorkoutSet } from '../api/workouts.js';

export const uuid = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;

export const WORKOUT_ID = uuid(900);

export function garminSet(n: number, overrides: Partial<WorkoutSet> = {}): WorkoutSet {
  return {
    id: uuid(n),
    setIndex: n,
    startedAt: new Date(Date.UTC(2026, 9, 17, 12, n)).toISOString(),
    durationSec: 40,
    restAfterSec: 90,
    suspicious: null,
    garmin: { reps: 10, weightKg: null, hints: [], suggestedExerciseIds: [] },
    hr: { avg: 120, max: 140, min: 100, peak: 150 },
    caloriesEst: 5,
    annotation: null,
    effective: {
      exerciseId: null,
      weightKg: null,
      reps: 10,
      repsSource: 'garmin',
      rpe: null,
      isWarmup: false,
      isFailure: false,
      isExcluded: false,
      note: null,
    },
    ...overrides,
  };
}

export function workoutDetail(sets: WorkoutSet[], overrides: Partial<WorkoutDetail> = {}) {
  const detail: WorkoutDetail = {
    id: WORKOUT_ID,
    source: 'manual_fit',
    startedAt: '2026-10-17T12:00:00.000Z',
    utcOffsetSec: 21600,
    durationSec: 4296,
    activeSec: 1135,
    calories: 802,
    avgHr: 118,
    maxHr: 169,
    deviceModel: 'Epix Pro Gen 2',
    title: null,
    setCount: sets.length,
    annotatedSetCount: 0,
    notes: null,
    timerSec: 4296,
    totalRepsGarmin: 326,
    bodyWeightKg: 78,
    hrZones: null,
    sets,
    manualSets: [],
    ...overrides,
  };
  return detail;
}
