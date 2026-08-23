import { create } from 'zustand';
import { db } from '@/lib/db/client';
import { waterLogs } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { enqueueChange } from '@/lib/sync/syncQueue';
import * as Crypto from 'expo-crypto';

export interface WaterLog {
  id: string;
  userId: string;
  loggedAt: string;
  amountMl: number;
}

// ml per day considered a "good" day (goal for streak counting)
const STREAK_GOAL_ML = 2000;

function isoDate(d: Date) {
  return d.toISOString().slice(0, 10);
}

function subtractDays(dateStr: string, n: number) {
  const d = new Date(dateStr + 'T12:00:00Z');
  d.setUTCDate(d.getUTCDate() - n);
  return isoDate(d);
}

interface WaterState {
  todayLogs: WaterLog[];
  todayTotalMl: number;
  streak: number;
  weekHistory: { date: string; totalMl: number }[];
  isLoading: boolean;
  load: (userId: string, date: string) => Promise<void>;
  addLog: (userId: string, amountMl: number) => Promise<void>;
  deleteLog: (id: string) => Promise<void>;
}

export const useWaterStore = create<WaterState>((set, get) => ({
  todayLogs: [],
  todayTotalMl: 0,
  streak: 0,
  weekHistory: [],
  isLoading: false,

  load: async (userId, date) => {
    set({ isLoading: true });
    const rows = await db.select().from(waterLogs).where(eq(waterLogs.userId, userId));

    function toLocalDate(iso: string) {
      const d = new Date(iso);
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    }
    const dayLogs = rows.filter((r) => toLocalDate(r.loggedAt) === date);
    const total = dayLogs.reduce((acc, r) => acc + r.amountMl, 0);

    // Build per-date totals from all rows (using local date, not UTC)
    const byDate: Record<string, number> = {};
    for (const r of rows) {
      const d = toLocalDate(r.loggedAt);
      byDate[d] = (byDate[d] ?? 0) + r.amountMl;
    }

    // Streak: count consecutive days backwards from today where goal was met
    let streak = 0;
    let cursor = date;
    // today counts if we've already met goal
    while (true) {
      const ml = byDate[cursor] ?? 0;
      if (ml < STREAK_GOAL_ML) break;
      streak++;
      cursor = subtractDays(cursor, 1);
    }

    // Week history: last 7 days
    const weekHistory = Array.from({ length: 7 }, (_, i) => {
      const d = subtractDays(date, 6 - i);
      return { date: d, totalMl: byDate[d] ?? 0 };
    });

    set({ todayLogs: dayLogs as WaterLog[], todayTotalMl: total, streak, weekHistory, isLoading: false });
  },

  addLog: async (userId, amountMl) => {
    const id = await Crypto.randomUUID();
    const loggedAt = new Date().toISOString();
    const now = loggedAt;

    const newLog: WaterLog = { id, userId, loggedAt, amountMl };

    await db.insert(waterLogs).values({ id, userId, loggedAt, amountMl, createdAt: now, updatedAt: now });
    await enqueueChange('water_logs', 'insert', id, {
      id, user_id: userId, logged_at: loggedAt, amount_ml: amountMl,
      created_at: now, updated_at: now,
    });

    set((s) => ({
      todayLogs: [...s.todayLogs, newLog],
      todayTotalMl: s.todayTotalMl + amountMl,
    }));
  },

  deleteLog: async (id) => {
    const log = get().todayLogs.find((l) => l.id === id);
    if (!log) return;

    await db.delete(waterLogs).where(eq(waterLogs.id, id));
    await enqueueChange('water_logs', 'delete', id, { id });

    set((s) => ({
      todayLogs: s.todayLogs.filter((l) => l.id !== id),
      todayTotalMl: s.todayTotalMl - log.amountMl,
    }));
  },
}));
