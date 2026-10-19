// Prints every message type and field that @garmin/fitsdk decodes from a FIT file.
// Usage: pnpm fit:dump <file.fit> [mesgKey]
//   without mesgKey: summary of all message types (count, fields, value types, samples)
//   with mesgKey (e.g. setMesgs): every message of that type as JSON
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { DECODER_OPTIONS, decodeFit } from '../src/decode.js';

const MAX_SAMPLES = 6;

const [file, mesgKey] = process.argv.slice(2);
if (!file) {
  console.error('Usage: pnpm fit:dump <file.fit> [mesgKey]');
  process.exit(1);
}

// pnpm runs package scripts from the package dir; INIT_CWD is where the user typed the command.
const path = resolve(process.env.INIT_CWD ?? process.cwd(), file);
const { messages, errors, profileVersion } = decodeFit(readFileSync(path));

console.log(`file: ${path}`);
console.log(`profileVersion: ${JSON.stringify(profileVersion)}`);
console.log(`decoder options: ${JSON.stringify(DECODER_OPTIONS)}`);
if (errors.length > 0) console.log(`errors: ${errors.map((e) => e.message).join('; ')}`);

const entries = Object.entries(messages as Record<string, Record<string, unknown>[]>);

if (mesgKey) {
  const list = entries.find(([key]) => key === mesgKey)?.[1];
  if (!list) {
    console.error(`No ${mesgKey}. Available: ${entries.map(([key]) => key).join(', ')}`);
    process.exit(1);
  }
  console.log(JSON.stringify(list, null, 2));
  process.exit(0);
}

for (const [key, list] of entries) {
  console.log(`\n=== ${key} (${list.length})`);
  const fields = new Map<string, { types: Set<string>; samples: Set<string> }>();
  for (const mesg of list) {
    for (const [name, value] of Object.entries(mesg)) {
      const field = fields.get(name) ?? { types: new Set(), samples: new Set() };
      field.types.add(describeType(value));
      if (field.samples.size < MAX_SAMPLES) field.samples.add(JSON.stringify(value));
      fields.set(name, field);
    }
  }
  for (const [name, { types, samples }] of fields) {
    console.log(`  ${name}: ${[...types].join(' | ')}  e.g. ${[...samples].join(', ')}`);
  }
}

function describeType(value: unknown): string {
  if (value instanceof Date) return 'Date';
  if (Array.isArray(value)) return `${[...new Set(value.map(describeType))].join('|')}[]`;
  if (value === null) return 'null';
  return typeof value;
}
