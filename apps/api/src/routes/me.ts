import { userSettingsPatchSchema } from '@gsc/shared';
import { eq, isNotNull, and } from 'drizzle-orm';
import type { FastifyInstance } from 'fastify';
import { users, workouts } from '../db/schema.js';
import type { AppDeps } from '../deps.js';
import { parse } from '../http.js';
import { getUser, toUser } from '../services/users.js';

export async function meRoutes(app: FastifyInstance, { db, storage }: AppDeps) {
  app.get('/me', async (request) => toUser(await getUser(db, request.userId)));

  app.patch('/me/settings', async (request) => {
    const patch = parse(userSettingsPatchSchema, request.body);
    const user = await getUser(db, request.userId);
    const [updated] = await db
      .update(users)
      .set({ settings: { ...user.settings, ...patch } })
      .where(eq(users.id, request.userId))
      .returning();
    return toUser(updated!);
  });

  // Account deletion (App Store requirement): FK cascades remove workouts, sets, annotations,
  // manual sets, custom exercises, refresh tokens and Garmin connections.
  // TODO(phase 9): revoke Sign in with Apple tokens once the app keeps them (it does not yet).
  app.delete('/me', async (request, reply) => {
    await getUser(db, request.userId);
    const files = await db
      .select({ key: workouts.fitObjectKey })
      .from(workouts)
      .where(and(eq(workouts.userId, request.userId), isNotNull(workouts.fitObjectKey)));
    await db.delete(users).where(eq(users.id, request.userId));
    // The account is gone either way; an orphaned object is harmless.
    await Promise.all(
      files.map(({ key }) =>
        storage.delete(key!).catch((err: unknown) => {
          request.log.warn({ err, key }, 'Failed to delete FIT object');
        }),
      ),
    );
    return reply.status(204).send();
  });
}
