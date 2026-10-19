import type { WorkoutHrResponse, WorkoutSet } from '@gsc/shared';
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Svg, { Defs, LinearGradient, Path, Rect, Stop } from 'react-native-svg';

import { bandAt, buildHrChart } from '@/lib/hr-chart';
import { formatDuration } from '@/lib/format';
import { colors, radii, spacing } from '@/theme';

import { AppText } from './app-text';

const HEIGHT = 140;

/**
 * HR of the whole workout with the sets as bands. A tap selects the nearest set
 * (bands are a few points wide, so there is no per-band hit target).
 */
export function HrChart({
  hr,
  sets,
  durationSec,
  selectedSetId,
  onSelectSet,
}: {
  hr: WorkoutHrResponse;
  sets: readonly WorkoutSet[];
  durationSec: number | null;
  selectedSetId?: string | null;
  onSelectSet: (setId: string) => void;
}) {
  const [width, setWidth] = useState(0);
  const chart = useMemo(
    () => buildHrChart({ hr, sets, durationSec, width, height: HEIGHT }),
    [hr, sets, durationSec, width],
  );

  return (
    <View style={styles.container}>
      <View style={styles.legend}>
        <AppText variant="caption" color="textSecondary">
          Пульс
        </AppText>
        {chart.maxBpm !== null ? (
          <AppText variant="caption" color="textSecondary">
            {chart.minBpm}–{chart.maxBpm} уд/мин
          </AppText>
        ) : (
          <AppText variant="caption" color="textTertiary">
            Нет данных о пульсе
          </AppText>
        )}
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="График пульса с подходами. Нажмите, чтобы перейти к подходу"
        onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
        onPress={(e) => {
          const band = bandAt(chart.bands, e.nativeEvent.locationX);
          if (band) onSelectSet(band.setId);
        }}
        style={styles.plot}
      >
        {width > 0 ? (
          <Svg width={width} height={HEIGHT}>
            <Defs>
              <LinearGradient id="hrFill" x1="0" y1="0" x2="0" y2="1">
                <Stop offset="0" stopColor={colors.heartRate} stopOpacity={0.35} />
                <Stop offset="1" stopColor={colors.heartRate} stopOpacity={0} />
              </LinearGradient>
            </Defs>
            {chart.bands.map((band) => (
              <Rect
                key={band.setId}
                x={band.x}
                y={0}
                width={band.width}
                height={HEIGHT}
                rx={Math.min(band.width / 2, 4)}
                fill={
                  band.setId === selectedSetId
                    ? colors.accent
                    : band.suspicious
                      ? colors.dangerMuted
                      : colors.accentMuted
                }
                opacity={band.excluded && band.setId !== selectedSetId ? 0.4 : 1}
              />
            ))}
            {chart.area ? <Path d={chart.area} fill="url(#hrFill)" /> : null}
            {chart.line ? (
              <Path
                d={chart.line}
                stroke={colors.heartRate}
                strokeWidth={2}
                strokeLinejoin="round"
                fill="none"
              />
            ) : null}
          </Svg>
        ) : null}
      </Pressable>
      <View style={styles.legend}>
        <AppText variant="caption" color="textTertiary">
          0:00
        </AppText>
        <AppText variant="caption" color="textTertiary">
          {formatDuration(chart.durationSec)}
        </AppText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: spacing.sm },
  legend: { flexDirection: 'row', justifyContent: 'space-between' },
  plot: { height: HEIGHT, borderRadius: radii.sm, overflow: 'hidden' },
});
