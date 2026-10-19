import type { AnalyticsMuscles, AnalyticsOverview, WorkoutTotalsDto } from '@gsc/shared';
import { act, fireEvent, screen, waitFor } from '@testing-library/react-native';
import { router as appRouter } from 'expo-router';

import { analyticsApi, exercisesApi } from '@/lib/api/endpoints';
import { BENCH, CATALOG, uuid } from '@/test/fixtures';
import { Noop, renderScreens } from '@/test/render';

import { ExerciseProgressScreen } from './exercise-progress';
import { ProgressScreen } from './progress';

jest.mock('@/lib/api/endpoints', () => ({
  analyticsApi: {
    overview: jest.fn(),
    muscles: jest.fn(),
    exercise: jest.fn(),
    records: jest.fn(),
  },
  exercisesApi: { list: jest.fn() },
}));
jest.mock('@/lib/db/detail-cache', () => ({
  getCachedExercises: jest.fn(() => null),
  cacheExercises: jest.fn(),
}));
jest.mock('@/hooks/use-pick-fit-file', () => ({ usePickFitFile: () => jest.fn() }));

const api = jest.mocked(analyticsApi);

function totals(overrides: Partial<WorkoutTotalsDto> = {}): WorkoutTotalsDto {
  return {
    workouts: 0,
    workingSets: 0,
    volumeKg: 0,
    density: null,
    avgWorkingHr: null,
    avgPeakHr: null,
    avgRecoveryBpm: null,
    hrZonesSec: [],
    ...overrides,
  };
}

const PERIOD = { from: '2026-09-20', to: '2026-10-19' };
const PREVIOUS = { from: '2026-08-21', to: '2026-09-19' };

function overview(current: Partial<WorkoutTotalsDto>, previous: Partial<WorkoutTotalsDto> = {}) {
  return {
    period: PERIOD,
    previousPeriod: PREVIOUS,
    current: totals(current),
    previous: totals(previous),
    weeks: [
      { weekStart: '2026-10-05', ...totals({ workouts: 1, workingSets: 8, volumeKg: 4000 }) },
      { weekStart: '2026-10-12', ...totals({ workouts: 2, workingSets: 12, volumeKg: 8400 }) },
    ],
  } satisfies AnalyticsOverview;
}

const MUSCLES: AnalyticsMuscles = {
  period: PERIOD,
  previousPeriod: PREVIOUS,
  muscles: [
    { muscle: 'chest', sets: 12, volumeKg: 8400, previousSets: 10, previousVolumeKg: 7000 },
    { muscle: 'triceps', sets: 6, volumeKg: 4200, previousSets: 0, previousVolumeKg: 0 },
    { muscle: 'lats', sets: 0, volumeKg: 0, previousSets: 4, previousVolumeKg: 2000 },
  ],
  weeks: [
    { weekStart: '2026-10-05', muscles: [{ muscle: 'chest', sets: 4, volumeKg: 2800 }] },
    { weekStart: '2026-10-12', muscles: [{ muscle: 'chest', sets: 8, volumeKg: 5600 }] },
  ],
};

const RECORD = {
  valueKg: 80,
  reps: 3,
  workoutId: uuid(1),
  date: '2026-10-17',
};

beforeEach(() => {
  jest.clearAllMocks();
  jest.useFakeTimers({
    now: new Date(2026, 9, 19, 12),
    doNotFake: ['setTimeout', 'setInterval', 'setImmediate', 'nextTick', 'queueMicrotask'],
  });
  jest.mocked(exercisesApi.list).mockResolvedValue({ items: CATALOG });
  api.muscles.mockResolvedValue(MUSCLES);
  api.records.mockResolvedValue({
    items: [
      {
        exerciseId: BENCH.id,
        maxWeight: RECORD,
        maxE1rm: null,
        maxSetVolume: null,
        maxWorkoutVolume: null,
      },
    ],
  });
});
afterEach(() => jest.useRealTimers());

