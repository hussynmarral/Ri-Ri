import * as Notifications from 'expo-notifications';
import type { ScheduleBlock } from '@/types';

const REMINDER_MINUTES_BEFORE = 5;

export async function scheduleBlockReminders(blocks: ScheduleBlock[]): Promise<void> {
  const now = Date.now();

  for (const block of blocks) {
    if (block.status === 'completed' || block.status === 'skipped') continue;

    const startMs = new Date(block.scheduledStart).getTime();
    const triggerMs = startMs - REMINDER_MINUTES_BEFORE * 60_000;

    if (triggerMs <= now) continue;

    await Notifications.scheduleNotificationAsync({
      identifier: `block_${block.id}`,
      content: {
        title: block.title,
        body: `Starting in ${REMINDER_MINUTES_BEFORE} minutes`,
        data: { blockId: block.id, type: 'block_reminder' },
        sound: true,
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: new Date(triggerMs),
      },
    });
  }
}

export async function cancelBlockReminder(blockId: string): Promise<void> {
  await Notifications.cancelScheduledNotificationAsync(`block_${blockId}`);
}
