import type { WorkoutDetail, WorkoutHrResponse } from '../api/workouts.js';
import { workoutRecoveries } from './hr.js';
import type { AnalyticsSet } from './sets.js';
import type { AnalyticsWorkout } from './workouts.js';

/**
 * A workout as the client sees it (pending edits applied) → analytics input, so its summary
 * matches the server's formulas and works offline. Mirrors the `effective_sets` view.
 */
export function analyticsWorkoutFromDetail(
  detail: WorkoutDetail,
  hr: WorkoutHrResponse | null,
  /** Settings override; else `user_profile.weight` from the FIT file. */
  bodyWeightKg: number | null,
): AnalyticsWorkout {
  const garmin = detail.sets.map((s): AnalyticsSet => ({
    exerciseId: s.effective.exerciseId,
    weightKg: s.effective.weightKg,
    reps: s.effective.reps,
    repsSource: s.effective.repsSource,
    isWarmup: s.effective.isWarmup,
    isExcluded: s.effective.isExcluded,
    avgHr: s.hr.avg,
    hrPeak: s.hr.peak,
  }));
  const manual = detail.manualSets.map((s): AnalyticsSet => ({
    exerciseId: s.exerciseId,
    weightKg: s.weightKg,
    reps: s.reps,
    repsSource: s.reps === null ? null : 'user',
    isWarmup: s.isWarmup,
    isExcluded: false,
    avgHr: null,
    hrPeak: null,
  }));

  return {
    id: detail.id,
    startedAt: detail.startedAt,
    utcOffsetSec: detail.utcOffsetSec,
    activeSec: detail.activeSec,
    timerSec: detail.timerSec,
    bodyWeightKg: bodyWeightKg ?? detail.bodyWeightKg,
    hrZonesSec: detail.hrZones?.secondsInZone ?? null,
    sets: [...garmin, ...manual],
    hrRecoveriesBpm: hr
      ? workoutRecoveries(
          hr,
          detail.startedAt,
          detail.sets.map((s) => ({ ...s, ...s.effective })),
        )
      : [],
  };
}
