import Fastify from 'fastify';
import { requireAuth } from './auth/authenticate.js';
import type { AppDeps } from './deps.js';
import { errorHandler } from './http.js';
import { analyticsRoutes } from './routes/analytics.js';
import { authRoutes } from './routes/auth.js';
import { exerciseRoutes } from './routes/exercises.js';
import { exportRoutes } from './routes/export.js';
import { importRoutes } from './routes/imports.js';
import { meRoutes } from './routes/me.js';
import { setRoutes } from './routes/sets.js';
import { workoutRoutes } from './routes/workouts.js';

export function buildApp(deps: AppDeps) {
  const app = Fastify({ logger: { level: deps.config.LOG_LEVEL } });
  app.setErrorHandler(errorHandler);

  app.get('/health', async () => ({ status: 'ok' }));
  app.register(authRoutes, deps);

  app.register(async (authed) => {
    requireAuth(authed, deps.config.JWT_SECRET);
    await authed.register(meRoutes, deps);
    await authed.register(importRoutes, deps);
    await authed.register(workoutRoutes, deps);
    await authed.register(setRoutes, deps);
    await authed.register(exerciseRoutes, deps);
    await authed.register(analyticsRoutes, deps);
    await authed.register(exportRoutes, deps);
  });

  return app;
}
