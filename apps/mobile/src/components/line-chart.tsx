import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Svg, { Circle, Defs, LinearGradient, Path, Stop } from 'react-native-svg';

import { buildLineChart, type LinePoint } from '@/lib/line-chart';
import { colors, spacing } from '@/theme';

import { AppText } from './app-text';

export type LineChartPoint = LinePoint & { label: string };

/** One point per workout; a tap on the chart selects the nearest point (the last at first). */
export function LineChart({
  data,
  formatValue,
  height = 160,
}: {
  data: readonly LineChartPoint[];
  formatValue: (value: number) => string;
  height?: number;
}) {
  const [width, setWidth] = useState(0);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const geometry = buildLineChart(data, width, height);
  const selected = data.find((d) => d.key === selectedKey) ?? data.at(-1);
  const selectedPoint = geometry?.points.find((p) => p.key === selected?.key);

  const selectNearest = (x: number) => {
    if (!geometry) return;
    const nearest = geometry.points.reduce((a, b) =>
      Math.abs(b.x - x) < Math.abs(a.x - x) ? b : a,
    );
    setSelectedKey(nearest.key);
  };

  return (
    <View style={styles.container}>
      {selected ? (
        <AppText variant="caption" color="textSecondary">
          {selected.label}:{' '}
          <AppText variant="label" color="text">
            {formatValue(selected.value)}
          </AppText>
        </AppText>
      ) : null}
      <Pressable
        accessibilityRole="adjustable"
        accessibilityLabel={`График: ${data.length} тренировок`}
        onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
        onPress={(e) => selectNearest(e.nativeEvent.locationX)}
        style={{ height }}
      >
        {geometry ? (
          <Svg width={width} height={height}>
            <Defs>
              <LinearGradient id="lineFill" x1="0" y1="0" x2="0" y2="1">
                <Stop offset="0" stopColor={colors.accent} stopOpacity={0.35} />
                <Stop offset="1" stopColor={colors.accent} stopOpacity={0} />
              </LinearGradient>
            </Defs>
            <Path d={geometry.area} fill="url(#lineFill)" />
            <Path
              d={geometry.line}
              stroke={colors.accent}
              strokeWidth={2.5}
              fill="none"
              strokeLinejoin="round"
            />
            {geometry.points.map((p) => (
              <Circle key={p.key} cx={p.x} cy={p.y} r={3} fill={colors.accent} />
            ))}
            {selectedPoint ? (
              <Circle
                cx={selectedPoint.x}
                cy={selectedPoint.y}
                r={6}
                fill={colors.background}
                stroke={colors.accent}
                strokeWidth={3}
              />
            ) : null}
          </Svg>
        ) : null}
      </Pressable>
      {data.length > 1 ? (
        <View style={styles.axis}>
          <AppText variant="caption" color="textTertiary">
            {data[0]!.label}
          </AppText>
          <AppText variant="caption" color="textTertiary">
            {data.at(-1)!.label}
          </AppText>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: spacing.sm },
  axis: { flexDirection: 'row', justifyContent: 'space-between' },
});
