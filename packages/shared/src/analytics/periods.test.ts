import { describe, expect, it } from 'vitest';
import {
  addDays,
  inPeriod,
  localDate,
  periodDays,
  presetPeriod,
  previousPeriod,
  weekStart,
  weekStarts,
} from './periods.js';

describe('periods', () => {
  it('takes the local date of the watch', () => {
    // 2026-10-17 21:30 UTC is already the 18th at UTC+6.
    expect(localDate('2026-10-17T21:30:00.000Z', 21600)).toBe('2026-10-18');
    expect(localDate('2026-10-17T21:30:00.000Z', null)).toBe('2026-10-17');
    expect(localDate('2026-10-17T01:00:00.000Z', -7200)).toBe('2026-10-16');
  });

  it('adds days across months and years', () => {
    expect(addDays('2026-12-30', 3)).toBe('2027-01-02');
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28');
  });

  it('finds Monday of the week', () => {
    expect(weekStart('2026-10-19')).toBe('2026-10-19'); // Monday
    expect(weekStart('2026-10-18')).toBe('2026-10-12'); // Sunday
    expect(weekStart('2026-10-17')).toBe('2026-10-12');
  });

  it('lists the weeks touching a period', () => {
    expect(weekStarts({ from: '2026-10-01', to: '2026-10-19' })).toEqual([
      '2026-09-28',
      '2026-10-05',
      '2026-10-12',
      '2026-10-19',
    ]);
  });

  it('builds presets and the previous period of the same length', () => {
    const month = presetPeriod('month', '2026-10-19');
    expect(month).toEqual({ from: '2026-09-20', to: '2026-10-19' });
    expect(periodDays(month)).toBe(30);
    expect(previousPeriod(month)).toEqual({ from: '2026-08-21', to: '2026-09-19' });
    expect(presetPeriod('week', '2026-10-19')).toEqual({ from: '2026-10-13', to: '2026-10-19' });
  });

  it('checks dates against a period, ends included', () => {
    const p = { from: '2026-10-01', to: '2026-10-31' };
    expect(inPeriod('2026-10-01', p)).toBe(true);
    expect(inPeriod('2026-10-31', p)).toBe(true);
    expect(inPeriod('2026-11-01', p)).toBe(false);
  });
});
