import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core';

// All IDs are UUIDs stored as text.
// Timestamps are ISO 8601 strings.
// Booleans are integers (0/1) per SQLite convention.

export const profiles = sqliteTable('profiles', {
  id:          text('id').primaryKey(),
  displayName: text('display_name'),
  username:    text('username'),
  timezone:    text('timezone').notNull().default('Asia/Karachi'),
  createdAt:   text('created_at').notNull(),
  updatedAt:   text('updated_at').notNull(),
});

export const userSettings = sqliteTable('user_settings', {
  id:                           text('id').primaryKey(),
  userId:                       text('user_id').notNull().unique(),
  waterTargetMl:                integer('water_target_ml').notNull().default(3000),
  wakeHour:                     integer('wake_hour').notNull().default(12),
  wakeMinute:                   integer('wake_minute').notNull().default(0),
  sleepHour:                    integer('sleep_hour').notNull().default(5),
  sleepMinute:                  integer('sleep_minute').notNull().default(0),
  enabledMarkets:               text('enabled_markets').notNull().default('["nyc","chi","lax","lon","ist"]'),
  waterReminderTimes:           text('water_reminder_times').notNull().default('["13:00","15:00","17:00","19:00","21:00","23:00","01:00","03:00"]'),
  waterReminderAmountMl:        integer('water_reminder_amount_ml').notNull().default(375),
  waterFollowupIntervalMinutes: integer('water_followup_interval_minutes').notNull().default(30),
  theme:                        text('theme').notNull().default('system'),
  updatedAt:                    text('updated_at').notNull(),
});

export const routineTemplates = sqliteTable('routine_templates', {
  id:              text('id').primaryKey(),
  userId:          text('user_id').notNull(),
  category:        text('category').notNull(),
  title:           text('title').notNull(),
  startHour:       integer('start_hour').notNull(),
  startMinute:     integer('start_minute').notNull(),
  durationMinutes: integer('duration_minutes').notNull(),
  daysOfWeek:      text('days_of_week').notNull().default('[1,2,3,4,5,6,7]'),
  isActive:        integer('is_active', { mode: 'boolean' }).notNull().default(true),
  isFlexWindow:    integer('is_flex_window', { mode: 'boolean' }).notNull().default(false),
  sortOrder:       integer('sort_order').notNull().default(0),
  createdAt:       text('created_at').notNull(),
  updatedAt:       text('updated_at').notNull(),
});

export const scheduleOverrides = sqliteTable('schedule_overrides', {
  id:               text('id').primaryKey(),
  userId:           text('user_id').notNull(),
  templateId:       text('template_id'),
  overrideDate:     text('override_date').notNull(),
  isCancelled:      integer('is_cancelled', { mode: 'boolean' }).notNull().default(false),
  replacementStart: text('replacement_start'),
  replacementEnd:   text('replacement_end'),
  replacementTitle: text('replacement_title'),
  reason:           text('reason'),
  createdAt:        text('created_at').notNull(),
  updatedAt:        text('updated_at').notNull(),
});

export const scheduleInstances = sqliteTable('schedule_instances', {
  id:                text('id').primaryKey(),
  userId:            text('user_id').notNull(),
  templateId:        text('template_id'),
  overrideId:        text('override_id'),
  instanceDate:      text('instance_date').notNull(),
  category:          text('category').notNull(),
  title:             text('title').notNull(),
  scheduledStart:    text('scheduled_start').notNull(),
  scheduledEnd:      text('scheduled_end').notNull(),
  actualStart:       text('actual_start'),
  actualEnd:         text('actual_end'),
  status:            text('status').notNull().default('pending'),
  isFlexWindow:      integer('is_flex_window', { mode: 'boolean' }).notNull().default(false),
  latenessMinutes:   integer('lateness_minutes').notNull().default(0),
  completionPercent: integer('completion_percent').notNull().default(0),
  notes:             text('notes'),
  createdAt:         text('created_at').notNull(),
  updatedAt:         text('updated_at').notNull(),
});

