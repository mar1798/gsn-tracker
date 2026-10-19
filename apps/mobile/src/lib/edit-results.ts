import { isSetAnnotated, type ManualSet, type WorkoutDetail, type WorkoutSet } from '@gsc/shared';

/** What the server returned for a sent edit. */
export type EditResult =
  | { type: 'sets'; sets: WorkoutSet[] }
  | { type: 'manualSet'; set: ManualSet }
  | { type: 'manualSetDeleted'; id: string };

/**
 * Folds a server response into the cached workout, so the screen keeps showing the edit
 * after it leaves the queue and before the workout is refetched (no flicker back).
 */
export function mergeEditResult(detail: WorkoutDetail, result: EditResult): WorkoutDetail {
  let { sets, manualSets } = detail;
  switch (result.type) {
    case 'sets': {
      const fresh = new Map(result.sets.map((s) => [s.id, s]));
      sets = sets.map((s) => fresh.get(s.id) ?? s);
      break;
    }
    case 'manualSet':
      manualSets = [...manualSets.filter((s) => s.id !== result.set.id), result.set].sort(
        (a, b) => a.orderIndex - b.orderIndex,
      );
      break;
    case 'manualSetDeleted':
      manualSets = manualSets.filter((s) => s.id !== result.id);
      break;
  }
  return { ...detail, sets, manualSets, annotatedSetCount: sets.filter(isSetAnnotated).length };
}
