import type { UserSettingsPatch } from '@gsc/shared';
import { useMutation, useQueryClient } from '@tanstack/react-query';

import { meApi } from '@/lib/api/endpoints';
import { queryKeys } from '@/lib/query-client';
import { updateSessionUser } from '@/lib/session';

/** Saves settings online (like custom exercises); the answer becomes the session user. */
export function useSaveSettings() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (patch: UserSettingsPatch) => meApi.updateSettings(patch),
    onSuccess: async (user) => {
      await updateSessionUser(user);
      // Body weight changes the volume of bodyweight exercises.
      void queryClient.invalidateQueries({ queryKey: queryKeys.analytics });
    },
  });
}
