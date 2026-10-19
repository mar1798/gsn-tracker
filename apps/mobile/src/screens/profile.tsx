import type { UserSettings } from '@gsc/shared';
import { useMutation } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, ScrollView, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/app-text';
import { Banner } from '@/components/banner';
import { Button } from '@/components/button';
import { Card, PressableCard } from '@/components/card';
import { Icon, type IconName } from '@/components/icon';
import { Screen, ScreenHeader } from '@/components/screen';
import { usePickFitFile } from '@/hooks/use-pick-fit-file';
import { deleteAccount, signOut } from '@/lib/auth';
import { exportSetsCsv } from '@/lib/export-csv';
import { formatWeight } from '@/lib/format';
import { hapticSuccess, hapticWarning } from '@/lib/haptics';
import { useSession } from '@/lib/session';
import { colors, hitSize, radii, spacing } from '@/theme';

/** "кг · вес тела 80 кг · зоны из часов". */
function settingsSummary(s: UserSettings): string {
  const units = s.units === 'lb' ? 'фунты' : 'кг';
  const weight = s.bodyWeightKg
    ? `вес тела ${formatWeight(s.bodyWeightKg, s.units)}`
    : 'вес тела из Garmin';
  const zones = s.hrZones ? 'свои зоны' : s.hrMax ? `зоны от ${s.hrMax} уд/мин` : 'зоны из часов';
  return [units, weight, zones].join(' · ');
}

/** "Профиль" tab: account, settings, Garmin, data export, sign-out and account deletion. */
export function ProfileScreen() {
  const router = useRouter();
  const pickFile = usePickFitFile();
  const user = useSession((s) => s.user);
  const [signingOut, setSigningOut] = useState(false);
  const exportCsv = useMutation({ mutationFn: () => exportSetsCsv() });
  const removeAccount = useMutation({ mutationFn: deleteAccount });

  const confirmDelete = () => {
    void hapticWarning();
    Alert.alert(
      'Удалить аккаунт?',
      'Все тренировки, разметка подходов, свои упражнения и загруженные FIT-файлы будут удалены без возможности восстановления.',
      [
        { text: 'Отмена', style: 'cancel' },
        { text: 'Удалить навсегда', style: 'destructive', onPress: () => removeAccount.mutate() },
      ],
    );
  };

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.content}>
        <ScreenHeader title="Профиль" />
        <View style={styles.sections}>
          <Card style={styles.row}>
            <View style={styles.avatar}>
              <Icon name="person.fill" size={24} color="accent" />
            </View>
            <View style={styles.rowText}>
              <AppText variant="bodyStrong" numberOfLines={1}>
                {user?.name ?? 'Атлет'}
              </AppText>
              {user?.email ? (
                <AppText color="textSecondary" numberOfLines={1}>
                  {user.email}
                </AppText>
              ) : null}
            </View>
          </Card>

          <PressableCard
            accessibilityRole="button"
            accessibilityLabel="Настройки"
            onPress={() => router.push('/settings')}
            style={styles.row}
          >
            <RowIcon name="gearshape.fill" />
            <View style={styles.rowText}>
              <AppText variant="bodyStrong">Настройки</AppText>
              {user ? (
                <AppText variant="caption" color="textSecondary">
                  {settingsSummary(user.settings)}
                </AppText>
              ) : null}
            </View>
            <Icon name="chevron.right" size={14} color="textTertiary" />
          </PressableCard>

          <Card>
            <View style={styles.row}>
              <RowIcon name="applewatch" />
              <View style={styles.rowText}>
                <AppText variant="bodyStrong">Garmin</AppText>
                <AppText variant="caption" color="textSecondary">
                  Автоматическая синхронизация пока недоступна
                </AppText>
              </View>
            </View>
            <AppText color="textSecondary">
              Откройте тренировку на connect.garmin.com, выберите «Export Original» и импортируйте
              FIT-файл. Или откройте файл через «Поделиться» → GSC Tracker.
            </AppText>
            <Button
              title="Импорт FIT"
              icon="square.and.arrow.down"
              variant="secondary"
              size="sm"
              onPress={pickFile}
            />
          </Card>

          <Card>
            <AppText variant="heading">Данные</AppText>
            <AppText color="textSecondary">
              Все подходы с упражнениями, весом, повторами и пульсом одной таблицей CSV.
            </AppText>
            {exportCsv.error ? (
              <Banner
                icon="exclamationmark.triangle"
                tone="danger"
                message={exportCsv.error.message}
              />
            ) : null}
            <Button
              title="Экспорт CSV"
              icon="square.and.arrow.up"
              variant="secondary"
              block
              loading={exportCsv.isPending}
              onPress={() => exportCsv.mutate(undefined, { onSuccess: () => void hapticSuccess() })}
            />
          </Card>

          <Button
            title="Выйти"
            variant="secondary"
            icon="rectangle.portrait.and.arrow.right"
            block
            loading={signingOut}
            onPress={async () => {
              setSigningOut(true);
              await signOut();
            }}
          />

          <View style={styles.danger}>
            {removeAccount.error ? (
              <Banner
                icon="exclamationmark.triangle"
                tone="danger"
                message={removeAccount.error.message}
              />
            ) : null}
            <Button
              title="Удалить аккаунт"
              variant="danger"
              icon="trash"
              block
              loading={removeAccount.isPending}
              onPress={confirmDelete}
            />
            <AppText variant="caption" color="textTertiary" align="center">
              Аккаунт и все данные удаляются с сервера сразу и навсегда.
            </AppText>
          </View>
        </View>
      </ScrollView>
    </Screen>
  );
}

function RowIcon({ name }: { name: IconName }) {
  return (
    <View style={styles.rowIcon}>
      <Icon name={name} size={18} color="accent" />
    </View>
  );
}

const styles = StyleSheet.create({
  content: { paddingBottom: spacing.xxl },
  sections: { paddingHorizontal: spacing.lg, gap: spacing.lg },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  rowText: { flex: 1, gap: spacing.xxs },
  avatar: {
    width: hitSize,
    height: hitSize,
    borderRadius: hitSize / 2,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.accentMuted,
  },
  rowIcon: {
    width: spacing.xxl + spacing.xs,
    height: spacing.xxl + spacing.xs,
    borderRadius: radii.sm,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.accentMuted,
  },
  danger: { gap: spacing.sm, marginTop: spacing.md },
});
