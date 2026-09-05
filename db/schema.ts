// Drizzle ORM schema (optional — for typed queries with `drizzle-orm` + `drizzle-kit`)
// If you use drizzle, replace raw SQL in functions with drizzle queries.
// See drizzle.config.ts

import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core'

export const users = sqliteTable('users', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  role: text('role', { enum: ['player', 'admin', 'coach'] }).notNull().default('player'),
  createdAt: text('created_at').notNull().default("strftime('%Y-%m-%dT%H:%M:%SZ','now')"),
  updatedAt: text('updated_at').notNull().default("strftime('%Y-%m-%dT%H:%M:%SZ','now')"),
})

export type User = typeof users.$inferSelect
export type NewUser = typeof users.$inferInsert
