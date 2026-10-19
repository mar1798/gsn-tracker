import { z } from 'zod';
import { EQUIPMENT, MECHANICS } from '../catalog/exercises.js';
import { MUSCLE_GROUPS } from '../catalog/muscles.js';

export const muscleGroupSchema = z.object({
  slug: z.string(),
  nameRu: z.string(),
  region: z.enum(['front', 'back']),
  svgPathId: z.string(),
});
export type MuscleGroup = z.infer<typeof muscleGroupSchema>;

export const exerciseSchema = z.object({
  id: z.uuid(),
  /** Built-in exercises only. */
  slug: z.string().nullable(),
  nameRu: z.string(),
  nameEn: z.string().nullable(),
  equipment: z.enum(EQUIPMENT),
  mechanics: z.enum(MECHANICS),
  isBodyweight: z.boolean(),
  isCustom: z.boolean(),
  /** Deleted custom exercise: hidden from the catalog, kept for sets that use it. */
  isArchived: z.boolean(),
  garminCategory: z.string().nullable(),
  garminExerciseName: z.string().nullable(),
  muscles: z.array(
    z.object({
      muscle: z.string(),
      role: z.enum(['primary', 'secondary']),
      coefficient: z.number(),
    }),
  ),
});
export type Exercise = z.infer<typeof exerciseSchema>;

export const exerciseListQuerySchema = z.object({
  q: z.string().trim().max(100).optional(),
  /** Muscle group slug. */
  muscle: z.string().max(50).optional(),
});

export const exerciseListResponseSchema = z.object({ items: z.array(exerciseSchema) });
export const muscleGroupListResponseSchema = z.object({ items: z.array(muscleGroupSchema) });

const MUSCLE_SLUGS = MUSCLE_GROUPS.map((m) => m.slug) as [
  (typeof MUSCLE_GROUPS)[number]['slug'],
  ...(typeof MUSCLE_GROUPS)[number]['slug'][],
];

/** Primary muscles count fully; secondary ones by their share (0.3–0.5 in the catalog). */
export const customExerciseMusclesSchema = z
  .array(
    z.object({
      muscle: z.enum(MUSCLE_SLUGS),
      role: z.enum(['primary', 'secondary']),
      coefficient: z.number().min(0.1).max(1),
    }),
  )
  .min(1)
  .max(MUSCLE_SLUGS.length)
  .refine((ms) => new Set(ms.map((m) => m.muscle)).size === ms.length, 'Duplicate muscle')
  .refine((ms) => ms.some((m) => m.role === 'primary'), 'At least one primary muscle')
  .refine(
    (ms) => ms.every((m) => (m.role === 'primary') === (m.coefficient === 1)),
    'Primary muscles have coefficient 1, secondary ones less',
  );

export const customExerciseInputSchema = z.object({
  nameRu: z.string().trim().min(1).max(80),
  equipment: z.enum(EQUIPMENT),
  mechanics: z.enum(MECHANICS),
  isBodyweight: z.boolean(),
  muscles: customExerciseMusclesSchema,
});
export type CustomExerciseInput = z.infer<typeof customExerciseInputSchema>;

/** Only the given fields change; `muscles` replaces the whole list. */
export const customExercisePatchSchema = customExerciseInputSchema.partial();
export type CustomExercisePatch = z.infer<typeof customExercisePatchSchema>;
