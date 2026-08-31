import { defineConfig } from 'drizzle-kit'

// drizzle-kit is for generating migrations from db/schema.ts
// For Turso, set TURSO_DATABASE_URL + TURSO_AUTH_TOKEN in .env or .dev.vars
// Usage: pnpm db:generate && pnpm db:migrate
// For simple setup, `pnpm db:init` uses db/schema.sql directly (no drizzle-kit needed).

export default defineConfig({
  schema: './db/schema.ts',
  out: './drizzle',
  dialect: 'turso',
  dbCredentials: {
    url: process.env.TURSO_DATABASE_URL!,
    authToken: process.env.TURSO_AUTH_TOKEN,
  },
})
