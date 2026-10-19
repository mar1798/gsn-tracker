import { garminSet } from '@/test/fixtures';

import {
  EMPTY_FORM,
  garminSetForm,
  manualSetForm,
  parseDecimal,
  setFormSchema,
  toAnnotationInput,
  toBulkPatch,
  toCarryOverPatch,
  toManualSetValues,
  weightText,
} from './set-form';

const EXERCISE = '00000000-0000-4000-8000-0000000000e1';

describe('parseDecimal', () => {
  it('accepts a decimal comma and empty input', () => {
    expect(parseDecimal('62,5')).toBe(62.5);
    expect(parseDecimal(' 80 ')).toBe(80);
    expect(parseDecimal('')).toBeNull();
    expect(parseDecimal('1e3')).toBeNaN();
    expect(parseDecimal('-5')).toBeNaN();
  });
});

describe('setFormSchema', () => {
  const check = (patch: object) =>
    setFormSchema('kg').safeParse({ ...EMPTY_FORM, ...patch }).success;

  it('validates weight and reps ranges', () => {
    expect(check({ weight: '62,5', reps: '12' })).toBe(true);
    expect(check({ weight: '1001' })).toBe(false);
    expect(check({ reps: '8,5' })).toBe(false);
    expect(check({ weight: 'abc' })).toBe(false);
  });

  it('allows up to the same 1000 kg in pounds', () => {
    const lb = (weight: string) => setFormSchema('lb').safeParse({ ...EMPTY_FORM, weight }).success;
    expect(lb('2200')).toBe(true);
    expect(lb('2201')).toBe(false);
  });
});

describe('garminSetForm', () => {
  it('pre-fills reps from the watch when there is no annotation', () => {
    expect(garminSetForm(garminSet(1))).toMatchObject({ exerciseId: null, weight: '', reps: '10' });
  });

  it('takes the user layer when present', () => {
    const set = garminSet(1, {
      annotation: {
        exerciseId: EXERCISE,
        weightKg: 62.5,
        reps: 8,
        rpe: 8.5,
        isWarmup: true,
        isFailure: false,
        isExcluded: false,
        note: 'тяжело',
        updatedAt: '2026-10-19T10:00:00.000Z',
      },
    });
    expect(garminSetForm(set)).toMatchObject({
      exerciseId: EXERCISE,
      weight: '62,5',
      reps: '8',
      rpe: 8.5,
      isWarmup: true,
      note: 'тяжело',
    });
  });
});

describe('payloads', () => {
  const values = {
    ...EMPTY_FORM,
    exerciseId: EXERCISE,
    weight: '60',
    reps: '12',
    note: '  ',
  };

  it('PUT sends every field, the confirmed reps included', () => {
    expect(toAnnotationInput(values)).toEqual({
      exerciseId: EXERCISE,
      weightKg: 60,
      reps: 12,
      rpe: null,
      isWarmup: false,
      isFailure: false,
      isExcluded: false,
      note: null,
    });
  });

  it('bulk patch contains only touched, non-empty fields', () => {
    expect(toBulkPatch(values, { exerciseId: true, weight: true })).toEqual({
      exerciseId: EXERCISE,
      weightKg: 60,
    });
    expect(toBulkPatch({ ...values, weight: '' }, { weight: true, isExcluded: true })).toEqual({
      isExcluded: false,
    });
  });

  it('carries over the exercise, and the weight when set', () => {
    expect(toCarryOverPatch(values)).toEqual({ exerciseId: EXERCISE, weightKg: 60 });
    expect(toCarryOverPatch({ ...values, weight: '' })).toEqual({ exerciseId: EXERCISE });
  });

  it('manual set values round-trip through the form', () => {
    const manual = {
      id: EXERCISE,
      orderIndex: 3,
      exerciseId: EXERCISE,
      weightKg: 20,
      reps: 15,
      rpe: 7,
      isWarmup: false,
      isFailure: true,
      note: null,
    };
    const { id: _, orderIndex: __, ...rest } = manual;
    expect(toManualSetValues(manualSetForm(manual))).toEqual(rest);
    expect(manualSetForm(undefined)).toEqual(EMPTY_FORM);
  });

  it('types pounds and sends kg', () => {
    const lb = { ...values, weight: '135' };
    expect(toAnnotationInput(lb, 'lb').weightKg).toBe(61.235);
    expect(toBulkPatch(lb, { weight: true }, 'lb')).toEqual({ weightKg: 61.235 });
    expect(toCarryOverPatch(lb, 'lb')).toEqual({ exerciseId: EXERCISE, weightKg: 61.235 });
    expect(toManualSetValues(lb, 'lb').weightKg).toBe(61.235);
  });

  it('shows stored kg in pounds and brings them back unchanged', () => {
    const set = garminSet(1, {
      annotation: {
        exerciseId: EXERCISE,
        weightKg: 61.235,
        reps: 8,
        rpe: null,
        isWarmup: false,
        isFailure: false,
        isExcluded: false,
        note: null,
        updatedAt: '2026-10-19T10:00:00.000Z',
      },
    });
    const form = garminSetForm(set, 'lb');
    expect(form.weight).toBe('135');
    expect(toAnnotationInput(form, 'lb').weightKg).toBe(61.235);
    expect(weightText(100, 'lb')).toBe('220,5');
    expect(weightText(null, 'lb')).toBe('');
  });
});
