import { getTursoClient, json, errorJson } from '../lib/turso'

export const onRequestGet: PagesFunction<CloudflareEnv> = async ({ env }) => {
  try {
    const client = getTursoClient(env as unknown as { TURSO_DATABASE_URL?: string; TURSO_AUTH_TOKEN?: string })
    // simple ping
    const rs = await client.execute('SELECT 1 as ok')
    const tables = await client.execute(
      "SELECT name FROM sqlite_master WHERE type='table' AND name IN ('courts','bookings')",
    )

    return json({
      status: 'ok',
      turso: {
        connected: true,
        ping: rs.rows[0],
        tables: tables.rows.map((r) => r.name),
        hasCourts: tables.rows.some((r) => r.name === 'courts'),
        hasBookings: tables.rows.some((r) => r.name === 'bookings'),
      },
      hint: tables.rows.length === 0 ? 'Run pnpm db:init to create schema' : undefined,
      timestamp: new Date().toISOString(),
    })
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    // Don't leak auth token, but surface missing env hint
    const isMissingEnv = msg.includes('TURSO_DATABASE_URL')
    return errorJson(isMissingEnv ? 'Turso not configured' : 'Turso connection failed', isMissingEnv ? 503 : 500, {
      message: msg,
    })
  }
}
