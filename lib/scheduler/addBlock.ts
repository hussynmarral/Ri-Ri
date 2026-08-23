import * as Crypto from 'expo-crypto';
import { db } from '@/lib/db/client';
import { scheduleInstances } from '@/lib/db/schema';
import { enqueueChange } from '@/lib/sync/syncQueue';
import type { BlockCategory } from '@/types';

export interface AddBlockParams {
  userId: string;
  instanceDate: string;
  category: BlockCategory;
  title: string;
  scheduledStart: string;
  scheduledEnd: string;
}

export async function addAdHocBlock(params: AddBlockParams): Promise<string> {
  const id = Crypto.randomUUID();
  const now = new Date().toISOString();

  await db.insert(scheduleInstances).values({
    id,
    userId: params.userId,
    templateId: null,
    overrideId: null,
    instanceDate: params.instanceDate,
    category: params.category,
    title: params.title,
    scheduledStart: params.scheduledStart,
    scheduledEnd: params.scheduledEnd,
    status: 'pending',
    isFlexWindow: false,
    latenessMinutes: 0,
    completionPercent: 0,
    notes: null,
    createdAt: now,
    updatedAt: now,
  });

  await enqueueChange('schedule_instances', 'insert', id, {
    id,
    user_id: params.userId,
    instance_date: params.instanceDate,
    category: params.category,
    title: params.title,
    scheduled_start: params.scheduledStart,
    scheduled_end: params.scheduledEnd,
    status: 'pending',
    is_flex_window: false,
    lateness_minutes: 0,
    completion_percent: 0,
    created_at: now,
    updated_at: now,
  });

  return id;
}
