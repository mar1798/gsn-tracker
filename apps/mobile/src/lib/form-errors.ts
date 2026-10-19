import type { z } from 'zod';

// Russian messages for the auth forms. The shared schemas carry no messages (the API answers
// in Russian itself), so the forms pass this map to zod per parse.
export const authFormErrors: z.core.$ZodErrorMap = (issue) => {
  switch (issue.path?.[0]) {
    case 'email':
      return 'Введите корректный email';
    case 'password':
      if (issue.code === 'too_small') {
        return issue.minimum === 1 ? 'Введите пароль' : `Минимум ${issue.minimum} символов`;
      }
      return issue.code === 'too_big' ? `Максимум ${issue.maximum} символов` : 'Введите пароль';
    case 'name':
      return `Имя — до ${issue.code === 'too_big' ? issue.maximum : 100} символов`;
    default:
      return undefined;
  }
};
