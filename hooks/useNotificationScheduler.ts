import { useEffect, useRef } from 'react';
import { scheduleBlockReminders } from '@/lib/notifications/blockReminders';
import { scheduleWaterReminders } from '@/lib/notifications/waterReminders';
import { hasNotificationPermissions } from '@/lib/notifications/permissions';
import { useScheduleStore } from '@/stores/scheduleStore';
import { useWaterStore } from '@/stores/waterStore';

export function useNotificationScheduler(): void {
  const todayBlocks = useScheduleStore((s) => s.todayBlocks);
  const todayTotalMl = useWaterStore((s) => s.todayTotalMl);
  const scheduledRef = useRef(false);

  // Re-schedule block reminders whenever the block list changes
  useEffect(() => {
    if (todayBlocks.length === 0) return;

    (async () => {
      const permitted = await hasNotificationPermissions();
      if (!permitted) return;
      await scheduleBlockReminders(todayBlocks).catch(() => {});
    })();
  }, [todayBlocks]);

  // Re-schedule water reminders whenever total intake changes
  useEffect(() => {
    if (!scheduledRef.current && todayTotalMl === 0) return;
    scheduledRef.current = true;

    (async () => {
      const permitted = await hasNotificationPermissions();
      if (!permitted) return;
      await scheduleWaterReminders(todayTotalMl).catch(() => {});
    })();
  }, [todayTotalMl]);
}
