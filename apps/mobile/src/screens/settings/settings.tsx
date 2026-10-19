import { zodResolver } from '@hookform/resolvers/zod';
import type { UserSettings } from '@gsc/shared';
import { useRouter } from 'expo-router';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '@/components/app-text';
import { Banner } from '@/components/banner';
import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { Segmented } from '@/components/segmented';
import { TextField } from '@/components/text-field';
import { useSaveSettings } from '@/hooks/use-settings';
import { weightUnitLabel } from '@/lib/format';
import { hapticSelection, hapticSuccess } from '@/lib/haptics';
import { useSession } from '@/lib/session';
import { colors, radii, spacing } from '@/theme';

import {
  convertBodyWeight,
  previewZones,
  settingsForm,
  settingsFormSchema,
  toSettingsPatch,
  type SettingsFormValues,
  type ZonesMode,
} from './settings-form';

const UNIT_OPTIONS = [
  { value: 'kg', label: 'Килограммы' },
  { value: 'lb', label: 'Фунты' },
] as const;

const ZONE_MODES: readonly { value: ZonesMode; label: string }[] = [
  { value: 'garmin', label: 'Из часов' },
  { value: 'max', label: 'От макс.' },
  { value: 'custom', label: 'Свои' },
];

const ZONE_HINTS: Record<ZonesMode, string> = {
  garmin: 'Границы зон берутся из часов вместе с каждой тренировкой.',
  max: 'Зоны 1–5 — до 60, 70, 80, 90 и 100 % максимального пульса, как в часах Garmin.',
  custom: 'Верхняя граница каждой зоны, уд/мин.',
};

/** Modal: weight units, body weight and HR zones (`PATCH /me/settings`, online only). */
export function SettingsScreen() {
  const settings = useSession((s) => s.user?.settings);
  return settings ? <SettingsForm settings={settings} /> : null;
}

function SettingsForm({ settings }: { settings: UserSettings }) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const save = useSaveSettings();
  const {
    control,
    handleSubmit,
    setValue,
    getValues,
    formState: { errors },
  } = useForm<SettingsFormValues>({
    resolver: zodResolver(settingsFormSchema),
    defaultValues: settingsForm(settings),
  });
  const values = useWatch({ control }) as SettingsFormValues;
  // react-hook-form keeps an error of the whole array under `root`.
  const zonesError = errors.zones?.root?.message;

  const submit = handleSubmit((form) =>
    save.mutate(toSettingsPatch(form), {
      onSuccess: () => {
        void hapticSuccess();
        router.back();
      },
    }),
  );

  const changeUnits = (units: SettingsFormValues['units']) => {
    void hapticSelection();
    const { units: from, bodyWeight } = getValues();
    setValue('bodyWeight', convertBodyWeight(bodyWeight, from, units));
    setValue('units', units);
  };

  const changeZonesMode = (mode: ZonesMode) => {
    void hapticSelection();
    // Own zones start from the max HR ones, so the user edits instead of typing all five.
    const preview = previewZones(getValues('hrMax'));
    if (mode === 'custom' && getValues('zones').every((z) => z === '') && preview.length > 0) {
      setValue('zones', preview.map(String));
    }
    setValue('zonesMode', mode);
  };

  const preview = values.zonesMode === 'max' ? previewZones(values.hrMax) : [];

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <AppText variant="title" accessibilityRole="header" style={styles.headerTitle}>
          Настройки
        </AppText>
        <Pressable accessibilityRole="button" hitSlop={spacing.md} onPress={() => router.back()}>
          <AppText variant="bodyStrong" color="accent">
            Отмена
          </AppText>
        </Pressable>
      </View>

      <ScrollView
        style={styles.screen}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        automaticallyAdjustKeyboardInsets
      >
        <Card>
          <AppText variant="heading">Единицы веса</AppText>
          <Segmented options={UNIT_OPTIONS} value={values.units} onChange={changeUnits} />
          <AppText variant="caption" color="textTertiary">
            Данные хранятся в килограммах, единицы влияют только на отображение и ввод.
          </AppText>
        </Card>

        <Card>
          <AppText variant="heading">Вес тела</AppText>
          <Controller
            control={control}
            name="bodyWeight"
            render={({ field }) => (
              <TextField
                label={`Вес тела, ${weightUnitLabel(values.units)}`}
                placeholder="Из профиля Garmin"
                keyboardType="decimal-pad"
                value={field.value}
                onChangeText={field.onChange}
                onBlur={field.onBlur}
                error={errors.bodyWeight?.message}
              />
            )}
          />
          <AppText variant="caption" color="textTertiary">
            Нужен для упражнений с весом тела. Если поле пустое, вес берётся из профиля пользователя
            в FIT-файле.
          </AppText>
        </Card>

        <Card>
          <AppText variant="heading">Пульсовые зоны</AppText>
          <Segmented options={ZONE_MODES} value={values.zonesMode} onChange={changeZonesMode} />
          <AppText variant="caption" color="textTertiary">
            {ZONE_HINTS[values.zonesMode]} По зонам подсвечивается пиковый пульс подходов, время в
            зонах всегда берётся из Garmin.
          </AppText>

          {values.zonesMode === 'max' ? (
            <>
              <Controller
                control={control}
                name="hrMax"
                render={({ field }) => (
                  <TextField
                    label="Максимальный пульс, уд/мин"
                    placeholder="Например, 190"
                    keyboardType="number-pad"
                    value={field.value}
                    onChangeText={field.onChange}
                    onBlur={field.onBlur}
                    error={errors.hrMax?.message}
                  />
                )}
              />
              {preview.length > 0 ? (
                <View style={styles.zones} accessibilityLabel="Границы зон">
                  {preview.map((bound, i) => (
                    <View key={i} style={styles.zonePreview}>
                      <AppText variant="caption" color="textSecondary">
                        Зона {i + 1}
                      </AppText>
                      <AppText variant="bodyStrong">≤ {bound}</AppText>
                    </View>
                  ))}
                </View>
              ) : null}
            </>
          ) : null}

          {values.zonesMode === 'custom' ? (
            <>
              <View style={styles.zones}>
                {values.zones.map((_, i) => (
                  <View key={i} style={styles.zoneInput}>
                    <Controller
                      control={control}
                      name={`zones.${i}`}
                      render={({ field }) => (
                        <TextField
                          label={`Зона ${i + 1}`}
                          placeholder="—"
                          keyboardType="number-pad"
                          textAlign="center"
                          value={field.value}
                          onChangeText={field.onChange}
                          onBlur={field.onBlur}
                        />
                      )}
                    />
                  </View>
                ))}
              </View>
              {zonesError ? (
                <AppText variant="caption" color="danger">
                  {zonesError}
                </AppText>
              ) : null}
            </>
          ) : null}
        </Card>
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + spacing.md }]}>
        {save.error ? (
          <Banner icon="exclamationmark.triangle" tone="danger" message={save.error.message} />
        ) : null}
        <Button title="Сохранить" block loading={save.isPending} onPress={() => void submit()} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
    paddingBottom: spacing.md,
  },
  headerTitle: { flex: 1 },
  content: { padding: spacing.lg, gap: spacing.lg },
  zones: { flexDirection: 'row', gap: spacing.sm },
  zonePreview: {
    flex: 1,
    alignItems: 'center',
    gap: spacing.xxs,
    paddingVertical: spacing.sm,
    borderRadius: radii.md,
    backgroundColor: colors.surfaceRaised,
  },
  zoneInput: { flex: 1 },
  footer: {
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.background,
  },
});
