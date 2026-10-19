// Heart rate metrics. The watch records HR about every 2 s (gaps up to ~13 s), so values are
// taken from the actual samples, interpolating only across short gaps.

/** The set's HR peak is looked for up to this long after the set: HR peaks after the effort. */
export const HR_PEAK_WINDOW_AFTER_SEC = 30;
/** Recovery = drop of HR this long after the peak. */
export const HR_RECOVERY_AFTER_PEAK_SEC = 60;
/** Longest gap between samples to interpolate across. */
export const HR_MAX_GAP_SEC = 15;

/** Samples as parallel arrays; offsets are seconds from the workout start, ascending. */
export interface HrSeries {
  offsetsSec: readonly number[];
  bpm: readonly number[];
}

export interface SetTiming {
  /** Seconds from the workout start. */
  startSec: number;
  durationSec: number;
  /** Null for the last set: nothing interrupts the recovery. */
  restAfterSec: number | null;
}

/** HR at a moment: an exact sample or a linear interpolation across a short gap. */
export function bpmAt(hr: HrSeries, t: number): number | null {
  const { offsetsSec: ts, bpm } = hr;
  const hi = ts.findIndex((x) => x >= t);
  if (hi === -1) return null;
  if (ts[hi] === t) return bpm[hi]!;
  if (hi === 0) return null;
  const lo = hi - 1;
  const gap = ts[hi]! - ts[lo]!;
  if (gap > HR_MAX_GAP_SEC) return null;
  return bpm[lo]! + ((bpm[hi]! - bpm[lo]!) * (t - ts[lo]!)) / gap;
}

/**
 * How much HR dropped 60 s after the set's peak (peak looked for up to 30 s after the set).
 * Null when the next set started before that moment or the samples around it are missing.
 */
export function hrRecovery(hr: HrSeries, set: SetTiming): number | null {
  const end = set.startSec + set.durationSec;
  let peak: { t: number; bpm: number } | null = null;
  hr.offsetsSec.forEach((t, i) => {
    if (t < set.startSec || t > end + HR_PEAK_WINDOW_AFTER_SEC) return;
    if (!peak || hr.bpm[i]! > peak.bpm) peak = { t, bpm: hr.bpm[i]! };
  });
  if (!peak) return null;
  const { t: peakT, bpm: peakBpm } = peak as { t: number; bpm: number };

  const target = peakT + HR_RECOVERY_AFTER_PEAK_SEC;
  if (set.restAfterSec !== null && target > end + set.restAfterSec) return null;
  const after = bpmAt(hr, target);
  return after === null ? null : peakBpm - after;
}

/** Workout density: time under load / timer time (≈26 % in the Epix fixture). */
export function density(activeSec: number | null, timerSec: number | null): number | null {
  if (activeSec === null || timerSec === null || timerSec <= 0) return null;
  return activeSec / timerSec;
}

/** Garmin time in zones, summed index by index (zone 0 = below zone 1). */
export function sumZones(zones: readonly (readonly number[] | null)[]): number[] {
  const total: number[] = [];
  for (const z of zones) z?.forEach((sec, i) => (total[i] = (total[i] ?? 0) + sec));
  return total;
}
