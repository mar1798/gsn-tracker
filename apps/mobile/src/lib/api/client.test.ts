import type { AuthResponse } from '@gsc/shared';
import { z } from 'zod';

import { ApiError, createApiClient, type TokenStore, type Tokens } from './client';

const user = {
  id: '00000000-0000-4000-8000-000000000001',
  email: 'lifter@example.com',
  name: null,
  settings: { units: 'kg', hrMax: null, hrZones: null, bodyWeightKg: null },
  createdAt: '2026-10-19T10:00:00.000Z',
} as const;

function authResponse(n: number): AuthResponse {
  return {
    accessToken: `access-${n}`,
    accessExpiresIn: 900,
    refreshToken: `refresh-${n}`,
    user: { ...user, settings: { ...user.settings } },
  };
}

function json(status: number, body?: unknown) {
  return new Response(body === undefined ? null : JSON.stringify(body), { status });
}

function setup(initial: Tokens | null = { accessToken: 'access-0', refreshToken: 'refresh-0' }) {
  let tokens = initial;
  const store: TokenStore = {
    get: () => tokens,
    set: jest.fn((auth: AuthResponse) => {
      tokens = { accessToken: auth.accessToken, refreshToken: auth.refreshToken };
    }),
    onExpired: jest.fn(() => {
      tokens = null;
    }),
  };
  const fetchFn = jest.fn<Promise<Response>, Parameters<typeof fetch>>();
  const api = createApiClient({
    baseUrl: 'http://api.test',
    tokens: store,
    fetchFn: fetchFn as unknown as typeof fetch,
  });
  const authHeader = (call: number) =>
    (fetchFn.mock.calls[call]![1]!.headers as Record<string, string>).authorization;
  return { api, store, fetchFn, authHeader };
}

const okSchema = z.object({ ok: z.boolean() });

describe('createApiClient', () => {
  it('returns a text body as is', async () => {
    const { api, fetchFn } = setup();
    fetchFn.mockResolvedValueOnce(new Response('a,b\r\n1,2\r\n', { status: 200 }));
    await expect(api.request<string>('/export/csv', { text: true })).resolves.toBe(
      'a,b\r\n1,2\r\n',
    );

    fetchFn.mockResolvedValueOnce(json(500, { error: 'internal', message: 'Сбой' }));
    await expect(api.request<string>('/export/csv', { text: true })).rejects.toMatchObject({
      status: 500,
      message: 'Сбой',
    });
  });

  it('sends the access token, query and JSON body, and parses the response', async () => {
    const { api, fetchFn, authHeader } = setup();
    fetchFn.mockResolvedValueOnce(json(200, { ok: true }));

    const result = await api.request('/workouts', {
      method: 'POST',
      query: { cursor: 'abc', limit: 20, skip: undefined },
      body: { a: 1 },
      schema: okSchema,
    });

    expect(result).toEqual({ ok: true });
    const [url, init] = fetchFn.mock.calls[0]!;
    expect(url).toBe('http://api.test/workouts?cursor=abc&limit=20');
    expect(init?.body).toBe('{"a":1}');
    expect(authHeader(0)).toBe('Bearer access-0');
  });

  it('does not send the token for public requests', async () => {
    const { api, fetchFn, authHeader } = setup();
    fetchFn.mockResolvedValueOnce(json(204));
    await expect(api.request('/auth/logout', { method: 'POST', auth: false })).resolves.toBe(
      undefined,
    );
    expect(authHeader(0)).toBeUndefined();
  });

  it('turns API errors into ApiError with the server message', async () => {
    const { api, fetchFn } = setup();
    fetchFn.mockResolvedValueOnce(
      json(409, { error: 'duplicate', message: 'Файл уже импортирован', workoutId: 'w1' }),
    );
    const error = await api.request('/imports/fit').catch((e: unknown) => e);
    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({
      status: 409,
      code: 'duplicate',
      message: 'Файл уже импортирован',
      body: { workoutId: 'w1' },
    });
  });

  it('reports network failures and unexpected bodies', async () => {
    const { api, fetchFn } = setup();
    fetchFn.mockRejectedValueOnce(new TypeError('Network request failed'));
    await expect(api.request('/me')).rejects.toMatchObject({ code: 'network', isNetwork: true });

    fetchFn.mockResolvedValueOnce(json(200, { ok: 'yes' }));
    await expect(api.request('/me', { schema: okSchema })).rejects.toMatchObject({
      code: 'bad_response',
    });

    fetchFn.mockResolvedValueOnce(new Response('<html>', { status: 502 }));
    await expect(api.request('/me')).rejects.toMatchObject({ status: 502, code: 'http_error' });
  });

  it('refreshes once on 401 and retries with the new token', async () => {
    const { api, store, fetchFn, authHeader } = setup();
    fetchFn
      .mockResolvedValueOnce(json(401, { error: 'unauthorized', message: '...' }))
      .mockResolvedValueOnce(json(200, authResponse(1)))
      .mockResolvedValueOnce(json(200, { ok: true }));

    await expect(api.request('/me', { schema: okSchema })).resolves.toEqual({ ok: true });
    expect(fetchFn.mock.calls[1]![0]).toBe('http://api.test/auth/refresh');
    expect(fetchFn.mock.calls[1]![1]!.body).toBe('{"refreshToken":"refresh-0"}');
    expect(store.set).toHaveBeenCalledWith(authResponse(1));
    expect(authHeader(2)).toBe('Bearer access-1');
  });

  it('shares one refresh between parallel 401s', async () => {
    const { api, fetchFn } = setup();
    fetchFn.mockImplementation(async (input, init) => {
      const url = String(input);
      const auth = (init?.headers as Record<string, string>).authorization;
      if (url.endsWith('/auth/refresh')) return json(200, authResponse(1));
      return auth === 'Bearer access-1' ? json(200, { ok: true }) : json(401, {});
    });

    await Promise.all([
      api.request('/a', { schema: okSchema }),
      api.request('/b', { schema: okSchema }),
      api.request('/c', { schema: okSchema }),
    ]);
    const refreshCalls = fetchFn.mock.calls.filter(([url]) => String(url).endsWith('/refresh'));
    expect(refreshCalls).toHaveLength(1);
  });

  it('ends the session when the refresh token is rejected', async () => {
    const { api, store, fetchFn } = setup();
    fetchFn
      .mockResolvedValueOnce(json(401, {}))
      .mockResolvedValueOnce(json(401, { error: 'invalid_refresh_token', message: '...' }));

    await expect(api.request('/me')).rejects.toMatchObject({
      status: 401,
      code: 'session_expired',
    });
    expect(store.onExpired).toHaveBeenCalledTimes(1);
    expect(fetchFn).toHaveBeenCalledTimes(2);
  });

  it('keeps the session when the refresh fails because of the network', async () => {
    const { api, store, fetchFn } = setup();
    fetchFn.mockResolvedValueOnce(json(401, {})).mockRejectedValueOnce(new TypeError('offline'));

    await expect(api.request('/me')).rejects.toMatchObject({ code: 'network' });
    expect(store.onExpired).not.toHaveBeenCalled();
  });
});
