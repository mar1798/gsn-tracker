import {
  EXERCISES,
  exerciseListResponseSchema,
  exerciseSchema,
  workoutDetailSchema,
  MUSCLE_GROUPS,
  muscleGroupListResponseSchema,
} from '@gsc/shared';
import { describe, expect, it } from 'vitest';
import { importFixture, registerUser, useTestApp } from '../../test/helpers.js';
import { createDb } from '../db/client.js';
import { exercises } from '../db/schema.js';
import { seedCatalog } from '../db/seed.js';
import { TEST_DATABASE_URL } from '../../test/db-url.js';

describe('exercise catalog API', () => {
  const { app, db } = useTestApp();

  const list = async (headers: Record<string, string>, query = '') => {
    const res = await app.inject({ method: 'GET', url: `/exercises${query}`, headers });
    expect(res.statusCode).toBe(200);
    return exerciseListResponseSchema.parse(res.json()).items;
  };

  it('lists the seeded catalog with muscles', async () => {
    const { headers } = await registerUser(app);
    const items = await list(headers);
    expect(items).toHaveLength(EXERCISES.length);
    expect(items.find((e) => e.slug === 'barbell_bench_press')).toMatchObject({
      nameRu: 'Жим штанги лёжа',
      isCustom: false,
      isArchived: false,
      garminCategory: 'benchPress',
      garminExerciseName: 'barbellBenchPress',
      muscles: [
        { muscle: 'chest', role: 'primary', coefficient: 1 },
        { muscle: 'front_delts', role: 'secondary', coefficient: 0.5 },
        { muscle: 'triceps', role: 'secondary', coefficient: 0.5 },
      ],
    });
  });

  it('searches by name (case-insensitive, ru and en) and filters by muscle', async () => {
    const { headers } = await registerUser(app);
    const press = await list(headers, `?q=${encodeURIComponent('ЖИМ ШТАНГИ')}`);
    expect(press.map((e) => e.slug)).toContain('barbell_bench_press');
    expect(press.every((e) => /жим штанги/i.test(e.nameRu))).toBe(true);

    expect((await list(headers, '?q=deadlift')).map((e) => e.slug)).toContain('romanian_deadlift');
    expect(await list(headers, '?q=100%25')).toEqual([]);

    const calves = await list(headers, '?muscle=calves');
    expect(calves.length).toBeGreaterThan(0);
    expect(calves.every((e) => e.muscles.some((m) => m.muscle === 'calves'))).toBe(true);
  });

  it("shows the user's custom exercises only to them", async () => {
    const a = await registerUser(app, 'a@example.com');
    const b = await registerUser(app, 'b@example.com');
    await db.insert(exercises).values({
      nameRu: 'Жим Ивана',
      equipment: 'other',
      mechanics: 'compound',
      isCustom: true,
      userId: a.user.id,
    });
    expect((await list(a.headers, '?q=Ивана')).map((e) => e.isCustom)).toEqual([true]);
    expect(await list(b.headers, '?q=Ивана')).toEqual([]);
  });

  it('lists muscle groups in catalog order', async () => {
    const { headers } = await registerUser(app);
    const res = await app.inject({ method: 'GET', url: '/muscle-groups', headers });
    const { items } = muscleGroupListResponseSchema.parse(res.json());
    expect(items.map((m) => m.slug)).toEqual(MUSCLE_GROUPS.map((m) => m.slug));
  });
});

