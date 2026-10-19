import {
  EQUIPMENT,
  MECHANICS,
  MUSCLE_GROUPS,
  type CustomExerciseInput,
  type Exercise,
} from '@gsc/shared';
import { z } from 'zod';

/** Share of a set counted for a secondary muscle of a new custom exercise. */
export const SECONDARY_COEFFICIENT = 0.5;

export type MuscleRole = 'primary' | 'secondary';

// Muscles are a map slug → coefficient: 1 = primary, less = secondary, absent = not worked.
// An edited secondary muscle keeps its coefficient (built-in style 0.3–0.5).
export const exerciseFormSchema = z.object({
  nameRu: z.string().trim().min(1, 'Введите название').max(80, 'Название — до 80 символов'),
  equipment: z
    .enum(EQUIPMENT, 'Выберите оборудование')
    .nullable()
    .refine((v) => v !== null, {
      message: 'Выберите оборудование',
    }),
  mechanics: z.enum(MECHANICS),
  isBodyweight: z.boolean(),
  muscles: z
    .record(z.string(), z.number())
    .refine((ms) => Object.values(ms).includes(1), 'Отметьте хотя бы одну основную мышцу'),
});

export type ExerciseFormValues = z.input<typeof exerciseFormSchema>;

export function exerciseForm(exercise?: Exercise, name = ''): ExerciseFormValues {
  if (!exercise) {
    return {
      nameRu: name,
      equipment: null,
      mechanics: 'compound',
      isBodyweight: false,
      muscles: {},
    };
  }
  return {
    nameRu: exercise.nameRu,
    equipment: exercise.equipment,
    mechanics: exercise.mechanics,
    isBodyweight: exercise.isBodyweight,
    muscles: Object.fromEntries(exercise.muscles.map((m) => [m.muscle, m.coefficient])),
  };
}

export const roleOf = (coefficient: number | undefined): MuscleRole | null =>
  coefficient === undefined ? null : coefficient === 1 ? 'primary' : 'secondary';

/** Tapping a role selects it; tapping the selected role again clears the muscle. */
export function toggleMuscle(
  muscles: Record<string, number>,
  slug: string,
  role: MuscleRole,
  original?: Exercise,
): Record<string, number> {
  const { [slug]: current, ...rest } = muscles;
  if (roleOf(current) === role) return rest;
  if (role === 'primary') return { ...rest, [slug]: 1 };
  const kept = original?.muscles.find((m) => m.muscle === slug && m.role === 'secondary');
  return { ...rest, [slug]: kept?.coefficient ?? SECONDARY_COEFFICIENT };
}

/** Muscles in catalog order, primary ones first (as the API returns them). */
export function toCustomExerciseInput(form: ExerciseFormValues): CustomExerciseInput {
  const muscles = MUSCLE_GROUPS.flatMap(({ slug }) => {
    const coefficient = form.muscles[slug];
    const role = roleOf(coefficient);
    return role ? [{ muscle: slug, role, coefficient: coefficient! }] : [];
  });
  return {
    nameRu: form.nameRu.trim(),
    equipment: form.equipment!,
    mechanics: form.mechanics,
    isBodyweight: form.isBodyweight,
    muscles: [
      ...muscles.filter((m) => m.role === 'primary'),
      ...muscles.filter((m) => m.role === 'secondary'),
    ],
  };
}
