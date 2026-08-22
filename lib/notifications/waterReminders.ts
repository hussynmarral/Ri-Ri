import * as Notifications from 'expo-notifications';
import { WATER_DAILY_TARGET_ML } from '@/constants/schedule';

// Remind at these hours (24h) if water goal not yet met
const WATER_REMINDER_HOURS = [14, 16, 18, 20, 22];
const WATER_REMINDER_ID_PREFIX = 'water_';

export async function scheduleWaterReminders(currentTotalMl: number): Promise<void> {
  // Cancel existing water reminders before rescheduling
  await cancelWaterReminders();

  if (currentTotalMl >= WATER_DAILY_TARGET_ML) return;

  const now = new Date();
  const currentHour = now.getHours();

  for (const hour of WATER_REMINDER_HOURS) {
    if (hour <= currentHour) continue;

    const remaining = WATER_DAILY_TARGET_ML - currentTotalMl;
    const triggerDate = new Date();
    triggerDate.setHours(hour, 0, 0, 0);

    await Notifications.scheduleNotificationAsync({
      identifier: `${WATER_REMINDER_ID_PREFIX}${hour}`,
      content: {
        title: 'Drink water',
        body: `${remaining} ml left to reach your daily goal`,
        data: { type: 'water_reminder' },
        sound: true,
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: triggerDate,
      },
    });
  }
}

export async function cancelWaterReminders(): Promise<void> {
  for (const hour of WATER_REMINDER_HOURS) {
    await Notifications.cancelScheduledNotificationAsync(`${WATER_REMINDER_ID_PREFIX}${hour}`).catch(() => {});
  }
}
