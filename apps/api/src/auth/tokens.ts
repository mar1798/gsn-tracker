import { createHash, randomBytes } from 'node:crypto';
import { jwtVerify, SignJWT } from 'jose';

const ISSUER = 'gsc-tracker';

export interface TokenConfig {
  JWT_SECRET: string;
  JWT_ACCESS_TTL_SEC: number;
  REFRESH_TOKEN_TTL_DAYS: number;
}

const key = (secret: string) => new TextEncoder().encode(secret);

export function signAccessToken(userId: string, config: TokenConfig): Promise<string> {
  return new SignJWT()
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(userId)
    .setIssuer(ISSUER)
    .setIssuedAt()
    .setExpirationTime(`${config.JWT_ACCESS_TTL_SEC}s`)
    .sign(key(config.JWT_SECRET));
}

/** Returns the user id, or `null` for an invalid or expired token. */
export async function verifyAccessToken(token: string, secret: string): Promise<string | null> {
  try {
    const { payload } = await jwtVerify(token, key(secret), {
      issuer: ISSUER,
      algorithms: ['HS256'],
    });
    return payload.sub ?? null;
  } catch {
    return null;
  }
}

/** Opaque refresh token; only its hash is stored. */
export function newRefreshToken(config: TokenConfig) {
  const token = randomBytes(32).toString('base64url');
  const expiresAt = new Date(Date.now() + config.REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000);
  return { token, tokenHash: hashRefreshToken(token), expiresAt };
}

export function hashRefreshToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}
