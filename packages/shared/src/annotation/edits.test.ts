import { describe, expect, it } from 'vitest';
import { annotationInputSchema } from '../api/workouts.js';
import {
  applyWorkoutEdits,
  effectiveValues,
  nextOrderIndex,
  workoutEditSchema,
  type WorkoutEdit,
} from './edits.js';
import { garminSet, uuid, WORKOUT_ID, workoutDetail } from './test-data.js';

const NOW = new Date('2026-10-19T10:00:00.000Z');
const BENCH = uuid(501);
const ROW = uuid(502);

const put = (setId: string, input: object): WorkoutEdit => ({
  kind: 'annotation.put',
  workoutId: WORKOUT_ID,
  setId,
  input: annotationInputSchema.parse(input),
});

describe('effectiveValues', () => {
  const garmin = { reps: 10, weightKg: null };

  it('falls back to Garmin reps and marks their source', () => {
    expect(effectiveValues(garmin, null)).toMatchObject({
      exerciseId: null,
      reps: 10,
      repsSource: 'garmin',
      isExcluded: false,
    });
  });

  it('prefers the user layer', () => {
    const a = annotationInputSchema.parse({ exerciseId: BENCH, weightKg: 60, reps: 8 });
    expect(effectiveValues(garmin, a)).toMatchObject({
      exerciseId: BENCH,
      weightKg: 60,
      reps: 8,
      repsSource: 'user',
    });
  });

  it('has no reps source when neither layer has reps', () => {
    expect(effectiveValues({ reps: null, weightKg: null }, null).repsSource).toBeNull();
  });
});

describe('applyWorkoutEdits', () => {
  const sets = [garminSet(1), garminSet(2), garminSet(3)];
  const detail = workoutDetail(sets);

  it('returns the same object when nothing is pending', () => {
    expect(applyWorkoutEdits(detail, [], NOW)).toBe(detail);
  });

  it('ignores edits of other workouts', () => {
    const other = { ...put(uuid(1), { exerciseId: BENCH }), workoutId: uuid(999) };
    expect(applyWorkoutEdits(detail, [other], NOW)).toBe(detail);
  });

  it('PUT replaces the annotation and recomputes effective values and the count', () => {
    const result = applyWorkoutEdits(
      detail,
      [put(uuid(1), { exerciseId: BENCH, weightKg: 60, reps: 12, isWarmup: true })],
      NOW,
    );
    const [first] = result.sets;
    expect(first!.annotation).toMatchObject({
      exerciseId: BENCH,
      weightKg: 60,
      reps: 12,
      isWarmup: true,
      updatedAt: NOW.toISOString(),
    });
    expect(first!.effective).toMatchObject({ exerciseId: BENCH, reps: 12, repsSource: 'user' });
    expect(result.annotatedSetCount).toBe(1);
    expect(result.sets[1]).toBe(sets[1]);
  });

  it('bulk merges the patch into existing annotations', () => {
    const result = applyWorkoutEdits(
      detail,
      [
        put(uuid(1), { exerciseId: ROW, reps: 12, note: 'тяжело' }),
        {
          kind: 'annotation.bulk',
          workoutId: WORKOUT_ID,
          setIds: [uuid(1), uuid(2)],
          patch: { exerciseId: BENCH, weightKg: 50 },
        },
      ],
      NOW,
    );
    expect(result.sets[0]!.annotation).toMatchObject({
      exerciseId: BENCH,
      weightKg: 50,
      reps: 12,
      note: 'тяжело',
    });
    expect(result.sets[1]!.annotation).toMatchObject({
      exerciseId: BENCH,
      weightKg: 50,
      reps: null,
    });
    expect(result.sets[1]!.effective).toMatchObject({ reps: 10, repsSource: 'garmin' });
    expect(result.sets[2]!.annotation).toBeNull();
    expect(result.annotatedSetCount).toBe(2);
  });

  it('counts excluded sets as annotated', () => {
    const result = applyWorkoutEdits(detail, [put(uuid(3), { isExcluded: true })], NOW);
    expect(result.annotatedSetCount).toBe(1);
  });

  it('creates, updates and deletes manual sets in order', () => {
    const create = (id: string, extra: object = {}): WorkoutEdit =>
      workoutEditSchema.parse({
        kind: 'manualSet.create',
        workoutId: WORKOUT_ID,
        input: { id, exerciseId: BENCH, reps: 8, ...extra },
      });
    const created = applyWorkoutEdits(detail, [create(uuid(11)), create(uuid(12))], NOW);
    expect(created.manualSets.map((s) => [s.id, s.orderIndex])).toEqual([
      [uuid(11), 4],
      [uuid(12), 5],
    ]);
    expect(created.manualSets[0]).toMatchObject({ reps: 8, weightKg: null, isWarmup: false });

    const edited = applyWorkoutEdits(
      detail,
      [
        create(uuid(11)),
        create(uuid(12)),
        {
          kind: 'manualSet.update',
          workoutId: WORKOUT_ID,
          id: uuid(12),
          patch: { orderIndex: 0, weightKg: 40 },
        },
        { kind: 'manualSet.delete', workoutId: WORKOUT_ID, id: uuid(11) },
      ],
      NOW,
    );
    expect(edited.manualSets).toHaveLength(1);
    expect(edited.manualSets[0]).toMatchObject({ id: uuid(12), orderIndex: 0, weightKg: 40 });
  });

  it('does not duplicate a manual set the server already returned', () => {
    const withServerSet = workoutDetail(sets, {
      manualSets: [
        {
          id: uuid(11),
          orderIndex: 4,
          exerciseId: null,
          weightKg: null,
          reps: 5,
          rpe: null,
          isWarmup: false,
          isFailure: false,
          note: null,
        },
      ],
    });
    const edit = workoutEditSchema.parse({
      kind: 'manualSet.create',
      workoutId: WORKOUT_ID,
      input: { id: uuid(11), reps: 5 },
    });
    expect(applyWorkoutEdits(withServerSet, [edit], NOW).manualSets).toHaveLength(1);
  });
});

describe('nextOrderIndex', () => {
  it('appends after every Garmin and manual set', () => {
    expect(nextOrderIndex({ sets: [], manualSets: [] })).toBe(1);
    expect(nextOrderIndex(workoutDetail([garminSet(1), garminSet(2)]))).toBe(3);
  });
});

describe('workoutEditSchema', () => {
  it('requires a client id for manual set creation', () => {
    const edit = { kind: 'manualSet.create', workoutId: WORKOUT_ID, input: { reps: 5 } };
    expect(workoutEditSchema.safeParse(edit).success).toBe(false);
  });

  it('round-trips through JSON (the queue is stored in SQLite)', () => {
    const edit = put(uuid(1), { exerciseId: BENCH, rpe: 8.5 });
    expect(workoutEditSchema.parse(JSON.parse(JSON.stringify(edit)))).toEqual(edit);
  });
});
