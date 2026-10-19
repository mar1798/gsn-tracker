import type { LoginRequest, RegisterRequest } from '@gsc/shared';

import { authApi } from '@/lib/api/endpoints';
import { clearLocalCache } from '@/lib/db/workout-cache';
import { queryClient } from '@/lib/query-client';
import { clearSession, saveSession, useSession } from '@/lib/session';

export async function signIn(body: LoginRequest) {
  await saveSession(await authApi.login(body));
}

export async function signUp(body: RegisterRequest) {
  await saveSession(await authApi.register(body));
}

export async function signOut() {
  const refreshToken = useSession.getState().tokens?.refreshToken;
  // Best effort: an offline sign-out still ends the session on the device.
  if (refreshToken) await authApi.logout(refreshToken).catch(() => undefined);
  await clearSession();
}

// Whatever ended the session (sign-out or a rejected refresh token),
// drop the previous user's data from memory and from the local cache.
useSession.subscribe((state, prev) => {
  if (prev.status === 'signedIn' && state.status !== 'signedIn') {
    queryClient.clear();
    clearLocalCache();
  }
});
