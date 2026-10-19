import { screen, waitFor } from '@testing-library/react-native';

import { ApiError } from '@/lib/api/client';
import { importsApi } from '@/lib/api/endpoints';
import { Noop, renderScreens } from '@/test/render';

import { ImportFitScreen } from './import-fit';

jest.mock('@/lib/api/endpoints', () => ({ importsApi: { fit: jest.fn() } }));

const importFit = jest.mocked(importsApi.fit);
const workoutId = '00000000-0000-4000-8000-000000000001';

function renderImport(name: string) {
  return renderScreens({
    index: () => <ImportFitScreen file={{ uri: `file:///tmp/${name}`, name }} />,
    'workouts/[id]': Noop,
  });
}

describe('ImportFitScreen', () => {
  beforeEach(() => jest.clearAllMocks());

  it('uploads the file and opens the new workout', async () => {
    importFit.mockResolvedValueOnce({ workoutId });
    const router = await renderImport('activity.fit');

    await waitFor(() => expect(router.getPathname()).toBe(`/workouts/${workoutId}`));
    expect(importFit).toHaveBeenCalledWith({
      uri: 'file:///tmp/activity.fit',
      name: 'activity.fit',
      mimeType: 'application/vnd.ant.fit',
    });
  });

  it('offers to open the existing workout for a duplicate', async () => {
    importFit.mockRejectedValueOnce(
      new ApiError(409, 'duplicate', 'Файл уже импортирован', {
        error: 'duplicate',
        message: 'Файл уже импортирован',
        workoutId,
      }),
    );
    await renderImport('activity.fit');

    expect(await screen.findByText('Файл уже импортирован')).toBeTruthy();
    expect(screen.getByText('Открыть тренировку')).toBeTruthy();
  });

  it('shows the server reason for a rejected file', async () => {
    importFit.mockRejectedValueOnce(new ApiError(422, 'not_strength', 'Это не силовая тренировка'));
    await renderImport('run.fit');

    expect(await screen.findByText('Это не силовая тренировка')).toBeTruthy();
    expect(screen.queryByText('Повторить')).toBeNull();
  });

  it('rejects a non-FIT file without uploading', async () => {
    await renderImport('activity.zip');

    expect(await screen.findByText('Файл не подходит')).toBeTruthy();
    expect(importFit).not.toHaveBeenCalled();
  });
});
