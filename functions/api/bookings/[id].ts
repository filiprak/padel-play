import { getTursoClient, json, errorJson } from '../../lib/turso'

// GET /api/bookings/:id
export const onRequestGet: PagesFunction<CloudflareEnv> = async ({ env, params }) => {
  try {
    const id = Number(params.id)
    if (!Number.isInteger(id)) return errorJson('Invalid id', 400)
    const client = getTursoClient(env as never)
    const rs = await client.execute({
      sql: 'SELECT b.*, c.name as court_name FROM bookings b LEFT JOIN courts c ON c.id = b.court_id WHERE b.id = ?',
      args: [id],
    })
    if (rs.rows.length === 0) return errorJson('Booking not found', 404)
    return json({ booking: rs.rows[0] })
  } catch (e) {
    return errorJson('Failed to fetch booking', 500, e instanceof Error ? e.message : String(e))
  }
}

// DELETE /api/bookings/:id — cancel (soft: status=cancelled) or hard delete via ?hard=1
export const onRequestDelete: PagesFunction<CloudflareEnv> = async ({ env, params, request }) => {
  try {
    const id = Number(params.id)
    if (!Number.isInteger(id)) return errorJson('Invalid id', 400)
    const client = getTursoClient(env as never)
    const url = new URL(request.url)
    const hard = url.searchParams.get('hard') === '1'

    if (hard) {
      const rs = await client.execute({ sql: 'DELETE FROM bookings WHERE id = ? RETURNING id', args: [id] })
      if (rs.rows.length === 0) return errorJson('Booking not found', 404)
      return json({ deleted: true, id })
    } else {
      const rs = await client.execute({
        sql: "UPDATE bookings SET status='cancelled' WHERE id = ? RETURNING *",
        args: [id],
      })
      if (rs.rows.length === 0) return errorJson('Booking not found', 404)
      return json({ booking: rs.rows[0], cancelled: true })
    }
  } catch (e) {
    return errorJson('Failed to cancel booking', 500, e instanceof Error ? e.message : String(e))
  }
}
