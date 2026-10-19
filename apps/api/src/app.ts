import Fastify from 'fastify';
import type { Env } from './env.js';

export function buildApp(env: Pick<Env, 'LOG_LEVEL'>) {
  const app = Fastify({ logger: { level: env.LOG_LEVEL } });

  app.get('/health', async () => ({ status: 'ok' }));

  return app;
}
