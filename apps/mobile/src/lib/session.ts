import { userSchema, type AuthResponse, type User } from '@gsc/shared';
import * as SecureStore from 'expo-secure-store';
import { z } from 'zod';
import { create } from 'zustand';

import type { Tokens } from './api/client';

const STORAGE_KEY = 'gsc.session';

const persistedSchema = z.object({
  tokens: z.object({ accessToken: z.string(), refreshToken: z.string() }),
  user: userSchema,
});
type Persisted = z.infer<typeof persistedSchema>;

type SessionState =
  | { status: 'restoring'; tokens: null; user: null }
  | { status: 'signedOut'; tokens: null; user: null }
  | { status: 'signedIn'; tokens: Tokens; user: User };

const signedOut: SessionState = { status: 'signedOut', tokens: null, user: null };

/** Auth session: tokens live in the Keychain (expo-secure-store), the in-memory copy here. */
export const useSession = create<SessionState>(() => ({
  status: 'restoring',
  tokens: null,
  user: null,
}));

async function persist(value: Persisted | null) {
  if (value) await SecureStore.setItemAsync(STORAGE_KEY, JSON.stringify(value));
  else await SecureStore.deleteItemAsync(STORAGE_KEY);
}

export async function restoreSession() {
  let restored: Persisted | null = null;
  try {
    const raw = await SecureStore.getItemAsync(STORAGE_KEY);
    const parsed = raw ? persistedSchema.safeParse(JSON.parse(raw)) : null;
    restored = parsed?.success ? parsed.data : null;
  } catch {
    // Unreadable Keychain item or corrupted JSON: start signed out.
  }
  useSession.setState(restored ? { status: 'signedIn', ...restored } : signedOut);
}

/** After login/register/refresh: the refresh token rotates every time, so persist each one. */
export async function saveSession(auth: AuthResponse) {
  const value: Persisted = {
    tokens: { accessToken: auth.accessToken, refreshToken: auth.refreshToken },
    user: auth.user,
  };
  useSession.setState({ status: 'signedIn', ...value });
  await persist(value);
}

export async function updateSessionUser(user: User) {
  const { tokens } = useSession.getState();
  if (!tokens) return;
  useSession.setState({ user });
  await persist({ tokens, user });
}

export async function clearSession() {
  useSession.setState(signedOut);
  await persist(null);
}

/** Weight units for display and input; weights are stored in kg. */
export const useUnits = () => useSession((s) => s.user?.settings.units ?? 'kg');
