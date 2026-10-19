import { duplicateImportErrorSchema } from '@gsc/shared';
import { useMutation, useQueryClient } from '@tanstack/react-query';

import { ApiError } from '@/lib/api/client';
import { importsApi } from '@/lib/api/endpoints';
import { isFitFileName, type LocalFile } from '@/lib/fit-file';
import { queryKeys } from '@/lib/query-client';

export type ImportFailure =
  | { kind: 'duplicate'; message: string; workoutId: string }
  | { kind: 'not_fit'; message: string }
  | { kind: 'rejected'; message: string }
  | { kind: 'retryable'; message: string };

export function describeImportError(error: unknown): ImportFailure {
  if (!(error instanceof ApiError)) {
    return { kind: 'retryable', message: 'Не удалось импортировать файл. Попробуйте ещё раз.' };
  }
  if (error.status === 409) {
    const duplicate = duplicateImportErrorSchema.safeParse(error.body);
    if (duplicate.success) {
      return { kind: 'duplicate', message: error.message, workoutId: duplicate.data.workoutId };
    }
  }
  // 400/413/422: the file itself is the problem (not FIT, not strength, too big): retrying won't help.
  if (error.status >= 400 && error.status < 500 && error.status !== 401) {
    return { kind: 'rejected', message: error.message };
  }
  return { kind: 'retryable', message: error.message };
}

class NotFitFileError extends Error {}

export function useImportFit() {
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: async (file: LocalFile) => {
      if (!isFitFileName(file.name)) throw new NotFitFileError();
      return importsApi.fit({ ...file, mimeType: 'application/vnd.ant.fit' });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.workouts }),
  });

  const failure: ImportFailure | null = !mutation.error
    ? null
    : mutation.error instanceof NotFitFileError
      ? {
          kind: 'not_fit',
          message: 'Это не FIT-файл. Выберите файл с расширением .fit из «Export Original».',
        }
      : describeImportError(mutation.error);

  return { ...mutation, failure };
}
