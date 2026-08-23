import { and, eq } from 'drizzle-orm';

import { db } from '@/lib/db/client';
import { routineTemplates, scheduleInstances } from '@/lib/db/schema';
import type { AIAction } from '@/types';

export interface ValidationResult {
  valid: boolean;
  reason?: string;
}

// ─── Time helpers ─────────────────────────────────────────────────────────────

// "HH:MM" → minutes since noon (12:00 = 0, 00:00 = 720, 05:00 = 1020)
// This linearises the 12:00–05:00 day window for correct overlap math.
function toMinSinceNoon(time: string): number {
  const [h, m] = time.split(':').map(Number);
  const total = h * 60 + m;
  return total >= 12 * 60 ? total - 12 * 60 : total + 12 * 60;
}

function isValidTimeString(time: string): boolean {
  if (!/^\d{2}:\d{2}$/.test(time)) return false;
  const [h, m] = time.split(':').map(Number);
  return h >= 0 && h <= 23 && m >= 0 && m <= 59;
}

// Valid slot: 12:00–23:59 or 00:00–05:00 (the Ri Ri day boundary)
function isWithinDayBoundary(time: string): boolean {
  if (!isValidTimeString(time)) return false;
  const [h] = time.split(':').map(Number);
  return h >= 12 || h <= 5;
}

// Returns true when a strictly precedes b in the logical day order
function timeBefore(a: string, b: string): boolean {
  return toMinSinceNoon(a) < toMinSinceNoon(b);
}

// Returns true when [s1,e1) overlaps [s2,e2)
function overlaps(s1: string, e1: string, s2: string, e2: string): boolean {
  return toMinSinceNoon(s1) < toMinSinceNoon(e2) && toMinSinceNoon(s2) < toMinSinceNoon(e1);
}

// ─── Conflict check ───────────────────────────────────────────────────────────

async function findConflict(
  userId: string,
  date: string,
  start: string,
  end: string,
  excludeId?: string,
): Promise<string | null> {
  const rows = await db.select().from(scheduleInstances).where(
    and(eq(scheduleInstances.userId, userId), eq(scheduleInstances.instanceDate, date)),
  );

  for (const b of rows) {
    if (excludeId && b.id === excludeId) continue;
    if (b.status === 'skipped') continue;
    if (overlaps(start, end, b.scheduledStart, b.scheduledEnd)) return b.title;
  }
  return null;
}

// ─── Per-action validators ────────────────────────────────────────────────────

async function validateAddEvent(
  payload: Record<string, unknown>,
  userId: string,
  date: string,
): Promise<ValidationResult> {
  const title = payload.title as string | undefined;
  const startTime = payload.startTime as string | undefined;
  const endTime = payload.endTime as string | undefined;

  if (!title?.trim()) return { valid: false, reason: 'Title is required' };
  if (!startTime || !isValidTimeString(startTime))
    return { valid: false, reason: `Invalid start time: "${startTime}"` };
  if (!endTime || !isValidTimeString(endTime))
    return { valid: false, reason: `Invalid end time: "${endTime}"` };
  if (!isWithinDayBoundary(startTime))
    return { valid: false, reason: `${startTime} is outside the 12:00–05:00 day window` };
  if (!isWithinDayBoundary(endTime))
    return { valid: false, reason: `${endTime} is outside the 12:00–05:00 day window` };
  if (!timeBefore(startTime, endTime))
    return { valid: false, reason: 'Start time must be before end time' };

  const conflict = await findConflict(userId, date, startTime, endTime);
  if (conflict) return { valid: false, reason: `Overlaps with "${conflict}"` };

  return { valid: true };
}

async function validateChangeSchedule(
  payload: Record<string, unknown>,
  userId: string,
  date: string,
): Promise<ValidationResult> {
  const blockId = payload.blockId as string | undefined;
  if (!blockId) return { valid: false, reason: 'blockId is required' };

  const rows = await db.select().from(scheduleInstances).where(eq(scheduleInstances.id, blockId));
  if (!rows.length) return { valid: false, reason: 'Block not found' };

  const block = rows[0];
  const newStart = (payload.newStartTime as string | undefined) ?? block.scheduledStart;
  const newEnd = (payload.newEndTime as string | undefined) ?? block.scheduledEnd;

  if (!isValidTimeString(newStart))
    return { valid: false, reason: `Invalid start time: "${newStart}"` };
  if (!isValidTimeString(newEnd))
    return { valid: false, reason: `Invalid end time: "${newEnd}"` };
  if (!isWithinDayBoundary(newStart))
    return { valid: false, reason: `${newStart} is outside the 12:00–05:00 day window` };
  if (!isWithinDayBoundary(newEnd))
    return { valid: false, reason: `${newEnd} is outside the 12:00–05:00 day window` };
  if (!timeBefore(newStart, newEnd))
    return { valid: false, reason: 'Start time must be before end time' };

  const conflict = await findConflict(userId, date, newStart, newEnd, blockId);
  if (conflict) return { valid: false, reason: `Overlaps with "${conflict}"` };

  return { valid: true };
}

