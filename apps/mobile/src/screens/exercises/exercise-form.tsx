import { zodResolver } from '@hookform/resolvers/zod';
import { EQUIPMENT, MECHANICS, MUSCLE_GROUPS, type Exercise } from '@gsc/shared';
import { useRouter } from 'expo-router';
import { Controller, useForm } from 'react-hook-form';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '@/components/app-text';
import { Banner } from '@/components/banner';
import { Button } from '@/components/button';
import { Chip } from '@/components/chip';
import { EmptyState } from '@/components/empty-state';
import { Skeleton } from '@/components/skeleton';
import { TextField } from '@/components/text-field';
import { useSaveExercise } from '@/hooks/use-exercise-mutations';
import { useExercises } from '@/hooks/use-exercises';
import { EQUIPMENT_LABELS, MECHANICS_LABELS } from '@/lib/exercise-labels';
import { hapticSelection, hapticSuccess } from '@/lib/haptics';
import { Field } from '@/screens/set-editor/fields';
import { colors, radii, spacing } from '@/theme';

import {
  exerciseForm,
  exerciseFormSchema,
  roleOf,
  toCustomExerciseInput,
  toggleMuscle,
  type ExerciseFormValues,
} from './exercise-form-model';

/** Modal: create a custom exercise (`id` omitted, optional `name` from a search) or edit one. */
export function ExerciseFormScreen({ id, name }: { id?: string; name?: string }) {
  const router = useRouter();
  const { byId, isPending, isPlaceholderData } = useExercises();
  const exercise = id ? byId.get(id) : undefined;

  if (id && !exercise && (isPending || isPlaceholderData)) {
    return (
      <View style={[styles.screen, styles.content]} accessibilityLabel="Загрузка">
        <Skeleton height={36} width="60%" />
        <Skeleton height={56} radius={radii.md} />
        <Skeleton height={160} radius={radii.lg} />
      </View>
    );
  }
  if (id && (!exercise || !exercise.isCustom || exercise.isArchived)) {
    return (
      <View style={styles.screen}>
        <EmptyState
          icon="questionmark.circle"
          title="Упражнение нельзя изменить"
          message="Изменять можно только свои упражнения."
          action={<Button title="Закрыть" variant="secondary" onPress={() => router.back()} />}
        />
      </View>
    );
  }
  return <ExerciseForm exercise={exercise} initialName={name} />;
}

function ExerciseForm({ exercise, initialName }: { exercise?: Exercise; initialName?: string }) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const save = useSaveExercise();
  const {
    control,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<ExerciseFormValues>({
    resolver: zodResolver(exerciseFormSchema),
    defaultValues: exerciseForm(exercise, initialName),
  });

  // A record field: react-hook-form types its errors per key, the refine sets one on the record.
  const musclesError = (errors.muscles as { message?: string } | undefined)?.message;

  const submit = handleSubmit((form) =>
    save.mutate(
      { id: exercise?.id, input: toCustomExerciseInput(form) },
      {
        onSuccess: () => {
          void hapticSuccess();
          router.back();
        },
      },
    ),
  );

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <AppText variant="title" accessibilityRole="header" style={styles.headerTitle}>
          {exercise ? 'Изменить упражнение' : 'Новое упражнение'}
        </AppText>
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
        <Controller
          control={control}
          name="nameRu"
          render={({ field }) => (
            <TextField
              label="Название"
              placeholder="Например: жим в хаммере"
              value={field.value}
              onChangeText={field.onChange}
              onBlur={field.onBlur}
              autoFocus={!exercise && !initialName}
              error={errors.nameRu?.message}
            />
          )}
        />

        <Controller
          control={control}
          name="equipment"
          render={({ field }) => (
            <Field label="Оборудование">
              <View style={styles.chips}>
                {EQUIPMENT.map((equipment) => (
                  <Chip
                    key={equipment}
                    label={EQUIPMENT_LABELS[equipment]}
                    selected={field.value === equipment}
                    onPress={() => {
                      void hapticSelection();
                      field.onChange(equipment);
                      if (equipment === 'bodyweight') setValue('isBodyweight', true);
                    }}
                  />
                ))}
              </View>
              {errors.equipment ? (
                <AppText variant="caption" color="danger">
                  {errors.equipment.message}
                </AppText>
              ) : null}
            </Field>
          )}
        />

        <Controller
          control={control}
          name="mechanics"
          render={({ field }) => (
            <Field label="Тип">
              <View style={styles.chips}>
                {MECHANICS.map((mechanics) => (
                  <Chip
                    key={mechanics}
                    label={MECHANICS_LABELS[mechanics]}
                    selected={field.value === mechanics}
                    onPress={() => field.onChange(mechanics)}
                  />
                ))}
              </View>
            </Field>
          )}
        />

        <Controller
          control={control}
          name="isBodyweight"
          render={({ field }) => (
            <Field label="Вес тела">
              <View style={styles.chips}>
                <Chip
                  label="С весом тела"
                  icon="figure.strengthtraining.functional"
                  selected={field.value}
                  onPress={() => field.onChange(!field.value)}
                />
              </View>
              <AppText variant="caption" color="textTertiary">
                Отжимания, подтягивания, выпады без веса: вес тела учитывается в объёме.
              </AppText>
            </Field>
          )}
        />

        <Controller
          control={control}
          name="muscles"
          render={({ field }) => (
            <Field label="Мышцы">
              <AppText variant="caption" color="textTertiary">
                Основная мышца получает весь подход, вспомогательная — половину.
              </AppText>
              <View style={styles.muscles}>
                {MUSCLE_GROUPS.map((m) => {
                  const role = roleOf(field.value[m.slug]);
                  const toggle = (next: 'primary' | 'secondary') => {
                    void hapticSelection();
                    field.onChange(toggleMuscle(field.value, m.slug, next, exercise));
                  };
                  return (
                    <View key={m.slug} style={[styles.muscle, role && styles.muscleActive]}>
                      <AppText
                        variant="bodyStrong"
                        color={role ? 'text' : 'textSecondary'}
                        style={styles.muscleName}
                      >
                        {m.nameRu}
                      </AppText>
                      <View style={styles.roles}>
                        <Chip
                          label="Основная"
                          accessibilityLabel={`${m.nameRu}: основная`}
                          selected={role === 'primary'}
                          onPress={() => toggle('primary')}
                        />
                        <Chip
                          label="Вспом."
                          accessibilityLabel={`${m.nameRu}: вспомогательная`}
                          selected={role === 'secondary'}
                          onPress={() => toggle('secondary')}
                        />
                      </View>
                    </View>
                  );
                })}
              </View>
              {musclesError ? (
                <AppText variant="caption" color="danger">
                  {musclesError}
                </AppText>
              ) : null}
            </Field>
          )}
        />
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + spacing.md }]}>
        {save.error ? (
          <Banner icon="exclamationmark.triangle" tone="danger" message={save.error.message} />
        ) : null}
        <Button
          title={exercise ? 'Сохранить' : 'Создать'}
          block
          loading={save.isPending}
          onPress={() => void submit()}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
    paddingBottom: spacing.md,
  },
  headerTitle: { flex: 1 },
  content: { padding: spacing.lg, gap: spacing.xl },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  muscles: { gap: spacing.xs },
  muscle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.xs,
    paddingLeft: spacing.md,
    paddingRight: spacing.xs,
    borderRadius: radii.md,
    backgroundColor: colors.surface,
  },
  muscleActive: { backgroundColor: colors.surfaceRaised },
  muscleName: { flex: 1 },
  roles: { flexDirection: 'row', gap: spacing.xs },
  footer: {
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.background,
  },
});
