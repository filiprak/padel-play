// Drizzle ORM schema (optional — for typed queries with `drizzle-orm` + `drizzle-kit`)
// If you use drizzle, replace raw SQL in functions with drizzle queries.
// See drizzle.config.ts

import { sql } from 'drizzle-orm'
import { sqliteTable, text, integer, primaryKey } from 'drizzle-orm/sqlite-core'

// NOTE: timestamp defaults MUST be `sql` expressions, not plain strings.
// A plain string `.default("strftime(...)")` is treated by drizzle as a
// literal value and gets inserted verbatim into rows (bug: created_at
// contained the text "strftime('%Y-%m-%dT%H:%M:%SZ','now')").
const nowIso = sql`(strftime('%Y-%m-%dT%H:%M:%SZ','now'))`

export const users = sqliteTable('users', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  role: text('role', { enum: ['player', 'admin', 'coach'] }).notNull().default('player'),
  createdAt: text('created_at').notNull().default(nowIso),
  updatedAt: text('updated_at').notNull().default(nowIso),
})

export type User = typeof users.$inferSelect
export type NewUser = typeof users.$inferInsert

export const places = sqliteTable('places', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  location: text('location'),
  createdAt: text('created_at').notNull().default(nowIso),
  updatedAt: text('updated_at').notNull().default(nowIso),
})

export type Place = typeof places.$inferSelect
export type NewPlace = typeof places.$inferInsert

export const matches = sqliteTable('matches', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  placeId: integer('place_id')
    .notNull()
    .references(() => places.id),
  startsAt: text('starts_at').notNull(),
  endsAt: text('ends_at').notNull(),
  createdAt: text('created_at').notNull().default(nowIso),
  updatedAt: text('updated_at').notNull().default(nowIso),
})

export type Match = typeof matches.$inferSelect
export type NewMatch = typeof matches.$inferInsert

/** 2v2 assignment: each row puts one user on team 1 or 2 of a match. */
export const matchPlayers = sqliteTable(
  'match_players',
  {
    matchId: integer('match_id')
      .notNull()
      .references(() => matches.id, { onDelete: 'cascade' }),
    userId: integer('user_id')
      .notNull()
      .references(() => users.id),
    team: integer('team').notNull(),
  },
  (t) => [primaryKey({ columns: [t.matchId, t.userId] })],
)

export type MatchPlayer = typeof matchPlayers.$inferSelect
export type NewMatchPlayer = typeof matchPlayers.$inferInsert
