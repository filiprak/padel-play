/**
 * functions/lib/test-db.ts — local SQLite test database (test-only).
 *
 * Spins up an isolated file-backed libSQL database in the OS temp dir,
 * applies `db/schema.sql`, and returns a drizzle instance typed as `Db` so
 * service functions can be tested against a REAL database: constraints,
 * LIKE search, pagination and defaults all behave like production Turso.
 *
 * Notes:
 * - Uses the Node driver (`@libsql/client` + `drizzle-orm/libsql`).
 *   Production uses the edge driver (`drizzle-orm/libsql/web`) — both share
 *   the same `LibSQLDatabase` core and services never touch `$client`,
 *   so the cast is safe.
 * - A temp *file* (not `:memory:`) is used on purpose: the driver may serve
 *   different connections (e.g. inside `db.transaction`) and each `:memory:`
 *   connection would see its own empty database. One unique file per
 *   `createTestDb()` call keeps tests isolated. `close()` deletes the file.
 * - Never imported by production code or route adapters — tests only.
 */
import { mkdtemp, readFile, readdir, rm, stat } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createClient } from '@libsql/client'
import { drizzle } from 'drizzle-orm/libsql'
import * as schema from '../../db/schema'
import type { Db } from './drizzle'

export interface TestDb {
  db: Db
  close: () => Promise<void>
}

const SCHEMA_PATH = fileURLToPath(new URL('../../db/schema.sql', import.meta.url))

/** Same statement-splitting as `scripts/init-db.ts` (libsql has no multi-statement exec). */
async function applySchema(sql: string, execute: (stmt: string) => Promise<unknown>): Promise<void> {
  // Strip `--` comment lines first: otherwise a comment bundled with the
  // following statement (after splitting on `;`) would discard the statement.
  const withoutComments = sql
    .split('\n')
    .filter((line) => !line.trim().startsWith('--'))
    .join('\n')
  const statements = withoutComments
    .split(';')
    .map((s) => s.trim())
    .filter((s) => s.length > 0)
  for (const stmt of statements) {
    await execute(stmt)
  }
}

export async function createTestDb(): Promise<TestDb> {
  await sweepStaleTestDbs()
  const dir = await mkdtemp(join(tmpdir(), 'padel-play-test-'))
  const file = join(dir, 'test.db')
  const client = createClient({ url: `file:${file}` })
  try {
    const sql = await readFile(SCHEMA_PATH, 'utf-8')
    await applySchema(sql, (stmt) => client.execute(stmt))
  } catch (e) {
    client.close()
    await bestEffortRm(dir)
    throw e
  }
  const db = drizzle(client, { schema }) as unknown as Db
  return {
    db,
    // Never throws: on Windows the file can stay locked until the worker
    // exits (drizzle caches unfinalized prepared statements). Leftovers are
    // swept by `sweepStaleTestDbs` on subsequent runs; the OS also cleans tmp.
    close: async () => {
      client.close()
      await bestEffortRm(dir)
    },
  }
}

async function bestEffortRm(dir: string): Promise<void> {
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      await rm(dir, { recursive: true, force: true })
      return
    } catch {
      await new Promise((r) => setTimeout(r, 50))
    }
  }
}

/**
 * Removes `padel-play-test-*` dirs older than 30 minutes (best-effort).
 * Only stale dirs are touched, so concurrent runs are safe; the current
 * run's leftovers are collected by the next run.
 */
async function sweepStaleTestDbs(): Promise<void> {
  const prefix = 'padel-play-test-'
  const cutoff = Date.now() - 30 * 60 * 1000
  let names: string[]
  try {
    names = await readdir(tmpdir())
  } catch {
    return
  }
  await Promise.all(
    names
      .filter((n) => n.startsWith(prefix))
      .map(async (n) => {
        const dir = join(tmpdir(), n)
        try {
          const st = await stat(dir)
          if (st.mtimeMs < cutoff) await rm(dir, { recursive: true, force: true })
        } catch {
          // ignore — cleanup must never break tests
        }
      }),
  )
}
