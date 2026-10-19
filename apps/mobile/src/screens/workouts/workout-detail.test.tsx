import { act, fireEvent, screen, waitFor } from '@testing-library/react-native';
import { Alert, type AlertButton } from 'react-native';

import { ApiError } from '@/lib/api/client';
import { analyticsApi, exercisesApi, workoutsApi } from '@/lib/api/endpoints';
import { getCachedWorkout, removeCachedWorkout } from '@/lib/db/detail-cache';
import { enqueueEdit, loadOutbox, resetOutbox, useOutbox } from '@/lib/outbox';
import { useSession } from '@/lib/session';
import { BENCH, CATALOG, garminSet, WORKOUT_ID, workoutDetail } from '@/test/fixtures';
import { Noop, renderScreens } from '@/test/render';

import { WorkoutDetailScreen } from './workout-detail';

jest.mock('@/lib/api/endpoints', () => ({
  workoutsApi: { get: jest.fn(), hr: jest.fn(), remove: jest.fn() },
  exercisesApi: { list: jest.fn() },
  analyticsApi: { records: jest.fn() },
  // Edits stay queued: the screen must show them before the server confirms.
  setsApi: {
    putAnnotation: jest.fn(() => new Promise(() => undefined)),
    bulkAnnotate: jest.fn(() => new Promise(() => undefined)),
  },
}));
jest.mock('@/lib/db/detail-cache', () => ({
  getCachedWorkout: jest.fn(() => null),
  cacheWorkoutDetail: jest.fn(),
  cacheWorkoutHr: jest.fn(),
  removeCachedWorkout: jest.fn(),
  getCachedExercises: jest.fn(() => null),
  cacheExercises: jest.fn(),
}));
jest.mock('@/lib/db/edit-queue', () => {
  let nextId = 1;
  return {
    listQueuedEdits: jest.fn(() => []),
    listRecentExerciseIds: jest.fn(() => []),
    insertQueuedEdit: jest.fn((_userId: string, edit: unknown) => ({ id: nextId++, edit })),
    removeQueuedEdit: jest.fn(),
    touchRecentExercise: jest.fn(),
  };
});

const get = jest.mocked(workoutsApi.get);
const hr = jest.mocked(workoutsApi.hr);
const sets = [
  garminSet(1),
  garminSet(2),
  garminSet(3, { suspicious: 'too_short', durationSec: 1 }),
  garminSet(4),
];

function renderDetail() {
  return renderScreens(
    {
      'workouts/[id]': () => <WorkoutDetailScreen id={WORKOUT_ID} />,
      annotate: Noop,
      'manual-set': Noop,
    },
    { initialUrl: `/workouts/${WORKOUT_ID}` },
  );
}

