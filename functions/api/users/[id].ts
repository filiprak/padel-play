import { RestEndpoint, type RestContext } from '../../lib/rest'
import { users } from '../../../db/schema'
import { eq } from 'drizzle-orm'

const ALLOWED_ROLES = ['player', 'admin', 'coach'] as const
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

class UserByIdEndpoint extends RestEndpoint {
  private getId(ctx: RestContext): number | null {
    const raw = this.param(ctx, 'id')
    const n = Number(raw)
    return Number.isInteger(n) && n > 0 ? n : null
  }

  // GET /api/users/:id
  async get(ctx: RestContext): Promise<Response> {
    const id = this.getId(ctx)
    if (id === null) return this.error('Invalid id', 400)
    const db = this.db(ctx)
    const [user] = await db.select().from(users).where(eq(users.id, id)).limit(1)
    if (!user) return this.error('User not found', 404)
    return this.json({ user })
  }

  // PATCH /api/users/:id { name?, email?, role? }
  async patch(ctx: RestContext): Promise<Response> {
    const id = this.getId(ctx)
    if (id === null) return this.error('Invalid id', 400)

    const body = await this.parseJson<Partial<{ name: string; email: string; role: string }>>(ctx)
    if (!body || Object.keys(body).length === 0) return this.error('Empty body', 400)

    const data: Record<string, string> = {}
    if ('name' in body) {
      const v = body.name
      if (typeof v !== 'string' || v.trim().length < 2) return this.error('name must be at least 2 characters', 400)
      data.name = v.trim()
    }
    if ('email' in body) {
      const v = body.email
      if (typeof v !== 'string' || !EMAIL_RE.test(v.trim().toLowerCase())) return this.error('email must be valid', 400)
      data.email = v.trim().toLowerCase()
    }
    if ('role' in body) {
      const v = body.role
      if (typeof v !== 'string' || !ALLOWED_ROLES.includes(v as (typeof ALLOWED_ROLES)[number])) {
        return this.error(`role must be one of: ${ALLOWED_ROLES.join(', ')}`, 400)
      }
      data.role = v.trim()
    }

    if (Object.keys(data).length === 0) return this.error('No valid fields to update. Allowed: name, email, role', 400)
    data.updatedAt = new Date().toISOString()

    const db = this.db(ctx)
    try {
      const [updated] = await db.update(users).set(data as never).where(eq(users.id, id)).returning()
      if (!updated) return this.error('User not found', 404)
      return this.json({ user: updated })
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      if (msg.includes('UNIQUE') || msg.toLowerCase().includes('unique')) return this.error('email already exists', 409, msg)
      throw e
    }
  }

  // PUT /api/users/:id — full replace (same as PATCH)
  async put(ctx: RestContext): Promise<Response> {
    return this.patch(ctx)
  }

  // DELETE /api/users/:id
  async delete(ctx: RestContext): Promise<Response> {
    const id = this.getId(ctx)
    if (id === null) return this.error('Invalid id', 400)
    const db = this.db(ctx)
    const [deleted] = await db.delete(users).where(eq(users.id, id)).returning({ id: users.id })
    if (!deleted) return this.error('User not found', 404)
    return this.json({ deleted: true, id })
  }
}

const ep = new UserByIdEndpoint()
export const onRequest: PagesFunction<CloudflareEnv> = (ctx) => ep.handle(ctx)
