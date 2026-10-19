import type { InfiniteData } from '@tanstack/react-query';
import { useMutation, useQueryClient } from '@tanstack/react-query';

import { workoutsApi } from '@/lib/api/endpoints';
import { removeCachedWorkout } from '@/lib/db/detail-cache';
import { discardWorkoutEdits } from '@/lib/outbox';
import { queryKeys } from '@/lib/query-client';
import { useSession } from '@/lib/session';

import type { FeedPage } from './use-workout-feed';

/**
 * Deletes a workout online (the FIT file too). The feed drops it at once; its unsent
 * edits, the local copy and the analytics computed from it go with it. The detail query is
 * left to expire: the open screen goes back without refetching a workout that is gone.
 */
export function useDeleteWorkout() {
  const queryClient = useQueryClient();
  const userId = useSession((s) => s.user?.id ?? '');
  return useMutation({
    mutationFn: (id: string) => workoutsApi.remove(id),
    onSuccess: (_, id) => {
      discardWorkoutEdits(id);
      removeCachedWorkout(userId, id);
      queryClient.setQueryData<InfiniteData<FeedPage>>(queryKeys.workoutFeed(userId), (data) =>
        data
          ? {
              ...data,
              pages: data.pages.map((p) => ({ ...p, items: p.items.filter((w) => w.id !== id) })),
            }
          : data,
      );
      void queryClient.invalidateQueries({ queryKey: queryKeys.analytics });
    },
  });
}
