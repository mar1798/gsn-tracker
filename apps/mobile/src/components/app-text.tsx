import { Text, type TextProps } from 'react-native';

import { colors, typography, type ColorToken, type TypographyVariant } from '@/theme';

export type AppTextProps = TextProps & {
  variant?: TypographyVariant;
  color?: ColorToken;
  align?: 'left' | 'center' | 'right';
};

export function AppText({
  variant = 'body',
  color = 'text',
  align,
  style,
  ...props
}: AppTextProps) {
  return (
    <Text
      style={[typography[variant], { color: colors[color], textAlign: align }, style]}
      {...props}
    />
  );
}
