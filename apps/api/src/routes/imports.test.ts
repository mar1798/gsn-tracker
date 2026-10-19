import { workoutDetailSchema } from '@gsc/shared';
import { describe, expect, it } from 'vitest';
import {
  FIXTURE_FIT,
  importFixture,
  multipartFile,
  registerUser,
  useTestApp,
} from '../../test/helpers.js';

describe('POST /imports/fit', () => {
  const { app, storage } = useTestApp();

  const upload = (headers: Record<string, string>, bytes: Uint8Array) => {
    const body = multipartFile(bytes);
    return app.inject({
      method: 'POST',
      url: '/imports/fit',
      payload: body.payload,
      headers: { ...headers, ...body.headers },
    });
  };

  it('imports the Epix Pro fixture with sets, HR and the original file', async () => {
    const { headers, user } = await registerUser(app);
    const workoutId = await importFixture(app, headers);

    const res = await app.inject({ method: 'GET', url: `/workouts/${workoutId}`, headers });
    expect(res.statusCode).toBe(200);
    const raw = res.json() as Record<string, unknown>;
    expect(Object.keys(raw).sort()).toEqual(Object.keys(workoutDetailSchema.shape).sort());
    const workout = workoutDetailSchema.parse(raw);

    expect(workout).toMatchObject({
      source: 'manual_fit',
      startedAt: '2026-10-17T03:06:21.000Z',
      utcOffsetSec: 21600,
      calories: 668,
      avgHr: 138,
      maxHr: 170,
      deviceModel: 'epixGen2Pro47',
      bodyWeightKg: 78,
      setCount: 21,
      annotatedSetCount: 0,
    });
    expect(workout.sets).toHaveLength(21);
    expect(workout.sets.reduce((sum, s) => sum + (s.garmin.reps ?? 0), 0)).toBe(326);
    expect(workout.sets.filter((s) => s.suspicious).map((s) => s.setIndex)).toEqual([12, 13]);
    expect(workout.sets.every((s) => s.garmin.weightKg === null)).toBe(true);
    expect(workout.hrZones?.secondsInZone.length).toBeGreaterThan(0);

    // Nothing is applied from Garmin: reps are a pre-fill, the exercise is empty.
    expect(workout.sets[0]!.effective).toMatchObject({
      exerciseId: null,
      weightKg: null,
      reps: 50,
      repsSource: 'garmin',
    });

    const hr = await app.inject({ method: 'GET', url: `/workouts/${workoutId}/hr`, headers });
    const { offsetsSec, bpm } = hr.json() as { offsetsSec: number[]; bpm: number[] };
    expect(bpm).toHaveLength(2107);
    expect(offsetsSec).toHaveLength(2107);
    expect(offsetsSec[0]).toBeGreaterThanOrEqual(0);

    expect([...storage.objects.keys()]).toEqual([
      expect.stringMatching(`^fit/${user.id}/[0-9a-f]{64}\\.fit$`),
    ]);
  });

  it('answers 409 with the existing workout for the same file', async () => {
    const { headers } = await registerUser(app);
    const workoutId = await importFixture(app, headers);
    const again = await upload(headers, FIXTURE_FIT);
    expect(again.statusCode).toBe(409);
    expect(again.json()).toEqual({
      error: 'duplicate',
      message: 'Файл уже импортирован',
      workoutId,
    });
  });

  it('lets another user import the same file', async () => {
    const a = await registerUser(app, 'a@example.com');
    const b = await registerUser(app, 'b@example.com');
    const idA = await importFixture(app, a.headers);
    const idB = await importFixture(app, b.headers);
    expect(idB).not.toBe(idA);

    const foreign = await app.inject({
      method: 'GET',
      url: `/workouts/${idA}`,
      headers: b.headers,
    });
    expect(foreign.statusCode).toBe(404);
  });

  it('rejects files that are not FIT or are corrupted', async () => {
    const { headers } = await registerUser(app);

    const notFit = await upload(headers, Buffer.from('definitely not a fit file'));
    expect(notFit.statusCode).toBe(422);
    expect(notFit.json()).toEqual({ error: 'not_fit', message: 'Это не FIT-файл' });

    const corrupted = Buffer.from(FIXTURE_FIT);
    const at = corrupted.length - 100;
    corrupted[at] = corrupted[at]! ^ 0xff;
    const bad = await upload(headers, corrupted);
    expect(bad.statusCode).toBe(422);
    expect(bad.json()).toMatchObject({ error: 'corrupted' });

    expect(storage.objects.size).toBe(0);
  });

  it('rejects a request without a file and files over the limit', async () => {
    const { headers } = await registerUser(app);
    const empty = await app.inject({
      method: 'POST',
      url: '/imports/fit',
      headers: { ...headers, 'content-type': 'multipart/form-data; boundary=x' },
      payload: '--x--\r\n',
    });
    expect(empty.statusCode).toBe(400);

    const huge = await upload(headers, Buffer.alloc(2 * 1024 * 1024));
    expect(huge.statusCode).toBe(413);
    expect(huge.json()).toMatchObject({ error: 'file_too_large' });
  });

  it('requires auth', async () => {
    const res = await upload({}, FIXTURE_FIT);
    expect(res.statusCode).toBe(401);
  });
});
