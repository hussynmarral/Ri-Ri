import { db } from '@/lib/db/client';
import { routineTemplates } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { enqueueChange } from '@/lib/sync/syncQueue';
import { DEFAULT_TEMPLATES } from './templates';
import * as Crypto from 'expo-crypto';

// Seeds default routine templates for a new user (runs once on first launch).
export async function seedDefaultTemplates(userId: string) {
  const existing = await db
    .select()
    .from(routineTemplates)
    .where(eq(routineTemplates.userId, userId));

  if (existing.length > 0) return; // already seeded

  const now = new Date().toISOString();

  for (const t of DEFAULT_TEMPLATES) {
    const id = await Crypto.randomUUID();

    const row = {
      id,
      userId,
      category: t.category,
      title: t.title,
      startHour: t.startHour,
      startMinute: t.startMinute,
      durationMinutes: t.durationMinutes,
      daysOfWeek: JSON.stringify(t.daysOfWeek),
      isActive: true,
      isFlexWindow: t.isFlexWindow ?? false,
      sortOrder: t.sortOrder ?? 0,
      createdAt: now,
      updatedAt: now,
    };

    await db.insert(routineTemplates).values(row);

    await enqueueChange('routine_templates', 'insert', id, {
      id,
      user_id: userId,
      category: t.category,
      title: t.title,
      start_hour: t.startHour,
      start_minute: t.startMinute,
      duration_minutes: t.durationMinutes,
      days_of_week: t.daysOfWeek,
      is_active: true,
      is_flex_window: t.isFlexWindow ?? false,
      sort_order: t.sortOrder ?? 0,
      created_at: now,
      updated_at: now,
    });
  }
}
