import * as Haptics from 'expo-haptics';

// Haptics are a nicety: a device without a Taptic Engine (or a test) must not fail an action.

export const hapticSelection = () => Haptics.selectionAsync().catch(() => undefined);

export const hapticSuccess = () =>
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined);

/** Before a destructive confirmation. */
export const hapticWarning = () =>
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => undefined);

export const hapticError = () =>
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => undefined);
