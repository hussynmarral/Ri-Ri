import { create } from 'zustand';
import { supabase } from '@/lib/supabase/client';

// Web override: reads and writes go to Supabase directly (no SQLite on web).

export const HABIT_KEYS = [
  'reading',
  'english',
  'turkish',
  'skincare',
  'haircare',
  'supplements',
] as const;

export type HabitKey = (typeof HABIT_KEYS)[number];

export interface HabitLog {
  id: string;
  userId: string;
  habitKey: HabitKey;
  logDate: string;
  completed: boolean;
  valueNumeric?: number;
}

type HabitMap = Record<HabitKey, HabitLog | null>;
type WeekHabits = Record<string, Partial<Record<HabitKey, boolean>>>;

interface HabitState {
  todayHabits: HabitMap;
  weekHabits: WeekHabits;
  isLoading: boolean;
  load: (userId: string, date: string) => Promise<void>;
  loadWeek: (userId: string, dates: string[]) => Promise<void>;
  markComplete: (userId: string, habitKey: HabitKey, date: string, value?: number) => Promise<void>;
  markIncomplete: (userId: string, habitKey: HabitKey, date: string) => Promise<void>;
}

function emptyMap(): HabitMap {
  return Object.fromEntries(HABIT_KEYS.map((k) => [k, null])) as HabitMap;
}

function rowToLog(r: any): HabitLog {
  return {
    id: r.id,
    userId: r.user_id,
    habitKey: r.habit_key as HabitKey,
    logDate: r.log_date,
    completed: !!r.completed,
    valueNumeric: r.value_numeric ?? undefined,
  };
}

export const useHabitStore = create<HabitState>((set, get) => ({
  todayHabits: emptyMap(),
  weekHabits: {},
  isLoading: false,

  load: async (userId, date) => {
    set({ isLoading: true });
    const { data } = await (supabase as any)
      .from('habit_logs')
      .select('id, user_id, habit_key, log_date, completed, value_numeric')
      .eq('user_id', userId)
      .eq('log_date', date);

    const map = emptyMap();
    for (const r of (data ?? [])) {
      if (HABIT_KEYS.includes(r.habit_key)) {
        map[r.habit_key as HabitKey] = rowToLog(r);
      }
    }
    set({ todayHabits: map, isLoading: false });
  },

  loadWeek: async (userId, dates) => {
    if (!dates.length) return;
    const { data } = await (supabase as any)
      .from('habit_logs')
      .select('habit_key, log_date, completed')
      .eq('user_id', userId)
      .in('log_date', dates);

    const week: WeekHabits = {};
    for (const d of dates) week[d] = {};
    for (const r of (data ?? [])) {
      if (!week[r.log_date]) week[r.log_date] = {};
      if (HABIT_KEYS.includes(r.habit_key)) {
        week[r.log_date][r.habit_key as HabitKey] = !!r.completed;
      }
    }
    set({ weekHabits: week });
  },

  markComplete: async (userId, habitKey, date, value) => {
    const existing = get().todayHabits[habitKey];
    const now = new Date().toISOString();

    if (existing) {
      await (supabase as any)
        .from('habit_logs')
        .update({ completed: true, value_numeric: value, updated_at: now })
        .eq('id', existing.id);

      set((s) => ({
        todayHabits: { ...s.todayHabits, [habitKey]: { ...existing, completed: true, valueNumeric: value } },
      }));
    } else {
      const id = crypto.randomUUID();
      const newLog: HabitLog = { id, userId, habitKey, logDate: date, completed: true, valueNumeric: value };

      await (supabase as any)
        .from('habit_logs')
        .insert({ id, user_id: userId, habit_key: habitKey, log_date: date, completed: true, value_numeric: value, created_at: now, updated_at: now });

      set((s) => ({ todayHabits: { ...s.todayHabits, [habitKey]: newLog } }));
    }
  },

  markIncomplete: async (userId, habitKey, date) => {
    const existing = get().todayHabits[habitKey];
    if (!existing) return;

    const now = new Date().toISOString();
    await (supabase as any)
      .from('habit_logs')
      .update({ completed: false, updated_at: now })
      .eq('id', existing.id);

    set((s) => ({
      todayHabits: { ...s.todayHabits, [habitKey]: { ...existing, completed: false } },
    }));
  },
}));
