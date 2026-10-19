import type { IsoDate } from './periods.js';
import type { ExerciseSession } from './workouts.js';

export const RECORD_KINDS = ['maxWeight', 'maxE1rm', 'maxSetVolume', 'maxWorkoutVolume'] as const;
export type RecordKind = (typeof RECORD_KINDS)[number];

export interface RecordValue {
  valueKg: number;
  /** Reps of the heaviest set (max weight only). */
  reps: number | null;
  workoutId: string;
  date: IsoDate;
}

export type ExerciseRecords = Record<RecordKind, RecordValue | null>;

export const EMPTY_RECORDS: ExerciseRecords = {
  maxWeight: null,
  maxE1rm: null,
  maxSetVolume: null,
  maxWorkoutVolume: null,
};

const valueOf = (s: ExerciseSession, kind: RecordKind): number | null => {
  switch (kind) {
    case 'maxWeight':
      return s.maxWeightKg;
    case 'maxE1rm':
      return s.bestE1rmKg;
    case 'maxSetVolume':
      return s.maxSetVolumeKg;
    case 'maxWorkoutVolume':
      return s.volumeKg > 0 ? s.volumeKg : null;
  }
};

/** Below this a difference is float noise, not a new record. */
const EPSILON = 1e-6;

/** Folds a session into the records; an equal value keeps the earlier record. */
export function addSessionToRecords(records: ExerciseRecords, s: ExerciseSession): ExerciseRecords {
  const next = { ...records };
  for (const kind of RECORD_KINDS) {
    const value = valueOf(s, kind);
    const best = records[kind];
    if (value !== null && (best === null || value > best.valueKg + EPSILON)) {
      next[kind] = {
        valueKg: value,
        reps: kind === 'maxWeight' ? s.maxWeightReps : null,
        workoutId: s.workoutId,
        date: s.date,
      };
    }
  }
  return next;
}

/** Best values per exercise over sessions given in chronological order. */
export function exerciseRecords(
  sessions: Iterable<[exerciseId: string, session: ExerciseSession]>,
): Map<string, ExerciseRecords> {
  const records = new Map<string, ExerciseRecords>();
  for (const [id, s] of sessions) {
    records.set(id, addSessionToRecords(records.get(id) ?? EMPTY_RECORDS, s));
  }
  return records;
}

export interface NewRecord {
  exerciseId: string;
  kind: RecordKind;
  valueKg: number;
  previousKg: number;
}

/**
 * Records a workout beat, compared with the bests before it. The first time an exercise is
 * done is not a record: there is nothing to beat yet.
 */
export function newRecords(
  sessions: ReadonlyMap<string, ExerciseSession>,
  before: ReadonlyMap<string, ExerciseRecords>,
): NewRecord[] {
  const result: NewRecord[] = [];
  for (const [exerciseId, s] of sessions) {
    const previous = before.get(exerciseId);
    if (!previous) continue;
    for (const kind of RECORD_KINDS) {
      const value = valueOf(s, kind);
      const best = previous[kind];
      if (value !== null && best !== null && value > best.valueKg + EPSILON) {
        result.push({ exerciseId, kind, valueKg: value, previousKg: best.valueKg });
      }
    }
  }
  return result;
}
