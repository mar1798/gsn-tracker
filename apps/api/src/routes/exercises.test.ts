import {
  EXERCISES,
  exerciseListResponseSchema,
  MUSCLE_GROUPS,
  muscleGroupListResponseSchema,
} from '@gsc/shared';
import { describe, expect, it } from 'vitest';
import { registerUser, useTestApp } from '../../test/helpers.js';
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
