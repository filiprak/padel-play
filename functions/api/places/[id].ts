import { RestEndpoint, type RestContext } from '../../lib/rest'
import { deletePlace, getPlaceById, updatePlace } from '../../services/places/service'
import type {
  DeletePlaceResponse,
  GetPlaceResponse,
  UpdatePlaceInput,
  UpdatePlaceResponse,
} from '../../../shared/places/types'
import { ServiceError } from '../../lib/errors'

/**
 * Thin route adapter for `/api/places/:id`.
 * Routing + HTTP only — business logic lives in `functions/services/places/service.ts`.
 */
class PlaceByIdEndpoint extends RestEndpoint {
  private getId(ctx: RestContext): number {
    const n = Number(this.param(ctx, 'id'))
    if (!Number.isInteger(n) || n <= 0) throw ServiceError.badRequest('Invalid id')
    return n
  }

  // GET /api/places/:id
  async get(ctx: RestContext): Promise<Response> {
    const result = await getPlaceById(this.db(ctx), this.getId(ctx))
    return this.json<GetPlaceResponse>(result)
  }

  // PATCH /api/places/:id { name?, location? }
  async patch(ctx: RestContext): Promise<Response> {
    const body = await this.parseJson<UpdatePlaceInput>(ctx)
    const result = await updatePlace(this.db(ctx), this.getId(ctx), body ?? {})
    return this.json<UpdatePlaceResponse>(result)
  }

  // PUT /api/places/:id — full replace (same as PATCH)
  async put(ctx: RestContext): Promise<Response> {
    return this.patch(ctx)
  }

  // DELETE /api/places/:id
  async delete(ctx: RestContext): Promise<Response> {
    const result = await deletePlace(this.db(ctx), this.getId(ctx))
    return this.json<DeletePlaceResponse>(result)
  }
}

const ep = new PlaceByIdEndpoint()
export const onRequest: PagesFunction<CloudflareEnv> = (ctx) => ep.handle(ctx)
