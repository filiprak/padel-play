/**
 * functions/services/matches/service.test.ts — matches service against a REAL
 * local SQLite database (`functions/lib/test-db.ts`, `:memory:` libSQL).
 */
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { eq } from 'drizzle-orm'
import { matchPlayers, matches } from '../../../db/schema'
import type { Db } from '../../lib/drizzle'
import { ServiceError } from '../../lib/errors'
import { createTestDb, type TestDb } from '../../lib/test-db'
import { createUser } from '../users/service'
import { createPlace } from '../places/service'
import { createMatch, deleteMatch, getMatchById, listMatches, updateMatch } from './service'
import type { CreateMatchInput } from '../../../shared/matches/types'

let testDb: TestDb
let db: Db

beforeEach(async () => {
  testDb = await createTestDb()
  db = testDb.db
})

afterEach(async () => {
  await testDb.close()
})

interface Fixture {
  placeId: number
  userIds: [number, number, number, number]
}

async function seedFixture(): Promise<Fixture> {
  const { place } = await createPlace(db, { name: 'Central Hall', location: 'Madrid' })
  const ids: number[] = []
  for (const [name, email] of [
    ['Ada Lovelace', 'ada@example.com'],
    ['Grace Hopper', 'grace@example.com'],
    ['Alan Turing', 'alan@example.com'],
    ['Katherine Johnson', 'katherine@example.com'],
  ] as const) {
    const { user } = await createUser(db, { name, email })
    ids.push(user.id)
  }
  return { placeId: place.id, userIds: ids as [number, number, number, number] }
}

