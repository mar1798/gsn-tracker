import { EXERCISES, MUSCLE_GROUPS } from '@gsc/shared';
import { inArray, sql } from 'drizzle-orm';
import type { Db } from './client.js';
import { exerciseMuscles, exercises, muscleGroups } from './schema.js';

/** Upserts the built-in muscle groups and exercises from `@gsc/shared`. Idempotent. */
export async function seedCatalog(db: Db) {
  await db.transaction(async (tx) => {
    const muscles = await tx
      .insert(muscleGroups)
      .values([...MUSCLE_GROUPS])
      .onConflictDoUpdate({
        target: muscleGroups.slug,
        set: {
          nameRu: sql`excluded.name_ru`,
          region: sql`excluded.region`,
          svgPathId: sql`excluded.svg_path_id`,
        },
      })
      .returning({ id: muscleGroups.id, slug: muscleGroups.slug });
    const muscleId = new Map(muscles.map((m) => [m.slug, m.id]));

    const rows = await tx
      .insert(exercises)
      .values(
        EXERCISES.map((e) => ({
          slug: e.slug,
          nameRu: e.nameRu,
          nameEn: e.nameEn,
          equipment: e.equipment,
          mechanics: e.mechanics,
          isBodyweight: e.isBodyweight,
          isCustom: false,
          garminCategory: e.garmin?.category ?? null,
          garminSubcategory: e.garmin?.exerciseName ?? null,
        })),
      )
      .onConflictDoUpdate({
        target: exercises.slug,
        set: {
          nameRu: sql`excluded.name_ru`,
          nameEn: sql`excluded.name_en`,
          equipment: sql`excluded.equipment`,
          mechanics: sql`excluded.mechanics`,
          isBodyweight: sql`excluded.is_bodyweight`,
          garminCategory: sql`excluded.garmin_category`,
          garminSubcategory: sql`excluded.garmin_subcategory`,
        },
      })
      .returning({ id: exercises.id, slug: exercises.slug });
    const exerciseId = new Map(rows.map((r) => [r.slug, r.id]));

    await tx.delete(exerciseMuscles).where(
      inArray(
        exerciseMuscles.exerciseId,
        rows.map((r) => r.id),
      ),
    );
    await tx.insert(exerciseMuscles).values(
      EXERCISES.flatMap((e) =>
        e.muscles.map((m) => ({
          exerciseId: exerciseId.get(e.slug)!,
          muscleGroupId: muscleId.get(m.muscle)!,
          role: m.role,
          coefficient: m.coefficient,
        })),
      ),
    );
  });

  return { muscleGroups: MUSCLE_GROUPS.length, exercises: EXERCISES.length };
}
