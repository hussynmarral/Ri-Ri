import { create } from 'zustand';
import { db } from '@/lib/db/client';
import { userSettings } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { enqueueChange } from '@/lib/sync/syncQueue';
import * as Crypto from 'expo-crypto';

export interface Settings {
  id: string;
  userId: string;
  waterTargetMl: number;
  wakeHour: number;
  wakeMinute: number;
  sleepHour: number;
  sleepMinute: number;
  enabledMarkets: string[];
  waterReminderTimes: string[];
  waterReminderAmountMl: number;
  waterFollowupIntervalMinutes: number;
  theme: 'system' | 'light' | 'dark';
  updatedAt: string;
}

const DEFAULT_SETTINGS: Omit<Settings, 'id' | 'userId' | 'updatedAt'> = {
  waterTargetMl: 3000,
  wakeHour: 12,
  wakeMinute: 0,
  sleepHour: 5,
  sleepMinute: 0,
  enabledMarkets: ['nyc', 'chi', 'lax', 'lon', 'ist'],
  waterReminderTimes: ['13:00', '15:00', '17:00', '19:00', '21:00', '23:00', '01:00', '03:00'],
  waterReminderAmountMl: 375,
  waterFollowupIntervalMinutes: 30,
  theme: 'system',
};

interface SettingsState {
  settings: Settings | null;
  isLoading: boolean;
  load: (userId: string) => Promise<void>;
  update: (partial: Partial<Omit<Settings, 'id' | 'userId' | 'updatedAt'>>) => Promise<void>;
}

export const useSettingsStore = create<SettingsState>((set, get) => ({
  settings: null,
  isLoading: false,

  load: async (userId) => {
    set({ isLoading: true });
    const rows = await db.select().from(userSettings).where(eq(userSettings.userId, userId));

    if (rows.length > 0) {
      const r = rows[0];
      set({
        settings: {
          ...r,
          enabledMarkets: JSON.parse(r.enabledMarkets),
          waterReminderTimes: JSON.parse(r.waterReminderTimes),
          theme: r.theme as Settings['theme'],
        },
        isLoading: false,
      });
    } else {
      // First launch — create default settings locally
      const id = await Crypto.randomUUID();
      const now = new Date().toISOString();
      const newSettings: Settings = { id, userId, ...DEFAULT_SETTINGS, updatedAt: now };

      await db.insert(userSettings).values({
        id,
        userId,
        ...DEFAULT_SETTINGS,
        enabledMarkets: JSON.stringify(DEFAULT_SETTINGS.enabledMarkets),
        waterReminderTimes: JSON.stringify(DEFAULT_SETTINGS.waterReminderTimes),
        updatedAt: now,
      });

      await enqueueChange('user_settings', 'insert', id, { id, user_id: userId, ...DEFAULT_SETTINGS, updated_at: now });
      set({ settings: newSettings, isLoading: false });
    }
  },

  update: async (partial) => {
    const current = get().settings;
    if (!current) return;

    const now = new Date().toISOString();
    const updated: Settings = { ...current, ...partial, updatedAt: now };

    await db.update(userSettings)
      .set({
        ...partial,
        enabledMarkets: partial.enabledMarkets ? JSON.stringify(partial.enabledMarkets) : undefined,
        waterReminderTimes: partial.waterReminderTimes ? JSON.stringify(partial.waterReminderTimes) : undefined,
        updatedAt: now,
      })
      .where(eq(userSettings.id, current.id));

    await enqueueChange('user_settings', 'update', current.id, {
      id: current.id,
      user_id: current.userId,
      ...partial,
      updated_at: now,
    });

    set({ settings: updated });
  },
}));
