import type { Exercise } from '@gsc/shared';
import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/app-text';
import { PressableCard } from '@/components/card';
import { Tag } from '@/components/chip';
import { Icon } from '@/components/icon';
import { EQUIPMENT_LABELS, muscleName, musclesByRole } from '@/lib/exercise-labels';
import { spacing } from '@/theme';

/** Catalog list item: name, primary muscles, equipment. */
export function ExerciseRow({
  exercise,
  highlightMuscle,
  onPress,
}: {
  exercise: Exercise;
  /** The muscle filter: shown as a tag when it is only a secondary muscle here. */
  highlightMuscle: string | null;
  onPress: () => void;
}) {
  const primary = musclesByRole(exercise, 'primary').map((m) => muscleName(m.muscle));
  const secondaryHit =
    highlightMuscle !== null &&
    musclesByRole(exercise, 'secondary').some((m) => m.muscle === highlightMuscle);

  return (
    <PressableCard
      accessibilityRole="button"
      accessibilityLabel={exercise.nameRu}
      onPress={onPress}
      style={styles.card}
    >
      <View style={styles.text}>
        <AppText variant="bodyStrong">{exercise.nameRu}</AppText>
        <AppText variant="caption" color="textSecondary" numberOfLines={1}>
          {[...primary, EQUIPMENT_LABELS[exercise.equipment]].join(' · ')}
        </AppText>
        {exercise.isCustom || secondaryHit ? (
          <View style={styles.tags}>
            {exercise.isCustom ? <Tag label="Своё" tone="accent" /> : null}
            {secondaryHit ? (
              <Tag label={`${muscleName(highlightMuscle)} — вспомогательная`} />
            ) : null}
          </View>
        ) : null}
      </View>
      <Icon name="chevron.right" size={14} color="textTertiary" />
    </PressableCard>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
  },
  text: { flex: 1, gap: spacing.xxs },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs, marginTop: spacing.xs },
});
