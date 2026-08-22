import * as Crypto from 'expo-crypto';
import { and, eq } from 'drizzle-orm';

import { db } from '@/lib/db/client';
import { dailyStats, habitLogs, scheduleInstances, waterLogs, workoutSessions } from '@/lib/db/schema';
import { computeDailySummary } from '@/lib/scheduler/engine';
import { enqueueChange } from '@/lib/sync/syncQueue';
import type { BlockCategory, CompletionStatus, ScheduleBlock } from '@/types';

function rowToBlock(r: typeof scheduleInstances.$inferSelect): ScheduleBlock {
  return {
    id: r.id,
    userId: r.userId,
    instanceDate: r.instanceDate,
    category: r.category as BlockCategory,
    title: r.title,
    scheduledStart: r.scheduledStart,
    scheduledEnd: r.scheduledEnd,
    actualStart: r.actualStart,
    actualEnd: r.actualEnd,
    status: r.status as CompletionStatus,
    isFlexWindow: !!r.isFlexWindow,
    latenessMinutes: r.latenessMinutes ?? 0,
    completionPercent: r.completionPercent ?? 0,
    notes: r.notes,
    templateId: r.templateId,
    overrideId: r.overrideId,
  };
}

interface StatsRow {
  userId: string; statDate: string;
  totalScheduled: number; totalCompleted: number;
  totalSkipped: number; totalLate: number;
  avgLatenessMinutes: number;
  waterMl: number; waterTargetMl: number;
  readingCompleted: boolean; englishCompleted: boolean;
  turkishCompleted: boolean; workoutCompleted: boolean;
  disciplineScore: number; updatedAt: string;
}

export async function saveDailyStats(userId: string, date: string): Promise<void> {
  const now = new Date().toISOString();

  const [blockRows, allWaterRows, habitRows, allWorkoutRows] = await Promise.all([
    db.select().from(scheduleInstances)
      .where(and(eq(scheduleInstances.userId, userId), eq(scheduleInstances.instanceDate, date))),
    db.select().from(waterLogs).where(eq(waterLogs.userId, userId)),
    db.select().from(habitLogs)
      .where(and(eq(habitLogs.userId, userId), eq(habitLogs.logDate, date))),
    db.select().from(workoutSessions).where(eq(workoutSessions.userId, userId)),
  ]);

  const summary = computeDailySummary(blockRows.map(rowToBlock));

  const waterMl = allWaterRows
    .filter((r) => r.loggedAt.startsWith(date))
    .reduce((acc, r) => acc + r.amountMl, 0);

  const habitMap: Record<string, boolean> = {};
  for (const r of habitRows) habitMap[r.habitKey] = !!r.completed;

  const todayWorkout = allWorkoutRows.find((r) => r.sessionDate === date);

  const row: StatsRow = {
    userId,
    statDate: date,
    totalScheduled: summary.totalScheduled,
    totalCompleted: summary.totalCompleted,
    totalSkipped: summary.totalSkipped,
    totalLate: summary.totalLate,
    avgLatenessMinutes: summary.avgLatenessMinutes,
    waterMl,
    waterTargetMl: 3000,
    readingCompleted: !!habitMap['reading'],
    englishCompleted: !!habitMap['english'],
    turkishCompleted: !!habitMap['turkish'],
    workoutCompleted: todayWorkout?.completed ?? false,
    disciplineScore: summary.disciplineScore,
    updatedAt: now,
  };

  const existing = await db.select().from(dailyStats)
    .where(and(eq(dailyStats.userId, userId), eq(dailyStats.statDate, date)));

  if (existing.length > 0) {
    const id = existing[0].id;
    await db.update(dailyStats).set(row).where(eq(dailyStats.id, id));
    await enqueueChange('daily_stats', 'update', id, toSyncPayload(id, row));
  } else {
    const id = await Crypto.randomUUID();
    await db.insert(dailyStats).values({ id, createdAt: now, ...row });
    await enqueueChange('daily_stats', 'insert', id, { created_at: now, ...toSyncPayload(id, row) });
  }
}

function toSyncPayload(id: string, r: StatsRow) {
  return {
    id,
    user_id: r.userId,
    stat_date: r.statDate,
    total_scheduled: r.totalScheduled,
    total_completed: r.totalCompleted,
    total_skipped: r.totalSkipped,
    total_late: r.totalLate,
    avg_lateness_minutes: r.avgLatenessMinutes,
    water_ml: r.waterMl,
    water_target_ml: r.waterTargetMl,
    reading_completed: r.readingCompleted,
    english_completed: r.englishCompleted,
    turkish_completed: r.turkishCompleted,
    workout_completed: r.workoutCompleted,
    discipline_score: r.disciplineScore,
    updated_at: r.updatedAt,
  };
}
