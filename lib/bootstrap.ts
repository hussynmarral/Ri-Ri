import { runLocalMigrations } from './db/migrations';
import { initNetworkMonitor, getIsOnline, onNetworkChange } from './sync/networkState';
import { processSyncQueue } from './sync/syncEngine';
import { bootstrapSync } from './sync/syncEngine';

let _bootstrapped = false;

export async function bootstrapApp(userId?: string) {
  if (_bootstrapped) return;
  _bootstrapped = true;

  // 1. Ensure local DB tables exist
  await runLocalMigrations();

  // 2. Start network monitor
  await initNetworkMonitor();

  // 3. If online and authenticated, sync
  if (userId && getIsOnline()) {
    await bootstrapSync(userId).catch(() => {});
  }

  // 4. Auto-sync whenever we come back online
  onNetworkChange(async (online) => {
    if (online && userId) {
      await processSyncQueue().catch(() => {});
    }
  });
}
