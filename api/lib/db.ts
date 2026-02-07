import { neon } from '@neondatabase/serverless';
import type { SavedDeck, MulliganDecision } from '@mtg-companion/shared-types';

function getDb() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL not set');
  return neon(url);
}

// ── Users ──────────────────────────────────────────────────────────

export async function upsertUser(userId: string, email?: string): Promise<void> {
  const sql = getDb();
  await sql`
    INSERT INTO users (id, email, last_seen_at)
    VALUES (${userId}, ${email ?? null}, NOW())
    ON CONFLICT (id) DO UPDATE SET last_seen_at = NOW(), email = COALESCE(EXCLUDED.email, users.email)
  `;
}

// ── Saved Decks ────────────────────────────────────────────────────

export async function getSavedDecks(userId: string): Promise<SavedDeck[]> {
  const sql = getDb();
  const rows = await sql`
    SELECT id, name, raw_input, parse_result, resolved_cards, aliases, not_found, saved_at, last_used_at
    FROM saved_decks
    WHERE user_id = ${userId}
    ORDER BY last_used_at DESC
  `;
  return rows.map(rowToSavedDeck);
}

export async function upsertDeck(userId: string, deck: SavedDeck): Promise<void> {
  const sql = getDb();
  await sql`
    INSERT INTO saved_decks (id, user_id, name, raw_input, parse_result, resolved_cards, aliases, not_found, saved_at, last_used_at)
    VALUES (
      ${deck.id},
      ${userId},
      ${deck.name},
      ${deck.rawInput},
      ${JSON.stringify(deck.parseResult)},
      ${JSON.stringify(deck.resolvedCards)},
      ${JSON.stringify(deck.aliases)},
      ${JSON.stringify(deck.notFound)},
      ${deck.savedAt},
      ${deck.lastUsedAt}
    )
    ON CONFLICT (id, user_id) DO UPDATE SET
      name = EXCLUDED.name,
      raw_input = EXCLUDED.raw_input,
      parse_result = EXCLUDED.parse_result,
      resolved_cards = EXCLUDED.resolved_cards,
      aliases = EXCLUDED.aliases,
      not_found = EXCLUDED.not_found,
      saved_at = EXCLUDED.saved_at,
      last_used_at = EXCLUDED.last_used_at
  `;
}

export async function deleteDeck(userId: string, deckId: string): Promise<void> {
  const sql = getDb();
  await sql`DELETE FROM saved_decks WHERE id = ${deckId} AND user_id = ${userId}`;
}

export async function renameDeck(userId: string, deckId: string, name: string): Promise<void> {
  const sql = getDb();
  await sql`UPDATE saved_decks SET name = ${name} WHERE id = ${deckId} AND user_id = ${userId}`;
}

// ── Mulligan Decisions ─────────────────────────────────────────────

export async function getDecisions(userId: string, deckId?: string): Promise<MulliganDecision[]> {
  const sql = getDb();
  const rows = deckId
    ? await sql`
        SELECT id, deck_id, timestamp, hand_cards, decision, mulligan_number, bottomed_cards, on_play, notes
        FROM mulligan_decisions
        WHERE user_id = ${userId} AND deck_id = ${deckId}
        ORDER BY timestamp ASC
      `
    : await sql`
        SELECT id, deck_id, timestamp, hand_cards, decision, mulligan_number, bottomed_cards, on_play, notes
        FROM mulligan_decisions
        WHERE user_id = ${userId}
        ORDER BY timestamp ASC
      `;
  return rows.map(rowToDecision);
}

export async function saveDecisions(userId: string, decisions: MulliganDecision[]): Promise<void> {
  if (decisions.length === 0) return;
  const sql = getDb();
  // Batch insert with ON CONFLICT DO NOTHING for idempotency
  for (const d of decisions) {
    await sql`
      INSERT INTO mulligan_decisions (id, user_id, deck_id, timestamp, hand_cards, decision, mulligan_number, bottomed_cards, on_play, notes)
      VALUES (
        ${d.id},
        ${userId},
        ${d.deckId},
        ${d.timestamp},
        ${JSON.stringify(d.handCards)},
        ${d.decision},
        ${d.mulliganNumber},
        ${d.bottomedCards ? JSON.stringify(d.bottomedCards) : null},
        ${d.onPlay},
        ${d.notes ?? null}
      )
      ON CONFLICT (id) DO NOTHING
    `;
  }
}

export async function deleteDecisions(userId: string, deckId?: string): Promise<void> {
  const sql = getDb();
  if (deckId) {
    await sql`DELETE FROM mulligan_decisions WHERE user_id = ${userId} AND deck_id = ${deckId}`;
  } else {
    await sql`DELETE FROM mulligan_decisions WHERE user_id = ${userId}`;
  }
}

// ── Row Mappers ────────────────────────────────────────────────────

function rowToSavedDeck(row: Record<string, unknown>): SavedDeck {
  return {
    id: row.id as string,
    name: row.name as string,
    rawInput: row.raw_input as string,
    parseResult: row.parse_result as SavedDeck['parseResult'],
    resolvedCards: row.resolved_cards as SavedDeck['resolvedCards'],
    aliases: (row.aliases as Record<string, string>) ?? {},
    notFound: (row.not_found as string[]) ?? [],
    savedAt: (row.saved_at as Date).toISOString(),
    lastUsedAt: (row.last_used_at as Date).toISOString(),
  };
}

function rowToDecision(row: Record<string, unknown>): MulliganDecision {
  return {
    id: row.id as string,
    deckId: row.deck_id as string,
    timestamp: (row.timestamp as Date).toISOString(),
    handCards: row.hand_cards as string[],
    decision: row.decision as 'keep' | 'mulligan',
    mulliganNumber: row.mulligan_number as number,
    bottomedCards: (row.bottomed_cards as string[] | null) ?? undefined,
    onPlay: row.on_play as boolean,
    notes: (row.notes as string | null) ?? undefined,
  };
}
