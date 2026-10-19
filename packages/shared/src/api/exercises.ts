import { z } from 'zod';
import { EQUIPMENT, MECHANICS } from '../catalog/exercises.js';

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
