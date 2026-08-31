import { RestEndpoint, type RestContext } from '../lib/rest'
import { courts } from '../../db/schema'
import { asc, count } from 'drizzle-orm'

const ALLOWED_SURFACES = ['artificial_grass', 'clay', 'concrete', 'grass'] as const

class CourtsEndpoint extends RestEndpoint {
  // GET /api/courts?limit=50&offset=0
  async get(ctx: RestContext): Promise<Response> {
    const { limit, offset } = this.pagination(ctx)
    const db = this.db(ctx)

    const rows = await db.select().from(courts).orderBy(asc(courts.id)).limit(limit).offset(offset)
    const [cntRow] = await db.select({ total: count() }).from(courts)

    return this.json({ courts: rows, total: Number(cntRow?.total ?? 0), limit, offset })
  }

  // POST /api/courts { name, location?, surface?, is_indoor?, hourly_price_cents? }
  async post(ctx: RestContext): Promise<Response> {
    const body = await this.parseJson<{
      name?: string
      location?: string
      surface?: string
      is_indoor?: boolean | number
      hourly_price_cents?: number
    }>(ctx)

    if (!body?.name || typeof body.name !== 'string' || body.name.trim().length === 0) {
      return this.error('`name` is required', 400)
    }

    const name = body.name.trim()
    const location = body.location?.trim() || null
    const surface = (body.surface ?? 'artificial_grass') as (typeof ALLOWED_SURFACES)[number]
    if (!ALLOWED_SURFACES.includes(surface)) {
      return this.error(`surface must be one of: ${ALLOWED_SURFACES.join(', ')}`, 400)
    }
    const isIndoor = Boolean(body.is_indoor)
    const price = body.hourly_price_cents ?? 3000

    const db = this.db(ctx)
    const [court] = await db
      .insert(courts)
      .values({
        name,
        location,
        surface,
        isIndoor,
        hourlyPriceCents: price,
      })
      .returning()

    return this.json({ court }, { status: 201 })
  }
}

const ep = new CourtsEndpoint()
export const onRequest: PagesFunction<CloudflareEnv> = (ctx) => ep.handle(ctx)
