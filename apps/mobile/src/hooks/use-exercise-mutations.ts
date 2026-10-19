import type { CustomExerciseInput, Exercise } from '@gsc/shared';
import { useMutation, useQueryClient, type QueryClient } from '@tanstack/react-query';

import { exercisesApi } from '@/lib/api/endpoints';
import { cacheExercises } from '@/lib/db/detail-cache';
import { queryKeys } from '@/lib/query-client';
import { useSession } from '@/lib/session';

// Custom exercises are edited online only (unlike annotations): a name check needs the server.
// The answer goes straight into the catalog query and its SQLite copy, without a refetch.

const byName = (a: Exercise, b: Exercise) => a.nameRu.localeCompare(b.nameRu, 'ru');

function updateCatalog(
  queryClient: QueryClient,
  userId: string,
  update: (items: Exercise[]) => Exercise[],
) {
  const items = update(queryClient.getQueryData<Exercise[]>(queryKeys.exercises) ?? []);
  queryClient.setQueryData(queryKeys.exercises, items);
  cacheExercises(userId, items);
}

/** Creates (`id` omitted) or updates a custom exercise. */
export function useSaveExercise() {
  const queryClient = useQueryClient();
  const userId = useSession((s) => s.user?.id ?? '');
  return useMutation({
    mutationFn: ({ id, input }: { id?: string; input: CustomExerciseInput }) =>
      id ? exercisesApi.update(id, input) : exercisesApi.create(input),
    onSuccess: (saved) =>
      updateCatalog(queryClient, userId, (items) =>
        [...items.filter((e) => e.id !== saved.id), saved].sort(byName),
      ),
  });
}

/** Deletes a custom exercise; the server archives it, so annotated sets keep its name. */
export function useDeleteExercise() {
  const queryClient = useQueryClient();
  const userId = useSession((s) => s.user?.id ?? '');
  return useMutation({
    mutationFn: (id: string) => exercisesApi.remove(id),
    onSuccess: (_, id) =>
      updateCatalog(queryClient, userId, (items) =>
        items.map((e) => (e.id === id ? { ...e, isArchived: true } : e)),
      ),
  });
}
