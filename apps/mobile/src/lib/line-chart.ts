// Geometry of the exercise progress chart (pure, unit-tested).

export interface LinePoint {
  key: string;
  value: number;
}

export interface LineGeometry {
  points: { key: string; x: number; y: number; value: number }[];
  line: string;
  area: string;
  min: number;
  max: number;
}

/**
 * Points spread evenly by index (one per workout), y scaled to the value range padded by 10 %
 * so the line never touches the edges. A single point sits in the middle.
 */
export function buildLineChart(
  data: readonly LinePoint[],
  width: number,
  height: number,
  pad = 8,
): LineGeometry | null {
  if (data.length === 0 || width <= 0) return null;
  const values = data.map((d) => d.value);
  const lo = Math.min(...values);
  const hi = Math.max(...values);
  const span = hi - lo || Math.max(hi, 1);
  const min = lo - span * 0.1;
  const max = hi + span * 0.1;
  const x = (i: number) =>
    data.length === 1 ? width / 2 : pad + (i * (width - 2 * pad)) / (data.length - 1);
  const y = (v: number) => pad + (1 - (v - min) / (max - min)) * (height - 2 * pad);

  const points = data.map((d, i) => ({ key: d.key, x: x(i), y: y(d.value), value: d.value }));
  const line = points
    .map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)} ${p.y.toFixed(1)}`)
    .join(' ');
  const first = points[0]!;
  const last = points.at(-1)!;
  const area = `${line} L${last.x.toFixed(1)} ${height} L${first.x.toFixed(1)} ${height} Z`;
  return { points, line, area, min, max };
}
