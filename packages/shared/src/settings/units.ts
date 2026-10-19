import type { UNITS } from '../api/auth.js';

// Weights are stored in kg everywhere (API, DB, analytics). Pounds exist only at the UI
// boundary: values are converted for display and converted back when the user types them.

export type Units = (typeof UNITS)[number];

/** International avoirdupois pound. */
export const KG_PER_LB = 0.45359237;

/** kg → the user's units, rounded to 0.1 for display and form fields. */
export function weightToUnits(kg: number, units: Units): number {
  const value = units === 'lb' ? kg / KG_PER_LB : kg;
  return Math.round(value * 10) / 10;
}

/**
 * A weight typed in the user's units → kg for storage. Rounded to 1 g: enough for
 * 135 lb to come back as 135 lb, and short enough to keep in a `real` column.
 */
export function weightFromUnits(value: number, units: Units): number {
  const kg = units === 'lb' ? value * KG_PER_LB : value;
  return Math.round(kg * 1000) / 1000;
}

/** Plate step for the −/+ buttons: 2.5 kg or 5 lb. */
export const weightStep = (units: Units) => (units === 'lb' ? 5 : 2.5);
