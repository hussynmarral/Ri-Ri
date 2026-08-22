// ─── Schedule ──────────────────────────────────────────────────────────────

export type BlockCategory =
  | 'shopify'
  | 'agency'
  | 'office'
  | 'gym'
  | 'shower'
  | 'skincare'
  | 'meal'
  | 'reading'
  | 'language'
  | 'content'
  | 'review'
  | 'sleep'
  | 'water'
  | 'supplements'
  | 'flex'
  | 'movement'
  | 'weekend_run'
  | 'weekly_reset'
  | 'other';

export type CompletionStatus = 'pending' | 'in_progress' | 'completed' | 'skipped' | 'partial';

export interface ScheduleBlock {
  id: string;
  date: string; // ISO date YYYY-MM-DD
  category: BlockCategory;
  title: string;
  scheduledStart: string; // ISO datetime
  scheduledEnd: string;
  actualStart?: string;
  actualEnd?: string;
  status: CompletionStatus;
  isFlexWindow: boolean;
  isFlex?: boolean;
  notes?: string;
  overrideId?: string; // links to a schedule_override if applicable
}

export interface DisciplineRecord {
  blockId: string;
  latenessMinutes: number; // 0 = on time
  completionPercent: number; // 0-100
  wasSkipped: boolean;
}

// ─── Water ─────────────────────────────────────────────────────────────────

export interface WaterLog {
  id: string;
  loggedAt: string;
  amountMl: number;
}

export interface WaterDay {
  date: string;
  totalMl: number;
  targetMl: number;
  logs: WaterLog[];
}

// ─── Habits ────────────────────────────────────────────────────────────────

export interface HabitLog {
  id: string;
  habitKey: string; // e.g. 'reading', 'english', 'turkish'
  date: string;
  completed: boolean;
  value?: number; // pages read, minutes studied, etc.
}

// ─── Workout ───────────────────────────────────────────────────────────────

export interface WorkoutSession {
  id: string;
  date: string;
  gymDay: number; // 1-7
  label: string;
  startedAt?: string;
  completedAt?: string;
  durationMinutes?: number;
  completed: boolean;
}

// ─── Sync ──────────────────────────────────────────────────────────────────

export type SyncStatus = 'pending' | 'synced' | 'conflict' | 'error';

export interface SyncQueueItem {
  id: string;
  table: string;
  operation: 'insert' | 'update' | 'delete';
  payload: Record<string, unknown>;
  createdAt: string;
  attempts: number;
  status: SyncStatus;
}

// ─── AI ────────────────────────────────────────────────────────────────────

export type AIActionType =
  | 'add_event'
  | 'move_task'
  | 'change_schedule'
  | 'create_reminder'
  | 'change_recurring'
  | 'delete_recurring'
  | 'change_sleep'
  | 'bulk_reschedule';

export interface AIAction {
  type: AIActionType;
  requiresConfirmation: boolean;
  payload: Record<string, unknown>;
  description: string;
}

export interface AIInteraction {
  id: string;
  userMessage: string;
  aiResponse: string;
  proposedActions: AIAction[];
  confirmedAt?: string;
  rejectedAt?: string;
  createdAt: string;
}
