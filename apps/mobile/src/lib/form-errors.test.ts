import { loginRequestSchema, registerRequestSchema } from '@gsc/shared';

import { authFormErrors } from './form-errors';

function messages(result: {
  success: boolean;
  error?: { issues: { path: PropertyKey[]; message: string }[] };
}) {
  return Object.fromEntries(
    (result.error?.issues ?? []).map((issue) => [String(issue.path[0]), issue.message]),
  );
}

describe('authFormErrors', () => {
  it('explains login errors in Russian', () => {
    const result = loginRequestSchema.safeParse(
      { email: 'not-an-email', password: '' },
      { error: authFormErrors },
    );
    expect(messages(result)).toEqual({
      email: 'Введите корректный email',
      password: 'Введите пароль',
    });
  });

  it('explains registration errors in Russian', () => {
    const result = registerRequestSchema.safeParse(
      { email: '', password: 'short', name: 'x'.repeat(101) },
      { error: authFormErrors },
    );
    expect(messages(result)).toEqual({
      email: 'Введите корректный email',
      password: 'Минимум 8 символов',
      name: 'Имя — до 100 символов',
    });
  });
});
