import { StyleSheet, View } from 'react-native';

import { colors, radii, spacing } from '@/theme';

import { AppText } from './app-text';

/** "Размечено подходов 8/21" with a lime progress bar. */
export function MarkupProgress({ done, total }: { done: number; total: number }) {
  const complete = total > 0 && done >= total;
  const progress = total > 0 ? Math.min(done / total, 1) : 0;
  return (
    <View style={styles.markup}>
      <View style={styles.label}>
        <AppText variant="label" color={complete ? 'accent' : 'textSecondary'}>
          {complete ? 'Размечено' : 'Размечено подходов'}
        </AppText>
        <AppText variant="label" color={complete ? 'accent' : 'text'}>
          {done}/{total}
        </AppText>
      </View>
      <View style={styles.track}>
        <View style={[styles.fill, { width: `${progress * 100}%` }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  markup: { gap: spacing.sm },
  label: { flexDirection: 'row', justifyContent: 'space-between' },
  track: {
    height: 6,
    borderRadius: radii.pill,
    backgroundColor: colors.surfaceRaised,
    overflow: 'hidden',
  },
  fill: { height: '100%', borderRadius: radii.pill, backgroundColor: colors.accent },
});
