/**
 * src/services/index.ts — frontend service registry.
 *
 * Each API service owns `src/services/<name>/api.ts`.
 * To add a service (e.g. `bookings`): create `src/services/bookings/api.ts`
 * and re-export it here. Components import from `@/services`, never from
 * deep paths.
 */
export * from './http'
export * from './health/api'
export * from './users/api'
