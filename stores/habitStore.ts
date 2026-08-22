import { create } from 'zustand';
import { db } from '@/lib/db/client';
import { habitLogs } from '@/lib/db/schema';
import { and, eq, inArray } from 'drizzle-orm';
import { enqueueChange } from '@/lib/sync/syncQueue';
import * as Crypto from 'expo-crypto';

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

// weekHabits[date][habitKey] = completed boolean
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

export const useHabitStore = create<HabitState>((set, get) => ({
  todayHabits: emptyMap(),
  weekHabits: {},
  isLoading: false,

  loadWeek: async (userId, dates) => {
    if (dates.length === 0) return;
    const rows = await db
      .select()
      .from(habitLogs)
      .where(and(eq(habitLogs.userId, userId), inArray(habitLogs.logDate, dates)));

    const week: WeekHabits = {};
    for (const date of dates) week[date] = {};
    for (const r of rows) {
      if (!week[r.logDate]) week[r.logDate] = {};
      if (HABIT_KEYS.includes(r.habitKey as HabitKey)) {
        week[r.logDate][r.habitKey as HabitKey] = !!r.completed;
      }
    }
    set({ weekHabits: week });
  },

  load: async (userId, date) => {
    set({ isLoading: true });
    const rows = await db
      .select()
      .from(habitLogs)
      .where(and(eq(habitLogs.userId, userId), eq(habitLogs.logDate, date)));

    const map = emptyMap();
    for (const r of rows) {
      if (HABIT_KEYS.includes(r.habitKey as HabitKey)) {
        map[r.habitKey as HabitKey] = r as HabitLog;
      }
    }
    set({ todayHabits: map, isLoading: false });
  },

  markComplete: async (userId, habitKey, date, value) => {
    const existing = get().todayHabits[habitKey];
    const now = new Date().toISOString();

    if (existing) {
      await db.update(habitLogs)
        .set({ completed: true, valueNumeric: value, updatedAt: now })
        .where(eq(habitLogs.id, existing.id));

      await enqueueChange('habit_logs', 'update', existing.id, {
        id: existing.id, user_id: userId,
        completed: true, value_numeric: value, updated_at: now,
      });

      set((s) => ({
        todayHabits: { ...s.todayHabits, [habitKey]: { ...existing, completed: true, valueNumeric: value } },
      }));
    } else {
      const id = await Crypto.randomUUID();
      const newLog: HabitLog = { id, userId, habitKey, logDate: date, completed: true, valueNumeric: value };

      await db.insert(habitLogs).values({
        id, userId, habitKey, logDate: date,
        completed: true, valueNumeric: value,
        createdAt: now, updatedAt: now,
      });

      await enqueueChange('habit_logs', 'insert', id, {
        id, user_id: userId, habit_key: habitKey, log_date: date,
        completed: true, value_numeric: value, created_at: now, updated_at: now,
      });

      set((s) => ({ todayHabits: { ...s.todayHabits, [habitKey]: newLog } }));
    }
  },

  markIncomplete: async (userId, habitKey, date) => {
    const existing = get().todayHabits[habitKey];
    if (!existing) return;

    const now = new Date().toISOString();
    await db.update(habitLogs)
      .set({ completed: false, updatedAt: now })
      .where(eq(habitLogs.id, existing.id));

    await enqueueChange('habit_logs', 'update', existing.id, {
      id: existing.id, user_id: userId, completed: false, updated_at: now,
    });

    set((s) => ({
      todayHabits: { ...s.todayHabits, [habitKey]: { ...existing, completed: false } },
    }));
  },
}));
