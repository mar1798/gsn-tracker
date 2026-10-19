import type { Exercise, WorkoutDetail, WorkoutSet, WorkoutSummary } from '@gsc/shared';

export const uuid = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;

export const WORKOUT_ID = uuid(1);

export function workoutSummary(overrides: Partial<WorkoutSummary> = {}): WorkoutSummary {
  return {
    id: WORKOUT_ID,
    source: 'manual_fit',
    startedAt: '2026-10-17T12:05:00.000Z',
    utcOffsetSec: 21600,
    durationSec: 4296,
    activeSec: 1135,
    calories: 802,
    avgHr: 118,
    maxHr: 169,
    deviceModel: 'Epix Pro Gen 2',
    title: null,
    setCount: 21,
    annotatedSetCount: 8,
    ...overrides,
  };
}

/** Garmin set `n` (ids 101, 102, …), one per minute from the workout start. */
export function garminSet(n: number, overrides: Partial<WorkoutSet> = {}): WorkoutSet {
  return {
    id: uuid(100 + n),
    setIndex: n,
    startedAt: new Date(Date.parse('2026-10-17T12:05:00.000Z') + n * 60_000).toISOString(),
    durationSec: 40,
    restAfterSec: 20,
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

export function workoutDetail(
  sets: WorkoutSet[],
  overrides: Partial<WorkoutDetail> = {},
): WorkoutDetail {
  return {
    ...workoutSummary({ setCount: sets.length, annotatedSetCount: 0 }),
    notes: null,
    timerSec: 4296,
    totalRepsGarmin: 326,
    bodyWeightKg: 78,
    hrZones: null,
    sets,
    manualSets: [],
    ...overrides,
  };
}

export function exercise(n: number, nameRu: string, overrides: Partial<Exercise> = {}): Exercise {
  return {
    id: uuid(500 + n),
    slug: null,
    nameRu,
    nameEn: null,
    equipment: 'barbell',
    mechanics: 'compound',
    isBodyweight: false,
    isCustom: false,
    isArchived: false,
    garminCategory: null,
    garminExerciseName: null,
    muscles: [{ muscle: 'chest', role: 'primary', coefficient: 1 }],
    ...overrides,
  };
}

export const BENCH = exercise(1, 'Жим штанги лёжа');
export const ROW = exercise(2, 'Тяга штанги в наклоне', {
  muscles: [{ muscle: 'lats', role: 'primary', coefficient: 1 }],
});
export const CATALOG = [BENCH, ROW];
