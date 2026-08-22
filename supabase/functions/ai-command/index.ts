import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY') ?? '';
const GROQ_API_KEY = Deno.env.get('GROQ_API_KEY') ?? '';
const GEMINI_MODEL = Deno.env.get('AI_GEMINI_MODEL') ?? 'gemini-2.0-flash-lite';
const GROQ_MODEL = Deno.env.get('AI_GROQ_MODEL') ?? 'llama3-8b-8192';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const JSON_HEADERS = { ...CORS, 'Content-Type': 'application/json' };

// ─── Types ────────────────────────────────────────────────────────────────────

interface ScheduleBlockContext {
  id: string;
  title: string;
  category: string;
  scheduledStart: string;
  scheduledEnd: string;
  status: string;
}

interface AIContext {
  date: string;
  blocks: ScheduleBlockContext[];
  waterMl: number;
  habitsCompleted: string[];
}

interface AIAction {
  type: string;
  requiresConfirmation: boolean;
  description: string;
  payload: Record<string, unknown>;
}

interface AIResult {
  response: string;
  actions: AIAction[];
}

// ─── System prompt ────────────────────────────────────────────────────────────

function buildSystemPrompt(ctx: AIContext): string {
  const blockLines = ctx.blocks.map((b) =>
    `  ${b.scheduledStart.slice(11, 16)} – ${b.scheduledEnd.slice(11, 16)} | ${b.title} [${b.category}] — ${b.status} (id: ${b.id})`
  ).join('\n');

  return `You are the AI assistant for Ri Ri, a personal operating system app.
The user's day runs 12:00 PM to 5:00 AM (next calendar day).

Today: ${ctx.date}
Water: ${ctx.waterMl} ml of 3000 ml goal
Habits done: ${ctx.habitsCompleted.join(', ') || 'none'}

Today's schedule (times are local):
${blockLines || '  (no blocks)'}

Constraints:
- Sleep window: 5:00 AM – 12:00 PM (never schedule here)
- Office block (17:00–22:00) is fixed and cannot be moved
- Gym runs at 22:15 for 90 minutes
- Times are always in ISO-8601 format
- Block IDs come from the schedule above — use them exactly

Respond ONLY with valid JSON in this exact shape:
{
  "response": "Brief natural-language reply to the user",
  "actions": [
    {
      "type": "add_event | move_task | change_schedule | change_recurring | delete_recurring | bulk_reschedule",
      "requiresConfirmation": true,
      "description": "One sentence describing what this action does",
      "payload": { ... }
    }
  ]
}

Payload shapes per type:
  add_event:        { title, category, date (YYYY-MM-DD), startTime (ISO), endTime (ISO), notes? }
  move_task:        { blockId, newStartTime (ISO), newEndTime (ISO) }
  change_schedule:  { blockId, newStartTime? (ISO), newEndTime? (ISO), newTitle? }
  change_recurring: { templateId, newStartHour?, newStartMinute?, newDurationMinutes?, newTitle? }
  delete_recurring: { templateId }
  bulk_reschedule:  { changes: [{blockId, newStartTime, newEndTime}] }

Set requiresConfirmation: false only for pure informational replies with no actions.
If you are unsure, return an empty actions array and ask a clarifying question.`;
}

// ─── Gemini call ──────────────────────────────────────────────────────────────

async function callGemini(systemPrompt: string, message: string): Promise<AIResult> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`;

  const body = {
    contents: [
      {
        role: 'user',
        parts: [{ text: `${systemPrompt}\n\nUser request: ${message}` }],
      },
    ],
    generationConfig: {
      responseMimeType: 'application/json',
      temperature: 0.2,
      maxOutputTokens: 1024,
    },
  };

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Gemini ${res.status}: ${text}`);
  }

  const data = await res.json();
  const raw = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? '{}';
  return JSON.parse(raw) as AIResult;
}

// ─── Groq fallback ────────────────────────────────────────────────────────────

async function callGroq(systemPrompt: string, message: string): Promise<AIResult> {
  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${GROQ_API_KEY}`,
    },
    body: JSON.stringify({
      model: GROQ_MODEL,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: message },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.2,
      max_tokens: 1024,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Groq ${res.status}: ${text}`);
  }

  const data = await res.json();
  const raw = data?.choices?.[0]?.message?.content ?? '{}';
  return JSON.parse(raw) as AIResult;
}

// ─── Handler ──────────────────────────────────────────────────────────────────

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS });
  }

  try {
    // Verify JWT
    const auth = req.headers.get('Authorization');
    if (!auth) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: JSON_HEADERS });
    }

    const supa = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: auth } } },
    );

    const { data: { user }, error: authErr } = await supa.auth.getUser();
    if (authErr || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: JSON_HEADERS });
    }

    const { message, context } = (await req.json()) as { message: string; context: AIContext };

    if (!message?.trim()) {
      return new Response(JSON.stringify({ error: 'message is required' }), { status: 400, headers: JSON_HEADERS });
    }

    const systemPrompt = buildSystemPrompt(context ?? { date: '', blocks: [], waterMl: 0, habitsCompleted: [] });

    let result: AIResult;
    try {
      result = await callGemini(systemPrompt, message);
    } catch (geminiErr) {
      console.error('Gemini failed, falling back to Groq:', geminiErr);
      result = await callGroq(systemPrompt, message);
    }

    // Ensure actions array always exists
    if (!Array.isArray(result.actions)) result.actions = [];

    return new Response(JSON.stringify(result), { headers: JSON_HEADERS });
  } catch (err) {
    console.error('ai-command error:', err);
    return new Response(JSON.stringify({ error: String(err) }), { status: 500, headers: JSON_HEADERS });
  }
});
