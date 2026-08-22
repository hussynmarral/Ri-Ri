import { Platform } from 'react-native';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase/client';
import { db } from '@/lib/db/client';

export type SyncableTable =
  | 'schedule_instances'
  | 'water_logs'
  | 'habit_logs'
  | 'workout_sessions'
  | 'daily_stats'
  | 'routine_templates';

const REALTIME_TABLES: SyncableTable[] = [
  'schedule_instances',
  'water_logs',
  'habit_logs',
  'workout_sessions',
  'daily_stats',
  'routine_templates',
];

interface RealtimePayload {
  eventType: 'INSERT' | 'UPDATE' | 'DELETE';
  new: Record<string, unknown>;
  old: Record<string, unknown>;
}

// Column names from Supabase must only contain alphanumeric + underscore
// to prevent SQL injection via maliciously-crafted server responses.
function safeCol(name: string): string {
  if (!/^[a-z_][a-z0-9_]*$/i.test(name)) {
    throw new Error(`Unsafe column name: "${name}"`);
  }
  return name;
}

async function applyChange(table: string, payload: RealtimePayload): Promise<void> {
  // expo-sqlite raw client doesn't exist on web — skip local DB writes
  if (Platform.OS === 'web') return;

  try {
    if (payload.eventType === 'DELETE') {
      const id = payload.old?.id as string | undefined;
      if (id) {
        await (db as any).$client.execAsync(`DELETE FROM ${table} WHERE id = ?`, [id]);
      }
      return;
    }

    const row = payload.new;
    if (!row?.id) return;

    const cols = Object.keys(row).map(safeCol);
    if (cols.length === 0) return;

    const placeholders = cols.map(() => '?').join(', ');
    const setClauses = cols
      .filter((c) => c !== 'id')
      .map((c) => `${c} = excluded.${c}`)
      .join(', ');

    // Only overwrite if the incoming row is newer (last-write-wins)
    const hasUpdatedAt = cols.includes('updated_at');
    const whereClause = hasUpdatedAt
      ? `WHERE excluded.updated_at > ${table}.updated_at`
      : '';

    const sql =
      `INSERT INTO ${table} (${cols.join(', ')}) VALUES (${placeholders}) ` +
      `ON CONFLICT(id) DO UPDATE SET ${setClauses} ${whereClause}`;

    await (db as any).$client.execAsync(sql, cols.map((c) => row[c]));
  } catch {
    // Silently ignore — bootstrapSync will reconcile on next launch
  }
}

export function subscribeToUserChanges(
  userId: string,
  onTableChanged: (table: SyncableTable) => void,
): () => void {
  let channel: RealtimeChannel = supabase.channel(`riri_${userId}`);

  for (const table of REALTIME_TABLES) {
    channel = channel.on(
      'postgres_changes' as Parameters<typeof channel.on>[0],
      {
        event: '*',
        schema: 'public',
        table,
        filter: `user_id=eq.${userId}`,
      },
      async (payload: unknown) => {
        await applyChange(table, payload as RealtimePayload);
        onTableChanged(table);
      },
    );
  }

  channel.subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}
