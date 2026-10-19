import type { WorkoutSummary } from '@gsc/shared';
import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/app-text';
import { PressableCard } from '@/components/card';
import { MarkupProgress } from '@/components/markup-progress';
import { Metric } from '@/components/metric';
import { formatDuration, formatNumber, formatWorkoutDate } from '@/lib/format';
import { spacing } from '@/theme';

export function WorkoutCard({
  workout,
  onPress,
}: {
  workout: WorkoutSummary;
  onPress: () => void;
}) {
  return (
    <PressableCard onPress={onPress} accessibilityRole="button">
      <View style={styles.header}>
        <AppText variant="heading" style={styles.title} numberOfLines={1}>
          {workout.title ?? 'Силовая тренировка'}
        </AppText>
        <AppText variant="caption" color="textSecondary">
          {formatWorkoutDate(workout.startedAt)}
        </AppText>
      </View>

      <View style={styles.metrics}>
        <Metric icon="timer" label="Время" value={formatDuration(workout.durationSec)} />
        <Metric
          icon="flame.fill"
          iconColor="calories"
          label="Ккал"
          value={formatNumber(workout.calories)}
        />
        <Metric
          icon="heart.fill"
          iconColor="heartRate"
          label="Ср. пульс"
          value={formatNumber(workout.avgHr)}
        />
      </View>

      <MarkupProgress done={workout.annotatedSetCount} total={workout.setCount} />
    </PressableCard>
  );
}

const styles = StyleSheet.create({
  header: { gap: spacing.xxs },
  title: { flexShrink: 1 },
  metrics: { flexDirection: 'row', gap: spacing.md },
});
