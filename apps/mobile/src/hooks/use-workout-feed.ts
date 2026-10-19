import type { WorkoutListResponse, WorkoutSummary } from '@gsc/shared';
import { useInfiniteQuery, type InfiniteData } from '@tanstack/react-query';

import { ApiError } from '@/lib/api/client';
import { workoutsApi } from '@/lib/api/endpoints';
import { cacheWorkoutPage, listCachedWorkouts } from '@/lib/db/workout-cache';
import { queryKeys } from '@/lib/query-client';

export type FeedPage = WorkoutListResponse & {
  /** Served from the local cache because the server is unreachable. */
  fromCache?: boolean;
};

function cachedPage(userId: string): FeedPage {
  return { items: listCachedWorkouts(userId), nextCursor: null, fromCache: true };
}

/**
 * Workout feed, offline-first: the SQLite cache renders instantly (placeholder), the network
 * replaces it and refreshes the cache. Offline, the first page falls back to the cache.
 */
export function useWorkoutFeed(userId: string) {
  const query = useInfiniteQuery({
    queryKey: queryKeys.workoutFeed(userId),
    initialPageParam: undefined as string | undefined,
    queryFn: async ({ pageParam }): Promise<FeedPage> => {
      try {
        const page = await workoutsApi.list(pageParam);
        cacheWorkoutPage(userId, page.items, pageParam === undefined);
        return page;
      } catch (error) {
        if (pageParam === undefined && error instanceof ApiError && error.isNetwork) {
          return cachedPage(userId);
        }
        throw error;
      }
    },
    getNextPageParam: (last) => last.nextCursor ?? undefined,
    placeholderData: (): InfiniteData<FeedPage, string | undefined> => ({
      pages: [cachedPage(userId)],
      pageParams: [undefined],
    }),
  });

  const pages = query.data?.pages ?? [];
  const workouts: WorkoutSummary[] = pages.flatMap((page) => page.items);
  const offline = !query.isPlaceholderData && pages[0]?.fromCache === true;
  return { ...query, workouts, offline };
}
