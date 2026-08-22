import { create } from 'zustand';
import { db } from '@/lib/db/client';
import { workoutSessions } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { enqueueChange } from '@/lib/sync/syncQueue';
import { getGymDayForDate } from '@/constants/gym';
import * as Crypto from 'expo-crypto';

export interface WorkoutSession {
  id: string;
  userId: string;
  sessionDate: string;
  gymDay: number;
  label: string;
  startedAt?: string;
  completedAt?: string;
  durationMinutes?: number;
  completed: boolean;
  notes?: string;
}

interface WorkoutState {
  todaySession: WorkoutSession | null;
  isLoading: boolean;
  load: (userId: string, date: string) => Promise<void>;
  startWorkout: () => Promise<void>;
  completeWorkout: () => Promise<void>;
}

export const useWorkoutStore = create<WorkoutState>((set, get) => ({
  todaySession: null,
  isLoading: false,

  load: async (userId, date) => {
    set({ isLoading: true });

    const rows = await db
      .select()
      .from(workoutSessions)
      .where(eq(workoutSessions.userId, userId));

    const existing = rows.find((r) => r.sessionDate === date);

    if (existing) {
      set({ todaySession: existing as WorkoutSession, isLoading: false });
      return;
    }

    // Auto-create today's session based on gym rotation
    const gymDay = getGymDayForDate(new Date(date));
    const id = await Crypto.randomUUID();
    const now = new Date().toISOString();

    const session: WorkoutSession = {
      id,
      userId,
      sessionDate: date,
      gymDay: gymDay.day,
      label: gymDay.label,
      completed: false,
    };

    await db.insert(workoutSessions).values({
      ...session,
      completed: false,
      createdAt: now,
      updatedAt: now,
    });

    await enqueueChange('workout_sessions', 'insert', id, {
      id, user_id: userId, session_date: date,
      gym_day: gymDay.day, label: gymDay.label,
      completed: false, created_at: now, updated_at: now,
    });

    set({ todaySession: session, isLoading: false });
  },

  startWorkout: async () => {
    const s = get().todaySession;
    if (!s || s.startedAt) return;

    const startedAt = new Date().toISOString();
    await db.update(workoutSessions)
      .set({ startedAt, updatedAt: startedAt })
      .where(eq(workoutSessions.id, s.id));

    await enqueueChange('workout_sessions', 'update', s.id, {
      id: s.id, user_id: s.userId, started_at: startedAt, updated_at: startedAt,
    });

    set((state) => ({ todaySession: state.todaySession ? { ...state.todaySession, startedAt } : null }));
  },

  completeWorkout: async () => {
    const s = get().todaySession;
    if (!s) return;

    const completedAt = new Date().toISOString();
    const durationMinutes = s.startedAt
      ? Math.round((Date.parse(completedAt) - Date.parse(s.startedAt)) / 60_000)
      : undefined;

    await db.update(workoutSessions)
      .set({ completedAt, durationMinutes, completed: true, updatedAt: completedAt })
      .where(eq(workoutSessions.id, s.id));

    await enqueueChange('workout_sessions', 'update', s.id, {
      id: s.id, user_id: s.userId,
      completed_at: completedAt, duration_minutes: durationMinutes,
      completed: true, updated_at: completedAt,
    });

    set((state) => ({
      todaySession: state.todaySession
        ? { ...state.todaySession, completedAt, durationMinutes, completed: true }
        : null,
    }));
  },
}));
