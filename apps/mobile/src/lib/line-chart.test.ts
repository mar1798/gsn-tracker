import { buildLineChart } from './line-chart';

describe('buildLineChart', () => {
  it('spreads points evenly and scales values into the padded height', () => {
    const g = buildLineChart(
      [
        { key: 'a', value: 100 },
        { key: 'b', value: 110 },
        { key: 'c', value: 120 },
      ],
      216,
      116,
    )!;
    expect(g.points.map((p) => p.x)).toEqual([8, 108, 208]);
    // Range 100..120 padded to 98..122: 120 sits below the top edge, 100 above the bottom.
    expect(g.points[2]!.y).toBeGreaterThan(8);
    expect(g.points[0]!.y).toBeLessThan(108);
    expect(g.points[1]!.y).toBeCloseTo(58, 6);
    expect(g.line).toBe('M8.0 99.7 L108.0 58.0 L208.0 16.3');
    expect(g.area.endsWith('L208.0 116 L8.0 116 Z')).toBe(true);
  });

  it('centres a single point and handles a flat line', () => {
    const one = buildLineChart([{ key: 'a', value: 80 }], 200, 100)!;
    expect(one.points[0]).toMatchObject({ x: 100 });
    const flat = buildLineChart(
      [
        { key: 'a', value: 80 },
        { key: 'b', value: 80 },
      ],
      200,
      100,
    )!;
    expect(flat.points[0]!.y).toBe(flat.points[1]!.y);
  });

  it('returns null without data or width', () => {
    expect(buildLineChart([], 200, 100)).toBeNull();
    expect(buildLineChart([{ key: 'a', value: 1 }], 0, 100)).toBeNull();
  });
});
