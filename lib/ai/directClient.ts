import type { AIContext, AIResponse } from './client';
import type { AIPrefs } from '@/stores/aiPrefsStore';
import { buildSystemPrompt, type PromptOptions } from './prompt';

// ── Gemini ────────────────────────────────────────────────────────────────────

export async function fetchGeminiModels(apiKey: string): Promise<string[]> {
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`,
  );
  if (!res.ok) throw new Error(`Gemini ${res.status}: ${await res.text()}`);
  const data = await res.json();
  return (data.models as any[])
    .filter((m) => m.supportedGenerationMethods?.includes('generateContent'))
    .map((m) => (m.name as string).replace('models/', ''))
    .filter((n) => n.startsWith('gemini'));
}

async function callGemini(message: string, context: AIContext, prefs: AIPrefs, opts?: PromptOptions): Promise<AIResponse> {
  if (!prefs.geminiKey) throw new Error('Gemini API key not set. Open AI Settings and add your key.');
  const model = prefs.geminiModel || 'gemini-2.5-flash';
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${prefs.geminiKey}`;
  const systemPrompt = buildSystemPrompt(context, { tone: prefs.tone, personality: (prefs as any).personality, memories: opts?.memories, confirmBehavior: (prefs as any).confirmBehavior });

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ role: 'user', parts: [{ text: `${systemPrompt}\n\nUser request: ${message}` }] }],
      generationConfig: { responseMimeType: 'application/json', temperature: 0.2, maxOutputTokens: 1024 },
    }),
  });

  if (!res.ok) throw new Error(`Gemini ${res.status}: ${await res.text()}`);
  const data = await res.json();
  const raw = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? '{}';
  const result = JSON.parse(raw) as AIResponse;
  if (!Array.isArray(result.actions)) result.actions = [];
  return result;
}

// ── Groq ──────────────────────────────────────────────────────────────────────

export async function fetchGroqModels(apiKey: string): Promise<string[]> {
  const res = await fetch('https://api.groq.com/openai/v1/models', {
    headers: { Authorization: `Bearer ${apiKey}` },
  });
  if (!res.ok) throw new Error(`Groq ${res.status}: ${await res.text()}`);
  const data = await res.json();
  return (data.data as any[])
    .filter((m) => !m.id.includes('whisper') && !m.id.includes('tts'))
    .map((m) => m.id as string)
    .sort();
}

async function callGroq(message: string, context: AIContext, prefs: AIPrefs, opts?: PromptOptions): Promise<AIResponse> {
  if (!prefs.groqKey) throw new Error('Groq API key not set. Open AI Settings and add your key.');
  const model = prefs.groqModel || 'llama-3.3-70b-versatile';
  const systemPrompt = buildSystemPrompt(context, { tone: prefs.tone, personality: (prefs as any).personality, memories: opts?.memories, confirmBehavior: (prefs as any).confirmBehavior });

  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${prefs.groqKey}` },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: message },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.2,
      max_tokens: 1024,
    }),
  });

  if (!res.ok) throw new Error(`Groq ${res.status}: ${await res.text()}`);
  const data = await res.json();
  const raw = data?.choices?.[0]?.message?.content ?? '{}';
  const result = JSON.parse(raw) as AIResponse;
  if (!Array.isArray(result.actions)) result.actions = [];
  return result;
}

// ── Entry point ───────────────────────────────────────────────────────────────

export async function sendDirectAICommand(
  message: string,
  context: AIContext,
  prefs: AIPrefs,
  opts?: PromptOptions,
): Promise<AIResponse> {
  if (prefs.provider === 'groq') {
    return callGroq(message, context, prefs, opts);
  }
  if (!prefs.geminiKey && prefs.groqKey) {
    return callGroq(message, context, prefs, opts);
  }
  try {
    return await callGemini(message, context, prefs, opts);
  } catch (err) {
    if (prefs.groqKey) {
      console.warn('Gemini failed, falling back to Groq:', err);
      return callGroq(message, context, prefs, opts);
    }
    throw err;
  }
}
