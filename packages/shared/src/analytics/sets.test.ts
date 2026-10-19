import { describe, expect, it } from 'vitest';
import {
  epley1rm,
  isCountedSet,
  isHrSet,
  setLoadKg,
  weightedSet,
  type AnalyticsSet,
} from './sets.js';
import { BARBELL, PULL_UP, set } from './test-data.js';

describe('setLoadKg', () => {
  it('uses the entered weight; 0 or empty means not entered', () => {
    expect(setLoadKg({ weightKg: 60 }, BARBELL, 80)).toBe(60);
    expect(setLoadKg({ weightKg: 0 }, BARBELL, 80)).toBeNull();
    expect(setLoadKg({ weightKg: null }, BARBELL, 80)).toBeNull();
  });

  it('adds body weight for bodyweight exercises', () => {
    expect(setLoadKg({ weightKg: null }, PULL_UP, 78)).toBe(78);
    expect(setLoadKg({ weightKg: 10 }, PULL_UP, 78)).toBe(88);
    expect(setLoadKg({ weightKg: 10 }, PULL_UP, null)).toBeNull();
  });
});

describe('set classification', () => {
  it('counts sets with an exercise that are not warm-ups or excluded', () => {
    expect(isCountedSet(set())).toBe(true);
    expect(isCountedSet(set({ exerciseId: null }))).toBe(false);
    expect(isCountedSet(set({ isWarmup: true }))).toBe(false);
    expect(isCountedSet(set({ isExcluded: true }))).toBe(false);
  });

  it('uses sets without an exercise for HR', () => {
    expect(isHrSet(set({ exerciseId: null }))).toBe(true);
    expect(isHrSet(set({ isWarmup: true }))).toBe(false);
  });
});

describe('weightedSet', () => {
  const ex = new Map([[BARBELL.id, BARBELL]]);
  const weighted = (s: AnalyticsSet) => weightedSet(s, ex.get(s.exerciseId ?? ''), 78);

  it('needs user reps and a load', () => {
    expect(weighted(set())).toEqual({ loadKg: 60, reps: 10 });
    expect(weighted(set({ repsSource: 'garmin' }))).toBeNull();
    expect(weighted(set({ reps: 0 }))).toBeNull();
    expect(weighted(set({ weightKg: null }))).toBeNull();
    expect(weighted(set({ isWarmup: true }))).toBeNull();
    expect(weighted(set({ exerciseId: 'unknown' }))).toBeNull();
  });
});

describe('epley1rm', () => {
  it('is w × (1 + reps / 30) for 1..12 reps', () => {
    expect(epley1rm(100, 10)).toBeCloseTo(133.33, 2);
    expect(epley1rm(100, 1)).toBeCloseTo(103.33, 2);
    expect(epley1rm(100, 12)).toBe(140);
    expect(epley1rm(100, 13)).toBeNull();
    expect(epley1rm(100, 0)).toBeNull();
    expect(epley1rm(0, 5)).toBeNull();
  });
});
