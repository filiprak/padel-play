/**
 * functions/services/matches/service.ts — business logic for the `matches` service.
 * Owns validation + drizzle queries. Route adapters:
 * `functions/api/matches.ts`, `functions/api/matches/[id].ts`.
 *
 * Rules enforced here:
 * - 2v2 shape: 1-4 distinct users, at most 2 per team (open spots allowed);
 * - `startsAt` is a valid datetime before `endsAt`;
 * - the venue must exist (delegated to the separate `places` service).
 *
 * Throw `ServiceError` on failure — `RestEndpoint` maps it to the right
 * HTTP status automatically.
 */
import { and, asc, count, eq, inArray } from 'drizzle-orm'
import { matchPlayers, matches, users } from '../../../db/schema'
import type { Db, QueryDb } from '../../lib/drizzle'
import { ServiceError } from '../../lib/errors'
import { requirePlace } from '../places/service'
import type {
  CreateMatchInput,
  CreateMatchResponse,
  DeleteMatchResponse,
  GetMatchResponse,
  ListMatchesQuery,
  ListMatchesResponse,
  MatchDto,
  MatchPlayerDto,
  MatchPlayerInput,
  MatchTeam,
  UpdateMatchInput,
  UpdateMatchResponse,
} from '../../../shared/matches/types'
import type { UserDto, UserRole } from '../../../shared/users/types'

type MatchRow = typeof matches.$inferSelect

export async function listMatches(db: Db, query: ListMatchesQuery): Promise<ListMatchesResponse> {
  const limit = query.limit ?? 50
  const offset = query.offset ?? 0
  const placeId = query.placeId
  const userId = query.userId

  if (placeId !== undefined && (!Number.isInteger(placeId) || placeId <= 0)) {
    throw ServiceError.badRequest('placeId must be a positive integer')
  }
  if (userId !== undefined && (!Number.isInteger(userId) || userId <= 0)) {
    throw ServiceError.badRequest('userId must be a positive integer')
  }

  const conditions = []
  if (placeId !== undefined) conditions.push(eq(matches.placeId, placeId))
  if (userId !== undefined) {
    const links = await db
      .select({ matchId: matchPlayers.matchId })
      .from(matchPlayers)
      .where(eq(matchPlayers.userId, userId))
    const ids = links.map((l) => l.matchId)
    if (ids.length === 0) return { matches: [], total: 0, limit, offset }
    conditions.push(inArray(matches.id, ids))
  }
  const where = conditions.length > 0 ? and(...conditions) : undefined

  const base = db.select().from(matches)
  const rows = await (where ? base.where(where) : base)
    .orderBy(asc(matches.startsAt), asc(matches.id))
    .limit(limit)
    .offset(offset)
  const countBase = db.select({ total: count() }).from(matches)
  const [cntRow] = await (where ? countBase.where(where) : countBase)

  const dtos: MatchDto[] = []
  for (const row of rows) {
    dtos.push(await toMatchDto(db, row))
  }
  return { matches: dtos, total: Number(cntRow?.total ?? 0), limit, offset }
}

export async function createMatch(db: Db, input: CreateMatchInput): Promise<CreateMatchResponse> {
  if (!input) throw ServiceError.badRequest('Missing match body')
  await requirePlace(db, input.placeId)
  const startsAt = normalizeDateTime(input.startsAt, 'startsAt')
  const endsAt = normalizeDateTime(input.endsAt, 'endsAt')
  assertTimeOrder(startsAt, endsAt)
  await assertValidSquad(db, input.players)

  const match = await db.transaction(async (tx) => {
    const [row] = await tx
      .insert(matches)
      .values({ placeId: input.placeId, startsAt, endsAt, updatedAt: new Date().toISOString() })
      .returning()
    if (!row) throw ServiceError.badRequest('Failed to create match')
    await tx.insert(matchPlayers).values(
      input.players.map((p) => ({ matchId: row.id, userId: p.userId, team: p.team })),
    )
    return row
  })
  return { match: await toMatchDto(db, match) }
}

export async function getMatchById(db: Db, id: number): Promise<GetMatchResponse> {
  const row = await requireMatch(db, id)
  return { match: await toMatchDto(db, row) }
}

export async function updateMatch(db: Db, id: number, input: UpdateMatchInput): Promise<UpdateMatchResponse> {
  const existing = await requireMatch(db, id)
  if (!input || Object.keys(input).length === 0) throw ServiceError.badRequest('Empty body')

  const allowed = ['placeId', 'startsAt', 'endsAt', 'players'] as const
  const keys = Object.keys(input)
  if (keys.length === 0 || !keys.every((k) => (allowed as readonly string[]).includes(k))) {
    throw ServiceError.badRequest('No valid fields to update. Allowed: placeId, startsAt, endsAt, players')
  }

  const placeId = input.placeId ?? existing.placeId
  await requirePlace(db, placeId)
  const startsAt = input.startsAt !== undefined ? normalizeDateTime(input.startsAt, 'startsAt') : existing.startsAt
  const endsAt = input.endsAt !== undefined ? normalizeDateTime(input.endsAt, 'endsAt') : existing.endsAt
  assertTimeOrder(startsAt, endsAt)
  if (input.players !== undefined) await assertValidSquad(db, input.players)

  const match = await db.transaction(async (tx) => {
    const [row] = await tx
      .update(matches)
      .set({ placeId, startsAt, endsAt, updatedAt: new Date().toISOString() })
      .where(eq(matches.id, id))
      .returning()
    if (!row) throw ServiceError.notFound('Match not found')
    if (input.players !== undefined) {
      await tx.delete(matchPlayers).where(eq(matchPlayers.matchId, id))
      await tx.insert(matchPlayers).values(
        input.players.map((p) => ({ matchId: id, userId: p.userId, team: p.team })),
      )
    }
    return row
  })
  return { match: await toMatchDto(db, match) }
}

