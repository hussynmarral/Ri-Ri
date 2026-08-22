import { create } from 'zustand';
import { db } from '@/lib/db/client';
import { waterLogs } from '@/lib/db/schema';
import { eq, gte, sum } from 'drizzle-orm';
import { enqueueChange } from '@/lib/sync/syncQueue';
import * as Crypto from 'expo-crypto';

export interface WaterLog {
  id: string;
  userId: string;
  loggedAt: string;
  amountMl: number;
}

interface WaterState {
  todayLogs: WaterLog[];
  todayTotalMl: number;
  isLoading: boolean;
  load: (userId: string, date: string) => Promise<void>;
  addLog: (userId: string, amountMl: number) => Promise<void>;
  deleteLog: (id: string) => Promise<void>;
}

function todayStart(date: string) {
  return `${date}T00:00:00.000Z`;
}

export const useWaterStore = create<WaterState>((set, get) => ({
  todayLogs: [],
  todayTotalMl: 0,
  isLoading: false,

  load: async (userId, date) => {
    set({ isLoading: true });
    const rows = await db
      .select()
      .from(waterLogs)
      .where(eq(waterLogs.userId, userId));

    const dayLogs = rows.filter((r) => r.loggedAt.startsWith(date));
    const total = dayLogs.reduce((acc, r) => acc + r.amountMl, 0);
    set({ todayLogs: dayLogs as WaterLog[], todayTotalMl: total, isLoading: false });
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
