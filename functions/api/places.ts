import { RestEndpoint, type RestContext } from '../lib/rest'
import { createPlace, listPlaces } from '../services/places/service'
import type { CreatePlaceInput, CreatePlaceResponse, ListPlacesResponse } from '../../shared/places/types'

/**
 * Thin route adapter for `/api/places`.
 * Routing + HTTP only — business logic lives in `functions/services/places/service.ts`.
 */
class PlacesEndpoint extends RestEndpoint {
  // GET /api/places?limit=50&offset=0&q=centro
  async get(ctx: RestContext): Promise<Response> {
    const { limit, offset } = this.pagination(ctx)
    const q = this.query(ctx, 'q')?.trim() || undefined
    const result = await listPlaces(this.db(ctx), { limit, offset, q })
    return this.json<ListPlacesResponse>(result)
  }

  // POST /api/places { name, location? }
  async post(ctx: RestContext): Promise<Response> {
    const body = await this.parseJson<CreatePlaceInput>(ctx)
    const result = await createPlace(this.db(ctx), body ?? ({} as CreatePlaceInput))
    return this.json<CreatePlaceResponse>(result, { status: 201 })
  }
}

const ep = new PlacesEndpoint()
export const onRequest: PagesFunction<CloudflareEnv> = (ctx) => ep.handle(ctx)
