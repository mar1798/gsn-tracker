import { render, screen } from '@testing-library/react-native';

import { Home } from './home';

describe('Home', () => {
  it('renders the app name', async () => {
    await render(<Home />);
    expect(screen.getByText('GSC Tracker')).toBeTruthy();
  });
});
