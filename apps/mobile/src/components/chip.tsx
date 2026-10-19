import { Pressable, StyleSheet, View } from 'react-native';

import { colors, radii, spacing } from '@/theme';

import { AppText } from './app-text';
import { Icon, type IconName } from './icon';

/** Filter / toggle chip from the design references; selected = lime. */
export function Chip({
  label,
  selected = false,
  icon,
  onPress,
  accessibilityLabel,
}: {
  label: string;
  selected?: boolean;
  icon?: IconName;
  onPress?: () => void;
  accessibilityLabel?: string;
}) {
  return (
    <Pressable
      accessibilityRole={onPress ? 'button' : 'text'}
      accessibilityState={onPress ? { selected } : undefined}
      accessibilityLabel={accessibilityLabel ?? label}
      onPress={onPress}
      hitSlop={spacing.xs}
      style={({ pressed }) => [
        styles.chip,
        selected && styles.selected,
        pressed && !selected && styles.pressed,
      ]}
    >
      <View style={styles.content}>
        {icon && <Icon name={icon} size={13} color={selected ? 'onAccent' : 'textSecondary'} />}
        <AppText variant="label" color={selected ? 'onAccent' : 'text'}>
          {label}
        </AppText>
      </View>
    </Pressable>
  );
}

/** Small read-only tag (muscle group, "от часов"). */
export function Tag({
  label,
  tone = 'neutral',
}: {
  label: string;
  tone?: 'neutral' | 'accent' | 'danger';
}) {
  return (
    <View
      style={[
        styles.tag,
        tone === 'accent' && { backgroundColor: colors.accentMuted },
        tone === 'danger' && { backgroundColor: colors.dangerMuted },
      ]}
    >
      <AppText
        variant="caption"
        color={tone === 'accent' ? 'accent' : tone === 'danger' ? 'danger' : 'textSecondary'}
      >
        {label}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  chip: {
    minHeight: 40,
    paddingHorizontal: spacing.lg,
    borderRadius: radii.pill,
    justifyContent: 'center',
    backgroundColor: colors.surfaceRaised,
  },
  selected: { backgroundColor: colors.accent },
  pressed: { backgroundColor: colors.surfacePressed },
  content: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  tag: {
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xxs,
    borderRadius: radii.pill,
    backgroundColor: colors.surfaceRaised,
  },
});
