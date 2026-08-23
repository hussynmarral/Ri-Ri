import { create } from 'zustand';
import { db } from '@/lib/db/client';
import { aiActionLog } from '@/lib/db/schema';
import { eq, desc } from 'drizzle-orm';
import * as Crypto from 'expo-crypto';

export interface AIActionLogEntry {
  id: string;
  userId: string;
  actionType: string;
  description: string;
  payload: string;
  reversalPayload?: string | null;
  undone: boolean;
  createdAt: string;
}

interface AIActionLogState {
  recentLogs: AIActionLogEntry[];
  isLoading: boolean;
  logActions: (userId: string, actions: { actionType: string; description: string; payload: Record<string, unknown>; reversalPayload?: Record<string, unknown> | null }[]) => Promise<void>;
  loadRecent: (userId: string) => Promise<void>;
  markUndone: (id: string) => Promise<void>;
}

export const useAIActionLogStore = create<AIActionLogState>((set, get) => ({
  recentLogs: [],
  isLoading: false,

  logActions: async (userId, actions) => {
    const now = new Date().toISOString();
    const entries: AIActionLogEntry[] = [];

    for (const a of actions) {
      const id = await Crypto.randomUUID();
      const reversalJson = a.reversalPayload ? JSON.stringify(a.reversalPayload) : null;
      const entry: AIActionLogEntry = {
        id, userId,
        actionType: a.actionType,
        description: a.description,
        payload: JSON.stringify(a.payload),
        reversalPayload: reversalJson,
        undone: false,
        createdAt: now,
      };
      await db.insert(aiActionLog).values({
        id, userId,
        actionType: a.actionType,
        description: a.description,
        payload: JSON.stringify(a.payload),
        reversalPayload: reversalJson,
        undone: false,
        createdAt: now,
      });
      entries.push(entry);
    }

    set((s) => ({
      recentLogs: [...entries, ...s.recentLogs].slice(0, 100),
    }));
  },

  loadRecent: async (userId) => {
    set({ isLoading: true });
    try {
      const rows = await db
        .select()
        .from(aiActionLog)
        .where(eq(aiActionLog.userId, userId))
        .orderBy(desc(aiActionLog.createdAt))
        .limit(100);
      set({ recentLogs: rows as AIActionLogEntry[] });
    } finally {
      set({ isLoading: false });
    }
  },

  markUndone: async (id) => {
    await db.update(aiActionLog).set({ undone: true }).where(eq(aiActionLog.id, id));
    set((s) => ({
      recentLogs: s.recentLogs.map((l) => l.id === id ? { ...l, undone: true } : l),
    }));
  },
}));
