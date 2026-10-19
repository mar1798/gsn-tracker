import type { WorkoutDetail } from '@gsc/shared';
import { focusManager, QueryClient } from '@tanstack/react-query';
import { AppState } from 'react-native';

import { ApiError } from '@/lib/api/client';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      // Retry only what may pass on its own: network failures and 5xx.
      retry: (failureCount, error) =>
        error instanceof ApiError && (error.isNetwork || error.status >= 500) && failureCount < 2,
    },
    mutations: { retry: false },
  },
});

// Refetch stale queries when the app returns to the foreground.
AppState.addEventListener('change', (status) => {
  focusManager.setFocused(status === 'active');
});

export const queryKeys = {
  me: ['me'] as const,
  workouts: ['workouts'] as const,
  workoutFeed: (userId: string) => ['workouts', 'feed', userId] as const,
  workout: (id: string) => ['workouts', 'detail', id] as const,
  workoutHr: (id: string) => ['workouts', 'hr', id] as const,
  exercises: ['exercises'] as const,
  /** Prefix of every analytics query: refetched after annotation edits reach the server. */
  analytics: ['analytics'] as const,
  overview: (from: string, to: string) => ['analytics', 'overview', from, to] as const,
  muscles: (from: string, to: string) => ['analytics', 'muscles', from, to] as const,
  exerciseProgress: (id: string, from: string, to: string) =>
    ['analytics', 'exercise', id, from, to] as const,
  records: (before: string | null) => ['analytics', 'records', before] as const,
};

/** Cached data of `queryKeys.workout`: the server state, before pending edits are applied. */
export type WorkoutDetailData = {
  detail: WorkoutDetail;
  /** Served from the local cache because the server is unreachable. */
  fromCache?: boolean;
};
