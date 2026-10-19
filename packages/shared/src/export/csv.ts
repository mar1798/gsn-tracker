// CSV export of the user's sets (`GET /export/csv`). RFC 4180: comma separator,
// CRLF line breaks, fields quoted when needed. A UTF-8 BOM lets Excel and Numbers
// read Cyrillic correctly. Numbers use a dot, weights are always kg.

export type CsvValue = string | number | boolean | null;

export function csvField(value: CsvValue): string {
  if (value === null) return '';
  if (typeof value === 'boolean') return value ? 'true' : 'false';
  if (typeof value === 'number') return Number.isFinite(value) ? String(value) : '';
  return /[",\r\n]/.test(value) ? `"${value.replaceAll('"', '""')}"` : value;
}

/** Cells that a spreadsheet would run as a formula (CSV injection). */
const FORMULA_START = /^[=+\-@\t\r]/;

/** Free text typed by the user: never let a spreadsheet run it as a formula. */
export const csvText = (value: string | null) =>
  value !== null && FORMULA_START.test(value) ? `'${value}` : value;

export function toCsv(header: readonly string[], rows: readonly (readonly CsvValue[])[]): string {
  const lines = [header, ...rows].map((row) => row.map(csvField).join(','));
  return `\uFEFF${lines.join('\r\n')}\r\n`;
}

/** "2026-10-17T03:06:21Z" at UTC+6 → "2026-10-17 09:06:21" (the time on the watch). */
export function localDateTime(iso: string, utcOffsetSec: number | null): string {
  const local = new Date(Date.parse(iso) + (utcOffsetSec ?? 0) * 1000);
  return local.toISOString().slice(0, 19).replace('T', ' ');
}

/** 21600 → "+06:00", -12600 → "-03:30". */
export function formatUtcOffset(utcOffsetSec: number | null): string {
  const sec = utcOffsetSec ?? 0;
  const abs = Math.abs(sec);
  const hh = String(Math.floor(abs / 3600)).padStart(2, '0');
  const mm = String(Math.floor((abs % 3600) / 60)).padStart(2, '0');
  return `${sec < 0 ? '-' : '+'}${hh}:${mm}`;
}

/** One exported set: effective values (`annotation ?? garmin`) plus raw watch data. */
export interface ExportSetRow {
  workoutId: string;
  workoutStartedAt: string;
  utcOffsetSec: number | null;
  workoutTitle: string | null;
  kind: 'garmin' | 'manual';
  /** Garmin set number; for a manual set, the Garmin set it follows. */
  orderIndex: number;
  setStartedAt: string | null;
  exercise: string | null;
  weightKg: number | null;
  reps: number | null;
  repsSource: 'user' | 'garmin' | null;
  repsGarmin: number | null;
  rpe: number | null;
  isWarmup: boolean;
  isFailure: boolean;
  isExcluded: boolean;
  durationSec: number | null;
  restAfterSec: number | null;
  avgHr: number | null;
  maxHr: number | null;
  hrPeak: number | null;
  caloriesEst: number | null;
  note: string | null;
}

export const EXPORT_SET_COLUMNS = [
  'workout_id',
  'workout_started_at',
  'utc_offset',
  'workout_title',
  'set_number',
  'set_source',
  'set_started_at',
  'exercise',
  'weight_kg',
  'reps',
  'reps_source',
  'reps_garmin',
  'rpe',
  'is_warmup',
  'is_failure',
  'is_excluded',
  'duration_sec',
  'rest_after_sec',
  'avg_hr',
  'max_hr',
  'hr_peak',
  'calories_est',
  'note',
] as const;

const round = (n: number | null, digits: number) =>
  n === null ? null : Math.round(n * 10 ** digits) / 10 ** digits;

/**
 * Rows in workout order: by workout start, then as on the workout screen
 * (a manual set placed at N goes right after Garmin set N). Times are local to the watch.
 */
export function setsCsv(rows: readonly ExportSetRow[]): string {
  const sorted = [...rows].sort(
    (a, b) =>
      Date.parse(a.workoutStartedAt) - Date.parse(b.workoutStartedAt) ||
      a.workoutId.localeCompare(b.workoutId) ||
      a.orderIndex - b.orderIndex ||
      (a.kind === b.kind ? 0 : a.kind === 'garmin' ? -1 : 1),
  );
  return toCsv(
    EXPORT_SET_COLUMNS,
    sorted.map((r) => [
      r.workoutId,
      localDateTime(r.workoutStartedAt, r.utcOffsetSec),
      formatUtcOffset(r.utcOffsetSec),
      csvText(r.workoutTitle),
      r.kind === 'garmin' ? r.orderIndex : null,
      r.kind,
      r.setStartedAt ? localDateTime(r.setStartedAt, r.utcOffsetSec) : null,
      csvText(r.exercise),
      round(r.weightKg, 3),
      r.reps,
      r.repsSource,
      r.repsGarmin,
      r.rpe,
      r.isWarmup,
      r.isFailure,
      r.isExcluded,
      round(r.durationSec, 1),
      round(r.restAfterSec, 1),
      r.avgHr,
      r.maxHr,
      r.hrPeak,
      round(r.caloriesEst, 1),
      csvText(r.note),
    ]),
  );
}
