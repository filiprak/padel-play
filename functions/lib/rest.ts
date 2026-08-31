import { getTursoClient, json, errorJson, type TursoEnv } from './turso'
import type { Client } from '@libsql/client/web'
import { getDb, type Db } from './drizzle'

/**
 * Reusable REST endpoint base class for Cloudflare Pages Functions.
 *
 * Extend this class and implement `get`, `post`, `put`, `patch`, `del` etc.
 * Then export a PagesFunction binding:
 *
 *   class UsersEndpoint extends RestEndpoint {
 *     async get(ctx) {
 *       const db = this.db(ctx)
 *       const users = await db.select().from(users).orderBy(asc(users.id))
 *       return this.json({ users })
 *     }
 *     async post(ctx) { ... }
 *   }
 *   const ep = new UsersEndpoint()
 *   export const onRequest: PagesFunction<CloudflareEnv> = (ctx) => ep.handle(ctx)
 *
 * Or for single-method files:
 *   export const onRequestGet = (ctx) => ep.handle(ctx) // will dispatch to `get`
 *
 * Helpers provided:
 * - `this.json`, `this.error` — JSON response helpers
 * - `this.client(ctx)` — Turso libSQL Client
 * - `this.db(ctx)` — Drizzle ORM instance (typed with db/schema.ts)
 * - `this.parseJson<T>(ctx)` — safe JSON parse
 * - `this.query(ctx, key, fallback?)` / `this.param(ctx, key)` / `this.pagination(ctx)`
 */

export type RestContext<E = CloudflareEnv> = EventContext<E, string, Record<string, unknown>>

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'OPTIONS' | 'HEAD'

export abstract class RestEndpoint<E = CloudflareEnv> {
  // --- Override in subclasses ---
  async get?(ctx: RestContext<E>): Promise<Response>
  async post?(ctx: RestContext<E>): Promise<Response>
  async put?(ctx: RestContext<E>): Promise<Response>
  async patch?(ctx: RestContext<E>): Promise<Response>
  async delete?(ctx: RestContext<E>): Promise<Response>
  async del?(ctx: RestContext<E>): Promise<Response> // alias for delete (reserved word)
  async options?(ctx: RestContext<E>): Promise<Response>
  async head?(ctx: RestContext<E>): Promise<Response>

  /**
   * Optional hook run before dispatch — e.g. auth, logging.
   * Throw a Response to short-circuit, or throw Error to return 500.
   */
  async before?(ctx: RestContext<E>): Promise<void | Response>

  // --- Helpers ---

  protected json = json
  protected error = errorJson

  protected client(ctx: RestContext<E>): Client {
    return getTursoClient(ctx.env as unknown as TursoEnv)
  }

  /** Drizzle ORM accessor — typed with db/schema.ts */
  protected db(ctx: RestContext<E>): Db {
    return getDb(ctx.env as unknown as TursoEnv)
  }

  /** @deprecated use `this.db(ctx)` with drizzle-orm instead */
  protected orm(ctx: RestContext<E>): Db {
    return this.db(ctx)
  }

  protected async parseJson<T>(ctx: RestContext<E>): Promise<T | null> {
    try {
      const text = await ctx.request.text()
      if (!text) return null
      return JSON.parse(text) as T
    } catch {
      return null
    }
  }

  protected query(ctx: RestContext<E>, key: string, fallback?: string): string | undefined {
    const v = new URL(ctx.request.url).searchParams.get(key)
    return v ?? fallback
  }

  protected param(ctx: RestContext<E>, key: string): string | undefined {
    return ctx.params[key] as string | undefined
  }

  protected numParam(ctx: RestContext<E>, key: string): number | undefined {
    const v = this.param(ctx, key)
    if (v === undefined) return undefined
    const n = Number(v)
    return Number.isInteger(n) ? n : undefined
  }

  protected pagination(ctx: RestContext<E>, defaults = { limit: 50, maxLimit: 100, offset: 0 }): { limit: number; offset: number } {
    const rawLimit = Number(this.query(ctx, 'limit') ?? String(defaults.limit))
    const rawOffset = Number(this.query(ctx, 'offset') ?? String(defaults.offset))
    const limit = Math.min(Number.isFinite(rawLimit) ? rawLimit : defaults.limit, defaults.maxLimit)
    const offset = Math.max(Number.isFinite(rawOffset) ? rawOffset : defaults.offset, 0)
    return { limit, offset }
  }

  protected requireFields<T extends Record<string, unknown>>(body: T | null, fields: (keyof T)[]): string | null {
    if (!body) return `Missing JSON body, required fields: ${fields.join(', ')}`
    for (const f of fields) {
      const v = body[f]
      if (v === undefined || v === null || (typeof v === 'string' && v.trim() === '')) {
        return `Field '${String(f)}' is required`
      }
    }
    return null
  }

  // --- Dispatcher ---

  async handle(ctx: RestContext<E>): Promise<Response> {
    // before hook
    if (this.before) {
      const maybeRes = await this.before(ctx)
      if (maybeRes instanceof Response) return maybeRes
    }

    const method = ctx.request.method.toUpperCase() as HttpMethod
    // Map DELETE -> del alias (since `delete` is reserved word for property access)
    const target: keyof RestEndpoint<E> | undefined =
      method === 'DELETE' ? ((this.del ?? this.delete) ? (this.del ? 'del' : 'delete') : undefined) : (method.toLowerCase() as keyof RestEndpoint<E>)

    const handler = target ? (this as unknown as Record<string, (c: RestContext<E>) => Promise<Response>>)[target as string] : undefined

    if (!handler || typeof handler !== 'function') {
      return this.error(`Method ${method} Not Allowed`, 405)
    }

    try {
      return await handler.call(this, ctx)
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      // Don't leak sensitive details, but surface Turso misconfig
      if (msg.includes('TURSO_DATABASE_URL')) return this.error('Turso not configured', 503, msg)
      console.error(`[RestEndpoint] ${method} ${ctx.request.url} failed:`, e)
      return this.error('Internal Server Error', 500, msg)
    }
  }

  // Convenience getters for PagesFunction exports — bind `this` correctly
  get handler(): PagesFunction<E> {
    return (ctx) => this.handle(ctx as unknown as RestContext<E>)
  }
}

/** Factory helper: create a PagesFunction from an endpoint class */
export function endpoint<E>(EndpointClass: new () => RestEndpoint<E>): PagesFunction<E> {
  const inst = new EndpointClass()
  return (ctx) => inst.handle(ctx as unknown as RestContext<E>)
}
