import type { AIAction } from '@/types';

export interface AIBlockContext {
  id: string;
  title: string;
  category: string;
  scheduledStart: string;
  scheduledEnd: string;
  status: string;
  templateId?: string | null;
  isFlexWindow?: boolean;
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

