import { applyWorkoutEdits, type WorkoutDetail } from '@gsc/shared';
import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';

import { ApiError } from '@/lib/api/client';
import { workoutsApi } from '@/lib/api/endpoints';
import {
  cacheWorkoutDetail,
  cacheWorkoutHr,
  getCachedWorkout,
  removeCachedWorkout,
} from '@/lib/db/detail-cache';
import { flushOutbox, useOutbox } from '@/lib/outbox';
import { queryKeys, type WorkoutDetailData } from '@/lib/query-client';
import { useSession } from '@/lib/session';

const useUserId = () => useSession((s) => s.user?.id ?? '');

/**
 * A workout with the user's pending edits applied, offline-first like the feed: the SQLite copy
 * renders instantly, the network replaces it; offline, the cached copy stays.
 */
export function useWorkoutDetail(id: string) {
  const userId = useUserId();
  const query = useQuery({
    queryKey: queryKeys.workout(id),
    queryFn: async (): Promise<WorkoutDetailData> => {
      try {
        const detail = await workoutsApi.get(id);
        cacheWorkoutDetail(userId, detail);
        // The server is reachable again: send what was edited offline.
        void flushOutbox();
        return { detail };
      } catch (error) {
        if (error instanceof ApiError && error.isNetwork) {
          const cached = getCachedWorkout(userId, id);
          if (cached) return { detail: cached.detail, fromCache: true };
        }
        if (error instanceof ApiError && error.status === 404) removeCachedWorkout(userId, id);
        throw error;
      }
    },
    placeholderData: () => {
      const cached = getCachedWorkout(userId, id);
      return cached ? { detail: cached.detail, fromCache: true } : undefined;
    },
  });

  const queue = useOutbox((s) => s.queue);
  const data = query.data;
  const workout: WorkoutDetail | undefined = useMemo(
    () =>
      data &&
      applyWorkoutEdits(
        data.detail,
        queue.map((q) => q.edit),
      ),
    [data, queue],
  );
  const pendingCount = queue.filter((q) => q.edit.workoutId === id).length;
  const offline = !query.isPlaceholderData && data?.fromCache === true;
  return { ...query, workout, pendingCount, offline };
}

/** HR of the whole workout. Immutable, so it is fetched once and cached next to the detail. */
export function useWorkoutHr(id: string) {
  const userId = useUserId();
  return useQuery({
    queryKey: queryKeys.workoutHr(id),
    staleTime: Infinity,
    queryFn: async () => {
      try {
        const hr = await workoutsApi.hr(id);
        cacheWorkoutHr(userId, id, hr);
        return hr;
      } catch (error) {
        const cached = getCachedWorkout(userId, id)?.hr;
        if (error instanceof ApiError && error.isNetwork && cached) return cached;
        throw error;
      }
    },
    placeholderData: () => getCachedWorkout(userId, id)?.hr ?? undefined,
  });
}
