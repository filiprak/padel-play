/**
 * functions/services/places/service.test.ts — places service against a REAL
 * local SQLite database (`functions/lib/test-db.ts`, `:memory:` libSQL).
 */
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import type { Db } from '../../lib/drizzle'
import { ServiceError } from '../../lib/errors'
import { createTestDb, type TestDb } from '../../lib/test-db'
import { createPlace, deletePlace, getPlaceById, listPlaces, updatePlace } from './service'

let testDb: TestDb
let db: Db

beforeEach(async () => {
  testDb = await createTestDb()
  db = testDb.db
})

afterEach(async () => {
  await testDb.close()
})

async function seedHall(): Promise<number> {
  const { place } = await createPlace(db, { name: 'Central Hall', location: 'Madrid' })
  return place.id
}

async function expectServiceError(p: Promise<unknown>, status: number, messagePart?: string): Promise<ServiceError> {
  try {
    await p
  } catch (e) {
    expect(e).toBeInstanceOf(ServiceError)
    const err = e as ServiceError
    expect(err.status).toBe(status)
    if (messagePart) expect(err.message).toContain(messagePart)
    return err
  }
  throw new Error(`Expected ServiceError(${status}), but promise resolved`)
}

describe('listPlaces', () => {
  it('returns an empty page when the table is empty', async () => {
    const res = await listPlaces(db, {})
    expect(res).toEqual({ places: [], total: 0, limit: 50, offset: 0 })
  })

  it('lists places ordered by id with total', async () => {
    await createPlace(db, { name: 'Central Hall', location: 'Madrid' })
    await createPlace(db, { name: 'Beach Courts' })
    const res = await listPlaces(db, { limit: 10, offset: 0 })
    expect(res.total).toBe(2)
    expect(res.places.map((p) => p.name)).toEqual(['Central Hall', 'Beach Courts'])
    expect(res.places[1]).toMatchObject({ location: null })
  })

  it('searches by name and location', async () => {
    await createPlace(db, { name: 'Central Hall', location: 'Madrid' })
    await createPlace(db, { name: 'North Club', location: 'Barcelona' })
    const res = await listPlaces(db, { limit: 10, offset: 0, q: '  barce  ' })
    expect(res.q).toBe('barce')
    expect(res.places.map((p) => p.name)).toEqual(['North Club'])
  })
})

describe('createPlace', () => {
  it('persists the place and returns it with an id', async () => {
    const { place } = await createPlace(db, { name: 'Central Hall', location: 'Madrid' })
    expect(place.id).toEqual(expect.any(Number))
    const fetched = await getPlaceById(db, place.id)
    expect(fetched.place).toMatchObject({ name: 'Central Hall', location: 'Madrid' })
  })

  it('rejects missing or short names with 400', async () => {
    await expectServiceError(createPlace(db, { name: '' }), 400, 'required')
    await expectServiceError(createPlace(db, { name: 'x' }), 400, 'at least 2')
  })
})

describe('getPlaceById', () => {
  it('rejects invalid ids with 400 and unknown ids with 404', async () => {
    await expectServiceError(getPlaceById(db, 0), 400, 'Invalid id')
    await expectServiceError(getPlaceById(db, 999), 404, 'not found')
  })
})

describe('updatePlace', () => {
  it('patches name and location, and clears location with null', async () => {
    const id = await seedHall()
    const renamed = await updatePlace(db, id, { name: 'Central Hall 2' })
    expect(renamed.place.name).toBe('Central Hall 2')
    const cleared = await updatePlace(db, id, { location: null })
    expect(cleared.place.location).toBeNull()
  })

  it('rejects empty bodies and invalid values with 400', async () => {
    const id = await seedHall()
    await expectServiceError(updatePlace(db, id, {}), 400, 'Empty body')
    await expectServiceError(updatePlace(db, id, { name: 'x' }), 400, 'at least 2')
    await expectServiceError(updatePlace(db, 999, { name: 'Ghost' }), 404, 'not found')
  })
})

describe('deletePlace', () => {
  it('deletes the place and returns its id', async () => {
    const id = await seedHall()
    await expect(deletePlace(db, id)).resolves.toEqual({ deleted: true, id })
    await expectServiceError(getPlaceById(db, id), 404, 'not found')
  })

  it('rejects invalid ids with 400 and unknown ids with 404', async () => {
    await expectServiceError(deletePlace(db, 0), 400, 'Invalid id')
    await expectServiceError(deletePlace(db, 999), 404, 'not found')
  })
})
