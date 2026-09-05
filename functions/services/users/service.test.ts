/**
 * functions/services/users/service.test.ts — users service against a REAL
 * local SQLite database (`functions/lib/test-db.ts`, `:memory:` libSQL).
 *
 * Each test gets a fresh isolated database, so UNIQUE constraints, LIKE
 * search, pagination and defaults are exercised for real — no mocks.
 */
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { users } from '../../../db/schema'
import type { Db } from '../../lib/drizzle'
import { ServiceError } from '../../lib/errors'
import { createTestDb, type TestDb } from '../../lib/test-db'
import {
  createUser,
  deleteUser,
  getUserById,
  listUsers,
  updateUser,
} from './service'

let testDb: TestDb
let db: Db

beforeEach(async () => {
  testDb = await createTestDb()
  db = testDb.db
})

afterEach(async () => {
  await testDb.close()
})

async function seedAda(): Promise<number> {
  const { user } = await createUser(db, { name: 'Ada Lovelace', email: 'ada@example.com' })
  return user.id
}

async function seedThree(): Promise<void> {
  await createUser(db, { name: 'Ada Lovelace', email: 'ada@example.com' })
  await createUser(db, { name: 'Grace Hopper', email: 'grace@example.com', role: 'coach' })
  await createUser(db, { name: 'Alan Turing', email: 'alan@example.com', role: 'admin' })
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

describe('listUsers', () => {
  it('returns an empty page when the table is empty', async () => {
    const res = await listUsers(db, {})
    expect(res).toEqual({ users: [], total: 0, limit: 50, offset: 0 })
  })

  it('lists users ordered by id with total', async () => {
    await seedThree()
    const res = await listUsers(db, { limit: 10, offset: 0 })
    expect(res.total).toBe(3)
    expect(res.users.map((u) => u.name)).toEqual(['Ada Lovelace', 'Grace Hopper', 'Alan Turing'])
  })

  it('paginates with limit/offset while keeping the full total', async () => {
    await seedThree()
    const page1 = await listUsers(db, { limit: 2, offset: 0 })
    expect(page1.users).toHaveLength(2)
    expect(page1.total).toBe(3)
    const page2 = await listUsers(db, { limit: 2, offset: 2 })
    expect(page2.users.map((u) => u.name)).toEqual(['Alan Turing'])
    expect(page2.total).toBe(3)
  })

  it('searches by name and email, trimming the query and echoing it back', async () => {
    await seedThree()
    const byName = await listUsers(db, { limit: 10, offset: 0, q: '  grace  ' })
    expect(byName.q).toBe('grace')
    expect(byName.users.map((u) => u.name)).toEqual(['Grace Hopper'])
    expect(byName.total).toBe(1)

    const byDomain = await listUsers(db, { limit: 10, offset: 0, q: 'example.com' })
    expect(byDomain.total).toBe(3)

    const noMatch = await listUsers(db, { limit: 10, offset: 0, q: 'zzz-no-such-user' })
    expect(noMatch).toMatchObject({ users: [], total: 0, q: 'zzz-no-such-user' })
  })
})

describe('createUser', () => {
  it('persists the user and returns it with an id', async () => {
    const { user } = await createUser(db, { name: 'Ada Lovelace', email: 'ada@example.com' })
    expect(user.id).toEqual(expect.any(Number))
    const fetched = await getUserById(db, user.id)
    expect(fetched.user).toMatchObject({ name: 'Ada Lovelace', email: 'ada@example.com', role: 'player' })
    expect(typeof fetched.user.createdAt).toBe('string')
  })

  it('stores real ISO timestamps, not the strftime expression text', async () => {
    const { user } = await createUser(db, { name: 'Ada Lovelace', email: 'ada@example.com' })
    for (const stamp of [user.createdAt, user.updatedAt]) {
      expect(stamp).not.toContain('strftime')
      expect(Number.isNaN(Date.parse(stamp))).toBe(false)
    }
  })

  it('trims names, lowercases emails and defaults role to player', async () => {
    const { user } = await createUser(db, { name: '  Ada  ', email: 'ADA@Example.COM' })
    const [row] = await db.select().from(users)
    expect(row).toMatchObject({ id: user.id, name: 'Ada', email: 'ada@example.com', role: 'player' })
  })

  it('keeps an explicit valid role', async () => {
    const { user } = await createUser(db, { name: 'Coach', email: 'coach@example.com', role: 'coach' })
    expect(user.role).toBe('coach')
  })

  it('rejects missing fields with 400', async () => {
    await expectServiceError(createUser(db, { name: '', email: '' }), 400, 'required')
  })

  it('rejects short names with 400', async () => {
    await expectServiceError(createUser(db, { name: 'a', email: 'a@b.co' }), 400, 'at least 2')
  })

  it('rejects invalid emails with 400', async () => {
    await expectServiceError(createUser(db, { name: 'Ada', email: 'not-an-email' }), 400, 'valid')
  })

  it('rejects unknown roles with 400', async () => {
    await expectServiceError(
      createUser(db, { name: 'Ada', email: 'a@b.co', role: 'referee' as never }),
      400,
      'role must be one of',
    )
  })

  it('maps duplicate emails to 409 via the real UNIQUE constraint', async () => {
    await seedAda()
    await expectServiceError(createUser(db, { name: 'Ada Clone', email: 'ADA@example.com' }), 409, 'already exists')
  })
})

describe('getUserById', () => {
  it('rejects invalid ids with 400', async () => {
    await expectServiceError(getUserById(db, 0), 400, 'Invalid id')
    await expectServiceError(getUserById(db, -3), 400, 'Invalid id')
    await expectServiceError(getUserById(db, Number.NaN), 400, 'Invalid id')
  })

  it('throws 404 when the user does not exist', async () => {
    await expectServiceError(getUserById(db, 999), 404, 'not found')
  })
})

describe('updateUser', () => {
  it('patches the name and persists it', async () => {
    const id = await seedAda()
    const res = await updateUser(db, id, { name: 'Ada Updated' })
    expect(res.user.name).toBe('Ada Updated')
    const fetched = await getUserById(db, id)
    expect(fetched.user.name).toBe('Ada Updated')
  })

  it('normalizes email to lowercase on update', async () => {
    const id = await seedAda()
    const res = await updateUser(db, id, { email: 'NEW@Example.COM' })
    expect(res.user.email).toBe('new@example.com')
  })

  it('rejects invalid ids and empty bodies with 400', async () => {
    await expectServiceError(updateUser(db, 0, { name: 'Ada' }), 400, 'Invalid id')
    await expectServiceError(updateUser(db, 1, {}), 400, 'Empty body')
  })

  it('rejects invalid field values with 400', async () => {
    const id = await seedAda()
    await expectServiceError(updateUser(db, id, { name: 'x' }), 400, 'at least 2')
    await expectServiceError(updateUser(db, id, { email: 'bad' }), 400, 'valid')
    await expectServiceError(updateUser(db, id, { role: 'referee' as never }), 400, 'role must be one of')
  })

  it('rejects bodies with no updatable fields with 400', async () => {
    const id = await seedAda()
    await expectServiceError(updateUser(db, id, { unknown: 'x' } as unknown as never), 400, 'No valid fields')
  })

  it('throws 404 when the user does not exist', async () => {
    await expectServiceError(updateUser(db, 999, { name: 'Ghost' }), 404, 'not found')
  })

  it('maps duplicate emails to 409 via the real UNIQUE constraint', async () => {
    await seedThree()
    const grace = await listUsers(db, { limit: 10, offset: 0, q: 'grace' })
    const graceId = grace.users[0]?.id ?? 0
    await expectServiceError(updateUser(db, graceId, { email: 'ada@example.com' }), 409, 'already exists')
  })
})

describe('deleteUser', () => {
  it('deletes the user and returns its id', async () => {
    const id = await seedAda()
    await expect(deleteUser(db, id)).resolves.toEqual({ deleted: true, id })
    await expectServiceError(getUserById(db, id), 404, 'not found')
  })

  it('rejects invalid ids with 400', async () => {
    await expectServiceError(deleteUser(db, 0), 400, 'Invalid id')
  })

  it('throws 404 when the user does not exist', async () => {
    await expectServiceError(deleteUser(db, 999), 404, 'not found')
  })
})
