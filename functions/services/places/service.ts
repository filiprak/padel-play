/**
 * functions/services/places/service.ts — business logic for the `places` service.
 * Owns validation + drizzle queries. Route adapters:
 * `functions/api/places.ts`, `functions/api/places/[id].ts`.
 *
 * Throw `ServiceError` on failure — `RestEndpoint` maps it to the right
 * HTTP status automatically.
 */
import { asc, count, eq, like, or } from 'drizzle-orm'
import { matches, places } from '../../../db/schema'
import type { Db, QueryDb } from '../../lib/drizzle'
import { ServiceError } from '../../lib/errors'
import type {
  CreatePlaceInput,
  CreatePlaceResponse,
  DeletePlaceResponse,
  GetPlaceResponse,
  ListPlacesQuery,
  ListPlacesResponse,
  PlaceDto,
  UpdatePlaceInput,
  UpdatePlaceResponse,
} from '../../../shared/places/types'

export async function listPlaces(db: Db, query: ListPlacesQuery): Promise<ListPlacesResponse> {
  const limit = query.limit ?? 50
  const offset = query.offset ?? 0
  const q = query.q?.trim() || undefined

  if (q) {
    const pattern = `%${q}%`
    const where = or(like(places.name, pattern), like(places.location, pattern))
    const rows = await db.select().from(places).where(where).orderBy(asc(places.id)).limit(limit).offset(offset)
    const [cntRow] = await db.select({ total: count() }).from(places).where(where)
    return { places: toDtos(rows), total: Number(cntRow?.total ?? 0), limit, offset, q }
  }

  const rows = await db.select().from(places).orderBy(asc(places.id)).limit(limit).offset(offset)
  const [cntRow] = await db.select({ total: count() }).from(places)
  return { places: toDtos(rows), total: Number(cntRow?.total ?? 0), limit, offset }
}

export async function createPlace(db: Db, input: CreatePlaceInput): Promise<CreatePlaceResponse> {
  const name = input.name?.trim() ?? ''
  const location = input.location?.trim() || null

  if (!input || !name) throw ServiceError.badRequest("Field 'name' is required")
  if (name.length < 2) throw ServiceError.badRequest('name must be at least 2 characters')

  const [place] = await db
    .insert(places)
    .values({ name, location, updatedAt: new Date().toISOString() })
    .returning()
  if (!place) throw ServiceError.badRequest('Failed to create place')
  return { place: toDto(place) }
}

export async function getPlaceById(db: Db, id: number): Promise<GetPlaceResponse> {
  const place = await requirePlace(db, id)
  return { place }
}

export async function updatePlace(db: Db, id: number, input: UpdatePlaceInput): Promise<UpdatePlaceResponse> {
  await requirePlace(db, id)
  if (!input || Object.keys(input).length === 0) throw ServiceError.badRequest('Empty body')

  const data: { name?: string; location?: string | null } = {}
  if ('name' in input) {
    const v = input.name
    if (typeof v !== 'string' || v.trim().length < 2) throw ServiceError.badRequest('name must be at least 2 characters')
    data.name = v.trim()
  }
  if ('location' in input) {
    const v = input.location
    if (v !== null && v !== undefined && typeof v !== 'string') throw ServiceError.badRequest('location must be a string')
    data.location = v?.trim() || null
  }
  if (Object.keys(data).length === 0) {
    throw ServiceError.badRequest('No valid fields to update. Allowed: name, location')
  }

  const [updated] = await db
    .update(places)
    .set({ ...data, updatedAt: new Date().toISOString() })
    .where(eq(places.id, id))
    .returning()
  if (!updated) throw ServiceError.notFound('Place not found')
  return { place: toDto(updated) }
}

export async function deletePlace(db: Db, id: number): Promise<DeletePlaceResponse> {
  await requirePlace(db, id)
  // Refuse while matches are scheduled there — explicit check instead of
  // relying on FK enforcement (SQLite needs PRAGMA foreign_keys per connection).
  const [scheduled] = await db.select({ id: matches.id }).from(matches).where(eq(matches.placeId, id)).limit(1)
  if (scheduled) throw ServiceError.conflict('Place has scheduled matches and cannot be deleted')
  const [deleted] = await db.delete(places).where(eq(places.id, id)).returning({ id: places.id })
  if (!deleted) throw ServiceError.notFound('Place not found')
  return { deleted: true, id }
}

/** 404 unless the place exists. Returns the DTO for reuse (also by the matches service). */
export async function requirePlace(db: QueryDb, id: number): Promise<PlaceDto> {
  if (!Number.isInteger(id) || id <= 0) throw ServiceError.badRequest('Invalid id')
  const [place] = await db.select().from(places).where(eq(places.id, id)).limit(1)
  if (!place) throw ServiceError.notFound('Place not found')
  return toDto(place)
}

function toDto(row: typeof places.$inferSelect): PlaceDto {
  return { id: row.id, name: row.name, location: row.location, createdAt: row.createdAt, updatedAt: row.updatedAt }
}

function toDtos(rows: (typeof places.$inferSelect)[]): PlaceDto[] {
  return rows.map(toDto)
}