describe('WorkoutDetailScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useSession.setState({ status: 'signedOut', tokens: null, user: null });
    resetOutbox();
    loadOutbox('user-1');
    get.mockResolvedValue(workoutDetail(sets));
    hr.mockResolvedValue({
      startedAt: '2026-10-17T12:05:00.000Z',
      offsetsSec: [0, 60],
      bpm: [100, 150],
    });
    jest.mocked(exercisesApi.list).mockResolvedValue({ items: CATALOG });
    jest.mocked(analyticsApi.records).mockResolvedValue({ items: [] });
  });

  it('sums up the annotated workout and shows new records against earlier bests', async () => {
    const confirmed = (n: number, weightKg: number) =>
      garminSet(n, {
        effective: {
          ...garminSet(n).effective,
          exerciseId: BENCH.id,
          weightKg,
          reps: 10,
          repsSource: 'user',
        },
      });
    get.mockResolvedValue(workoutDetail([confirmed(1, 60), confirmed(2, 70), garminSet(3)]));
    jest.mocked(analyticsApi.records).mockResolvedValue({
      items: [
        {
          exerciseId: BENCH.id,
          maxWeight: { valueKg: 65, reps: 10, workoutId: WORKOUT_ID, date: '2026-10-10' },
          maxE1rm: null,
          maxSetVolume: null,
          maxWorkoutVolume: {
            valueKg: 2000,
            reps: null,
            workoutId: WORKOUT_ID,
            date: '2026-10-10',
          },
        },
      ],
    });
    await renderDetail();

    expect(await screen.findByText('Итог тренировки')).toBeTruthy();
    expect(screen.getByLabelText('Объём: 1,3 т')).toBeTruthy();
    expect(screen.getByLabelText('Рабочие подходы: 2')).toBeTruthy();
    expect(analyticsApi.records).toHaveBeenCalledWith('2026-10-17T12:05:00.000Z');
    expect(await screen.findByText('Новый личный рекорд')).toBeTruthy();
    expect(screen.getByText(/Макс\. вес 70 кг \(было 65 кг\)/)).toBeTruthy();
  });

  it('has no summary before any set is annotated', async () => {
    await renderDetail();
    await screen.findByText('Подходы · 4');
    expect(screen.queryByText('Итог тренировки')).toBeNull();
  });

  it('lists the sets with watch reps and flags double presses', async () => {
    await renderDetail();

    expect(await screen.findByLabelText('Подход 1')).toBeTruthy();
    expect(screen.getAllByText('Выбрать упражнение')).toHaveLength(4);
    expect(screen.getAllByText('от часов')).toHaveLength(4);
    expect(screen.getByText('двойное нажатие?')).toBeTruthy();
    expect(screen.getByText('0/4')).toBeTruthy();
  });

  it('opens the annotation sheet for a tapped set', async () => {
    const router = await renderDetail();

    await fireEvent.press(await screen.findByLabelText('Подход 2'));
    await waitFor(() => expect(router.getPathname()).toBe('/annotate'));
    expect(router.getSearchParams()).toEqual({ workoutId: WORKOUT_ID, setIds: sets[1]!.id });
  });

  it('selects a range with long presses and opens bulk annotation in workout order', async () => {
    const router = await renderDetail();

    await fireEvent(await screen.findByLabelText('Подход 4'), 'longPress');
    await fireEvent(screen.getByLabelText('Подход 1'), 'longPress');
    await fireEvent.press(screen.getByText('Разметить (4)'));

    await waitFor(() => expect(router.getPathname()).toBe('/annotate'));
    expect(router.getSearchParams().setIds).toBe(sets.map((s) => s.id).join(','));
  });

  it('shows queued edits right away', async () => {
    await renderDetail();
    await screen.findByLabelText('Подход 1');

    await act(() =>
      enqueueEdit({
        kind: 'annotation.bulk',
        workoutId: WORKOUT_ID,
        setIds: [sets[0]!.id, sets[1]!.id],
        patch: { exerciseId: BENCH.id, weightKg: 60 },
      }),
    );

    expect(await screen.findAllByText(BENCH.nameRu)).toHaveLength(2);
    expect(screen.getAllByText('60 кг × 10')).toHaveLength(2);
    expect(screen.getByText('2/4')).toBeTruthy();
    expect(screen.getByText(/отправятся при появлении связи \(1\)/)).toBeTruthy();
  });

  it('falls back to the saved copy offline', async () => {
    get.mockRejectedValueOnce(new ApiError(0, 'network', 'Нет связи'));
    jest.mocked(getCachedWorkout).mockReturnValue({ detail: workoutDetail(sets), hr: null });
    await renderDetail();

    expect(
      await screen.findByText('Нет связи с сервером — показана сохранённая копия'),
    ).toBeTruthy();
    expect(screen.getByLabelText('Подход 1')).toBeTruthy();
  });

  it('shows the zone of each set peak by the max HR from settings', async () => {
    useSession.setState({
      status: 'signedIn',
      tokens: { accessToken: 'a', refreshToken: 'r' },
      user: {
        id: 'user-1',
        email: null,
        name: null,
        settings: { units: 'kg', hrMax: 190, hrZones: null, bodyWeightKg: null },
        createdAt: '2026-10-19T10:00:00.000Z',
      },
    });
    await renderDetail();
    // Peak 150 with zones up to 114 / 133 / 152 / 171 / 190 bpm.
    expect(await screen.findAllByLabelText('зона 3')).toHaveLength(sets.length);
  });

  it('deletes the workout with its unsent edits after confirmation', async () => {
    const alert = jest.spyOn(Alert, 'alert');
    jest.mocked(workoutsApi.remove).mockResolvedValue(undefined);
    await renderDetail();
    await screen.findByText('Подходы · 4');
    enqueueEdit({
      kind: 'annotation.bulk',
      workoutId: WORKOUT_ID,
      setIds: [sets[0]!.id],
      patch: { exerciseId: BENCH.id },
    });
    expect(useOutbox.getState().queue).toHaveLength(1);

    await fireEvent.press(screen.getByText('Удалить тренировку'));
    expect(workoutsApi.remove).not.toHaveBeenCalled();
    const buttons = alert.mock.calls[0]![2] as AlertButton[];
    await act(async () => buttons.find((b) => b.style === 'destructive')!.onPress!());

    expect(workoutsApi.remove).toHaveBeenCalledWith(WORKOUT_ID);
    await waitFor(() => expect(useOutbox.getState().queue).toEqual([]));
    expect(removeCachedWorkout).toHaveBeenCalledWith('', WORKOUT_ID);
  });
});
