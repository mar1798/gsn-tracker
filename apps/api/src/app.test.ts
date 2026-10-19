import { describe, expect, it } from 'vitest';
import { useTestApp } from '../test/helpers.js';
import { loadEnv } from './env.js';

describe('GET /health', () => {
  const { app } = useTestApp();

  it('returns ok', async () => {
    const res = await app.inject({ method: 'GET', url: '/health' });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ status: 'ok' });
  });
});

describe('loadEnv', () => {
  it('fails fast when required vars are missing', () => {
    expect(() => loadEnv({})).toThrow(/DATABASE_URL/);
  });

  it('rejects a short JWT secret', () => {
    expect(() =>
      loadEnv({
        DATABASE_URL: 'postgres://u:p@localhost:5432/db',
        S3_ENDPOINT: 'http://localhost:8333',
        S3_BUCKET: 'b',
        S3_ACCESS_KEY: 'k',
        S3_SECRET_KEY: 's',
        JWT_SECRET: 'short',
      }),
    ).toThrow(/JWT_SECRET/);
  });
});
