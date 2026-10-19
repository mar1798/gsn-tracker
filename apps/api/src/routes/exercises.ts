import { exerciseListQuerySchema, MUSCLE_GROUPS } from '@gsc/shared';
import { asc } from 'drizzle-orm';
import type { FastifyInstance } from 'fastify';
import { muscleGroups } from '../db/schema.js';
import type { AppDeps } from '../deps.js';
import { parse } from '../http.js';
import { listExercises } from '../services/exercises.js';

const MUSCLE_ORDER = new Map<string, number>(MUSCLE_GROUPS.map((m, i) => [m.slug, i]));

export async function exerciseRoutes(app: FastifyInstance, { db }: AppDeps) {
  app.get('/exercises', async (request) => ({
    items: await listExercises(db, request.userId, parse(exerciseListQuerySchema, request.query)),
  }));

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
