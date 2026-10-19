import type { Exercise } from '@gsc/shared';
import { useRouter } from 'expo-router';
import { Alert, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '@/components/app-text';
import { Banner } from '@/components/banner';
import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { Tag } from '@/components/chip';
import { EmptyState } from '@/components/empty-state';
import { Skeleton } from '@/components/skeleton';
import { useDeleteExercise } from '@/hooks/use-exercise-mutations';
import { useExercises } from '@/hooks/use-exercises';
import {
  EQUIPMENT_LABELS,
  MECHANICS_LABELS,
  muscleName,
  musclesByRole,
} from '@/lib/exercise-labels';
import { hapticSuccess } from '@/lib/haptics';
import { colors, radii, spacing } from '@/theme';

const percent = (coefficient: number) => `${Math.round(coefficient * 100)} %`;

/** Exercise card: muscles with their shares; edit and delete for the user's own. */
export function ExerciseDetailScreen({ id }: { id: string }) {
  const router = useRouter();
  const { byId, isPending, isPlaceholderData, isError, error } = useExercises();
  const exercise = byId.get(id);

  if (!exercise) {
    if (isPending || isPlaceholderData) {
      return (
        <View style={styles.content} accessibilityLabel="Загрузка">
          <Skeleton height={36} width="70%" />
          <Skeleton height={140} radius={radii.lg} />
        </View>
      );
    }
    return (
      <EmptyState
        tone={isError ? 'danger' : 'accent'}
        icon={isError ? 'exclamationmark.triangle' : 'questionmark.circle'}
        title="Упражнение не найдено"
        message={isError ? error.message : undefined}
        action={<Button title="Назад" variant="secondary" onPress={() => router.back()} />}
      />
    );
  }
  return <ExerciseDetail exercise={exercise} />;
}

function ExerciseDetail({ exercise }: { exercise: Exercise }) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const remove = useDeleteExercise();
  const primary = musclesByRole(exercise, 'primary');
  const secondary = musclesByRole(exercise, 'secondary');

  const confirmDelete = () =>
    Alert.alert(
      'Удалить упражнение?',
      'Оно исчезнет из справочника. Размеченные подходы сохранят упражнение и попадут в аналитику.',
      [
        { text: 'Отмена', style: 'cancel' },
        {
          text: 'Удалить',
          style: 'destructive',
          onPress: () =>
            remove.mutate(exercise.id, {
              onSuccess: () => {
                void hapticSuccess();
                router.back();
              },
            }),
        },
      ],
    );

  return (
    <ScrollView
      contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + spacing.xl }]}
    >
      <View style={styles.titles}>
        <AppText variant="title" accessibilityRole="header">
          {exercise.nameRu}
        </AppText>
        {exercise.nameEn ? <AppText color="textSecondary">{exercise.nameEn}</AppText> : null}
        <View style={styles.tags}>
          {exercise.isCustom ? <Tag label="Своё" tone="accent" /> : null}
          <Tag label={EQUIPMENT_LABELS[exercise.equipment]} />
          <Tag label={MECHANICS_LABELS[exercise.mechanics]} />
          {exercise.isBodyweight ? <Tag label="С весом тела" /> : null}
        </View>
      </View>

      <Button
        title="Прогресс"
        icon="chart.line.uptrend.xyaxis"
        variant="secondary"
        block
        onPress={() => router.push(`/exercise-progress/${exercise.id}`)}
      />

      {exercise.isArchived ? (
        <Banner
          icon="archivebox"
          message="Упражнение удалено из справочника. Размеченные подходы его сохраняют."
        />
      ) : null}

      <Card>
        <AppText variant="heading">Основные мышцы</AppText>
        {primary.map((m) => (
          <MuscleShare key={m.muscle} name={muscleName(m.muscle)} coefficient={m.coefficient} />
        ))}
        {secondary.length > 0 ? (
          <>
            <AppText variant="heading" style={styles.sectionGap}>
              Вспомогательные
            </AppText>
            {secondary.map((m) => (
              <MuscleShare key={m.muscle} name={muscleName(m.muscle)} coefficient={m.coefficient} />
            ))}
          </>
        ) : null}
        <AppText variant="caption" color="textTertiary">
          Процент — доля подхода, которая засчитывается мышце в объёме и числе подходов.
        </AppText>
      </Card>

      {exercise.isBodyweight ? (
        <Card>
          <AppText variant="bodyStrong">Упражнение с весом тела</AppText>
          <AppText color="textSecondary">
            В аналитике объёма учитывается вес тела — из часов или из настроек профиля.
          </AppText>
        </Card>
      ) : null}

      {!exercise.isCustom ? (
        <Card>
          <AppText variant="bodyStrong">Подсказки часов</AppText>
          <AppText color="textSecondary">
            {exercise.garminCategory
              ? 'Если часы распознают это движение, упражнение появится первым в разметке подхода.'
              : 'У часов Garmin нет такого упражнения — выбирайте его в разметке вручную.'}
          </AppText>
        </Card>
      ) : null}

      {exercise.isCustom && !exercise.isArchived ? (
        <View style={styles.actions}>
          {remove.error ? (
            <Banner icon="exclamationmark.triangle" tone="danger" message={remove.error.message} />
          ) : null}
          <Button
            title="Изменить"
            icon="pencil"
            variant="secondary"
            block
            onPress={() => router.push({ pathname: '/exercise-form', params: { id: exercise.id } })}
          />
          <Button
            title="Удалить"
            icon="trash"
            variant="danger"
            block
            loading={remove.isPending}
            onPress={confirmDelete}
          />
        </View>
      ) : null}
    </ScrollView>
  );
}

function MuscleShare({ name, coefficient }: { name: string; coefficient: number }) {
  return (
    <View style={styles.muscle} accessibilityLabel={`${name}: ${percent(coefficient)}`}>
      <View style={styles.muscleLabel}>
        <AppText variant="bodyStrong">{name}</AppText>
        <AppText variant="label" color="textSecondary">
          {percent(coefficient)}
        </AppText>
      </View>
      <View style={styles.track}>
        <View style={[styles.fill, { width: `${coefficient * 100}%` }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { padding: spacing.lg, gap: spacing.lg },
  titles: { gap: spacing.sm },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  sectionGap: { marginTop: spacing.sm },
  muscle: { gap: spacing.xs },
  muscleLabel: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  track: {
    height: spacing.sm,
    borderRadius: radii.pill,
    backgroundColor: colors.surfaceRaised,
    overflow: 'hidden',
  },
  fill: { height: '100%', borderRadius: radii.pill, backgroundColor: colors.accent },
  actions: { gap: spacing.sm },
});