export const waterLogs = sqliteTable('water_logs', {
  id:        text('id').primaryKey(),
  userId:    text('user_id').notNull(),
  loggedAt:  text('logged_at').notNull(),
  amountMl:  integer('amount_ml').notNull(),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

export const habitLogs = sqliteTable('habit_logs', {
  id:           text('id').primaryKey(),
  userId:       text('user_id').notNull(),
  habitKey:     text('habit_key').notNull(),
  logDate:      text('log_date').notNull(),
  completed:    integer('completed', { mode: 'boolean' }).notNull().default(false),
  valueNumeric: real('value_numeric'),
  createdAt:    text('created_at').notNull(),
  updatedAt:    text('updated_at').notNull(),
});

export const workoutSessions = sqliteTable('workout_sessions', {
  id:              text('id').primaryKey(),
  userId:          text('user_id').notNull(),
  sessionDate:     text('session_date').notNull(),
  gymDay:          integer('gym_day').notNull(),
  label:           text('label').notNull(),
  startedAt:       text('started_at'),
  completedAt:     text('completed_at'),
  durationMinutes: integer('duration_minutes'),
  completed:       integer('completed', { mode: 'boolean' }).notNull().default(false),
  notes:           text('notes'),
  createdAt:       text('created_at').notNull(),
  updatedAt:       text('updated_at').notNull(),
});

export const workoutSets = sqliteTable('workout_sets', {
  id:         text('id').primaryKey(),
  sessionId:  text('session_id').notNull(),
  userId:     text('user_id').notNull(),
  exercise:   text('exercise').notNull(),
  setNumber:  integer('set_number').notNull(),
  reps:       integer('reps'),
  weightKg:   real('weight_kg'),
  createdAt:  text('created_at').notNull(),
});

export const dailyStats = sqliteTable('daily_stats', {
  id:                  text('id').primaryKey(),
  userId:              text('user_id').notNull(),
  statDate:            text('stat_date').notNull(),
  totalScheduled:      integer('total_scheduled').notNull().default(0),
  totalCompleted:      integer('total_completed').notNull().default(0),
  totalSkipped:        integer('total_skipped').notNull().default(0),
  totalLate:           integer('total_late').notNull().default(0),
  avgLatenessMinutes:  real('avg_lateness_minutes').notNull().default(0),
  waterMl:             integer('water_ml').notNull().default(0),
  waterTargetMl:       integer('water_target_ml').notNull().default(3000),
  readingCompleted:    integer('reading_completed', { mode: 'boolean' }).notNull().default(false),
  englishCompleted:    integer('english_completed', { mode: 'boolean' }).notNull().default(false),
  turkishCompleted:    integer('turkish_completed', { mode: 'boolean' }).notNull().default(false),
  workoutCompleted:    integer('workout_completed', { mode: 'boolean' }).notNull().default(false),
  disciplineScore:     real('discipline_score').notNull().default(0),
  createdAt:           text('created_at').notNull(),
  updatedAt:           text('updated_at').notNull(),
});

export const aiMemories = sqliteTable('ai_memories', {
  id:        text('id').primaryKey(),
  userId:    text('user_id').notNull(),
  content:   text('content').notNull(),
  category:  text('category').notNull().default('general'),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

export const aiActionLog = sqliteTable('ai_action_log', {
  id:               text('id').primaryKey(),
  userId:           text('user_id').notNull(),
  actionType:       text('action_type').notNull(),
  description:      text('description').notNull(),
  payload:          text('payload').notNull(),
  reversalPayload:  text('reversal_payload'),
  undone:           integer('undone', { mode: 'boolean' }).notNull().default(false),
  createdAt:        text('created_at').notNull(),
});

// Sync queue — local only, never pushed to Supabase
export const syncQueue = sqliteTable('sync_queue', {
  id:        text('id').primaryKey(),
  tableName: text('table_name').notNull(),
  operation: text('operation').notNull(), // 'insert' | 'update' | 'delete'
  recordId:  text('record_id').notNull(),
  payload:   text('payload').notNull(), // JSON string
  attempts:  integer('attempts').notNull().default(0),
  status:    text('status').notNull().default('pending'), // 'pending' | 'synced' | 'error'
  createdAt: text('created_at').notNull(),
});
