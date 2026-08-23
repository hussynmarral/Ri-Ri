import { supabase } from '@/lib/supabase/client';
import type { ScheduleBlock, CompletionStatus } from '@/types';

// Web override: generates/reads schedule instances from Supabase directly.
// Metro auto-selects this file over generateDay.ts when bundling for web.
// Uses (supabase as any) because database.ts types are not yet generated.

// In-flight deduplication: React StrictMode + multiple screens calling load()
// simultaneously would otherwise generate and insert 4x copies before any
// call can read back existing rows. Share one promise per user+date key.
const inFlight = new Map<string, Promise<ScheduleBlock[]>>();

const ROUTINE_DAY_BOUNDARY_HOUR = 12;

function routineDayOfWeek(dateStr: string): number {
  const d = new Date(`${dateStr}T12:00:00`);
  const js = d.getDay(); // 0=Sun
  return js === 0 ? 7 : js;
}

// Creates a Date in LOCAL time (no Z suffix → local timezone).
// Blocks with hour < 12 belong to the next calendar day (post-midnight).
function blockDatetime(instanceDate: string, hour: number, minute: number): Date {
  const base = new Date(`${instanceDate}T00:00:00`);
  if (hour < ROUTINE_DAY_BOUNDARY_HOUR) {
    base.setDate(base.getDate() + 1);
  }
  base.setHours(hour, minute, 0, 0);
  return base;
}

export function generateDayInstances(
  userId: string,
  instanceDate: string,
): Promise<ScheduleBlock[]> {
  const key = `${userId}:${instanceDate}`;
  const cached = inFlight.get(key);
  if (cached) return cached;
  const promise = _generate(userId, instanceDate).finally(() => inFlight.delete(key));
  inFlight.set(key, promise);
  return promise;
}

async function _generate(
  userId: string,
  instanceDate: string, // YYYY-MM-DD in local timezone
): Promise<ScheduleBlock[]> {
  // Return existing Supabase instances if already generated for this day
  const { data: existing } = await (supabase as any)
    .from('schedule_instances')
    .select('*')
    .eq('user_id', userId)
    .eq('instance_date', instanceDate)
    .order('scheduled_start', { ascending: true });

  if (existing && existing.length > 0) {
    // Deduplicate by template_id — keep earliest created row per template
    const seen = new Map<string, any>();
    for (const row of existing as any[]) {
      const key = row.template_id ?? row.id;
      if (!seen.has(key)) seen.set(key, row);
    }
    return Array.from(seen.values()).map(rowToBlock)
      .sort((a, b) => a.scheduledStart.localeCompare(b.scheduledStart));
  }

  // Load this user's active templates (exclude seed version marker rows)
  const { data: templates, error: tErr } = await (supabase as any)
    .from('routine_templates')
    .select('*')
    .eq('user_id', userId)
    .eq('is_active', true)
    .neq('category', '__seed_version__');

  if (tErr) console.error('[generateDay.web] templates error:', tErr.message);
  if (!templates || (templates as any[]).length === 0) return [];

  // Load any overrides for this specific date
  const { data: overrides } = await (supabase as any)
    .from('schedule_overrides')
    .select('*')
    .eq('user_id', userId)
    .eq('override_date', instanceDate);

  const overrideList: any[] = overrides ?? [];
  const cancelledTemplateIds = new Set(
    overrideList
      .filter((o) => o.is_cancelled && o.template_id)
      .map((o) => o.template_id),
  );

  const dayOfWeek = routineDayOfWeek(instanceDate);
  const blocks: ScheduleBlock[] = [];
  const now = new Date().toISOString();

  for (const t of templates as any[]) {
    // Supabase returns days_of_week as a native array
    const dow: number[] = Array.isArray(t.days_of_week)
      ? t.days_of_week
      : JSON.parse(t.days_of_week as string);

    if (!dow.includes(dayOfWeek)) continue;
    if (cancelledTemplateIds.has(t.id)) continue;

    const override = overrideList.find((o) => o.template_id === t.id && !o.is_cancelled);

    let scheduledStart: Date;
    let scheduledEnd: Date;
    let title: string = t.title;

    if (override?.replacement_start && override?.replacement_end) {
      scheduledStart = new Date(override.replacement_start);
      scheduledEnd = new Date(override.replacement_end);
      title = override.replacement_title ?? t.title;
    } else {
      scheduledStart = blockDatetime(instanceDate, t.start_hour, t.start_minute);
      scheduledEnd = new Date(scheduledStart.getTime() + t.duration_minutes * 60_000);
    }

    blocks.push({
      id: crypto.randomUUID(),
      userId,
      instanceDate,
      category: t.category as ScheduleBlock['category'],
      title,
      scheduledStart: scheduledStart.toISOString(),
      scheduledEnd: scheduledEnd.toISOString(),
      status: 'pending',
      isFlexWindow: !!(t.is_flex_window),
      latenessMinutes: 0,
      completionPercent: 0,
      templateId: t.id as string,
      overrideId: (override?.id as string) ?? null,
    });
  }

  // Add ad-hoc override blocks (no template, not cancelled)
  for (const o of overrideList) {
    if (o.template_id || o.is_cancelled) continue;
    if (!o.replacement_start || !o.replacement_end) continue;
    blocks.push({
      id: crypto.randomUUID(),
      userId,
      instanceDate,
      category: 'other',
      title: (o.replacement_title as string) ?? 'Event',
      scheduledStart: o.replacement_start as string,
      scheduledEnd: o.replacement_end as string,
      status: 'pending',
      isFlexWindow: false,
      latenessMinutes: 0,
      completionPercent: 0,
      templateId: null,
      overrideId: o.id as string,
    });
  }

  // Sort by scheduled start
  blocks.sort((a, b) => a.scheduledStart.localeCompare(b.scheduledStart));

  if (blocks.length === 0) return [];

  // Persist to Supabase so next load returns existing rows
  const rows = blocks.map((b) => ({
    id: b.id,
    user_id: b.userId,
    template_id: b.templateId ?? null,
    override_id: b.overrideId ?? null,
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
  }));

  // upsert with ignoreDuplicates as a second-layer guard against races
  const { error: insErr } = await (supabase as any)
    .from('schedule_instances')
    .upsert(rows, { onConflict: 'id', ignoreDuplicates: true });
  if (insErr) console.error('[generateDay.web] upsert error:', insErr.message);

  return blocks;
}

function rowToBlock(r: any): ScheduleBlock {
  return {
    id: r.id,
    userId: r.user_id,
    instanceDate: r.instance_date,
    category: r.category as ScheduleBlock['category'],
    title: r.title,
    scheduledStart: r.scheduled_start,
    scheduledEnd: r.scheduled_end,
    actualStart: r.actual_start ?? undefined,
    actualEnd: r.actual_end ?? undefined,
    status: r.status as CompletionStatus,
    isFlexWindow: !!(r.is_flex_window),
    latenessMinutes: r.lateness_minutes ?? 0,
    completionPercent: r.completion_percent ?? 0,
    notes: r.notes ?? undefined,
    templateId: r.template_id ?? null,
    overrideId: r.override_id ?? null,
  };
}
