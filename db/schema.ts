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

export const bookings = sqliteTable('bookings', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  courtId: integer('court_id')
    .notNull()
    .references(() => courts.id, { onDelete: 'cascade' }),
  playerName: text('player_name').notNull(),
  playerEmail: text('player_email'),
  startsAt: text('starts_at').notNull(),
  endsAt: text('ends_at').notNull(),
  status: text('status', { enum: ['confirmed', 'cancelled', 'pending'] })
    .notNull()
    .default('confirmed'),
  createdAt: text('created_at').notNull().default("strftime('%Y-%m-%dT%H:%M:%SZ','now')"),
})

export type Court = typeof courts.$inferSelect
export type NewCourt = typeof courts.$inferInsert
export type Booking = typeof bookings.$inferSelect
export type NewBooking = typeof bookings.$inferInsert
