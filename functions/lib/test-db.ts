/**
 * functions/lib/test-db.ts — local SQLite test database (test-only).
 *
 * Spins up an isolated in-memory libSQL database, applies `db/schema.sql`,
 * and returns a drizzle instance typed as `Db` so service functions can be
 * tested against a REAL database: constraints, LIKE search, pagination and
 * defaults all behave like production Turso.
 *
 * Notes:
 * - Uses the Node driver (`@libsql/client` + `drizzle-orm/libsql`), which
 *   supports `:memory:`. Production uses the edge driver
 *   (`drizzle-orm/libsql/web`) — both share the same `LibSQLDatabase` core
 *   and services never touch `$client`, so the cast is safe.
 * - Each `createTestDb()` call gets its own isolated `:memory:` database,
 *   so tests never leak state into each other. Call `close()` in `afterEach`.
 * - Never imported by production code or route adapters — tests only.
 */
import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { createClient } from '@libsql/client'
import { drizzle } from 'drizzle-orm/libsql'
import * as schema from '../../db/schema'
import type { Db } from './drizzle'

export interface TestDb {
  db: Db
  close: () => void
}

const SCHEMA_PATH = fileURLToPath(new URL('../../db/schema.sql', import.meta.url))

/** Same statement-splitting as `scripts/init-db.ts` (libsql has no multi-statement exec). */
async function applySchema(sql: string, execute: (stmt: string) => Promise<unknown>): Promise<void> {
  const statements = sql
    .split(';')
    .map((s) => s.trim())
    .filter((s) => s.length > 0 && !s.startsWith('--'))
  for (const stmt of statements) {
    await execute(stmt)
  }
}

export async function createTestDb(): Promise<TestDb> {
  const client = createClient({ url: ':memory:' })
  const sql = await readFile(SCHEMA_PATH, 'utf-8')
  await applySchema(sql, (stmt) => client.execute(stmt))
  const db = drizzle(client, { schema }) as unknown as Db
  return {
    db,
    close: () => client.close(),
  }
}
