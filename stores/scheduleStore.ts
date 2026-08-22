import { create } from 'zustand';
import { db } from '@/lib/db/client';
import { scheduleInstances } from '@/lib/db/schema';
import { and, eq } from 'drizzle-orm';
import { enqueueChange } from '@/lib/sync/syncQueue';
import type { ScheduleBlock, CompletionStatus } from '@/types';

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

function findCurrentAndNext(blocks: ScheduleBlock[]) {
  const now = new Date();
  let current: ScheduleBlock | null = null;
  let next: ScheduleBlock | null = null;

  for (const b of blocks) {
    const start = new Date(b.scheduledStart);
    const end = new Date(b.scheduledEnd);

    if (b.status === 'in_progress') {
      current = b;
      continue;
    }
    if (!current && now >= start && now < end && b.status === 'pending') {
      current = b;
      continue;
    }
    if (!next && start > now && b.status === 'pending') {
      next = b;
    }
  }

  return { current, next };
}

export const useScheduleStore = create<ScheduleState>((set, get) => ({
  todayBlocks: [],
  isLoading: false,
  currentBlock: null,
  nextBlock: null,

  load: async (userId, date) => {
    set({ isLoading: true });
    const rows = await db
      .select()
      .from(scheduleInstances)
      .where(and(eq(scheduleInstances.userId, userId), eq(scheduleInstances.instanceDate, date)));

    const blocks: ScheduleBlock[] = rows.map((r) => ({
      id: r.id,
      userId: r.userId,
      instanceDate: r.instanceDate,
      category: r.category as ScheduleBlock['category'],
      title: r.title,
      scheduledStart: r.scheduledStart,
      scheduledEnd: r.scheduledEnd,
      actualStart: r.actualStart,
      actualEnd: r.actualEnd,
      status: r.status as CompletionStatus,
      isFlexWindow: !!r.isFlexWindow,
      latenessMinutes: r.latenessMinutes,
      completionPercent: r.completionPercent,
      notes: r.notes,
      templateId: r.templateId,
      overrideId: r.overrideId,
    }));

    const { current, next } = findCurrentAndNext(blocks);
    set({ todayBlocks: blocks, currentBlock: current, nextBlock: next, isLoading: false });
  },

  startBlock: async (id) => {
    const now = new Date().toISOString();
    const block = get().todayBlocks.find((b) => b.id === id);
    if (!block) return;

    const scheduledStart = new Date(block.scheduledStart);
    const actualStart = new Date();
    const latenessMinutes = Math.max(
      0,
      Math.round((actualStart.getTime() - scheduledStart.getTime()) / 60_000),
    );

    await db.update(scheduleInstances)
      .set({ status: 'in_progress', actualStart: now, latenessMinutes, updatedAt: now })
      .where(eq(scheduleInstances.id, id));

    await enqueueChange('schedule_instances', 'update', id, {
      id, user_id: block.userId ?? '',
      status: 'in_progress', actual_start: now,
      lateness_minutes: latenessMinutes, updated_at: now,
    });

    set((s) => {
      const updated = s.todayBlocks.map((b) =>
        b.id === id ? { ...b, status: 'in_progress' as CompletionStatus, actualStart: now, latenessMinutes } : b
      );
      const { current, next } = findCurrentAndNext(updated);
      return { todayBlocks: updated, currentBlock: current, nextBlock: next };
    });
  },

  completeBlock: async (id, completionPercent = 100) => {
    const now = new Date().toISOString();

    await db.update(scheduleInstances)
      .set({ status: 'completed', actualEnd: now, completionPercent, updatedAt: now })
      .where(eq(scheduleInstances.id, id));

    const block = get().todayBlocks.find((b) => b.id === id);
    if (block) {
      await enqueueChange('schedule_instances', 'update', id, {
        id, user_id: block.userId,
        status: 'completed', actual_end: now,
        completion_percent: completionPercent, updated_at: now,
      });
    }

    set((s) => {
      const updated = s.todayBlocks.map((b) =>
        b.id === id ? { ...b, status: 'completed' as CompletionStatus, actualEnd: now, completionPercent } : b
      );
      const { current, next } = findCurrentAndNext(updated);
      return { todayBlocks: updated, currentBlock: current, nextBlock: next };
    });
  },

  skipBlock: async (id) => {
    const now = new Date().toISOString();
    const block = get().todayBlocks.find((b) => b.id === id);
    if (!block) return;

    await db.update(scheduleInstances)
      .set({ status: 'skipped', updatedAt: now })
      .where(eq(scheduleInstances.id, id));

    await enqueueChange('schedule_instances', 'update', id, {
      id, user_id: block.userId,
      status: 'skipped', updated_at: now,
    });

    set((s) => {
      const updated = s.todayBlocks.map((b) =>
        b.id === id ? { ...b, status: 'skipped' as CompletionStatus } : b
      );
      const { current, next } = findCurrentAndNext(updated);
      return { todayBlocks: updated, currentBlock: current, nextBlock: next };
    });
  },

  refreshCurrent: () => {
    const { todayBlocks } = get();
    const { current, next } = findCurrentAndNext(todayBlocks);
    set({ currentBlock: current, nextBlock: next });
  },
}));
