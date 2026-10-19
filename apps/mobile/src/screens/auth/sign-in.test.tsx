import { fireEvent, screen } from '@testing-library/react-native';

import { ApiError } from '@/lib/api/client';
import { signIn } from '@/lib/auth';
import { Noop, renderScreens } from '@/test/render';

import { SignInScreen } from './sign-in';

jest.mock('@/lib/auth', () => ({ signIn: jest.fn() }));

const mockedSignIn = jest.mocked(signIn);

function renderSignIn() {
  return renderScreens({ index: SignInScreen, 'sign-up': Noop });
}

describe('SignInScreen', () => {
  beforeEach(() => jest.clearAllMocks());

  it('validates the form in Russian before calling the API', async () => {
    await renderSignIn();
    await fireEvent.press(screen.getByText('Войти'));

    expect(await screen.findByText('Введите корректный email')).toBeTruthy();
    expect(screen.getByText('Введите пароль')).toBeTruthy();
    expect(mockedSignIn).not.toHaveBeenCalled();
  });

  it('signs in with a normalized email', async () => {
    mockedSignIn.mockResolvedValueOnce();
    await renderSignIn();
    await fireEvent.changeText(screen.getByLabelText('Email'), '  Lifter@Example.com ');
    await fireEvent.changeText(screen.getByLabelText('Пароль'), 'secret-password');
    await fireEvent.press(screen.getByText('Войти'));

    await screen.findByText('Войти');
    expect(mockedSignIn).toHaveBeenCalledWith({
      email: 'lifter@example.com',
      password: 'secret-password',
    });
  });

  it('shows the server error', async () => {
    mockedSignIn.mockRejectedValueOnce(
      new ApiError(401, 'invalid_credentials', 'Неверный email или пароль'),
    );
    await renderSignIn();
    await fireEvent.changeText(screen.getByLabelText('Email'), 'lifter@example.com');
    await fireEvent.changeText(screen.getByLabelText('Пароль'), 'wrong');
    await fireEvent.press(screen.getByText('Войти'));

    expect(await screen.findByText('Неверный email или пароль')).toBeTruthy();
  });
});
