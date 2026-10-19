/** Minimal slice of expo-sqlite's `SQLiteDatabase` the migrator needs. */
export interface MigratableDb {
  getFirstSync<T>(source: string): T | null;
  execSync(source: string): void;
  withTransactionSync(task: () => void): void;
}

/**
 * Hand-written SQL migrations, applied in order and tracked with `PRAGMA user_version`.
 * drizzle-kit's expo migrations need a Babel plugin to bundle `.sql` files; the cache is small
 * enough that plain strings next to `schema.ts` are simpler. Never edit an applied entry.
 */
export const migrations: readonly string[] = [
  `CREATE TABLE cached_workouts (
     id TEXT PRIMARY KEY NOT NULL,
     user_id TEXT NOT NULL,
     started_at TEXT NOT NULL,
     summary TEXT NOT NULL,
     cached_at INTEGER NOT NULL
   );
   CREATE INDEX cached_workouts_user_started_idx ON cached_workouts (user_id, started_at);`,
  `CREATE TABLE cached_workout_details (
     id TEXT PRIMARY KEY NOT NULL,
     user_id TEXT NOT NULL,
     detail TEXT NOT NULL,
     hr TEXT,
     cached_at INTEGER NOT NULL
   );
   CREATE TABLE cached_exercises (
     user_id TEXT PRIMARY KEY NOT NULL,
     items TEXT NOT NULL,
     cached_at INTEGER NOT NULL
   );
   CREATE TABLE pending_edits (
     id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
     user_id TEXT NOT NULL,
     edit TEXT NOT NULL,
     created_at INTEGER NOT NULL
   );
   CREATE INDEX pending_edits_user_idx ON pending_edits (user_id, id);
   CREATE TABLE recent_exercises (
     user_id TEXT NOT NULL,
     exercise_id TEXT NOT NULL,
     used_at INTEGER NOT NULL,
     PRIMARY KEY (user_id, exercise_id)
   );`,
];

export function migrate(db: MigratableDb, list: readonly string[] = migrations) {
  const current =
    db.getFirstSync<{ user_version: number }>('PRAGMA user_version')?.user_version ?? 0;
  for (let version = current; version < list.length; version++) {
    db.withTransactionSync(() => {
      db.execSync(list[version]!);
      db.execSync(`PRAGMA user_version = ${version + 1}`);
    });
  }
}
