import type { Config } from 'drizzle-kit';

export default {
  schema: './lib/db/schema.ts',
  out: './lib/db/drizzle',
  dialect: 'sqlite',
  driver: 'expo',
} satisfies Config;
