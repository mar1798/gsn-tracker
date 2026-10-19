import { userSettingsPatchSchema } from '@gsc/shared';
import { eq } from 'drizzle-orm';
import type { FastifyInstance } from 'fastify';
import { users } from '../db/schema.js';
import type { AppDeps } from '../deps.js';
import { parse } from '../http.js';
import { getUser, toUser } from '../services/users.js';

export async function meRoutes(app: FastifyInstance, { db }: AppDeps) {
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
}
