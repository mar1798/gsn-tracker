import type { UserSettings } from '@gsc/shared';

import {
  convertBodyWeight,
  previewZones,
  settingsForm,
  settingsFormSchema,
  toSettingsPatch,
  type SettingsFormValues,
} from './settings-form';

const DEFAULTS: UserSettings = { units: 'kg', hrMax: null, hrZones: null, bodyWeightKg: null };

const form = (patch: Partial<SettingsFormValues> = {}): SettingsFormValues => ({
  ...settingsForm(DEFAULTS),
  ...patch,
});
const errorsOf = (values: SettingsFormValues) => {
  const result = settingsFormSchema.safeParse(values);
  return result.success ? [] : result.error.issues.map((i) => i.message);
};

describe('settingsForm', () => {
  it('starts with zones from the watch', () => {
    expect(settingsForm(DEFAULTS)).toEqual({
      units: 'kg',
      bodyWeight: '',
      zonesMode: 'garmin',
      hrMax: '',
      zones: ['', '', '', '', ''],
    });
  });

  it('picks the zones mode from what is stored', () => {
    expect(settingsForm({ ...DEFAULTS, hrMax: 190 })).toMatchObject({
      zonesMode: 'max',
      hrMax: '190',
      zones: ['114', '133', '152', '171', '190'],
    });
    expect(settingsForm({ ...DEFAULTS, hrZones: [110, 130, 150, 170, 185] })).toMatchObject({
      zonesMode: 'custom',
      zones: ['110', '130', '150', '170', '185'],
    });
  });

  it('shows body weight in the chosen units', () => {
    expect(settingsForm({ ...DEFAULTS, units: 'lb', bodyWeightKg: 80 }).bodyWeight).toBe('176,4');
  });
});

describe('settingsFormSchema', () => {
  it('accepts an empty body weight and the watch zones', () => {
    expect(errorsOf(form())).toEqual([]);
  });

  it('checks body weight in the chosen units', () => {
    expect(errorsOf(form({ bodyWeight: '19' }))).toEqual(['Вес тела — от 20 до 400 кг']);
    expect(errorsOf(form({ bodyWeight: 'abc' }))).toHaveLength(1);
    expect(errorsOf(form({ units: 'lb', bodyWeight: '176,4' }))).toEqual([]);
    expect(errorsOf(form({ units: 'lb', bodyWeight: '900' }))).toEqual([
      'Вес тела — от 44,1 до 881,8 фнт',
    ]);
  });

  it('requires max HR only in that mode', () => {
    expect(errorsOf(form({ zonesMode: 'max' }))).toEqual([
      'Максимальный пульс — целое число от 100 до 250',
    ]);
    expect(errorsOf(form({ zonesMode: 'max', hrMax: '192' }))).toEqual([]);
    expect(errorsOf(form({ hrMax: 'abc' }))).toEqual([]);
  });

  it('requires five ascending bounds for own zones', () => {
    const zones = ['110', '130', '150', '170', '185'];
    expect(errorsOf(form({ zonesMode: 'custom', zones }))).toEqual([]);
    expect(
      errorsOf(form({ zonesMode: 'custom', zones: ['110', '', '150', '170', '185'] })),
    ).toEqual(['Границы зон — целые числа от 40 до 250']);
    expect(
      errorsOf(form({ zonesMode: 'custom', zones: ['110', '150', '130', '170', '185'] })),
    ).toEqual(['Границы зон должны возрастать']);
  });
});

describe('toSettingsPatch', () => {
  it('stores only what the zones mode needs', () => {
    const zones = ['110', '130', '150', '170', '185'];
    expect(toSettingsPatch(form({ hrMax: '190', zones }))).toEqual({
      units: 'kg',
      bodyWeightKg: null,
      hrMax: null,
      hrZones: null,
    });
    expect(toSettingsPatch(form({ zonesMode: 'max', hrMax: '190' }))).toMatchObject({
      hrMax: 190,
      hrZones: null,
    });
    expect(toSettingsPatch(form({ zonesMode: 'custom', hrMax: '190', zones }))).toMatchObject({
      hrMax: null,
      hrZones: [110, 130, 150, 170, 185],
    });
  });

  it('sends body weight in kg', () => {
    expect(toSettingsPatch(form({ units: 'lb', bodyWeight: '176,4' })).bodyWeightKg).toBe(80.014);
    expect(toSettingsPatch(form({ bodyWeight: '78,5' })).bodyWeightKg).toBe(78.5);
  });
});

describe('helpers', () => {
  it('converts typed body weight when units change', () => {
    expect(convertBodyWeight('80', 'kg', 'lb')).toBe('176,4');
    expect(convertBodyWeight('176,4', 'lb', 'kg')).toBe('80');
    expect(convertBodyWeight('', 'kg', 'lb')).toBe('');
    expect(convertBodyWeight('abc', 'kg', 'lb')).toBe('abc');
  });

  it('previews zones from max HR', () => {
    expect(previewZones('193')).toEqual([116, 135, 154, 174, 193]);
    expect(previewZones('')).toEqual([]);
    expect(previewZones('99')).toEqual([]);
  });
});
