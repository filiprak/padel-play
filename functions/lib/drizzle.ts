import { drizzle } from 'drizzle-orm/libsql/web'
import { getTursoClient, type TursoEnv } from './turso'
import * as schema from '../../db/schema'

/**
 * Get a typed Drizzle ORM instance for Turso (edge via @libsql/client/web).
 * Uses the shared `db/schema.ts` definitions (courts, users).
 *
 * Usage in a RestEndpoint:
 *   const db = this.db(ctx)
 *   const users = await db.select().from(users).where(eq(users.email, email))
 */
export function getDb(env: TursoEnv) {
  const client = getTursoClient(env)
  return drizzle(client, { schema })
}

export type Db = ReturnType<typeof getDb>
export { schema }
