import type { HrSample, HrStats } from './types.js';

/**
 * HR stats over the actual samples in `[fromMs, toMs]` (inclusive). Garmin smart recording
 * writes roughly every 2 s with gaps up to ~13 s, so no sampling rate is assumed.
 */
export function hrStatsInWindow(
  samples: readonly HrSample[],
  fromMs: number,
  toMs: number,
): HrStats {
  let sum = 0;
  let count = 0;
  let max = -Infinity;
  let min = Infinity;
  for (const { ts, bpm } of samples) {
    const t = ts.getTime();
    if (t < fromMs || t > toMs) continue;
    sum += bpm;
    count += 1;
    if (bpm > max) max = bpm;
    if (bpm < min) min = bpm;
  }
  if (count === 0) return { avg: null, max: null, min: null };
  return { avg: Math.round(sum / count), max, min };
}

export interface CalorieSegment {
  durationSec: number | null;
  avgHr: number | null;
}

/**
 * Splits session calories over segments proportionally to `duration × avg HR`.
 * Segments without HR use `fallbackHr` (session average); without any HR it is by duration.
 * Returns `null` per segment when there is nothing to split.
 */
export function distributeCalories(
  totalCalories: number | null,
  segments: readonly CalorieSegment[],
  fallbackHr: number | null,
): (number | null)[] {
  const weights = segments.map(({ durationSec, avgHr }) =>
    durationSec === null ? 0 : durationSec * (avgHr ?? fallbackHr ?? 1),
  );
  const totalWeight = weights.reduce((a, b) => a + b, 0);
  if (totalCalories === null || totalWeight === 0) return segments.map(() => null);
  return weights.map((w) => Math.round((totalCalories * w * 10) / totalWeight) / 10);
}
