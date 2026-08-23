import { create } from 'zustand';
import { db } from '@/lib/db/client';
import { workoutSessions, workoutSets } from '@/lib/db/schema';
import { and, desc, eq } from 'drizzle-orm';
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

export interface WorkoutSet {
  id: string;
  sessionId: string;
  userId: string;
  exercise: string;
  setNumber: number;
  reps?: number;
  weightKg?: number;
  createdAt: string;
}

export type PRMap = Record<string, { reps: number; weightKg: number; date: string }>;

interface WorkoutState {
  todaySession: WorkoutSession | null;
  sessionHistory: WorkoutSession[];
  todaySets: WorkoutSet[];
  prs: PRMap;
  isLoading: boolean;
  load: (userId: string, date: string) => Promise<void>;
  loadHistory: (userId: string) => Promise<void>;
  loadTodaySets: (sessionId: string, userId: string) => Promise<void>;
  startWorkout: () => Promise<void>;
  completeWorkout: () => Promise<void>;
  logSet: (exercise: string, reps: number, weightKg: number) => Promise<void>;
}

export const useWorkoutStore = create<WorkoutState>((set, get) => ({
  todaySession: null,
  sessionHistory: [],
  todaySets: [],
  prs: {},
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
      await get().loadTodaySets(existing.id, userId);
      return;
    }

    const gymDay = getGymDayForDate(new Date(date));
    const id = await Crypto.randomUUID();
    const now = new Date().toISOString();

    const session: WorkoutSession = {
      id, userId, sessionDate: date,
      gymDay: gymDay.day, label: gymDay.label, completed: false,
    };

    await db.insert(workoutSessions).values({
      ...session, completed: false, createdAt: now, updatedAt: now,
    });

    await enqueueChange('workout_sessions', 'insert', id, {
      id, user_id: userId, session_date: date,
      gym_day: gymDay.day, label: gymDay.label,
      completed: false, created_at: now, updated_at: now,
    });

    set({ todaySession: session, isLoading: false });
  },

  loadHistory: async (userId) => {
    const rows = await db
      .select()
      .from(workoutSessions)
      .where(and(eq(workoutSessions.userId, userId), eq(workoutSessions.completed, true)))
      .orderBy(desc(workoutSessions.sessionDate))
      .limit(10);

    // Build PR map from all sets
    const allSets = await db.select().from(workoutSets).where(eq(workoutSets.userId, userId));
    const prs: PRMap = {};
    for (const s of allSets) {
      if (s.reps == null || s.weightKg == null) continue;
      const existing = prs[s.exercise];
      const score = s.weightKg * s.reps;
      const existingScore = existing ? existing.weightKg * existing.reps : 0;
      if (score > existingScore) {
        const session = rows.find((r) => r.id === s.sessionId);
        prs[s.exercise] = {
          reps: s.reps,
          weightKg: s.weightKg,
          date: session?.sessionDate ?? '',
        };
      }
    }

    set({ sessionHistory: rows as WorkoutSession[], prs });
  },

  loadTodaySets: async (sessionId, userId) => {
    const rows = await db
      .select()
      .from(workoutSets)
      .where(and(eq(workoutSets.sessionId, sessionId), eq(workoutSets.userId, userId)));
    set({ todaySets: rows as WorkoutSet[] });
  },

  startWorkout: async () => {
    const s = get().todaySession;
    if (!s || s.startedAt) return;

    const startedAt = new Date().toISOString();
    await db.update(workoutSessions).set({ startedAt, updatedAt: startedAt }).where(eq(workoutSessions.id, s.id));
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

  logSet: async (exercise, reps, weightKg) => {
    const s = get().todaySession;
    if (!s) return;

    const existingSets = get().todaySets.filter((st) => st.exercise === exercise);
    const setNumber = existingSets.length + 1;
    const id = await Crypto.randomUUID();
    const now = new Date().toISOString();

    const newSet: WorkoutSet = {
      id, sessionId: s.id, userId: s.userId,
      exercise, setNumber, reps, weightKg, createdAt: now,
    };

    await db.insert(workoutSets).values(newSet);

    set((state) => ({ todaySets: [...state.todaySets, newSet] }));

    // Update PRs
    const { prs } = get();
    const existing = prs[exercise];
    const score = weightKg * reps;
    const existingScore = existing ? existing.weightKg * existing.reps : 0;
    if (score > existingScore) {
      set({ prs: { ...prs, [exercise]: { reps, weightKg, date: s.sessionDate } } });
    }
  },
}));
