import type { ScheduleBlock } from '@/types';

// noon-noon linearization: 12:00 = 0 min, 23:59 = 719, 00:00 = 720, 05:00 = 1020
function toMins(time: string): number {
  const [h, m] = time.split(':').map(Number);
  const total = h * 60 + m;
  return total >= 12 * 60 ? total - 12 * 60 : total + 12 * 60;
}

function fromMins(mins: number): string {
  const actual = mins < 12 * 60 ? mins + 12 * 60 : mins - 12 * 60;
  const h = Math.floor(actual / 60) % 24;
  const m = actual % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

const DAY_START = toMins('12:00'); // 0
const DAY_END   = toMins('05:00'); // 1020

export interface FreeSlot {
  start: string; // HH:MM
  end: string;
  durationMinutes: number;
}

export function isBlockLocked(block: ScheduleBlock): boolean {
  return !!block.templateId && !block.isFlexWindow;
}

export function getLockedBlocks(blocks: ScheduleBlock[]): ScheduleBlock[] {
  return blocks.filter(isBlockLocked);
}

export function findFreeSlots(
  blocks: ScheduleBlock[],
  wantedMinutes: number,
): FreeSlot[] {
  const sorted = [...blocks]
    .filter((b) => b.status !== 'skipped')
    .sort((a, b) => toMins(a.scheduledStart) - toMins(b.scheduledStart));

  const slots: FreeSlot[] = [];
  let cursor = DAY_START;

  for (const b of sorted) {
    const bStart = toMins(b.scheduledStart);
    const bEnd   = toMins(b.scheduledEnd);

    if (bStart > cursor) {
      const gap = bStart - cursor;
      if (gap >= wantedMinutes) {
        slots.push({
          start: fromMins(cursor),
          end: fromMins(cursor + wantedMinutes),
          durationMinutes: gap,
        });
      }
    }
    cursor = Math.max(cursor, bEnd);
  }

  if (DAY_END > cursor) {
    const gap = DAY_END - cursor;
    if (gap >= wantedMinutes) {
      slots.push({
        start: fromMins(cursor),
        end: fromMins(cursor + wantedMinutes),
        durationMinutes: gap,
      });
    }
  }

  return slots;
}

export interface ShiftResult {
  newStart: string;
  newEnd: string;
  conflicts: ScheduleBlock[];
  lockedConflicts: ScheduleBlock[];
}

export function suggestShift(
  block: ScheduleBlock,
  allBlocks: ScheduleBlock[],
  shiftMinutes: number,
): ShiftResult | null {
  const blockDuration = toMins(block.scheduledEnd) - toMins(block.scheduledStart);
  const newStartMins  = toMins(block.scheduledStart) + shiftMinutes;
  const newEndMins    = newStartMins + blockDuration;

  if (newEndMins > DAY_END || newStartMins < DAY_START) return null;

  const newStart = fromMins(newStartMins);
  const newEnd   = fromMins(newEndMins);

  const conflicts = allBlocks.filter((b) => {
    if (b.id === block.id || b.status === 'skipped') return false;
    const bStart = toMins(b.scheduledStart);
    const bEnd   = toMins(b.scheduledEnd);
    return newStartMins < bEnd && bStart < newEndMins;
  });

  return {
    newStart,
    newEnd,
    conflicts,
    lockedConflicts: conflicts.filter(isBlockLocked),
  };
}

export function buildRescheduleContext(blocks: ScheduleBlock[]): string {
  const lines: string[] = [];
  const sorted = [...blocks].sort((a, b) => toMins(a.scheduledStart) - toMins(b.scheduledStart));

  for (const b of sorted) {
    const locked = isBlockLocked(b) ? ' [LOCKED]' : b.isFlexWindow ? ' [flex]' : '';
    lines.push(`${b.scheduledStart}–${b.scheduledEnd} ${b.title}${locked} (${b.status})`);
  }

  const freeSlots = findFreeSlots(blocks, 30);
  if (freeSlots.length) {
    lines.push('');
    lines.push('Free slots (≥30 min):');
    freeSlots.forEach((s) => lines.push(`  ${s.start}–${s.end} (${s.durationMinutes}m)`));
  }

  return lines.join('\n');
}
