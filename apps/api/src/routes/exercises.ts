import {
  customExerciseInputSchema,
  customExercisePatchSchema,
  exerciseListQuerySchema,
  idParamsSchema,
  MUSCLE_GROUPS,
} from '@gsc/shared';
import { asc } from 'drizzle-orm';
import type { FastifyInstance } from 'fastify';
import { muscleGroups } from '../db/schema.js';
import type { AppDeps } from '../deps.js';
import { parse } from '../http.js';
import {
  archiveCustomExercise,
  createCustomExercise,
  listExercises,
  updateCustomExercise,
} from '../services/exercises.js';

const MUSCLE_ORDER = new Map<string, number>(MUSCLE_GROUPS.map((m, i) => [m.slug, i]));

export async function exerciseRoutes(app: FastifyInstance, { db }: AppDeps) {
  app.get('/exercises', async (request) => ({
    items: await listExercises(db, request.userId, parse(exerciseListQuerySchema, request.query)),
  }));

  app.post('/exercises', async (request, reply) => {
    const input = parse(customExerciseInputSchema, request.body);
    return reply.status(201).send(await createCustomExercise(db, request.userId, input));
  });

  app.patch('/exercises/:id', async (request) => {
    const { id } = parse(idParamsSchema, request.params);
    const patch = parse(customExercisePatchSchema, request.body);
    return updateCustomExercise(db, request.userId, id, patch);
  });

  app.delete('/exercises/:id', async (request, reply) => {
    const { id } = parse(idParamsSchema, request.params);
    await archiveCustomExercise(db, request.userId, id);
    return reply.status(204).send();
  });

  app.get('/muscle-groups', async () => {
    const rows = await db.select().from(muscleGroups).orderBy(asc(muscleGroups.id));
    const order = (slug: string) => MUSCLE_ORDER.get(slug) ?? Infinity;
    return {
      items: rows
        .sort((a, b) => order(a.slug) - order(b.slug))
        .map(({ slug, nameRu, region, svgPathId }) => ({ slug, nameRu, region, svgPathId })),
    };
  });
}
