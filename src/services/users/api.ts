/** Frontend client for the `users` service. */
import { apiRoute, type ApiResponse } from '../http'
import type { CreateUserInput, ListUsersQuery, UpdateUserInput, UserIdParams } from '@shared'

export function listUsers(query: ListUsersQuery = {}): Promise<ApiResponse<'GET /api/users'>> {
  return apiRoute('GET /api/users', { query })
}

export function createUser(body: CreateUserInput): Promise<ApiResponse<'POST /api/users'>> {
  return apiRoute('POST /api/users', { body })
}

export function getUser(id: UserIdParams['id']): Promise<ApiResponse<'GET /api/users/:id'>> {
  return apiRoute('GET /api/users/:id', { params: { id } })
}

export function updateUser(
  id: UserIdParams['id'],
  body: UpdateUserInput,
  method: 'PATCH' | 'PUT' = 'PATCH',
): Promise<ApiResponse<'PATCH /api/users/:id'>> {
  return apiRoute(`${method} /api/users/:id` as 'PATCH /api/users/:id', {
    params: { id },
    body,
  })
}

export function deleteUser(id: UserIdParams['id']): Promise<ApiResponse<'DELETE /api/users/:id'>> {
  return apiRoute('DELETE /api/users/:id', { params: { id } })
}
