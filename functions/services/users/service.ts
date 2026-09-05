/**
 * functions/services/users/service.ts — business logic for the `users` service.
 * Owns validation + drizzle queries. Route adapters:
 * `functions/api/users.ts`, `functions/api/users/[id].ts`.
 *
 * Throw `ServiceError` on failure — `RestEndpoint` maps it to the right
 * HTTP status automatically.
 */
import { asc, count, eq, like, or } from 'drizzle-orm'
import { users } from '../../../db/schema'
import type { Db } from '../../lib/drizzle'
import { ServiceError } from '../../lib/errors'
import type {
  CreateUserInput,
  CreateUserResponse,
  DeleteUserResponse,
  GetUserResponse,
  ListUsersQuery,
  ListUsersResponse,
  UpdateUserInput,
  UpdateUserResponse,
  UserDto,
  UserRole,
} from '../../../shared/users/types'
import { USER_ROLES } from '../../../shared/users/types'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function assertValidRole(role: unknown): asserts role is UserRole {
  if (typeof role !== 'string' || !USER_ROLES.includes(role as UserRole)) {
    throw ServiceError.badRequest(`role must be one of: ${USER_ROLES.join(', ')}`)
  }
}

function toConflictOrRethrow(e: unknown): never {
  if (isUniqueViolation(e)) {
    throw ServiceError.conflict('email already exists', errorText(e))
  }
  throw e
}

/**
 * Drizzle wraps driver errors (`Failed query: ...`, original in `cause`;
 * libsql exposes `code: 'SQLITE_CONSTRAINT_UNIQUE'`), so walk the whole
 * chain instead of only checking the top-level message.
 */
function errorText(e: unknown): string {
  const parts: string[] = []
  const seen = new Set<unknown>()
  let cur: unknown = e
  while (cur !== null && cur !== undefined && !seen.has(cur)) {
    seen.add(cur)
    if (typeof cur === 'string') {
      parts.push(cur)
      break
    }
    if (typeof cur !== 'object') break
    const rec = cur as Record<string, unknown>
    if (typeof rec.message === 'string') parts.push(rec.message)
    if (typeof rec.code === 'string') parts.push(rec.code)
    cur = rec.cause
  }
  return parts.join(' | ')
}

function isUniqueViolation(e: unknown): boolean {
  return errorText(e).toLowerCase().includes('unique')
}

export async function listUsers(db: Db, query: ListUsersQuery): Promise<ListUsersResponse> {
  const limit = query.limit ?? 50
  const offset = query.offset ?? 0
  const q = query.q?.trim() || undefined

  if (q) {
    const pattern = `%${q}%`
    const where = or(like(users.name, pattern), like(users.email, pattern))
    const rows = await db.select().from(users).where(where).orderBy(asc(users.id)).limit(limit).offset(offset)
    const [cntRow] = await db.select({ total: count() }).from(users).where(where)
    return { users: rows, total: Number(cntRow?.total ?? 0), limit, offset, q }
  }

  const rows = await db.select().from(users).orderBy(asc(users.id)).limit(limit).offset(offset)
  const [cntRow] = await db.select({ total: count() }).from(users)
  return { users: rows, total: Number(cntRow?.total ?? 0), limit, offset }
}

export async function createUser(db: Db, input: CreateUserInput): Promise<CreateUserResponse> {
  const name = input.name?.trim() ?? ''
  const email = input.email?.trim().toLowerCase() ?? ''
  const role: UserRole = input.role ?? 'player'

  if (!input || !name || !email) throw ServiceError.badRequest("Fields 'name', 'email' are required")
  if (name.length < 2) throw ServiceError.badRequest('name must be at least 2 characters')
  if (!EMAIL_RE.test(email)) throw ServiceError.badRequest('email must be valid')
  assertValidRole(role)

  try {
    const [user] = await db
      .insert(users)
      .values({ name, email, role, updatedAt: new Date().toISOString() })
      .returning()
    if (!user) throw ServiceError.badRequest('Failed to create user')
    return { user }
  } catch (e) {
    if (e instanceof ServiceError) throw e
    toConflictOrRethrow(e)
  }
}

export async function getUserById(db: Db, id: number): Promise<GetUserResponse> {
  if (!Number.isInteger(id) || id <= 0) throw ServiceError.badRequest('Invalid id')
  const [user] = await db.select().from(users).where(eq(users.id, id)).limit(1)
  if (!user) throw ServiceError.notFound('User not found')
  return { user }
}

export async function updateUser(db: Db, id: number, input: UpdateUserInput): Promise<UpdateUserResponse> {
  if (!Number.isInteger(id) || id <= 0) throw ServiceError.badRequest('Invalid id')
  if (!input || Object.keys(input).length === 0) throw ServiceError.badRequest('Empty body')

  const data: { name?: string; email?: string; role?: UserRole } = {}
  if ('name' in input) {
    const v = input.name
    if (typeof v !== 'string' || v.trim().length < 2) throw ServiceError.badRequest('name must be at least 2 characters')
    data.name = v.trim()
  }
  if ('email' in input) {
    const v = input.email
    if (typeof v !== 'string' || !EMAIL_RE.test(v.trim().toLowerCase())) {
      throw ServiceError.badRequest('email must be valid')
    }
    data.email = v.trim().toLowerCase()
  }
  if ('role' in input) {
    assertValidRole(input.role)
    data.role = input.role as UserRole
  }
  if (Object.keys(data).length === 0) {
    throw ServiceError.badRequest('No valid fields to update. Allowed: name, email, role')
  }

  try {
    const [updated]: UserDto[] = await db
      .update(users)
      .set({ ...data, updatedAt: new Date().toISOString() })
      .where(eq(users.id, id))
      .returning()
    if (!updated) throw ServiceError.notFound('User not found')
    return { user: updated }
  } catch (e) {
    if (e instanceof ServiceError) throw e
    toConflictOrRethrow(e)
  }
}

export async function deleteUser(db: Db, id: number): Promise<DeleteUserResponse> {
  if (!Number.isInteger(id) || id <= 0) throw ServiceError.badRequest('Invalid id')
  const [deleted] = await db.delete(users).where(eq(users.id, id)).returning({ id: users.id })
  if (!deleted) throw ServiceError.notFound('User not found')
  return { deleted: true, id }
}
