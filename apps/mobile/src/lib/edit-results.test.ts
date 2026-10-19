import type { ManualSet } from '@gsc/shared';

import { garminSet, uuid, workoutDetail } from '@/test/fixtures';

import { mergeEditResult } from './edit-results';

const manual = (n: number, orderIndex: number): ManualSet => ({
  id: uuid(200 + n),
  orderIndex,
  exerciseId: null,
  weightKg: null,
  reps: 5,
  rpe: null,
  isWarmup: false,
  isFailure: false,
  note: null,
});

describe('mergeEditResult', () => {
  const detail = workoutDetail([garminSet(1), garminSet(2)], { manualSets: [manual(1, 3)] });

  it('replaces returned sets and recounts annotated ones', () => {
    const saved = garminSet(2, {
      effective: { ...garminSet(2).effective, isExcluded: true },
    });
    const result = mergeEditResult(detail, { type: 'sets', sets: [saved] });
    expect(result.sets[1]).toBe(saved);
    expect(result.sets[0]).toBe(detail.sets[0]);
    expect(result.annotatedSetCount).toBe(1);
  });

  it('upserts manual sets in order and removes deleted ones', () => {
    const added = mergeEditResult(detail, { type: 'manualSet', set: manual(2, 0) });
    expect(added.manualSets.map((s) => s.orderIndex)).toEqual([0, 3]);

    const updated = mergeEditResult(added, {
      type: 'manualSet',
      set: { ...manual(1, 3), reps: 9 },
    });
    expect(updated.manualSets).toHaveLength(2);
    expect(updated.manualSets[1]?.reps).toBe(9);

    const removed = mergeEditResult(updated, { type: 'manualSetDeleted', id: uuid(202) });
    expect(removed.manualSets.map((s) => s.id)).toEqual([uuid(201)]);
  });
});
