import type { WorkoutTotalsDto } from '@gsc/shared';
import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/app-text';
import { Card } from '@/components/card';
import { Metric } from '@/components/metric';
import { formatChange, formatDuration, formatNumber } from '@/lib/format';
import { colors, radii, spacing } from '@/theme';

/** Garmin zones 1–5 (index 0 is time below zone 1, the last one above the max). */
const ZONES = [1, 2, 3, 4, 5];

export function HrCard({
  current,
  previous,
}: {
  current: WorkoutTotalsDto;
  previous: WorkoutTotalsDto;
}) {
  const zoneSec = ZONES.map((z) => current.hrZonesSec[z] ?? 0);
  const maxZone = Math.max(...zoneSec);

  return (
    <Card>
      <AppText variant="heading">Пульс</AppText>
      <View style={styles.metrics}>
        <Metric
          icon="heart.fill"
          iconColor="heartRate"
          label="Средний в подходах"
          value={formatNumber(current.avgWorkingHr && Math.round(current.avgWorkingHr))}
          change={formatChange(current.avgWorkingHr, previous.avgWorkingHr)}
        />
        <Metric
          icon="waveform.path.ecg"
          iconColor="heartRate"
          label="Пик подхода"
          value={formatNumber(current.avgPeakHr && Math.round(current.avgPeakHr))}
          change={formatChange(current.avgPeakHr, previous.avgPeakHr)}
        />
      </View>
      <Metric
        icon="arrow.down.heart.fill"
        iconColor="heartRate"
        label="Восстановление за 60 с после пика"
        value={
          current.avgRecoveryBpm === null
            ? '—'
            : `−${formatNumber(Math.round(current.avgRecoveryBpm))} уд/мин`
        }
        change={formatChange(current.avgRecoveryBpm, previous.avgRecoveryBpm)}
      />
      {maxZone > 0 ? (
        <View style={styles.zones}>
          <AppText variant="label" color="textSecondary">
            Время в зонах (по данным Garmin)
          </AppText>
          {ZONES.map((z, i) => (
            <View
              key={z}
              style={styles.zone}
              accessibilityLabel={`Зона ${z}: ${formatDuration(zoneSec[i])}`}
            >
              <AppText variant="caption" color="textSecondary" style={styles.zoneLabel}>
                Зона {z}
              </AppText>
              <View style={styles.track}>
                <View
                  style={[
                    styles.fill,
                    { width: `${(zoneSec[i]! / maxZone) * 100}%`, opacity: 0.35 + z * 0.13 },
                  ]}
                />
              </View>
              <AppText variant="caption" style={styles.zoneValue}>
                {formatDuration(zoneSec[i])}
              </AppText>
            </View>
          ))}
        </View>
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  metrics: { flexDirection: 'row', gap: spacing.md },
  zones: { gap: spacing.sm, marginTop: spacing.xs },
  zone: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  zoneLabel: { width: spacing.xxxl + spacing.sm },
  zoneValue: {
    width: spacing.xxxl + spacing.lg,
    textAlign: 'right',
    fontVariant: ['tabular-nums'],
  },
  track: {
    flex: 1,
    height: spacing.sm,
    borderRadius: radii.pill,
    backgroundColor: colors.surfaceRaised,
    overflow: 'hidden',
  },
  fill: { height: '100%', borderRadius: radii.pill, backgroundColor: colors.heartRate },
});
