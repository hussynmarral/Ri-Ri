import { create } from 'zustand';
import { sendAICommand } from '@/lib/ai/client';
import { executeAIAction } from '@/lib/ai/actions';
import { validateAllActions } from '@/lib/ai/validator';
import { todayDateISO } from '@/lib/scheduler/engine';
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
      const result = await sendAICommand(message, context);

      // Validate all proposed actions immediately so the user sees issues before tapping Apply
      const validations = result.actions.length > 0
        ? await validateAllActions(result.actions, userId, todayDateISO())
        : [];

      set({
        aiResponse: result.response,
        pendingActions: result.actions,
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

    // Re-validate if we somehow don't have results yet
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
      for (const action of pendingActions) {
        const result = await executeAIAction(action, userId);
        if (!result.success) throw new Error(result.message);
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
