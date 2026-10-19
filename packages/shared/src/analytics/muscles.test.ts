import { describe, expect, it } from 'vitest';
import { muscleLoads } from './muscles.js';
import { EXERCISES, PULL_UP, set } from './test-data.js';

describe('muscleLoads', () => {
  it('weights sets and volume by the muscle coefficient', () => {
    const loads = muscleLoads([set(), set({ weightKg: 70, reps: 8 })], EXERCISES, 78);
    expect(loads.get('chest')).toEqual({ sets: 2, volumeKg: 600 + 560 });
    expect(loads.get('triceps')).toEqual({ sets: 1, volumeKg: (600 + 560) * 0.5 });
  });

  it('counts unweighted sets without volume and skips warm-ups and unannotated sets', () => {
    const loads = muscleLoads(
      [
        set({ repsSource: 'garmin' }),
        set({ isWarmup: true }),
        set({ exerciseId: null }),
        set({ isExcluded: true }),
      ],
      EXERCISES,
      78,
    );
    expect(loads.get('chest')).toEqual({ sets: 1, volumeKg: 0 });
  });

  it('uses body weight for bodyweight exercises', () => {
    const loads = muscleLoads(
      [set({ exerciseId: PULL_UP.id, weightKg: null, reps: 10 })],
      EXERCISES,
      78,
    );
    expect(loads.get('lats')).toEqual({ sets: 1, volumeKg: 780 });
    expect(loads.get('biceps')).toEqual({ sets: 0.5, volumeKg: 390 });
  });

  it('accumulates into an existing map', () => {
    const into = muscleLoads([set()], EXERCISES, null);
    muscleLoads([set()], EXERCISES, null, into);
    expect(into.get('chest')).toEqual({ sets: 2, volumeKg: 1200 });
  });
});
