import { Platform } from 'react-native';
import { supabase } from '@/lib/supabase/client';
import { db } from '@/lib/db/client';
import { getPendingItems, markSynced, markError, clearSynced } from './syncQueue';
import { getIsOnline } from './networkState';

// Tables that are synced to Supabase. sync_queue is local-only.
const SYNCABLE_TABLES = new Set([
  'profiles',
  'user_settings',
  'devices',
  'routine_templates',
  'schedule_overrides',
  'schedule_instances',
  'water_logs',
  'habit_logs',
  'workout_sessions',
  'daily_stats',
  'weekly_stats',
]);

// Column names from Supabase responses must only contain alphanumeric + underscore
// to prevent SQL injection via maliciously-crafted server responses.
function safeCol(name: string): string {
  if (!/^[a-z_][a-z0-9_]*$/i.test(name)) {
    throw new Error(`Unsafe column name: "${name}"`);
  }
  return name;
}

let _isSyncing = false;

export async function processSyncQueue(): Promise<{ synced: number; errors: number }> {
  if (!getIsOnline() || _isSyncing) return { synced: 0, errors: 0 };

  _isSyncing = true;
  let synced = 0;
  let errors = 0;

  try {
    const items = await getPendingItems();

    for (const item of items) {
      if (!SYNCABLE_TABLES.has(item.tableName)) {
        await markSynced(item.id);
        continue;
      }

      try {
        const payload = JSON.parse(item.payload) as Record<string, unknown>;

        if (item.operation === 'insert' || item.operation === 'update') {
          const { error } = await (supabase as any)
            .from(item.tableName)
            .upsert(payload, { onConflict: 'id' });

          if (error) throw error;
        } else if (item.operation === 'delete') {
          const { error } = await (supabase as any)
            .from(item.tableName)
            .delete()
            .eq('id', item.recordId);

          if (error) throw error;
        }

        await markSynced(item.id);
        synced++;
      } catch {
        await markError(item.id, item.attempts + 1);
        errors++;
      }
    }

    if (synced > 0) await clearSynced();
  } finally {
    _isSyncing = false;
  }

  return { synced, errors };
}

// Pull remote changes for a specific table since a given timestamp.
// Merges into local SQLite using last-write-wins on updated_at.
// No-op on web — expo-sqlite raw client is not available.
export async function pullRemoteTable(
  tableName: string,
  since: string,
  userId: string,
) {
  if (Platform.OS === 'web') return;
  if (!getIsOnline() || !SYNCABLE_TABLES.has(tableName)) return;

  const { data, error } = await (supabase as any)
    .from(tableName)
    .select('*')
    .eq('user_id', userId)
    .gt('updated_at', since);

  if (error || !data?.length) return;

  for (const row of data) {
    const cols = Object.keys(row).map(safeCol);
    const placeholders = cols.map(() => '?').join(', ');
    const setClauses = cols
      .filter((c) => c !== 'id')
      .map((c) => `${c} = excluded.${c}`)
      .join(', ');

    const stmt =
      `INSERT INTO ${tableName} (${cols.join(', ')}) VALUES (${placeholders}) ` +
      `ON CONFLICT(id) DO UPDATE SET ${setClauses}`;

    await (db as any).$client.execAsync(stmt, cols.map((c) => (row as Record<string, unknown>)[c]));
  }
}

// Bootstrap sync on app start: push queue then pull recent remote changes.
export async function bootstrapSync(userId: string) {
  if (!getIsOnline()) return;

  await processSyncQueue();

  // Pull changes from the last 7 days to catch any multi-device edits.
  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const tables = [
    'routine_templates',
    'schedule_instances',
    'schedule_overrides',
    'water_logs',
    'habit_logs',
    'workout_sessions',
    'daily_stats',
    'user_settings',
  ];

  await Promise.all(tables.map((t) => pullRemoteTable(t, since, userId)));
}
