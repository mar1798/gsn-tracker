import {
  analyticsMusclesSchema,
  analyticsOverviewSchema,
  exerciseListResponseSchema,
  exerciseProgressSchema,
  recordsResponseSchema,
  workoutDetailSchema,
} from '@gsc/shared';
import { describe, expect, it } from 'vitest';
import { importFixture, registerUser, useTestApp } from '../../test/helpers.js';

// The fixture workout is on 2026-10-17 on the watch (UTC+6): 21 sets, 18:55 under load
// out of 1:11:36 timer time.
const WEEK = 'from=2026-10-11&to=2026-10-17';

describe('analytics API', () => {
  const { app } = useTestApp();

  async function setup() {
    const user = await registerUser(app);
    const { headers } = user;
    const workoutId = await importFixture(app, headers);
    const detail = workoutDetailSchema.parse(
      (await app.inject({ method: 'GET', url: `/workouts/${workoutId}`, headers })).json(),
    );
    const bench = exerciseListResponseSchema
      .parse(
        (
          await app.inject({
            method: 'GET',
            url: `/exercises?q=${encodeURIComponent('жим штанги лёжа')}`,
            headers,
          })
        ).json(),
      )
      .items.find((e) => e.slug === 'barbell_bench_press')!;
    const get = async (url: string) => {
      const res = await app.inject({ method: 'GET', url, headers });
      expect(res.statusCode, res.body).toBe(200);
      return res.json() as unknown;
    };
    const annotate = (setIds: string[], patch: object) =>
      app.inject({
        method: 'POST',
        url: '/sets/annotations/bulk',
        headers,
        payload: { setIds, patch },
      });
    return { headers, workoutId, detail, bench, get, annotate };
  }

  it('summarizes the period: density, HR and zones without any annotation', async () => {
    const { get } = await setup();
    const o = analyticsOverviewSchema.parse(await get(`/analytics/overview?${WEEK}`));

    expect(o.previousPeriod).toEqual({ from: '2026-10-04', to: '2026-10-10' });
    expect(o.current).toMatchObject({ workouts: 1, workingSets: 0, volumeKg: 0 });
    expect(o.current.density).toBeCloseTo(1135 / 4296, 2);
    expect(o.current.avgWorkingHr).toBeGreaterThan(90);
    expect(o.current.avgPeakHr).toBeGreaterThan(o.current.avgWorkingHr!);
    expect(o.current.avgRecoveryBpm).toBeGreaterThan(0);
    expect(o.current.hrZonesSec).toHaveLength(7);
    expect(o.previous).toMatchObject({ workouts: 0, density: null, hrZonesSec: [] });
    expect(o.weeks.map((w) => [w.weekStart, w.workouts])).toEqual([
      ['2026-10-05', 0],
      ['2026-10-12', 1],
    ]);

    const outside = analyticsOverviewSchema.parse(
      await get('/analytics/overview?from=2026-10-18&to=2026-10-24'),
    );
    expect(outside.current.workouts).toBe(0);
    expect(outside.previous.workouts).toBe(1);
  });

  it('counts only annotated working sets, volume only with confirmed reps', async () => {
    const { detail, bench, get, annotate } = await setup();
    const [s1, s2, s3, s4, s5] = detail.sets.map((s) => s.id);
    await annotate([s1!, s2!, s3!], { exerciseId: bench.id, weightKg: 60, reps: 10 });
    // Watch reps not confirmed: a set, but no volume.
    await annotate([s4!], { exerciseId: bench.id, weightKg: 60 });
    await annotate([s5!], { exerciseId: bench.id, weightKg: 40, reps: 10, isWarmup: true });

    const o = analyticsOverviewSchema.parse(await get(`/analytics/overview?${WEEK}`));
    expect(o.current).toMatchObject({ workingSets: 4, volumeKg: 1800 });

    const m = analyticsMusclesSchema.parse(await get(`/analytics/muscles?${WEEK}`));
    const byMuscle = new Map(m.muscles.map((x) => [x.muscle, x]));
    expect(byMuscle.get('chest')).toEqual({
      muscle: 'chest',
      sets: 4,
      volumeKg: 1800,
      previousSets: 0,
      previousVolumeKg: 0,
    });
    expect(byMuscle.get('triceps')).toMatchObject({ sets: 2, volumeKg: 900 });
    expect(m.weeks.at(-1)!.muscles.find((x) => x.muscle === 'chest')).toEqual({
      muscle: 'chest',
      sets: 4,
      volumeKg: 1800,
    });
    expect(m.weeks[0]!.muscles).toEqual([]);
  });

  it('shows exercise progress and records', async () => {
    const { workoutId, detail, bench, get, annotate } = await setup();
    const [s1, s2] = detail.sets.map((s) => s.id);
    await annotate([s1!], { exerciseId: bench.id, weightKg: 60, reps: 10 });
    await annotate([s2!], { exerciseId: bench.id, weightKg: 80, reps: 3 });

    const p = exerciseProgressSchema.parse(await get(`/analytics/exercises/${bench.id}?${WEEK}`));
    expect(p.sessions).toHaveLength(1);
    expect(p.sessions[0]).toMatchObject({
      workoutId,
      date: '2026-10-17',
      workingSets: 2,
      maxWeightKg: 80,
      maxWeightReps: 3,
      volumeKg: 840,
    });
    expect(p.records.maxWeight).toEqual({
      valueKg: 80,
      reps: 3,
      workoutId,
      date: '2026-10-17',
    });
    expect(p.records.maxE1rm!.valueKg).toBeCloseTo(88, 6);

    const later = exerciseProgressSchema.parse(
      await get(`/analytics/exercises/${bench.id}?from=2026-10-18&to=2026-10-24`),
    );
    expect(later.sessions).toEqual([]);
    expect(later.records.maxWeight?.valueKg).toBe(80);

    const r = recordsResponseSchema.parse(await get('/analytics/records'));
    expect(r.items.map((i) => i.exerciseId)).toEqual([bench.id]);
    const before = recordsResponseSchema.parse(
      await get(`/analytics/records?before=${encodeURIComponent(detail.startedAt)}`),
    );
    expect(before.items).toEqual([]);

    const other = await registerUser(app, 'other@example.com');
    const theirs = await app.inject({
      method: 'GET',
      url: '/analytics/records',
      headers: other.headers,
    });
    expect(recordsResponseSchema.parse(theirs.json()).items).toEqual([]);
  });

  it('validates the period and the exercise', async () => {
    const { headers } = await registerUser(app);
    const bad = await app.inject({
      method: 'GET',
      url: '/analytics/overview?from=2026-10-17&to=2026-10-01',
      headers,
    });
    expect(bad.statusCode).toBe(400);
    const unknown = await app.inject({
      method: 'GET',
      url: `/analytics/exercises/00000000-0000-4000-8000-000000000000?${WEEK}`,
      headers,
    });
    expect(unknown.statusCode).toBe(404);
  });
});
