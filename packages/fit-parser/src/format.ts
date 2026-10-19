import type { ParsedWorkout } from './types.js';

const COLUMNS = [
  '#',
  'time',
  'dur',
  'rest',
  'reps',
  'avg',
  'max',
  'min',
  'peak',
  'kcal',
  'hints',
  'flag',
];

/** Plain-text set table (local time) for the `fit:sets` script and the fixture snapshot. */
export function formatSetTable(workout: ParsedWorkout): string {
  const offsetMs = (workout.utcOffsetSec ?? 0) * 1000;
  const rows = workout.sets.map((s) => [
    String(s.setIndex),
    new Date(s.startedAt.getTime() + offsetMs).toISOString().slice(11, 19),
    fmt(s.durationSec),
    fmt(s.restAfterSec),
    fmt(s.repsGarmin),
    fmt(s.avg),
    fmt(s.max),
    fmt(s.min),
    fmt(s.hrPeak),
    fmt(s.caloriesEst),
    s.garminHints.map((h) => h.exerciseName ?? h.category).join(', '),
    s.suspicious ?? '',
  ]);
  const table = [COLUMNS, ...rows];
  const widths = COLUMNS.map((_, c) => Math.max(...table.map((row) => row[c]!.length)));
  return table
    .map((row) =>
      row
        .map((cell, c) =>
          c >= COLUMNS.length - 2 ? cell.padEnd(widths[c]!) : cell.padStart(widths[c]!),
        )
        .join('  ')
        .trimEnd(),
    )
    .join('\n');
}

function fmt(value: number | null): string {
  if (value === null) return '-';
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}
