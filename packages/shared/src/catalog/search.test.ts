import { describe, expect, it } from 'vitest';
import { EXERCISES } from './exercises.js';
import { normalizeSearchText, searchExercises } from './search.js';

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
