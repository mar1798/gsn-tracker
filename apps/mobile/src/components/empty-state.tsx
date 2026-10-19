import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { colors, spacing } from '@/theme';

import { AppText } from './app-text';
import { Icon, type IconName } from './icon';

export function EmptyState({
  icon,
  title,
  message,
  action,
  tone = 'accent',
}: {
  icon: IconName;
  title: string;
  message?: string;
  action?: ReactNode;
  tone?: 'accent' | 'danger';
}) {
  return (
    <View style={styles.container}>
      <View
        style={[
          styles.badge,
          { backgroundColor: tone === 'danger' ? colors.dangerMuted : colors.accentMuted },
        ]}
      >
        <Icon name={icon} size={32} color={tone} />
      </View>
      <AppText variant="heading" align="center">
        {title}
      </AppText>
      {message ? (
        <AppText color="textSecondary" align="center">
          {message}
        </AppText>
      ) : null}
      {action ? <View style={styles.action}>{action}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.xxl,
    paddingVertical: spacing.xxxl,
  },
  badge: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  action: { marginTop: spacing.md },
});
