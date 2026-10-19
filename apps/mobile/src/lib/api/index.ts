import { env } from '@/env';
import { clearSession, saveSession, useSession } from '@/lib/session';

import { createApiClient } from './client';

export { ApiError } from './client';

export const api = createApiClient({
  baseUrl: env.EXPO_PUBLIC_API_URL,
  tokens: {
    get: () => useSession.getState().tokens,
    set: saveSession,
    onExpired: () => void clearSession(),
  },
});
