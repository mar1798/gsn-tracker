import { Pressable, StyleSheet, View, type PressableProps, type ViewProps } from 'react-native';

import { colors, radii, spacing } from '@/theme';

export function Card({ style, ...props }: ViewProps) {
  return <View style={[styles.card, style]} {...props} />;
}

export function PressableCard({
  style,
  ...props
}: Omit<PressableProps, 'style'> & { style?: ViewProps['style'] }) {
  return (
    <Pressable
      style={({ pressed }) => [
        styles.card,
        pressed && { backgroundColor: colors.surfaceRaised },
        style,
      ]}
      {...props}
    />
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    padding: spacing.lg,
    gap: spacing.md,
  },
});
