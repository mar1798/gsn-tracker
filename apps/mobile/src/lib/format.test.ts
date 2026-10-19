import { formatDuration, formatNumber, formatWorkoutDate } from './format';

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
