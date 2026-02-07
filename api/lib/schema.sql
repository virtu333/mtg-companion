-- MTG Companion Database Schema
-- Run against Neon Postgres to initialize tables

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,              -- Clerk user ID (e.g. "user_2abc...")
  email TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS saved_decks (
  id TEXT NOT NULL,                 -- Deck hash (djb2, 8-char hex)
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  raw_input TEXT NOT NULL,
  parse_result JSONB NOT NULL,      -- ParseResult shape
  resolved_cards JSONB NOT NULL,    -- ResolvedCard[] shape
  aliases JSONB NOT NULL DEFAULT '{}',
  not_found JSONB NOT NULL DEFAULT '[]',
  saved_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_used_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_saved_decks_user ON saved_decks(user_id);

CREATE TABLE IF NOT EXISTS mulligan_decisions (
  id TEXT PRIMARY KEY,              -- UUID (client-generated for idempotent migration)
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  deck_id TEXT NOT NULL,
  timestamp TIMESTAMPTZ NOT NULL,
  hand_cards JSONB NOT NULL,        -- string[] of scryfall IDs
  decision TEXT NOT NULL CHECK (decision IN ('keep', 'mulligan')),
  mulligan_number INTEGER NOT NULL,
  bottomed_cards JSONB,             -- string[] of scryfall IDs or null
  on_play BOOLEAN NOT NULL,
  notes TEXT
);

CREATE INDEX IF NOT EXISTS idx_decisions_user ON mulligan_decisions(user_id);
CREATE INDEX IF NOT EXISTS idx_decisions_deck ON mulligan_decisions(user_id, deck_id);
