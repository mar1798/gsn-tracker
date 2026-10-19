import { FitParseError, type FitParseErrorCode } from '@gsc/fit-parser';
import type { ApiError } from '@gsc/shared';
import type { FastifyError, FastifyReply, FastifyRequest } from 'fastify';
import { ZodError, type z } from 'zod';

/** Expected error with a user-facing (Russian) message. */
export class HttpError extends Error {
  constructor(
    readonly statusCode: number,
    readonly code: string,
    message: string,
    readonly extra: Record<string, unknown> = {},
  ) {
    super(message);
  }
}

export const notFound = (what = 'Не найдено') => new HttpError(404, 'not_found', what);

export function parse<T extends z.ZodType>(schema: T, data: unknown): z.infer<T> {
  return schema.parse(data);
}

const FIT_ERROR_MESSAGES: Record<FitParseErrorCode, string> = {
  not_fit: 'Это не FIT-файл',
  corrupted: 'Файл повреждён',
  no_session: 'В файле нет данных тренировки',
  not_strength: 'Это не силовая тренировка',
};

export function errorHandler(error: FastifyError, request: FastifyRequest, reply: FastifyReply) {
  const send = (status: number, body: ApiError & Record<string, unknown>) =>
    reply.status(status).send(body);

  if (error instanceof HttpError) {
    return send(error.statusCode, { error: error.code, message: error.message, ...error.extra });
  }
  if (error instanceof ZodError) {
    return send(400, {
      error: 'validation',
      message: 'Некорректные данные',
      issues: error.issues.map((i) => ({ path: i.path.join('.'), message: i.message })),
    });
  }
  if (error instanceof FitParseError) {
    return send(422, { error: error.code, message: FIT_ERROR_MESSAGES[error.code] });
  }
  if (error.statusCode === 413) {
    return send(413, { error: 'file_too_large', message: 'Файл слишком большой' });
  }
  if (error.statusCode && error.statusCode < 500) {
    return send(error.statusCode, { error: error.code ?? 'bad_request', message: error.message });
  }

  request.log.error(error);
  return send(500, { error: 'internal', message: 'Что-то пошло не так. Попробуйте ещё раз' });
}
