import type { ReactNode } from 'react';
import type { ManualSet, WorkoutSet } from '@gsc/shared';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/app-text';
import { Tag } from '@/components/chip';
import { Icon } from '@/components/icon';
import { formatDuration, formatNumber, formatSetLoad } from '@/lib/format';
import { colors, hitSize, radii, spacing } from '@/theme';

type RowProps = {
  exerciseName: string | null;
  /** `undefined` = not in selection mode. */
  selected?: boolean;
  /** Briefly outlined after a tap on the HR chart. */
  highlighted?: boolean;
  onPress: () => void;
  onLongPress?: () => void;
};

/** A Garmin set: exercise (or a prompt), load, duration/rest and peak HR. */
export function GarminSetRow({ set, ...row }: RowProps & { set: WorkoutSet }) {
  const e = set.effective;
  const load = formatSetLoad(e.weightKg, e.reps);
  const fromWatch = e.repsSource === 'garmin';
  return (
    <RowFrame
      {...row}
      label={String(set.setIndex)}
      dimmed={e.isExcluded}
      warning={set.suspicious !== null && !e.isExcluded}
      accessibilityLabel={`Подход ${set.setIndex}`}
      right={
        <View style={styles.hr}>
          <View style={styles.hrValue}>
            <Icon name="heart.fill" size={11} color="heartRate" />
            <AppText variant="bodyStrong">{formatNumber(set.hr.peak)}</AppText>
          </View>
          <AppText variant="caption" color="textTertiary">
            ср. {formatNumber(set.hr.avg)}
          </AppText>
        </View>
      }
    >
      <ExerciseTitle name={row.exerciseName} />
      <View style={styles.meta}>
        {load ? (
          <AppText variant="label" color={fromWatch ? 'textSecondary' : 'text'}>
            {load}
          </AppText>
        ) : null}
        {fromWatch ? <Tag label="от часов" /> : null}
        {e.isWarmup ? <Tag label="разминка" /> : null}
        {e.isFailure ? <Tag label="отказ" tone="accent" /> : null}
        {e.isExcluded ? <Tag label="исключён" /> : null}
        {set.suspicious && !e.isExcluded ? <Tag label="двойное нажатие?" tone="danger" /> : null}
      </View>
      <AppText variant="caption" color="textTertiary">
        {formatDuration(set.durationSec)} · отдых {formatDuration(set.restAfterSec)}
      </AppText>
    </RowFrame>
  );
}

/** A set the watch missed, added by hand. */
export function ManualSetRow({ set, ...row }: RowProps & { set: ManualSet }) {
  const load = formatSetLoad(set.weightKg, set.reps);
  return (
    <RowFrame {...row} label="+" accessibilityLabel="Ручной подход">
      <ExerciseTitle name={row.exerciseName} />
      <View style={styles.meta}>
        {load ? <AppText variant="label">{load}</AppText> : null}
        <Tag label="вручную" />
        {set.isWarmup ? <Tag label="разминка" /> : null}
        {set.isFailure ? <Tag label="отказ" tone="accent" /> : null}
      </View>
    </RowFrame>
  );
}

function ExerciseTitle({ name }: { name: string | null }) {
  return name ? (
    <AppText variant="bodyStrong" numberOfLines={1}>
      {name}
    </AppText>
  ) : (
    <AppText variant="bodyStrong" color="accent">
      Выбрать упражнение
    </AppText>
  );
}

function RowFrame({
  label,
  selected,
  highlighted,
  dimmed,
  warning,
  onPress,
  onLongPress,
  right,
  accessibilityLabel,
  children,
}: Omit<RowProps, 'exerciseName'> & {
  label: string;
  dimmed?: boolean;
  warning?: boolean;
  right?: ReactNode;
  accessibilityLabel: string;
  children: ReactNode;
}) {
  const selecting = selected !== undefined;
  return (
    <Pressable
      accessibilityRole={selecting ? 'checkbox' : 'button'}
      accessibilityState={selecting ? { checked: selected } : undefined}
      accessibilityLabel={accessibilityLabel}
      onPress={onPress}
      onLongPress={onLongPress}
      delayLongPress={350}
      style={({ pressed }) => [
        styles.row,
        warning && styles.warning,
        highlighted && styles.highlighted,
        selected && styles.selected,
        pressed && styles.pressed,
      ]}
    >
      <View style={[styles.index, selected && styles.indexSelected]}>
        {selected ? (
          <Icon name="checkmark" size={16} color="onAccent" />
        ) : (
          <AppText variant="bodyStrong" color={selecting ? 'textSecondary' : 'text'}>
            {label}
          </AppText>
        )}
      </View>
      <View style={[styles.body, dimmed && styles.dimmed]}>{children}</View>
      {right ? <View style={dimmed && styles.dimmed}>{right}</View> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    minHeight: hitSize + 24,
    padding: spacing.md,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.surface,
    backgroundColor: colors.surface,
  },
  pressed: { backgroundColor: colors.surfaceRaised },
  warning: { borderColor: colors.dangerMuted },
  highlighted: { borderColor: colors.accent },
  selected: { borderColor: colors.accent, backgroundColor: colors.accentMuted },
  index: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceRaised,
  },
  indexSelected: { backgroundColor: colors.accent },
  body: { flex: 1, gap: spacing.xs },
  dimmed: { opacity: 0.45 },
  meta: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: spacing.xs },
  hr: { alignItems: 'flex-end', gap: spacing.xxs },
  hrValue: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
});
