import { ApiError } from '@/lib/api/client';

import { describeImportError } from './use-import-fit';

const workoutId = '00000000-0000-4000-8000-000000000001';

describe('describeImportError', () => {
  it('recognizes a duplicate with the existing workout', () => {
    const error = new ApiError(409, 'duplicate', 'Файл уже импортирован', {
      error: 'duplicate',
      message: 'Файл уже импортирован',
      workoutId,
    });
    expect(describeImportError(error)).toEqual({
      kind: 'duplicate',
      message: 'Файл уже импортирован',
      workoutId,
    });
  });

  it('treats a rejected file as final', () => {
    const error = new ApiError(422, 'not_strength', 'Это не силовая тренировка');
    expect(describeImportError(error)).toEqual({
      kind: 'rejected',
      message: 'Это не силовая тренировка',
    });
  });

  it('lets network and server errors be retried', () => {
    expect(describeImportError(new ApiError(0, 'network', 'Нет связи'))).toEqual({
      kind: 'retryable',
      message: 'Нет связи',
    });
    expect(describeImportError(new ApiError(500, 'http_error', 'Ошибка сервера'))).toMatchObject({
      kind: 'retryable',
    });
    expect(describeImportError(new Error('boom'))).toMatchObject({ kind: 'retryable' });
  });
});
