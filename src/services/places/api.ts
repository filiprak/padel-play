/** Frontend client for the `places` service. */
import { apiRoute, type ApiResponse } from '../http'
import type { CreatePlaceInput, ListPlacesQuery, PlaceIdParams, UpdatePlaceInput } from '@shared'

export function listPlaces(query: ListPlacesQuery = {}): Promise<ApiResponse<'GET /api/places'>> {
  return apiRoute('GET /api/places', { query })
}

export function createPlace(body: CreatePlaceInput): Promise<ApiResponse<'POST /api/places'>> {
  return apiRoute('POST /api/places', { body })
}

export function getPlace(id: PlaceIdParams['id']): Promise<ApiResponse<'GET /api/places/:id'>> {
  return apiRoute('GET /api/places/:id', { params: { id } })
}

export function updatePlace(
  id: PlaceIdParams['id'],
  body: UpdatePlaceInput,
  method: 'PATCH' | 'PUT' = 'PATCH',
): Promise<ApiResponse<'PATCH /api/places/:id'>> {
  return apiRoute(`${method} /api/places/:id` as 'PATCH /api/places/:id', {
    params: { id },
    body,
  })
}

export function deletePlace(id: PlaceIdParams['id']): Promise<ApiResponse<'DELETE /api/places/:id'>> {
  return apiRoute('DELETE /api/places/:id', { params: { id } })
}
