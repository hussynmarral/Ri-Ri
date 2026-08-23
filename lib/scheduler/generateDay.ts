import { db } from '@/lib/db/client';
import { routineTemplates, scheduleInstances, scheduleOverrides } from '@/lib/db/schema';
import { and, eq } from 'drizzle-orm';
import { enqueueChange } from '@/lib/sync/syncQueue';
import type { ScheduleBlock, CompletionStatus } from '@/types';
import * as Crypto from 'expo-crypto';

// Routine day runs 12:00 PM on instanceDate → ~5:00 AM on instanceDate+1.
// Blocks with startHour < 12 are placed on the next calendar day.
const ROUTINE_DAY_BOUNDARY_HOUR = 12;

function routineDayOfWeek(dateStr: string): number {
  // Returns 1=Mon … 7=Sun for the given date string (YYYY-MM-DD)
  const d = new Date(`${dateStr}T12:00:00`);
  const js = d.getDay(); // 0=Sun
  return js === 0 ? 7 : js;
}

function blockDatetime(instanceDate: string, hour: number, minute: number): Date {
  const base = new Date(`${instanceDate}T00:00:00`);
  if (hour < ROUTINE_DAY_BOUNDARY_HOUR) {
    // Post-midnight: next calendar day
    base.setDate(base.getDate() + 1);
  }
  base.setHours(hour, minute, 0, 0);
  return base;
}

export async function generateDayInstances(
  userId: string,
  instanceDate: string, // YYYY-MM-DD
): Promise<ScheduleBlock[]> {
  // Return existing instances if already generated
  const existing = await db
    .select()
    .from(scheduleInstances)
    .where(and(eq(scheduleInstances.userId, userId), eq(scheduleInstances.instanceDate, instanceDate)));

  if (existing.length > 0) {
    return existing.map(rowToBlock);
  }

  const dayOfWeek = routineDayOfWeek(instanceDate);
  const now = new Date().toISOString();

  // Load active templates for this user
  const templates = await db
    .select()
    .from(routineTemplates)
    .where(and(eq(routineTemplates.userId, userId), eq(routineTemplates.isActive, true)));

  // Load overrides for this date
  const overrides = await db
    .select()
    .from(scheduleOverrides)
    .where(and(eq(scheduleOverrides.userId, userId), eq(scheduleOverrides.overrideDate, instanceDate)));

  const cancelledTemplateIds = new Set(
    overrides.filter((o) => o.isCancelled && o.templateId).map((o) => o.templateId!),
  );

  const blocks: ScheduleBlock[] = [];

  // Generate from templates
  for (const t of templates) {
    let dow: number[];
    try { dow = JSON.parse(t.daysOfWeek); } catch { continue; }
    if (!Array.isArray(dow)) continue;
    if (!dow.includes(dayOfWeek)) continue;
    if (cancelledTemplateIds.has(t.id)) continue;

    const override = overrides.find((o) => o.templateId === t.id && !o.isCancelled);
    const id = await Crypto.randomUUID();

    let scheduledStart: Date;
    let scheduledEnd: Date;
    let title = t.title;

    if (override?.replacementStart && override?.replacementEnd) {
      scheduledStart = new Date(override.replacementStart);
      scheduledEnd = new Date(override.replacementEnd);
      title = override.replacementTitle ?? t.title;
    } else {
      scheduledStart = blockDatetime(instanceDate, t.startHour, t.startMinute);
      scheduledEnd = new Date(scheduledStart.getTime() + t.durationMinutes * 60_000);
    }

    const block: ScheduleBlock = {
      id,
      userId,
      instanceDate,
      category: t.category as ScheduleBlock['category'],
      title,
      scheduledStart: scheduledStart.toISOString(),
      scheduledEnd: scheduledEnd.toISOString(),
      status: 'pending',
      isFlexWindow: !!t.isFlexWindow,
      latenessMinutes: 0,
      completionPercent: 0,
      templateId: t.id,
      overrideId: override?.id ?? null,
    };

    blocks.push(block);
  }

  // Add ad-hoc override blocks (no template_id, not cancelled)
  for (const o of overrides) {
    if (o.templateId || o.isCancelled) continue;
    if (!o.replacementStart || !o.replacementEnd) continue;

    const id = await Crypto.randomUUID();
    blocks.push({
      id,
      userId,
      instanceDate,
      category: 'other',
      title: o.replacementTitle ?? 'Event',
      scheduledStart: o.replacementStart,
      scheduledEnd: o.replacementEnd,
      status: 'pending',
      isFlexWindow: false,
      latenessMinutes: 0,
      completionPercent: 0,
      templateId: null,
      overrideId: o.id,
    });
  }

  // Sort by scheduled start time
  blocks.sort((a, b) => a.scheduledStart.localeCompare(b.scheduledStart));

  // Persist to local SQLite in a single transaction (all or nothing)
  await db.transaction(async (tx: any) => {
    for (const b of blocks) {
      await tx.insert(scheduleInstances).values({
        id: b.id,
        userId: b.userId,
        templateId: b.templateId ?? null,
        overrideId: b.overrideId ?? null,
        instanceDate: b.instanceDate,
        category: b.category,
        title: b.title,
        scheduledStart: b.scheduledStart,
        scheduledEnd: b.scheduledEnd,
        status: 'pending',
        isFlexWindow: b.isFlexWindow,
        latenessMinutes: 0,
        completionPercent: 0,
        createdAt: now,
        updatedAt: now,
      });
    }
  });

  // Enqueue sync changes after successful DB write
  for (const b of blocks) {
    await enqueueChange('schedule_instances', 'insert', b.id, {
      id: b.id,
      user_id: b.userId,
      template_id: b.templateId,
      override_id: b.overrideId,
      instance_date: b.instanceDate,
      category: b.category,
      title: b.title,
      scheduled_start: b.scheduledStart,
      scheduled_end: b.scheduledEnd,
      status: 'pending',
      is_flex_window: b.isFlexWindow,
      lateness_minutes: 0,
      completion_percent: 0,
      created_at: now,
      updated_at: now,
    });
  }

  return blocks;
}

function rowToBlock(r: typeof scheduleInstances.$inferSelect): ScheduleBlock {
  return {
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
  };
}
