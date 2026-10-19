import { decodeFit } from './decode.js';
import { normalizeWorkout } from './normalize.js';
import type { ParsedWorkout } from './types.js';

/** FIT file bytes → normalized strength workout. Throws `FitParseError` for unusable files. */
export function parseFit(data: Uint8Array): ParsedWorkout {
  return normalizeWorkout(decodeFit(data).messages);
}

export { FitParseError, type FitParseErrorCode } from './errors.js';
export { normalizeWorkout } from './normalize.js';
export * from './types.js';
