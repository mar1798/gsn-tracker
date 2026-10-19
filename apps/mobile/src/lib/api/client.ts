import { apiErrorSchema, authResponseSchema, type AuthResponse } from '@gsc/shared';
import type { z } from 'zod';

export const NETWORK_ERROR_MESSAGE =
  'Нет связи с сервером. Проверьте интернет и попробуйте ещё раз.';
const BAD_RESPONSE_MESSAGE = 'Неожиданный ответ сервера. Попробуйте обновить приложение.';
const SESSION_EXPIRED_MESSAGE = 'Сессия истекла, войдите снова';

/** Every failed request. `message` is user-facing (Russian), `code` is for branching. */
export class ApiError extends Error {
  constructor(
    /** 0 = no HTTP response (network) or an unreadable one. */
    readonly status: number,
    readonly code: string,
    message: string,
    /** Parsed JSON body of the error response, if any. */
    readonly body?: unknown,
  ) {
    super(message);
    this.name = 'ApiError';
  }

  get isNetwork() {
    return this.code === 'network';
  }
}

export type Tokens = { accessToken: string; refreshToken: string };

export interface TokenStore {
  get(): Tokens | null;
  /** Called after a successful refresh (the refresh token rotates every time). */
  set(auth: AuthResponse): void | Promise<void>;
  /** The refresh token was rejected: the session is gone. */
  onExpired(): void;
}

type Method = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

export type RequestOptions<T> = {
  method?: Method;
  /** JSON body. */
  body?: unknown;
  formData?: FormData;
  query?: Record<string, string | number | undefined>;
  /** Response body schema; omit for empty (204) responses. */
  schema?: z.ZodType<T>;
  /** Send the access token and refresh it on 401. Default `true`. */
  auth?: boolean;
};

export type ApiClient = ReturnType<typeof createApiClient>;

export function createApiClient({
  baseUrl,
  tokens,
  fetchFn = fetch,
}: {
  baseUrl: string;
  tokens: TokenStore;
  fetchFn?: typeof fetch;
}) {
  let refreshing: Promise<boolean> | null = null;

  async function send(path: string, options: RequestOptions<unknown>, accessToken?: string) {
    const url = new URL(path, baseUrl);
    for (const [key, value] of Object.entries(options.query ?? {})) {
      if (value !== undefined) url.searchParams.set(key, String(value));
    }
    const headers: Record<string, string> = { accept: 'application/json' };
    if (accessToken) headers.authorization = `Bearer ${accessToken}`;
    let body: BodyInit | undefined;
    if (options.formData) {
      body = options.formData;
    } else if (options.body !== undefined) {
      headers['content-type'] = 'application/json';
      body = JSON.stringify(options.body);
    }

    try {
      return await fetchFn(url.toString(), { method: options.method ?? 'GET', headers, body });
    } catch {
      throw new ApiError(0, 'network', NETWORK_ERROR_MESSAGE);
    }
  }

  async function doRefresh(): Promise<boolean> {
    const current = tokens.get();
    if (!current) return false;
    const res = await send('/auth/refresh', {
      method: 'POST',
      body: { refreshToken: current.refreshToken },
    });
    if (res.status === 401) return false;
    await tokens.set(await readBody(res, authResponseSchema));
    return true;
  }

  /** Single flight: parallel 401s share one refresh, since each refresh token works only once. */
  function refresh() {
    refreshing ??= doRefresh().finally(() => {
      refreshing = null;
    });
    return refreshing;
  }

  async function request<T = void>(path: string, options: RequestOptions<T> = {}): Promise<T> {
    const auth = options.auth ?? true;
    const usedToken = auth ? tokens.get()?.accessToken : undefined;
    let res = await send(path, options, usedToken);

    if (res.status === 401 && usedToken) {
      // Another request may have refreshed already while this one was in flight.
      const fresh = tokens.get()?.accessToken;
      const ok = fresh && fresh !== usedToken ? true : await refresh();
      if (!ok) {
        tokens.onExpired();
        throw new ApiError(401, 'session_expired', SESSION_EXPIRED_MESSAGE);
      }
      res = await send(path, options, tokens.get()?.accessToken);
    }

    return readBody(res, options.schema);
  }

  return { request };
}

async function readBody<T>(res: Response, schema: z.ZodType<T> | undefined): Promise<T> {
  const text = await res.text().catch(() => '');
  let json: unknown;
  try {
    json = text ? JSON.parse(text) : undefined;
  } catch {
    json = undefined;
  }

  if (!res.ok) {
    const error = apiErrorSchema.safeParse(json);
    if (error.success) {
      throw new ApiError(res.status, error.data.error, error.data.message, json);
    }
    throw new ApiError(res.status, 'http_error', `Ошибка сервера (${res.status})`, json);
  }

  if (!schema) return undefined as T;
  const parsed = schema.safeParse(json);
  if (!parsed.success) throw new ApiError(res.status, 'bad_response', BAD_RESPONSE_MESSAGE);
  return parsed.data;
}
