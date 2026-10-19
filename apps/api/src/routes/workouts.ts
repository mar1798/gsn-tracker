import {
  idParamsSchema,
  workoutListQuerySchema,
  workoutPatchSchema,
  type WorkoutHrResponse,
} from '@gsc/shared';
import { eq } from 'drizzle-orm';
import type { FastifyInstance } from 'fastify';
import { workoutHr, workouts } from '../db/schema.js';
import type { AppDeps } from '../deps.js';
import { parse } from '../http.js';
import { getOwnedWorkout, listWorkouts, loadWorkoutDetail } from '../services/workouts.js';

export async function workoutRoutes(app: FastifyInstance, { db, storage }: AppDeps) {
  app.get('/workouts', async (request) =>
    listWorkouts(db, request.userId, parse(workoutListQuerySchema, request.query)),
  );

  app.get('/workouts/:id', async (request) => {
    const { id } = parse(idParamsSchema, request.params);
    return loadWorkoutDetail(db, request.userId, id);
  });

  app.patch('/workouts/:id', async (request) => {
    const { id } = parse(idParamsSchema, request.params);
    const patch = parse(workoutPatchSchema, request.body);
    await getOwnedWorkout(db, request.userId, id);
    if (Object.keys(patch).length > 0) {
      await db.update(workouts).set(patch).where(eq(workouts.id, id));
    }
    return loadWorkoutDetail(db, request.userId, id);
  });

  app.delete('/workouts/:id', async (request, reply) => {
    const { id } = parse(idParamsSchema, request.params);
    const workout = await getOwnedWorkout(db, request.userId, id);
    await db.delete(workouts).where(eq(workouts.id, id));
    if (workout.fitObjectKey) {
      // The DB row is gone either way; an orphaned object is harmless.
      await storage.delete(workout.fitObjectKey).catch((err: unknown) => {
        request.log.warn({ err, key: workout.fitObjectKey }, 'Failed to delete FIT object');
      });
    }
    return reply.status(204).send();
  });

  app.get('/workouts/:id/hr', async (request): Promise<WorkoutHrResponse> => {
    const { id } = parse(idParamsSchema, request.params);
    const workout = await getOwnedWorkout(db, request.userId, id);
    const [hr] = await db.select().from(workoutHr).where(eq(workoutHr.workoutId, id));
    return {
      startedAt: workout.startedAt.toISOString(),
      offsetsSec: hr?.offsetsSec ?? [],
      bpm: hr?.bpm ?? [],
    };
  });
}
