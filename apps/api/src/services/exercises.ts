import {
  EXERCISES,
  normalizeSearchText,
  type CustomExerciseInput,
  type CustomExercisePatch,
  type Exercise,
  type GarminMapping,
} from '@gsc/shared';
import { and, asc, eq, exists, ilike, inArray, isNull, ne, or, sql, type SQL } from 'drizzle-orm';
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
  filter: { q?: string | undefined; muscle?: string | undefined; id?: string },
): Promise<Exercise[]> {
  const conditions: (SQL | undefined)[] = [visibleTo(userId)];
  if (filter.id) conditions.push(eq(exercises.id, filter.id));
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
    isArchived: row.archivedAt !== null,
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
    .where(and(visibleTo(userId), isNull(exercises.archivedAt)));

  const rank = (slug: string | null) =>
    slug === null ? Infinity : (CATALOG_ORDER.get(slug) ?? Infinity);
  return rows
    .filter((r) => r.category !== null)
    .sort((a, b) => rank(a.slug) - rank(b.slug))
    .map((r) => ({ id: r.id, garmin: { category: r.category!, exerciseName: r.exerciseName } }));
}

async function getVisibleExercise(db: Db, userId: string, id: string): Promise<Exercise> {
  const [exercise] = await listExercises(db, userId, { id });
  if (!exercise) throw new HttpError(404, 'not_found', 'Упражнение не найдено');
  return exercise;
}

/** The user's own active exercise; built-in ones are read-only. */
async function getEditableExercise(db: Db, userId: string, id: string) {
  const exercise = await getVisibleExercise(db, userId, id);
  if (!exercise.isCustom) {
    throw new HttpError(403, 'builtin_exercise', 'Встроенное упражнение нельзя изменить');
  }
  if (exercise.isArchived) throw new HttpError(404, 'not_found', 'Упражнение удалено');
  return exercise;
}

/** Names compare case-insensitively with `ё` = `е`, as in the search. */
const comparableName = sql`replace(lower(${exercises.nameRu}), 'ё', 'е')`;

async function assertNameFree(db: Db, userId: string, nameRu: string, exceptId?: string) {
  const [taken] = await db
    .select({ id: exercises.id })
    .from(exercises)
    .where(
      and(
        visibleTo(userId),
        isNull(exercises.archivedAt),
        sql`${comparableName} = ${normalizeSearchText(nameRu)}`,
        exceptId ? ne(exercises.id, exceptId) : undefined,
      ),
    )
    .limit(1);
  if (taken) {
    throw new HttpError(409, 'duplicate_name', 'Упражнение с таким названием уже есть', {
      exerciseId: taken.id,
    });
  }
}

async function muscleIds(db: Db) {
  const groups = await db
    .select({ id: muscleGroups.id, slug: muscleGroups.slug })
    .from(muscleGroups);
  return new Map(groups.map((g) => [g.slug, g.id]));
}

function muscleRows(
  idBySlug: Map<string, number>,
  exerciseId: string,
  muscles: CustomExerciseInput['muscles'],
) {
  return muscles.map((m) => ({
    exerciseId,
    muscleGroupId: idBySlug.get(m.muscle)!,
    role: m.role,
    coefficient: m.coefficient,
  }));
}

export async function createCustomExercise(
  db: Db,
  userId: string,
  { muscles, ...input }: CustomExerciseInput,
): Promise<Exercise> {
  await assertNameFree(db, userId, input.nameRu);
  const idBySlug = await muscleIds(db);
  const id = await db.transaction(async (tx) => {
    const [row] = await tx
      .insert(exercises)
      .values({ ...input, isCustom: true, userId })
      .returning({ id: exercises.id });
    await tx.insert(exerciseMuscles).values(muscleRows(idBySlug, row!.id, muscles));
    return row!.id;
  });
  return getVisibleExercise(db, userId, id);
}

export async function updateCustomExercise(
  db: Db,
  userId: string,
  id: string,
  { muscles, ...patch }: CustomExercisePatch,
): Promise<Exercise> {
  await getEditableExercise(db, userId, id);
  if (patch.nameRu !== undefined) await assertNameFree(db, userId, patch.nameRu, id);
  const idBySlug = await muscleIds(db);
  await db.transaction(async (tx) => {
    if (Object.keys(patch).length > 0) {
      await tx.update(exercises).set(patch).where(eq(exercises.id, id));
    }
    if (muscles) {
      await tx.delete(exerciseMuscles).where(eq(exerciseMuscles.exerciseId, id));
      await tx.insert(exerciseMuscles).values(muscleRows(idBySlug, id, muscles));
    }
  });
  return getVisibleExercise(db, userId, id);
}

/**
 * Soft delete: sets annotated with the exercise keep it (name, muscles for analytics),
 * it only leaves the catalog. Deleting an already deleted exercise succeeds.
 */
export async function archiveCustomExercise(db: Db, userId: string, id: string) {
  const exercise = await getVisibleExercise(db, userId, id);
  if (!exercise.isCustom) {
    throw new HttpError(403, 'builtin_exercise', 'Встроенное упражнение нельзя удалить');
  }
  if (exercise.isArchived) return;
  await db.update(exercises).set({ archivedAt: new Date() }).where(eq(exercises.id, id));
}
