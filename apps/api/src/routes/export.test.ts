import { EXPORT_SET_COLUMNS, workoutDetailSchema } from '@gsc/shared';
import { describe, expect, it } from 'vitest';
import { importFixture, registerUser, useTestApp } from '../../test/helpers.js';

const BENCH_PRESS = 'Жим штанги лёжа';

describe('GET /export/csv', () => {
  const { app } = useTestApp();

  const rowsOf = (body: string) =>
    body
      .replace(/^\uFEFF/, '')
      .trimEnd()
      .split('\r\n')
      .map((line) => line.split(','));
  const col = (name: (typeof EXPORT_SET_COLUMNS)[number]) => EXPORT_SET_COLUMNS.indexOf(name);

  it('exports every set with effective values', async () => {
    const { headers } = await registerUser(app);
    const workoutId = await importFixture(app, headers);
    const detail = workoutDetailSchema.parse(
      (await app.inject({ method: 'GET', url: `/workouts/${workoutId}`, headers })).json(),
    );
    const exercises = (await app.inject({ method: 'GET', url: '/exercises', headers })).json() as {
      items: { id: string; nameRu: string }[];
    };
    const bench = exercises.items.find((e) => e.nameRu === BENCH_PRESS)!;
    const first = detail.sets[0]!;
    await app.inject({
      method: 'PUT',
      url: `/sets/${first.id}/annotation`,
      headers,
      payload: { exerciseId: bench.id, weightKg: 60, reps: 8, note: 'легко' },
    });
    await app.inject({
      method: 'POST',
      url: `/workouts/${workoutId}/manual-sets`,
      headers,
      payload: { orderIndex: 1, exerciseId: bench.id, weightKg: 50, reps: 12 },
    });

    const res = await app.inject({ method: 'GET', url: '/export/csv', headers });
    expect(res.statusCode).toBe(200);
    expect(res.headers['content-type']).toBe('text/csv; charset=utf-8');
    expect(res.headers['content-disposition']).toMatch(
      /^attachment; filename="gsc-tracker-sets-\d{4}-\d{2}-\d{2}\.csv"$/,
    );

    const [header, ...rows] = rowsOf(res.body);
    expect(header).toEqual([...EXPORT_SET_COLUMNS]);
    // 21 Garmin sets of the fixture plus the manual one, which follows set 1.
    expect(rows).toHaveLength(22);
    const [garmin, manual, second] = rows;
    expect(garmin![col('set_number')]).toBe('1');
    expect(garmin![col('exercise')]).toBe(BENCH_PRESS);
    expect(garmin![col('weight_kg')]).toBe('60');
    expect(garmin![col('reps')]).toBe('8');
    expect(garmin![col('reps_source')]).toBe('user');
    expect(garmin![col('reps_garmin')]).toBe(String(first.garmin.reps));
    expect(garmin![col('hr_peak')]).toBe(String(first.hr.peak));
    expect(garmin![col('note')]).toBe('легко');
    expect(garmin![col('utc_offset')]).toBe('+06:00');
    expect(manual![col('set_source')]).toBe('manual');
    expect(manual![col('set_number')]).toBe('');
    expect(manual![col('weight_kg')]).toBe('50');
    // Not annotated: the watch reps stay unconfirmed and there is no exercise.
    expect(second![col('set_number')]).toBe('2');
    expect(second![col('exercise')]).toBe('');
    expect(second![col('reps_source')]).toBe('garmin');
  });

  it("exports only the user's own sets", async () => {
    const a = await registerUser(app, 'a@example.com');
    const b = await registerUser(app, 'b@example.com');
    await importFixture(app, a.headers);
    const res = await app.inject({ method: 'GET', url: '/export/csv', headers: b.headers });
    expect(rowsOf(res.body)).toEqual([[...EXPORT_SET_COLUMNS]]);
  });

  it('requires auth', async () => {
    expect((await app.inject({ method: 'GET', url: '/export/csv' })).statusCode).toBe(401);
  });
});
