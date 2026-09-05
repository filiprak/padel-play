import { RestEndpoint, type RestContext } from '../lib/rest'
import { createUser, listUsers } from '../services/users/service'
import type { CreateUserInput, CreateUserResponse, ListUsersResponse } from '../../shared/users/types'

/**
 * Thin route adapter for `/api/users`.
 * Routing + HTTP only — business logic lives in `functions/services/users/service.ts`.
 */
class UsersEndpoint extends RestEndpoint {
  // GET /api/users?limit=50&offset=0&q=ada
  async get(ctx: RestContext): Promise<Response> {
    const { limit, offset } = this.pagination(ctx)
    const q = this.query(ctx, 'q')?.trim() || undefined
    const result = await listUsers(this.db(ctx), { limit, offset, q })
    return this.json<ListUsersResponse>(result)
  }

  // POST /api/users { name, email, role? }
  async post(ctx: RestContext): Promise<Response> {
    const body = await this.parseJson<CreateUserInput>(ctx)
    const result = await createUser(this.db(ctx), body ?? ({} as CreateUserInput))
    return this.json<CreateUserResponse>(result, { status: 201 })
  }
}

const ep = new UsersEndpoint()
export const onRequest: PagesFunction<CloudflareEnv> = (ctx) => ep.handle(ctx)
