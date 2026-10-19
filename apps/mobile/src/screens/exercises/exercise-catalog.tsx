import { filterExercises, MUSCLE_GROUPS, type Exercise } from '@gsc/shared';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { FlatList, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { Chip } from '@/components/chip';
import { EmptyState } from '@/components/empty-state';
import { Icon } from '@/components/icon';
import { Screen, ScreenHeader } from '@/components/screen';
import { Skeleton } from '@/components/skeleton';
import { TextField } from '@/components/text-field';
import { useExercises } from '@/hooks/use-exercises';
import { hapticSelection } from '@/lib/haptics';
import { colors, hitSize, radii, spacing } from '@/theme';

import { ExerciseRow } from './exercise-row';

/** "Упражнения" tab: search, filter by muscle group or own exercises, create one. */
export function ExerciseCatalogScreen() {
  const router = useRouter();
  const catalog = useExercises();
  const [query, setQuery] = useState('');
  const [muscle, setMuscle] = useState<string | null>(null);
  const [customOnly, setCustomOnly] = useState(false);

  const items = useMemo(
    () => filterExercises(catalog.exercises, { query, muscle, customOnly }),
    [catalog.exercises, query, muscle, customOnly],
  );
  const hasCustom = catalog.active.some((e) => e.isCustom);
  const filtered = query.trim() !== '' || muscle !== null || customOnly;

  const create = (name?: string) =>
    router.push({ pathname: '/exercise-form', params: name ? { name } : {} });
  const pickMuscle = (slug: string | null) => {
    void hapticSelection();
    setMuscle(slug);
  };

  function renderEmpty() {
    if (catalog.exercises.length === 0 && (catalog.isPending || catalog.isPlaceholderData)) {
      return <CatalogSkeleton />;
    }
    if (catalog.exercises.length === 0 && catalog.isError) {
      return (
        <EmptyState
          tone="danger"
          icon="wifi.exclamationmark"
          title="Не удалось загрузить справочник"
          message={catalog.error.message}
          action={
            <Button title="Повторить" variant="secondary" onPress={() => void catalog.refetch()} />
          }
        />
      );
    }
    if (customOnly && !hasCustom) {
      return (
        <EmptyState
          icon="plus.square.on.square"
          title="Своих упражнений пока нет"
          message="Добавьте упражнение, которого нет в справочнике, и отметьте, какие мышцы оно нагружает."
          action={<Button title="Создать упражнение" icon="plus" onPress={() => create()} />}
        />
      );
    }
    const name = query.trim();
    return (
      <EmptyState
        icon="magnifyingglass"
        title="Ничего не найдено"
        message="Попробуйте другое слово или сбросьте фильтр."
        action={
          name ? (
            <Button title={`Создать «${name}»`} icon="plus" onPress={() => create(name)} />
          ) : undefined
        }
      />
    );
  }

  return (
    <Screen>
      <ScreenHeader
        title="Упражнения"
        subtitle={
          catalog.active.length > 0
            ? filtered
              ? `Найдено: ${items.length}`
              : `${catalog.active.length} в справочнике`
            : undefined
        }
        right={
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Создать упражнение"
            onPress={() => create()}
            style={({ pressed }) => [styles.addButton, pressed && styles.addButtonPressed]}
          >
            <Icon name="plus" size={22} color="onAccent" />
          </Pressable>
        }
      />
      <View style={styles.search}>
        <TextField
          label="Поиск"
          placeholder="Жим, тяга, присед…"
          value={query}
          onChangeText={setQuery}
          autoCorrect={false}
          returnKeyType="search"
          clearButtonMode="while-editing"
        />
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.chipsScroll}
        contentContainerStyle={styles.chips}
        keyboardShouldPersistTaps="handled"
      >
        <Chip
          label="Мои"
          icon="person.fill"
          accessibilityLabel="Только мои упражнения"
          selected={customOnly}
          onPress={() => {
            void hapticSelection();
            setCustomOnly(!customOnly);
          }}
        />
        <View style={styles.divider} />
        <Chip label="Все мышцы" selected={muscle === null} onPress={() => pickMuscle(null)} />
        {MUSCLE_GROUPS.map((m) => (
          <Chip
            key={m.slug}
            label={m.nameRu}
            selected={muscle === m.slug}
            onPress={() => pickMuscle(muscle === m.slug ? null : m.slug)}
          />
        ))}
      </ScrollView>
      <FlatList<Exercise>
        data={items}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        ListEmptyComponent={renderEmpty()}
        renderItem={({ item }) => (
          <ExerciseRow
            exercise={item}
            highlightMuscle={muscle}
            onPress={() => router.push(`/exercises/${item.id}`)}
          />
        )}
      />
    </Screen>
  );
}

function CatalogSkeleton() {
  return (
    <View accessibilityLabel="Загрузка справочника" style={styles.skeletons}>
      {[0, 1, 2, 3, 4].map((i) => (
        <Card key={i}>
          <Skeleton width="55%" height={18} />
          <Skeleton width="35%" height={14} />
        </Card>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  addButton: {
    width: hitSize,
    height: hitSize,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.accent,
  },
  addButtonPressed: { backgroundColor: colors.accentPressed },
  search: { paddingHorizontal: spacing.lg },
  chipsScroll: { flexGrow: 0 },
  chips: {
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  divider: { width: 1, height: spacing.xl, backgroundColor: colors.border },
  list: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xxl, gap: spacing.sm, flexGrow: 1 },
  skeletons: { gap: spacing.sm },
});
