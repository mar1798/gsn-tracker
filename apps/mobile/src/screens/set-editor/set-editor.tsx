import { zodResolver } from '@hookform/resolvers/zod';
import {
  exerciseShortcuts,
  nextSetIds,
  previousExerciseIds,
  weightStep,
  workingSetsAfter,
  type WorkoutDetail,
  type WorkoutSet,
} from '@gsc/shared';
import { randomUUID } from 'expo-crypto';
import { useRouter } from 'expo-router';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '@/components/app-text';
import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { Chip, Tag } from '@/components/chip';
import { EmptyState } from '@/components/empty-state';
import { Skeleton } from '@/components/skeleton';
import { TextField } from '@/components/text-field';
import { useExercises } from '@/hooks/use-exercises';
import { useWorkoutDetail } from '@/hooks/use-workout-detail';
import { formatDuration, formatNumber, formatSetNumbers, weightUnitLabel } from '@/lib/format';
import { hapticSuccess } from '@/lib/haptics';
import { enqueueEdit, useOutbox } from '@/lib/outbox';
import { useUnits } from '@/lib/session';
import { colors, radii, spacing } from '@/theme';

import { ExercisePicker } from './exercise-picker';
import { Field, RpePicker, StepperInput } from './fields';
import {
  garminSetForm,
  manualSetForm,
  EMPTY_FORM,
  setFormSchema,
  toAnnotationInput,
  toBulkPatch,
  toCarryOverPatch,
  toManualSetValues,
  weightText,
  type SetFormValues,
} from './set-form';

export type SetEditorTarget =
  | { kind: 'garmin'; workoutId: string; setIds: string[] }
  | { kind: 'manual'; workoutId: string; manualSetId?: string };

/** Bottom sheet: annotate one Garmin set, several at once, or add/edit a manual set. */
export function SetEditorScreen({ target }: { target: SetEditorTarget }) {
  const { workout, isError, error } = useWorkoutDetail(target.workoutId);
  const router = useRouter();

  if (!workout) {
    return (
      <View style={[styles.screen, styles.padded]}>
        {isError ? (
          <EmptyState
            tone="danger"
            icon="exclamationmark.triangle"
            title="Не удалось открыть"
            message={error.message}
          />
        ) : (
          <View style={styles.skeleton} accessibilityLabel="Загрузка">
            <Skeleton height={28} width="50%" />
            <Skeleton height={120} radius={radii.lg} />
            <Skeleton height={56} radius={radii.md} />
          </View>
        )}
      </View>
    );
  }

  const sets =
    target.kind === 'garmin' ? workout.sets.filter((s) => target.setIds.includes(s.id)) : [];
  const manualSet =
    target.kind === 'manual' && target.manualSetId
      ? workout.manualSets.find((s) => s.id === target.manualSetId)
      : undefined;
  const missing =
    (target.kind === 'garmin' && sets.length === 0) ||
    (target.kind === 'manual' && target.manualSetId && !manualSet);
  if (missing) {
    return (
      <View style={[styles.screen, styles.padded]}>
        <EmptyState
          icon="questionmark.circle"
          title="Подход не найден"
          message="Возможно, его уже удалили."
          action={<Button title="Закрыть" variant="secondary" onPress={() => router.back()} />}
        />
      </View>
    );
  }

  return (
    <SetEditorForm target={target} workout={workout} sets={sets} manualSetId={manualSet?.id} />
  );
}

function lastWeightFor(workout: WorkoutDetail, exerciseId: string, beforeSetId: string | null) {
  const end = beforeSetId ? workout.sets.findIndex((s) => s.id === beforeSetId) : -1;
  const previous = end === -1 ? workout.sets : workout.sets.slice(0, end);
  for (const s of [...previous].reverse()) {
    if (s.effective.exerciseId === exerciseId && s.effective.weightKg !== null) {
      return s.effective.weightKg;
    }
  }
  return (
    [...workout.manualSets]
      .reverse()
      .find((s) => s.exerciseId === exerciseId && s.weightKg !== null)?.weightKg ?? null
  );
}

