import type { LoginRequest, RegisterRequest } from '@gsc/shared';

import { authApi, meApi } from '@/lib/api/endpoints';
import { clearLocalCache } from '@/lib/db/workout-cache';
import { loadOutbox, resetOutbox } from '@/lib/outbox';
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

/** Deletes the account and all its data on the server, then ends the session on the device. */
export async function deleteAccount() {
  await meApi.remove();
  await clearSession();
}

// Whatever ended the session (sign-out or a rejected refresh token),
// drop the previous user's data from memory and from the local cache.
// A new session (sign-in or restore at launch) picks up its queued offline edits.
useSession.subscribe((state, prev) => {
  if (prev.status === 'signedIn' && state.status !== 'signedIn') {
    resetOutbox();
    queryClient.clear();
    clearLocalCache();
  }
  if (state.status === 'signedIn' && prev.status !== 'signedIn') {
    loadOutbox(state.user.id);
  }
});
