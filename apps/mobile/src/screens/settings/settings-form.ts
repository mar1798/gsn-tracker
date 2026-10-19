import {
  HR_ZONE_COUNT,
  isAscending,
  weightFromUnits,
  zonesFromMaxHr,
  type Units,
  type UserSettings,
  type UserSettingsPatch,
} from '@gsc/shared';
import { z } from 'zod';

import { weightUnitLabel } from '@/lib/format';
import { parseDecimal, weightText } from '@/screens/set-editor/set-form';

// Settings form: numbers stay strings while typing, body weight is in the chosen units.
// Zones: from the watch (nothing stored), from max HR (`hrMax`) or own bounds (`hrZones`),
// in the order `resolveHrZones` prefers them.

export type ZonesMode = 'garmin' | 'max' | 'custom';

export type SettingsFormValues = {
  units: Units;
  bodyWeight: string;
  zonesMode: ZonesMode;
  hrMax: string;
  /** Upper bounds of zones 1–5. */
  zones: string[];
};

/** The API range of body weight (20–400 kg) in the chosen units. */
const BODY_WEIGHT_KG = { min: 20, max: 400 };
const HR = { min: 100, max: 250 };
const ZONE = { min: 40, max: 250 };

const intIn = (text: string, min: number, max: number) => {
  const n = parseDecimal(text);
  return n !== null && Number.isInteger(n) && n >= min && n <= max;
};

export function settingsForm(settings: UserSettings): SettingsFormValues {
  const zonesMode: ZonesMode = settings.hrZones ? 'custom' : settings.hrMax ? 'max' : 'garmin';
  const zones = settings.hrZones ?? (settings.hrMax ? zonesFromMaxHr(settings.hrMax) : []);
  return {
    units: settings.units,
    bodyWeight: weightText(settings.bodyWeightKg, settings.units),
    zonesMode,
    hrMax: settings.hrMax ? String(settings.hrMax) : '',
    zones: Array.from({ length: HR_ZONE_COUNT }, (_, i) =>
      zones[i] === undefined ? '' : String(zones[i]),
    ),
  };
}

/** Switching units converts the typed body weight, so 80 kg becomes 176,4 lb. */
export function convertBodyWeight(text: string, from: Units, to: Units): string {
  const value = parseDecimal(text);
  if (value === null || !Number.isFinite(value) || from === to) return text;
  return weightText(weightFromUnits(value, from), to);
}

export const settingsFormSchema = z
  .object({
    units: z.enum(['kg', 'lb']),
    bodyWeight: z.string(),
    zonesMode: z.enum(['garmin', 'max', 'custom']),
    hrMax: z.string(),
    zones: z.array(z.string()).length(HR_ZONE_COUNT),
  })
  .superRefine((v, ctx) => {
    const weight = parseDecimal(v.bodyWeight);
    if (weight !== null) {
      const kg = Number.isFinite(weight) ? weightFromUnits(weight, v.units) : NaN;
      if (!(kg >= BODY_WEIGHT_KG.min && kg <= BODY_WEIGHT_KG.max)) {
        const min = weightText(BODY_WEIGHT_KG.min, v.units);
        const max = weightText(BODY_WEIGHT_KG.max, v.units);
        ctx.addIssue({
          code: 'custom',
          path: ['bodyWeight'],
          message: `Вес тела — от ${min} до ${max} ${weightUnitLabel(v.units)}`,
        });
      }
    }
    if (v.zonesMode === 'max' && !intIn(v.hrMax, HR.min, HR.max)) {
      ctx.addIssue({
        code: 'custom',
        path: ['hrMax'],
        message: `Максимальный пульс — целое число от ${HR.min} до ${HR.max}`,
      });
    }
    if (v.zonesMode === 'custom') {
      if (!v.zones.every((z) => intIn(z, ZONE.min, ZONE.max))) {
        ctx.addIssue({
          code: 'custom',
          path: ['zones'],
          message: `Границы зон — целые числа от ${ZONE.min} до ${ZONE.max}`,
        });
      } else if (!isAscending(v.zones.map(Number))) {
        ctx.addIssue({ code: 'custom', path: ['zones'], message: 'Границы зон должны возрастать' });
      }
    }
  });

/** The whole settings object: every field is sent, the form shows all of them. */
export function toSettingsPatch(v: SettingsFormValues): Required<UserSettingsPatch> {
  const weight = parseDecimal(v.bodyWeight);
  return {
    units: v.units,
    bodyWeightKg: weight === null ? null : weightFromUnits(weight, v.units),
    hrMax: v.zonesMode === 'max' ? Number(v.hrMax) : null,
    hrZones: v.zonesMode === 'custom' ? v.zones.map(Number) : null,
  };
}

/** Zone bounds shown in "от макс. пульса" mode; empty while max HR is not valid. */
export function previewZones(hrMax: string): number[] {
  return intIn(hrMax, HR.min, HR.max) ? zonesFromMaxHr(Number(hrMax)) : [];
}
