import {
  formatChange,
  formatDuration,
  formatNumber,
  formatPercent,
  formatRecord,
  formatShortDate,
  formatVolume,
  formatWeight,
  localToday,
  formatWorkoutDate,
  formatSetLoad,
  formatSetNumbers,
} from './format';

describe('formatDuration', () => {
  it.each([
    [4296, '1:11:36'],
    [1135, '18:55'],
    [59.6, '1:00'],
    [3600, '1:00:00'],
    [0, '0:00'],
  ])('%p → %p', (sec, expected) => {
    expect(formatDuration(sec)).toBe(expected);
  });

  it('shows a dash for missing values', () => {
    expect(formatDuration(null)).toBe('—');
    expect(formatDuration(-1)).toBe('—');
    expect(formatDuration(Number.NaN)).toBe('—');
  });
});

describe('formatWorkoutDate', () => {
  // The fixture workout: 2026-10-17 12:05 UTC, watch at UTC+6.
  const iso = '2026-10-17T12:05:00.000Z';

  it('shows the local time of the given zone', () => {
    expect(
      formatWorkoutDate(iso, { now: new Date('2026-10-19T00:00:00Z'), timeZone: 'Asia/Omsk' }),
    ).toBe('Сб, 17 окт · 18:05');
    expect(formatWorkoutDate(iso, { now: new Date('2026-10-19T00:00:00Z'), timeZone: 'UTC' })).toBe(
      'Сб, 17 окт · 12:05',
    );
  });

  it('adds the year for past years', () => {
    expect(
      formatWorkoutDate(iso, { now: new Date('2027-01-02T00:00:00Z'), timeZone: 'Asia/Omsk' }),
    ).toBe('Сб, 17 окт 2026 · 18:05');
  });
});

describe('formatNumber', () => {
  it('formats with a unit and a Russian decimal comma', () => {
    expect(formatNumber(802, 'ккал')).toBe('802 ккал');
    expect(formatNumber(78.25, 'кг')).toBe('78,3 кг');
    expect(formatNumber(null, 'уд/мин')).toBe('—');
  });
});

describe('formatSetLoad', () => {
  it('shows weight and reps when known', () => {
    expect(formatSetLoad(62.5, 8)).toBe('62,5 кг × 8');
    expect(formatSetLoad(60, null)).toBe('60 кг');
    expect(formatSetLoad(null, 12)).toBe('12 повт.');
    expect(formatSetLoad(null, null)).toBeNull();
  });

  it('shows the weight in pounds', () => {
    expect(formatSetLoad(61.235, 8, 'lb')).toBe('135 фнт × 8');
    expect(formatWeight(100, 'lb')).toBe('220,5 фнт');
    expect(formatWeight(62.5)).toBe('62,5 кг');
    expect(formatWeight(null, 'lb')).toBe('—');
  });
});

describe('formatSetNumbers', () => {
  it('collapses runs of three or more into ranges', () => {
    expect(formatSetNumbers([4, 1, 2, 3, 7])).toBe('1–4, 7');
    expect(formatSetNumbers([1, 2, 5])).toBe('1, 2, 5');
    expect(formatSetNumbers([3])).toBe('3');
    expect(formatSetNumbers([])).toBe('');
  });
});

describe('analytics formatting', () => {
  it('formats volume in kg or tonnes', () => {
    expect(formatVolume(850.4)).toBe('850 кг');
    expect(formatVolume(12_440)).toBe('12,4 т');
    expect(formatVolume(0)).toBe('0 кг');
    expect(formatVolume(null)).toBe('—');
  });

  it('formats volume in pounds', () => {
    expect(formatVolume(1000, 'lb')).toBe('2\u00a0205 фнт');
    expect(formatVolume(12_440, 'lb')).toBe('27,4 тыс. фнт');
  });

  it('formats shares and changes', () => {
    expect(formatPercent(0.264)).toBe('26 %');
    expect(formatPercent(null)).toBe('—');
    expect(formatChange(112, 100)).toEqual({ text: '+12 %', direction: 'up' });
    expect(formatChange(95, 100)).toEqual({ text: '−5 %', direction: 'down' });
    expect(formatChange(100, 100)).toEqual({ text: '0 %', direction: 'flat' });
    expect(formatChange(100, 0)).toBeNull();
    expect(formatChange(null, 100)).toBeNull();
  });

  it('formats dates', () => {
    expect(formatShortDate('2026-10-07')).toBe('7 окт');
    expect(localToday(new Date(2026, 0, 5, 23, 30))).toBe('2026-01-05');
  });
});

describe('formatRecord', () => {
  it('shows the heaviest set with reps and volumes in kg or tonnes', () => {
    expect(formatRecord('maxWeight', 80, 3)).toBe('80 кг × 3');
    expect(formatRecord('maxE1rm', 101.333, null)).toBe('101,3 кг');
    expect(formatRecord('maxWorkoutVolume', 1840, null)).toBe('1,8 т');
    expect(formatRecord('maxWeight', 102.058, 5, 'lb')).toBe('225 фнт × 5');
  });
});
