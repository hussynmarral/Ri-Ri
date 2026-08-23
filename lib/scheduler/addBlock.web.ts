import { supabase } from '@/lib/supabase/client';
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
  const id = crypto.randomUUID();
  const now = new Date().toISOString();

  await (supabase as any).from('schedule_instances').insert({
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
