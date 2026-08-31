#!/usr/bin/env tsx
// Usage: pnpm db:init
// Requires: TURSO_DATABASE_URL and TURSO_AUTH_TOKEN in .env / .dev.vars / shell
// Uses Node `readFile` + `@libsql/client` (Node driver, not /web)

import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { createClient } from '@libsql/client'

async function main() {
  const url = process.env.TURSO_DATABASE_URL
  const authToken = process.env.TURSO_AUTH_TOKEN

  if (!url) {
    console.error('Missing TURSO_DATABASE_URL')
    console.error('Set it in .env or .dev.vars, or export TURSO_DATABASE_URL=libsql://...')
    process.exit(1)
  }

  const client = createClient({ url, authToken })
  const schemaPath = resolve(process.cwd(), 'db/schema.sql')
  const sql = await readFile(schemaPath, 'utf-8')

  console.log(`Connecting to ${url.split('?')[0]} ...`)
  // libsql client doesn't support multi-statement exec in one call reliably, split by ;
  const statements = sql
    .split(';')
    .map((s) => s.trim())
    .filter((s) => s.length > 0 && !s.startsWith('--'))

  for (const stmt of statements) {
    console.log(`> ${stmt.slice(0, 80)}...`)
    await client.execute(stmt)
  }

  // Seed sample courts if empty
  const count = await client.execute('SELECT COUNT(*) as cnt FROM courts')
  const cnt = Number(count.rows[0]?.cnt ?? 0)
  if (cnt === 0) {
    console.log('Seeding sample courts...')
    await client.batch(
      [
        "INSERT INTO courts (name, location, surface, is_indoor, hourly_price_cents) VALUES ('Central Court 1', 'Madrid', 'artificial_grass', 0, 3500)",
        "INSERT INTO courts (name, location, surface, is_indoor, hourly_price_cents) VALUES ('Central Court 2', 'Madrid', 'clay', 1, 4000)",
        "INSERT INTO courts (name, location, surface, is_indoor, hourly_price_cents) VALUES ('Outdoor Padel A', 'Barcelona', 'grass', 0, 3000)",
      ],
      'write',
    )
  }

  const courts = await client.execute('SELECT id, name, location FROM courts LIMIT 10')
  console.log(`Done. ${courts.rows.length} court(s) in DB:`)
  for (const r of courts.rows) console.log(' -', r)

  // Verify bookings table
  const bookings = await client.execute('SELECT COUNT(*) as cnt FROM bookings')
  console.log(`Bookings: ${bookings.rows[0]?.cnt ?? 0}`)

  client.close()
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
