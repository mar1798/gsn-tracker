import {
  hrZoneOf,
  resolveHrZones,
  setIdsBetween,
  type ManualSet,
  type WorkoutDetail,
  type WorkoutSet,
} from '@gsc/shared';
import { Stack, useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
  type ScrollViewInstance,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '@/components/app-text';
import { Banner, BannerAction } from '@/components/banner';
import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { EmptyState } from '@/components/empty-state';
import { HrChart } from '@/components/hr-chart';
import { MarkupProgress } from '@/components/markup-progress';
import { Metric } from '@/components/metric';
import { Skeleton } from '@/components/skeleton';
import { useDeleteWorkout } from '@/hooks/use-delete-workout';
import { useExercises } from '@/hooks/use-exercises';
import { useWorkoutDetail, useWorkoutHr } from '@/hooks/use-workout-detail';
import { formatDuration, formatNumber, formatWorkoutDate } from '@/lib/format';
import { hapticSelection, hapticSuccess, hapticWarning } from '@/lib/haptics';
import { dismissOutboxFailure, useOutbox } from '@/lib/outbox';
import { useSession } from '@/lib/session';
import { colors, radii, spacing } from '@/theme';

import { GarminSetRow, ManualSetRow } from './set-row';
import { WorkoutSummary } from './workout-summary';

type Row = { kind: 'garmin'; set: WorkoutSet } | { kind: 'manual'; set: ManualSet };

/** Garmin and manual sets in workout order; a manual set placed at N goes after Garmin set N. */
function workoutRows(workout: WorkoutDetail): Row[] {
  const rows: (Row & { order: number; tie: number })[] = [
    ...workout.sets.map((set) => ({ kind: 'garmin' as const, set, order: set.setIndex, tie: 0 })),
    ...workout.manualSets.map((set) => ({
      kind: 'manual' as const,
      set,
      order: set.orderIndex,
      tie: 1,
    })),
  ];
  return rows.sort((a, b) => a.order - b.order || a.tie - b.tie);
}

/** `anchor` = the last tapped set, where a range selection starts (`null` before any tap). */
type Selection = { ids: string[]; anchor: string | null };

const HIGHLIGHT_MS = 1500;

/** "Разметка тренировки": HR chart, set list, (bulk) annotation and manual sets. */
export function WorkoutDetailScreen({ id }: { id: string }) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const query = useWorkoutDetail(id);
  const hr = useWorkoutHr(id);
  const { byId } = useExercises();
  const failure = useOutbox((s) => (s.failure?.workoutId === id ? s.failure : null));
  const settings = useSession((s) => s.user?.settings);
  const remove = useDeleteWorkout();
  const workout = query.workout;

  const [selection, setSelection] = useState<Selection | null>(null);
  const [highlighted, setHighlighted] = useState<string | null>(null);
  const scrollRef = useRef<ScrollViewInstance>(null);
  const listY = useRef(0);
  const rowY = useRef(new Map<string, number>());

  useEffect(() => {
    if (!highlighted) return;
    const timer = setTimeout(() => setHighlighted(null), HIGHLIGHT_MS);
    return () => clearTimeout(timer);
  }, [highlighted]);

  const scrollToSet = useCallback((setId: string) => {
    const y = rowY.current.get(setId);
    if (y !== undefined) {
      scrollRef.current?.scrollTo({ y: Math.max(listY.current + y - spacing.xxl, 0) });
    }
    setHighlighted(setId);
  }, []);

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
            <Skeleton height={180} radius={radii.lg} />
            {[0, 1, 2, 3].map((i) => (
              <Skeleton key={i} height={72} radius={radii.md} />
            ))}
          </View>
        )}
      </ScrollView>
    );
  }

  const nameOf = (exerciseId: string | null) =>
    exerciseId ? (byId.get(exerciseId)?.nameRu ?? 'Упражнение') : null;

  const openAnnotation = (setIds: string[]) =>
    router.push({ pathname: '/annotate', params: { workoutId: id, setIds: setIds.join(',') } });
  const openManualSet = (manualId?: string) =>
    router.push({ pathname: '/manual-set', params: { workoutId: id, id: manualId } });

  const toggle = (setId: string) => {
    void hapticSelection();
    setSelection((s) => {
      if (!s) return { ids: [setId], anchor: setId };
      const ids = s.ids.includes(setId) ? s.ids.filter((x) => x !== setId) : [...s.ids, setId];
      return { ids, anchor: setId };
    });
  };
  // Long press: start selecting, or extend the selection from the last tapped set ("1–4").
  const selectRange = (setId: string) => {
    void hapticSelection();
    setSelection((s) => {
      if (!s) return { ids: [setId], anchor: setId };
      const range = s.anchor ? setIdsBetween(workout.sets, s.anchor, setId) : [setId];
      return { ids: [...new Set([...s.ids, ...range])], anchor: setId };
    });
  };

  const selecting = selection !== null;
  const selectedIds = selection?.ids ?? [];

  const zones = resolveHrZones(
    settings ?? { hrZones: null, hrMax: null },
    workout.hrZones?.highBoundaries ?? null,
  )?.bounds;

  const confirmDelete = () => {
    void hapticWarning();
    Alert.alert(
      'Удалить тренировку?',
      'Тренировка, разметка подходов и FIT-файл будут удалены. Файл можно импортировать снова.',
      [
        { text: 'Отмена', style: 'cancel' },
        {
          text: 'Удалить',
          style: 'destructive',
          onPress: () =>
            remove.mutate(id, {
              onSuccess: () => {
                void hapticSuccess();
                router.back();
              },
            }),
        },
      ],
    );
  };

  return (
    <View style={styles.screen}>
      <Stack.Screen
        options={{
          title: workout.title ?? 'Силовая тренировка',
          headerRight: () => (
            <Pressable
              accessibilityRole="button"
              hitSlop={spacing.md}
              onPress={() => setSelection(selecting ? null : { ids: [], anchor: null })}
            >
              <AppText variant="bodyStrong" color="accent">
                {selecting ? 'Готово' : 'Выбрать'}
              </AppText>
            </Pressable>
          ),
        }}
      />
      <ScrollView
        ref={scrollRef}
        style={styles.screen}
        contentContainerStyle={[styles.content, selecting && styles.contentWithBar]}
      >
        <AppText color="textSecondary">{formatWorkoutDate(workout.startedAt)}</AppText>

        {query.offline ? (
          <Banner icon="wifi.slash" message="Нет связи с сервером — показана сохранённая копия" />
        ) : null}
        {query.pendingCount > 0 ? (
          <Banner
            icon="arrow.triangle.2.circlepath"
            message={`Правки сохранены на телефоне и отправятся при появлении связи (${query.pendingCount})`}
          />
        ) : null}
        {failure ? (
          <Banner
            tone="danger"
            icon="exclamationmark.triangle"
            message={`Правка не сохранена: ${failure.message}`}
            action={<BannerAction label="Скрыть" onPress={dismissOutboxFailure} />}
          />
        ) : null}

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
          <MarkupProgress done={workout.annotatedSetCount} total={workout.setCount} />
        </Card>

        {hr.data ? (
          <Card>
            <HrChart
              hr={hr.data}
              sets={workout.sets}
              durationSec={workout.durationSec}
              selectedSetId={highlighted}
              onSelectSet={scrollToSet}
            />
          </Card>
        ) : hr.isPending ? (
          <Skeleton height={180} radius={radii.lg} />
        ) : hr.isError ? (
          <Banner
            tone="danger"
            icon="waveform.path.ecg"
            message={`График пульса не загрузился: ${hr.error.message}`}
            action={<BannerAction label="Повторить" onPress={() => void hr.refetch()} />}
          />
        ) : null}

        <View style={styles.sectionHeader}>
          <AppText variant="heading">Подходы · {workout.sets.length}</AppText>
          {!selecting && workout.annotatedSetCount === 0 ? (
            <AppText variant="caption" color="textTertiary">
              Удерживайте подход, чтобы выбрать несколько
            </AppText>
          ) : null}
          {selecting ? (
            <AppText variant="caption" color="textTertiary">
              Нажмите подходы или удерживайте, чтобы выбрать диапазон
            </AppText>
          ) : null}
        </View>

        <View style={styles.sets} onLayout={(e) => (listY.current = e.nativeEvent.layout.y)}>
          {workoutRows(workout).map((row) => (
            <View
              key={row.set.id}
              onLayout={(e) => rowY.current.set(row.set.id, e.nativeEvent.layout.y)}
            >
              {row.kind === 'garmin' ? (
                <GarminSetRow
                  set={row.set}
                  exerciseName={nameOf(row.set.effective.exerciseId)}
                  zone={zones ? hrZoneOf(row.set.hr.peak, zones) : null}
                  selected={selecting ? selectedIds.includes(row.set.id) : undefined}
                  highlighted={highlighted === row.set.id}
                  onPress={() => (selecting ? toggle(row.set.id) : openAnnotation([row.set.id]))}
                  onLongPress={() => selectRange(row.set.id)}
                />
              ) : (
                <ManualSetRow
                  set={row.set}
                  exerciseName={nameOf(row.set.exerciseId)}
                  onPress={() => (selecting ? undefined : openManualSet(row.set.id))}
                />
              )}
            </View>
          ))}
        </View>

        {!selecting ? (
          <Button
            title="Добавить подход"
            icon="plus"
            variant="secondary"
            block
            onPress={() => openManualSet()}
          />
        ) : null}
        {workout.sets.length > 0 && !selecting ? (
          <AppText variant="caption" color="textTertiary" align="center">
            Часы пропустили подход? Добавьте его вручную
          </AppText>
        ) : null}

        {!selecting ? <WorkoutSummary workout={workout} hr={hr.data ?? null} byId={byId} /> : null}

        {!selecting ? (
          <View style={styles.danger}>
            {remove.error ? (
              <Banner
                tone="danger"
                icon="exclamationmark.triangle"
                message={remove.error.message}
              />
            ) : null}
            <Button
              title="Удалить тренировку"
              icon="trash"
              variant="danger"
              block
              loading={remove.isPending}
              onPress={confirmDelete}
            />
          </View>
        ) : null}
      </ScrollView>

      {selecting ? (
        <View style={[styles.bar, { paddingBottom: insets.bottom + spacing.md }]}>
          <Button title="Отмена" variant="secondary" onPress={() => setSelection(null)} />
          <View style={styles.barMain}>
            <Button
              title={selectedIds.length ? `Разметить (${selectedIds.length})` : 'Выберите подходы'}
              block
              disabled={selectedIds.length === 0}
              onPress={() => {
                // Keep workout order regardless of tap order.
                const ids = workout.sets.map((s) => s.id).filter((x) => selectedIds.includes(x));
                setSelection(null);
                openAnnotation(ids);
              }}
            />
          </View>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, gap: spacing.lg, paddingBottom: spacing.xxxl },
  contentWithBar: { paddingBottom: spacing.xxxl * 3 },
  skeleton: { gap: spacing.md },
  metrics: { flexDirection: 'row', gap: spacing.md },
  sectionHeader: { gap: spacing.xxs },
  sets: { gap: spacing.sm },
  bar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    backgroundColor: colors.surface,
    borderTopLeftRadius: radii.lg,
    borderTopRightRadius: radii.lg,
  },
  barMain: { flex: 1 },
  danger: { gap: spacing.sm, marginTop: spacing.lg },
});
