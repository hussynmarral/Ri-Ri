import { db } from './client';
import { sql } from 'drizzle-orm';

// Run once on app startup to ensure local tables exist.
// Drizzle doesn't auto-migrate on expo-sqlite — we manage it manually here
// for simplicity. In a future version this can switch to drizzle-kit migrations.
export async function runLocalMigrations() {
  await db.run(sql`PRAGMA journal_mode = WAL`);
  await db.run(sql`PRAGMA foreign_keys = ON`);

  await db.run(sql`
    CREATE TABLE IF NOT EXISTS profiles (
      id TEXT PRIMARY KEY,
      display_name TEXT,
      timezone TEXT NOT NULL DEFAULT 'Asia/Karachi',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )
  `);

  await db.run(sql`
    CREATE TABLE IF NOT EXISTS user_settings (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL UNIQUE,
      water_target_ml INTEGER NOT NULL DEFAULT 3000,
      wake_hour INTEGER NOT NULL DEFAULT 12,
      wake_minute INTEGER NOT NULL DEFAULT 0,
      sleep_hour INTEGER NOT NULL DEFAULT 5,
      sleep_minute INTEGER NOT NULL DEFAULT 0,
      enabled_markets TEXT NOT NULL DEFAULT '["nyc","chi","lax","lon","ist"]',
      water_reminder_times TEXT NOT NULL DEFAULT '["13:00","15:00","17:00","19:00","21:00","23:00","01:00","03:00"]',
      water_reminder_amount_ml INTEGER NOT NULL DEFAULT 375,
      water_followup_interval_minutes INTEGER NOT NULL DEFAULT 30,
      theme TEXT NOT NULL DEFAULT 'system',
      updated_at TEXT NOT NULL
    )
  `);

  await db.run(sql`
    CREATE TABLE IF NOT EXISTS routine_templates (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      category TEXT NOT NULL,
      title TEXT NOT NULL,
      start_hour INTEGER NOT NULL,
      start_minute INTEGER NOT NULL,
      duration_minutes INTEGER NOT NULL,
      days_of_week TEXT NOT NULL DEFAULT '[1,2,3,4,5,6,7]',
      is_active INTEGER NOT NULL DEFAULT 1,
      is_flex_window INTEGER NOT NULL DEFAULT 0,
      sort_order INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )
  `);

  await db.run(sql`
    CREATE TABLE IF NOT EXISTS schedule_overrides (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      template_id TEXT,
      override_date TEXT NOT NULL,
      is_cancelled INTEGER NOT NULL DEFAULT 0,
      replacement_start TEXT,
      replacement_end TEXT,
      replacement_title TEXT,
      reason TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )
  `);

  await db.run(sql`
    CREATE TABLE IF NOT EXISTS schedule_instances (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      template_id TEXT,
      override_id TEXT,
      instance_date TEXT NOT NULL,
      category TEXT NOT NULL,
      title TEXT NOT NULL,
      scheduled_start TEXT NOT NULL,
      scheduled_end TEXT NOT NULL,
      actual_start TEXT,
      actual_end TEXT,
      status TEXT NOT NULL DEFAULT 'pending',
      is_flex_window INTEGER NOT NULL DEFAULT 0,
      lateness_minutes INTEGER NOT NULL DEFAULT 0,
      completion_percent INTEGER NOT NULL DEFAULT 0,
      notes TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )
  `);

  await db.run(sql`
    CREATE TABLE IF NOT EXISTS water_logs (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      logged_at TEXT NOT NULL,
      amount_ml INTEGER NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )
  `);

  await db.run(sql`
    CREATE TABLE IF NOT EXISTS habit_logs (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      habit_key TEXT NOT NULL,
      log_date TEXT NOT NULL,
      completed INTEGER NOT NULL DEFAULT 0,
      value_numeric REAL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      UNIQUE(user_id, habit_key, log_date)
    )
  `);

  await db.run(sql`
    CREATE TABLE IF NOT EXISTS workout_sessions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      session_date TEXT NOT NULL,
      gym_day INTEGER NOT NULL,
      label TEXT NOT NULL,
      started_at TEXT,
      completed_at TEXT,
      duration_minutes INTEGER,
      completed INTEGER NOT NULL DEFAULT 0,
      notes TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )
  `);

  await db.run(sql`
    CREATE TABLE IF NOT EXISTS daily_stats (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      stat_date TEXT NOT NULL,
      total_scheduled INTEGER NOT NULL DEFAULT 0,
      total_completed INTEGER NOT NULL DEFAULT 0,
      total_skipped INTEGER NOT NULL DEFAULT 0,
      total_late INTEGER NOT NULL DEFAULT 0,
      avg_lateness_minutes REAL NOT NULL DEFAULT 0,
      water_ml INTEGER NOT NULL DEFAULT 0,
      water_target_ml INTEGER NOT NULL DEFAULT 3000,
      reading_completed INTEGER NOT NULL DEFAULT 0,
      english_completed INTEGER NOT NULL DEFAULT 0,
      turkish_completed INTEGER NOT NULL DEFAULT 0,
      workout_completed INTEGER NOT NULL DEFAULT 0,
      discipline_score REAL NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      UNIQUE(user_id, stat_date)
    )
  `);

  await db.run(sql`
    CREATE TABLE IF NOT EXISTS sync_queue (
      id TEXT PRIMARY KEY,
      table_name TEXT NOT NULL,
      operation TEXT NOT NULL,
      record_id TEXT NOT NULL,
      payload TEXT NOT NULL,
      attempts INTEGER NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'pending',
      created_at TEXT NOT NULL
    )
  `);

  // Indexes
  await db.run(sql`CREATE INDEX IF NOT EXISTS idx_si_user_date ON schedule_instances(user_id, instance_date)`);
  await db.run(sql`CREATE INDEX IF NOT EXISTS idx_wl_user_logged ON water_logs(user_id, logged_at)`);
  await db.run(sql`CREATE INDEX IF NOT EXISTS idx_hl_user_date ON habit_logs(user_id, log_date)`);
  await db.run(sql`CREATE INDEX IF NOT EXISTS idx_ws_user_date ON workout_sessions(user_id, session_date)`);
  await db.run(sql`CREATE INDEX IF NOT EXISTS idx_sq_status ON sync_queue(status, created_at)`);
}
