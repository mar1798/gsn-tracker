import type { ReactNode } from 'react';
import { KeyboardAvoidingView, ScrollView, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/app-text';
import { Screen } from '@/components/screen';
import { spacing } from '@/theme';

export function AuthLayout({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
  footer: ReactNode;
}) {
  return (
    <Screen edges={['top', 'bottom']}>
      <KeyboardAvoidingView style={styles.flex} behavior="padding">
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="interactive"
        >
          <View style={styles.brand}>
            <AppText variant="heading" color="accent">
              GSC Tracker
            </AppText>
            <AppText variant="display" accessibilityRole="header">
              {title}
            </AppText>
            <AppText color="textSecondary">{subtitle}</AppText>
          </View>
          <View style={styles.form}>{children}</View>
          <View style={styles.footer}>{footer}</View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

export function FormError({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <AppText color="danger" accessibilityRole="alert" accessibilityLiveRegion="polite">
      {message}
    </AppText>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: spacing.xl,
    gap: spacing.xxl,
  },
  brand: { gap: spacing.sm },
  form: { gap: spacing.lg },
  footer: { alignItems: 'center' },
});
