import { create } from 'zustand';
import { eq } from 'drizzle-orm';
import { sendDirectAICommand } from '@/lib/ai/directClient';
import { executeAIAction } from '@/lib/ai/actions';
import { validateAllActions } from '@/lib/ai/validator';
import { todayDateISO } from '@/lib/scheduler/engine';
import { useAIPrefsStore } from '@/stores/aiPrefsStore';
import { useAIMemoryStore } from '@/stores/aiMemoryStore';
import { useAIActionLogStore } from '@/stores/aiActionLogStore';
import { db } from '@/lib/db/client';
import { scheduleInstances } from '@/lib/db/schema';
import type { AIContext } from '@/lib/ai/client';
import type { ValidationResult } from '@/lib/ai/validator';
import type { AIAction } from '@/types';

interface AIState {
  isLoading: boolean;
  pendingActions: AIAction[];
  actionValidations: ValidationResult[];
  aiResponse: string;
  error: string | null;
  sendCommand: (message: string, context: AIContext, userId: string) => Promise<void>;
  confirmActions: (userId: string, onDone: () => void) => Promise<void>;
  dismissActions: () => void;
}

export const useAIStore = create<AIState>((set, get) => ({
  isLoading: false,
  pendingActions: [],
  actionValidations: [],
  aiResponse: '',
  error: null,

  sendCommand: async (message, context, userId) => {
    set({ isLoading: true, error: null, pendingActions: [], actionValidations: [], aiResponse: '' });
    try {
      const prefs = useAIPrefsStore.getState().prefs;
      const memories = useAIMemoryStore.getState().memories;

      const result = await sendDirectAICommand(message, context, prefs, { memories });

      // "remember" actions never need user confirmation — handle them immediately
      const rememberActions = result.actions.filter((a) => a.type === 'remember');
      const scheduleActions = result.actions.filter((a) => a.type !== 'remember');

      for (const ra of rememberActions) {
        const content = ra.payload.content as string;
        const category = (ra.payload.category as string) ?? 'general';
        if (content?.trim()) {
          await useAIMemoryStore.getState().addMemory(userId, content.trim(), category as any);
        }
      }

      const validations = scheduleActions.length > 0
        ? await validateAllActions(scheduleActions, userId, todayDateISO())
        : [];

      set({
        aiResponse: result.response,
        pendingActions: scheduleActions,
        actionValidations: validations,
        isLoading: false,
      });
    } catch (e) {
      set({
        error: e instanceof Error ? e.message : 'AI request failed',
        isLoading: false,
      });
    }
  },

  confirmActions: async (userId, onDone) => {
    const { pendingActions, actionValidations } = get();

    const validations = actionValidations.length === pendingActions.length
      ? actionValidations
      : await validateAllActions(pendingActions, userId, todayDateISO());

    const firstInvalid = validations.find((v) => !v.valid);
    if (firstInvalid) {
      set({ error: firstInvalid.reason ?? 'One or more actions failed validation', actionValidations: validations });
      return;
    }

    set({ isLoading: true, error: null });
    try {
      // Capture reversal payloads BEFORE executing (snapshot pre-execution state)
      const actionsWithReversal = await Promise.all(
        pendingActions.map(async (action) => {
          let reversalPayload: Record<string, unknown> | null = null;
          if (action.type === 'change_schedule' || action.type === 'move_task') {
            const blockId = action.payload.blockId as string | undefined;
            if (blockId) {
              const rows = await db.select().from(scheduleInstances).where(eq(scheduleInstances.id, blockId));
              if (rows[0]) {
                reversalPayload = {
                  blockId,
                  newStartTime: rows[0].scheduledStart,
                  newEndTime: rows[0].scheduledEnd,
                  newTitle: rows[0].title,
                };
              }
            }
          }
          return { action, reversalPayload };
        }),
      );

      for (const { action } of actionsWithReversal) {
        const result = await executeAIAction(action, userId);
        if (!result.success) throw new Error(result.message);
      }

      // Log executed actions for history/undo tracking
      if (actionsWithReversal.length > 0) {
        await useAIActionLogStore.getState().logActions(
          userId,
          actionsWithReversal.map(({ action, reversalPayload }) => ({
            actionType: action.type,
            description: action.description,
            payload: action.payload,
            reversalPayload,
          })),
        );
      }

      set({ pendingActions: [], actionValidations: [], aiResponse: '', isLoading: false });
      onDone();
    } catch (e) {
      set({
        error: e instanceof Error ? e.message : 'Failed to apply actions',
        isLoading: false,
      });
    }
  },

  dismissActions: () => {
    set({ pendingActions: [], actionValidations: [], aiResponse: '', error: null });
  },
}));
