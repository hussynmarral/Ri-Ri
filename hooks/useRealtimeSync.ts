import { useEffect } from 'react';

import { todayDateISO } from '@/lib/scheduler/engine';
import { subscribeToUserChanges } from '@/lib/sync/realtimeSync';
import type { SyncableTable } from '@/lib/sync/realtimeSync';
import { useAuthStore } from '@/stores/authStore';
import { useHabitStore } from '@/stores/habitStore';
import { useScheduleStore } from '@/stores/scheduleStore';
import { useWaterStore } from '@/stores/waterStore';
import { useWorkoutStore } from '@/stores/workoutStore';

export function useRealtimeSync(): void {
  const user = useAuthStore((s) => s.user);

  useEffect(() => {
    if (!user) return;

    const uid = user.id;
    const date = todayDateISO();

    function onTableChanged(table: SyncableTable) {
      switch (table) {
        case 'schedule_instances':
          // Reload silently — generateDayInstances returns existing rows
          useScheduleStore.getState().load(uid, date);
          break;
        case 'water_logs':
          useWaterStore.getState().load(uid, date);
          break;
        case 'habit_logs':
          useHabitStore.getState().load(uid, date);
          break;
        case 'workout_sessions':
          useWorkoutStore.getState().load(uid, date);
          break;
        // routine_templates and daily_stats don't need an immediate store refresh
      }
    }

    const unsubscribe = subscribeToUserChanges(uid, onTableChanged);
    return unsubscribe;
  }, [user?.id]);
}
