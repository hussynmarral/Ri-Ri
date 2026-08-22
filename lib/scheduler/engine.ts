import type { ScheduleBlock, CompletionStatus, DisciplineRecord } from '@/types';

// ─── Late-task rule ───────────────────────────────────────────────────────────
// If the user starts a block late, the block's remaining time is from actual
// start to the ORIGINAL scheduled end. The block is NOT shifted forward.
// Lateness is tracked separately from completion status.

export function computeRemainingTime(block: ScheduleBlock): number {
  const now = Date.now();
  const end = new Date(block.scheduledEnd).getTime();
  return Math.max(0, Math.round((end - now) / 60_000));
}

export function computeLatenessMinutes(block: ScheduleBlock): number {
  if (!block.actualStart) return 0;
  const scheduled = new Date(block.scheduledStart).getTime();
  const actual = new Date(block.actualStart).getTime();
  return Math.max(0, Math.round((actual - scheduled) / 60_000));
}

export function isCurrentBlock(block: ScheduleBlock): boolean {
  if (block.status === 'in_progress') return true;
  const now = Date.now();
  const start = new Date(block.scheduledStart).getTime();
  const end = new Date(block.scheduledEnd).getTime();
  return now >= start && now < end && block.status === 'pending';
}

export function isUpcoming(block: ScheduleBlock): boolean {
  return new Date(block.scheduledStart).getTime() > Date.now() && block.status === 'pending';
}

export function isPast(block: ScheduleBlock): boolean {
  return new Date(block.scheduledEnd).getTime() < Date.now();
}

// ─── Discipline calculation ───────────────────────────────────────────────────

export function computeDisciplineScore(blocks: ScheduleBlock[]): number {
  const scoreable = blocks.filter(
    (b) => !b.isFlexWindow && b.category !== 'sleep' && b.category !== 'flex',
  );
  if (scoreable.length === 0) return 0;

  let totalScore = 0;

  for (const b of scoreable) {
    if (b.status === 'skipped') {
      totalScore += 0;
      continue;
    }
    if (b.status === 'pending' && isPast(b)) {
      // Missed without being marked skipped — treat as skipped
      totalScore += 0;
      continue;
    }

    const completionScore = b.completionPercent / 100;

    // Lateness penalty: -2 points per 10 minutes late, max -30
    const latePenalty = Math.min(30, Math.floor(b.latenessMinutes / 10) * 2);
    const blockScore = Math.max(0, completionScore * 100 - latePenalty);

    totalScore += blockScore;
  }

  return Math.round(totalScore / scoreable.length);
}

export function computeDisciplineRecord(block: ScheduleBlock): DisciplineRecord {
  return {
    blockId: block.id,
    latenessMinutes: computeLatenessMinutes(block),
    completionPercent: block.completionPercent,
    wasSkipped: block.status === 'skipped',
  };
}

// ─── Conflict detection ───────────────────────────────────────────────────────

export interface ConflictResult {
  hasConflict: boolean;
  conflictingBlocks: ScheduleBlock[];
}

export function detectConflicts(
  candidate: { start: string; end: string },
  existing: ScheduleBlock[],
): ConflictResult {
  const cStart = new Date(candidate.start).getTime();
  const cEnd = new Date(candidate.end).getTime();

  const conflicting = existing.filter((b) => {
    if (b.status === 'skipped' || b.status === 'completed') return false;
    if (b.isFlexWindow) return false;
    const bStart = new Date(b.scheduledStart).getTime();
    const bEnd = new Date(b.scheduledEnd).getTime();
    return cStart < bEnd && cEnd > bStart;
  });

  return { hasConflict: conflicting.length > 0, conflictingBlocks: conflicting };
}

// ─── Daily summary ────────────────────────────────────────────────────────────

export interface DailySummary {
  totalScheduled: number;
  totalCompleted: number;
  totalSkipped: number;
  totalLate: number;
  avgLatenessMinutes: number;
  disciplineScore: number;
  completionRate: number;
}

export function computeDailySummary(blocks: ScheduleBlock[]): DailySummary {
  const scoreable = blocks.filter(
    (b) => !b.isFlexWindow && b.category !== 'sleep' && b.category !== 'flex',
  );

  const completed = scoreable.filter((b) => b.status === 'completed' || b.status === 'partial');
  const skipped = scoreable.filter((b) => b.status === 'skipped');
  const late = scoreable.filter((b) => b.latenessMinutes > 0);

  const avgLateness =
    late.length > 0
      ? Math.round(late.reduce((s, b) => s + b.latenessMinutes, 0) / late.length)
      : 0;

  return {
    totalScheduled: scoreable.length,
    totalCompleted: completed.length,
    totalSkipped: skipped.length,
    totalLate: late.length,
    avgLatenessMinutes: avgLateness,
    disciplineScore: computeDisciplineScore(scoreable),
    completionRate: scoreable.length > 0 ? Math.round((completed.length / scoreable.length) * 100) : 0,
  };
}

// ─── Time helpers ─────────────────────────────────────────────────────────────

export function formatTimeRemaining(minutes: number): string {
  if (minutes <= 0) return '0m';
  if (minutes < 60) return `${minutes}m`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

export function formatBlockTime(isoString: string): string {
  const d = new Date(isoString);
  const h = d.getHours();
  const m = d.getMinutes();
  const ampm = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 || 12;
  return `${h12}:${m.toString().padStart(2, '0')} ${ampm}`;
}

export function todayDateISO(): string {
  // Routine day: if current time is before 12:00 PM, the "active day" is yesterday
  const now = new Date();
  if (now.getHours() < 12) {
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    return yesterday.toISOString().split('T')[0];
  }
  return now.toISOString().split('T')[0];
}
