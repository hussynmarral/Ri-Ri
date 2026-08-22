import { runLocalMigrations } from './db/migrations';
import { initNetworkMonitor, getIsOnline, onNetworkChange } from './sync/networkState';
import { processSyncQueue, bootstrapSync } from './sync/syncEngine';
import { seedDefaultTemplates } from './scheduler/seedTemplates';
import { requestNotificationPermissions } from './notifications/permissions';

let _infraReady = false;
// Updated each time bootstrapApp is called with a userId so the reconnect
// handler always fires with the most-recently-authenticated user.
let _currentUserId: string | undefined;

export async function bootstrapApp(userId?: string) {
  // Track the latest known user for reconnect syncs
  if (userId) _currentUserId = userId;

  // ─── One-time infrastructure setup ──────────────────────────────────────
  if (!_infraReady) {
    _infraReady = true;

    // 1. Ensure local DB tables exist
    await runLocalMigrations();

    // 2. Start network monitor
    await initNetworkMonitor();

    // 3. Request notification permissions (non-blocking)
    requestNotificationPermissions().catch(() => {});

    // 4. Auto-sync whenever we come back online — reads current user lazily
    onNetworkChange(async (online) => {
      if (online && _currentUserId) {
        await processSyncQueue().catch(() => {});
      }
    });
  }

  // ─── Per-user setup (runs every time a userId is provided) ───────────────
  if (!userId) return;

  // 5. Seed default templates (no-op if already seeded)
  await seedDefaultTemplates(userId).catch(() => {});

  // 6. If online, push pending queue then pull remote changes
  if (getIsOnline()) {
    await bootstrapSync(userId).catch(() => {});
  }
}
