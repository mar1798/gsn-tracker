import type {
  Annotation,
  AnnotationInput,
  AnnotationPatch,
  ManualSet,
  ManualSetPatch,
  WorkoutSet,
} from '@gsc/shared';
import { z } from 'zod';

// Form state of the set editor (annotation sheet and manual set sheet) and its conversion to
// API payloads. Numbers are kept as strings while typing ("62,5"), converted on save.

export const RPE_VALUES = [6, 6.5, 7, 7.5, 8, 8.5, 9, 9.5, 10] as const;

/** "62,5" → 62.5, "" → null, garbage → NaN. */
export function parseDecimal(text: string): number | null {
  const s = text.trim().replace(',', '.');
  if (s === '') return null;
  return /^\d+(\.\d+)?$/.test(s) ? Number(s) : NaN;
}

const inRange = (max: number, integer: boolean) => (text: string) => {
  const n = parseDecimal(text);
  return n === null || (Number.isFinite(n) && n <= max && (!integer || Number.isInteger(n)));
};

export const setFormSchema = z.object({
  exerciseId: z.string().nullable(),
  weight: z.string().refine(inRange(1000, false), 'Вес — число от 0 до 1000 кг'),
  reps: z.string().refine(inRange(1000, true), 'Повторы — целое число от 0 до 1000'),
  rpe: z.number().nullable(),
  isWarmup: z.boolean(),
  isFailure: z.boolean(),
  isExcluded: z.boolean(),
  note: z.string().max(1000, 'Не длиннее 1000 символов'),
  /** "Применить упражнение и вес к следующим N подходам" (single Garmin set only). */
  applyNext: z.number().int().min(0),
});
export type SetFormValues = z.infer<typeof setFormSchema>;

const text = (n: number | null | undefined) => (n == null ? '' : String(n).replace('.', ','));

export const EMPTY_FORM: SetFormValues = {
  exerciseId: null,
  weight: '',
  reps: '',
  rpe: null,
  isWarmup: false,
  isFailure: false,
  isExcluded: false,
  note: '',
  applyNext: 0,
};

/** One Garmin set: the user's annotation, reps pre-filled from the watch. */
export function garminSetForm(set: Pick<WorkoutSet, 'annotation' | 'garmin'>): SetFormValues {
  const a: Annotation | null = set.annotation;
  return {
    ...EMPTY_FORM,
    exerciseId: a?.exerciseId ?? null,
    weight: text(a?.weightKg ?? set.garmin.weightKg),
    reps: text(a?.reps ?? set.garmin.reps),
    rpe: a?.rpe ?? null,
    isWarmup: a?.isWarmup ?? false,
    isFailure: a?.isFailure ?? false,
    isExcluded: a?.isExcluded ?? false,
    note: a?.note ?? '',
  };
}

export function manualSetForm(set: ManualSet | undefined): SetFormValues {
  if (!set) return EMPTY_FORM;
  return {
    ...EMPTY_FORM,
    exerciseId: set.exerciseId,
    weight: text(set.weightKg),
    reps: text(set.reps),
    rpe: set.rpe,
    isWarmup: set.isWarmup,
    isFailure: set.isFailure,
    note: set.note ?? '',
  };
}

const note = (s: string) => s.trim() || null;

/**
 * PUT for one set. Saving the sheet confirms what it shows, so pre-filled watch reps
 * become the user's reps (and count towards volume and e1RM).
 */
export function toAnnotationInput(v: SetFormValues): Required<AnnotationInput> {
  return {
    exerciseId: v.exerciseId,
    weightKg: parseDecimal(v.weight),
    reps: parseDecimal(v.reps),
    rpe: v.rpe,
    isWarmup: v.isWarmup,
    isFailure: v.isFailure,
    isExcluded: v.isExcluded,
    note: note(v.note),
  };
}

type Dirty = Partial<Record<keyof SetFormValues, boolean | undefined>>;

/** Bulk patch: only what the user touched; empty number fields are left alone. */
export function toBulkPatch(v: SetFormValues, dirty: Dirty): AnnotationPatch {
  const patch: AnnotationPatch = {};
  if (dirty.exerciseId) patch.exerciseId = v.exerciseId;
  const weight = parseDecimal(v.weight);
  if (dirty.weight && weight !== null) patch.weightKg = weight;
  const reps = parseDecimal(v.reps);
  if (dirty.reps && reps !== null) patch.reps = reps;
  if (dirty.rpe) patch.rpe = v.rpe;
  if (dirty.isWarmup) patch.isWarmup = v.isWarmup;
  if (dirty.isFailure) patch.isFailure = v.isFailure;
  if (dirty.isExcluded) patch.isExcluded = v.isExcluded;
  if (dirty.note && note(v.note) !== null) patch.note = note(v.note);
  return patch;
}

/** What "применить к следующим" carries over: the exercise and, if set, the weight. */
export function toCarryOverPatch(v: SetFormValues): AnnotationPatch {
  const weight = parseDecimal(v.weight);
  return weight === null
    ? { exerciseId: v.exerciseId }
    : { exerciseId: v.exerciseId, weightKg: weight };
}

export function toManualSetValues(v: SetFormValues): Required<Omit<ManualSetPatch, 'orderIndex'>> {
  return {
    exerciseId: v.exerciseId,
    weightKg: parseDecimal(v.weight),
    reps: parseDecimal(v.reps),
    rpe: v.rpe,
    isWarmup: v.isWarmup,
    isFailure: v.isFailure,
    note: note(v.note),
  };
}
