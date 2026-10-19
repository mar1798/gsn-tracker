import multipart from '@fastify/multipart';
import type { ImportFitResponse } from '@gsc/shared';
import type { FastifyInstance } from 'fastify';
import type { AppDeps } from '../deps.js';
import { HttpError } from '../http.js';
import { DuplicateImportError, importFit } from '../services/import-fit.js';

export async function importRoutes(app: FastifyInstance, deps: AppDeps) {
  await app.register(multipart, { limits: { fileSize: deps.config.FIT_MAX_BYTES, files: 1 } });

  /** multipart/form-data with one `file` field. */
  app.post('/imports/fit', async (request, reply) => {
    const file = await request.file();
    if (!file) throw new HttpError(400, 'no_file', 'Выберите FIT-файл');
    const bytes = await file.toBuffer();

    try {
      const result: ImportFitResponse = await importFit(deps, {
        userId: request.userId,
        source: 'manual_fit',
        bytes,
      });
      return reply.status(201).send(result);
    } catch (err) {
      if (err instanceof DuplicateImportError) {
        throw new HttpError(409, 'duplicate', 'Файл уже импортирован', {
          workoutId: err.workoutId,
        });
      }
      throw err;
    }
  });
}
