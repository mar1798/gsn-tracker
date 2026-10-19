import type { AnalyticsExercise, AnalyticsSet } from './sets.js';
import type { AnalyticsWorkout } from './workouts.js';

export const BARBELL: AnalyticsExercise = {
  id: 'bench',
  isBodyweight: false,
  muscles: [
    { muscle: 'chest', role: 'primary', coefficient: 1 },
    { muscle: 'triceps', role: 'secondary', coefficient: 0.5 },
  ],
};

export const PULL_UP: AnalyticsExercise = {
  id: 'pull_up',
  isBodyweight: true,
  muscles: [
    { muscle: 'lats', role: 'primary', coefficient: 1 },
    { muscle: 'biceps', role: 'secondary', coefficient: 0.5 },
  ],
};

export const EXERCISES = new Map([BARBELL, PULL_UP].map((e) => [e.id, e]));

/** A confirmed bench set: 60 kg × 10. */
export function set(overrides: Partial<AnalyticsSet> = {}): AnalyticsSet {
  return {
    exerciseId: BARBELL.id,
    weightKg: 60,
    reps: 10,
    repsSource: 'user',
    isWarmup: false,
    isExcluded: false,
    avgHr: 120,
    hrPeak: 150,
    ...overrides,
  };
}

export function workout(
  id: string,
  startedAt: string,
  sets: AnalyticsSet[],
  overrides: Partial<AnalyticsWorkout> = {},
): AnalyticsWorkout {
  return {
    id,
    startedAt,
    utcOffsetSec: 21600,
    activeSec: 1000,
    timerSec: 4000,
    bodyWeightKg: 78,
    hrZonesSec: null,
    sets,
    hrRecoveriesBpm: [],
    ...overrides,
  };
}
