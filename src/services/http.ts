/**
 * src/services/http.ts — generic typed transport. Service folders
 * (`src/services/<name>/api.ts`) build on top of `apiRoute`.
 * No service-specific imports here.
 */
import type { ApiRouteKey, ApiResponse, ApiBody, ApiQuery, ApiParams, ApiErrorResponse } from '@shared'

export type { ApiErrorResponse }
export * from '@shared'

/** Error thrown when the API returns a non-2xx status. */
export class ApiError extends Error {
  status: number
  details?: unknown
  constructor(status: number, message: string, details?: unknown) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.details = details
  }
}

interface RouteOptions<R extends ApiRouteKey> {
  params?: ApiParams<R>
  query?: ApiQuery<R>
  body?: ApiBody<R>
  init?: Omit<RequestInit, 'method' | 'body'>
}

function buildPath(
  pattern: string,
  params?: Record<string, string | number>,
  query?: Record<string, string | number | boolean | undefined>,
): string {
  let path = pattern
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      path = path.replace(`:${k}`, encodeURIComponent(String(v)))
    }
  }
  if (query) {
    const qs = new URLSearchParams()
    for (const [k, v] of Object.entries(query)) {
      if (v === undefined || v === '') continue
      qs.set(k, String(v))
    }
    const s = qs.toString()
    if (s) path += `?${s}`
  }
  return path
}

/**
 * End-to-end typesafe request. The `route` literal determines the required
 * params/query/body and the resolved response type.
 *
 * @example
 *   const { users } = await apiRoute('GET /api/users', { query: { q: 'ada' } })
 */
export async function apiRoute<R extends ApiRouteKey>(
  route: R,
  options: RouteOptions<R> = {},
): Promise<ApiResponse<R>> {
  const [method, ...rest] = route.split(' ')
  const pattern = rest.join(' ')
  const { params, query, body, init } = options

  const path = buildPath(
    pattern,
    params as Record<string, string | number> | undefined,
    query as Record<string, string | number | boolean | undefined> | undefined,
  )

  const res = await fetch(path, {
    method,
    headers: { 'Content-Type': 'application/json', ...(init?.headers || {}) },
    ...init,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })

  const data = (await res.json().catch(() => ({}))) as ApiResponse<R> & Partial<ApiErrorResponse>
  if (!res.ok) {
    const err = data as Partial<ApiErrorResponse>
    throw new ApiError(res.status, err.error || `HTTP ${res.status}`, err.details)
  }
  return data as ApiResponse<R>
}

/** Legacy generic helper — prefer `apiRoute` so I/O stays linked to `shared/`. */
export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    headers: { 'Content-Type': 'application/json', ...(init?.headers || {}) },
    ...init,
  })
  const data = (await res.json().catch(() => ({}))) as T & Partial<ApiErrorResponse>
  if (!res.ok) {
    throw new ApiError(res.status, data.error || `HTTP ${res.status}`, data.details)
  }
  return data as T
}
