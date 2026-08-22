// Ri Ri — core schedule constants derived from master specification

export const WAKE_TIME = { hour: 12, minute: 0 }; // 12:00 PM
export const SLEEP_TARGET = { hour: 5, minute: 0 }; // ~5:00 AM next day

export const OFFICE_START = { hour: 17, minute: 0 }; // 5:00 PM
export const OFFICE_END = { hour: 22, minute: 0 }; // 10:00 PM
export const OFFICE_PREP_START = { hour: 16, minute: 30 }; // 4:30 PM

// Gym: ~15 min travel from office + 1.5 hr workout; leave office before midnight
export const GYM_START = { hour: 22, minute: 15 }; // 10:15 PM (approx)
export const GYM_DURATION_MINUTES = 90;
export const GYM_TRAVEL_MINUTES = 15;

export const LANGUAGE_BLOCK_START = { hour: 15, minute: 45 }; // 3:45 PM — before 4:30 PM office prep
export const LANGUAGE_EACH_MINUTES = 15; // English 15min + Turkish 15min = 30min total

export const WORK_BLOCK_DURATION_MINUTES = 120; // 2 hours

export const WATER_DAILY_TARGET_ML = 3000;

export const READING_MIN_PAGES = 5;
export const READING_TARGET_PAGES = 10;

export const MORNING_SHOWER_MINUTES = 30;
export const NIGHT_SHOWER_MINUTES = 30;
export const SKINCARE_HAIRCARE_MINUTES = 28;

// Work order: Shopify first, Agency second
export const WORK_ORDER = ['shopify', 'agency'] as const;

export type WorkCategory = (typeof WORK_ORDER)[number];
