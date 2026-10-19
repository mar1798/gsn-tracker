import type { AnalyticsMuscles, AnalyticsOverview } from '@gsc/shared';
import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/app-text';
import { BarChart } from '@/components/bar-chart';
import { Card } from '@/components/card';
import { Chip } from '@/components/chip';
import { Segmented } from '@/components/segmented';
import { muscleName } from '@/lib/exercise-labels';
import { formatNumber, formatVolume } from '@/lib/format';
import { useUnits } from '@/lib/session';
import { spacing } from '@/theme';

type Measure = 'sets' | 'volume';

const MEASURES: { value: Measure; label: string }[] = [
  { value: 'sets', label: 'Подходы' },
  { value: 'volume', label: 'Объём' },
];

/** "12.10" for the week of Monday 2026-10-12. */
const weekLabel = (weekStart: string) => {
  const [, m, d] = weekStart.split('-');
  return `${d}.${m}`;
};

/** Working sets or volume per week, for all muscles or one group. */
export function WeeklyCard({
  overview,
  muscles,
}: {
  overview: AnalyticsOverview;
  muscles: AnalyticsMuscles;
}) {
  const [measure, setMeasure] = useState<Measure>('sets');
  const units = useUnits();
  const [muscle, setMuscle] = useState<string | null>(null);
  const worked = muscles.muscles
    .filter((m) => m.sets > 0)
    .sort((a, b) => b.sets - a.sets)
    .map((m) => m.muscle);

  const bars = overview.weeks.map((week, i) => {
    let value: number;
    if (muscle === null) {
      value = measure === 'sets' ? week.workingSets : week.volumeKg;
    } else {
      const load = muscles.weeks[i]?.muscles.find((m) => m.muscle === muscle);
      value = measure === 'sets' ? (load?.sets ?? 0) : (load?.volumeKg ?? 0);
    }
    return { key: week.weekStart, label: weekLabel(week.weekStart), value };
  });

  return (
    <Card>
      <AppText variant="heading">По неделям</AppText>
      <Segmented options={MEASURES} value={measure} onChange={setMeasure} />
      {worked.length > 0 ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chips}
        >
          <Chip label="Все мышцы" selected={muscle === null} onPress={() => setMuscle(null)} />
          {worked.map((m) => (
            <Chip
              key={m}
              label={muscleName(m)}
              selected={muscle === m}
              onPress={() => setMuscle(muscle === m ? null : m)}
            />
          ))}
        </ScrollView>
      ) : null}
      <View>
        <BarChart
          bars={bars}
          formatValue={(v) =>
            measure === 'sets' ? `${formatNumber(v)} подх.` : formatVolume(v, units)
          }
        />
      </View>
      {measure === 'volume' ? (
        <AppText variant="caption" color="textTertiary">
          В объём идут подходы с весом и подтверждёнными повторами
        </AppText>
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  chips: { gap: spacing.sm },
});
