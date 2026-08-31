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

CREATE INDEX IF NOT EXISTS idx_courts_name ON courts(name);

CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  role TEXT NOT NULL DEFAULT 'player' CHECK (role IN ('player','admin','coach')),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now'))
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
