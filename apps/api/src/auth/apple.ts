import { createRemoteJWKSet, jwtVerify } from 'jose';

export interface AppleIdentity {
  sub: string;
  email: string | null;
  emailVerified: boolean;
}

/** Verifies a Sign in with Apple identity token; throws if it is invalid. */
export type AppleTokenVerifier = (identityToken: string) => Promise<AppleIdentity>;

// https://developer.apple.com/documentation/signinwithapple/verifying-a-user
const APPLE_ISSUER = 'https://appleid.apple.com';
const APPLE_KEYS_URL = new URL('https://appleid.apple.com/auth/keys');

export function createAppleVerifier(bundleId: string): AppleTokenVerifier {
  const keys = createRemoteJWKSet(APPLE_KEYS_URL);
  return async (identityToken) => {
    const { payload } = await jwtVerify(identityToken, keys, {
      issuer: APPLE_ISSUER,
      audience: bundleId,
    });
    if (!payload.sub) throw new Error('Apple identity token has no sub');
    const email = typeof payload.email === 'string' ? payload.email.toLowerCase() : null;
    // Apple sends `email_verified` as a boolean or as the string "true".
    const emailVerified = payload.email_verified === true || payload.email_verified === 'true';
    return { sub: payload.sub, email, emailVerified };
  };
}
