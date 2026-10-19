import {
  analyticsWorkoutFromDetail,
  exerciseSessions,
  muscleLoads,
  newRecords,
  sessionMuscleIntensity,
  workoutTotals,
  type Exercise,
  type ExerciseRecords,
  type WorkoutDetail,
  type WorkoutHrResponse,
} from '@gsc/shared';
import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/app-text';
import { BodyMap } from '@/components/body-map';
import { Card } from '@/components/card';
import { Icon } from '@/components/icon';
import { Metric } from '@/components/metric';
import { useRecords } from '@/hooks/use-analytics';
import { muscleName, RECORD_LABELS } from '@/lib/exercise-labels';
import { formatNumber, formatPercent, formatRecord, formatVolume } from '@/lib/format';
import { useSession } from '@/lib/session';
import { colors, radii, spacing } from '@/theme';

/**
 * "Итог тренировки": muscles worked, volume, density, HR recovery and new personal records.
 * Computed on the device from the workout with pending edits, so it follows the annotation
 * live and works offline; only the records to beat come from the server.
 */
export function WorkoutSummary({
  workout,
  hr,
  byId,
}: {
  workout: WorkoutDetail;
  hr: WorkoutHrResponse | null;
  byId: ReadonlyMap<string, Exercise>;
}) {
  const bodyWeightKg = useSession((s) => s.user?.settings.bodyWeightKg ?? null);
  const before = useRecords(workout.startedAt);

  const summary = useMemo(() => {
    const w = analyticsWorkoutFromDetail(workout, hr, bodyWeightKg);
    const loads = muscleLoads(w.sets, byId, w.bodyWeightKg);
    return {
      totals: workoutTotals([w], byId),
      sessions: exerciseSessions(w, byId),
      muscles: [...loads].sort((a, b) => b[1].sets - a[1].sets),
      intensity: Object.fromEntries(
        [...loads].map(([m, l]) => [m, sessionMuscleIntensity(l.sets)]),
      ),
    };
  }, [workout, hr, bodyWeightKg, byId]);

  const records = useMemo(() => {
    if (!before.data) return [];
    const map = new Map<string, ExerciseRecords>(
      before.data.items.map(({ exerciseId, ...r }) => [exerciseId, r]),
    );
    return newRecords(summary.sessions, map);
  }, [before.data, summary.sessions]);

  const { totals } = summary;
  if (totals.workingSets === 0) return null;

  return (
    <Card>
      <AppText variant="heading">Итог тренировки</AppText>
      {records.length > 0 ? (
        <View style={styles.records} accessibilityRole="summary">
          <View style={styles.badge}>
            <Icon name="trophy.fill" size={14} color="onAccent" />
            <AppText variant="label" color="onAccent">
              {records.length === 1 ? 'Новый личный рекорд' : `Новые рекорды: ${records.length}`}
            </AppText>
          </View>
          {records.map((r) => (
            <AppText key={`${r.exerciseId}-${r.kind}`} variant="caption" color="textSecondary">
              <AppText variant="label">{byId.get(r.exerciseId)?.nameRu ?? 'Упражнение'}</AppText>
              {` · ${RECORD_LABELS[r.kind]} ${formatRecord(r.kind, r.valueKg, null)} (было ${formatRecord(r.kind, r.previousKg, null)})`}
            </AppText>
          ))}
        </View>
      ) : null}
      <View style={styles.body}>
        <BodyMap intensity={summary.intensity} height={150} labels={false} />
        <View style={styles.muscles}>
          {summary.muscles.slice(0, 5).map(([muscle, load]) => (
            <AppText key={muscle} variant="caption" color="textSecondary">
              <AppText variant="label">{muscleName(muscle)}</AppText> {formatNumber(load.sets)}{' '}
              подх.
            </AppText>
          ))}
        </View>
      </View>
      <View style={styles.metrics}>
        <Metric icon="scalemass.fill" label="Объём" value={formatVolume(totals.volumeKg)} />
        <Metric
          icon="square.stack.3d.up.fill"
          label="Рабочие подходы"
          value={formatNumber(totals.workingSets)}
        />
      </View>
      <View style={styles.metrics}>
        <Metric icon="bolt.fill" label="Плотность" value={formatPercent(totals.density)} />
        <Metric
          icon="arrow.down.heart.fill"
          iconColor="heartRate"
          label="Восстановление"
          value={
            totals.avgRecoveryBpm === null
              ? '—'
              : `−${formatNumber(Math.round(totals.avgRecoveryBpm))} уд/мин`
          }
        />
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  records: { gap: spacing.xs },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radii.pill,
    backgroundColor: colors.accent,
  },
  body: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  muscles: { flex: 1, gap: spacing.xs },
  metrics: { flexDirection: 'row', gap: spacing.md },
});
