import type { WorkoutEdit } from '@gsc/shared';

import { ApiError } from '@/lib/api/client';
import { setsApi } from '@/lib/api/endpoints';
import { cacheWorkoutDetail } from '@/lib/db/detail-cache';
import { removeQueuedEdit, touchRecentExercise } from '@/lib/db/edit-queue';
import { queryClient, queryKeys } from '@/lib/query-client';
import { garminSet, workoutDetail, WORKOUT_ID } from '@/test/fixtures';

import { enqueueEdit, flushOutbox, loadOutbox, resetOutbox, useOutbox } from './outbox';

jest.mock('@/lib/api/endpoints', () => ({
  setsApi: {
    putAnnotation: jest.fn(),
    bulkAnnotate: jest.fn(),
    createManual: jest.fn(),
    updateManual: jest.fn(),
    deleteManual: jest.fn(),
  },
}));
jest.mock('@/lib/db/detail-cache', () => ({ cacheWorkoutDetail: jest.fn() }));
jest.mock('@/lib/db/edit-queue', () => {
  let nextId = 1;
  return {
    listQueuedEdits: jest.fn(() => []),
    listRecentExerciseIds: jest.fn(() => ['old']),
    insertQueuedEdit: jest.fn((_userId: string, edit: unknown) => ({ id: nextId++, edit })),
    removeQueuedEdit: jest.fn(),
    touchRecentExercise: jest.fn(),
  };
});

const api = jest.mocked(setsApi);
const SET_ID = garminSet(1).id;
const EXERCISE = '00000000-0000-4000-8000-0000000000e1';

const put = (
  exerciseId: string | null = EXERCISE,
): Extract<WorkoutEdit, { kind: 'annotation.put' }> => ({
  kind: 'annotation.put',
  workoutId: WORKOUT_ID,
  setId: SET_ID,
  input: {
    exerciseId,
    weightKg: 60,
    reps: 10,
    rpe: null,
    isWarmup: false,
    isFailure: false,
    isExcluded: false,
    note: null,
  },
});

/** The server's answer to `put()`. */
const savedSet = () =>
  garminSet(1, {
    effective: { ...garminSet(1).effective, exerciseId: EXERCISE, repsSource: 'user' },
  });

describe('outbox', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useRealTimers();
    queryClient.clear();
    resetOutbox();
    loadOutbox('user-1');
  });

  it('sends an edit, merges the answer into the cached workout and empties the queue', async () => {
    queryClient.setQueryData(queryKeys.workout(WORKOUT_ID), {
      detail: workoutDetail([garminSet(1), garminSet(2)]),
    });
    api.putAnnotation.mockResolvedValueOnce(savedSet());
    const invalidate = jest.spyOn(queryClient, 'invalidateQueries');

    enqueueEdit(put());
    expect(useOutbox.getState().queue).toHaveLength(1);
    expect(useOutbox.getState().recentExerciseIds).toEqual([EXERCISE, 'old']);
    expect(touchRecentExercise).toHaveBeenCalledWith('user-1', EXERCISE);
    await flushOutbox();

    expect(api.putAnnotation).toHaveBeenCalledWith(SET_ID, put().input);
    expect(useOutbox.getState().queue).toEqual([]);
    expect(removeQueuedEdit).toHaveBeenCalledWith(1);
    const data = queryClient.getQueryData<{ detail: { annotatedSetCount: number } }>(
      queryKeys.workout(WORKOUT_ID),
    );
    expect(data?.detail.annotatedSetCount).toBe(1);
    expect(cacheWorkoutDetail).toHaveBeenCalled();
    expect(invalidate).toHaveBeenCalledWith({ queryKey: queryKeys.workouts });
  });

  it('keeps edits queued in order while offline and retries later', async () => {
    jest.useFakeTimers();
    api.putAnnotation.mockRejectedValue(new ApiError(0, 'network', 'Нет связи'));

    enqueueEdit(put());
    enqueueEdit(put(null));
    await flushOutbox();
    expect(useOutbox.getState().queue).toHaveLength(2);
    expect(api.putAnnotation).toHaveBeenCalledTimes(1);

    api.putAnnotation.mockResolvedValue(savedSet());
    await jest.advanceTimersByTimeAsync(15_000);
    await flushOutbox();
    expect(api.putAnnotation).toHaveBeenCalledTimes(3);
    expect(useOutbox.getState().queue).toEqual([]);
  });

  it('drops an edit the server rejects and reports it', async () => {
    api.putAnnotation.mockRejectedValueOnce(
      new ApiError(400, 'invalid_exercise', 'Упражнение не найдено'),
    );
    enqueueEdit(put());
    await flushOutbox();

    expect(useOutbox.getState().queue).toEqual([]);
    expect(useOutbox.getState().failure).toEqual({
      workoutId: WORKOUT_ID,
      message: 'Упражнение не найдено',
    });
  });

  it('treats an already deleted manual set as deleted', async () => {
    api.deleteManual.mockRejectedValueOnce(new ApiError(404, 'not_found', 'Подход не найден'));
    enqueueEdit({ kind: 'manualSet.delete', workoutId: WORKOUT_ID, id: SET_ID });
    await flushOutbox();

    expect(useOutbox.getState().queue).toEqual([]);
    expect(useOutbox.getState().failure).toBeNull();
  });

  it('stops after sign-out', async () => {
    let resolve: (value: ReturnType<typeof savedSet>) => void = () => undefined;
    api.putAnnotation.mockReturnValueOnce(new Promise((r) => (resolve = r)));
    enqueueEdit(put());
    const flushing = flushOutbox();
    resetOutbox();
    resolve(savedSet());
    await flushing;

    expect(removeQueuedEdit).not.toHaveBeenCalled();
    expect(useOutbox.getState().queue).toEqual([]);
  });
});
