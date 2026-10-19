import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { colors, radii, spacing } from '@/theme';

import { AppText } from './app-text';

export interface Bar {
  key: string;
  /** Under the bar, e.g. "12.10". */
  label: string;
  value: number;
}

/**
 * Rounded bars on a track (design reference). A tap shows a bar's value; the last bar
 * (the current week) is shown at first.
 */
export function BarChart({
  bars,
  formatValue,
  height = 140,
}: {
  bars: readonly Bar[];
  formatValue: (value: number) => string;
  height?: number;
}) {
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const max = Math.max(...bars.map((b) => b.value), 0);
  const selected = bars.find((b) => b.key === selectedKey) ?? bars.at(-1);
  // Many bars (a year of weeks) leave no room for every label.
  const labelEvery = Math.ceil(bars.length / 8);

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
      <View style={[styles.bars, { height }]}>
        {bars.map((b) => {
          const isSelected = b.key === selected?.key;
          const ratio = max > 0 ? b.value / max : 0;
          return (
            <Pressable
              key={b.key}
              accessibilityRole="button"
              accessibilityLabel={`${b.label}: ${formatValue(b.value)}`}
              onPress={() => setSelectedKey(b.key)}
              style={styles.column}
            >
              <View style={styles.track}>
                {b.value > 0 ? (
                  <View
                    style={[
                      styles.fill,
                      { height: `${Math.max(ratio * 100, 4)}%` },
                      !isSelected && styles.fillDim,
                    ]}
                  />
                ) : null}
              </View>
            </Pressable>
          );
        })}
      </View>
      <View style={styles.labels}>
        {bars.map((b, i) => (
          <View key={b.key} style={styles.column}>
            {(bars.length - 1 - i) % labelEvery === 0 ? (
              <AppText variant="caption" color="textTertiary" numberOfLines={1}>
                {b.label}
              </AppText>
            ) : null}
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: spacing.sm },
  bars: { flexDirection: 'row', gap: spacing.xs, alignItems: 'stretch' },
  column: { flex: 1, alignItems: 'center' },
  track: {
    flex: 1,
    width: '100%',
    maxWidth: 28,
    justifyContent: 'flex-end',
    borderRadius: radii.sm,
    backgroundColor: colors.surfaceRaised,
    overflow: 'hidden',
  },
  fill: { width: '100%', borderRadius: radii.sm, backgroundColor: colors.accent },
  fillDim: { opacity: 0.55 },
  labels: { flexDirection: 'row', gap: spacing.xs },
});
