import postgres from 'postgres';
import { createDb } from '../src/db/client.js';
import { runMigrations } from '../src/db/migrate.js';
import { seedCatalog } from '../src/db/seed.js';
import { TEST_DATABASE_URL } from './db-url.js';

export async function setup() {
  const url = new URL(TEST_DATABASE_URL);
  const name = url.pathname.slice(1);
  if (!/^\w*test\w*$/.test(name)) {
    throw new Error(`Refusing to recreate "${name}": the test database name must contain "test"`);
  }

  const admin = new URL(url);
  admin.pathname = '/postgres';
  const sql = postgres(admin.href, { max: 1, onnotice: () => {} });
  try {
    await sql.unsafe(`DROP DATABASE IF EXISTS "${name}" WITH (FORCE)`);
    await sql.unsafe(`CREATE DATABASE "${name}"`);
  } catch (err) {
    throw new Error(
      `Cannot prepare the test database (is \`pnpm db:up\` running?): ${String(err)}`,
    );
  } finally {
    await sql.end();
  }

  const { db, close } = createDb(TEST_DATABASE_URL);
  await runMigrations(db);
  await seedCatalog(db);
  await close();
}
