import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { colors, radii, spacing } from '@/theme';

import { AppText } from './app-text';
import { Icon, type IconName } from './icon';

/** Inline status line: offline, unsent edits, a rejected edit. */
export function Banner({
  icon,
  message,
  tone = 'neutral',
  action,
}: {
  icon: IconName;
  message: string;
  tone?: 'neutral' | 'danger';
  action?: ReactNode;
}) {
  const danger = tone === 'danger';
  return (
    <View
      style={[styles.banner, danger && { backgroundColor: colors.dangerMuted }]}
      accessibilityRole="alert"
    >
      <Icon name={icon} size={16} color={danger ? 'danger' : 'textSecondary'} />
      <AppText variant="label" color={danger ? 'danger' : 'textSecondary'} style={styles.text}>
        {message}
      </AppText>
      {action}
    </View>
  );
}

/** Text button at the end of a banner: "Повторить", "Скрыть". */
export function BannerAction({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" hitSlop={spacing.md} onPress={onPress}>
      <AppText variant="label" color="danger">
        {label}
      </AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radii.md,
    backgroundColor: colors.surface,
  },
  text: { flex: 1 },
});
