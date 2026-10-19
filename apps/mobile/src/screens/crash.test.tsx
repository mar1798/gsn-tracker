import { fireEvent, render, screen } from '@testing-library/react-native';

import { CrashScreen } from './crash';

it('offers to retry after a render error', async () => {
  const retry = jest.fn(() => Promise.resolve());
  await render(<CrashScreen error={new Error('boom')} retry={retry} />);
  expect(screen.getByText('Что-то пошло не так')).toBeTruthy();
  await fireEvent.press(screen.getByText('Попробовать снова'));
  expect(retry).toHaveBeenCalled();
});
