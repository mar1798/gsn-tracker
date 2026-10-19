import type { WorkoutSummary } from '@gsc/shared';

export function workoutSummary(overrides: Partial<WorkoutSummary> = {}): WorkoutSummary {
  return {
    id: '00000000-0000-4000-8000-000000000001',
    source: 'manual_fit',
    startedAt: '2026-10-17T12:05:00.000Z',
    utcOffsetSec: 21600,
    durationSec: 4296,
    activeSec: 1135,
    calories: 802,
    avgHr: 118,
    maxHr: 169,
    deviceModel: 'Epix Pro Gen 2',
    title: null,
    setCount: 21,
    annotatedSetCount: 8,
    ...overrides,
  };
}
