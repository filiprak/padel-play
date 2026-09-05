/**
 * functions/services/health/service.ts — business logic for the `health` service.
 * Pure (no DB). Route adapter: `functions/api/health.ts`.
 */
import type { HealthResponse } from '../../../shared/health/types'

const VERSION = '1.0.0'

export function getHealthStatus(): HealthResponse {
  return { status: 'ok', uptime: Date.now(), version: VERSION }
}
