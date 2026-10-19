import type { WorkoutSummary } from '@gsc/shared';
import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/app-text';
import { PressableCard } from '@/components/card';
import { Metric } from '@/components/metric';
import { formatDuration, formatNumber, formatWorkoutDate } from '@/lib/format';
import { colors, radii, spacing } from '@/theme';

export function WorkoutCard({
  workout,
  onPress,
}: {
  workout: WorkoutSummary;
  onPress: () => void;
}) {
  const { setCount, annotatedSetCount } = workout;
  const done = setCount > 0 && annotatedSetCount >= setCount;
  const progress = setCount > 0 ? Math.min(annotatedSetCount / setCount, 1) : 0;

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

      <View style={styles.markup}>
        <View style={styles.markupLabel}>
          <AppText variant="label" color={done ? 'accent' : 'textSecondary'}>
            {done ? 'Размечено' : 'Размечено подходов'}
          </AppText>
          <AppText variant="label" color={done ? 'accent' : 'text'}>
            {annotatedSetCount}/{setCount}
          </AppText>
        </View>
        <View style={styles.track}>
          <View style={[styles.fill, { width: `${progress * 100}%` }]} />
        </View>
      </View>
    </PressableCard>
  );
}

const styles = StyleSheet.create({
  header: { gap: spacing.xxs },
  title: { flexShrink: 1 },
  metrics: { flexDirection: 'row', gap: spacing.md },
  markup: { gap: spacing.sm },
  markupLabel: { flexDirection: 'row', justifyContent: 'space-between' },
  track: {
    height: 6,
    borderRadius: radii.pill,
    backgroundColor: colors.surfaceRaised,
    overflow: 'hidden',
  },
  fill: { height: '100%', borderRadius: radii.pill, backgroundColor: colors.accent },
});
