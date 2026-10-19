import { workoutDetailSchema, workoutListResponseSchema, workoutSummarySchema } from '@gsc/shared';
import { describe, expect, it } from 'vitest';
import { importFixture, registerUser, useTestApp } from '../../test/helpers.js';
import { workouts } from '../db/schema.js';

describe('workouts', () => {
  const { app, db, storage } = useTestApp();

  it('lists newest first with cursor pagination', async () => {
    const { headers, user } = await registerUser(app);
    const days = [1, 3, 2, 5, 4];
    await db.insert(workouts).values(
      days.map((d) => ({
        userId: user.id,
        source: 'manual_fit' as const,
        fileHash: `hash-${d}`,
        startedAt: new Date(Date.UTC(2026, 9, d, 10)),
      })),
    );

    const seen: string[] = [];
    let cursor: string | null = null;
    do {
      const query: string = cursor ? `?limit=2&cursor=${cursor}` : '?limit=2';
      const res = await app.inject({ method: 'GET', url: `/workouts${query}`, headers });
      expect(res.statusCode).toBe(200);
      const page = workoutListResponseSchema.parse(res.json());
      expect(page.items.length).toBeLessThanOrEqual(2);
      seen.push(...page.items.map((w) => w.startedAt.slice(8, 10)));
      cursor = page.nextCursor;
    } while (cursor);

    expect(seen).toEqual(['05', '04', '03', '02', '01']);

    // Only the public summary: no user id, file hash or storage key.
    const raw = await app.inject({ method: 'GET', url: '/workouts?limit=1', headers });
    const [item] = (raw.json() as { items: Record<string, unknown>[] }).items;
    expect(Object.keys(item!).sort()).toEqual(Object.keys(workoutSummarySchema.shape).sort());

    const bad = await app.inject({ method: 'GET', url: '/workouts?cursor=garbage', headers });
    expect(bad.statusCode).toBe(400);
  });

  it("does not list other users' workouts", async () => {
    const a = await registerUser(app, 'a@example.com');
    const b = await registerUser(app, 'b@example.com');
    await importFixture(app, a.headers);
    const res = await app.inject({ method: 'GET', url: '/workouts', headers: b.headers });
    expect(workoutListResponseSchema.parse(res.json()).items).toEqual([]);
  });

  it('updates title and notes', async () => {
    const { headers } = await registerUser(app);
    const id = await importFixture(app, headers);
    const res = await app.inject({
      method: 'PATCH',
      url: `/workouts/${id}`,
      headers,
      payload: { title: 'Спина и бицепс', notes: 'Тяжело' },
    });
    expect(res.statusCode).toBe(200);
    expect(workoutDetailSchema.parse(res.json())).toMatchObject({
      title: 'Спина и бицепс',
      notes: 'Тяжело',
    });

    const unknownField = await app.inject({
      method: 'PATCH',
      url: `/workouts/${id}`,
      headers,
      payload: { calories: 1 },
    });
    expect(unknownField.statusCode).toBe(400);
  });

  it('deletes the workout with its sets and original file', async () => {
    const { headers } = await registerUser(app);
    const id = await importFixture(app, headers);
    expect(storage.objects.size).toBe(1);

    const res = await app.inject({ method: 'DELETE', url: `/workouts/${id}`, headers });
    expect(res.statusCode).toBe(204);
    expect(storage.objects.size).toBe(0);
    expect((await app.inject({ method: 'GET', url: `/workouts/${id}`, headers })).statusCode).toBe(
      404,
    );

    // The same file can be imported again after deletion.
    await importFixture(app, headers);
  });

  it('answers 404 for unknown ids and 400 for malformed ones', async () => {
    const { headers } = await registerUser(app);
    const missing = await app.inject({
      method: 'GET',
      url: '/workouts/00000000-0000-4000-8000-000000000000',
      headers,
    });
    expect(missing.statusCode).toBe(404);
    expect(missing.json()).toMatchObject({ message: 'Тренировка не найдена' });
    expect((await app.inject({ method: 'GET', url: '/workouts/42', headers })).statusCode).toBe(
      400,
    );
  });
});
