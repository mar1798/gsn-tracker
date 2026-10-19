import { idParamsSchema, periodQuerySchema, recordsQuerySchema } from '@gsc/shared';
import type { FastifyInstance } from 'fastify';
import type { AppDeps } from '../deps.js';
import { HttpError, parse } from '../http.js';
import { exerciseProgress, muscles, overview, records } from '../services/analytics.js';
import { listExercises } from '../services/exercises.js';

export async function analyticsRoutes(app: FastifyInstance, { db }: AppDeps) {
  app.get('/analytics/overview', async (request) =>
    overview(db, request.userId, parse(periodQuerySchema, request.query)),
  );

  app.get('/analytics/muscles', async (request) =>
    muscles(db, request.userId, parse(periodQuerySchema, request.query)),
  );

  app.get('/analytics/exercises/:id', async (request) => {
    const { id } = parse(idParamsSchema, request.params);
    const period = parse(periodQuerySchema, request.query);
    if ((await listExercises(db, request.userId, { id })).length === 0) {
      throw new HttpError(404, 'not_found', 'Упражнение не найдено');
    }
    return exerciseProgress(db, request.userId, id, period);
  });

  app.get('/analytics/records', async (request) => {
    const { before } = parse(recordsQuerySchema, request.query);
    return records(db, request.userId, before ? new Date(before) : undefined);
  });
}
