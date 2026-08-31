-- Turso / libSQL schema for padel-play
-- Run: pnpm db:init  (uses TURSO_DATABASE_URL + TURSO_AUTH_TOKEN)
-- Or via Turso CLI: turso db shell <db-name> < schema.sql

CREATE TABLE IF NOT EXISTS courts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  location TEXT,
  surface TEXT NOT NULL DEFAULT 'artificial_grass' CHECK (surface IN ('artificial_grass','clay','concrete','grass')),
  is_indoor INTEGER NOT NULL DEFAULT 0,
  hourly_price_cents INTEGER NOT NULL DEFAULT 3000,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now'))
);

CREATE TABLE IF NOT EXISTS bookings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  court_id INTEGER NOT NULL REFERENCES courts(id) ON DELETE CASCADE,
  player_name TEXT NOT NULL,
  player_email TEXT,
  starts_at TEXT NOT NULL,
  ends_at TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'confirmed' CHECK (status IN ('confirmed','cancelled','pending')),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now'))
);

CREATE INDEX IF NOT EXISTS idx_bookings_court_starts ON bookings(court_id, starts_at);
CREATE INDEX IF NOT EXISTS idx_courts_name ON courts(name);
