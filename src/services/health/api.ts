/** Frontend client for the `health` service. */
import { apiRoute, type ApiResponse } from '../http'

export function getHealth(): Promise<ApiResponse<'GET /api/health'>> {
  return apiRoute('GET /api/health', {})
}
