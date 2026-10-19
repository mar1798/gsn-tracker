import { describe, expect, it } from 'vitest';
import {
  csvField,
  csvText,
  EXPORT_SET_COLUMNS,
  formatUtcOffset,
  localDateTime,
  setsCsv,
  toCsv,
  type ExportSetRow,
} from './csv.js';

const garminSet = (over: Partial<ExportSetRow> = {}): ExportSetRow => ({
  workoutId: 'w1',
  workoutStartedAt: '2026-10-17T01:54:45.000Z',
  utcOffsetSec: 21600,
  workoutTitle: null,
  kind: 'garmin',
  orderIndex: 1,
  setStartedAt: '2026-10-17T01:56:00.000Z',
  exercise: 'Жим лёжа',
  weightKg: 60,
  reps: 10,
  repsSource: 'user',
  repsGarmin: 12,
  rpe: 8.5,
  isWarmup: false,
  isFailure: false,
  isExcluded: false,
  durationSec: 42.123,
  restAfterSec: 95,
  avgHr: 120,
  maxHr: 131,
  hrPeak: 149,
  caloriesEst: 5.678,
  note: null,
  ...over,
});

const lines = (csv: string) => csv.replace(/^\uFEFF/, '').trimEnd().split('\r\n');

describe('csv', () => {
  it('formats plain values', () => {
    expect(csvField(null)).toBe('');
    expect(csvField(true)).toBe('true');
    expect(csvField(62.5)).toBe('62.5');
    expect(csvField(Number.NaN)).toBe('');
    expect(csvField('Жим лёжа')).toBe('Жим лёжа');
  });

  it('quotes separators, quotes and line breaks', () => {
    expect(csvField('a, b')).toBe('"a, b"');
    expect(csvField('сказал "тяжело"')).toBe('"сказал ""тяжело"""');
    expect(csvField('две\nстроки')).toBe('"две\nстроки"');
  });

  it('neutralizes user text a spreadsheet would run as a formula', () => {
    expect(csvField(csvText('=HYPERLINK("x")'))).toBe(`"'=HYPERLINK(""x"")"`);
    expect(csvText('-5 кг')).toBe("'-5 кг");
    expect(csvText('+1')).toBe("'+1");
    expect(csvText('Жим')).toBe('Жим');
    expect(csvText(null)).toBeNull();
    const row = lines(setsCsv([garminSet({ note: '=1+1' })]))[1]!;
    expect(row.endsWith(",'=1+1")).toBe(true);
  });

  it('starts with a BOM and ends lines with CRLF', () => {
    const csv = toCsv(['a', 'b'], [[1, 'x']]);
    expect(csv).toBe('\uFEFFa,b\r\n1,x\r\n');
  });

  it('shows the time on the watch', () => {
    expect(localDateTime('2026-10-17T03:06:21.000Z', 21600)).toBe('2026-10-17 09:06:21');
    expect(localDateTime('2026-10-17T03:06:21.000Z', null)).toBe('2026-10-17 03:06:21');
    expect(formatUtcOffset(21600)).toBe('+06:00');
    expect(formatUtcOffset(-12600)).toBe('-03:30');
    expect(formatUtcOffset(null)).toBe('+00:00');
  });
});

describe('setsCsv', () => {
  it('writes the header and one row per set', () => {
    const [header, row] = lines(setsCsv([garminSet()]));
    expect(header).toBe(EXPORT_SET_COLUMNS.join(','));
    expect(row).toBe(
      'w1,2026-10-17 07:54:45,+06:00,,1,garmin,2026-10-17 07:56:00,Жим лёжа,60,10,user,12,8.5,' +
        'false,false,false,42.1,95,120,131,149,5.7,',
    );
  });

  it('leaves unknown values empty and numbers manual sets by the set they follow', () => {
    const manual = garminSet({
      kind: 'manual',
      orderIndex: 1,
      setStartedAt: null,
      exercise: null,
      weightKg: null,
      repsGarmin: null,
      durationSec: null,
      restAfterSec: null,
      avgHr: null,
      maxHr: null,
      hrPeak: null,
      caloriesEst: null,
      note: 'добивка',
    });
    const row = lines(setsCsv([manual]))[1]!.split(',');
    expect(row[EXPORT_SET_COLUMNS.indexOf('set_number')]).toBe('');
    expect(row[EXPORT_SET_COLUMNS.indexOf('set_source')]).toBe('manual');
    expect(row[EXPORT_SET_COLUMNS.indexOf('exercise')]).toBe('');
    expect(row.at(-1)).toBe('добивка');
  });

  it('orders by workout, then as on the workout screen', () => {
    const csv = setsCsv([
      garminSet({ workoutId: 'w2', workoutStartedAt: '2026-10-18T01:00:00.000Z', orderIndex: 1 }),
      garminSet({ kind: 'manual', orderIndex: 1, note: 'm1' }),
      garminSet({ orderIndex: 2 }),
      garminSet({ orderIndex: 1 }),
    ]);
    const order = lines(csv)
      .slice(1)
      .map((l) => {
        const cells = l.split(',');
        return `${cells[0]}:${cells[5]}:${cells[4] || cells.at(-1)}`;
      });
    expect(order).toEqual(['w1:garmin:1', 'w1:manual:m1', 'w1:garmin:2', 'w2:garmin:1']);
  });
});
