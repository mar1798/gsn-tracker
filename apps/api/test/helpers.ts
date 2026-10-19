import { readFileSync } from 'node:fs';
import { authResponseSchema, type AuthResponse } from '@gsc/shared';
import { sql } from 'drizzle-orm';
import { afterAll, beforeEach } from 'vitest';
import { buildApp } from '../src/app.js';
import { createDb, type Db } from '../src/db/client.js';
import type { AppConfig, AppDeps } from '../src/deps.js';
import { MemoryStorage } from '../src/storage.js';
import { TEST_DATABASE_URL } from './db-url.js';

export const TEST_CONFIG: AppConfig = {
  LOG_LEVEL: 'silent',
  JWT_SECRET: 'test-only-secret-0123456789abcdefghijklmnop',
  JWT_ACCESS_TTL_SEC: 900,
  REFRESH_TOKEN_TTL_DAYS: 30,
  FIT_MAX_BYTES: 1024 * 1024,
};

export const FIXTURE_FIT = readFileSync(
  new URL('../../../fixtures/fit/2026-10-17_strength_epix2pro.fit', import.meta.url),
);

/** App over the test database; user data is wiped before each test, the catalog is kept. */
export function useTestApp(overrides: Partial<AppDeps> = {}) {
  const { db, close } = createDb(TEST_DATABASE_URL);
  const storage = new MemoryStorage();
  const app = buildApp({ config: TEST_CONFIG, db, storage, verifyAppleToken: null, ...overrides });

  beforeEach(async () => {
    await resetData(db);
    storage.objects.clear();
  });
  afterAll(async () => {
    await app.close();
    await close();
  });

  return { app, db, storage };
}

export async function resetData(db: Db) {
  // DELETE, not TRUNCATE ... CASCADE: that would empty `exercises` too (it references users).
  // FK cascades remove workouts, sets, annotations, tokens and custom exercises.
  await db.execute(sql`DELETE FROM users`);
}

type App = ReturnType<typeof buildApp>;

export async function registerUser(app: App, email = 'lifter@example.com') {
  const res = await app.inject({
    method: 'POST',
    url: '/auth/register',
    payload: { email, password: 'correct horse battery', name: 'Тест' },
  });
  if (res.statusCode !== 201) throw new Error(`register failed: ${res.body}`);
  const auth: AuthResponse = authResponseSchema.parse(res.json());
  return { ...auth, headers: { authorization: `Bearer ${auth.accessToken}` } };
}

/** multipart/form-data body with one `file` field. */
export function multipartFile(bytes: Uint8Array, filename = 'workout.fit') {
  const boundary = `----gsc${Math.random().toString(16).slice(2)}`;
  const payload = Buffer.concat([
    Buffer.from(
      `--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="${filename}"\r\n` +
        'Content-Type: application/octet-stream\r\n\r\n',
    ),
    bytes,
    Buffer.from(`\r\n--${boundary}--\r\n`),
  ]);
  return { payload, headers: { 'content-type': `multipart/form-data; boundary=${boundary}` } };
}

export async function importFixture(app: App, headers: Record<string, string>) {
  const upload = multipartFile(FIXTURE_FIT);
  const res = await app.inject({
    method: 'POST',
    url: '/imports/fit',
    payload: upload.payload,
    headers: { ...headers, ...upload.headers },
  });
  if (res.statusCode !== 201) throw new Error(`import failed: ${res.body}`);
  return (res.json() as { workoutId: string }).workoutId;
}
