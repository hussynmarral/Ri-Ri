import type { BlockCategory } from '@/types';

export interface TemplateDefinition {
  category: BlockCategory;
  title: string;
  startHour: number;    // 0-23 local time; hour < 12 = post-midnight (next calendar day)
  startMinute: number;
  durationMinutes: number;
  daysOfWeek: number[]; // 1=Mon … 7=Sun
  isFlexWindow?: boolean;
  sortOrder?: number;
}

// ─── LOCKED 7-DAY ROUTINE (Asia/Karachi) ──────────────────────────────────────
// Routine day boundary: 12:00 PM → 5:00 AM (+1 calendar day)
// Blocks with startHour < 12 are placed on instanceDate + 1 calendar day.
// Do NOT reorder or merge days. Each day is authoritative and independent.

const WEEKDAYS = [1, 2, 3, 4, 5]; // Mon–Fri
const SAT      = [6];
const SUN      = [7];

export const DEFAULT_TEMPLATES: TemplateDefinition[] = [

  // ════════════════════════════════════════════════════════════
  //  MONDAY – FRIDAY
  // ════════════════════════════════════════════════════════════

  // Morning
  { category: 'shower',      title: 'Morning Shower',          startHour: 12, startMinute:  0,  durationMinutes:  30, daysOfWeek: WEEKDAYS, sortOrder:  10 },
  { category: 'meal',        title: 'Breakfast',               startHour: 12, startMinute: 30,  durationMinutes:  30, daysOfWeek: WEEKDAYS, sortOrder:  20 },

  // Afternoon work
  { category: 'agency',      title: 'Agency Work',             startHour: 13, startMinute:  0,  durationMinutes: 120, daysOfWeek: WEEKDAYS, sortOrder:  30 },
  { category: 'shopify',     title: 'Shopify / Dropshipping',  startHour: 15, startMinute:  0,  durationMinutes:  60, daysOfWeek: WEEKDAYS, sortOrder:  40 },
  { category: 'language',    title: 'English',                 startHour: 16, startMinute:  0,  durationMinutes:  15, daysOfWeek: WEEKDAYS, sortOrder:  50 },
  { category: 'language',    title: 'Turkish',                 startHour: 16, startMinute: 15,  durationMinutes:  15, daysOfWeek: WEEKDAYS, sortOrder:  60 },
  { category: 'other',       title: 'Get Ready + Travel',      startHour: 16, startMinute: 30,  durationMinutes:  30, daysOfWeek: WEEKDAYS, sortOrder:  70 },

  // Evening
  { category: 'office',      title: 'Office',                  startHour: 17, startMinute:  0,  durationMinutes: 300, daysOfWeek: WEEKDAYS, sortOrder:  80 },
  { category: 'other',       title: 'Travel to Gym',           startHour: 22, startMinute:  0,  durationMinutes:  15, daysOfWeek: WEEKDAYS, sortOrder:  90 },
  { category: 'gym',         title: 'Gym',                     startHour: 22, startMinute: 15,  durationMinutes:  90, daysOfWeek: WEEKDAYS, sortOrder: 100 },
  { category: 'other',       title: 'Travel Home',             startHour: 23, startMinute: 45,  durationMinutes:  15, daysOfWeek: WEEKDAYS, sortOrder: 110 },

  // Post-midnight (hour < 12 → placed on instanceDate + 1)
  { category: 'shower',      title: 'Night Shower',            startHour:  0, startMinute:  0,  durationMinutes:  30, daysOfWeek: WEEKDAYS, sortOrder: 120 },
  { category: 'meal',        title: 'Main Meal',               startHour:  0, startMinute: 30,  durationMinutes:  30, daysOfWeek: WEEKDAYS, sortOrder: 130 },
  { category: 'shopify',     title: 'Night Deep Work',         startHour:  1, startMinute:  0,  durationMinutes: 120, daysOfWeek: WEEKDAYS, sortOrder: 140 },
  { category: 'flex',        title: 'Movement / Break',        startHour:  3, startMinute:  0,  durationMinutes:  15, daysOfWeek: WEEKDAYS, sortOrder: 150, isFlexWindow: true },
  { category: 'content',     title: 'Social Media',            startHour:  3, startMinute: 15,  durationMinutes:  60, daysOfWeek: WEEKDAYS, sortOrder: 160 },
  { category: 'skincare',    title: 'Skincare + Hair + Supps', startHour:  4, startMinute: 15,  durationMinutes:  30, daysOfWeek: WEEKDAYS, sortOrder: 170 },
  { category: 'review',      title: 'Daily Review',            startHour:  4, startMinute: 45,  durationMinutes:  15, daysOfWeek: WEEKDAYS, sortOrder: 180 },
  { category: 'sleep',       title: 'Sleep',                   startHour:  5, startMinute:  0,  durationMinutes: 420, daysOfWeek: WEEKDAYS, sortOrder: 190 },

  // ════════════════════════════════════════════════════════════
  //  SATURDAY
  // ════════════════════════════════════════════════════════════

  { category: 'shower',      title: 'Morning Shower',          startHour: 12, startMinute:  0,  durationMinutes:  30, daysOfWeek: SAT, sortOrder:  10 },
  { category: 'meal',        title: 'Breakfast',               startHour: 12, startMinute: 30,  durationMinutes:  30, daysOfWeek: SAT, sortOrder:  20 },
  { category: 'agency',      title: 'Agency Work',             startHour: 13, startMinute:  0,  durationMinutes: 120, daysOfWeek: SAT, sortOrder:  30 },
  { category: 'shopify',     title: 'Shopify / Dropshipping',  startHour: 15, startMinute:  0,  durationMinutes:  60, daysOfWeek: SAT, sortOrder:  40 },
  { category: 'language',    title: 'English',                 startHour: 16, startMinute:  0,  durationMinutes:  15, daysOfWeek: SAT, sortOrder:  50 },
  { category: 'language',    title: 'Turkish',                 startHour: 16, startMinute: 15,  durationMinutes:  15, daysOfWeek: SAT, sortOrder:  60 },
  { category: 'other',       title: 'Preparation',             startHour: 16, startMinute: 30,  durationMinutes:  30, daysOfWeek: SAT, sortOrder:  70 },
  { category: 'content',     title: 'Content Shooting',        startHour: 17, startMinute:  0,  durationMinutes: 210, daysOfWeek: SAT, sortOrder:  80 },
  { category: 'meal',        title: 'Meal / Recovery',         startHour: 20, startMinute: 30,  durationMinutes:  30, daysOfWeek: SAT, sortOrder:  90 },
  { category: 'weekend_run', title: 'Run / Walk',              startHour: 21, startMinute:  0,  durationMinutes:  60, daysOfWeek: SAT, sortOrder: 100 },
  { category: 'shower',      title: 'Shower',                  startHour: 22, startMinute:  0,  durationMinutes:  30, daysOfWeek: SAT, sortOrder: 110 },
  { category: 'shopify',     title: 'Business / Deep Work',    startHour: 22, startMinute: 30,  durationMinutes: 120, daysOfWeek: SAT, sortOrder: 120 },

  // Post-midnight Saturday
  { category: 'meal',        title: 'Main Meal',               startHour:  0, startMinute: 30,  durationMinutes:  30, daysOfWeek: SAT, sortOrder: 130 },
  { category: 'reading',     title: 'Reading',                 startHour:  1, startMinute:  0,  durationMinutes:  15, daysOfWeek: SAT, sortOrder: 140 },
  { category: 'content',     title: 'Social Media Editing',    startHour:  1, startMinute: 15,  durationMinutes:  60, daysOfWeek: SAT, sortOrder: 150 },
  { category: 'skincare',    title: 'Skincare + Hair + Supps', startHour:  2, startMinute: 15,  durationMinutes:  30, daysOfWeek: SAT, sortOrder: 160 },
  { category: 'language',    title: 'Language Weekly Test',    startHour:  2, startMinute: 45,  durationMinutes:  30, daysOfWeek: SAT, sortOrder: 170 },
  { category: 'review',      title: 'Weekly Reflection',       startHour:  3, startMinute: 15,  durationMinutes:  45, daysOfWeek: SAT, sortOrder: 180 },
  { category: 'flex',        title: 'Flexible Window',         startHour:  4, startMinute:  0,  durationMinutes:  60, daysOfWeek: SAT, sortOrder: 190, isFlexWindow: true },
  { category: 'sleep',       title: 'Sleep',                   startHour:  5, startMinute:  0,  durationMinutes: 420, daysOfWeek: SAT, sortOrder: 200 },

  // ════════════════════════════════════════════════════════════
  //  SUNDAY
  // ════════════════════════════════════════════════════════════

  { category: 'shower',      title: 'Morning Shower',          startHour: 12, startMinute:  0,  durationMinutes:  30, daysOfWeek: SUN, sortOrder:  10 },
  { category: 'meal',        title: 'Breakfast',               startHour: 12, startMinute: 30,  durationMinutes:  30, daysOfWeek: SUN, sortOrder:  20 },
  { category: 'agency',      title: 'Business Work',           startHour: 13, startMinute:  0,  durationMinutes: 120, daysOfWeek: SUN, sortOrder:  30 },
  { category: 'shopify',     title: 'Shopify / Business',      startHour: 15, startMinute:  0,  durationMinutes:  60, daysOfWeek: SUN, sortOrder:  40 },
  { category: 'language',    title: 'English',                 startHour: 16, startMinute:  0,  durationMinutes:  15, daysOfWeek: SUN, sortOrder:  50 },
  { category: 'language',    title: 'Turkish',                 startHour: 16, startMinute: 15,  durationMinutes:  15, daysOfWeek: SUN, sortOrder:  60 },
  { category: 'language',    title: 'Language Review',         startHour: 16, startMinute: 30,  durationMinutes:  30, daysOfWeek: SUN, sortOrder:  70 },
  { category: 'review',      title: 'Heavy Research',          startHour: 17, startMinute:  0,  durationMinutes: 120, daysOfWeek: SUN, sortOrder:  80 },
  { category: 'meal',        title: 'Meal / Break',            startHour: 19, startMinute:  0,  durationMinutes:  30, daysOfWeek: SUN, sortOrder:  90 },
  { category: 'shopify',     title: 'Research / Business',     startHour: 19, startMinute: 30,  durationMinutes: 120, daysOfWeek: SUN, sortOrder: 100 },
  { category: 'other',       title: 'Prepare for Run',         startHour: 21, startMinute: 30,  durationMinutes:  30, daysOfWeek: SUN, sortOrder: 110 },
  { category: 'weekend_run', title: 'Run / Walk',              startHour: 22, startMinute:  0,  durationMinutes: 120, daysOfWeek: SUN, sortOrder: 120 },

  // Post-midnight Sunday
  { category: 'shower',      title: 'Night Shower',            startHour:  0, startMinute:  0,  durationMinutes:  30, daysOfWeek: SUN, sortOrder: 130 },
  { category: 'meal',        title: 'Main Meal',               startHour:  0, startMinute: 30,  durationMinutes:  30, daysOfWeek: SUN, sortOrder: 140 },
  { category: 'reading',     title: 'Reading',                 startHour:  1, startMinute:  0,  durationMinutes:  15, daysOfWeek: SUN, sortOrder: 150 },
  { category: 'content',     title: 'Social Media Editing',    startHour:  1, startMinute: 15,  durationMinutes:  60, daysOfWeek: SUN, sortOrder: 160 },
  { category: 'skincare',    title: 'Skincare + Hair + Supps', startHour:  2, startMinute: 15,  durationMinutes:  30, daysOfWeek: SUN, sortOrder: 170 },
  { category: 'weekly_reset',title: 'Weekly Reset',            startHour:  2, startMinute: 45,  durationMinutes:  30, daysOfWeek: SUN, sortOrder: 180 },
  { category: 'review',      title: 'Daily Review',            startHour:  3, startMinute: 15,  durationMinutes:  30, daysOfWeek: SUN, sortOrder: 190 },
  { category: 'flex',        title: 'Planning / Wind Down',    startHour:  3, startMinute: 45,  durationMinutes:  75, daysOfWeek: SUN, sortOrder: 200, isFlexWindow: true },
  { category: 'sleep',       title: 'Sleep',                   startHour:  5, startMinute:  0,  durationMinutes: 420, daysOfWeek: SUN, sortOrder: 210 },
];

export const TEMPLATE_COUNT = DEFAULT_TEMPLATES.length;

// Bump this whenever templates change content (not just count).
// Seed stores this as a special marker row; mismatch forces a full wipe + reseed.
export const SEED_VERSION = 3;
