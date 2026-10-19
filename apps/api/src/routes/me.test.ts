import { eq } from 'drizzle-orm';
import { describe, expect, it, vi } from 'vitest';
import { importFixture, registerUser, useTestApp } from '../../test/helpers.js';
import { exercises, workouts } from '../db/schema.js';

describe('DELETE /me', () => {
  const { app, db, storage } = useTestApp();

  it('deletes the account with all its data and FIT files', async () => {
    const me = await registerUser(app);
    const other = await registerUser(app, 'other@example.com');
    await importFixture(app, me.headers);
    const otherWorkout = await importFixture(app, other.headers);
    const created = await app.inject({
      method: 'POST',
      url: '/exercises',
      headers: me.headers,
      payload: {
        nameRu: 'Моё упражнение',
        equipment: 'machine',
        mechanics: 'isolation',
        isBodyweight: false,
        muscles: [{ muscle: 'chest', role: 'primary', coefficient: 1 }],
      },
    });
    expect(created.statusCode).toBe(201);
    expect(storage.objects.size).toBe(2);

    const res = await app.inject({ method: 'DELETE', url: '/me', headers: me.headers });
    expect(res.statusCode).toBe(204);

    expect(await db.select().from(workouts).where(eq(workouts.userId, me.user.id))).toEqual([]);
    expect(await db.select().from(exercises).where(eq(exercises.userId, me.user.id))).toEqual([]);
    expect([...storage.objects.keys()]).toEqual([expect.stringContaining(other.user.id)]);

    // The refresh token is revoked with the account; the old access token finds no user.
    const refresh = await app.inject({
      method: 'POST',
      url: '/auth/refresh',
      payload: { refreshToken: me.refreshToken },
    });
    expect(refresh.statusCode).toBe(401);
    const login = await app.inject({
      method: 'POST',
      url: '/auth/login',
      payload: { email: 'lifter@example.com', password: 'correct horse battery' },
    });
    expect(login.statusCode).toBe(401);
    expect((await app.inject({ method: 'GET', url: '/me', headers: me.headers })).statusCode).toBe(
      404,
    );

    // Other users keep their data.
    const kept = await app.inject({
      method: 'GET',
      url: `/workouts/${otherWorkout}`,
      headers: other.headers,
    });
    expect(kept.statusCode).toBe(200);
  });

  it('deletes the account even when storage fails', async () => {
    const me = await registerUser(app);
    await importFixture(app, me.headers);
    const failing = vi.spyOn(storage, 'delete').mockRejectedValue(new Error('S3 down'));
    const res = await app.inject({ method: 'DELETE', url: '/me', headers: me.headers });
    failing.mockRestore();
    expect(res.statusCode).toBe(204);
  });

  it('requires auth', async () => {
    expect((await app.inject({ method: 'DELETE', url: '/me' })).statusCode).toBe(401);
  });
});
