import { RestEndpoint, type RestContext } from '../lib/rest'
import { users } from '../../db/schema'
import { asc, count, like, or } from 'drizzle-orm'

const ALLOWED_ROLES = ['player', 'admin', 'coach'] as const
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

class UsersEndpoint extends RestEndpoint {
  // GET /api/users?limit=50&offset=0&q=ada
  async get(ctx: RestContext): Promise<Response> {
    const { limit, offset } = this.pagination(ctx)
    const q = this.query(ctx, 'q')?.trim()
    const db = this.db(ctx)

    if (q) {
      const pattern = `%${q}%`
      const where = or(like(users.name, pattern), like(users.email, pattern))
      const rows = await db.select().from(users).where(where).orderBy(asc(users.id)).limit(limit).offset(offset)
      const [cntRow] = await db.select({ total: count() }).from(users).where(where)
      return this.json({ users: rows, total: Number(cntRow?.total ?? 0), limit, offset, q })
    }

    const rows = await db.select().from(users).orderBy(asc(users.id)).limit(limit).offset(offset)
    const [cntRow] = await db.select({ total: count() }).from(users)
    return this.json({ users: rows, total: Number(cntRow?.total ?? 0), limit, offset })
  }

  // POST /api/users { name, email, role? }
  async post(ctx: RestContext): Promise<Response> {
    const body = await this.parseJson<{ name?: string; email?: string; role?: string }>(ctx)
    const err = this.requireFields(body, ['name', 'email'])
    if (err) return this.error(err, 400)

    const name = body!.name!.trim()
    const email = body!.email!.trim().toLowerCase()
    const role = (body!.role ?? 'player').trim() as (typeof ALLOWED_ROLES)[number]

    if (name.length < 2) return this.error('name must be at least 2 characters', 400)
    if (!EMAIL_RE.test(email)) return this.error('email must be valid', 400)
    if (!ALLOWED_ROLES.includes(role)) return this.error(`role must be one of: ${ALLOWED_ROLES.join(', ')}`, 400)

    const db = this.db(ctx)
    try {
      const [user] = await db
        .insert(users)
        .values({
          name,
          email,
          role,
          updatedAt: new Date().toISOString(),
        })
        .returning()
      return this.json({ user }, { status: 201 })
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      if (msg.includes('UNIQUE') || msg.toLowerCase().includes('unique')) {
        return this.error('email already exists', 409, msg)
      }
      throw e
    }
  }
}

const ep = new UsersEndpoint()
export const onRequest: PagesFunction<CloudflareEnv> = (ctx) => ep.handle(ctx)
