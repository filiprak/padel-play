import { RestEndpoint, type RestContext } from '../../lib/rest'
import { courts } from '../../../db/schema'
import { eq } from 'drizzle-orm'

class CourtByIdEndpoint extends RestEndpoint {
  private getId(ctx: RestContext): number | null {
    const raw = this.param(ctx, 'id')
    const n = Number(raw)
    return Number.isInteger(n) && n > 0 ? n : null
  }

  // GET /api/courts/:id
  async get(ctx: RestContext): Promise<Response> {
    const id = this.getId(ctx)
    if (id === null) return this.error('Invalid id', 400)
    const db = this.db(ctx)
    const [court] = await db.select().from(courts).where(eq(courts.id, id)).limit(1)
    if (!court) return this.error('Court not found', 404)
    return this.json({ court })
  }

  // DELETE /api/courts/:id
  async delete(ctx: RestContext): Promise<Response> {
    const id = this.getId(ctx)
    if (id === null) return this.error('Invalid id', 400)
    const db = this.db(ctx)
    const [deleted] = await db.delete(courts).where(eq(courts.id, id)).returning({ id: courts.id })
    if (!deleted) return this.error('Court not found', 404)
    return this.json({ deleted: true, id })
  }

  // PATCH /api/courts/:id { name?, location?, surface?, is_indoor?, hourly_price_cents? }
  async patch(ctx: RestContext): Promise<Response> {
    const id = this.getId(ctx)
    if (id === null) return this.error('Invalid id', 400)

    const body = await this.parseJson<Record<string, unknown>>(ctx)
    if (!body) return this.error('Invalid JSON body', 400)

    const data: Record<string, unknown> = {}
    if ('name' in body) {
      const v = body.name
      if (typeof v !== 'string' || v.trim().length === 0) return this.error('name cannot be empty', 400)
      data.name = v.trim()
    }
    if ('location' in body) {
      const v = body.location
      data.location = typeof v === 'string' ? (v.trim() || null) : null
    }
    if ('surface' in body) {
      const v = body.surface
      const allowed = ['artificial_grass', 'clay', 'concrete', 'grass']
      if (typeof v !== 'string' || !allowed.includes(v)) return this.error(`surface must be one of: ${allowed.join(', ')}`, 400)
      data.surface = v
    }
    if ('is_indoor' in body) {
      data.isIndoor = Boolean(body.is_indoor)
    }
    if ('hourly_price_cents' in body) {
      const v = Number(body.hourly_price_cents)
      if (!Number.isInteger(v) || v < 0) return this.error('hourly_price_cents must be a non-negative integer', 400)
      data.hourlyPriceCents = v
    }

    if (Object.keys(data).length === 0) return this.error('No valid fields to update', 400)

    const db = this.db(ctx)
    const [updated] = await db.update(courts).set(data as never).where(eq(courts.id, id)).returning()
    if (!updated) return this.error('Court not found', 404)
    return this.json({ court: updated })
  }

  async put(ctx: RestContext): Promise<Response> {
    return this.patch(ctx)
  }
}

const ep = new CourtByIdEndpoint()
export const onRequest: PagesFunction<CloudflareEnv> = (ctx) => ep.handle(ctx)
