import { ActivityIndicator, Pressable, StyleSheet, View, type PressableProps } from 'react-native';

import { colors, hitSize, radii, spacing, type ColorToken } from '@/theme';

import { AppText } from './app-text';
import { Icon, type IconName } from './icon';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';

const variants: Record<
  Variant,
  { background: string; pressed: string; content: ColorToken; border?: string }
> = {
  primary: { background: colors.accent, pressed: colors.accentPressed, content: 'onAccent' },
  secondary: {
    background: colors.surfaceRaised,
    pressed: colors.surfacePressed,
    content: 'text',
  },
  ghost: { background: 'transparent', pressed: colors.surfaceRaised, content: 'accent' },
  danger: { background: colors.dangerMuted, pressed: colors.surfacePressed, content: 'danger' },
};

export type ButtonProps = Omit<PressableProps, 'children' | 'style'> & {
  title: string;
  variant?: Variant;
  icon?: IconName;
  loading?: boolean;
  /** Stretch to the container width (default for primary actions at the bottom of a screen). */
  block?: boolean;
  size?: 'md' | 'sm';
};

export function Button({
  title,
  variant = 'primary',
  icon,
  loading = false,
  block = false,
  size = 'md',
  disabled,
  ...props
}: ButtonProps) {
  const v = variants[variant];
  const inactive = disabled || loading;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: !!inactive, busy: loading }}
      disabled={inactive}
      style={({ pressed }) => [
        styles.base,
        size === 'sm' ? styles.sm : styles.md,
        { backgroundColor: pressed ? v.pressed : v.background },
        block && styles.block,
        inactive && !loading && styles.disabled,
      ]}
      {...props}
    >
      {loading ? (
        <ActivityIndicator color={colors[v.content]} />
      ) : (
        <View style={styles.content}>
          {icon && <Icon name={icon} size={size === 'sm' ? 15 : 18} color={v.content} />}
          <AppText variant={size === 'sm' ? 'label' : 'bodyStrong'} color={v.content}>
            {title}
          </AppText>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'flex-start',
  },
  md: { minHeight: hitSize + 8, paddingHorizontal: spacing.xl },
  sm: { minHeight: 40, paddingHorizontal: spacing.lg },
  block: { alignSelf: 'stretch' },
  disabled: { opacity: 0.4 },
  content: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
});
