import { describe, expect, it } from 'vitest';
import { bpmAt, density, hrRecovery, sumZones } from './hr.js';

// A set from 0 to 40 s: HR climbs to 160 at 50 s (after the set), then falls.
const hr = {
  offsetsSec: [0, 20, 40, 50, 60, 100, 110, 112, 150],
  bpm: [100, 130, 150, 160, 155, 125, 120, 119, 100],
};

describe('bpmAt', () => {
  it('returns a sample or interpolates across a short gap', () => {
    expect(bpmAt(hr, 50)).toBe(160);
    expect(bpmAt(hr, 45)).toBe(155);
    expect(bpmAt(hr, 111)).toBe(119.5);
  });

  it('refuses long gaps and moments outside the samples', () => {
    expect(bpmAt(hr, 80)).toBeNull();
    expect(bpmAt(hr, 200)).toBeNull();
    expect(bpmAt({ offsetsSec: [10], bpm: [100] }, 5)).toBeNull();
  });
});

describe('hrRecovery', () => {
  it('is the drop 60 s after the peak, the peak looked for up to 30 s after the set', () => {
    expect(hrRecovery(hr, { startSec: 0, durationSec: 40, restAfterSec: 90 })).toBe(160 - 120);
  });

  it('is unknown when the next set starts before that moment', () => {
    expect(hrRecovery(hr, { startSec: 0, durationSec: 40, restAfterSec: 60 })).toBeNull();
  });

  it('works for the last set and needs samples', () => {
    expect(hrRecovery(hr, { startSec: 0, durationSec: 40, restAfterSec: null })).toBe(40);
    expect(hrRecovery(hr, { startSec: 300, durationSec: 40, restAfterSec: null })).toBeNull();
    // Peak 155 at 60 s; around 120 s the samples are 112 and 150 s apart: too long a gap.
    expect(hrRecovery(hr, { startSec: 55, durationSec: 5, restAfterSec: null })).toBeNull();
  });
});

describe('density', () => {
  it('is active / timer time', () => {
    expect(density(1135, 4296)).toBeCloseTo(0.264, 3);
    expect(density(null, 4296)).toBeNull();
    expect(density(100, 0)).toBeNull();
  });
});

describe('sumZones', () => {
  it('adds zone seconds index by index, skipping workouts without zones', () => {
    expect(sumZones([[0, 10, 20], null, [5, 5, 5, 5]])).toEqual([5, 15, 25, 5]);
    expect(sumZones([])).toEqual([]);
  });
});
