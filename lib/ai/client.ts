import { supabase } from '@/lib/supabase/client';
import type { AIAction } from '@/types';

export interface AIBlockContext {
  id: string;
  title: string;
  category: string;
  scheduledStart: string;
  scheduledEnd: string;
  status: string;
}

export interface AIContext {
  date: string;
  blocks: AIBlockContext[];
  waterMl: number;
  habitsCompleted: string[];
}

export interface AIResponse {
  response: string;
  actions: AIAction[];
}

export async function sendAICommand(message: string, context: AIContext): Promise<AIResponse> {
  const { data, error } = await supabase.functions.invoke('ai-command', {
    body: { message: message.trim(), context },
  });

  if (error) throw new Error(error.message ?? 'AI request failed');
  if (!data) throw new Error('Empty response from AI');

  const result = data as AIResponse;
  if (!Array.isArray(result.actions)) result.actions = [];

  return result;
}
