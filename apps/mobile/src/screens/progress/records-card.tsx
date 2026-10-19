import { RECORD_KINDS, type RecordsResponse } from '@gsc/shared';
import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/app-text';
import { Card, PressableCard } from '@/components/card';
import { Icon } from '@/components/icon';
import { Skeleton } from '@/components/skeleton';
import { useRecords } from '@/hooks/use-analytics';
import { useExercises } from '@/hooks/use-exercises';
import { RECORD_LABELS } from '@/lib/exercise-labels';
import { formatRecord, formatShortDate } from '@/lib/format';
import { useUnits } from '@/lib/session';
import { radii, spacing } from '@/theme';

const SHOWN = 6;

type Item = RecordsResponse['items'][number];

/** The most recent record of an exercise: its kind, value and date. */
function latestRecord(item: Item) {
  return RECORD_KINDS.flatMap((kind) => {
    const r = item[kind];
    return r ? [{ kind, ...r }] : [];
  }).sort((a, b) => b.date.localeCompare(a.date))[0];
}

/** Exercises with their latest personal record; opens the exercise progress. */
export function RecordsCard({ onOpen }: { onOpen: (exerciseId: string) => void }) {
  const records = useRecords();
  const units = useUnits();
  const { byId } = useExercises();
  const items = records.data?.items.slice(0, SHOWN) ?? [];

  return (
    <Card>
      <AppText variant="heading">Рекорды</AppText>
      {records.isPending ? (
        <Skeleton height={120} radius={radii.md} />
      ) : items.length === 0 ? (
        <AppText color="textSecondary">
          Рекорды появятся, когда вы укажете вес и подтвердите повторы в подходах.
        </AppText>
      ) : (
        <View style={styles.list}>
          {items.map((item) => {
            const latest = latestRecord(item)!;
            const name = byId.get(item.exerciseId)?.nameRu ?? 'Упражнение';
            return (
              <PressableCard
                key={item.exerciseId}
                accessibilityRole="button"
                accessibilityLabel={`${name}: ${RECORD_LABELS[latest.kind]}`}
                onPress={() => onOpen(item.exerciseId)}
                style={styles.row}
              >
                <View style={styles.rowText}>
                  <AppText variant="bodyStrong">{name}</AppText>
                  <AppText variant="caption" color="textSecondary">
                    {RECORD_LABELS[latest.kind]} · {formatShortDate(latest.date)}
                  </AppText>
                </View>
                <AppText variant="metric">
                  {formatRecord(latest.kind, latest.valueKg, latest.reps, units)}
                </AppText>
                <Icon name="chevron.right" size={14} color="textTertiary" />
              </PressableCard>
            );
          })}
        </View>
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  list: { gap: spacing.sm },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
  },
  rowText: { flex: 1, gap: spacing.xxs },
});
