import { fireEvent, screen, waitFor } from '@testing-library/react-native';

import { ApiError } from '@/lib/api/client';
import { workoutsApi } from '@/lib/api/endpoints';
import { cacheWorkoutPage, listCachedWorkouts } from '@/lib/db/workout-cache';
import { workoutSummary } from '@/test/fixtures';
import { Noop, renderScreens } from '@/test/render';

import { WorkoutFeedScreen } from './workout-feed';

jest.mock('@/lib/api/endpoints', () => ({ workoutsApi: { list: jest.fn() } }));
jest.mock('@/lib/db/workout-cache', () => ({
  cacheWorkoutPage: jest.fn(),
  listCachedWorkouts: jest.fn(() => []),
}));

const list = jest.mocked(workoutsApi.list);
const cached = jest.mocked(listCachedWorkouts);

function renderFeed() {
  return renderScreens({
    index: () => <WorkoutFeedScreen userId="user-1" />,
    'workouts/[id]': Noop,
  });
}

describe('WorkoutFeedScreen', () => {
  beforeEach(() => jest.clearAllMocks());

  it('shows workouts with their markup status and caches the first page', async () => {
    const workout = workoutSummary();
    list.mockResolvedValueOnce({ items: [workout], nextCursor: null });
    await renderFeed();

    expect(await screen.findByText('Силовая тренировка')).toBeTruthy();
    expect(screen.getByText('8/21')).toBeTruthy();
    expect(screen.getByText('1:11:36')).toBeTruthy();
    expect(cacheWorkoutPage).toHaveBeenCalledWith('user-1', [workout], true);
  });

  it('opens a workout on tap', async () => {
    list.mockResolvedValueOnce({ items: [workoutSummary({ title: 'Спина' })], nextCursor: null });
    const router = await renderFeed();

    await fireEvent.press(await screen.findByText('Спина'));
    await waitFor(() =>
      expect(router.getPathname()).toBe('/workouts/00000000-0000-4000-8000-000000000001'),
    );
  });

  it('shows an empty state with the import action', async () => {
    list.mockResolvedValueOnce({ items: [], nextCursor: null });
    await renderFeed();

    expect(await screen.findByText('Пока нет тренировок')).toBeTruthy();
    expect(screen.getByText('Импорт FIT')).toBeTruthy();
  });

  it('falls back to cached workouts when offline', async () => {
    cached.mockReturnValue([workoutSummary({ title: 'Ноги' })]);
    list.mockRejectedValueOnce(new ApiError(0, 'network', 'Нет связи'));
    await renderFeed();

    expect(
      await screen.findByText('Нет связи с сервером — показаны сохранённые тренировки'),
    ).toBeTruthy();
    expect(screen.getByText('Ноги')).toBeTruthy();
  });

  it('shows an error with retry when offline and nothing is cached', async () => {
    cached.mockReturnValue([]);
    list.mockRejectedValueOnce(new ApiError(0, 'network', 'Нет связи'));
    await renderFeed();

    expect(await screen.findByText('Не удалось загрузить тренировки')).toBeTruthy();
    list.mockResolvedValueOnce({ items: [workoutSummary()], nextCursor: null });
    await fireEvent.press(screen.getByText('Повторить'));
    expect(await screen.findByText('Силовая тренировка')).toBeTruthy();
  });
});
