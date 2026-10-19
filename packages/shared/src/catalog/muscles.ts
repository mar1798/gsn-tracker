export type MuscleRegion = 'front' | 'back';

export interface MuscleGroupDef {
  slug: string;
  nameRu: string;
  region: MuscleRegion;
  /** Id of the path in the body SVG (phase 6). */
  svgPathId: string;
}

export const MUSCLE_GROUPS = [
  { slug: 'chest', nameRu: 'Грудь', region: 'front', svgPathId: 'chest' },
  { slug: 'lats', nameRu: 'Верх спины (широчайшие)', region: 'back', svgPathId: 'lats' },
  { slug: 'traps', nameRu: 'Трапеции', region: 'back', svgPathId: 'traps' },
  { slug: 'lower_back', nameRu: 'Поясница', region: 'back', svgPathId: 'lower_back' },
  { slug: 'front_delts', nameRu: 'Передняя дельта', region: 'front', svgPathId: 'front_delts' },
  { slug: 'side_delts', nameRu: 'Средняя дельта', region: 'front', svgPathId: 'side_delts' },
  { slug: 'rear_delts', nameRu: 'Задняя дельта', region: 'back', svgPathId: 'rear_delts' },
  { slug: 'biceps', nameRu: 'Бицепс', region: 'front', svgPathId: 'biceps' },
  { slug: 'triceps', nameRu: 'Трицепс', region: 'back', svgPathId: 'triceps' },
  { slug: 'forearms', nameRu: 'Предплечья', region: 'front', svgPathId: 'forearms' },
  { slug: 'abs', nameRu: 'Пресс', region: 'front', svgPathId: 'abs' },
  { slug: 'obliques', nameRu: 'Косые', region: 'front', svgPathId: 'obliques' },
  { slug: 'glutes', nameRu: 'Ягодицы', region: 'back', svgPathId: 'glutes' },
  { slug: 'quads', nameRu: 'Квадрицепсы', region: 'front', svgPathId: 'quads' },
  { slug: 'hamstrings', nameRu: 'Бицепс бедра', region: 'back', svgPathId: 'hamstrings' },
  { slug: 'adductors', nameRu: 'Приводящие', region: 'front', svgPathId: 'adductors' },
  { slug: 'calves', nameRu: 'Икры', region: 'back', svgPathId: 'calves' },
] as const satisfies readonly MuscleGroupDef[];

export type MuscleSlug = (typeof MUSCLE_GROUPS)[number]['slug'];
