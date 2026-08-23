import { create } from 'zustand';
import { supabase } from '@/lib/supabase/client';

// Web override: reads and writes go to Supabase directly (no SQLite on web).

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

export const useWaterStore = create<WaterState>((set, get) => ({
  todayLogs: [],
  todayTotalMl: 0,
  isLoading: false,

  load: async (userId, date) => {
    set({ isLoading: true });
    const { data } = await (supabase as any)
      .from('water_logs')
      .select('id, user_id, logged_at, amount_ml')
      .eq('user_id', userId)
      .gte('logged_at', `${date}T00:00:00.000Z`)
      .lt('logged_at', `${date}T23:59:59.999Z`);

    const logs: WaterLog[] = (data ?? []).map((r: any) => ({
      id: r.id,
      userId: r.user_id,
      loggedAt: r.logged_at,
      amountMl: r.amount_ml,
    }));

    const total = logs.reduce((acc, l) => acc + l.amountMl, 0);
    set({ todayLogs: logs, todayTotalMl: total, isLoading: false });
  },

  addLog: async (userId, amountMl) => {
    const loggedAt = new Date().toISOString();
    const now = loggedAt;
    const id = crypto.randomUUID();

    const { error } = await (supabase as any)
      .from('water_logs')
      .insert({ id, user_id: userId, logged_at: loggedAt, amount_ml: amountMl, created_at: now, updated_at: now });

    if (error) return;

    const newLog: WaterLog = { id, userId, loggedAt, amountMl };
    set((s) => ({
      todayLogs: [...s.todayLogs, newLog],
      todayTotalMl: s.todayTotalMl + amountMl,
    }));
  },

  deleteLog: async (id) => {
    const log = get().todayLogs.find((l) => l.id === id);
    if (!log) return;

    await (supabase as any).from('water_logs').delete().eq('id', id);

    set((s) => ({
      todayLogs: s.todayLogs.filter((l) => l.id !== id),
      todayTotalMl: s.todayTotalMl - log.amountMl,
    }));
  },
}));
