import { RestEndpoint, type RestContext } from '../../lib/rest'
import { deleteMatch, getMatchById, updateMatch } from '../../services/matches/service'
import type {
  DeleteMatchResponse,
  GetMatchResponse,
  UpdateMatchInput,
  UpdateMatchResponse,
} from '../../../shared/matches/types'
import { ServiceError } from '../../lib/errors'

/**
 * Thin route adapter for `/api/matches/:id`.
 * Routing + HTTP only — business logic lives in `functions/services/matches/service.ts`.
 */
class MatchByIdEndpoint extends RestEndpoint {
  private getId(ctx: RestContext): number {
    const n = Number(this.param(ctx, 'id'))
    if (!Number.isInteger(n) || n <= 0) throw ServiceError.badRequest('Invalid id')
    return n
  }

  // GET /api/matches/:id
  async get(ctx: RestContext): Promise<Response> {
    const result = await getMatchById(this.db(ctx), this.getId(ctx))
    return this.json<GetMatchResponse>(result)
  }

  // PATCH /api/matches/:id { placeId?, startsAt?, endsAt?, players? }
  async patch(ctx: RestContext): Promise<Response> {
    const body = await this.parseJson<UpdateMatchInput>(ctx)
    const result = await updateMatch(this.db(ctx), this.getId(ctx), body ?? {})
    return this.json<UpdateMatchResponse>(result)
  }

  // PUT /api/matches/:id — full replace (same as PATCH)
  async put(ctx: RestContext): Promise<Response> {
    return this.patch(ctx)
  }

  // DELETE /api/matches/:id
  async delete(ctx: RestContext): Promise<Response> {
    const result = await deleteMatch(this.db(ctx), this.getId(ctx))
    return this.json<DeleteMatchResponse>(result)
  }
}

const ep = new MatchByIdEndpoint()
export const onRequest: PagesFunction<CloudflareEnv> = (ctx) => ep.handle(ctx)
