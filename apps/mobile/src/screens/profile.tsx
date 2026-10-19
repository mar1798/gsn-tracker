import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/app-text';
import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { Icon } from '@/components/icon';
import { Screen, ScreenHeader } from '@/components/screen';
import { signOut } from '@/lib/auth';
import { useSession } from '@/lib/session';
import { colors, spacing } from '@/theme';

// Garmin connection, settings and CSV export come in phases 7–8.
export function ProfileScreen() {
  const user = useSession((s) => s.user);
  const [signingOut, setSigningOut] = useState(false);

  return (
    <Screen>
      <ScreenHeader title="Профиль" />
      <View style={styles.content}>
        <Card style={styles.account}>
          <View style={styles.avatar}>
            <Icon name="person.fill" size={24} color="accent" />
          </View>
          <View style={styles.accountText}>
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
        <Button
          title="Выйти"
          variant="danger"
          icon="rectangle.portrait.and.arrow.right"
          block
          loading={signingOut}
          onPress={async () => {
            setSigningOut(true);
            await signOut();
          }}
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: spacing.lg, gap: spacing.lg },
  account: { flexDirection: 'row', alignItems: 'center' },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.accentMuted,
  },
  accountText: { flex: 1, gap: spacing.xxs },
});
