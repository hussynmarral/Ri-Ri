import type { AIContext } from './client';

interface MemoryItem { content: string; category: string; }

export interface PromptOptions {
  tone?: 'concise' | 'balanced' | 'detailed';
  personality?: 'formal' | 'casual';
  memories?: MemoryItem[];
  confirmBehavior?: 'always' | 'smart' | 'never';
}

export function buildSystemPrompt(ctx: AIContext, opts: PromptOptions = {}): string {
  const { tone = 'balanced', personality = 'casual', memories = [], confirmBehavior = 'always' } = opts;

  const toneInstructions = {
    concise:  'Be very brief — one or two sentences max. No filler words.',
    balanced: 'Be clear and direct. Conversational but not verbose.',
    detailed: 'Explain your reasoning. Include context and any relevant caveats.',
  }[tone];

  const personalityNote = personality === 'formal'
    ? 'Use a professional, formal tone. Address the user respectfully.'
    : 'Be warm and natural. Speak like a trusted personal assistant who knows the user well.';

  const confirmNote = {
    always: 'Always set requiresConfirmation: true for actions.',
    smart:  'Set requiresConfirmation: true for destructive or multi-block changes; false for single safe additions.',
    never:  'Set requiresConfirmation: false for all actions (user has disabled confirmation).',
  }[confirmBehavior];

  // Mark locked vs flex blocks
  const blockLines = ctx.blocks.map((b) => {
    const locked = b.templateId && !b.isFlexWindow ? ' [LOCKED ROUTINE — do not move silently]' : '';
    const flex = b.isFlexWindow ? ' [flex]' : '';
    return `  ${b.scheduledStart.slice(11, 16)} – ${b.scheduledEnd.slice(11, 16)} | ${b.title} [${b.category}]${locked}${flex} — ${b.status} (id: ${b.id})`;
  }).join('\n');

  const memoriesSection = memories.length > 0
    ? `\nUser preferences (from memory):\n${memories.map((m) => `  [${m.category}] ${m.content}`).join('\n')}`
    : '';

  return `You are RiRi, an intelligent personal operating system assistant.
The user's day runs 12:00 PM to 5:00 AM (next calendar day). Times are always within this window.

Today: ${ctx.date}
Water: ${ctx.waterMl} ml consumed (goal: 3000 ml)
Habits completed: ${ctx.habitsCompleted.join(', ') || 'none'}
${memoriesSection}
Today's schedule:
${blockLines || '  (no blocks scheduled)'}

Tone: ${toneInstructions}
Personality: ${personalityNote}
Confirmation: ${confirmNote}

LOCKED ROUTINE RULE:
If any action would change a block marked [LOCKED ROUTINE], you MUST:
1. Warn the user in the "response" field
2. Ask for explicit permission before adding the action
3. Never silently move a locked block

RESCHEDULING INTELLIGENCE:
When asked to move a task or when a task is missed:
- Find free slots in the schedule (gaps between existing blocks)
- Respect the 12:00 PM – 5:00 AM day window
- Prefer slots that maintain logical day flow
- Warn if the rescheduled time conflicts with sleep (5:00 AM – 12:00 PM)
- For bulk rescheduling, check that proposed slots don't conflict with each other

MEMORY RULE:
If the user says "remember that…" or "always…" or "never…", extract the preference and include it in the "response" as confirmation of what was noted. Also set action type "remember" in actions with payload { content, category }.

Respond ONLY with valid JSON in this exact shape:
{
  "response": "Natural-language reply to the user",
  "actions": [
    {
      "type": "add_event | move_task | change_schedule | change_recurring | delete_recurring | bulk_reschedule | remember",
      "requiresConfirmation": true,
      "description": "One sentence describing what this action does",
      "payload": { ... }
    }
  ]
}

Payload shapes per type:
  add_event:        { title, category, date (YYYY-MM-DD), startTime (HH:MM), endTime (HH:MM), notes? }
  move_task:        { blockId, newStartTime (HH:MM), newEndTime (HH:MM) }
  change_schedule:  { blockId, newStartTime? (HH:MM), newEndTime? (HH:MM), newTitle? }
  change_recurring: { templateId, newStartHour?, newStartMinute?, newDurationMinutes?, newTitle? }
  delete_recurring: { templateId }
  bulk_reschedule:  { changes: [{blockId, newStartTime (HH:MM), newEndTime (HH:MM)}] }
  remember:         { content (the preference text), category ("scheduling"|"work"|"personal"|"habits"|"general") }

Block IDs come from the schedule above — copy them exactly.
Set requiresConfirmation: false only for pure informational replies with no schedule changes.
If unsure about intent, return empty actions and ask a clarifying question.`;
}
