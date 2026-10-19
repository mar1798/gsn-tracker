import { describe, expect, it } from 'vitest';
import { buildApp } from './app.js';
import { loadEnv } from './env.js';

describe('GET /health', () => {
  it('returns ok', async () => {
    const app = buildApp({ LOG_LEVEL: 'silent' });
    const res = await app.inject({ method: 'GET', url: '/health' });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ status: 'ok' });
    await app.close();
  });
});

describe('loadEnv', () => {
  it('fails fast when required vars are missing', () => {
    expect(() => loadEnv({})).toThrow(/DATABASE_URL/);
  });
});