function SetEditorForm({
  target,
  workout,
  sets,
  manualSetId,
}: {
  target: SetEditorTarget;
  workout: WorkoutDetail;
  sets: WorkoutSet[];
  manualSetId: string | undefined;
}) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { active, byId } = useExercises();
  const recent = useOutbox((s) => s.recentExerciseIds);
  const units = useUnits();

  const single = target.kind === 'garmin' && sets.length === 1 ? sets[0]! : null;
  const bulk = target.kind === 'garmin' && sets.length > 1;
  const manualSet = manualSetId ? workout.manualSets.find((s) => s.id === manualSetId) : undefined;

  const {
    control,
    handleSubmit,
    setValue,
    resetField,
    getValues,
    formState: { errors, dirtyFields, isDirty },
  } = useForm<SetFormValues>({
    resolver: zodResolver(setFormSchema(units)),
    defaultValues: single
      ? garminSetForm(single, units)
      : target.kind === 'manual'
        ? manualSetForm(manualSet, units)
        : EMPTY_FORM,
  });

  const values = useWatch({ control }) as SetFormValues;
  const exerciseId = values.exerciseId;
  const repsFromWatch = single !== null && single.annotation?.reps == null && !dirtyFields.reps;
  const maxApplyNext = single ? workingSetsAfter(workout.sets, single.id) : 0;

  const shortcuts = exerciseShortcuts({
    garmin: [...new Set(sets.flatMap((s) => s.garmin.suggestedExerciseIds))],
    workout: previousExerciseIds(workout.sets, sets[0]?.id ?? null),
    recent,
  });
  const garminGuess = single?.garmin.hints.map((h) => h.label).join(', ') || undefined;

  const pickExercise = (id: string | null) => {
    if (id === null) {
      // Bulk "не менять": leave each set's exercise as it is.
      resetField('exerciseId');
      return;
    }
    setValue('exerciseId', id, { shouldDirty: true });
    // The same exercise again is usually the same weight: pre-fill it, the user sees it.
    if (getValues('weight') === '') {
      const weight = lastWeightFor(workout, id, sets[0]?.id ?? null);
      if (weight !== null) {
        setValue('weight', weightText(weight, units), { shouldDirty: true });
      }
    }
  };

  const save = handleSubmit((form) => {
    const workoutId = workout.id;
    if (single) {
      enqueueEdit({
        kind: 'annotation.put',
        workoutId,
        setId: single.id,
        input: toAnnotationInput(form, units),
      });
      const next = form.exerciseId ? nextSetIds(workout.sets, single.id, form.applyNext) : [];
      if (next.length > 0) {
        enqueueEdit({
          kind: 'annotation.bulk',
          workoutId,
          setIds: next,
          patch: toCarryOverPatch(form, units),
        });
      }
    } else if (bulk) {
      enqueueEdit({
        kind: 'annotation.bulk',
        workoutId,
        setIds: sets.map((s) => s.id),
        patch: toBulkPatch(form, dirtyFields, units),
      });
    } else if (manualSet) {
      enqueueEdit({
        kind: 'manualSet.update',
        workoutId,
        id: manualSet.id,
        patch: toManualSetValues(form, units),
      });
    } else {
      enqueueEdit({
        kind: 'manualSet.create',
        workoutId,
        input: { id: randomUUID(), ...toManualSetValues(form, units) },
      });
    }
    void hapticSuccess();
    router.back();
  });

  const remove = () => {
    if (!manualSet) return;
    Alert.alert('Удалить подход?', 'Ручной подход исчезнет из тренировки.', [
      { text: 'Отмена', style: 'cancel' },
      {
        text: 'Удалить',
        style: 'destructive',
        onPress: () => {
          enqueueEdit({ kind: 'manualSet.delete', workoutId: workout.id, id: manualSet.id });
          void hapticSuccess();
          router.back();
        },
      },
    ]);
  };

  const title = single
    ? `Подход ${single.setIndex}`
    : bulk
      ? `Подходы ${formatSetNumbers(sets.map((s) => s.setIndex))}`
      : manualSet
        ? 'Ручной подход'
        : 'Новый подход';
  const bulkPatchEmpty = bulk && Object.keys(toBulkPatch(values, dirtyFields)).length === 0;

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <View style={styles.headerText}>
          <AppText variant="title" accessibilityRole="header">
            {title}
          </AppText>
          {single ? (
            <AppText color="textSecondary">
              {formatDuration(single.durationSec)} · отдых {formatDuration(single.restAfterSec)} ·
              пик {formatNumber(single.hr.peak, 'уд/мин')}
            </AppText>
          ) : bulk ? (
            <AppText color="textSecondary">Изменятся только поля, которые вы заполните</AppText>
          ) : (
            <AppText color="textSecondary">Подход, который часы не записали</AppText>
          )}
        </View>
        <Pressable accessibilityRole="button" hitSlop={spacing.md} onPress={() => router.back()}>
          <AppText variant="bodyStrong" color="accent">
            Отмена
          </AppText>
        </Pressable>
      </View>

      <ScrollView
        style={styles.screen}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        automaticallyAdjustKeyboardInsets
      >
        {single?.suspicious ? (
          <Card style={styles.warning}>
            <AppText variant="bodyStrong" color="danger">
              Подход короче 5 секунд
            </AppText>
            <AppText color="textSecondary">
              Похоже на двойное нажатие кнопки. Исключите его, а если это часть соседнего подхода —
              добавьте повторы к соседнему.
            </AppText>
          </Card>
        ) : null}

        <ExercisePicker
          value={exerciseId}
          onChange={pickExercise}
          exercises={active}
          byId={byId}
          shortcuts={shortcuts}
          garminGuess={garminGuess}
          allowClear={bulk}
        />

        <Controller
          control={control}
          name="weight"
          render={({ field }) => (
            <StepperInput
              label="Вес"
              unit={weightUnitLabel(units)}
              decimal
              step={weightStep(units)}
              value={field.value}
              onChange={field.onChange}
              error={errors.weight?.message}
            />
          )}
        />
        <Controller
          control={control}
          name="reps"
          render={({ field }) => (
            <StepperInput
              label="Повторы"
              step={1}
              value={field.value}
              onChange={field.onChange}
              error={errors.reps?.message}
              aside={repsFromWatch ? <Tag label="от часов — проверьте" /> : null}
            />
          )}
        />
        <Controller
          control={control}
          name="rpe"
          render={({ field }) => <RpePicker value={field.value} onChange={field.onChange} />}
        />

        <Field label="Отметки">
          <View style={styles.chips}>
            <Controller
              control={control}
              name="isWarmup"
              render={({ field }) => (
                <Chip
                  label="Разминка"
                  selected={field.value}
                  onPress={() => field.onChange(!field.value)}
                />
              )}
            />
            <Controller
              control={control}
              name="isFailure"
              render={({ field }) => (
                <Chip
                  label="До отказа"
                  selected={field.value}
                  onPress={() => field.onChange(!field.value)}
                />
              )}
            />
            {target.kind === 'garmin' ? (
              <Controller
                control={control}
                name="isExcluded"
                render={({ field }) => (
                  <Chip
                    label="Исключить"
                    icon="eye.slash"
                    selected={field.value}
                    onPress={() => field.onChange(!field.value)}
                  />
                )}
              />
            ) : null}
          </View>
        </Field>

        {single && exerciseId && maxApplyNext > 0 ? (
          <Controller
            control={control}
            name="applyNext"
            render={({ field }) => (
              <Card>
                <AppText variant="bodyStrong">Применить к следующим подходам</AppText>
                <AppText variant="caption" color="textSecondary">
                  Упражнение{values.weight ? ' и вес' : ''} перейдут на следующие подходы (короткие
                  и исключённые пропускаются)
                </AppText>
                <View style={styles.chips}>
                  {Array.from({ length: Math.min(maxApplyNext, 5) + 1 }, (_, n) => (
                    <Chip
                      key={n}
                      label={n === 0 ? 'Нет' : `+${n}`}
                      accessibilityLabel={n === 0 ? 'Не применять' : `Применить к ${n} следующим`}
                      selected={field.value === n}
                      onPress={() => field.onChange(n)}
                    />
                  ))}
                </View>
              </Card>
            )}
          />
        ) : null}

        <Controller
          control={control}
          name="note"
          render={({ field }) => (
            <TextField
              label="Заметка"
              placeholder="Например: тяжело, болит плечо"
              value={field.value}
              onChangeText={field.onChange}
              onBlur={field.onBlur}
              multiline
              error={errors.note?.message}
            />
          )}
        />

        {manualSet ? (
          <Button title="Удалить подход" variant="danger" icon="trash" block onPress={remove} />
        ) : null}
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + spacing.md }]}>
        <Button
          title={bulk ? `Сохранить для ${sets.length} подходов` : 'Сохранить'}
          block
          // A single Garmin set can be saved untouched: that confirms the watch's reps.
          disabled={bulk ? bulkPatchEmpty : manualSet !== undefined && !isDirty}
          onPress={() => void save()}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  padded: { padding: spacing.lg },
  skeleton: { gap: spacing.md },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
    paddingBottom: spacing.md,
  },
  headerText: { flex: 1, gap: spacing.xxs },
  content: { padding: spacing.lg, gap: spacing.xl, paddingBottom: spacing.xxxl },
  warning: { backgroundColor: colors.dangerMuted },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  footer: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    backgroundColor: colors.background,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
});
