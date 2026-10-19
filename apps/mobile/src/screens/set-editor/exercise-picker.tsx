import {
  searchExercises,
  type Exercise,
  type ExerciseShortcut,
  type ShortcutSource,
} from '@gsc/shared';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/app-text';
import { Button } from '@/components/button';
import { Tag } from '@/components/chip';
import { Icon } from '@/components/icon';
import { TextField } from '@/components/text-field';
import { muscleName } from '@/lib/exercise-labels';
import { colors, hitSize, radii, spacing } from '@/theme';

const SOURCE_LABELS: Record<ShortcutSource, string> = {
  garmin: 'подсказка часов',
  workout: 'в этой тренировке',
  recent: 'недавнее',
};

const primaryMuscles = (exercise: Exercise) =>
  exercise.muscles.filter((m) => m.role === 'primary').map((m) => muscleName(m.muscle));

/**
 * Exercise choice: the chosen one as a card, or quick picks (Garmin suggestions, this workout,
 * recent) plus search over the whole catalog. Never pre-selects a Garmin guess.
 */
export function ExercisePicker({
  value,
  onChange,
  exercises,
  byId,
  shortcuts,
  garminGuess,
  allowClear = false,
}: {
  value: string | null;
  onChange: (exerciseId: string | null) => void;
  /** Active exercises (deleted custom ones are left out). */
  exercises: readonly Exercise[];
  byId: ReadonlyMap<string, Exercise>;
  shortcuts: readonly ExerciseShortcut[];
  /** What the watch guessed, shown even when no catalog exercise matches. */
  garminGuess?: string;
  /** Bulk mode: "Не менять" keeps each set's exercise. */
  allowClear?: boolean;
}) {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [browsing, setBrowsing] = useState(false);
  const results = useMemo(() => searchExercises(exercises, query), [exercises, query]);
  const selected = value ? byId.get(value) : undefined;

  const pick = (id: string | null) => {
    onChange(id);
    setBrowsing(false);
    setQuery('');
  };

  if (selected && !browsing) {
    return (
      <View style={styles.selected}>
        <View style={styles.selectedText}>
          <AppText variant="heading">{selected.nameRu}</AppText>
          <View style={styles.tags}>
            {primaryMuscles(selected).map((name) => (
              <Tag key={name} label={name} tone="accent" />
            ))}
          </View>
        </View>
        <Button title="Изменить" size="sm" variant="secondary" onPress={() => setBrowsing(true)} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {garminGuess ? (
        <AppText variant="caption" color="textTertiary">
          Часы предполагают: {garminGuess}. Это только догадка — выберите сами.
        </AppText>
      ) : null}
      <TextField
        label="Упражнение"
        placeholder="Поиск: жим, тяга, присед…"
        value={query}
        onChangeText={setQuery}
        autoCorrect={false}
        returnKeyType="search"
        clearButtonMode="while-editing"
      />
      {selected ? (
        <Button
          title="Оставить выбранное"
          size="sm"
          variant="ghost"
          onPress={() => pick(selected.id)}
        />
      ) : null}
      {allowClear && value ? (
        <Button title="Не менять упражнение" size="sm" variant="ghost" onPress={() => pick(null)} />
      ) : null}

      {query.trim() === '' && shortcuts.length > 0 ? (
        <View style={styles.group}>
          <AppText variant="label" color="textSecondary">
            Быстрый выбор
          </AppText>
          {shortcuts.map(({ exerciseId, source }) => {
            const exercise = byId.get(exerciseId);
            return exercise && !exercise.isArchived ? (
              <ExerciseOption
                key={exerciseId}
                exercise={exercise}
                hint={SOURCE_LABELS[source]}
                selected={exerciseId === value}
                onPress={() => pick(exerciseId)}
              />
            ) : null;
          })}
        </View>
      ) : null}

      <View style={styles.group}>
        <AppText variant="label" color="textSecondary">
          {query.trim() ? `Найдено: ${results.length}` : 'Все упражнения'}
        </AppText>
        {results.length === 0 ? (
          <>
            <AppText color="textTertiary">
              Ничего не найдено. Попробуйте другое слово — например, «жим» или «тяга» — или создайте
              своё упражнение.
            </AppText>
            <Button
              title={`Создать «${query.trim()}»`}
              icon="plus"
              size="sm"
              variant="secondary"
              onPress={() =>
                router.push({ pathname: '/exercise-form', params: { name: query.trim() } })
              }
            />
          </>
        ) : (
          results.map((exercise) => (
            <ExerciseOption
              key={exercise.id}
              exercise={exercise}
              selected={exercise.id === value}
              onPress={() => pick(exercise.id)}
            />
          ))
        )}
      </View>
    </View>
  );
}

function ExerciseOption({
  exercise,
  hint,
  selected,
  onPress,
}: {
  exercise: Exercise;
  hint?: string;
  selected: boolean;
  onPress: () => void;
}) {
  const muscles = primaryMuscles(exercise).join(', ');
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      accessibilityLabel={exercise.nameRu}
      onPress={onPress}
      style={({ pressed }) => [styles.option, pressed && styles.optionPressed]}
    >
      <View style={styles.optionText}>
        <AppText variant="bodyStrong">{exercise.nameRu}</AppText>
        <AppText variant="caption" color="textSecondary" numberOfLines={1}>
          {hint ? `${hint} · ${muscles}` : muscles}
        </AppText>
      </View>
      {selected ? <Icon name="checkmark" size={16} color="accent" /> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { gap: spacing.md },
  selected: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.lg,
    borderRadius: radii.lg,
    backgroundColor: colors.surface,
  },
  selectedText: { flex: 1, gap: spacing.sm },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  group: { gap: spacing.xs },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    minHeight: hitSize + 8,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radii.md,
    backgroundColor: colors.surface,
  },
  optionPressed: { backgroundColor: colors.surfaceRaised },
  optionText: { flex: 1, gap: spacing.xxs },
});
