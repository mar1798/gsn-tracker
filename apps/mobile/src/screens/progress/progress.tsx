import { periodDays, presetPeriod, type PeriodPreset } from '@gsc/shared';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, View } from 'react-native';

import { Banner } from '@/components/banner';
import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { EmptyState } from '@/components/empty-state';
import { Metric } from '@/components/metric';
import { Screen, ScreenHeader } from '@/components/screen';
import { Segmented } from '@/components/segmented';
import { Skeleton } from '@/components/skeleton';
import { useMuscleAnalytics, useOverview } from '@/hooks/use-analytics';
import { usePickFitFile } from '@/hooks/use-pick-fit-file';
import { formatChange, formatNumber, formatPercent, formatVolume, localToday } from '@/lib/format';
import { colors, radii, spacing } from '@/theme';

import { HrCard } from './hr-card';
import { MusclesCard } from './muscles-card';
import { RecordsCard } from './records-card';
import { WeeklyCard } from './weekly-card';

const PERIODS: { value: PeriodPreset; label: string }[] = [
  { value: 'week', label: 'Неделя' },
  { value: 'month', label: 'Месяц' },
  { value: 'quarter', label: '3 мес.' },
  { value: 'year', label: 'Год' },
];

/** "Прогресс" tab: period totals against the previous period, muscles, weeks, HR, records. */
export function ProgressScreen() {
  const router = useRouter();
  const pickFile = usePickFitFile();
  const [preset, setPreset] = useState<PeriodPreset>('month');
  const today = localToday();
  const period = useMemo(() => presetPeriod(preset, today), [preset, today]);
  const overview = useOverview(period);
  const muscles = useMuscleAnalytics(period);

  const o = overview.data;
  const refresh = () => {
    void overview.refetch();
    void muscles.refetch();
  };

  function renderBody() {
    if (!o) {
      if (overview.isError) {
        return (
          <EmptyState
            tone="danger"
            icon="wifi.exclamationmark"
            title="Не удалось загрузить прогресс"
            message={`${overview.error.message}. Аналитика считается на сервере и доступна при подключении.`}
            action={<Button title="Повторить" variant="secondary" onPress={refresh} />}
          />
        );
      }
      return (
        <View accessibilityLabel="Загрузка прогресса" style={styles.skeletons}>
          <Skeleton height={150} radius={radii.lg} />
          <Skeleton height={300} radius={radii.lg} />
          <Skeleton height={200} radius={radii.lg} />
        </View>
      );
    }
    if (o.current.workouts === 0 && o.previous.workouts === 0) {
      return (
        <EmptyState
          icon="chart.bar.xaxis"
          title="Нет тренировок за период"
          message="Импортируйте силовую тренировку и разметьте подходы — здесь появятся мышцы, объём и рекорды."
          action={<Button title="Импорт FIT" icon="square.and.arrow.down" onPress={pickFile} />}
        />
      );
    }
    const { current: c, previous: p } = o;
    return (
      <>
        <Card>
          <View style={styles.metrics}>
            <Metric
              icon="figure.strengthtraining.traditional"
              label="Тренировки"
              value={formatNumber(c.workouts)}
              change={formatChange(c.workouts, p.workouts)}
            />
            <Metric
              icon="square.stack.3d.up.fill"
              label="Рабочие подходы"
              value={formatNumber(c.workingSets)}
              change={formatChange(c.workingSets, p.workingSets)}
            />
          </View>
          <View style={styles.metrics}>
            <Metric
              icon="scalemass.fill"
              label="Объём"
              value={formatVolume(c.volumeKg)}
              change={formatChange(c.volumeKg, p.volumeKg)}
            />
            <Metric
              icon="bolt.fill"
              label="Плотность"
              value={formatPercent(c.density)}
              change={formatChange(c.density, p.density)}
            />
          </View>
        </Card>

        {c.workouts > 0 && c.workingSets === 0 ? (
          <Banner
            icon="hand.tap"
            message="Разметьте подходы в тренировках — тогда появятся мышцы, объём и рекорды."
          />
        ) : null}

        {muscles.data ? (
          <>
            <MusclesCard data={muscles.data} periodDays={periodDays(period)} />
            <WeeklyCard overview={o} muscles={muscles.data} />
          </>
        ) : muscles.isError ? (
          <Banner tone="danger" icon="exclamationmark.triangle" message={muscles.error.message} />
        ) : (
          <Skeleton height={300} radius={radii.lg} />
        )}

        <HrCard current={c} previous={p} />
        <RecordsCard onOpen={(id) => router.push(`/exercise-progress/${id}`)} />
      </>
    );
  }

  return (
    <Screen>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={overview.isRefetching && !overview.isPlaceholderData}
            onRefresh={refresh}
            tintColor={colors.accent}
          />
        }
      >
        <ScreenHeader title="Прогресс" />
        <View style={styles.body}>
          <Segmented options={PERIODS} value={preset} onChange={setPreset} />
          {renderBody()}
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { paddingBottom: spacing.xxxl },
  body: { paddingHorizontal: spacing.lg, gap: spacing.lg },
  metrics: { flexDirection: 'row', gap: spacing.md },
  skeletons: { gap: spacing.lg },
});
