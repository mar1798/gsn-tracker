import { describe, expect, it } from 'vitest';
import { EXERCISES } from './exercises.js';
import { filterExercises, normalizeSearchText, searchExercises } from './search.js';

const items = [
  { nameRu: 'Жим штанги лёжа', nameEn: 'Barbell bench press' },
  { nameRu: 'Жим гантелей лёжа', nameEn: 'Dumbbell bench press' },
  { nameRu: 'Тяга штанги в наклоне', nameEn: 'Barbell row' },
  { nameRu: 'Французский жим', nameEn: null },
];
const names = (q: string) => searchExercises(items, q).map((e) => e.nameRu);

describe('normalizeSearchText', () => {
  it('lowercases, maps ё to е and collapses spaces', () => {
    expect(normalizeSearchText('  Жим  ЛЁЖА ')).toBe('жим лежа');
  });
});

describe('searchExercises', () => {
  it('returns everything for an empty query', () => {
    expect(names('  ')).toHaveLength(4);
  });

  it('matches every word in any order, ignoring ё', () => {
    expect(names('лежа штанги')).toEqual(['Жим штанги лёжа']);
  });

  it('matches English names', () => {
    expect(names('row')).toEqual(['Тяга штанги в наклоне']);
  });

  it('puts names starting with the query first', () => {
    expect(names('жим')).toEqual(['Жим штанги лёжа', 'Жим гантелей лёжа', 'Французский жим']);
    expect(names('французский')).toEqual(['Французский жим']);
  });

  it('finds nothing for unrelated text', () => {
    expect(names('велосипед')).toEqual([]);
  });

  it('finds catalog exercises', () => {
    expect(searchExercises(EXERCISES, 'присед').length).toBeGreaterThan(0);
  });
});

describe('filterExercises', () => {
  const ex = (
    nameRu: string,
    muscles: [string, 'primary' | 'secondary'][],
    flags: { isCustom?: boolean; isArchived?: boolean } = {},
  ) => ({
    nameRu,
    nameEn: null,
    isCustom: flags.isCustom ?? false,
    isArchived: flags.isArchived ?? false,
    muscles: muscles.map(([muscle, role]) => ({ muscle, role })),
  });
  const catalog = [
    ex('Отжимания на брусьях', [
      ['triceps', 'secondary'],
      ['chest', 'primary'],
    ]),
    ex('Французский жим', [['triceps', 'primary']]),
    ex('Жим Ивана', [['chest', 'primary']], { isCustom: true }),
    ex('Старый жим', [['chest', 'primary']], { isCustom: true, isArchived: true }),
  ];
  const names = (filter: Parameters<typeof filterExercises>[1]) =>
    filterExercises(catalog, filter).map((e) => e.nameRu);

  it('hides archived exercises', () => {
    expect(names({})).toEqual(['Отжимания на брусьях', 'Французский жим', 'Жим Ивана']);
    expect(names({ query: 'старый' })).toEqual([]);
  });

  it('keeps only custom exercises', () => {
    expect(names({ customOnly: true })).toEqual(['Жим Ивана']);
  });

  it('filters by muscle, primary first', () => {
    expect(names({ muscle: 'triceps' })).toEqual(['Французский жим', 'Отжимания на брусьях']);
    expect(names({ muscle: 'calves' })).toEqual([]);
  });

  it('combines search, muscle and custom filters', () => {
    expect(names({ query: 'жим', muscle: 'chest' })).toEqual(['Жим Ивана', 'Отжимания на брусьях']);
    expect(names({ query: 'жим', muscle: 'chest', customOnly: true })).toEqual(['Жим Ивана']);
    expect(names({ query: 'брусьях', customOnly: true })).toEqual([]);
  });
});
