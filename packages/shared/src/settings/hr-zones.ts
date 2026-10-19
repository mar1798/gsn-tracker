import type { UserSettings } from '../api/auth.js';

// HR zones 1–5 as five ascending upper bounds (bpm), the same shape as `UserSettings.hrZones`.
// Time in zones always comes from Garmin (`time_in_zone`); these bounds only classify
// a bpm value, e.g. the zone of a set's peak HR.

export const HR_ZONE_COUNT = 5;

/** Upper bounds of zones 1–5 as a share of max HR (Garmin's default "% of max HR"). */
export const HR_ZONE_MAX_SHARES = [0.6, 0.7, 0.8, 0.9, 1] as const;

/** 193 → [116, 135, 154, 174, 193], as the watch computes them. */
export function zonesFromMaxHr(hrMax: number): number[] {
  return HR_ZONE_MAX_SHARES.map((share) => Math.round(hrMax * share));
}

/**
 * Bounds of zones 1–5 from Garmin's `hrZoneHighBoundary`, which also has the top of
 * "zone 0" first: [97, 116, 135, 154, 174, 193] → [116, 135, 154, 174, 193].
 */
export function zonesFromGarmin(highBoundaries: readonly number[]): number[] | null {
  if (highBoundaries.length < HR_ZONE_COUNT + 1) return null;
  const bounds = highBoundaries.slice(1, HR_ZONE_COUNT + 1);
  return isAscending(bounds) ? bounds : null;
}

export type HrZonesSource = 'custom' | 'max' | 'garmin';

/**
 * Which bounds apply: the user's own zones, else zones from their max HR,
 * else the zones the watch recorded with the workout.
 */
export function resolveHrZones(
  settings: Pick<UserSettings, 'hrZones' | 'hrMax'>,
  garminHighBoundaries: readonly number[] | null,
): { bounds: number[]; source: HrZonesSource } | null {
  if (settings.hrZones) return { bounds: [...settings.hrZones], source: 'custom' };
  if (settings.hrMax) return { bounds: zonesFromMaxHr(settings.hrMax), source: 'max' };
  const garmin = garminHighBoundaries ? zonesFromGarmin(garminHighBoundaries) : null;
  return garmin ? { bounds: garmin, source: 'garmin' } : null;
}

/** Zone 1–5 of a bpm value; below zone 1 counts as zone 1, above the last bound as zone 5. */
export function hrZoneOf(bpm: number | null, bounds: readonly number[]): number | null {
  if (bpm === null || bounds.length === 0) return null;
  const index = bounds.findIndex((upper) => bpm <= upper);
  return index === -1 ? bounds.length : index + 1;
}

export function isAscending(values: readonly number[]): boolean {
  return values.every((v, i) => i === 0 || v > values[i - 1]!);
}
