import { getTursoClient, json, errorJson } from '../../lib/turso'

// GET /api/courts/:id
export const onRequestGet: PagesFunction<CloudflareEnv> = async ({ env, params }) => {
  try {
    const id = Number(params.id)
    if (!Number.isInteger(id)) return errorJson('Invalid id', 400)
    const client = getTursoClient(env as never)
    const rs = await client.execute({ sql: 'SELECT * FROM courts WHERE id = ?', args: [id] })
    if (rs.rows.length === 0) return errorJson('Court not found', 404)
    return json({ court: rs.rows[0] })
  } catch (e) {
    return errorJson('Failed to fetch court', 500, e instanceof Error ? e.message : String(e))
  }
}

// DELETE /api/courts/:id
export const onRequestDelete: PagesFunction<CloudflareEnv> = async ({ env, params }) => {
  try {
    const id = Number(params.id)
    if (!Number.isInteger(id)) return errorJson('Invalid id', 400)
    const client = getTursoClient(env as never)
    const rs = await client.execute({ sql: 'DELETE FROM courts WHERE id = ? RETURNING id', args: [id] })
    if (rs.rows.length === 0) return errorJson('Court not found', 404)
    return json({ deleted: true, id })
  } catch (e) {
    return errorJson('Failed to delete court', 500, e instanceof Error ? e.message : String(e))
  }
}

// PATCH /api/courts/:id — partial update
export const onRequestPatch: PagesFunction<CloudflareEnv> = async ({ env, params, request }) => {
  try {
    const id = Number(params.id)
    if (!Number.isInteger(id)) return errorJson('Invalid id', 400)
    const body = (await request.json().catch(() => null)) as Record<string, unknown> | null
    if (!body) return errorJson('Invalid JSON body', 400)

    const allowed: Record<string, string> = {
      name: 'name',
      location: 'location',
      surface: 'surface',
      is_indoor: 'is_indoor',
      hourly_price_cents: 'hourly_price_cents',
    }

    const sets: string[] = []
    const args: (string | number | null | boolean)[] = []
    for (const [k, col] of Object.entries(allowed)) {
      if (k in body) {
        sets.push(`${col} = ?`)
        // bool -> int for is_indoor
        const v = k === 'is_indoor' ? (body[k] ? 1 : 0) : body[k]
        args.push(v as never)
      }
    }
    if (sets.length === 0) return errorJson('No valid fields to update', 400)

    const client = getTursoClient(env as never)
    args.push(id)
    const rs = await client.execute({
      sql: `UPDATE courts SET ${sets.join(', ')} WHERE id = ? RETURNING *`,
      args: args as never,
    })
    if (rs.rows.length === 0) return errorJson('Court not found', 404)
    return json({ court: rs.rows[0] })
  } catch (e) {
    return errorJson('Failed to update court', 500, e instanceof Error ? e.message : String(e))
  }
}
