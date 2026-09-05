import { getHealthStatus } from '../services/health/service'
import type { HealthResponse } from '../../shared/health/types'

/**
 * Thin route adapter for `/api/health`.
 * Logic lives in `functions/services/health/service.ts`.
 */
export const onRequestGet: PagesFunction = async () => {
  const body: HealthResponse = getHealthStatus()
  return Response.json(body, {
    headers: {
      'Cache-Control': 'no-store',
      'Content-Type': 'application/json',
    },
  })
}
