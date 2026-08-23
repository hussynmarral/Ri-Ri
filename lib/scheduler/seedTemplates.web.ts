import { supabase } from '@/lib/supabase/client';
import { DEFAULT_TEMPLATES, TEMPLATE_COUNT, SEED_VERSION } from './templates';

// Version marker: a special row stored in routine_templates with category='__seed_version__'
// and title = SEED_VERSION string. If it's missing or mismatched, we wipe and reseed.

const VERSION_CATEGORY = '__seed_version__';

async function getStoredVersion(userId: string): Promise<number | null> {
  const { data } = await (supabase as any)
    .from('routine_templates')
    .select('title')
    .eq('user_id', userId)
    .eq('category', VERSION_CATEGORY)
    .single();
  if (!data) return null;
  const n = parseInt(data.title, 10);
  return isNaN(n) ? null : n;
}

export async function seedDefaultTemplates(userId: string) {
  // Check count + version
  const { data: existing } = await (supabase as any)
    .from('routine_templates')
    .select('id', { count: 'exact' })
    .eq('user_id', userId)
    .neq('category', VERSION_CATEGORY);

  const currentCount   = (existing as any[])?.length ?? 0;
  const storedVersion  = await getStoredVersion(userId);
  const alreadyCorrect = currentCount === TEMPLATE_COUNT && storedVersion === SEED_VERSION;

  if (alreadyCorrect) return;

  console.log(`[seedTemplates] reseeding: count=${currentCount}/${TEMPLATE_COUNT} version=${storedVersion}->${SEED_VERSION}`);

  // 1. Delete all schedule instances so they regenerate from correct templates
  await (supabase as any)
    .from('schedule_instances')
    .delete()
    .eq('user_id', userId);

  // 2. Delete all existing templates (including any old version markers)
  await (supabase as any)
    .from('routine_templates')
    .delete()
    .eq('user_id', userId);

  const now = new Date().toISOString();

  // 3. Insert correct templates
  const rows = DEFAULT_TEMPLATES.map((t) => ({
    user_id:          userId,
    category:         t.category,
    title:            t.title,
    start_hour:       t.startHour,
    start_minute:     t.startMinute,
    duration_minutes: t.durationMinutes,
    days_of_week:     t.daysOfWeek,
    is_active:        true,
    is_flex_window:   t.isFlexWindow ?? false,
    sort_order:       t.sortOrder ?? 0,
    created_at:       now,
    updated_at:       now,
  }));

  const { error: insertError } = await (supabase as any)
    .from('routine_templates')
    .insert(rows);

  if (insertError) {
    console.error('[seedTemplates.web] insert failed:', insertError.message);
    return;
  }

  // 4. Insert version marker
  await (supabase as any)
    .from('routine_templates')
    .insert({
      user_id:          userId,
      category:         VERSION_CATEGORY,
      title:            String(SEED_VERSION),
      start_hour:       0,
      start_minute:     0,
      duration_minutes: 0,
      days_of_week:     [],
      is_active:        false,
      is_flex_window:   false,
      sort_order:       9999,
      created_at:       now,
      updated_at:       now,
    });

  console.log(`[seedTemplates.web] seeded ${rows.length} templates at version ${SEED_VERSION}`);
}
