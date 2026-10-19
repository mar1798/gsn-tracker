import {
  MUSCLE_GROUPS,
  type Equipment,
  type Exercise,
  type Mechanics,
  type RecordKind,
} from '@gsc/shared';

export const EQUIPMENT_LABELS: Record<Equipment, string> = {
  barbell: 'Штанга',
  dumbbell: 'Гантели',
  kettlebell: 'Гиря',
  ez_bar: 'EZ-гриф',
  trap_bar: 'Трэп-гриф',
  cable: 'Блок',
  machine: 'Тренажёр',
  smith: 'Смит',
  bodyweight: 'Свой вес',
  band: 'Резина',
  other: 'Другое',
};

export const MECHANICS_LABELS: Record<Mechanics, string> = {
  compound: 'Базовое',
  isolation: 'Изолирующее',
};

const MUSCLE_NAMES = new Map<string, string>(MUSCLE_GROUPS.map((m) => [m.slug, m.nameRu]));

export const muscleName = (slug: string) => MUSCLE_NAMES.get(slug) ?? slug;

export const musclesByRole = (exercise: Exercise, role: 'primary' | 'secondary') =>
  exercise.muscles.filter((m) => m.role === role);

export const RECORD_LABELS: Record<RecordKind, string> = {
  maxWeight: 'Макс. вес',
  maxE1rm: 'Расчётный 1ПМ',
  maxSetVolume: 'Объём за подход',
  maxWorkoutVolume: 'Объём за тренировку',
};
