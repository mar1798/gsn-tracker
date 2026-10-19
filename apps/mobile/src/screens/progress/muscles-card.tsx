import { MUSCLE_GROUPS, muscleIntensity, type AnalyticsMuscles } from '@gsc/shared';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/app-text';
import { BodyMap } from '@/components/body-map';
import { Card } from '@/components/card';
import { ChangeBadge } from '@/components/change-badge';
import { muscleName } from '@/lib/exercise-labels';
import { formatChange, formatNumber, formatVolume } from '@/lib/format';
import { hapticSelection } from '@/lib/haptics';
import { colors, radii, spacing } from '@/theme';

const ORDER = new Map<string, number>(MUSCLE_GROUPS.map((m, i) => [m.slug, i]));

/** Heat map of the period plus muscles ranked by working sets. */
export function MusclesCard({ data, periodDays }: { data: AnalyticsMuscles; periodDays: number }) {
  const [selected, setSelected] = useState<string | null>(null);
  const worked = data.muscles
    .filter((m) => m.sets > 0)
    .sort((a, b) => b.sets - a.sets || ORDER.get(a.muscle)! - ORDER.get(b.muscle)!);
  const intensity = Object.fromEntries(
    data.muscles.map((m) => [m.muscle, muscleIntensity(m.sets, periodDays)]),
  );
  const max = worked[0]?.sets ?? 0;
  const select = (muscle: string | null) => {
    void hapticSelection();
    setSelected(muscle);
  };

  return (
    <Card>
      <View style={styles.header}>
        <AppText variant="heading">Мышцы</AppText>
        <AppText variant="caption" color="textTertiary">
          Ярче — больше подходов в неделю (полная яркость от 10)
        </AppText>
      </View>
      <BodyMap intensity={intensity} selected={selected} onSelect={select} />
      {worked.length === 0 ? (
        <AppText color="textSecondary" align="center">
          За период нет размеченных рабочих подходов
        </AppText>
      ) : (
        <View style={styles.list}>
          {worked.map((m) => {
            const isSelected = m.muscle === selected;
            return (
              <Pressable
                key={m.muscle}
                accessibilityRole="button"
                accessibilityState={{ selected: isSelected }}
                accessibilityLabel={`${muscleName(m.muscle)}: ${formatNumber(m.sets)} подходов`}
                onPress={() => select(isSelected ? null : m.muscle)}
                style={[styles.row, isSelected && styles.rowSelected]}
              >
                <View style={styles.rowText}>
                  <AppText variant="bodyStrong">{muscleName(m.muscle)}</AppText>
                  <AppText variant="caption" color="textSecondary">
                    {formatNumber(m.sets)} подх. · {formatVolume(m.volumeKg)}
                  </AppText>
                  <View style={styles.track}>
                    <View style={[styles.fill, { width: `${(m.sets / max) * 100}%` }]} />
                  </View>
                </View>
                <ChangeBadge change={formatChange(m.sets, m.previousSets)} />
              </Pressable>
            );
          })}
        </View>
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  header: { gap: spacing.xxs },
  list: { gap: spacing.xs },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.sm,
    borderRadius: radii.md,
  },
  rowSelected: { backgroundColor: colors.surfaceRaised },
  rowText: { flex: 1, gap: spacing.xxs },
  track: {
    height: spacing.xs,
    marginTop: spacing.xxs,
    borderRadius: radii.pill,
    backgroundColor: colors.surfaceRaised,
    overflow: 'hidden',
  },
  fill: { height: '100%', borderRadius: radii.pill, backgroundColor: colors.accent },
});
