import type { WorkoutHrResponse, WorkoutSet } from '@gsc/shared';

// Geometry of the workout HR chart: a line over time with the sets as highlighted bands.

export type HrBand = {
  setId: string;
  x: number;
  width: number;
  suspicious: boolean;
  excluded: boolean;
};

export type HrChartGeometry = {
  /** SVG path of the HR line; empty without samples. */
  line: string;
  /** The line closed down to the baseline, for the translucent fill. */
  area: string;
  bands: HrBand[];
  minBpm: number | null;
  maxBpm: number | null;
  durationSec: number;
};

/** Bands thinner than this are widened so short sets stay visible. */
export const MIN_BAND_WIDTH = 3;

const round = (n: number) => Math.round(n * 10) / 10;

export function buildHrChart({
  hr,
  sets,
  durationSec,
  width,
  height,
}: {
  hr: Pick<WorkoutHrResponse, 'startedAt' | 'offsetsSec' | 'bpm'>;
  sets: readonly Pick<
    WorkoutSet,
    'id' | 'startedAt' | 'durationSec' | 'suspicious' | 'effective'
  >[];
  /** Workout length; falls back to the last HR sample. */
  durationSec: number | null;
  width: number;
  height: number;
}): HrChartGeometry {
  const start = Date.parse(hr.startedAt);
  const total = Math.max(durationSec ?? 0, hr.offsetsSec.at(-1) ?? 0, 1);
  const xOf = (sec: number) => (Math.min(Math.max(sec, 0), total) / total) * width;

  const minBpm = hr.bpm.length ? Math.min(...hr.bpm) : null;
  const maxBpm = hr.bpm.length ? Math.max(...hr.bpm) : null;

  let line = '';
  let area = '';
  if (minBpm !== null && maxBpm !== null) {
    // 10% headroom above and below so the line never touches the edges.
    const pad = Math.max((maxBpm - minBpm) * 0.1, 5);
    const lo = minBpm - pad;
    const hi = maxBpm + pad;
    const yOf = (bpm: number) => height - ((bpm - lo) / (hi - lo)) * height;
    const points = hr.offsetsSec.map((sec, i) => `${round(xOf(sec))},${round(yOf(hr.bpm[i]!))}`);
    line = `M${points.join('L')}`;
    const firstX = round(xOf(hr.offsetsSec[0]!));
    const lastX = round(xOf(hr.offsetsSec.at(-1)!));
    area = `${line}L${lastX},${height}L${firstX},${height}Z`;
  }

  const bands = sets.map((set) => {
    const offset = (Date.parse(set.startedAt) - start) / 1000;
    const x = xOf(offset);
    const raw = xOf(offset + (set.durationSec ?? 0)) - x;
    const bandWidth = Math.max(raw, MIN_BAND_WIDTH);
    return {
      setId: set.id,
      x: round(Math.min(x, width - bandWidth)),
      width: round(bandWidth),
      suspicious: set.suspicious !== null,
      excluded: set.effective.isExcluded,
    };
  });

  return { line, area, bands, minBpm, maxBpm, durationSec: total };
}

/** The set under a tap: the band containing `x`, else the nearest one (bands are thin). */
export function bandAt(bands: readonly HrBand[], x: number): HrBand | null {
  let best: HrBand | null = null;
  let bestDistance = Infinity;
  for (const band of bands) {
    const distance =
      x < band.x ? band.x - x : x > band.x + band.width ? x - band.x - band.width : 0;
    if (distance < bestDistance) {
      best = band;
      bestDistance = distance;
    }
  }
  return best;
}