describe('custom exercises API', () => {
  const { app } = useTestApp();

  const input = {
    nameRu: 'Жим в хаммере',
    equipment: 'machine',
    mechanics: 'compound',
    isBodyweight: false,
    muscles: [
      { muscle: 'chest', role: 'primary', coefficient: 1 },
      { muscle: 'triceps', role: 'secondary', coefficient: 0.5 },
    ],
  };

  const create = (headers: Record<string, string>, payload: object = input) =>
    app.inject({ method: 'POST', url: '/exercises', headers, payload });
  const patch = (headers: Record<string, string>, id: string, payload: object) =>
    app.inject({ method: 'PATCH', url: `/exercises/${id}`, headers, payload });
  const remove = (headers: Record<string, string>, id: string) =>
    app.inject({ method: 'DELETE', url: `/exercises/${id}`, headers });
  const list = async (headers: Record<string, string>, query = '') =>
    exerciseListResponseSchema.parse(
      (await app.inject({ method: 'GET', url: `/exercises${query}`, headers })).json(),
    ).items;

  it('creates a custom exercise with its muscles, visible only to its owner', async () => {
    const a = await registerUser(app, 'a@example.com');
    const b = await registerUser(app, 'b@example.com');
    const res = await create(a.headers);
    expect(res.statusCode).toBe(201);
    const created = exerciseSchema.parse(res.json());
    expect(created).toMatchObject({
      nameRu: 'Жим в хаммере',
      slug: null,
      isCustom: true,
      isArchived: false,
      garminCategory: null,
      muscles: input.muscles,
    });
    expect((await list(a.headers, '?muscle=triceps')).map((e) => e.id)).toContain(created.id);
    expect(await list(b.headers, '?q=хаммере')).toEqual([]);
  });

  it('rejects invalid muscles and taken names (case and ё insensitive)', async () => {
    const { headers } = await registerUser(app);
    const noPrimary = await create(headers, {
      ...input,
      muscles: [{ muscle: 'chest', role: 'secondary', coefficient: 0.5 }],
    });
    expect(noPrimary.statusCode).toBe(400);

    const builtIn = await create(headers, { ...input, nameRu: 'ЖИМ ШТАНГИ ЛЕЖА' });
    expect(builtIn.statusCode).toBe(409);
    expect(builtIn.json()).toMatchObject({
      error: 'duplicate_name',
      message: 'Упражнение с таким названием уже есть',
    });

    expect((await create(headers)).statusCode).toBe(201);
    expect((await create(headers, { ...input, nameRu: ' жим в хаммере ' })).statusCode).toBe(409);
  });

  it('updates fields and replaces the muscle list', async () => {
    const { headers } = await registerUser(app);
    const { id } = exerciseSchema.parse((await create(headers)).json());

    const renamed = await patch(headers, id, { nameRu: 'Жим в тренажёре', mechanics: 'isolation' });
    expect(renamed.statusCode).toBe(200);
    expect(renamed.json()).toMatchObject({
      nameRu: 'Жим в тренажёре',
      mechanics: 'isolation',
      muscles: input.muscles,
    });

    const remuscled = await patch(headers, id, {
      muscles: [{ muscle: 'front_delts', role: 'primary', coefficient: 1 }],
    });
    expect(exerciseSchema.parse(remuscled.json()).muscles).toEqual([
      { muscle: 'front_delts', role: 'primary', coefficient: 1 },
    ]);
    // Its own name is not a duplicate.
    expect((await patch(headers, id, { nameRu: 'жим в тренажере' })).statusCode).toBe(200);
  });

  it("forbids changing built-in exercises and other users' ones", async () => {
    const a = await registerUser(app, 'a@example.com');
    const b = await registerUser(app, 'b@example.com');
    const bench = (await list(a.headers, '?q=жим штанги лёжа'))[0]!;
    expect((await patch(a.headers, bench.id, { nameRu: 'Мой жим' })).statusCode).toBe(403);
    expect((await remove(a.headers, bench.id)).statusCode).toBe(403);

    const { id } = exerciseSchema.parse((await create(a.headers)).json());
    expect((await patch(b.headers, id, { nameRu: 'Чужой' })).statusCode).toBe(404);
    expect((await remove(b.headers, id)).statusCode).toBe(404);
  });

  it('archives a deleted exercise: sets keep it, the name becomes free', async () => {
    const { headers } = await registerUser(app);
    const { id } = exerciseSchema.parse((await create(headers)).json());
    const workoutId = await importFixture(app, headers);
    const detail = workoutDetailSchema.parse(
      (await app.inject({ method: 'GET', url: `/workouts/${workoutId}`, headers })).json(),
    );
    const setId = detail.sets[0]!.id;
    await app.inject({
      method: 'PUT',
      url: `/sets/${setId}/annotation`,
      headers,
      payload: { exerciseId: id, weightKg: 60, reps: 10 },
    });

    expect((await remove(headers, id)).statusCode).toBe(204);
    expect((await remove(headers, id)).statusCode).toBe(204);
    expect((await list(headers)).find((e) => e.id === id)).toMatchObject({ isArchived: true });
    expect((await patch(headers, id, { nameRu: 'Снова' })).statusCode).toBe(404);

    const after = workoutDetailSchema.parse(
      (await app.inject({ method: 'GET', url: `/workouts/${workoutId}`, headers })).json(),
    );
    expect(after.sets[0]!.effective.exerciseId).toBe(id);
    expect((await create(headers)).statusCode).toBe(201);
  });
});

describe('seedCatalog', () => {
  it('is idempotent and keeps exercise ids', async () => {
    const { db, close } = createDb(TEST_DATABASE_URL);
    try {
      const before = await db.select({ id: exercises.id, slug: exercises.slug }).from(exercises);
      await seedCatalog(db);
      const after = await db.select({ id: exercises.id, slug: exercises.slug }).from(exercises);
      expect(after.filter((e) => e.slug)).toHaveLength(EXERCISES.length);
      expect(new Map(after.map((e) => [e.slug, e.id]))).toEqual(
        new Map(before.map((e) => [e.slug, e.id])),
      );
    } finally {
      await close();
    }
  });
});
