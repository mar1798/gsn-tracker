import { useState } from 'react';
import { StyleSheet, TextInput, View, type TextInputProps } from 'react-native';

import { colors, hitSize, radii, spacing, typography } from '@/theme';

import { AppText } from './app-text';

export type TextFieldProps = TextInputProps & {
  label: string;
  error?: string;
};

export function TextField({ label, error, onFocus, onBlur, ...props }: TextFieldProps) {
  const [focused, setFocused] = useState(false);
  return (
    <View style={styles.container}>
      <AppText variant="label" color="textSecondary">
        {label}
      </AppText>
      <TextInput
        accessibilityLabel={label}
        placeholderTextColor={colors.textTertiary}
        selectionColor={colors.accent}
        keyboardAppearance="dark"
        style={[styles.input, focused && styles.focused, error ? styles.invalid : undefined]}
        onFocus={(e) => {
          setFocused(true);
          onFocus?.(e);
        }}
        onBlur={(e) => {
          setFocused(false);
          onBlur?.(e);
        }}
        {...props}
      />
      {error ? (
        <AppText variant="caption" color="danger">
          {error}
        </AppText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: spacing.sm },
  input: {
    ...typography.body,
    color: colors.text,
    minHeight: hitSize + 4,
    paddingHorizontal: spacing.lg,
    borderRadius: radii.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  focused: { borderColor: colors.accent },
  invalid: { borderColor: colors.danger },
});
