import { getTursoClient, json, errorJson } from '../lib/turso'

type CourtRow = {
  id: number
  name: string
  location: string | null
  surface: string
  is_indoor: number
  hourly_price_cents: number
  created_at: string
}

// GET /api/courts — list courts
export const onRequestGet: PagesFunction<CloudflareEnv> = async ({ env, request }) => {
  try {
    const client = getTursoClient(env as never)
    const url = new URL(request.url)
    const limit = Math.min(Number(url.searchParams.get('limit') ?? '50'), 100)
    const offset = Math.max(Number(url.searchParams.get('offset') ?? '0'), 0)

    const rs = await client.execute({
      sql: 'SELECT * FROM courts ORDER BY id ASC LIMIT ? OFFSET ?',
      args: [limit, offset],
    })

    const courts = rs.rows as unknown as CourtRow[]
    const countRs = await client.execute('SELECT COUNT(*) as total FROM courts')

    return json({
      courts,
      total: Number((countRs.rows[0] as unknown as { total: number }).total),
      limit,
      offset,
    })
  } catch (e) {
    return errorJson('Failed to fetch courts', 500, e instanceof Error ? e.message : String(e))
  }
}

// POST /api/courts — create court
// Body: { name: string, location?: string, surface?: string, is_indoor?: boolean, hourly_price_cents?: number }
export const onRequestPost: PagesFunction<CloudflareEnv> = async ({ env, request }) => {
  try {
    const client = getTursoClient(env as never)
    const body = (await request.json().catch(() => null)) as
      | {
          name?: string
          location?: string
          surface?: string
          is_indoor?: boolean | number
          hourly_price_cents?: number
        }
      | null

    if (!body?.name || typeof body.name !== 'string' || body.name.trim().length === 0) {
      return errorJson('`name` is required', 400)
    }

    const name = body.name.trim()
    const location = body.location?.trim() || null
    const surface = body.surface ?? 'artificial_grass'
    const allowed = ['artificial_grass', 'clay', 'concrete', 'grass']
    if (!allowed.includes(surface)) {
      return errorJson(`surface must be one of: ${allowed.join(', ')}`, 400)
    }
    const isIndoor = body.is_indoor ? 1 : 0
    const price = body.hourly_price_cents ?? 3000

    const rs = await client.execute({
      sql: 'INSERT INTO courts (name, location, surface, is_indoor, hourly_price_cents) VALUES (?, ?, ?, ?, ?) RETURNING *',
      args: [name, location, surface, isIndoor, price],
    })

    const court = rs.rows[0] as unknown as CourtRow
    return json({ court }, { status: 201 })
  } catch (e) {
    return errorJson('Failed to create court', 500, e instanceof Error ? e.message : String(e))
  }
}
