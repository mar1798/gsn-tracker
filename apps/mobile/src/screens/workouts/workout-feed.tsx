import type { WorkoutSummary } from '@gsc/shared';
import { useRouter } from 'expo-router';
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, View } from 'react-native';

import { Banner } from '@/components/banner';
import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { EmptyState } from '@/components/empty-state';
import { Screen, ScreenHeader } from '@/components/screen';
import { Skeleton } from '@/components/skeleton';
import { usePickFitFile } from '@/hooks/use-pick-fit-file';
import { useWorkoutFeed } from '@/hooks/use-workout-feed';
import { colors, radii, spacing } from '@/theme';

import { WorkoutCard } from './workout-card';

export function WorkoutFeedScreen({ userId }: { userId: string }) {
  const router = useRouter();
  const pickFile = usePickFitFile();
  const feed = useWorkoutFeed(userId);
  const { workouts } = feed;

  const importButton = (
    <Button title="Импорт FIT" icon="square.and.arrow.down" size="sm" onPress={pickFile} />
  );

  function renderEmpty() {
    if (feed.isPlaceholderData || feed.isPending) return <FeedSkeleton />;
    if (feed.isError || feed.offline) {
      return (
        <EmptyState
          tone="danger"
          icon="wifi.exclamationmark"
          title="Не удалось загрузить тренировки"
          message={feed.error?.message ?? 'Нет связи с сервером. Проверьте интернет.'}
          action={
            <Button title="Повторить" variant="secondary" onPress={() => void feed.refetch()} />
          }
        />
      );
    }
    return (
      <EmptyState
        icon="figure.strengthtraining.traditional"
        title="Пока нет тренировок"
        message="Экспортируйте силовую тренировку из Garmin Connect («Export Original») и импортируйте FIT-файл."
        action={<Button title="Импорт FIT" icon="square.and.arrow.down" onPress={pickFile} />}
      />
    );
  }

  return (
    <Screen>
      <FlatList<WorkoutSummary>
        data={workouts}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          <View>
            <ScreenHeader title="Тренировки" right={workouts.length > 0 && importButton} />
            {feed.offline && workouts.length > 0 ? <OfflineBanner /> : null}
          </View>
        }
        ListEmptyComponent={renderEmpty()}
        renderItem={({ item }) => (
          <View style={styles.item}>
            <WorkoutCard workout={item} onPress={() => router.push(`/workouts/${item.id}`)} />
          </View>
        )}
        ListFooterComponent={
          feed.isFetchingNextPage ? (
            <ActivityIndicator color={colors.accent} style={styles.footer} />
          ) : undefined
        }
        onEndReached={() => {
          if (feed.hasNextPage && !feed.isFetchingNextPage) void feed.fetchNextPage();
        }}
        onEndReachedThreshold={0.5}
        refreshControl={
          <RefreshControl
            refreshing={feed.isRefetching && !feed.isFetchingNextPage}
            onRefresh={() => void feed.refetch()}
            tintColor={colors.accent}
          />
        }
      />
    </Screen>
  );
}

function OfflineBanner() {
  return (
    <View style={styles.banner}>
      <Banner icon="wifi.slash" message="Нет связи с сервером — показаны сохранённые тренировки" />
    </View>
  );
}

function FeedSkeleton() {
  return (
    <View accessibilityLabel="Загрузка тренировок" style={styles.skeletons}>
      {[0, 1, 2].map((i) => (
        <Card key={i}>
          <Skeleton width="60%" height={22} />
          <Skeleton width="40%" height={14} />
          <Skeleton height={44} />
          <Skeleton height={6} radius={radii.pill} />
        </Card>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  list: { paddingBottom: spacing.xxl, flexGrow: 1 },
  item: { paddingHorizontal: spacing.lg, paddingBottom: spacing.md },
  footer: { paddingVertical: spacing.lg },
  skeletons: { paddingHorizontal: spacing.lg, gap: spacing.md },
  banner: { marginHorizontal: spacing.lg, marginBottom: spacing.md },
});
