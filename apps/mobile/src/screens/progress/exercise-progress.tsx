import {
  addDays,
  presetPeriod,
  RECORD_KINDS,
  type ExerciseSessionDto,
  type Period,
} from '@gsc/shared';
import { Stack } from 'expo-router';
import { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/app-text';
import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { Tag } from '@/components/chip';
import { EmptyState } from '@/components/empty-state';
import { LineChart } from '@/components/line-chart';
import { Segmented } from '@/components/segmented';
import { Skeleton } from '@/components/skeleton';
import { useExerciseProgress } from '@/hooks/use-analytics';
import { useExercises } from '@/hooks/use-exercises';
import { RECORD_LABELS } from '@/lib/exercise-labels';
import {
  formatNumber,
  formatRecord,
  formatSetLoad,
  formatShortDate,
  formatVolume,
  formatWeight,
  localToday,
} from '@/lib/format';
import { useUnits } from '@/lib/session';
import { radii, spacing } from '@/theme';

type Range = 'month' | 'quarter' | 'year' | 'all';
type Measure = 'e1rm' | 'weight' | 'volume';

const RANGES: { value: Range; label: string }[] = [
  { value: 'month', label: 'Месяц' },
  { value: 'quarter', label: '3 мес.' },
  { value: 'year', label: 'Год' },
  { value: 'all', label: 'Всё' },
];

const MEASURES: { value: Measure; label: string }[] = [
  { value: 'e1rm', label: '1ПМ' },
  { value: 'weight', label: 'Вес' },
  { value: 'volume', label: 'Объём' },
];

/** The API allows ~3 years; "Всё" shows that much. */
const ALL_DAYS = 1095;

const periodOf = (range: Range, today: string): Period =>
  range === 'all'
    ? { from: addDays(today, -(ALL_DAYS - 1)), to: today }
    : presetPeriod(range, today);

const valueOf = (s: ExerciseSessionDto, measure: Measure) =>
  measure === 'e1rm' ? s.bestE1rmKg : measure === 'weight' ? s.maxWeightKg : s.volumeKg || null;

/** One exercise over time: e1RM / heaviest set / volume per workout, records, history. */
export function ExerciseProgressScreen({ id }: { id: string }) {
  const { byId } = useExercises();
  const exercise = byId.get(id);
  const [range, setRange] = useState<Range>('quarter');
  const [measure, setMeasure] = useState<Measure>('e1rm');
  const today = localToday();
  const period = useMemo(() => periodOf(range, today), [range, today]);
  const progress = useExerciseProgress(id, period);
  const units = useUnits();
  const data = progress.data;

  const points = (data?.sessions ?? []).flatMap((s) => {
    const value = valueOf(s, measure);
    return value === null ? [] : [{ key: s.workoutId, label: formatShortDate(s.date), value }];
  });
  const format = (v: number) =>
    measure === 'volume' ? formatVolume(v, units) : formatWeight(v, units);

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <Stack.Screen options={{ title: 'Прогресс' }} />
      <View style={styles.titles}>
        <AppText variant="title" accessibilityRole="header">
          {exercise?.nameRu ?? 'Упражнение'}
        </AppText>
        {exercise?.isBodyweight ? (
          <AppText variant="caption" color="textSecondary">
            Вес — с учётом веса тела
          </AppText>
        ) : null}
      </View>
      <Segmented options={RANGES} value={range} onChange={setRange} />

      {!data ? (
        progress.isError ? (
          <EmptyState
            tone="danger"
            icon="wifi.exclamationmark"
            title="Не удалось загрузить прогресс"
            message={progress.error.message}
            action={
              <Button
                title="Повторить"
                variant="secondary"
                onPress={() => void progress.refetch()}
              />
            }
          />
        ) : (
          <View accessibilityLabel="Загрузка" style={styles.skeletons}>
            <Skeleton height={220} radius={radii.lg} />
            <Skeleton height={160} radius={radii.lg} />
          </View>
        )
      ) : (
        <>
          <Card>
            <Segmented options={MEASURES} value={measure} onChange={setMeasure} />
            {points.length > 0 ? (
              <LineChart data={points} formatValue={format} />
            ) : (
              <AppText color="textSecondary">
                За период нет подходов с весом и подтверждёнными повторами.
              </AppText>
            )}
            {measure === 'e1rm' ? (
              <AppText variant="caption" color="textTertiary">
                Расчётный 1ПМ по формуле Эпли — по подходам до 12 повторов
              </AppText>
            ) : null}
          </Card>

          <View style={styles.records}>
            {RECORD_KINDS.map((kind) => {
              const r = data.records[kind];
              return (
                <Card key={kind} style={styles.record}>
                  <AppText variant="caption" color="textSecondary">
                    {RECORD_LABELS[kind]}
                  </AppText>
                  <AppText variant="metric">
                    {r ? formatRecord(kind, r.valueKg, r.reps, units) : '—'}
                  </AppText>
                  {r ? (
                    <AppText variant="caption" color="textTertiary">
                      {formatShortDate(r.date)}
                    </AppText>
                  ) : null}
                </Card>
              );
            })}
          </View>

          {data.sessions.length > 0 ? (
            <View style={styles.history}>
              <AppText variant="heading">Тренировки · {data.sessions.length}</AppText>
              {[...data.sessions].reverse().map((s) => {
                const recordHere = RECORD_KINDS.some(
                  (k) => data.records[k]?.workoutId === s.workoutId,
                );
                return (
                  <Card key={s.workoutId} style={styles.session}>
                    <View style={styles.sessionText}>
                      <AppText variant="bodyStrong">{formatShortDate(s.date)}</AppText>
                      <AppText variant="caption" color="textSecondary">
                        {formatNumber(s.workingSets)} подх. · {formatVolume(s.volumeKg, units)}
                      </AppText>
                    </View>
                    {recordHere ? <Tag label="Рекорд" tone="accent" /> : null}
                    <AppText variant="bodyStrong">
                      {formatSetLoad(s.maxWeightKg, s.maxWeightReps, units) ?? '—'}
                    </AppText>
                  </Card>
                );
              })}
            </View>
          ) : null}
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: spacing.lg, gap: spacing.lg, paddingBottom: spacing.xxxl },
  titles: { gap: spacing.xs },
  skeletons: { gap: spacing.lg },
  records: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  record: { flexBasis: '47%', flexGrow: 1, gap: spacing.xs },
  history: { gap: spacing.sm },
  session: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  sessionText: { flex: 1, gap: spacing.xxs },
});
