import { act, fireEvent, screen, waitFor } from '@testing-library/react-native';
import { router as appRouter } from 'expo-router';

import { exercisesApi, workoutsApi } from '@/lib/api/endpoints';
import { enqueueEdit } from '@/lib/outbox';
import { BENCH, CATALOG, garminSet, ROW, uuid, WORKOUT_ID, workoutDetail } from '@/test/fixtures';
import { Noop, renderScreens } from '@/test/render';

import { SetEditorScreen, type SetEditorTarget } from './set-editor';

jest.mock('@/lib/api/endpoints', () => ({
  workoutsApi: { get: jest.fn() },
  exercisesApi: { list: jest.fn() },
}));
jest.mock('@/lib/db/detail-cache', () => ({
  getCachedWorkout: jest.fn(() => null),
  cacheWorkoutDetail: jest.fn(),
  getCachedExercises: jest.fn(() => null),
  cacheExercises: jest.fn(),
}));
jest.mock('@/lib/outbox', () => {
  const state = { queue: [], recentExerciseIds: [], failure: null };
  return {
    enqueueEdit: jest.fn(),
    flushOutbox: jest.fn(),
    useOutbox: (select: (s: typeof state) => unknown) => select(state),
  };
});
jest.mock('expo-crypto', () => ({ randomUUID: () => '00000000-0000-4000-8000-0000000000aa' }));

const enqueue = jest.mocked(enqueueEdit);

// Set 1 is a row by the watch's guess; set 2 is a double press.
const sets = [
  garminSet(1, {
    garmin: {
      reps: 10,
      weightKg: null,
      hints: [{ category: 'row', subtype: null, exerciseName: null, label: 'Тяга' }],
      suggestedExerciseIds: [ROW.id],
    },
  }),
  garminSet(2, { suspicious: 'too_short', durationSec: 1 }),
  garminSet(3),
  garminSet(4),
];

async function renderEditor(target: SetEditorTarget) {
  const router = await renderScreens(
    { index: Noop, editor: () => <SetEditorScreen target={target} /> },
    { initialUrl: '/' },
  );
  // Open the editor on top of a screen, as the sheet is presented, so saving can go back.
  await act(() => appRouter.push('/editor' as never));
  await screen.findByText('Сохранить', { exact: false });
  return router;
}

describe('SetEditorScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(workoutsApi.get).mockResolvedValue(workoutDetail(sets));
    jest.mocked(exercisesApi.list).mockResolvedValue({ items: CATALOG });
  });

  it('suggests the watch guess without applying it and saves a confirmed set', async () => {
    const router = await renderEditor({
      kind: 'garmin',
      workoutId: WORKOUT_ID,
      setIds: [sets[0]!.id],
    });

    expect(screen.getByText('Подход 1')).toBeTruthy();
    expect(screen.getByText(/Часы предполагают: Тяга/)).toBeTruthy();
    expect(screen.getByText('от часов — проверьте')).toBeTruthy();

    await fireEvent.press(await screen.findByText('подсказка часов · Верх спины (широчайшие)'));
    expect(screen.getByText(ROW.nameRu)).toBeTruthy();
    await fireEvent.changeText(screen.getByLabelText('Вес'), '62,5');
    await fireEvent.press(screen.getByLabelText('Повторы: больше'));
    await fireEvent.press(screen.getByLabelText('RPE 8'));
    await fireEvent.press(screen.getByText('Сохранить'));

    await waitFor(() => expect(router.getPathname()).toBe('/'));
    expect(enqueue).toHaveBeenCalledTimes(1);
    expect(enqueue).toHaveBeenCalledWith({
      kind: 'annotation.put',
      workoutId: WORKOUT_ID,
      setId: sets[0]!.id,
      input: {
        exerciseId: ROW.id,
        weightKg: 62.5,
        reps: 11,
        rpe: 8,
        isWarmup: false,
        isFailure: false,
        isExcluded: false,
        note: null,
      },
    });
  });

  it('applies the exercise and weight to the next working sets', async () => {
    await renderEditor({ kind: 'garmin', workoutId: WORKOUT_ID, setIds: [sets[0]!.id] });

    await fireEvent.changeText(screen.getByLabelText('Упражнение'), 'жим');
    await fireEvent.press(await screen.findByLabelText(BENCH.nameRu));
    await fireEvent.changeText(screen.getByLabelText('Вес'), '80');
    await fireEvent.press(screen.getByLabelText('Применить к 2 следующим'));
    await fireEvent.press(screen.getByText('Сохранить'));

    await waitFor(() => expect(enqueue).toHaveBeenCalledTimes(2));
    // Set 2 is a double press: skipped.
    expect(enqueue).toHaveBeenLastCalledWith({
      kind: 'annotation.bulk',
      workoutId: WORKOUT_ID,
      setIds: [sets[2]!.id, sets[3]!.id],
      patch: { exerciseId: BENCH.id, weightKg: 80 },
    });
  });

  it('bulk mode sends only the touched fields', async () => {
    const ids = [sets[2]!.id, sets[3]!.id];
    await renderEditor({ kind: 'garmin', workoutId: WORKOUT_ID, setIds: ids });

    expect(screen.getByText('Подходы 3, 4')).toBeTruthy();
    const save = screen.getByText('Сохранить для 2 подходов');
    await fireEvent.press(screen.getByText('Разминка'));
    await fireEvent.press(save);

    await waitFor(() => expect(enqueue).toHaveBeenCalled());
    expect(enqueue).toHaveBeenCalledWith({
      kind: 'annotation.bulk',
      workoutId: WORKOUT_ID,
      setIds: ids,
      patch: { isWarmup: true },
    });
  });

  it('explains a double press', async () => {
    await renderEditor({ kind: 'garmin', workoutId: WORKOUT_ID, setIds: [sets[1]!.id] });
    expect(screen.getByText('Подход короче 5 секунд')).toBeTruthy();
  });

  it('creates a manual set with a client id', async () => {
    await renderEditor({ kind: 'manual', workoutId: WORKOUT_ID });

    expect(screen.getByText('Новый подход')).toBeTruthy();
    await fireEvent.press(await screen.findByLabelText(BENCH.nameRu));
    await fireEvent.changeText(screen.getByLabelText('Повторы'), '8');
    await fireEvent.press(screen.getByText('Сохранить'));

    await waitFor(() => expect(enqueue).toHaveBeenCalled());
    expect(enqueue).toHaveBeenCalledWith({
      kind: 'manualSet.create',
      workoutId: WORKOUT_ID,
      input: {
        id: '00000000-0000-4000-8000-0000000000aa',
        exerciseId: BENCH.id,
        weightKg: null,
        reps: 8,
        rpe: null,
        isWarmup: false,
        isFailure: false,
        note: null,
      },
    });
  });

  it('reports a set that no longer exists', async () => {
    await renderScreens({
      index: () => (
        <SetEditorScreen target={{ kind: 'garmin', workoutId: WORKOUT_ID, setIds: [uuid(999)] }} />
      ),
    });
    expect(await screen.findByText('Подход не найден')).toBeTruthy();
  });
});
