import { customExerciseInputSchema } from '@gsc/shared';

import { exercise } from '@/test/fixtures';

import {
  exerciseForm,
  exerciseFormSchema,
  SECONDARY_COEFFICIENT,
  toCustomExerciseInput,
  toggleMuscle,
} from './exercise-form-model';

const errorsOf = (values: unknown) =>
  exerciseFormSchema.safeParse(values).error?.issues.map((i) => i.message) ?? [];

describe('exerciseFormSchema', () => {
  it('requires a name, equipment and a primary muscle, in Russian', () => {
    expect(errorsOf(exerciseForm(undefined, '  '))).toEqual([
      'Введите название',
      'Выберите оборудование',
      'Отметьте хотя бы одну основную мышцу',
    ]);
    expect(errorsOf({ ...exerciseForm(), muscles: { chest: SECONDARY_COEFFICIENT } })).toContain(
      'Отметьте хотя бы одну основную мышцу',
    );
  });
});

describe('toggleMuscle', () => {
  it('selects, switches and clears a role', () => {
    let muscles = toggleMuscle({}, 'chest', 'primary');
    expect(muscles).toEqual({ chest: 1 });
    muscles = toggleMuscle(muscles, 'chest', 'secondary');
    expect(muscles).toEqual({ chest: SECONDARY_COEFFICIENT });
    expect(toggleMuscle(muscles, 'chest', 'secondary')).toEqual({});
  });

  it("restores an edited exercise's own secondary coefficient", () => {
    const original = exercise(1, 'Жим', {
      muscles: [
        { muscle: 'chest', role: 'primary', coefficient: 1 },
        { muscle: 'triceps', role: 'secondary', coefficient: 0.3 },
      ],
    });
    const cleared = toggleMuscle(exerciseForm(original).muscles, 'triceps', 'secondary');
    expect(toggleMuscle(cleared, 'triceps', 'secondary', original)).toEqual({
      chest: 1,
      triceps: 0.3,
    });
  });
});

describe('toCustomExerciseInput', () => {
  it('builds a valid API input with primary muscles first, in catalog order', () => {
    const input = toCustomExerciseInput({
      nameRu: ' Жим в хаммере ',
      equipment: 'machine',
      mechanics: 'compound',
      isBodyweight: false,
      muscles: { triceps: 0.5, chest: 1, front_delts: 0.3 },
    });
    expect(input).toEqual({
      nameRu: 'Жим в хаммере',
      equipment: 'machine',
      mechanics: 'compound',
      isBodyweight: false,
      muscles: [
        { muscle: 'chest', role: 'primary', coefficient: 1 },
        { muscle: 'front_delts', role: 'secondary', coefficient: 0.3 },
        { muscle: 'triceps', role: 'secondary', coefficient: 0.5 },
      ],
    });
    expect(customExerciseInputSchema.safeParse(input).success).toBe(true);
  });

  it('round-trips an existing exercise', () => {
    const original = exercise(1, 'Жим', {
      isCustom: true,
      muscles: [
        { muscle: 'chest', role: 'primary', coefficient: 1 },
        { muscle: 'triceps', role: 'secondary', coefficient: 0.5 },
      ],
    });
    expect(toCustomExerciseInput(exerciseForm(original)).muscles).toEqual(original.muscles);
  });
});
