import { RestEndpoint, type RestContext } from '../../lib/rest'
import { deleteUser, getUserById, updateUser } from '../../services/users/service'
import type {
  DeleteUserResponse,
  GetUserResponse,
  UpdateUserInput,
  UpdateUserResponse,
} from '../../../shared/users/types'
import { ServiceError } from '../../lib/errors'

/**
 * Thin route adapter for `/api/users/:id`.
 * Routing + HTTP only — business logic lives in `functions/services/users/service.ts`.
 */
class UserByIdEndpoint extends RestEndpoint {
  private getId(ctx: RestContext): number {
    const n = Number(this.param(ctx, 'id'))
    if (!Number.isInteger(n) || n <= 0) throw ServiceError.badRequest('Invalid id')
    return n
  }

  // GET /api/users/:id
  async get(ctx: RestContext): Promise<Response> {
    const result = await getUserById(this.db(ctx), this.getId(ctx))
    return this.json<GetUserResponse>(result)
  }

  // PATCH /api/users/:id { name?, email?, role? }
  async patch(ctx: RestContext): Promise<Response> {
    const body = await this.parseJson<UpdateUserInput>(ctx)
    const result = await updateUser(this.db(ctx), this.getId(ctx), body ?? {})
    return this.json<UpdateUserResponse>(result)
  }

  // PUT /api/users/:id — full replace (same as PATCH)
  async put(ctx: RestContext): Promise<Response> {
    return this.patch(ctx)
  }

  // DELETE /api/users/:id
  async delete(ctx: RestContext): Promise<Response> {
    const result = await deleteUser(this.db(ctx), this.getId(ctx))
    return this.json<DeleteUserResponse>(result)
  }
}

const ep = new UserByIdEndpoint()
export const onRequest: PagesFunction<CloudflareEnv> = (ctx) => ep.handle(ctx)
