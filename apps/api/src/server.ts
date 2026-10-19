import { createAppleVerifier } from './auth/apple.js';
import { buildApp } from './app.js';
import { createDb } from './db/client.js';
import { loadEnv } from './env.js';
import { S3Storage } from './storage.js';

const env = loadEnv();
const { db, close } = createDb(env.DATABASE_URL);
const app = buildApp({
  config: env,
  db,
  storage: new S3Storage(env, env.S3_BUCKET),
  verifyAppleToken: env.APPLE_BUNDLE_ID ? createAppleVerifier(env.APPLE_BUNDLE_ID) : null,
});
app.addHook('onClose', close);

try {
  await app.listen({ host: env.API_HOST, port: env.API_PORT });
} catch (err) {
  app.log.error(err);
  process.exit(1);
}
