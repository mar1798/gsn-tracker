import { StyleSheet, View } from 'react-native';

import type { Change } from '@/lib/format';
import { spacing, type ColorToken } from '@/theme';

import { AppText } from './app-text';
import { ChangeBadge } from './change-badge';
import { Icon, type IconName } from './icon';

/** "icon + label + big number" tile from the design references. */
export function Metric({
  icon,
  iconColor = 'accent',
  label,
  value,
  change,
}: {
  icon: IconName;
  iconColor?: ColorToken;
  label: string;
  value: string;
  /** Against the previous period. */
  change?: Change | null;
}) {
  return (
    <View
      style={styles.metric}
      accessible
      accessibilityLabel={`${label}: ${value}${change ? `, к прошлому периоду ${change.text}` : ''}`}
    >
      <View style={styles.label}>
        <Icon name={icon} size={13} color={iconColor} />
        <AppText variant="caption" color="textSecondary">
          {label}
        </AppText>
      </View>
      <AppText variant="metric">{value}</AppText>
      {change !== undefined ? <ChangeBadge change={change} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  metric: { flex: 1, gap: spacing.xs },
  label: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
});
