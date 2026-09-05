import { RestEndpoint, type RestContext } from '../lib/rest'
import { ServiceError } from '../lib/errors'
import { createMatch, listMatches } from '../services/matches/service'
import type { CreateMatchInput, CreateMatchResponse, ListMatchesResponse } from '../../shared/matches/types'

/**
 * Thin route adapter for `/api/matches`.
 * Routing + HTTP only — business logic lives in `functions/services/matches/service.ts`.
 */
class MatchesEndpoint extends RestEndpoint {
  // GET /api/matches?limit=50&offset=0&placeId=1&userId=2
  async get(ctx: RestContext): Promise<Response> {
    const { limit, offset } = this.pagination(ctx)
    const placeId = this.intQuery(ctx, 'placeId')
    const userId = this.intQuery(ctx, 'userId')
    const result = await listMatches(this.db(ctx), { limit, offset, placeId, userId })
    return this.json<ListMatchesResponse>(result)
  }

  // POST /api/matches { placeId, startsAt, endsAt, players: [{ userId, team }] }
  async post(ctx: RestContext): Promise<Response> {
    const body = await this.parseJson<CreateMatchInput>(ctx)
    if (!body) throw ServiceError.badRequest('Missing match body')
    const result = await createMatch(this.db(ctx), body)
    return this.json<CreateMatchResponse>(result, { status: 201 })
  }

  private intQuery(ctx: RestContext, key: string): number | undefined {
    const raw = this.query(ctx, key)
    if (raw === undefined || raw === '') return undefined
    const n = Number(raw)
    if (!Number.isInteger(n) || n <= 0) throw ServiceError.badRequest(`${key} must be a positive integer`)
    return n
  }
}

const ep = new MatchesEndpoint()
export const onRequest: PagesFunction<CloudflareEnv> = (ctx) => ep.handle(ctx)
