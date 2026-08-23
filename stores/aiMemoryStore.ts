import { create } from 'zustand';
import { db } from '@/lib/db/client';
import { aiMemories } from '@/lib/db/schema';
import { eq, desc } from 'drizzle-orm';
import { enqueueChange } from '@/lib/sync/syncQueue';
import * as Crypto from 'expo-crypto';

export const MEMORY_CATEGORIES = ['general', 'scheduling', 'work', 'personal', 'habits'] as const;
export type MemoryCategory = (typeof MEMORY_CATEGORIES)[number];

export interface AIMemory {
  id: string;
  userId: string;
  content: string;
  category: string;
  createdAt: string;
  updatedAt: string;
}

interface AIMemoryState {
  memories: AIMemory[];
  isLoading: boolean;
  load: (userId: string) => Promise<void>;
  addMemory: (userId: string, content: string, category?: MemoryCategory) => Promise<AIMemory>;
  updateMemory: (id: string, content: string) => Promise<void>;
  deleteMemory: (id: string) => Promise<void>;
}

export const useAIMemoryStore = create<AIMemoryState>((set, get) => ({
  memories: [],
  isLoading: false,

  load: async (userId) => {
    set({ isLoading: true });
    try {
      const rows = await db
        .select()
        .from(aiMemories)
        .where(eq(aiMemories.userId, userId))
        .orderBy(desc(aiMemories.createdAt));
      set({ memories: rows as AIMemory[] });
    } finally {
      set({ isLoading: false });
    }
  },

  addMemory: async (userId, content, category = 'general') => {
    const id = await Crypto.randomUUID();
    const now = new Date().toISOString();
    const memory: AIMemory = { id, userId, content, category, createdAt: now, updatedAt: now };

    await db.insert(aiMemories).values({ id, userId, content, category, createdAt: now, updatedAt: now });
    await enqueueChange('ai_memories', 'insert', id, {
      id, user_id: userId, content, category, created_at: now, updated_at: now,
    });

    set((s) => ({ memories: [memory, ...s.memories] }));
    return memory;
  },

  updateMemory: async (id, content) => {
    const now = new Date().toISOString();
    await db.update(aiMemories).set({ content, updatedAt: now }).where(eq(aiMemories.id, id));
    await enqueueChange('ai_memories', 'update', id, { id, content, updated_at: now });
    set((s) => ({
      memories: s.memories.map((m) => m.id === id ? { ...m, content, updatedAt: now } : m),
    }));
  },

  deleteMemory: async (id) => {
    await db.delete(aiMemories).where(eq(aiMemories.id, id));
    await enqueueChange('ai_memories', 'delete', id, { id });
    set((s) => ({ memories: s.memories.filter((m) => m.id !== id) }));
  },
}));
