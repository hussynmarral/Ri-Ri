import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { fetchGeminiModels, fetchGroqModels } from '@/lib/ai/directClient';

export interface AIPrefs {
  provider:        'gemini' | 'groq';
  geminiModel:     string;
  groqModel:       string;
  tone:            'concise' | 'balanced' | 'detailed';
  personality:     'formal' | 'casual';
  confirmBehavior: 'always' | 'smart' | 'never';
  geminiKey:       string;  // stored locally in AsyncStorage — never committed
  groqKey:         string;
}

const DEFAULTS: AIPrefs = {
  provider:        'gemini',
  geminiModel:     'gemini-2.5-flash',
  groqModel:       'llama-3.3-70b-versatile',
  tone:            'balanced',
  personality:     'casual',
  confirmBehavior: 'always',
  geminiKey:       '',
  groqKey:         '',
};

const STORAGE_KEY = '@ri_ri_ai_prefs';

interface AIPrefsState {
  prefs:         AIPrefs;
  loaded:        boolean;
  availableModels: string[];
  modelsFetching:  boolean;
  modelsError:     string | null;
  load:          () => Promise<void>;
  update:        (partial: Partial<AIPrefs>) => Promise<void>;
  fetchModels:   () => Promise<void>;
}

export const useAIPrefsStore = create<AIPrefsState>((set, get) => ({
  prefs:           DEFAULTS,
  loaded:          false,
  availableModels: [],
  modelsFetching:  false,
  modelsError:     null,

  load: async () => {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      if (raw) {
        const saved = JSON.parse(raw) as Partial<AIPrefs>;
        set({ prefs: { ...DEFAULTS, ...saved }, loaded: true });
      } else {
        set({ loaded: true });
      }
    } catch {
      set({ loaded: true });
    }
  },

  update: async (partial) => {
    const updated = { ...get().prefs, ...partial };
    set({ prefs: updated });
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } catch {}
  },

  fetchModels: async () => {
    const { prefs } = get();
    set({ modelsFetching: true, modelsError: null });
    try {
      let models: string[];
      if (prefs.provider === 'groq') {
        if (!prefs.groqKey) throw new Error('Enter your Groq API key first.');
        models = await fetchGroqModels(prefs.groqKey);
      } else {
        if (!prefs.geminiKey) throw new Error('Enter your Gemini API key first.');
        models = await fetchGeminiModels(prefs.geminiKey);
      }
      set({ availableModels: models, modelsFetching: false });
    } catch (e) {
      set({ modelsError: e instanceof Error ? e.message : 'Failed to fetch models', modelsFetching: false });
    }
  },
}));
