import { getTursoClient, json, errorJson } from '../lib/turso'

// GET /api/bookings?court_id=1&limit=20 — list bookings, optional filter by court
export const onRequestGet: PagesFunction<CloudflareEnv> = async ({ env, request }) => {
  try {
    const client = getTursoClient(env as never)
    const url = new URL(request.url)
    const courtId = url.searchParams.get('court_id')
    const limit = Math.min(Number(url.searchParams.get('limit') ?? '50'), 100)
    const offset = Math.max(Number(url.searchParams.get('offset') ?? '0'), 0)

    let sql = 'SELECT b.*, c.name as court_name FROM bookings b LEFT JOIN courts c ON c.id = b.court_id'
    const args: (string | number | null)[] = []
    if (courtId) {
      sql += ' WHERE b.court_id = ?'
      args.push(Number(courtId))
    }
    sql += ' ORDER BY b.starts_at DESC LIMIT ? OFFSET ?'
    args.push(limit, offset)

    const rs = await client.execute({ sql, args: args as never })
    return json({ bookings: rs.rows, limit, offset, courtId: courtId ? Number(courtId) : null })
  } catch (e) {
    return errorJson('Failed to fetch bookings', 500, e instanceof Error ? e.message : String(e))
  }
}

// POST /api/bookings — create booking
// Body: { court_id: number, player_name: string, player_email?: string, starts_at: ISO, ends_at: ISO }
export const onRequestPost: PagesFunction<CloudflareEnv> = async ({ env, request }) => {
  try {
    const client = getTursoClient(env as never)
    const body = (await request.json().catch(() => null)) as
      | {
          court_id?: number
          player_name?: string
          player_email?: string
          starts_at?: string
          ends_at?: string
        }
      | null

    if (!body?.court_id || !body?.player_name || !body?.starts_at || !body?.ends_at) {
      return errorJson('court_id, player_name, starts_at, ends_at are required', 400)
    }

    const courtId = Number(body.court_id)
    const playerName = body.player_name.trim()
    if (!playerName) return errorJson('player_name cannot be empty', 400)

    const starts = new Date(body.starts_at)
    const ends = new Date(body.ends_at)
    if (Number.isNaN(starts.getTime()) || Number.isNaN(ends.getTime())) {
      return errorJson('starts_at / ends_at must be valid ISO dates', 400)
    }
    if (ends <= starts) return errorJson('ends_at must be after starts_at', 400)

    // Check court exists
    const courtRs = await client.execute({ sql: 'SELECT id FROM courts WHERE id = ?', args: [courtId] })
    if (courtRs.rows.length === 0) return errorJson('Court not found', 404)

    // Simple overlap check
    const overlap = await client.execute({
      sql: `SELECT id FROM bookings WHERE court_id = ? AND status != 'cancelled' AND NOT (ends_at <= ? OR starts_at >= ?) LIMIT 1`,
      args: [courtId, starts.toISOString(), ends.toISOString()],
    })
    if (overlap.rows.length > 0) return errorJson('Court already booked for that time', 409)

    const rs = await client.execute({
      sql: `INSERT INTO bookings (court_id, player_name, player_email, starts_at, ends_at) VALUES (?, ?, ?, ?, ?) RETURNING *`,
      args: [courtId, playerName, body.player_email?.trim() || null, starts.toISOString(), ends.toISOString()],
    })

    return json({ booking: rs.rows[0] }, { status: 201 })
  } catch (e) {
    return errorJson('Failed to create booking', 500, e instanceof Error ? e.message : String(e))
  }
}
