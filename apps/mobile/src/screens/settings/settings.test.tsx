import type { User } from '@gsc/shared';
import { act, fireEvent, screen, waitFor } from '@testing-library/react-native';
import { router as appRouter } from 'expo-router';
import { Alert, type AlertButton } from 'react-native';

import { ApiError } from '@/lib/api/client';
import { meApi } from '@/lib/api/endpoints';
import { deleteAccount } from '@/lib/auth';
import { exportSetsCsv } from '@/lib/export-csv';
import { useSession } from '@/lib/session';
import { Noop, renderScreens } from '@/test/render';
import { ProfileScreen } from '@/screens/profile';

import { SettingsScreen } from './settings';

jest.mock('@/lib/api/endpoints', () => ({ meApi: { updateSettings: jest.fn() } }));
jest.mock('@/lib/auth', () => ({ deleteAccount: jest.fn(), signOut: jest.fn() }));
jest.mock('@/lib/export-csv', () => ({ exportSetsCsv: jest.fn() }));

const USER: User = {
  id: '00000000-0000-4000-8000-000000000001',
  email: 'lifter@example.com',
  name: 'Тест',
  settings: { units: 'kg', hrMax: null, hrZones: null, bodyWeightKg: null },
  createdAt: '2026-10-19T10:00:00.000Z',
};

const signIn = (user: User = USER) =>
  useSession.setState({
    status: 'signedIn',
    tokens: { accessToken: 'a', refreshToken: 'r' },
    user,
  });

beforeEach(() => {
  jest.clearAllMocks();
  signIn();
});

describe('ProfileScreen', () => {
  const renderProfile = () => renderScreens({ index: ProfileScreen, settings: Noop });

  it('summarizes settings and opens them', async () => {
    signIn({ ...USER, settings: { ...USER.settings, units: 'lb', bodyWeightKg: 80, hrMax: 190 } });
    const router = await renderProfile();
    expect(screen.getByText('фунты · вес тела 176,4 фнт · зоны от 190 уд/мин')).toBeTruthy();
    await fireEvent.press(screen.getByLabelText('Настройки'));
    expect(router.getPathname()).toBe('/settings');
  });

  it('exports CSV and shows why it failed', async () => {
    jest
      .mocked(exportSetsCsv)
      .mockRejectedValueOnce(new ApiError(0, 'network', 'Нет связи с сервером'))
      .mockResolvedValueOnce();
    await renderProfile();
    await fireEvent.press(screen.getByText('Экспорт CSV'));
    expect(await screen.findByText('Нет связи с сервером')).toBeTruthy();
    await fireEvent.press(screen.getByText('Экспорт CSV'));
    await waitFor(() => expect(screen.queryByText('Нет связи с сервером')).toBeNull());
    expect(exportSetsCsv).toHaveBeenCalledTimes(2);
  });

  it('deletes the account only after confirmation', async () => {
    const alert = jest.spyOn(Alert, 'alert');
    jest.mocked(deleteAccount).mockResolvedValue();
    await renderProfile();

    await fireEvent.press(screen.getByText('Удалить аккаунт'));
    expect(alert).toHaveBeenCalledWith('Удалить аккаунт?', expect.any(String), expect.any(Array));
    expect(deleteAccount).not.toHaveBeenCalled();

    const buttons = alert.mock.calls[0]![2] as AlertButton[];
    await act(async () => buttons.find((b) => b.style === 'destructive')!.onPress!());
    expect(deleteAccount).toHaveBeenCalledTimes(1);
  });
});

describe('SettingsScreen', () => {
  async function renderSettings() {
    const router = await renderScreens({ index: Noop, settings: SettingsScreen });
    await act(() => appRouter.push('/settings'));
    return router;
  }

  it('saves units, body weight in those units and zones from max HR', async () => {
    const saved: User = {
      ...USER,
      settings: { units: 'lb', bodyWeightKg: 80.014, hrMax: 193, hrZones: null },
    };
    jest.mocked(meApi.updateSettings).mockResolvedValue(saved);
    const router = await renderSettings();

    await fireEvent.changeText(screen.getByLabelText('Вес тела, кг'), '80');
    await fireEvent.press(screen.getByLabelText('Фунты'));
    expect(screen.getByLabelText('Вес тела, фнт').props.value).toBe('176,4');

    await fireEvent.press(screen.getByLabelText('От макс.'));
    await fireEvent.changeText(screen.getByLabelText('Максимальный пульс, уд/мин'), '193');
    expect(screen.getByText('≤ 116')).toBeTruthy();
    expect(screen.getByText('≤ 193')).toBeTruthy();

    await fireEvent.press(screen.getByText('Сохранить'));
    await waitFor(() => expect(router.getPathname()).toBe('/'));
    expect(meApi.updateSettings).toHaveBeenCalledWith({
      units: 'lb',
      bodyWeightKg: 80.014,
      hrMax: 193,
      hrZones: null,
    });
    expect(useSession.getState().user?.settings).toEqual(saved.settings);
  });

  it('starts own zones from max HR and rejects bounds that do not ascend', async () => {
    signIn({ ...USER, settings: { ...USER.settings, hrMax: 190 } });
    await renderSettings();

    await fireEvent.press(screen.getByLabelText('Свои'));
    expect(screen.getByLabelText('Зона 1').props.value).toBe('114');
    await fireEvent.changeText(screen.getByLabelText('Зона 3'), '100');
    await fireEvent.press(screen.getByText('Сохранить'));
    expect(await screen.findByText('Границы зон должны возрастать')).toBeTruthy();
    expect(meApi.updateSettings).not.toHaveBeenCalled();
  });

  it('keeps the form open when saving fails', async () => {
    jest
      .mocked(meApi.updateSettings)
      .mockRejectedValue(new ApiError(0, 'network', 'Нет связи с сервером'));
    const router = await renderSettings();
    await fireEvent.press(screen.getByText('Сохранить'));
    expect(await screen.findByText('Нет связи с сервером')).toBeTruthy();
    expect(router.getPathname()).toBe('/settings');
  });
});
