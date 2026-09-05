/**
 * shared/health/types.ts — contract for the `health` service.
 * Owner: health service. No imports from other services.
 */

export interface HealthResponse {
  status: 'ok' | 'degraded' | 'down'
  uptime: number
  version: string
}
