import type { BlockCategory } from '@/types';

export interface TemplateDefinition {
  category: BlockCategory;
  title: string;
  startHour: number;    // 0-23 (hours < 12 are post-midnight, same routine day)
  startMinute: number;
  durationMinutes: number;
  daysOfWeek: number[]; // 1=Mon … 7=Sun
  isFlexWindow?: boolean;
  sortOrder?: number;
}

// Routine day: 12:00 PM → ~5:00 AM next calendar day
// Blocks with startHour < 12 are scheduled on instanceDate + 1 calendar day.

const WEEKDAYS = [1, 2, 3, 4, 5];
const WEEKEND  = [6, 7];
const EVERYDAY = [1, 2, 3, 4, 5, 6, 7];

export const DEFAULT_TEMPLATES: TemplateDefinition[] = [
  // ── Morning (all days) ────────────────────────────────────────
  { category: 'shower',      title: 'Morning Shower',        startHour: 12, startMinute: 0,  durationMinutes: 30,  daysOfWeek: EVERYDAY, sortOrder: 10 },
  { category: 'meal',        title: 'Breakfast',             startHour: 12, startMinute: 30, durationMinutes: 30,  daysOfWeek: EVERYDAY, sortOrder: 20 },

  // ── Weekday work blocks ───────────────────────────────────────
  { category: 'shopify',     title: 'Shopify Work',          startHour: 13, startMinute: 0,  durationMinutes: 120, daysOfWeek: WEEKDAYS, sortOrder: 30 },
  { category: 'flex',        title: 'Flex Window',           startHour: 15, startMinute: 0,  durationMinutes: 45,  daysOfWeek: WEEKDAYS, sortOrder: 40, isFlexWindow: true },
  { category: 'language',    title: 'English Learning',      startHour: 15, startMinute: 45, durationMinutes: 15,  daysOfWeek: WEEKDAYS, sortOrder: 50 },
  { category: 'language',    title: 'Turkish Learning',      startHour: 16, startMinute: 0,  durationMinutes: 15,  daysOfWeek: WEEKDAYS, sortOrder: 60 },
  { category: 'other',       title: 'Get Ready + Travel',    startHour: 16, startMinute: 15, durationMinutes: 45,  daysOfWeek: WEEKDAYS, sortOrder: 70 },
  { category: 'office',      title: 'Office',                startHour: 17, startMinute: 0,  durationMinutes: 300, daysOfWeek: WEEKDAYS, sortOrder: 80 },
  // Gym travel (15 min) is absorbed into the transition window
  { category: 'gym',         title: 'Gym',                   startHour: 22, startMinute: 15, durationMinutes: 90,  daysOfWeek: WEEKDAYS, sortOrder: 90 },

  // ── Weekday late night (post-midnight, same routine day) ──────
  { category: 'shower',      title: 'Night Shower',          startHour: 0,  startMinute: 0,  durationMinutes: 30,  daysOfWeek: WEEKDAYS, sortOrder: 100 },
  { category: 'skincare',    title: 'Skincare + Hair Care',  startHour: 0,  startMinute: 30, durationMinutes: 28,  daysOfWeek: WEEKDAYS, sortOrder: 110 },
  { category: 'agency',      title: 'Agency Work',           startHour: 1,  startMinute: 0,  durationMinutes: 120, daysOfWeek: WEEKDAYS, sortOrder: 120 },
  { category: 'content',     title: 'Content & Social Media',startHour: 3,  startMinute: 0,  durationMinutes: 60,  daysOfWeek: WEEKDAYS, sortOrder: 130 },
  { category: 'reading',     title: 'Reading',               startHour: 4,  startMinute: 0,  durationMinutes: 15,  daysOfWeek: EVERYDAY, sortOrder: 140 },
  { category: 'review',      title: 'Daily Review',          startHour: 4,  startMinute: 15, durationMinutes: 15,  daysOfWeek: EVERYDAY, sortOrder: 150 },
  { category: 'supplements', title: 'Supplements',           startHour: 4,  startMinute: 30, durationMinutes: 10,  daysOfWeek: EVERYDAY, sortOrder: 160 },
  { category: 'sleep',       title: 'Sleep',                 startHour: 5,  startMinute: 0,  durationMinutes: 420, daysOfWeek: EVERYDAY, sortOrder: 170 },

  // ── Saturday ─────────────────────────────────────────────────
  { category: 'shopify',     title: 'Shopify / Research',    startHour: 13, startMinute: 0,  durationMinutes: 120, daysOfWeek: [6],      sortOrder: 30 },
  { category: 'flex',        title: 'Content Shoot / Flex',  startHour: 15, startMinute: 0,  durationMinutes: 120, daysOfWeek: [6],      sortOrder: 35, isFlexWindow: true },
  { category: 'agency',      title: 'Agency Work',           startHour: 17, startMinute: 0,  durationMinutes: 120, daysOfWeek: [6],      sortOrder: 40 },
  { category: 'language',    title: 'English Learning',      startHour: 19, startMinute: 0,  durationMinutes: 15,  daysOfWeek: [6],      sortOrder: 50 },
  { category: 'language',    title: 'Turkish Learning',      startHour: 19, startMinute: 15, durationMinutes: 15,  daysOfWeek: [6],      sortOrder: 60 },
  { category: 'gym',         title: 'Walk / Run',            startHour: 20, startMinute: 0,  durationMinutes: 60,  daysOfWeek: [6],      sortOrder: 70 },
  { category: 'shower',      title: 'Night Shower',          startHour: 21, startMinute: 15, durationMinutes: 30,  daysOfWeek: [6],      sortOrder: 80 },
  { category: 'skincare',    title: 'Skincare + Hair Care',  startHour: 21, startMinute: 45, durationMinutes: 28,  daysOfWeek: [6],      sortOrder: 90 },
  { category: 'content',     title: 'Content Posting',       startHour: 22, startMinute: 15, durationMinutes: 60,  daysOfWeek: [6],      sortOrder: 95 },

  // ── Sunday ───────────────────────────────────────────────────
  { category: 'shopify',     title: 'Business Research',     startHour: 13, startMinute: 0,  durationMinutes: 120, daysOfWeek: [7],      sortOrder: 30 },
  { category: 'agency',      title: 'Agency Work',           startHour: 15, startMinute: 0,  durationMinutes: 120, daysOfWeek: [7],      sortOrder: 40 },
  { category: 'language',    title: 'English Test',          startHour: 17, startMinute: 30, durationMinutes: 30,  daysOfWeek: [7],      sortOrder: 50 },
  { category: 'language',    title: 'Turkish Test',          startHour: 18, startMinute: 0,  durationMinutes: 30,  daysOfWeek: [7],      sortOrder: 60 },
  { category: 'weekend_run', title: 'Long Run / Walk',       startHour: 19, startMinute: 0,  durationMinutes: 120, daysOfWeek: [7],      sortOrder: 70 },  // finishes 21:00 < 22:00 ✓
  { category: 'shower',      title: 'Night Shower',          startHour: 21, startMinute: 15, durationMinutes: 30,  daysOfWeek: [7],      sortOrder: 80 },
  { category: 'skincare',    title: 'Skincare + Hair Care',  startHour: 21, startMinute: 45, durationMinutes: 28,  daysOfWeek: [7],      sortOrder: 90 },
  { category: 'content',     title: 'Content Posting',       startHour: 22, startMinute: 15, durationMinutes: 60,  daysOfWeek: [7],      sortOrder: 95 },
  { category: 'weekly_reset',title: 'Weekly Reset + Planning',startHour: 23, startMinute: 30, durationMinutes: 45, daysOfWeek: [7],      sortOrder: 98 },
];
