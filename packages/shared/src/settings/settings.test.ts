import { describe, expect, it } from 'vitest';
import { userSettingsPatchSchema } from '../api/auth.js';
import {
  hrZoneOf,
  resolveHrZones,
  weightFromUnits,
  weightStep,
  weightToUnits,
  zonesFromGarmin,
  zonesFromMaxHr,
} from './index.js';

// `hrZoneHighBoundary` of the fixture (Epix Pro Gen 2, max HR 193, "% of max HR").
const FIXTURE_BOUNDARIES = [97, 116, 135, 154, 174, 193];

describe('units', () => {
  it('keeps kg as is, rounded to 0.1', () => {
    expect(weightToUnits(62.5, 'kg')).toBe(62.5);
    expect(weightToUnits(61.234, 'kg')).toBe(61.2);
    expect(weightFromUnits(62.5, 'kg')).toBe(62.5);
  });

  it('converts pounds both ways', () => {
    expect(weightToUnits(100, 'lb')).toBe(220.5);
    expect(weightFromUnits(135, 'lb')).toBe(61.235);
  });

  it('brings a typed pound value back unchanged', () => {
    for (const lb of [5, 45, 135, 137.5, 225, 315, 405]) {
      expect(weightToUnits(weightFromUnits(lb, 'lb'), 'lb')).toBe(lb);
    }
  });

  it('steps by plates', () => {
    expect(weightStep('kg')).toBe(2.5);
    expect(weightStep('lb')).toBe(5);
  });
});

describe('HR zones', () => {
  it('derives zones from max HR like the watch', () => {
    expect(zonesFromMaxHr(193)).toEqual([116, 135, 154, 174, 193]);
  });

  it('drops zone 0 from Garmin boundaries', () => {
    expect(zonesFromGarmin(FIXTURE_BOUNDARIES)).toEqual([116, 135, 154, 174, 193]);
    expect(zonesFromGarmin([97, 116])).toBeNull();
    expect(zonesFromGarmin([0, 0, 0, 0, 0, 0])).toBeNull();
  });

  it('prefers custom zones, then max HR, then the watch', () => {
    const custom = [110, 130, 150, 170, 190];
    expect(resolveHrZones({ hrZones: custom, hrMax: 200 }, FIXTURE_BOUNDARIES)).toEqual({
      bounds: custom,
      source: 'custom',
    });
    expect(resolveHrZones({ hrZones: null, hrMax: 200 }, FIXTURE_BOUNDARIES)).toEqual({
      bounds: [120, 140, 160, 180, 200],
      source: 'max',
    });
    expect(resolveHrZones({ hrZones: null, hrMax: null }, FIXTURE_BOUNDARIES)).toEqual({
      bounds: [116, 135, 154, 174, 193],
      source: 'garmin',
    });
    expect(resolveHrZones({ hrZones: null, hrMax: null }, null)).toBeNull();
  });

  it('classifies bpm into zones 1–5', () => {
    const bounds = [116, 135, 154, 174, 193];
    expect(hrZoneOf(90, bounds)).toBe(1);
    expect(hrZoneOf(116, bounds)).toBe(1);
    expect(hrZoneOf(117, bounds)).toBe(2);
    expect(hrZoneOf(169, bounds)).toBe(4);
    expect(hrZoneOf(200, bounds)).toBe(5);
    expect(hrZoneOf(null, bounds)).toBeNull();
    expect(hrZoneOf(150, [])).toBeNull();
  });

  it('rejects zone bounds that do not ascend', () => {
    expect(userSettingsPatchSchema.safeParse({ hrZones: [110, 130, 150, 170, 190] }).success).toBe(
      true,
    );
    expect(userSettingsPatchSchema.safeParse({ hrZones: [110, 150, 130, 170, 190] }).success).toBe(
      false,
    );
  });
});
