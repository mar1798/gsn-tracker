import { drizzle, type ExpoSQLiteDatabase } from 'drizzle-orm/expo-sqlite';
import { openDatabaseSync } from 'expo-sqlite';

import { migrate } from './migrations';
import * as schema from './schema';

export type LocalDb = ExpoSQLiteDatabase<typeof schema>;

let instance: LocalDb | null = null;

/** Opened lazily on first use and migrated synchronously (the cache is tiny). */
export function getDb(): LocalDb {
  if (!instance) {
    const sqlite = openDatabaseSync('gsc-cache.db');
    migrate(sqlite);
    instance = drizzle(sqlite, { schema });
  }
  return instance;
}
