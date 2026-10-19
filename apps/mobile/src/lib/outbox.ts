import type { WorkoutEdit } from '@gsc/shared';
import { AppState } from 'react-native';
import { create } from 'zustand';

import { ApiError } from '@/lib/api/client';
import { setsApi } from '@/lib/api/endpoints';
import { cacheWorkoutDetail } from '@/lib/db/detail-cache';
import {
  insertQueuedEdit,
  listQueuedEdits,
  listRecentExerciseIds,
  removeQueuedEdit,
  touchRecentExercise,
  type QueuedEdit,
} from '@/lib/db/edit-queue';
import { mergeEditResult, type EditResult } from '@/lib/edit-results';
import { queryClient, queryKeys, type WorkoutDetailData } from '@/lib/query-client';

// Offline-first annotation: every edit goes to a SQLite queue first and is shown at once
// (`applyWorkoutEdits` over the cached workout), then sent in order. Network and server errors
// keep the edit queued and retry later; a rejected edit (4xx) is dropped and reported.

const RETRY_DELAY_MS = 15_000;

export type OutboxFailure = { workoutId: string; message: string };

type OutboxState = {
  userId: string | null;
  queue: QueuedEdit[];
  /** Exercises picked lately, most recent first. */
  recentExerciseIds: string[];
  /** The last edit the server rejected. */
  failure: OutboxFailure | null;
};

const empty: OutboxState = { userId: null, queue: [], recentExerciseIds: [], failure: null };

export const useOutbox = create<OutboxState>(() => empty);

/** On sign-in or session restore. */
export function loadOutbox(userId: string) {
  useOutbox.setState({
    userId,
    queue: listQueuedEdits(userId),
    recentExerciseIds: listRecentExerciseIds(userId),
    failure: null,
  });
  void flushOutbox();
}

/** On sign-out (the local cache, queue included, is wiped separately). */
export function resetOutbox() {
  clearRetry();
  useOutbox.setState(empty);
}

function exerciseIdOf(edit: WorkoutEdit): string | null | undefined {
  switch (edit.kind) {
    case 'annotation.put':
    case 'manualSet.create':
      return edit.input.exerciseId;
    case 'annotation.bulk':
    case 'manualSet.update':
      return edit.patch.exerciseId;
    case 'manualSet.delete':
      return null;
  }
}

export function enqueueEdit(edit: WorkoutEdit) {
  const { userId } = useOutbox.getState();
  if (!userId) throw new Error('enqueueEdit without a signed-in user');

  const queued = insertQueuedEdit(userId, edit);
  const exerciseId = exerciseIdOf(edit);
  if (exerciseId) touchRecentExercise(userId, exerciseId);
  useOutbox.setState((s) => ({
    queue: [...s.queue, queued],
    recentExerciseIds: exerciseId
      ? [exerciseId, ...s.recentExerciseIds.filter((id) => id !== exerciseId)]
      : s.recentExerciseIds,
  }));
  void flushOutbox();
}

export const dismissOutboxFailure = () => useOutbox.setState({ failure: null });

/** The workout was deleted: its unsent edits have nothing left to change. */
export function discardWorkoutEdits(workoutId: string) {
  const dropped = useOutbox.getState().queue.filter((q) => q.edit.workoutId === workoutId);
  for (const q of dropped) removeQueuedEdit(q.id);
  useOutbox.setState((s) => ({
    queue: s.queue.filter((q) => q.edit.workoutId !== workoutId),
    failure: s.failure?.workoutId === workoutId ? null : s.failure,
  }));
}

async function send(edit: WorkoutEdit): Promise<EditResult> {
  switch (edit.kind) {
    case 'annotation.put':
      return { type: 'sets', sets: [await setsApi.putAnnotation(edit.setId, edit.input)] };
    case 'annotation.bulk': {
      const { items } = await setsApi.bulkAnnotate({ setIds: edit.setIds, patch: edit.patch });
      return { type: 'sets', sets: items };
    }
    case 'manualSet.create':
      return { type: 'manualSet', set: await setsApi.createManual(edit.workoutId, edit.input) };
    case 'manualSet.update':
      return { type: 'manualSet', set: await setsApi.updateManual(edit.id, edit.patch) };
    case 'manualSet.delete':
      try {
        await setsApi.deleteManual(edit.id);
      } catch (error) {
        // Already gone (deleted on another device or by an earlier replay).
        if (!(error instanceof ApiError && error.status === 404)) throw error;
      }
      return { type: 'manualSetDeleted', id: edit.id };
  }
}

/** Worth retrying later: no connection, a server failure or an expired session. */
const isTransient = (error: unknown) =>
  !(error instanceof ApiError) || error.isNetwork || error.status >= 500 || error.status === 401;

function applyResult(userId: string, workoutId: string, result: EditResult) {
  const key = queryKeys.workout(workoutId);
  const data = queryClient.getQueryData<WorkoutDetailData>(key);
  if (!data) return;
  const detail = mergeEditResult(data.detail, result);
  queryClient.setQueryData<WorkoutDetailData>(key, { ...data, detail });
  cacheWorkoutDetail(userId, detail);
}

let retryTimer: ReturnType<typeof setTimeout> | null = null;

function clearRetry() {
  if (retryTimer) clearTimeout(retryTimer);
  retryTimer = null;
}

async function drain() {
  clearRetry();
  for (;;) {
    const { userId, queue } = useOutbox.getState();
    const head = queue[0];
    if (!userId || !head) return;
    const { workoutId } = head.edit;

    let failure: OutboxFailure | null = null;
    try {
      const result = await send(head.edit);
      if (useOutbox.getState().userId !== userId) return;
      applyResult(userId, workoutId, result);
    } catch (error) {
      if (useOutbox.getState().userId !== userId) return;
      if (isTransient(error)) {
        retryTimer = setTimeout(() => void flushOutbox(), RETRY_DELAY_MS);
        return;
      }
      failure = { workoutId, message: (error as ApiError).message };
    }

    removeQueuedEdit(head.id);
    useOutbox.setState((s) => ({
      queue: s.queue.filter((q) => q.id !== head.id),
      failure: failure ?? s.failure,
    }));
    // Everything of this workout is on the server: refetch it (and the feed's "размечено N/M")
    // and the analytics computed from it.
    const settled = !useOutbox.getState().queue.some((q) => q.edit.workoutId === workoutId);
    if (settled || failure) {
      void queryClient.invalidateQueries({ queryKey: queryKeys.workouts });
      void queryClient.invalidateQueries({ queryKey: queryKeys.analytics });
    }
  }
}

let flushing: Promise<void> | null = null;

/** Sends queued edits one by one; concurrent calls share one run. */
export function flushOutbox(): Promise<void> {
  flushing ??= drain().finally(() => {
    flushing = null;
  });
  return flushing;
}

AppState.addEventListener('change', (status) => {
  if (status === 'active') void flushOutbox();
});
