import { zodResolver } from '@hookform/resolvers/zod';
import { registerRequestSchema } from '@gsc/shared';
import { Link } from 'expo-router';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';

import { Button } from '@/components/button';
import { TextField } from '@/components/text-field';
import { signUp } from '@/lib/auth';
import { authFormErrors } from '@/lib/form-errors';

import { AuthLayout, FormError } from './auth-layout';

export function SignUpScreen() {
  const [serverError, setServerError] = useState<string | null>(null);
  const { control, handleSubmit, formState } = useForm({
    resolver: zodResolver(registerRequestSchema, { error: authFormErrors }),
    defaultValues: { name: '', email: '', password: '' },
  });

  const onSubmit = handleSubmit(async ({ name, ...values }) => {
    setServerError(null);
    try {
      await signUp({ ...values, name: name || undefined });
    } catch (error) {
      setServerError(error instanceof Error ? error.message : 'Не удалось зарегистрироваться');
    }
  });

  return (
    <AuthLayout
      title="Регистрация"
      subtitle="Импортируйте тренировки Garmin и следите за прогрессом"
      footer={
        <Link href="/sign-in" replace asChild>
          <Button variant="ghost" title="Уже есть аккаунт? Войти" />
        </Link>
      }
    >
      <Controller
        control={control}
        name="name"
        render={({ field, fieldState }) => (
          <TextField
            label="Имя (необязательно)"
            value={field.value}
            onChangeText={field.onChange}
            onBlur={field.onBlur}
            error={fieldState.error?.message}
            autoComplete="name"
            textContentType="name"
            returnKeyType="next"
          />
        )}
      />
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
            autoComplete="new-password"
            textContentType="newPassword"
            returnKeyType="go"
            onSubmitEditing={() => onSubmit()}
          />
        )}
      />
      <FormError message={serverError} />
      <Button
        title="Создать аккаунт"
        block
        loading={formState.isSubmitting}
        onPress={() => onSubmit()}
      />
    </AuthLayout>
  );
}
