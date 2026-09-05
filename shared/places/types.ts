/**
 * shared/places/types.ts — contract for the `places` service.
 * Owner: places service. A place is where padel matches are played.
 */

export interface PlaceDto {
  id: number
  name: string
  location: string | null
  createdAt: string
  updatedAt: string
}

export interface ListPlacesQuery {
  limit?: number
  offset?: number
  q?: string
}

export interface ListPlacesResponse {
  places: PlaceDto[]
  total: number
  limit: number
  offset: number
  q?: string
}

export interface CreatePlaceInput {
  name: string
  location?: string
}

export interface CreatePlaceResponse {
  place: PlaceDto
}

export interface PlaceIdParams {
  id: number
}

export interface GetPlaceResponse {
  place: PlaceDto
}

export interface UpdatePlaceInput {
  name?: string
  /** Set to `null` to clear the location. */
  location?: string | null
}

export interface UpdatePlaceResponse {
  place: PlaceDto
}

export interface DeletePlaceResponse {
  deleted: true
  id: number
}
