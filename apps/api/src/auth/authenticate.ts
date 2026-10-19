import type { FastifyInstance } from 'fastify';
import { HttpError } from '../http.js';
import { verifyAccessToken } from './tokens.js';

declare module 'fastify' {
  interface FastifyRequest {
    /** Set by `requireAuth` for every route registered after it. */
    userId: string;
  }
}

const unauthorized = () => new HttpError(401, 'unauthorized', 'Требуется вход');

/** Adds a Bearer access token check to every route of this (encapsulated) scope. */
export function requireAuth(app: FastifyInstance, secret: string) {
  app.decorateRequest('userId', '');
  app.addHook('onRequest', async (request) => {
    const [scheme, token] = request.headers.authorization?.split(' ') ?? [];
    if (scheme !== 'Bearer' || !token) throw unauthorized();
    const userId = await verifyAccessToken(token, secret);
    if (!userId) throw unauthorized();
    request.userId = userId;
  });
}
