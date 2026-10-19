import type { ErrorBoundaryProps } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppText } from '@/components/app-text';
import { Button } from '@/components/button';
import { EmptyState } from '@/components/empty-state';
import { colors, spacing } from '@/theme';

/** Last-resort screen for a render error anywhere in the app (root `ErrorBoundary`). */
export function CrashScreen({ error, retry }: ErrorBoundaryProps) {
  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.content}>
        <EmptyState
          tone="danger"
          icon="exclamationmark.triangle"
          title="Что-то пошло не так"
          message="Экран не удалось показать. Данные и неотправленные правки сохранены на телефоне."
          action={<Button title="Попробовать снова" onPress={() => void retry()} />}
        />
        {__DEV__ ? (
          <AppText variant="caption" color="textTertiary" align="center">
            {error.message}
          </AppText>
        ) : null}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { flex: 1, justifyContent: 'center', padding: spacing.lg },
});
