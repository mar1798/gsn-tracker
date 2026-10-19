import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { formatSetTable } from './format.js';
import { FitParseError, parseFit } from './index.js';

const FIXTURES = new URL('../../../fixtures/fit/', import.meta.url);
const NAME = '2026-10-17_strength_epix2pro';

interface ExpectedSet {
  n: number;
  startTime: string;
  durationSec: number;
  repetitions: number;
  category: string[];
  categorySubtype: (number | null)[] | null;
}

const bytes = readFileSync(new URL(`${NAME}.fit`, FIXTURES));
const expected = JSON.parse(readFileSync(new URL(`${NAME}.expected.json`, FIXTURES), 'utf8')) as {
  device: string;
  sport: string;
  subSport: string;
  utcOffsetSec: number;
  session: Record<string, number | string>;
  counts: { activeSets: number; totalReps: number; recordMesgsWithHr: number };
  suspiciousShortSetIndexes: number[];
  allWeightsZero: boolean;
  activeSets: ExpectedSet[];
};

describe(`real fixture ${NAME}`, () => {
  const workout = parseFit(bytes);

  it('matches session values', () => {
    expect(workout).toMatchObject({
      sport: expected.sport,
      subSport: expected.subSport,
      utcOffsetSec: expected.utcOffsetSec,
      startedAt: new Date(expected.session.startTime!),
      timerSec: expected.session.totalTimerTimeSec,
      activeSec: expected.session.activeTimeSec,
      calories: expected.session.totalCalories,
      avgHr: expected.session.avgHeartRate,
      maxHr: expected.session.maxHeartRate,
      totalRepsGarmin: expected.counts.totalReps,
      garminActivityId: null,
      device: { manufacturer: 'garmin', model: expected.device, serialNumber: 3497698615 },
      bodyWeightKg: 78,
      heightM: 1.78,
    });
  });

  it('matches counts', () => {
    expect(workout.sets).toHaveLength(expected.counts.activeSets);
    expect(workout.sets.reduce((sum, s) => sum + (s.repsGarmin ?? 0), 0)).toBe(
      expected.counts.totalReps,
    );
    expect(workout.hrSamples).toHaveLength(expected.counts.recordMesgsWithHr);
  });

  it('matches every active set', () => {
    workout.sets.forEach((set, i) => {
      const exp = expected.activeSets[i]!;
      expect(set.setIndex).toBe(exp.n);
      expect(set.startedAt.toISOString()).toBe(exp.startTime);
      expect(set.durationSec).toBeCloseTo(exp.durationSec, 1);
      expect(set.repsGarmin).toBe(exp.repetitions);

      const expectedHints = exp.category
        .map((category, j) => ({ category, subtype: exp.categorySubtype?.[j] ?? null }))
        .filter((h) => h.category !== 'unknown');
      expect(set.garminHints.map(({ category, subtype }) => ({ category, subtype }))).toEqual(
        expectedHints,
      );
    });
  });

  it('flags the double-press sets as suspicious', () => {
    const flagged = workout.sets.filter((s) => s.suspicious === 'too_short').map((s) => s.setIndex);
    expect(flagged).toEqual(expected.suspiciousShortSetIndexes);
  });

  it('turns the always-zero weight into null', () => {
    expect(expected.allWeightsZero).toBe(true);
    expect(workout.sets.every((s) => s.weightGarminKg === null)).toBe(true);
  });

  it('active set durations add up to session active time', () => {
    const total = workout.sets.reduce((sum, s) => sum + (s.durationSec ?? 0), 0);
    expect(total).toBeCloseTo(workout.activeSec!, 3);
  });

  it('every set has rest after it (sets and rests alternate)', () => {
    expect(workout.sets.every((s) => s.restAfterSec !== null && s.restAfterSec > 0)).toBe(true);
    expect(workout.sets.at(-1)!.restAfterSec).toBeCloseTo(17.872, 3);
  });

  it('hrPeak catches the HR peak after the set ends (set 10: 149 → 169)', () => {
    const set10 = workout.sets[9]!;
    expect(set10.max).toBe(149);
    expect(set10.hrPeak).toBe(169);
    expect(workout.sets.every((s) => s.hrPeak! >= s.max!)).toBe(true);
  });

  it('estimated set calories stay within the session total', () => {
    const total = workout.sets.reduce((sum, s) => sum + (s.caloriesEst ?? 0), 0);
    expect(total).toBeGreaterThan(0);
    expect(total).toBeLessThan(workout.calories!);
  });

  it('keeps the session HR zones as given by the watch', () => {
    expect(workout.hrZones).toEqual({
      calcType: 'percentMaxHr',
      highBoundaries: [97, 116, 135, 154, 174, 193],
      secondsInZone: [0, 231.386, 1453.226, 2060.718, 529.565, 0, 0],
    });
  });

  it('resolves the subtype into an exercise name', () => {
    expect(workout.sets[20]!.garminHints[1]).toEqual({
      category: 'lateralRaise',
      subtype: 25,
      exerciseName: 'seatedRearLateralRaise',
      label: 'Seated rear lateral raise',
    });
  });

  it('set table snapshot', () => {
    expect(formatSetTable(workout)).toMatchSnapshot();
  });
});

describe('parseFit errors', () => {
  it('rejects non-FIT bytes', () => {
    expect(() => parseFit(new TextEncoder().encode('definitely not a fit file'))).toThrow(
      expect.objectContaining({ name: 'FitParseError', code: 'not_fit' }),
    );
  });

  it('rejects a file with a broken CRC', () => {
    const broken = new Uint8Array(bytes);
    broken[Math.floor(broken.length / 2)]! ^= 0xff;
    expect(() => parseFit(broken)).toThrow(FitParseError);
    expect(() => parseFit(broken)).toThrow(expect.objectContaining({ code: 'corrupted' }));
  });
});
