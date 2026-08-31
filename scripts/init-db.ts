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

  // Seed sample users if empty
  const userCount = await client.execute('SELECT COUNT(*) as cnt FROM users')
  const uCnt = Number(userCount.rows[0]?.cnt ?? 0)
  if (uCnt === 0) {
    console.log('Seeding sample users...')
    await client.batch(
      [
        "INSERT INTO users (name, email, role) VALUES ('Ada Lovelace', 'ada@example.com', 'player')",
        "INSERT INTO users (name, email, role) VALUES ('Admin', 'admin@padel-play.com', 'admin')",
      ],
      'write',
    )
    const users = await client.execute('SELECT id, name, email, role FROM users LIMIT 10')
    console.log(`${users.rows.length} user(s) seeded:`)
    for (const r of users.rows) console.log(' -', r)
  } else {
    const users = await client.execute('SELECT id, name, email, role FROM users LIMIT 10')
    console.log(`${users.rows.length} user(s) in DB:`)
    for (const r of users.rows) console.log(' -', r)
  }

  client.close()
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
