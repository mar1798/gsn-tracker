import type { ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';

import { AppText } from '@/components/app-text';
import { Chip } from '@/components/chip';
import { Icon } from '@/components/icon';
import { colors, hitSize, radii, spacing, typography } from '@/theme';

import { parseDecimal, RPE_VALUES } from './set-form';

export function Field({
  label,
  aside,
  children,
}: {
  label: string;
  aside?: ReactNode;
  children: ReactNode;
}) {
  return (
    <View style={styles.field}>
      <View style={styles.fieldLabel}>
        <AppText variant="label" color="textSecondary">
          {label}
        </AppText>
        {aside}
      </View>
      {children}
    </View>
  );
}

const formatStep = (n: number) => String(Math.round(n * 100) / 100).replace('.', ',');

/** Number input with big −/+ buttons: in the gym it is quicker to tap than to type. */
export function StepperInput({
  label,
  value,
  onChange,
  step,
  unit,
  decimal = false,
  error,
  aside,
}: {
  label: string;
  value: string;
  onChange: (text: string) => void;
  step: number;
  unit?: string;
  decimal?: boolean;
  error?: string;
  aside?: ReactNode;
}) {
  const bump = (direction: 1 | -1) => {
    const current = parseDecimal(value);
    const base = current !== null && Number.isFinite(current) ? current : 0;
    onChange(formatStep(Math.max(0, base + direction * step)));
  };
  return (
    <Field label={label} aside={aside}>
      <View style={styles.stepper}>
        <StepButton icon="minus" label={`${label}: меньше`} onPress={() => bump(-1)} />
        <View style={[styles.inputBox, error ? styles.invalid : undefined]}>
          <TextInput
            accessibilityLabel={label}
            value={value}
            onChangeText={onChange}
            keyboardType={decimal ? 'decimal-pad' : 'number-pad'}
            keyboardAppearance="dark"
            selectionColor={colors.accent}
            placeholder="—"
            placeholderTextColor={colors.textTertiary}
            selectTextOnFocus
            style={styles.input}
          />
          {unit ? (
            <AppText variant="label" color="textSecondary">
              {unit}
            </AppText>
          ) : null}
        </View>
        <StepButton icon="plus" label={`${label}: больше`} onPress={() => bump(1)} />
      </View>
      {error ? (
        <AppText variant="caption" color="danger">
          {error}
        </AppText>
      ) : null}
    </Field>
  );
}

function StepButton({
  icon,
  label,
  onPress,
}: {
  icon: 'minus' | 'plus';
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => [styles.stepButton, pressed && styles.stepButtonPressed]}
    >
      <Icon name={icon} size={18} />
    </Pressable>
  );
}

/** RPE 6–10 in half steps; tapping the selected value clears it. */
export function RpePicker({
  value,
  onChange,
}: {
  value: number | null;
  onChange: (rpe: number | null) => void;
}) {
  return (
    <Field label="RPE (усилие)">
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.row}
      >
        {RPE_VALUES.map((rpe) => (
          <Chip
            key={rpe}
            label={formatStep(rpe)}
            accessibilityLabel={`RPE ${formatStep(rpe)}`}
            selected={value === rpe}
            onPress={() => onChange(value === rpe ? null : rpe)}
          />
        ))}
      </ScrollView>
    </Field>
  );
}

const styles = StyleSheet.create({
  field: { gap: spacing.sm },
  fieldLabel: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  stepButton: {
    width: hitSize + 4,
    height: hitSize + 4,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceRaised,
  },
  stepButtonPressed: { backgroundColor: colors.surfacePressed },
  inputBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    minHeight: hitSize + 4,
    paddingHorizontal: spacing.lg,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  invalid: { borderColor: colors.danger },
  input: { ...typography.metric, flex: 1, color: colors.text, textAlign: 'center' },
  row: { gap: spacing.sm },
});
