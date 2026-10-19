import { userSettingsSchema, type User } from '@gsc/shared';
import { eq } from 'drizzle-orm';
import type { Db } from '../db/client.js';
import { users } from '../db/schema.js';
import { notFound } from '../http.js';

type UserRow = typeof users.$inferSelect;

export function toUser(row: UserRow): User {
  return {
    id: row.id,
    email: row.email,
    name: row.name,
    // Stored settings are partial; defaults fill the rest.
    settings: userSettingsSchema.parse(row.settings),
    createdAt: row.createdAt.toISOString(),
  };
}

export async function getUser(db: Db, userId: string): Promise<UserRow> {
  const [row] = await db.select().from(users).where(eq(users.id, userId));
  if (!row) throw notFound('Пользователь не найден');
  return row;
}
