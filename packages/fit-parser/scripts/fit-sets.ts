// Prints the parsed set table of a FIT file, to compare against Garmin Connect.
// Usage: pnpm fit:sets <file.fit>
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { parseFit } from '../src/index.js';
import { formatSetTable } from '../src/format.js';

const [file] = process.argv.slice(2);
if (!file) {
  console.error('Usage: pnpm fit:sets <file.fit>');
  process.exit(1);
}

// pnpm runs package scripts from the package dir; INIT_CWD is where the user typed the command.
const workout = parseFit(readFileSync(resolve(process.env.INIT_CWD ?? process.cwd(), file)));

const offset = workout.utcOffsetSec ?? 0;
console.log(
  `${workout.device.model ?? '?'} · ${workout.sport}/${workout.subSport} · ` +
    `start ${new Date(workout.startedAt.getTime() + offset * 1000).toISOString().slice(0, 19)} ` +
    `(UTC${offset >= 0 ? '+' : '-'}${Math.abs(offset) / 3600}) · ${workout.calories ?? '?'} kcal · ` +
    `HR avg ${workout.avgHr ?? '?'} / max ${workout.maxHr ?? '?'}`,
);
console.log(formatSetTable(workout));
