import {
  exerciseListResponseSchema,
  manualSetSchema,
  workoutDetailSchema,
  workoutListResponseSchema,
  workoutSetSchema,
  type WorkoutDetail,
} from '@gsc/shared';
import { eq } from 'drizzle-orm';
import { beforeEach, describe, expect, it } from 'vitest';
import { importFixture, registerUser, useTestApp } from '../../test/helpers.js';
import { effectiveSets, exercises } from '../db/schema.js';

describe('set annotations', () => {
  const { app, db } = useTestApp();
  let headers: Record<string, string>;
  let workout: WorkoutDetail;
  let exerciseId: (slug: string) => string;

  beforeEach(async () => {
    ({ headers } = await registerUser(app));
    const id = await importFixture(app, headers);
    workout = workoutDetailSchema.parse(
      (await app.inject({ method: 'GET', url: `/workouts/${id}`, headers })).json(),
    );
    const list = exerciseListResponseSchema.parse(
      (await app.inject({ method: 'GET', url: '/exercises', headers })).json(),
    );
    exerciseId = (slug) => list.items.find((e) => e.slug === slug)!.id;
  });

  const setAt = (n: number) => workout.sets[n - 1]!;
  const put = (setId: string, payload: object) =>
    app.inject({ method: 'PUT', url: `/sets/${setId}/annotation`, headers, payload });

  it('suggests catalog exercises from Garmin hints without applying them', () => {
    // Set 21: lateralRaise/seatedRearLateralRaise among the watch guesses.
    const last = setAt(21);
    expect(last.garmin.hints.some((h) => h.exerciseName === 'seatedRearLateralRaise')).toBe(true);
    expect(last.garmin.suggestedExerciseIds[0]).toBe(exerciseId('seated_rear_delt_raise'));
    expect(last.effective.exerciseId).toBeNull();
    // Set 1: row / curl category guesses.
    expect(setAt(1).garmin.suggestedExerciseIds).toContain(exerciseId('barbell_row'));
  });

  it('PUT stores the user layer and effective values prefer it', async () => {
    const res = await put(setAt(1).id, {
      exerciseId: exerciseId('barbell_row'),
      weightKg: 60,
      reps: 12,
      rpe: 8.5,
    });
    expect(res.statusCode).toBe(200);
    const set = workoutSetSchema.parse(res.json());
    expect(set.garmin.reps).toBe(50);
    expect(set.annotation).toMatchObject({ weightKg: 60, reps: 12, rpe: 8.5, isWarmup: false });
    expect(set.effective).toMatchObject({
      exerciseId: exerciseId('barbell_row'),
      weightKg: 60,
      reps: 12,
      repsSource: 'user',
      rpe: 8.5,
    });
  });

  it('PUT replaces the whole annotation; empty reps fall back to Garmin', async () => {
    await put(setAt(1).id, { exerciseId: exerciseId('barbell_row'), weightKg: 60, reps: 12 });
    const set = workoutSetSchema.parse((await put(setAt(1).id, { weightKg: 62.5 })).json());
    expect(set.annotation).toMatchObject({ exerciseId: null, weightKg: 62.5, reps: null });
    expect(set.effective).toMatchObject({ weightKg: 62.5, reps: 50, repsSource: 'garmin' });
  });

  it('validates input, exercises and ownership', async () => {
    expect((await put(setAt(1).id, { rpe: 11 })).statusCode).toBe(400);
    expect((await put(setAt(1).id, { reps: 1.5 })).statusCode).toBe(400);
    expect((await put(setAt(1).id, { foo: 1 })).statusCode).toBe(400);

    const unknownExercise = await put(setAt(1).id, {
      exerciseId: '00000000-0000-4000-8000-000000000000',
    });
    expect(unknownExercise.statusCode).toBe(400);
    expect(unknownExercise.json()).toMatchObject({ error: 'invalid_exercise' });

    const other = await registerUser(app, 'other@example.com');
    const foreign = await app.inject({
      method: 'PUT',
      url: `/sets/${setAt(1).id}/annotation`,
      headers: other.headers,
      payload: { reps: 10 },
    });
    expect(foreign.statusCode).toBe(404);
  });

  it('bulk merges a patch into several sets and keeps other fields', async () => {
    await put(setAt(2).id, { reps: 8, note: 'тяжело' });
    const ids = [1, 2, 3].map((n) => setAt(n).id);
    const res = await app.inject({
      method: 'POST',
      url: '/sets/annotations/bulk',
      headers,
      payload: { setIds: ids, patch: { exerciseId: exerciseId('barbell_row'), weightKg: 60 } },
    });
    expect(res.statusCode).toBe(200);
    const { items } = res.json() as { items: unknown[] };
    const sets = items.map((s) => workoutSetSchema.parse(s));
    expect(sets.map((s) => s.setIndex)).toEqual([1, 2, 3]);
    expect(sets.every((s) => s.effective.exerciseId === exerciseId('barbell_row'))).toBe(true);
    expect(sets.every((s) => s.effective.weightKg === 60)).toBe(true);
    expect(sets[1]!.annotation).toMatchObject({ reps: 8, note: 'тяжело' });

    const list = workoutListResponseSchema.parse(
      (await app.inject({ method: 'GET', url: '/workouts', headers })).json(),
    );
    expect(list.items[0]).toMatchObject({ setCount: 21, annotatedSetCount: 3 });
  });

  it('bulk rejects foreign sets and empty patches', async () => {
    const other = await registerUser(app, 'other@example.com');
    const foreign = await app.inject({
      method: 'POST',
      url: '/sets/annotations/bulk',
      headers: other.headers,
      payload: { setIds: [setAt(1).id], patch: { weightKg: 1 } },
    });
    expect(foreign.statusCode).toBe(404);

    const empty = await app.inject({
      method: 'POST',
      url: '/sets/annotations/bulk',
      headers,
      payload: { setIds: [setAt(1).id], patch: {} },
    });
    expect(empty.statusCode).toBe(400);
  });

  it('counts excluded suspicious sets as handled', async () => {
    await app.inject({
      method: 'POST',
      url: '/sets/annotations/bulk',
      headers,
      payload: { setIds: [setAt(12).id, setAt(13).id], patch: { isExcluded: true } },
    });
    const list = workoutListResponseSchema.parse(
      (await app.inject({ method: 'GET', url: '/workouts', headers })).json(),
    );
    expect(list.items[0]!.annotatedSetCount).toBe(2);
  });

  it('manual sets: create, append order, update, delete', async () => {
    const url = `/workouts/${workout.id}/manual-sets`;
    const created = await app.inject({
      method: 'POST',
      url,
      headers,
      payload: { exerciseId: exerciseId('plank'), reps: 1 },
    });
    expect(created.statusCode).toBe(201);
    const manual = manualSetSchema.parse(created.json());
    expect(manual.orderIndex).toBe(22);

    const second = manualSetSchema.parse(
      (await app.inject({ method: 'POST', url, headers, payload: {} })).json(),
    );
    expect(second.orderIndex).toBe(23);

    const patched = await app.inject({
      method: 'PATCH',
      url: `/manual-sets/${manual.id}`,
      headers,
      payload: { weightKg: 10, isWarmup: true },
    });
    expect(manualSetSchema.parse(patched.json())).toMatchObject({
      exerciseId: exerciseId('plank'),
      weightKg: 10,
      reps: 1,
      isWarmup: true,
    });

    const view = await db.select().from(effectiveSets).where(eq(effectiveSets.setId, manual.id));
    expect(view).toEqual([
      expect.objectContaining({
        kind: 'manual',
        weightKg: 10,
        reps: 1,
        repsSource: 'user',
        isWarmup: true,
      }),
    ]);

    const other = await registerUser(app, 'other@example.com');
    const foreign = await app.inject({
      method: 'DELETE',
      url: `/manual-sets/${manual.id}`,
      headers: other.headers,
    });
    expect(foreign.statusCode).toBe(404);

    const deleted = await app.inject({
      method: 'DELETE',
      url: `/manual-sets/${manual.id}`,
      headers,
    });
    expect(deleted.statusCode).toBe(204);
    const detail = workoutDetailSchema.parse(
      (await app.inject({ method: 'GET', url: `/workouts/${workout.id}`, headers })).json(),
    );
    expect(detail.manualSets.map((s) => s.id)).toEqual([second.id]);
  });

  it("does not accept another user's custom exercise", async () => {
    const other = await registerUser(app, 'other@example.com');
    const [custom] = await db
      .insert(exercises)
      .values({
        nameRu: 'Моё упражнение',
        equipment: 'other',
        mechanics: 'isolation',
        isCustom: true,
        userId: other.user.id,
      })
      .returning();
    const res = await put(setAt(1).id, { exerciseId: custom!.id });
    expect(res.statusCode).toBe(400);
  });
});

describe('effective_sets view', () => {
  const { app, db } = useTestApp();

  it('has one row per Garmin set with Garmin values when there is no annotation', async () => {
    const { headers } = await registerUser(app);
    const id = await importFixture(app, headers);
    const rows = await db.select().from(effectiveSets).where(eq(effectiveSets.workoutId, id));
    expect(rows).toHaveLength(21);
    expect(
      rows.every((r) => r.kind === 'garmin' && r.exerciseId === null && r.weightKg === null),
    ).toBe(true);
    expect(rows.reduce((sum, r) => sum + (r.reps ?? 0), 0)).toBe(326);
    expect(rows.every((r) => r.repsSource === 'garmin' && !r.isExcluded)).toBe(true);
  });
});
