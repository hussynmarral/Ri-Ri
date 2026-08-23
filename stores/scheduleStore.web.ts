import { create } from 'zustand';
import { supabase } from '@/lib/supabase/client';
import { generateDayInstances } from '@/lib/scheduler/generateDay';
import { isCurrentBlock, isUpcoming } from '@/lib/scheduler/engine';
import type { ScheduleBlock, CompletionStatus } from '@/types';

// Web override: all reads and writes go directly to Supabase (no SQLite).
// Metro auto-selects this file over scheduleStore.ts when bundling for web.

interface ScheduleState {
  todayBlocks: ScheduleBlock[];
  isLoading: boolean;
  currentBlock: ScheduleBlock | null;
  nextBlock: ScheduleBlock | null;
  load: (userId: string, date: string) => Promise<void>;
  startBlock: (id: string) => Promise<void>;
  completeBlock: (id: string, completionPercent?: number) => Promise<void>;
  skipBlock: (id: string) => Promise<void>;
  refreshCurrent: () => void;
}

function findCurrentAndNext(blocks: ScheduleBlock[]): { currentBlock: ScheduleBlock | null; nextBlock: ScheduleBlock | null } {
  const sorted = [...blocks].sort((a, b) => a.scheduledStart.localeCompare(b.scheduledStart));
  const currentBlock = sorted.find(isCurrentBlock) ?? null;
  const nextBlock = sorted.find((b) => isUpcoming(b) && (!currentBlock || b.id !== currentBlock.id)) ?? null;
  return { currentBlock, nextBlock };
}

export const useScheduleStore = create<ScheduleState>((set, get) => ({
  todayBlocks: [],
  isLoading: false,
  currentBlock: null,
  nextBlock: null,

  load: async (userId, date) => {
    set({ isLoading: true });
    const blocks = await generateDayInstances(userId, date);
    set({ todayBlocks: blocks, isLoading: false, ...findCurrentAndNext(blocks) });
  },

  startBlock: async (id) => {
    const block = get().todayBlocks.find((b) => b.id === id);
    if (!block) return;

    const now = new Date().toISOString();
    const latenessMinutes = Math.max(
      0,
      Math.round((Date.now() - new Date(block.scheduledStart).getTime()) / 60_000),
    );

    await (supabase as any)
      .from('schedule_instances')
      .update({ status: 'in_progress', actual_start: now, lateness_minutes: latenessMinutes, updated_at: now })
      .eq('id', id);

    set((s) => {
      const updated = s.todayBlocks.map((b) =>
        b.id === id ? { ...b, status: 'in_progress' as CompletionStatus, actualStart: now, latenessMinutes } : b,
      );
      return { todayBlocks: updated, ...findCurrentAndNext(updated) };
    });
  },

  completeBlock: async (id, completionPercent = 100) => {
    const now = new Date().toISOString();

    await (supabase as any)
      .from('schedule_instances')
      .update({ status: 'completed', actual_end: now, completion_percent: completionPercent, updated_at: now })
      .eq('id', id);

    set((s) => {
      const updated = s.todayBlocks.map((b) =>
        b.id === id ? { ...b, status: 'completed' as CompletionStatus, actualEnd: now, completionPercent } : b,
      );
      return { todayBlocks: updated, ...findCurrentAndNext(updated) };
    });
  },

  skipBlock: async (id) => {
    const now = new Date().toISOString();

    await (supabase as any)
      .from('schedule_instances')
      .update({ status: 'skipped', updated_at: now })
      .eq('id', id);

    set((s) => {
      const updated = s.todayBlocks.map((b) =>
        b.id === id ? { ...b, status: 'skipped' as CompletionStatus } : b,
      );
      return { todayBlocks: updated, ...findCurrentAndNext(updated) };
    });
  },

  refreshCurrent: () => {
    const { todayBlocks } = get();
    set(findCurrentAndNext(todayBlocks));
  },
}));