describe('ProgressScreen', () => {
  const renderProgress = () =>
    renderScreens({ index: ProgressScreen, 'exercise-progress/[id]': Noop });

  it('shows period totals against the previous period, muscles and records', async () => {
    api.overview.mockResolvedValue(
      overview(
        {
          workouts: 3,
          workingSets: 20,
          volumeKg: 12_400,
          density: 0.26,
          avgWorkingHr: 121,
          avgPeakHr: 152,
          avgRecoveryBpm: 31,
          hrZonesSec: [0, 600, 1200, 900, 300, 0, 0],
        },
        { workouts: 2, workingSets: 16, volumeKg: 10_000, density: 0.25 },
      ),
    );
    const router = await renderProgress();

    expect(await screen.findByLabelText('Тренировки: 3, к прошлому периоду +50 %')).toBeTruthy();
    expect(screen.getByLabelText('Объём: 12,4 т, к прошлому периоду +24 %')).toBeTruthy();
    expect(screen.getByLabelText('Плотность: 26 %, к прошлому периоду +4 %')).toBeTruthy();
    expect(api.overview).toHaveBeenCalledWith(PERIOD);

    expect(await screen.findByLabelText('Грудь: 12 подходов')).toBeTruthy();
    expect(screen.getByLabelText('Трицепс: 6 подходов')).toBeTruthy();
    // No sets in this period: not listed even though it had sets before.
    expect(screen.queryByLabelText('Верх спины (широчайшие): 0 подходов')).toBeNull();

    expect(screen.getByLabelText('Зона 2: 20:00')).toBeTruthy();
    expect(screen.getByText('−31 уд/мин')).toBeTruthy();

    await fireEvent.press(await screen.findByText('80 кг × 3'));
    expect(router.getPathname()).toBe(`/exercise-progress/${BENCH.id}`);
  });

  it('switches the period and the weekly measure', async () => {
    api.overview.mockResolvedValue(overview({ workouts: 3, workingSets: 20, volumeKg: 12_400 }));
    await renderProgress();
    await screen.findByText('По неделям');
    expect(screen.getByText('12 подх.')).toBeTruthy();

    await fireEvent.press(screen.getByLabelText('Объём'));
    expect(screen.getByText('8,4 т')).toBeTruthy();
    await fireEvent.press(screen.getAllByText('Грудь').at(-1)!);
    expect(screen.getByText('5,6 т')).toBeTruthy();

    await fireEvent.press(screen.getByLabelText('Год'));
    await waitFor(() =>
      expect(api.overview).toHaveBeenLastCalledWith({ from: '2025-10-20', to: '2026-10-19' }),
    );
  });

  it('asks to annotate when workouts have no working sets, and explains an empty period', async () => {
    api.overview.mockResolvedValueOnce(overview({ workouts: 1 }));
    await renderProgress();
    expect(await screen.findByText(/Разметьте подходы в тренировках/)).toBeTruthy();

    api.overview.mockResolvedValue(overview({}));
    await fireEvent.press(screen.getByLabelText('Неделя'));
    expect(await screen.findByText('Нет тренировок за период')).toBeTruthy();
  });

  it('shows an error with a retry', async () => {
    const { ApiError } = jest.requireActual('@/lib/api/client');
    api.overview.mockRejectedValue(new ApiError(0, 'network', 'Нет связи с сервером'));
    await renderProgress();
    expect(await screen.findByText('Не удалось загрузить прогресс')).toBeTruthy();
  });
});

describe('ExerciseProgressScreen', () => {
  it('charts the exercise and lists records and workouts', async () => {
    api.exercise.mockResolvedValue({
      exerciseId: BENCH.id,
      period: { from: '2026-07-21', to: '2026-10-19' },
      sessions: [
        {
          workoutId: uuid(2),
          date: '2026-10-10',
          workingSets: 3,
          maxWeightKg: 75,
          maxWeightReps: 5,
          bestE1rmKg: 87.5,
          maxSetVolumeKg: 375,
          volumeKg: 1125,
        },
        {
          workoutId: uuid(1),
          date: '2026-10-17',
          workingSets: 4,
          maxWeightKg: 80,
          maxWeightReps: 3,
          bestE1rmKg: 88,
          maxSetVolumeKg: 400,
          volumeKg: 1440,
        },
      ],
      records: {
        maxWeight: RECORD,
        maxE1rm: { ...RECORD, valueKg: 88, reps: null },
        maxSetVolume: { ...RECORD, valueKg: 400, reps: null },
        maxWorkoutVolume: { ...RECORD, valueKg: 1440, reps: null },
      },
    });
    await renderScreens({ index: Noop, progress: () => <ExerciseProgressScreen id={BENCH.id} /> });
    await act(() => appRouter.push('/progress' as never));

    expect(await screen.findByText(BENCH.nameRu)).toBeTruthy();
    expect(api.exercise).toHaveBeenCalledWith(BENCH.id, { from: '2026-07-21', to: '2026-10-19' });
    expect(screen.getByLabelText('График: 2 тренировок')).toBeTruthy();
    expect(screen.getAllByText('80 кг × 3')).toHaveLength(2);
    expect(screen.getByText('1,4 т')).toBeTruthy();
    expect(screen.getByText('Тренировки · 2')).toBeTruthy();
    expect(screen.getAllByText('Рекорд')).toHaveLength(1);
  });
});
