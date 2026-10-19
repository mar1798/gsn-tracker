import { z } from 'zod';
import {
  annotationInputSchema,
  annotationPatchSchema,
  manualSetInputSchema,
  manualSetPatchSchema,
  type Annotation,
  type EffectiveSetValues,
  type ManualSet,
  type WorkoutDetail,
  type WorkoutSet,
} from '../api/workouts.js';

// User edits of a workout that may not have reached the server yet (offline queue).
// The client applies them on top of the last known server state, so the screen shows
// the result immediately; the server applies the same edit when the queue is flushed.

const workoutId = z.uuid();

export const workoutEditSchema = z.discriminatedUnion('kind', [
  /** PUT /sets/:id/annotation: replaces the whole annotation. */
  z.object({
    kind: z.literal('annotation.put'),
    workoutId,
    setId: z.uuid(),
    input: annotationInputSchema,
  }),
  /** POST /sets/annotations/bulk: merges the patch into each set's annotation. */
  z.object({
    kind: z.literal('annotation.bulk'),
    workoutId,
    setIds: z.array(z.uuid()).min(1),
    patch: annotationPatchSchema,
  }),
  z.object({
    kind: z.literal('manualSet.create'),
    workoutId,
    input: manualSetInputSchema.extend({ id: z.uuid() }),
  }),
  z.object({
    kind: z.literal('manualSet.update'),
    workoutId,
    id: z.uuid(),
    patch: manualSetPatchSchema,
  }),
  z.object({ kind: z.literal('manualSet.delete'), workoutId, id: z.uuid() }),
]);
export type WorkoutEdit = z.infer<typeof workoutEditSchema>;

type AnnotationValues = Omit<Annotation, 'updatedAt'>;

const EMPTY_ANNOTATION: AnnotationValues = {
  exerciseId: null,
  weightKg: null,
  reps: null,
  rpe: null,
  isWarmup: false,
  isFailure: false,
  isExcluded: false,
  note: null,
};

/** `annotation ?? garmin`, exactly as the `effective_sets` view computes it. */
export function effectiveValues(
  garmin: Pick<WorkoutSet['garmin'], 'reps' | 'weightKg'>,
  annotation: AnnotationValues | null,
): EffectiveSetValues {
  const a = annotation ?? EMPTY_ANNOTATION;
  return {
    // Never from Garmin hints.
    exerciseId: a.exerciseId,
    weightKg: a.weightKg ?? garmin.weightKg,
    reps: a.reps ?? garmin.reps,
    repsSource: a.reps !== null ? 'user' : garmin.reps !== null ? 'garmin' : null,
    rpe: a.rpe,
    isWarmup: a.isWarmup,
    isFailure: a.isFailure,
    isExcluded: a.isExcluded,
    note: a.note,
  };
}

/** A set counts as annotated once it has an exercise or is excluded (`annotatedSetCount`). */
export const isSetAnnotated = (set: Pick<WorkoutSet, 'effective'>) =>
  set.effective.exerciseId !== null || set.effective.isExcluded;

function withAnnotation(set: WorkoutSet, values: AnnotationValues, updatedAt: string): WorkoutSet {
  return {
    ...set,
    annotation: { ...values, updatedAt },
    effective: effectiveValues(set.garmin, values),
  };
}

/** Where the server appends a manual set without an explicit position. */
export function nextOrderIndex(detail: Pick<WorkoutDetail, 'sets' | 'manualSets'>): number {
  const indexes = [
    ...detail.sets.map((s) => s.setIndex),
    ...detail.manualSets.map((s) => s.orderIndex),
  ];
  return Math.max(0, ...indexes) + 1;
}

const byOrder = (a: ManualSet, b: ManualSet) => a.orderIndex - b.orderIndex;

/** Applies pending edits of this workout, in queue order, to the server state. */
export function applyWorkoutEdits(
  detail: WorkoutDetail,
  edits: readonly WorkoutEdit[],
  now: Date = new Date(),
): WorkoutDetail {
  const own = edits.filter((e) => e.workoutId === detail.id);
  if (own.length === 0) return detail;

  const updatedAt = now.toISOString();
  let { sets, manualSets } = detail;

  for (const edit of own) {
    switch (edit.kind) {
      case 'annotation.put':
        sets = sets.map((s) =>
          s.id === edit.setId ? withAnnotation(s, edit.input, updatedAt) : s,
        );
        break;
      case 'annotation.bulk': {
        const ids = new Set(edit.setIds);
        sets = sets.map((s) => {
          if (!ids.has(s.id)) return s;
          const { updatedAt: _, ...current } = s.annotation ?? { ...EMPTY_ANNOTATION, updatedAt };
          return withAnnotation(s, { ...current, ...edit.patch }, updatedAt);
        });
        break;
      }
      case 'manualSet.create': {
        const { id, orderIndex, ...values } = edit.input;
        // Already created on the server (the queue was flushed, the query not refetched yet).
        if (manualSets.some((s) => s.id === id)) break;
        const created: ManualSet = {
          id,
          orderIndex: orderIndex ?? nextOrderIndex({ sets, manualSets }),
          ...values,
        };
        manualSets = [...manualSets, created].sort(byOrder);
        break;
      }
      case 'manualSet.update':
        manualSets = manualSets
          .map((s) => (s.id === edit.id ? { ...s, ...edit.patch } : s))
          .sort(byOrder);
        break;
      case 'manualSet.delete':
        manualSets = manualSets.filter((s) => s.id !== edit.id);
        break;
    }
  }

  return {
    ...detail,
    sets,
    manualSets,
    annotatedSetCount: sets.filter(isSetAnnotated).length,
  };
}
