import { describe, expect, it } from 'vitest';
import {
  annotationInputSchema,
  annotationPatchSchema,
  bulkAnnotationRequestSchema,
  manualSetPatchSchema,
} from './workouts.js';

describe('annotation schemas', () => {
  it('PUT input fills omitted fields with empty values', () => {
    expect(annotationInputSchema.parse({ reps: 10 })).toEqual({
      exerciseId: null,
      weightKg: null,
      reps: 10,
      rpe: null,
      isWarmup: false,
      isFailure: false,
      isExcluded: false,
      note: null,
    });
  });

  it('patches keep only the given fields', () => {
    expect(annotationPatchSchema.parse({ weightKg: 60 })).toEqual({ weightKg: 60 });
    expect(manualSetPatchSchema.parse({ weightKg: 10 })).toEqual({ weightKg: 10 });
  });

  it('validates ranges and RPE steps', () => {
    expect(annotationInputSchema.safeParse({ rpe: 7.5 }).success).toBe(true);
    expect(annotationInputSchema.safeParse({ rpe: 7.3 }).success).toBe(false);
    expect(annotationInputSchema.safeParse({ reps: -1 }).success).toBe(false);
    expect(annotationInputSchema.safeParse({ weightKg: 1001 }).success).toBe(false);
  });

  it('rejects an empty bulk patch', () => {
    const setIds = ['00000000-0000-4000-8000-000000000000'];
    expect(bulkAnnotationRequestSchema.safeParse({ setIds, patch: {} }).success).toBe(false);
    expect(bulkAnnotationRequestSchema.safeParse({ setIds, patch: { rpe: 8 } }).success).toBe(true);
  });
});
