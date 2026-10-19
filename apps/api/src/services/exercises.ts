import { EXERCISES, type Exercise, type GarminMapping } from '@gsc/shared';
import { and, asc, eq, exists, ilike, inArray, isNull, or, type SQL } from 'drizzle-orm';
import type { Db } from '../db/client.js';
import { exerciseMuscles, exercises, muscleGroups } from '../db/schema.js';
import { HttpError } from '../http.js';

type ExerciseRow = typeof exercises.$inferSelect;

/** Built-in exercises plus the user's own. */
export const visibleTo = (userId: string) =>
  or(isNull(exercises.userId), eq(exercises.userId, userId));

export async function assertExerciseVisible(db: Db, userId: string, exerciseId: string | null) {
  if (exerciseId === null) return;
  const [row] = await db
    .select({ id: exercises.id })
    .from(exercises)
    .where(and(eq(exercises.id, exerciseId), visibleTo(userId)));
  if (!row) throw new HttpError(400, 'invalid_exercise', 'Упражнение не найдено');
}

const escapeLike = (s: string) => s.replace(/[\\%_]/g, (c) => `\\${c}`);

export async function listExercises(
  db: Db,
  userId: string,
  filter: { q?: string | undefined; muscle?: string | undefined },
): Promise<Exercise[]> {
  const conditions: (SQL | undefined)[] = [visibleTo(userId)];
  if (filter.q) {
    const pattern = `%${escapeLike(filter.q)}%`;
    conditions.push(or(ilike(exercises.nameRu, pattern), ilike(exercises.nameEn, pattern)));
  }
  if (filter.muscle) {
    conditions.push(
      exists(
        db
          .select()
          .from(exerciseMuscles)
          .innerJoin(muscleGroups, eq(muscleGroups.id, exerciseMuscles.muscleGroupId))
          .where(
            and(eq(exerciseMuscles.exerciseId, exercises.id), eq(muscleGroups.slug, filter.muscle)),
          ),
      ),
    );
  }

  const rows = await db
    .select()
    .from(exercises)
    .where(and(...conditions))
    .orderBy(asc(exercises.nameRu));
  if (rows.length === 0) return [];

  const muscles = await db
    .select({
      exerciseId: exerciseMuscles.exerciseId,
      muscle: muscleGroups.slug,
      role: exerciseMuscles.role,
      coefficient: exerciseMuscles.coefficient,
    })
    .from(exerciseMuscles)
    .innerJoin(muscleGroups, eq(muscleGroups.id, exerciseMuscles.muscleGroupId))
    .where(
      inArray(
        exerciseMuscles.exerciseId,
        rows.map((r) => r.id),
      ),
    )
    .orderBy(asc(exerciseMuscles.role), asc(muscleGroups.id));

  const byExercise = new Map<string, typeof muscles>();
  for (const m of muscles)
    byExercise.set(m.exerciseId, [...(byExercise.get(m.exerciseId) ?? []), m]);
  return rows.map((row) => toExercise(row, byExercise.get(row.id) ?? []));
}

function toExercise(
  row: ExerciseRow,
  muscles: { muscle: string; role: 'primary' | 'secondary'; coefficient: number }[],
): Exercise {
  return {
    id: row.id,
    slug: row.slug,
    nameRu: row.nameRu,
    nameEn: row.nameEn,
    equipment: row.equipment as Exercise['equipment'],
    mechanics: row.mechanics as Exercise['mechanics'],
    isBodyweight: row.isBodyweight,
    isCustom: row.isCustom,
    garminCategory: row.garminCategory,
    garminExerciseName: row.garminSubcategory,
    muscles: muscles.map(({ muscle, role, coefficient }) => ({ muscle, role, coefficient })),
  };
}

const CATALOG_ORDER = new Map(EXERCISES.map((e, i) => [e.slug, i]));

/** Exercises with a Garmin mapping, in catalog order (custom ones last), for `suggestExercises`. */
export async function suggestionCatalog(
  db: Db,
  userId: string,
): Promise<{ id: string; garmin: GarminMapping }[]> {
  const rows = await db
    .select({
      id: exercises.id,
      slug: exercises.slug,
      category: exercises.garminCategory,
      exerciseName: exercises.garminSubcategory,
    })
    .from(exercises)
    .where(visibleTo(userId));

  const rank = (slug: string | null) =>
    slug === null ? Infinity : (CATALOG_ORDER.get(slug) ?? Infinity);
  return rows
    .filter((r) => r.category !== null)
    .sort((a, b) => rank(a.slug) - rank(b.slug))
    .map((r) => ({ id: r.id, garmin: { category: r.category!, exerciseName: r.exerciseName } }));
}
