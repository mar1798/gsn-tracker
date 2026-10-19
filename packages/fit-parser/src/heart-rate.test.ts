import { describe, expect, it } from 'vitest';
import { distributeCalories, hrStatsInWindow } from './heart-rate.js';

const samples = [100, 120, 130, 90].map((bpm, i) => ({ ts: new Date(i * 2000), bpm }));

describe('hrStatsInWindow', () => {
  it('uses the actual samples inside the window, bounds inclusive', () => {
    expect(hrStatsInWindow(samples, 0, 4000)).toEqual({ avg: 117, max: 130, min: 100 });
  });

  it('returns nulls when the window has no samples', () => {
    expect(hrStatsInWindow(samples, 500, 1500)).toEqual({ avg: null, max: null, min: null });
    expect(hrStatsInWindow([], 0, 10_000)).toEqual({ avg: null, max: null, min: null });
  });
});

describe('distributeCalories', () => {
  it('splits proportionally to duration × avg HR', () => {
    const result = distributeCalories(
      100,
      [
        { durationSec: 10, avgHr: 150 },
        { durationSec: 10, avgHr: 50 },
      ],
      null,
    );
    expect(result).toEqual([75, 25]);
  });

  it('uses the fallback HR for segments without HR', () => {
    const result = distributeCalories(
      90,
      [
        { durationSec: 10, avgHr: null },
        { durationSec: 10, avgHr: 200 },
      ],
      100,
    );
    expect(result).toEqual([30, 60]);
  });

  it('splits by duration when there is no HR at all', () => {
    const result = distributeCalories(
      30,
      [
        { durationSec: 10, avgHr: null },
        { durationSec: 20, avgHr: null },
      ],
      null,
    );
    expect(result).toEqual([10, 20]);
  });

  it('gives zero to segments without duration', () => {
    expect(
      distributeCalories(
        10,
        [
          { durationSec: null, avgHr: 100 },
          { durationSec: 5, avgHr: 100 },
        ],
        null,
      ),
    ).toEqual([0, 10]);
  });

  it('returns nulls without total calories or any duration', () => {
    expect(distributeCalories(null, [{ durationSec: 10, avgHr: 100 }], null)).toEqual([null]);
    expect(distributeCalories(10, [{ durationSec: null, avgHr: 100 }], null)).toEqual([null]);
  });
});
