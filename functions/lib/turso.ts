import { createClient, type Client } from '@libsql/client/web'

export interface TursoEnv {
  TURSO_DATABASE_URL?: string
  TURSO_AUTH_TOKEN?: string
}

/**
 * Create a Turso/libSQL client for Cloudflare Pages Functions.
 * Uses `@libsql/client/web` (fetch-based) which works in workerd edge runtime.
 * Do NOT cache globally across requests if you rotate tokens — create per request.
 */
export function getTursoClient(env: TursoEnv): Client {
  const url = env.TURSO_DATABASE_URL
  const authToken = env.TURSO_AUTH_TOKEN

  if (!url) {
    throw new Error(
      'Missing TURSO_DATABASE_URL. Set it in .dev.vars (local) and Cloudflare Pages > Settings > Variables.',
    )
  }

  // authToken is optional for local `file:` or unsecured dev DBs
  return createClient({
    url,
    authToken,
  })
}

/**
 * Helper to return JSON with proper headers. Also closes the client if needed.
 * libsql/web client is stateless (HTTP), no explicit close required, but we keep helper for future.
 *
 * Generic over `T` so endpoints return the exact interface from `shared/<service>/types.ts`,
 * e.g. `json<ListUsersResponse>({ users, ... })`.
 */
export function json<T>(data: T, init: ResponseInit = {}): Response {
  return Response.json(data, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store',
      ...(init.headers || {}),
    },
  })
}

export function errorJson(message: string, status = 500, details?: unknown): Response {
  return json({ error: message, details }, { status })
}
