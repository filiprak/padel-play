/** Frontend client for the `matches` service. */
import { apiRoute, type ApiResponse } from '../http'
import type { CreateMatchInput, ListMatchesQuery, MatchIdParams, UpdateMatchInput } from '@shared'

export function listMatches(query: ListMatchesQuery = {}): Promise<ApiResponse<'GET /api/matches'>> {
  return apiRoute('GET /api/matches', { query })
}

export function createMatch(body: CreateMatchInput): Promise<ApiResponse<'POST /api/matches'>> {
  return apiRoute('POST /api/matches', { body })
}

export function getMatch(id: MatchIdParams['id']): Promise<ApiResponse<'GET /api/matches/:id'>> {
  return apiRoute('GET /api/matches/:id', { params: { id } })
}

export function updateMatch(
  id: MatchIdParams['id'],
  body: UpdateMatchInput,
  method: 'PATCH' | 'PUT' = 'PATCH',
): Promise<ApiResponse<'PATCH /api/matches/:id'>> {
  return apiRoute(`${method} /api/matches/:id` as 'PATCH /api/matches/:id', {
    params: { id },
    body,
  })
}

export function deleteMatch(id: MatchIdParams['id']): Promise<ApiResponse<'DELETE /api/matches/:id'>> {
  return apiRoute('DELETE /api/matches/:id', { params: { id } })
}
