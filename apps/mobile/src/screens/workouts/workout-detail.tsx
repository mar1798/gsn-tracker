import type { WorkoutSet } from '@gsc/shared';
import { useQuery } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import { ScrollView, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/app-text';
import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { EmptyState } from '@/components/empty-state';
import { Metric } from '@/components/metric';
import { Skeleton } from '@/components/skeleton';
import { workoutsApi } from '@/lib/api/endpoints';
import { formatDuration, formatNumber, formatWorkoutDate } from '@/lib/format';
import { queryKeys } from '@/lib/query-client';
import { colors, radii, spacing } from '@/theme';

// Read-only workout summary and set list. Annotation (bottom sheet, HR chart) is phase 4.
export function WorkoutDetailScreen({ id }: { id: string }) {
  const query = useQuery({ queryKey: queryKeys.workout(id), queryFn: () => workoutsApi.get(id) });
  const workout = query.data;

  if (!workout) {
    return (
      <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
        {query.isError ? (
          <EmptyState
            tone="danger"
            icon="exclamationmark.triangle"
            title="Не удалось открыть тренировку"
            message={query.error.message}
            action={
              <Button title="Повторить" variant="secondary" onPress={() => query.refetch()} />
            }
          />
        ) : (
          <View accessibilityLabel="Загрузка тренировки" style={styles.skeleton}>
            <Skeleton height={120} radius={radii.lg} />
            {[0, 1, 2, 3].map((i) => (
              <Skeleton key={i} height={64} radius={radii.md} />
            ))}
          </View>
        )}
      </ScrollView>
    );
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Stack.Screen options={{ title: workout.title ?? 'Силовая тренировка' }} />
      <AppText color="textSecondary">{formatWorkoutDate(workout.startedAt)}</AppText>

      <Card>
        <View style={styles.metrics}>
          <Metric icon="timer" label="Время" value={formatDuration(workout.durationSec)} />
          <Metric
            icon="bolt.fill"
            label="Под нагрузкой"
            value={formatDuration(workout.activeSec)}
          />
        </View>
        <View style={styles.metrics}>
          <Metric
            icon="flame.fill"
            iconColor="calories"
            label="Ккал"
            value={formatNumber(workout.calories)}
          />
          <Metric
            icon="heart.fill"
            iconColor="heartRate"
            label="Пульс ср. / макс."
            value={`${formatNumber(workout.avgHr)} / ${formatNumber(workout.maxHr)}`}
          />
        </View>
      </Card>

      <AppText variant="heading">Подходы · {workout.sets.length}</AppText>
      <View style={styles.sets}>
        {workout.sets.map((set) => (
          <SetRow key={set.id} set={set} />
        ))}
      </View>
    </ScrollView>
  );
}

function SetRow({ set }: { set: WorkoutSet }) {
  const reps = set.effective.reps;
  return (
    <View style={[styles.setRow, set.suspicious && styles.suspicious]}>
      <View style={styles.setIndex}>
        <AppText variant="bodyStrong">{set.setIndex}</AppText>
      </View>
      <View style={styles.setBody}>
        <AppText variant="bodyStrong">
          {reps != null ? `${reps} повт.` : 'Повторы —'}
          {set.effective.repsSource === 'garmin' ? (
            <AppText variant="caption" color="textTertiary">
              {'  '}от часов
            </AppText>
          ) : null}
        </AppText>
        <AppText variant="caption" color="textSecondary">
          {formatDuration(set.durationSec)} · отдых {formatDuration(set.restAfterSec)}
          {set.suspicious ? ' · слишком короткий' : ''}
        </AppText>
      </View>
      <View style={styles.setHr}>
        <AppText variant="bodyStrong">{formatNumber(set.hr.peak)}</AppText>
        <AppText variant="caption" color="textSecondary">
          пик пульса
        </AppText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, gap: spacing.lg, paddingBottom: spacing.xxxl },
  skeleton: { gap: spacing.md },
  metrics: { flexDirection: 'row', gap: spacing.md },
  sets: { gap: spacing.sm },
  setRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radii.md,
    backgroundColor: colors.surface,
  },
  suspicious: { borderWidth: 1, borderColor: colors.dangerMuted },
  setIndex: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceRaised,
  },
  setBody: { flex: 1, gap: spacing.xxs },
  setHr: { alignItems: 'flex-end' },
});
