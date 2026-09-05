/**
 * shared/common.ts — cross-service primitives.
 * Every service folder may import from here. Nothing here imports from a service.
 */

/** Standard error envelope returned by `errorJson` on the backend. */
export interface ApiErrorResponse {
  error: string
  details?: unknown
}

/** Shared pagination input (services extend it with their own filters). */
export interface PaginationQuery {
  limit?: number
  offset?: number
}
