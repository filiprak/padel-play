/**
 * shared/matches/types.ts — contract for the `matches` service.
 * Owner: matches service.
 *
 * Every match is 2 vs 2: exactly four assigned users, two per team.
 * The venue comes from the separate `places` service and is embedded
 * in responses as a `PlaceDto`.
 */
import type { PlaceDto } from '../places/types'
import type { UserDto } from '../users/types'

export type MatchTeam = 1 | 2

/** One assigned player: the user plus which side (1 or 2) they play on. */
export interface MatchPlayerDto {
  user: UserDto
  team: MatchTeam
}

export interface MatchDto {
  id: number
  startsAt: string
  endsAt: string
  createdAt: string
  updatedAt: string
  place: PlaceDto
  /** Always 4 entries: two with `team: 1`, two with `team: 2`. */
  players: MatchPlayerDto[]
}

export interface ListMatchesQuery {
  limit?: number
  offset?: number
  /** Only matches played at this place. */
  placeId?: number
  /** Only matches this user plays in. */
  userId?: number
}

export interface ListMatchesResponse {
  matches: MatchDto[]
  total: number
  limit: number
  offset: number
}

export interface MatchPlayerInput {
  userId: number
  team: MatchTeam
}

export interface CreateMatchInput {
  placeId: number
  /** ISO-8601 datetime string. Must be before `endsAt`. */
  startsAt: string
  /** ISO-8601 datetime string. Must be after `startsAt`. */
  endsAt: string
  /** Exactly 4 entries: two per team, four distinct users. */
  players: MatchPlayerInput[]
}

export interface CreateMatchResponse {
  match: MatchDto
}

export interface MatchIdParams {
  id: number
}

export interface GetMatchResponse {
  match: MatchDto
}

export interface UpdateMatchInput {
  placeId?: number
  startsAt?: string
  endsAt?: string
  /** Full replacement of the squad when present (still 2v2). */
  players?: MatchPlayerInput[]
}

export interface UpdateMatchResponse {
  match: MatchDto
}

export interface DeleteMatchResponse {
  deleted: true
  id: number
}
