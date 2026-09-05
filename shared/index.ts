/**
 * shared/index.ts — canonical entry for the API contract.
 *
 * Each API service owns a folder under `shared/` (e.g. `shared/users/`,
 * `shared/health/`). This file only composes them into the global route map.
 *
 * HOW TO ADD A SERVICE (e.g. `bookings`):
 *   1. Create `shared/bookings/types.ts` with `XxxInput/Response/Query` interfaces.
 *   2. Re-export it below (`export * from './bookings/types'`).
 *   3. Add its routes to `ApiRouteMap` below.
 *   4. Create `src/services/bookings/api.ts` + `functions/services/bookings/service.ts`.
 * That's it — no monolith files to untangle.
 */

export * from './common'
export * from './health/types'
export * from './users/types'
export * from './places/types'
export * from './matches/types'

import type { HealthResponse } from './health/types'
import type {
  CreateUserInput,
  CreateUserResponse,
  DeleteUserResponse,
  GetUserResponse,
  ListUsersQuery,
  ListUsersResponse,
  UpdateUserInput,
  UpdateUserResponse,
  UserIdParams,
} from './users/types'
import type {
  CreatePlaceInput,
  CreatePlaceResponse,
  DeletePlaceResponse,
  GetPlaceResponse,
  ListPlacesQuery,
  ListPlacesResponse,
  PlaceIdParams,
  UpdatePlaceInput,
  UpdatePlaceResponse,
} from './places/types'
import type {
  CreateMatchInput,
  CreateMatchResponse,
  DeleteMatchResponse,
  GetMatchResponse,
  ListMatchesQuery,
  ListMatchesResponse,
  MatchIdParams,
  UpdateMatchInput,
  UpdateMatchResponse,
} from './matches/types'

/**
 * Route map — ties `METHOD path` to its I/O types.
 * Used by `src/services/http.ts` so a wrong body/query/response is a
 * compile-time error, not a runtime 400.
 */
export interface ApiRouteMap {
  'GET /api/health': {
    params: Record<string, never>
    query: Record<string, never>
    body: never
    response: HealthResponse
  }
  'GET /api/users': {
    params: Record<string, never>
    query: ListUsersQuery
    body: never
    response: ListUsersResponse
  }
  'POST /api/users': {
    params: Record<string, never>
    query: Record<string, never>
    body: CreateUserInput
    response: CreateUserResponse
  }
  'GET /api/users/:id': {
    params: UserIdParams
    query: Record<string, never>
    body: never
    response: GetUserResponse
  }
  'PATCH /api/users/:id': {
    params: UserIdParams
    query: Record<string, never>
    body: UpdateUserInput
    response: UpdateUserResponse
  }
  'PUT /api/users/:id': {
    params: UserIdParams
    query: Record<string, never>
    body: UpdateUserInput
    response: UpdateUserResponse
  }
  'DELETE /api/users/:id': {
    params: UserIdParams
    query: Record<string, never>
    body: never
    response: DeleteUserResponse
  }
  'GET /api/places': {
    params: Record<string, never>
    query: ListPlacesQuery
    body: never
    response: ListPlacesResponse
  }
  'POST /api/places': {
    params: Record<string, never>
    query: Record<string, never>
    body: CreatePlaceInput
    response: CreatePlaceResponse
  }
  'GET /api/places/:id': {
    params: PlaceIdParams
    query: Record<string, never>
    body: never
    response: GetPlaceResponse
  }
  'PATCH /api/places/:id': {
    params: PlaceIdParams
    query: Record<string, never>
    body: UpdatePlaceInput
    response: UpdatePlaceResponse
  }
  'PUT /api/places/:id': {
    params: PlaceIdParams
    query: Record<string, never>
    body: UpdatePlaceInput
    response: UpdatePlaceResponse
  }
  'DELETE /api/places/:id': {
    params: PlaceIdParams
    query: Record<string, never>
    body: never
    response: DeletePlaceResponse
  }
  'GET /api/matches': {
    params: Record<string, never>
    query: ListMatchesQuery
    body: never
    response: ListMatchesResponse
  }
  'POST /api/matches': {
    params: Record<string, never>
    query: Record<string, never>
    body: CreateMatchInput
    response: CreateMatchResponse
  }
  'GET /api/matches/:id': {
    params: MatchIdParams
    query: Record<string, never>
    body: never
    response: GetMatchResponse
  }
  'PATCH /api/matches/:id': {
    params: MatchIdParams
    query: Record<string, never>
    body: UpdateMatchInput
    response: UpdateMatchResponse
  }
  'PUT /api/matches/:id': {
    params: MatchIdParams
    query: Record<string, never>
    body: UpdateMatchInput
    response: UpdateMatchResponse
  }
  'DELETE /api/matches/:id': {
    params: MatchIdParams
    query: Record<string, never>
    body: never
    response: DeleteMatchResponse
  }
}

/** Union of all route keys, e.g. `'GET /api/users'`. */
export type ApiRouteKey = keyof ApiRouteMap

/** Lookup helpers so call sites read clearly. */
export type ApiResponse<R extends ApiRouteKey> = ApiRouteMap[R]['response']
export type ApiBody<R extends ApiRouteKey> = ApiRouteMap[R]['body']
export type ApiQuery<R extends ApiRouteKey> = ApiRouteMap[R]['query']
export type ApiParams<R extends ApiRouteKey> = ApiRouteMap[R]['params']
