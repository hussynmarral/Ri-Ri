import { create } from 'zustand';
import { supabase } from '@/lib/supabase/client';
import { getGymDayForDate } from '@/constants/gym';

// Web override: reads and writes go to Supabase directly (no SQLite on web).

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

function rowToSession(r: any): WorkoutSession {
  return {
    id: r.id,
    userId: r.user_id,
    sessionDate: r.session_date,
    gymDay: r.gym_day,
    label: r.label,
    startedAt: r.started_at ?? undefined,
    completedAt: r.completed_at ?? undefined,
    durationMinutes: r.duration_minutes ?? undefined,
    completed: !!r.completed,
    notes: r.notes ?? undefined,
  };
}

export const useWorkoutStore = create<WorkoutState>((set, get) => ({
  todaySession: null,
  isLoading: false,

  load: async (userId, date) => {
    set({ isLoading: true });

    const { data } = await (supabase as any)
      .from('workout_sessions')
      .select('*')
      .eq('user_id', userId)
      .eq('session_date', date)
      .maybeSingle();

    if (data) {
      set({ todaySession: rowToSession(data), isLoading: false });
      return;
    }

    // Auto-create today's session
    const gymDay = getGymDayForDate(new Date(date));
    const id = crypto.randomUUID();
    const now = new Date().toISOString();

    const session: WorkoutSession = {
      id,
      userId,
      sessionDate: date,
      gymDay: gymDay.day,
      label: gymDay.label,
      completed: false,
    };

    await (supabase as any).from('workout_sessions').insert({
      id,
      user_id: userId,
      session_date: date,
      gym_day: gymDay.day,
      label: gymDay.label,
      completed: false,
      created_at: now,
      updated_at: now,
    });

    set({ todaySession: session, isLoading: false });
  },

  startWorkout: async () => {
    const s = get().todaySession;
    if (!s || s.startedAt) return;

    const startedAt = new Date().toISOString();
    await (supabase as any)
      .from('workout_sessions')
      .update({ started_at: startedAt, updated_at: startedAt })
      .eq('id', s.id);

    set((state) => ({
      todaySession: state.todaySession ? { ...state.todaySession, startedAt } : null,
    }));
  },

  completeWorkout: async () => {
    const s = get().todaySession;
    if (!s) return;

    const completedAt = new Date().toISOString();
    const durationMinutes = s.startedAt
      ? Math.round((Date.parse(completedAt) - Date.parse(s.startedAt)) / 60_000)
      : undefined;

    await (supabase as any)
      .from('workout_sessions')
      .update({ completed_at: completedAt, duration_minutes: durationMinutes, completed: true, updated_at: completedAt })
      .eq('id', s.id);

    set((state) => ({
      todaySession: state.todaySession
        ? { ...state.todaySession, completedAt, durationMinutes, completed: true }
        : null,
    }));
  },
}));
