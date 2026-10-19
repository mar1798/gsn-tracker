import {
  appleAuthRequestSchema,
  loginRequestSchema,
  refreshRequestSchema,
  registerRequestSchema,
  type AuthResponse,
} from '@gsc/shared';
import { and, eq, isNull, lt } from 'drizzle-orm';
import type { FastifyInstance } from 'fastify';
import { dummyPasswordHash, hashPassword, verifyPassword } from '../auth/password.js';
import { hashRefreshToken, newRefreshToken, signAccessToken } from '../auth/tokens.js';
import { refreshTokens, users } from '../db/schema.js';
import type { AppDeps } from '../deps.js';
import { HttpError, parse } from '../http.js';
import { isUniqueViolation } from '../services/pg-errors.js';
import { getUser, toUser } from '../services/users.js';

export async function authRoutes(app: FastifyInstance, { db, config, verifyAppleToken }: AppDeps) {
  async function issueTokens(userId: string): Promise<AuthResponse> {
    const refresh = newRefreshToken(config);
    // Expired tokens are useless; drop the user's ones on the way.
    await db
      .delete(refreshTokens)
      .where(and(eq(refreshTokens.userId, userId), lt(refreshTokens.expiresAt, new Date())));
    await db.insert(refreshTokens).values({
      userId,
      tokenHash: refresh.tokenHash,
      expiresAt: refresh.expiresAt,
    });
    return {
      accessToken: await signAccessToken(userId, config),
      accessExpiresIn: config.JWT_ACCESS_TTL_SEC,
      refreshToken: refresh.token,
      user: toUser(await getUser(db, userId)),
    };
  }

  app.post('/auth/register', async (request, reply) => {
    const body = parse(registerRequestSchema, request.body);
    const passwordHash = await hashPassword(body.password);
    try {
      const [user] = await db
        .insert(users)
        .values({ email: body.email, passwordHash, name: body.name ?? null })
        .returning({ id: users.id });
      return reply.status(201).send(await issueTokens(user!.id));
    } catch (err) {
      if (isUniqueViolation(err)) {
        throw new HttpError(409, 'email_taken', 'Этот email уже зарегистрирован');
      }
      throw err;
    }
  });

  app.post('/auth/login', async (request) => {
    const body = parse(loginRequestSchema, request.body);
    const [user] = await db.select().from(users).where(eq(users.email, body.email));
    const ok = await verifyPassword(
      body.password,
      user?.passwordHash ?? (await dummyPasswordHash()),
    );
    if (!user?.passwordHash || !ok) {
      throw new HttpError(401, 'invalid_credentials', 'Неверный email или пароль');
    }
    return issueTokens(user.id);
  });

  app.post('/auth/refresh', async (request) => {
    const { refreshToken } = parse(refreshRequestSchema, request.body);
    // Rotation: the presented token is consumed whether or not it is still valid.
    const [used] = await db
      .delete(refreshTokens)
      .where(eq(refreshTokens.tokenHash, hashRefreshToken(refreshToken)))
      .returning();
    if (!used || used.expiresAt <= new Date()) {
      throw new HttpError(401, 'invalid_refresh_token', 'Сессия истекла, войдите снова');
    }
    return issueTokens(used.userId);
  });

  app.post('/auth/apple', async (request) => {
    if (!verifyAppleToken) {
      throw new HttpError(501, 'apple_not_configured', 'Вход через Apple пока недоступен');
    }
    const body = parse(appleAuthRequestSchema, request.body);
    const identity = await verifyAppleToken(body.identityToken).catch(() => {
      throw new HttpError(401, 'invalid_apple_token', 'Не удалось войти через Apple');
    });

    const [byApple] = await db.select().from(users).where(eq(users.appleSub, identity.sub));
    if (byApple) return issueTokens(byApple.id);

    // Apple-verified email of an existing account: link instead of creating a duplicate.
    if (identity.email && identity.emailVerified) {
      const [linked] = await db
        .update(users)
        .set({ appleSub: identity.sub })
        .where(and(eq(users.email, identity.email), isNull(users.appleSub)))
        .returning({ id: users.id });
      if (linked) return issueTokens(linked.id);
    }

    const [created] = await db
      .insert(users)
      .values({ appleSub: identity.sub, email: identity.email, name: body.name ?? null })
      .returning({ id: users.id });
    return issueTokens(created!.id);
  });
}
