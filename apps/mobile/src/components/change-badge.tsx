import { StyleSheet, View } from 'react-native';

import type { Change } from '@/lib/format';
import { colors, radii, spacing } from '@/theme';

import { AppText } from './app-text';
import { Icon } from './icon';

/** "+12 %" against the previous period. Growth is lime; a drop is neutral, not an alarm. */
export function ChangeBadge({ change }: { change: Change | null }) {
  if (!change) return null;
  const up = change.direction === 'up';
  return (
    <View
      style={[styles.badge, up && styles.up]}
      accessibilityLabel={`к прошлому периоду ${change.text}`}
    >
      {change.direction !== 'flat' ? (
        <Icon
          name={up ? 'arrow.up.right' : 'arrow.down.right'}
          size={10}
          color={up ? 'accent' : 'textSecondary'}
        />
      ) : null}
      <AppText variant="caption" color={up ? 'accent' : 'textSecondary'}>
        {change.text}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: spacing.xxs,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xxs,
    borderRadius: radii.pill,
    backgroundColor: colors.surfaceRaised,
  },
  up: { backgroundColor: colors.accentMuted },
});
