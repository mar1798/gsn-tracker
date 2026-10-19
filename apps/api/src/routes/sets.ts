import {
  annotationInputSchema,
  bulkAnnotationRequestSchema,
  idParamsSchema,
  manualSetInputSchema,
  manualSetPatchSchema,
} from '@gsc/shared';
import { and, eq, inArray, sql } from 'drizzle-orm';
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { garminSets, manualSets, setAnnotations, workouts } from '../db/schema.js';
import type { AppDeps } from '../deps.js';
import { notFound, parse } from '../http.js';
import { assertExerciseVisible } from '../services/exercises.js';
import { getOwnedWorkout, loadSets, toManualSet } from '../services/workouts.js';

const setParamsSchema = z.object({ garminSetId: z.uuid() });

export async function setRoutes(app: FastifyInstance, { db }: AppDeps) {
  /** Ids of the given Garmin sets that belong to the user. */
  async function ownedSetIds(userId: string, ids: string[]): Promise<Set<string>> {
    const rows = await db
      .select({ id: garminSets.id })
      .from(garminSets)
      .innerJoin(workouts, eq(workouts.id, garminSets.workoutId))
      .where(and(inArray(garminSets.id, ids), eq(workouts.userId, userId)));
    return new Set(rows.map((r) => r.id));
  }

  app.put('/sets/:garminSetId/annotation', async (request) => {
    const { garminSetId } = parse(setParamsSchema, request.params);
    const input = parse(annotationInputSchema, request.body);
    if (!(await ownedSetIds(request.userId, [garminSetId])).has(garminSetId)) {
      throw notFound('Подход не найден');
    }
    await assertExerciseVisible(db, request.userId, input.exerciseId);

    await db
      .insert(setAnnotations)
      .values({ garminSetId, ...input })
      .onConflictDoUpdate({
        target: setAnnotations.garminSetId,
        set: { ...input, updatedAt: new Date() },
      });

    const [set] = await loadSets(db, request.userId, eq(garminSets.id, garminSetId));
    return set;
  });

  app.post('/sets/annotations/bulk', async (request) => {
    const { setIds, patch } = parse(bulkAnnotationRequestSchema, request.body);
    const ids = [...new Set(setIds)];
    if ((await ownedSetIds(request.userId, ids)).size !== ids.length) {
      throw notFound('Подход не найден');
    }
    if (patch.exerciseId !== undefined) {
      await assertExerciseVisible(db, request.userId, patch.exerciseId);
    }

    // Merge: only the patched columns are overwritten on existing annotations.
    const keys = Object.keys(patch) as (keyof typeof patch)[];
    const set = Object.fromEntries(
      keys.map((k) => [k, sql.raw(`excluded."${setAnnotations[k].name}"`)]),
    );
    await db
      .insert(setAnnotations)
      .values(ids.map((garminSetId) => ({ garminSetId, ...patch })))
      .onConflictDoUpdate({
        target: setAnnotations.garminSetId,
        set: { ...set, updatedAt: new Date() },
      });

    return { items: await loadSets(db, request.userId, inArray(garminSets.id, ids)) };
  });

  app.post('/workouts/:id/manual-sets', async (request, reply) => {
    const { id } = parse(idParamsSchema, request.params);
    const { orderIndex, ...input } = parse(manualSetInputSchema, request.body);
    await getOwnedWorkout(db, request.userId, id);
    await assertExerciseVisible(db, request.userId, input.exerciseId);

    const [row] = await db
      .insert(manualSets)
      .values({
        workoutId: id,
        ...input,
        // Appended after every Garmin and manual set by default.
        orderIndex:
          orderIndex ??
          sql`(SELECT COALESCE(MAX(order_index), 0) + 1 FROM effective_sets WHERE workout_id = ${id})`,
      })
      .returning();
    return reply.status(201).send(toManualSet(row!));
  });

  async function getOwnedManualSet(userId: string, id: string) {
    const [row] = await db
      .select({ id: manualSets.id })
      .from(manualSets)
      .innerJoin(workouts, eq(workouts.id, manualSets.workoutId))
      .where(and(eq(manualSets.id, id), eq(workouts.userId, userId)));
    if (!row) throw notFound('Подход не найден');
  }

  app.patch('/manual-sets/:id', async (request) => {
    const { id } = parse(idParamsSchema, request.params);
    const patch = parse(manualSetPatchSchema, request.body);
    await getOwnedManualSet(request.userId, id);
    if (patch.exerciseId !== undefined) {
      await assertExerciseVisible(db, request.userId, patch.exerciseId);
    }
    const [row] = await db
      .update(manualSets)
      .set({ ...patch, updatedAt: new Date() })
      .where(eq(manualSets.id, id))
      .returning();
    return toManualSet(row!);
  });

  app.delete('/manual-sets/:id', async (request, reply) => {
    const { id } = parse(idParamsSchema, request.params);
    await getOwnedManualSet(request.userId, id);
    await db.delete(manualSets).where(eq(manualSets.id, id));
    return reply.status(204).send();
  });
}
