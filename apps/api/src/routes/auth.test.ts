import { authResponseSchema, userSchema } from '@gsc/shared';
import { describe, expect, it, vi } from 'vitest';
import { registerUser, useTestApp } from '../../test/helpers.js';
import type { AppleTokenVerifier } from '../auth/apple.js';

describe('email auth', () => {
  const { app } = useTestApp();

  it('registers a user and returns tokens', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/auth/register',
      payload: { email: '  Lifter@Example.com ', password: 'correct horse battery' },
    });
    expect(res.statusCode, res.body).toBe(201);
    const body = authResponseSchema.parse(res.json());
    expect(body.user.email).toBe('lifter@example.com');
    expect(body.user.settings).toEqual({
      units: 'kg',
      hrMax: null,
      hrZones: null,
      bodyWeightKg: null,
    });
  });

  it('rejects a taken email and a short password', async () => {
    await registerUser(app);
    const taken = await app.inject({
      method: 'POST',
      url: '/auth/register',
      payload: { email: 'LIFTER@example.com', password: 'another password' },
    });
    expect(taken.statusCode).toBe(409);
    expect(taken.json()).toMatchObject({ error: 'email_taken' });

    const short = await app.inject({
      method: 'POST',
      url: '/auth/register',
      payload: { email: 'new@example.com', password: '123' },
    });
    expect(short.statusCode).toBe(400);
    expect(short.json()).toMatchObject({ error: 'validation' });
  });

  it('logs in with the right password only', async () => {
    await registerUser(app);
    const ok = await app.inject({
      method: 'POST',
      url: '/auth/login',
      payload: { email: 'lifter@example.com', password: 'correct horse battery' },
    });
    expect(ok.statusCode).toBe(200);

    for (const payload of [
      { email: 'lifter@example.com', password: 'wrong password' },
      { email: 'nobody@example.com', password: 'correct horse battery' },
    ]) {
      const res = await app.inject({ method: 'POST', url: '/auth/login', payload });
      expect(res.statusCode).toBe(401);
      expect(res.json()).toMatchObject({ error: 'invalid_credentials' });
    }
  });

  it('rotates refresh tokens: each one works once', async () => {
    const { refreshToken } = await registerUser(app);
    const first = await app.inject({
      method: 'POST',
      url: '/auth/refresh',
      payload: { refreshToken },
    });
    expect(first.statusCode).toBe(200);
    const next = authResponseSchema.parse(first.json());
    expect(next.refreshToken).not.toBe(refreshToken);

    const reused = await app.inject({
      method: 'POST',
      url: '/auth/refresh',
      payload: { refreshToken },
    });
    expect(reused.statusCode).toBe(401);

    const me = await app.inject({
      method: 'GET',
      url: '/me',
      headers: { authorization: `Bearer ${next.accessToken}` },
    });
    expect(me.statusCode).toBe(200);
  });

  it('protects routes with the access token', async () => {
    expect((await app.inject({ method: 'GET', url: '/me' })).statusCode).toBe(401);
    const bad = await app.inject({
      method: 'GET',
      url: '/me',
      headers: { authorization: 'Bearer not-a-jwt' },
    });
    expect(bad.statusCode).toBe(401);
    expect(bad.json()).toMatchObject({ error: 'unauthorized', message: 'Требуется вход' });
  });
});

describe('/me', () => {
  const { app } = useTestApp();

  it('returns and patches settings', async () => {
    const { headers } = await registerUser(app);
    const me = userSchema.parse((await app.inject({ method: 'GET', url: '/me', headers })).json());
    expect(me.name).toBe('Тест');

    const patched = await app.inject({
      method: 'PATCH',
      url: '/me/settings',
      headers,
      payload: { units: 'lb', bodyWeightKg: 80 },
    });
    expect(patched.statusCode).toBe(200);
    expect(userSchema.parse(patched.json()).settings).toEqual({
      units: 'lb',
      hrMax: null,
      hrZones: null,
      bodyWeightKg: 80,
    });

    const again = await app.inject({
      method: 'PATCH',
      url: '/me/settings',
      headers,
      payload: { hrMax: 190 },
    });
    expect(userSchema.parse(again.json()).settings).toMatchObject({ units: 'lb', hrMax: 190 });

    const invalid = await app.inject({
      method: 'PATCH',
      url: '/me/settings',
      headers,
      payload: { units: 'stone' },
    });
    expect(invalid.statusCode).toBe(400);
  });
});

describe('POST /auth/apple', () => {
  describe('not configured', () => {
    const { app } = useTestApp();

    it('answers 501', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/auth/apple',
        payload: { identityToken: 'token' },
      });
      expect(res.statusCode).toBe(501);
    });
  });

  describe('configured', () => {
    const verify = vi.fn<AppleTokenVerifier>();
    const { app } = useTestApp({ verifyAppleToken: verify });

    it('creates a user once and signs the same user in later', async () => {
      verify.mockResolvedValue({ sub: 'apple-1', email: null, emailVerified: false });
      const first = await app.inject({
        method: 'POST',
        url: '/auth/apple',
        payload: { identityToken: 't', name: 'Иван' },
      });
      expect(first.statusCode).toBe(200);
      const second = await app.inject({
        method: 'POST',
        url: '/auth/apple',
        payload: { identityToken: 't' },
      });
      expect(authResponseSchema.parse(second.json()).user).toMatchObject({
        id: authResponseSchema.parse(first.json()).user.id,
        name: 'Иван',
        email: null,
      });
    });

    it('links to an existing account with the same verified email', async () => {
      const { user } = await registerUser(app, 'lifter@example.com');
      verify.mockResolvedValue({
        sub: 'apple-2',
        email: 'lifter@example.com',
        emailVerified: true,
      });
      const res = await app.inject({
        method: 'POST',
        url: '/auth/apple',
        payload: { identityToken: 't' },
      });
      expect(authResponseSchema.parse(res.json()).user.id).toBe(user.id);
    });

    it('rejects an invalid token', async () => {
      verify.mockRejectedValue(new Error('bad signature'));
      const res = await app.inject({
        method: 'POST',
        url: '/auth/apple',
        payload: { identityToken: 't' },
      });
      expect(res.statusCode).toBe(401);
      expect(res.json()).toMatchObject({ error: 'invalid_apple_token' });
    });
  });
});
