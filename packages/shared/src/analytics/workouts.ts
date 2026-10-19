import { density, sumZones } from './hr.js';
import { localDate, type IsoDate } from './periods.js';
import {
  epley1rm,
  isCountedSet,
  isHrSet,
  weightedSet,
  type AnalyticsExercise,
  type AnalyticsSet,
} from './sets.js';

export interface AnalyticsWorkout {
  id: string;
  startedAt: string;
  utcOffsetSec: number | null;
  activeSec: number | null;
  timerSec: number | null;
  /** Settings override, else `user_profile.weight` from the FIT file. */
  bodyWeightKg: number | null;
  /** Garmin `time_in_zone` seconds (zone 0 = below zone 1). */
  hrZonesSec: readonly number[] | null;
  sets: readonly AnalyticsSet[];
  /** `hrRecovery` of the sets where it could be measured. */
  hrRecoveriesBpm: readonly number[];
}

export interface WorkoutTotals {
  workouts: number;
  workingSets: number;
  /** Σ reps × load of weighted sets, kg. */
  volumeKg: number;
  /** Mean density of the workouts. */
  density: number | null;
  /** Mean `avgHr` of working sets (sets without an exercise included). */
  avgWorkingHr: number | null;
  /** Mean set peak HR (`hr_peak`, +30 s after the set). */
  avgPeakHr: number | null;
  avgRecoveryBpm: number | null;
  /** Summed Garmin time in zones. */
  hrZonesSec: number[];
}

const mean = (values: readonly (number | null)[]) => {
  const known = values.filter((v): v is number => v !== null);
  return known.length === 0 ? null : known.reduce((a, b) => a + b, 0) / known.length;
};

export function workoutVolumeKg(
  workout: Pick<AnalyticsWorkout, 'sets' | 'bodyWeightKg'>,
  exercises: ReadonlyMap<string, AnalyticsExercise>,
) {
  let volume = 0;
  for (const set of workout.sets) {
    const w = weightedSet(set, exercises.get(set.exerciseId ?? ''), workout.bodyWeightKg);
    if (w) volume += w.loadKg * w.reps;
  }
  return volume;
}

/** Totals of one workout or a whole period. */
export function workoutTotals(
  workouts: readonly AnalyticsWorkout[],
  exercises: ReadonlyMap<string, AnalyticsExercise>,
): WorkoutTotals {
  const hrSets = workouts.flatMap((w) => w.sets.filter(isHrSet));
  return {
    workouts: workouts.length,
    workingSets: workouts.reduce((n, w) => n + w.sets.filter(isCountedSet).length, 0),
    volumeKg: workouts.reduce((v, w) => v + workoutVolumeKg(w, exercises), 0),
    density: mean(workouts.map((w) => density(w.activeSec, w.timerSec))),
    avgWorkingHr: mean(hrSets.map((s) => s.avgHr)),
    avgPeakHr: mean(hrSets.map((s) => s.hrPeak)),
    avgRecoveryBpm: mean(workouts.flatMap((w) => w.hrRecoveriesBpm)),
    hrZonesSec: sumZones(workouts.map((w) => w.hrZonesSec)),
  };
}

/** One exercise in one workout. Weight values are null without weighted sets. */
export interface ExerciseSession {
  workoutId: string;
  date: IsoDate;
  workingSets: number;
  /** Heaviest set (load incl. body weight) and its reps. */
  maxWeightKg: number | null;
  maxWeightReps: number | null;
  bestE1rmKg: number | null;
  maxSetVolumeKg: number | null;
  volumeKg: number;
}

/** Per-exercise results of a workout, for progress charts and records. */
export function exerciseSessions(
  workout: AnalyticsWorkout,
  exercises: ReadonlyMap<string, AnalyticsExercise>,
): Map<string, ExerciseSession> {
  const sessions = new Map<string, ExerciseSession>();
  const date = localDate(workout.startedAt, workout.utcOffsetSec);
  for (const set of workout.sets) {
    if (!isCountedSet(set)) continue;
    const id = set.exerciseId!;
    const s = sessions.get(id) ?? {
      workoutId: workout.id,
      date,
      workingSets: 0,
      maxWeightKg: null,
      maxWeightReps: null,
      bestE1rmKg: null,
      maxSetVolumeKg: null,
      volumeKg: 0,
    };
    s.workingSets += 1;
    const w = weightedSet(set, exercises.get(id), workout.bodyWeightKg);
    if (w) {
      const volume = w.loadKg * w.reps;
      if (s.maxWeightKg === null || w.loadKg > s.maxWeightKg) {
        s.maxWeightKg = w.loadKg;
        s.maxWeightReps = w.reps;
      }
      const e1rm = epley1rm(w.loadKg, w.reps);
      if (e1rm !== null && (s.bestE1rmKg === null || e1rm > s.bestE1rmKg)) s.bestE1rmKg = e1rm;
      if (s.maxSetVolumeKg === null || volume > s.maxSetVolumeKg) s.maxSetVolumeKg = volume;
      s.volumeKg += volume;
    }
    sessions.set(id, s);
  }
  return sessions;
}
