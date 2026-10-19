import { StyleSheet, Text, View } from 'react-native';

import { colors, spacing } from '@/theme';

export function Home() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>GSC Tracker</Text>
      <Text style={styles.subtitle}>Силовые тренировки с Garmin</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.background,
  },
  title: {
    color: colors.text,
    fontSize: 32,
    fontWeight: '700',
  },
  subtitle: {
    color: colors.textSecondary,
    fontSize: 16,
  },
});
