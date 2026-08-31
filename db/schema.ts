// Drizzle ORM schema (optional — for typed queries with `drizzle-orm` + `drizzle-kit`)
// If you use drizzle, replace raw SQL in functions with drizzle queries.
// See drizzle.config.ts

import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core'

export const courts = sqliteTable('courts', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  location: text('location'),
  surface: text('surface', {
    enum: ['artificial_grass', 'clay', 'concrete', 'grass'],
  })
    .notNull()
    .default('artificial_grass'),
  isIndoor: integer('is_indoor', { mode: 'boolean' }).notNull().default(false),
  hourlyPriceCents: integer('hourly_price_cents').notNull().default(3000),
  createdAt: text('created_at').notNull().default("strftime('%Y-%m-%dT%H:%M:%SZ','now')"),
})

export const users = sqliteTable('users', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  role: text('role', { enum: ['player', 'admin', 'coach'] }).notNull().default('player'),
  createdAt: text('created_at').notNull().default("strftime('%Y-%m-%dT%H:%M:%SZ','now')"),
  updatedAt: text('updated_at').notNull().default("strftime('%Y-%m-%dT%H:%M:%SZ','now')"),
})

export type Court = typeof courts.$inferSelect
export type NewCourt = typeof courts.$inferInsert
export type User = typeof users.$inferSelect
export type NewUser = typeof users.$inferInsert
