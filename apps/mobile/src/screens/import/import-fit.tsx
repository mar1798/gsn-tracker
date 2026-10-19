import { useRouter } from 'expo-router';
import { useEffect, useRef } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/app-text';
import { Button } from '@/components/button';
import { EmptyState } from '@/components/empty-state';
import { Screen } from '@/components/screen';
import { useImportFit } from '@/hooks/use-import-fit';
import type { LocalFile } from '@/lib/fit-file';
import { colors, spacing } from '@/theme';

/** Uploads one FIT file (picked in the app or opened from another app) and opens the workout. */
export function ImportFitScreen({ file }: { file: LocalFile | null }) {
  const router = useRouter();
  const { mutate, failure, isPending } = useImportFit();
  const started = useRef(false);

  const upload = () => {
    if (!file) return;
    mutate(file, {
      onSuccess: ({ workoutId }) => router.replace(`/workouts/${workoutId}`),
    });
  };

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    upload();
  });

  const close = () => (router.canGoBack() ? router.back() : router.replace('/'));

  let body;
  if (!file) {
    body = (
      <EmptyState
        tone="danger"
        icon="exclamationmark.triangle"
        title="Файл не найден"
        message="Попробуйте выбрать FIT-файл ещё раз."
      />
    );
  } else if (failure?.kind === 'duplicate') {
    body = (
      <EmptyState
        icon="checkmark.circle"
        title="Файл уже импортирован"
        message="Эта тренировка уже есть в ленте."
        action={
          <Button
            title="Открыть тренировку"
            onPress={() => router.replace(`/workouts/${failure.workoutId}`)}
          />
        }
      />
    );
  } else if (failure) {
    body = (
      <EmptyState
        tone="danger"
        icon={failure.kind === 'retryable' ? 'wifi.exclamationmark' : 'exclamationmark.triangle'}
        title={failure.kind === 'retryable' ? 'Не удалось загрузить' : 'Файл не подходит'}
        message={failure.message}
        action={
          failure.kind === 'retryable' ? (
            <Button title="Повторить" variant="secondary" onPress={upload} />
          ) : undefined
        }
      />
    );
  } else {
    body = (
      <View style={styles.progress} accessibilityLiveRegion="polite">
        <ActivityIndicator size="large" color={colors.accent} />
        <AppText variant="heading" align="center">
          {isPending ? 'Разбираем тренировку…' : 'Готово'}
        </AppText>
        <AppText color="textSecondary" align="center" numberOfLines={2}>
          {file.name}
        </AppText>
      </View>
    );
  }

  return (
    <Screen edges={['top', 'bottom']}>
      <View style={styles.toolbar}>
        <Button title="Закрыть" variant="ghost" size="sm" onPress={close} />
      </View>
      <View style={styles.body}>{body}</View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  toolbar: { alignItems: 'flex-end', paddingHorizontal: spacing.md, paddingTop: spacing.sm },
  body: { flex: 1, justifyContent: 'center' },
  progress: { alignItems: 'center', gap: spacing.lg, paddingHorizontal: spacing.xxl },
});
