import { describe, expect, it } from 'vitest';
import { customExerciseInputSchema, customExercisePatchSchema } from './exercises.js';

const valid = {
  nameRu: '  Жим в хаммере  ',
  equipment: 'machine',
  mechanics: 'compound',
  isBodyweight: false,
  muscles: [
    { muscle: 'chest', role: 'primary', coefficient: 1 },
    { muscle: 'triceps', role: 'secondary', coefficient: 0.5 },
  ],
};

describe('customExerciseInputSchema', () => {
  it('accepts a valid exercise and trims the name', () => {
    expect(customExerciseInputSchema.parse(valid).nameRu).toBe('Жим в хаммере');
  });

  it.each([
    ['an empty name', { nameRu: '   ' }],
    ['no muscles', { muscles: [] }],
    ['no primary muscle', { muscles: [{ muscle: 'chest', role: 'secondary', coefficient: 0.5 }] }],
    [
      'a duplicate muscle',
      {
        muscles: [
          { muscle: 'chest', role: 'primary', coefficient: 1 },
          { muscle: 'chest', role: 'secondary', coefficient: 0.5 },
        ],
      },
    ],
    [
      'a primary coefficient below 1',
      { muscles: [{ muscle: 'chest', role: 'primary', coefficient: 0.5 }] },
    ],
    [
      'a secondary coefficient of 1',
      {
        muscles: [
          { muscle: 'chest', role: 'primary', coefficient: 1 },
          { muscle: 'triceps', role: 'secondary', coefficient: 1 },
        ],
      },
    ],
    ['an unknown muscle', { muscles: [{ muscle: 'neck', role: 'primary', coefficient: 1 }] }],
    ['an unknown equipment', { equipment: 'rope' }],
  ])('rejects %s', (_, override) => {
    expect(customExerciseInputSchema.safeParse({ ...valid, ...override }).success).toBe(false);
  });
});

describe('customExercisePatchSchema', () => {
  it('accepts a partial patch but still validates muscles', () => {
    expect(customExercisePatchSchema.parse({ nameRu: 'Новое' })).toEqual({ nameRu: 'Новое' });
    expect(customExercisePatchSchema.safeParse({ muscles: [] }).success).toBe(false);
  });
});
