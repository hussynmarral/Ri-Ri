import { useEffect, useState } from 'react';
import { useAuthStore } from '@/stores/authStore';
import { useSettingsStore } from '@/stores/settingsStore';
import { useScheduleStore } from '@/stores/scheduleStore';
import { useWaterStore } from '@/stores/waterStore';
import { useWorkoutStore } from '@/stores/workoutStore';
import { useHabitStore } from '@/stores/habitStore';
import { bootstrapApp } from '@/lib/bootstrap';

function todayISO() {
  return new Date().toISOString().split('T')[0];
}

export function useAppInit() {
  const [isReady, setIsReady] = useState(false);
  const { initialize, user } = useAuthStore();
  const loadSettings = useSettingsStore((s) => s.load);
  const loadSchedule = useScheduleStore((s) => s.load);
  const loadWater = useWaterStore((s) => s.load);
  const loadWorkout = useWorkoutStore((s) => s.load);
  const loadHabits = useHabitStore((s) => s.load);

  useEffect(() => {
    let cancelled = false;

    async function init() {
      await bootstrapApp();
      await initialize();

      const userId = useAuthStore.getState().user?.id;
      if (!cancelled && userId) {
        const date = todayISO();
        await Promise.all([
          loadSettings(userId),
          loadSchedule(userId, date),
          loadWater(userId, date),
          loadWorkout(userId, date),
          loadHabits(userId, date),
        ]);
      }

      if (!cancelled) setIsReady(true);
    }

    init();
    return () => { cancelled = true; };
  }, []);

  // Re-load data when user changes (login/logout)
  useEffect(() => {
    if (!user) return;
    const date = todayISO();
    const uid = user.id;
    loadSettings(uid);
    loadSchedule(uid, date);
    loadWater(uid, date);
    loadWorkout(uid, date);
    loadHabits(uid, date);
    bootstrapApp(uid);
  }, [user?.id]);

  return isReady;
}
