import type { FastifyInstance } from 'fastify';
import type { AppDeps } from '../deps.js';
import { exportSetsCsv } from '../services/export.js';

export async function exportRoutes(app: FastifyInstance, { db }: AppDeps) {
  app.get('/export/csv', async (request, reply) => {
    const csv = await exportSetsCsv(db, request.userId);
    const date = new Date().toISOString().slice(0, 10);
    return reply
      .header('content-type', 'text/csv; charset=utf-8')
      .header('content-disposition', `attachment; filename="gsc-tracker-sets-${date}.csv"`)
      .send(csv);
  });
}