function validInput(fx: Fixture): CreateMatchInput {
  const [a, b, c, d] = fx.userIds
  return {
    placeId: fx.placeId,
    startsAt: '2026-10-01T10:00:00.000Z',
    endsAt: '2026-10-01T11:30:00.000Z',
    players: [
      { userId: a, team: 1 },
      { userId: b, team: 1 },
      { userId: c, team: 2 },
      { userId: d, team: 2 },
    ],
  }
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

describe('createMatch', () => {
  it('creates a 2v2 match with embedded place and players', async () => {
    const fx = await seedFixture()
    const { match } = await createMatch(db, validInput(fx))
    expect(match.id).toEqual(expect.any(Number))
    expect(match.startsAt).toBe('2026-10-01T10:00:00.000Z')
    expect(match.endsAt).toBe('2026-10-01T11:30:00.000Z')
    expect(match.place).toMatchObject({ id: fx.placeId, name: 'Central Hall' })
    expect(match.players).toHaveLength(4)
    expect(match.players.filter((p) => p.team === 1)).toHaveLength(2)
    expect(match.players.filter((p) => p.team === 2)).toHaveLength(2)
    expect(match.players.map((p) => p.user.name).sort()).toEqual(
      ['Ada Lovelace', 'Alan Turing', 'Grace Hopper', 'Katherine Johnson'].sort(),
    )
  })

  it('rejects squads that are not 2 vs 2', async () => {
    const fx = await seedFixture()
    const [a, b, c, d] = fx.userIds
    const base = validInput(fx)

    // only 3 players
    await expectServiceError(
      createMatch(db, { ...base, players: base.players.slice(0, 3) }),
      400,
      'exactly 4 players',
    )
    // 3 vs 1
    await expectServiceError(
      createMatch(db, {
        ...base,
        players: [
          { userId: a, team: 1 },
          { userId: b, team: 1 },
          { userId: c, team: 1 },
          { userId: d, team: 2 },
        ],
      }),
      400,
      'exactly 2 players',
    )
    // same user twice (both teams covered, distinct violated)
    await expectServiceError(
      createMatch(db, {
        ...base,
        players: [
          { userId: a, team: 1 },
          { userId: b, team: 1 },
          { userId: c, team: 2 },
          { userId: a, team: 2 },
        ],
      }),
      400,
      'distinct',
    )
    // invalid team value
    await expectServiceError(
      createMatch(db, {
        ...base,
        players: [
          { userId: a, team: 1 },
          { userId: b, team: 1 },
          { userId: c, team: 2 },
          { userId: d, team: 3 as never },
        ],
      }),
      400,
      'team must be 1 or 2',
    )
  })

  it('rejects unknown users with 404', async () => {
    const fx = await seedFixture()
    const base = validInput(fx)
    await expectServiceError(
      createMatch(db, { ...base, players: [...base.players.slice(0, 3), { userId: 9999, team: 2 }] }),
      404,
      'User(s) not found: 9999',
    )
  })

  it('rejects bad time ranges with 400', async () => {
    const fx = await seedFixture()
    const base = validInput(fx)
    await expectServiceError(createMatch(db, { ...base, startsAt: 'not-a-date' }), 400, 'valid datetime')
    await expectServiceError(
      createMatch(db, { ...base, startsAt: base.endsAt, endsAt: base.startsAt }),
      400,
      'must be before',
    )
    await expectServiceError(
      createMatch(db, { ...base, startsAt: base.endsAt, endsAt: base.endsAt }),
      400,
      'must be before',
    )
  })

  it('rejects unknown places with 404', async () => {
    const fx = await seedFixture()
    await expectServiceError(createMatch(db, { ...validInput(fx), placeId: 9999 }), 404, 'Place not found')
  })
})

describe('getMatchById', () => {
  it('returns the match and rejects bad ids', async () => {
    const fx = await seedFixture()
    const { match } = await createMatch(db, validInput(fx))
    const fetched = await getMatchById(db, match.id)
    expect(fetched.match.id).toBe(match.id)
    await expectServiceError(getMatchById(db, 0), 400, 'Invalid id')
    await expectServiceError(getMatchById(db, 9999), 404, 'not found')
  })
})

describe('listMatches', () => {
  it('lists matches ordered by start time with total', async () => {
    const fx = await seedFixture()
    const base = validInput(fx)
    await createMatch(db, { ...base, startsAt: '2026-10-02T10:00:00.000Z', endsAt: '2026-10-02T11:00:00.000Z' })
    await createMatch(db, { ...base, startsAt: '2026-10-01T10:00:00.000Z', endsAt: '2026-10-01T11:00:00.000Z' })
    const res = await listMatches(db, { limit: 10, offset: 0 })
    expect(res.total).toBe(2)
    expect(res.matches.map((m) => m.startsAt)).toEqual(['2026-10-01T10:00:00.000Z', '2026-10-02T10:00:00.000Z'])
    for (const m of res.matches) expect(m.players).toHaveLength(4)
  })

  it('filters by place and by participating user', async () => {
    const fx = await seedFixture()
    const { place } = await createPlace(db, { name: 'North Club' })
    const base = validInput(fx)
    const { match } = await createMatch(db, base)
    await createMatch(db, { ...base, placeId: place.id })

    const byPlace = await listMatches(db, { limit: 10, offset: 0, placeId: place.id })
    expect(byPlace.total).toBe(1)
    expect(byPlace.matches[0]?.place.id).toBe(place.id)

    const byUser = await listMatches(db, { limit: 10, offset: 0, userId: fx.userIds[0] })
    expect(byUser.total).toBe(2)

    const outsider = await createUser(db, { name: 'Outsider', email: 'out@example.com' })
    const none = await listMatches(db, { limit: 10, offset: 0, userId: outsider.user.id })
    expect(none).toMatchObject({ matches: [], total: 0 })
    expect(match.id).toEqual(expect.any(Number))
  })
})

describe('updateMatch', () => {
  it('moves the match to another place and time', async () => {
    const fx = await seedFixture()
    const { match } = await createMatch(db, validInput(fx))
    const { place } = await createPlace(db, { name: 'North Club' })
    const res = await updateMatch(db, match.id, {
      placeId: place.id,
      startsAt: '2026-11-01T18:00:00.000Z',
      endsAt: '2026-11-01T19:30:00.000Z',
    })
    expect(res.match.place.id).toBe(place.id)
    expect(res.match.startsAt).toBe('2026-11-01T18:00:00.000Z')
    expect(res.match.players).toHaveLength(4)
  })

  it('replaces the squad when players are provided', async () => {
    const fx = await seedFixture()
    const { match } = await createMatch(db, validInput(fx))
    const { user } = await createUser(db, { name: 'New Player', email: 'new@example.com' })
    const [a, b, c] = fx.userIds
    const res = await updateMatch(db, match.id, {
      players: [
        { userId: a, team: 1 },
        { userId: b, team: 1 },
        { userId: c, team: 2 },
        { userId: user.id, team: 2 },
      ],
    })
    expect(res.match.players.map((p) => p.user.id).sort()).toEqual([a, b, c, user.id].sort())
  })

  it('rejects invalid updates', async () => {
    const fx = await seedFixture()
    const { match } = await createMatch(db, validInput(fx))
    await expectServiceError(updateMatch(db, match.id, {}), 400, 'Empty body')
    await expectServiceError(updateMatch(db, match.id, { startsAt: '2026-12-02T10:00:00Z', endsAt: '2026-12-01T10:00:00Z' }), 400, 'must be before')
    await expectServiceError(updateMatch(db, match.id, { placeId: 9999 }), 404, 'Place not found')
    await expectServiceError(updateMatch(db, 9999, { startsAt: '2026-12-01T10:00:00Z' }), 404, 'not found')
  })
})

describe('deleteMatch', () => {
  it('deletes the match and its player assignments', async () => {
    const fx = await seedFixture()
    const { match } = await createMatch(db, validInput(fx))
    await expect(deleteMatch(db, match.id)).resolves.toEqual({ deleted: true, id: match.id })
    await expectServiceError(getMatchById(db, match.id), 404, 'not found')
    const orphans = await db.select().from(matchPlayers).where(eq(matchPlayers.matchId, match.id))
    expect(orphans).toHaveLength(0)
    // users and place survive the delete
    const remaining = await db.select().from(matches)
    expect(remaining).toHaveLength(0)
    expect(fx.placeId).toEqual(expect.any(Number))
  })

  it('rejects invalid and unknown ids', async () => {
    await expectServiceError(deleteMatch(db, 0), 400, 'Invalid id')
    await expectServiceError(deleteMatch(db, 9999), 404, 'not found')
  })
})

describe('deletePlace with matches', () => {
  it('refuses to delete a place that has scheduled matches', async () => {
    const fx = await seedFixture()
    await createMatch(db, validInput(fx))
    const { deletePlace } = await import('../places/service')
    await expectServiceError(deletePlace(db, fx.placeId), 409, 'scheduled matches')
  })
})
