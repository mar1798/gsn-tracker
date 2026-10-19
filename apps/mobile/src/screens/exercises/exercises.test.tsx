import type { AlertButton } from 'react-native';
import { act, fireEvent, screen, waitFor } from '@testing-library/react-native';
import { router as appRouter } from 'expo-router';
import { Alert } from 'react-native';

import { ApiError } from '@/lib/api/client';
import { exercisesApi } from '@/lib/api/endpoints';
import { BENCH, exercise, ROW, uuid } from '@/test/fixtures';
import { Noop, renderScreens } from '@/test/render';

import { ExerciseCatalogScreen } from './exercise-catalog';
import { ExerciseDetailScreen } from './exercise-detail';
import { ExerciseFormScreen } from './exercise-form';

jest.mock('@/lib/api/endpoints', () => ({
  exercisesApi: { list: jest.fn(), create: jest.fn(), update: jest.fn(), remove: jest.fn() },
}));
jest.mock('@/lib/db/detail-cache', () => ({
  getCachedExercises: jest.fn(() => null),
  cacheExercises: jest.fn(),
}));

const DIPS = exercise(3, 'Отжимания на брусьях', {
  equipment: 'bodyweight',
  isBodyweight: true,
  muscles: [
    { muscle: 'chest', role: 'primary', coefficient: 1 },
    { muscle: 'triceps', role: 'secondary', coefficient: 0.5 },
  ],
});
const MINE = exercise(4, 'Жим в хаммере', {
  equipment: 'machine',
  isCustom: true,
  muscles: [
    { muscle: 'chest', role: 'primary', coefficient: 1 },
    { muscle: 'triceps', role: 'secondary', coefficient: 0.3 },
  ],
});
const ARCHIVED = exercise(5, 'Старый жим', { isCustom: true, isArchived: true });

const api = jest.mocked(exercisesApi);

beforeEach(() => {
  jest.clearAllMocks();
  api.list.mockResolvedValue({ items: [BENCH, ROW, DIPS, MINE, ARCHIVED] });
});

describe('ExerciseCatalogScreen', () => {
  const renderCatalog = () =>
    renderScreens({
      index: ExerciseCatalogScreen,
      'exercises/[id]': Noop,
      'exercise-form': Noop,
    });

  it('lists active exercises and filters by search, muscle and own ones', async () => {
    const router = await renderCatalog();
    expect(await screen.findByText(BENCH.nameRu)).toBeTruthy();
    expect(screen.getByText('4 в справочнике')).toBeTruthy();
    expect(screen.queryByText(ARCHIVED.nameRu)).toBeNull();

    await fireEvent.press(screen.getByText('Трицепс'));
    expect(screen.getByText('Найдено: 2')).toBeTruthy();
    expect(screen.queryByText(BENCH.nameRu)).toBeNull();
    expect(screen.getAllByText('Трицепс — вспомогательная')).toHaveLength(2);

    await fireEvent.press(screen.getByLabelText('Только мои упражнения'));
    expect(screen.getByText(MINE.nameRu)).toBeTruthy();
    expect(screen.queryByText(DIPS.nameRu)).toBeNull();

    await fireEvent.press(screen.getByText(MINE.nameRu));
    expect(router.getPathname()).toBe(`/exercises/${MINE.id}`);
  });

  it('offers to create an exercise that is not found', async () => {
    const router = await renderCatalog();
    await fireEvent.changeText(await screen.findByLabelText('Поиск'), 'Жим Арнольда');
    expect(screen.getByText('Ничего не найдено')).toBeTruthy();
    await fireEvent.press(screen.getByText('Создать «Жим Арнольда»'));
    expect(router.getPathname()).toBe('/exercise-form');
    expect(router.getSearchParams()).toEqual({ name: 'Жим Арнольда' });
  });

  it('explains the empty list of own exercises', async () => {
    api.list.mockResolvedValue({ items: [BENCH, ROW] });
    await renderCatalog();
    await fireEvent.press(await screen.findByLabelText('Только мои упражнения'));
    expect(screen.getByText('Своих упражнений пока нет')).toBeTruthy();
  });
});

