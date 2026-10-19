import { zodResolver } from '@hookform/resolvers/zod';
import { loginRequestSchema } from '@gsc/shared';
import { Link } from 'expo-router';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';

import { Button } from '@/components/button';
import { TextField } from '@/components/text-field';
import { signIn } from '@/lib/auth';
import { authFormErrors } from '@/lib/form-errors';

import { AuthLayout, FormError } from './auth-layout';

export function SignInScreen() {
  const [serverError, setServerError] = useState<string | null>(null);
  const { control, handleSubmit, formState } = useForm({
    resolver: zodResolver(loginRequestSchema, { error: authFormErrors }),
    defaultValues: { email: '', password: '' },
  });

  const onSubmit = handleSubmit(async (values) => {
    setServerError(null);
    try {
      await signIn(values);
    } catch (error) {
      setServerError(error instanceof Error ? error.message : 'Не удалось войти');
    }
  });

  return (
    <AuthLayout
      title="Вход"
      subtitle="Силовые тренировки с данными часов Garmin"
      footer={
        <Link href="/sign-up" replace asChild>
          <Button variant="ghost" title="Нет аккаунта? Зарегистрироваться" />
        </Link>
      }
    >
      <Controller
        control={control}
        name="email"
        render={({ field, fieldState }) => (
          <TextField
            label="Email"
            value={field.value}
            onChangeText={field.onChange}
            onBlur={field.onBlur}
            error={fieldState.error?.message}
            autoCapitalize="none"
            autoComplete="email"
            keyboardType="email-address"
            textContentType="username"
            returnKeyType="next"
          />
        )}
      />
      <Controller
        control={control}
        name="password"
        render={({ field, fieldState }) => (
          <TextField
            label="Пароль"
            value={field.value}
            onChangeText={field.onChange}
            onBlur={field.onBlur}
            error={fieldState.error?.message}
            secureTextEntry
            autoComplete="current-password"
            textContentType="password"
            returnKeyType="go"
            onSubmitEditing={() => onSubmit()}
          />
        )}
      />
      <FormError message={serverError} />
      <Button title="Войти" block loading={formState.isSubmitting} onPress={() => onSubmit()} />
    </AuthLayout>
  );
}
