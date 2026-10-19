import { StyleSheet, View } from 'react-native';

import { spacing, type ColorToken } from '@/theme';

import { AppText } from './app-text';
import { Icon, type IconName } from './icon';

/** "icon + label + big number" tile from the design references. */
export function Metric({
  icon,
  iconColor = 'accent',
  label,
  value,
}: {
  icon: IconName;
  iconColor?: ColorToken;
  label: string;
  value: string;
}) {
  return (
    <View style={styles.metric} accessible accessibilityLabel={`${label}: ${value}`}>
      <View style={styles.label}>
        <Icon name={icon} size={13} color={iconColor} />
        <AppText variant="caption" color="textSecondary">
          {label}
        </AppText>
      </View>
      <AppText variant="metric">{value}</AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  metric: { flex: 1, gap: spacing.xs },
  label: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
});
