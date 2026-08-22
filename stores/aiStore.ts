import { create } from 'zustand';
import { sendAICommand } from '@/lib/ai/client';
import { executeAIAction } from '@/lib/ai/actions';
import type { AIContext } from '@/lib/ai/client';
import type { AIAction } from '@/types';

interface AIState {
  isLoading: boolean;
  pendingActions: AIAction[];
  aiResponse: string;
  error: string | null;
  sendCommand: (message: string, context: AIContext, userId: string) => Promise<void>;
  confirmActions: (userId: string, onDone: () => void) => Promise<void>;
  dismissActions: () => void;
}

export const useAIStore = create<AIState>((set, get) => ({
  isLoading: false,
  pendingActions: [],
  aiResponse: '',
  error: null,

  sendCommand: async (message, context, _userId) => {
    set({ isLoading: true, error: null, pendingActions: [], aiResponse: '' });
    try {
      const result = await sendAICommand(message, context);
      set({
        aiResponse: result.response,
        pendingActions: result.actions,
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
    const { pendingActions } = get();
    set({ isLoading: true });
    try {
      for (const action of pendingActions) {
        await executeAIAction(action, userId);
      }
      set({ pendingActions: [], aiResponse: '', isLoading: false });
      onDone();
    } catch (e) {
      set({
        error: e instanceof Error ? e.message : 'Failed to apply actions',
        isLoading: false,
      });
    }
  },

  dismissActions: () => {
    set({ pendingActions: [], aiResponse: '', error: null });
  },
}));
