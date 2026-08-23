import { create } from 'zustand';
import { db } from '@/lib/db/client';
import { habitLogs } from '@/lib/db/schema';
import { and, eq, gte, inArray } from 'drizzle-orm';
import { enqueueChange } from '@/lib/sync/syncQueue';
import * as Crypto from 'expo-crypto';

function subtractDays(dateStr: string, n: number) {
  const d = new Date(dateStr + 'T12:00:00Z');
  d.setUTCDate(d.getUTCDate() - n);
  return d.toISOString().slice(0, 10);
}

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

// Per-habit streak (consecutive days completed)
export type HabitStreaks = Record<HabitKey, number>;

interface HabitState {
  todayHabits: HabitMap;
  weekHabits: WeekHabits;
  streaks: HabitStreaks;
  overallStreak: number;
  isLoading: boolean;
  load: (userId: string, date: string) => Promise<void>;
  loadWeek: (userId: string, dates: string[]) => Promise<void>;
  markComplete: (userId: string, habitKey: HabitKey, date: string, value?: number) => Promise<void>;
  markIncomplete: (userId: string, habitKey: HabitKey, date: string) => Promise<void>;
}

function emptyMap(): HabitMap {
  return Object.fromEntries(HABIT_KEYS.map((k) => [k, null])) as HabitMap;
}

function emptyStreaks(): HabitStreaks {
  return Object.fromEntries(HABIT_KEYS.map((k) => [k, 0])) as HabitStreaks;
}

export const useHabitStore = create<HabitState>((set, get) => ({
  todayHabits: emptyMap(),
  weekHabits: {},
  streaks: emptyStreaks(),
  overallStreak: 0,
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

    // Load today
    const todayRows = await db
      .select()
      .from(habitLogs)
      .where(and(eq(habitLogs.userId, userId), eq(habitLogs.logDate, date)));

    const map = emptyMap();
    for (const r of todayRows) {
      if (HABIT_KEYS.includes(r.habitKey as HabitKey)) {
        map[r.habitKey as HabitKey] = r as HabitLog;
      }
    }

    // Load last 60 days for streak calculation
    const cutoff = subtractDays(date, 60);
    const historyRows = await db
      .select()
      .from(habitLogs)
      .where(and(eq(habitLogs.userId, userId), gte(habitLogs.logDate, cutoff)));

    // Build per-habit per-date completion map
    const history: Record<HabitKey, Set<string>> = Object.fromEntries(
      HABIT_KEYS.map((k) => [k, new Set<string>()]),
    ) as Record<HabitKey, Set<string>>;

    for (const r of historyRows) {
      if (HABIT_KEYS.includes(r.habitKey as HabitKey) && r.completed) {
        history[r.habitKey as HabitKey].add(r.logDate);
      }
    }

    // Per-habit streak: consecutive days back from today
    const streaks = emptyStreaks();
    for (const key of HABIT_KEYS) {
      let streak = 0;
      let cursor = date;
      while (history[key].has(cursor)) {
        streak++;
        cursor = subtractDays(cursor, 1);
      }
      streaks[key] = streak;
    }

    // Overall streak: days where ALL habits were completed
    let overallStreak = 0;
    let cursor = date;
    for (let i = 0; i < 60; i++) {
      const allDone = HABIT_KEYS.every((k) => history[k].has(cursor));
      if (!allDone) break;
      overallStreak++;
      cursor = subtractDays(cursor, 1);
    }

    set({ todayHabits: map, streaks, overallStreak, isLoading: false });
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
