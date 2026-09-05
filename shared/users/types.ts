/**
 * shared/users/types.ts — contract for the `users` service.
 * Owner: users service. Mirrors `CHECK (role IN (...))` in `db/schema.sql`
 * and the drizzle `$inferSelect` shape (camelCase).
 */

export type UserRole = 'player' | 'admin' | 'coach'

export const USER_ROLES: readonly UserRole[] = ['player', 'admin', 'coach'] as const

/** Canonical user shape sent over the wire. */
export interface UserDto {
  id: number
  name: string
  email: string
  role: UserRole
  createdAt: string
  updatedAt: string
}

export interface ListUsersQuery {
  limit?: number
  offset?: number
  q?: string
}

export interface ListUsersResponse {
  users: UserDto[]
  total: number
  limit: number
  offset: number
  q?: string
}

export interface CreateUserInput {
  name: string
  email: string
  role?: UserRole
}

export interface CreateUserResponse {
  user: UserDto
}

export interface UserIdParams {
  id: number
}

export interface GetUserResponse {
  user: UserDto
}

export interface UpdateUserInput {
  name?: string
  email?: string
  role?: UserRole
}

export interface UpdateUserResponse {
  user: UserDto
}

export interface DeleteUserResponse {
  deleted: true
  id: number
}