async function validateChangeRecurring(
  payload: Record<string, unknown>,
): Promise<ValidationResult> {
  const templateId = payload.templateId as string | undefined;
  if (!templateId) return { valid: false, reason: 'templateId is required' };

  const rows = await db.select().from(routineTemplates).where(eq(routineTemplates.id, templateId));
  if (!rows.length) return { valid: false, reason: 'Recurring block not found' };

  if (payload.newStartHour !== undefined) {
    const h = payload.newStartHour as number;
    if (typeof h !== 'number' || !Number.isInteger(h) || h < 0 || h > 23)
      return { valid: false, reason: `Invalid startHour: ${h}` };
    if (h > 5 && h < 12)
      return { valid: false, reason: `Hour ${h}:00 is outside the 12:00–05:00 day window` };
  }
  if (payload.newDurationMinutes !== undefined) {
    const d = payload.newDurationMinutes as number;
    if (typeof d !== 'number' || d <= 0 || d > 480)
      return { valid: false, reason: 'Duration must be between 1 and 480 minutes' };
  }
  return { valid: true };
}

async function validateDeleteRecurring(
  payload: Record<string, unknown>,
): Promise<ValidationResult> {
  const templateId = payload.templateId as string | undefined;
  if (!templateId) return { valid: false, reason: 'templateId is required' };

  const rows = await db.select().from(routineTemplates).where(eq(routineTemplates.id, templateId));
  if (!rows.length) return { valid: false, reason: 'Recurring block not found' };

  return { valid: true };
}

async function validateBulkReschedule(
  payload: Record<string, unknown>,
  userId: string,
  date: string,
): Promise<ValidationResult> {
  const changes = payload.changes as Array<{
    blockId: string; newStartTime: string; newEndTime: string;
  }> | undefined;

  if (!Array.isArray(changes) || changes.length === 0)
    return { valid: false, reason: 'No changes provided' };

  // Validate each change individually against the DB
  for (const c of changes) {
    const r = await validateChangeSchedule(
      { blockId: c.blockId, newStartTime: c.newStartTime, newEndTime: c.newEndTime },
      userId,
      date,
    );
    if (!r.valid) return r;
  }

  // Check intra-bulk conflicts (proposed changes conflicting with each other)
  for (let i = 0; i < changes.length; i++) {
    for (let j = i + 1; j < changes.length; j++) {
      const a = changes[i];
      const b = changes[j];
      if (overlaps(a.newStartTime, a.newEndTime, b.newStartTime, b.newEndTime))
        return { valid: false, reason: `Proposed changes for blocks ${i + 1} and ${j + 1} overlap each other` };
    }
  }

  return { valid: true };
}

// ─── Public API ───────────────────────────────────────────────────────────────

export async function validateAIAction(
  action: AIAction,
  userId: string,
  date: string,
): Promise<ValidationResult> {
  try {
    switch (action.type) {
      case 'add_event':
        return await validateAddEvent(action.payload, userId, date);
      case 'move_task':
      case 'change_schedule':
        return await validateChangeSchedule(action.payload, userId, date);
      case 'change_recurring':
        return await validateChangeRecurring(action.payload);
      case 'delete_recurring':
        return await validateDeleteRecurring(action.payload);
      case 'bulk_reschedule':
        return await validateBulkReschedule(action.payload, userId, date);
      case 'remember':
        return { valid: true };
      default:
        return { valid: false, reason: `Unknown action type: ${action.type}` };
    }
  } catch (e) {
    return { valid: false, reason: e instanceof Error ? e.message : 'Validation error' };
  }
}

export async function validateAllActions(
  actions: AIAction[],
  userId: string,
  date: string,
): Promise<ValidationResult[]> {
  return Promise.all(actions.map((a) => validateAIAction(a, userId, date)));
}