describe('ExerciseDetailScreen', () => {
  async function renderDetail(id: string) {
    const router = await renderScreens({
      index: Noop,
      detail: () => <ExerciseDetailScreen id={id} />,
      'exercise-form': Noop,
    });
    await act(() => appRouter.push('/detail' as never));
    return router;
  }

  it('shows muscles with their shares; built-in exercises are read-only', async () => {
    await renderDetail(DIPS.id);
    expect(await screen.findByText(DIPS.nameRu)).toBeTruthy();
    expect(screen.getByLabelText('Грудь: 100 %')).toBeTruthy();
    expect(screen.getByLabelText('Трицепс: 50 %')).toBeTruthy();
    expect(screen.getByText('Упражнение с весом тела')).toBeTruthy();
    expect(screen.queryByText('Изменить')).toBeNull();
  });

  it('edits and deletes an own exercise', async () => {
    const alert = jest.spyOn(Alert, 'alert');
    api.remove.mockResolvedValue(undefined);
    const router = await renderDetail(MINE.id);

    await fireEvent.press(await screen.findByText('Изменить'));
    expect(router.getPathname()).toBe('/exercise-form');
    expect(router.getSearchParams()).toEqual({ id: MINE.id });
    await act(() => appRouter.back());

    await fireEvent.press(screen.getByText('Удалить'));
    const buttons = alert.mock.calls[0]![2] as AlertButton[];
    await act(async () => buttons.find((b) => b.style === 'destructive')!.onPress!());
    await waitFor(() => expect(router.getPathname()).toBe('/'));
    expect(api.remove).toHaveBeenCalledWith(MINE.id);
  });

  it('marks a deleted exercise', async () => {
    await renderDetail(ARCHIVED.id);
    expect(await screen.findByText(/Упражнение удалено из справочника/)).toBeTruthy();
    expect(screen.queryByText('Удалить')).toBeNull();
  });

  it('handles an unknown id', async () => {
    await renderDetail(uuid(999));
    expect(await screen.findByText('Упражнение не найдено')).toBeTruthy();
  });
});

describe('ExerciseFormScreen', () => {
  async function renderForm(props: { id?: string; name?: string }) {
    const router = await renderScreens({
      index: Noop,
      form: () => <ExerciseFormScreen {...props} />,
    });
    await act(() => appRouter.push('/form' as never));
    return router;
  }

  it('validates and creates an exercise from a search name', async () => {
    const created = exercise(6, 'Жим Арнольда', { isCustom: true });
    api.create.mockResolvedValue(created);
    const router = await renderForm({ name: 'Жим Арнольда' });

    expect(await screen.findByDisplayValue('Жим Арнольда')).toBeTruthy();
    await fireEvent.press(screen.getByText('Создать'));
    expect(await screen.findByText('Выберите оборудование')).toBeTruthy();
    expect(screen.getByText('Отметьте хотя бы одну основную мышцу')).toBeTruthy();

    await fireEvent.press(screen.getByText('Гантели'));
    await fireEvent.press(screen.getByLabelText('Передняя дельта: основная'));
    await fireEvent.press(screen.getByLabelText('Трицепс: вспомогательная'));
    await fireEvent.press(screen.getByText('Создать'));

    await waitFor(() => expect(router.getPathname()).toBe('/'));
    expect(api.create).toHaveBeenCalledWith({
      nameRu: 'Жим Арнольда',
      equipment: 'dumbbell',
      mechanics: 'compound',
      isBodyweight: false,
      muscles: [
        { muscle: 'front_delts', role: 'primary', coefficient: 1 },
        { muscle: 'triceps', role: 'secondary', coefficient: 0.5 },
      ],
    });
  });

  it('edits an own exercise and shows a server error', async () => {
    api.update.mockRejectedValue(
      new ApiError(409, 'duplicate_name', 'Упражнение с таким названием уже есть'),
    );
    await renderForm({ id: MINE.id });

    await fireEvent.changeText(await screen.findByDisplayValue(MINE.nameRu), 'Жим штанги лёжа');
    await fireEvent.press(screen.getByText('Сохранить'));

    expect(await screen.findByText('Упражнение с таким названием уже есть')).toBeTruthy();
    expect(api.update).toHaveBeenCalledWith(MINE.id, {
      nameRu: 'Жим штанги лёжа',
      equipment: 'machine',
      mechanics: 'compound',
      isBodyweight: false,
      muscles: MINE.muscles,
    });
  });

  it('refuses to edit a built-in exercise', async () => {
    await renderForm({ id: BENCH.id });
    expect(await screen.findByText('Упражнение нельзя изменить')).toBeTruthy();
  });
});
