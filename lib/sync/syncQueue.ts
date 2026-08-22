import { db } from '@/lib/db/client';
import { syncQueue } from '@/lib/db/schema';
import { eq, asc } from 'drizzle-orm';
import * as Crypto from 'expo-crypto';

type Operation = 'insert' | 'update' | 'delete';

export async function enqueueChange(
  tableName: string,
  operation: Operation,
  recordId: string,
  payload: Record<string, unknown>,
) {
  const id = await Crypto.randomUUID();
  await db.insert(syncQueue).values({
    id,
    tableName,
    operation,
    recordId,
    payload: JSON.stringify(payload),
    attempts: 0,
    status: 'pending',
    createdAt: new Date().toISOString(),
  });
}

export async function getPendingItems() {
  return db
    .select()
    .from(syncQueue)
    .where(eq(syncQueue.status, 'pending'))
    .orderBy(asc(syncQueue.createdAt));
}

export async function markSynced(id: string) {
  await db.update(syncQueue).set({ status: 'synced' }).where(eq(syncQueue.id, id));
}

export async function markError(id: string, attempts: number) {
  await db
    .update(syncQueue)
    .set({ status: attempts >= 5 ? 'error' : 'pending', attempts })
    .where(eq(syncQueue.id, id));
}

export async function clearSynced() {
  await db.delete(syncQueue).where(eq(syncQueue.status, 'synced'));
}
