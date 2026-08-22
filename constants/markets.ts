// International market time zones for awareness panel

export type Market = {
  id: string;
  city: string;
  country: string;
  timezone: string;
  flag: string;
};

export const DEFAULT_MARKETS: Market[] = [
  { id: 'nyc', city: 'New York', country: 'USA', timezone: 'America/New_York', flag: '🇺🇸' },
  { id: 'chi', city: 'Chicago', country: 'USA', timezone: 'America/Chicago', flag: '🇺🇸' },
  { id: 'lax', city: 'Los Angeles', country: 'USA', timezone: 'America/Los_Angeles', flag: '🇺🇸' },
  { id: 'lon', city: 'London', country: 'UK', timezone: 'Europe/London', flag: '🇬🇧' },
  { id: 'ist', city: 'Istanbul', country: 'Turkey', timezone: 'Europe/Istanbul', flag: '🇹🇷' },
];
