// Calendar math on local dates ('YYYY-MM-DD'). A workout belongs to the date on the watch
// (UTC + `utcOffsetSec`), so periods do not depend on the phone's or server's time zone.

export type IsoDate = string;

export interface Period {
  from: IsoDate;
  /** Inclusive. */
  to: IsoDate;
}

const DAY_MS = 86_400_000;
const toMs = (date: IsoDate) => Date.parse(`${date}T00:00:00Z`);
const fromMs = (ms: number): IsoDate => new Date(ms).toISOString().slice(0, 10);

/** Local date of a workout on the watch. */
export const localDate = (startedAt: string, utcOffsetSec: number | null): IsoDate =>
  fromMs(Date.parse(startedAt) + (utcOffsetSec ?? 0) * 1000);

export const addDays = (date: IsoDate, days: number): IsoDate => fromMs(toMs(date) + days * DAY_MS);

/** Days in a period, both ends included. */
export const periodDays = ({ from, to }: Period) =>
  Math.round((toMs(to) - toMs(from)) / DAY_MS) + 1;

/** The same number of days right before the period: "compared with the previous period". */
export function previousPeriod(period: Period): Period {
  const days = periodDays(period);
  return { from: addDays(period.from, -days), to: addDays(period.from, -1) };
}

/** Monday of the date's week (ISO weeks). */
export function weekStart(date: IsoDate): IsoDate {
  const weekday = (new Date(toMs(date)).getUTCDay() + 6) % 7;
  return addDays(date, -weekday);
}

/** Mondays of every week touching the period. */
export function weekStarts({ from, to }: Period): IsoDate[] {
  const weeks: IsoDate[] = [];
  for (let w = weekStart(from); w <= to; w = addDays(w, 7)) weeks.push(w);
  return weeks;
}

export const PERIOD_PRESETS = { week: 7, month: 30, quarter: 91, year: 365 } as const;
export type PeriodPreset = keyof typeof PERIOD_PRESETS;

/** The last N days up to and including `today`. */
export const presetPeriod = (preset: PeriodPreset, today: IsoDate): Period => ({
  from: addDays(today, -(PERIOD_PRESETS[preset] - 1)),
  to: today,
});

export const inPeriod = (date: IsoDate, { from, to }: Period) => date >= from && date <= to;
