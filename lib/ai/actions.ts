import * as Crypto from 'expo-crypto';
import { eq } from 'drizzle-orm';

import { db } from '@/lib/db/client';
import { routineTemplates, scheduleInstances, scheduleOverrides } from '@/lib/db/schema';
import { enqueueChange } from '@/lib/sync/syncQueue';
import type { AIAction } from '@/types';

export type ActionResult = { success: boolean; message: string };

export async function executeAIAction(action: AIAction, userId: string): Promise<ActionResult> {
  try {
    switch (action.type) {
      case 'add_event':
        return await addEvent(action.payload, userId);
      case 'move_task':
      case 'change_schedule':
        return await changeSchedule(action.payload, userId);
      case 'change_recurring':
        return await changeRecurring(action.payload, userId);
      case 'delete_recurring':
        return await deleteRecurring(action.payload, userId);
      case 'bulk_reschedule':
        return await bulkReschedule(action.payload, userId);
      default:
        return { success: false, message: `Unknown action type: ${action.type}` };
    }
  } catch (e) {
    return { success: false, message: e instanceof Error ? e.message : String(e) };
  }
}

async function addEvent(
  payload: Record<string, unknown>,
  userId: string,
): Promise<ActionResult> {
  const id = await Crypto.randomUUID();
  const now = new Date().toISOString();
  const date = payload.date as string;
  const startTime = payload.startTime as string;
  const endTime = payload.endTime as string;
  const title = payload.title as string;

  if (!date || !startTime || !endTime || !title) {
    return { success: false, message: 'Missing required fields for add_event' };
  }

  await db.insert(scheduleOverrides).values({
    id,
    userId,
    templateId: null,
    overrideDate: date,
    isCancelled: false,
    replacementStart: startTime,
    replacementEnd: endTime,
    replacementTitle: title,
    reason: 'AI command',
    createdAt: now,
    updatedAt: now,
  });

  await enqueueChange('schedule_overrides', 'insert', id, {
    id, user_id: userId,
    template_id: null,
    override_date: date,
    is_cancelled: false,
    replacement_start: startTime,
    replacement_end: endTime,
    replacement_title: title,
    reason: 'AI command',
    created_at: now, updated_at: now,
  });

  return { success: true, message: `Added "${title}" on ${date}` };
}

async function changeSchedule(
  payload: Record<string, unknown>,
  userId: string,
): Promise<ActionResult> {
  const blockId = payload.blockId as string;
  if (!blockId) return { success: false, message: 'blockId is required' };

  const block = await db.select().from(scheduleInstances).where(eq(scheduleInstances.id, blockId));
  if (!block.length) return { success: false, message: 'Block not found' };

  const b = block[0];
  const newStart = (payload.newStartTime as string) ?? b.scheduledStart;
  const newEnd = (payload.newEndTime as string) ?? b.scheduledEnd;
  const newTitle = (payload.newTitle as string) ?? b.title;
  const now = new Date().toISOString();

  // Upsert a schedule override for this block
  const existing = await db.select().from(scheduleOverrides)
    .where(eq(scheduleOverrides.templateId, b.templateId ?? ''));

  if (existing.length && b.templateId) {
    const ovId = existing[0].id;
    await db.update(scheduleOverrides).set({
      replacementStart: newStart,
      replacementEnd: newEnd,
      replacementTitle: newTitle,
      updatedAt: now,
    }).where(eq(scheduleOverrides.id, ovId));

    await enqueueChange('schedule_overrides', 'update', ovId, {
      id: ovId, user_id: userId,
      replacement_start: newStart, replacement_end: newEnd,
      replacement_title: newTitle, updated_at: now,
    });
  } else {
    const ovId = await Crypto.randomUUID();
    await db.insert(scheduleOverrides).values({
      id: ovId,
      userId,
      templateId: b.templateId ?? null,
      overrideDate: b.instanceDate,
      isCancelled: false,
      replacementStart: newStart,
      replacementEnd: newEnd,
      replacementTitle: newTitle,
      reason: 'AI command',
      createdAt: now,
      updatedAt: now,
    });

    await enqueueChange('schedule_overrides', 'insert', ovId, {
      id: ovId, user_id: userId,
      template_id: b.templateId, override_date: b.instanceDate,
      is_cancelled: false,
      replacement_start: newStart, replacement_end: newEnd,
      replacement_title: newTitle, reason: 'AI command',
      created_at: now, updated_at: now,
    });
  }

  // Also update the instance directly so today's view reflects immediately
  await db.update(scheduleInstances).set({
    scheduledStart: newStart,
    scheduledEnd: newEnd,
    title: newTitle,
    updatedAt: now,
  }).where(eq(scheduleInstances.id, blockId));

  await enqueueChange('schedule_instances', 'update', blockId, {
    id: blockId, user_id: userId,
    scheduled_start: newStart, scheduled_end: newEnd,
    title: newTitle, updated_at: now,
  });

  return { success: true, message: `Updated "${newTitle}"` };
}

async function changeRecurring(
  payload: Record<string, unknown>,
  userId: string,
): Promise<ActionResult> {
  const templateId = payload.templateId as string;
  if (!templateId) return { success: false, message: 'templateId is required' };

  const now = new Date().toISOString();

  const patch: {
    updatedAt: string;
    startHour?: number;
    startMinute?: number;
    durationMinutes?: number;
    title?: string;
  } = { updatedAt: now };

  if (typeof payload.newStartHour === 'number') patch.startHour = payload.newStartHour;
  if (typeof payload.newStartMinute === 'number') patch.startMinute = payload.newStartMinute;
  if (typeof payload.newDurationMinutes === 'number') patch.durationMinutes = payload.newDurationMinutes;
  if (typeof payload.newTitle === 'string') patch.title = payload.newTitle;

  await db.update(routineTemplates).set(patch)
    .where(eq(routineTemplates.id, templateId));

  await enqueueChange('routine_templates', 'update', templateId, {
    id: templateId, user_id: userId,
    start_hour: payload.newStartHour, start_minute: payload.newStartMinute,
    duration_minutes: payload.newDurationMinutes, title: payload.newTitle,
    updated_at: now,
  });

  return { success: true, message: 'Recurring block updated' };
}

async function deleteRecurring(
  payload: Record<string, unknown>,
  userId: string,
): Promise<ActionResult> {
  const templateId = payload.templateId as string;
  if (!templateId) return { success: false, message: 'templateId is required' };

  const now = new Date().toISOString();
  await db.update(routineTemplates)
    .set({ isActive: false, updatedAt: now })
    .where(eq(routineTemplates.id, templateId));

  await enqueueChange('routine_templates', 'update', templateId, {
    id: templateId, user_id: userId, is_active: false, updated_at: now,
  });

  return { success: true, message: 'Recurring block deactivated' };
}

async function bulkReschedule(
  payload: Record<string, unknown>,
  userId: string,
): Promise<ActionResult> {
  const changes = payload.changes as Array<{ blockId: string; newStartTime: string; newEndTime: string }>;
  if (!Array.isArray(changes) || changes.length === 0) {
    return { success: false, message: 'No changes provided' };
  }

  for (const change of changes) {
    await changeSchedule(
      { blockId: change.blockId, newStartTime: change.newStartTime, newEndTime: change.newEndTime },
      userId,
    );
  }

  return { success: true, message: `Rescheduled ${changes.length} blocks` };
}
