import type { Exercise } from '@gsc/shared';
import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';

import { ApiError } from '@/lib/api/client';
import { exercisesApi } from '@/lib/api/endpoints';
import { cacheExercises, getCachedExercises } from '@/lib/db/detail-cache';
import { queryKeys } from '@/lib/query-client';
import { useSession } from '@/lib/session';

const EMPTY: Exercise[] = [];

/**
 * The whole catalog (built-in + custom), cached in SQLite for offline annotation.
 * `byId` includes deleted custom exercises (sets still show them), `active` does not.
 */
export function useExercises() {
  const userId = useSession((s) => s.user?.id ?? '');
  const query = useQuery({
    queryKey: queryKeys.exercises,
    // The catalog changes only with an app release or a custom exercise (updated in place).
    staleTime: 60 * 60 * 1000,
    queryFn: async () => {
      try {
        const { items } = await exercisesApi.list();
        cacheExercises(userId, items);
        return items;
      } catch (error) {
        const cached = getCachedExercises(userId);
        if (error instanceof ApiError && error.isNetwork && cached) return cached;
        throw error;
      }
    },
    placeholderData: () => getCachedExercises(userId) ?? undefined,
  });

  const exercises = query.data ?? EMPTY;
  const byId = useMemo(() => new Map(exercises.map((e) => [e.id, e])), [exercises]);
  const active = useMemo(() => exercises.filter((e) => !e.isArchived), [exercises]);
  return { ...query, exercises, active, byId };
}
