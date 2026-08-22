import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

export { requestNotificationPermissions, hasNotificationPermissions } from './permissions';
export { scheduleBlockReminders, cancelBlockReminder } from './blockReminders';
export { scheduleWaterReminders, cancelWaterReminders } from './waterReminders';

export function configureNotificationHandler(): void {
  if (Platform.OS === 'web') return;

  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
}

export function addNotificationResponseListener(
  onNavigate: (data: Record<string, unknown>) => void,
): () => void {
  if (Platform.OS === 'web') return () => {};
  const sub = Notifications.addNotificationResponseReceivedListener((response) => {
    const data = response.notification.request.content.data as Record<string, unknown>;
    onNavigate(data);
  });
  return () => sub.remove();
}
