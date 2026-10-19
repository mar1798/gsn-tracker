import type { AppleTokenVerifier } from './auth/apple.js';
import type { Db } from './db/client.js';
import type { Env } from './env.js';
import type { FileStorage } from './storage.js';

export type AppConfig = Pick<
  Env,
  'LOG_LEVEL' | 'JWT_SECRET' | 'JWT_ACCESS_TTL_SEC' | 'REFRESH_TOKEN_TTL_DAYS' | 'FIT_MAX_BYTES'
>;

export interface AppDeps {
  config: AppConfig;
  db: Db;
  storage: FileStorage;
  /** `null` when Sign in with Apple is not configured (`APPLE_BUNDLE_ID` unset). */
  verifyAppleToken: AppleTokenVerifier | null;
}