export async function deleteMatch(db: Db, id: number): Promise<DeleteMatchResponse> {
  await requireMatch(db, id)
  // Delete players explicitly (SQLite FK enforcement needs per-connection PRAGMA).
  await db.delete(matchPlayers).where(eq(matchPlayers.matchId, id))
  const [deleted] = await db.delete(matches).where(eq(matches.id, id)).returning({ id: matches.id })
  if (!deleted) throw ServiceError.notFound('Match not found')
  return { deleted: true, id }
}

// ---------------------------------------------------------------------------
// Internals
// ---------------------------------------------------------------------------

async function requireMatch(db: QueryDb, id: number): Promise<MatchRow> {
  if (!Number.isInteger(id) || id <= 0) throw ServiceError.badRequest('Invalid id')
  const [row] = await db.select().from(matches).where(eq(matches.id, id)).limit(1)
  if (!row) throw ServiceError.notFound('Match not found')
  return row
}

async function toMatchDto(db: QueryDb, row: MatchRow): Promise<MatchDto> {
  const place = await requirePlace(db, row.placeId)
  const links = await db.select().from(matchPlayers).where(eq(matchPlayers.matchId, row.id))
  const userIds = links.map((l) => l.userId)
  const userRows = userIds.length > 0 ? await db.select().from(users).where(inArray(users.id, userIds)) : []
  const byId = new Map(userRows.map((u) => [u.id, u]))

  const players: MatchPlayerDto[] = links.map((l) => {
    const u = byId.get(l.userId)
    if (!u) throw new Error(`Match ${row.id} references missing user ${l.userId}`)
    if (l.team !== 1 && l.team !== 2) throw new Error(`Match ${row.id} has invalid team ${l.team}`)
    return {
      user: {
        id: u.id,
        name: u.name,
        email: u.email,
        role: u.role as UserRole,
        createdAt: u.createdAt,
        updatedAt: u.updatedAt,
      } satisfies UserDto,
      team: l.team as MatchTeam,
    }
  })
  players.sort((a, b) => a.team - b.team || a.user.id - b.user.id)

  return {
    id: row.id,
    startsAt: row.startsAt,
    endsAt: row.endsAt,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    place,
    players,
  }
}

function normalizeDateTime(value: unknown, field: 'startsAt' | 'endsAt'): string {
  if (typeof value !== 'string' || value.trim() === '') {
    throw ServiceError.badRequest(`Field '${field}' is required`)
  }
  const time = Date.parse(value)
  if (Number.isNaN(time)) throw ServiceError.badRequest(`Field '${field}' must be a valid datetime`)
  return new Date(time).toISOString()
}

function assertTimeOrder(startsAt: string, endsAt: string): void {
  if (Date.parse(startsAt) >= Date.parse(endsAt)) {
    throw ServiceError.badRequest("'startsAt' must be before 'endsAt'")
  }
}

/**
 * Enforces the 2v2 shape with room for open spots: 1-4 distinct existing
 * users, at most 2 per team. Unfilled slots are rendered as empty spots
 * on the frontend.
 */
async function assertValidSquad(db: QueryDb, players: MatchPlayerInput[] | undefined): Promise<void> {
  if (!Array.isArray(players) || players.length < 1 || players.length > 4) {
    throw ServiceError.badRequest('a match needs 1 to 4 players (2 vs 2, empty spots allowed)')
  }
  for (const p of players) {
    if (p.team !== 1 && p.team !== 2) throw ServiceError.badRequest('each player team must be 1 or 2')
    if (!Number.isInteger(p.userId) || p.userId <= 0) throw ServiceError.badRequest('each player needs a valid userId')
  }
  if (players.filter((p) => p.team === 1).length > 2 || players.filter((p) => p.team === 2).length > 2) {
    throw ServiceError.badRequest('each team can have at most 2 players')
  }
  const ids = players.map((p) => p.userId)
  if (new Set(ids).size !== ids.length) throw ServiceError.badRequest('players must be distinct users')
  const rows = await db.select({ id: users.id }).from(users).where(inArray(users.id, ids))
  if (rows.length !== ids.length) {
    const found = new Set(rows.map((r) => r.id))
    const missing = ids.filter((id) => !found.has(id))
    throw ServiceError.notFound(`User(s) not found: ${missing.join(', ')}`)
  }
}
