import { garminSet } from '@/test/fixtures';

import { bandAt, buildHrChart, MIN_BAND_WIDTH } from './hr-chart';

// Workout fixture starts at 12:05:00; set n starts n minutes later and lasts 40 s.
const hr = {
  startedAt: '2026-10-17T12:05:00.000Z',
  offsetsSec: [0, 60, 120, 600],
  bpm: [100, 150, 120, 100],
};

describe('buildHrChart', () => {
  const chart = buildHrChart({
    hr,
    sets: [garminSet(1), garminSet(2, { suspicious: 'too_short', durationSec: 1 })],
    durationSec: 600,
    width: 600,
    height: 100,
  });

  it('maps time to x over the whole workout and puts the max bpm near the top', () => {
    expect(chart.line.startsWith('M0,')).toBe(true);
    expect(chart.line).toContain('L60,8.3');
    expect(chart.minBpm).toBe(100);
    expect(chart.maxBpm).toBe(150);
    expect(chart.area.endsWith('L600,100L0,100Z')).toBe(true);
  });

  it('places sets as bands and widens very short ones', () => {
    expect(chart.bands[0]).toMatchObject({ x: 60, width: 40, suspicious: false, excluded: false });
    expect(chart.bands[1]).toMatchObject({ x: 120, width: MIN_BAND_WIDTH, suspicious: true });
  });

  it('draws nothing without HR samples but still shows the sets', () => {
    const empty = buildHrChart({
      hr: { ...hr, offsetsSec: [], bpm: [] },
      sets: [garminSet(1)],
      durationSec: 600,
      width: 600,
      height: 100,
    });
    expect(empty.line).toBe('');
    expect(empty.maxBpm).toBeNull();
    expect(empty.bands).toHaveLength(1);
  });
});

describe('bandAt', () => {
  const bands = [
    { setId: 'a', x: 10, width: 5, suspicious: false, excluded: false },
    { setId: 'b', x: 50, width: 5, suspicious: false, excluded: false },
  ];

  it('returns the band under the tap, else the nearest one', () => {
    expect(bandAt(bands, 12)?.setId).toBe('a');
    expect(bandAt(bands, 40)?.setId).toBe('b');
    expect(bandAt(bands, 0)?.setId).toBe('a');
    expect(bandAt([], 10)).toBeNull();
  });
});
